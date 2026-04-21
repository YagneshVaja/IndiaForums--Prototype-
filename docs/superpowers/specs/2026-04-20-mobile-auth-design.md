# Mobile Auth — Design

**Date:** 2026-04-20
**Target:** `mobile/` (React Native / Expo)
**Reference:** `indiaforums/` prototype (web) and `api-1.json` (OpenAPI v1)

## Purpose

Replace the mobile app's fake auth (which just `setTimeout`s and navigates) with a real implementation that matches the prototype's behaviour and contract against `/api/v1/auth/*`.

## Scope

Full parity with the prototype's auth surface:

- Login (`/auth/login`)
- Register (`/auth/register`)
- Logout (`/auth/logout` — revokes refresh token)
- Silent refresh (`/auth/refresh-token` on 401)
- Forgot password (`/auth/forgot-password`)
- Reset password (`/auth/reset-password`) — service layer only; deep-link screen deferred
- External login (`/auth/external-login`) — Google, Facebook, Microsoft via `expo-auth-session`
- Check username / email availability (`/auth/check-username`, `/auth/check-email`)
- Moderator backfill — fetch `groupId` from `/users/{id}/profile` after sign-in

Out of scope for this pass: `ResetPasswordScreen` (needs `expo-linking` config), captcha (`captchaToken` left null as in prototype), MySpace screens.

## Architecture

### New files

| File | Role |
|------|------|
| `mobile/src/services/authStorage.ts` | Tokens → `expo-secure-store`; user snapshot → `react-native-mmkv`; web fallback via in-memory dict (same pattern as `onboardingStore`) |
| `mobile/src/services/authApi.ts` | 1:1 port of `indiaforums/src/services/authApi.js` with typed DTOs from `api-1.json` |
| `mobile/src/services/userProfileApi.ts` | Minimal `getProfile(userId)` used for the moderator-group backfill |
| `mobile/src/services/socialAuth.ts` | RN port of `socialAuth.js` using `expo-auth-session`; each provider reads its client ID from `EXPO_PUBLIC_*` env and returns `{provider, providerKey, email, displayName}` |
| `mobile/src/store/authStore.ts` | Zustand store: `user`, `isAuthenticated`, `isModerator`, `isHydrating`, and actions `hydrate / login / register / externalLogin / logout / updateUser` |

### Modified files

| File | Change |
|------|--------|
| `mobile/src/services/api.ts` | Add `PUBLIC_PATHS`, request interceptor (attach `Bearer <access>`), response interceptor (401 → single-in-flight refresh → retry), and export `extractApiError` |
| `mobile/src/navigation/RootNavigator.tsx` | Call `authStore.hydrate()` on mount; show splash while hydrating; keep Guest / Auth / Main trio |
| `mobile/src/features/auth/screens/LoginScreen.tsx` | Relabel "Email" → "Email or Username", drop email-regex gate on that field, call `authStore.login`, render server errors, wire social buttons |
| `mobile/src/features/auth/screens/RegisterScreen.tsx` | Call `authStore.register`; map server field errors (username/email/password/displayName) to inline messages |
| `mobile/src/features/auth/screens/ForgotPasswordScreen.tsx` | Call `authApi.forgotPassword(email)`; keep the existing "check your inbox" success state |

### Data flow

```
LoginScreen ──▶ authStore.login ──▶ authApi.login ──▶ apiClient (/auth/login)
                      │
                      ├── authStorage.setTokens(access, refresh)
                      ├── authStorage.setStoredUser(user)
                      └── setState({user, isAuthenticated:true})
                               │
                               └──▶ effect: if !user.groupId,
                                          userProfileApi.getProfile(userId)
                                          → updateUser({groupId, groupName})

apiClient (any call) ──▶ 401 ──▶ queue on refreshPromise
                                       │
                                       ├── success: retry original with new access
                                       └── failure: authStorage.clearAll() + reject
```

### Storage keys (match prototype, portable across web/native)

- `if_access_token`, `if_refresh_token` → SecureStore on native, memory on web
- `if_user` → MMKV on native, memory on web

### Moderator rule

`groupId ∈ {3, 4, 5, 6}` → `isModerator = true`. Identical to prototype `AuthContext.jsx:19`. Backfill happens post-login via `/users/{userId}/profile` because `/auth/*` responses don't include it.

### Social login env vars

Read at build time via `process.env` (Expo public-env convention):

- `EXPO_PUBLIC_GOOGLE_CLIENT_ID`
- `EXPO_PUBLIC_FACEBOOK_APP_ID`
- `EXPO_PUBLIC_MICROSOFT_CLIENT_ID`

If any is unset, the corresponding button hides (prototype throws; mobile UX prefers a silent skip).

### Navigation gating

Unchanged from current shape: `GuestStack` keeps rendering `MainTabNavigator` — unauthenticated browsing continues to work. Protected actions (post/react/follow/MySpace) push the `Auth` stack. On successful auth, `navigation.reset` into `Main`. On logout, reset into `Guest`.

## Error handling

- 400 `ValidationProblemDetails.errors` → field-level messages on register (mapping identical to `indiaforums/src/screens/onboarding/RegisterScreen.jsx:60-68`).
- 401 on the refresh endpoint itself, or after a retry → `clearAll()` and force the user back to Guest/Auth.
- 429 → reuse `extractApiError` helper's rate-limit message (already in prototype `api.js`).

## Testing

No test runner is configured in `mobile/`. Verification is manual: run `npx tsc --noEmit`, `expo start`, and exercise login/register/refresh/logout by hand against `api2.indiaforums.com`. Record results against the checklist in the implementation plan.
