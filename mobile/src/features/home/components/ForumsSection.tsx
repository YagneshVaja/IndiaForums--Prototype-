import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import { useHomeForumTopics } from '../hooks/useHomeForumTopics';
import { formatCount } from '../../forums/utils/format';
import LoadingState from '../../../components/ui/LoadingState';
import type { ForumTopic, HomeForumTopic, HomeTopicType } from '../../../services/api';

type TabId = 'announcements' | 'latest' | 'popular';

const TABS: Array<{ id: TabId; label: string; topicType: HomeTopicType }> = [
  { id: 'announcements', label: 'Announcements', topicType: 'ga' },
  { id: 'latest',        label: 'Latest',        topicType: 'lt' },
  { id: 'popular',       label: 'Popular',       topicType: 'popular' },
];

const PREVIEW_COUNT = 3;

interface Props {
  onTopicPress?: (topic: ForumTopic) => void;
}

/**
 * Turn a forum slug ("suggestions-comments") into a display name
 * ("Suggestions Comments"). The /home/topics endpoint returns the slug only;
 * forumName isn't part of the lightweight schema.
 */
function forumNameFromSlug(slug: string): string {
  if (!slug) return '';
  return slug
    .split('-')
    .map((part) => (part.length === 0 ? '' : part[0].toUpperCase() + part.slice(1)))
    .join(' ');
}

/**
 * Build a minimal ForumTopic for navigation. TopicDetailScreen refetches the
 * full record on mount keyed off `id`, so the empty fields here are
 * placeholders that get replaced once the post fetch lands. Same pattern as
 * search → TopicDetail (see useEntityNavigator.synthesizeForumTopic).
 */
function synthesizeForumTopic(t: HomeForumTopic, displayName: string): ForumTopic {
  return {
    id:            t.topicId,
    forumId:       t.forumId,
    forumName:     displayName,
    forumThumbnail: t.forumThumbnail,
    title:         t.title,
    description:   '',
    poster:        '',
    posterId:      0,
    lastBy:        '',
    lastById:      0,
    time:          '',
    lastTime:      t.lastTime,
    replies:       t.replies,
    views:         0,
    likes:         0,
    userCount:     0,
    locked:        false,
    pinned:        false,
    flairId:       0,
    topicImage:    null,
    tags:          [],
    linkTypeValue: '',
    poll:          null,
  };
}

export default function ForumsSection({ onTopicPress }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('announcements');
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation();

  const topicType = TABS.find((t) => t.id === activeTab)!.topicType;
  const { data: topics = [], isLoading, isFetching } = useHomeForumTopics(topicType);

  const visibleTopics = useMemo(() => topics.slice(0, PREVIEW_COUNT), [topics]);

  const handleSeeAll = useCallback(() => {
    // Cross-tab jump from HomeStack → MainTab parent → Forums tab.
    navigation.getParent()?.navigate('Forums' as never);
  }, [navigation]);

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.accentBar} />
          <View style={styles.titleCol}>
            <Text style={styles.title}>FORUMS</Text>
            <Text style={styles.subtitle}>Latest community discussions</Text>
          </View>
        </View>
        <Pressable
          onPress={handleSeeAll}
          style={({ pressed }) => [
            styles.seeAll,
            pressed && styles.seeAllPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Open Forums tab"
        >
          <Text style={styles.seeAllText}>See All</Text>
          <Ionicons name="chevron-forward" size={13} color={colors.primary} />
        </Pressable>
      </View>

      <View style={styles.tabRow}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <Pressable
              key={tab.id}
              style={styles.tab}
              onPress={() => setActiveTab(tab.id)}
              accessibilityRole="button"
              accessibilityLabel={tab.label}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab.label}
              </Text>
              {isActive ? <View style={styles.tabIndicator} /> : null}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.threadList}>
        {isLoading && topics.length === 0 ? (
          <LoadingState height={260} />
        ) : visibleTopics.length === 0 ? (
          isFetching ? (
            <Text style={styles.empty}>Loading…</Text>
          ) : (
            <Pressable
              onPress={handleSeeAll}
              style={({ pressed }) => [
                styles.emptyState,
                pressed && styles.emptyStatePressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="No discussions in this view yet — open Forums tab"
            >
              <Text style={styles.emptyEmoji}>💬</Text>
              <Text style={styles.emptyTitle}>No discussions in this view yet</Text>
              <View style={styles.emptyCtaRow}>
                <Text style={styles.emptyCta}>Open Forums</Text>
                <Ionicons name="arrow-forward" size={13} color={colors.primary} />
              </View>
            </Pressable>
          )
        ) : (
          visibleTopics.map((t) => (
            <TopicRow
              key={t.topicId}
              topic={t}
              styles={styles}
              colors={colors}
              onPress={onTopicPress}
            />
          ))
        )}
      </View>
    </View>
  );
}

