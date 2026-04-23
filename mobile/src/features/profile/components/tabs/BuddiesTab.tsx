import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useThemeStore } from '../../../../store/themeStore';
import type { ThemeColors } from '../../../../theme/tokens';
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
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const data = q.data && q.data.kind === 'buddies' ? q.data : null;
  const items = data?.items ?? [];

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
          <BuddyCell key={String(b.userId)} b={b} styles={styles} />
        ))}
      </View>
    </TabShell>
  );
}

function BuddyCell({ b, styles }: { b: BuddyDto; styles: ReturnType<typeof makeStyles> }) {
  const name = b.realName || b.userName;
  return (
    <Pressable style={({ pressed }) => [styles.cell, pressed && styles.cellPressed]}>
      <Avatar
        url={b.thumbnailUrl}
        userId={b.userId}
        updateChecksum={b.updateChecksum}
        avatarType={b.avatarType}
        name={name}
        size={56}
      />
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
