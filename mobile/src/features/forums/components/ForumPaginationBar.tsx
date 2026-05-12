import React, { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  Text,
  TextInput,
  View,
  StyleSheet,
  Platform,
  Keyboard,
  type LayoutChangeEvent,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
  interpolate,
  Extrapolation,
  type SharedValue,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useThemeStore } from '../../../store/themeStore';
import { useThemedStyles } from '../../../theme/useThemedStyles';
import type { ThemeColors } from '../../../theme/tokens';
import PageScrubber from './PageScrubber';

interface Props {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  itemLabel: string;
  /**
   * SharedValue<number> (0 = visible, 1 = hidden) — driven by worklet scroll handler.
   * Legacy boolean is also accepted for backward-compatibility with consumers that
   * haven't been migrated to worklet-based scroll handlers yet.
   */
  hidden?: SharedValue<number> | boolean;
  /**
   * Distance in px between the bar's natural bottom edge and the screen bottom
   * (i.e. the `bottom: N` value of the parent dock). Used to compute how far
   * to lift the bar above the keyboard so it sits flush with the keyboard top.
   */
  bottomInset?: number;
  onPageChange: (page: number) => void;
}

/**
 * Sticky pagination bar with a directly-editable page input.
 *
 *   ┌──────────────────────────────────────────────────┐
 *   │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │  ← progress
 *   │  ‹ Prev      Page  [ 4 ] / 75     Next ›          │
 *   │           Showing 61–80 of 1,500 topics          │
 *   └──────────────────────────────────────────────────┘
 *
 * Tap the input → numeric keyboard pops up → type any page → submit (Go).
 * While editing, the bar lifts itself above the keyboard so the user can
 * see what they're typing. Auto-hides on scroll-down (Twitter/Reddit style).
 */
