import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal, View, Text, Pressable, FlatList, StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { fetchForumHome, type Forum } from '../../../services/api';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

interface Props {
  visible: boolean;
  onClose: () => void;
  onPick:  (forum: Forum) => void;
}

export default function ReportsForumPickerSheet({ visible, onClose, onPick }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [forums,  setForums]  = useState<Forum[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchForumHome(null, 1, 50)
      .then(page => {
        if (cancelled) return;
        const modForums = page.forums.filter(
          f => (f.editPosts > 0) || (f.priorityPosts > 0) || (f.deletePosts > 0),
        );
        setForums(modForums);
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load forums.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.dragHandle} />
          <View style={styles.header}>
            <Text style={styles.title}>Pick a forum</Text>
            <Pressable onPress={onClose} style={styles.closeBtn} hitSlop={8}>
              <Ionicons name="close" size={16} color={colors.text} />
            </Pressable>
          </View>

          <Text style={styles.subtitle}>
            Review reports in a forum you moderate.
          </Text>

          {loading ? (
            <View style={styles.state}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.stateText}>Loading…</Text>
            </View>
          ) : error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : forums.length === 0 ? (
            <View style={styles.state}>
              <Ionicons name="shield-outline" size={32} color={colors.textTertiary} />
              <Text style={styles.stateText}>You don't moderate any forums.</Text>
            </View>
          ) : (
            <FlatList
              data={forums}
              keyExtractor={(f) => String(f.id)}
              renderItem={({ item }) => (
                <Pressable
                  style={({ pressed }) => [
                    styles.row,
                    pressed && styles.rowPressed,
                  ]}
                  onPress={() => onPick(item)}
                >
                  <View style={[styles.forumIcon, { backgroundColor: item.bg }]}>
                    <Text style={styles.forumEmoji}>{item.emoji}</Text>
                  </View>
                  <View style={styles.forumMeta}>
                    <Text style={styles.forumName} numberOfLines={1}>{item.name}</Text>
                    {!!item.description && (
                      <Text style={styles.forumDesc} numberOfLines={1}>{item.description}</Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                </Pressable>
              )}
              style={styles.list}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    overlay:  { flex: 1, justifyContent: 'flex-end' },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
    sheet: {
      backgroundColor: c.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingBottom: 24,
      paddingHorizontal: 16,
      paddingTop: 8,
      maxHeight: '80%',
    },
    dragHandle: {
      alignSelf: 'center', width: 44, height: 4, borderRadius: 3,
      backgroundColor: c.border, marginTop: 4, marginBottom: 12,
    },
    header: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      marginBottom: 4,
    },
    title: { fontSize: 15, fontWeight: '800', color: c.text },
    closeBtn: {
      width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center',
      backgroundColor: c.surface,
    },
    subtitle: {
      fontSize: 12, color: c.textTertiary, marginBottom: 12,
    },
    state: {
      alignItems: 'center', paddingVertical: 30, gap: 8,
    },
    stateText: { fontSize: 12, color: c.textTertiary },
    errorText: { fontSize: 12, color: c.danger, paddingVertical: 20, textAlign: 'center' },
    list: { maxHeight: 420 },
    row: {
      flexDirection: 'row', alignItems: 'center', gap: 12,
      paddingVertical: 10, paddingHorizontal: 10, borderRadius: 10,
    },
    rowPressed: { backgroundColor: c.surface },
    forumIcon: {
      width: 36, height: 36, borderRadius: 10,
      alignItems: 'center', justifyContent: 'center',
    },
    forumEmoji: { fontSize: 18 },
    forumMeta: { flex: 1, minWidth: 0 },
    forumName: { fontSize: 13, fontWeight: '700', color: c.text },
    forumDesc: { fontSize: 11, color: c.textTertiary, marginTop: 1 },
  });
}
