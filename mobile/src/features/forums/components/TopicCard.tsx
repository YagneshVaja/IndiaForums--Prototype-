import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { ForumTopic } from '../../../services/api';
import { formatCount } from '../utils/format';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

type Styles = ReturnType<typeof makeStyles>;

interface Props {
  topic: ForumTopic;
  viewMode: 'detailed' | 'compact';
  onPress?: (topic: ForumTopic) => void;
}

function TopicCardImpl({ topic, viewMode, onPress }: Props) {
  const detailed = viewMode === 'detailed';
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <Pressable style={styles.card} onPress={() => onPress?.(topic)}>
      <View style={styles.header}>
        {topic.forumThumbnail ? (
          <Image
            source={{ uri: topic.forumThumbnail }}
            style={styles.forumAvatar}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={150}
          />
        ) : (
          <View style={styles.forumAvatarFallback}>
            <Text style={styles.forumAvatarFallbackText}>
              {(topic.forumName || 'F').charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <Text style={styles.forumName} numberOfLines={1}>{topic.forumName}</Text>
      </View>

      <Text style={styles.title} numberOfLines={2}>{topic.title}</Text>

      <Text style={styles.postedBy} numberOfLines={1}>
        Posted by: <Text style={styles.strong}>{topic.poster}</Text> · {topic.time}
      </Text>

      {detailed && !!topic.description && (
        <Text style={styles.desc} numberOfLines={3}>{topic.description}</Text>
      )}

      {detailed && topic.topicImage && (
        <Image
          source={{ uri: topic.topicImage }}
          style={styles.image}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={150}
        />
      )}

      <View style={styles.bottomRow}>
        <View style={styles.statsLeft}>
          <Stat icon="thumbs-up-outline" value={formatCount(topic.likes)} styles={styles} iconColor={colors.textSecondary} />
          <Stat icon="eye-outline" value={formatCount(topic.views)} styles={styles} iconColor={colors.textSecondary} />
          <Stat icon="chatbubble-outline" value={formatCount(topic.replies)} styles={styles} iconColor={colors.textSecondary} />
          <Stat icon="share-social-outline" value="Share" styles={styles} iconColor={colors.textSecondary} />
        </View>
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

const TopicCard = React.memo(TopicCardImpl);
export default TopicCard;

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
      gap: 6,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    forumAvatar: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: c.surface,
    },
    forumAvatarFallback: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    forumAvatarFallbackText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    forumName: {
      fontSize: 12,
      fontWeight: '700',
      color: c.primary,
      flexShrink: 1,
    },
    title: {
      fontSize: 14,
      fontWeight: '700',
      color: c.text,
      lineHeight: 20,
      marginTop: 2,
    },
    postedBy: {
      fontSize: 11,
      color: c.textTertiary,
    },
    strong: {
      color: c.textSecondary,
      fontWeight: '600',
    },
    desc: {
      fontSize: 12,
      color: c.textSecondary,
      lineHeight: 17,
      marginTop: 2,
    },
    image: {
      width: '100%',
      height: 140,
      borderRadius: 10,
      backgroundColor: c.surface,
      marginTop: 4,
    },
    bottomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 4,
    },
    statsLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flexShrink: 0,
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
