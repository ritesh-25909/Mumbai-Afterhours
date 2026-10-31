# Mumbai Afterhours

A dating web app for adults (18+) in Mumbai. React + TypeScript + Vite + Tailwind on the front end; Supabase
(Auth, Postgres, Storage, Realtime, one Edge Function) on the back end. No custom server.

> **Status: feature-complete, not launch-ready.** All pages and flows are written and the database logic is tested,
> but the app has never been run against a real Supabase project or a real browser. Follow
> [`docs/LIVE_TEST_CHECKLIST.md`](docs/LIVE_TEST_CHECKLIST.md) and get the Terms and Privacy text reviewed by a lawyer first.

## What is built

| Area | State |
|---|---|
| Landing, signup/login (email + Google button), email verification page, forgot/reset password, protected routes | Written |
| Onboarding (4 steps), three-photo upload (re-encoded to WebP in the browser, strips EXIF/GPS), profile editing | Written |
| Selfie verification (consent, live camera, private upload, **manual human review**, badge) and moderator review page | Written |
| Discover (swipe + buttons, 3-photo carousel), mutual matching, Matches page, unmatch | Written |
| Chat (inbox, search, unread, history paging, retry, realtime with polling fallback) | Written |
| Block, report, moderator report queue, suspend/reinstate, hide profile, hide neighbourhood, age range, unblock | Written |
| Account/privacy settings, password change, sign out everywhere, account deletion (Edge Function) | Written |
| Safety, Terms, Privacy, Help pages | **Drafts. Need legal review** |
| Plans page + entitlement module | Free plan only. No billing, no paid features |
| Database: 5 migrations, RLS on every table, security-definer RPCs | **129 SQL checks pass on local Postgres 16** |
| Unit tests (validation, photo checks, entitlements) | 14 pass |
| Browser UI, Google OAuth, Realtime, real Storage policies, Edge Function | **Never run** |
| Automated browser (e2e) tests | None written |
| Mobile/desktop visual check | Layouts written mobile-first; **never viewed on a device** |

## Architecture

- **Browser** talks only to Supabase with the public anon key. Authorization is enforced in Postgres (RLS, column grants,
  security-definer functions), not in the UI. Route guards are UX only.
- **Matches, messages' permissions, blocks, verification, moderation** go through database functions. Clients cannot insert
  matches/likes or edit moderation fields, verified badges, roles or messages.
- **Edge Function** `delete-account` is the only code using the service-role key (a Supabase-provided function secret).
- **Hosting:** the front end is static, so GitHub Pages works. Supabase Free hosts everything else.

### Authorization model (summary)
| Data | Who can read | Who can write |
|---|---|---|
| Own profile row (has date of birth) | Owner only | Owner, limited columns. Not `verified`, `moderation_status`, `profile_complete`, date of birth |
| Other people's profiles | Only via `discover_profiles` / `list_matches` / `get_conversation` (age, never DOB) | n/a |
| Likes, passes, matches, conversations | Participants (read) | Server functions only |
| Messages | Participants while the match is open | Sender, limited columns, rate limited. No edits or deletes |
| Profile photos (files) | Owner; others if profile is published and visible, or active match | Owner, own folder only |
| Verification selfies | Moderators and service role only | Owner uploads (and can delete) in own folder |
| Reports | Reporter (own), moderators | Reporter inserts; moderators resolve via function |
| Roles | Nobody via the API | SQL editor / service role only |

## Setup

