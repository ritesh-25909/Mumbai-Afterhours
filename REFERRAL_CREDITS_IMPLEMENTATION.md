# Referral & Like Credits implementation

## Files changed

- `src/app/App.tsx` — captures `?ref=CODE` on first app load and retains it through OAuth.
- `src/features/referrals/api.ts` — referral capture, reward claim, wallet and dashboard RPC clients.
- `src/pages/OnboardingPage.tsx` — attempts the reward claim after a brand-new profile is created.
- `src/pages/DiscoverPage.tsx` — displays daily and bonus balances, refreshes balances in real time, and blocks likes when both balances are empty.
- `src/components/discover/ProfileCard.tsx` — disables like actions when no credits remain.
- `src/pages/ReferralPage.tsx` — referral dashboard, copy/share link, totals and history.
- `src/app/router.tsx` — adds `/referrals` route.
- `src/components/layout/AppShell.tsx` — adds desktop Invite & Earn navigation.
- `supabase/migrations/20261107000001_referral_like_credits.sql` — secure wallet, referral attribution, ledger, credit-debit trigger, RPCs and Realtime publication.

## Install

1. Copy the changed files into the matching paths in the main project.
2. Apply `supabase/migrations/20261107000001_referral_like_credits.sql` to the existing Supabase project after confirming the previous migrations are applied.
3. Run `npm install` if dependencies are missing, then `npm run build`.
4. Test with two separate new Google accounts before production deployment.

## Enforcement

- A database trigger charges one credit only when a new row is inserted into `likes`; duplicate likes do not spend another credit.
- Daily free likes reset on a rolling 24-hour window. The 20 daily likes are consumed before bonus credits.
- Referral rewards are granted only through `claim_referral_reward`, which validates the authenticated user, inviter code, self-referral, a 7-day new-account window and one attribution per invitee.
- Client-side balances are display-only. Direct table writes are revoked; wallet changes happen in database functions/triggers.
- Referral history and credit ledger are readable only by the relevant authenticated user under RLS.

## Important limitations / verification

- The existing app uses Google OAuth. Referral attribution is retained in browser local storage across the OAuth redirect and claimed after the new profile is created. Clearing browser storage before onboarding can lose the attribution.
- Supabase Auth's unique identity/email checks and one reward per invitee prevent common duplicates. Detecting one human creating multiple distinct Google identities requires an additional verified-phone or equivalent identity control; this migration cannot reliably identify the same person across unrelated accounts.
- The migration and frontend build have not been tested against the live Supabase project. Run the build and two-account tests before deploying.
