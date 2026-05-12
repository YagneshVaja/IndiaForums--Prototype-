import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { CelebrityFan } from '../../../services/api';
import Initials from './Initials';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';

interface Props {
  fan: CelebrityFan;
}

export default function FanCard({ fan }: Props) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.card}>
      <Initials name={fan.name} size={44} bgColor={fan.avatarAccent} />
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{fan.name}</Text>
        {!!fan.level && <Text style={styles.level} numberOfLines={1}>{fan.level}</Text>}
      </View>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: c.card,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 10,
      padding: 10,
      flex: 1,
    },
    info:  { flex: 1, gap: 2 },
    name:  { fontSize: 13, fontWeight: '700', color: c.text },
    level: { fontSize: 11, color: c.textSecondary },
  });
}
