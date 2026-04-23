import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../../../store/themeStore';
import type { ThemeColors } from '../../../../theme/tokens';
import { useProfileTab } from '../../hooks/useProfileTab';
import TabShell from './TabShell';
import type { MyPostTopicDto } from '../../types';
import { timeAgo, fmtNum, stripHtml } from '../../utils/format';

interface Props {
  userId: number | string;
  isOwn: boolean;
}

export default function PostsTab({ userId, isOwn }: Props) {
  const [page, setPage] = useState(1);
  const q = useProfileTab({ tab: 'posts', userId, isOwn, page });
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const data = q.data && q.data.kind === 'posts' ? q.data : null;
  const items = data?.items ?? [];

  return (
    <TabShell
      isLoading={q.isLoading}
      isError={q.isError}
      error={q.error}
      onRetry={q.refetch}
      isEmpty={!q.isLoading && items.length === 0}
      emptyIcon="chatbubbles-outline"
      emptyTitle={isOwn ? "You haven't posted yet" : 'No posts to show'}
      emptySubtitle={isOwn ? 'Topics you post or reply in will appear here.' : undefined}
      page={data?.page}
      totalPages={data?.totalPages}
      onPageChange={setPage}
    >
      <View style={styles.list}>
        {items.map((t) => (
          <TopicRow key={String(t.topicId)} t={t} styles={styles} colors={colors} />
        ))}
      </View>
    </TabShell>
  );
}

export function TopicRow({
  t,
  styles,
  colors,
}: {
  t: MyPostTopicDto;
  styles: ReturnType<typeof makeStyles>;
  colors: ThemeColors;
}) {
  const desc = stripHtml(t.topicDesc);
  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      <View style={styles.rowHead}>
        {t.forumName ? (
          <View style={styles.forumPill}>
            <Ionicons name="folder-outline" size={11} color={colors.primary} />
            <Text style={styles.forumPillText} numberOfLines={1}>{t.forumName}</Text>
          </View>
        ) : null}
        {t.locked ? <Ionicons name="lock-closed" size={12} color={colors.textTertiary} /> : null}
      </View>
      <Text style={styles.title} numberOfLines={2}>{t.subject}</Text>
      {desc ? (
        <Text style={styles.desc} numberOfLines={2}>{desc}</Text>
      ) : null}
      <View style={styles.metaRow}>
        <Text style={styles.meta}>💬 {fmtNum(t.replyCount)}</Text>
        <Text style={styles.meta}>👁 {fmtNum(t.viewCount)}</Text>
        {t.likeCount != null ? <Text style={styles.meta}>♥ {fmtNum(t.likeCount)}</Text> : null}
        <Text style={styles.metaTime}>{timeAgo(t.lastThreadDate)}</Text>
      </View>
    </Pressable>
  );
}

export function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    list: {
      gap: 10,
      paddingVertical: 8,
    },
    row: {
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 14,
      gap: 6,
    },
    rowPressed: {
      opacity: 0.88,
    },
    rowHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    forumPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
      backgroundColor: c.primarySoft,
      maxWidth: '80%',
    },
    forumPillText: {
      fontSize: 10,
      fontWeight: '700',
      color: c.primary,
      letterSpacing: 0.2,
    },
    title: {
      fontSize: 14,
      fontWeight: '700',
      color: c.text,
      lineHeight: 19,
    },
    desc: {
      fontSize: 12,
      color: c.textSecondary,
      lineHeight: 17,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginTop: 4,
    },
    meta: {
      fontSize: 11,
      color: c.textTertiary,
      fontWeight: '600',
    },
    metaTime: {
      fontSize: 11,
      color: c.textTertiary,
      marginLeft: 'auto',
    },
  });
}
