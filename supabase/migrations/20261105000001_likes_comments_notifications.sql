-- Mumbai Afterhours: personalized likes, like/match notifications, and safe liker profile access.
-- Additive migration: preserves existing likes, matches, conversations, and relationships.

alter table public.likes
  add column if not exists comment text;

alter table public.likes
  drop constraint if exists likes_comment_length_check;
alter table public.likes
  add constraint likes_comment_length_check
  check (comment is null or char_length(comment) <= 300);

drop function if exists public.list_incoming_likes();

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references public.profiles(id) on delete cascade,
  actor_user_id uuid not null references public.profiles(id) on delete cascade,
  target_user_id uuid not null references public.profiles(id) on delete cascade,
  notification_type text not null check (notification_type in ('like', 'match')),
  like_comment text check (like_comment is null or char_length(like_comment) <= 300),
  match_id uuid references public.matches(id) on delete cascade,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  constraint notifications_not_self check (recipient_user_id <> actor_user_id),
  constraint notifications_match_reference check (
    (notification_type = 'like' and match_id is null)
    or (notification_type = 'match' and match_id is not null)
  ),
  constraint notifications_event_unique unique
    (recipient_user_id, notification_type, actor_user_id, target_user_id)
);

create index if not exists notifications_recipient_created_idx
  on public.notifications(recipient_user_id, created_at desc);

alter table public.notifications enable row level security;

drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own
  on public.notifications for select to authenticated
  using (recipient_user_id = auth.uid());

revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;

