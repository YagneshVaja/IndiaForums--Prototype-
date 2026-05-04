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
import { useThemeStore } from '../../../store/themeStore';
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
  const styles = useMemo(() => makeStyles(colors), [colors]);
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
        colors={colors}
        onPress={onGalleryPress}
      />
    ),
    [styles, colors, onGalleryPress],
  );

  const keyExtractor = useCallback((g: Gallery) => String(g.id), []);

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.accentBar} />
          <Text style={styles.title}>Photo Gallery</Text>
        </View>
        {onSeeAll ? (
          <Pressable
            style={({ pressed }) => [styles.viewAllPill, pressed && styles.viewAllPillPressed]}
            onPress={onSeeAll}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="View all photo galleries"
          >
            <Text style={styles.viewAllText}>VIEW ALL</Text>
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
  colors: ThemeColors;
  onPress?: (gallery: Gallery) => void;
}

function GalleryCard({ gallery, styles, colors, onPress }: CardProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => onPress?.(gallery)}
      accessibilityRole="button"
      accessibilityLabel={gallery.title}
    >
      <View style={styles.thumbWrap}>
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

        {/* Soft scrim — keeps the count badge readable on light/varied images. */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.55)']}
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
            <View style={styles.cameraIcon}>
              <View style={styles.cameraBody} />
              <View style={styles.cameraLens} />
            </View>
            <Text style={styles.countText}>{gallery.count}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.cardTitle} numberOfLines={3}>{gallery.title}</Text>

        <View style={styles.metaRow}>
          {gallery.time ? (
            <View style={styles.timeRow}>
              <View style={styles.clockIcon}>
                <View style={[styles.clockOuter, { borderColor: colors.textTertiary }]} />
                <View style={[styles.clockHand, { backgroundColor: colors.textTertiary }]} />
              </View>
              <Text style={styles.cardTime}>{gallery.time}</Text>
            </View>
          ) : (
            <View />
          )}
          {gallery.views ? (
            <View style={styles.viewsRow}>
              <View style={[styles.eyeIcon, { borderColor: colors.textTertiary }]} />
              <Text style={styles.viewsText}>{gallery.views}</Text>
            </View>
          ) : null}
        </View>
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
      justifyContent: 'space-between',
      paddingHorizontal: SECTION_PAD_H,
      paddingBottom: 14,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    accentBar: {
      width: 3.5,
      height: 18,
      borderRadius: 2,
      backgroundColor: c.primary,
    },
    title: {
      fontSize: 13,
      fontWeight: '900',
      color: c.text,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
    },
    viewAllPill: {
      backgroundColor: c.primary,
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 7,
    },
    viewAllPillPressed: {
      opacity: 0.85,
    },
    viewAllText: {
      fontSize: 11,
      fontWeight: '900',
      color: c.onPrimary,
      letterSpacing: 1,
    },
    loadingWrap: {
      paddingHorizontal: SECTION_PAD_H,
    },
    listContent: {
      paddingHorizontal: SECTION_PAD_H,
    },

    card: {
      width: CARD_WIDTH,
      backgroundColor: c.cardElevated,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 6,
      elevation: 2,
    },
    cardPressed: {
      transform: [{ scale: 0.97 }],
      opacity: 0.92,
    },
    thumbWrap: {
      width: '100%',
      height: THUMB_HEIGHT,
      backgroundColor: c.surface,
      position: 'relative',
    },
    thumb: {
      width: '100%',
      height: '100%',
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
      height: 70,
    },

    countBadge: {
      position: 'absolute',
      bottom: 8,
      right: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: c.primary,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5,
      shadowColor: '#000',
      shadowOpacity: 0.35,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 4,
      elevation: 3,
    },
    countText: {
      fontSize: 11,
      fontWeight: '900',
      color: c.onPrimary,
      letterSpacing: 0.2,
    },
    cameraIcon: {
      width: 11,
      height: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cameraBody: {
      position: 'absolute',
      width: 11,
      height: 8,
      borderRadius: 1.5,
      backgroundColor: c.onPrimary,
    },
    cameraLens: {
      position: 'absolute',
      width: 4,
      height: 4,
      borderRadius: 2,
      backgroundColor: c.primary,
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
      shadowColor: '#000',
      shadowOpacity: 0.25,
      shadowOffset: { width: 0, height: 1 },
      shadowRadius: 2,
      elevation: 2,
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

    cardBody: {
      paddingHorizontal: 12,
      paddingTop: 10,
      paddingBottom: 12,
      gap: 8,
      minHeight: 70,
    },
    cardTitle: {
      fontSize: 12.5,
      fontWeight: '700',
      color: c.text,
      lineHeight: 17,
      letterSpacing: -0.1,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    timeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    clockIcon: {
      width: 11,
      height: 11,
      alignItems: 'center',
      justifyContent: 'center',
    },
    clockOuter: {
      position: 'absolute',
      width: 9,
      height: 9,
      borderRadius: 5,
      borderWidth: 1.1,
    },
    clockHand: {
      position: 'absolute',
      width: 1.1,
      height: 3,
      top: 2,
      left: 4.5,
      borderRadius: 1,
    },
    cardTime: {
      fontSize: 10,
      fontWeight: '600',
      color: c.textTertiary,
    },
    viewsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    eyeIcon: {
      width: 10,
      height: 6,
      borderWidth: 1.1,
      borderRadius: 4,
    },
    viewsText: {
      fontSize: 10,
      fontWeight: '700',
      color: c.textTertiary,
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
