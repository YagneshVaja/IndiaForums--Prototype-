import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import { uploadUserBanner, uploadUserThumbnail } from '../services/profileApi';
import { extractApiError } from '../../../services/api';

interface Props {
  variant: 'avatar' | 'banner';
  currentUrl: string | null;
  onUploaded: (url: string) => void;
}

const MAX_BYTES = 10 * 1024 * 1024; // matches the API's 10MB limit

// `imageData` is just raw base64 (no `data:` prefix). The .NET endpoint
// runs `Convert.FromBase64String` which doesn't strip a data URL header.
function toRawBase64(asset: ImagePicker.ImagePickerAsset): string | null {
  if (!asset.base64) return null;
  // Defensive: if some platform variant returns a data URL, strip the prefix.
  const m = /^data:[^;]+;base64,(.*)$/.exec(asset.base64);
  return m ? m[1] : asset.base64;
}

export default function ImageUploader({ variant, currentUrl, onUploaded }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors, variant), [colors, variant]);
  const [uploading, setUploading] = useState(false);

  const handlePick = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Grant photo library access to change your photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: variant === 'avatar' ? [1, 1] : [3, 1],
      quality: 0.8,
      base64: true,
    });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset) return;

    // Reject GIFs / animated WebP up-front — the API rejects them anyway
    // and the message you get back is unhelpful.
    const mime = (asset.mimeType || '').toLowerCase();
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

    const imageData = toRawBase64(asset);
    if (!imageData) {
      Alert.alert('Upload failed', 'Could not read image data. Try a different photo.');
      return;
    }

    // Diagnostic: log everything we know about the asset before sending.
    // Helps narrow down whether the server is rejecting due to format, size,
    // or something else.
    console.log('[ImageUploader] picked', {
      variant,
      uri:        asset.uri,
      mimeType:   asset.mimeType,
      width:      asset.width,
      height:     asset.height,
      fileSize:   asset.fileSize,
      base64Len:  imageData.length,
      base64Head: imageData.slice(0, 24),
    });

    setUploading(true);
    try {
      const res = variant === 'avatar'
        ? await uploadUserThumbnail({ imageData })
        : await uploadUserBanner({ imageData });
      if (res.imageUrl) {
        onUploaded(res.imageUrl);
      } else {
        Alert.alert('Upload failed', res.message || 'Server did not return a URL.');
      }
    } catch (err) {
      const e = err as {
        response?: { status?: number; data?: unknown; headers?: Record<string, string> };
        message?: string;
      };
      // Surface the raw server response so we can see what it's actually rejecting.
      console.error('[ImageUploader] upload failed', {
        status:  e?.response?.status,
        data:    e?.response?.data,
        msg:     e?.message,
      });
      const detail = extractApiError(err);
      Alert.alert(
        'Upload failed',
        e?.response?.status
          ? `${detail}\n\n(HTTP ${e.response.status} from /upload/${variant === 'avatar' ? 'user-thumbnail' : 'user-banner'})`
          : detail,
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <Pressable
      onPress={uploading ? undefined : handlePick}
      style={({ pressed }) => [styles.container, pressed && !uploading && styles.pressed]}
    >
      {currentUrl ? (
        <Image source={currentUrl} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.placeholder]} />
      )}
      <View style={styles.overlay}>
        {uploading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <>
            <Ionicons name="camera-outline" size={18} color="#FFF" />
            <Text style={styles.label}>
              {variant === 'avatar' ? 'Change photo' : 'Change cover'}
            </Text>
          </>
        )}
      </View>
    </Pressable>
  );
}

function makeStyles(c: ThemeColors, variant: 'avatar' | 'banner') {
  const isAvatar = variant === 'avatar';
  return StyleSheet.create({
    container: {
      width: isAvatar ? 100 : '100%',
      height: isAvatar ? 100 : 120,
      borderRadius: isAvatar ? 50 : 12,
      backgroundColor: c.surface,
      overflow: 'hidden',
      alignSelf: isAvatar ? 'center' : 'stretch',
      marginVertical: isAvatar ? 12 : 4,
    },
    pressed: { opacity: 0.85 },
    placeholder: {
      backgroundColor: c.primary,
    },
    overlay: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      top: 0,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      backgroundColor: 'rgba(0,0,0,0.35)',
    },
    label: {
      fontSize: 12,
      fontWeight: '700',
      color: '#FFF',
    },
  });
}
