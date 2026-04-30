import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import type { SearchResultItemDto } from '../../../services/searchApi';
import { entityMetadataLine } from '../utils/entityMetadata';
import { entityIcon } from '../utils/entityIcon';
import HighlightedText from './HighlightedText';

interface Props {
  item: SearchResultItemDto;
  query: string;
  onPress: () => void;
}

export default function ResultCard({ item, query, onPress }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const meta = entityMetadataLine(item.entityType, item.summary);

  // Topic and Forum results never have an imageUrl from the API (the
  // backend doesn't surface topic thumbnails — they live inside the
  // post HTML, not in the search index). Render those as text-first
  // discussion cards with a prominent inline icon — like Reddit /
  // Discourse / HN do for text-only posts. Looks intentional instead
  // of like a broken-image placeholder.
  const isTextEntity = item.entityType === 'Topic' || item.entityType === 'Forum';
  const showThumbnail = !!item.imageUrl;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}
      accessibilityRole="button"
      accessibilityLabel={`Open ${item.entityType}: ${item.title}`}
    >
      {showThumbnail ? (
        <Image source={{ uri: item.imageUrl! }} style={styles.thumb} contentFit="cover" />
      ) : isTextEntity ? (
        <View style={styles.iconBadge}>
          <Ionicons name={entityIcon(item.entityType)} size={22} color={colors.primary} />
        </View>
      ) : (
        <View style={[styles.thumb, styles.thumbFallback]}>
          <Ionicons name={entityIcon(item.entityType)} size={26} color={colors.primary} />
        </View>
      )}
      <View style={styles.body}>
        <Text style={styles.meta} numberOfLines={1}>{meta}</Text>
        <HighlightedText
          text={item.title}
          match={query}
          style={styles.title}
          highlightStyle={styles.titleMatch}
          numberOfLines={2}
        />
        {item.summary ? (
          <Text style={styles.summary} numberOfLines={isTextEntity ? 3 : 2}>{item.summary}</Text>
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
    thumb: { width: 92, height: 70, borderRadius: 8, backgroundColor: c.surface },
    thumbFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: c.primarySoft },
    iconBadge: {
      width: 44,
      height: 44,
      borderRadius: 999,
      backgroundColor: c.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    body: { flex: 1, gap: 4 },
    meta: { fontSize: 11, fontWeight: '700', color: c.primary, textTransform: 'uppercase', letterSpacing: 0.4 },
    title: { fontSize: 14, fontWeight: '600', color: c.text, lineHeight: 19 },
    titleMatch: { fontWeight: '800', color: c.text },
    summary: { fontSize: 12, color: c.textSecondary, lineHeight: 17 },
  });
}
