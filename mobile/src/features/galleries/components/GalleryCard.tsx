import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { Gallery } from '../../../services/api';

interface Props {
  gallery: Gallery;
  onPress: (g: Gallery) => void;
}

function GalleryCardImpl({ gallery, onPress }: Props) {
  const [imgFailed, setImgFailed] = useState(false);
  const showImg = !!gallery.thumbnail && !imgFailed;

  return (
    <Pressable
      onPress={() => onPress(gallery)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={[styles.thumb, { backgroundColor: gallery.bg }]}>
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
        <View style={styles.countBadge}>
          <Ionicons name="images-outline" size={9} color="#FFFFFF" />
          <Text style={styles.countText}>{gallery.count}</Text>
        </View>
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>{gallery.title}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.time}>{gallery.time}</Text>
          {gallery.views ? (
            <View style={styles.viewsRow}>
              <Ionicons name="eye-outline" size={10} color="#8A8A8A" />
              <Text style={styles.views}>{gallery.views}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const GalleryCard = React.memo(GalleryCardImpl);
export default GalleryCard;

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E2E2',
  },
  pressed: { opacity: 0.8 },
  thumb: {
    position: 'relative',
    aspectRatio: 4 / 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  img: { position: 'absolute', width: '100%', height: '100%' },
  emoji: { fontSize: 32 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  countBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  countText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  body: { padding: 8, gap: 4 },
  title: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1A1A1A',
    lineHeight: 15,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  time: { fontSize: 10, color: '#8A8A8A' },
  viewsRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  views: { fontSize: 10, color: '#8A8A8A' },
});
