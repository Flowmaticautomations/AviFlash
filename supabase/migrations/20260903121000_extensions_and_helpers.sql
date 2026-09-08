-- AV Flash — Phase 2: extensions and shared helper functions.
-- Applied first; every later migration depends on these.

create extension if not exists pgcrypto; -- gen_random_uuid()

-- Generic "touch updated_at" trigger, reused by every table that has one.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Generic "child row's user_id must match its parent row's user_id" guard.
-- Reused by every owned child table (decks -> subjects, flashcards -> decks,
-- card_images -> flashcards, review_answers -> review_sessions) instead of
-- writing the same check by hand each time. RLS already stops a user from
-- reading another user's parent row to reference it in the first place; this
-- trigger is the defense-in-depth backstop in case a policy is ever
-- misconfigured.
-- ponytail: one extra SELECT per insert/update; fine at this app's scale,
-- revisit only if writes on these tables ever become a hot path.
create or replace function public.enforce_same_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  parent_table text := TG_ARGV[0];
  parent_fk_col text := TG_ARGV[1];
  parent_id uuid;
  parent_owner uuid;
begin
  execute format('select ($1).%I', parent_fk_col) into parent_id using new;

  execute format('select user_id from public.%I where id = $1', parent_table)
    into parent_owner
    using parent_id;

  if parent_owner is null then
    raise exception '% row referenced by % (via %) was not found', parent_table, TG_TABLE_NAME, parent_fk_col;
  end if;

  if parent_owner <> new.user_id then
    raise exception '% row does not belong to the same user as the % row it references', TG_TABLE_NAME, parent_table;
  end if;

  return new;
end;
$$;
