-- AV Flash — Phase 2: subjects.

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) > 0),
  academic_year text,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index subjects_user_id_idx on public.subjects (user_id);

create trigger subjects_set_updated_at
before update on public.subjects
for each row execute function public.set_updated_at();

alter table public.subjects enable row level security;

create policy "subjects_select_own"
on public.subjects for select
to authenticated
using (user_id = auth.uid());

create policy "subjects_insert_own"
on public.subjects for insert
to authenticated
with check (user_id = auth.uid());

create policy "subjects_update_own"
on public.subjects for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "subjects_delete_own"
on public.subjects for delete
to authenticated
using (user_id = auth.uid());

grant select, insert, update, delete on public.subjects to authenticated;
