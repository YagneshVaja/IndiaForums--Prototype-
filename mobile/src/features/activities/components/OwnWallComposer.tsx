import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import { extractApiError, uploadPostImage } from '../../../services/api';
import { hapticError, hapticSuccess, hapticTap } from '../../../utils/haptics';
import Avatar from '../../profile/components/Avatar';
import { useProfile } from '../../profile/hooks/useProfile';
import { createActivity } from '../services/activitiesApi';
import { buildActivityHtml } from '../utils/composeHtml';

const MAX_LEN = 1000;
const MAX_BYTES = 10 * 1024 * 1024; // matches /upload/post-image cap

interface Attachment {
  previewUri: string;
  filePath: string;
}

// Lightweight URL sanity check used to gate the Post button when the user
// expanded the link field. Mirrors web's "Insert valid URL" validation —
// permissive (we accept any http(s) URL with a host) so we don't block
// legitimate edge cases like localhost / IPs.
function isValidUrl(s: string): boolean {
  const trimmed = s.trim();
  if (!trimmed) return false;
  try {
    const u = new URL(trimmed);
    return (u.protocol === 'http:' || u.protocol === 'https:') && !!u.host;
  } catch {
    return false;
  }
}

export default function OwnWallComposer() {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const qc = useQueryClient();
  const profileQ = useProfile();
  const me = profileQ.data;

  const [content, setContent] = useState('');
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const post = useMutation({
    mutationFn: () => {
      const html = buildActivityHtml(content, attachment ? [attachment.filePath] : []);
      return createActivity({
        wallUserId: me!.userId,
        content: html,
        linkUrl: linkOpen && isValidUrl(linkUrl) ? linkUrl.trim() : null,
      });
    },
    onSuccess: (res) => {
      if (!res.isSuccess) {
        hapticError();
        setError(res.message || 'Failed to post.');
        return;
      }
      hapticSuccess();
      setContent('');
      setLinkUrl('');
      setLinkOpen(false);
      setAttachment(null);
      setError(null);
      Keyboard.dismiss();
      qc.invalidateQueries({ queryKey: ['profile-tab', 'activity'] });
    },
    onError: (err) => {
      hapticError();
      setError(extractApiError(err, 'Failed to post.'));
    },
  });

  async function handlePickImage() {
    if (uploadingImage || post.isPending) return;
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
      const filename = asset.fileName || `wall-${Date.now()}.jpg`;
      const res = await uploadPostImage({ uri: asset.uri, name: filename, type: mime });
      if (res.success && res.filePath) {
        setAttachment({ previewUri: asset.uri, filePath: res.filePath });
      } else {
        setError(res.message || 'Upload failed.');
      }
    } catch (err) {
      setError(extractApiError(err, 'Upload failed.'));
    } finally {
      setUploadingImage(false);
    }
  }

  function toggleLink() {
    hapticTap();
    setLinkOpen((v) => {
      const next = !v;
      if (!next) setLinkUrl('');
      return next;
    });
  }

  function showTagBuddiesSoon() {
    hapticTap();
    Alert.alert('Coming soon', 'Tagging buddies on wall posts is coming soon.');
  }

  if (!me) return null;

  const trimmed = content.trim();
  const hasContent = trimmed.length > 0 || !!attachment;
  const linkOk = !linkOpen || linkUrl.trim().length === 0 || isValidUrl(linkUrl);
  const canPost = hasContent && linkOk && !post.isPending && !uploadingImage;

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>Got something to say?</Text>

      <View style={styles.row}>
        <Avatar
          url={me.avatarUrl}
          userId={me.userId}
          updateChecksum={me.updateChecksum}
          avatarType={(me.raw as { avatarType?: number | string }).avatarType}
          name={me.displayName || me.userName}
          size={36}
        />
        <TextInput
          value={content}
          onChangeText={(v) => {
            setContent(v);
            if (error) setError(null);
          }}
          placeholder="What's on your mind today? Share your thoughts, moods, or moments…"
          placeholderTextColor={colors.textTertiary}
          multiline
          maxLength={MAX_LEN}
          editable={!post.isPending}
          style={styles.input}
        />
      </View>

      {/* Add-to-your-post toolbar */}
      <View style={styles.toolbar}>
        <Text style={styles.toolbarLabel}>Add to your post:</Text>
        <View style={styles.toolbarActions}>
          <ToolbarBtn
            icon="people-outline"
            label="Tag members"
            onPress={showTagBuddiesSoon}
            colors={colors}
            styles={styles}
            disabled={false}
          />
          <ToolbarBtn
            icon="image-outline"
            label="Add image"
            onPress={handlePickImage}
            colors={colors}
            styles={styles}
            active={!!attachment}
            disabled={uploadingImage}
            loading={uploadingImage}
          />
          <ToolbarBtn
            icon="link-outline"
            label="Insert link"
            onPress={toggleLink}
            colors={colors}
            styles={styles}
            active={linkOpen}
            disabled={false}
          />
        </View>
      </View>

      {linkOpen ? (
        <TextInput
          value={linkUrl}
          onChangeText={setLinkUrl}
          placeholder="Insert valid URL"
          placeholderTextColor={colors.textTertiary}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          editable={!post.isPending}
          style={[styles.linkInput, !linkOk && styles.linkInputInvalid]}
        />
      ) : null}

      {attachment ? (
        <View style={styles.attachWrap}>
          <Image source={attachment.previewUri} style={styles.attachThumb} contentFit="cover" />
          <Pressable
            onPress={() => setAttachment(null)}
            hitSlop={6}
            style={styles.attachRemove}
            accessibilityLabel="Remove attached image"
          >
            <Ionicons name="close" size={14} color="#FFFFFF" />
          </Pressable>
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle-outline" size={14} color={colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.footer}>
        <Text style={styles.counter}>
          {content.length > 0 ? `${content.length}/${MAX_LEN}` : ''}
        </Text>
        <Pressable
          onPress={() => post.mutate()}
          disabled={!canPost}
          style={({ pressed }) => [
            styles.postBtn,
            pressed && canPost && styles.pressed,
            !canPost && styles.postBtnDisabled,
          ]}
        >
          {post.isPending ? (
            <ActivityIndicator color={colors.onPrimary} size="small" />
          ) : (
            <Text style={styles.postBtnText}>POST</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

interface ToolbarBtnProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
  colors: ThemeColors;
  styles: ReturnType<typeof makeStyles>;
  active?: boolean;
  disabled?: boolean;
  loading?: boolean;
}
function ToolbarBtn({
  icon,
  label,
  onPress,
  colors,
  styles,
  active,
  disabled,
  loading,
}: ToolbarBtnProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.toolBtn,
        active && styles.toolBtnActive,
        pressed && !disabled && styles.pressed,
        disabled && { opacity: 0.5 },
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <Ionicons
          name={icon}
          size={18}
          color={active ? colors.primary : colors.textSecondary}
        />
      )}
    </Pressable>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: c.card,
      borderRadius: 16,
      padding: 14,
      marginTop: 8,
      marginBottom: 6,
      borderWidth: 1,
      borderColor: c.border,
      gap: 12,
      // Subtle elevation so the composer floats above the page on light mode
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.04,
      shadowRadius: 6,
      elevation: 1,
    },
    heading: {
      fontSize: 15,
      fontWeight: '800',
      color: c.text,
      letterSpacing: -0.2,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },
    input: {
      flex: 1,
      minHeight: 84,
      maxHeight: 180,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: c.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      fontSize: 14,
      color: c.text,
      lineHeight: 20,
      textAlignVertical: 'top',
    },

    toolbar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingLeft: 12,
      paddingRight: 6,
      paddingVertical: 6,
      backgroundColor: c.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
    },
    toolbarLabel: {
      fontSize: 13,
      fontWeight: '700',
      color: c.text,
    },
    toolbarActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    toolBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
    },
    toolBtnActive: {
      backgroundColor: c.primarySoft,
    },

    linkInput: {
      backgroundColor: c.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.border,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: 13,
      color: c.text,
    },
    linkInputInvalid: {
      borderColor: c.danger,
    },

    attachWrap: {
      width: 110,
      height: 110,
      borderRadius: 12,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: c.border,
      position: 'relative',
      backgroundColor: c.surface,
    },
    attachThumb: {
      width: '100%',
      height: '100%',
    },
    attachRemove: {
      position: 'absolute',
      top: 6,
      right: 6,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: 'rgba(0,0,0,0.7)',
      alignItems: 'center',
      justifyContent: 'center',
    },

    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    counter: {
      fontSize: 11,
      color: c.textTertiary,
      fontWeight: '600',
    },
    postBtn: {
      paddingHorizontal: 26,
      height: 40,
      borderRadius: 10,
      backgroundColor: c.success,
      alignItems: 'center',
      justifyContent: 'center',
      // Mini lift to give the action button presence
      shadowColor: c.success,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.25,
      shadowRadius: 6,
      elevation: 3,
    },
    postBtnDisabled: {
      opacity: 0.45,
      shadowOpacity: 0,
      elevation: 0,
    },
    postBtnText: {
      fontSize: 13,
      fontWeight: '900',
      color: '#FFFFFF',
      letterSpacing: 0.8,
    },
    pressed: {
      opacity: 0.88,
      transform: [{ scale: 0.97 }],
    },
    errorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 4,
    },
    errorText: {
      flex: 1,
      fontSize: 12,
      color: c.danger,
      fontWeight: '600',
    },
  });
}
