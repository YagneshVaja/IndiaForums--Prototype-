import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useThemeStore } from '../../../store/themeStore';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';

interface Props {
  visible: boolean;
  currentPage: number;
  totalPages: number;
  label?: string;
  onClose: () => void;
  onJump: (page: number) => void;
  /** Warms the page cache as the user types or press-ins a tile — so the
   *  jump commit feels instant on slow networks. */
  onPrefetchPage?: (page: number) => void;
}

const COLUMNS = 5;

export default function JumpToPageSheet({
  visible,
  currentPage,
  totalPages,
  label = 'topics',
  onClose,
  onJump,
  onPrefetchPage,
}: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useThemedStyles(makeStyles);

  const [manualInput, setManualInput] = useState('');
  const scrollRef = useRef<ScrollView | null>(null);

  // Reset input + scroll to current page when the sheet opens.
  useEffect(() => {
    if (!visible) return;
    setManualInput('');
    // Defer so the ScrollView has rendered.
    requestAnimationFrame(() => {
      const rowIndex = Math.floor((Math.max(1, currentPage) - 1) / COLUMNS);
      const y = Math.max(0, rowIndex * 44 - 60);
      scrollRef.current?.scrollTo({ y, animated: false });
    });
  }, [visible, currentPage]);

  const pages = useMemo(() => Array.from({ length: totalPages }, (_, i) => i + 1), [totalPages]);

  const handleManualGo = () => {
    const n = parseInt(manualInput.trim(), 10);
    if (!Number.isFinite(n)) return;
    const clamped = Math.min(Math.max(n, 1), totalPages);
    onJump(clamped);
  };

  const showManualInput = totalPages > 30;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.dragHandle} />
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Jump to page</Text>
              <Text style={styles.subtitle}>
                {totalPages.toLocaleString()} pages of {label}
              </Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
              <Ionicons name="close" size={16} color={colors.text} />
            </Pressable>
          </View>

          {showManualInput && (
            <View style={styles.manualRow}>
              <TextInput
                style={styles.manualInput}
                placeholder={`Page number (1–${totalPages})`}
                placeholderTextColor={colors.textTertiary}
                keyboardType="number-pad"
                value={manualInput}
                onChangeText={(t) => {
                  setManualInput(t);
                  // Prefetch while typing — when the user hits Go, the data
                  // is usually already in cache.
                  const n = parseInt(t.trim(), 10);
                  if (Number.isFinite(n) && n >= 1 && n <= totalPages && n !== currentPage) {
                    onPrefetchPage?.(n);
                  }
                }}
                onSubmitEditing={handleManualGo}
                returnKeyType="go"
                maxLength={String(totalPages).length}
              />
              <Pressable
                style={[styles.manualGo, !manualInput.trim() && styles.manualGoDisabled]}
                onPress={handleManualGo}
                disabled={!manualInput.trim()}
              >
                <Text style={styles.manualGoText}>Go</Text>
              </Pressable>
            </View>
          )}

          <ScrollView
            ref={scrollRef}
            style={styles.gridScroll}
            contentContainerStyle={styles.gridContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.grid}>
              {pages.map((p) => {
                const isCurrent = p === currentPage;
                return (
                  <Pressable
                    key={p}
                    style={({ pressed }) => [
                      styles.pageBtn,
                      isCurrent && styles.pageBtnActive,
                      pressed && !isCurrent && styles.pageBtnPressed,
                    ]}
                    onPress={() => onJump(p)}
                    onPressIn={!isCurrent ? () => onPrefetchPage?.(p) : undefined}
                    accessibilityRole="button"
                    accessibilityLabel={`Page ${p}${isCurrent ? ', current' : ''}`}
                  >
                    <Text style={[styles.pageBtnText, isCurrent && styles.pageBtnTextActive]}>
                      {p}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              style={styles.footerBtn}
              onPress={() => onJump(1)}
              onPressIn={currentPage !== 1 ? () => onPrefetchPage?.(1) : undefined}
              disabled={currentPage === 1}
            >
              <Ionicons
                name="play-back"
                size={13}
                color={currentPage === 1 ? colors.textTertiary : colors.primary}
              />
              <Text
                style={[
                  styles.footerBtnText,
                  currentPage === 1 && styles.footerBtnTextDisabled,
                ]}
              >
                First
              </Text>
            </Pressable>
            <View style={styles.footerSpacer} />
            <Pressable
              style={styles.footerBtn}
              onPress={() => onJump(totalPages)}
              onPressIn={
                currentPage !== totalPages ? () => onPrefetchPage?.(totalPages) : undefined
              }
              disabled={currentPage === totalPages}
            >
              <Text
                style={[
                  styles.footerBtnText,
                  currentPage === totalPages && styles.footerBtnTextDisabled,
                ]}
              >
                Last
              </Text>
              <Ionicons
                name="play-forward"
                size={13}
                color={currentPage === totalPages ? colors.textTertiary : colors.primary}
              />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
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
      paddingBottom: 20,
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
      marginBottom: 14,
    },
    title: {
      fontSize: 16,
      fontWeight: '800',
      color: c.text,
    },
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
    manualRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 12,
    },
    manualInput: {
      flex: 1,
      height: 40,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      paddingHorizontal: 12,
      fontSize: 14,
      color: c.text,
    },
    manualGo: {
      paddingHorizontal: 18,
      height: 40,
      borderRadius: 10,
      backgroundColor: c.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    manualGoDisabled: {
      opacity: 0.4,
    },
    manualGoText: {
      fontSize: 13,
      fontWeight: '700',
      color: c.onPrimary,
    },
    gridScroll: {
      maxHeight: 320,
    },
    gridContent: {
      paddingBottom: 8,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    pageBtn: {
      width: `${100 / COLUMNS - 2}%`,
      height: 40,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pageBtnPressed: {
      backgroundColor: c.surface,
    },
    pageBtnActive: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    pageBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: c.text,
    },
    pageBtnTextActive: {
      color: c.onPrimary,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 14,
      paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    footerSpacer: { flex: 1 },
    footerBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 6,
      paddingHorizontal: 8,
    },
    footerBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: c.primary,
      letterSpacing: 0.2,
    },
    footerBtnTextDisabled: {
      color: c.textTertiary,
    },
  });
}
