import { create } from 'zustand';
import * as authApi from '../services/authApi';
import * as userProfileApi from '../services/userProfileApi';
import {
  StoredUser,
  clearAll,
  getStoredUser,
  getTokens,
  hydrateTokens,
  setStoredUser,
  setTokens,
} from '../services/authStorage';

// Group ids that grant moderator privileges. Mirrors the prototype
// (indiaforums/src/contexts/AuthContext.jsx:19) plus groupId 25, which the
// backend treats as a moderator (verified 2026-05-15 — was able to trash and
// untrash posts). Server is the source of truth on permissions; this set just
// controls whether moderator UI is shown — the backend will still 403 if the
// user actually lacks rights.
const MODERATOR_GROUP_IDS = new Set([3, 4, 5, 6, 25]);

// Auth responses are flat — promote them into our StoredUser shape.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractUser(d: any): StoredUser {
  return {
    userId: Number(d.userId),
    userName: String(d.userName ?? ''),
    email: d.email ?? null,
    displayName: d.displayName ?? null,
    groupId: d.groupId ?? null,
    groupName: d.groupName ?? null,
    emailVerified:
      typeof d.isEmailConfirmed === 'boolean'
        ? d.isEmailConfirmed
        : typeof d.emailVerified === 'boolean'
          ? d.emailVerified
          : undefined,
  };
}

type AuthState = {
  user: StoredUser | null;
  isAuthenticated: boolean;
  isModerator: boolean;
  isHydrating: boolean;

  hydrate: () => Promise<void>;
  login: (credentials: authApi.LoginRequest) => Promise<StoredUser>;
  register: (data: authApi.RegisterRequest) => Promise<StoredUser>;
  externalLogin: (data: authApi.ExternalLoginRequest) => Promise<StoredUser>;
  logout: () => Promise<void>;
  updateUser: (patch: Partial<StoredUser>) => void;
};

function computeModerator(user: StoredUser | null): boolean {
  if (!user || user.groupId == null) return false;
  return MODERATOR_GROUP_IDS.has(Number(user.groupId));
}

async function finalizeSession(
  set: (partial: Partial<AuthState>) => void,
  get: () => AuthState,
  d: authApi.AuthenticationResponse,
): Promise<StoredUser> {
  await setTokens(d.accessToken, d.refreshToken);
  const u = extractUser(d);
  setStoredUser(u);
  set({ user: u, isAuthenticated: true, isModerator: computeModerator(u) });
  // Fire-and-forget moderator backfill. Non-critical — moderator UI
  // just stays hidden if this fails.
  if (u.groupId == null && u.userId) {
    userProfileApi
      .getProfile(u.userId)
      .then((res) => {
        const p = res.data?.user ?? {};
        if (p.groupId != null) {
          get().updateUser({
            groupId: Number(p.groupId),
            groupName: p.groupName ?? null,
          });
        }
      })
      .catch(() => { /* ignore */ });
  }
  return u;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isModerator: false,
  isHydrating: true,

  hydrate: async () => {
    await hydrateTokens();
    const { refreshToken: rt } = getTokens();
    if (!rt) {
      // No session — but surface the cached user snapshot if present so the
      // UI can render a "you were signed in as …" state without a blank flash.
      const stored = getStoredUser();
      set({
        user: stored,
        isAuthenticated: false,
        isModerator: false,
        isHydrating: false,
      });
      return;
    }
    try {
      const res = await authApi.refreshToken(rt);
      await finalizeSession(set, get, res.data);
    } catch {
      await clearAll();
      set({ user: null, isAuthenticated: false, isModerator: false });
    } finally {
      set({ isHydrating: false });
    }
  },

  login: async (credentials) => {
    const res = await authApi.login(credentials);
    return finalizeSession(set, get, res.data);
  },

  register: async (data) => {
    const res = await authApi.register(data);
    return finalizeSession(set, get, res.data);
  },

  externalLogin: async (data) => {
    const res = await authApi.externalLogin(data);
    return finalizeSession(set, get, res.data);
  },

  logout: async () => {
    const { refreshToken: rt } = getTokens();
    try {
      if (rt) await authApi.logout(rt);
    } catch {
      // Server-side invalidation failed — still clear locally.
    }
    await clearAll();
    set({ user: null, isAuthenticated: false, isModerator: false });
  },

  updateUser: (patch) => {
    const prev = get().user;
    if (!prev) return;
    const merged: StoredUser = { ...prev, ...patch };
    setStoredUser(merged);
    set({ user: merged, isModerator: computeModerator(merged) });
  },
}));