interface TopicRowProps {
  topic: HomeForumTopic;
  styles: ReturnType<typeof makeStyles>;
  colors: ThemeColors;
  onPress?: (topic: ForumTopic) => void;
}

function TopicRow({ topic, styles, colors, onPress }: TopicRowProps) {
  const displayName = forumNameFromSlug(topic.forumPageUrl);
  const initial = (displayName || '?').charAt(0).toUpperCase();

  const handlePress = () => {
    if (!onPress) return;
    onPress(synthesizeForumTopic(topic, displayName));
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.thread, pressed && styles.threadPressed]}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={topic.title}
    >
      <View style={styles.thumbWrap}>
        {topic.forumThumbnail ? (
          <Image
            source={{ uri: topic.forumThumbnail }}
            style={styles.thumb}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={120}
          />
        ) : (
          <View style={[styles.thumb, styles.thumbFallback]}>
            <Text style={styles.thumbInitial}>{initial}</Text>
          </View>
        )}
      </View>

      <View style={styles.body}>
        <Text style={styles.forumName} numberOfLines={1}>{displayName}</Text>
        <Text style={styles.threadTitle} numberOfLines={2}>{topic.title}</Text>

        <View style={styles.metaRow}>
          <View style={styles.metaLeft}>
            <Text style={styles.stat}>💬 {formatCount(topic.replies)} replies</Text>
            {topic.lastTime ? (
              <>
                <Text style={styles.dot}>·</Text>
                <Text style={styles.stat} numberOfLines={1}>{topic.lastTime}</Text>
              </>
            ) : null}
          </View>
          <Text style={[styles.chevron, { color: colors.textTertiary }]}>›</Text>
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
      paddingTop: 16,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
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
    tabRow: {
      flexDirection: 'row',
      borderBottomWidth: 2,
      borderBottomColor: c.border,
      marginBottom: 10,
    },
    tab: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 11,
      paddingHorizontal: 4,
      position: 'relative',
    },
    tabText: {
      fontSize: 13,
      fontWeight: '700',
      color: c.textTertiary,
    },
    tabTextActive: {
      color: c.text,
    },
    tabIndicator: {
      position: 'absolute',
      bottom: -2,
      left: '18%',
      right: '18%',
      height: 2.5,
      backgroundColor: c.primary,
      borderRadius: 2,
    },
    threadList: {
      paddingHorizontal: 14,
      paddingBottom: 16,
      gap: 10,
    },
    thread: {
      flexDirection: 'row',
      gap: 12,
      borderRadius: 12,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      padding: 12,
      alignItems: 'center',
    },
    threadPressed: {
      backgroundColor: c.primarySoft,
      borderColor: c.primary,
    },
    thumbWrap: {
      width: 44,
      height: 44,
      borderRadius: 22,
      overflow: 'hidden',
      flexShrink: 0,
      backgroundColor: c.surface,
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
    thumbInitial: {
      fontSize: 16,
      fontWeight: '800',
      color: c.primary,
    },
    body: {
      flex: 1,
      minWidth: 0,
    },
    forumName: {
      fontSize: 10,
      fontWeight: '800',
      color: c.primary,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: 2,
    },
    threadTitle: {
      fontSize: 13.5,
      fontWeight: '700',
      color: c.text,
      lineHeight: 18,
      marginBottom: 6,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    metaLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flexShrink: 1,
      gap: 4,
    },
    stat: {
      fontSize: 10.5,
      fontWeight: '600',
      color: c.textTertiary,
    },
    dot: {
      fontSize: 10,
      color: c.textTertiary,
      marginHorizontal: 2,
    },
    chevron: {
      fontSize: 18,
      fontWeight: '700',
      lineHeight: 18,
    },
    empty: {
      fontSize: 12,
      color: c.textTertiary,
      textAlign: 'center',
      paddingVertical: 24,
    },
    emptyState: {
      alignItems: 'center',
      paddingVertical: 28,
      paddingHorizontal: 24,
      gap: 8,
    },
    emptyStatePressed: {
      opacity: 0.7,
    },
    emptyEmoji: {
      fontSize: 28,
      opacity: 0.6,
    },
    emptyTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: c.textSecondary,
      textAlign: 'center',
    },
    emptyCtaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 4,
    },
    emptyCta: {
      fontSize: 13,
      fontWeight: '700',
      color: c.primary,
      letterSpacing: 0.2,
    },
  });
}
