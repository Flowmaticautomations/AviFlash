-- AV Flash — Phase 2: flashcards.
-- "Question/answer needs text or at least one image" is app-side validation
-- (Phase 5 spec) — a flashcard row is created first and card_images rows are
-- attached to it after, so that rule can't be a single-table CHECK here.

create table public.flashcards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  deck_id uuid not null references public.decks (id) on delete cascade,
  question_text text,
  answer_text text,
  card_order integer not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index flashcards_user_id_idx on public.flashcards (user_id);
create index flashcards_deck_id_idx on public.flashcards (deck_id);

create trigger flashcards_set_updated_at
before update on public.flashcards
for each row execute function public.set_updated_at();

create trigger flashcards_enforce_owner
before insert or update on public.flashcards
for each row execute function public.enforce_same_owner('decks', 'deck_id');

alter table public.flashcards enable row level security;

create policy "flashcards_select_own"
on public.flashcards for select
to authenticated
using (user_id = auth.uid());

create policy "flashcards_insert_own"
on public.flashcards for insert
to authenticated
with check (user_id = auth.uid());

create policy "flashcards_update_own"
on public.flashcards for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "flashcards_delete_own"
on public.flashcards for delete
to authenticated
using (user_id = auth.uid());

grant select, insert, update, delete on public.flashcards to authenticated;
