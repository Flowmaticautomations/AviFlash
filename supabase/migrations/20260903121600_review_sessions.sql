-- AV Flash — Phase 2: review_sessions.
-- accuracy_percent is a generated column (computed from correct/total),
-- not a value the app has to remember to keep in sync.

create table public.review_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  deck_id uuid not null references public.decks (id) on delete cascade,
  order_mode text not null check (order_mode in ('original', 'shuffled')),
  total_cards integer not null default 0 check (total_cards >= 0),
  correct_count integer not null default 0 check (correct_count >= 0),
  incorrect_count integer not null default 0 check (incorrect_count >= 0),
  accuracy_percent numeric(5, 2) generated always as (
    case when total_cards > 0
      then round((correct_count::numeric / total_cards) * 100, 2)
      else null
    end
  ) stored,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  was_completed boolean not null default false
);

create index review_sessions_user_id_idx on public.review_sessions (user_id);
create index review_sessions_deck_id_idx on public.review_sessions (deck_id, started_at desc);

create trigger review_sessions_enforce_owner
before insert or update on public.review_sessions
for each row execute function public.enforce_same_owner('decks', 'deck_id');

alter table public.review_sessions enable row level security;

create policy "review_sessions_select_own"
on public.review_sessions for select
to authenticated
using (user_id = auth.uid());

create policy "review_sessions_insert_own"
on public.review_sessions for insert
to authenticated
with check (user_id = auth.uid());

create policy "review_sessions_update_own"
on public.review_sessions for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

-- No delete policy: review history should be retained (it drives the
-- "previous accuracy" comparison in Phase 7); the app never needs to
-- delete a completed session, only the account-deletion flow does, and
-- that goes through the auth.users cascade, not this table directly.

grant select, insert, update on public.review_sessions to authenticated;
