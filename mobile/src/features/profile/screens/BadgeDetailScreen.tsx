import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';

import type { MySpaceStackParamList } from '../../../navigation/types';
import { useThemeStore } from '../../../store/themeStore';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import { useAuthStore } from '../../../store/authStore';
import type { ThemeColors } from '../../../theme/tokens';
import { TopNavBack } from '../../../components/layout/TopNavBar';
import ErrorState from '../../../components/ui/ErrorState';
import EmptyState from '../components/EmptyState';
import { extractApiError } from '../../../services/api';
import { timeAgo, stripHtml } from '../utils/format';

import { getMyBadgeDetail, getUserBadgeDetail } from '../services/profileApi';
import type { UserBadgeLevelDto, BadgeDetailDto } from '../types';

// TODO: wire up an "Update priority" action when the backend ships a
// /my-badges/{id}/priority (or similar) endpoint. The live web has it but the
// public OpenAPI spec doesn't expose anything to set badge priority/featured
// status, so this screen is read-only for now.

type Props = NativeStackScreenProps<MySpaceStackParamList, 'BadgeDetail'>;

export default function BadgeDetailScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((s) => s.colors);
  const mode = useThemeStore((s) => s.mode);
  const styles = useThemedStyles(makeStyles);

  const badgeId = route.params?.badgeId;
  const viewedUserId = route.params?.userId;
  const authUserId = useAuthStore((s) => s.user?.userId);
  const isOwn = !viewedUserId || String(viewedUserId) === String(authUserId);

  const q = useQuery({
    queryKey: isOwn
      ? ['badge', 'me', String(badgeId)]
      : ['badge', 'user', String(viewedUserId), String(badgeId)],
    queryFn: () =>
      isOwn ? getMyBadgeDetail(badgeId!) : getUserBadgeDetail(viewedUserId!, badgeId!),
    enabled: !!badgeId,
    staleTime: 5 * 60 * 1000,
  });

  const badge = q.data?.badge;
  const levels = q.data?.badgeLevels ?? [];
  const statusBarStyle = mode === 'dark' ? 'light-content' : 'dark-content';

  return (
    <View style={styles.screen}>
      <StatusBar barStyle={statusBarStyle} />
      <TopNavBack title={badge?.name || 'Badge'} onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={{ padding: 14, paddingBottom: insets.bottom + 40 }}
      >
        {q.isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : q.isError ? (
          <ErrorState message={extractApiError(q.error)} onRetry={q.refetch} />
        ) : !badge ? (
          <EmptyState icon="ribbon-outline" title="Badge not found" />
        ) : (
          <>
            <Text style={styles.sectionLabel}>
              {levels.length === 0
                ? 'No levels yet'
                : `${levels.length} ${levels.length === 1 ? 'level earned' : 'levels earned'}`}
            </Text>

            {levels.length === 0 ? (
              <EmptyState
                icon="trophy-outline"
                title="Not earned yet"
                subtitle="Keep participating to earn levels of this badge."
              />
            ) : (
              <View style={styles.list}>
                {levels.map((l) => (
                  <LevelRow
                    key={String(l.badgeLevelId) + '_' + String(l.levelCounter)}
                    level={l}
                    badge={badge}
                    styles={styles}
                    colors={colors}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

interface RowProps {
  level: UserBadgeLevelDto;
  badge: BadgeDetailDto;
  styles: ReturnType<typeof makeStyles>;
  colors: ThemeColors;
}

// One earned level → one horizontal row. Image left, content right. Mirrors
// the live website's badge-detail layout. Author note / awarded-by /
// superseded indicators are kept but demoted to a small secondary line so we
// don't lose information that the live web doesn't show.
function LevelRow({ level, badge, styles, colors }: RowProps) {
  const imageUrl = level.thumbnailUrl || badge.thumbnailUrl;
  const title = level.title || badge.name;
  const summary = stripHtml(level.summary || badge.description || '');
  const ago = timeAgo(level.createdWhen);

  const extras: string[] = [];
  if (level.displayName) extras.push(`Awarded by ${level.displayName}`);
  if (level.authorNote) extras.push(stripHtml(level.authorNote));
  if (level.superSeeded) extras.push('Superseded by higher level');

  return (
    <View style={[styles.row, level.superSeeded && styles.rowSuperseded]}>
      <View style={styles.badgeImg}>
        {imageUrl ? (
          <Image
            source={imageUrl}
            style={{ width: '100%', height: '100%' }}
            contentFit="contain"
          />
        ) : (
          <Ionicons name="ribbon" size={36} color={colors.primary} />
        )}
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        {summary ? (
          <Text style={styles.summary} numberOfLines={3}>
            {summary}
          </Text>
        ) : null}
        {ago ? (
          <View style={styles.timeRow}>
            <Ionicons name="time-outline" size={13} color={colors.textTertiary} />
            <Text style={styles.timeText}>{ago}</Text>
          </View>
        ) : null}
        {extras.length > 0 ? (
          <Text style={styles.extras} numberOfLines={2}>
            {extras.join(' · ')}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    center: { paddingVertical: 48, alignItems: 'center' },

    sectionLabel: {
      fontSize: 11,
      fontWeight: '800',
      color: c.textTertiary,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      marginBottom: 10,
      paddingHorizontal: 4,
    },

    list: { gap: 10 },

    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 14,
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 14,
    },
    rowSuperseded: {
      opacity: 0.6,
    },
    badgeImg: {
      width: 76,
      height: 76,
      borderRadius: 38,
      backgroundColor: c.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    rowBody: {
      flex: 1,
      gap: 4,
    },
    title: {
      fontSize: 15,
      fontWeight: '800',
      color: c.text,
      letterSpacing: -0.2,
    },
    summary: {
      fontSize: 13,
      color: c.textSecondary,
      lineHeight: 18,
    },
    timeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 2,
    },
    timeText: {
      fontSize: 12,
      color: c.textTertiary,
      fontWeight: '600',
    },
    extras: {
      marginTop: 4,
      fontSize: 11,
      fontStyle: 'italic',
      color: c.textTertiary,
      lineHeight: 15,
    },
  });
}
