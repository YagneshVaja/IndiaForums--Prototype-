import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';

interface Props {
  rows?: number;
}

export default function DiscussionListSkeleton({ rows = 3 }: Props) {
  const styles = useThemedStyles(makeStyles);
  const rowsArr = Array.from({ length: rows });
  return (
    <View>
      {rowsArr.map((_, i) => (
        <View key={i} style={styles.card}>
          <View style={styles.accentBar} />
          <View style={styles.body}>
            <View style={[styles.line, { width: '85%', height: 13 }]} />
            <View style={[styles.line, { width: '60%', height: 11, marginTop: 7 }]} />
            <View style={[styles.line, { width: '95%', height: 10, marginTop: 6 }]} />
            <View style={[styles.line, { width: '40%', height: 9, marginTop: 9 }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      gap: 10,
      marginHorizontal: 14,
      marginBottom: 8,
      padding: 12,
      borderRadius: 12,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
    },
    accentBar: {
      width: 3,
      alignSelf: 'stretch',
      borderRadius: 2,
      backgroundColor: c.cardElevated,
    },
    body: { flex: 1 },
    line: {
      backgroundColor: c.cardElevated,
      borderRadius: 4,
    },
  });
}
