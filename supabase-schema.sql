-- Planora starter schema for Supabase SQL Editor.
-- Run this only in a new/appropriate project after reviewing it.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz
);

create table if not exists public.floor_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'My floor plan',
  requirements jsonb not null default '{}'::jsonb,
  preview_svg text,
  status text not null default 'preview' check (status in ('preview','unlocked','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.activity_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Payment rows must be created/updated by a trusted server or verified payment webhook.
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  floor_plan_id uuid not null references public.floor_plans(id) on delete cascade,
  provider text not null default 'razorpay',
  provider_order_id text unique,
  provider_payment_id text unique,
  amount_paise integer not null check (amount_paise > 0),
  currency text not null default 'INR',
  status text not null default 'created' check (status in ('created','pending','successful','failed','refunded')),
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.floor_plans enable row level security;
alter table public.activity_events enable row level security;
alter table public.payments enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile" on public.profiles for select to authenticated using (auth.uid() = id);
drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "Users can read own plans" on public.floor_plans;
create policy "Users can read own plans" on public.floor_plans for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users can create own plans" on public.floor_plans;
create policy "Users can create own plans" on public.floor_plans for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Users can update own plans" on public.floor_plans;
create policy "Users can update own plans" on public.floor_plans for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete own plans" on public.floor_plans;
create policy "Users can delete own plans" on public.floor_plans for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "Users can read own events" on public.activity_events;
create policy "Users can read own events" on public.activity_events for select to authenticated using (auth.uid() = user_id);
drop policy if exists "Users can insert own events" on public.activity_events;
create policy "Users can insert own events" on public.activity_events for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Users can read own payments" on public.payments;
create policy "Users can read own payments" on public.payments for select to authenticated using (auth.uid() = user_id);
-- Intentionally no client insert/update policy for payments. Add server-side verified webhook/Edge Function.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
