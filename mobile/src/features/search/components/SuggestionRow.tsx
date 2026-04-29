import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import type { SuggestItemDto } from '../../../services/searchApi';

interface Props {
  item: SuggestItemDto;
  onPress: () => void;
}

export default function SuggestionRow({ item, onPress }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      accessibilityRole="button"
      accessibilityLabel={`Open ${item.phrase}`}
    >
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.thumb} contentFit="cover" />
      ) : (
        <View style={[styles.thumb, styles.thumbFallback]}>
          <Ionicons name="search" size={14} color={colors.textTertiary} />
        </View>
      )}
      <View style={styles.body}>
        <Text style={styles.phrase} numberOfLines={1}>{item.phrase}</Text>
        {item.entityType ? (
          <View style={styles.pill}>
            <Text style={styles.pillText}>{item.entityType}</Text>
          </View>
        ) : null}
      </View>
      <Ionicons name="arrow-up-outline" size={16} color={colors.textTertiary}
                style={{ transform: [{ rotate: '-45deg' }] }} />
    </Pressable>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    rowPressed: { backgroundColor: c.surface },
    thumb: {
      width: 36, height: 36, borderRadius: 8,
      backgroundColor: c.surface,
    },
    thumbFallback: {
      alignItems: 'center', justifyContent: 'center',
    },
    body: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
    phrase: { flexShrink: 1, color: c.text, fontSize: 14, fontWeight: '500' },
    pill: {
      paddingHorizontal: 8, paddingVertical: 2,
      borderRadius: 6, backgroundColor: c.primarySoft,
    },
    pillText: { fontSize: 10, fontWeight: '700', color: c.primary },
  });
}
