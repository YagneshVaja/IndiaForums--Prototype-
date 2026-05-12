import React, { useCallback, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useThemeStore } from '../../../../store/themeStore';
import { useThemedStyles } from '../../../../theme/useThemedStyles';
import type { MySpaceStackParamList } from '../../../../navigation/types';
import { useProfileTab } from '../../hooks/useProfileTab';
import TabShell from './TabShell';
import { TopicRow, makeStyles } from './PostsTab';
import type { MyPostTopicDto } from '../../types';
import { topicFromMyPostDto } from '../../utils/navAdapters';

interface Props {
  userId: number | string;
}

export default function WatchingTab({ userId }: Props) {
  const [page, setPage] = useState(1);
  const q = useProfileTab({ tab: 'watching', userId, isOwn: true, page });
  const colors = useThemeStore((s) => s.colors);
  const styles = useThemedStyles(makeStyles);
  const nav = useNavigation<NativeStackNavigationProp<MySpaceStackParamList>>();
  const data = q.data && q.data.kind === 'watching' ? q.data : null;
  const items = data?.items ?? [];

  const openTopic = useCallback(
    (t: MyPostTopicDto) =>
      nav.navigate('TopicDetail', { topic: topicFromMyPostDto(t) }),
    [nav],
  );

  return (
    <TabShell
      isLoading={q.isLoading}
      isError={q.isError}
      error={q.error}
      onRetry={q.refetch}
      isEmpty={!q.isLoading && items.length === 0}
      emptyIcon="eye-outline"
      emptyTitle="Not watching any topics"
      emptySubtitle="Topics you watch will appear here for quick access."
      page={data?.page}
      totalPages={data?.totalPages}
      onPageChange={setPage}
    >
      <View style={localStyles.list}>
        {items.map((t) => (
          <TopicRow
            key={String(t.topicId)}
            t={t}
            styles={styles}
            colors={colors}
            onPress={() => openTopic(t)}
          />
        ))}
      </View>
    </TabShell>
  );
}

const localStyles = StyleSheet.create({
  list: { gap: 10, paddingVertical: 8 },
});
