-- Mumbai Afterhours Admin Command Center alignment.
-- Additive migration based on the deployed schema export supplied on 2026-11-09.
-- Uses the existing admin_audit_logs table (not the stale admin_audit_events draft).
-- Every privileged RPC performs its own authorization check.

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references auth.users(id),
  target_user_id uuid references auth.users(id),
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.admin_audit_logs enable row level security;
revoke all on public.admin_audit_logs from anon, authenticated;

create or replace function public.admin_assert()
returns void language plpgsql security definer set search_path = public, auth, pg_temp as $$
begin
  if auth.uid() is null or not (public.has_role('admin'::public.app_role) or public.has_role('super_admin'::public.app_role)) then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;
end;
$$;

create or replace function public.admin_list_members(p_search text default null, p_limit integer default 50, p_offset integer default 0)
returns table(user_id uuid, display_name text, city text, created_at timestamptz, profile_complete boolean, verified boolean, moderation_status text)
language plpgsql stable security definer set search_path = public, auth, pg_temp as $$
begin
  perform public.admin_assert();
  return query
  select p.id,p.display_name,p.city,p.created_at,p.profile_complete,p.verified,p.moderation_status::text
  from public.profiles p
  where p.deleted_at is null and (nullif(trim(p_search),'') is null or p.display_name ilike '%'||trim(p_search)||'%' or p.city ilike '%'||trim(p_search)||'%' or p.id::text=trim(p_search))
  order by p.created_at desc,p.id
  limit least(greatest(coalesce(p_limit,50),1),200) offset greatest(coalesce(p_offset,0),0);
end;
$$;

create or replace function public.admin_list_user_roles(p_user_id uuid)
returns text[]
language plpgsql stable security definer set search_path = public, auth, pg_temp as $$
begin
  perform public.admin_assert();
  if p_user_id is null then raise exception 'User id is required.'; end if;
  return coalesce((select array_agg(ur.role::text order by ur.role::text)
                   from public.user_roles ur where ur.user_id = p_user_id), array[]::text[]);
end;
$$;

create or replace function public.admin_set_role(p_user uuid, p_role text, p_enabled boolean)
returns void
language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare v_role public.app_role;
begin
  if not public.has_role('super_admin'::public.app_role) then
    raise exception 'Super Admin required.' using errcode = '42501';
  end if;
  if p_role not in ('moderator','admin') then raise exception 'Only moderator and admin roles can be changed.'; end if;
  if p_user is null or not exists(select 1 from auth.users where id = p_user) then raise exception 'User not found.'; end if;
  v_role := p_role::public.app_role;
  if p_enabled then
    insert into public.user_roles(user_id, role) values(p_user, v_role) on conflict do nothing;
  else
    delete from public.user_roles where user_id = p_user and role = v_role;
  end if;
  insert into public.admin_audit_logs(admin_user_id, target_user_id, action, details)
  values(auth.uid(), p_user, 'role_change', jsonb_build_object('role', p_role, 'enabled', p_enabled));
end;
$$;

create or replace function public.admin_list_audit(p_limit integer default 100)
returns table(id uuid, admin_user_id uuid, target_user_id uuid, action text, details jsonb, created_at timestamptz)
language plpgsql stable security definer set search_path = public, auth, pg_temp as $$
begin
  perform public.admin_assert();
  return query
  select a.id, a.admin_user_id, a.target_user_id, a.action, a.details, a.created_at
  from public.admin_audit_logs a
  order by a.created_at desc
  limit least(greatest(coalesce(p_limit, 100), 1), 500);
end;
$$;

