import { useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useThemeColors } from '../hooks/useThemeColors';
import type { CardImageWithUrl } from '../hooks/useCardImages';

interface ImageGalleryProps {
  images: CardImageWithUrl[];
  label: string;
  // 'thumbnails' shows small previews inline (View Cards — browsing/management
  // context). 'button' shows a single tap target and nothing else until tapped
  // (Review — images must not clutter the card, per the phase brief).
  variant: 'thumbnails' | 'button';
  onRemove?: (image: CardImageWithUrl) => void;
}

export function ImageGallery({ images, label, variant, onRemove }: ImageGalleryProps) {
  const colors = useThemeColors();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [modalIndex, setModalIndex] = useState(0);
  // Tracks images whose signedUrl resolved but the actual native image load
  // still failed (bad/expired token, network blip, etc.) -- previously
  // indistinguishable from "no image" since a failed <Image> load just
  // renders nothing, silently, at the given box size. Logged too, so a real
  // device test has something concrete to report back.
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set());

  function markFailed(imageId: string, reason?: string) {
    console.error('ImageGallery: image failed to load', imageId, reason);
    setFailedIds((prev) => {
      const next = new Set(prev);
      next.add(imageId);
      return next;
    });
  }

  if (images.length === 0) return null;

  function openModalAt(index: number) {
    setModalIndex(index);
    setPreviewOpen(true);
  }

  // Clamped, not a direct index: images can shrink out from under an open
  // modal (a remove elsewhere triggering a refresh) -- this avoids reading
  // past the end and crashing on `current.signedUrl`.
  const current = images[modalIndex] ?? images[images.length - 1];

  // onRemove is only passed in edit mode (View Cards' edit form) -- that's
  // the only place a failed image is actually actionable, so only tell the
  // user to remove it there. In read-only views (View Cards browsing,
  // Review) there's no remove control on screen to point them at.
  const failureMessage = onRemove
    ? 'Could not load this image. Remove it below and add a new one.'
    : 'Could not load this image. Edit this card to remove and replace it.';

  return (
    <View style={styles.wrap}>
      {variant === 'button' ? (
        <Pressable
          onPress={() => openModalAt(0)}
          style={[styles.viewButton, { borderColor: colors.border, backgroundColor: colors.card }]}
        >
          <Text style={{ color: colors.tint, fontWeight: '600' }}>View Image</Text>
        </Pressable>
      ) : (
        <View style={styles.thumbRow}>
          {images.map((image, index) => (
            <View key={image.id} style={styles.thumbWrap}>
              <Pressable onPress={() => openModalAt(index)}>
                {image.signedUrl && !failedIds.has(image.id) ? (
                  <Image
                    source={{ uri: image.signedUrl }}
                    style={[styles.thumb, { borderColor: colors.border }]}
                    onError={(e) => markFailed(image.id, e.nativeEvent?.error)}
                  />
                ) : (
                  <View style={[styles.thumb, styles.thumbPlaceholder, { borderColor: colors.border }]}>
                    <Text style={{ color: colors.muted, fontSize: 10 }}>
                      {failedIds.has(image.id) ? '⚠' : '…'}
                    </Text>
                  </View>
                )}
              </Pressable>
              {onRemove ? (
                <Pressable
                  onPress={() => onRemove(image)}
                  style={[styles.removeBadge, { backgroundColor: colors.accent }]}
                >
                  <Text style={styles.removeBadgeText}>×</Text>
                </Pressable>
              ) : null}
            </View>
          ))}
        </View>
      )}

      <Modal visible={previewOpen} transparent animationType="fade" onRequestClose={() => setPreviewOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setPreviewOpen(false)}>
          {/* Absorbs taps so scrolling/viewing images inside the card doesn't
              bubble up to the backdrop's dismiss handler. */}
          <Pressable style={[styles.modalCard, { backgroundColor: colors.background }]} onPress={() => {}}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>{label}</Text>

            <View style={styles.imageStage}>
              {images.length > 1 ? (
                <Pressable
                  onPress={() => setModalIndex((i) => (i - 1 + images.length) % images.length)}
                  style={[styles.navButton, styles.navButtonLeft]}
                >
                  <Text style={styles.navButtonText}>‹</Text>
                </Pressable>
              ) : null}

              {current.signedUrl && !failedIds.has(current.id) ? (
                <Image
                  source={{ uri: current.signedUrl }}
                  style={styles.fullImage}
                  resizeMode="contain"
                  onError={(e) => markFailed(current.id, e.nativeEvent?.error)}
                />
              ) : (
                <View style={[styles.fullImage, styles.thumbPlaceholder, { borderWidth: 1, borderColor: colors.border }]}>
                  <Text style={{ color: colors.muted, textAlign: 'center', paddingHorizontal: 16 }}>
                    {failureMessage}
                  </Text>
                </View>
              )}

              {images.length > 1 ? (
                <Pressable
                  onPress={() => setModalIndex((i) => (i + 1) % images.length)}
                  style={[styles.navButton, styles.navButtonRight]}
                >
                  <Text style={styles.navButtonText}>›</Text>
                </Pressable>
              ) : null}
            </View>

            {images.length > 1 ? (
              <Text style={[styles.imageCount, { color: colors.muted }]}>
                {modalIndex + 1} / {images.length}
              </Text>
            ) : null}

            <Pressable
              onPress={() => setPreviewOpen(false)}
              style={[styles.closeButton, { backgroundColor: colors.tint }]}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginVertical: 4,
  },
  viewButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  thumbRow: {
    flexDirection: 'row',
    gap: 8,
  },
  thumbWrap: {
    position: 'relative',
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
    borderWidth: 1,
  },
  thumbPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBadgeText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
    lineHeight: 15,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    borderRadius: 16,
    padding: 16,
    maxHeight: '80%',
    width: '100%',
    maxWidth: 480,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  imageStage: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  fullImage: {
    width: '100%',
    height: 320,
    borderRadius: 8,
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  navButtonLeft: {
    left: 4,
  },
  navButtonRight: {
    right: 4,
  },
  navButtonText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 24,
  },
  imageCount: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 8,
    marginBottom: 4,
  },
  closeButton: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
