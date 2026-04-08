import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import * as authApi from '../services/authApi';
import * as profileApi from '../services/userProfileApi';
import {
  getTokens,
  setTokens,
  clearAll,
  getStoredUser,
  setStoredUser,
} from '../services/tokenStorage';

const AuthContext = createContext(null);

// Group ids that grant moderator privileges. The IndiaForums backend doesn't
// document the exact mapping in the OpenAPI spec, but the historical site
// uses non-zero "staff" group ids; group 1/2 are typically guest/member.
// This list is intentionally narrow — if a real moderator account hits 403
// on a Phase 6 action, widen this set rather than the code path.
const MODERATOR_GROUP_IDS = new Set([3, 4, 5, 6]);

export function AuthProvider({ children }) {
  const [user, setUser]           = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  /* ── Extract user fields from flat API response ─────────────────────────── */
  function extractUser(d) {
    return {
      userId:      d.userId,
      userName:    d.userName,
      email:       d.email,
      displayName: d.displayName,
      // groupId/groupName are not in the auth response — we backfill them
      // from /users/{id}/profile after login (see effect below).
      groupId:     d.groupId ?? null,
      groupName:   d.groupName ?? null,
    };
  }

  /* ── Hydrate session on mount ──────────────────────────────────────────── */
  useEffect(() => {
    const { refreshToken } = getTokens();
    if (!refreshToken) {
      // Try restoring user from storage even without refresh
      const stored = getStoredUser();
      if (stored) setUser(stored);
      setIsLoading(false);
      return;
    }

    authApi
      .refreshToken(refreshToken)
      .then((res) => {
        const d = res.data;
        setTokens(d.accessToken, d.refreshToken);
        const u = extractUser(d);
        setStoredUser(u);
        setUser(u);
      })
      .catch(() => {
        clearAll();
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  /* ── Actions ───────────────────────────────────────────────────────────── */
  const login = useCallback(async (credentials) => {
    const res = await authApi.login(credentials);
    const d = res.data;
    setTokens(d.accessToken, d.refreshToken);
    const u = extractUser(d);
    setStoredUser(u);
    setUser(u);
    return d;
  }, []);

  const register = useCallback(async (data) => {
    const res = await authApi.register(data);
    const d = res.data;
    setTokens(d.accessToken, d.refreshToken);
    const u = extractUser(d);
    setStoredUser(u);
    setUser(u);
    return d;
  }, []);

  const externalLogin = useCallback(async (providerData) => {
    const res = await authApi.externalLogin(providerData);
    const d = res.data;
    setTokens(d.accessToken, d.refreshToken);
    const u = extractUser(d);
    setStoredUser(u);
    setUser(u);
    return d;
  }, []);

  const logout = useCallback(async () => {
    const { refreshToken } = getTokens();
    try {
      if (refreshToken) await authApi.logout(refreshToken);
    } catch {
      // Server-side invalidation failed — clear locally anyway
    }
    clearAll();
    setUser(null);
  }, []);

  const updateUser = useCallback((updated) => {
    setUser((prev) => {
      const merged = { ...prev, ...updated };
      setStoredUser(merged);
      return merged;
    });
  }, []);

  /* ── Backfill groupId from /users/{id}/profile when missing ────────────── */
  // The auth response (login/refresh/register) doesn't include groupId, but
  // forum moderation UI must know whether the current user is a moderator.
  // Lazily fetch it after sign-in and merge into the user object.
  useEffect(() => {
    if (!user || user.groupId != null || !user.userId) return;
    let cancelled = false;
    profileApi
      .getProfile(user.userId)
      .then((res) => {
        if (cancelled) return;
        const p = res.data?.user || res.data || {};
        if (p.groupId != null) {
          updateUser({ groupId: p.groupId, groupName: p.groupName });
        }
      })
      .catch(() => { /* non-critical — moderator panel just stays hidden */ });
    return () => { cancelled = true; };
  }, [user, updateUser]);

  /* ── Context value ─────────────────────────────────────────────────────── */
  const isModerator = !!user && user.groupId != null && MODERATOR_GROUP_IDS.has(Number(user.groupId));

  const value = useMemo(() => ({
    user,
    isAuthenticated: !!user,
    isModerator,
    isLoading,
    login,
    register,
    externalLogin,
    logout,
    updateUser,
  }), [user, isModerator, isLoading, login, register, externalLogin, logout, updateUser]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
