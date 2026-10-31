-- Behavioural tests for RLS, RPCs and triggers. Run after stubs + migrations. Prints PASS/FAIL lines.
create schema t;
create function t.as_user(u uuid) returns void language plpgsql as $$
begin perform set_config('request.jwt.claim.sub', u::text, true); execute 'set local role authenticated'; end $$;
create function t.back() returns void language plpgsql as $$ begin execute 'reset role'; end $$;
create function t.fails(label text, q text) returns void language plpgsql as $$
begin execute q; raise notice 'FAIL % (expected error)', label;
exception when others then raise notice 'PASS %', label; end $$;
create function t.ok(label text, cond boolean) returns void language plpgsql as $$
begin if cond then raise notice 'PASS %', label; else raise notice 'FAIL %', label; end if; end $$;
grant usage on schema t to authenticated; grant execute on all functions in schema t to authenticated;

insert into auth.users(id,email) values
 ('a0000000-0000-0000-0000-00000000000a','a@x'),('b0000000-0000-0000-0000-00000000000b','b@x'),
 ('c0000000-0000-0000-0000-00000000000c','c@x'),('d0000000-0000-0000-0000-00000000000d','mod@x');
insert into user_roles values ('d0000000-0000-0000-0000-00000000000d','moderator');

-- 1. Profile creation, age rule, protected columns
do $$ begin
  perform t.as_user('a0000000-0000-0000-0000-00000000000a');
  insert into profiles(id,display_name,date_of_birth,gender,interested_in,bio) values ('a0000000-0000-0000-0000-00000000000a','Alex','1995-01-01','woman','{man}','Hello there friends');
  perform t.ok('adult can create own profile', true);
  perform t.fails('minor rejected by DB trigger', $q$insert into profiles(id,display_name,date_of_birth,gender) values ('b0000000-0000-0000-0000-00000000000b','Kid',current_date - interval '17 years','man')$q$);
  perform t.fails('cannot create profile for another user', $q$insert into profiles(id,display_name,date_of_birth,gender) values ('c0000000-0000-0000-0000-00000000000c','Imp','1990-01-01','man')$q$);
  perform t.fails('cannot self-verify', $q$update profiles set verified = true where id = 'a0000000-0000-0000-0000-00000000000a'$q$);
  perform t.fails('cannot self-approve moderation', $q$update profiles set moderation_status = 'approved' where id = 'a0000000-0000-0000-0000-00000000000a'$q$);
  perform t.fails('cannot set profile_complete directly', $q$update profiles set profile_complete = true where id = 'a0000000-0000-0000-0000-00000000000a'$q$);
  perform t.fails('cannot edit date_of_birth', $q$update profiles set date_of_birth = '1980-01-01' where id = 'a0000000-0000-0000-0000-00000000000a'$q$);
  perform t.fails('user_roles not writable', $q$insert into user_roles values ('a0000000-0000-0000-0000-00000000000a','admin')$q$);
  perform t.ok('user_roles not readable', (select count(*) from user_roles) = 0);
end $$;

-- B, C created by service role for brevity, then published through the real RPC path
insert into profiles(id,display_name,date_of_birth,gender,interested_in,bio) values
 ('b0000000-0000-0000-0000-00000000000b','Ben','1994-02-02','man','{woman}','Hello there friends'),
 ('c0000000-0000-0000-0000-00000000000c','Cara','1993-03-03','woman','{man,woman}','Hello there friends');

-- 2. Photos and publishing
do $$ declare u uuid := 'a0000000-0000-0000-0000-00000000000a'; begin
  perform t.as_user(u);
  insert into storage.objects(bucket_id,name) values ('profile-photos', u||'/p1.webp'), ('profile-photos', u||'/p2.webp');
  perform t.fails('cannot upload into another user folder', $q$insert into storage.objects(bucket_id,name) values ('profile-photos','b0000000-0000-0000-0000-00000000000b/x.webp')$q$);
  perform replace_photo(1, u||'/p1.webp'); perform replace_photo(2, u||'/p2.webp');
  perform t.fails('publish with 2 photos blocked', 'select publish_profile()');
  perform t.fails('replace_photo rejects missing upload', format('select replace_photo(3, %L)', u||'/ghost.webp'));
  perform t.fails('replace_photo rejects other user path', $q$select replace_photo(3, 'b0000000-0000-0000-0000-00000000000b/p.webp')$q$);
  perform t.fails('slot 4 rejected', format('select replace_photo(4, %L)', u||'/p2.webp'));
  perform t.fails('cannot insert photo row directly with moderation status', format('insert into profile_photos(user_id,storage_path,display_order,moderation_status) values (%L,%L,3,%L)', u, u||'/p2.webp','approved'));
