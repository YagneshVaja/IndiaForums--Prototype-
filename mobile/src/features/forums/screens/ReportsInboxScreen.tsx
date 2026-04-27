import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { TopNavBack } from '../../../components/layout/TopNavBar';
import LoadingState from '../../../components/ui/LoadingState';
import ErrorState from '../../../components/ui/ErrorState';
import {
  getReportedTopics, getReportedPosts, closeReports, closeReportedTopic,
  type ReportedTopic, type ReportedPost,
} from '../../../services/api';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import type { ForumsStackParamList } from '../../../navigation/types';

type Nav = NativeStackNavigationProp<ForumsStackParamList, 'ReportsInbox'>;
type Rt  = RouteProp<ForumsStackParamList, 'ReportsInbox'>;

export default function ReportsInboxScreen() {
  const navigation = useNavigation<Nav>();
  const { forum } = useRoute<Rt>().params;
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [topics, setTopics]   = useState<ReportedTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [selected, setSelected] = useState<ReportedTopic | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await getReportedTopics(forum.id, { pageNumber: 1, pageSize: 50 });
      setTopics(items);
    } catch {
      setError('Failed to load reported topics.');
    } finally {
      setLoading(false);
    }
  }, [forum.id]);

  useEffect(() => { load(); }, [load]);

  if (selected) {
    return (
      <ReportedPostsView
        topic={selected}
        forumId={forum.id}
        onBack={() => { setSelected(null); load(); }}
      />
    );
  }

  return (
    <View style={styles.screen}>
      <TopNavBack title="Reports" onBack={() => navigation.goBack()} />

      <View style={styles.subHeader}>
        <Text style={styles.subHeaderLabel}>Forum</Text>
        <Text style={styles.subHeaderValue} numberOfLines={1}>{forum.name}</Text>
      </View>

      {loading ? (
        <LoadingState height={300} />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : topics.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🎉</Text>
          <Text style={styles.emptyTitle}>No reports</Text>
          <Text style={styles.emptySub}>Nothing has been reported in this forum.</Text>
        </View>
      ) : (
        <FlatList
          data={topics}
          keyExtractor={(t) => String(t.topicId)}
          renderItem={({ item }) => (
            <Pressable style={styles.topicRow} onPress={() => setSelected(item)}>
              <View style={styles.topicHeader}>
                <Text style={styles.topicSubject} numberOfLines={1}>{item.subject}</Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{item.reportCount}</Text>
                </View>
              </View>
              <View style={styles.topicMeta}>
                <Text style={styles.metaLabel}>Reported by</Text>
                <Text style={styles.metaValue} numberOfLines={1}>{item.reportedBy}</Text>
              </View>
              {!!item.reason && (
                <Text style={styles.reason} numberOfLines={2}>{item.reason}</Text>
              )}
            </Pressable>
          )}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

function ReportedPostsView({
  topic, forumId, onBack,
}: {
  topic:   ReportedTopic;
  forumId: number;
  onBack:  () => void;
}) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [posts,   setPosts]   = useState<ReportedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [busyId,  setBusyId]  = useState<number | null>(null);
  const [closing, setClosing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const items = await getReportedPosts(topic.topicId, { pageNumber: 1, pageSize: 50 });
      setPosts(items);
    } catch {
      setError('Failed to load reported posts.');
    } finally {
      setLoading(false);
    }
  }, [topic.topicId]);

  useEffect(() => { load(); }, [load]);

  async function dismiss(reportId: number) {
    if (!reportId || busyId != null) return;
    setBusyId(reportId);
    const res = await closeReports({ reportIds: [reportId], forumId });
    setBusyId(null);
    if (res.ok) {
      setPosts(prev => prev.filter(p => p.reportId !== reportId));
    } else {
      setError(res.error || 'Failed to dismiss report.');
    }
  }

  async function closeTopic() {
    if (closing) return;
    setClosing(true);
    setError(null);
    const res = await closeReportedTopic({
      topicId:         topic.topicId,
      forumId,
      closePost:       'Closed by moderator after report review.',
      isCloseWithPost: true,
    });
    setClosing(false);
    if (res.ok) {
      onBack();
    } else {
      setError(res.error || 'Failed to close reported topic.');
    }
  }

  return (
    <View style={styles.screen}>
      <TopNavBack title="Reports" onBack={onBack} />

      <View style={styles.subHeader}>
        <Text style={styles.subHeaderLabel}>Topic</Text>
        <Text style={styles.subHeaderValue} numberOfLines={1}>{topic.subject}</Text>
        <Pressable
          style={[styles.closeBtn, closing && styles.closeBtnBusy]}
          onPress={closeTopic}
          disabled={closing}
        >
          {closing ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.closeBtnText}>Close topic</Text>
          )}
        </Pressable>
      </View>

      {loading ? (
        <LoadingState height={300} />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : posts.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>✅</Text>
          <Text style={styles.emptyTitle}>No reported posts</Text>
          <Text style={styles.emptySub}>All reports for this topic are resolved.</Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(p) => String(p.reportId)}
          renderItem={({ item }) => (
            <View style={styles.postRow}>
              <View style={styles.topicMeta}>
                <Text style={styles.metaLabel}>By</Text>
                <Text style={styles.metaValue} numberOfLines={1}>{item.author}</Text>
              </View>
              {!!item.reason && (
                <Text style={styles.reasonStrong}>
                  <Text style={styles.reasonLabel}>Reason: </Text>{item.reason}
                </Text>
              )}
              {!!item.message && (
                <Text style={styles.postBody} numberOfLines={5}>{item.message}</Text>
              )}
              <Pressable
                style={[styles.dismissBtn, busyId === item.reportId && styles.dismissBtnBusy]}
                onPress={() => dismiss(item.reportId)}
                disabled={busyId === item.reportId}
              >
                <Ionicons name="checkmark-circle-outline" size={14} color={colors.text} />
                <Text style={styles.dismissBtnText}>
                  {busyId === item.reportId ? 'Dismissing…' : 'Dismiss report'}
                </Text>
              </Pressable>
            </View>
          )}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    subHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 14,
      paddingVertical: 12,
      backgroundColor: c.card,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    subHeaderLabel: {
      fontSize: 10,
      fontWeight: '800',
      color: c.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    subHeaderValue: {
      flex: 1,
      fontSize: 13,
      fontWeight: '700',
      color: c.text,
    },
    closeBtn: {
      backgroundColor: c.danger,
      paddingVertical: 7,
      paddingHorizontal: 12,
      borderRadius: 8,
      minWidth: 90,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeBtnBusy: { opacity: 0.7 },
    closeBtnText: { color: c.onPrimary, fontSize: 12, fontWeight: '700' },
    list: { padding: 12, gap: 10, paddingBottom: 40 },
    topicRow: {
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 12,
      gap: 6,
      borderWidth: 1,
      borderColor: c.border,
      marginBottom: 10,
    },
    topicHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    topicSubject: {
      flex: 1,
      fontSize: 14,
      fontWeight: '800',
      color: c.text,
    },
    countBadge: {
      backgroundColor: c.danger,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
      minWidth: 24,
      alignItems: 'center',
    },
    countBadgeText: { color: c.onPrimary, fontSize: 11, fontWeight: '800' },
    topicMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    metaLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: c.textTertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    metaValue: { fontSize: 12, fontWeight: '600', color: c.text, flex: 1 },
    reason: { fontSize: 12, color: c.textSecondary, lineHeight: 16 },
    postRow: {
      backgroundColor: c.card,
      borderRadius: 12,
      padding: 12,
      gap: 8,
      borderWidth: 1,
      borderColor: c.border,
      marginBottom: 10,
    },
    reasonStrong: { fontSize: 12, color: c.textSecondary, lineHeight: 17 },
    reasonLabel:  { fontWeight: '800', color: c.text },
    postBody: {
      fontSize: 12,
      color: c.text,
      backgroundColor: c.surface,
      padding: 10,
      borderRadius: 8,
      lineHeight: 17,
    },
    dismissBtn: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: c.surface,
      paddingVertical: 7,
      paddingHorizontal: 12,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.border,
    },
    dismissBtnBusy: { opacity: 0.6 },
    dismissBtnText: { fontSize: 12, fontWeight: '700', color: c.text },
    empty: {
      alignItems: 'center',
      padding: 40,
      gap: 8,
    },
    emptyIcon: { fontSize: 36 },
    emptyTitle: { fontSize: 15, fontWeight: '700', color: c.text },
    emptySub:   { fontSize: 12, color: c.textTertiary, textAlign: 'center' },
  });
}
