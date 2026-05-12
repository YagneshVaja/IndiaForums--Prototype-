import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../../store/themeStore';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';
import type { SuggestItemDto } from '../../../services/searchApi';
import { entityMetadataLine } from '../utils/entityMetadata';
import { entityIcon } from '../utils/entityIcon';
import HighlightedText from './HighlightedText';

interface Props {
  item: SuggestItemDto;
  query: string;
  onPress: () => void;
}

export default function SuggestionSpotlight({ item, query, onPress }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useThemedStyles(makeStyles);
  const meta = entityMetadataLine(item.entityType);
  return (
    <View style={styles.wrap}>
      <Text style={styles.kicker}>TOP RESULT</Text>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        accessibilityRole="button"
        accessibilityLabel={`Open top result ${item.phrase}`}
      >
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.thumb} contentFit="cover" />
        ) : (
          <View style={[styles.thumb, styles.thumbFallback]}>
            <Ionicons name={entityIcon(item.entityType)} size={28} color={colors.primary} />
          </View>
        )}
        <View style={styles.body}>
          <Text style={styles.meta} numberOfLines={1}>{meta}</Text>
          <HighlightedText
            text={item.phrase}
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
