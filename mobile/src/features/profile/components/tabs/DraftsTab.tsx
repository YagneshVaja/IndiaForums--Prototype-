import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../../../store/themeStore';
import { useThemedStyles } from '../../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../../theme/tokens';
import { useProfileTab } from '../../hooks/useProfileTab';
import TabShell from './TabShell';
import { fmtDate, stripHtml } from '../../utils/format';

interface Props {
  userId: number | string;
}

export default function DraftsTab({ userId }: Props) {
  const [page, setPage] = useState(1);
  const q = useProfileTab({ tab: 'drafts', userId, isOwn: true, page });
  const colors = useThemeStore((s) => s.colors);
  const styles = useThemedStyles(makeStyles);
  const data = q.data && q.data.kind === 'drafts' ? q.data : null;
  const items = data?.items ?? [];

  return (
    <TabShell
      isLoading={q.isLoading}
      isError={q.isError}
      error={q.error}
      onRetry={q.refetch}
      isEmpty={!q.isLoading && items.length === 0}
      emptyIcon="document-text-outline"
      emptyTitle="No drafts saved"
      emptySubtitle="Drafts of forum topics and replies you save will appear here."
      page={data?.page}
      totalPages={data?.totalPages}
      onPageChange={setPage}
    >
      <View style={styles.list}>
        {items.map((d) => (
          <Pressable
            key={String(d.forumDraftId)}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <View style={styles.head}>
              <Ionicons name="document-text-outline" size={14} color={colors.primary} />
              {d.forumName ? <Text style={styles.forum} numberOfLines={1}>{d.forumName}</Text> : null}
              <Text style={styles.date}>{fmtDate(d.createdWhen)}</Text>
            </View>
            <Text style={styles.title} numberOfLines={2}>{d.subject || '(Untitled draft)'}</Text>
            <Text style={styles.body} numberOfLines={3}>{stripHtml(d.message)}</Text>
          </Pressable>
        ))}
      </View>
    </TabShell>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    list: { gap: 10, paddingVertical: 8 },
    row: {
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 14,
      gap: 6,
    },
    pressed: { opacity: 0.88 },
    head: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    forum: {
      fontSize: 12,
      fontWeight: '700',
      color: c.primary,
      flex: 1,
    },
    date: {
      fontSize: 11,
      color: c.textTertiary,
    },
    title: {
      fontSize: 14,
      fontWeight: '700',
      color: c.text,
    },
    body: {
      fontSize: 12,
      color: c.textSecondary,
      lineHeight: 17,
    },
  });
}
