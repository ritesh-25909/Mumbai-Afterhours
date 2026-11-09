-- Set the free daily like allowance to 15. Referral bonus credits remain separate.
-- Clamp any in-progress 16-20 daily usage so the stricter constraint can be applied safely.
update public.like_credit_wallets set daily_free_used = 15 where daily_free_used > 15;
alter table public.like_credit_wallets
  drop constraint if exists like_credit_wallets_daily_free_used_check;
alter table public.like_credit_wallets
  add constraint like_credit_wallets_daily_free_used_check
  check (daily_free_used between 0 and 15);

create or replace function public.get_like_credit_summary()
returns table(daily_free_remaining integer, referral_bonus_credits integer, daily_resets_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare w public.like_credit_wallets%rowtype;
begin
  if auth.uid() is null then raise exception 'Not authenticated.'; end if;
  insert into public.like_credit_wallets(user_id) values(auth.uid()) on conflict(user_id) do nothing;
  select * into w from public.like_credit_wallets where user_id = auth.uid() for update;
  if now() >= w.daily_window_started_at + interval '24 hours' then
    update public.like_credit_wallets set daily_free_used = 0,
      daily_window_started_at = now(), updated_at = now()
      where user_id = auth.uid() returning * into w;
  end if;
  return query select greatest(0, 15 - w.daily_free_used), w.bonus_credits,
    w.daily_window_started_at + interval '24 hours';
end;
$$;

create or replace function public.consume_like_credit()
returns trigger language plpgsql security definer set search_path = public as $$
declare w public.like_credit_wallets%rowtype;
begin
  if auth.uid() is null or auth.uid() <> new.actor_user_id then
    raise exception 'Not authorized to spend like credits.';
  end if;
  if exists(select 1 from public.likes where actor_user_id = new.actor_user_id and target_user_id = new.target_user_id) then
    return new;
  end if;
  insert into public.like_credit_wallets(user_id) values(new.actor_user_id) on conflict do nothing;
  select * into w from public.like_credit_wallets where user_id = new.actor_user_id for update;
  if now() >= w.daily_window_started_at + interval '24 hours' then
    update public.like_credit_wallets set daily_free_used = 0,
      daily_window_started_at = now(), updated_at = now()
      where user_id = new.actor_user_id returning * into w;
  end if;
  if w.daily_free_used < 15 then
    update public.like_credit_wallets set daily_free_used = daily_free_used + 1,
      updated_at = now() where user_id = new.actor_user_id;
    insert into public.like_credit_ledger(user_id,event_type,amount,reference_id)
      values(new.actor_user_id,'daily_like_spent',-1,new.actor_user_id::text || ':' || new.target_user_id::text)
      on conflict do nothing;
  elsif w.bonus_credits > 0 then
    update public.like_credit_wallets set bonus_credits = bonus_credits - 1,
      updated_at = now() where user_id = new.actor_user_id;
    insert into public.like_credit_ledger(user_id,event_type,amount,reference_id)
      values(new.actor_user_id,'bonus_like_spent',-1,new.actor_user_id::text || ':' || new.target_user_id::text)
      on conflict do nothing;
  else
    raise exception 'You have used all 15 daily likes and have no referral bonus credits left.';
  end if;
  return new;
end;
$$;

-- Count incoming likes independently of signed-photo loading so the Matches badge updates fast.
create or replace function public.get_incoming_like_count()
returns integer language sql stable security definer set search_path = public as $$
  select count(*)::integer
  from public.likes l
  join public.profiles p on p.id = l.actor_user_id
  where l.target_user_id = auth.uid()
    and p.deleted_at is null
    and p.profile_complete
    and p.moderation_status = 'approved'
    and p.visibility_status = 'visible'
    and not public.is_blocked_between(auth.uid(), p.id)
    and not exists (
      select 1 from public.likes back_like
      where back_like.actor_user_id = auth.uid()
        and back_like.target_user_id = p.id
    );
$$;
revoke execute on function public.get_incoming_like_count() from public, anon;
grant execute on function public.get_incoming_like_count() to authenticated;

do $$ begin
  alter publication supabase_realtime add table public.likes;
exception when duplicate_object then null; when undefined_object then null; end $$;
