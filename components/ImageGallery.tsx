import { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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

  if (images.length === 0) return null;

  return (
    <View style={styles.wrap}>
      {variant === 'button' ? (
        <Pressable
          onPress={() => setPreviewOpen(true)}
          style={[styles.viewButton, { borderColor: colors.border, backgroundColor: colors.card }]}
        >
          <Text style={{ color: colors.tint, fontWeight: '600' }}>
            View {label} ({images.length})
          </Text>
        </Pressable>
      ) : (
        <View style={styles.thumbRow}>
          {images.map((image) => (
            <View key={image.id} style={styles.thumbWrap}>
              <Pressable onPress={() => setPreviewOpen(true)}>
                {image.signedUrl ? (
                  <Image source={{ uri: image.signedUrl }} style={[styles.thumb, { borderColor: colors.border }]} />
                ) : (
                  <View style={[styles.thumb, styles.thumbPlaceholder, { borderColor: colors.border }]}>
                    <Text style={{ color: colors.muted, fontSize: 10 }}>…</Text>
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
            <ScrollView>
              {images.map((image) =>
                image.signedUrl ? (
                  <Image key={image.id} source={{ uri: image.signedUrl }} style={styles.fullImage} resizeMode="contain" />
                ) : null
              )}
            </ScrollView>
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
  fullImage: {
    width: '100%',
    height: 320,
    marginBottom: 12,
    borderRadius: 8,
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
