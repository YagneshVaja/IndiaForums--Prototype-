import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import * as Facebook from 'expo-auth-session/providers/facebook';
import { Platform } from 'react-native';
import { useEffect, useCallback, useState } from 'react';

// Result shape posted to /auth/external-login — identical to prototype.
export type SocialProvider = 'Google' | 'Facebook' | 'Microsoft';

export interface SocialResult {
  provider: SocialProvider;
  providerKey: string;
  email: string;
  displayName: string | null;
}

// Client IDs come from Expo public env. Google requires platform-specific
// IDs — a bare `clientId` is not enough on native, expo-auth-session throws
// "Client Id property `androidClientId` must be defined …" on Android.
export const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
export const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
export const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
// Back-compat: a single EXPO_PUBLIC_GOOGLE_CLIENT_ID is used on web only.
export const GOOGLE_LEGACY_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

export const FACEBOOK_APP_ID = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID;
export const MICROSOFT_CLIENT_ID = process.env.EXPO_PUBLIC_MICROSOFT_CLIENT_ID;

// A Google provider is "configured" only if the current platform has the
// client ID it needs. Android/iOS must not fall back to the web ID.
function computeGoogleConfigured(): boolean {
  if (Platform.OS === 'android') return !!GOOGLE_ANDROID_CLIENT_ID;
  if (Platform.OS === 'ios') return !!GOOGLE_IOS_CLIENT_ID;
  return !!(GOOGLE_WEB_CLIENT_ID || GOOGLE_LEGACY_CLIENT_ID);
}

export const isGoogleConfigured = computeGoogleConfigured();
export const isFacebookConfigured = !!FACEBOOK_APP_ID;
export const isMicrosoftConfigured = !!MICROSOFT_CLIENT_ID;

// ── Helpers ────────────────────────────────────────────────────────────────

// No validation — backend verifies the token. We only need the payload
// to extract email/name/sub for the /auth/external-login call.
function decodeJwt(token: string): Record<string, unknown> {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return {};
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    // atob is available in Hermes/RN; fall back to global if not.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const decode = (globalThis as any).atob as ((s: string) => string) | undefined;
    const json = decode ? decode(base64) : Buffer.from(base64, 'base64').toString('utf8');
    return JSON.parse(json);
  } catch {
    return {};
  }
}

// A shared no-op return value for un-configured providers. The caller
// already hides the button when `isXConfigured` is false, but we still
// need a hook to call unconditionally so React's hook rules are satisfied.
type SocialHookReturn<K extends string> = {
  request: null;
  response: null;
  result: null;
  ready: false;
} & Record<K, () => Promise<null>>;

function stubPromise(): Promise<null> { return Promise.resolve(null); }

// ── Google ─────────────────────────────────────────────────────────────────

function useGoogleSignInReal() {
  const [result, setResult] = useState<SocialResult | null>(null);
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID ?? GOOGLE_LEGACY_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    scopes: ['openid', 'profile', 'email'],
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const idToken = response.params?.id_token;
      if (idToken) {
        const payload = decodeJwt(idToken) as {
          sub?: string; email?: string; name?: string;
        };
        if (payload.sub && payload.email) {
          setResult({
            provider: 'Google',
            providerKey: payload.sub,
            email: payload.email,
            displayName: payload.name ?? null,
          });
        }
      }
    }
  }, [response]);

  const promptGoogle = useCallback(async () => {
    setResult(null);
    const r = await promptAsync();
    return r;
  }, [promptAsync]);

  return { request, response, promptGoogle, result, ready: !!request };
}

function useGoogleSignInStub(): SocialHookReturn<'promptGoogle'> {
  return { request: null, response: null, promptGoogle: stubPromise, result: null, ready: false };
}

export const useGoogleSignIn = isGoogleConfigured ? useGoogleSignInReal : useGoogleSignInStub;

// ── Facebook ───────────────────────────────────────────────────────────────

function useFacebookSignInReal() {
  const [result, setResult] = useState<SocialResult | null>(null);
  const [request, response, promptAsync] = Facebook.useAuthRequest({
    clientId: FACEBOOK_APP_ID,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const accessToken = response.params?.access_token;
      if (accessToken) {
        fetch(`https://graph.facebook.com/me?fields=id,name,email&access_token=${accessToken}`)
          .then((r) => r.json())
          .then((profile: { id?: string; name?: string; email?: string }) => {
            if (profile.id) {
              setResult({
                provider: 'Facebook',
                providerKey: profile.id,
                email: profile.email ?? '',
                displayName: profile.name ?? null,
              });
            }
          })
          .catch(() => { /* ignore — user can retry */ });
      }
    }
  }, [response]);

  const promptFacebook = useCallback(async () => {
    setResult(null);
    const r = await promptAsync();
    return r;
  }, [promptAsync]);

  return { request, response, promptFacebook, result, ready: !!request };
}

function useFacebookSignInStub(): SocialHookReturn<'promptFacebook'> {
  return { request: null, response: null, promptFacebook: stubPromise, result: null, ready: false };
}

export const useFacebookSignIn = isFacebookConfigured ? useFacebookSignInReal : useFacebookSignInStub;

// ── Microsoft ──────────────────────────────────────────────────────────────

const MICROSOFT_DISCOVERY = {
  authorizationEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
  tokenEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
};

function useMicrosoftSignInReal() {
  const [result, setResult] = useState<SocialResult | null>(null);
  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'indiaforums' });

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: MICROSOFT_CLIENT_ID ?? '',
      scopes: ['openid', 'profile', 'email', 'User.Read'],
      redirectUri,
      responseType: AuthSession.ResponseType.IdToken,
      extraParams: { nonce: String(Date.now()) },
    },
    MICROSOFT_DISCOVERY,
  );

  useEffect(() => {
    if (response?.type === 'success') {
      const idToken = response.params?.id_token;
      if (idToken) {
        const payload = decodeJwt(idToken) as {
          sub?: string; oid?: string; email?: string;
          preferred_username?: string; name?: string;
        };
        const providerKey = payload.oid || payload.sub;
        const email = payload.email || payload.preferred_username || '';
        if (providerKey) {
          setResult({
            provider: 'Microsoft',
            providerKey,
            email,
            displayName: payload.name ?? null,
          });
        }
      }
    }
  }, [response]);

  const promptMicrosoft = useCallback(async () => {
    setResult(null);
    const r = await promptAsync();
    return r;
  }, [promptAsync]);

  return { request, response, promptMicrosoft, result, ready: !!request };
}

function useMicrosoftSignInStub(): SocialHookReturn<'promptMicrosoft'> {
  return { request: null, response: null, promptMicrosoft: stubPromise, result: null, ready: false };
}

export const useMicrosoftSignIn = isMicrosoftConfigured ? useMicrosoftSignInReal : useMicrosoftSignInStub;
