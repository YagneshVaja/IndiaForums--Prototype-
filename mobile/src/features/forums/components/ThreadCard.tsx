import React from 'react';
import { View, Text, Pressable, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ForumTopic, Forum } from '../../../services/api';
import { formatCount } from '../utils/format';

interface Props {
  topic: ForumTopic;
  forum?: Forum | null;
  onPress?: (topic: ForumTopic) => void;
}

export default function ThreadCard({ topic, forum, onPress }: Props) {
  const bg = forum?.bg || '#1e3a5e';
  const emoji = forum?.emoji || '💬';

  return (
    <Pressable style={styles.card} onPress={() => onPress?.(topic)}>
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: bg }]}>
          {topic.forumThumbnail ? (
            <Image source={{ uri: topic.forumThumbnail }} style={styles.avatarImg} />
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
        {topic.locked && <Ionicons name="lock-closed" size={14} color="#8A8A8A" />}
      </View>

      <Text style={styles.title} numberOfLines={2}>{topic.title}</Text>

      {!!topic.description && (
        <Text style={styles.desc} numberOfLines={2}>{topic.description}</Text>
      )}

      {topic.topicImage && (
        <Image source={{ uri: topic.topicImage }} style={styles.image} />
      )}

      <View style={styles.stats}>
        <Stat icon="thumbs-up-outline" value={formatCount(topic.likes)} />
        <Stat icon="eye-outline" value={formatCount(topic.views)} />
        <Stat icon="chatbubble-outline" value={formatCount(topic.replies)} />
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
    color: '#3558F0',
  },
  posterLine: {
    fontSize: 11,
    color: '#8A8A8A',
    marginTop: 1,
  },
  posterName: {
    fontWeight: '600',
    color: '#555',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
    lineHeight: 20,
  },
  desc: {
    fontSize: 12,
    color: '#666',
    lineHeight: 17,
  },
  image: {
    width: '100%',
    height: 140,
    borderRadius: 10,
    backgroundColor: '#EEEFF1',
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
