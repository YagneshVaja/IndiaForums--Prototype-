import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../../store/themeStore';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';
import type { MovieDiscussionTopic, ForumTopic } from '../../../services/api';
import type { HomeStackParamList } from '../../../navigation/types';

type Nav = NativeStackNavigationProp<HomeStackParamList>;

interface Props {
  topic: MovieDiscussionTopic;
}

// TopicDetailScreen reads `topic.id` and merges firstPage.topicDetail over the
// route param, so a stub with sensible empty defaults is enough to navigate.
function synthesiseForumTopic(t: MovieDiscussionTopic): ForumTopic {
  return {
    id: t.topicId,
    forumId: 0,
    forumName: '',
    forumThumbnail: null,
    title: t.title,
    description: t.summary ?? '',
    poster: '',
    posterId: 0,
    lastBy: '',
    lastById: 0,
    time: '',
    lastTime: '',
    replies: 0,
    views: 0,
    likes: 0,
    userCount: 0,
    locked: false,
    pinned: false,
    flairId: 0,
    topicImage: null,
    tags: [],
    linkTypeValue: '',
    poll: null,
  };
}

function DiscussionTopicRowImpl({ topic }: Props) {
  const navigation = useNavigation<Nav>();
  const colors = useThemeStore((s) => s.colors);
  const styles = useThemedStyles(makeStyles);

  const handlePress = () => {
    navigation.navigate('TopicDetail', { topic: synthesiseForumTopic(topic) });
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      accessibilityRole="button"
      accessibilityLabel={topic.title}
    >
      <View style={styles.accentBar} />
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>{topic.title}</Text>
        {topic.summary ? (
          <Text style={styles.summary} numberOfLines={2}>{topic.summary}</Text>
        ) : null}
        <View style={styles.metaRow}>
          <Ionicons name="chatbubbles-outline" size={12} color={colors.primary} />
          <Text style={styles.metaText}>Forum thread · Tap to read</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
    </Pressable>
  );
}

const DiscussionTopicRow = React.memo(DiscussionTopicRowImpl);
export default DiscussionTopicRow;

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginHorizontal: 14,
      marginBottom: 8,
      padding: 12,
      borderRadius: 12,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
    },
    cardPressed: { opacity: 0.7, transform: [{ scale: 0.99 }] },
    accentBar: {
      width: 3,
      alignSelf: 'stretch',
      borderRadius: 2,
      backgroundColor: c.primary,
    },
    body: { flex: 1 },
    title: {
      fontSize: 14,
      fontWeight: '800',
      color: c.text,
      lineHeight: 19,
    },
    summary: {
      marginTop: 4,
      fontSize: 12.5,
      lineHeight: 17,
      color: c.textSecondary,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 8,
    },
    metaText: {
      fontSize: 11,
      fontWeight: '700',
      color: c.primary,
      letterSpacing: 0.2,
    },
  });
}
