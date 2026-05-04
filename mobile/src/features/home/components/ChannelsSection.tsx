import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Linking,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import type { HomeStackParamList } from '../../../navigation/types';
import { CHANNELS_DATA, type Channel, type ChannelShow } from '../data/channels';

type NavigationProp = NativeStackNavigationProp<HomeStackParamList>;

const SHOW_BASE_URL = 'https://www.indiaforums.com/forum/';

// Brand-color accents per channel — same palette as the detail screen, used
// for the active tab's brand indicator and the "See full ranking" CTA.
const BRAND_COLOR: Record<number, string> = {
  1:  '#D32F2F', // Star Plus
  4:  '#E65100', // Zee TV
  70: '#C2185B', // Colors
  2:  '#5E35B1', // Sony TV
  25: '#F9A825', // Sony SAB
};

const RANK_GLYPH = ['❶', '❷', '❸'] as const;
// Olympic-podium tints — applied to the leading show's rank glyph for the
// "winner" feel without needing to color the whole card.
const PODIUM = ['#F5C518', '#C0C0C0', '#CD7F32'] as const;

const PREVIEW_COUNT = 3;

interface Props {
  /** Optional override for tap-show — falls back to opening the forum URL externally. */
  onShowPress?: (show: ChannelShow) => void;
}

export default function ChannelsSection({ onShowPress }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<NavigationProp>();

  const [activeId, setActiveId] = useState<number>(CHANNELS_DATA[0].channelId);
  const activeChannel = useMemo(
    () => CHANNELS_DATA.find((c) => c.channelId === activeId) ?? CHANNELS_DATA[0],
    [activeId],
  );
  const brand = BRAND_COLOR[activeChannel.channelId] ?? colors.primary;
  const previewShows = useMemo(
    () => activeChannel.shows.slice(0, PREVIEW_COUNT),
    [activeChannel],
  );

  const handleShowPress = useCallback(
    (show: ChannelShow) => {
      if (onShowPress) return onShowPress(show);
      Linking.openURL(SHOW_BASE_URL + show.forumSlug).catch(() => undefined);
    },
    [onShowPress],
  );

  const handleSeeFullRanking = useCallback(() => {
    navigation.navigate('ChannelDetail', { channelId: activeChannel.channelId });
  }, [navigation, activeChannel.channelId]);

  return (
    <View style={styles.section}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.accentBar} />
          <View style={styles.titleCol}>
            <Text style={styles.title}>Popular Indian TV Shows</Text>
            <Text style={styles.subtitle}>Top picks · tap a channel to filter</Text>
          </View>
        </View>
      </View>

      {/* Channel switcher chips — Instagram-stories-tray style: circular logo
          chips with a brand-color ring on the active channel. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        {CHANNELS_DATA.map((channel) => {
          const isActive = channel.channelId === activeId;
          const channelBrand = BRAND_COLOR[channel.channelId] ?? colors.primary;
          return (
            <Pressable
              key={channel.channelId}
              onPress={() => setActiveId(channel.channelId)}
              style={({ pressed }) => [
                styles.chip,
                {
                  borderColor: isActive ? channelBrand : colors.border,
                  borderWidth: isActive ? 2.5 : 1,
                },
                isActive && {
                  shadowColor: channelBrand,
                  shadowOpacity: 0.3,
                  shadowOffset: { width: 0, height: 4 },
                  shadowRadius: 10,
                  elevation: 4,
                },
                pressed && !isActive && styles.chipPressed,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={channel.channelName}
            >
              <Image
                source={{ uri: channel.logoUrl }}
                style={styles.chipLogo}
                contentFit="contain"
                cachePolicy="memory-disk"
                transition={120}
              />
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Preview panel — top 3 shows for the active channel, then a "See
          full ranking" CTA that pushes the dedicated detail screen. */}
      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <View style={[styles.panelHeaderBar, { backgroundColor: brand }]} />
          <View style={styles.panelHeaderCol}>
            <Text style={[styles.panelChannelName, { color: brand }]} numberOfLines={1}>
              {activeChannel.channelName.toUpperCase()}
            </Text>
            <Text style={styles.panelCaption}>Top {PREVIEW_COUNT} this week</Text>
          </View>
        </View>

        <View style={styles.showList}>
          {previewShows.map((show, idx) => (
            <Pressable
              key={show.forumSlug}
              style={({ pressed }) => [
                styles.showRow,
                idx === previewShows.length - 1 && styles.showRowLast,
                pressed && styles.showRowPressed,
              ]}
              onPress={() => handleShowPress(show)}
              accessibilityRole="button"
              accessibilityLabel={`Position ${idx + 1}, ${show.title}`}
            >
              <Text style={[styles.rankGlyph, { color: PODIUM[idx] }]}>
                {RANK_GLYPH[idx]}
              </Text>
              <Text
                style={[styles.showName, idx === 0 && styles.showNameTop]}
                numberOfLines={2}
              >
                {show.title}
              </Text>
              <TrendBadge show={show} styles={styles} />
            </Pressable>
          ))}
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.cta,
            { backgroundColor: brand },
            pressed && styles.ctaPressed,
          ]}
          onPress={handleSeeFullRanking}
          accessibilityRole="button"
          accessibilityLabel={`See full ${activeChannel.channelName} ranking`}
        >
          <Text style={styles.ctaText}>
            SEE FULL {activeChannel.channelName.toUpperCase()} RANKING
          </Text>
          <Text style={styles.ctaArrow}>→</Text>
        </Pressable>
      </View>
    </View>
  );
}

