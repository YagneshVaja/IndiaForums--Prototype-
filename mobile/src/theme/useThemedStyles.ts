import { useThemeStore } from '../store/themeStore';
import { themes, type ThemeColors, type ThemeMode, type PaletteId } from './tokens';

// Pre-compute each file's StyleSheet per (palette, mode) pair, lazily on first
// use. After that, switching theme is an O(1) cache lookup instead of re-running
// `makeStyles(colors)` and rebuilding hundreds of style entries on every
// subscriber. The component still re-renders (mode/palette subscriptions flip),
// but the heavy work is gone.
//
// Pattern at call sites:
//
//   function makeStyles(c: ThemeColors) { return StyleSheet.create({...}); }
//   ...
//   const styles = useThemedStyles(makeStyles);
//
// Subscribing to `mode` + `palette` (primitives) instead of `colors` (an object)
// keeps equality checks cheap and avoids spurious re-renders.

type Factory<T> = (c: ThemeColors) => T;

const cache = new WeakMap<Factory<unknown>, Map<string, unknown>>();

function cacheKey(palette: PaletteId, mode: ThemeMode): string {
  return `${palette}:${mode}`;
}

function getOrCompute<T>(factory: Factory<T>, palette: PaletteId, mode: ThemeMode): T {
  let entry = cache.get(factory as Factory<unknown>) as Map<string, T> | undefined;
  if (!entry) {
    entry = new Map();
    cache.set(factory as Factory<unknown>, entry as Map<string, unknown>);
  }
  const key = cacheKey(palette, mode);
  let value = entry.get(key);
  if (value === undefined) {
    value = factory(themes[palette][mode]);
    entry.set(key, value);
  }
  return value;
}

export function useThemedStyles<T>(factory: Factory<T>): T {
  const mode    = useThemeStore((s) => s.mode);
  const palette = useThemeStore((s) => s.palette);
  return getOrCompute(factory, palette, mode);
}
