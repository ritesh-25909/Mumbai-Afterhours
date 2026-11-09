# Mumbai Afterhours Admin Foundation

## Routes

- `/admin` — aggregate-only platform dashboard (admin and super_admin)
- `/admin/moderation` — existing selfie verification review component
- `/admin/reports` — existing user report and suspension component

The existing `/moderation` and `/moderation/reports` routes remain available and unchanged for existing moderator workflows.

## Roles and authorization

- `moderator`: existing verification and report moderation permissions.
- `admin`: Admin Command Center and aggregate dashboard access.
- `super_admin`: inherits both admin and moderator authorization.

`public.user_roles` remains protected by RLS with no client policies and no authenticated write grants. Role assignment must be performed by a trusted operator in the Supabase SQL editor or a trusted server-side process. There is deliberately no client-side role-management screen in Phase 1.

### Provision the first Super Admin

1. In Supabase Dashboard → Authentication → Users, locate the intended administrator and copy the Auth user UUID.
2. In SQL Editor, run the following after applying the migrations, replacing the UUID:

```sql
insert into public.user_roles (user_id, role)
values ('REPLACE-WITH-AUTH-USER-UUID', 'super_admin')
on conflict do nothing;
```

Never place a Supabase service-role key in `.env` variables prefixed with `VITE_`, frontend code, or a public repository.

## Dashboard metrics

`public.admin_dashboard_stats()` returns aggregate counts only: non-deleted profiles, profiles created in the last seven days, active matches, likes today, non-deleted messages today, open/reviewing reports, and pending verification requests. Authorization is checked inside the SECURITY DEFINER function. Execution is revoked from `public` and `anon`, and granted to `authenticated`; the function itself rejects non-admin callers.

## Existing Settings integration

`src/components/settings/SettingsNav.tsx` already checks `my_roles()` and displays the Admin Panel link only to users with `admin` or `super_admin`. This is a convenience only; `/admin` and its database functions still enforce authorization independently.

## MFA status — launch blocker

Phase 1 does **not** enroll or enforce Supabase MFA. Do not describe this build as MFA-protected or fully production-secure. Before public launch, implement an admin MFA enrollment and challenge flow (TOTP or another supported Supabase MFA factor), require an appropriate assurance level for admin access, and test enrollment, challenge, recovery and factor removal. Do not simply add a frontend-only MFA checkbox.

## Deployment

Apply **all** migration files in `supabase/migrations/` using the Supabase CLI (`supabase db push`) in filename order. Do not apply only the two admin migrations to a fresh project: the admin foundation depends on the existing core schema and feature migrations. Review the CLI plan and database backup before applying to a live project.

After all migrations succeed, provision the first Super Admin using the SQL above. No service-role secret is required in the browser.

## Phase 1 scope limitations

- The All Users directory, individual privilege overrides, curated 25-profile assignment workflow, and full admin audit-log UI are not included yet.
- Existing verification and report pages are reused under `/admin`.
- Live Supabase authorization, real MFA and production deployment tests must be completed before launch.
