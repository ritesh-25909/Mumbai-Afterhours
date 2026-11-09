# Mumbai Afterhours — Likes, Comments & Mutual Match Update

## What changed

- Added an optional 300-character comment to a profile like.
- Added small heart actions to the main profile photo and additional profile photos.
- Added a comment composer with **Send Like** and **Send without comment** actions.
- Preserved Pass and swipe-to-pass behaviour.
- Added visible confirmation after a one-sided like.
- Added a notification bell with like and mutual-match notifications.
- Notifications show the sender's name, photo, and optional comment.
- Added a secure profile-view RPC so a recipient can open the profile of someone who liked them.
- Added an incoming-like comment preview and profile link to the existing Liked You screen.
- Preserved the existing match and conversation tables and canonical pair uniqueness.

## Files changed

- `src/components/discover/ProfileCard.tsx`
- `src/pages/DiscoverPage.tsx`
- `src/features/discovery/api.ts`
- `src/features/matches/api.ts`
- `src/pages/MatchesPage.tsx`
- `src/components/layout/AppShell.tsx`

## New files

- `src/components/notifications/NotificationBell.tsx`
- `supabase/migrations/20261105000001_likes_comments_notifications.sql`
- `tests/sql/50_likes_notifications_tests.sql`

## Database migration

The migration is additive. It adds `likes.comment`, creates an RLS-protected `notifications` table, and adds the RPCs:

- `send_like(target, message)`
- `list_incoming_likes()`
- `list_notifications()`
- `mark_notification_read(notification_id)`
- `get_profile_for_view(target_user_id)`

The existing `like_user(target)` RPC remains available and delegates to `send_like(target, null)`.

**Do not apply the migration blindly to production.** The uploaded repository's migrations do not fully describe the schema expected by the current frontend. For example, the frontend references profile fields such as `height`, `occupation`, `college`, `education_status`, and `profile_prompts`, while those columns are absent from the supplied core migrations. The migration uses `to_jsonb(row)->'field'` for optional profile fields, but the live schema still needs to be checked before deployment.

Review the SQL migration against the actual Supabase database first, then apply it using your normal migration workflow.

## Validation status

- Source changes and SQL migration were inspected for consistency with the supplied project.
- Automated TypeScript build was **not run**: dependencies were not available in the execution environment.
- PostgreSQL migration tests were **not run**: `psql` is not installed in the execution environment.
- The new SQL scenario tests are included in `tests/sql/50_likes_notifications_tests.sql` and the SQL test runner is configured to include them.

After installing dependencies, run:

```bash
npm ci
npm run build
npm test
npm run test:sql
```

`npm run test:sql` requires a local PostgreSQL installation and the test runner's documented PostgreSQL role setup.
