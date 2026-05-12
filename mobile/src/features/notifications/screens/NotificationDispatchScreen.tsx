// mobile/src/features/notifications/screens/NotificationDispatchScreen.tsx
import React, { useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet, Pressable } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { MySpaceStackParamList } from '../../../navigation/types';
import { useThemeStore } from '../../../store/themeStore';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';
import { TopNavBack } from '../../../components/layout/TopNavBar';
import ErrorState from '../../../components/ui/ErrorState';
import { extractApiError, fetchTopicPosts } from '../../../services/api';

type Props = NativeStackScreenProps<MySpaceStackParamList, 'NotificationDispatch'>;

export default function NotificationDispatchScreen({ navigation, route }: Props) {
  const { topicId, focusPostId } = route.params;
  const colors = useThemeStore((s) => s.colors);
  const styles = useThemedStyles(makeStyles);

  const numericTopicId = Number(topicId);

  const q = useQuery({
    queryKey: ['notification-dispatch', 'topic', topicId],
    queryFn: () => fetchTopicPosts(numericTopicId, 1, 1),
    enabled: Number.isFinite(numericTopicId) && numericTopicId > 0,
    staleTime: 0,
  });

  useEffect(() => {
    const topic = q.data?.topicDetail;
    if (topic) {
      navigation.replace('TopicDetail', {
        topic,
        // jumpToLast surfaces the latest reply when no specific post is targeted.
        // Pass focusPostId via topic.focusPostId at the TopicDetail layer if/when
        // that screen learns to scroll to it (out of scope for this plan).
        jumpToLast: !focusPostId,
      });
    }
  }, [q.data?.topicDetail, focusPostId, navigation]);

  // If the topicId was malformed, fail straight to the Notifications list.
  useEffect(() => {
    if (!Number.isFinite(numericTopicId) || numericTopicId <= 0) {
      navigation.replace('Notifications');
    }
  }, [numericTopicId, navigation]);

  return (
    <View style={styles.screen}>
      <TopNavBack title="Opening…" onBack={() => navigation.goBack()} />
      <View style={styles.center}>
        {q.isError ? (
          <ErrorState message={extractApiError(q.error)} onRetry={q.refetch} />
        ) : (
          <>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.hint}>Loading the discussion…</Text>
            <Pressable
              onPress={() => navigation.replace('Notifications')}
              hitSlop={8}
              style={styles.skip}
            >
              <Text style={styles.skipText}>Open notifications instead</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 24 },
    hint: { fontSize: 13, color: c.textSecondary },
    skip: { paddingTop: 12 },
    skipText: { fontSize: 13, color: c.primary, fontWeight: '700' },
  });
}
