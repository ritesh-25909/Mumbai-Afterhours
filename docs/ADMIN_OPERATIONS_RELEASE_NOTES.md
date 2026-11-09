# Admin Operations — implementation and limitations

## Implemented in this ZIP
- Expanded admin navigation and working protected routes.
- Real member list and name/UUID search, pagination, profile moderation and role display.
- Super-admin-only assignment/revocation of `admin` and `moderator` roles through protected RPC, with database audit events. `super_admin` is intentionally not grantable via browser.
- Curated Matches: eligibility list, exactly 25 unique candidates, server-validated draft/publish and audited operations. Each published batch is unique per target. The selection order is persisted.
- Admin audit viewer for the above new operations.
- Existing verification, reports, dashboard, and auth guard retained.

## Not implemented (shown as explicitly unavailable rather than faked)
- User 360, chat moderation, advanced moderation center, engagement and analytics dashboards, admin settings, fine-grained permission grants, admin activity beyond the new audit events, automatic personalized recommendations integration.
- Published curated batches are stored but **not yet integrated into the consumer discovery/recommendations pipeline**. Publishing does not change end-user suggestions until that integration is designed and tested.
- Existing dashboard is not visually rebuilt to the illustrative mockup; its metrics remain real Supabase aggregates.

## Deployment
1. Back up your database and test against a staging Supabase project first.
2. Install dependencies with `npm ci` and run `npm run build` (not validated in this environment because dependency installation did not finish).
3. Apply the migration `20261108000006_admin_operations.sql` in order, after 00005, using Supabase migrations. **Never use a service-role key in the browser**.
4. Deploy the frontend and test Super Admin / Admin / Moderator / Member access, role change audits, 25-profile validation and failed authorization.
5. Verify migration against the actual deployed schema. No live Supabase integration test was performed.

## Security note
All new data operations are SECURITY DEFINER functions with internal role checks and explicit grants. The new tables have RLS enabled and direct client access revoked. Existing RLS and data are not replaced.
