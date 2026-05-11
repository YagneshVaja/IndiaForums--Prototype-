import { useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import type { NativeScrollEvent } from 'react-native';

/**
 * Worklet-based hide-on-scroll for an in-page bar (e.g. forums pagination bar).
 *
 * Returns:
 *   - `hidden`: SharedValue<number> (0 = visible, 1 = hidden) — drive an
 *     Animated.View via useAnimatedStyle.
 *   - `applyScroll`: worklet function — call from inside any
 *     useAnimatedScrollHandler to update `hidden` based on scroll delta.
 *   - `show`: JS function — force the bar visible (e.g. on a sort toggle).
 *
 * Mimics Twitter / Reddit / Instagram bar-hide behavior on mobile.
 */
export function useHideOnScroll(threshold = 8) {
  const hidden = useSharedValue(0);
  const lastY = useSharedValue(0);

  function applyScroll(e: NativeScrollEvent) {
    'worklet';
    const y = e.contentOffset.y;
    const layoutH = e.layoutMeasurement.height;
    const contentH = e.contentSize.height;
    const delta = y - lastY.value;
    lastY.value = y;

    const nearTop = y < 80;
    const nearBottom = y + layoutH >= contentH - 60;

    if (nearTop || nearBottom) {
      if (hidden.value !== 0) hidden.value = withTiming(0, { duration: 180 });
      return;
    }

    if (delta > threshold && hidden.value !== 1) {
      hidden.value = withTiming(1, { duration: 180 });
    } else if (delta < -threshold && hidden.value !== 0) {
      hidden.value = withTiming(0, { duration: 180 });
    }
  }

  function show() {
    hidden.value = withTiming(0, { duration: 180 });
  }

  return { hidden, applyScroll, show } as {
    hidden: SharedValue<number>;
    applyScroll: (e: NativeScrollEvent) => void;
    show: () => void;
  };
}
