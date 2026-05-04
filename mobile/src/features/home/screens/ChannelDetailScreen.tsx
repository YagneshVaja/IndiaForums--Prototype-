import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Linking,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../../../navigation/types';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import { CHANNELS_DATA } from '../data/channels';
import { useChannelOverview } from '../hooks/useChannelOverview';
import LoadingState from '../../../components/ui/LoadingState';
import ErrorState from '../../../components/ui/ErrorState';
import {
  CHANNEL_AR_ON_AIR,
  CHANNEL_AR_OFF_AIR,
  CHANNEL_AR_ARCHIVED,
  type ChannelArchiveFilter,
  type ChannelOverviewMeta,
  type ChannelOverviewShow,
} from '../../../services/api';

const SHOW_TABS: Array<{ id: ChannelArchiveFilter; label: string }> = [
  { id: CHANNEL_AR_ON_AIR,   label: 'ON AIR'   },
  { id: CHANNEL_AR_OFF_AIR,  label: 'OFF AIR'  },
  { id: CHANNEL_AR_ARCHIVED, label: 'ARCHIVED' },
];

type Props = NativeStackScreenProps<HomeStackParamList, 'ChannelDetail'>;

const CHANNEL_BASE_URL = 'https://www.indiaforums.com/channel/';

// Brand-color accents per channel — drives the gradient hero, sticky tab
// underline, and rank-pill borders. Same palette as Home channels section.
const BRAND_COLOR: Record<number, string> = {
  1:  '#D32F2F',
  4:  '#E65100',
  70: '#C2185B',
  2:  '#5E35B1',
  25: '#F9A825',
};

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_PAD_H = 14;
const GRID_GAP = 10;
const POSTER_CARD_WIDTH = (SCREEN_WIDTH - GRID_PAD_H * 2 - GRID_GAP) / 2;
const POSTER_HEIGHT = Math.round(POSTER_CARD_WIDTH * 9 / 16); // 16:9 to match API thumbnails

// Description gets truncated unless the user expands. ~3 lines fits naturally
// before the toggle becomes useful.
const DESC_PREVIEW_CHARS = 220;

