-- AV Flash — Phase 2: private storage bucket for flashcard images.
--
-- Folder structure: flashcard-images/{user_id}/{flashcard_id}/{side}-{sort_order}-{uuid}.{ext}
-- e.g. flashcard-images/1a2b.../9f8e.../question-0-c4d1....jpg
-- The leading {user_id} segment is what the policies below check against
-- auth.uid() — matches the Build Spec's "object paths start with the
-- user's UUID" rule. The app derives a short-lived signed URL from this
-- path at read time; nothing in this bucket is ever public.
--
-- "Max 3 images per side" and "compress before upload" are enforced by the
-- card_images table trigger and the app respectively, not here — see
-- 20260903121500_card_images.sql.

insert into storage.buckets (id, name, public)
values ('flashcard-images', 'flashcard-images', false)
on conflict (id) do nothing;

-- storage.objects ships with RLS already enabled by Supabase and is owned
-- by supabase_storage_admin, not the migration role — an explicit "alter
-- table ... enable row level security" here fails with "must be owner of
-- table objects" (hit this applying to the real dev project). Only the
-- policies themselves need to be (and can be) created.

create policy "flashcard_images_select_own"
on storage.objects for select
to authenticated
using (
  bucket_id = 'flashcard-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "flashcard_images_insert_own"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'flashcard-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "flashcard_images_delete_own"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'flashcard-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- No update policy: an image is replaced by delete + re-upload (see
-- card_images' "no update policy" note) rather than overwritten in place.