create or replace function public.admin_user_360(p_user_id uuid)
returns table(
  user_id uuid, display_name text, city text, created_at timestamptz,
  profile_complete boolean, verified boolean, moderation_status text,
  visibility_status text, role_names text[], likes_sent bigint, likes_received bigint,
  active_matches bigint, messages_sent bigint, reports_received bigint,
  pending_verifications bigint
)
language plpgsql stable security definer set search_path = public, auth, pg_temp as $$
begin
  perform public.admin_assert();
  if p_user_id is null then raise exception 'User id is required.'; end if;
  return query
  select p.id, p.display_name, p.city, p.created_at, p.profile_complete, p.verified,
    p.moderation_status::text, p.visibility_status::text,
    coalesce((select array_agg(ur.role::text order by ur.role::text) from public.user_roles ur where ur.user_id=p.id), array[]::text[]),
    (select count(*) from public.likes l where l.actor_user_id=p.id),
    (select count(*) from public.likes l where l.target_user_id=p.id),
    (select count(*) from public.matches m where m.status='active' and p.id in (m.user_a_id,m.user_b_id)),
    (select count(*) from public.messages m where m.sender_user_id=p.id and m.deleted_at is null),
    (select count(*) from public.user_reports r where r.reported_user_id=p.id),
    (select count(*) from public.verification_requests v where v.user_id=p.id and v.status='pending')
  from public.profiles p where p.id=p_user_id and p.deleted_at is null;
  if not found then raise exception 'User not found.'; end if;
end;
$$;

