-- AV Flash — Phase 2: profiles.
-- One row per auth user. id IS the auth user id (not a separate surrogate +
-- user_id pair) so it can never drift out of sync — every other table below
-- just references auth.users(id) directly for the same reason.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text,
  surname text,
  phone text,
  email text,
  birth_year integer check (birth_year is null or birth_year between 1900 and 2200),
  birth_date date,
  grade_or_year text,
  country text not null default 'South Africa',
  role text not null default 'student' check (role in ('student', 'support', 'admin')),
  profile_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'One row per auth user. role exists for future admin/support tooling but is NOT given any RLS bypass in Phase 2 — see PHASE_2_SUPABASE_PLAN.md.';
comment on column public.profiles.profile_completed is 'False until the student finishes the profile-completion step. Needed after Google sign-in, where auth.users exists but name/grade/etc. do not yet.';

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

-- Users may only ever see or change their own single profile row.
create policy "profiles_select_own"
on public.profiles for select
to authenticated
using (id = auth.uid());

create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- No insert/delete policy for authenticated users on purpose: the row is
-- created automatically by the handle_new_user trigger (see the
-- subscriptions migration) when auth.users gets a new row, and deletion of
-- the auth user (Settings -> Delete account, via a service-role Edge
-- Function in a later phase) cascades here. A client-side insert/delete
-- policy would let a user create extra rows or wipe their own account
-- without going through that flow.

grant select, update (
  first_name, surname, phone, email, birth_year, birth_date,
  grade_or_year, country, profile_completed, updated_at
) on public.profiles to authenticated;
-- "role" is deliberately excluded from the update grant: a user must never
-- be able to promote themselves to support/admin from the client.
