import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  Linking,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { MySpaceStackParamList } from '../../../navigation/types';
import { useThemeStore } from '../../../store/themeStore';
import { usePushStore } from '../../../store/pushStore';
import type { ThemeColors } from '../../../theme/tokens';
import { TopNavBack } from '../../../components/layout/TopNavBar';
import ErrorState from '../../../components/ui/ErrorState';
import EmptyState from '../../profile/components/EmptyState';
import Pagination from '../../profile/components/Pagination';
import { extractApiError } from '../../../services/api';
import { timeAgo, stripHtml } from '../../profile/utils/format';

import Skeleton from '../../../components/ui/Skeleton';
import {
  useMarkAsRead,
  useNotificationsList,
  useUnreadCount,
} from '../hooks/useNotifications';
import type { NotificationDto } from '../types';
import { routeFromNotification, type NavTarget } from '../../../services/notificationRouter';

type Props = NativeStackScreenProps<MySpaceStackParamList, 'Notifications'>;

type Filter = 'all' | 'unread';

export default function NotificationsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((s) => s.colors);
  const mode = useThemeStore((s) => s.mode);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [filter, setFilter] = useState<Filter>('all');
  const [templateId, setTemplateId] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);

  const [autoAdvanceCount, setAutoAdvanceCount] = useState(0);

  const list = useNotificationsList({ page, templateIds: templateId });
  const unread = useUnreadCount();
  const markRead = useMarkAsRead();

  const pushStatus = usePushStore((s) => s.permissionStatus);
  const bannerDismissed = usePushStore((s) => s.bannerDismissed);
  const dismissBanner = usePushStore((s) => s.dismissBanner);

  const data = list.data;
  const all = data?.notifications ?? [];
  const templates = data?.notificationTemplates ?? [];
  const visible = filter === 'unread' ? all.filter((n) => !isRead(n)) : all;
  const unreadCount = unread.data ?? 0;
  const totalPages = Number(data?.totalPages ?? 1) || 1;
  // Server claims unread items exist but the list doesn't include any AND there
  // are no more pages to load — the unread-count endpoint is stale relative to
  // the list endpoint. Trust the list.
  const unreadBadgeIsStale =
    filter === 'unread' &&
    unreadCount > 0 &&
    !list.isLoading &&
    !list.isRefetching &&
    visible.length === 0 &&
    page >= totalPages;

  // On Unread tab: if the current page has 0 unread but the server-wide
  // unread count is >0, auto-advance to the next page until we find unread
  // items or hit the safety cap. The API has no server-side `read` filter,
  // so paginating is the only way.
  useEffect(() => {
    if (filter !== 'unread') {
      setAutoAdvanceCount(0);
      return;
    }
    if (list.isLoading || list.isRefetching) return;
    if (visible.length > 0) {
      setAutoAdvanceCount(0);
      return;
    }
    if (unreadCount <= 0) return;
    if (page >= totalPages) return;
    if (autoAdvanceCount >= 20) return;
    setAutoAdvanceCount((n) => n + 1);
    setPage((p) => p + 1);
  }, [filter, visible.length, unreadCount, list.isLoading, list.isRefetching, page, totalPages, autoAdvanceCount]);

  // If the badge is stale (no items found server-wide), force a refetch of
  // both queries so the badge can update to reality.
  useEffect(() => {
    if (!unreadBadgeIsStale) return;
    unread.refetch();
    // Don't refetch list — we just paginated it and confirmed it's empty.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unreadBadgeIsStale]);

  const markOne = useCallback(
    (id: number | string) => {
      markRead.mutate({ ids: String(id) });
    },
    [markRead],
  );

  const markAll = useCallback(() => {
    if (unreadCount === 0) return;
    markRead.mutate({ ids: '' });
  }, [markRead, unreadCount]);

  const goTo = useCallback(
    (target: NavTarget) => {
      if (target.stack === 'News') {
        // Cross-stack: bubble up to Main tab navigator, then News stack
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (navigation.getParent()?.getParent() as any)?.navigate('Main', {
          screen: 'News',
          params: { screen: target.screen, params: target.params },
        });
        return;
      }
      // MySpaceStack — same navigator the screen is mounted in
      if (target.screen === 'Notifications') return; // already here, noop
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (navigation as any).navigate(target.screen, 'params' in target ? target.params : undefined);
    },
    [navigation],
  );

  const handleOpen = useCallback(
    (n: NotificationDto) => {
      const target = routeFromNotification(n);
      if (target) {
        goTo(target);
      } else {
        // No clean route for this template yet — let the user know we got
        // their tap and we're working on it.
        const title = stripHtml(n.title ?? '') || 'Notification';
        const body = stripHtml(n.message ?? '');
        Alert.alert(
          title,
          body || "We can't open this notification yet. Coming soon.",
          [{ text: 'OK' }],
        );
      }
      // Always mark read on tap (matches popular-app behavior: tapping is engagement)
      if (!isRead(n)) {
        markRead.mutate({ ids: String(n.notificationId) });
      }
    },
    [goTo, markRead],
  );

  const handleLongPress = useCallback(
    (n: NotificationDto) => {
      const lines = [
        `templateId: ${n.templateId}`,
        `contentTypeId: ${n.contentTypeId}`,
        `contentTypeValue: ${n.contentTypeValue}`,
        `read: ${n.read}`,
        `notificationId: ${n.notificationId}`,
        `jsonData: ${n.jsonData ?? '(null)'}`,
      ];
      Alert.alert('Notification debug info', lines.join('\n'), [
        { text: 'Close' },
      ]);
    },
    [],
  );

  const statusBarStyle = mode === 'dark' ? 'light-content' : 'dark-content';

  return (
    <View style={styles.screen}>
      <StatusBar barStyle={statusBarStyle} />
      <TopNavBack
        title="Notifications"
        onBack={() => navigation.goBack()}
        rightIcon={unreadCount > 0 ? 'checkmark-done-outline' : undefined}
        onRightPress={unreadCount > 0 ? markAll : undefined}
        rightAccessibilityLabel="Mark all read"
      />

      {pushStatus === 'denied' && !bannerDismissed ? (
        <Pressable
          onPress={() => Linking.openSettings()}
          style={styles.permBanner}
        >
          <Ionicons name="notifications-off-outline" size={16} color={colors.warning} />
          <Text style={styles.permBannerText} numberOfLines={2}>
            Turn on push notifications to get replies and mentions in real time.
          </Text>
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              dismissBanner();
            }}
            hitSlop={10}
          >
            <Ionicons name="close" size={16} color={colors.textSecondary} />
          </Pressable>
        </Pressable>
      ) : null}

      {/* Filter bar */}
      <View style={styles.filterBar}>
        <View style={styles.filterChips}>
          <FilterChip
            label="All"
            active={filter === 'all'}
            onPress={() => setFilter('all')}
            styles={styles}
          />
          <FilterChip
            label="Unread"
            badge={unreadCount}
            active={filter === 'unread'}
            onPress={() => setFilter('unread')}
            styles={styles}
          />
        </View>
        {markRead.isPending || list.isPlaceholderData ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : null}
      </View>

      {/* Template chips — server-side filter */}
      {templates.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.templateRow}
          // Pin so the inner vertical ScrollView (notification list) can't
          // squeeze the chip row when there's lots of content below.
          style={styles.templateScroll}
        >
          <TemplateChip
            label="All types"
            count={Number(data?.totalRecordCount ?? 0)}
            active={!templateId}
            onPress={() => {
              setTemplateId(undefined);
              setPage(1);
            }}
            styles={styles}
          />
          {templates.map((t) => {
            const tid = String(t.templateId);
            return (
              <TemplateChip
                key={tid}
                label={t.templateDesc}
                count={Number(t.notificationCount)}
                active={templateId === tid}
                onPress={() => {
                  setTemplateId(tid);
                  setPage(1);
                }}
                styles={styles}
              />
            );
          })}
        </ScrollView>
      ) : null}

      {templates.length === 0 && list.isLoading ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.templateRow}
          style={styles.templateScroll}
        >
          <Skeleton width={80} height={28} borderRadius={14} />
          <Skeleton width={140} height={28} borderRadius={14} />
          <Skeleton width={100} height={28} borderRadius={14} />
        </ScrollView>
      ) : null}

      <ScrollView
        contentContainerStyle={{ padding: 14, paddingBottom: insets.bottom + 40 }}
        refreshControl={
          <RefreshControl
            refreshing={list.isRefetching}
            onRefresh={list.refetch}
            tintColor={colors.primary}
          />
        }
      >
        {list.isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : list.isError ? (
          <ErrorState message={extractApiError(list.error)} onRetry={list.refetch} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={
              filter === 'unread' && unreadCount > 0 && !unreadBadgeIsStale
                ? 'sync-outline'
                : filter === 'unread'
                  ? 'checkmark-circle-outline'
                  : 'notifications-outline'
            }
            title={
              filter === 'unread'
                ? unreadBadgeIsStale
                  ? 'All caught up'
                  : unreadCount > 0 && autoAdvanceCount >= 20
                    ? "Couldn't load unread notifications"
                    : unreadCount > 0
                      ? 'Looking for unread…'
                      : 'All caught up'
                : 'No notifications yet'
            }
            subtitle={
              filter === 'unread'
                ? unreadBadgeIsStale
                  ? 'Refreshing the unread count…'
                  : unreadCount > 0 && autoAdvanceCount >= 20
                    ? 'Try pulling to refresh.'
                    : unreadCount > 0
                      ? 'Loading more pages.'
                      : 'You have no unread notifications.'
                : 'Replies, likes, and mentions will appear here.'
            }
          />
        ) : (
          <View style={styles.list}>
            {visible.map((n) => (
              <NotificationRow
                key={String(n.notificationId)}
                n={n}
                onOpen={handleOpen}
                onLongPress={handleLongPress}
                styles={styles}
                colors={colors}
              />
            ))}
          </View>
        )}

        {data && visible.length > 0 ? (
          <Pagination
            page={Number(data.currentPage)}
            totalPages={Number(data.totalPages)}
            onChange={setPage}
          />
        ) : null}
      </ScrollView>
    </View>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function isRead(n: NotificationDto): boolean {
  const v = typeof n.read === 'string' ? parseInt(n.read, 10) : n.read;
  return v === 1;
}

