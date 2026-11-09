-- Ensure Super Admin inherits the existing admin and moderator capabilities.
-- Safe to reapply; does not alter role assignments, table data, or RLS policies.
-- This migration repairs environments where the earlier admin-foundation migration
-- was only partially applied or where has_role() was later replaced by an older definition.

create or replace function public.has_role(r public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null
     and exists (
       select 1
       from public.user_roles ur
       where ur.user_id = auth.uid()
         and (
           ur.role = r
           or (
             ur.role = 'super_admin'::public.app_role
             and r in (
               'admin'::public.app_role,
               'moderator'::public.app_role
             )
           )
         )
     );
$$;

-- Keep role assignments inaccessible to normal authenticated clients.
revoke insert, update, delete, truncate, references, trigger
  on table public.user_roles from anon, authenticated;

revoke all on function public.has_role(public.app_role) from public, anon;
grant execute on function public.has_role(public.app_role) to authenticated;

comment on function public.has_role(public.app_role) is
  'Role check: super_admin inherits admin and moderator capabilities; clients cannot manage role assignments.';
