import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useThemeStore } from '../../../../store/themeStore';
import { useThemedStyles } from '../../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../../theme/tokens';
import type { MySpaceStackParamList } from '../../../../navigation/types';
import { useProfileTab } from '../../hooks/useProfileTab';
import TabShell from './TabShell';
import type { UserBadgeDto } from '../../types';

interface Props {
  userId: number | string;
  isOwn: boolean;
}

export default function BadgesTab({ userId, isOwn }: Props) {
  const q = useProfileTab({ tab: 'badges', userId, isOwn, page: 1 });
  const colors = useThemeStore((s) => s.colors);
  const styles = useThemedStyles(makeStyles);
  const nav = useNavigation<NativeStackNavigationProp<MySpaceStackParamList>>();
  const items = q.data && q.data.kind === 'badges' ? q.data.items : [];

  return (
    <TabShell
      isLoading={q.isLoading}
      isError={q.isError}
      error={q.error}
      onRetry={q.refetch}
      isEmpty={!q.isLoading && items.length === 0}
      emptyIcon="ribbon-outline"
      emptyTitle={isOwn ? 'No badges earned yet' : 'No badges to show'}
      emptySubtitle={isOwn ? 'Earn badges by participating in forums and activities.' : undefined}
    >
      <View style={styles.grid}>
        {items.map((b) => (
          <BadgeCard
            // Composite key — badgeLevelId alone isn't always unique when a
            // user has earned the same badge level multiple times.
            key={`badge-${String(b.badgeId)}-${String(b.badgeLevelId)}`}
            b={b}
            styles={styles}
            colors={colors}
            onPress={() =>
              nav.navigate('BadgeDetail', {
                badgeId: String(b.badgeId),
                userId: isOwn ? undefined : String(userId),
              })
            }
          />
        ))}
      </View>
    </TabShell>
  );
}

function BadgeCard({
  b,
  styles,
  colors,
  onPress,
}: {
  b: UserBadgeDto;
  styles: ReturnType<typeof makeStyles>;
  colors: ThemeColors;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.cell, pressed && styles.pressed]}
    >
      <View style={styles.badgeImg}>
        {b.thumbnailUrl ? (
          <Image source={b.thumbnailUrl} style={{ width: '100%', height: '100%' }} contentFit="contain" />
        ) : (
          <Ionicons name="ribbon-outline" size={32} color={colors.primary} />
        )}
      </View>
      <Text style={styles.name} numberOfLines={2}>{b.badgeName || b.name}</Text>
      {b.description ? (
        <Text style={styles.desc} numberOfLines={2}>{b.description}</Text>
      ) : null}
      <View style={styles.levelPill}>
        <Text style={styles.levelText}>Level {String(b.level)}</Text>
      </View>
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
      width: '48%',
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 14,
      alignItems: 'center',
      gap: 8,
    },
    pressed: { opacity: 0.88 },
    badgeImg: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: c.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    name: {
      fontSize: 13,
      fontWeight: '800',
      color: c.text,
      textAlign: 'center',
    },
    desc: {
      fontSize: 11,
      color: c.textTertiary,
      textAlign: 'center',
      lineHeight: 15,
    },
    levelPill: {
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: 999,
      backgroundColor: c.primarySoft,
    },
    levelText: {
      fontSize: 10,
      fontWeight: '800',
      color: c.primary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
  });
}
