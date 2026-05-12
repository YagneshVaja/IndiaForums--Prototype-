import React, { useEffect, useMemo, useState } from 'react';
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
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';
import { TopNavBack } from '../../../components/layout/TopNavBar';
import { extractApiError } from '../../../services/api';
import { useNewMessageForm, useSendMessage } from '../hooks/useMessages';
import RecipientChipInput from '../components/RecipientChipInput';

type Props = NativeStackScreenProps<MySpaceStackParamList, 'Compose'>;

/**
 * Compose handles two flows:
 *   - new:    no params, or `recipientId` (username) prefill
 *   - draft:  `draftId` — body, subject and recipients are hydrated from
 *             /messages/new?did={draftId}
 *
 * Replies are handled inline in MessageThreadScreen — they no longer route
 * through this screen.
 */
export default function MessageComposeScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((s) => s.colors);
  const mode = useThemeStore((s) => s.mode);
  const styles = useThemedStyles(makeStyles);

  const params = route.params ?? {};
  const recipientId = params.recipientId;
  const draftIdStr = params.draftId;
  const draftId = draftIdStr ? Number(draftIdStr) : undefined;
  const isContinuingDraft = !!draftId;

  // Hydrate draft (or fetch limits for a recipient prefill).
  const newFormParams = useMemo(() => {
    if (draftId) return { did: draftId };
    if (recipientId) return { mode: 'PM', tunm: recipientId };
    return { mode: 'PM' };
  }, [draftId, recipientId]);
  // Without `enabled`, opening Compose with no draft and no recipient
  // (the most common case — tapping the compose FAB) would still hit
  // `GET /messages/new?mode=PM`. Skip the call when there's nothing to hydrate.
  const newForm = useNewMessageForm(newFormParams, !!draftId || !!recipientId);

  const [to, setTo] = useState<string>(recipientId || '');
  const [subject, setSubject] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [bcc, setBcc] = useState(false);
  const [emailNotify, setEmailNotify] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  // When the saved draft only has numeric user IDs (not usernames), we can't
  // round-trip them to the API without resolving them — surface a hint
  // instead of pasting "@123, @456" into the chip input.
  const [draftRecipientHint, setDraftRecipientHint] = useState<string | null>(null);

  // One-time hydration when the draft payload arrives.
  useEffect(() => {
    if (hydrated || !newForm.data) return;
    if (isContinuingDraft && newForm.data.draft) {
      const d = newForm.data.draft;
      setSubject(d.subject || '');
      setBody(d.message || '');
      // Prefer top-level toUsername (resolved by the server) over the raw
      // toIds saved on the draft.
      const resolved = newForm.data.toUsername;
      const rawIds = d.toIds;
      if (resolved) {
        setTo(resolved);
      } else if (rawIds && /[A-Za-z]/.test(rawIds)) {
        // Looks like usernames already — use directly.
        setTo(rawIds);
      } else if (rawIds) {
        // Numeric IDs — leave the field empty and tell the user.
        setTo('');
        setDraftRecipientHint(
          'Saved recipients are stored as IDs and could not be auto-resolved. Please re-add the usernames.',
        );
      }
      setHydrated(true);
    } else if (!isContinuingDraft) {
      // Recipient-only prefill flow — nothing to hydrate, mark done.
      setHydrated(true);
    }
  }, [hydrated, isContinuingDraft, newForm.data]);

  const send = useSendMessage();
  const statusBarStyle = mode === 'dark' ? 'light-content' : 'dark-content';
  const heading = isContinuingDraft ? 'Continue Draft' : 'New Message';

  const submit = async (postType: 'New' | 'Draft') => {
    setError(null);
    setSuccess(null);
    if (postType === 'New') {
      if (!to.trim()) return setError('Please enter at least one recipient.');
      if (!subject.trim()) return setError('Please enter a subject.');
      if (!body.trim()) return setError('Please write a message.');
    } else {
      // Drafts allow an empty body; require at least a subject so the user
      // can find it later.
      if (!subject.trim() && !body.trim()) {
        return setError('Add a subject or some content to save a draft.');
      }
    }

    try {
      const res = await send.mutateAsync({
        subject: subject.trim(),
        message: body,
        userList: to.trim() || null,
        userGroupList: null,
        bcc,
        parentId: null,
        rootMessageId: 0,
        emailNotify,
        draftId: draftId ?? null,
        postType,
      });
      if (!res.isSuccess) {
        setError(res.message || 'Could not save message.');
        return;
      }
      setSuccess(res.message || (postType === 'Draft' ? 'Draft saved.' : 'Message sent.'));
      setTimeout(() => navigation.goBack(), 600);
    } catch (err) {
      setError(extractApiError(err, postType === 'Draft' ? 'Failed to save draft' : 'Failed to send message'));
    }
  };

  const draftLoading = isContinuingDraft && newForm.isLoading;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle={statusBarStyle} />
      <TopNavBack title={heading} onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {error ? <Banner kind="error" text={error} styles={styles} /> : null}
        {success ? <Banner kind="success" text={success} styles={styles} /> : null}
        {draftLoading ? (
          <View style={styles.draftLoading}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.draftLoadingText}>Loading draft…</Text>
          </View>
        ) : null}
        {isContinuingDraft && newForm.isError && !draftLoading ? (
          <Banner kind="error" text="Couldn't load draft. You can still write a new message." styles={styles} />
        ) : null}
        {draftRecipientHint ? (
          <Banner kind="error" text={draftRecipientHint} styles={styles} />
        ) : null}

        <Field
          label="To"
          hint="Type a username and press space, comma, or done to add. You can only message users who allow PMs."
          styles={styles}
        >
          <RecipientChipInput
            value={to}
            onChange={setTo}
            editable={!send.isPending && !draftLoading}
            placeholder="Add a username"
          />
        </Field>

        <Field label="Subject" styles={styles}>
          <TextInput
            value={subject}
            onChangeText={setSubject}
            placeholder="Subject"
            placeholderTextColor={colors.textTertiary}
            editable={!send.isPending && !draftLoading}
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
            editable={!send.isPending && !draftLoading}
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
            onPress={() => submit('Draft')}
            disabled={send.isPending || draftLoading}
            style={({ pressed }) => [
              styles.ghostBtn,
              pressed && styles.pressed,
              (send.isPending || draftLoading) && { opacity: 0.6 },
            ]}
          >
            <Ionicons name="save-outline" size={14} color={colors.text} />
            <Text style={styles.ghostBtnText}>Save Draft</Text>
          </Pressable>
          <Pressable
            onPress={() => submit('New')}
            disabled={send.isPending || draftLoading}
            style={({ pressed }) => [
              styles.primaryBtn,
              pressed && styles.pressed,
              (send.isPending || draftLoading) && { opacity: 0.7 },
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
  const colors = useThemeStore((s) => s.colors);
  const tint = kind === 'error' ? colors.danger : colors.success;
  return (
    <View style={[styles.banner, kind === 'error' ? styles.bannerError : styles.bannerSuccess]}>
      <Ionicons
        name={kind === 'error' ? 'alert-circle-outline' : 'checkmark-circle-outline'}
        size={16}
        color={tint}
      />
      <Text style={[styles.bannerText, { color: tint }]}>{text}</Text>
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
      flexDirection: 'row',
      gap: 6,
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
      color: c.onPrimary,
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
      backgroundColor: c.dangerSoft,
      borderWidth: 1,
      borderColor: c.dangerSoftBorder,
    },
    bannerSuccess: {
      backgroundColor: c.successSoft,
      borderWidth: 1,
      borderColor: c.successSoftBorder,
    },
    bannerText: {
      flex: 1,
      fontSize: 13,
      fontWeight: '600',
    },
    draftLoading: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 14,
      padding: 10,
      borderRadius: 10,
      backgroundColor: c.surface,
    },
    draftLoadingText: {
      fontSize: 12,
      color: c.textSecondary,
      fontWeight: '600',
    },
  });
}
