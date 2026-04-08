const KEYS = {
  ACCESS:  'if_access_token',
  REFRESH: 'if_refresh_token',
  USER:    'if_user',
};

export function getTokens() {
  return {
    accessToken:  localStorage.getItem(KEYS.ACCESS),
    refreshToken: localStorage.getItem(KEYS.REFRESH),
  };
}

export function setTokens(accessToken, refreshToken) {
  localStorage.setItem(KEYS.ACCESS, accessToken);
  localStorage.setItem(KEYS.REFRESH, refreshToken);
}

export function clearTokens() {
  localStorage.removeItem(KEYS.ACCESS);
  localStorage.removeItem(KEYS.REFRESH);
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem(KEYS.USER);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user) {
  localStorage.setItem(KEYS.USER, JSON.stringify(user));
}

export function clearStoredUser() {
  localStorage.removeItem(KEYS.USER);
}

export function clearAll() {
  clearTokens();
  clearStoredUser();
}
