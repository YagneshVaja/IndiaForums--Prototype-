import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  StatusBar,
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
import { extractApiError } from '../../../services/api';
import { fmtDate, stripHtml, timeAgo } from '../../profile/utils/format';

import { useMessageThread } from '../hooks/useMessages';
import { optOutOfThread } from '../services/messagesApi';

type Props = NativeStackScreenProps<MySpaceStackParamList, 'MessageThread'>;

export default function MessageThreadScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((s) => s.colors);
  const mode = useThemeStore((s) => s.mode);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const rootId = route.params?.threadId;
  const q = useMessageThread(rootId ?? null);

  const thread = q.data;
  const root = thread?.rootMessage;
  const messages = thread?.messages ?? [];
  const subject = root?.subject || messages[0]?.subject || 'Conversation';
  const statusBarStyle = mode === 'dark' ? 'light-content' : 'dark-content';

  const reply = () => {
    if (!rootId) return;
    const last = messages[messages.length - 1];
    const subj = subject.startsWith('Re:') ? subject : `Re: ${subject}`;
    navigation.navigate('Compose', {
      recipientId: last?.userName,
      // The extra fields are read via route.params in Compose — TS lets us
      // pass extras because the param type only requires recipientId.
      mode: 'reply',
      parentId: String(last?.pmId ?? ''),
      rootMessageId: String(root?.rootId ?? rootId),
      prefillSubject: subj,
      prefillTo: last?.userName || '',
    } as never);
  };

  const optOut = () => {
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
  };

  return (
    <View style={styles.screen}>
      <StatusBar barStyle={statusBarStyle} />
      <TopNavBack
        title={subject}
        onBack={() => navigation.goBack()}
        rightIcon="ellipsis-vertical"
        onRightPress={optOut}
        rightAccessibilityLabel="Thread options"
      />

      <ScrollView
        contentContainerStyle={{ padding: 14, paddingBottom: insets.bottom + 96 }}
      >
        {q.isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : q.isError ? (
          <ErrorState message={extractApiError(q.error)} onRetry={q.refetch} />
        ) : messages.length === 0 ? (
          <EmptyState
            icon="mail-outline"
            title="This conversation is empty."
            subtitle="No messages to display."
          />
        ) : (
          <>
            {root?.participants && root.participants.length > 0 ? (
              <View style={styles.participants}>
                <Ionicons name="people-outline" size={12} color={colors.textTertiary} />
                <Text style={styles.participantsText} numberOfLines={2}>
                  {root.participants.map((p) => p.userName).join(', ')}
                </Text>
              </View>
            ) : null}

            <View style={styles.thread}>
              {messages.map((m) => (
                <View key={String(m.pmId)} style={styles.message}>
                  <View style={styles.messageHeader}>
                    <Avatar
                      userId={m.fromUserId}
                      avatarType={m.avatarType}
                      updateChecksum={m.updateChecksum}
                      name={m.displayName || m.userName}
                      size={36}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.messageAuthor} numberOfLines={1}>
                        {m.displayName || m.userName}
                      </Text>
                      {m.groupName ? (
                        <Text style={styles.messageRank} numberOfLines={1}>{m.groupName}</Text>
                      ) : null}
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.messageTime}>{timeAgo(m.messageDate)}</Text>
                      <Text style={styles.messageDate}>{fmtDate(m.messageDate)}</Text>
                    </View>
                  </View>
                  <Text style={styles.messageBody}>{stripHtml(m.message)}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {/* Reply CTA pinned to bottom */}
      {!q.isLoading && !q.isError && messages.length > 0 ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <Pressable
            onPress={reply}
            style={({ pressed }) => [styles.replyBtn, pressed && styles.pressed]}
          >
            <Ionicons name="arrow-undo-outline" size={16} color="#FFF" />
            <Text style={styles.replyBtnText}>Reply</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    center: { paddingVertical: 48, alignItems: 'center' },

    participants: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: c.card,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginBottom: 10,
    },
    participantsText: {
      flex: 1,
      fontSize: 12,
      color: c.textSecondary,
    },

    thread: { gap: 10 },
    message: {
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 14,
      gap: 10,
    },
    messageHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    messageAuthor: {
      fontSize: 13,
      fontWeight: '800',
      color: c.text,
    },
    messageRank: {
      fontSize: 10,
      color: c.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
      fontWeight: '600',
    },
    messageTime: {
      fontSize: 11,
      color: c.textTertiary,
      fontWeight: '700',
    },
    messageDate: {
      fontSize: 10,
      color: c.textTertiary,
    },
    messageBody: {
      fontSize: 14,
      color: c.text,
      lineHeight: 21,
    },

    footer: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingHorizontal: 14,
      paddingTop: 10,
      backgroundColor: c.card,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    replyBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      height: 46,
      borderRadius: 12,
      backgroundColor: c.primary,
    },
    replyBtnText: {
      color: c.onPrimary,
      fontSize: 14,
      fontWeight: '800',
    },
    pressed: {
      opacity: 0.88,
      transform: [{ scale: 0.98 }],
    },
  });
}
