import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import type { SearchResultItemDto } from '../../../services/searchApi';

interface Props {
  item: SearchResultItemDto;
  onPress: () => void;
}

export default function ResultCard({ item, onPress }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}
      accessibilityRole="button"
      accessibilityLabel={`Open ${item.entityType}: ${item.title}`}
    >
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.thumb} contentFit="cover" />
      ) : (
        <View style={[styles.thumb, styles.thumbFallback]}>
          <Ionicons name="image-outline" size={20} color={colors.textTertiary} />
        </View>
      )}
      <View style={styles.body}>
        <View style={styles.pill}>
          <Text style={styles.pillText}>{item.entityType}</Text>
        </View>
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        {item.summary ? (
          <Text style={styles.summary} numberOfLines={2}>{item.summary}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    thumb: {
      width: 92, height: 70, borderRadius: 8,
      backgroundColor: c.surface,
    },
    thumbFallback: { alignItems: 'center', justifyContent: 'center' },
    body: { flex: 1, gap: 4 },
    pill: {
      alignSelf: 'flex-start',
      paddingHorizontal: 8, paddingVertical: 2,
      borderRadius: 6, backgroundColor: c.primarySoft,
    },
    pillText: { fontSize: 10, fontWeight: '700', color: c.primary },
    title: { fontSize: 14, fontWeight: '600', color: c.text, lineHeight: 19 },
    summary: { fontSize: 12, color: c.textSecondary, lineHeight: 17 },
  });
}
