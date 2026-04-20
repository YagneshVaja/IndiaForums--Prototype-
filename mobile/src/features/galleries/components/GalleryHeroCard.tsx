import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { Gallery } from '../../../services/api';

interface Props {
  gallery: Gallery;
  catLabel?: string | null;
  onPress: (g: Gallery) => void;
}

export default function GalleryHeroCard({ gallery, catLabel, onPress }: Props) {
  const [imgFailed, setImgFailed] = useState(false);
  const showImg = !!gallery.thumbnail && !imgFailed;

  return (
    <Pressable
      onPress={() => onPress(gallery)}
      style={({ pressed }) => [styles.hero, { backgroundColor: gallery.bg }, pressed && styles.pressed]}
    >
      {showImg ? (
        <Image
          source={{ uri: gallery.thumbnail! }}
          style={styles.img}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={150}
          onError={() => setImgFailed(true)}
        />
      ) : (
        <Text style={styles.emoji}>{gallery.emoji}</Text>
      )}
      <View style={styles.overlay} />
      <View style={styles.meta}>
        {catLabel ? <Text style={styles.cat}>{catLabel.toUpperCase()}</Text> : null}
        <Text style={styles.title} numberOfLines={2}>{gallery.title}</Text>
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="images-outline" size={11} color="rgba(255,255,255,0.82)" />
            <Text style={styles.metaText}>{gallery.count} photos</Text>
          </View>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.time}>{gallery.time}</Text>
        </View>
      </View>
      <View style={styles.viewBtn}>
        <Text style={styles.viewBtnText}>View Gallery</Text>
        <Ionicons name="arrow-forward" size={12} color="#FFFFFF" />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: {
    position: 'relative',
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 12,
    marginBottom: 14,
  },
  pressed: { opacity: 0.92 },
  img: { position: 'absolute', width: '100%', height: '100%' },
  emoji: { fontSize: 64 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  meta: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 44,
  },
  cat: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
    color: '#FFD1D1',
    marginBottom: 5,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 19,
    marginBottom: 6,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.82)' },
  dot: { color: 'rgba(255,255,255,0.4)' },
  time: { fontSize: 11, color: 'rgba(255,255,255,0.62)' },
  viewBtn: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  viewBtnText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
});
