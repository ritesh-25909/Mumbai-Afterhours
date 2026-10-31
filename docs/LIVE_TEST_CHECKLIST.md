# Live test checklist (do this on a real Supabase project before inviting anyone)

Everything in the repo was built and tested without a live Supabase project. The SQL logic is covered by
`npm run test:sql` against stand-in auth/storage, but the browser app, Google sign-in, realtime, real storage
policies and the Edge Function have **never been run**. Work through this list with three browsers/profiles
(A, B, C) plus one moderator account. Tick each item. Any failure is a launch blocker unless noted.

## 0. Setup
- [ ] Project created, all five migrations applied in order (`supabase db push`), no errors.
- [ ] Auth > Email enabled with "Confirm email" ON. Site URL and redirect URLs set (local and production).
- [ ] Realtime enabled; `matches` and `messages` are in the `supabase_realtime` publication (Database > Replication).
- [ ] Buckets `profile-photos` and `verification-selfies` exist and are **private**.
- [ ] `.env` filled; `npm run dev` loads the landing page.
- [ ] Moderator granted: `insert into user_roles values ('<uuid>','moderator');`

## 1. Auth
- [ ] Sign up with email: verification email arrives; link returns you to the app; log in works.
- [ ] Wrong password shows an error. Refresh keeps you logged in. Log out works.
- [ ] Forgot password email arrives and the reset page sets a new password.
- [ ] Google sign-in completes and lands in onboarding. Cancelling Google shows no crash.
- [ ] Visiting `/discover` logged out redirects to login.

## 2. Onboarding and photos
- [ ] Under-18 date of birth is rejected (try changing the request in dev tools: the database must also refuse).
- [ ] Cannot continue past the photo step with fewer than 3 photos; cannot publish.
- [ ] Upload JPEG, PNG and WebP. A GIF, an 8 MB+ file and a tiny image each show a clear error.
- [ ] A phone photo with GPS: download the stored file from Storage and confirm no EXIF/GPS remains.
- [ ] Refresh: photos persist. Replace one photo: old file is gone from the bucket.
- [ ] Publish works; you land in Discover. Removing a photo in Profile unpublishes you.

## 3. Verification
- [ ] Camera does not start until consent is ticked and you press the button. Denying permission shows the message.
- [ ] Submit: status shows "Under review". Moderator sees the selfie beside the three photos.
- [ ] Approve: badge appears for A. Replace a photo: badge disappears.
- [ ] After a decision the selfie file is gone from `verification-selfies`.
- [ ] B cannot open A's selfie URL (signed URLs expire; a guessed path returns an error).

## 4. Discover, matches, chat (two accounts)
- [ ] A sees B (and not themselves). Photo carousel and swipe/buttons work on a real phone.
- [ ] A likes B: no match. B likes A: match dialog for B, banner for A (realtime). One match only.
- [ ] Matches page shows "New". Start conversation opens chat.
- [ ] Messages arrive instantly in both directions. Kill the network: message shows Not sent; Retry works once back.
- [ ] Unread badge and inbox preview update. Opening the chat clears unread.
- [ ] C (not matched) cannot open `/chat/<A-B conversation id>`: shows unavailable.
- [ ] Unmatch: chat disappears for both; they never reappear in Discover.
- [ ] Block: same, and the blocked user cannot find the blocker.
- [ ] iPhone Safari: the keyboard does not hide the message box. (Known risk.)

## 5. Safety and moderation
- [ ] Report from a card and from a chat: appears in `/moderation/reports` with the right category.
- [ ] Suspend: user vanishes from Discover and chats, sees the suspended screen, cannot re-publish. Reinstate restores.
- [ ] Hide profile: disappears from Discover; existing matches still chat.
- [ ] Hide neighbourhood: cards no longer show it.

## 6. Account deletion (use a throwaway account with photos, a match and a message)
- [ ] `supabase functions deploy delete-account` succeeded.
- [ ] Deleting works; you are signed out. The user, profile row and both storage folders are gone; the match partner's chat is gone.
- [ ] Partner's own data (profile, photos) is untouched. `deletion_log` has one row with `cleanup_complete = true`.

## 7. Direct API spot checks (RLS, using A's access token and the anon key)
Replace placeholders. All of these must be refused or return nothing:
```
curl "$URL/rest/v1/profiles?id=eq.<B>"                  -H "apikey: $ANON" -H "Authorization: Bearer $A_TOKEN"   # []  (no DOB leak)
curl "$URL/rest/v1/profiles?id=eq.<A>" -X PATCH -d '{"verified":true}'  -H "apikey: $ANON" -H "Authorization: Bearer $A_TOKEN" -H "Content-Type: application/json"  # error
curl "$URL/rest/v1/likes" -X POST -d '{"actor_user_id":"<A>","target_user_id":"<B>"}' ...   # error
curl "$URL/rest/v1/matches" -X POST ...                                                     # error
curl "$URL/rest/v1/messages?conversation_id=eq.<C-D conversation>" ...                       # []
curl "$URL/rest/v1/user_roles" ...                                                          # []
curl "$URL/rest/v1/user_reports" ...                                                        # only A's own
curl "$URL/storage/v1/object/authenticated/verification-selfies/<B>/x.jpg" ...               # refused
```

## 8. Layout
- [ ] Check 360px, 390px, 768px and 1280px widths on each page: no horizontal scroll, bottom nav does not cover content.
- [ ] Keyboard-only: tab through login, onboarding and chat; focus is always visible.
