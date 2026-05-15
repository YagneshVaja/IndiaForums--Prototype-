import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { Gallery } from '../../../services/api';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';
import RailHeader from './RailHeader';

interface Props {
  galleries: Gallery[];
  onGalleryPress?: (gallery: Gallery) => void;
  onSeeAll?: () => void;
}

function NewsGallerySectionImpl({ galleries, onGalleryPress, onSeeAll }: Props) {
  const styles = useThemedStyles(makeStyles);

  if (galleries.length === 0) return null;

  return (
    <View style={styles.section}>
      <RailHeader icon="images-outline" title="Photo Galleries" onSeeAll={onSeeAll} />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {galleries.slice(0, 4).map((g) => (
          <Pressable
            key={String(g.id)}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            onPress={() => onGalleryPress?.(g)}
          >
            <View style={styles.thumb}>
              {g.thumbnail ? (
                <Image
                  source={{ uri: g.thumbnail }}
                  style={styles.thumbImg}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                />
              ) : (
                <View style={[styles.thumbImg, styles.thumbFallback]}>
                  <Text style={styles.fallbackEmoji}>{g.emoji}</Text>
                </View>
              )}
              <View style={styles.countBadge}>
                <Ionicons name="images" size={9} color="#fff" />
                <Text style={styles.countText}>{g.count}</Text>
              </View>
            </View>
            <Text style={styles.cardTitle} numberOfLines={2}>{g.title}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const NewsGallerySection = React.memo(NewsGallerySectionImpl);
export default NewsGallerySection;

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    section: {
      paddingVertical: 14,
      backgroundColor: c.card,
      borderTopWidth: 1,
      borderTopColor: c.border,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      marginVertical: 4,
    },
    scroll: { paddingHorizontal: 14, gap: 12 },
    card: { width: 130 },
    cardPressed: { opacity: 0.85 },
    thumb: {
      width: 130,
      height: 90,
      borderRadius: 10,
      overflow: 'hidden',
      backgroundColor: c.surface,
      marginBottom: 7,
      position: 'relative',
    },
    thumbImg: { width: '100%', height: '100%' },
    thumbFallback: {
      backgroundColor: c.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fallbackEmoji: { fontSize: 28 },
    countBadge: {
      position: 'absolute',
      bottom: 6,
      right: 6,
      backgroundColor: 'rgba(0,0,0,0.65)',
      paddingHorizontal: 6,
      paddingVertical: 3,
      borderRadius: 4,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    countText: { fontSize: 9.5, fontWeight: '700', color: '#fff' },
    cardTitle: { fontSize: 11.5, fontWeight: '700', color: c.text, lineHeight: 16 },
  });
}
