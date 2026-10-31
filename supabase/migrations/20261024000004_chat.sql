-- Phase 5: chat. Read tracking, inbox RPCs, stricter message permissions, send rate limit, realtime.

create table conversation_reads (
  conversation_id uuid not null references conversations(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);
alter table conversation_reads enable row level security;
create policy reads_select_own on conversation_reads for select using (user_id = auth.uid());
-- no client writes: mark_conversation_read() is the only way in

-- "Open" = caller is a participant, the match is active, and nobody has blocked anybody.
create or replace function conversation_open(conv uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from conversations c join matches m on m.id = c.match_id
    where c.id = conv and auth.uid() in (m.user_a_id, m.user_b_id) and m.status = 'active'
      and not is_blocked_between(m.user_a_id, m.user_b_id))
$$;

-- History is only readable while the conversation is open (unmatch/block hides it from both sides).
drop policy messages_select on messages;
drop policy messages_insert on messages;
create policy messages_select on messages for select using (conversation_open(conversation_id));
create policy messages_insert on messages for insert with check (sender_user_id = auth.uid() and conversation_open(conversation_id));

-- Clients may set only these columns; no edits or deletes. The client-chosen id makes retries idempotent.
revoke insert, update, delete on messages from authenticated, anon;
grant insert (id, conversation_id, sender_user_id, content) on messages to authenticated;

create or replace function messages_before_insert() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if btrim(new.content) = '' then raise exception 'Message is empty.'; end if;
  if (select count(*) from messages where sender_user_id = new.sender_user_id and created_at > now() - interval '1 minute') >= 30
    then raise exception 'You are sending messages too quickly. Wait a moment.'; end if;
  return new;
end $$;
create trigger messages_guard before insert on messages for each row execute function messages_before_insert();

create or replace function messages_after_insert() returns trigger language plpgsql security definer set search_path = public as $$
begin update conversations set updated_at = now() where id = new.conversation_id; return null; end $$;
create trigger messages_touch after insert on messages for each row execute function messages_after_insert();

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
  where auth.uid() in (m.user_a_id, m.user_b_id) and m.status = 'active' and p.deleted_at is null and not is_blocked_between(m.user_a_id, m.user_b_id)
  order by coalesce(lm.created_at, m.created_at) desc
$$;

-- Header data for one conversation. A closed conversation (unmatched/blocked) reveals nothing about the other person.
create or replace function get_conversation(conv uuid)
returns table (conversation_id uuid, user_id uuid, display_name text, verified boolean, photo_path text, is_open boolean)
language sql stable security definer set search_path = public as $$
  select c.id,
         case when o.open then p.id end, case when o.open then p.display_name end, case when o.open then p.verified end,
         case when o.open then (select pp.storage_path from profile_photos pp where pp.user_id = p.id order by pp.display_order limit 1) end,
         o.open
  from conversations c
  join matches m on m.id = c.match_id
  join profiles p on p.id = case when m.user_a_id = auth.uid() then m.user_b_id else m.user_a_id end
  cross join lateral (select conversation_open(c.id) and p.deleted_at is null as open) o
  where c.id = conv and auth.uid() in (m.user_a_id, m.user_b_id)
$$;

create or replace function mark_conversation_read(conv uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not is_conversation_participant(conv) then raise exception 'Not allowed.'; end if;
  insert into conversation_reads(conversation_id, user_id, last_read_at) values (conv, auth.uid(), now())
  on conflict (conversation_id, user_id) do update set last_read_at = now();
end $$;

create or replace function unread_total() returns int
language sql stable security definer set search_path = public as $$
  select coalesce(sum(unread_count), 0)::int from list_conversations()
$$;

revoke execute on function conversation_open(uuid), list_conversations(), get_conversation(uuid), mark_conversation_read(uuid), unread_total() from public, anon;
grant execute on function conversation_open(uuid), list_conversations(), get_conversation(uuid), mark_conversation_read(uuid), unread_total() to authenticated;

do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table messages;
  end if;
end $$;
