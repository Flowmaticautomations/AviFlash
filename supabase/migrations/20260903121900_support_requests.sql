-- AV Flash — Phase 2: support_requests.
-- admin_notes is a real column (not a second table) but is protected with a
-- column-level grant, not just RLS: RLS is row-level only, so without this a
-- user who can SELECT their own row would also see internal support notes
-- written about them. Support staff read/write admin_notes via the
-- service role (bypasses grants and RLS), not the app.

create table public.support_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null check (category in ('billing', 'bug', 'account', 'content', 'other')),
  message text not null check (char_length(btrim(message)) > 0),
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index support_requests_user_id_idx on public.support_requests (user_id);

create trigger support_requests_set_updated_at
before update on public.support_requests
for each row execute function public.set_updated_at();

alter table public.support_requests enable row level security;

create policy "support_requests_select_own"
on public.support_requests for select
to authenticated
using (user_id = auth.uid());

create policy "support_requests_insert_own"
on public.support_requests for insert
to authenticated
with check (user_id = auth.uid());

-- No update/delete policy: once submitted, status/admin_notes are managed
-- by support staff via the service role, not edited by the student.

grant select (
  id, user_id, category, message, status, created_at, updated_at, resolved_at
) on public.support_requests to authenticated;
grant insert (user_id, category, message) on public.support_requests to authenticated;
