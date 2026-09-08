-- AV Flash — Phase 2: decks (a.k.a. "card sets" in the UI copy — stored as
-- decks per the build plan; see BUILD_LOG.md).

create table public.decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  name text not null check (char_length(btrim(name)) > 0),
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index decks_user_id_idx on public.decks (user_id);
create index decks_subject_id_idx on public.decks (subject_id);

create trigger decks_set_updated_at
before update on public.decks
for each row execute function public.set_updated_at();

create trigger decks_enforce_owner
before insert or update on public.decks
for each row execute function public.enforce_same_owner('subjects', 'subject_id');

alter table public.decks enable row level security;

create policy "decks_select_own"
on public.decks for select
to authenticated
using (user_id = auth.uid());

create policy "decks_insert_own"
on public.decks for insert
to authenticated
with check (user_id = auth.uid());

create policy "decks_update_own"
on public.decks for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "decks_delete_own"
on public.decks for delete
to authenticated
using (user_id = auth.uid());

grant select, insert, update, delete on public.decks to authenticated;
