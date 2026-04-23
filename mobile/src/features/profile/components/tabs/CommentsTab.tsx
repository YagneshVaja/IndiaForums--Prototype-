import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../../../store/themeStore';
import type { ThemeColors } from '../../../../theme/tokens';
import { useProfileTab } from '../../hooks/useProfileTab';
import TabShell from './TabShell';
import { fmtNum, stripHtml, timeAgo } from '../../utils/format';

interface Props {
  userId: number | string;
  isOwn: boolean;
}

export default function CommentsTab({ userId, isOwn }: Props) {
  const [page, setPage] = useState(1);
  const q = useProfileTab({ tab: 'comments', userId, isOwn, page });
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const data = q.data && q.data.kind === 'comments' ? q.data : null;
  const items = data?.items ?? [];

  return (
    <TabShell
      isLoading={q.isLoading}
      isError={q.isError}
      error={q.error}
      onRetry={q.refetch}
      isEmpty={!q.isLoading && items.length === 0}
      emptyIcon="chatbox-outline"
      emptyTitle={isOwn ? 'No comments yet' : 'No comments to show'}
      page={data?.page}
      totalPages={data?.totalPages}
      onPageChange={setPage}
    >
      <View style={styles.list}>
        {items.map((c) => {
          const body = stripHtml(c.contents);
          return (
            <View key={String(c.commentId)} style={styles.row}>
              {c.subject ? (
                <Text style={styles.subject} numberOfLines={1}>
                  {stripHtml(c.subject)}
                </Text>
              ) : null}
              <Text style={styles.body} numberOfLines={5}>
                {body}
              </Text>
              {c.imageUrl ? (
                <Image source={c.imageUrl} style={styles.image} contentFit="cover" />
              ) : null}
              <View style={styles.metaRow}>
                <Ionicons name="heart-outline" size={12} color={colors.textTertiary} />
                <Text style={styles.meta}>{fmtNum(c.likeCount)}</Text>
                <Ionicons name="chatbubble-outline" size={12} color={colors.textTertiary} />
                <Text style={styles.meta}>{fmtNum(c.replyCount)}</Text>
                <Text style={styles.metaTime}>{timeAgo(c.createdWhen)}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </TabShell>
  );
}

function makeStyles(c: ThemeColors) {
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
    subject: {
      fontSize: 12,
      fontWeight: '700',
      color: c.primary,
    },
    body: {
      fontSize: 13,
      color: c.text,
      lineHeight: 19,
    },
    image: {
      width: '100%',
      height: 140,
      borderRadius: 8,
      marginTop: 4,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 4,
    },
    meta: {
      fontSize: 11,
      color: c.textTertiary,
      fontWeight: '600',
      marginRight: 6,
    },
    metaTime: {
      fontSize: 11,
      color: c.textTertiary,
      marginLeft: 'auto',
    },
  });
}
