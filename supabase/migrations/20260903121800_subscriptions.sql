-- AV Flash — Phase 2: subscriptions + the trigger that gives every new
-- auth user a profile + a 7-day trial subscription automatically, and the
-- trigger that schedules the 90-day post-cancellation data deletion.
--
-- payment_provider is nullable and unconstrained-to-one-value on purpose:
-- Google Play Billing vs. PayFast is still an open commercial decision
-- (see TODO_DECISIONS.md, item 6) — the column accepts either so Phase 9
-- doesn't need a schema change once that's decided.

create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  status text not null default 'trialing'
    check (status in ('trialing', 'active', 'past_due', 'cancelled', 'expired')),
  trial_started_at timestamptz not null default now(),
  trial_ends_at timestamptz not null default (now() + interval '7 days'),
  paid_until timestamptz,
  payment_provider text check (payment_provider is null or payment_provider in ('google_play', 'payfast')),
  data_deletion_scheduled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.subscriptions is 'One row per user (unique user_id), created automatically by handle_new_user. Never written to directly by the app — see PHASE_2_SUPABASE_PLAN.md §5.';
comment on column public.subscriptions.data_deletion_scheduled_at is 'Set to now() + 90 days by subscriptions_schedule_deletion whenever status becomes cancelled/expired; cleared if it becomes active again. The actual purge job is NOT built in Phase 2 — see TODO_DECISIONS.md.';

create trigger subscriptions_set_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

alter table public.subscriptions enable row level security;

-- Read-only from the client: a user can see their own trial/plan status,
-- but status/paid_until/payment_provider can only change via a trusted
-- server path (a service-role Edge Function verifying with the store,
-- built in Phase 9) — never a client-writable column, or any student could
-- grant themselves a paid subscription for free.
create policy "subscriptions_select_own"
on public.subscriptions for select
to authenticated
using (user_id = auth.uid());

grant select on public.subscriptions to authenticated;

-- Schedule (or clear) the 90-day data-deletion date whenever status
-- transitions into/out of cancelled or expired.
create or replace function public.handle_subscription_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('cancelled', 'expired') and (old.status is distinct from new.status) then
    new.data_deletion_scheduled_at := now() + interval '90 days';
  elsif new.status in ('trialing', 'active', 'past_due') then
    new.data_deletion_scheduled_at := null;
  end if;
  return new;
end;
$$;

create trigger subscriptions_schedule_deletion
before update on public.subscriptions
for each row execute function public.handle_subscription_status_change();

-- Give every new auth user a profile row and a 7-day trial subscription
-- row automatically, whether they signed up with email/password or (in
-- Phase 3) Google. Runs as SECURITY DEFINER so it isn't blocked by RLS —
-- this is the ONLY place profiles/subscriptions rows are inserted from;
-- there is deliberately no client-side insert policy on either table.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;

  insert into public.subscriptions (user_id, status, trial_started_at, trial_ends_at)
  values (new.id, 'trialing', now(), now() + interval '7 days')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
