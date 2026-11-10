-- Admin notifications can target one member or the full member base.
-- Every notification expires from the in-app centre seven days after creation.

alter table public.notifications
  add column if not exists expires_at timestamptz;

update public.notifications
set expires_at = created_at + interval '7 days'
where expires_at is null;

alter table public.notifications
  alter column expires_at set default (now() + interval '7 days'),
  alter column expires_at set not null;

create index if not exists notifications_recipient_expiry_idx
  on public.notifications(recipient_user_id, expires_at desc);

-- Keep the existing RPC response contract; only exclude expired notifications.
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
    and n.expires_at > now()
    and (p.id is null or (p.deleted_at is null and not public.is_blocked_between(auth.uid(), p.id)))
  order by n.created_at desc
  limit 100;
$$;

create or replace function public.admin_send_notification(
  p_recipient_user_id uuid,
  p_title text,
  p_body text,
  p_action_path text default null
) returns integer
language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare
  r record;
  v_count integer := 0;
  v_title text := btrim(coalesce(p_title, ''));
  v_body text := btrim(coalesce(p_body, ''));
begin
  perform public.admin_assert();

  if length(v_title) not between 1 and 120 then
    raise exception 'Title must be 1-120 characters.';
  end if;
  if length(v_body) not between 1 and 1000 then
    raise exception 'Message must be 1-1000 characters.';
  end if;
  if p_action_path is not null and (p_action_path not like '/%' or p_action_path like '//%') then
    raise exception 'Destination must be an internal application path.';
  end if;

  if p_recipient_user_id is null then
    for r in select id from public.profiles where deleted_at is null order by id loop
      insert into public.notifications(
        recipient_user_id, actor_user_id, target_user_id, notification_type,
        title, body, action_path, dedupe_key
      ) values (
        r.id, null, r.id, 'announcement', v_title, v_body, p_action_path,
        'admin-notification:' || gen_random_uuid()::text
      );
      v_count := v_count + 1;
    end loop;
  else
    if not exists (select 1 from public.profiles where id = p_recipient_user_id and deleted_at is null) then
      raise exception 'Selected member was not found or is deleted.';
    end if;
    insert into public.notifications(
      recipient_user_id, actor_user_id, target_user_id, notification_type,
      title, body, action_path, dedupe_key
    ) values (
      p_recipient_user_id, null, p_recipient_user_id, 'announcement',
      v_title, v_body, p_action_path, 'admin-notification:' || gen_random_uuid()::text
    );
    v_count := 1;
  end if;

  insert into public.admin_audit_logs(admin_user_id, action, target_user_id, details)
  values (
    auth.uid(),
    case when p_recipient_user_id is null then 'broadcast_notification' else 'send_personal_notification' end,
    p_recipient_user_id,
    jsonb_build_object('recipient_count', v_count, 'title', v_title, 'expires_after_days', 7)
  );

  return v_count;
end;
$$;

revoke all on function public.admin_send_notification(uuid, text, text, text) from public, anon;
grant execute on function public.admin_send_notification(uuid, text, text, text) to authenticated;

comment on column public.notifications.expires_at is
  'After this timestamp the notification is omitted from the user notification centre; default lifetime is seven days.';
