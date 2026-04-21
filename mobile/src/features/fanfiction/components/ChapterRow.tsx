import React, { useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { FanFictionChapterSummary } from '../../../services/api';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

interface Props {
  chapter: FanFictionChapterSummary;
  onPress: (c: FanFictionChapterSummary) => void;
}

function formatCount(n: number): string {
  if (!n) return '0';
  if (n >= 100_000) return (n / 100_000).toFixed(1).replace(/\.0$/, '') + 'L';
  if (n >= 1_000)   return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
}

function formatDate(d: string | null): string {
  if (!d) return '';
  try {
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return ''; }
}

function ChapterRow({ chapter, onPress }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { orderNumber, chapterTitle, publishedAt, viewCount, likeCount, commentCount, membersOnly, mature } = chapter;

  return (
    <Pressable
      onPress={() => onPress(chapter)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.numBox}>
        <Text style={styles.numText}>{orderNumber}</Text>
      </View>

      <View style={styles.meta}>
        <Text style={styles.title} numberOfLines={2}>{chapterTitle}</Text>
        <View style={styles.subRow}>
          {publishedAt ? <Text style={styles.sub}>{formatDate(publishedAt)}</Text> : null}
          {publishedAt ? <Text style={styles.dot}>·</Text> : null}
          <View style={styles.stat}>
            <Ionicons name="eye-outline" size={11} color={colors.textTertiary} />
            <Text style={styles.statText}>{formatCount(viewCount)}</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="heart-outline" size={11} color={colors.textTertiary} />
            <Text style={styles.statText}>{formatCount(likeCount)}</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="chatbubble-outline" size={11} color={colors.textTertiary} />
            <Text style={styles.statText}>{formatCount(commentCount)}</Text>
          </View>
        </View>
        {(membersOnly || mature) ? (
          <View style={styles.flagsRow}>
            {membersOnly ? <Text style={styles.flagMembers}>🔒 Members only</Text> : null}
            {mature      ? <Text style={styles.flagMature}>18+ Mature</Text> : null}
          </View>
        ) : null}
      </View>

      <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
    </Pressable>
  );
}

export default React.memo(ChapterRow);

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: c.card,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    pressed: { backgroundColor: c.surface },
    numBox: {
      width: 36,
      height: 36,
      borderRadius: 8,
      backgroundColor: c.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    numText: {
      fontSize: 13,
      fontWeight: '800',
      color: c.primary,
    },
    meta: { flex: 1, gap: 4 },
    title: { fontSize: 13, fontWeight: '700', color: c.text, lineHeight: 17 },
    subRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
    sub: { fontSize: 10, color: c.textTertiary },
    dot: { color: c.textTertiary },
    stat: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    statText: { fontSize: 10, color: c.textTertiary, fontWeight: '600' },
    flagsRow: { flexDirection: 'row', gap: 6, marginTop: 2 },
    flagMembers: {
      fontSize: 9,
      fontWeight: '700',
      color: '#B45309',
      backgroundColor: '#FEF3C7',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
    flagMature: {
      fontSize: 9,
      fontWeight: '700',
      color: '#991B1B',
      backgroundColor: '#FEE2E2',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
    },
  });
}
