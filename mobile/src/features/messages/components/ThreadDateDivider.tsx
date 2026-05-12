import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';

interface Props {
  label: string;
}

// IndiaForums users are overwhelmingly Indian — keep grouping/labels consistent
// regardless of device timezone so a UTC timestamp like `2026-05-12T19:30:00Z`
// is bucketed into May 13 IST (not May 12) the same way for everyone.
const APP_TIMEZONE = 'Asia/Kolkata';

const PARTS_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const LABEL_FORMATTER = new Intl.DateTimeFormat('en-IN', {
  timeZone: APP_TIMEZONE,
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

function parseDate(input: string | null | undefined): Date | null {
  if (!input) return null;
  const d = new Date(input);
  return Number.isFinite(d.getTime()) ? d : null;
}

// Returns a stable `YYYY-MM-DD` string in IST. Used both by the divider label
// and by message grouping in the thread screen, so a single message can't be
// bucketed two different ways.
export function dayKey(input: string | null | undefined): string {
  const d = parseDate(input);
  if (!d) return '';
  return PARTS_FORMATTER.format(d);
}

function ThreadDateDividerImpl({ label }: Props) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.wrap}>
      <View style={styles.chip}>
        <Text style={styles.text}>{label}</Text>
      </View>
    </View>
  );
}

export default React.memo(ThreadDateDividerImpl);

export function dateDividerLabel(input: string | null | undefined): string {
  const d = parseDate(input);
  if (!d) return '';
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const target = dayKey(input);
  if (!target) return '';
  if (target === PARTS_FORMATTER.format(today)) return 'Today';
  if (target === PARTS_FORMATTER.format(yesterday)) return 'Yesterday';
  return LABEL_FORMATTER.format(d);
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      alignItems: 'center',
      marginVertical: 10,
    },
    chip: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: c.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.border,
    },
    text: {
      fontSize: 11,
      fontWeight: '700',
      color: c.textTertiary,
      letterSpacing: 0.2,
    },
  });
}