/** Compact 19,300 → "19.3K" formatter for stats chips. */
function formatStat(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

export default function ChannelDetailScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors, insets.top), [colors, insets.top]);

  const [activeId, setActiveId] = useState<number>(route.params.channelId);
  const [activeTab, setActiveTab] = useState<ChannelArchiveFilter>(CHANNEL_AR_ON_AIR);
  const brand = BRAND_COLOR[activeId] ?? colors.primary;

  // Reset tab to ON AIR whenever the user switches channels — keeps the grid
  // landing on the high-signal default rather than persisting a previous
  // ARCHIVED selection through what feels like a fresh navigation.
  const handleChannelSwitch = useCallback((id: number) => {
    setActiveId(id);
    setActiveTab(CHANNEL_AR_ON_AIR);
  }, []);

  const { data, isLoading, isError, refetch } = useChannelOverview(activeId, activeTab);

  const handleShowPress = useCallback(
    (show: ChannelOverviewShow) => {
      navigation.push('ShowDetail', {
        show,
        channelName: data?.channel.channelName,
        channelBrand: brand,
      });
    },
    [navigation, data?.channel.channelName, brand],
  );

  const handleVisitWebsite = useCallback((channel: ChannelOverviewMeta) => {
    Linking.openURL(`${CHANNEL_BASE_URL}${channel.pageUrl}_${channel.channelId}`).catch(
      () => undefined,
    );
  }, []);

  // Sort: on the ON AIR tab, surface ranked shows first (chaska weekly
  // rankings give us a meaningful order). OFF AIR and ARCHIVED have no rank
  // data — every row is `rankCurrentWeek=0` — so alphabetical is friendlier.
  const sortedShows = useMemo<ChannelOverviewShow[]>(() => {
    const shows = data?.shows ?? [];
    if (activeTab !== CHANNEL_AR_ON_AIR) {
      return [...shows].sort((a, b) => a.titleName.localeCompare(b.titleName));
    }
    return [...shows].sort((a, b) => {
      const aRanked = a.rankCurrentWeek > 0;
      const bRanked = b.rankCurrentWeek > 0;
      if (aRanked && !bRanked) return -1;
      if (!aRanked && bRanked) return 1;
      if (aRanked && bRanked) return a.rankCurrentWeek - b.rankCurrentWeek;
      return a.titleName.localeCompare(b.titleName);
    });
  }, [data, activeTab]);

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        {/* ── Gradient hero ─────────────────────────────────────────── */}
        <ChannelHero
          channelId={activeId}
          brand={brand}
          channel={data?.channel ?? null}
          insetsTop={insets.top}
          onBack={() => navigation.goBack()}
          styles={styles}
        />

        {/* ── Sticky channel switcher ───────────────────────────────── */}
        <View style={styles.switcherWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.switcherRow}
          >
            {CHANNELS_DATA.map((c) => {
              const isActive = c.channelId === activeId;
              const cBrand = BRAND_COLOR[c.channelId] ?? colors.primary;
              return (
                <Pressable
                  key={c.channelId}
                  onPress={() => handleChannelSwitch(c.channelId)}
                  style={({ pressed }) => [
                    styles.chip,
                    {
                      borderColor: isActive ? cBrand : colors.border,
                      borderWidth: isActive ? 2.5 : 1,
                    },
                    pressed && styles.chipPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                  accessibilityLabel={c.channelName}
                >
                  <Image
                    source={{ uri: c.logoUrl }}
                    style={styles.chipLogo}
                    contentFit="contain"
                    cachePolicy="memory-disk"
                    transition={120}
                  />
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Body ──────────────────────────────────────────────────── */}
        <View style={styles.body}>
          {isLoading && !data ? (
            <LoadingState height={500} />
          ) : isError && !data ? (
            <ErrorState
              message="Couldn't load this channel."
              onRetry={() => refetch()}
            />
          ) : data ? (
            <>
              {/* Stats chips */}
              <StatsRow channel={data.channel} styles={styles} />

              {/* About description (collapsible) */}
              {data.channel.description ? (
                <AboutBlock description={data.channel.description} styles={styles} />
              ) : null}

              {/* Shows section header */}
              <View style={styles.showsHeaderRow}>
                <Text style={styles.showsHeader}>Shows</Text>
                <Text style={styles.showsCount}>{data.totalCount} total</Text>
              </View>

              {/* Tab strip — ON AIR / OFF AIR / ARCHIVED */}
              <View style={styles.tabStrip}>
                {SHOW_TABS.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <Pressable
                      key={tab.id}
                      onPress={() => setActiveTab(tab.id)}
                      style={({ pressed }) => [
                        styles.tab,
                        isActive
                          ? { backgroundColor: brand }
                          : styles.tabInactive,
                        pressed && !isActive && styles.tabInactivePressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isActive }}
                      accessibilityLabel={tab.label}
                    >
                      <Text
                        style={[
                          styles.tabLabel,
                          isActive ? styles.tabLabelActive : styles.tabLabelInactive,
                        ]}
                      >
                        {tab.label}
                      </Text>
                      {/* Subtle pointer beneath the active tab — borrowed from
                          the live website's tab indicator triangle. */}
                      {isActive ? (
                        <View
                          style={[styles.tabTriangle, { borderTopColor: brand }]}
                          pointerEvents="none"
                        />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>

              {/* Grid (or empty state) */}
              {sortedShows.length === 0 ? (
                <View style={styles.emptyTab}>
                  <Ionicons name="tv-outline" size={32} color={colors.textTertiary} />
                  <Text style={styles.emptyTabText}>
                    {activeTab === CHANNEL_AR_ON_AIR
                      ? 'No shows currently on air.'
                      : activeTab === CHANNEL_AR_OFF_AIR
                        ? 'No recently retired shows.'
                        : 'No archived shows.'}
                  </Text>
                </View>
              ) : (
                <View style={styles.grid}>
                  {sortedShows.map((show) => (
                    <ShowPosterCard
                      key={show.titleId}
                      show={show}
                      brand={brand}
                      styles={styles}
                      onPress={handleShowPress}
                    />
                  ))}
                </View>
              )}

              {/* External link footer */}
              <Pressable
                style={({ pressed }) => [
                  styles.footerLink,
                  pressed && styles.footerLinkPressed,
                ]}
                onPress={() => handleVisitWebsite(data.channel)}
                accessibilityRole="link"
                accessibilityLabel={`Visit ${data.channel.channelName} on indiaforums.com`}
              >
                <Ionicons name="open-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.footerLinkText}>
                  Visit {data.channel.channelName} on indiaforums.com
                </Text>
              </Pressable>
            </>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Hero ────────────────────────────────────────────────────────────────────

interface ChannelHeroProps {
  channelId: number;
  brand: string;
  channel: ChannelOverviewMeta | null;
  insetsTop: number;
  onBack: () => void;
  styles: ReturnType<typeof makeStyles>;
}

function ChannelHero({ channelId, brand, channel, insetsTop, onBack, styles }: ChannelHeroProps) {
  // Fall back to the static home-channels logo while the API is loading so
  // the hero doesn't render with a blank logo plate on first paint.
  const fallback = CHANNELS_DATA.find((c) => c.channelId === channelId);
  const logoUrl = channel?.thumbnailUrl ?? fallback?.logoUrl ?? null;
  const channelName = channel?.channelName ?? fallback?.channelName ?? '';

  return (
    <View>
      <LinearGradient
        colors={[brand, `${brand}CC`, '#0E0F12']}
        locations={[0, 0.55, 1]}
        style={styles.hero}
      >
        <Pressable
          style={[styles.backBtn, { top: insetsTop + 8 }]}
          onPress={onBack}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
        </Pressable>

        <View style={styles.heroContent}>
          {logoUrl ? (
            <View style={styles.heroLogoPlate}>
              <Image
                source={{ uri: logoUrl }}
                style={styles.heroLogo}
                contentFit="contain"
                cachePolicy="memory-disk"
                transition={150}
              />
            </View>
          ) : null}

          <Text style={styles.heroEyebrow}>CHANNEL</Text>
          <Text style={styles.heroTitle} numberOfLines={1}>
            {channelName}
          </Text>
        </View>
      </LinearGradient>
    </View>
  );
}

// ─── Stats row ───────────────────────────────────────────────────────────────

function StatsRow({
  channel,
  styles,
}: {
  channel: ChannelOverviewMeta;
  styles: ReturnType<typeof makeStyles>;
}) {
  // Hide stats with zero counts; some channels don't track everything.
  const stats = [
    { label: 'Articles', value: channel.articleCount },
    { label: 'Videos',   value: channel.videoCount },
    { label: 'Topics',   value: channel.topicCount },
    { label: 'Fan Fics', value: channel.ffCount },
  ].filter((s) => s.value > 0);

  if (stats.length === 0) return null;

  return (
    <View style={styles.statsRow}>
      {stats.map((s, i) => (
        <View key={s.label} style={styles.statCol}>
          <Text style={styles.statValue}>{formatStat(s.value)}</Text>
          <Text style={styles.statLabel}>{s.label.toUpperCase()}</Text>
          {i < stats.length - 1 ? <View style={styles.statDivider} /> : null}
        </View>
      ))}
    </View>
  );
}

// ─── About description (collapsible) ────────────────────────────────────────

function AboutBlock({
  description,
  styles,
}: {
  description: string;
  styles: ReturnType<typeof makeStyles>;
}) {
  const [expanded, setExpanded] = useState(false);
  const cleaned = description.replace(/\r\n/g, '\n').trim();
  const isLong = cleaned.length > DESC_PREVIEW_CHARS;
  const visible =
    expanded || !isLong ? cleaned : cleaned.slice(0, DESC_PREVIEW_CHARS).trim() + '…';

  return (
    <View style={styles.aboutBlock}>
      <Text style={styles.aboutLabel}>ABOUT</Text>
      <Text style={styles.aboutText}>{visible}</Text>
      {isLong ? (
        <Pressable onPress={() => setExpanded((x) => !x)} hitSlop={6}>
          <Text style={styles.aboutToggle}>{expanded ? 'Show less' : 'Read more'}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// ─── Show poster card ───────────────────────────────────────────────────────

interface PosterProps {
  show: ChannelOverviewShow;
  brand: string;
  styles: ReturnType<typeof makeStyles>;
  onPress: (s: ChannelOverviewShow) => void;
}

function ShowPosterCard({ show, brand, styles, onPress }: PosterProps) {
  const isRanked = show.rankCurrentWeek > 0;
  return (
    <Pressable
      style={({ pressed }) => [
        styles.posterCard,
        show.archive && styles.posterCardArchived,
        pressed && styles.posterCardPressed,
      ]}
      onPress={() => onPress(show)}
      accessibilityRole="button"
      accessibilityLabel={show.titleName}
    >
      <View style={styles.posterWrap}>
        {show.posterUrl ? (
          <Image
            source={{ uri: show.posterUrl }}
            style={styles.poster}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={150}
          />
        ) : (
          <View style={[styles.poster, styles.posterFallback]}>
            <Ionicons name="tv" size={32} color="rgba(255,255,255,0.4)" />
          </View>
        )}

        {isRanked ? (
          <View style={[styles.rankPill, { backgroundColor: brand }]}>
            <Text style={styles.rankPillText}>#{show.rankCurrentWeek}</Text>
          </View>
        ) : null}

        {show.archive ? (
          <View style={styles.archivePill}>
            <Text style={styles.archivePillText}>OFF AIR</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.posterTitle} numberOfLines={2}>{show.titleName}</Text>
    </Pressable>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

function makeStyles(c: ThemeColors, topInset: number) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.bg,
    },

    // Hero
    hero: {
      paddingTop: topInset + 56,
      paddingBottom: 32,
      paddingHorizontal: 20,
    },
    backBtn: {
      position: 'absolute',
      left: 12,
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: 'rgba(0,0,0,0.32)',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10,
    },
    heroContent: {
      alignItems: 'center',
      gap: 10,
    },
    heroLogoPlate: {
      width: 120,
      height: 72,
      borderRadius: 14,
      backgroundColor: '#FFFFFF',
      paddingHorizontal: 16,
      paddingVertical: 10,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.18,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 12,
      elevation: 4,
    },
    heroLogo: {
      width: '100%',
      height: '100%',
    },
    heroEyebrow: {
      marginTop: 6,
      fontSize: 10,
      fontWeight: '800',
      color: 'rgba(255,255,255,0.85)',
      letterSpacing: 1.6,
    },
    heroTitle: {
      fontSize: 32,
      fontWeight: '900',
      color: '#FFFFFF',
      letterSpacing: -1,
    },

    // Sticky channel switcher
    switcherWrap: {
      backgroundColor: c.bg,
      paddingTop: 14,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    switcherRow: {
      paddingHorizontal: 14,
      gap: 10,
      alignItems: 'center',
    },
    chip: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: '#FFFFFF',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 8,
      paddingVertical: 6,
    },
    chipPressed: {
      opacity: 0.85,
    },
    chipLogo: {
      width: '100%',
      height: '100%',
    },

    // Body
    body: {
      paddingHorizontal: GRID_PAD_H,
      paddingTop: 18,
      gap: 16,
    },

    // Stats row — divides into N evenly-spaced columns with subtle dividers.
    statsRow: {
      flexDirection: 'row',
      backgroundColor: c.cardElevated,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      paddingVertical: 14,
    },
    statCol: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
      position: 'relative',
    },
    statValue: {
      fontSize: 18,
      fontWeight: '900',
      color: c.text,
      letterSpacing: -0.4,
      fontVariant: ['tabular-nums'],
    },
    statLabel: {
      fontSize: 9.5,
      fontWeight: '800',
      color: c.textTertiary,
      letterSpacing: 1,
    },
    statDivider: {
      position: 'absolute',
      right: 0,
      top: 6,
      bottom: 6,
      width: 1,
      backgroundColor: c.border,
    },

    // About
    aboutBlock: {
      backgroundColor: c.cardElevated,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      padding: 14,
      gap: 8,
    },
    aboutLabel: {
      fontSize: 10,
      fontWeight: '900',
      color: c.textTertiary,
      letterSpacing: 1.4,
    },
    aboutText: {
      fontSize: 13,
      color: c.text,
      lineHeight: 19,
      letterSpacing: -0.1,
    },
    aboutToggle: {
      fontSize: 12,
      fontWeight: '800',
      color: c.primary,
      letterSpacing: 0.2,
      marginTop: 2,
    },

    // Shows section
    showsHeaderRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      marginTop: 4,
      marginBottom: 4,
    },
    showsHeader: {
      fontSize: 18,
      fontWeight: '900',
      color: c.text,
      letterSpacing: -0.5,
    },
    showsCount: {
      fontSize: 11,
      fontWeight: '800',
      color: c.textTertiary,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },

    // Tab strip — segmented pills, active = brand-color filled with a small
    // downward triangle pointer (mirrors the live website's tab indicator).
    tabStrip: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 4,
    },
    tab: {
      flex: 1,
      borderRadius: 10,
      paddingVertical: 11,
      paddingHorizontal: 6,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    tabInactive: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    tabInactivePressed: {
      backgroundColor: c.cardElevated,
    },
    tabLabel: {
      fontSize: 11,
      fontWeight: '900',
      letterSpacing: 1,
    },
    tabLabelActive: {
      color: '#FFFFFF',
    },
    tabLabelInactive: {
      color: c.textSecondary,
    },
    // Pure-CSS downward triangle via mismatched borders.
    tabTriangle: {
      position: 'absolute',
      bottom: -6,
      left: '50%',
      marginLeft: -6,
      width: 0,
      height: 0,
      borderLeftWidth: 6,
      borderRightWidth: 6,
      borderTopWidth: 6,
      borderLeftColor: 'transparent',
      borderRightColor: 'transparent',
    },

    emptyTab: {
      paddingVertical: 36,
      alignItems: 'center',
      gap: 10,
    },
    emptyTabText: {
      fontSize: 13,
      fontWeight: '600',
      color: c.textTertiary,
      letterSpacing: 0.2,
    },

    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: GRID_GAP,
    },
    posterCard: {
      width: POSTER_CARD_WIDTH,
      backgroundColor: c.cardElevated,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOpacity: 0.06,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 4,
      elevation: 2,
    },
    posterCardArchived: {
      opacity: 0.65,
    },
    posterCardPressed: {
      transform: [{ scale: 0.98 }],
      opacity: 0.92,
    },
    posterWrap: {
      width: '100%',
      height: POSTER_HEIGHT,
      backgroundColor: c.surface,
      position: 'relative',
    },
    poster: {
      width: '100%',
      height: '100%',
    },
    posterFallback: {
      backgroundColor: c.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rankPill: {
      position: 'absolute',
      top: 8,
      left: 8,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      shadowColor: '#000',
      shadowOpacity: 0.3,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 3,
      elevation: 3,
    },
    rankPillText: {
      fontSize: 11,
      fontWeight: '900',
      color: '#FFFFFF',
      letterSpacing: 0.3,
      fontVariant: ['tabular-nums'],
    },
    archivePill: {
      position: 'absolute',
      top: 8,
      right: 8,
      paddingHorizontal: 7,
      paddingVertical: 2.5,
      borderRadius: 5,
      backgroundColor: 'rgba(0,0,0,0.7)',
    },
    archivePillText: {
      fontSize: 8.5,
      fontWeight: '900',
      color: '#FFFFFF',
      letterSpacing: 0.7,
    },
    posterTitle: {
      fontSize: 12.5,
      fontWeight: '700',
      color: c.text,
      letterSpacing: -0.2,
      lineHeight: 16,
      paddingHorizontal: 10,
      paddingTop: 8,
      paddingBottom: 10,
      minHeight: 50,
    },

    // External link footer
    footerLink: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 14,
      marginTop: 8,
    },
    footerLinkPressed: {
      opacity: 0.6,
    },
    footerLinkText: {
      fontSize: 12,
      fontWeight: '700',
      color: c.textSecondary,
    },
  });
}
