import { useCallback, useRef, useState } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

/**
 * Returns `hidden` (true while the user is scrolling DOWN) and an `onScroll`
 * handler to wire onto a list. Used to auto-hide the sticky pagination bar
 * while the user is reading and bring it back when they stop or scroll up.
 *
 *   - `hidden=true`  while scrolling down past the threshold
 *   - `hidden=false` when scrolling up, or near the top, or near the bottom
 *
 * Mimics Twitter / Reddit / Instagram bar-hide behavior on mobile.
 */
export function useHideOnScroll(threshold = 8) {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  const lastDir = useRef<'up' | 'down' | null>(null);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      const layoutH = e.nativeEvent.layoutMeasurement.height;
      const contentH = e.nativeEvent.contentSize.height;
      const nearBottom = y + layoutH >= contentH - 60;
      const nearTop = y < 80;

      const delta = y - lastY.current;
      lastY.current = y;

      if (nearTop || nearBottom) {
        if (lastDir.current !== 'up') lastDir.current = 'up';
        if (hidden) setHidden(false);
        return;
      }

      if (delta > threshold && !hidden) {
        setHidden(true);
        lastDir.current = 'down';
      } else if (delta < -threshold && hidden) {
        setHidden(false);
        lastDir.current = 'up';
      }
    },
    [hidden, threshold],
  );

  /** Force-reveals the bar — used when an action (e.g. sort toggle) shouldn't
   * leave the bar in whatever scroll-derived state it had before. */
  const show = useCallback(() => setHidden(false), []);

  return { hidden, onScroll, show };
}
