-- Admin foundation security tests. Run after all migrations and existing SQL test suites.
-- Existing fixture users: a = regular member, b = member, c = member, d = moderator.
insert into user_roles(user_id, role) values
  ('c0000000-0000-0000-0000-00000000000c', 'admin'),
  ('b0000000-0000-0000-0000-00000000000b', 'super_admin')
on conflict do nothing;

do $$ declare
  regular_user uuid := 'a0000000-0000-0000-0000-00000000000a';
  super_admin_user uuid := 'b0000000-0000-0000-0000-00000000000b';
  admin_user uuid := 'c0000000-0000-0000-0000-00000000000c';
  moderator_user uuid := 'd0000000-0000-0000-0000-00000000000d';
  role_list text[];
begin
  perform t.as_user(regular_user);
  perform t.fails('regular member cannot read admin dashboard metrics', 'select * from admin_dashboard_stats()');
  perform t.fails('regular member cannot assign own admin role', format('insert into user_roles(user_id,role) values (%L,%L)', regular_user, 'admin'));
  perform t.ok('regular member cannot read role assignments', (select count(*) from user_roles) = 0);
  perform t.back();

  perform t.as_user(moderator_user);
  perform t.fails('moderator cannot read admin-only dashboard metrics', 'select * from admin_dashboard_stats()');
  perform t.back();

  perform t.as_user(admin_user);
  perform t.ok('admin can read aggregate dashboard metrics', (select count(*) = 1 from admin_dashboard_stats()));
  perform t.back();

  perform t.as_user(super_admin_user);
  role_list := my_roles();
  perform t.ok('super admin role is returned to its owner', role_list @> array['super_admin']::text[]);
  perform t.ok('super admin inherits administrator authorization', has_role('admin'::app_role));
  perform t.ok('super admin inherits moderator authorization', has_role('moderator'::app_role));
  perform t.ok('super admin can read aggregate dashboard metrics', (select count(*) = 1 from admin_dashboard_stats()));
  perform t.back();

  perform t.ok('anonymous role cannot execute admin dashboard RPC', not has_function_privilege('anon', 'public.admin_dashboard_stats()', 'EXECUTE'));
  perform t.ok('authenticated users cannot write role assignments', not has_table_privilege('authenticated', 'public.user_roles', 'INSERT'));
  perform t.ok('authenticated users cannot update role assignments', not has_table_privilege('authenticated', 'public.user_roles', 'UPDATE'));
  perform t.ok('authenticated users cannot delete role assignments', not has_table_privilege('authenticated', 'public.user_roles', 'DELETE'));
end $$;
