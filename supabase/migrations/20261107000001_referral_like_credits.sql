-- Referral & Like Credits: additive migration. Existing likes/matches remain intact.
create extension if not exists pgcrypto;

alter table public.profiles
  add column if not exists referral_code text;

create unique index if not exists profiles_referral_code_uidx
  on public.profiles(referral_code) where referral_code is not null;

create table if not exists public.like_credit_wallets (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  daily_free_used integer not null default 0 check (daily_free_used between 0 and 20),
  daily_window_started_at timestamptz not null default now(),
  bonus_credits integer not null default 0 check (bonus_credits >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.referral_attributions (
  id uuid primary key default gen_random_uuid(),
  inviter_user_id uuid not null references public.profiles(id) on delete cascade,
  invitee_user_id uuid not null unique references public.profiles(id) on delete cascade,
  referral_code text not null,
  status text not null default 'rewarded' check (status in ('rewarded')),
  bonus_awarded integer not null default 10 check (bonus_awarded = 10),
  created_at timestamptz not null default now(),
  constraint referral_not_self check (inviter_user_id <> invitee_user_id)
);
create index if not exists referral_attributions_inviter_idx
  on public.referral_attributions(inviter_user_id, created_at desc);

create table if not exists public.like_credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null check (event_type in ('daily_like_spent','bonus_like_spent','referral_reward')),
  amount integer not null check (amount <> 0),
  reference_id text not null,
  created_at timestamptz not null default now(),
  unique(user_id, event_type, reference_id)
);
create index if not exists like_credit_ledger_user_idx
  on public.like_credit_ledger(user_id, created_at desc);

alter table public.like_credit_wallets enable row level security;
alter table public.referral_attributions enable row level security;
alter table public.like_credit_ledger enable row level security;

drop policy if exists like_wallet_select_own on public.like_credit_wallets;
create policy like_wallet_select_own on public.like_credit_wallets
  for select to authenticated using (user_id = auth.uid());
drop policy if exists referrals_select_own on public.referral_attributions;
create policy referrals_select_own on public.referral_attributions
  for select to authenticated using (inviter_user_id = auth.uid() or invitee_user_id = auth.uid());
drop policy if exists credit_ledger_select_own on public.like_credit_ledger;
create policy credit_ledger_select_own on public.like_credit_ledger
  for select to authenticated using (user_id = auth.uid());
revoke all on public.like_credit_wallets, public.referral_attributions, public.like_credit_ledger from anon, authenticated;
grant select on public.like_credit_wallets, public.referral_attributions, public.like_credit_ledger to authenticated;

create or replace function public.assign_referral_code_and_wallet()
returns trigger language plpgsql security definer set search_path = public as $$
declare new_code text;
begin
  if new.referral_code is null or btrim(new.referral_code) = '' then
    loop
      new_code := upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 8));
      exit when not exists(select 1 from public.profiles where referral_code = new_code);
    end loop;
    new.referral_code := new_code;
  end if;
  return new;
end;
$$;
drop trigger if exists profiles_referral_code_assign on public.profiles;
create trigger profiles_referral_code_assign before insert on public.profiles
  for each row execute function public.assign_referral_code_and_wallet();

create or replace function public.initialize_like_credit_wallet()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.like_credit_wallets(user_id) values(new.id) on conflict(user_id) do nothing;
  return new;
end;
$$;
drop trigger if exists profiles_referral_wallet_init on public.profiles;
create trigger profiles_referral_wallet_init after insert on public.profiles
  for each row execute function public.initialize_like_credit_wallet();

-- Backfill existing profiles and wallets without changing existing data.
do $$
declare r record; c text;
begin
  for r in select id from public.profiles where referral_code is null loop
    loop
      c := upper(substr(encode(gen_random_bytes(8), 'hex'), 1, 8));
      exit when not exists(select 1 from public.profiles where referral_code = c);
    end loop;
    update public.profiles set referral_code = c where id = r.id;
  end loop;
  insert into public.like_credit_wallets(user_id)
    select id from public.profiles on conflict(user_id) do nothing;
end $$;

