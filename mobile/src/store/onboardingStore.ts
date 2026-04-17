import { Platform } from 'react-native';
import type { MMKV } from 'react-native-mmkv';

const KEY = 'onboarding_complete';

type StorageAdapter = {
  getBoolean(key: string): boolean | undefined;
  set(key: string, value: boolean): void;
  remove(key: string): boolean;
};

// In-memory fallback — used on web and in Expo Go (no native MMKV)
const memStore: Record<string, boolean> = {};
const fallback: StorageAdapter = {
  getBoolean: (key) => memStore[key],
  set: (key, value) => { memStore[key] = value; },
  remove: (key) => { delete memStore[key]; return true; },
};

function createStorage(): StorageAdapter {
  // MMKV only works on native — skip entirely on web
  if (Platform.OS === 'web') return fallback;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createMMKV } = require('react-native-mmkv') as {
      createMMKV: (cfg: { id: string }) => MMKV;
    };
    return createMMKV({ id: 'onboarding' }) as unknown as StorageAdapter;
  } catch {
    return fallback;
  }
}

const storage = createStorage();

/** Synchronous read — safe to call before first render */
export const hasSeenOnboarding = (): boolean =>
  storage.getBoolean(KEY) ?? false;

export const markOnboardingComplete = (): void => storage.set(KEY, true);

/** For dev/testing reset only */
export const resetOnboarding = (): void => { storage.remove(KEY); };
