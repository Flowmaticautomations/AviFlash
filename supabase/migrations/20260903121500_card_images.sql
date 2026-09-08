-- AV Flash — Phase 2: card_images.
-- Stores the private Storage object path, not a public image_url — see the
-- storage plan (20260903121900_storage_card_images.sql) for why: images
-- must be private per user, so the app resolves a short-lived signed URL
-- from storage_path at read time instead of a permanent public URL.

create table public.card_images (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  flashcard_id uuid not null references public.flashcards (id) on delete cascade,
  side text not null check (side in ('question', 'answer')),
  storage_path text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index card_images_user_id_idx on public.card_images (user_id);
create index card_images_flashcard_id_idx on public.card_images (flashcard_id);

create trigger card_images_enforce_owner
before insert or update on public.card_images
for each row execute function public.enforce_same_owner('flashcards', 'flashcard_id');

-- Hard backstop for "max 3 images per question side / max 3 per answer
-- side" (Phase 5 spec). The app should stop the user at 3 in the UI; this
-- is what keeps that rule true even from a buggy or malicious client.
-- ponytail: COUNT(*)-then-INSERT has a narrow race window under concurrent
-- inserts for the same flashcard+side; not a real risk for a single
-- student uploading from one device, revisit with an advisory lock if
-- multi-device concurrent uploads ever become a thing.
create or replace function public.enforce_max_images_per_side()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_count integer;
begin
  select count(*) into existing_count
  from public.card_images
  where flashcard_id = new.flashcard_id
    and side = new.side;

  if existing_count >= 3 then
    raise exception 'flashcard % already has 3 % images (the maximum)', new.flashcard_id, new.side;
  end if;

  return new;
end;
$$;

create trigger card_images_enforce_max_per_side
before insert on public.card_images
for each row execute function public.enforce_max_images_per_side();

alter table public.card_images enable row level security;

create policy "card_images_select_own"
on public.card_images for select
to authenticated
using (user_id = auth.uid());

create policy "card_images_insert_own"
on public.card_images for insert
to authenticated
with check (user_id = auth.uid());

create policy "card_images_delete_own"
on public.card_images for delete
to authenticated
using (user_id = auth.uid());

-- No update policy: an image is replaced by deleting the row (and its
-- storage object) and inserting a new one, not edited in place — matches
-- the product spec's "no image cropping/rotation in version 1".

grant select, insert, delete on public.card_images to authenticated;
