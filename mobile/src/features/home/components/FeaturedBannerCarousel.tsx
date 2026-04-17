import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  FlatList,
  Pressable,
  StyleSheet,
  Dimensions,
  ViewToken,
} from 'react-native';
import type { Banner } from '../../../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_W = 280;
const CARD_H = 180;
const CARD_GAP = 12;
const SIDE_PAD = 14; // matches --content-px

interface Props {
  banners: Banner[];
  onPress: (banner: Banner) => void;
}

function BannerCard({ banner, onPress }: { banner: Banner; onPress: (b: Banner) => void }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => onPress(banner)}
      accessibilityRole="button"
      accessibilityLabel={banner.title}
    >
      {/* Background / image */}
      {banner.imageUrl ? (
        <Image source={{ uri: banner.imageUrl }} style={styles.bg} resizeMode="cover" />
      ) : (
        <View style={[styles.bg, styles.bgFallback]} />
      )}

      {/* Gradient overlay */}
      <View style={styles.overlay} />

      {/* Content */}
      <View style={styles.content}>
        {banner.category ? (
          <View style={[styles.tag, { backgroundColor: '#3558F0' }]}>
            <Text style={styles.tagText}>{banner.category.toUpperCase()}</Text>
          </View>
        ) : null}
        <Text style={styles.title} numberOfLines={2}>{banner.title}</Text>
        {(banner.source || banner.timeAgo) ? (
          <View style={styles.meta}>
            {banner.source ? <Text style={styles.source}>{banner.source}</Text> : null}
            {banner.source && banner.timeAgo ? <View style={styles.dot} /> : null}
            {banner.timeAgo ? <Text style={styles.time}>{banner.timeAgo}</Text> : null}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

export default function FeaturedBannerCarousel({ banners, onPress }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems[0];
      if (first?.isViewable && first.index !== null && first.index !== undefined) {
        setActiveIndex(first.index);
      }
    },
  ).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;
  const keyExtractor = useCallback((item: Banner) => item.id, []);
  const renderItem = useCallback(
    ({ item }: { item: Banner }) => <BannerCard banner={item} onPress={onPress} />,
    [onPress],
  );

  if (banners.length === 0) return <View style={styles.empty} />;

  return (
    <View style={styles.section}>
      <FlatList
        data={banners}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={CARD_W + CARD_GAP}
        snapToAlignment="start"
        decelerationRate="fast"
        bounces={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        contentContainerStyle={styles.track}
        style={styles.list}
      />
      {/* Dots */}
      {banners.length > 1 && (
        <View style={styles.dotsRow}>
          {banners.map((_, i) => (
            <View
              key={i}
              style={[styles.dot2, i === activeIndex ? styles.dotActive : styles.dotInactive]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: SIDE_PAD,
    marginBottom: 4,
  },
  list: {
    overflow: 'visible',
  },
  track: {
    gap: CARD_GAP,
    paddingRight: SIDE_PAD,
  },
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
    backgroundColor: '#D0D5E8',
  },
  cardPressed: {
    transform: [{ scale: 0.97 }],
  },
  bg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  bgFallback: {
    backgroundColor: '#C8D0EC',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // Gradient simulation: transparent top → dark bottom
    backgroundColor: 'transparent',
    // Use multiple layers to approximate gradient
  },
  content: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    // Dark gradient from bottom
    backgroundColor: 'rgba(0,0,0,0)',
  },
  tag: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 6,
  },
  tagText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  source: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  time: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 10,
    gap: 5,
  },
  dot2: {
    height: 5,
    borderRadius: 3,
  },
  dotActive: {
    width: 16,
    backgroundColor: '#3558F0',
  },
  dotInactive: {
    width: 5,
    backgroundColor: '#C8CFEA',
  },
  empty: { height: 8 },
});
