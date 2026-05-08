import React, { useMemo } from 'react';
import {
  Modal, View, Text, Pressable, ScrollView, StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { formatCount } from '../utils/format';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import type { TopicTopPoster } from '../../../services/api';

interface Props {
  visible: boolean;
  posters: TopicTopPoster[];
  onClose: () => void;
}

/**
 * Bottom-sheet list of the topic's most-prolific posters. Replaces the
 * inline horizontal scroll of avatar-with-badge so the Replies area gets
 * its breathing room back.
 */
export default function FrequentPostersSheet({ visible, posters, onClose }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.dragHandle} />
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Top contributors</Text>
              <Text style={styles.subtitle}>
                {posters.length === 1
                  ? '1 person posting in this topic'
                  : `${posters.length} people posting in this topic`}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
              <Ionicons name="close" size={16} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            {posters.map((p, idx) => (
              <View key={p.userId} style={styles.row}>
                <Text style={styles.rank}>#{idx + 1}</Text>
                {p.avatarUrl ? (
                  <Image
                    source={{ uri: p.avatarUrl }}
                    style={styles.avatar}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    transition={150}
                  />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback]}>
                    <Text style={styles.avatarLetter}>
                      {(p.userName || 'U').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.body}>
                  <Text style={styles.name} numberOfLines={1}>
                    {p.userName || 'Unknown'}
                  </Text>
                </View>
                <View style={styles.countPill}>
                  <Ionicons name="chatbubble-ellipses" size={11} color={colors.primary} />
                  <Text style={styles.countText}>{formatCount(p.postCount)}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    overlay: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: c.scrim },
    sheet: {
      backgroundColor: c.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingTop: 8,
      paddingHorizontal: 16,
      paddingBottom: 24,
      maxHeight: '70%',
    },
    dragHandle: {
      alignSelf: 'center',
      width: 44,
      height: 5,
      borderRadius: 3,
      backgroundColor: c.border,
      marginBottom: 10,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    title: { fontSize: 16, fontWeight: '800', color: c.text },
    subtitle: {
      fontSize: 11,
      fontWeight: '600',
      color: c.textTertiary,
      marginTop: 2,
      letterSpacing: 0.2,
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: c.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scroll: { maxHeight: 480 },
    scrollContent: { paddingVertical: 6 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 10,
      paddingHorizontal: 4,
    },
    rank: {
      width: 28,
      fontSize: 11,
      fontWeight: '800',
      color: c.textTertiary,
      letterSpacing: 0.4,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: c.surface,
    },
    avatarFallback: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.primary,
    },
    avatarLetter: {
      color: c.onPrimary,
      fontSize: 15,
      fontWeight: '800',
    },
    body: { flex: 1, gap: 2 },
    name: { fontSize: 14, fontWeight: '700', color: c.text },
    countPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: c.primarySoft,
    },
    countText: {
      fontSize: 12,
      fontWeight: '800',
      color: c.primary,
    },
  });
}
