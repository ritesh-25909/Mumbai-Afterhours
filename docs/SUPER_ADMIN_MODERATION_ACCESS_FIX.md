# Super Admin moderation access fix

## What changed

- Added migration `20261108000005_super_admin_moderation_access.sql`.
- The migration makes `super_admin` inherit the existing `admin` and `moderator` checks through `public.has_role()`.
- Existing role assignments, table data, and RLS policies are not changed.
- The `user_roles` table remains non-writable by `anon` and `authenticated` clients.
- Updated the existing Verification and Reports pages to recognize `super_admin` in their client-side navigation guard.
- Updated the moderation tabs to stay under `/admin/...` when opened inside the Admin Command Center.
- Updated `myRoles()` to surface RPC errors instead of silently returning an empty role list.

## Apply the database migration

From the project directory, after linking the correct Supabase project:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Alternatively, apply the SQL file through Supabase SQL Editor:

`supabase/migrations/20261108000005_super_admin_moderation_access.sql`

Do not paste the migration into a different Supabase project.

## Verify with an authenticated website session

The SQL Editor normally has no end-user JWT, so `auth.uid()` can be NULL there. Verify by signing into the website as the Super Admin and opening:

- `/admin`
- `/admin/moderation`
- `/admin/reports`

Expected: Super Admin can access all three. A Moderator can access only the existing moderation/report tools, not the Admin Command Center dashboard. Ordinary users cannot access admin or moderation tools.

## Security notes

The frontend checks are only navigation/UX checks. Sensitive database RPCs continue to enforce authorization server-side through `has_role()`. No service-role key is added to the frontend. No RLS policy is disabled.
