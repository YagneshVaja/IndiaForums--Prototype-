import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Alert,
  type LayoutChangeEvent,
} from 'react-native';
import type { TopNavAction } from '../../../components/layout/TopNavBar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';

import type { MySpaceStackParamList } from '../../../navigation/types';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import { TopNavBack } from '../../../components/layout/TopNavBar';
import ErrorState from '../../../components/ui/ErrorState';
import EmptyState from '../../profile/components/EmptyState';
import Avatar from '../../profile/components/Avatar';
import Pagination from '../../profile/components/Pagination';
import { errorHintForStatus, extractApiError, extractStatus } from '../../../services/api';
import { timeAgo } from '../../profile/utils/format';

import {
  useBulkMessageAction,
  useFolders,
  useMessagesList,
  useMoveMessagesToFolder,
} from '../hooks/useMessages';
import FolderPickerSheet from '../components/FolderPickerSheet';
import type {
  MessageDraftDto,
  MessageListItemDto,
  MessageMode,
} from '../types';

type Props = NativeStackScreenProps<MySpaceStackParamList, 'Messages'>;
type Tab = MessageMode | 'Drafts';

const TABS: { key: Tab; label: string }[] = [
  { key: 'Inbox', label: 'Inbox' },
  { key: 'Unread', label: 'Unread' },
  { key: 'Read', label: 'Read' },
  { key: 'Outbox', label: 'Sent' },
  { key: 'Drafts', label: 'Drafts' },
];

const EMPTY_COPY: Record<Tab, string> = {
  Inbox: 'Your inbox is empty.',
  Unread: 'No unread messages.',
  Read: 'No read messages.',
  Outbox: "You haven't sent any messages.",
  Drafts: 'No drafts saved.',
};

