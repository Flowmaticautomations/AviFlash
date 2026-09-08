-- AV Flash — Phase 2: review_answers (per-card detail within a session).

create table public.review_answers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  review_session_id uuid not null references public.review_sessions (id) on delete cascade,
  flashcard_id uuid not null references public.flashcards (id) on delete cascade,
  marked_correct boolean not null,
  answered_at timestamptz not null default now()
);

create index review_answers_user_id_idx on public.review_answers (user_id);
create index review_answers_session_id_idx on public.review_answers (review_session_id);

create trigger review_answers_enforce_owner
before insert or update on public.review_answers
for each row execute function public.enforce_same_owner('review_sessions', 'review_session_id');

alter table public.review_answers enable row level security;

create policy "review_answers_select_own"
on public.review_answers for select
to authenticated
using (user_id = auth.uid());

create policy "review_answers_insert_own"
on public.review_answers for insert
to authenticated
with check (user_id = auth.uid());

-- No update/delete policy: an answer, once recorded, is a historical fact
-- of that review session and isn't edited or removed by the app.

grant select, insert on public.review_answers to authenticated;