end $$;
do $$ declare u uuid := 'a0000000-0000-0000-0000-00000000000a'; begin
  perform t.as_user(u);
  insert into storage.objects(bucket_id,name) values ('profile-photos', u||'/p3.webp');
  perform replace_photo(3, u||'/p3.webp');
  perform publish_profile();
  perform t.ok('publish with 3 photos works', (select profile_complete from profiles where id = u));
end $$;
-- publish B and C (service role), 3 photos each
do $$ declare x uuid; begin
 foreach x in array array['b0000000-0000-0000-0000-00000000000b','c0000000-0000-0000-0000-00000000000c']::uuid[] loop
  for i in 1..3 loop insert into profile_photos(user_id,storage_path,display_order) values (x, x||'/'||i||'.webp', i); end loop;
  update profiles set profile_complete = true, moderation_status = 'approved' where id = x;
 end loop; end $$;

-- 3. Discovery, likes, matching, blocking
do $$ declare a uuid := 'a0000000-0000-0000-0000-00000000000a'; b uuid := 'b0000000-0000-0000-0000-00000000000b'; r jsonb; begin
  perform t.as_user(a);
  perform t.ok('discover returns eligible profiles, not self', (select count(*) from discover_profiles(10,0)) >= 1 and not exists (select 1 from discover_profiles(10,0) where id = a));
  perform t.fails('cannot insert like directly', format('insert into likes values (%L,%L)', a, b));
  perform t.fails('cannot insert match directly', format('insert into matches(user_a_id,user_b_id) values (%L,%L)', a, b));
  perform t.fails('cannot like self', format('select like_user(%L)', a));
  r := like_user(b); perform t.ok('one-sided like does not match', (r->>'matched')::boolean = false);
  perform t.ok('liked profile leaves discovery', not exists (select 1 from discover_profiles(10,0) where id = b));
end $$;
do $$ declare a uuid := 'a0000000-0000-0000-0000-00000000000a'; b uuid := 'b0000000-0000-0000-0000-00000000000b'; r jsonb; begin
  perform t.as_user(b);
  r := like_user(a); perform t.ok('mutual like creates match', (r->>'matched')::boolean);
  r := like_user(a); perform t.ok('repeat like does not duplicate match', (select count(*) from matches) = 1 and (select count(*) from conversations) = 1);
end $$;

-- 4. Messaging
do $$ declare a uuid := 'a0000000-0000-0000-0000-00000000000a'; b uuid := 'b0000000-0000-0000-0000-00000000000b'; c uuid := 'c0000000-0000-0000-0000-00000000000c'; cid uuid; begin
  select id into cid from conversations limit 1;
  perform t.as_user(a);
  insert into messages(conversation_id,sender_user_id,content) values (cid,a,'hi');
  perform t.ok('participant can send', true);
  perform t.fails('cannot send as someone else', format('insert into messages(conversation_id,sender_user_id,content) values (%L,%L,%L)', cid, b, 'spoof'));
  perform t.fails('empty message rejected', format('insert into messages(conversation_id,sender_user_id,content) values (%L,%L,%L)', cid, a, ''));
  perform t.back(); perform t.as_user(c);
  perform t.ok('non-participant cannot read messages', (select count(*) from messages) = 0);
  perform t.ok('non-participant cannot see conversation', (select count(*) from conversations) = 0);
  perform t.fails('non-participant cannot send', format('insert into messages(conversation_id,sender_user_id,content) values (%L,%L,%L)', cid, c, 'intrude'));
  perform t.back(); perform t.as_user(b);
  perform t.ok('other participant can read', (select count(*) from messages) = 1);
end $$;
do $$ declare a uuid := 'a0000000-0000-0000-0000-00000000000a'; b uuid := 'b0000000-0000-0000-0000-00000000000b'; cid uuid; mid uuid; begin
  select id, match_id into cid, mid from conversations limit 1;
  perform t.as_user(a); perform unmatch(mid); perform t.back(); perform t.as_user(a);
  perform t.fails('no messages after unmatch', format('insert into messages(conversation_id,sender_user_id,content) values (%L,%L,%L)', cid, a, 'still there?'));
end $$;

