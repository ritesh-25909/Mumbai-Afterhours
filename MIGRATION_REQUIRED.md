# Mumbai Afterhours update — required Supabase migration

This update adds mandatory, unverified mobile-number collection and an admin-only storage usage report.

## Apply the database migration

From the project root, after linking the correct Supabase project:

```bash
supabase db push
```

The migration is:

`supabase/migrations/20261110000001_contact_number_and_storage_admin.sql`

It creates `public.user_contact_details` with owner-only RLS policies and the `public.admin_storage_usage()` RPC. The RPC checks the existing admin role before returning Storage bucket totals and PostgreSQL database size.

## What changed

- Saved Supabase sessions are no longer cleared just because a separate `getUser()` validation request fails during page startup. Supabase's persisted session is restored using `getSession()`.
- Signed-in users without a saved contact number are routed to `/complete-phone`.
- The page collects a 10-digit Indian mobile number and stores it as `+91XXXXXXXXXX`. It does not send or verify an OTP.
- Users with a saved number skip the collection page.
- Admin navigation includes **Storage usage**, with database size, file storage, object count, and bucket breakdown.

## Build and deployment

Install dependencies using `npm ci`, then run `npm run build`. Deploy the built application using the existing hosting workflow.

The build could not be completed in the packaging environment because the dependency install timed out and the local npm cache did not contain all packages. No production Supabase migration was run from this environment.
