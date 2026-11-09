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