// Rough template → icon mapping. Template IDs aren't enumerated in the spec
// but names like "Reply", "Quote", "Badge", "Follow" appear in practice.
function iconForNotification(n: NotificationDto): keyof typeof Ionicons.glyphMap {
  const hay = `${n.title ?? ''} ${n.message ?? ''}`.toLowerCase();
  if (hay.includes('mention') || hay.includes('@')) return 'at-outline';
  if (hay.includes('reply') || hay.includes('comment')) return 'chatbubble-outline';
  if (hay.includes('like') || hay.includes('heart') || hay.includes('react')) return 'heart-outline';
  if (hay.includes('follow') || hay.includes('buddy') || hay.includes('friend')) return 'people-outline';
  if (hay.includes('badge') || hay.includes('achievement')) return 'ribbon-outline';
  if (hay.includes('quote')) return 'text-outline';
  if (hay.includes('post') || hay.includes('topic')) return 'document-text-outline';
  return 'notifications-outline';
}

// ── Primitives ──────────────────────────────────────────────────────────────

function FilterChip({
  label,
  active,
  onPress,
  badge,
  styles,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  badge?: number;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.filterChip, active && styles.filterChipActive]}
    >
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
        {label}
      </Text>
      {badge != null && badge > 0 ? (
        <View style={[styles.filterChipBadge, active && styles.filterChipBadgeActive]}>
          <Text style={[styles.filterChipBadgeText, active && styles.filterChipBadgeTextActive]}>
            {badge > 99 ? '99+' : badge}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function TemplateChip({
  label,
  count,
  active,
  onPress,
  styles,
}: {
  label: string | null | undefined;
  count: number;
  active: boolean;
  onPress: () => void;
  styles: ReturnType<typeof makeStyles>;
}) {
  const safeLabel = String(label ?? '').replace(/\s+/g, ' ').trim();
  if (!safeLabel && count <= 0) return null;
  const displayLabel = safeLabel || 'Other';
  // Concat into a single string so React Native never has to flatten a
  // multi-child <Text> (which was rendering blank on the All tab — see
  // commit history for empty-chip bug).
  const text = count > 0 ? `${displayLabel} · ${count}` : displayLabel;
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[styles.tplChip, active && styles.tplChipActive]}
    >
      <Text
        style={[styles.tplChipText, active && styles.tplChipTextActive]}
        numberOfLines={1}
        allowFontScaling={false}
      >
        {text}
      </Text>
    </TouchableOpacity>
  );
}

