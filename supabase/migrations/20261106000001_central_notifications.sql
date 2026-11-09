-- Central notification centre: additive extension of the existing likes/matches notifications.
-- Existing rows and relationships are preserved.

alter table public.notifications alter column actor_user_id drop not null;

alter table public.notifications
  add column if not exists title text,
  add column if not exists body text,
  add column if not exists action_path text,
  add column if not exists entity_id uuid,
  add column if not exists dedupe_key text;

alter table public.notifications
  drop constraint if exists notifications_notification_type_check;
alter table public.notifications
  add constraint notifications_notification_type_check
  check (notification_type in (
    'like', 'match', 'comment', 'message', 'date_invitation',
    'verification', 'security_alert', 'announcement'
  ));

alter table public.notifications
  drop constraint if exists notifications_match_reference;
alter table public.notifications
  add constraint notifications_match_reference check (
    (notification_type = 'match' and match_id is not null)
    or (notification_type <> 'match' and match_id is null)
  );

create unique index if not exists notifications_dedupe_key_uidx
  on public.notifications(dedupe_key) where dedupe_key is not null;
create index if not exists notifications_unread_recipient_idx
  on public.notifications(recipient_user_id, created_at desc)
  where read_at is null;

-- Preserve the existing owner-only read policy; all writes happen in trusted triggers/RPCs.
alter table public.notifications enable row level security;
drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications
  for select to authenticated using (recipient_user_id = auth.uid());
revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;

drop function if exists public.list_notifications();

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
  read_at timestamptz,
  title text,
  body text,
  action_path text,
  entity_id uuid
)
language sql stable security definer set search_path = public as $$
  select n.id, n.notification_type, n.actor_user_id,
    coalesce(p.display_name, 'Mumbai Afterhours'), coalesce(p.verified, false),
    (select pp.storage_path from public.profile_photos pp
      where pp.user_id = p.id order by pp.display_order limit 1),
    n.like_comment, n.match_id, n.created_at, n.read_at,
    coalesce(n.title, case n.notification_type
      when 'like' then 'New like'
      when 'match' then 'It’s a match!'
      when 'comment' then 'New comment'
      when 'message' then 'New message'
      when 'date_invitation' then 'Date invitation'
      when 'verification' then 'Profile verification update'
      when 'security_alert' then 'Security alert'
      when 'announcement' then 'Important announcement'
      else 'New notification' end),
    coalesce(n.body, n.like_comment), n.action_path, n.entity_id
  from public.notifications n
  left join public.profiles p on p.id = n.actor_user_id
  where n.recipient_user_id = auth.uid()
    and (p.id is null or (p.deleted_at is null and not public.is_blocked_between(auth.uid(), p.id)))
  order by n.created_at desc
  limit 100;
$$;

create or replace function public.mark_notification_read(notification_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.notifications set read_at = coalesce(read_at, now())
  where id = notification_id and recipient_user_id = auth.uid();
$$;

create or replace function public.mark_all_notifications_read()
returns integer language plpgsql security definer set search_path = public as $$
declare changed integer;
begin
  if auth.uid() is null then raise exception 'Not authenticated.'; end if;
  update public.notifications set read_at = now()
    where recipient_user_id = auth.uid() and read_at is null;
  get diagnostics changed = row_count;
  return changed;
end;
$$;

-- A message creates one notification for the other participant in its active match.
create or replace function public.notify_message_recipient()
returns trigger language plpgsql security definer set search_path = public as $$
declare recipient uuid; mid uuid; conv_id uuid;
begin
  select c.match_id, c.id into mid, conv_id from public.conversations c where c.id = new.conversation_id;
  select case when m.user_a_id = new.sender_user_id then m.user_b_id else m.user_a_id end
    into recipient
    from public.matches m
    where m.id = mid and m.status = 'active'
      and new.sender_user_id in (m.user_a_id, m.user_b_id);
  if recipient is null or recipient = new.sender_user_id then return new; end if;

  insert into public.notifications(
    recipient_user_id, actor_user_id, target_user_id, notification_type,
    title, body, action_path, entity_id, dedupe_key
  ) values (
    recipient, new.sender_user_id, recipient, 'message',
    'New message', left(new.content, 180), '/chat/' || conv_id::text,
    new.id, 'message:' || new.id::text
  ) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists messages_notify_recipient on public.messages;
create trigger messages_notify_recipient after insert on public.messages
  for each row when (new.deleted_at is null)
  execute function public.notify_message_recipient();

-- Notify the profile owner after a moderator/admin completes verification review.
create or replace function public.notify_verification_result()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.status is distinct from new.status and new.status in ('approved', 'rejected', 'retry') then
    insert into public.notifications(
      recipient_user_id, actor_user_id, target_user_id, notification_type,
      title, body, action_path, entity_id, dedupe_key
    ) values (
      new.user_id, new.reviewer_id, new.user_id, 'verification',
      case new.status when 'approved' then 'Profile verified'
        when 'rejected' then 'Verification needs attention'
        else 'Please retry verification' end,
      case new.status when 'approved' then 'Your profile has been verified.'
        when 'rejected' then 'Your verification was not approved. Review the guidance and try again.'
        else 'Please submit a clearer selfie to continue verification.' end,
      '/profile', new.id, 'verification:' || new.id::text || ':' || new.status::text
    ) on conflict do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists verification_result_notification on public.verification_requests;
create trigger verification_result_notification after update of status on public.verification_requests
  for each row execute function public.notify_verification_result();

-- Trusted staff can publish announcements/security notices. Users cannot impersonate system alerts.
create or replace function public.publish_app_notification(
  p_recipient uuid, p_type text, p_title text, p_body text,
  p_action_path text default null, p_dedupe_key text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare created_id uuid;
begin
  if auth.uid() is null or not (public.has_role('admin') or public.has_role('moderator')) then
    raise exception 'Not allowed.';
  end if;
  if p_type not in ('date_invitation', 'security_alert', 'announcement') then
    raise exception 'Unsupported notification type.';
  end if;
  if p_title is null or length(btrim(p_title)) = 0 or length(p_title) > 120
    or p_body is null or length(p_body) = 0 or length(p_body) > 1000 then
    raise exception 'Invalid notification content.';
  end if;
  insert into public.notifications(
    recipient_user_id, actor_user_id, target_user_id, notification_type,
    title, body, action_path, dedupe_key
  ) values (
    p_recipient, null, p_recipient, p_type, btrim(p_title), p_body,
    case when p_action_path like '/%' and p_action_path not like '//%' then p_action_path else null end,
    coalesce(p_dedupe_key, p_type || ':' || p_recipient::text || ':' || md5(p_title || p_body))
  ) on conflict do nothing returning id into created_id;
  return created_id;
end;
$$;

revoke execute on function public.list_notifications(),
  public.mark_notification_read(uuid), public.mark_all_notifications_read(),
  public.publish_app_notification(uuid, text, text, text, text, text)
  from public, anon;
grant execute on function public.list_notifications(),
  public.mark_notification_read(uuid), public.mark_all_notifications_read()
  to authenticated;
grant execute on function public.publish_app_notification(uuid, text, text, text, text, text)
  to authenticated;

-- Supabase Realtime publication; safe when already added.
do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null;
when undefined_object then null;
end $$;
