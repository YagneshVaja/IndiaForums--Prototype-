import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { CelebrityBiography } from '../../../services/api';
import { formatCount } from '../utils/formatCount';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';

interface Props {
  biography: CelebrityBiography;
}

export default function StatsBar({ biography }: Props) {
  const styles = useThemedStyles(makeStyles);

  const stats: { icon: string; label: string; value: number }[] = [
    { icon: '👥', label: 'Fans',     value: biography.fanCount },
    { icon: '📰', label: 'Articles', value: biography.articleCount },
    { icon: '📸', label: 'Photos',   value: biography.photoCount },
    { icon: '🎥', label: 'Videos',   value: biography.videoCount },
    { icon: '💬', label: 'Topics',   value: biography.topicsCount },
  ];
  const visible = stats.filter((s) => s.value > 0);
  if (visible.length === 0) return null;

  return (
    <View style={styles.wrap}>
      {visible.map((s, i) => (
        <React.Fragment key={s.label}>
          <View style={styles.stat}>
            <Text style={styles.icon}>{s.icon}</Text>
            <Text style={styles.value}>{formatCount(s.value)}</Text>
            <Text style={styles.label}>{s.label}</Text>
          </View>
          {i < visible.length - 1 && <View style={styles.divider} />}
        </React.Fragment>
      ))}
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      alignItems: 'stretch',
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 10,
      marginHorizontal: 14,
      marginTop: 12,
      borderWidth: 1,
      borderColor: c.border,
    },
    stat:  { flex: 1, alignItems: 'center', gap: 2 },
    icon:  { fontSize: 16 },
    value: { fontSize: 14, fontWeight: '800', color: c.text },
    label: { fontSize: 10, color: c.textSecondary, fontWeight: '600', textTransform: 'uppercase' },
    divider: { width: 1, backgroundColor: c.border, marginVertical: 4 },
  });
}
