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
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { HomeStackParamList } from '../../../navigation/types';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import { useShowForumDetail } from '../hooks/useShowForumDetail';
import LoadingState from '../../../components/ui/LoadingState';
import type { Forum, ForumTopic } from '../../../services/api';

type Props = NativeStackScreenProps<HomeStackParamList, 'ShowDetail'>;

const SHOW_BASE_URL = 'https://www.indiaforums.com/show/';
const DESC_PREVIEW_CHARS = 220;

/** Compact "1,651,745" → "1.6M" for stat chips. */
function formatStat(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

/** "Just now" / "5 min ago" / "2 hours ago" / "3 days ago" — short format. */
function shortTimeAgo(dateStr: string): string {
  if (!dateStr) return '';
  const past = new Date(dateStr).getTime();
  if (isNaN(past)) return '';
  const diff = Date.now() - past;
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function ShowDetailScreen({ navigation, route }: Props) {
  const { show, channelName, channelBrand } = route.params;
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((s) => s.colors);
  const brand = channelBrand ?? colors.primary;
  const styles = useMemo(() => makeStyles(colors, insets.top, brand), [colors, insets.top, brand]);

  const { data, isLoading } = useShowForumDetail(show.forumId);
  const forum = data?.forumDetail ?? null;
  const recentTopics = data?.topics ?? [];

  const handleOpenForum = useCallback(() => {
    if (!forum) return;
    navigation.push('ForumThread', { forum });
  }, [navigation, forum]);

  const handleTopicPress = useCallback(
    (topic: ForumTopic) => {
      navigation.push('TopicDetail', { topic, forum: forum ?? undefined });
    },
    [navigation, forum],
  );

  const handleVisitWebsite = useCallback(() => {
    Linking.openURL(`${SHOW_BASE_URL}${show.pageUrl}_${show.titleId}`).catch(
      () => undefined,
    );
  }, [show]);

  const isRanked = show.rankCurrentWeek > 0;

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      >
        {/* ── Hero with poster background ─────────────────────────────── */}
        <View style={styles.heroWrap}>
          {show.posterUrl ? (
            <Image
              source={{ uri: show.posterUrl }}
              style={styles.heroBg}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={200}
              blurRadius={8}
            />
          ) : (
            <View style={[styles.heroBg, { backgroundColor: brand }]} />
          )}

          {/* Gradient overlay so text stays readable over varied posters */}
          <LinearGradient
            colors={['rgba(0,0,0,0.25)', 'rgba(0,0,0,0.55)', '#0E0F12']}
            locations={[0, 0.55, 1]}
            style={styles.heroOverlay}
            pointerEvents="none"
          />

          <Pressable
            style={[styles.backBtn, { top: insets.top + 8 }]}
            onPress={() => navigation.goBack()}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
          </Pressable>

          <View style={[styles.heroContent, { paddingTop: insets.top + 64 }]}>
            {/* Sharp poster card on top of the blurred bg */}
            <View style={styles.posterCard}>
              {show.posterUrl ? (
                <Image
                  source={{ uri: show.posterUrl }}
                  style={styles.poster}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  transition={200}
                />
              ) : (
                <View style={[styles.poster, styles.posterFallback]}>
                  <Ionicons name="tv" size={44} color="rgba(255,255,255,0.4)" />
                </View>
              )}
            </View>

            <View style={styles.heroBadgeRow}>
              {isRanked ? (
                <View style={[styles.heroBadge, { backgroundColor: brand }]}>
                  <Text style={styles.heroBadgeText}>★ #{show.rankCurrentWeek} THIS WEEK</Text>
                </View>
              ) : null}
              <View style={[styles.heroBadge, show.archive ? styles.statusOff : styles.statusOn]}>
                <Text style={[styles.heroBadgeText, show.archive ? styles.statusOffText : styles.statusOnText]}>
                  {show.archive ? 'OFF AIR' : 'ON AIR'}
                </Text>
              </View>
            </View>

            <Text style={styles.heroTitle} numberOfLines={3}>
              {show.titleName}
            </Text>
            {channelName ? (
              <Text style={styles.heroChannel}>
                {channelName.toUpperCase()}
              </Text>
            ) : null}
          </View>
        </View>

        {/* ── Body ──────────────────────────────────────────────────── */}
        <View style={styles.body}>
          {/* Stats row — sourced from the forum detail (postsCount, topicsCount, followCount, rank) */}
          {forum ? (
            <StatsRow
              forum={forum}
              show={show}
              styles={styles}
            />
          ) : isLoading ? (
            <View style={styles.statsRowSkeleton}>
              <LoadingState height={64} />
            </View>
          ) : null}

          {/* About */}
          {forum?.description ? (
            <AboutBlock description={forum.description} styles={styles} />
          ) : null}

          {/* Primary CTA — open the discussion forum */}
          {forum ? (
            <Pressable
              style={({ pressed }) => [
                styles.discussCta,
                { backgroundColor: brand },
                pressed && styles.discussCtaPressed,
              ]}
              onPress={handleOpenForum}
              accessibilityRole="button"
              accessibilityLabel={`Open ${show.titleName} discussion forum`}
            >
              <Ionicons name="chatbubbles" size={18} color="#FFFFFF" />
              <Text style={styles.discussCtaText}>OPEN DISCUSSION FORUM</Text>
              <Text style={styles.discussCtaArrow}>→</Text>
            </Pressable>
          ) : !isLoading && show.forumId === 0 ? (
            // Show a clean "no community yet" stub for shows without a forum
            <View style={styles.noForum}>
              <Ionicons name="chatbubble-ellipses-outline" size={28} color={colors.textTertiary} />
              <Text style={styles.noForumText}>
                No discussion forum for this show yet.
              </Text>
            </View>
          ) : null}

          {/* Latest topics */}
          {recentTopics.length > 0 ? (
            <View style={styles.topicsSection}>
              <View style={styles.topicsHeader}>
                <Text style={styles.topicsTitle}>Latest topics</Text>
                {forum ? (
                  <Pressable onPress={handleOpenForum} hitSlop={6}>
                    <Text style={[styles.topicsSeeAll, { color: brand }]}>
                      See all {formatStat(forum.topicCount)} →
                    </Text>
                  </Pressable>
                ) : null}
              </View>
              <View style={styles.topicsCard}>
                {recentTopics.map((topic, idx) => (
                  <Pressable
                    key={topic.id}
                    style={({ pressed }) => [
                      styles.topicRow,
                      idx === recentTopics.length - 1 && styles.topicRowLast,
                      pressed && styles.topicRowPressed,
                    ]}
                    onPress={() => handleTopicPress(topic)}
                    accessibilityRole="button"
                    accessibilityLabel={topic.title}
                  >
                    <View style={styles.topicLeft}>
                      <Text style={styles.topicTitle} numberOfLines={2}>
                        {topic.title}
                      </Text>
                      <Text style={styles.topicMeta}>
                        by {topic.poster}
                        {topic.lastTime ? ` · ${shortTimeAgo(topic.lastTime)}` : ''}
                      </Text>
                    </View>
                    <View style={styles.topicStats}>
                      <Text style={styles.topicStatNum}>{formatStat(topic.replies)}</Text>
                      <Text style={styles.topicStatLabel}>REPLIES</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          {/* External link footer */}
          <Pressable
            style={({ pressed }) => [
              styles.footerLink,
              pressed && styles.footerLinkPressed,
            ]}
            onPress={handleVisitWebsite}
            accessibilityRole="link"
            accessibilityLabel="Visit on indiaforums.com"
          >
            <Ionicons name="open-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.footerLinkText}>Visit show page on indiaforums.com</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Stats row ──────────────────────────────────────────────────────────────

interface StatsRowProps {
  forum: Forum;
  show: { rankCurrentWeek: number };
  styles: ReturnType<typeof makeStyles>;
}

function StatsRow({ forum, show, styles }: StatsRowProps) {
  const stats: Array<{ label: string; value: string }> = [];
  if (forum.postCount > 0) stats.push({ label: 'POSTS', value: formatStat(forum.postCount) });
  if (forum.topicCount > 0) stats.push({ label: 'TOPICS', value: formatStat(forum.topicCount) });
  if (forum.followCount > 0) stats.push({ label: 'FANS', value: formatStat(forum.followCount) });
  if (show.rankCurrentWeek > 0) stats.push({ label: 'RANK', value: `#${show.rankCurrentWeek}` });
  if (stats.length === 0) return null;
  return (
    <View style={styles.statsRow}>
      {stats.map((s, i) => (
        <View key={s.label} style={styles.statCol}>
          <Text style={styles.statValue}>{s.value}</Text>
          <Text style={styles.statLabel}>{s.label}</Text>
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

// ─── Styles ──────────────────────────────────────────────────────────────────

function makeStyles(c: ThemeColors, _topInset: number, _brand: string) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.bg,
    },

    // Hero
    heroWrap: {
      width: '100%',
      backgroundColor: '#0E0F12',
      position: 'relative',
    },
    heroBg: {
      ...StyleSheet.absoluteFillObject,
    },
    heroOverlay: {
      ...StyleSheet.absoluteFillObject,
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
      paddingHorizontal: 20,
      paddingBottom: 24,
      alignItems: 'center',
      gap: 14,
    },
    posterCard: {
      width: 140,
      height: 78,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: c.surface,
      shadowColor: '#000',
      shadowOpacity: 0.3,
      shadowOffset: { width: 0, height: 6 },
      shadowRadius: 14,
      elevation: 6,
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
    heroBadgeRow: {
      flexDirection: 'row',
      gap: 6,
      flexWrap: 'wrap',
      justifyContent: 'center',
    },
    heroBadge: {
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    heroBadgeText: {
      fontSize: 10,
      fontWeight: '900',
      color: '#FFFFFF',
      letterSpacing: 0.8,
    },
    statusOn: {
      backgroundColor: 'rgba(67, 194, 129, 0.95)',
    },
    statusOnText: {
      color: '#FFFFFF',
    },
    statusOff: {
      backgroundColor: 'rgba(0,0,0,0.7)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.4)',
    },
    statusOffText: {
      color: '#FFFFFF',
    },
    heroTitle: {
      fontSize: 26,
      fontWeight: '900',
      color: '#FFFFFF',
      letterSpacing: -0.6,
      textAlign: 'center',
      lineHeight: 32,
    },
    heroChannel: {
      fontSize: 11,
      fontWeight: '800',
      color: 'rgba(255,255,255,0.78)',
      letterSpacing: 1.6,
    },

    // Body
    body: {
      paddingHorizontal: 14,
      paddingTop: 18,
      gap: 14,
    },

    // Stats
    statsRowSkeleton: {
      backgroundColor: c.cardElevated,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: c.border,
      paddingVertical: 8,
    },
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

    // Primary CTA
    discussCta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 18,
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowOffset: { width: 0, height: 4 },
      shadowRadius: 10,
      elevation: 4,
    },
    discussCtaPressed: {
      opacity: 0.85,
    },
    discussCtaText: {
      fontSize: 12,
      fontWeight: '900',
      color: '#FFFFFF',
      letterSpacing: 1.2,
      flex: 1,
      textAlign: 'center',
    },
    discussCtaArrow: {
      fontSize: 16,
      fontWeight: '900',
      color: '#FFFFFF',
      lineHeight: 16,
    },

    noForum: {
      backgroundColor: c.cardElevated,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      paddingVertical: 24,
      paddingHorizontal: 16,
      alignItems: 'center',
      gap: 8,
    },
    noForumText: {
      fontSize: 13,
      fontWeight: '600',
      color: c.textTertiary,
      textAlign: 'center',
    },

    // Latest topics
    topicsSection: {
      gap: 10,
      marginTop: 4,
    },
    topicsHeader: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
    },
    topicsTitle: {
      fontSize: 15,
      fontWeight: '900',
      color: c.text,
      letterSpacing: -0.3,
    },
    topicsSeeAll: {
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 0.4,
    },
    topicsCard: {
      backgroundColor: c.cardElevated,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: 14,
    },
    topicRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      gap: 10,
    },
    topicRowLast: {
      borderBottomWidth: 0,
    },
    topicRowPressed: {
      backgroundColor: c.primarySoft,
    },
    topicLeft: {
      flex: 1,
      gap: 3,
    },
    topicTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: c.text,
      letterSpacing: -0.1,
      lineHeight: 17,
    },
    topicMeta: {
      fontSize: 10.5,
      color: c.textTertiary,
      fontWeight: '600',
    },
    topicStats: {
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 50,
    },
    topicStatNum: {
      fontSize: 13,
      fontWeight: '900',
      color: c.text,
      letterSpacing: -0.2,
      fontVariant: ['tabular-nums'],
    },
    topicStatLabel: {
      fontSize: 8,
      fontWeight: '900',
      color: c.textTertiary,
      letterSpacing: 0.8,
    },

    // External link footer
    footerLink: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 14,
      marginTop: 4,
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
