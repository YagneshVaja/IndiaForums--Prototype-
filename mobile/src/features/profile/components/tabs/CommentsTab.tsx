import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Linking } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useThemeStore } from '../../../../store/themeStore';
import type { ThemeColors } from '../../../../theme/tokens';
import type { MySpaceStackParamList } from '../../../../navigation/types';
import { useProfileTab } from '../../hooks/useProfileTab';
import TabShell from './TabShell';
import { fmtNum, stripHtml, timeAgo } from '../../utils/format';
import { parseShortTarget } from '../../../../services/api';

interface Props {
  userId: number | string;
  isOwn: boolean;
}

export default function CommentsTab({ userId, isOwn }: Props) {
  const [page, setPage] = useState(1);
  const q = useProfileTab({ tab: 'comments', userId, isOwn, page });
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const nav = useNavigation<NativeStackNavigationProp<MySpaceStackParamList>>();

  const data = q.data && q.data.kind === 'comments' ? q.data : null;
  const items = data?.items ?? [];

  const openComment = useCallback(
    (linkUrl: string | null, subject: string | null) => {
      if (!linkUrl) return;
      const target = parseShortTarget(linkUrl);
      if (target.kind === 'article') {
        nav.navigate('ArticleDetail', {
          id: target.articleId,
          title: subject ? stripHtml(subject) : undefined,
        });
      } else {
        // Galleries and external URLs have no MySpace destination — defer to
        // the system browser so the tap still does something.
        Linking.openURL(linkUrl).catch(() => {});
      }
    },
    [nav],
  );

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
            <Pressable
              key={String(c.commentId)}
              onPress={() => openComment(c.linkUrl, c.subject)}
              disabled={!c.linkUrl}
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            >
              {c.subject ? (
                <View style={styles.contextPill}>
                  <Ionicons
                    name="newspaper-outline"
                    size={11}
                    color={colors.primary}
                  />
                  <Text style={styles.contextLabel}>On</Text>
                  <Text style={styles.contextTitle} numberOfLines={1}>
                    {stripHtml(c.subject)}
                  </Text>
                </View>
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
            </Pressable>
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
    rowPressed: {
      opacity: 0.88,
    },
    contextPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      alignSelf: 'flex-start',
      paddingVertical: 3,
      paddingHorizontal: 8,
      borderRadius: 999,
      backgroundColor: c.primarySoft,
      maxWidth: '100%',
    },
    contextLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: c.primary,
      letterSpacing: 0.3,
      textTransform: 'uppercase',
    },
    contextTitle: {
      flexShrink: 1,
      fontSize: 11,
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