export default function ForumPaginationBar({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
  itemLabel,
  hidden,
  bottomInset = 0,
  onPageChange,
}: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useThemedStyles(makeStyles);

  // Local draft synced from `currentPage` while idle. While editing we leave
  // it alone so the user can type without their input getting overwritten.
  const [draft, setDraft] = useState(String(currentPage));
  const [editing, setEditing] = useState(false);
  const editingRef = useRef(false);
  const inputRef = useRef<TextInput | null>(null);

  useEffect(() => {
    if (!editing) setDraft(String(currentPage));
  }, [currentPage, editing]);

  // Measure bar height for accurate translateY slide-out distance.
  const [barHeight, setBarHeight] = useState(80);
  const onLayout = (e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h && h !== barHeight) setBarHeight(h);
  };

  // `keyboardOffset` tracks keyboard-lift: negative Y moves the bar up above
  // the keyboard. Zero means the bar is in its normal bottom position.
  const keyboardOffset = useSharedValue(0);

  // Normalise `hidden` prop: accept either a SharedValue<number> (worklet path)
  // or a legacy boolean (JS-thread path). We bridge the boolean into a local
  // SharedValue so the animated style can always read `.value`.
  const hiddenFallback = useSharedValue(0);
  const hiddenSv: SharedValue<number> =
    hidden !== null && hidden !== undefined && typeof hidden === 'object'
      ? (hidden as SharedValue<number>)
      : hiddenFallback;

  // Sync boolean → fallback SharedValue on the JS thread.
  useEffect(() => {
    if (typeof hidden === 'boolean') {
      hiddenFallback.value = withTiming(hidden ? 1 : 0, { duration: 220 });
    }
  }, [hidden, hiddenFallback]);

  // Worklet-driven hide: interpolate from the normalised SharedValue,
  // then add keyboard offset so both animations compose correctly.
  const animatedStyle = useAnimatedStyle(() => {
    const hiddenVal = hiddenSv.value;
    const hideTranslate = interpolate(hiddenVal, [0, 1], [0, barHeight], Extrapolation.CLAMP);
    const hideOpacity  = interpolate(hiddenVal, [0, 1], [1, 0], Extrapolation.CLAMP);
    return {
      transform: [{ translateY: hideTranslate + keyboardOffset.value }],
      // Only fade out when sliding off the bottom (positive Y). When lifted
      // above the keyboard (negative Y), keep full opacity.
      opacity: hideTranslate + keyboardOffset.value > 0
        ? Math.max(0, hideOpacity)
        : 1,
    };
  });

  // Lift the bar above the keyboard while the input is focused. We subtract
  // `bottomInset` because the dock may already sit above other UI (e.g. the
  // reply bar on TopicDetailScreen), so the absolute lift needed is smaller.
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvt, (e) => {
      if (!editingRef.current) return;
      const targetY = bottomInset - e.endCoordinates.height;
      keyboardOffset.value = withTiming(targetY, {
        duration: Platform.OS === 'ios' ? (e.duration ?? 250) : 250,
        easing: Easing.out(Easing.cubic),
      });
    });
    const hideSub = Keyboard.addListener(hideEvt, (e) => {
      if (!editingRef.current) return;
      keyboardOffset.value = withTiming(0, {
        duration: Platform.OS === 'ios' ? (e.duration ?? 250) : 250,
        easing: Easing.out(Easing.cubic),
      });
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [bottomInset, keyboardOffset]);

  if (totalPages <= 1) return null;

  const canPrev = currentPage > 1;
  const canNext = currentPage < totalPages;

  // Validate the in-progress draft so the user gets feedback while typing
  // a number that's out of range (we still clamp on submit, but they can
  // see it'll be clamped before they hit Go).
  const draftNum = draft.length > 0 ? parseInt(draft, 10) : NaN;
  const isOutOfRange =
    editing && Number.isFinite(draftNum) && (draftNum < 1 || draftNum > totalPages);

  // Auto-size the input so 4-digit forums (e.g. 8,238 pages on the live
  // site) don't squeeze digits together. Falls back to a sane minimum.
  const totalDigits = String(totalPages).length;
  const inputMinWidth = Math.max(48, totalDigits * 14 + 16);

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

  const commitDraft = () => {
    const parsed = parseInt(draft.trim(), 10);
    editingRef.current = false;
    setEditing(false);
    Keyboard.dismiss();
    if (!Number.isFinite(parsed)) {
      setDraft(String(currentPage));
      return;
    }
    const target = Math.min(Math.max(parsed, 1), totalPages);
    if (target !== currentPage) {
      haptic(Haptics.ImpactFeedbackStyle.Medium);
      onPageChange(target);
    } else {
      setDraft(String(currentPage));
    }
  };

  return (
    <Animated.View style={[styles.wrap, animatedStyle]} onLayout={onLayout}>
      <PageScrubber
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />

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
          onPress={() => inputRef.current?.focus()}
          style={[styles.center, editing && styles.centerEditing]}
          accessibilityRole="none"
        >
          <Text style={styles.centerLabel}>Page</Text>
          <TextInput
            ref={inputRef}
            value={draft}
            onChangeText={(t) => setDraft(t.replace(/[^0-9]/g, '').slice(0, 6))}
            onFocus={() => {
              editingRef.current = true;
              setEditing(true);
            }}
            onBlur={commitDraft}
            onSubmitEditing={commitDraft}
            keyboardType="number-pad"
            returnKeyType="go"
            maxLength={6}
            selectTextOnFocus
            style={[
              styles.input,
              { minWidth: inputMinWidth },
              isOutOfRange && styles.inputError,
            ]}
            accessibilityLabel={`Page number — type to jump. 1 to ${totalPages}.`}
          />
          <Text style={styles.centerOf}>/ {totalPages}</Text>
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

      {isOutOfRange ? (
        <Text style={styles.errorText} numberOfLines={1}>
          Enter a page between <Text style={styles.errorNum}>1</Text> and{' '}
          <Text style={styles.errorNum}>{totalPages.toLocaleString()}</Text>
        </Text>
      ) : (
        <Text style={styles.rangeText} numberOfLines={1}>
          Showing{' '}
          <Text style={styles.rangeNum}>
            {startItem.toLocaleString()}–{endItem.toLocaleString()}
          </Text>
          <Text style={styles.rangeMuted}> of </Text>
          <Text style={styles.rangeNum}>{totalItems.toLocaleString()}</Text>
          {' '}{itemLabel}
        </Text>
      )}
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
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 6,
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
      minWidth: 64,
      height: 36,
      paddingHorizontal: 8,
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
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: c.primarySoft,
      borderWidth: 1,
      borderColor: c.primarySoft,
    },
    centerEditing: {
      backgroundColor: c.card,
      borderColor: c.primary,
    },
    centerLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: c.primary,
      letterSpacing: 0.2,
    },
    input: {
      paddingHorizontal: 8,
      paddingVertical: 0,
      height: 28,
      borderRadius: 6,
      backgroundColor: c.card,
      textAlign: 'center',
      fontSize: 15,
      fontWeight: '800',
      color: c.text,
      borderWidth: 1,
      borderColor: c.border,
    },
    inputError: {
      borderColor: c.danger,
      backgroundColor: c.dangerSoft,
      color: c.danger,
    },
    centerOf: {
      fontSize: 12,
      fontWeight: '700',
      color: c.primary,
      opacity: 0.85,
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
    errorText: {
      textAlign: 'center',
      fontSize: 11,
      fontWeight: '600',
      color: c.danger,
      marginTop: 4,
      paddingHorizontal: 14,
      letterSpacing: 0.1,
    },
    errorNum: {
      fontWeight: '800',
    },
  });
}
