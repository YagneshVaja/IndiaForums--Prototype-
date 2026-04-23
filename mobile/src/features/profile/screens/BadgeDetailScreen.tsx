import React, { useMemo } from 'react';
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
import { useAuthStore } from '../../../store/authStore';
import type { ThemeColors } from '../../../theme/tokens';
import { TopNavBack } from '../../../components/layout/TopNavBar';
import ErrorState from '../../../components/ui/ErrorState';
import EmptyState from '../components/EmptyState';
import { extractApiError } from '../../../services/api';
import { fmtDate, stripHtml } from '../utils/format';

import { getMyBadgeDetail, getUserBadgeDetail } from '../services/profileApi';

type Props = NativeStackScreenProps<MySpaceStackParamList, 'BadgeDetail'>;

export default function BadgeDetailScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((s) => s.colors);
  const mode = useThemeStore((s) => s.mode);
  const styles = useMemo(() => makeStyles(colors), [colors]);

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
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}
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
            {/* Hero */}
            <View style={styles.hero}>
              <View style={styles.badgeImg}>
                {badge.thumbnailUrl ? (
                  <Image
                    source={badge.thumbnailUrl}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="contain"
                  />
                ) : (
                  <Ionicons name="ribbon" size={56} color={colors.primary} />
                )}
              </View>
              <Text style={styles.name}>{badge.name}</Text>
              {badge.description ? (
                <Text style={styles.desc}>{stripHtml(badge.description)}</Text>
              ) : null}

              <View style={styles.pills}>
                <View style={styles.pill}>
                  <Text style={styles.pillText}>Level {String(badge.level)}</Text>
                </View>
                {Number(badge.points) > 0 ? (
                  <View style={styles.pillAlt}>
                    <Text style={styles.pillAltText}>{String(badge.points)} pts</Text>
                  </View>
                ) : null}
                {badge.isRepeatable ? (
                  <View style={styles.pillAlt}>
                    <Text style={styles.pillAltText}>Repeatable</Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* Levels earned */}
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
                  <View
                    key={String(l.badgeLevelId) + '_' + String(l.levelCounter)}
                    style={[styles.levelCard, l.superSeeded && styles.levelCardSuperseded]}
                  >
                    <View style={styles.levelHead}>
                      <View style={styles.levelPill}>
                        <Text style={styles.levelPillText}>Level {String(l.level)}</Text>
                      </View>
                      <Text style={styles.levelDate}>{fmtDate(l.createdWhen)}</Text>
                    </View>
                    {l.title ? (
                      <Text style={styles.levelTitle} numberOfLines={2}>
                        {l.title}
                      </Text>
                    ) : null}
                    {l.summary ? (
                      <Text style={styles.levelBody} numberOfLines={4}>
                        {stripHtml(l.summary)}
                      </Text>
                    ) : null}
                    {l.authorNote ? (
                      <Text style={styles.levelNote}>{stripHtml(l.authorNote)}</Text>
                    ) : null}
                    {l.displayName ? (
                      <Text style={styles.levelBy}>Awarded by {l.displayName}</Text>
                    ) : null}
                    {l.superSeeded ? (
                      <Text style={styles.supersededText}>Superseded by higher level</Text>
                    ) : null}
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    center: { paddingVertical: 48, alignItems: 'center' },

    hero: {
      alignItems: 'center',
      paddingVertical: 20,
      paddingHorizontal: 16,
      gap: 10,
      backgroundColor: c.card,
      borderRadius: 16,
      marginBottom: 20,
    },
    badgeImg: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: c.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      marginBottom: 4,
    },
    name: {
      fontSize: 20,
      fontWeight: '800',
      color: c.text,
      textAlign: 'center',
      letterSpacing: -0.3,
    },
    desc: {
      fontSize: 13,
      color: c.textSecondary,
      textAlign: 'center',
      lineHeight: 19,
      paddingHorizontal: 8,
    },
    pills: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 6,
      marginTop: 6,
    },
    pill: {
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: c.primarySoft,
    },
    pillText: {
      fontSize: 11,
      fontWeight: '800',
      color: c.primary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    pillAlt: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    pillAltText: {
      fontSize: 10,
      fontWeight: '700',
      color: c.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },

    sectionLabel: {
      fontSize: 11,
      fontWeight: '800',
      color: c.textTertiary,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      marginBottom: 8,
      paddingHorizontal: 4,
    },
    list: { gap: 10 },
    levelCard: {
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 14,
      gap: 6,
      borderLeftWidth: 3,
      borderLeftColor: c.primary,
    },
    levelCardSuperseded: {
      opacity: 0.55,
      borderLeftColor: c.textTertiary,
    },
    levelHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    levelPill: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
      backgroundColor: c.primarySoft,
    },
    levelPillText: {
      fontSize: 10,
      fontWeight: '800',
      color: c.primary,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    levelDate: {
      fontSize: 11,
      color: c.textTertiary,
      fontWeight: '600',
    },
    levelTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: c.text,
    },
    levelBody: {
      fontSize: 13,
      color: c.textSecondary,
      lineHeight: 19,
    },
    levelNote: {
      fontSize: 12,
      fontStyle: 'italic',
      color: c.textSecondary,
      backgroundColor: c.surface,
      padding: 10,
      borderRadius: 8,
    },
    levelBy: {
      fontSize: 11,
      color: c.textTertiary,
      fontWeight: '600',
    },
    supersededText: {
      fontSize: 11,
      color: c.textTertiary,
      fontStyle: 'italic',
    },
  });
}
