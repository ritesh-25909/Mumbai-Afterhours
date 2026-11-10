# Mumbai Afterhours — changes in this package

## Implemented

- Moved **Mumbai Afterhours referrals** into **Settings** at `/settings/referrals`.
- Kept `/referrals` working by redirecting it to the new Settings location.
- Removed the separate **Invite & Earn** item from the main sidebar and mobile navigation to reclaim space.
- Kept the Discover referral-rewards entry point and added a direct Settings link when the daily allowance is exhausted.
- Changed the free daily like allowance from 20 to **15**, enforced by a new Supabase migration and database trigger. Referral bonus credits remain additional likes.
- Added a lightweight incoming-like count RPC and realtime badge on the Matches navigation item (desktop and mobile). The count represents incoming one-way likes in the existing “Liked You” screen; a mutual match is still created only after both users like each other.

## Supabase deployment required

Apply migrations in order, including the new file:

`supabase/migrations/20261108000002_daily_like_limit_15.sql`

This migration clamps any existing in-progress daily usage above 15 to 15, updates the server-side like-credit enforcement, adds the incoming-like count RPC, and enables Realtime for `public.likes`.

Example using Supabase CLI from this project folder:

```bash
supabase db push
```

Deploy the frontend after the database migration is applied.

## Verification status / limitations

- TypeScript project check passed: `tsc -b`.
- The Vite production build could not run in this Linux environment because the uploaded `node_modules` contains Windows Rollup binaries but is missing the Linux optional package `@rollup/rollup-linux-x64-gnu`. Reinstall dependencies on the deployment machine with `npm install` before building.
- Unit tests could not run from the supplied archive because its `node_modules/.bin` scripts are not executable in this environment.
- The Supabase migration and live two-account referral / Realtime behavior have not been executed against your hosted Supabase project. Apply the migration and run the two-account test before treating referral credits or the incoming-like badge as production-verified.
- This package does not add phone-number collection or claim that phone numbers are verified; that needs a deliberate consent flow and a real supported storage/verification design. It also does not claim to have completed an application-wide Discover/Onboarding/Messages performance audit.

## Admin notifications: personal targeting and seven-day expiry

- Admin → Notifications now supports sending an announcement to all non-deleted members or to one selected member.
- Member selection is loaded through the existing protected `admin_list_members` RPC.
- `admin_send_notification` performs the admin authorization check server-side and records the action in `admin_audit_logs`.
- Notifications receive an `expires_at` timestamp seven days after creation. The existing `list_notifications` RPC excludes expired rows, so they disappear from the in-app notification centre automatically. Rows remain in the database for audit/history; this is not a physical-delete policy.
- Apply the new migration `supabase/migrations/20261110000002_admin_targeted_notifications_expiry.sql` before deploying the frontend.
