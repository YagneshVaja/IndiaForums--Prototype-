import { Platform } from 'react-native';
import { create } from 'zustand';
import type { MMKV } from 'react-native-mmkv';
import { type ThemeMode, type ThemeColors, themes } from '../theme/tokens';
import { triggerThemeTransition } from '../theme/themeTransition';

const KEY = 'theme_mode';

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
  const raw = storage.getString(KEY);
  return raw === 'dark' ? 'dark' : 'light';
}

interface ThemeState {
  mode: ThemeMode;
  colors: ThemeColors;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

// Theme change sequence:
//   1. `triggerThemeTransition(oldBg)` — snaps a full-screen opaque overlay
//      on the UI thread (via Reanimated shared values, bypassing React).
//      This paints on the very next UI-thread frame, *before* the JS
//      cascade fires.
//   2. `set({mode, colors})` — fires the synchronous React cascade. Every
//      theme subscriber re-renders. JS thread is blocked for the cascade
//      duration, but the overlay is already covering the screen on the
//      UI thread, so the user sees only the overlay.
//   3. The overlay then animates from opacity 1 → 0 over 300ms (UI thread
//      via `withTiming`), revealing the now-committed new theme.
//
// Net effect: the cascade is fully masked. The user perceives an intentional
// ~300ms crossfade instead of a stalled tap. This is the pattern iOS uses
// at the OS level when system theme changes.
function applyMode(
  set: (s: Partial<ThemeState>) => void,
  get: () => ThemeState,
  mode: ThemeMode,
) {
  if (get().mode !== mode) {
    triggerThemeTransition(themes[get().mode].bg);
  }
  set({ mode, colors: themes[mode] });
  setTimeout(() => storage.set(KEY, mode), 0);
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: loadInitialMode(),
  colors: themes[loadInitialMode()],
  setMode: (mode) => applyMode(set, get, mode),
  toggle: () => {
    const next: ThemeMode = get().mode === 'dark' ? 'light' : 'dark';
    applyMode(set, get, next);
  },
}));
