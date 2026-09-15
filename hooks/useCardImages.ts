import { useCallback, useEffect, useState } from 'react';
import { getSignedUrl } from '../lib/imageUpload';
import { supabase } from '../lib/supabase';
import type { CardImage } from '../lib/imageUpload';

export interface CardImageWithUrl extends CardImage {
  signedUrl: string | null;
}

// Fetches a flashcard's images (both sides) with resolved signed URLs, for
// View Cards and Review — both just need to display what's already saved.
// New Card is deliberately not built on this hook: it stages local picker
// URIs before the flashcard even exists, so there's nothing to fetch yet.
export function useCardImages(flashcardId: string | null) {
  const [images, setImages] = useState<CardImageWithUrl[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!flashcardId) {
      setImages([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('card_images')
      .select('*')
      .eq('flashcard_id', flashcardId)
      .order('sort_order', { ascending: true });

    if (error) {
      // Previously silent (data defaulted to []), which is indistinguishable
      // from "this card genuinely has no images" -- logged now so a real
      // fetch failure (RLS, network) is visible instead of just rendering
      // as an empty gallery with no clue why.
      console.error('useCardImages: card_images fetch failed', error.message);
    }

    const rows = data ?? [];
    const withUrls = await Promise.all(
      rows.map(async (row) => ({ ...row, signedUrl: await getSignedUrl(row.storage_path) }))
    );
    setImages(withUrls);
    setLoading(false);
  }, [flashcardId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { images, loading, refresh };
}
