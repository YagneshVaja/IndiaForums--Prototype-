import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import type { MovieDiscussionTopic, ForumTopic } from '../../../services/api';
import type { HomeStackParamList } from '../../../navigation/types';

type Nav = NativeStackNavigationProp<HomeStackParamList>;

interface Props {
  topic: MovieDiscussionTopic;
}

/**
 * TopicDetailScreen reads `topic.id` for the post fetch and merges
 * `firstPage.topicDetail` over the route param when posts arrive, so we
 * synthesise a stub with sensible empty defaults — matching the pattern in
 * features/search/hooks/useEntityNavigator.synthesizeForumTopic.
 */
function synthesiseForumTopic(t: MovieDiscussionTopic): ForumTopic {
  return {
    id: t.topicId,
    forumId: 0,
    forumName: '',
    forumThumbnail: null,
    title: t.title,
    description: '',
    poster: '',
    lastBy: '',
    time: '',
    lastTime: '',
    replies: 0,
    views: 0,
    likes: 0,
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
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const handlePress = () => {
    navigation.navigate('TopicDetail', { topic: synthesiseForumTopic(topic) });
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      accessibilityRole="button"
      accessibilityLabel={topic.title}
    >
      <View style={styles.iconWrap}>
        <Ionicons name="chatbubbles-outline" size={18} color={colors.primary} />
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={3}>{topic.title}</Text>
        <Text style={styles.host}>Forum thread</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
    </Pressable>
  );
}

const DiscussionTopicRow = React.memo(DiscussionTopicRowImpl);
export default DiscussionTopicRow;

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    rowPressed: { opacity: 0.7 },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: c.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    body: { flex: 1 },
    title: {
      fontSize: 13.5,
      fontWeight: '700',
      color: c.text,
      lineHeight: 18,
    },
    host: {
      marginTop: 3,
      fontSize: 11,
      color: c.textTertiary,
    },
  });
}
