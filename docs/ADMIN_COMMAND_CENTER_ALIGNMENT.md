# Admin Command Center — database alignment notes

This update reconciles the partial Admin Command Center with the Supabase function and table names visible in the 2026-11-09 schema exports.

## Implemented in this source update

- Dashboard reads the deployed `admin_dashboard_stats()` JSONB result and derives pending verification count from `list_pending_verifications()`; no invented metrics are used.
- User directory uses a dedicated, server-authorized `admin_list_members()` RPC matching the deployed `profiles` shape.
- User 360° includes profile/moderation state and counts for likes sent/received, active matches, messages sent, reports received and pending verification.
- Individual admin/moderator role changes are restricted to Super Admin in PostgreSQL and recorded in the existing `admin_audit_logs` table.
- Audit viewer reads `admin_audit_logs` through a protected RPC (not the stale draft `admin_audit_events` table).
- Curated batch tables/RPCs validate exactly 25 unique eligible profiles, recheck eligibility at publish time, audit publication and prioritize published candidates in `discover_profiles()`.
- Risk review is a transparent report-count queue, not an automated assertion that a person is fake.
- Announcement broadcast uses the existing `publish_app_notification()` notification pipeline and records the recipient count.
- Platform health exposes database-level counters only.
- Member CSV export uses the protected member-list RPC and does not export credentials, email addresses or message bodies.
- Existing verification review, reports and suspended-account screens remain in place.

## Migration

Apply `supabase/migrations/20261109000001_admin_command_center_alignment.sql` after the existing migrations. It is additive and uses the deployed `admin_audit_logs` table. It does not grant browser access to audit or curated tables; privileged reads/writes run through security-definer RPCs with server-side role checks.

`20261108000006_admin_operations.sql` has been converted to a no-op compatibility marker because the earlier draft created `admin_audit_events` and attempted to replace `admin_list_users()` with an incompatible return type. The new alignment migration provides the needed operations without replacing that deployed RPC.

The dashboard foundation migration now returns JSONB, matching the deployed `admin_dashboard_stats()` contract.

## Explicitly not represented as complete

The supplied schema export does not expose a message-level moderation/report relationship, an appeals table/workflow, an admin account-deletion RPC, or editable platform-settings storage. Those operations are not faked in the UI. Account deletion remains on the existing user-initiated secure workflow. Hosting/storage/network health is not inferred from database counters.

## Validation status

The project build was attempted, but dependency installation timed out in this environment and `vite/client` was unavailable. Therefore TypeScript compilation, Vite production build, SQL migration execution against the live Supabase project, RLS behavior under real accounts, and Discover integration against production data remain unverified. Apply the migration first in a staging project and run the SQL tests before production rollout.
