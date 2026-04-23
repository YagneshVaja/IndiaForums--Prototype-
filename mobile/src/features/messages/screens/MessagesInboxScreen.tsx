import React, { useCallback, useMemo, useState } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { MySpaceStackParamList } from '../../../navigation/types';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import { TopNavBack } from '../../../components/layout/TopNavBar';
import ErrorState from '../../../components/ui/ErrorState';
import EmptyState from '../../profile/components/EmptyState';
import Avatar from '../../profile/components/Avatar';
import Pagination from '../../profile/components/Pagination';
import { extractApiError } from '../../../services/api';
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
  const [search, setSearch] = useState('');
  const [folderId, setFolderId] = useState<number | undefined>(undefined);
  const [page, setPage] = useState(1);
  // Selection mode — a set of pmlIds the user has chosen for bulk actions.
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const inSelectionMode = selected.size > 0;

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

  const draftItems: MessageDraftDto[] =
    list.data?.kind === 'drafts' ? list.data.data.drafts : [];
  const messageItems: MessageListItemDto[] =
    list.data?.kind === 'messages' ? list.data.data.messages : [];
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
    setSelected((prev) => {
      const next = new Set(prev);
      const key = String(pmlId);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);
  const openDraft = useCallback(
    (draftId: number | string) => {
      navigation.navigate('Compose', { draftId: String(draftId) } as never);
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
        rightIcon={inSelectionMode ? undefined : 'create-outline'}
        onRightPress={inSelectionMode ? undefined : () => navigation.navigate('Compose', {})}
        rightAccessibilityLabel="Compose new message"
      />

      {inSelectionMode ? (
        <View style={styles.actionBar}>
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
                setFolderId(undefined);
                setPage(1);
              }}
              style={[styles.tab, active && styles.tabActive]}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Search + folder bar */}
      {showFilters ? (
        <View style={styles.toolbar}>
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={14} color={colors.textTertiary} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search subject or sender…"
              placeholderTextColor={colors.textTertiary}
              style={styles.searchInput}
              onSubmitEditing={() => {
                setPage(1);
                list.refetch();
              }}
              returnKeyType="search"
            />
          </View>
          {folders.data && folders.data.folders.length > 0 ? (
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
          <Pressable
            onPress={() => navigation.navigate('MessageFolders' as never)}
            style={({ pressed }) => [styles.foldersBtn, pressed && styles.pressed]}
            hitSlop={8}
          >
            <Ionicons name="folder-open-outline" size={14} color={colors.primary} />
            <Text style={styles.foldersBtnText}>Manage folders</Text>
          </Pressable>
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
        color={isDanger ? '#C8001E' : styles.actionIconText.color}
      />
      <Text style={[styles.actionIconText, isDanger && { color: '#C8001E' }]}>{label}</Text>
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
        size={42}
      />
      <View style={styles.rowBody}>
        <View style={styles.rowTopline}>
          <Text style={[styles.sender, unread && styles.senderUnread]} numberOfLines={1}>
            {sender}
          </Text>
          <Text style={styles.date}>{timeAgo(m.messageDate)}</Text>
        </View>
        <Text style={[styles.subject, unread && styles.subjectUnread]} numberOfLines={2}>
          {m.subject || '(no subject)'}
        </Text>
        {m.folderName ? (
          <View style={styles.folderBadge}>
            <Ionicons name="folder-outline" size={10} color={styles.folderBadgeText.color} />
            <Text style={styles.folderBadgeText}>{m.folderName}</Text>
          </View>
        ) : null}
      </View>
      {unread ? <View style={styles.unreadDot} /> : null}
    </Pressable>
  );
});

interface DraftRowProps {
  d: MessageDraftDto;
  onOpen: (draftId: number | string) => void;
  styles: ReturnType<typeof makeStyles>;
  colors: ThemeColors;
}

const DraftRow = React.memo(function DraftRow({ d, onOpen, styles, colors }: DraftRowProps) {
  const onPress = () => onOpen(d.messageDraftId);
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
        {d.toIds ? (
          <Text style={styles.meta} numberOfLines={1}>To: {d.toIds}</Text>
        ) : null}
      </View>
    </Pressable>
  );
});

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
    tabTextActive: { color: '#FFFFFF' },

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
    foldersBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      alignSelf: 'flex-start',
      paddingVertical: 2,
    },
    foldersBtnText: {
      fontSize: 11,
      color: c.primary,
      fontWeight: '700',
    },

    list: { gap: 8 },
    row: {
      flexDirection: 'row',
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 12,
      gap: 12,
      alignItems: 'center',
    },
    rowUnread: {
      borderLeftWidth: 3,
      borderLeftColor: c.primary,
    },
    rowSelected: {
      backgroundColor: c.primarySoft,
      borderLeftWidth: 3,
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
      fontSize: 13,
      fontWeight: '600',
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
    },
    subject: {
      fontSize: 13,
      color: c.textSecondary,
      lineHeight: 18,
    },
    subjectUnread: {
      color: c.text,
      fontWeight: '700',
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
    unreadDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: c.primary,
    },
  });
}
