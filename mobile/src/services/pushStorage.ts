// mobile/src/services/pushStorage.ts
import { Platform } from 'react-native';

const KEY = 'if_push_device_token_id';

type SecureAdapter = {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
};

const memStore: Record<string, string> = {};
const memSecure: SecureAdapter = {
  getItemAsync: async (k) => memStore[k] ?? null,
  setItemAsync: async (k, v) => { memStore[k] = v; },
  deleteItemAsync: async (k) => { delete memStore[k]; },
};

function createSecure(): SecureAdapter {
  if (Platform.OS === 'web') return memSecure;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-secure-store') as SecureAdapter;
  } catch {
    return memSecure;
  }
}

const secure = createSecure();

export async function getStoredDeviceTokenId(): Promise<string | null> {
  return secure.getItemAsync(KEY);
}

export async function setStoredDeviceTokenId(id: string): Promise<void> {
  await secure.setItemAsync(KEY, id);
}

export async function clearStoredDeviceTokenId(): Promise<void> {
  await secure.deleteItemAsync(KEY);
}

const BANNER_KEY = 'if_push_banner_dismissed';

export async function getStoredBannerDismissed(): Promise<boolean> {
  return (await secure.getItemAsync(BANNER_KEY)) === '1';
}

export async function setStoredBannerDismissed(v: boolean): Promise<void> {
  if (v) {
    await secure.setItemAsync(BANNER_KEY, '1');
  } else {
    await secure.deleteItemAsync(BANNER_KEY);
  }
}
