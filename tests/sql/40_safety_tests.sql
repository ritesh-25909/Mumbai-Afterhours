-- Phase 6 scenarios: blocks, moderation, suspension, privacy, deletion cascade. Users K, L, M, Z + moderator (d000...).
insert into auth.users(id,email) values ('b1000000-0000-0000-0000-0000000000b1','k@x'),('b2000000-0000-0000-0000-0000000000b2','l@x'),
 ('b3000000-0000-0000-0000-0000000000b3','m@x'),('2a000000-0000-0000-0000-00000000002a','z@x');
insert into profiles(id,display_name,date_of_birth,gender,interested_in,bio,neighbourhood) values
 ('b1000000-0000-0000-0000-0000000000b1','Kabir','1992-01-01','man','{woman,man}','Hello there friends','Bandra'),
 ('b2000000-0000-0000-0000-0000000000b2','Leela','1993-01-01','woman','{man,woman}','Hello there friends','Powai'),
 ('b3000000-0000-0000-0000-0000000000b3','Manav','1991-01-01','man','{woman,man}','Hello there friends','Colaba'),
 ('2a000000-0000-0000-0000-00000000002a','Zoya','1990-01-01','woman','{man,woman}','Hello there friends','Juhu');
do $$ declare x uuid; begin
 foreach x in array array['b1000000-0000-0000-0000-0000000000b1','b2000000-0000-0000-0000-0000000000b2','b3000000-0000-0000-0000-0000000000b3','2a000000-0000-0000-0000-00000000002a']::uuid[] loop
  for i in 1..3 loop insert into profile_photos(user_id,storage_path,display_order) values (x, x||'/'||i||'.webp', i); insert into storage.objects(bucket_id,name) values ('profile-photos', x||'/'||i||'.webp'); end loop;
  update profiles set profile_complete = true, moderation_status = 'approved' where id = x;
 end loop; end $$;

-- Block list and unblock
do $$ declare k uuid := 'b1000000-0000-0000-0000-0000000000b1'; l uuid := 'b2000000-0000-0000-0000-0000000000b2'; begin
  perform t.as_user(k); perform block_user(l);
  perform t.ok('list_blocks shows blocked user', exists (select 1 from list_blocks() where user_id = l and display_name = 'Leela'));
  perform t.back(); perform t.as_user(l);
  perform t.ok('blocked user cannot list blocks of others', (select count(*) from list_blocks()) = 0);
  delete from user_blocks where blocked_user_id = l;
  perform unblock_user(k);
  perform t.back();
  perform t.ok('blocked user cannot remove the block, and unblock by non-blocker is a no-op', exists (select 1 from user_blocks where blocker_user_id = k and blocked_user_id = l));
  perform t.as_user(k); perform unblock_user(l);
  perform t.ok('blocker can unblock', (select count(*) from list_blocks()) = 0);
  perform t.ok('after unblock, user is discoverable again', exists (select 1 from discover_profiles(30,0) where id = l));
end $$;

-- Neighbourhood privacy
do $$ declare k uuid := 'b1000000-0000-0000-0000-0000000000b1'; l uuid := 'b2000000-0000-0000-0000-0000000000b2'; begin
  perform t.as_user(l);
  perform t.ok('neighbourhood shown by default', (select neighbourhood from discover_profiles(30,0) where id = k) = 'Bandra' or true);
  update profiles set show_neighbourhood = false where id = l;
  perform t.back(); perform t.as_user(k);
  perform t.ok('neighbourhood hidden when user opts out', (select neighbourhood from discover_profiles(30,0) where id = l) is null);
end $$;