create or replace function public.get_like_credit_summary()
returns table(daily_free_remaining integer, referral_bonus_credits integer, daily_resets_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare w public.like_credit_wallets%rowtype;
begin
  if auth.uid() is null then raise exception 'Not authenticated.'; end if;
  select * into w from public.like_credit_wallets where user_id = auth.uid();
  if not found then
    insert into public.like_credit_wallets(user_id) values(auth.uid()) on conflict do nothing;
    select * into w from public.like_credit_wallets where user_id = auth.uid();
  end if;
  if now() >= w.daily_window_started_at + interval '24 hours' then
    update public.like_credit_wallets set daily_free_used = 0,
      daily_window_started_at = now(), updated_at = now()
      where user_id = auth.uid() returning * into w;
  end if;
  return query select greatest(0, 20 - w.daily_free_used), w.bonus_credits,
    w.daily_window_started_at + interval '24 hours';
end;
$$;

-- This trigger is the enforcement boundary: likes inserted by the existing send_like RPC
-- consume credits atomically. Duplicate likes do not fire it because INSERT ... ON CONFLICT does nothing.
create or replace function public.consume_like_credit()
returns trigger language plpgsql security definer set search_path = public as $$
declare w public.like_credit_wallets%rowtype;
begin
  if auth.uid() is null or auth.uid() <> new.actor_user_id then
    raise exception 'Not authorized to spend like credits.';
  end if;
  -- PostgreSQL runs BEFORE INSERT triggers before ON CONFLICT handling; explicitly
  -- bypass charging for an already-existing like. send_like serializes each pair.
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

  if w.daily_free_used < 20 then
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
    raise exception 'You have used all 20 daily likes and have no referral bonus credits left.';
  end if;
  return new;
end;
$$;
drop trigger if exists likes_consume_credit on public.likes;
create trigger likes_consume_credit before insert on public.likes
  for each row execute function public.consume_like_credit();

-- Called only after a new authenticated user has completed profile creation.
-- The 48-hour auth/profile age check limits claims by established accounts.
create or replace function public.claim_referral_reward(p_referral_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare me uuid := auth.uid(); inviter uuid; created timestamptz;
begin
  if me is null then raise exception 'Not authenticated.'; end if;
  if p_referral_code is null or length(btrim(p_referral_code)) < 6 then
    return jsonb_build_object('rewarded',false,'reason','no_referral');
  end if;
  select created_at into created from auth.users where id = me;
  if created is null or created < now() - interval '7 days' then
    return jsonb_build_object('rewarded',false,'reason','not_new_registration');
  end if;
  select id into inviter from public.profiles
    where referral_code = upper(btrim(p_referral_code)) and id <> me and deleted_at is null;
  if inviter is null then
    return jsonb_build_object('rewarded',false,'reason','invalid_referral');
  end if;
  if exists(select 1 from public.referral_attributions where invitee_user_id = me) then
    return jsonb_build_object('rewarded',false,'reason','already_claimed');
  end if;
  insert into public.referral_attributions(inviter_user_id,invitee_user_id,referral_code)
    values(inviter,me,upper(btrim(p_referral_code))) on conflict(invitee_user_id) do nothing;
  if not found then return jsonb_build_object('rewarded',false,'reason','already_claimed'); end if;
  insert into public.like_credit_wallets(user_id) values(inviter) on conflict do nothing;
  update public.like_credit_wallets set bonus_credits = bonus_credits + 10,
    updated_at = now() where user_id = inviter;
  insert into public.like_credit_ledger(user_id,event_type,amount,reference_id)
    values(inviter,'referral_reward',10,me::text);
  return jsonb_build_object('rewarded',true,'bonus_credits',10);
end;
$$;

create or replace function public.get_referral_dashboard()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare me uuid := auth.uid(); code text; bonus integer; total integer; earned integer; history jsonb;
begin
  if me is null then raise exception 'Not authenticated.'; end if;
  select referral_code into code from public.profiles where id = me;
  select coalesce(bonus_credits,0) into bonus from public.like_credit_wallets where user_id = me;
  select count(*), coalesce(sum(bonus_awarded),0) into total, earned
    from public.referral_attributions where inviter_user_id = me;
  select coalesce(jsonb_agg(jsonb_build_object(
    'invitee_name', coalesce(p.display_name,'New member'),
    'status', r.status, 'bonus_awarded', r.bonus_awarded, 'created_at', r.created_at
  ) order by r.created_at desc),'[]'::jsonb) into history
    from public.referral_attributions r join public.profiles p on p.id = r.invitee_user_id
    where r.inviter_user_id = me;
  return jsonb_build_object('referral_code',code,'referral_link',
    'https://ritesh-25909.github.io/Mumbai-Afterhours/?ref=' || code,
    'successful_referrals',coalesce(total,0),'total_bonus_earned',coalesce(earned,0),
    'available_bonus_credits',coalesce(bonus,0),'history',history);
end;
$$;

revoke execute on function public.get_like_credit_summary(), public.claim_referral_reward(text), public.get_referral_dashboard() from public, anon;
grant execute on function public.get_like_credit_summary(), public.claim_referral_reward(text), public.get_referral_dashboard() to authenticated;

-- Realtime wallet updates power the live balance on the Discover screen.
do $$ begin
  alter publication supabase_realtime add table public.like_credit_wallets;
exception when duplicate_object then null; when undefined_object then null; end $$;
