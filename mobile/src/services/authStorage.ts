import { Platform } from 'react-native';

const KEYS = {
  ACCESS: 'if_access_token',
  REFRESH: 'if_refresh_token',
  USER: 'if_user',
} as const;

export type StoredUser = {
  userId: number;
  userName: string;
  email: string | null;
  displayName: string | null;
  groupId: number | null;
  groupName: string | null;
  emailVerified?: boolean;
};

type SecureAdapter = {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
};

type KVAdapter = {
  getString(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
};

// Web / Expo Go fallback — plain in-memory. Mirrors onboardingStore's approach.
const memStore: Record<string, string> = {};
const memSecure: SecureAdapter = {
  getItemAsync: async (k) => memStore[k] ?? null,
  setItemAsync: async (k, v) => { memStore[k] = v; },
  deleteItemAsync: async (k) => { delete memStore[k]; },
};
const memKV: KVAdapter = {
  getString: (k) => memStore[k] ?? null,
  set: (k, v) => { memStore[k] = v; },
  remove: (k) => { delete memStore[k]; },
};

function createSecure(): SecureAdapter {
  if (Platform.OS === 'web') return memSecure;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const store = require('expo-secure-store') as SecureAdapter;
    return store;
  } catch {
    return memSecure;
  }
}

function createKV(): KVAdapter {
  if (Platform.OS === 'web') return memKV;
  try {
    // react-native-mmkv v4 exports a class constructor; older versions
    // shipped a `createMMKV` factory. Support both, and wrap the native
    // instance so remove() delegates to delete() when needed.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mmkv = require('react-native-mmkv') as {
      createMMKV?: (cfg: { id: string }) => unknown;
      MMKV?: new (cfg: { id: string }) => unknown;
    };
    const raw = mmkv.createMMKV
      ? mmkv.createMMKV({ id: 'auth' })
      : mmkv.MMKV
        ? new mmkv.MMKV({ id: 'auth' })
        : null;
    if (!raw) return memKV;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = raw as any;
    return {
      getString: (k) => r.getString?.(k) ?? null,
      set: (k, v) => r.set?.(k, v),
      remove: (k) => {
        if (typeof r.delete === 'function') r.delete(k);
        else if (typeof r.remove === 'function') r.remove(k);
      },
    };
  } catch {
    return memKV;
  }
}

const secure = createSecure();
const kv = createKV();

// Synchronous in-memory mirror of the tokens, primed on hydrate().
// Axios interceptors run in a synchronous flow, so we can't `await` SecureStore
// every request — we cache the last-known value here and refresh on set/clear.
let cachedAccess: string | null = null;
let cachedRefresh: string | null = null;

export async function hydrateTokens(): Promise<void> {
  cachedAccess = await secure.getItemAsync(KEYS.ACCESS);
  cachedRefresh = await secure.getItemAsync(KEYS.REFRESH);
}

export function getTokens(): { accessToken: string | null; refreshToken: string | null } {
  return { accessToken: cachedAccess, refreshToken: cachedRefresh };
}

export async function setTokens(accessToken: string, refreshToken: string): Promise<void> {
  cachedAccess = accessToken;
  cachedRefresh = refreshToken;
  await Promise.all([
    secure.setItemAsync(KEYS.ACCESS, accessToken),
    secure.setItemAsync(KEYS.REFRESH, refreshToken),
  ]);
}

export async function clearTokens(): Promise<void> {
  cachedAccess = null;
  cachedRefresh = null;
  await Promise.all([
    secure.deleteItemAsync(KEYS.ACCESS),
    secure.deleteItemAsync(KEYS.REFRESH),
  ]);
}

export function getStoredUser(): StoredUser | null {
  try {
    const raw = kv.getString(KEYS.USER);
    return raw ? (JSON.parse(raw) as StoredUser) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: StoredUser): void {
  kv.set(KEYS.USER, JSON.stringify(user));
}

export function clearStoredUser(): void {
  kv.remove(KEYS.USER);
}

export async function clearAll(): Promise<void> {
  clearStoredUser();
  await clearTokens();
}