-- All writes are performed atomically through this security-definer RPC.
create or replace function public.send_like(target uuid, message text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  a uuid;
  b uuid;
  mid uuid;
  inserted_count int := 0;
  clean_message text := nullif(btrim(coalesce(message, '')), '');
begin
  if me is null then raise exception 'Not authenticated.'; end if;
  if target is null or me = target then raise exception 'You cannot like yourself.'; end if;
  if clean_message is not null and char_length(clean_message) > 300 then
    raise exception 'Your comment must be 300 characters or fewer.';
  end if;
  if public.is_blocked_between(me, target) then raise exception 'Unavailable.'; end if;

  if not exists (
    select 1 from public.profiles
    where id = me and profile_complete and moderation_status = 'approved' and deleted_at is null
  ) then raise exception 'Publish your profile first.'; end if;

  if not exists (
    select 1 from public.profiles
    where id = target and profile_complete and moderation_status = 'approved'
      and deleted_at is null and visibility_status = 'visible'
  ) then raise exception 'Unavailable.'; end if;

  -- Serialize both directions of a pair so concurrent reciprocal likes cannot create
  -- duplicate notifications or inconsistent match state.
  perform pg_advisory_xact_lock(
    hashtextextended(least(me::text, target::text) || ':' || greatest(me::text, target::text), 0)
  );

  if exists (
    select 1 from public.matches
    where user_a_id = least(me, target)
      and user_b_id = greatest(me, target)
      and status <> 'active'
  ) then raise exception 'Unavailable.'; end if;

  insert into public.likes(actor_user_id, target_user_id, comment)
  values (me, target, clean_message)
  on conflict (actor_user_id, target_user_id) do nothing;

  get diagnostics inserted_count = row_count;

  if inserted_count = 1 then
    insert into public.notifications(
      recipient_user_id, actor_user_id, target_user_id,
      notification_type, like_comment
    ) values (
      target, me, target, 'like', clean_message
    )
    on conflict do nothing;
  end if;

  if exists (
    select 1 from public.likes
    where actor_user_id = target and target_user_id = me
  ) then
    a := least(me, target);
    b := greatest(me, target);

    insert into public.matches(user_a_id, user_b_id)
    values (a, b)
    on conflict (user_a_id, user_b_id) do nothing;

    select id into mid
    from public.matches
    where user_a_id = a and user_b_id = b and status = 'active';

    if mid is null then raise exception 'This match is no longer available.'; end if;

    insert into public.conversations(match_id)
    values (mid)
    on conflict (match_id) do nothing;

    -- Each participant receives one match notification.
    insert into public.notifications(
      recipient_user_id, actor_user_id, target_user_id,
      notification_type, match_id
    ) values
      (me, target, me, 'match', mid),
      (target, me, target, 'match', mid)
    on conflict do nothing;

    return jsonb_build_object(
      'matched', true,
      'match_id', mid,
      'like_created', inserted_count = 1
    );
  end if;

  return jsonb_build_object(
    'matched', false,
    'match_id', null,
    'like_created', inserted_count = 1
  );
end;
$$;

-- Preserve the original RPC contract for any older client still calling like_user(uuid).
create or replace function public.like_user(target uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select public.send_like(target, null);
$$;

-- Incoming likes, including the optional personal note.
create or replace function public.list_incoming_likes()
returns table (
  user_id uuid,
  display_name text,
  age int,
  verified boolean,
  photo_path text,
  liked_at timestamptz,
  comment text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id,
    p.display_name,
    date_part('year', age(p.date_of_birth))::int,
    p.verified,
    (select pp.storage_path from public.profile_photos pp
      where pp.user_id = p.id order by pp.display_order limit 1),
    l.created_at,
    l.comment
  from public.likes l
  join public.profiles p on p.id = l.actor_user_id
  where l.target_user_id = auth.uid()
    and p.deleted_at is null
    and p.profile_complete
    and p.moderation_status = 'approved'
    and p.visibility_status = 'visible'
    and not public.is_blocked_between(auth.uid(), p.id)
    and not exists (
      select 1 from public.likes back_like
      where back_like.actor_user_id = auth.uid()
        and back_like.target_user_id = p.id
    )
  order by l.created_at desc;
$$;

-- Notification centre feed. Profile details are returned only to the notification recipient.
create or replace function public.list_notifications()
returns table (
  id uuid,
  notification_type text,
  actor_user_id uuid,
  actor_name text,
  actor_verified boolean,
  actor_photo_path text,
  like_comment text,
  match_id uuid,
  created_at timestamptz,
  read_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    n.id,
    n.notification_type,
    n.actor_user_id,
    p.display_name,
    p.verified,
    (select pp.storage_path from public.profile_photos pp
      where pp.user_id = p.id order by pp.display_order limit 1),
    n.like_comment,
    n.match_id,
    n.created_at,
    n.read_at
  from public.notifications n
  join public.profiles p on p.id = n.actor_user_id
  where n.recipient_user_id = auth.uid()
    and p.deleted_at is null
    and not public.is_blocked_between(auth.uid(), p.id)
    and (
      (n.notification_type = 'like' and p.visibility_status = 'visible')
      or exists (
        select 1 from public.matches m
        where m.id = n.match_id and m.status = 'active'
          and auth.uid() in (m.user_a_id, m.user_b_id)
      )
    )
  order by n.created_at desc
  limit 50;
$$;

create or replace function public.mark_notification_read(notification_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.notifications
  set read_at = coalesce(read_at, now())
  where id = notification_id and recipient_user_id = auth.uid();
$$;

-- Allow a person who received a like to inspect the sender's complete public profile.
-- Active matches retain the existing profile-view capability.
create or replace function public.get_profile_for_view(target_user_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  me uuid := auth.uid();
  result jsonb;
begin
  if me is null then raise exception 'Not authenticated.'; end if;
  if target_user_id is null or target_user_id = me then
    raise exception 'Profile unavailable.';
  end if;
  if public.is_blocked_between(me, target_user_id) then
    raise exception 'Profile unavailable.';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = target_user_id
      and p.deleted_at is null
      and p.profile_complete
      and p.moderation_status = 'approved'
      and (
        p.visibility_status = 'visible'
        or exists (
          select 1 from public.matches m
          where m.status = 'active'
            and m.user_a_id = least(me, target_user_id)
            and m.user_b_id = greatest(me, target_user_id)
        )
      )
      and (
        exists (
          select 1 from public.likes l
          where l.actor_user_id = target_user_id and l.target_user_id = me
        )
        or exists (
          select 1 from public.matches m
          where m.status = 'active'
            and m.user_a_id = least(me, target_user_id)
            and m.user_b_id = greatest(me, target_user_id)
        )
      )
  ) then
    raise exception 'Profile unavailable.';
  end if;

  select jsonb_build_object(
    'id', p.id,
    'display_name', p.display_name,
    'date_of_birth', p.date_of_birth,
    'gender', p.gender,
    'city', p.city,
    'neighbourhood', case when p.show_neighbourhood then p.neighbourhood else null end,
    'bio', p.bio,
    'languages', p.languages,
    'interests', p.interests,
    'relationship_intention', p.relationship_intention,
    'verified', p.verified,
    'college', to_jsonb(p)->'college',
    'education_status', to_jsonb(p)->'education_status',
    'height', to_jsonb(p)->'height',
    'occupation', to_jsonb(p)->'occupation',
    'profile_prompts', to_jsonb(p)->'profile_prompts',
    'photos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'storage_path', pp.storage_path,
        'display_order', pp.display_order,
        'prompt', to_jsonb(pp)->'prompt'
      ) order by pp.display_order)
      from public.profile_photos pp where pp.user_id = p.id
    ), '[]'::jsonb)
  )
  into result
  from public.profiles p
  where p.id = target_user_id;

  return result;
end;
$$;

revoke execute on function public.send_like(uuid, text),
  public.like_user(uuid),
  public.list_incoming_likes(),
  public.list_notifications(),
  public.mark_notification_read(uuid),
  public.get_profile_for_view(uuid)
from public, anon;

grant execute on function public.send_like(uuid, text),
  public.like_user(uuid),
  public.list_incoming_likes(),
  public.list_notifications(),
  public.mark_notification_read(uuid),
  public.get_profile_for_view(uuid)
to authenticated;

-- Realtime notification delivery (safe if publication is not configured).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'notifications'
     ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end
$$;
