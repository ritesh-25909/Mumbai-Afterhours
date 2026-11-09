-- Add a distinct Super Admin role without changing existing role assignments or policies.
-- Run this migration before 20261108000004_admin_foundation.sql.
alter type public.app_role add value if not exists 'super_admin';
