import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import type { Gallery } from '../../../services/api';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

interface Props {
  gallery: Gallery;
  onPress: (g: Gallery) => void;
}

function GalleryCardImpl({ gallery, onPress }: Props) {
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
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.38)']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0.35 }}
          end={{ x: 0, y: 1 }}
        />
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
              <Ionicons name="eye-outline" size={10} color={colors.textTertiary} />
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

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      flex: 1,
      backgroundColor: c.card,
      borderRadius: 10,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: c.border,
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
    body: { paddingHorizontal: 10, paddingTop: 8, paddingBottom: 10, gap: 4 },
    title: {
      fontSize: 11.5,
      fontWeight: '700',
      color: c.text,
      lineHeight: 15,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    time: { fontSize: 10, color: c.textTertiary },
    viewsRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    views: { fontSize: 10, color: c.textTertiary },
  });
}
