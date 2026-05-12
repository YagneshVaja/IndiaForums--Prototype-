import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  StatusBar,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';

import type { MySpaceStackParamList } from '../../../navigation/types';
import { useThemeStore } from '../../../store/themeStore';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import { useAuthStore } from '../../../store/authStore';
import type { ThemeColors } from '../../../theme/tokens';
import { TopNavBack } from '../../../components/layout/TopNavBar';
import ErrorState from '../../../components/ui/ErrorState';
import EmptyState from '../components/EmptyState';
import Avatar from '../components/Avatar';
import Pagination from '../components/Pagination';
import { extractApiError } from '../../../services/api';
import { timeAgo } from '../utils/format';

import { getMyBuddies } from '../services/profileApi';
import {
  acceptFriendRequest,
  blockUser,
  cancelFriendRequest,
} from '../services/profileApi';
import type { BuddyDto } from '../types';

type Props = NativeStackScreenProps<MySpaceStackParamList, 'Buddies'>;

// Buddy mode codes from the API:
//   bl  = friends
//   pl  = pending (incoming friend requests)
//   wl  = sent (outgoing friend requests — "waiting list")
//   bll = blocked
//   vl  = visitors
type BuddyMode = 'bl' | 'pl' | 'wl' | 'bll' | 'vl';
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const TABS: { key: BuddyMode; label: string; icon: IoniconName }[] = [
  { key: 'bl', label: 'Friends', icon: 'people-outline' },
  { key: 'pl', label: 'Pending', icon: 'mail-unread-outline' },
  { key: 'wl', label: 'Sent', icon: 'paper-plane-outline' },
  { key: 'bll', label: 'Blocked', icon: 'ban-outline' },
  { key: 'vl', label: 'Visitors', icon: 'eye-outline' },
];

const EMPTY_COPY: Record<BuddyMode, { title: string; subtitle?: string; icon: IoniconName }> = {
  bl: { title: "You don't have any buddies yet.", subtitle: 'Send a friend request from someone\'s profile.', icon: 'people-outline' },
  pl: { title: 'No pending friend requests.', icon: 'mail-unread-outline' },
  wl: { title: "You haven't sent any friend requests.", icon: 'paper-plane-outline' },
  bll: { title: "You haven't blocked anyone.", icon: 'ban-outline' },
  vl: { title: 'No recent profile visitors.', icon: 'eye-outline' },
};