export default function MessagesInboxScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((s) => s.colors);
  const mode = useThemeStore((s) => s.mode);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [tab, setTab] = useState<Tab>('Inbox');
  // `searchInput` is what the user types; `search` is the debounced value that
  // actually flows into the React Query key. Without debouncing the inbox would
  // re-fetch on every keystroke.
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [folderId, setFolderId] = useState<number | undefined>(undefined);
  const [page, setPage] = useState(1);
  // Selection mode — a set of pmlIds the user has chosen for bulk actions.
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const inSelectionMode = selected.size > 0;

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 280);
    return () => clearTimeout(t);
  }, [searchInput]);

  const folders = useFolders();
  const list = useMessagesList({
    mode: tab,
    page,
    filter: search.trim() || undefined,
    folderId,
  });
  const bulk = useBulkMessageAction();
  const move = useMoveMessagesToFolder();
  const [moveSheetOpen, setMoveSheetOpen] = useState(false);

  const draftItems = useMemo<MessageDraftDto[]>(
    () => (list.data?.kind === 'drafts' ? list.data.data.drafts : []),
    [list.data],
  );
  const messageItems = useMemo<MessageListItemDto[]>(
    () => (list.data?.kind === 'messages' ? list.data.data.messages : []),
    [list.data],
  );
  const items: MessageDraftDto[] | MessageListItemDto[] =
    tab === 'Drafts' ? draftItems : messageItems;

  const totalPages = (() => {
    if (!list.data) return 1;
    if (list.data.kind === 'drafts') return Number(list.data.data.totalPages) || 1;
    const total = Number(list.data.data.totalCount) || 0;
    const size = Number(list.data.data.pageSize) || 1;
    return Math.max(1, Math.ceil(total / size));
  })();

  const statusBarStyle = mode === 'dark' ? 'light-content' : 'dark-content';
  const showFilters = tab !== 'Drafts';
  // Folders only apply to the user's own incoming surfaces; Outbox is server-side.
  const showFolderChips = tab === 'Inbox' || tab === 'Unread' || tab === 'Read';

  const openThread = useCallback(
    (rootId: number | string, pmlId: number | string) => {
      if (inSelectionMode) {
        setSelected((prev) => {
          const next = new Set(prev);
          const key = String(pmlId);
          if (next.has(key)) next.delete(key);
          else next.add(key);
          return next;
        });
        return;
      }
      navigation.navigate('MessageThread', { threadId: String(rootId) });
    },
    [inSelectionMode, navigation],
  );
  const toggleSelect = useCallback((pmlId: number | string) => {
    void Haptics.selectionAsync();
    setSelected((prev) => {
      const next = new Set(prev);
      const key = String(pmlId);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);
  const selectAllVisible = useCallback(() => {
    const ids = messageItems.map((m) => String(m.pmlId));
    setSelected((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
  }, [messageItems]);
  const openDraft = useCallback(
    (draftId: number | string) => {
      navigation.navigate('Compose', { draftId: String(draftId) });
    },
    [navigation],
  );
  const clearSelection = useCallback(() => setSelected(new Set()), []);
  const runBulk = useCallback(
    (kind: 'read' | 'unread' | 'star' | 'unstar' | 'delete') => {
      if (selected.size === 0) return;
      const ids = Array.from(selected);
      const act = () => {
        bulk.mutate(
          { pmlIds: ids, mode: kind },
          {
            onSuccess: (res) => {
              if (res.isSuccess) clearSelection();
              else Alert.alert('Error', res.message || 'Bulk action failed.');
            },
            onError: (err) => Alert.alert('Error', extractApiError(err)),
          },
        );
      };
      if (kind === 'delete') {
        Alert.alert(
          `Delete ${ids.length} message${ids.length > 1 ? 's' : ''}?`,
          'This cannot be undone.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: act },
          ],
        );
      } else {
        act();
      }
    },
    [bulk, clearSelection, selected],
  );

  return (
    <View style={styles.screen}>
      <StatusBar barStyle={statusBarStyle} />
      <TopNavBack
        title={inSelectionMode ? `${selected.size} selected` : 'Messages'}
        onBack={inSelectionMode ? clearSelection : () => navigation.goBack()}
        rightActions={
          inSelectionMode
            ? undefined
            : ([
                {
                  icon: 'folder-open-outline',
                  label: 'Manage folders',
                  onPress: () => navigation.navigate('MessageFolders'),
                },
                {
                  icon: 'create-outline',
                  label: 'Compose new message',
                  onPress: () => navigation.navigate('Compose', {}),
                  primary: true,
                },
              ] satisfies TopNavAction[])
        }
      />

      {inSelectionMode ? (
        <View style={styles.actionBar}>
          <ActionIcon
            icon="checkbox-outline"
            label="All"
            onPress={selectAllVisible}
            styles={styles}
          />
          <ActionIcon icon="mail-open-outline" label="Read" onPress={() => runBulk('read')} styles={styles} />
          <ActionIcon icon="mail-outline" label="Unread" onPress={() => runBulk('unread')} styles={styles} />
          <ActionIcon icon="star-outline" label="Star" onPress={() => runBulk('star')} styles={styles} />
          <ActionIcon
            icon="folder-open-outline"
            label="Move"
            onPress={() => setMoveSheetOpen(true)}
            styles={styles}
          />
          <ActionIcon
            icon="trash-outline"
            label="Delete"
            kind="danger"
            onPress={() => runBulk('delete')}
            styles={styles}
          />
          {bulk.isPending ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 8 }} />
          ) : null}
        </View>
      ) : null}

      <TabsRow tab={tab} setTab={setTab} reset={() => {
        setFolderId(undefined);
        setPage(1);
        setSearchInput('');
        setSearch('');
      }} styles={styles} />

      {/* Search + folder bar */}
      {showFilters ? (
        <View style={styles.toolbar}>
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={14} color={colors.textTertiary} />
            <TextInput
              value={searchInput}
              onChangeText={setSearchInput}
              placeholder="Search subject or sender…"
              placeholderTextColor={colors.textTertiary}
              style={styles.searchInput}
              onSubmitEditing={() => {
                setSearch(searchInput);
                setPage(1);
              }}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
            />
            {searchInput ? (
              <Pressable
                hitSlop={8}
                onPress={() => {
                  setSearchInput('');
                  setSearch('');
                }}
              >
                <Ionicons name="close-circle" size={14} color={colors.textTertiary} />
              </Pressable>
            ) : null}
          </View>
          {showFolderChips && folders.data && folders.data.folders.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.folderRow}
            >
              <FolderChip
                label="All folders"
                active={folderId == null}
                onPress={() => {
                  setFolderId(undefined);
                  setPage(1);
                }}
                styles={styles}
              />
              {folders.data.folders.map((f) => {
                const id = Number(f.folderId);
                return (
                  <FolderChip
                    key={String(f.folderId)}
                    label={`${f.folderName}${Number(f.pmCount) ? ` · ${f.pmCount}` : ''}`}
                    active={folderId === id}
                    onPress={() => {
                      setFolderId(id);
                      setPage(1);
                    }}
                    styles={styles}
                  />
                );
              })}
            </ScrollView>
          ) : null}
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
          <View style={styles.list}>
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonRow key={i} styles={styles} />
            ))}
          </View>
        ) : list.isError ? (
          (() => {
            const status = extractStatus(list.error);
            return (
              <ErrorState
                message={extractApiError(list.error)}
                status={status ?? undefined}
                hint={errorHintForStatus(status) ?? undefined}
                onRetry={list.refetch}
              />
            );
          })()
        ) : items.length === 0 ? (
          <EmptyState
            icon={tab === 'Drafts' ? 'document-text-outline' : 'mail-outline'}
            title={EMPTY_COPY[tab]}
            subtitle={
              tab === 'Inbox'
                ? 'Messages from other members will appear here.'
                : tab === 'Drafts'
                  ? 'Save a draft in compose to finish it later.'
                  : undefined
            }
          />
        ) : (
          <View style={styles.list}>
            {tab === 'Drafts'
              ? (items as MessageDraftDto[]).map((d) => (
                  <DraftRow
                    key={String(d.messageDraftId)}
                    d={d}
                    onOpen={openDraft}
                    styles={styles}
                    colors={colors}
                  />
                ))
              : (items as MessageListItemDto[]).map((m) => (
                  <MessageRow
                    key={String(m.pmlId)}
                    m={m}
                    onOpen={openThread}
                    onLongPress={toggleSelect}
                    selected={selected.has(String(m.pmlId))}
                    selectionMode={inSelectionMode}
                    styles={styles}
                  />
                ))}
          </View>
        )}

        {items.length > 0 && totalPages > 1 ? (
          <Pagination
            page={page}
            totalPages={totalPages}
            onChange={setPage}
          />
        ) : null}
      </ScrollView>

      <FolderPickerSheet
        visible={moveSheetOpen}
        onClose={() => setMoveSheetOpen(false)}
        busy={move.isPending}
        onPick={(folderId) => {
          if (selected.size === 0) return;
          move.mutate(
            { pmlIds: Array.from(selected), folderId },
            {
              onSuccess: (res) => {
                if (res.isSuccess) {
                  setMoveSheetOpen(false);
                  clearSelection();
                } else {
                  Alert.alert('Error', res.message || 'Failed to move messages.');
                }
              },
              onError: (err) => Alert.alert('Error', extractApiError(err)),
            },
          );
        }}
      />
    </View>
  );
}

