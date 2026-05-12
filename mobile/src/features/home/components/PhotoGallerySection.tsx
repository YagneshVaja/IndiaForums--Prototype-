import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  Dimensions,
  StyleSheet,
  type ListRenderItem,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../../store/themeStore';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';
import { useHomeMediaGalleries } from '../hooks/useHomeMediaGalleries';
import LoadingState from '../../../components/ui/LoadingState';
import type { Gallery } from '../../../services/api';

const PREVIEW_COUNT = 6;

const SCREEN_WIDTH = Dimensions.get('window').width;
const SECTION_PAD_H = 14;
const CARD_GAP = 12;
// Two cards visible side-by-side with a peek of the next, so users have an
// obvious "more available" cue without needing the page dots alone to do that
// work. Math: 2 cards + 1 gap + ~28px peek + section padding = screen width.
const CARD_WIDTH = Math.round((SCREEN_WIDTH - SECTION_PAD_H * 2 - CARD_GAP - 28) / 2);
const SNAP_INTERVAL = CARD_WIDTH + CARD_GAP;
const THUMB_HEIGHT = Math.round(CARD_WIDTH * 5 / 4);

interface Props {
  onSeeAll?: () => void;
  onGalleryPress?: (gallery: Gallery) => void;
}

export default function PhotoGallerySection({ onSeeAll, onGalleryPress }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useThemedStyles(makeStyles);
  const { data: galleries = [], isLoading } = useHomeMediaGalleries();

  const visible = useMemo(() => galleries.slice(0, PREVIEW_COUNT), [galleries]);

  const [pageIndex, setPageIndex] = useState(0);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      const next = Math.round(x / SNAP_INTERVAL);
      if (next !== pageIndex) setPageIndex(next);
    },
    [pageIndex],
  );

  const renderItem: ListRenderItem<Gallery> = useCallback(
    ({ item }) => (
      <GalleryCard
        gallery={item}
        styles={styles}
        onPress={onGalleryPress}
      />
    ),
    [styles, onGalleryPress],
  );

  const keyExtractor = useCallback((g: Gallery) => String(g.id), []);

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.accentBar} />
          <View style={styles.titleCol}>
            <Text style={styles.title}>PHOTO GALLERY</Text>
            <Text style={styles.subtitle}>From premieres &amp; events</Text>
          </View>
        </View>
        {onSeeAll ? (
          <Pressable
            onPress={onSeeAll}
            style={({ pressed }) => [
              styles.seeAll,
              pressed && styles.seeAllPressed,
            ]}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="View all photo galleries"
          >
            <Text style={styles.seeAllText}>See All</Text>
            <Ionicons name="chevron-forward" size={13} color={colors.primary} />
          </Pressable>
        ) : null}
      </View>

      {isLoading && visible.length === 0 ? (
        <View style={styles.loadingWrap}>
          <LoadingState height={THUMB_HEIGHT + 90} />
        </View>
      ) : visible.length === 0 ? (
        <Text style={styles.empty}>No galleries yet.</Text>
      ) : (
        <>
          <FlatList
            data={visible}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={SNAP_INTERVAL}
            decelerationRate="fast"
            disableIntervalMomentum
            onScroll={handleScroll}
            scrollEventThrottle={16}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={{ width: CARD_GAP }} />}
          />

          {/* Page indicator dots — same primitive used in TrendingShows so the
              section feels native to the rest of the home tab. */}
          {visible.length > 1 ? (
            <View style={styles.dotsRow}>
              {visible.map((g, i) => (
                <View
                  key={String(g.id)}
                  style={[
                    styles.dot,
                    i === pageIndex ? styles.dotActive : styles.dotInactive,
                  ]}
                />
              ))}
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

interface CardProps {
  gallery: Gallery;
  styles: ReturnType<typeof makeStyles>;
  onPress?: (gallery: Gallery) => void;
}

function GalleryCard({ gallery, styles, onPress }: CardProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => onPress?.(gallery)}
      accessibilityRole="button"
      accessibilityLabel={gallery.title}
    >
      {gallery.thumbnail ? (
        <Image
          source={{ uri: gallery.thumbnail }}
          style={styles.thumb}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={150}
        />
      ) : (
        <View style={[styles.thumb, styles.thumbFallback]}>
          <Text style={styles.thumbEmoji}>{gallery.emoji}</Text>
        </View>
      )}

      {/* Bottom scrim covers ~55% of the card so title + time stay legible
          on bright thumbnails. */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.78)']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.thumbScrim}
        pointerEvents="none"
      />

      {gallery.featured ? (
        <View style={styles.featuredBadge}>
          <Text style={styles.featuredDot}>★</Text>
          <Text style={styles.featuredText}>FEATURED</Text>
        </View>
      ) : null}

      {gallery.count > 0 ? (
        <View style={styles.countBadge}>
          <Ionicons name="images" size={11} color="#FFFFFF" />
          <Text style={styles.countText}>{gallery.count}</Text>
        </View>
      ) : null}

      <View style={styles.captionWrap} pointerEvents="none">
        <Text style={styles.captionTitle} numberOfLines={2}>
          {gallery.title}
        </Text>
        {gallery.time ? (
          <Text style={styles.captionTime} numberOfLines={1}>
            {gallery.time}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    section: {
      backgroundColor: c.card,
      borderTopWidth: 1,
      borderTopColor: c.border,
      paddingVertical: 16,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SECTION_PAD_H,
      paddingBottom: 14,
      gap: 10,
    },
    titleRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: 10,
    },
    accentBar: {
      width: 3.5,
      borderRadius: 2,
      backgroundColor: c.primary,
    },
    titleCol: {
      flex: 1,
      justifyContent: 'center',
    },
    title: {
      fontSize: 13,
      fontWeight: '900',
      color: c.text,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
    },
    subtitle: {
      fontSize: 11,
      fontWeight: '600',
      color: c.textTertiary,
      marginTop: 2,
      letterSpacing: 0.2,
    },
    seeAll: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      paddingVertical: 4,
      paddingHorizontal: 6,
    },
    seeAllPressed: {
      opacity: 0.6,
    },
    seeAllText: {
      fontSize: 12,
      fontWeight: '700',
      color: c.primary,
      letterSpacing: 0.2,
    },
    loadingWrap: {
      paddingHorizontal: SECTION_PAD_H,
    },
    listContent: {
      paddingHorizontal: SECTION_PAD_H,
    },

    card: {
      width: CARD_WIDTH,
      height: THUMB_HEIGHT,
      backgroundColor: c.cardElevated,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowOffset: { width: 0, height: 3 },
      shadowRadius: 8,
      elevation: 3,
    },
    cardPressed: {
      transform: [{ scale: 0.97 }],
      opacity: 0.92,
    },
    thumb: {
      ...StyleSheet.absoluteFillObject,
    },
    thumbFallback: {
      backgroundColor: c.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    thumbEmoji: {
      fontSize: 44,
    },
    thumbScrim: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: '55%',
    },

    countBadge: {
      position: 'absolute',
      top: 8,
      right: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: 'rgba(0,0,0,0.65)',
      borderRadius: 999,
      paddingHorizontal: 8,
      paddingVertical: 4,
    },
    countText: {
      fontSize: 11,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: 0.2,
    },

    featuredBadge: {
      position: 'absolute',
      top: 8,
      left: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: c.warning,
      borderRadius: 4,
      paddingHorizontal: 6,
      paddingVertical: 3,
    },
    featuredDot: {
      fontSize: 9,
      fontWeight: '900',
      color: c.onPrimary,
      lineHeight: 9,
    },
    featuredText: {
      fontSize: 8,
      fontWeight: '900',
      color: c.onPrimary,
      letterSpacing: 0.8,
    },

    captionWrap: {
      position: 'absolute',
      left: 10,
      right: 10,
      bottom: 10,
      gap: 3,
    },
    captionTitle: {
      fontSize: 13,
      fontWeight: '800',
      color: '#FFFFFF',
      lineHeight: 16,
      letterSpacing: -0.2,
      textShadowColor: 'rgba(0,0,0,0.45)',
      textShadowOffset: { width: 0, height: 1 },
      textShadowRadius: 3,
    },
    captionTime: {
      fontSize: 10.5,
      fontWeight: '600',
      color: 'rgba(255,255,255,0.85)',
      letterSpacing: 0.2,
    },

    dotsRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 5,
      marginTop: 14,
    },
    dot: {
      height: 5,
      borderRadius: 3,
    },
    dotActive: {
      width: 18,
      backgroundColor: c.primary,
    },
    dotInactive: {
      width: 5,
      backgroundColor: c.borderStrong,
    },
    empty: {
      fontSize: 12,
      color: c.textTertiary,
      textAlign: 'center',
      paddingVertical: 24,
    },
  });
}