-- 5. Blocks and reports
do $$ declare a uuid := 'a0000000-0000-0000-0000-00000000000a'; c uuid := 'c0000000-0000-0000-0000-00000000000c'; begin
  perform t.as_user(a);
  insert into user_blocks values (a, c);
  perform t.fails('cannot like a blocked user', format('select like_user(%L)', c));
  perform t.ok('blocked user hidden from discovery', not exists (select 1 from discover_profiles(10,0) where id = c));
  insert into user_reports(reporter_user_id,reported_user_id,category,description) values (a,c,'harassment','test');
  perform t.back(); perform t.as_user(c);
  perform t.fails('blocker cannot be liked by blocked user', format('select like_user(%L)', a));
  perform t.ok('reported user cannot see report', (select count(*) from user_reports) = 0);
  perform t.ok('blocked user cannot see block row', (select count(*) from user_blocks) = 0);
  perform t.fails('cannot edit report status', $q$update user_reports set status = 'dismissed'$q$);
end $$;

-- 6. Verification workflow
do $$ declare a uuid := 'a0000000-0000-0000-0000-00000000000a'; b uuid := 'b0000000-0000-0000-0000-00000000000b'; begin
  perform t.as_user(a);
  perform t.fails('submit without consent', format('select submit_verification(%L,false,%L)', a||'/s.jpg','v1'));
  perform t.fails('submit with no uploaded selfie', format('select submit_verification(%L,true,%L)', a||'/s.jpg','v1'));
  insert into storage.objects(bucket_id,name) values ('verification-selfies', a||'/s.jpg');
  perform t.fails('submit with another user path', format('select submit_verification(%L,true,%L)', b||'/s.jpg','v1'));
  perform submit_verification(a||'/s.jpg', true, 'v1');
  perform t.ok('pending request created, not verified', (select status from verification_requests where user_id = a) = 'pending' and not (select verified from profiles where id = a));
  perform t.ok('consent recorded', exists (select 1 from user_consents where user_id = a and consent_type = 'verification_biometric'));
  perform t.fails('second pending request blocked', format('select submit_verification(%L,true,%L)', a||'/s.jpg','v1'));
  perform t.ok('owner cannot read own selfie object', (select count(*) from storage.objects where bucket_id = 'verification-selfies') = 0);
  perform t.fails('user cannot insert request directly', format('insert into verification_requests(user_id,status,consent_recorded_at) values (%L,%L,now())', a, 'approved'));
  perform t.fails('user cannot approve own request', format('select review_verification((select id from verification_requests where user_id=%L),%L)', a, 'approved'));
  perform t.fails('non-moderator cannot list pending', 'select * from list_pending_verifications()');
  perform t.back(); perform t.as_user(b);
  perform t.ok('other user cannot read selfie object', (select count(*) from storage.objects where bucket_id = 'verification-selfies') = 0);
  perform t.ok('other user cannot see request', (select count(*) from verification_requests) = 0);
end $$;
do $$ declare a uuid := 'a0000000-0000-0000-0000-00000000000a'; m uuid := 'd0000000-0000-0000-0000-00000000000d'; rid uuid; p text; begin
  perform t.as_user(m);
  perform t.ok('moderator sees pending with selfie and photos', (select count(*) from list_pending_verifications() where user_id = a and cardinality(photo_paths) = 3) = 1);
  perform t.ok('moderator can read selfie object', (select count(*) from storage.objects where bucket_id = 'verification-selfies') = 1);
  select request_id into rid from list_pending_verifications() limit 1;
  p := review_verification(rid, 'approved');
  perform t.back();  -- moderators cannot read other users' rows directly, so assert as table owner
  perform t.ok('approval sets verified and clears selfie reference', (select verified from profiles where id = a) and (select selfie_path from verification_requests where id = rid) is null and p is not null);
  perform t.as_user(m);
  perform t.fails('already-reviewed request cannot be reviewed again', format('select review_verification(%L,%L)', rid, 'rejected'));
end $$;

-- 7. Photo change invalidates verification; removing a photo unpublishes
do $$ declare a uuid := 'a0000000-0000-0000-0000-00000000000a'; begin
  perform t.as_user(a);
  insert into storage.objects(bucket_id,name) values ('profile-photos', a||'/p3b.webp');
  perform replace_photo(3, a||'/p3b.webp');
end $$;
do $$ declare a uuid := 'a0000000-0000-0000-0000-00000000000a'; begin
  perform t.ok('replacing a photo resets verified but keeps profile published', not (select verified from profiles where id = a) and (select profile_complete from profiles where id = a));
  perform t.as_user(a);
  delete from profile_photos where user_id = a and display_order = 2;
end $$;
do $$ declare a uuid := 'a0000000-0000-0000-0000-00000000000a'; begin
  perform t.ok('removing a photo unpublishes the profile', not (select profile_complete from profiles where id = a));
end $$;
