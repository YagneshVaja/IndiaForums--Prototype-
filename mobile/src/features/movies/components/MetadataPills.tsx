import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';

export interface Pill {
  label: string;
  tone?: 'default' | 'accent' | 'success' | 'warn';
}

interface Props {
  pills: Pill[];
}

function MetadataPillsImpl({ pills }: Props) {
  const styles = useThemedStyles(makeStyles);
  if (pills.length === 0) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {pills.map((p, i) => (
        <View
          key={`${p.label}-${i}`}
          style={[
            styles.pill,
            p.tone === 'accent'  ? styles.pillAccent  :
            p.tone === 'success' ? styles.pillSuccess :
            p.tone === 'warn'    ? styles.pillWarn    :
                                    styles.pillDefault,
          ]}
        >
          <Text style={[
            styles.pillText,
            p.tone === 'accent'  ? styles.pillTextAccent  :
            p.tone === 'success' ? styles.pillTextSuccess :
            p.tone === 'warn'    ? styles.pillTextWarn    :
                                    styles.pillTextDefault,
          ]}>
            {p.label}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}

const MetadataPills = React.memo(MetadataPillsImpl);
export default MetadataPills;

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    row: {
      paddingHorizontal: 14,
      paddingTop: 10,
      gap: 6,
      alignItems: 'center',
    },
    pill: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 14,
      borderWidth: 1,
    },
    pillText: { fontSize: 11.5, fontWeight: '700', letterSpacing: 0.2 },
    pillDefault: { backgroundColor: c.card, borderColor: c.border },
    pillTextDefault: { color: c.textSecondary },
    pillAccent: { backgroundColor: c.primarySoft, borderColor: c.primarySoft },
    pillTextAccent: { color: c.primary },
    pillSuccess: { backgroundColor: '#DCFCE7', borderColor: '#86EFAC' },
    pillTextSuccess: { color: '#166534' },
    pillWarn: { backgroundColor: '#FEF3C7', borderColor: '#FCD34D' },
    pillTextWarn: { color: '#92400E' },
  });
}
