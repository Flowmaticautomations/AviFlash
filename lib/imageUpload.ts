import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { isImageDataValid } from './imageValidation';
import { supabase } from './supabase';
import type { Tables } from './database.types';

export type CardImage = Tables<'card_images'>;
export type CardImageSide = 'question' | 'answer';

const BUCKET = 'flashcard-images';
const MAX_IMAGES_PER_SIDE = 3;
const MAX_DIMENSION = 1280;
const JPEG_QUALITY = 0.7;

export { MAX_IMAGES_PER_SIDE };

// Picking + compressing are separate from uploading: New Card needs to stage
// picked images locally (the flashcard they'll belong to doesn't exist yet),
// while View Cards' edit mode can upload immediately since the flashcard
// already has an id. Both paths share compression/upload/delete/signed-URL
// logic below.

export async function pickImages(remainingSlots: number): Promise<string[]> {
  if (remainingSlots <= 0) return [];

  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Photo library access is needed to add images.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: remainingSlots > 1,
    selectionLimit: remainingSlots,
    quality: 1,
  });

  if (result.canceled) return [];
  return result.assets.slice(0, remainingSlots).map((asset) => asset.uri);
}

// Resize to a max dimension + re-save as JPEG at reduced quality — keeps
// flashcard photos from phone cameras (often several MB, 4000px+) reasonable
// for mobile data and Supabase storage before they ever reach the network.
async function compressImage(uri: string): Promise<string> {
  const context = ImageManipulator.manipulate(uri);
  const rendered = await context.resize({ width: MAX_DIMENSION }).renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: JPEG_QUALITY });
  return saved.uri;
}

function storagePath(userId: string, flashcardId: string, side: CardImageSide, sortOrder: number) {
  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${userId}/${flashcardId}/${side}-${sortOrder}-${unique}.jpg`;
}

interface UploadCardImageInput {
  userId: string;
  flashcardId: string;
  side: CardImageSide;
  sortOrder: number;
  localUri: string;
}

// Compresses, uploads to the private bucket, then inserts the card_images
// row. If the DB insert fails (e.g. the max-3-per-side trigger rejects it),
// the just-uploaded storage object is cleaned up rather than left orphaned.
export async function uploadCardImage({
  userId,
  flashcardId,
  side,
  sortOrder,
  localUri,
}: UploadCardImageInput): Promise<CardImage> {
  const compressedUri = await compressImage(localUri);
  const path = storagePath(userId, flashcardId, side, sortOrder);

  // Was fetch(compressedUri).then(res => res.arrayBuffer()) -- on this
  // device/SDK combo that silently resolved to a tiny fixed-size error body
  // (every upload landed as an identical 14-byte object in storage) instead
  // of throwing, so a broken upload looked successful and just never
  // rendered as an image later. expo-file-system's File reads the local
  // file's real bytes directly, no network-fetch layer involved.
  const arrayBuffer = await new File(compressedUri).arrayBuffer();
  if (!isImageDataValid(arrayBuffer.byteLength)) {
    throw new Error('Could not read the photo from your device — try picking it again.');
  }
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, arrayBuffer, {
    contentType: 'image/jpeg',
  });
  if (uploadError) throw uploadError;

  const { data, error: insertError } = await supabase
    .from('card_images')
    .insert({ user_id: userId, flashcard_id: flashcardId, side, sort_order: sortOrder, storage_path: path })
    .select()
    .single();

  if (insertError) {
    await supabase.storage.from(BUCKET).remove([path]);
    throw insertError;
  }

  return data;
}

// Deletes the DB row first, then best-effort removes the storage object.
// That ordering means a storage-delete failure only ever leaves an orphaned
// *file* (harmless, invisible to the app) rather than a DB row pointing at a
// file that's already gone.
export async function deleteCardImage(image: CardImage): Promise<void> {
  const { error } = await supabase.from('card_images').delete().eq('id', image.id);
  if (error) throw error;
  await supabase.storage.from(BUCKET).remove([image.storage_path]);
}

const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();
const SIGNED_URL_TTL_SECONDS = 60 * 60;

// The bucket is private, so a plain public URL won't render these — every
// display needs a short-lived signed URL. Cached per path for this app
// session so re-rendering the same card doesn't re-request one every time.
export async function getSignedUrl(path: string): Promise<string | null> {
  const cached = signedUrlCache.get(path);
  if (cached && cached.expiresAt > Date.now()) return cached.url;

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error || !data) {
    // Was silently returning null here, with no way to tell "this image
    // failed to sign" apart from "everything's fine". Logged now -- the
    // caller still gets null either way and renders its own fallback UI.
    console.error('getSignedUrl failed for', path, error?.message);
    return null;
  }

  signedUrlCache.set(path, { url: data.signedUrl, expiresAt: Date.now() + (SIGNED_URL_TTL_SECONDS - 60) * 1000 });
  return data.signedUrl;
}
