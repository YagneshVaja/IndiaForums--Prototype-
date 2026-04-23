import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { MySpaceStackParamList } from '../../../navigation/types';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import { TopNavBack } from '../../../components/layout/TopNavBar';
import { extractApiError } from '../../../services/api';
import { useSendMessage } from '../hooks/useMessages';

type Props = NativeStackScreenProps<MySpaceStackParamList, 'Compose'>;

/**
 * Compose supports three flows driven by route params:
 *   - new:    no params or just recipientId/username prefill
 *   - reply:  parentId + rootMessageId + prefillSubject/To from the thread
 *   - draft:  draftId so the server can associate the send with the saved draft
 *
 * MySpaceStackParamList only declares recipientId; we read the extras via
 * (route.params as any) — they're passed through by ThreadScreen.
 */
export default function MessageComposeScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((s) => s.colors);
  const mode = useThemeStore((s) => s.mode);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const params = (route.params ?? {}) as any;
  const composeMode: 'new' | 'reply' | 'draft' =
    params.mode === 'reply' ? 'reply' : params.draftId ? 'draft' : 'new';
  const parentId = params.parentId ? Number(params.parentId) : undefined;
  const rootMessageId = params.rootMessageId ? Number(params.rootMessageId) : 0;
  const draftId = params.draftId ? Number(params.draftId) : undefined;

  const [to, setTo] = useState<string>(params.prefillTo || params.recipientId || '');
  const [subject, setSubject] = useState<string>(params.prefillSubject || '');
  const [body, setBody] = useState<string>(params.prefillBody || '');
  const [bcc, setBcc] = useState(false);
  const [emailNotify, setEmailNotify] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const send = useSendMessage();
  const statusBarStyle = mode === 'dark' ? 'light-content' : 'dark-content';

  const heading =
    composeMode === 'reply' ? 'Reply' : composeMode === 'draft' ? 'Continue Draft' : 'New Message';

  const submit = async () => {
    setError(null);
    setSuccess(null);
    if (!to.trim()) return setError('Please enter at least one recipient.');
    if (!subject.trim()) return setError('Please enter a subject.');
    if (!body.trim()) return setError('Please write a message.');

    try {
      const res = await send.mutateAsync({
        subject: subject.trim(),
        message: body,
        userList: to.trim(),
        bcc,
        parentId: parentId ?? null,
        rootMessageId,
        emailNotify,
        draftId: draftId ?? null,
        postType: composeMode === 'reply' ? 'Reply' : 'New',
      });
      if (!res.isSuccess) {
        setError(res.message || 'Could not send message.');
        return;
      }
      setSuccess(res.message || 'Message sent.');
      setTimeout(() => navigation.goBack(), 600);
    } catch (err) {
      setError(extractApiError(err, 'Failed to send message'));
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle={statusBarStyle} />
      <TopNavBack title={heading} onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {error ? <Banner kind="error" text={error} styles={styles} /> : null}
        {success ? <Banner kind="success" text={success} styles={styles} /> : null}

        <Field label="To" hint="Comma-separated usernames. You can only message users who allow PMs." styles={styles}>
          <TextInput
            value={to}
            onChangeText={setTo}
            placeholder="username1, username2"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!send.isPending}
            style={styles.input}
          />
        </Field>

        <Field label="Subject" styles={styles}>
          <TextInput
            value={subject}
            onChangeText={setSubject}
            placeholder="Subject"
            placeholderTextColor={colors.textTertiary}
            editable={!send.isPending}
            maxLength={120}
            style={styles.input}
          />
        </Field>

        <Field label="Message" styles={styles}>
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="Write your message…"
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={10}
            editable={!send.isPending}
            style={[styles.input, styles.textarea]}
          />
        </Field>

        <Pressable
          onPress={() => setBcc((v) => !v)}
          style={({ pressed }) => [styles.checkRow, pressed && styles.pressed]}
        >
          <View style={[styles.check, bcc && styles.checkOn]}>
            {bcc ? <Ionicons name="checkmark" size={14} color="#FFF" /> : null}
          </View>
          <Text style={styles.checkLabel}>Hide other recipients (BCC)</Text>
        </Pressable>

        <Pressable
          onPress={() => setEmailNotify((v) => !v)}
          style={({ pressed }) => [styles.checkRow, pressed && styles.pressed]}
        >
          <View style={[styles.check, emailNotify && styles.checkOn]}>
            {emailNotify ? <Ionicons name="checkmark" size={14} color="#FFF" /> : null}
          </View>
          <Text style={styles.checkLabel}>Email recipients about this message</Text>
        </Pressable>

        <View style={styles.actions}>
          <Pressable
            onPress={() => navigation.goBack()}
            disabled={send.isPending}
            style={({ pressed }) => [styles.ghostBtn, pressed && styles.pressed]}
          >
            <Text style={styles.ghostBtnText}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={submit}
            disabled={send.isPending}
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && styles.pressed,
              send.isPending && { opacity: 0.7 },
            ]}
          >
            {send.isPending ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="send-outline" size={14} color="#FFF" />
                <Text style={styles.primaryBtnText}>Send Message</Text>
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  hint,
  children,
  styles,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
      {hint ? <Text style={styles.fieldHint}>{hint}</Text> : null}
    </View>
  );
}

function Banner({
  kind,
  text,
  styles,
}: {
  kind: 'error' | 'success';
  text: string;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={[styles.banner, kind === 'error' ? styles.bannerError : styles.bannerSuccess]}>
      <Ionicons
        name={kind === 'error' ? 'alert-circle-outline' : 'checkmark-circle-outline'}
        size={16}
        color={kind === 'error' ? '#C8001E' : '#1F9254'}
      />
      <Text style={[styles.bannerText, { color: kind === 'error' ? '#C8001E' : '#1F9254' }]}>
        {text}
      </Text>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    field: { marginBottom: 14 },
    fieldLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: c.textSecondary,
      letterSpacing: 0.3,
      textTransform: 'uppercase',
      marginBottom: 6,
    },
    fieldHint: {
      fontSize: 11,
      color: c.textTertiary,
      marginTop: 4,
    },
    input: {
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 14,
      color: c.text,
    },
    textarea: {
      minHeight: 160,
      textAlignVertical: 'top',
    },
    checkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 8,
    },
    check: {
      width: 20,
      height: 20,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkOn: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    checkLabel: {
      fontSize: 13,
      color: c.text,
      fontWeight: '500',
      flex: 1,
    },
    pressed: { opacity: 0.88 },
    actions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 16,
    },
    ghostBtn: {
      flex: 1,
      height: 46,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.card,
    },
    ghostBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: c.text,
    },
    primaryBtn: {
      flex: 2,
      height: 46,
      borderRadius: 12,
      backgroundColor: c.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    primaryBtnText: {
      fontSize: 14,
      fontWeight: '800',
      color: '#FFFFFF',
      letterSpacing: 0.3,
    },
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      padding: 10,
      borderRadius: 10,
      marginBottom: 14,
    },
    bannerError: {
      backgroundColor: '#FDECEC',
      borderWidth: 1,
      borderColor: '#FCD4D4',
    },
    bannerSuccess: {
      backgroundColor: '#E8F5EE',
      borderWidth: 1,
      borderColor: '#C6E6D5',
    },
    bannerText: {
      flex: 1,
      fontSize: 13,
      fontWeight: '600',
    },
  });
}
