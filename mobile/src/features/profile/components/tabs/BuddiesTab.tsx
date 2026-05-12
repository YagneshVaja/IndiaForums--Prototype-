import React, { useCallback, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useThemedStyles } from '../../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../../theme/tokens';
import type { MySpaceStackParamList } from '../../../../navigation/types';
import { useProfileTab } from '../../hooks/useProfileTab';
import TabShell from './TabShell';
import Avatar from '../Avatar';
import type { BuddyDto } from '../../types';

interface Props {
  userId: number | string;
  isOwn: boolean;
}

export default function BuddiesTab({ userId, isOwn }: Props) {
  const [page, setPage] = useState(1);
  const q = useProfileTab({ tab: 'buddies', userId, isOwn, page });
  const styles = useThemedStyles(makeStyles);
  const nav = useNavigation<NativeStackNavigationProp<MySpaceStackParamList>>();

  const data = q.data && q.data.kind === 'buddies' ? q.data : null;
  const items = data?.items ?? [];

  const openProfile = useCallback(
    (b: BuddyDto) => nav.push('Profile', { userId: String(b.userId) }),
    [nav],
  );

  return (
    <TabShell
      isLoading={q.isLoading}
      isError={q.isError}
      error={q.error}
      onRetry={q.refetch}
      isEmpty={!q.isLoading && items.length === 0}
      emptyIcon="people-outline"
      emptyTitle={isOwn ? 'You have no buddies yet' : 'No buddies to show'}
      emptySubtitle={isOwn ? 'Add friends to stay connected with them.' : undefined}
      page={data?.page}
      totalPages={data?.totalPages}
      onPageChange={setPage}
    >
      <View style={styles.grid}>
        {items.map((b) => (
          <BuddyCell
            key={String(b.userId)}
            b={b}
            styles={styles}
            onPress={() => openProfile(b)}
          />
        ))}
      </View>
    </TabShell>
  );
}

function BuddyCell({
  b,
  styles,
  onPress,
}: {
  b: BuddyDto;
  styles: ReturnType<typeof makeStyles>;
  onPress?: () => void;
}) {
  const name = b.realName || b.userName;
  const isOnline = (() => {
    if (!b.lastVisitedDate) return false;
    const t = new Date(b.lastVisitedDate).getTime();
    return !isNaN(t) && Date.now() - t < 24 * 60 * 60 * 1000;
  })();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.cell, pressed && styles.cellPressed]}
    >
      <View style={styles.avatarBox}>
        <Avatar
          url={b.thumbnailUrl}
          userId={b.userId}
          updateChecksum={b.updateChecksum}
          avatarType={b.avatarType}
          name={name}
          size={56}
        />
        {isOnline ? <View style={styles.onlineDot} /> : null}
      </View>
      <Text style={styles.name} numberOfLines={1}>{name}</Text>
      {b.groupName ? <Text style={styles.rank} numberOfLines={1}>{b.groupName}</Text> : null}
    </Pressable>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      paddingVertical: 8,
    },
    cell: {
      width: '31%',
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 12,
      alignItems: 'center',
      gap: 6,
    },
    cellPressed: {
      opacity: 0.88,
    },
    avatarBox: {
      position: 'relative',
    },
    onlineDot: {
      position: 'absolute',
      right: 0,
      bottom: 0,
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: c.success,
      borderWidth: 2,
      borderColor: c.card,
    },
    name: {
      fontSize: 12,
      fontWeight: '700',
      color: c.text,
      textAlign: 'center',
      width: '100%',
    },
    rank: {
      fontSize: 10,
      color: c.textTertiary,
      textAlign: 'center',
      width: '100%',
    },
  });
}
