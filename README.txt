Mumbai Afterhours - Central Notifications Update

Replace these existing files in your project:
- src/components/notifications/NotificationBell.tsx
- src/components/layout/AppShell.tsx

Add this new migration:
- supabase/migrations/20261106000001_central_notifications.sql

Apply the migration to the SAME Supabase project only after reviewing it and confirming the deployed schema matches the supplied project migrations.

Implemented in this update:
- Responsive notification panel, red unread badge, Mark as Read, Mark All as Read, View All (up to 100 notifications)
- Supabase Realtime subscription to the notifications table
- Automatic message notifications from the existing messages table
- Automatic verification-result notifications from the existing verification review workflow
- Notification types and secure admin/moderator publishing RPC for date invitations, security alerts and announcements

Important limitation:
- The supplied project has no date-invitation workflow/table and no separate automated security-event workflow. Those event types are supported by the notification schema, but must be connected when those product workflows are implemented. Announcements/security alerts/date_invitation entries can currently be created only by the trusted staff RPC.

Build validation was blocked in this environment because the local node_modules installation is incomplete (missing vite/client). npm install did not complete before timeout. Do not treat this package as build-tested or production-deployed.
