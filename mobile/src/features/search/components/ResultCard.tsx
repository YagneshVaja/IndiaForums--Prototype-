import React, { useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../../store/themeStore';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';
import type { SmartSearchItemDto } from '../../../services/searchApi';
import {
  entityIcon,
  entityLabel,
  normalizeContentType,
} from '../utils/entityMetadata';
import HighlightedText from './HighlightedText';

interface Props {
  item: SmartSearchItemDto;
  query: string;
  onPress: (item: SmartSearchItemDto) => void;
}

function ResultCard({ item, query, onPress }: Props) {
  const handlePress = useCallback(() => onPress(item), [onPress, item]);
  const colors = useThemeStore((s) => s.colors);
  const styles = useThemedStyles(makeStyles);
  const kind = normalizeContentType(item.contentType);
  const meta = entityLabel(kind);

  const isTextEntity = kind === 'Topic' || kind === 'Forum' || kind === 'Member';
  const showThumbnail = !!item.thumbnailUrl;

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}
      accessibilityRole="button"
      accessibilityLabel={`Open ${meta}: ${item.title}`}
    >
      {showThumbnail ? (
        <Image source={{ uri: item.thumbnailUrl! }} style={styles.thumb} contentFit="cover" />
      ) : isTextEntity ? (
        <View style={styles.iconBadge}>
          <Ionicons name={entityIcon(kind)} size={22} color={colors.primary} />
        </View>
      ) : (
        <View style={[styles.thumb, styles.thumbFallback]}>
          <Ionicons name={entityIcon(kind)} size={26} color={colors.primary} />
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
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
    </Pressable>
  );
}

export default React.memo(ResultCard);

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
    },
    thumb: { width: 56, height: 42, borderRadius: 8, backgroundColor: c.surface },
    thumbFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: c.primarySoft },
    iconBadge: {
      width: 44,
      height: 44,
      borderRadius: 999,
      backgroundColor: c.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    body: { flex: 1, gap: 2 },
    meta: { fontSize: 11, fontWeight: '700', color: c.textTertiary, textTransform: 'uppercase', letterSpacing: 0.4 },
    title: { fontSize: 14, fontWeight: '600', color: c.text, lineHeight: 19 },
    titleMatch: { fontWeight: '800', color: c.text },
  });
}
