import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import type { Gallery } from '../../../services/api';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

interface Props {
  gallery: Gallery;
  onPress: (g: Gallery) => void;
}

function RelatedGalleryCardImpl({ gallery, onPress }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
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
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{gallery.count}</Text>
        </View>
      </View>
      <Text style={styles.title} numberOfLines={2}>{gallery.title}</Text>
    </Pressable>
  );
}

const RelatedGalleryCard = React.memo(RelatedGalleryCardImpl);
export default RelatedGalleryCard;

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: { width: 120 },
    pressed: { opacity: 0.8 },
    thumb: {
      position: 'relative',
      width: 120,
      height: 80,
      borderRadius: 10,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 6,
      borderWidth: 1,
      borderColor: c.border,
    },
    img: { position: 'absolute', width: '100%', height: '100%' },
    emoji: { fontSize: 24 },
    countBadge: {
      position: 'absolute',
      bottom: 5,
      right: 5,
      backgroundColor: 'rgba(0,0,0,0.55)',
      paddingHorizontal: 5,
      paddingVertical: 2,
      borderRadius: 4,
    },
    countText: { color: '#FFFFFF', fontSize: 8, fontWeight: '700' },
    title: {
      fontSize: 10.5,
      fontWeight: '600',
      color: c.text,
      lineHeight: 14,
    },
  });
}
