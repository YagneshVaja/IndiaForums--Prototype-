import {
  cancelAnimation,
  makeMutable,
  withDelay,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

// UI-thread-driven transition mask for theme switching. Setting these
// shared values from JS hops to Reanimated's worklet runtime via shared
// memory, so the overlay can paint on the very next UI-thread frame —
// before the JS-blocking React cascade (~160 components) fires.
//
// Pattern matches iOS's system-level theme fade: capture the outgoing
// background color, snap an opaque overlay over the entire window, hold
// briefly to let the JS cascade get well underway, then fade the overlay
// out so the new theme is revealed.

// Total perceived transition: ~320ms (120ms opaque hold + 200ms fade).
//
// Trade-off chosen here: keep the transition snappy at the cost of possibly
// catching the tail of a long cascade. In release the cascade is usually
// 100–300ms which sits comfortably under the hold; on the heaviest screens
// (forum thread with many PostCards) the tail may briefly bleed during the
// fade — but a 320ms intentional crossfade beats a 1–2s flat-color wait
// that adapts to cascade length.
//
// If you ever want truly instant theme switching (no cascade at all, no
// need to mask), the path is the Reanimated migration of all themed views
// so colors resolve on the UI thread without a React re-render.
export const HOLD_MS = 120;
export const FADE_MS = 200;

export const transitionOpacity: SharedValue<number> = makeMutable(0);
export const transitionColor: SharedValue<string> = makeMutable('#000000');

export function triggerThemeTransition(outgoingBg: string): void {
  // Always start from a known-good state — if the user rapid-toggles, kill
  // any in-flight animation before kicking the new one.
  cancelAnimation(transitionOpacity);
  transitionColor.value = outgoingBg;
  // withSequence guarantees the UI thread executes these in order:
  // 1. snap to opacity 1 (0ms — instant opaque cover)
  // 2. hold at 1 for HOLD_MS while the JS cascade rips through
  // 3. fade to 0 over FADE_MS — reveals the now-committed new theme
  transitionOpacity.value = withSequence(
    withTiming(1, { duration: 0 }),
    withDelay(HOLD_MS, withTiming(0, { duration: FADE_MS })),
  );
}
