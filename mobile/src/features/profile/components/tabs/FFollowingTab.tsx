import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useThemeStore } from '../../../../store/themeStore';
import type { ThemeColors } from '../../../../theme/tokens';
import type { MySpaceStackParamList } from '../../../../navigation/types';
import { useProfileTab } from '../../hooks/useProfileTab';
import TabShell from './TabShell';
import Avatar from '../Avatar';
import type { FollowingDto, FollowerDto } from '../../types';

interface Props {
  userId: number | string;
  variant: 'following' | 'followers';
}

export default function FFollowingTab({ userId, variant }: Props) {
  const [page, setPage] = useState(1);
  const tab = variant === 'following' ? 'ff-following' : 'ff-followers';
  const q = useProfileTab({ tab, userId, isOwn: true, page });
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const nav = useNavigation<NativeStackNavigationProp<MySpaceStackParamList>>();

  const data = q.data;
  const items: (FollowingDto | FollowerDto)[] =
    data?.kind === 'ff-following' || data?.kind === 'ff-followers' ? data.items : [];

  return (
    <TabShell
      isLoading={q.isLoading}
      isError={q.isError}
      error={q.error}
      onRetry={q.refetch}
      isEmpty={!q.isLoading && items.length === 0}
      emptyIcon="people-circle-outline"
      emptyTitle={variant === 'following' ? 'Not following any FF authors' : 'No FF fans yet'}
      emptySubtitle={
        variant === 'following'
          ? 'Follow fan fiction authors to get updates on new chapters.'
          : 'Users who follow your fan fictions will appear here.'
      }
      page={data && 'page' in data ? data.page : undefined}
      totalPages={data && 'totalPages' in data ? data.totalPages : undefined}
      onPageChange={setPage}
    >
      <View style={styles.list}>
        {items.map((u) => (
          <Pressable
            key={String(u.userId)}
            onPress={() => nav.push('Profile', { userId: String(u.userId) })}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <Avatar
              url={u.avatarUrl}
              userId={u.userId}
              updateChecksum={u.updateChecksum}
              avatarType={u.avatarType}
              name={u.displayName || u.userName}
              size={44}
            />
            <View style={styles.body}>
              <Text style={styles.name} numberOfLines={1}>
                {u.displayName || u.userName}
              </Text>
              {u.userName !== (u.displayName || u.userName) ? (
                <Text style={styles.handle} numberOfLines={1}>@{u.userName}</Text>
              ) : null}
            </View>
          </Pressable>
        ))}
      </View>
    </TabShell>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    list: { gap: 8, paddingVertical: 8 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 12,
      gap: 12,
    },
    pressed: { opacity: 0.88 },
    body: {
      flex: 1,
      gap: 2,
    },
    name: {
      fontSize: 14,
      fontWeight: '700',
      color: c.text,
    },
    handle: {
      fontSize: 12,
      color: c.textTertiary,
    },
  });
}
