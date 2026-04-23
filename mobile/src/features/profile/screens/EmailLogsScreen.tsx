import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';

import type { MySpaceStackParamList } from '../../../navigation/types';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import { TopNavBack } from '../../../components/layout/TopNavBar';
import ErrorState from '../../../components/ui/ErrorState';
import EmptyState from '../components/EmptyState';
import { extractApiError } from '../../../services/api';
import { fmtDate, timeAgo } from '../utils/format';

import { getEmailLogs } from '../services/profileApi';
import type { EmailLogDto } from '../types';

type Props = NativeStackScreenProps<MySpaceStackParamList, 'EmailLogs'>;

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

export default function EmailLogsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const colors = useThemeStore((s) => s.colors);
  const mode = useThemeStore((s) => s.mode);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const q = useQuery({
    queryKey: ['email-logs'],
    queryFn: getEmailLogs,
    staleTime: 60_000,
  });

  const logs = q.data?.emailLogs ?? [];
  const statusBarStyle = mode === 'dark' ? 'light-content' : 'dark-content';

  return (
    <View style={styles.screen}>
      <StatusBar barStyle={statusBarStyle} />
      <TopNavBack title="Email History" onBack={() => navigation.goBack()} />

      <ScrollView
        contentContainerStyle={{ padding: 14, paddingBottom: insets.bottom + 40 }}
        refreshControl={
          <RefreshControl
            refreshing={q.isRefetching}
            onRefresh={q.refetch}
            tintColor={colors.primary}
          />
        }
      >
        {q.isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : q.isError ? (
          <ErrorState message={extractApiError(q.error)} onRetry={q.refetch} />
        ) : (
          <>
            {/* Header with current email + verified state */}
            {q.data ? (
              <View
                style={[
                  styles.headerCard,
                  q.data.emailConfirmed ? styles.headerCardOk : styles.headerCardWarn,
                ]}
              >
                <Ionicons
                  name={q.data.emailConfirmed ? 'checkmark-circle' : 'alert-circle-outline'}
                  size={18}
                  color={q.data.emailConfirmed ? '#1F9254' : '#B45309'}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.headerEmail}>{q.data.email}</Text>
                  <Text style={styles.headerStatus}>
                    {q.data.emailConfirmed ? 'Verified' : 'Not verified'}
                    {' · '}
                    {String(q.data.totalCount)} emails sent
                  </Text>
                </View>
              </View>
            ) : null}

            {logs.length === 0 ? (
              <EmptyState
                icon="mail-outline"
                title="No emails sent yet"
                subtitle="Verification and notification emails will appear here."
              />
            ) : (
              <View style={styles.list}>
                {logs.map((l) => (
                  <LogRow key={String(l.emailLogId)} l={l} styles={styles} colors={colors} />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function LogRow({
  l,
  styles,
  colors,
}: {
  l: EmailLogDto;
  styles: ReturnType<typeof makeStyles>;
  colors: ThemeColors;
}) {
  const status = (l.status || '').toLowerCase();
  const kind =
    status.includes('fail') || status.includes('err')
      ? 'failed'
      : status.includes('sent') || status.includes('ok') || status === 'success'
        ? 'sent'
        : 'other';

  const statusMeta: Record<'sent' | 'failed' | 'other', { color: string; icon: IoniconName }> = {
    sent: { color: '#1F9254', icon: 'checkmark-circle-outline' },
    failed: { color: colors.danger, icon: 'alert-circle-outline' },
    other: { color: colors.textSecondary, icon: 'time-outline' },
  };
  const sm = statusMeta[kind];

  return (
    <View style={styles.row}>
      <View style={[styles.statusBadge, { borderColor: sm.color }]}>
        <Ionicons name={sm.icon} size={14} color={sm.color} />
      </View>
      <View style={styles.body}>
        <Text style={styles.subject} numberOfLines={2}>
          {l.subject}
        </Text>
        <View style={styles.metaRow}>
          {l.emailType ? <Text style={styles.meta}>{l.emailType}</Text> : null}
          {l.status ? <Text style={[styles.meta, { color: sm.color }]}>· {l.status}</Text> : null}
          <Text style={styles.metaMuted}>· {timeAgo(l.sentWhen)}</Text>
        </View>
        <Text style={styles.metaMuted}>{fmtDate(l.sentWhen)}</Text>
      </View>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    center: { paddingVertical: 48, alignItems: 'center' },

    headerCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 12,
      borderRadius: 12,
      borderWidth: 1,
      marginBottom: 14,
    },
    headerCardOk: {
      backgroundColor: '#E8F5EE',
      borderColor: '#C6E6D5',
    },
    headerCardWarn: {
      backgroundColor: '#FEF3C7',
      borderColor: '#FCD38A',
    },
    headerEmail: {
      fontSize: 14,
      fontWeight: '800',
      color: c.text,
    },
    headerStatus: {
      fontSize: 12,
      color: c.textSecondary,
      marginTop: 2,
      fontWeight: '600',
    },

    list: { gap: 8 },
    row: {
      flexDirection: 'row',
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 12,
      gap: 12,
    },
    statusBadge: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.card,
    },
    body: {
      flex: 1,
      gap: 2,
    },
    subject: {
      fontSize: 13,
      fontWeight: '700',
      color: c.text,
      lineHeight: 18,
    },
    metaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 4,
      marginTop: 2,
    },
    meta: {
      fontSize: 11,
      color: c.textSecondary,
      fontWeight: '600',
    },
    metaMuted: {
      fontSize: 11,
      color: c.textTertiary,
    },
  });
}
