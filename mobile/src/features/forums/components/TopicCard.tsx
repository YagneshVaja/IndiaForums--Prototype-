import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { ForumTopic } from '../../../services/api';
import { formatCount } from '../utils/format';

interface Props {
  topic: ForumTopic;
  viewMode: 'detailed' | 'compact';
  onPress?: (topic: ForumTopic) => void;
}

function TopicCardImpl({ topic, viewMode, onPress }: Props) {
  const detailed = viewMode === 'detailed';

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
          <Stat icon="thumbs-up-outline" value={formatCount(topic.likes)} />
          <Stat icon="eye-outline" value={formatCount(topic.views)} />
          <Stat icon="chatbubble-outline" value={formatCount(topic.replies)} />
          <Stat icon="share-social-outline" value="Share" />
        </View>
        {topic.lastBy ? (
          <View style={styles.lastReply}>
            <Ionicons name="arrow-undo" size={11} color="#8A8A8A" />
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

function Stat({ icon, value }: { icon: React.ComponentProps<typeof Ionicons>['name']; value: string }) {
  return (
    <View style={styles.stat}>
      <Ionicons name={icon} size={13} color="#666" />
      <Text style={styles.statText}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#EEEFF1',
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
    backgroundColor: '#EEEFF1',
  },
  forumAvatarFallback: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#3558F0',
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
    color: '#3558F0',
    flexShrink: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
    lineHeight: 20,
    marginTop: 2,
  },
  postedBy: {
    fontSize: 11,
    color: '#8A8A8A',
  },
  strong: {
    color: '#555',
    fontWeight: '600',
  },
  desc: {
    fontSize: 12,
    color: '#555',
    lineHeight: 17,
    marginTop: 2,
  },
  image: {
    width: '100%',
    height: 140,
    borderRadius: 10,
    backgroundColor: '#EEEFF1',
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
    color: '#666',
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
    color: '#8A8A8A',
    maxWidth: 140,
  },
});