### 1. Run locally
```
npm install
cp .env.example .env      # fill VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev
```
Browser-safe variables (`VITE_*`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, optional `VITE_SUPPORT_EMAIL`, `VITE_BASE`.
Server-only (never in the browser or in git): the Supabase **service-role key**, Google **client secret**, DB password.

### 2. Supabase
1. Create a project (Free plan).
2. Apply migrations in order: `supabase link --project-ref <ref> && supabase db push` (or paste each file in `supabase/migrations/` into the SQL editor).
3. Auth > Providers > Email: enable, turn **Confirm email** on.
4. Auth > URL Configuration: Site URL and Redirect URLs for `http://localhost:5173` and your production URL (include any sub-path and `/reset-password`).
5. Database > Replication: confirm `matches` and `messages` are in the `supabase_realtime` publication (the migrations try to add them).
6. Create the first moderator after they sign up: `insert into user_roles values ('<user uuid>','moderator');`

### 3. Google sign-in
1. Google Cloud Console > APIs & Services > Credentials > OAuth client ID (Web).
2. Authorized redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`.
3. Supabase > Auth > Providers > Google: paste the client ID and secret **there** (never in code).
4. Keep your production site URL in Supabase's redirect allow-list. Google may need the app verified before non-test users can sign in.

### 4. Delete-account function
```
supabase functions deploy delete-account
supabase secrets set ALLOWED_ORIGIN=https://your-domain     # optional CORS restriction
```
Test with a throwaway account (see the checklist). If file cleanup ever fails, `deletion_log.cleanup_complete` is `false`.

### 5. Deploy to GitHub Pages
1. Push to GitHub (`main`). Settings > Pages > Source: **GitHub Actions**.
2. Settings > Secrets and variables > Actions > **Variables**: add `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, optionally `VITE_SUPPORT_EMAIL`. (Anon key is public by design. Never add the service-role key.)
3. The workflow `.github/workflows/deploy.yml` runs unit tests, builds and publishes. Project sites live at `https://<user>.github.io/<repo>/`; the build handles the sub-path and writes a `404.html` so refreshes on deep links work.
4. Add the final URL to Supabase's redirect URLs (step 2.4) and to Google if needed.

### 6. Custom domain
1. Buy a domain. Add DNS: a `CNAME` for `www` (or subdomain) to `<user>.github.io`; for an apex domain use GitHub's four `A` records (see GitHub Pages docs).
2. Add a file `public/CNAME` containing your domain (one line) and set the Actions variable `VITE_BASE` to `/`.
3. Settings > Pages > Custom domain; enable Enforce HTTPS once the certificate is issued.
4. Update Supabase Site URL and redirect URLs to the new domain.

## Tests
```
npm test               # unit tests (vitest)
npm run test:sql       # needs local PostgreSQL 16; applies all migrations to a scratch DB and runs 129 behavioural checks
```
The SQL tests use **stand-in** `auth` and `storage` schemas. They prove the SQL logic, not Supabase's real behaviour. Repeat the key checks on your project (checklist section 7).

## Free-tier assumptions and costs
Free plans change. Check Supabase and GitHub pricing pages and your Dashboard > Settings > Usage / Billing regularly.
- Supabase Free projects can **pause after inactivity**, have limits on database size, storage, bandwidth, realtime connections and Edge Function calls, and lack the backups of paid plans. A dating app with real users will likely outgrow it.
- The app limits cost by paging results, one shared realtime channel, 1600px WebP photos and an 8 MB upload cap. Orphaned files are cleaned on replace/delete but there is no scheduled sweep.
- **Paid services you may eventually need:** SMS OTP (not built), payments (not built), automated liveness/face matching (not built), a custom domain (your purchase), email delivery beyond Supabase's built-in limits (use your own SMTP in production), image moderation.

## Known limitations (read before launch)
**Safety and trust**
- Verification is a **manual photo comparison**. No liveness detection, no automated face matching, no random challenge. It can be fooled and says so to users.
- Nothing detects AI-generated or stolen photos. Policy relies on reports and review.
- Selfies not reviewed are not auto-purged (needs a scheduled job). Don't promise a deletion window you don't enforce.
- Suspension is one flag: no reason, appeal or moderation audit log. Moderators are assigned only by SQL.
- Reports about a user are erased if they delete their account (cascade). Change the foreign keys if you want evidence retained.
- Photos default to approved on upload (reactive moderation). Switch to pre-approval if you need it.

**Product**
- No distance filtering (neighbourhood text only; no GPS is collected). Discovery sorts newest first.
- No email or push notifications. New matches/messages show only while the app is open.
- Passes and unmatches are permanent. Blocks can be removed but do not reopen a closed match.
- No read receipts, typing indicators, image sharing or reactions. No premium features or billing.
- Photo re-encoding runs in the browser, so a modified client could bypass EXIF stripping. A server-side re-encode would fix this.
- iOS Safari may let the keyboard cover the chat box.

**Process**
- Terms and Privacy are drafts. India-specific obligations (for example under the Digital Personal Data Protection Act, 2023, and IT Rules) need a lawyer's advice, particularly for consent, minors, grievance officer details, data retention and processing biometric data.
- Supabase backups may keep deleted data for a period. Confirm it and state it accurately in the policy.
- Google AdSense is not used. Review current publisher policies before ever adding ads.

## Launch checklist
1. Complete [`docs/LIVE_TEST_CHECKLIST.md`](docs/LIVE_TEST_CHECKLIST.md) end to end.
2. Lawyer reviews Terms, Privacy and Safety. Set `VITE_SUPPORT_EMAIL`. Name a grievance contact if required.
3. Production SMTP configured; email templates read well.
4. At least two trained moderators; a plan for responding to reports within a stated time.
5. Decide photo moderation policy and selfie retention enforcement.
6. Add monitoring for Supabase usage and errors. Decide when to move off the Free plan.
