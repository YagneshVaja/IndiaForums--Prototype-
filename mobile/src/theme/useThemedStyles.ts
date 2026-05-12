import { useThemeStore } from '../store/themeStore';
import { themes, type ThemeColors, type ThemeMode } from './tokens';

// Pre-compute each file's StyleSheet for both modes exactly once, on the first
// call. After that, switching the theme is an O(1) cache lookup instead of
// re-running `makeStyles(colors)` and rebuilding hundreds of style entries on
// every subscriber. The component still re-renders (mode subscription flips),
// but the heavy work is gone.
//
// Pattern at call sites:
//
//   function makeStyles(c: ThemeColors) { return StyleSheet.create({...}); }
//   ...
//   const styles = useThemedStyles(makeStyles);
//
// Subscribing to `mode` (a primitive) instead of `colors` (an object) also
// makes the equality check cheaper and avoids spurious re-renders if any
// caller later mutates the colors record.

type Factory<T> = (c: ThemeColors) => T;

const cache = new WeakMap<Factory<unknown>, Record<ThemeMode, unknown>>();

function precompute<T>(factory: Factory<T>): Record<ThemeMode, T> {
  let entry = cache.get(factory as Factory<unknown>) as Record<ThemeMode, T> | undefined;
  if (!entry) {
    entry = {
      light: factory(themes.light),
      dark: factory(themes.dark),
    };
    cache.set(factory as Factory<unknown>, entry as Record<ThemeMode, unknown>);
  }
  return entry;
}

export function useThemedStyles<T>(factory: Factory<T>): T {
  const mode = useThemeStore((s) => s.mode);
  return precompute(factory)[mode];
}
