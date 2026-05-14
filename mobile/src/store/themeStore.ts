import { Platform } from 'react-native';
import { create } from 'zustand';
import type { MMKV } from 'react-native-mmkv';
import {
  type ThemeMode,
  type ThemeColors,
  type PaletteId,
  PALETTE_IDS,
  themes,
} from '../theme/tokens';
import { triggerThemeTransition } from '../theme/themeTransition';

const MODE_KEY    = 'theme_mode';
const PALETTE_KEY = 'theme_palette';

type StorageAdapter = {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
};

const memStore: Record<string, string> = {};
const fallback: StorageAdapter = {
  getString: (key) => memStore[key],
  set: (key, value) => { memStore[key] = value; },
};

function createStorage(): StorageAdapter {
  if (Platform.OS === 'web') return fallback;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createMMKV } = require('react-native-mmkv') as {
      createMMKV: (cfg: { id: string }) => MMKV;
    };
    return createMMKV({ id: 'theme' }) as unknown as StorageAdapter;
  } catch {
    return fallback;
  }
}

const storage = createStorage();

function loadInitialMode(): ThemeMode {
  const raw = storage.getString(MODE_KEY);
  return raw === 'dark' ? 'dark' : 'light';
}

function loadInitialPalette(): PaletteId {
  const raw = storage.getString(PALETTE_KEY);
  return (PALETTE_IDS as string[]).includes(raw ?? '') ? (raw as PaletteId) : 'blue';
}

interface ThemeState {
  mode: ThemeMode;
  palette: PaletteId;
  colors: ThemeColors;
  setMode:    (mode: ThemeMode)    => void;
  setPalette: (palette: PaletteId) => void;
  toggle:     () => void;
}

// Theme change sequence:
//   1. `triggerThemeTransition(oldBg)` — snaps a full-screen opaque overlay
//      on the UI thread (via Reanimated shared values, bypassing React).
//      This paints on the very next UI-thread frame, *before* the JS
//      cascade fires.
//   2. `set({mode, palette, colors})` — fires the synchronous React cascade.
//      Every theme subscriber re-renders. JS thread is blocked for the
//      cascade duration, but the overlay is already covering the screen
//      on the UI thread, so the user sees only the overlay.
//   3. The overlay then animates from opacity 1 → 0 over 300ms (UI thread
//      via `withTiming`), revealing the now-committed new theme.
//
// Net effect: the cascade is fully masked. Same masking applies to both
// mode flips and palette swaps.
function apply(
  set: (s: Partial<ThemeState>) => void,
  get: () => ThemeState,
  next: { mode?: ThemeMode; palette?: PaletteId },
) {
  const cur = get();
  const mode    = next.mode    ?? cur.mode;
  const palette = next.palette ?? cur.palette;
  const changed = mode !== cur.mode || palette !== cur.palette;

  if (changed) {
    triggerThemeTransition(cur.colors.bg);
  }

  set({ mode, palette, colors: themes[palette][mode] });

  if (next.mode    !== undefined) setTimeout(() => storage.set(MODE_KEY,    mode),    0);
  if (next.palette !== undefined) setTimeout(() => storage.set(PALETTE_KEY, palette), 0);
}

export const useThemeStore = create<ThemeState>((set, get) => {
  const mode    = loadInitialMode();
  const palette = loadInitialPalette();

  return {
    mode,
    palette,
    colors: themes[palette][mode],
    setMode:    (m) => apply(set, get, { mode: m }),
    setPalette: (p) => apply(set, get, { palette: p }),
    toggle:     ()  => apply(set, get, { mode: get().mode === 'dark' ? 'light' : 'dark' }),
  };
});
