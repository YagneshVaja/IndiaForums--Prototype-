# Authentication Module Design

**Date:** 2026-04-06
**Module:** Authentication (JWT-based)
**API Base:** `https://api2.indiaforums.com`

---

## Overview

Hybrid authentication model for a mobile-first React app. The app is fully browsable without login. The MySpace tab serves as the auth entry point — showing Login/Register when unauthenticated, profile/dashboard when authenticated. Interactive actions (commenting, posting) will gate behind auth via an `AuthGate` component that redirects to the auth flow.

---

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/v1/auth/register` | Create new account |
| POST | `/api/v1/auth/login` | Email/password login |
| POST | `/api/v1/auth/external-login` | OAuth login (Google, etc.) |
| POST | `/api/v1/auth/refresh-token` | Swap refreshToken for new token pair |
| POST | `/api/v1/auth/logout` | Invalidate session |
| POST | `/api/v1/auth/forgot-password` | Send password reset email |
| POST | `/api/v1/auth/reset-password` | Reset password with token |
| GET | `/api/v1/auth/check-username` | Check username availability |
| GET | `/api/v1/auth/check-email` | Check email availability |

---

## Architecture

### 1. AuthContext (State Management)

**File:** `src/contexts/AuthContext.jsx`

Provides auth state and actions to the entire app via React context. Wraps the app in `main.jsx`.

**State:**
```js
{
  user: null | { userId, username, email, avatar, ... },
  accessToken: null | string,
  refreshToken: null | string,
  isAuthenticated: boolean,  // derived: !!user
  isLoading: boolean,        // true during initial hydration
}
```

**Actions:**
- `login(credentials)` — POST `/auth/login`, store tokens + user
- `register(data)` — POST `/auth/register`, store tokens + user
- `logout()` — POST `/auth/logout`, clear tokens + user
- `refreshSession()` — POST `/auth/refresh-token`, update tokens silently
- `updateUser(user)` — update user state (for profile changes in future modules)

**Lifecycle:**
1. On mount: check `localStorage` for tokens
2. If tokens exist: call `refresh-token` to validate
3. Success → set user + new tokens
4. Failure → clear storage silently (guest mode)
5. Set `isLoading = false` after hydration completes

### 2. API Interceptors

**File:** `src/services/api.js` (modify existing)

**Request interceptor:**
- Read `accessToken` from `localStorage`
- Attach `Authorization: Bearer <token>` if present
- Skip for public endpoints

**Response interceptor (401 handling):**
- If 401 and not already a retry:
  - If refresh already in progress → queue request
  - Else → call `/auth/refresh-token`
    - Success → update tokens, retry queued requests
    - Failure → clear tokens (silent logout)
- If 401 and already a retry → reject (prevent infinite loop)

**Race condition handling:** A `refreshPromise` variable ensures only one refresh call fires when multiple requests hit 401 simultaneously. Queued requests resolve once the single refresh completes.

### 3. Auth API Service

**File:** `src/services/authApi.js`

Clean function exports using the shared axios instance:

```js
register(data)            // POST /auth/register
login(credentials)        // POST /auth/login
externalLogin(data)       // POST /auth/external-login
refreshToken(token)       // POST /auth/refresh-token
logout(refreshToken)      // POST /auth/logout
forgotPassword(email)     // POST /auth/forgot-password
resetPassword(data)       // POST /auth/reset-password
checkUsername(username)    // GET  /auth/check-username?username=...
checkEmail(email)         // GET  /auth/check-email?email=...
```

### 4. Token Storage

**Storage:** `localStorage`
- Key `if_access_token` — JWT access token
- Key `if_refresh_token` — JWT refresh token
- Key `if_user` — serialized user object

Helper functions in `src/services/tokenStorage.js`:
- `getTokens()` / `setTokens(access, refresh)` / `clearTokens()`
- `getStoredUser()` / `setStoredUser(user)` / `clearStoredUser()`

---

## UI & Navigation

### Navigation Model

Auth screens live inside MySpace tab. No changes to `useAppNavigation` reducer. Auth screen transitions use local state in an `AuthFlow` wrapper.

```
MySpaceScreen
├── isAuthenticated?
│   ├── No  → <AuthFlow />
│   │         ├── 'login'            → LoginScreen
│   │         ├── 'register'         → RegisterScreen
│   │         ├── 'forgot-password'  → ForgotPasswordScreen
│   │         └── 'reset-password'   → ResetPasswordScreen
│   └── Yes → <MyAccountDashboard />  (placeholder)
```

### AuthGate Component

**File:** `src/components/auth/AuthGate.jsx`

Wraps interactive actions. If not authenticated, navigates to MySpace tab on interaction. No modal — simple redirect.

```jsx
<AuthGate onAuthRequired={navigateToMySpace}>
  <button onClick={handleComment}>Comment</button>
</AuthGate>
```

### Screen Files

```
src/screens/auth/
  AuthFlow.jsx               — local state router
  LoginScreen.jsx            — email/password login form
  LoginScreen.module.css
  RegisterScreen.jsx         — registration form with live username/email checks
  RegisterScreen.module.css
  ForgotPasswordScreen.jsx   — email input → triggers reset email
  ForgotPasswordScreen.module.css
  ResetPasswordScreen.jsx    — new password form (from reset link)
  ResetPasswordScreen.module.css
```

### UI Design

All screens follow existing patterns:
- CSS Modules with design tokens from `tokens.css`
- Mobile-first, 390px viewport target
- Indian news app aesthetic (clean cards, clear typography hierarchy)
- Standard loading/error states using existing `LoadingState` and `ErrorState` components
- Form inputs: clean, minimal, branded with `--color-primary`

---

## File Summary

| File | Action | Purpose |
|------|--------|---------|
| `src/services/tokenStorage.js` | New | Token read/write helpers |
| `src/services/authApi.js` | New | Auth endpoint functions |
| `src/services/api.js` | Modify | Add request/response interceptors |
| `src/contexts/AuthContext.jsx` | Modify | Add AuthProvider + useAuth |
| `src/main.jsx` | Modify | Wrap app with AuthProvider |
| `src/screens/auth/AuthFlow.jsx` | New | Auth screen local router |
| `src/screens/auth/LoginScreen.jsx` | New | Login form |
| `src/screens/auth/RegisterScreen.jsx` | New | Register form |
| `src/screens/auth/ForgotPasswordScreen.jsx` | New | Forgot password form |
| `src/screens/auth/ResetPasswordScreen.jsx` | New | Reset password form |
| `src/components/auth/AuthGate.jsx` | New | Auth gate wrapper |
| `src/screens/MySpaceScreen.jsx` | Modify | Conditional auth flow / dashboard |