export default function BuddiesScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((s) => s.colors);
  const mode = useThemeStore((s) => s.mode);
  const styles = useThemedStyles(makeStyles);

  const authUser = useAuthStore((s) => s.user);
  const [tab, setTab] = useState<BuddyMode>('bl');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['buddies', tab, page, search],
    queryFn: () => getMyBuddies({ pn: page, ps: 24, mode: tab, username: search.trim() || undefined }),
    enabled: !!authUser,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['buddies'] });
    qc.invalidateQueries({ queryKey: ['profile-tab', 'buddies'] });
  };

  const accept = useMutation({
    mutationFn: (b: BuddyDto) => acceptFriendRequest(b.buddyListId ?? b.userMapId ?? 0),
    onSuccess: invalidate,
    onError: (err) => Alert.alert('Error', extractApiError(err, 'Failed to accept request')),
  });
  const cancel = useMutation({
    mutationFn: (b: BuddyDto) => cancelFriendRequest(b.buddyListId ?? b.userMapId ?? 0),
    onSuccess: invalidate,
    onError: (err) => Alert.alert('Error', extractApiError(err, 'Failed to cancel request')),
  });
  const block = useMutation({
    mutationFn: ({ buddy, shouldBlock }: { buddy: BuddyDto; shouldBlock: boolean }) =>
      blockUser({
        requestId: buddy.buddyListId ?? buddy.userMapId ?? 0,
        blockedUserId: buddy.userId,
        block: shouldBlock,
        isFriend: Number(buddy.friend) === 1,
      }),
    onSuccess: invalidate,
    onError: (err) => Alert.alert('Error', extractApiError(err, 'Failed to update block status')),
  });

  // Any in-flight mutation marks that row busy without freezing the whole list.
  const busyUserId: string | number | null =
    (accept.isPending && accept.variables?.userId) ||
    (cancel.isPending && cancel.variables?.userId) ||
    (block.isPending && block.variables?.buddy?.userId) ||
    null;

  const data = list.data;
  const buddies = data?.buddies ?? [];
  const totalPages = data ? Number(data.totalPages) || 1 : 1;
  const statusBarStyle = mode === 'dark' ? 'light-content' : 'dark-content';

  const confirmBlock = useCallback(
    (buddy: BuddyDto) => {
      Alert.alert(
        `Block ${buddy.userName}?`,
        'They will no longer be able to see your profile or message you.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Block',
            style: 'destructive',
            onPress: () => block.mutate({ buddy, shouldBlock: true }),
          },
        ],
      );
    },
    [block],
  );

  const openProfile = useCallback(
    (buddy: BuddyDto) => navigation.navigate('Profile', { userId: String(buddy.userId) }),
    [navigation],
  );
  const openMessage = useCallback(
    (buddy: BuddyDto) => navigation.navigate('Compose', { recipientId: buddy.userName }),
    [navigation],
  );
  const doAccept = useCallback((buddy: BuddyDto) => accept.mutate(buddy), [accept]);
  const doCancel = useCallback((buddy: BuddyDto) => cancel.mutate(buddy), [cancel]);
  const doUnblock = useCallback(
    (buddy: BuddyDto) => block.mutate({ buddy, shouldBlock: false }),
    [block],
  );

  return (
    <View style={styles.screen}>
      <StatusBar barStyle={statusBarStyle} />
      <TopNavBack title="Buddies" onBack={() => navigation.goBack()} />

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabs}
      >
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => {
                setTab(t.key);
                setPage(1);
              }}
              style={[styles.tab, active && styles.tabActive]}
            >
              <Ionicons
                name={t.icon}
                size={14}
                color={active ? '#FFF' : colors.textSecondary}
              />
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Search */}
      {tab === 'bl' ? (
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={14} color={colors.textTertiary} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search by username"
            placeholderTextColor={colors.textTertiary}
            style={styles.searchInput}
            onSubmitEditing={() => {
              setPage(1);
              list.refetch();
            }}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
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
        ) : buddies.length === 0 ? (
          <EmptyState
            icon={EMPTY_COPY[tab].icon}
            title={EMPTY_COPY[tab].title}
            subtitle={EMPTY_COPY[tab].subtitle}
          />
        ) : (
          <View style={styles.list}>
            {buddies.map((b) => (
              <BuddyRow
                // Buddies are unique per user within a single list; userId is
                // always set so it's the safest primary key. The ?? fallback
                // used previously could collide with another row's userMapId.
                key={`buddy-${String(b.userId)}`}
                buddy={b}
                mode={tab}
                busy={String(busyUserId) === String(b.userId)}
                onOpenProfile={openProfile}
                onAccept={doAccept}
                onCancel={doCancel}
                onBlock={confirmBlock}
                onUnblock={doUnblock}
                onMessage={openMessage}
                styles={styles}
                colors={colors}
              />
            ))}
          </View>
        )}

        {buddies.length > 0 && totalPages > 1 ? (
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        ) : null}
      </ScrollView>
    </View>
  );
}

// ── Row ─────────────────────────────────────────────────────────────────────

interface RowProps {
  buddy: BuddyDto;
  mode: BuddyMode;
  busy: boolean;
  onOpenProfile: (b: BuddyDto) => void;
  onAccept: (b: BuddyDto) => void;
  onCancel: (b: BuddyDto) => void;
  onBlock: (b: BuddyDto) => void;
  onUnblock: (b: BuddyDto) => void;
  onMessage: (b: BuddyDto) => void;
  styles: ReturnType<typeof makeStyles>;
  colors: ThemeColors;
}

