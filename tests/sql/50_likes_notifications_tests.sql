-- Like comments, notifications, profile access and reciprocal match scenarios.
insert into auth.users(id,email) values
 ('80000000-0000-0000-0000-000000000008','h@x'),
 ('60000000-0000-0000-0000-000000000006','i@x');

insert into profiles(id,display_name,date_of_birth,gender,interested_in,bio) values
 ('80000000-0000-0000-0000-000000000008','Heena','1995-01-01','woman','{man,woman}','Hello there friends'),
 ('60000000-0000-0000-0000-000000000006','Ishaan','1994-01-01','man','{woman,man}','Hello there friends');

do $$ declare x uuid; begin
 foreach x in array array['80000000-0000-0000-0000-000000000008','60000000-0000-0000-0000-000000000006']::uuid[] loop
  for i in 1..3 loop
    insert into profile_photos(user_id,storage_path,display_order)
    values (x, x||'/'||i||'.webp', i);
  end loop;
  update profiles set profile_complete = true, moderation_status = 'approved' where id = x;
 end loop;
end $$;

do $$ declare
 h uuid := '80000000-0000-0000-0000-000000000008';
 i uuid := '60000000-0000-0000-0000-000000000006';
 r jsonb;
begin
  perform t.as_user(h);
  r := send_like(i, 'I liked your answer about weekend plans.');
  perform t.ok('like with comment is stored', (select comment = 'I liked your answer about weekend plans.' from likes where actor_user_id = h and target_user_id = i));
  perform t.ok('like creates one recipient notification', (select count(*) = 1 from notifications where recipient_user_id = i and notification_type = 'like'));
  perform t.fails('client cannot insert notification directly',
    format('insert into notifications(recipient_user_id,actor_user_id,target_user_id,notification_type) values (%L,%L,%L,%L)', i, h, i, 'like'));
  perform t.ok('duplicate like does not duplicate notification', (select count(*) = 1 from notifications where recipient_user_id = i and notification_type = 'like'));
  perform t.ok('duplicate like does not create duplicate like row', (select count(*) = 1 from likes where actor_user_id = h and target_user_id = i));
  perform t.fails('comment over 300 chars rejected', format('select send_like(%L, %L)', i, repeat('x',301)));
  perform t.back();

  perform t.as_user(i);
  perform t.ok('recipient sees sender and comment in incoming likes',
    exists (select 1 from list_incoming_likes() l where l.user_id = h and l.comment = 'I liked your answer about weekend plans.'));
  perform t.ok('recipient sees sender notification',
    exists (select 1 from list_notifications() n where n.actor_user_id = h and n.notification_type = 'like' and n.like_comment = 'I liked your answer about weekend plans.'));
  perform t.ok('recipient can open sender profile',
    (get_profile_for_view(h)->>'display_name') = 'Heena');
  perform t.ok('recipient can mark notification read',
    (select count(*) = 1 from notifications where recipient_user_id = i and read_at is null));
  perform mark_notification_read((select id from notifications where recipient_user_id = i and notification_type = 'like'));
  perform t.ok('notification read state is updated',
    (select read_at is not null from notifications where recipient_user_id = i and notification_type = 'like'));

  r := send_like(h, null);
  perform t.ok('reciprocal like creates mutual match', (r->>'matched')::boolean);
  perform t.ok('one canonical match and conversation exist',
    (select count(*) = 1 from matches where user_a_id = least(h,i) and user_b_id = greatest(h,i))
    and (select count(*) = 1 from conversations c join matches m on m.id = c.match_id where m.user_a_id = least(h,i) and m.user_b_id = greatest(h,i)));
  perform t.ok('both users receive one match notification',
    (select count(*) = 2 from notifications where notification_type = 'match' and match_id = (r->>'match_id')::uuid));
  perform t.back();

  perform t.as_user(h);
  perform t.ok('sender also sees mutual match notification',
    exists (select 1 from list_notifications() n where n.notification_type = 'match' and n.actor_user_id = i));
  perform t.back();

  perform t.as_user('70000000-0000-0000-0000-000000000007');
  perform t.ok('unrelated user cannot read other users notifications',
    (select count(*) = 0 from notifications where recipient_user_id = i));
  perform t.back();
end $$;
