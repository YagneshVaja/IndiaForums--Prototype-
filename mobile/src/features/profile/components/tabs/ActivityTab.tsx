import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../../../store/themeStore';
import type { ThemeColors } from '../../../../theme/tokens';
import { useProfileTab } from '../../hooks/useProfileTab';
import type { ActivityDto } from '../../types';
import TabShell from './TabShell';
import { stripHtml, timeAgo } from '../../utils/format';
import WallComposerSheet from '../../../activities/components/WallComposerSheet';

interface Props {
  userId: number | string;
  isOwn: boolean;
  viewedUserName?: string;
}

// Feed type codes → label + accent color (matches web prototype).
const FEED_META: Record<number, { label: string; accent: string }> = {
  38: { label: 'Update', accent: '#3558F0' },
  16: { label: 'Testimonial', accent: '#16A96B' },
  17: { label: 'Slambook', accent: '#7C5CE9' },
  18: { label: 'Scrapbook', accent: '#B26A00' },
};

export default function ActivityTab({ userId, isOwn, viewedUserName }: Props) {
  const q = useProfileTab({ tab: 'activity', userId, isOwn, page: 1 });
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [composerOpen, setComposerOpen] = useState(false);
  const items: ActivityDto[] =
    q.data && q.data.kind === 'activity' ? q.data.items : [];

  return (
    <>
      {/* When viewing someone else's wall, show a compose button up top. */}
      {!isOwn ? (
        <Pressable
          onPress={() => setComposerOpen(true)}
          style={({ pressed }) => [styles.composeBtn, pressed && styles.pressed]}
        >
          <Ionicons name="create-outline" size={16} color={colors.primary} />
          <Text style={styles.composeBtnText}>Write on wall</Text>
        </Pressable>
      ) : null}

      <TabShell
        isLoading={q.isLoading}
        isError={q.isError}
        error={q.error}
        onRetry={q.refetch}
        isEmpty={items.length === 0}
        emptyIcon="pulse-outline"
        emptyTitle={isOwn ? 'No activity yet' : 'No activity to show'}
        emptySubtitle={
          isOwn ? 'Your wall updates, testimonials, and posts will appear here.' : undefined
        }
      >
        <View style={styles.list}>
          {items.map((a) => (
            <ActivityCard key={String(a.activityId)} a={a} styles={styles} />
          ))}
        </View>
      </TabShell>

      {!isOwn ? (
        <WallComposerSheet
          visible={composerOpen}
          onClose={() => setComposerOpen(false)}
          wallUserId={userId}
          wallUserName={viewedUserName || 'user'}
        />
      ) : null}
    </>
  );
}

function ActivityCard({
  a,
  styles,
}: {
  a: ActivityDto;
  styles: ReturnType<typeof makeStyles>;
}) {
  const feedId = typeof a.feedTypeId === 'string' ? parseInt(a.feedTypeId, 10) : a.feedTypeId;
  const meta = FEED_META[feedId] || { label: 'Activity', accent: '#555555' };
  const body = stripHtml(a.content || a.subject);
  return (
    <View style={[styles.card, { borderLeftColor: meta.accent }]}>
      <View style={styles.cardHeader}>
        <View style={[styles.pill, { backgroundColor: meta.accent + '22' }]}>
          <Text style={[styles.pillText, { color: meta.accent }]}>{meta.label}</Text>
        </View>
        <Text style={styles.time}>{timeAgo(a.publishedWhen)}</Text>
      </View>
      {a.subject ? (
        <Text style={styles.subject} numberOfLines={2}>
          {stripHtml(a.subject)}
        </Text>
      ) : null}
      {body ? (
        <Text style={styles.body} numberOfLines={4}>
          {body}
        </Text>
      ) : null}
      {a.imageUrl ? (
        <Image source={a.imageUrl} style={styles.image} contentFit="cover" />
      ) : null}
      <View style={styles.metaRow}>
        {a.likeCount != null ? (
          <Text style={styles.meta}>♥ {String(a.likeCount)}</Text>
        ) : null}
        {a.commentCount != null ? (
          <Text style={styles.meta}>💬 {String(a.commentCount)}</Text>
        ) : null}
      </View>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    composeBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: c.primarySoft,
      borderWidth: 1,
      borderColor: c.primary,
      marginTop: 8,
    },
    composeBtnText: {
      fontSize: 13,
      fontWeight: '800',
      color: c.primary,
      letterSpacing: 0.3,
    },
    pressed: { opacity: 0.88 },
    list: {
      gap: 10,
      paddingVertical: 8,
    },
    card: {
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 14,
      borderLeftWidth: 4,
      gap: 8,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    pill: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
    },
    pillText: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    time: {
      fontSize: 11,
      color: c.textTertiary,
    },
    subject: {
      fontSize: 14,
      fontWeight: '700',
      color: c.text,
    },
    body: {
      fontSize: 13,
      color: c.textSecondary,
      lineHeight: 19,
    },
    image: {
      width: '100%',
      height: 160,
      borderRadius: 10,
      marginTop: 4,
    },
    metaRow: {
      flexDirection: 'row',
      gap: 14,
      marginTop: 2,
    },
    meta: {
      fontSize: 12,
      color: c.textTertiary,
      fontWeight: '600',
    },
  });
}
