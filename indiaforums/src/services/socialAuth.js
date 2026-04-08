/**
 * Social Authentication — SDK loaders + user info extractors
 *
 * Each provider function:
 *  1. Loads the provider's SDK (once, cached)
 *  2. Opens the auth popup / one-tap
 *  3. Returns { provider, providerKey, email, displayName }
 *     ready to POST to /auth/external-login
 */

// ── Script loader (idempotent) ───────────────────────────────────────────────
const loaded = {};

function loadScript(id, src) {
  if (loaded[id]) return loaded[id];
  loaded[id] = new Promise((resolve, reject) => {
    if (document.getElementById(id)) { resolve(); return; }
    const s = document.createElement('script');
    s.id = id;
    s.src = src;
    s.async = true;
    s.defer = true;
    s.onload = resolve;
    s.onerror = () => reject(new Error(`Failed to load ${id} SDK`));
    document.head.appendChild(s);
  });
  return loaded[id];
}

// ─────────────────────────────────────────────────────────────────────────────
// GOOGLE  —  Google Identity Services (GIS)
// ─────────────────────────────────────────────────────────────────────────────
export async function loginWithGoogle() {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error('Google Client ID not configured');

  await loadScript('google-gis', 'https://accounts.google.com/gsi/client');

  return new Promise((resolve, reject) => {
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => {
        if (!response.credential) {
          reject(new Error('Google sign-in cancelled'));
          return;
        }
        // Decode the JWT id_token to get user info
        const payload = decodeJwt(response.credential);
        resolve({
          provider:    'Google',
          providerKey: payload.sub,
          email:       payload.email,
          displayName: payload.name || null,
        });
      },
    });

    // Trigger the One Tap or popup
    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        // Fallback: open the full sign-in button popup
        const btn = document.createElement('div');
        btn.style.display = 'none';
        document.body.appendChild(btn);
        window.google.accounts.id.renderButton(btn, {
          type: 'icon',
          size: 'large',
        });
        const inner = btn.querySelector('[role="button"]') || btn.firstChild;
        if (inner) inner.click();
        else reject(new Error('Google sign-in not available'));
        setTimeout(() => btn.remove(), 100);
      }
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// FACEBOOK  —  Facebook Login SDK
// ─────────────────────────────────────────────────────────────────────────────
export async function loginWithFacebook() {
  const appId = import.meta.env.VITE_FACEBOOK_APP_ID;
  if (!appId) throw new Error('Facebook App ID not configured');

  await loadScript('facebook-sdk', 'https://connect.facebook.net/en_US/sdk.js');

  // Init once
  if (!window.FB.__inited) {
    window.FB.init({
      appId,
      cookie: true,
      xfbml: false,
      version: 'v19.0',
    });
    window.FB.__inited = true;
  }

  return new Promise((resolve, reject) => {
    window.FB.login(
      (response) => {
        if (response.status !== 'connected') {
          reject(new Error('Facebook sign-in cancelled'));
          return;
        }
        const { userID, accessToken } = response.authResponse;

        // Fetch user profile
        window.FB.api('/me', { fields: 'email,name', access_token: accessToken }, (profile) => {
          if (profile.error) {
            reject(new Error(profile.error.message));
            return;
          }
          resolve({
            provider:    'Facebook',
            providerKey: userID,
            email:       profile.email || '',
            displayName: profile.name || null,
          });
        });
      },
      { scope: 'email,public_profile' },
    );
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// MICROSOFT  —  MSAL.js (popup flow)
// ─────────────────────────────────────────────────────────────────────────────
let msalInstance = null;

export async function loginWithMicrosoft() {
  const clientId = import.meta.env.VITE_MICROSOFT_CLIENT_ID;
  if (!clientId) throw new Error('Microsoft Client ID not configured');

  await loadScript('msal-js', 'https://alcdn.msauth.net/browser/2.38.3/js/msal-browser.min.js');

  if (!msalInstance) {
    msalInstance = new window.msal.PublicClientApplication({
      auth: {
        clientId,
        authority: 'https://login.microsoftonline.com/common',
        redirectUri: window.location.origin,
      },
      cache: { cacheLocation: 'sessionStorage' },
    });
    await msalInstance.initialize();
  }

  const response = await msalInstance.loginPopup({
    scopes: ['openid', 'profile', 'email', 'User.Read'],
  });

  const account = response.account;
  return {
    provider:    'Microsoft',
    providerKey: account.localAccountId || account.homeAccountId,
    email:       account.username || '',
    displayName: account.name || null,
  };
}

// ── JWT decoder (no validation — backend validates) ──────────────────────────
function decodeJwt(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return {};
  }
}