create table if not exists public.admin_curated_batches (
  id uuid primary key default gen_random_uuid(),
  target_user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'draft' check(status in ('draft','published')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  published_at timestamptz
);
create table if not exists public.admin_curated_candidates (
  batch_id uuid not null references public.admin_curated_batches(id) on delete cascade,
  candidate_user_id uuid not null references public.profiles(id) on delete cascade,
  position integer not null check(position between 1 and 25),
  primary key(batch_id,candidate_user_id),
  unique(batch_id,position)
);
create unique index if not exists admin_one_published_batch_per_user
  on public.admin_curated_batches(target_user_id) where status='published';
alter table public.admin_curated_batches enable row level security;
alter table public.admin_curated_candidates enable row level security;
revoke all on public.admin_curated_batches, public.admin_curated_candidates from anon, authenticated;

create or replace function public.admin_curated_candidates_for(p_target uuid)
returns table(id uuid, display_name text, city text, verified boolean)
language plpgsql stable security definer set search_path = public, auth, pg_temp as $$
begin
  perform public.admin_assert();
  if p_target is null or not exists(select 1 from public.profiles where id=p_target and deleted_at is null) then raise exception 'Target user not found.'; end if;
  return query
  select p.id,p.display_name,p.city,p.verified
  from public.profiles p
  join public.profiles me on me.id=p_target
  left join public.user_preferences up on up.user_id=me.id
  where p.id<>p_target and p.deleted_at is null and p.profile_complete
    and p.visibility_status='visible' and p.moderation_status='approved'
    and not public.is_blocked_between(p_target,p.id)
    and not exists(select 1 from public.likes l where l.actor_user_id=p_target and l.target_user_id=p.id)
    and not exists(select 1 from public.passes s where s.actor_user_id=p_target and s.target_user_id=p.id)
    and not exists(select 1 from public.matches m where m.user_a_id=least(p_target,p.id) and m.user_b_id=greatest(p_target,p.id))
    and (cardinality(me.interested_in)=0 or p.gender=any(me.interested_in))
    and date_part('year',age(p.date_of_birth)) between coalesce(up.minimum_age,18) and coalesce(up.maximum_age,99)
  order by p.created_at desc limit 500;
end;
$$;

create or replace function public.admin_curated_save(p_target uuid, p_candidates uuid[], p_publish boolean default false)
returns uuid
language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare v_batch uuid; v_count integer; v_unique integer; v_valid integer;
begin
  perform public.admin_assert();
  if not exists(select 1 from public.profiles where id=p_target and deleted_at is null) then raise exception 'Target user not found.'; end if;
  v_count := coalesce(cardinality(p_candidates),0);
  if v_count <> 25 then raise exception 'Exactly 25 candidates are required.'; end if;
  select count(distinct x) into v_unique from unnest(p_candidates) x;
  if v_unique <> 25 then raise exception 'Candidates must be unique.'; end if;
  select count(*) into v_valid from public.admin_curated_candidates_for(p_target) c where c.id=any(p_candidates);
  if v_valid <> 25 then raise exception 'One or more candidates are no longer eligible.'; end if;
  insert into public.admin_curated_batches(target_user_id,created_by) values(p_target,auth.uid()) returning id into v_batch;
  insert into public.admin_curated_candidates(batch_id,candidate_user_id,position)
  select v_batch,x.candidate,i::integer from unnest(p_candidates) with ordinality as x(candidate,i);
  if p_publish then
    update public.admin_curated_batches set status='draft' where target_user_id=p_target and status='published';
    update public.admin_curated_batches set status='published',published_at=now() where id=v_batch;
  end if;
  insert into public.admin_audit_logs(admin_user_id,target_user_id,action,details)
  values(auth.uid(),p_target,case when p_publish then 'curated_publish' else 'curated_draft' end,jsonb_build_object('batch_id',v_batch,'candidate_count',25));
  return v_batch;
end;
$$;

create or replace function public.admin_curated_current(p_target uuid)
returns table(batch_id uuid,status text,candidate_user_id uuid,position integer,display_name text)
language plpgsql stable security definer set search_path = public, auth, pg_temp as $$
begin
  perform public.admin_assert();
  return query
  select b.id,b.status,c.candidate_user_id,c.position,p.display_name
  from public.admin_curated_batches b
  join public.admin_curated_candidates c on c.batch_id=b.id
  join public.profiles p on p.id=c.candidate_user_id
  where b.target_user_id=p_target and b.id=(
    select x.id from public.admin_curated_batches x where x.target_user_id=p_target
    order by (x.status='published') desc,x.created_at desc limit 1
  ) order by c.position;
end;
$$;

-- Discover continues to return the existing profile-card shape. Published curated
-- profiles are ordered first, then normal eligible profiles; duplicates are excluded.
create or replace function public.discover_profiles(page_size integer default 10, page_offset integer default 0)
returns table(
  id uuid, display_name text, age integer, neighbourhood text, bio text,
  interests text[], languages text[], relationship_intention text, verified boolean,
  photo_paths text[], photo_prompts text[], college text, education_status text,
  height text, occupation text, smoking text, alcohol text, religion text,
  profile_prompts jsonb
)
language sql stable security definer set search_path = public as $$
  with me as (
    select p.*, up.minimum_age, up.maximum_age
    from public.profiles p left join public.user_preferences up on up.user_id=p.id
    where p.id=auth.uid() and p.profile_complete and p.moderation_status='approved'
  ), published as (
    select c.candidate_user_id, c.position
    from public.admin_curated_batches b
    join public.admin_curated_candidates c on c.batch_id=b.id
    where b.target_user_id=auth.uid() and b.status='published'
      and b.id=(select b2.id from public.admin_curated_batches b2 where b2.target_user_id=auth.uid() and b2.status='published' order by b2.published_at desc limit 1)
  ), eligible as (
    select p.*, coalesce(pub.position, 999999) as curated_position
    from public.profiles p cross join me
    left join published pub on pub.candidate_user_id=p.id
    where p.id<>me.id and p.profile_complete and p.moderation_status='approved'
      and p.visibility_status='visible' and p.deleted_at is null
      and not public.is_blocked_between(me.id,p.id)
      and not exists(select 1 from public.likes l where l.actor_user_id=me.id and l.target_user_id=p.id)
      and not exists(select 1 from public.passes s where s.actor_user_id=me.id and s.target_user_id=p.id)
      and not exists(select 1 from public.matches m where m.user_a_id=least(me.id,p.id) and m.user_b_id=greatest(me.id,p.id))
      and (cardinality(me.interested_in)=0 or p.gender=any(me.interested_in))
      and date_part('year',age(p.date_of_birth)) between coalesce(me.minimum_age,18) and coalesce(me.maximum_age,99)
  )
  select e.id,e.display_name,date_part('year',age(e.date_of_birth))::int,
    case when e.show_neighbourhood then e.neighbourhood end,
    e.bio,e.interests,e.languages,e.relationship_intention,e.verified,
    array(select pp.storage_path from public.profile_photos pp where pp.user_id=e.id order by pp.display_order),
    array(select pp.prompt from public.profile_photos pp where pp.user_id=e.id order by pp.display_order),
    e.college,e.education_status,e.height,e.occupation,e.smoking,e.alcohol,e.religion,e.profile_prompts
  from eligible e
  order by e.curated_position asc, e.created_at desc
  limit least(greatest(coalesce(page_size,10),1),30)
  offset greatest(coalesce(page_offset,0),0);
$$;

create or replace function public.admin_risk_queue(p_min_reports integer default 2)
returns table(user_id uuid, display_name text, city text, moderation_status text, verified boolean, report_count bigint, created_at timestamptz)
language plpgsql stable security definer set search_path = public, auth, pg_temp as $$
begin
  perform public.admin_assert();
  return query
  select p.id,p.display_name,p.city,p.moderation_status::text,p.verified,count(r.id),p.created_at
  from public.profiles p join public.user_reports r on r.reported_user_id=p.id
  where p.deleted_at is null and r.status in ('open','reviewing','actioned')
  group by p.id,p.display_name,p.city,p.moderation_status,p.verified,p.created_at
  having count(r.id)>=greatest(coalesce(p_min_reports,2),1)
  order by count(r.id) desc,p.created_at desc limit 200;
end;
$$;

create or replace function public.admin_broadcast_announcement(p_title text,p_body text,p_action_path text default null)
returns integer
language plpgsql security definer set search_path = public, auth, pg_temp as $$
declare r record; v_count integer := 0;
begin
  perform public.admin_assert();
  if p_title is null or length(btrim(p_title)) not between 1 and 120 or p_body is null or length(btrim(p_body)) not between 1 and 1000 then
    raise exception 'Title must be 1-120 characters and body 1-1000 characters.';
  end if;
  for r in select id from public.profiles where deleted_at is null order by id loop
    perform public.publish_app_notification(r.id,'announcement',btrim(p_title),btrim(p_body),p_action_path,
      'admin-announcement:'||md5(p_title||'|'||p_body)||':'||r.id::text);
    v_count := v_count + 1;
  end loop;
  insert into public.admin_audit_logs(admin_user_id,action,details)
  values(auth.uid(),'broadcast_announcement',jsonb_build_object('recipient_count',v_count,'title',btrim(p_title)));
  return v_count;
end;
$$;

create or replace function public.admin_platform_health()
returns jsonb
language plpgsql stable security definer set search_path = public, auth, pg_temp as $$
begin
  perform public.admin_assert();
  return jsonb_build_object(
    'database_version', current_setting('server_version'),
    'profiles', (select count(*) from public.profiles where deleted_at is null),
    'pending_verifications', (select count(*) from public.verification_requests where status='pending'),
    'open_reports', (select count(*) from public.user_reports where status in ('open','reviewing')),
    'active_matches', (select count(*) from public.matches where status='active'),
    'messages_not_deleted', (select count(*) from public.messages where deleted_at is null),
    'checked_at', now()
  );
end;
$$;

revoke all on function public.admin_assert() from public, anon, authenticated;
revoke all on function public.admin_list_members(text,integer,integer), public.admin_list_user_roles(uuid), public.admin_set_role(uuid,text,boolean),
  public.admin_list_audit(integer), public.admin_user_360(uuid),
  public.admin_curated_candidates_for(uuid), public.admin_curated_save(uuid,uuid[],boolean),
  public.admin_curated_current(uuid), public.admin_risk_queue(integer),
  public.admin_broadcast_announcement(text,text,text), public.admin_platform_health()
  from public, anon;
grant execute on function public.admin_list_members(text,integer,integer), public.admin_list_user_roles(uuid), public.admin_set_role(uuid,text,boolean),
  public.admin_list_audit(integer), public.admin_user_360(uuid),
  public.admin_curated_candidates_for(uuid), public.admin_curated_save(uuid,uuid[],boolean),
  public.admin_curated_current(uuid), public.admin_risk_queue(integer),
  public.admin_broadcast_announcement(text,text,text), public.admin_platform_health()
  to authenticated;
revoke all on function public.discover_profiles(integer,integer) from public, anon;
grant execute on function public.discover_profiles(integer,integer) to authenticated;

comment on function public.discover_profiles(integer,integer) is
  'Returns the existing Discover card shape, prioritizing the current users published curated batch while rechecking current eligibility.';
