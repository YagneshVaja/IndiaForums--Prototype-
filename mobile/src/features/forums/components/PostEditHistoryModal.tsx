import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal, View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getPostEditHistory, type PostEditHistoryEntry } from '../../../services/api';
import { stripPostHtml } from '../utils/stripHtml';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

interface Props {
  postId: number | null;
  visible: boolean;
  onClose: () => void;
}

export default function PostEditHistoryModal({ postId, visible, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState<PostEditHistoryEntry[]>([]);
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  useEffect(() => {
    if (!visible || postId == null) {
      setEntries([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getPostEditHistory(postId)
      .then(list => { if (!cancelled) setEntries(list); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [visible, postId]);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.modal} onPress={e => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>Edit history</Text>
            <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
              <Ionicons name="close" size={16} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            {loading && (
              <View style={styles.stateBox}>
                <ActivityIndicator color={colors.primary} />
                <Text style={styles.stateText}>Loading…</Text>
              </View>
            )}
            {!loading && entries.length === 0 && (
              <View style={styles.stateBox}>
                <Text style={styles.stateText}>No edit history recorded.</Text>
              </View>
            )}
            {!loading && entries.map(entry => {
              const when = entry.editedWhen
                ? new Date(entry.editedWhen).toLocaleString()
                : '';
              const body = stripPostHtml(entry.message);
              return (
                <View key={entry.id} style={styles.entry}>
                  <View style={styles.entryMeta}>
                    <Text style={styles.entryEditor}>{entry.editor || 'Unknown'}</Text>
                    {!!when && <Text style={styles.entryDate}>{when}</Text>}
                  </View>
                  {!!body && <Text style={styles.entryBody}>{body}</Text>}
                </View>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 20,
    },
    modal: {
      width: '100%',
      maxWidth: 400,
      maxHeight: '80%',
      backgroundColor: c.card,
      borderRadius: 14,
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    title: { fontSize: 14, fontWeight: '800', color: c.text },
    closeBtn: {
      width: 28, height: 28, borderRadius: 14,
      backgroundColor: c.surface,
      alignItems: 'center', justifyContent: 'center',
    },
    body: { maxHeight: 440 },
    bodyContent: { padding: 14, gap: 12 },
    stateBox: {
      alignItems: 'center',
      paddingVertical: 32,
      gap: 8,
    },
    stateText: { fontSize: 12, fontWeight: '600', color: c.textTertiary },
    entry: {
      padding: 10,
      backgroundColor: c.surface,
      borderRadius: 10,
    },
    entryMeta: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 6,
    },
    entryEditor: {
      fontSize: 11,
      fontWeight: '800',
      color: c.primary,
    },
    entryDate: {
      fontSize: 10,
      fontWeight: '600',
      color: c.textTertiary,
    },
    entryBody: {
      fontSize: 12,
      color: c.text,
      lineHeight: 17,
    },
  });
}