// Horizontal tab strip that auto-scrolls the active tab into view. Pulled out
// of the main component to localise the scroll/measurement bookkeeping.
function TabsRow({
  tab,
  setTab,
  reset,
  styles,
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
  reset: () => void;
  styles: ReturnType<typeof makeStyles>;
}) {
  const scrollRef = useRef<ScrollView | null>(null);
  const offsetsRef = useRef<Record<string, { x: number; width: number }>>({});

  useEffect(() => {
    const entry = offsetsRef.current[tab];
    if (!entry) return;
    // Centre the active pill roughly within the visible row.
    const target = Math.max(0, entry.x - 14);
    scrollRef.current?.scrollTo({ x: target, animated: true });
  }, [tab]);

  const onLayoutTab = (key: Tab) => (e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    offsetsRef.current[key] = { x, width };
  };

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.tabsScroll}
      contentContainerStyle={styles.tabs}
    >
      {TABS.map((t) => {
        const active = tab === t.key;
        return (
          <Pressable
            key={t.key}
            onLayout={onLayoutTab(t.key)}
            onPress={() => {
              setTab(t.key);
              reset();
            }}
            style={[styles.tab, active && styles.tabActive]}
          >
            <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function SkeletonRow({ styles }: { styles: ReturnType<typeof makeStyles> }) {
  return (
    <View style={[styles.row, styles.skeletonRow]}>
      <View style={styles.skeletonAvatar} />
      <View style={styles.rowBody}>
        <View style={[styles.skeletonBar, { width: '40%' }]} />
        <View style={[styles.skeletonBar, { width: '80%', marginTop: 6 }]} />
      </View>
    </View>
  );
}

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function ActionIcon({
  icon,
  label,
  onPress,
  kind = 'default',
  styles,
}: {
  icon: IoniconName;
  label: string;
  onPress: () => void;
  kind?: 'default' | 'danger';
  styles: ReturnType<typeof makeStyles>;
}) {
  const colors = useThemeStore((s) => s.colors);
  const isDanger = kind === 'danger';
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.actionIconBtn, pressed && styles.pressed]}
    >
      <Ionicons
        name={icon}
        size={18}
        color={isDanger ? colors.danger : styles.actionIconText.color}
      />
      <Text style={[styles.actionIconText, isDanger && { color: colors.danger }]}>{label}</Text>
    </Pressable>
  );
}

function FolderChip({
  label,
  active,
  onPress,
  styles,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.folderChip, active && styles.folderChipActive]}>
      <Text style={[styles.folderChipText, active && styles.folderChipTextActive]}>{label}</Text>
    </Pressable>
  );
}

