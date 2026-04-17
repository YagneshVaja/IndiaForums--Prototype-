import { create } from 'zustand';

interface NotificationsStore {
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  clearUnread: () => void;
}

export const useNotificationsStore = create<NotificationsStore>((set) => ({
  unreadCount: 0,
  setUnreadCount: (unreadCount) => set({ unreadCount }),
  clearUnread: () => set({ unreadCount: 0 }),
}));