function TrendBadge({
  show,
  styles,
}: {
  show: ChannelShow;
  styles: ReturnType<typeof makeStyles>;
}) {
  const isUp = show.trend === 'up';
  const isDown = show.trend === 'down';
  const badgeStyle = isUp
    ? styles.trendUp
    : isDown
      ? styles.trendDown
      : styles.trendEqual;
  const textStyle = isUp
    ? styles.trendTextUp
    : isDown
      ? styles.trendTextDown
      : styles.trendTextEqual;
  const arrow = isUp ? '▲' : isDown ? '▼' : '↔';
  return (
    <View style={[styles.trendBadge, badgeStyle]}>
      <Text style={[styles.trendArrow, textStyle]}>{arrow}</Text>
      <Text style={[styles.trendDelta, textStyle]}>{show.delta}</Text>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    section: {
      backgroundColor: c.card,
      borderTopWidth: 1,
      borderTopColor: c.border,
      paddingTop: 16,
      paddingBottom: 16,
    },
    header: {
      paddingHorizontal: 14,
      paddingBottom: 14,
    },
    titleRow: {
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

    // Channel chips
    chipsRow: {
      paddingHorizontal: 14,
      gap: 12,
      paddingVertical: 6,
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

    // Detail panel
    panel: {
      marginHorizontal: 14,
      marginTop: 14,
      backgroundColor: c.cardElevated,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowOffset: { width: 0, height: 3 },
      shadowRadius: 8,
      elevation: 3,
    },
    panelHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      paddingHorizontal: 16,
      gap: 10,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    panelHeaderBar: {
      width: 3,
      height: 28,
      borderRadius: 2,
    },
    panelHeaderCol: {
      flex: 1,
      gap: 1,
    },
    panelChannelName: {
      fontSize: 13,
      fontWeight: '900',
      letterSpacing: 1.4,
    },
    panelCaption: {
      fontSize: 10.5,
      color: c.textTertiary,
      fontWeight: '600',
      letterSpacing: 0.2,
    },

    // Show list
    showList: {
      paddingHorizontal: 16,
    },
    showRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      gap: 12,
    },
    showRowLast: {
      borderBottomWidth: 0,
    },
    showRowPressed: {
      backgroundColor: c.primarySoft,
    },
    rankGlyph: {
      fontSize: 22,
      lineHeight: 24,
      width: 26,
      textAlign: 'center',
    },
    showName: {
      flex: 1,
      fontSize: 14,
      fontWeight: '700',
      color: c.text,
      letterSpacing: -0.2,
      lineHeight: 19,
    },
    showNameTop: {
      fontWeight: '900',
      letterSpacing: -0.3,
    },

    // Trend badge
    trendBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      borderWidth: 1,
      minWidth: 50,
      justifyContent: 'center',
    },
    trendUp: {
      backgroundColor: c.successSoft,
      borderColor: c.successSoftBorder,
    },
    trendDown: {
      backgroundColor: c.dangerSoft,
      borderColor: c.dangerSoftBorder,
    },
    trendEqual: {
      backgroundColor: c.surface,
      borderColor: c.border,
    },
    trendArrow: {
      fontSize: 10,
      fontWeight: '900',
    },
    trendDelta: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.2,
      fontVariant: ['tabular-nums'],
    },
    trendTextUp: { color: c.success },
    trendTextDown: { color: c.danger },
    trendTextEqual: { color: c.textTertiary },

    // CTA
    cta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 13,
      paddingHorizontal: 16,
    },
    ctaPressed: {
      opacity: 0.85,
    },
    ctaText: {
      fontSize: 11,
      fontWeight: '900',
      color: '#FFFFFF',
      letterSpacing: 1,
    },
    ctaArrow: {
      fontSize: 13,
      fontWeight: '900',
      color: '#FFFFFF',
      lineHeight: 13,
    },
  });
}
