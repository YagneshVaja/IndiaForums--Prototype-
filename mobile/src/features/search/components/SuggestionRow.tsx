import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import type { SuggestItemDto } from '../../../services/searchApi';
import { entityMetadataLine } from '../utils/entityMetadata';
import HighlightedText from './HighlightedText';

interface Props {
  item: SuggestItemDto;
  query: string;
  onPress: () => void;
}

export default function SuggestionRow({ item, query, onPress }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const meta = entityMetadataLine(item.entityType);
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
        <HighlightedText
          text={item.phrase}
          match={query}
          style={styles.phrase}
          highlightStyle={styles.phraseMatch}
          numberOfLines={1}
        />
        {meta ? <Text style={styles.meta} numberOfLines={1}>{meta}</Text> : null}
      </View>
      <Ionicons
        name="arrow-up-outline"
        size={16}
        color={colors.textTertiary}
        style={{ transform: [{ rotate: '-45deg' }] }}
      />
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
    thumb: { width: 36, height: 36, borderRadius: 8, backgroundColor: c.surface },
    thumbFallback: { alignItems: 'center', justifyContent: 'center' },
    body: { flex: 1, gap: 2 },
    phrase: { color: c.text, fontSize: 14, fontWeight: '500' },
    phraseMatch: { fontWeight: '800', color: c.text },
    meta: { fontSize: 11, color: c.textSecondary },
  });
}
