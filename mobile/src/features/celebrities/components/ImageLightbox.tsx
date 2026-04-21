import React, { useState, useCallback } from 'react';
import { Modal, View, Text, Pressable, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import type { BioImage } from '../utils/parseBioHtml';

interface Props {
  images: BioImage[];
  startIndex: number;
  onClose: () => void;
}

export default function ImageLightbox({ images, startIndex, onClose }: Props) {
  const [index, setIndex] = useState(startIndex);
  const img = images[index];
  const hasMultiple = images.length > 1;

  const goPrev = useCallback(
    () => setIndex((i) => (i - 1 + images.length) % images.length),
    [images.length],
  );
  const goNext = useCallback(
    () => setIndex((i) => (i + 1) % images.length),
    [images.length],
  );

  if (!img) return null;
  const { width, height } = Dimensions.get('window');

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.content} onPress={(e) => e.stopPropagation?.()}>
          <Image
            source={{ uri: img.src }}
            style={{ width: width * 0.92, height: height * 0.7, borderRadius: 8 }}
            contentFit="contain"
            cachePolicy="memory-disk"
            transition={150}
          />

          <Pressable style={styles.close} onPress={onClose} hitSlop={12}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>

          {hasMultiple && (
            <View style={styles.counter}>
              <Text style={styles.counterText}>{index + 1} / {images.length}</Text>
            </View>
          )}

          {!!img.alt && (
            <View style={styles.captionWrap}>
              <Text style={styles.caption}>{img.alt}</Text>
            </View>
          )}

          {hasMultiple && (
            <>
              <Pressable style={[styles.zone, styles.zoneLeft]} onPress={goPrev}>
                <Text style={styles.arrow}>‹</Text>
              </Pressable>
              <Pressable style={[styles.zone, styles.zoneRight]} onPress={goNext}>
                <Text style={styles.arrow}>›</Text>
              </Pressable>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { alignItems: 'center', justifyContent: 'center' },
  close: {
    position: 'absolute',
    top: -40,
    right: 10,
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  closeText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  counter: {
    position: 'absolute',
    top: -40, left: 10,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  counterText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  captionWrap: {
    position: 'absolute',
    bottom: -46,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    maxWidth: '90%',
  },
  caption: { color: '#FFFFFF', fontSize: 12, textAlign: 'center' },
  zone: {
    position: 'absolute',
    top: 0, bottom: 0,
    width: '25%',
    alignItems: 'center', justifyContent: 'center',
  },
  zoneLeft:  { left: 0 },
  zoneRight: { right: 0 },
  arrow: { color: '#FFFFFF', fontSize: 48, fontWeight: '300', opacity: 0.6 },
});
