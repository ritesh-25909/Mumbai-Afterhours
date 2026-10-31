-- Mumbai Afterhours: core schema, RLS, and secure RPCs.
-- Safe to run on a new Supabase project. RLS is enabled on every table.

create extension if not exists pgcrypto;

-- ---------- Enums ----------
create type visibility as enum ('visible','hidden');
create type moderation as enum ('pending','approved','rejected','suspended');
create type match_status as enum ('active','unmatched','blocked');
create type verification_status as enum ('none','pending','approved','rejected','retry');
create type report_status as enum ('open','reviewing','actioned','dismissed');
create type app_role as enum ('moderator','admin');

-- ---------- Tables ----------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 40),
  date_of_birth date not null,
  gender text not null,
  interested_in text[] not null default '{}',
  city text not null default 'Mumbai',
  neighbourhood text,
  bio text check (char_length(bio) <= 500),
  languages text[] not null default '{}',
  interests text[] not null default '{}' check (cardinality(interests) <= 15),
  relationship_intention text,
  profile_complete boolean not null default false,
  visibility_status visibility not null default 'visible',
  moderation_status moderation not null default 'pending',  -- only service role / moderators change this
  verified boolean not null default false,                  -- only set by verification review
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table profile_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  storage_path text not null unique,
  display_order smallint not null check (display_order between 1 and 3),
  moderation_status moderation not null default 'approved', -- MVP: reactive moderation via reports
  created_at timestamptz not null default now(),
  unique (user_id, display_order)   -- also caps a profile at 3 photos
);
create index on profile_photos(user_id);

create table user_preferences (
  user_id uuid primary key references profiles(id) on delete cascade,
  minimum_age smallint not null default 18 check (minimum_age >= 18),
  maximum_age smallint not null default 45 check (maximum_age <= 99),
  preferred_gender text[] not null default '{}',
  preferred_interests text[] not null default '{}',
  updated_at timestamptz not null default now(),
  check (minimum_age <= maximum_age)
);

create table user_blocks (
  blocker_user_id uuid not null references profiles(id) on delete cascade,
  blocked_user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_user_id, blocked_user_id),
  check (blocker_user_id <> blocked_user_id)
);
create index on user_blocks(blocked_user_id);

create table likes (
  actor_user_id uuid not null references profiles(id) on delete cascade,
  target_user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (actor_user_id, target_user_id),
  check (actor_user_id <> target_user_id)
);
create index on likes(target_user_id);

create table passes (
  actor_user_id uuid not null references profiles(id) on delete cascade,
  target_user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (actor_user_id, target_user_id),
  check (actor_user_id <> target_user_id)
);

create table matches (
  id uuid primary key default gen_random_uuid(),
  user_a_id uuid not null references profiles(id) on delete cascade,
  user_b_id uuid not null references profiles(id) on delete cascade,
  status match_status not null default 'active',
  created_at timestamptz not null default now(),
  unmatched_at timestamptz,
  check (user_a_id < user_b_id),          -- canonical ordering => one row per pair
  unique (user_a_id, user_b_id)
);
create index on matches(user_b_id);

create table conversations (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null unique references matches(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_user_id uuid not null references profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz
);
create index on messages(conversation_id, created_at desc);

create table verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  status verification_status not null default 'pending',
  verification_method text not null default 'manual_review',
  consent_recorded_at timestamptz not null,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewer_id uuid references auth.users(id),
  rejection_reason_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);  -- no images or biometric templates here; selfies live in a private bucket
create index on verification_requests(user_id);

create table user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid not null references profiles(id) on delete cascade,
  reported_user_id uuid not null references profiles(id) on delete cascade,
  category text not null check (category in ('fake_profile','impersonation','harassment','inappropriate_content','spam_scam','suspected_underage','other')),
  description text check (char_length(description) <= 1000),
  status report_status not null default 'open',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  check (reporter_user_id <> reported_user_id)
);

create table user_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  consent_type text not null check (consent_type in ('terms','privacy','verification_biometric')),
  policy_version text not null,
  accepted_at timestamptz not null default now(),
  withdrawn_at timestamptz
);

create table user_roles (
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  primary key (user_id, role)
);  -- managed only by the service role / SQL editor

-- ---------- Integrity triggers ----------
create or replace function enforce_adult() returns trigger language plpgsql as $$
begin
  if new.date_of_birth > (current_date - interval '18 years')::date then
    raise exception 'You must be 18 or older.' using errcode = '23514';
  end if;
  new.updated_at = now();
  return new;
end $$;
create trigger profiles_adult before insert or update on profiles
  for each row execute function enforce_adult();

