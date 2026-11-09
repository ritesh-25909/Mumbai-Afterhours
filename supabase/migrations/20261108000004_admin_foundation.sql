-- Mumbai Afterhours Admin Foundation (additive; no existing rows are changed or deleted).

-- Super Admin inherits the existing administrator and moderator capabilities.
-- The user_roles table remains RLS-protected with no client policies. Role assignment
-- is performed only by a trusted operator through the Supabase SQL editor/service role.
create or replace function public.has_role(r public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.user_roles ur
    where ur.user_id = auth.uid()
      and (
        ur.role = r
        or (ur.role = 'super_admin'::public.app_role and r in ('admin'::public.app_role, 'moderator'::public.app_role))
      )
  );
$$;

-- Explicitly preserve the no-client-role-management boundary.
revoke insert, update, delete, truncate, references, trigger on table public.user_roles from anon, authenticated;
revoke all on function public.has_role(public.app_role) from public, anon;
grant execute on function public.has_role(public.app_role) to authenticated;

-- Aggregate-only dashboard data. No profile names, emails, IDs, or message content are returned.
create or replace function public.admin_dashboard_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare result jsonb;
begin
  if not (public.has_role('admin'::public.app_role) or public.has_role('super_admin'::public.app_role)) then
    raise exception 'Not authorized to access admin dashboard.' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'total_users', (select count(*) from public.profiles p where p.deleted_at is null),
    'new_users_7d', (select count(*) from public.profiles p where p.deleted_at is null and p.created_at >= now() - interval '7 days'),
    'new_users_30d', (select count(*) from public.profiles p where p.deleted_at is null and p.created_at >= now() - interval '30 days'),
    'complete_profiles', (select count(*) from public.profiles p where p.deleted_at is null and p.profile_complete),
    'verified_users', (select count(*) from public.profiles p where p.deleted_at is null and p.verified),
    'active_matches', (select count(*) from public.matches m where m.status = 'active'),
    'total_messages', (select count(*) from public.messages m where m.deleted_at is null),
    'open_reports', (select count(*) from public.user_reports r where r.status in ('open', 'reviewing'))
  ) into result;
  return result;
end;
$$;

revoke all on function public.admin_dashboard_stats() from public, anon;
grant execute on function public.admin_dashboard_stats() to authenticated;

comment on function public.admin_dashboard_stats() is
  'Returns aggregate-only admin metrics. Requires admin or super_admin role checked inside the database.';

-- Provision the first Super Admin manually after deployment, replacing the UUID with
-- the intended auth.users.id. Never expose service_role credentials in browser code.
-- insert into public.user_roles(user_id, role)
-- values ('00000000-0000-0000-0000-000000000000', 'super_admin')
-- on conflict do nothing;
