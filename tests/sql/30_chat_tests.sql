-- Phase 5 chat scenarios with users H, I, J.
insert into auth.users(id,email) values ('a1000000-0000-0000-0000-0000000000a1','h@x'),('a2000000-0000-0000-0000-0000000000a2','i@x'),('a3000000-0000-0000-0000-0000000000a3','j@x');
insert into profiles(id,display_name,date_of_birth,gender,interested_in,bio) values
 ('a1000000-0000-0000-0000-0000000000a1','Hari','1992-01-01','man','{woman}','Hello there friends'),
 ('a2000000-0000-0000-0000-0000000000a2','Isha','1993-01-01','woman','{man}','Hello there friends'),
 ('a3000000-0000-0000-0000-0000000000a3','Jay','1991-01-01','man','{woman}','Hello there friends');
do $$ declare x uuid; begin
 foreach x in array array['a1000000-0000-0000-0000-0000000000a1','a2000000-0000-0000-0000-0000000000a2','a3000000-0000-0000-0000-0000000000a3']::uuid[] loop
  for i in 1..3 loop insert into profile_photos(user_id,storage_path,display_order) values (x, x||'/'||i||'.webp', i); end loop;
  update profiles set profile_complete = true, moderation_status = 'approved' where id = x;
 end loop; end $$;

do $$ declare h uuid := 'a1000000-0000-0000-0000-0000000000a1'; i uuid := 'a2000000-0000-0000-0000-0000000000a2'; j uuid := 'a3000000-0000-0000-0000-0000000000a3';
  cid uuid; mid uuid := gen_random_uuid(); n int; begin
  perform t.as_user(h); perform like_user(i);
  perform t.back(); perform t.as_user(i); perform like_user(h);
  perform t.back(); select c.id into cid from conversations c join matches m on m.id = c.match_id where m.user_a_id = least(h,i) and m.user_b_id = greatest(h,i);
  perform t.as_user(h);
  insert into messages(id,conversation_id,sender_user_id,content) values (mid,cid,h,'hello Isha');
  perform t.ok('send with client id works', true);
  perform t.fails('duplicate client id rejected (idempotent retry)', format('insert into messages(id,conversation_id,sender_user_id,content) values (%L,%L,%L,%L)', mid, cid, h, 'hello Isha'));
  perform t.fails('cannot forge created_at', format('insert into messages(conversation_id,sender_user_id,content,created_at) values (%L,%L,%L,%L)', cid, h, 'x', now() - interval '1 year'));
  perform t.fails('whitespace-only message rejected', format('insert into messages(conversation_id,sender_user_id,content) values (%L,%L,%L)', cid, h, '   '));
  perform t.fails('over-long message rejected', format('insert into messages(conversation_id,sender_user_id,content) values (%L,%L,%L)', cid, h, repeat('a', 2001)));
  perform t.fails('messages cannot be edited', $q$update messages set content = 'edited'$q$);
  perform t.fails('messages cannot be deleted', 'delete from messages');
  perform t.ok('sender has no unread for own message', (select unread_count from list_conversations() where conversation_id = cid) = 0);
  perform t.back(); perform t.as_user(i);
  perform t.ok('recipient sees 1 unread with preview', exists (select 1 from list_conversations() where conversation_id = cid and unread_count = 1 and last_message = 'hello Isha' and last_sender_id = h));
  perform t.ok('unread_total counts it', unread_total() = 1);
  perform mark_conversation_read(cid);
  perform t.ok('mark read clears unread', unread_total() = 0);
  perform t.back(); perform t.as_user(j);
  perform t.ok('outsider sees no conversations', (select count(*) from list_conversations()) = 0);
  perform t.ok('outsider gets nothing from get_conversation', (select count(*) from get_conversation(cid)) = 0);
  perform t.fails('outsider cannot mark read', format('select mark_conversation_read(%L)', cid));
  perform t.ok('outsider cannot read read-receipts', (select count(*) from conversation_reads) = 0);
  perform t.back(); perform t.as_user(i);
  perform t.ok('get_conversation open for participant', (select is_open and display_name = 'Hari' from get_conversation(cid)));
  insert into messages(conversation_id,sender_user_id,content) values (cid,i,'hi Hari');
  perform t.ok('conversation updated_at bumped by trigger', (select updated_at from conversations where id = cid) >= now() - interval '5 seconds');
  perform t.back(); perform t.as_user(h);
  perform t.ok('sender sees recipient reply as unread', unread_total() = 1);
end $$;

-- Closed conversations disappear for both sides
do $$ declare h uuid := 'a1000000-0000-0000-0000-0000000000a1'; i uuid := 'a2000000-0000-0000-0000-0000000000a2'; cid uuid; mid uuid; begin
  select c.id, c.match_id into cid, mid from conversations c join matches m on m.id = c.match_id where m.user_a_id = least(h,i) and m.user_b_id = greatest(h,i);
  perform t.as_user(i); perform unmatch(mid);
  perform t.ok('closed: history hidden from unmatcher', (select count(*) from messages where conversation_id = cid) = 0);
  perform t.ok('closed: conversation reveals nothing', (select not is_open and display_name is null and photo_path is null from get_conversation(cid)));
  perform t.ok('closed: not in inbox', (select count(*) from list_conversations()) = 0);
  perform t.back(); perform t.as_user(h);
  perform t.ok('closed: history hidden from other side', (select count(*) from messages where conversation_id = cid) = 0);
  perform t.fails('closed: cannot send', format('insert into messages(conversation_id,sender_user_id,content) values (%L,%L,%L)', cid, h, 'still there?'));
end $$;

-- Rate limit (last: it blocks sender H for a minute)
do $$ declare h uuid := 'a1000000-0000-0000-0000-0000000000a1'; j uuid := 'a3000000-0000-0000-0000-0000000000a3'; cid uuid; failed boolean := false; begin
  perform t.as_user(h); perform like_user(j);
  perform t.back(); perform t.as_user(j); perform like_user(h);
  perform t.back(); select c.id into cid from conversations c join matches m on m.id = c.match_id where m.user_a_id = least(h,j) and m.user_b_id = greatest(h,j);
  perform t.as_user(h);
  begin for k in 1..40 loop insert into messages(conversation_id,sender_user_id,content) values (cid,h,'spam '||k); end loop;
  exception when others then failed := true; end;
  perform t.ok('send rate limit stops bursts', failed);
end $$;