-- ---------- Helper functions ----------
create or replace function has_role(r app_role) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from user_roles where user_id = auth.uid() and role = r)
$$;

create or replace function is_blocked_between(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from user_blocks
    where (blocker_user_id = a and blocked_user_id = b) or (blocker_user_id = b and blocked_user_id = a))
$$;

create or replace function is_conversation_participant(conv uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from conversations c join matches m on m.id = c.match_id
    where c.id = conv and auth.uid() in (m.user_a_id, m.user_b_id))
$$;

-- ---------- Row Level Security ----------
alter table profiles enable row level security;
alter table profile_photos enable row level security;
alter table user_preferences enable row level security;
alter table user_blocks enable row level security;
alter table likes enable row level security;
alter table passes enable row level security;
alter table matches enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table verification_requests enable row level security;
alter table user_reports enable row level security;
alter table user_consents enable row level security;
alter table user_roles enable row level security;

-- profiles: a user sees only their own row directly (it holds date_of_birth).
-- Other people's profiles are served by the discover_profiles / get_match_profile RPCs below.
create policy profiles_select_own on profiles for select using (id = auth.uid());
create policy profiles_insert_own on profiles for insert with check (id = auth.uid());
create policy profiles_update_own on profiles for update using (id = auth.uid()) with check (id = auth.uid());
-- Column-level grants stop users from touching moderation_status, verified, profile_complete, deleted_at.
revoke insert, update on profiles from authenticated, anon;
grant insert (id, display_name, date_of_birth, gender, interested_in, city, neighbourhood, bio, languages, interests, relationship_intention) on profiles to authenticated;
grant update (display_name, gender, interested_in, city, neighbourhood, bio, languages, interests, relationship_intention, visibility_status) on profiles to authenticated;

-- profile_photos: owner manages own rows; moderation_status is not writable by clients.
create policy photos_select_own on profile_photos for select using (user_id = auth.uid());
create policy photos_insert_own on profile_photos for insert with check (user_id = auth.uid() and storage_path like auth.uid()::text || '/%');
create policy photos_delete_own on profile_photos for delete using (user_id = auth.uid());
revoke insert, update on profile_photos from authenticated, anon;
grant insert (user_id, storage_path, display_order) on profile_photos to authenticated;

create policy prefs_own on user_preferences for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy blocks_select_own on user_blocks for select using (blocker_user_id = auth.uid());
create policy blocks_insert_own on user_blocks for insert with check (blocker_user_id = auth.uid());
create policy blocks_delete_own on user_blocks for delete using (blocker_user_id = auth.uid());

-- likes/passes/matches/conversations: no direct client writes. Writes go through RPCs.
create policy likes_select_own on likes for select using (actor_user_id = auth.uid());
create policy passes_select_own on passes for select using (actor_user_id = auth.uid());
create policy matches_select_participant on matches for select using (auth.uid() in (user_a_id, user_b_id));
create policy conversations_select_participant on conversations for select using (is_conversation_participant(id));

-- messages: participants read; sender must be caller, match active, no block.
create policy messages_select on messages for select using (is_conversation_participant(conversation_id));
create policy messages_insert on messages for insert with check (
  sender_user_id = auth.uid()
  and is_conversation_participant(conversation_id)
  and exists (select 1 from conversations c join matches m on m.id = c.match_id
              where c.id = conversation_id and m.status = 'active'
                and not is_blocked_between(m.user_a_id, m.user_b_id))
);

-- verification: users may read their own request status; creating/reviewing goes through Edge Functions (service role).
create policy verification_select_own on verification_requests for select using (user_id = auth.uid());

-- reports: reporter may file and read only own submissions; moderators read all.
create policy reports_insert_own on user_reports for insert with check (reporter_user_id = auth.uid());
create policy reports_select on user_reports for select using (reporter_user_id = auth.uid() or has_role('moderator') or has_role('admin'));
revoke update, delete on user_reports from authenticated, anon;

create policy consents_select_own on user_consents for select using (user_id = auth.uid());
create policy consents_insert_own on user_consents for insert with check (user_id = auth.uid());

-- user_roles has RLS on and no policies: clients cannot read or write it.

-- ---------- Secure RPCs ----------
-- Publish: requires complete fields and exactly 3 photos, in one transaction.
create or replace function publish_profile() returns void
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  select count(*) into n from profile_photos where user_id = auth.uid() and moderation_status = 'approved';
  if n <> 3 then raise exception 'Exactly three photos are required (found %).', n; end if;
  if exists (select 1 from profiles where id = auth.uid() and (bio is null or cardinality(interested_in) = 0)) then
    raise exception 'Complete your profile before publishing.';
  end if;
  update profiles set profile_complete = true, moderation_status = 'approved' where id = auth.uid();
