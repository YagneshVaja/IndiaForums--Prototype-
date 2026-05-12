import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../../../store/themeStore';
import { useThemedStyles } from '../../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../../theme/tokens';
import { useProfileTab } from '../../hooks/useProfileTab';
import TabShell from './TabShell';
import { fmtDate, stripHtml } from '../../utils/format';

interface Props {
  userId: number | string;
}

function levelMeta(c: ThemeColors): Record<number, { label: string; color: string; bg: string }> {
  return {
    1: { label: 'Low', color: c.warning, bg: c.warningSoft },
    2: { label: 'Medium', color: c.danger, bg: c.dangerSoft },
    3: { label: 'High', color: c.danger, bg: c.dangerSoft },
  };
}

export default function WarningsTab({ userId }: Props) {
  const q = useProfileTab({ tab: 'warnings', userId, isOwn: true, page: 1 });
  const colors = useThemeStore((s) => s.colors);
  const styles = useThemedStyles(makeStyles);
  const items = q.data && q.data.kind === 'warnings' ? q.data.items : [];
  const LEVEL_META = useMemo(() => levelMeta(colors), [colors]);

  return (
    <TabShell
      isLoading={q.isLoading}
      isError={q.isError}
      error={q.error}
      onRetry={q.refetch}
      isEmpty={!q.isLoading && items.length === 0}
      emptyIcon="shield-checkmark-outline"
      emptyTitle="No warnings on your account"
      emptySubtitle="You are in good standing with the community."
    >
      <View style={styles.list}>
        {items.map((w) => {
          const lvl = typeof w.warnLevel === 'string' ? parseInt(w.warnLevel, 10) : w.warnLevel;
          const meta = LEVEL_META[lvl] || { label: 'Warning', color: colors.textSecondary, bg: colors.surface };
          return (
            <View key={String(w.warningId)} style={styles.row}>
              <View style={styles.head}>
                <Ionicons name="warning-outline" size={14} color={meta.color} />
                <View style={[styles.pill, { backgroundColor: meta.bg }]}>
                  <Text style={[styles.pillText, { color: meta.color }]}>{meta.label}</Text>
                </View>
                <Text style={styles.date}>{fmtDate(w.createdWhen)}</Text>
              </View>
              <Text style={styles.body}>{stripHtml(w.message)}</Text>
              {!w.anonymous && w.userName ? (
                <Text style={styles.by}>— {w.userName}</Text>
              ) : null}
            </View>
          );
        })}
      </View>
    </TabShell>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    list: { gap: 10, paddingVertical: 8 },
    row: {
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 14,
      gap: 6,
      borderLeftWidth: 4,
      borderLeftColor: c.danger,
    },
    head: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    pill: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
    },
    pillText: {
      fontSize: 10,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    date: {
      fontSize: 11,
      color: c.textTertiary,
      marginLeft: 'auto',
    },
    body: {
      fontSize: 13,
      color: c.text,
      lineHeight: 19,
    },
    by: {
      fontSize: 12,
      fontStyle: 'italic',
      color: c.textTertiary,
    },
  });
}
