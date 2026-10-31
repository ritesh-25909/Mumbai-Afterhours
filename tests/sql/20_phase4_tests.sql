-- Phase 4 scenarios use fresh users E, F, G. Requires helpers from 10_security_tests.sql.
insert into auth.users(id,email) values ('e0000000-0000-0000-0000-00000000000e','e@x'),('f0000000-0000-0000-0000-00000000000f','f@x'),('90000000-0000-0000-0000-000000000009','g@x');
insert into profiles(id,display_name,date_of_birth,gender,interested_in,bio) values
 ('e0000000-0000-0000-0000-00000000000e','Esha','1995-01-01','woman','{man,woman}','Hello there friends'),
 ('f0000000-0000-0000-0000-00000000000f','Farid','1994-01-01','man','{woman,man}','Hello there friends'),
 ('90000000-0000-0000-0000-000000000009','Gita','1993-01-01','woman','{man,woman}','Hello there friends');
do $$ declare x uuid; begin
 foreach x in array array['e0000000-0000-0000-0000-00000000000e','f0000000-0000-0000-0000-00000000000f','90000000-0000-0000-0000-000000000009']::uuid[] loop
  for i in 1..3 loop
    insert into profile_photos(user_id,storage_path,display_order) values (x, x||'/'||i||'.webp', i);
    insert into storage.objects(bucket_id,name) values ('profile-photos', x||'/'||i||'.webp');
  end loop;
  update profiles set profile_complete = true, moderation_status = 'approved' where id = x;
 end loop; end $$;

do $$ declare e uuid := 'e0000000-0000-0000-0000-00000000000e'; f uuid := 'f0000000-0000-0000-0000-00000000000f'; g uuid := '90000000-0000-0000-0000-000000000009'; r jsonb; n int; begin
  perform t.as_user(e);
  perform t.ok('discover returns 3 photo paths', exists (select 1 from discover_profiles(10,0) d where d.id = f and cardinality(d.photo_paths) = 3));
  perform t.ok('discover exposes no date_of_birth column', not exists (select 1 from information_schema.columns where table_name = 'discover_profiles' and column_name = 'date_of_birth'));
  perform t.back(); perform t.as_user(g);
  perform t.ok('stranger can read photo of visible published profile', (select count(*) from storage.objects where bucket_id='profile-photos' and name = f||'/1.webp') = 1);
  perform t.back(); perform t.as_user(e); perform like_user(f);
  perform t.back(); perform t.as_user(f); r := like_user(e); perform t.ok('E and F matched', (r->>'matched')::boolean);
  perform t.ok('list_matches shows partner with photo', exists (select 1 from list_matches() l where l.user_id = e and l.photo_path = e||'/1.webp'));
  perform t.back(); perform t.as_user(g);
  perform t.ok('list_matches empty for non-matched user', (select count(*) from list_matches()) = 0);
  perform t.back();
  update profiles set visibility_status = 'hidden' where id = f;
  perform t.as_user(g);
  perform t.ok('stranger cannot read photo of hidden profile', (select count(*) from storage.objects where bucket_id='profile-photos' and name = f||'/1.webp') = 0);
  perform t.back(); perform t.as_user(e);
  perform t.ok('matched user can still read hidden partner photo', (select count(*) from storage.objects where bucket_id='profile-photos' and name = f||'/1.webp') = 1);
  update matches set status = 'active';  -- no UPDATE policy: must touch 0 rows
  get diagnostics n = row_count; perform t.ok('client cannot update matches', n = 0);
  perform t.back(); update profiles set visibility_status = 'visible' where id = f;
end $$;

-- Unmatch is permanent
do $$ declare e uuid := 'e0000000-0000-0000-0000-00000000000e'; f uuid := 'f0000000-0000-0000-0000-00000000000f'; mid uuid; begin
  select id into mid from matches where user_a_id = least(e,f) and user_b_id = greatest(e,f);
  perform t.as_user(e);
  perform unmatch(mid);
  perform t.ok('unmatched pair leaves list_matches', (select count(*) from list_matches()) = 0);
  perform t.ok('likes cleared on unmatch', (select count(*) from likes where actor_user_id in (e,f) and target_user_id in (e,f)) = 0);
  perform t.fails('cannot re-like after unmatch', format('select like_user(%L)', f));
  perform t.ok('unmatched user not rediscoverable', not exists (select 1 from discover_profiles(10,0) where id = f));
  perform t.fails('cannot unmatch twice', format('select unmatch(%L)', mid));
  perform t.back(); perform t.as_user(f);
  perform t.fails('other side cannot re-like after unmatch', format('select like_user(%L)', e));
end $$;

-- Block closes existing match
do $$ declare e uuid := 'e0000000-0000-0000-0000-00000000000e'; g uuid := '90000000-0000-0000-0000-000000000009'; cid uuid; begin
  perform t.as_user(e); perform like_user(g);
  perform t.back(); perform t.as_user(g); perform like_user(e);
  perform t.back(); select c.id into cid from conversations c join matches m on m.id = c.match_id where m.user_a_id = least(e,g) and m.user_b_id = greatest(e,g);
  perform t.as_user(e);
  insert into messages(conversation_id,sender_user_id,content) values (cid,e,'before block');
  perform block_user(g); perform block_user(g);
  perform t.ok('block closes the match', (select status from matches where user_a_id = least(e,g) and user_b_id = greatest(e,g)) = 'blocked');
  perform t.fails('no messages after block', format('insert into messages(conversation_id,sender_user_id,content) values (%L,%L,%L)', cid, e, 'x'));
  perform t.fails('cannot block self', format('select block_user(%L)', e));
  perform t.ok('blocked match leaves list_matches', (select count(*) from list_matches()) = 0);
  perform t.back(); perform t.as_user(g);
  perform t.fails('blocked user cannot message', format('insert into messages(conversation_id,sender_user_id,content) values (%L,%L,%L)', cid, g, 'x'));
  perform t.fails('blocked user cannot like blocker', format('select like_user(%L)', e));
  perform t.ok('blocker hidden from blocked user in discovery', not exists (select 1 from discover_profiles(10,0) where id = e));
end $$;
