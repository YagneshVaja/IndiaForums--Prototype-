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

/**
 * One image picker used for both avatar and banner — only the crop aspect and
 * endpoint differ. The API accepts a base64-encoded body (no data: prefix),
 * which matches what expo-image-picker returns when `base64: true`.
 */
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
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: variant === 'avatar' ? [1, 1] : [3, 1],
      quality: 0.8,
      base64: true,
    });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset?.base64) {
      Alert.alert('Upload failed', 'Could not read image data.');
      return;
    }
    setUploading(true);
    try {
      const res = variant === 'avatar'
        ? await uploadUserThumbnail({ imageData: asset.base64 })
        : await uploadUserBanner({ imageData: asset.base64 });
      if (res.imageUrl) onUploaded(res.imageUrl);
      else Alert.alert('Upload failed', res.message || 'Server did not return a URL.');
    } catch (err) {
      Alert.alert('Upload failed', extractApiError(err));
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
