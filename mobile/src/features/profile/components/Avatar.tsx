import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

interface Props {
  url?: string | null;
  userId?: number | string | null;
  updateChecksum?: string | null;
  avatarType?: number | string | null;
  name?: string | null;
  size?: number;
  ring?: boolean;
}

function fallbackUrl(
  userId: number | string | null | undefined,
  updateChecksum: string | null | undefined,
  avatarType: number | string | null | undefined,
): string | null {
  if (!userId || !updateChecksum) return null;
  const at = typeof avatarType === 'string' ? parseInt(avatarType, 10) : avatarType;
  if (!at || at === 0) return null;
  const uid = typeof userId === 'string' ? parseInt(userId, 10) : userId;
  if (!Number.isFinite(uid)) return null;
  const dir = Math.floor(Number(uid) / 10000);
  return `https://img.indiaforums.com/member/200x200/${dir}/${uid}.webp?uc=${updateChecksum}`;
}

export default function Avatar({
  url,
  userId,
  updateChecksum,
  avatarType,
  name,
  size = 48,
  ring = false,
}: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors, size, ring), [colors, size, ring]);
  const src = url || fallbackUrl(userId, updateChecksum, avatarType);
  const initial = (name ?? '').trim().charAt(0).toUpperCase() || 'U';

  return (
    <View style={styles.ring}>
      <View style={styles.avatar}>
        {src ? (
          <Image source={src} style={styles.img} contentFit="cover" cachePolicy="memory-disk" />
        ) : (
          <Text style={styles.initial}>{initial}</Text>
        )}
      </View>
    </View>
  );
}

function makeStyles(c: ThemeColors, size: number, ring: boolean) {
  const outer = ring ? size + 6 : size;
  return StyleSheet.create({
    ring: {
      width: outer,
      height: outer,
      borderRadius: outer / 2,
      backgroundColor: ring ? c.card : 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
      padding: ring ? 3 : 0,
    },
    avatar: {
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    img: {
      width: '100%',
      height: '100%',
    },
    initial: {
      fontSize: Math.round(size * 0.4),
      fontWeight: '800',
      color: '#FFFFFF',
    },
  });
}
