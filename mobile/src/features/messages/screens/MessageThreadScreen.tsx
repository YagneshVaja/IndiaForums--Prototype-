import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { FlashList, type FlashListRef, type ListRenderItem } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

import type { MySpaceStackParamList } from '../../../navigation/types';
import { useThemeStore } from '../../../store/themeStore';
import { useAuthStore } from '../../../store/authStore';
import type { ThemeColors } from '../../../theme/tokens';
import { TopNavBack } from '../../../components/layout/TopNavBar';
import ErrorState from '../../../components/ui/ErrorState';
import EmptyState from '../../profile/components/EmptyState';
import { errorHintForStatus, extractApiError, extractStatus } from '../../../services/api';
import { stripHtmlKeepBreaks } from '../../profile/utils/format';

import { useMessageThread, useSendMessage } from '../hooks/useMessages';
import { getMessageThread, optOutOfThread } from '../services/messagesApi';
import MessageBubble from '../components/MessageBubble';
import ThreadDateDivider, { dateDividerLabel, dayKey } from '../components/ThreadDateDivider';
import ThreadComposer from '../components/ThreadComposer';
import type { MessageThreadItemDto, MessageThreadResponseDto } from '../types';

type Props = NativeStackScreenProps<MySpaceStackParamList, 'MessageThread'>;

// Items that flow into FlashList. Computed in a single pass so renderItem
// is O(1) and FlashList can recycle aggressively.
type ListItem =
  | { kind: 'load-earlier'; key: 'load-earlier'; loading: boolean }
  | { kind: 'divider'; key: string; label: string }
  | {
      kind: 'message';
      key: string;
      message: MessageThreadItemDto;
      isMine: boolean;
      isFirstInGroup: boolean;
      isLastInGroup: boolean;
    };

// Scroll preservation — auto-scroll-to-bottom only fires when the user was
// already pinned near the latest message (within this many px of the bottom).
const STICK_TO_BOTTOM_THRESHOLD = 120;

