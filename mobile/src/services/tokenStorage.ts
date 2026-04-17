import * as SecureStore from 'expo-secure-store';

const KEYS = { access: 'if_access', refresh: 'if_refresh', user: 'if_user' };

let _cache: { accessToken: string | null; refreshToken: string | null } = {
  accessToken: null,
  refreshToken: null,
};

/** Call once at app boot before any API calls */
export const hydrateTokens = async (): Promise<void> => {
  _cache.accessToken  = await SecureStore.getItemAsync(KEYS.access);
  _cache.refreshToken = await SecureStore.getItemAsync(KEYS.refresh);
};

/** Synchronous read — safe for Axios request interceptors after hydrateTokens() */
export const getTokens = () => ({ ..._cache });

export const setTokens = async (access: string, refresh: string): Promise<void> => {
  _cache = { accessToken: access, refreshToken: refresh };
  await SecureStore.setItemAsync(KEYS.access,  access);
  await SecureStore.setItemAsync(KEYS.refresh, refresh);
};

export const clearAll = async (): Promise<void> => {
  _cache = { accessToken: null, refreshToken: null };
  await SecureStore.deleteItemAsync(KEYS.access);
  await SecureStore.deleteItemAsync(KEYS.refresh);
  await SecureStore.deleteItemAsync(KEYS.user);
};

export const getStoredUser = async (): Promise<Record<string, unknown> | null> => {
  const raw = await SecureStore.getItemAsync(KEYS.user);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
};

export const setStoredUser = async (user: Record<string, unknown>): Promise<void> => {
  await SecureStore.setItemAsync(KEYS.user, JSON.stringify(user));
};
