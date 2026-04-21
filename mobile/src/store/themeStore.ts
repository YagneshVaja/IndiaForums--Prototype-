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
    // eslint-disable-next-line @typescript-eslint/no-var-requires
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

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: loadInitialMode(),
  colors: themes[loadInitialMode()],
  setMode: (mode) => {
    storage.set(KEY, mode);
    set({ mode, colors: themes[mode] });
  },
  toggle: () => {
    const next: ThemeMode = get().mode === 'dark' ? 'light' : 'dark';
    storage.set(KEY, next);
    set({ mode: next, colors: themes[next] });
  },
}));
