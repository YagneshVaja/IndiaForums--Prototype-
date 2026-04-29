import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useThemeStore } from '../../../../store/themeStore';
import type { ThemeColors } from '../../../../theme/tokens';
import type { MySpaceStackParamList } from '../../../../navigation/types';
import { useProfileTab } from '../../hooks/useProfileTab';
import TabShell from './TabShell';
import type { MyForumDto, InvitedForumDto } from '../../types';
import { fmtNum } from '../../utils/format';
import { forumFromMyForumDto } from '../../utils/navAdapters';
import { useForumFollowStore } from '../../../forums/store/forumFollowStore';

interface Props {
  userId: number | string;
  isOwn: boolean;
}

export default function ForumsTab({ userId, isOwn }: Props) {
  const [page, setPage] = useState(1);
  const q = useProfileTab({ tab: 'forums', userId, isOwn, page });
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const nav = useNavigation<NativeStackNavigationProp<MySpaceStackParamList>>();
  const followOverrides = useForumFollowStore((s) => s.byForumId);
  const data = q.data && q.data.kind === 'forums' ? q.data : null;
  const rawItems = data?.items ?? [];

  const openForum = useCallback(
    (f: MyForumDto) =>
      nav.navigate('ForumThread', { forum: forumFromMyForumDto(f) }),
    [nav],
  );
  // Optimistically hide forums the (own) user just unfollowed.
  const items = useMemo(() => {
    if (!isOwn) return rawItems;
    return rawItems.filter(
      (f) => followOverrides[Number(f.forumId)]?.isFollowing !== false,
    );
  }, [rawItems, followOverrides, isOwn]);
  const invited = data?.invited ?? [];
  const requested = data?.requested ?? [];
  const isEmpty = !q.isLoading && items.length === 0 && invited.length === 0 && requested.length === 0;

  return (
    <TabShell
      isLoading={q.isLoading}
      isError={q.isError}
      error={q.error}
      onRetry={q.refetch}
      isEmpty={isEmpty}
      emptyIcon="folder-open-outline"
      emptyTitle={isOwn ? 'You have not joined any forums' : 'No favourite forums'}
      emptySubtitle={isOwn ? 'Follow forums from the Forums tab to see them here.' : undefined}
      page={data?.page}
      totalPages={data?.totalPages}
      onPageChange={setPage}
    >
      {isOwn && requested.length > 0 ? (
        <Section title="Requested">
          {requested.map((f, i) => (
            <InvitedRow
              key={`requested-${String(f.forumId)}-${i}`}
              f={f}
              styles={styles}
              kind="requested"
            />
          ))}
        </Section>
      ) : null}
      {isOwn && invited.length > 0 ? (
        <Section title="Invited">
          {invited.map((f, i) => (
            <InvitedRow
              key={`invited-${String(f.forumId)}-${i}`}
              f={f}
              styles={styles}
              kind="invited"
            />
          ))}
        </Section>
      ) : null}
      {items.length > 0 ? (
        <Section title={isOwn ? 'Following' : 'Favourites'}>
          {items.map((f, i) => (
            <ForumRow
              key={`forum-${String(f.forumId)}-${i}`}
              f={f}
              styles={styles}
              colors={colors}
              onPress={() => openForum(f)}
            />
          ))}
        </Section>
      ) : null}
    </TabShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const colors = useThemeStore((s) => s.colors);
  return (
    <View style={{ marginTop: 12, gap: 8 }}>
      <Text
        style={{
          fontSize: 11,
          fontWeight: '800',
          color: colors.textTertiary,
          letterSpacing: 0.6,
          textTransform: 'uppercase',
          paddingHorizontal: 4,
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

function ForumRow({
  f,
  styles,
  colors,
  onPress,
}: {
  f: MyForumDto;
  styles: ReturnType<typeof makeStyles>;
  colors: ThemeColors;
  onPress?: () => void;
}) {
  const override = useForumFollowStore((s) => s.byForumId[Number(f.forumId)]);
  const followCount = override?.countOverride ?? Number(f.followCount);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.thumbWrap}>
        {f.thumbnailUrl ? (
          <Image source={f.thumbnailUrl} style={styles.thumb} contentFit="cover" />
        ) : (
          <View style={[styles.thumb, styles.thumbFallback]}>
            <Ionicons name="folder-outline" size={22} color={colors.primary} />
          </View>
        )}
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={1}>{f.forumName}</Text>
        {f.forumDescription ? (
          <Text style={styles.rowDesc} numberOfLines={2}>{f.forumDescription}</Text>
        ) : null}
        <View style={styles.metaRow}>
          <Text style={styles.meta}>👥 {fmtNum(followCount)}</Text>
          <Text style={styles.meta}>🧵 {fmtNum(f.topicsCount)}</Text>
          <Text style={styles.meta}>💬 {fmtNum(f.postsCount)}</Text>
        </View>
      </View>
    </Pressable>
  );
}

function InvitedRow({
  f,
  styles,
  kind,
}: {
  f: InvitedForumDto;
  styles: ReturnType<typeof makeStyles>;
  kind: 'invited' | 'requested';
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle} numberOfLines={1}>{f.forumName}</Text>
        <Text style={styles.rowDesc}>
          {kind === 'invited' ? 'You have been invited to join.' : 'Awaiting approval.'}
        </Text>
      </View>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 12,
      gap: 12,
      alignItems: 'center',
    },
    pressed: { opacity: 0.88 },
    thumbWrap: { flexShrink: 0 },
    thumb: {
      width: 48,
      height: 48,
      borderRadius: 10,
      backgroundColor: c.surface,
    },
    thumbFallback: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowBody: {
      flex: 1,
      gap: 3,
    },
    rowTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: c.text,
    },
    rowDesc: {
      fontSize: 12,
      color: c.textSecondary,
      lineHeight: 17,
    },
    metaRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 2,
    },
    meta: {
      fontSize: 11,
      color: c.textTertiary,
      fontWeight: '600',
    },
  });
}
