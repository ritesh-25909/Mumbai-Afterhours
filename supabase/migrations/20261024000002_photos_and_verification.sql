-- Phase 2 fix + Phase 3: photo integrity, selfie verification, moderator review.

alter table verification_requests add column selfie_path text;

-- ---------- Photo integrity ----------
-- Deferred so a replace (delete + insert in one transaction) is judged at commit.
create or replace function photo_removed_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- Any photo change invalidates verification (the selfie was compared to the old photos).
  update profiles set verified = false where id = old.user_id and verified;
  -- Fewer than three photos: pull the profile out of discovery.
  update profiles set profile_complete = false
   where id = old.user_id and profile_complete
     and (select count(*) from profile_photos where user_id = old.user_id) < 3;
  return null;
end $$;

create constraint trigger profile_photos_removed
  after delete on profile_photos deferrable initially deferred
  for each row execute function photo_removed_guard();

-- Atomic swap: confirms the object exists in storage, replaces the row, returns the old path to delete.
create or replace function replace_photo(p_order int, p_path text) returns text
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); old text;
begin
  if me is null then raise exception 'Not authenticated.'; end if;
  if p_order not between 1 and 3 then raise exception 'Invalid photo slot.'; end if;
  if p_path not like me::text || '/%' then raise exception 'Invalid photo path.'; end if;
  if not exists (select 1 from storage.objects where bucket_id = 'profile-photos' and name = p_path)
    then raise exception 'Upload not found. Try again.'; end if;
  delete from profile_photos where user_id = me and display_order = p_order returning storage_path into old;
  insert into profile_photos(user_id, storage_path, display_order) values (me, p_path, p_order);
  return old;
end $$;

-- ---------- Verification ----------
create or replace function submit_verification(p_selfie_path text, p_consent boolean, p_policy_version text) returns uuid
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); rid uuid;
begin
  if me is null then raise exception 'Not authenticated.'; end if;
  if not coalesce(p_consent, false) then raise exception 'Consent is required.'; end if;
  if p_selfie_path not like me::text || '/%' then raise exception 'Invalid selfie path.'; end if;
  if not exists (select 1 from profiles where id = me and profile_complete and deleted_at is null)
    then raise exception 'Publish your profile first.'; end if;
  if exists (select 1 from profiles where id = me and verified) then raise exception 'You are already verified.'; end if;
  if not exists (select 1 from storage.objects where bucket_id = 'verification-selfies' and name = p_selfie_path)
    then raise exception 'Selfie upload not found. Try again.'; end if;
  if exists (select 1 from verification_requests where user_id = me and status = 'pending')
    then raise exception 'Your verification is already under review.'; end if;
  if (select count(*) from verification_requests where user_id = me and created_at > now() - interval '7 days') >= 3
    then raise exception 'Too many attempts this week. Try again later.'; end if;
  insert into user_consents(user_id, consent_type, policy_version) values (me, 'verification_biometric', p_policy_version);
  insert into verification_requests(user_id, status, consent_recorded_at, selfie_path)
    values (me, 'pending', now(), p_selfie_path) returning id into rid;
  return rid;
end $$;

create or replace function my_roles() returns text[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(role::text), '{}') from user_roles where user_id = auth.uid()
$$;

create or replace function list_pending_verifications()
returns table (request_id uuid, user_id uuid, display_name text, submitted_at timestamptz, selfie_path text, photo_paths text[])
language plpgsql stable security definer set search_path = public as $$
begin
  if not (has_role('moderator') or has_role('admin')) then raise exception 'Not allowed.'; end if;
  return query
    select v.id, v.user_id, p.display_name, v.submitted_at, v.selfie_path,
           array(select pp.storage_path from profile_photos pp where pp.user_id = v.user_id order by pp.display_order)
    from verification_requests v join profiles p on p.id = v.user_id
    where v.status = 'pending' and v.selfie_path is not null
    order by v.submitted_at limit 50;
end $$;

-- Returns the selfie path so the reviewer's client can delete the file; the DB reference is cleared immediately.
create or replace function review_verification(p_request uuid, p_decision text, p_reason text default null) returns text
language plpgsql security definer set search_path = public as $$
declare r verification_requests;
begin
  if not (has_role('moderator') or has_role('admin')) then raise exception 'Not allowed.'; end if;
  if p_decision not in ('approved', 'rejected', 'retry') then raise exception 'Invalid decision.'; end if;
  select * into r from verification_requests where id = p_request and status = 'pending' for update;
  if not found then raise exception 'Request not found or already reviewed.'; end if;
  if r.user_id = auth.uid() then raise exception 'You cannot review your own request.'; end if;
  update verification_requests
     set status = p_decision::verification_status, reviewed_at = now(), reviewer_id = auth.uid(),
         rejection_reason_code = case when p_decision = 'approved' then null else p_reason end,
         selfie_path = null, updated_at = now()
   where id = p_request;
  if p_decision = 'approved' then update profiles set verified = true where id = r.user_id; end if;
  return r.selfie_path;
end $$;

revoke execute on function replace_photo(int, text), submit_verification(text, boolean, text), my_roles(),
  list_pending_verifications(), review_verification(uuid, text, text) from public, anon;
grant execute on function replace_photo(int, text), submit_verification(text, boolean, text), my_roles(),
  list_pending_verifications(), review_verification(uuid, text, text) to authenticated;

-- Storage: owner may delete their own selfie (data minimisation); moderators may delete after review.
create policy selfies_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'verification-selfies' and (storage.foldername(name))[1] = auth.uid()::text);
create policy selfies_moderator_delete on storage.objects for delete to authenticated
  using (bucket_id = 'verification-selfies' and (has_role('moderator') or has_role('admin')));
