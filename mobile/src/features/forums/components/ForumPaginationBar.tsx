import React, { useEffect, useMemo } from 'react';
import { Pressable, Text, View, StyleSheet, Platform } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

interface Props {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  itemLabel: string;
  /** True while the user is scrolling down, hides the bar to maximise content. */
  hidden?: boolean;
  onPageChange: (page: number) => void;
  onOpenJumpSheet?: () => void;
}

/**
 * Sticky bottom pagination bar — modern mobile pattern.
 *
 *   ┌──────────────────────────────────────────────────┐
 *   │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │  ← progress
 *   │  ‹ Prev      Page 4 / 75 ▾       Next ›          │
 *   │           Showing 61–80 of 1,500 topics          │
 *   └──────────────────────────────────────────────────┘
 *
 * Auto-hides on scroll down (à la Twitter/Reddit), reappears on scroll up.
 * Tap the central pill to open a jump sheet for arbitrary navigation.
 */
export default function ForumPaginationBar({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  itemLabel,
  hidden,
  onPageChange,
  onOpenJumpSheet,
}: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const translateY = useSharedValue(0);
  useEffect(() => {
    translateY.value = withTiming(hidden ? 100 : 0, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
    });
  }, [hidden, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: 1 - translateY.value / 100,
  }));

  if (totalPages <= 1) return null;

  const canPrev = currentPage > 1;
  const canNext = currentPage < totalPages;
  const progress = Math.min(1, Math.max(0, currentPage / totalPages));

  // Item range for the current page — the most concrete thing we can tell the
  // user about *what they're looking at* (vs. "page 4 of 75" which is abstract).
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(totalItems, currentPage * pageSize);

  const haptic = (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
    if (Platform.OS === 'web') return;
    Haptics.impactAsync(style).catch(() => {});
  };

  const goPrev = () => {
    if (!canPrev) return;
    haptic();
    onPageChange(currentPage - 1);
  };

  const goNext = () => {
    if (!canNext) return;
    haptic();
    onPageChange(currentPage + 1);
  };

  const openJump = () => {
    haptic(Haptics.ImpactFeedbackStyle.Medium);
    onOpenJumpSheet?.();
  };

  return (
    <Animated.View style={[styles.wrap, animatedStyle]}>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      <View style={styles.row}>
        <Pressable
          onPress={goPrev}
          disabled={!canPrev}
          style={({ pressed }) => [
            styles.sideBtn,
            !canPrev && styles.sideBtnDisabled,
            pressed && canPrev && styles.sideBtnPressed,
          ]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Previous page"
        >
          <Ionicons
            name="chevron-back"
            size={18}
            color={canPrev ? colors.text : colors.textTertiary}
          />
          <Text style={[styles.sideBtnText, !canPrev && styles.sideBtnTextDisabled]}>
            Prev
          </Text>
        </Pressable>

        <Pressable
          onPress={openJump}
          style={({ pressed }) => [styles.center, pressed && styles.centerPressed]}
          accessibilityRole="button"
          accessibilityLabel={`Page ${currentPage} of ${totalPages}. Tap to jump.`}
        >
          <Text style={styles.centerText}>
            <Text style={styles.centerNum}>{currentPage}</Text>
            <Text style={styles.centerOf}> / </Text>
            <Text style={styles.centerTotal}>{totalPages}</Text>
          </Text>
          <Ionicons name="chevron-down" size={11} color={colors.primary} />
        </Pressable>

        <Pressable
          onPress={goNext}
          disabled={!canNext}
          style={({ pressed }) => [
            styles.sideBtn,
            styles.sideBtnRight,
            !canNext && styles.sideBtnDisabled,
            pressed && canNext && styles.sideBtnPressed,
          ]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Next page"
        >
          <Text style={[styles.sideBtnText, !canNext && styles.sideBtnTextDisabled]}>
            Next
          </Text>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={canNext ? colors.text : colors.textTertiary}
          />
        </Pressable>
      </View>

      <Text style={styles.rangeText} numberOfLines={1}>
        Showing{' '}
        <Text style={styles.rangeNum}>
          {startItem.toLocaleString()}–{endItem.toLocaleString()}
        </Text>
        <Text style={styles.rangeMuted}> of </Text>
        <Text style={styles.rangeNum}>{totalItems.toLocaleString()}</Text>
        {' '}{itemLabel}
      </Text>
    </Animated.View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      backgroundColor: c.card,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
      paddingTop: 6,
      paddingBottom: 10,
      // Slight elevation so it floats above the list cleanly
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 6,
    },
    progressTrack: {
      height: 2,
      backgroundColor: c.border,
      marginHorizontal: 14,
      borderRadius: 1,
      overflow: 'hidden',
      marginBottom: 7,
    },
    progressFill: {
      height: '100%',
      backgroundColor: c.primary,
      borderRadius: 1,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 8,
    },
    sideBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      minWidth: 78,
      height: 36,
      paddingHorizontal: 10,
      borderRadius: 10,
    },
    sideBtnRight: {
      justifyContent: 'flex-end',
    },
    sideBtnDisabled: {
      opacity: 0.4,
    },
    sideBtnPressed: {
      backgroundColor: c.surface,
    },
    sideBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: c.text,
    },
    sideBtnTextDisabled: {
      color: c.textTertiary,
    },
    center: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: c.primarySoft,
      borderWidth: 1,
      borderColor: c.primarySoft,
    },
    centerPressed: {
      opacity: 0.85,
    },
    centerText: {
      fontSize: 13,
      letterSpacing: 0.1,
      color: c.primary,
    },
    centerNum: {
      fontWeight: '800',
    },
    centerOf: {
      fontWeight: '500',
      opacity: 0.7,
    },
    centerTotal: {
      fontWeight: '700',
    },
    rangeText: {
      textAlign: 'center',
      fontSize: 11,
      color: c.textTertiary,
      marginTop: 4,
      paddingHorizontal: 14,
      letterSpacing: 0.1,
    },
    rangeNum: {
      fontWeight: '700',
      color: c.textSecondary,
    },
    rangeMuted: {
      fontWeight: '500',
    },
  });
}
