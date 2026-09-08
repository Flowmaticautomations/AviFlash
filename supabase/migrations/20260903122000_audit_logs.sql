-- AV Flash — Phase 2: audit_logs.
-- Every admin/support action against a user's account (e.g. a support
-- agent resolving a ticket, an admin suspending an account) gets a row
-- here — safe metadata only, NEVER private flashcard/card content.
--
-- Deliberately no GRANT statements and no policies for anon/authenticated
-- in this file. RLS is enabled with zero policies, which is deny-all by
-- default for every role and every command (SELECT/INSERT/UPDATE/DELETE)
-- except the table owner and roles that bypass RLS. Only the service role
-- (used from Edge Functions / the separate admin web tool in a later
-- phase, never from the mobile app) can read or write it.
--
-- Correction, found applying this to the real dev project: Supabase's
-- project-level default privileges grant anon/authenticated full table
-- privileges on every new public-schema table automatically, this one
-- included, regardless of the missing GRANT here — so "no GRANT" does NOT
-- mean "no table privilege" on a real project the way it would on a bare
-- Postgres install. RLS-enabled-with-zero-policies is what actually does
-- the locking, verified empirically (see BUILD_LOG.md): as an authenticated
-- user, a seeded row was invisible to SELECT and a direct INSERT was
-- rejected with "new row violates row-level security policy".

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  target_table text,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_actor_id_idx on public.audit_logs (actor_id);
create index audit_logs_target_idx on public.audit_logs (target_table, target_id);
create index audit_logs_created_at_idx on public.audit_logs (created_at desc);

alter table public.audit_logs enable row level security;
