import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { ForumTopic, Forum, ForumFlair } from '../../../services/api';
import { formatCount } from '../utils/format';
import { stripPostHtml } from '../utils/stripHtml';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

type Styles = ReturnType<typeof makeStyles>;

interface Props {
  topic: ForumTopic;
  forum?: Forum | null;
  flairs?: ForumFlair[];
  onPress?: (topic: ForumTopic) => void;
}

function ThreadCardImpl({ topic, forum, flairs, onPress }: Props) {
  const bg = forum?.bg || '#1e3a5e';
  const emoji = forum?.emoji || '💬';
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const descriptionPreview = useMemo(
    () => stripPostHtml(topic.description),
    [topic.description],
  );

  const flair = useMemo(
    () => flairs?.find(f => f.id === topic.flairId) || null,
    [flairs, topic.flairId],
  );

  return (
    <Pressable style={styles.card} onPress={() => onPress?.(topic)}>
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: bg }]}>
          {topic.forumThumbnail ? (
            <Image
              source={{ uri: topic.forumThumbnail }}
              style={styles.avatarImg}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={150}
            />
          ) : (
            <Text style={styles.avatarEmoji}>{emoji}</Text>
          )}
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.forumName} numberOfLines={1}>{topic.forumName || forum?.name}</Text>
          <Text style={styles.posterLine} numberOfLines={1}>
            Posted by <Text style={styles.posterName}>{topic.poster}</Text> · {topic.time}
          </Text>
        </View>
        {topic.pinned && <Ionicons name="pin" size={14} color="#EA580C" />}
        {topic.locked && <Ionicons name="lock-closed" size={14} color={colors.textTertiary} />}
      </View>

      {flair && (
        <View style={[styles.flairPill, { backgroundColor: flair.bgColor }]}>
          <Text style={[styles.flairText, { color: flair.fgColor }]} numberOfLines={1}>
            {flair.name}
          </Text>
        </View>
      )}
      <Text style={styles.title} numberOfLines={2}>{topic.title}</Text>

      {!!descriptionPreview && (
        <Text style={styles.desc} numberOfLines={2}>{descriptionPreview}</Text>
      )}

      {topic.tags && topic.tags.length > 0 && (
        <View style={styles.tagRow}>
          {topic.tags.slice(0, 4).map(t => (
            <View key={t.id} style={styles.tag}>
              <Text style={styles.tagText} numberOfLines={1}>#{t.name}</Text>
            </View>
          ))}
        </View>
      )}

      {topic.topicImage && (
        <Image
          source={{ uri: topic.topicImage }}
          style={styles.image}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={150}
        />
      )}

      <View style={styles.stats}>
        <Stat icon="thumbs-up-outline" value={formatCount(topic.likes)} styles={styles} iconColor={colors.textSecondary} />
        <Stat icon="eye-outline" value={formatCount(topic.views)} styles={styles} iconColor={colors.textSecondary} />
        <Stat icon="chatbubble-outline" value={formatCount(topic.replies)} styles={styles} iconColor={colors.textSecondary} />
        {topic.lastBy ? (
          <View style={styles.lastReply}>
            <Ionicons name="arrow-undo" size={11} color={colors.textTertiary} />
            <Text style={styles.lastReplyText} numberOfLines={1}>
              {topic.lastTime} by {topic.lastBy}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const ThreadCard = React.memo(ThreadCardImpl);
export default ThreadCard;

function Stat({ icon, value, styles, iconColor }: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  value: string;
  styles: Styles;
  iconColor: string;
}) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={13} color={iconColor} />
      <Text style={styles.statText}>{value}</Text>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 14,
      padding: 12,
      marginHorizontal: 14,
      marginBottom: 10,
      gap: 8,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    avatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    avatarImg: {
      width: '100%',
      height: '100%',
    },
    avatarEmoji: {
      fontSize: 16,
    },
    headerInfo: {
      flex: 1,
      minWidth: 0,
    },
    forumName: {
      fontSize: 12,
      fontWeight: '700',
      color: c.primary,
    },
    posterLine: {
      fontSize: 11,
      color: c.textTertiary,
      marginTop: 1,
    },
    posterName: {
      fontWeight: '600',
      color: c.textSecondary,
    },
    title: {
      fontSize: 14,
      fontWeight: '700',
      color: c.text,
      lineHeight: 20,
    },
    flairPill: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 10,
      alignSelf: 'flex-start',
    },
    flairText: {
      fontSize: 10,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    tagRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 4,
    },
    tag: {
      backgroundColor: c.primarySoft,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
    },
    tagText: {
      fontSize: 10,
      fontWeight: '700',
      color: c.primary,
    },
    desc: {
      fontSize: 12,
      color: c.textSecondary,
      lineHeight: 17,
    },
    image: {
      width: '100%',
      height: 140,
      borderRadius: 10,
      backgroundColor: c.surface,
    },
    stats: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      flexWrap: 'wrap',
      marginTop: 2,
    },
    stat: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    statText: {
      fontSize: 11,
      fontWeight: '600',
      color: c.textSecondary,
    },
    lastReply: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginLeft: 'auto',
      flexShrink: 1,
    },
    lastReplyText: {
      fontSize: 10,
      color: c.textTertiary,
      maxWidth: 140,
    },
  });
}
