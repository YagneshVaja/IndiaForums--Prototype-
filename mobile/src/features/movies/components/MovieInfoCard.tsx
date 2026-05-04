import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

interface Props {
  releaseDate: string | null;
  language: string | null;
  about: string | null;
  storyLoading?: boolean;
}

function formatLongDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

function MovieInfoCardImpl({ releaseDate, language, about, storyLoading }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const dateText = formatLongDate(releaseDate);

  return (
    <View style={styles.card}>
      {dateText ? (
        <View style={styles.row}>
          <Text style={styles.label}>Release Date:</Text>
          <Text style={styles.value}>{dateText}</Text>
        </View>
      ) : null}

      {language ? (
        <View style={styles.row}>
          <Text style={styles.label}>Language:</Text>
          <Text style={styles.value}>{language}</Text>
        </View>
      ) : null}

      <View style={styles.aboutBlock}>
        <Text style={styles.aboutLabel}>About Film:</Text>
        {storyLoading ? (
          <Text style={styles.aboutPlaceholder}>Loading…</Text>
        ) : about ? (
          <Text style={styles.aboutText}>{about}</Text>
        ) : (
          <Text style={styles.aboutPlaceholder}>Story not available yet.</Text>
        )}
      </View>
    </View>
  );
}

const MovieInfoCard = React.memo(MovieInfoCardImpl);
export default MovieInfoCard;

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      marginHorizontal: 14,
      marginTop: 14,
      padding: 14,
      borderRadius: 12,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
    },
    row: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginBottom: 6,
    },
    label: { fontSize: 13, fontWeight: '700', color: c.textSecondary },
    value: { fontSize: 13, fontWeight: '600', color: c.text, flexShrink: 1 },
    aboutBlock: {
      marginTop: 6,
      paddingTop: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    aboutLabel: { fontSize: 13, fontWeight: '700', color: c.textSecondary, marginBottom: 6 },
    aboutText: { fontSize: 14, lineHeight: 21, color: c.text },
    aboutPlaceholder: { fontSize: 13, fontStyle: 'italic', color: c.textTertiary },
  });
}
