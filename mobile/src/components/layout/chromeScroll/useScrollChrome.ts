import { useSharedValue, useAnimatedScrollHandler, withTiming } from 'react-native-reanimated';
import type { NativeScrollEvent } from 'react-native';
import { useChromeScroll } from './ChromeScrollContext';

const SCROLL_THRESHOLD = 8;          // px of delta required to commit a direction
const NEAR_TOP_PX = 80;              // px below content top where chrome stays visible
const NEAR_BOTTOM_PX = 60;           // px above content bottom where chrome stays visible
const ANIM_DURATION_MS = 180;

/**
 * Drives `chromeProgress` (0 = visible, 1 = hidden) on the UI thread using
 * direction + threshold + near-edge logic.
 *
 * Returns:
 *   - `scrollHandler`: ready-to-attach `useAnimatedScrollHandler` — use this
 *     on screens where the list has no other scroll handler (Home, News,
 *     MySpace).
 *   - `applyScroll`: worklet function — call from inside a hand-rolled
 *     `useAnimatedScrollHandler` to compose with another scroll writer
 *     (used by Forums, where the pagination bar also writes to scroll).
 *   - `resetChrome`: JS function to force chrome back to visible (focus,
 *     refresh, manual show).
 */
export function useScrollChrome() {
  const { chromeProgress, resetChrome } = useChromeScroll();
  const lastY = useSharedValue(0);

  function applyScroll(e: NativeScrollEvent) {
    'worklet';
    const y = e.contentOffset.y;
    const layoutH = e.layoutMeasurement.height;
    const contentH = e.contentSize.height;
    const delta = y - lastY.value;
    lastY.value = y;

    const nearTop = y < NEAR_TOP_PX;
    const nearBottom = y + layoutH >= contentH - NEAR_BOTTOM_PX;

    if (nearTop || nearBottom) {
      if (chromeProgress.value !== 0) {
        chromeProgress.value = withTiming(0, { duration: ANIM_DURATION_MS });
      }
      return;
    }

    if (delta > SCROLL_THRESHOLD && chromeProgress.value !== 1) {
      chromeProgress.value = withTiming(1, { duration: ANIM_DURATION_MS });
    } else if (delta < -SCROLL_THRESHOLD && chromeProgress.value !== 0) {
      chromeProgress.value = withTiming(0, { duration: ANIM_DURATION_MS });
    }
  }

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      'worklet';
      applyScroll(e);
    },
  });

  return { scrollHandler, applyScroll, resetChrome };
}
