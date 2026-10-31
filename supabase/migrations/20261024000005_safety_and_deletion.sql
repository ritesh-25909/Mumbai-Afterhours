-- Phase 6: moderation of reports, suspension, unblock, neighbourhood privacy, deletion support.

-- ---------- Schema changes ----------
alter table profiles add column show_neighbourhood boolean not null default true;
grant update (show_neighbourhood) on profiles to authenticated;

-- A reviewer's account may be deleted without blocking (or erasing) the review record.
alter table verification_requests drop constraint verification_requests_reviewer_id_fkey;
alter table verification_requests add constraint verification_requests_reviewer_id_fkey
  foreign key (reviewer_id) references auth.users(id) on delete set null;

-- Minimal audit trail for deletions: pseudonymous hash and timestamp only. No client access.
create table deletion_log (
  id uuid primary key default gen_random_uuid(),
  user_hash text not null,
  deleted_at timestamptz not null default now(),
  cleanup_complete boolean not null default true
);
alter table deletion_log enable row level security;
revoke all on deletion_log from authenticated, anon;

-- ---------- Suspension must close everything ----------
create or replace function conversation_open(conv uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from conversations c join matches m on m.id = c.match_id
    where c.id = conv and auth.uid() in (m.user_a_id, m.user_b_id) and m.status = 'active'
      and not is_blocked_between(m.user_a_id, m.user_b_id)
      and not exists (select 1 from profiles s where s.id in (m.user_a_id, m.user_b_id) and s.moderation_status = 'suspended'))
$$;

-- A suspended user must not be able to un-suspend themselves by re-publishing.
create or replace function publish_profile() returns void
language plpgsql security definer set search_path = public as $$
declare n int; st moderation;
begin
  select moderation_status into st from profiles where id = auth.uid();
  if st = 'suspended' then raise exception 'Your account is suspended.'; end if;
  select count(*) into n from profile_photos where user_id = auth.uid() and moderation_status = 'approved';
  if n <> 3 then raise exception 'Exactly three photos are required (found %).', n; end if;
  if exists (select 1 from profiles where id = auth.uid() and (bio is null or cardinality(interested_in) = 0)) then
    raise exception 'Complete your profile before publishing.';
  end if;
  update profiles set profile_complete = true, moderation_status = 'approved' where id = auth.uid() and moderation_status in ('pending','approved','rejected');
end $$;

create or replace function can_view_photo(p_path text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profile_photos pp join profiles p on p.id = pp.user_id
    where pp.storage_path = p_path and not is_blocked_between(auth.uid(), p.id)
      and ((p.profile_complete and p.moderation_status = 'approved' and p.visibility_status = 'visible' and p.deleted_at is null)
           or (p.moderation_status <> 'suspended' and exists (select 1 from matches m where m.status = 'active'
                 and m.user_a_id = least(auth.uid(), p.id) and m.user_b_id = greatest(auth.uid(), p.id)))))
$$;

create or replace function discover_profiles(page_size int default 10, page_offset int default 0)
returns table (id uuid, display_name text, age int, neighbourhood text, bio text, interests text[], languages text[],
               relationship_intention text, verified boolean, photo_paths text[])
language sql stable security definer set search_path = public as $$
  select p.id, p.display_name, date_part('year', age(p.date_of_birth))::int,
         case when p.show_neighbourhood then p.neighbourhood end, p.bio,
         p.interests, p.languages, p.relationship_intention, p.verified,
         array(select pp.storage_path from profile_photos pp where pp.user_id = p.id order by pp.display_order)
  from profiles p
  join profiles me on me.id = auth.uid() and me.profile_complete and me.moderation_status = 'approved'
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

create or replace function list_matches()
returns table (match_id uuid, conversation_id uuid, user_id uuid, display_name text, age int, verified boolean, photo_path text, matched_at timestamptz)
language sql stable security definer set search_path = public as $$
  select m.id, c.id, p.id, p.display_name, date_part('year', age(p.date_of_birth))::int, p.verified,
         (select pp.storage_path from profile_photos pp where pp.user_id = p.id order by pp.display_order limit 1), m.created_at
  from matches m
  join conversations c on c.match_id = m.id
  join profiles p on p.id = case when m.user_a_id = auth.uid() then m.user_b_id else m.user_a_id end
  where auth.uid() in (m.user_a_id, m.user_b_id) and p.deleted_at is null and conversation_open(c.id)
  order by m.created_at desc
$$;

create or replace function list_conversations()
returns table (conversation_id uuid, user_id uuid, display_name text, age int, verified boolean, photo_path text,
               last_message text, last_message_at timestamptz, last_sender_id uuid, unread_count int, matched_at timestamptz)