export default function MessageThreadScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((s) => s.colors);
  const mode = useThemeStore((s) => s.mode);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const qc = useQueryClient();
  const meId = useAuthStore((s) => s.user?.userId);
  const meIdNum = useMemo(() => {
    if (meId == null) return null;
    const n = Number(meId);
    return Number.isFinite(n) ? n : null;
  }, [meId]);

  const rootId = route.params?.threadId;
  const q = useMessageThread(rootId ?? null);
  const send = useSendMessage();

  const thread = q.data;
  const root = thread?.rootMessage;
  const messages = useMemo<MessageThreadItemDto[]>(() => thread?.messages ?? [], [thread]);
  const subject = root?.subject || messages[0]?.subject || 'Conversation';
  const participants = useMemo(() => root?.participants ?? [], [root?.participants]);
  const statusBarStyle = mode === 'dark' ? 'light-content' : 'dark-content';

  const [draft, setDraft] = useState('');
  const [sendError, setSendError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [loadOlderError, setLoadOlderError] = useState<string | null>(null);

  const listRef = useRef<FlashListRef<ListItem> | null>(null);
  const lastCountRef = useRef(0);
  const justSentRef = useRef(false);
  const atBottomRef = useRef(true);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tracks the highest page we've loaded going backward (1 = the latest page
  // that the initial query fetched). Increments with each "Load earlier" tap.
  const pagesLoadedRef = useRef(1);
  const totalPages = Number(thread?.totalPages ?? 1) || 1;
  const hasOlder = pagesLoadedRef.current < totalPages;

  // Reset pagination state when we navigate to a different thread.
  useEffect(() => {
    pagesLoadedRef.current = 1;
  }, [rootId]);

  // Auto-scroll only when the user is already at the bottom OR they just hit
  // Send. Background refetches no longer yank scroll position.
  useEffect(() => {
    if (messages.length === 0) return;
    if (messages.length === lastCountRef.current) return;
    const grew = messages.length > lastCountRef.current;
    lastCountRef.current = messages.length;
    if (!grew) return;
    if (justSentRef.current || atBottomRef.current) {
      justSentRef.current = false;
      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated: true });
      });
    }
  }, [messages.length]);

  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 1800);
  }, []);

  const showSendError = useCallback((msg: string) => {
    setSendError(msg);
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    errorTimerRef.current = setTimeout(() => setSendError(null), 3000);
  }, []);

  const subtitle = useMemo(() => {
    if (participants.length === 0) return '';
    const names = participants
      .filter((p) => meIdNum == null || Number(p.userId) !== meIdNum)
      .map((p) => p.userName);
    if (names.length === 0) return 'just you';
    if (names.length <= 3) return names.join(', ');
    return `${names.slice(0, 2).join(', ')} +${names.length - 2}`;
  }, [participants, meIdNum]);

  const confirmOptOut = useCallback(() => {
    if (!rootId) return;
    Alert.alert(
      'Opt out?',
      'You will no longer receive replies in this conversation.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Opt out',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await optOutOfThread(rootId);
              if (res.isSuccess) navigation.goBack();
              else Alert.alert('Error', res.message);
            } catch (err) {
              Alert.alert('Error', extractApiError(err));
            }
          },
        },
      ],
    );
  }, [rootId, navigation]);

  // Replaces the destructive-on-primary-tap pattern. Cancel is the last
  // button on iOS by convention; Android places it on the left automatically.
  const openOptions = useCallback(() => {
    Alert.alert('Thread options', undefined, [
      { text: 'Refresh', onPress: () => void q.refetch() },
      { text: 'Copy subject', onPress: () => {
        if (subject) void Clipboard.setStringAsync(subject);
        showToast('Subject copied');
      } },
      { text: 'Opt out…', style: 'destructive', onPress: confirmOptOut },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [q, subject, showToast, confirmOptOut]);

  const handleCopy = useCallback(
    async (m: MessageThreadItemDto) => {
      const body = stripHtmlKeepBreaks(m.message);
      if (!body) return;
      await Clipboard.setStringAsync(body);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      showToast('Copied to clipboard');
    },
    [showToast],
  );

  const handleSend = useCallback(async () => {
    setSendError(null);
    const text = draft.trim();
    if (!text || !root) return;
    const last = messages[messages.length - 1];
    const rootSubject = root.subject || subject || '';
    const replySubject = rootSubject.startsWith('Re:') ? rootSubject : `Re: ${rootSubject}`;
    // Prefer the canonical participants list. If it's missing or filtered down
    // to just me (some BEs do this for 1:1 threads), fall back to the last
    // sender's username so the reply still has a recipient.
    const participantRecipients = participants
      .filter((p) => meIdNum == null || Number(p.userId) !== meIdNum)
      .map((p) => p.userName);
    const recipients =
      participantRecipients.length > 0
        ? participantRecipients.join(',')
        : last && (meIdNum == null || Number(last.fromUserId) !== meIdNum)
          ? last.userName
          : '';
    justSentRef.current = true;
    setDraft('');
    try {
      const res = await send.mutateAsync({
        subject: replySubject,
        message: text,
        userList: recipients || null,
        userGroupList: null,
        bcc: false,
        parentId: last?.pmId ?? null,
        rootMessageId: root.rootId,
        emailNotify: false,
        draftId: null,
        postType: 'Reply',
      });
      if (!res.isSuccess) {
        // Restore the composer so the user can retry without retyping.
        setDraft(text);
        justSentRef.current = false;
        showSendError(res.message || 'Could not send reply.');
        return;
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      setDraft(text);
      justSentRef.current = false;
      showSendError(extractApiError(err, 'Failed to send reply'));
    }
  }, [draft, messages, participants, meIdNum, root, send, subject, showSendError]);

  const loadOlder = useCallback(async () => {
    if (!rootId || loadingOlder || !hasOlder) return;
    setLoadingOlder(true);
    setLoadOlderError(null);
    const nextPage = pagesLoadedRef.current + 1;
    try {
      const older = await getMessageThread(rootId, {
        pageNumber: nextPage,
        fetchBackward: true,
      });
      pagesLoadedRef.current = nextPage;
      const threadKey = ['messages', 'thread', String(rootId)];
      qc.setQueryData<MessageThreadResponseDto>(threadKey, (prev) => {
        if (!prev) return older;
        // Dedupe by pmId — backend page boundaries occasionally overlap by one.
        const existing = new Set(prev.messages.map((m) => String(m.pmId)));
        const incoming = older.messages.filter((m) => !existing.has(String(m.pmId)));
        return {
          ...prev,
          messages: [...incoming, ...prev.messages],
          pageNumber: nextPage,
          totalPages: older.totalPages ?? prev.totalPages,
        };
      });
      // The prepend would push the current scroll position visually upward.
      // Counter that so the user keeps their place.
      lastCountRef.current += 1;
    } catch (err) {
      setLoadOlderError(extractApiError(err, 'Failed to load earlier messages'));
    } finally {
      setLoadingOlder(false);
    }
  }, [rootId, loadingOlder, hasOlder, qc]);

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const distanceFromBottom =
      contentSize.height - layoutMeasurement.height - contentOffset.y;
    const nearBottom = distanceFromBottom <= STICK_TO_BOTTOM_THRESHOLD;
    atBottomRef.current = nearBottom;
    setShowScrollDown(distanceFromBottom > 160);
  }, []);

  const scrollToBottom = useCallback(() => {
    listRef.current?.scrollToEnd({ animated: true });
  }, []);

  const items = useMemo<ListItem[]>(() => {
    const out: ListItem[] = [];
    if (hasOlder || loadingOlder) {
      out.push({ kind: 'load-earlier', key: 'load-earlier', loading: loadingOlder });
    }
    let prevDay: string | null = null;
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      const day = dayKey(m.messageDate);
      if (day && day !== prevDay) {
        const label = dateDividerLabel(m.messageDate);
        if (label) {
          out.push({ kind: 'divider', key: `d-${day}-${i}`, label });
        }
        prevDay = day;
      }
      const isMine = meIdNum != null && Number(m.fromUserId) === meIdNum;
      const prev = messages[i - 1];
      const next = messages[i + 1];
      const sameAsPrev =
        prev != null
        && Number(prev.fromUserId) === Number(m.fromUserId)
        && dayKey(prev.messageDate) === day;
      const sameAsNext =
        next != null
        && Number(next.fromUserId) === Number(m.fromUserId)
        && dayKey(next.messageDate) === day;
      out.push({
        kind: 'message',
        key: String(m.pmId),
        message: m,
        isMine,
        isFirstInGroup: !sameAsPrev,
        isLastInGroup: !sameAsNext,
      });
    }
    return out;
  }, [messages, meIdNum, hasOlder, loadingOlder]);

  const renderItem: ListRenderItem<ListItem> = useCallback(
    ({ item }) => {
      if (item.kind === 'load-earlier') {
        return (
          <LoadEarlierRow
            loading={item.loading}
            error={loadOlderError}
            onPress={loadOlder}
            styles={styles}
            colors={colors}
          />
        );
      }
      if (item.kind === 'divider') {
        return <ThreadDateDivider label={item.label} />;
      }
      return (
        <MessageBubble
          message={item.message}
          isMine={item.isMine}
          isFirstInGroup={item.isFirstInGroup}
          isLastInGroup={item.isLastInGroup}
          onLongPress={handleCopy}
        />
      );
    },
    [handleCopy, loadOlder, loadOlderError, styles, colors],
  );

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle={statusBarStyle} />
      <TopNavBack
        title={subject}
        onBack={() => navigation.goBack()}
        rightIcon="ellipsis-vertical"
        onRightPress={openOptions}
        rightAccessibilityLabel="Thread options"
      />

      {subtitle ? (
        <View style={styles.participantBar}>
          <Ionicons name="people-outline" size={12} color={colors.textTertiary} />
          <Text style={styles.participantText} numberOfLines={1}>{subtitle}</Text>
        </View>
      ) : null}

      {q.isLoading ? (
        <ThreadSkeleton styles={styles} />
      ) : q.isError ? (
        (() => {
          const status = extractStatus(q.error);
          return (
            <View style={{ padding: 14 }}>
              <ErrorState
                message={extractApiError(q.error)}
                status={status ?? undefined}
                hint={errorHintForStatus(status) ?? undefined}
                onRetry={q.refetch}
              />
            </View>
          );
        })()
      ) : messages.length === 0 ? (
        <View style={{ padding: 14, flex: 1 }}>
          <EmptyState
            icon="mail-outline"
            title="This conversation is empty."
            subtitle="No messages to display."
          />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <FlashList
            ref={listRef}
            data={items}
            renderItem={renderItem}
            keyExtractor={(item) => item.key}
            contentContainerStyle={{ paddingVertical: 12, paddingBottom: 8 }}
            onScroll={onScroll}
            scrollEventThrottle={64}
            refreshControl={
              <RefreshControl
                refreshing={q.isRefetching}
                onRefresh={q.refetch}
                tintColor={colors.primary}
              />
            }
          />
          {showScrollDown ? (
            <Pressable
              onPress={scrollToBottom}
              style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
              accessibilityLabel="Scroll to latest message"
            >
              <Ionicons name="arrow-down" size={18} color={colors.text} />
            </Pressable>
          ) : null}
        </View>
      )}

      {toast ? (
        <View style={styles.toast}>
          <Ionicons name="checkmark-circle" size={14} color={colors.success} />
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      ) : null}

      {sendError ? (
        <Pressable onPress={() => setSendError(null)} style={styles.errorToast}>
          <Ionicons name="alert-circle-outline" size={14} color={colors.danger} />
          <Text style={styles.errorToastText} numberOfLines={2}>{sendError}</Text>
          <Ionicons name="close" size={14} color={colors.danger} />
        </Pressable>
      ) : null}

      {!q.isLoading && !q.isError && root ? (
        <ThreadComposer
          value={draft}
          onChange={setDraft}
          onSend={handleSend}
          isPending={send.isPending}
          disabled={false}
          bottomInset={insets.bottom}
        />
      ) : null}
    </KeyboardAvoidingView>
  );
}

