import React, { useMemo, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ViewToken,
} from 'react-native';
import { Image } from 'expo-image';
import type { Banner } from '../../../services/api';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

const CARD_W = 280;
const CARD_H = 180;
const CARD_GAP = 12;
const SIDE_PAD = 14; // matches --content-px

interface Props {
  banners: Banner[];
  onPress: (banner: Banner) => void;
}

const BannerCard = React.memo(function BannerCard({ banner, onPress, styles }: { banner: Banner; onPress: (b: Banner) => void; styles: ReturnType<typeof makeStyles> }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => onPress(banner)}
      accessibilityRole="button"
      accessibilityLabel={banner.title}
    >
      {/* Background / image */}
      {banner.imageUrl ? (
        <Image
          source={{ uri: banner.imageUrl }}
          style={styles.bg}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={150}
        />
      ) : (
        <View style={[styles.bg, styles.bgFallback]}>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <Text style={styles.bgEmoji}>{(banner as any).emoji ?? '📰'}</Text>
        </View>
      )}

      {/* Dark scrim: two-layer gradient approximation */}
      <View style={styles.scrimTop} />
      <View style={styles.scrimBottom} />

      {/* Content pinned above scrim */}
      <View style={styles.content}>
        {banner.category ? (
          <View style={styles.tag}>
            <Text style={styles.tagText}>{banner.category.toUpperCase()}</Text>
          </View>
        ) : null}
        <Text style={styles.title} numberOfLines={2}>{banner.title}</Text>
        {(banner.source || banner.timeAgo) ? (
          <View style={styles.meta}>
            {banner.source ? <Text style={styles.source}>{banner.source}</Text> : null}
            {banner.source && banner.timeAgo ? <View style={styles.dotSep} /> : null}
            {banner.timeAgo ? <Text style={styles.time}>{banner.timeAgo}</Text> : null}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
});

export default function FeaturedBannerCarousel({ banners, onPress }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

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
    ({ item }: { item: Banner }) => <BannerCard banner={item} onPress={onPress} styles={styles} />,
    [onPress, styles],
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

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    section: {
      paddingLeft: SIDE_PAD,
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
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 8,
      backgroundColor: c.surface,
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
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bgEmoji: {
      fontSize: 56,
    },
    scrimTop: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.12)',
    },
    scrimBottom: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 110,
      backgroundColor: 'rgba(0,0,0,0.62)',
      borderBottomLeftRadius: 20,
      borderBottomRightRadius: 20,
    },
    content: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      padding: 16,
      zIndex: 2,
    },
    tag: {
      alignSelf: 'flex-start',
      backgroundColor: c.primary,
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
      lineHeight: 21,
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
      color: 'rgba(255,255,255,0.75)',
    },
    dotSep: {
      width: 3,
      height: 3,
      borderRadius: 2,
      backgroundColor: 'rgba(255,255,255,0.4)',
    },
    time: {
      fontSize: 10,
      color: 'rgba(255,255,255,0.65)',
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
      backgroundColor: c.primary,
    },
    dotInactive: {
      width: 5,
      backgroundColor: c.border,
    },
    empty: { height: 8 },
  });
}