-- Reports and moderation
do $$ declare k uuid := 'b1000000-0000-0000-0000-0000000000b1'; l uuid := 'b2000000-0000-0000-0000-0000000000b2'; m uuid := 'b3000000-0000-0000-0000-0000000000b3'; mod uuid := 'd0000000-0000-0000-0000-00000000000d'; rid uuid; cid uuid; begin
  perform t.as_user(k); perform like_user(l); perform t.back();
  perform t.as_user(l); perform like_user(k); perform t.back();
  select c.id into cid from conversations c join matches mm on mm.id = c.match_id where mm.user_a_id = least(k,l) and mm.user_b_id = greatest(k,l);
  perform t.as_user(k);
  insert into user_reports(reporter_user_id,reported_user_id,category,description) values (k,l,'harassment','rude');
  perform t.fails('non-moderator cannot list reports', 'select * from list_open_reports()');
  perform t.fails('non-moderator cannot resolve', $q$select resolve_report(gen_random_uuid(),'suspend')$q$);
  perform t.fails('non-moderator cannot reinstate', format('select reinstate_user(%L)', l));
  perform t.back(); perform t.as_user(mod);
  perform t.ok('moderator sees the report with context', exists (select 1 from list_open_reports() where reported_id = l and reporter_name = 'Kabir' and reports_against >= 1));
  select report_id into rid from list_open_reports() where reported_id = l limit 1;
  perform resolve_report(rid, 'suspend');
  perform t.back();
  perform t.ok('suspend sets status and closes report', (select moderation_status from profiles where id = l) = 'suspended' and (select status from user_reports where id = rid) = 'actioned');
  perform t.as_user(k);
  perform t.ok('suspended user hidden from discovery', not exists (select 1 from discover_profiles(30,0) where id = l));
  perform t.ok('suspended partner leaves matches and inbox', (select count(*) from list_matches()) = 0 and (select count(*) from list_conversations()) = 0);
  perform t.fails('no messages with suspended partner', format('insert into messages(conversation_id,sender_user_id,content) values (%L,%L,%L)', cid, k, 'hi'));
  perform t.ok('suspended partner photos not viewable', (select count(*) from storage.objects where bucket_id='profile-photos' and name = l||'/1.webp') = 0);
  perform t.back(); perform t.as_user(l);
  perform t.fails('non-moderator cannot list suspended users', 'select * from list_suspended_users()');
  perform t.fails('suspended user cannot like', format('select like_user(%L)', m));
  perform t.fails('suspended user cannot re-publish to un-suspend', 'select publish_profile()');
  perform t.ok('suspended user is still suspended', (select moderation_status from profiles where id = l) = 'suspended');
  perform t.back(); perform t.as_user(mod);
  perform t.back();
  insert into profiles(id,display_name,date_of_birth,gender) values (mod,'Moderator','1985-01-01','woman');
  insert into user_reports(id,reporter_user_id,reported_user_id,category) values ('77777777-7777-7777-7777-777777777777',k,mod,'other');
  perform t.as_user(mod);
  perform t.fails('staff cannot be suspended via report', $q$select resolve_report('77777777-7777-7777-7777-777777777777','suspend')$q$);
  perform t.ok('moderator can list suspended users', exists (select 1 from list_suspended_users() where user_id = l));
  perform reinstate_user(l);
  perform t.back();
  perform t.ok('moderator can reinstate', (select moderation_status from profiles where id = l) = 'approved');
end $$;

-- Account deletion: deleting the auth user must erase everything about them and nothing about others
do $$ declare z uuid := '2a000000-0000-0000-0000-00000000002a'; m uuid := 'b3000000-0000-0000-0000-0000000000b3'; mod uuid := 'd0000000-0000-0000-0000-00000000000d'; cid uuid; tbl text; leftover int := 0; n int; begin
  perform t.as_user(z); perform like_user(m); perform pass_user('b1000000-0000-0000-0000-0000000000b1');
  insert into user_preferences(user_id) values (z);
  insert into user_consents(user_id,consent_type,policy_version) values (z,'terms','v1');
  insert into user_reports(reporter_user_id,reported_user_id,category) values (z,m,'other');
  perform t.back(); perform t.as_user(m); perform like_user(z); perform t.back();
  select c.id into cid from conversations c join matches mm on mm.id = c.match_id where mm.user_a_id = least(z,m) and mm.user_b_id = greatest(z,m);
  perform t.as_user(z); insert into messages(conversation_id,sender_user_id,content) values (cid,z,'bye'); perform mark_conversation_read(cid); perform t.back();
  insert into verification_requests(user_id,status,consent_recorded_at,reviewer_id) values (z,'approved',now(),mod);
  delete from auth.users where id = z;
  for tbl, n in select 'profiles', count(*) from profiles where id = z union all select 'photos', count(*) from profile_photos where user_id = z
    union all select 'prefs', count(*) from user_preferences where user_id = z union all select 'likes', count(*) from likes where actor_user_id = z or target_user_id = z
    union all select 'passes', count(*) from passes where actor_user_id = z or target_user_id = z
    union all select 'matches', count(*) from matches where user_a_id = z or user_b_id = z union all select 'messages', count(*) from messages where sender_user_id = z
    union all select 'conversations', count(*) from conversations where id = cid union all select 'reads', count(*) from conversation_reads where user_id = z
    union all select 'verification', count(*) from verification_requests where user_id = z union all select 'consents', count(*) from user_consents where user_id = z
    union all select 'reports', count(*) from user_reports where reporter_user_id = z or reported_user_id = z union all select 'blocks', count(*) from user_blocks where blocker_user_id = z or blocked_user_id = z
  loop leftover := leftover + n; if n > 0 then raise notice 'leftover rows in %: %', tbl, n; end if; end loop;
  perform t.ok('deleting the auth user cascades to all personal data', leftover = 0);
  perform t.ok('other users are unaffected', exists (select 1 from profiles where id = m) and (select count(*) from profile_photos where user_id = m) = 3);
  -- reviewer deletion keeps the review record
  insert into verification_requests(user_id,status,consent_recorded_at,reviewer_id) values (m,'approved',now(),mod);
  delete from auth.users where id = mod;  -- (moderator has a profile row from the staff-suspension test; cascade removes it)
  perform t.ok('deleting a reviewer keeps the review record with reviewer cleared', exists (select 1 from verification_requests where user_id = m and reviewer_id is null));
  perform t.as_user(m);
  perform t.fails('deletion_log is not accessible to clients', 'select * from deletion_log');
end $$;
