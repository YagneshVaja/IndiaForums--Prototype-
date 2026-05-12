// mobile/src/store/pushStore.ts
import { create } from 'zustand';
import { getStoredBannerDismissed, setStoredBannerDismissed } from '../services/pushStorage';

export type PushPermissionStatus = 'undetermined' | 'granted' | 'denied' | 'unavailable';

type PushState = {
  permissionStatus: PushPermissionStatus;
  expoPushToken: string | null;
  deviceTokenId: string | null;
  lastError: string | null;
  bannerDismissed: boolean;

  setPermission: (s: PushPermissionStatus) => void;
  setToken: (token: string | null) => void;
  setDeviceTokenId: (id: string | null) => void;
  setError: (msg: string | null) => void;
  dismissBanner: () => void;
  hydrateBannerDismissed: () => Promise<void>;
  reset: () => void;
};

const initial = {
  permissionStatus: 'undetermined' as PushPermissionStatus,
  expoPushToken: null,
  deviceTokenId: null,
  lastError: null,
  bannerDismissed: false,
};

export const usePushStore = create<PushState>((set) => ({
  ...initial,
  setPermission: (s) => set({ permissionStatus: s }),
  setToken: (t) => set({ expoPushToken: t }),
  setDeviceTokenId: (id) => set({ deviceTokenId: id }),
  setError: (msg) => set({ lastError: msg }),
  dismissBanner: () => {
    set({ bannerDismissed: true });
    setStoredBannerDismissed(true).catch(() => {});
  },
  hydrateBannerDismissed: async () => {
    const v = await getStoredBannerDismissed();
    set({ bannerDismissed: v });
  },
  reset: () => set({ ...initial }),
}));
