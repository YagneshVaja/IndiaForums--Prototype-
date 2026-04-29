import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import { usePhotoPicker } from '../hooks/usePhotoPicker';

interface Props {
  variant: 'avatar' | 'banner';
  currentUrl: string | null;
  onUploaded: (url: string) => void;
}

export default function ImageUploader({ variant, currentUrl, onUploaded }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors, variant), [colors, variant]);
  const { pick, uploading } = usePhotoPicker({ variant, onUploaded });

  return (
    <Pressable
      onPress={uploading ? undefined : pick}
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