const BuddyRow = React.memo(function BuddyRow({
  buddy,
  mode,
  busy,
  onOpenProfile,
  onAccept,
  onCancel,
  onBlock,
  onUnblock,
  onMessage,
  styles,
  colors,
}: RowProps) {
  const subtitle =
    buddy.realName && buddy.realName !== buddy.userName
      ? buddy.realName
      : buddy.groupName || undefined;

  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => onOpenProfile(buddy)}
        style={({ pressed }) => [styles.rowMain, pressed && styles.pressed]}
      >
        <Avatar
          url={buddy.thumbnailUrl}
          userId={buddy.userId}
          updateChecksum={buddy.updateChecksum}
          avatarType={buddy.avatarType}
          name={buddy.realName || buddy.userName}
          size={44}
        />
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {buddy.userName}
          </Text>
          {subtitle ? <Text style={styles.sub} numberOfLines={1}>{subtitle}</Text> : null}
          {buddy.lastUpdatedWhen ? (
            <Text style={styles.meta}>{timeAgo(buddy.lastUpdatedWhen)}</Text>
          ) : null}
        </View>
      </Pressable>

      <View style={styles.actions}>
        {busy ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <>
            {mode === 'bl' ? (
              <>
                <ActionBtn
                  icon="chatbubble-outline"
                  kind="ghost"
                  onPress={() => onMessage(buddy)}
                  styles={styles}
                />
                <ActionBtn
                  icon="ban-outline"
                  kind="danger"
                  onPress={() => onBlock(buddy)}
                  styles={styles}
                />
              </>
            ) : null}
            {mode === 'pl' ? (
              <>
                <ActionBtn label="Accept" kind="primary" onPress={() => onAccept(buddy)} styles={styles} />
                <ActionBtn label="Reject" kind="ghost" onPress={() => onCancel(buddy)} styles={styles} />
              </>
            ) : null}
            {mode === 'wl' ? (
              <ActionBtn label="Cancel" kind="ghost" onPress={() => onCancel(buddy)} styles={styles} />
            ) : null}
            {mode === 'bll' ? (
              <ActionBtn label="Unblock" kind="primary" onPress={() => onUnblock(buddy)} styles={styles} />
            ) : null}
            {/* Visitors tab has no per-row action. */}
          </>
        )}
      </View>
    </View>
  );
});

function ActionBtn({
  label,
  icon,
  kind,
  onPress,
  styles,
}: {
  label?: string;
  icon?: IoniconName;
  kind: 'primary' | 'ghost' | 'danger';
  onPress: () => void;
  styles: ReturnType<typeof makeStyles>;
}) {
  const btnStyle =
    kind === 'primary' ? styles.btnPrimary : kind === 'danger' ? styles.btnDanger : styles.btnGhost;
  const textStyle =
    kind === 'primary'
      ? styles.btnPrimaryText
      : kind === 'danger'
        ? styles.btnDangerText
        : styles.btnGhostText;
  const iconColor = kind === 'primary' ? '#FFF' : kind === 'danger' ? '#C8001E' : undefined;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [btnStyle, pressed && styles.pressed]}
    >
      {icon ? <Ionicons name={icon} size={14} color={iconColor} /> : null}
      {label ? <Text style={textStyle}>{label}</Text> : null}
    </Pressable>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    center: { paddingVertical: 48, alignItems: 'center' },

    tabs: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      gap: 8,
      backgroundColor: c.card,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    tab: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    tabActive: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    tabText: {
      fontSize: 12,
      fontWeight: '700',
      color: c.textSecondary,
    },
    tabTextActive: { color: c.onPrimary },

    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 14,
      backgroundColor: c.card,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    searchInput: {
      flex: 1,
      paddingVertical: 10,
      fontSize: 13,
      color: c.text,
    },

    list: { gap: 8 },
    row: {
      flexDirection: 'row',
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 10,
      gap: 10,
      alignItems: 'center',
    },
    rowMain: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    pressed: { opacity: 0.88 },
    info: { flex: 1, gap: 2 },
    name: {
      fontSize: 14,
      fontWeight: '700',
      color: c.text,
    },
    sub: {
      fontSize: 12,
      color: c.textSecondary,
    },
    meta: {
      fontSize: 10,
      color: c.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
      fontWeight: '600',
    },
    actions: {
      flexDirection: 'row',
      gap: 6,
    },

    btnPrimary: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: c.primary,
      paddingHorizontal: 10,
      paddingVertical: 7,
      borderRadius: 8,
    },
    btnPrimaryText: {
      fontSize: 12,
      fontWeight: '800',
      color: c.onPrimary,
    },
    btnGhost: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
    },
    btnGhostText: {
      fontSize: 12,
      fontWeight: '700',
      color: c.text,
    },
    btnDanger: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderWidth: 1,
      borderColor: c.dangerSoftBorder,
      backgroundColor: c.dangerSoft,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
    },
    btnDangerText: {
      fontSize: 12,
      fontWeight: '800',
      color: c.danger,
    },
  });
}
