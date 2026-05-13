import { Platform } from 'react-native';
import { create } from 'zustand';
import type { MMKV } from 'react-native-mmkv';
import { type ThemeMode, type ThemeColors, themes } from '../theme/tokens';

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

// Keep the mutation synchronous so every subscriber — the SideMenu and the
// screens visible in the scrim gap — re-renders in the *same* React commit
// and the new theme paints everywhere on the same frame. Splitting the work
// across frames (UI-thread chrome animation + JS-side cascade) makes the
// SideMenu flip ahead of the screens behind it, which reads as a visible
// desync to the user.
//
// Persistence stays behind setTimeout(0) so the MMKV write never sits in the
// press handler's task.
function applyMode(set: (s: Partial<ThemeState>) => void, mode: ThemeMode) {
  set({ mode, colors: themes[mode] });
  setTimeout(() => storage.set(KEY, mode), 0);
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: loadInitialMode(),
  colors: themes[loadInitialMode()],
  setMode: (mode) => applyMode(set, mode),
  toggle: () => {
    const next: ThemeMode = get().mode === 'dark' ? 'light' : 'dark';
    applyMode(set, next);
  },
}));