language sql stable security definer set search_path = public as $$
  select c.id, p.id, p.display_name, date_part('year', age(p.date_of_birth))::int, p.verified,
         (select pp.storage_path from profile_photos pp where pp.user_id = p.id order by pp.display_order limit 1),
         left(lm.content, 80), lm.created_at, lm.sender_user_id,
         (select count(*)::int from messages x where x.conversation_id = c.id and x.sender_user_id <> auth.uid() and x.deleted_at is null
            and x.created_at > coalesce((select r.last_read_at from conversation_reads r where r.conversation_id = c.id and r.user_id = auth.uid()), '-infinity'::timestamptz)),
         m.created_at
  from matches m
  join conversations c on c.match_id = m.id
  join profiles p on p.id = case when m.user_a_id = auth.uid() then m.user_b_id else m.user_a_id end
  left join lateral (select content, created_at, sender_user_id from messages where conversation_id = c.id and deleted_at is null order by created_at desc limit 1) lm on true
  where auth.uid() in (m.user_a_id, m.user_b_id) and p.deleted_at is null and conversation_open(c.id)
  order by coalesce(lm.created_at, m.created_at) desc
$$;

-- ---------- Blocks ----------
create or replace function list_blocks() returns table (user_id uuid, display_name text, blocked_at timestamptz)
language sql stable security definer set search_path = public as $$
  select b.blocked_user_id, p.display_name, b.created_at from user_blocks b join profiles p on p.id = b.blocked_user_id
  where b.blocker_user_id = auth.uid() order by b.created_at desc
$$;
-- Unblocking removes the block only. A match that the block closed stays closed.
create or replace function unblock_user(target uuid) returns void
language sql security definer set search_path = public as $$
  delete from user_blocks where blocker_user_id = auth.uid() and blocked_user_id = target
$$;

-- ---------- Moderation of reports ----------
create or replace function list_open_reports()
returns table (report_id uuid, category text, description text, created_at timestamptz, reporter_name text,
               reported_id uuid, reported_name text, reported_status text, reports_against int)
language plpgsql stable security definer set search_path = public as $$
begin
  if not (has_role('moderator') or has_role('admin')) then raise exception 'Not allowed.'; end if;
  return query
    select r.id, r.category, r.description, r.created_at, rp.display_name, r.reported_user_id, dp.display_name, dp.moderation_status::text,
           (select count(*)::int from user_reports x where x.reported_user_id = r.reported_user_id)
    from user_reports r join profiles rp on rp.id = r.reporter_user_id join profiles dp on dp.id = r.reported_user_id
    where r.status in ('open','reviewing') order by r.created_at limit 50;
end $$;

create or replace function resolve_report(p_report uuid, p_action text) returns void
language plpgsql security definer set search_path = public as $$
declare r user_reports;
begin
  if not (has_role('moderator') or has_role('admin')) then raise exception 'Not allowed.'; end if;
  if p_action not in ('dismiss','suspend') then raise exception 'Invalid action.'; end if;
  select * into r from user_reports where id = p_report and status in ('open','reviewing') for update;
  if not found then raise exception 'Report not found or already resolved.'; end if;
  if p_action = 'dismiss' then
    update user_reports set status = 'dismissed', reviewed_at = now() where id = p_report;
  else
    if r.reported_user_id = auth.uid() or exists (select 1 from user_roles where user_id = r.reported_user_id)
      then raise exception 'Staff accounts cannot be suspended here.'; end if;
    update profiles set moderation_status = 'suspended' where id = r.reported_user_id;
    update user_reports set status = 'actioned', reviewed_at = now() where reported_user_id = r.reported_user_id and status in ('open','reviewing');
  end if;
end $$;

create or replace function reinstate_user(target uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not (has_role('moderator') or has_role('admin')) then raise exception 'Not allowed.'; end if;
  update profiles set moderation_status = case when profile_complete then 'approved'::moderation else 'pending'::moderation end
   where id = target and moderation_status = 'suspended';
end $$;

revoke execute on function list_blocks(), unblock_user(uuid), list_open_reports(), resolve_report(uuid, text), reinstate_user(uuid),
  discover_profiles(int,int), list_matches(), list_conversations(), publish_profile(), conversation_open(uuid), can_view_photo(text) from public, anon;
grant execute on function list_blocks(), unblock_user(uuid), list_open_reports(), resolve_report(uuid, text), reinstate_user(uuid),
  discover_profiles(int,int), list_matches(), list_conversations(), publish_profile(), conversation_open(uuid), can_view_photo(text) to authenticated;

create or replace function list_suspended_users() returns table (user_id uuid, display_name text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not (has_role('moderator') or has_role('admin')) then raise exception 'Not allowed.'; end if;
  return query select p.id, p.display_name from profiles p where p.moderation_status = 'suspended' order by p.updated_at desc limit 100;
end $$;
revoke execute on function list_suspended_users() from public, anon;
grant execute on function list_suspended_users() to authenticated;