interface NotificationRowProps {
  n: NotificationDto;
  onOpen: (n: NotificationDto) => void;
  onLongPress: (n: NotificationDto) => void;
  styles: ReturnType<typeof makeStyles>;
  colors: ThemeColors;
}

const NotificationRow = React.memo(function NotificationRow({
  n,
  onOpen,
  onLongPress,
  styles,
  colors,
}: NotificationRowProps) {
  const read = isRead(n);
  const onPress = () => {
    onOpen(n);
  };
  const onLong = () => {
    onLongPress(n);
  };
  const title = n.title || 'Notification';
  const body = stripHtml(n.message);
  const icon = iconForNotification(n);
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLong}
      delayLongPress={400}
      style={({ pressed }) => [
        styles.row,
        !read && styles.rowUnread,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.iconWrap, !read && styles.iconWrapUnread]}>
        <Ionicons name={icon} size={18} color={read ? colors.textSecondary : colors.primary} />
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, !read && styles.rowTitleUnread]} numberOfLines={2}>
          {title}
        </Text>
        {body ? (
          <Text style={styles.rowMessage} numberOfLines={3}>
            {body}
          </Text>
        ) : null}
        {n.displayUserName ? (
          <Text style={styles.rowMeta} numberOfLines={1}>
            by {n.displayUserName}
          </Text>
        ) : null}
        <Text style={styles.rowTime}>{timeAgo(n.publishedWhen)}</Text>
      </View>
      {!read ? <View style={styles.unreadDot} /> : null}
    </Pressable>
  );
});

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    center: { paddingVertical: 48, alignItems: 'center' },

    filterBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 10,
      gap: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
      backgroundColor: c.card,
    },
    filterChips: {
      flexDirection: 'row',
      gap: 8,
    },
    filterChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    filterChipActive: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    filterChipText: {
      fontSize: 12,
      fontWeight: '700',
      color: c.textSecondary,
    },
    filterChipTextActive: { color: c.onPrimary },
    filterChipBadge: {
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      paddingHorizontal: 5,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.danger,
    },
    filterChipBadgeActive: {
      backgroundColor: 'rgba(255,255,255,0.25)',
    },
    filterChipBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      color: c.onPrimary,
    },
    filterChipBadgeTextActive: {
      color: c.onPrimary,
    },

    templateScroll: {
      // Don't let the outer flex parent compress this row.
      flexGrow: 0,
      flexShrink: 0,
    },
    templateRow: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      gap: 8,
      alignItems: 'center',
    },
    tplChip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      // Don't compress when parent runs out of space.
      flexShrink: 0,
      // Force the chip to be at least wide enough for the count separator
      // plus a couple of characters so it never collapses to ellipsis.
      minWidth: 60,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tplChipActive: {
      backgroundColor: c.primarySoft,
      borderColor: c.primary,
    },
    tplChipText: {
      fontSize: 12,
      fontWeight: '600',
      color: c.textSecondary,
    },
    tplChipTextActive: {
      color: c.primary,
      fontWeight: '800',
    },

    list: { gap: 8 },
    row: {
      flexDirection: 'row',
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 12,
      gap: 12,
      borderLeftWidth: 3,
      borderLeftColor: 'transparent',
    },
    rowUnread: {
      borderLeftColor: c.primary,
      backgroundColor: c.card,
    },
    pressed: { opacity: 0.88 },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: c.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconWrapUnread: {
      backgroundColor: c.primarySoft,
    },
    rowBody: {
      flex: 1,
      gap: 3,
    },
    rowTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: c.textSecondary,
      lineHeight: 18,
    },
    rowTitleUnread: {
      color: c.text,
      fontWeight: '800',
    },
    rowMessage: {
      fontSize: 12,
      color: c.textSecondary,
      lineHeight: 17,
    },
    rowMeta: {
      fontSize: 11,
      color: c.textTertiary,
      fontStyle: 'italic',
    },
    rowTime: {
      fontSize: 10,
      color: c.textTertiary,
      marginTop: 2,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
      fontWeight: '600',
    },
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: c.primary,
      alignSelf: 'center',
    },
    permBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginHorizontal: 14,
      marginTop: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: c.warningSoft,
      borderWidth: 1,
      borderColor: c.warningSoftBorder,
    },
    permBannerText: {
      flex: 1,
      fontSize: 12,
      color: c.warning,
      fontWeight: '600',
      lineHeight: 16,
    },
  });
}
