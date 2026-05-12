import React, { useEffect, useState } from 'react';
import {
  Modal, View, Text, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { replyToTopic, uploadPostImage, extractApiError } from '../../../services/api';
import type { ForumTopic } from '../../../services/api';
import { useThemeStore } from '../../../store/themeStore';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';

const MAX_BYTES = 10 * 1024 * 1024; // matches API's 10MB cap
const MAX_ATTACHMENTS = 4;

interface Attachment {
  /** Local URI returned by expo-image-picker — used for the inline preview thumbnail. */
  previewUri: string;
  /** Server-returned filePath from /upload/post-image — appended to the message HTML on submit. */
  filePath:   string;
}

export interface QuotedPost {
  author: string;
  message: string;
}

interface Props {
  visible: boolean;
  topic: ForumTopic;
  quotedPost?: QuotedPost | null;
  onClose: () => void;
  onSubmitted: () => void;
}

const MIN_CHARS = 1;

function buildQuotePrefill(qp: QuotedPost): string {
  const excerpt = qp.message.length > 240 ? qp.message.slice(0, 240) + '…' : qp.message;
  return `> @${qp.author} said:\n> ${excerpt.replace(/\n/g, '\n> ')}\n\n`;
}

export default function ReplyComposerSheet({ visible, topic, quotedPost, onClose, onSubmitted }: Props) {
  const [text, setText]             = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [membersOnly, setMembersOnly] = useState(false);
  const [matured,     setMatured]     = useState(false);
  const [showSig,     setShowSig]     = useState(true);
  const [watchList,   setWatchList]   = useState(true);
  const [attachments,    setAttachments]    = useState<Attachment[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const colors = useThemeStore((s) => s.colors);
  const styles = useThemedStyles(makeStyles);

  useEffect(() => {
    if (!visible) return;
    setText(quotedPost ? buildQuotePrefill(quotedPost) : '');
    setError(null);
    setMembersOnly(false);
    setMatured(false);
    setShowSig(true);
    setWatchList(true);
    setAttachments([]);
    setUploadingImage(false);
  }, [visible, quotedPost]);

  const charCount = text.trim().length;
  const hasContent = charCount >= MIN_CHARS || attachments.length > 0;
  const canSubmit  = hasContent && !submitting && !uploadingImage;

  async function handleAttachImage() {
    if (uploadingImage || submitting) return;
    if (attachments.length >= MAX_ATTACHMENTS) {
      Alert.alert('Limit reached', `You can attach up to ${MAX_ATTACHMENTS} images per reply.`);
      return;
    }

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Grant photo library access to attach an image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset?.uri) return;

    const mime = (asset.mimeType || 'image/jpeg').toLowerCase();
    if (mime === 'image/gif') {
      Alert.alert('Unsupported format', 'GIF images are not allowed. Please pick a JPEG or PNG.');
      return;
    }
    if (asset.fileSize != null && asset.fileSize > MAX_BYTES) {
      Alert.alert(
        'Image too large',
        `Maximum file size is 10MB (yours is ${(asset.fileSize / 1024 / 1024).toFixed(1)}MB).`,
      );
      return;
    }

    setUploadingImage(true);
    setError(null);
    try {
      const filename = asset.fileName || `reply-${Date.now()}.jpg`;
      const res = await uploadPostImage({ uri: asset.uri, name: filename, type: mime });
      if (res.success && res.filePath) {
        setAttachments((prev) => [...prev, { previewUri: asset.uri, filePath: res.filePath! }]);
      } else {
        setError(res.message || 'Upload failed.');
      }
    } catch (err) {
      const e = err as { response?: { status?: number; data?: unknown } };
      console.error('[ReplyComposer] uploadPostImage failed', e?.response?.status, e?.response?.data);
      setError(extractApiError(err, 'Upload failed.'));
    } finally {
      setUploadingImage(false);
    }
  }

  function removeAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    const res = await replyToTopic(topic.id, topic.forumId, text, {
      membersOnly,
      hasMaturedContent: matured,
      showSignature:     showSig,
      addToWatchList:    watchList,
      attachments:       attachments.map((a) => a.filePath),
    });
    setSubmitting(false);
    if (res.ok) {
      setText('');
      setAttachments([]);
      onSubmitted();
    } else {
      setError(res.error || 'Failed to send reply.');
    }
  }

  function handleClose() {
    if (submitting || uploadingImage) return;
    setError(null);
    onClose();
  }

  const topicSnippet = (topic.title || '').length > 32
    ? topic.title.slice(0, 32) + '…'
    : topic.title || 'topic';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleClose} />
        <KeyboardAvoidingView
          style={styles.sheetWrap}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.sheet}>
            <View style={styles.dragHandle} />

            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarLetter}>?</Text>
                </View>
                <View style={styles.headerMeta}>
                  <Text style={styles.headerTitle}>Post a Reply</Text>
                  <Text style={styles.headerSub} numberOfLines={1}>
                    in {topicSnippet}
                  </Text>
                </View>
              </View>
              <Pressable onPress={handleClose} hitSlop={8} style={styles.closeBtn}>
                <Ionicons name="close" size={18} color={colors.text} />
              </Pressable>
            </View>

            <View style={styles.editorWrap}>
              <View style={styles.editorHeader}>
                <Text style={styles.sectionLabel}>
                  Message <Text style={styles.required}>Required</Text>
                </Text>
                <Pressable
                  onPress={handleAttachImage}
                  disabled={uploadingImage || submitting || attachments.length >= MAX_ATTACHMENTS}
                  hitSlop={6}
                  style={({ pressed }) => [
                    styles.attachBtn,
                    (uploadingImage || attachments.length >= MAX_ATTACHMENTS) && styles.attachBtnDisabled,
                    pressed && !uploadingImage && styles.attachBtnPressed,
                  ]}
                >
                  {uploadingImage ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Ionicons name="image-outline" size={16} color={colors.primary} />
                  )}
                  <Text style={styles.attachBtnText}>
                    {uploadingImage ? 'Uploading…' : 'Attach image'}
                  </Text>
                </Pressable>
              </View>

              <TextInput
                value={text}
                onChangeText={setText}
                placeholder="Share your thoughts…"
                placeholderTextColor={colors.textTertiary}
                multiline
                editable={!submitting}
                style={styles.editor}
                autoFocus
                textAlignVertical="top"
              />

              {attachments.length > 0 && (
                <View style={styles.attachRow}>
                  {attachments.map((att, i) => (
                    <View key={att.filePath} style={styles.attachThumbWrap}>
                      <Image
                        source={att.previewUri}
                        style={styles.attachThumb}
                        contentFit="cover"
                      />
                      <Pressable
                        onPress={() => removeAttachment(i)}
                        hitSlop={6}
                        style={styles.attachRemove}
                        accessibilityLabel="Remove attachment"
                      >
                        <Ionicons name="close" size={12} color="#FFFFFF" />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )}

              <Text style={styles.charCount}>
                {charCount} chars{attachments.length > 0 ? ` · ${attachments.length} image${attachments.length === 1 ? '' : 's'}` : ''}
              </Text>
            </View>

            <View style={styles.togglesRow}>
              <ToggleChip
                label="Members Only"
                checked={membersOnly}
                onToggle={() => setMembersOnly(v => !v)}
                styles={styles}
                colors={colors}
              />
              <ToggleChip
                label="Matured"
                checked={matured}
                onToggle={() => setMatured(v => !v)}
                styles={styles}
                colors={colors}
              />
              <ToggleChip
                label="Signature"
                checked={showSig}
                onToggle={() => setShowSig(v => !v)}
                styles={styles}
                colors={colors}
              />
              <ToggleChip
                label="Watch"
                checked={watchList}
                onToggle={() => setWatchList(v => !v)}
                styles={styles}
                colors={colors}
              />
            </View>

            {error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={14} color={colors.danger} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <View style={styles.actions}>
              <Pressable
                onPress={handleClose}
                disabled={submitting}
                style={[styles.cancelBtn, submitting && styles.btnDisabled]}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={handleSubmit}
                disabled={!canSubmit}
                style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="send" size={14} color="#FFFFFF" />
                    <Text style={styles.submitBtnText}>Submit</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0,0,0,0.45)',
    },
    sheetWrap: {
      width: '100%',
    },
    sheet: {
      backgroundColor: c.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: 24,
      paddingHorizontal: 16,
      paddingTop: 8,
    },
    dragHandle: {
      alignSelf: 'center',
      width: 44,
      height: 4,
      borderRadius: 3,
      backgroundColor: c.border,
      marginTop: 4,
      marginBottom: 12,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
      minWidth: 0,
    },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarLetter: {
      color: c.onPrimary,
      fontSize: 15,
      fontWeight: '800',
    },
    headerMeta: {
      flex: 1,
      minWidth: 0,
    },
    headerTitle: {
      fontSize: 14,
      fontWeight: '800',
      color: c.text,
    },
    headerSub: {
      fontSize: 11,
      color: c.textTertiary,
      marginTop: 1,
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: c.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sectionLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: c.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
      marginBottom: 6,
    },
    required: {
      color: c.danger,
      fontSize: 10,
    },
    editorWrap: {
      marginBottom: 12,
    },
    editorHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    attachBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      backgroundColor: c.primarySoft,
    },
    attachBtnPressed: {
      opacity: 0.75,
    },
    attachBtnDisabled: {
      opacity: 0.5,
    },
    attachBtnText: {
      fontSize: 11,
      fontWeight: '700',
      color: c.primary,
    },
    attachRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 8,
    },
    attachThumbWrap: {
      position: 'relative',
      width: 64,
      height: 64,
      borderRadius: 8,
      overflow: 'visible',
    },
    attachThumb: {
      width: 64,
      height: 64,
      borderRadius: 8,
      backgroundColor: c.surface,
    },
    attachRemove: {
      position: 'absolute',
      top: -6,
      right: -6,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: 'rgba(0,0,0,0.7)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    editor: {
      minHeight: 140,
      maxHeight: 240,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      padding: 12,
      fontSize: 14,
      color: c.text,
      backgroundColor: c.surface,
    },
    charCount: {
      alignSelf: 'flex-end',
      fontSize: 10,
      fontWeight: '700',
      color: c.textTertiary,
      marginTop: 4,
    },
    errorBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: c.dangerSoft,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      marginBottom: 10,
    },
    errorText: {
      color: c.danger,
      fontSize: 12,
      fontWeight: '600',
      flex: 1,
    },
    actions: {
      flexDirection: 'row',
      gap: 10,
    },
    cancelBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.surface,
    },
    cancelBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: c.textSecondary,
    },
    submitBtn: {
      flex: 2,
      flexDirection: 'row',
      paddingVertical: 12,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: c.primary,
    },
    submitBtnDisabled: {
      backgroundColor: c.primarySoft,
      opacity: 0.6,
    },
    submitBtnText: {
      color: c.onPrimary,
      fontSize: 13,
      fontWeight: '800',
    },
    btnDisabled: {
      opacity: 0.5,
    },
    togglesRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginBottom: 10,
    },
    toggleChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    toggleChipOn: {
      backgroundColor: c.primarySoft,
      borderColor: c.primary,
    },
    toggleChipText: {
      fontSize: 11,
      fontWeight: '700',
      color: c.textSecondary,
    },
    toggleChipTextOn: {
      color: c.primary,
    },
  });
}

type ToggleStyles = ReturnType<typeof makeStyles>;

function ToggleChip({
  label, checked, onToggle, styles, colors,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
  styles: ToggleStyles;
  colors: import('../../../theme/tokens').ThemeColors;
}) {
  return (
    <Pressable
      style={[styles.toggleChip, checked && styles.toggleChipOn]}
      onPress={onToggle}
    >
      <Ionicons
        name={checked ? 'checkmark-circle' : 'ellipse-outline'}
        size={12}
        color={checked ? colors.primary : colors.textTertiary}
      />
      <Text style={[styles.toggleChipText, checked && styles.toggleChipTextOn]}>
        {label}
      </Text>
    </Pressable>
  );
}
