# Mumbai Afterhours — User-Facing Feature Upgrade

This update changes the member-facing experience only. The Admin Panel, Supabase schema, migrations, authentication, RLS policies, database relationships, and existing business rules were not changed.

## Added

1. **Discover refinements** — optional verified-only, shared-interests, and approximate-distance filters. These refine the candidates already returned by the existing `discover_profiles` RPC; they do not change saved preferences or server-side eligibility.
2. **Ranked Discover stack** — loaded profiles are ordered by a transparent client-side signal score based on shared interests, shared languages, and matching relationship intention.
3. **Connection snapshot** — a concise score and common-interest chips on each profile. It is a lightweight overlap indicator, not a prediction or guarantee of compatibility.
4. **Top pick in this stack** — highlights the highest-scoring profile among the currently loaded profiles when there is more than one candidate.
5. **Personalized icebreakers** — suggested comment starters based on the candidate's available interest and neighbourhood data.
6. **Profile strength meter** — progress indicator based on profile details and prompts, without treating identity verification as profile completeness.
7. **Chat quick replies** — optional conversation starters that fill the existing composer; the user still chooses whether to send.

## Existing features retained

Existing photo slots, profile prompts, likes, passes, matches, referral credits, notifications, chat realtime events, online status, read receipts, privacy settings, vanish mode, reporting, blocking, and account controls remain in place.

## Database impact

No migration is included or required for these additions. All new calculations and controls use fields and APIs already present in the project. The Discover filters are session-local UI filters and are not persisted as account preferences.

## Local verification

The edited TypeScript/TSX files were syntax-transpiled successfully. A full `npm run build` could not be completed in the packaging environment because dependency installation did not finish. Run the following locally after extracting the ZIP:

```cmd
npm ci
npm run build
npm test
```

If the build succeeds, deploy the generated `dist` folder using your existing frontend hosting workflow. Do not run Supabase migrations for this UI-only upgrade.
