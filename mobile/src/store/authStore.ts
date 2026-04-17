import { create } from 'zustand';

export interface AuthUser {
  userId: number;
  userName: string;
  email: string;
  groupId: number | null;
  avatarUrl?: string | null;
  avatarAccent?: string | null;
}

interface AuthStore {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isModerator: boolean;
  isLoading: boolean;
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

const MODERATOR_GROUP_IDS = new Set([3, 4, 5, 6]);

export const useAuthStore = create<AuthStore>((set) => ({
  user:            null,
  isAuthenticated: false,
  isModerator:     false,
  isLoading:       true,
  setUser: (user) => set({
    user,
    isAuthenticated: !!user,
    isModerator: !!user && MODERATOR_GROUP_IDS.has(Number(user.groupId)),
  }),
  setLoading: (isLoading) => set({ isLoading }),
  logout: () => set({ user: null, isAuthenticated: false, isModerator: false }),
}));