function LoadEarlierRow({
  loading,
  error,
  onPress,
  styles,
  colors,
}: {
  loading: boolean;
  error: string | null;
  onPress: () => void;
  styles: ReturnType<typeof makeStyles>;
  colors: ThemeColors;
}) {
  return (
    <View style={styles.loadEarlierWrap}>
      <Pressable
        onPress={onPress}
        disabled={loading}
        style={({ pressed }) => [
          styles.loadEarlierBtn,
          pressed && !loading && styles.fabPressed,
          loading && { opacity: 0.6 },
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <>
            <Ionicons name="arrow-up" size={12} color={colors.primary} />
            <Text style={styles.loadEarlierText}>Load earlier messages</Text>
          </>
        )}
      </Pressable>
      {error ? <Text style={styles.loadEarlierError}>{error}</Text> : null}
    </View>
  );
}

function ThreadSkeleton({ styles }: { styles: ReturnType<typeof makeStyles> }) {
  // Static, no animation — react-native-reanimated could power a shimmer
  // later; the placeholder still communicates "loading" effectively.
  return (
    <View style={styles.skeletonWrap}>
      <View style={[styles.skelBubble, styles.skelMine, { width: 160 }]} />
      <View style={[styles.skelBubble, styles.skelTheirs, { width: 220 }]} />
      <View style={[styles.skelBubble, styles.skelTheirs, { width: 140 }]} />
      <View style={[styles.skelBubble, styles.skelMine, { width: 200 }]} />
      <View style={[styles.skelBubble, styles.skelTheirs, { width: 180 }]} />
      <ActivityIndicator color="#888" style={{ marginTop: 8 }} />
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    errorToast: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginHorizontal: 12,
      marginBottom: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: c.dangerSoft,
      borderWidth: 1,
      borderColor: c.dangerSoftBorder,
    },
    errorToastText: {
      flex: 1,
      fontSize: 12,
      color: c.danger,
      fontWeight: '600',
    },
    toast: {
      position: 'absolute',
      bottom: 80,
      alignSelf: 'center',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowOffset: { width: 0, height: 2 },
      shadowRadius: 6,
      elevation: 3,
    },
    toastText: {
      fontSize: 12,
      color: c.text,
      fontWeight: '600',
    },
    participantBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 6,
      backgroundColor: c.card,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    participantText: {
      flex: 1,
      fontSize: 12,
      color: c.textSecondary,
      fontWeight: '600',
    },
    fab: {
      position: 'absolute',
      right: 14,
      bottom: 14,
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.12,
      shadowOffset: { width: 0, height: 3 },
      shadowRadius: 6,
      elevation: 4,
    },
    fabPressed: {
      opacity: 0.85,
      transform: [{ scale: 0.96 }],
    },
    loadEarlierWrap: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      alignItems: 'center',
    },
    loadEarlierBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: c.primarySoft,
      borderWidth: 1,
      borderColor: c.primary,
    },
    loadEarlierText: {
      fontSize: 11,
      fontWeight: '700',
      color: c.primary,
      letterSpacing: 0.3,
    },
    loadEarlierError: {
      marginTop: 4,
      fontSize: 11,
      color: c.danger,
      fontWeight: '600',
    },
    skeletonWrap: {
      flex: 1,
      paddingVertical: 16,
      paddingHorizontal: 12,
      gap: 8,
    },
    skelBubble: {
      height: 36,
      borderRadius: 18,
      backgroundColor: c.surface,
    },
    skelMine: {
      alignSelf: 'flex-end',
      borderBottomRightRadius: 6,
    },
    skelTheirs: {
      alignSelf: 'flex-start',
      borderBottomLeftRadius: 6,
    },
  });
}
