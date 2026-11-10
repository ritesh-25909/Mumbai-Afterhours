-- Mandatory, unverified contact-number collection and admin storage reporting.
-- Contact numbers are stored separately because a profile row is created later in onboarding.
create table if not exists public.user_contact_details (
  user_id uuid primary key references auth.users(id) on delete cascade,
  mobile_number text not null check (mobile_number ~ '^\+[1-9][0-9]{7,14}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_contact_details enable row level security;
revoke all on public.user_contact_details from anon;
grant select, insert, update on public.user_contact_details to authenticated;

drop policy if exists user_contact_select_own on public.user_contact_details;
create policy user_contact_select_own on public.user_contact_details
  for select to authenticated using (user_id = auth.uid());

drop policy if exists user_contact_insert_own on public.user_contact_details;
create policy user_contact_insert_own on public.user_contact_details
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists user_contact_update_own on public.user_contact_details;
create policy user_contact_update_own on public.user_contact_details
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Aggregate Storage usage is exposed only through this admin-checked RPC.
create or replace function public.admin_storage_usage()
returns table(bucket_id text, object_count bigint, total_bytes bigint, database_bytes bigint)
language plpgsql
security definer
set search_path = public, storage
as $$
begin
  perform public.admin_assert();

  return query
  select
    b.id::text as bucket_id,
    count(o.id)::bigint as object_count,
    coalesce(sum(
      case
        when (o.metadata->>'size') ~ '^[0-9]+$'
          then (o.metadata->>'size')::bigint
        else 0
      end
    ), 0)::bigint as total_bytes,
    pg_database_size(current_database())::bigint as database_bytes
  from storage.buckets b
  left join storage.objects o on o.bucket_id = b.id
  group by b.id
  order by b.id;
end;
$$;

revoke all on function public.admin_storage_usage() from public, anon;
grant execute on function public.admin_storage_usage() to authenticated;

