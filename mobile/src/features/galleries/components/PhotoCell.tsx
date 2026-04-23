import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { GalleryPhoto } from '../../../services/api';

interface Props {
  photo: GalleryPhoto;
  index: number;
  isFeatured: boolean;
  onPress: (index: number) => void;
}

function PhotoCellImpl({ photo, index, isFeatured, onPress }: Props) {
  const [imgFailed, setImgFailed] = useState(false);
  const showImg = !!photo.imageUrl && !imgFailed;

  return (
    <Pressable
      onPress={() => onPress(index)}
      style={({ pressed }) => [
        styles.cell,
        isFeatured && styles.featured,
        { backgroundColor: photo.bg },
        pressed && styles.pressed,
      ]}
    >
      {showImg ? (
        <Image
          source={{ uri: photo.imageUrl! }}
          style={styles.img}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={120}
          onError={() => setImgFailed(true)}
        />
      ) : (
        <Text style={[styles.emoji, isFeatured && styles.emojiFeatured]}>
          {photo.emoji}
        </Text>
      )}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.35)']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0.4 }}
        end={{ x: 0, y: 1 }}
      />
      <Text style={styles.num}>{index + 1}</Text>
      {photo.tags.length > 0 ? (
        <View style={styles.tagBadge}>
          <Ionicons name="person" size={8} color="#FFFFFF" />
          <Text style={styles.tagText}>{photo.tags.length}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const PhotoCell = React.memo(PhotoCellImpl);
export default PhotoCell;

const styles = StyleSheet.create({
  cell: {
    flex: 1,
    overflow: 'hidden',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featured: {
    borderRadius: 8,
  },
  pressed: { opacity: 0.85 },
  img: { position: 'absolute', width: '100%', height: '100%' },
  emoji: { fontSize: 26 },
  emojiFeatured: { fontSize: 44 },
  num: {
    position: 'absolute',
    bottom: 4,
    right: 5,
    fontSize: 9,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
  },
  tagBadge: {
    position: 'absolute',
    top: 5,
    left: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(53,88,240,0.85)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
  },
  tagText: { color: '#FFFFFF', fontSize: 9, fontWeight: '700' },
});