interface MessageRowProps {
  m: MessageListItemDto;
  onOpen: (rootId: number | string, pmlId: number | string) => void;
  onLongPress: (pmlId: number | string) => void;
  selected: boolean;
  selectionMode: boolean;
  styles: ReturnType<typeof makeStyles>;
}

const MessageRow = React.memo(function MessageRow({
  m,
  onOpen,
  onLongPress,
  selected,
  selectionMode,
  styles,
}: MessageRowProps) {
  const unread = !m.readPost;
  const sender = m.displayName || m.userName;
  const starred = Number(m.likeType) > 0;
  const onPress = () => onOpen(m.rootMessageId || m.pmId, m.pmlId);
  const onLong = () => onLongPress(m.pmlId);
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLong}
      delayLongPress={250}
      style={({ pressed }) => [
        styles.row,
        unread && !selected && styles.rowUnread,
        selected && styles.rowSelected,
        pressed && styles.pressed,
      ]}
    >
      {selectionMode ? (
        <View style={[styles.selectionMark, selected && styles.selectionMarkOn]}>
          {selected ? <Ionicons name="checkmark" size={12} color="#FFF" /> : null}
        </View>
      ) : null}
      <Avatar
        userId={m.userId}
        avatarType={m.avatarType}
        name={sender}
        size={48}
      />
      <View style={styles.rowBody}>
        <View style={styles.rowTopline}>
          <Text style={[styles.sender, unread && styles.senderUnread]} numberOfLines={1}>
            {sender}
          </Text>
          <Text style={[styles.date, unread && styles.dateUnread]}>{timeAgo(m.messageDate)}</Text>
        </View>
        <Text style={[styles.subject, unread && styles.subjectUnread]} numberOfLines={1}>
          {m.subject || '(no subject)'}
        </Text>
        {(m.folderName || starred) ? (
          <View style={styles.metaStrip}>
            {m.folderName ? (
              <View style={styles.folderBadge}>
                <Ionicons name="folder-outline" size={10} color={styles.folderBadgeText.color} />
                <Text style={styles.folderBadgeText}>{m.folderName}</Text>
              </View>
            ) : null}
            {starred ? (
              <Ionicons name="star" size={12} color={styles.starredIcon.color} />
            ) : null}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
});

interface DraftRowProps {
  d: MessageDraftDto;
  onOpen: (draftId: number | string) => void;
  styles: ReturnType<typeof makeStyles>;
  colors: ThemeColors;
}

// Drafts persist recipients as either a comma-list of usernames OR numeric
// user IDs (the back end doesn't normalise). Show IDs as an opaque count so we
// never leak "To: 121342,55879" to the user.
function formatDraftRecipients(toIds: string | null): string | null {
  if (!toIds) return null;
  const trimmed = toIds.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(/[,\s]+/).filter(Boolean);
  if (parts.length === 0) return null;
  const allNumeric = parts.every((p) => /^\d+$/.test(p));
  if (allNumeric) {
    return parts.length === 1 ? 'To: 1 recipient' : `To: ${parts.length} recipients`;
  }
  return `To: ${parts.join(', ')}`;
}

const DraftRow = React.memo(function DraftRow({ d, onOpen, styles, colors }: DraftRowProps) {
  const onPress = () => onOpen(d.messageDraftId);
  const recipientLabel = formatDraftRecipients(d.toIds);
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View
        style={{
          width: 42,
          height: 42,
          borderRadius: 21,
          backgroundColor: colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="document-text-outline" size={18} color={colors.textSecondary} />
      </View>
      <View style={styles.rowBody}>
        <View style={styles.rowTopline}>
          <Text style={styles.sender} numberOfLines={1}>Draft</Text>
          <Text style={styles.date}>{timeAgo(d.createdWhen)}</Text>
        </View>
        <Text style={styles.subject} numberOfLines={2}>
          {d.subject || '(no subject)'}
        </Text>
        {recipientLabel ? (
          <Text style={styles.meta} numberOfLines={1}>{recipientLabel}</Text>
        ) : null}
      </View>
    </Pressable>
  );
});

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    center: { paddingVertical: 48, alignItems: 'center' },

    tabsScroll: {
      // Without this the horizontal ScrollView grabs flex:1 and stretches.
      flexGrow: 0,
      flexShrink: 0,
      backgroundColor: c.card,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    tabs: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      gap: 8,
      alignItems: 'center',
    },
    tab: {
      paddingHorizontal: 14,
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

    toolbar: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      backgroundColor: c.card,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
      gap: 8,
    },
    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      backgroundColor: c.surface,
      borderRadius: 10,
    },
    searchInput: {
      flex: 1,
      paddingVertical: 9,
      fontSize: 13,
      color: c.text,
    },
    folderRow: {
      gap: 6,
      paddingVertical: 2,
    },
    folderChip: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    folderChipActive: {
      backgroundColor: c.primarySoft,
      borderColor: c.primary,
    },
    folderChipText: {
      fontSize: 11,
      color: c.textSecondary,
      fontWeight: '600',
    },
    folderChipTextActive: {
      color: c.primary,
      fontWeight: '800',
    },
    list: { gap: 8 },
    row: {
      flexDirection: 'row',
      backgroundColor: c.card,
      borderRadius: 12,
      paddingVertical: 12,
      paddingLeft: 12,
      paddingRight: 14,
      gap: 12,
      alignItems: 'center',
      // Reserve space on the left for the accent bar so unread rows don't
      // shift content sideways.
      borderLeftWidth: 3,
      borderLeftColor: 'transparent',
    },
    rowUnread: {
      borderLeftColor: c.primary,
    },
    rowSelected: {
      backgroundColor: c.primarySoft,
      borderLeftColor: c.primary,
    },
    selectionMark: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 1.5,
      borderColor: c.border,
      backgroundColor: c.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    selectionMarkOn: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    actionBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-around',
      paddingHorizontal: 14,
      paddingVertical: 10,
      backgroundColor: c.card,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    actionIconBtn: {
      alignItems: 'center',
      gap: 2,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    actionIconText: {
      fontSize: 10,
      fontWeight: '700',
      color: c.textSecondary,
      letterSpacing: 0.3,
      textTransform: 'uppercase',
    },
    pressed: { opacity: 0.88 },
    rowBody: { flex: 1, gap: 3 },
    rowTopline: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    sender: {
      fontSize: 14,
      fontWeight: '700',
      color: c.textSecondary,
      flex: 1,
    },
    senderUnread: {
      color: c.text,
      fontWeight: '800',
    },
    date: {
      fontSize: 11,
      color: c.textTertiary,
      fontWeight: '600',
      marginLeft: 8,
    },
    dateUnread: {
      color: c.primary,
      fontWeight: '700',
    },
    subject: {
      fontSize: 13,
      color: c.textSecondary,
      lineHeight: 18,
    },
    subjectUnread: {
      color: c.text,
      fontWeight: '600',
    },
    metaStrip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 2,
    },
    starredIcon: {
      color: c.warning,
    },
    meta: {
      fontSize: 11,
      color: c.textTertiary,
    },
    folderBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      alignSelf: 'flex-start',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
      backgroundColor: c.surface,
    },
    folderBadgeText: {
      fontSize: 10,
      color: c.textTertiary,
      fontWeight: '700',
    },
    skeletonRow: {
      borderLeftColor: 'transparent',
    },
    skeletonAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: c.surface,
    },
    skeletonBar: {
      height: 10,
      borderRadius: 5,
      backgroundColor: c.surface,
    },
  });
}
