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

function TopResultCard({ item, query, onPress }: Props) {
  const handlePress = useCallback(() => onPress(item), [onPress, item]);
  const colors = useThemeStore((s) => s.colors);
  const styles = useThemedStyles(makeStyles);
  const kind = normalizeContentType(item.contentType);
  const meta = entityLabel(kind);

  return (
    <View style={styles.wrap}>
      <Text style={styles.kicker}>TOP RESULT</Text>
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        accessibilityRole="button"
        accessibilityLabel={`Open top result ${item.title}`}
      >
        {item.thumbnailUrl ? (
          <Image source={{ uri: item.thumbnailUrl }} style={styles.thumb} contentFit="cover" />
        ) : (
          <View style={[styles.thumb, styles.thumbFallback]}>
            <Ionicons name={entityIcon(kind)} size={28} color={colors.primary} />
          </View>
        )}
        <View style={styles.body}>
          <Text style={styles.meta} numberOfLines={1}>{meta}</Text>
          <HighlightedText
            text={item.title}
            match={query}
            style={styles.phrase}
            highlightStyle={styles.phraseMatch}
            numberOfLines={2}
          />
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
      </Pressable>
    </View>
  );
}

export default React.memo(TopResultCard);

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    wrap: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 6 },
    kicker: {
      fontSize: 10,
      fontWeight: '800',
      color: c.primary,
      letterSpacing: 1,
      marginBottom: 6,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 12,
      borderRadius: 14,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
    },
    cardPressed: { opacity: 0.85 },
    thumb: { width: 64, height: 64, borderRadius: 10, backgroundColor: c.bg },
    thumbFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: c.primarySoft },
    body: { flex: 1, gap: 4 },
    meta: { fontSize: 10, fontWeight: '700', color: c.primary, letterSpacing: 0.5 },
    phrase: { fontSize: 16, fontWeight: '700', color: c.text, lineHeight: 21 },
    phraseMatch: { fontWeight: '900', color: c.text },
  });
}
