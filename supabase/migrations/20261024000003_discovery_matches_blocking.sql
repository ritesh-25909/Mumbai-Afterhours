-- Phase 4: discovery photos, permanent unmatch, block_user, list_matches, match photo access, realtime.

-- Discovery now returns languages and the three photo paths (never date_of_birth).
drop function if exists discover_profiles(int, int);
create function discover_profiles(page_size int default 10, page_offset int default 0)
returns table (id uuid, display_name text, age int, neighbourhood text, bio text, interests text[], languages text[],
               relationship_intention text, verified boolean, photo_paths text[])
language sql stable security definer set search_path = public as $$
  select p.id, p.display_name, date_part('year', age(p.date_of_birth))::int, p.neighbourhood, p.bio,
         p.interests, p.languages, p.relationship_intention, p.verified,
         array(select pp.storage_path from profile_photos pp where pp.user_id = p.id order by pp.display_order)
  from profiles p
  join profiles me on me.id = auth.uid() and me.profile_complete
  left join user_preferences up on up.user_id = me.id
  where p.id <> me.id
    and p.profile_complete and p.moderation_status = 'approved' and p.visibility_status = 'visible' and p.deleted_at is null
    and not is_blocked_between(me.id, p.id)
    and not exists (select 1 from likes  l where l.actor_user_id = me.id and l.target_user_id = p.id)
    and not exists (select 1 from passes s where s.actor_user_id = me.id and s.target_user_id = p.id)
    and not exists (select 1 from matches m where m.user_a_id = least(me.id, p.id) and m.user_b_id = greatest(me.id, p.id))
    and (cardinality(me.interested_in) = 0 or p.gender = any(me.interested_in))
    and date_part('year', age(p.date_of_birth)) between coalesce(up.minimum_age,18) and coalesce(up.maximum_age,99)
  order by p.created_at desc
  limit least(page_size, 30) offset greatest(page_offset, 0)
$$;

-- A closed pair (unmatched or blocked) can never match again.
create or replace function like_user(target uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); a uuid; b uuid; mid uuid; matched boolean := false;
begin
  if me is null then raise exception 'Not authenticated.'; end if;
  if me = target then raise exception 'You cannot like yourself.'; end if;
  if is_blocked_between(me, target) then raise exception 'Unavailable.'; end if;
  if exists (select 1 from matches where user_a_id = least(me, target) and user_b_id = greatest(me, target) and status <> 'active')
    then raise exception 'Unavailable.'; end if;
  if not exists (select 1 from profiles where id = me and profile_complete and moderation_status = 'approved' and deleted_at is null)
    then raise exception 'Publish your profile first.'; end if;
  if not exists (select 1 from profiles where id = target and profile_complete and moderation_status = 'approved' and deleted_at is null and visibility_status = 'visible')
    then raise exception 'Unavailable.'; end if;

  insert into likes(actor_user_id, target_user_id) values (me, target) on conflict do nothing;

  if exists (select 1 from likes where actor_user_id = target and target_user_id = me) then
    a := least(me, target); b := greatest(me, target);
    insert into matches(user_a_id, user_b_id) values (a, b) on conflict (user_a_id, user_b_id) do nothing;
    select id into mid from matches where user_a_id = a and user_b_id = b;
    insert into conversations(match_id) values (mid) on conflict (match_id) do nothing;
    matched := true;
  end if;
  return jsonb_build_object('matched', matched, 'match_id', mid);
end $$;

-- Unmatch is permanent: likes are removed and both sides get a pass, so the pair never reappears.
create or replace function unmatch(mid uuid) returns void
language plpgsql security definer set search_path = public as $$
declare m matches;
begin
  select * into m from matches where id = mid and auth.uid() in (user_a_id, user_b_id) and status = 'active' for update;
  if not found then raise exception 'Match not found.'; end if;
  update matches set status = 'unmatched', unmatched_at = now() where id = mid;
  delete from likes where (actor_user_id = m.user_a_id and target_user_id = m.user_b_id) or (actor_user_id = m.user_b_id and target_user_id = m.user_a_id);
  insert into passes(actor_user_id, target_user_id) values (m.user_a_id, m.user_b_id), (m.user_b_id, m.user_a_id) on conflict do nothing;
end $$;

-- Block: hides both users from each other and closes any existing match (messages stop immediately).
create or replace function block_user(target uuid) returns void
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid();
begin
  if me is null then raise exception 'Not authenticated.'; end if;
  if me = target then raise exception 'You cannot block yourself.'; end if;
  if not exists (select 1 from profiles where id = target) then raise exception 'User not found.'; end if;
  insert into user_blocks(blocker_user_id, blocked_user_id) values (me, target) on conflict do nothing;
  update matches set status = 'blocked', unmatched_at = now()
   where user_a_id = least(me, target) and user_b_id = greatest(me, target) and status = 'active';
end $$;

create or replace function list_matches()
returns table (match_id uuid, conversation_id uuid, user_id uuid, display_name text, age int, verified boolean, photo_path text, matched_at timestamptz)
language sql stable security definer set search_path = public as $$
  select m.id, c.id, p.id, p.display_name, date_part('year', age(p.date_of_birth))::int, p.verified,
         (select pp.storage_path from profile_photos pp where pp.user_id = p.id order by pp.display_order limit 1), m.created_at
  from matches m
  join conversations c on c.match_id = m.id
  join profiles p on p.id = case when m.user_a_id = auth.uid() then m.user_b_id else m.user_a_id end
  where auth.uid() in (m.user_a_id, m.user_b_id) and m.status = 'active' and p.deleted_at is null
    and not is_blocked_between(m.user_a_id, m.user_b_id)
  order by m.created_at desc
$$;

revoke execute on function discover_profiles(int,int), like_user(uuid), unmatch(uuid), block_user(uuid), list_matches() from public, anon;
grant execute on function discover_profiles(int,int), like_user(uuid), unmatch(uuid), block_user(uuid), list_matches() to authenticated;

-- Photo read access. The check must be a security-definer function: a plain subquery inside the policy
-- would itself be filtered by RLS on profiles/profile_photos and could never see other users' rows.
create or replace function can_view_photo(p_path text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profile_photos pp join profiles p on p.id = pp.user_id
    where pp.storage_path = p_path and not is_blocked_between(auth.uid(), p.id)
      and ((p.profile_complete and p.moderation_status = 'approved' and p.visibility_status = 'visible' and p.deleted_at is null)
           -- matched people can still see each other's photos even if one profile is hidden
           or exists (select 1 from matches m where m.status = 'active'
                       and m.user_a_id = least(auth.uid(), p.id) and m.user_b_id = greatest(auth.uid(), p.id))))
$$;
revoke execute on function can_view_photo(text) from public, anon;
grant execute on function can_view_photo(text) to authenticated;

drop policy photos_obj_select on storage.objects;
create policy photos_obj_select on storage.objects for select to authenticated
  using (bucket_id = 'profile-photos' and ((storage.foldername(name))[1] = auth.uid()::text or can_view_photo(name)));

-- Realtime: lets the app push "new match" events (RLS still applies). No-op outside Supabase.
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table matches;
  end if;
end $$;
