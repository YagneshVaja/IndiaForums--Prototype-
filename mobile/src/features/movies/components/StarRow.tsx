import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

interface Props {
  /** 0-100 percent — converted to 0-5 stars in 0.5-star steps. */
  percent: number;
  size?: number;
  color?: string;
}

export default function StarRow({ percent, size = 14, color }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const filledTone = color ?? '#F5B400';

  // 0-100 → 0-5, snap to 0.5
  const score = Math.max(0, Math.min(100, percent)) / 20;
  const rounded = Math.round(score * 2) / 2;

  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((n) => {
        let glyph = '☆';
        if (n <= rounded) glyph = '★';
        else if (n - 0.5 === rounded) glyph = '⯨'; // half — fall through to '★' tint with overlay
        const filled = n <= rounded;
        const half   = !filled && n - 0.5 === rounded;
        return (
          <Text
            key={n}
            style={[
              { fontSize: size, lineHeight: size + 2 },
              { color: filled || half ? filledTone : colors.border },
            ]}
          >
            {filled ? '★' : half ? '⯨' : glyph}
          </Text>
        );
      })}
    </View>
  );
}

function makeStyles(_c: ThemeColors) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 1 },
  });
}