end $$;

-- Like: records the like and creates one match if mutual. Server-side only.
create or replace function like_user(target uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); a uuid; b uuid; mid uuid; matched boolean := false;
begin
  if me is null then raise exception 'Not authenticated.'; end if;
  if me = target then raise exception 'You cannot like yourself.'; end if;
  if is_blocked_between(me, target) then raise exception 'Unavailable.'; end if;
  if not exists (select 1 from profiles where id = me and profile_complete and moderation_status = 'approved' and deleted_at is null)
    then raise exception 'Publish your profile first.'; end if;
  if not exists (select 1 from profiles where id = target and profile_complete and moderation_status = 'approved' and deleted_at is null and visibility_status = 'visible')
    then raise exception 'Unavailable.'; end if;

  insert into likes(actor_user_id, target_user_id) values (me, target) on conflict do nothing;

  if exists (select 1 from likes where actor_user_id = target and target_user_id = me) then
    a := least(me, target); b := greatest(me, target);
    insert into matches(user_a_id, user_b_id) values (a, b)
      on conflict (user_a_id, user_b_id) do update set status = 'active', unmatched_at = null
      returning id into mid;
    insert into conversations(match_id) values (mid) on conflict (match_id) do nothing;
    matched := true;
  end if;
  return jsonb_build_object('matched', matched, 'match_id', mid);
end $$;

create or replace function pass_user(target uuid) returns void
language sql security definer set search_path = public as $$
  insert into passes(actor_user_id, target_user_id) select auth.uid(), target where auth.uid() <> target on conflict do nothing
$$;

create or replace function unmatch(mid uuid) returns void
language sql security definer set search_path = public as $$
  update matches set status = 'unmatched', unmatched_at = now()
  where id = mid and auth.uid() in (user_a_id, user_b_id) and status = 'active'
$$;

-- Discovery: paginated, eligibility-filtered, exposes age (not date of birth).
create or replace function discover_profiles(page_size int default 10, page_offset int default 0)
returns table (id uuid, display_name text, age int, neighbourhood text, bio text, interests text[],
               relationship_intention text, verified boolean)
language sql stable security definer set search_path = public as $$
  select p.id, p.display_name, date_part('year', age(p.date_of_birth))::int, p.neighbourhood, p.bio,
         p.interests, p.relationship_intention, p.verified
  from profiles p
  join profiles me on me.id = auth.uid() and me.profile_complete
  left join user_preferences up on up.user_id = me.id
  where p.id <> me.id
    and p.profile_complete and p.moderation_status = 'approved' and p.visibility_status = 'visible' and p.deleted_at is null
    and not is_blocked_between(me.id, p.id)
    and not exists (select 1 from likes  l where l.actor_user_id = me.id and l.target_user_id = p.id)
    and not exists (select 1 from passes s where s.actor_user_id = me.id and s.target_user_id = p.id)
    and (cardinality(me.interested_in) = 0 or p.gender = any(me.interested_in))
    and date_part('year', age(p.date_of_birth)) between coalesce(up.minimum_age,18) and coalesce(up.maximum_age,99)
  order by p.created_at desc
  limit least(page_size, 30) offset greatest(page_offset, 0)
$$;

revoke execute on all functions in schema public from public, anon;
grant execute on function publish_profile(), like_user(uuid), pass_user(uuid), unmatch(uuid), discover_profiles(int,int) to authenticated;

-- ---------- Storage ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('profile-photos','profile-photos', false, 5242880, array['image/jpeg','image/png','image/webp']),
  ('verification-selfies','verification-selfies', false, 5242880, array['image/jpeg','image/webp'])
on conflict (id) do nothing;

-- Owners write only inside their own user-id folder.
create policy photos_obj_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy photos_obj_update on storage.objects for update to authenticated
  using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy photos_obj_delete on storage.objects for delete to authenticated
  using (bucket_id = 'profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);
-- Read: the owner, or anyone viewing a photo that belongs to a published, approved profile.
create policy photos_obj_select on storage.objects for select to authenticated
  using (bucket_id = 'profile-photos' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or exists (select 1 from profile_photos pp join profiles p on p.id = pp.user_id
               where pp.storage_path = name and p.profile_complete and p.moderation_status = 'approved'
                 and p.visibility_status = 'visible' and not is_blocked_between(auth.uid(), p.id))));

-- Selfies: owner may upload only; nobody but the service role / moderators may read.
create policy selfies_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'verification-selfies' and (storage.foldername(name))[1] = auth.uid()::text);
create policy selfies_moderator_read on storage.objects for select to authenticated
  using (bucket_id = 'verification-selfies' and (has_role('moderator') or has_role('admin')));
