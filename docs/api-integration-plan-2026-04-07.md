# IndiaForums — API Integration Plan

**Date:** 2026-04-07
**Author:** Frontend Team
**Source spec:** `api-1 (1).json` (OpenAPI 3.x, 33,118 lines)
**API base:** `https://api2.indiaforums.com`
**API key header:** `api-key: Api2IndiaForums@2026`

This document is the single source of truth for what the IndiaForums API offers, what the frontend has wired up so far, what's still outstanding, and the order in which the remaining work should land. Use it as a checklist when picking up the next module.

---

## Table of Contents

1. [API Surface Overview](#1-api-surface-overview)
2. [Authentication Flow](#2-authentication-flow)
3. [Pre-Login vs Post-Login Capabilities](#3-pre-login-vs-post-login-capabilities)
4. [Current Integration Status](#4-current-integration-status)
5. [Known Backend Bugs](#5-known-backend-bugs)
6. [Frontend Field/Param Fixes Already Applied](#6-frontend-fieldparam-fixes-already-applied)
7. [Phased Integration Plan](#7-phased-integration-plan)
8. [Per-Module Implementation Notes](#8-per-module-implementation-notes)
9. [Cross-Cutting Concerns](#9-cross-cutting-concerns)
10. [Open Questions](#10-open-questions)

---

## 1. API Surface Overview

The API has **~198 operations** across **47 official tags** (verified against the `tags` array at the bottom of `api-1 (1).json`). Tag names below match the spec **exactly**.

### Tag coverage matrix (47/47)

Every tag in the spec maps to a row in §1 and §4 below. Use this checklist when handing off the doc.

| Group | Official tags | In §1 | In §4 |
|---|---|:---:|:---:|
| Auth & Identity (5) | Authentication, Email Verification, OAuth, Username Management, Username Change Log | ✅ | ✅ |
| Me namespace (13) | My Account, User Status, My Badges, My Buddies, My Comments, My Posts, My Forum Drafts, My Celebrities, My Forums, My Movies, My Shows, My FanFiction, My Warnings | ✅ | ✅ |
| Other users (1) | User Profile | ✅ | ✅ |
| Social (5) | User Activities, User Notifications, User Messages, User Buddies, Devices | ✅ | ✅ |
| Content read (13) | Articles, Photos, Videos, Media Galleries, Shorts, WebStories, Movies, Shows, Celebrities, FanFictions, Quizzes, Forums, Forum Threads | ✅ | ✅ |
| Engagement (4) | Comments, Content Reactions, Content Reports, Content Sharing | ✅ | ✅ |
| Discovery (4) | Home, Categories, Search, HelpCenter | ✅ | ✅ |
| Media & Uploads (2) | Image Upload, External Media | ✅ | ✅ |

**Total: 5 + 13 + 1 + 5 + 13 + 4 + 4 + 2 = 47 ✅**


### Authentication & Identity
| Tag | # ops | Purpose |
|---|---:|---|
| Authentication | 9 | Register, login, refresh, logout, password reset, availability checks |
| Email Verification | 3 | Send / confirm code, view email logs |
| OAuth | 3 | Google / Facebook / Microsoft callbacks (server-side) |
| Username Management | 2 | Username history, change username |
| Username Change Log | 1 | Audit log (paginated) |

### "Me" namespace (current authenticated user)
| Tag | # ops | Purpose |
|---|---:|---|
| My Account | 4 | `/me` profile + `/me/preferences` |
| User Status | 2 | `/me/status` (online / away / busy / invisible) |
| My Badges | 2 | List + detail |
| My Buddies | 1 | Buddy list with mode (`bl`, `pl`, `wl`, `bll`, `vl`) |
| My Comments | 1 | Sortable feed |
| My Posts | 3 | Posts, posts-by-topic, watching topics |
| My Forum Drafts | 1 | Draft replies / topics |
| My Celebrities | 1 | Followed celebs |
| My Forums | 1 | Forums followed |
| My Movies | 1 | Favourite movies |
| My Shows | 1 | Favourite shows |
| My FanFiction | 2 | Followers + followed authors |
| My Warnings | 1 | Moderation warning history |

### Other users (read-only with privacy gating)
| Tag | # ops | Purpose |
|---|---:|---|
| User Profile | 14 | `/users/{id}/profile` + every public sub-resource |

### Social
| Tag | # ops | Purpose |
|---|---:|---|
| User Activities | 6 | Feed, post, post-on-wall, update, delete |
| User Notifications | 3 | List, unread count, mark-read |
| User Messages | 11 | Folders, inbox/outbox, threads, drafts, send, bulk actions |
| User Buddies | 4 | Friend requests, accept, cancel, block |
| Devices | 4 | Push device registration & preferences |

### Content (read)
| Tag | # ops | Purpose |
|---|---:|---|
| Articles | 3 | List + detail |
| Photos | 3 | List + detail |
| Videos | 3 | List + detail |
| Media Galleries | 3 | List + detail |
| Shorts | 1 | List |
| WebStories | 2 | List + detail |
| Movies | 9 | List, story, cast, fanclub, reviews CRUD |
| Shows | 7 | List, about, cast, fanclub, ChaskaMeter rating |
| Celebrities | 3 | Ranked list, biography, fans |
| FanFictions | 5 | List, detail, chapters, followers, authors |
| Quizzes | 4 | List, detail, leaderboards |
| Forums | ~25 | Read + write + admin |
| Forum Threads | 2 | Reactions + likes |

### Engagement
| Tag | # ops | Purpose |
|---|---:|---|
| Comments | 7 | Read, write, edit, delete, like, react, ban guest |
| Content Reactions | 1 | Emoji reactions on any content |
| Content Reports | 3 | Report content, list types, get user's report |
| Content Sharing | 2 | Generate shareable URL, track shares |

### Discovery & Misc
| Tag | # ops | Purpose |
|---|---:|---|
| Home | 10 | Banners, articles, topics, channels, latest, online members, initial, content, latest-content |
| Categories | 4 | Initial / content / extended / load-more |
| Search | 3 | Search, suggestions, trending |
| HelpCenter | 4 | Home, questions, detail, contributors |

### Media & Uploads
| Tag | # ops | Purpose |
|---|---:|---|
| Image Upload | 4 | Cropped temp upload, avatar, banner, post image |
| External Media | 8 | Giphy, Tenor, Unsplash, Pexels, Pixabay (proxied) |

---

## 2. Authentication Flow

Everything in the spec hangs off the JWT issued by these five endpoints.

### 2.1 Token model

Every successful auth call returns `AuthenticationResponseDto`:

```json
{
  "accessToken":  "<JWT>",
  "refreshToken": "<opaque>",
  "tokenType":    "Bearer",
  "expiresIn":    3600,
  "userId":       1301960,
  "userName":     "Yagneshh",
  "email":        "yvtechcoder@gmail.com",
  "displayName":  "Yagneshh"
}
```

**This is the only place the API hands you `userId` directly.** Every authenticated call after this needs to either (a) read it from the locally cached identity, or (b) ask `/me` / `/users/{userId}/profile` for a richer view.

### 2.2 The five auth entry points

| Endpoint | Body | Returns | Notes |
|---|---|---|---|
| `POST /auth/register` | `{ userName, email, password, displayName?, captchaToken? }` | `AuthenticationResponseDto` | Rate-limited 10/15min |
| `POST /auth/login` | `{ userName, password }` | `AuthenticationResponseDto` | Rate-limited 10/15min |
| `POST /auth/external-login` | `{ provider, providerKey, email, displayName? }` | `AuthenticationResponseDto` | Auto-creates account if missing |
| `POST /auth/refresh-token` | `{ refreshToken }` | `AuthenticationResponseDto` | Used by axios interceptor |
| `POST /auth/logout` | `{ refreshToken }` | `boolean` | Server revokes refresh token |

### 2.3 Token lifecycle (frontend)

```
register / login / external ──► tokens stored in localStorage
                                      │
                                      ▼
                      attached as Authorization: Bearer on every request
                                      │
                              ┌───────┴────────┐
                              ▼                ▼
                        200 → return       401 → axios interceptor
                                                  │
                                                  ▼
                                        POST /auth/refresh-token
                                                  │
                                          ┌───────┴────────┐
                                          ▼                ▼
                                    success: retry      failure:
                                    original request    clearAll() →
                                                        force re-login
```

Implementation: [api.js](indiaforums/src/services/api.js) (interceptors), [tokenStorage.js](indiaforums/src/services/tokenStorage.js), [AuthContext.jsx](indiaforums/src/contexts/AuthContext.jsx) (hydration on mount).

### 2.4 Password reset flow

```
POST /auth/forgot-password   { email }                      → sends reset token via email
POST /auth/reset-password    { token, password }            → sets new password
```

Captcha is mentioned in the description for `forgot-password` but the request DTO does not require it as a property — leave unset for now and revisit if the backend starts rejecting requests.

### 2.5 Email verification flow (separate `Email Verification` tag)

After registration the user is signed in but `isEmailConfirmed` is `false`:

```
POST /email-verification/resend     (empty or { email })   → sends new code
POST /email-verification/confirm    { code }               → confirms
GET  /email-verification/logs                              → audit history
```

Important: the API does not 403 unverified users on any other endpoint. Email verification is a UX nudge in this app, not an enforcement boundary.

### 2.6 Live availability checks

Used during the Register form, debounced ~500ms:

```
GET /auth/check-username?username=...   → { available, suggestions, message }
GET /auth/check-email?email=...         → { available, message, hint }
```

> **Param-name gotcha:** `check-username` uses lowercase `username` in the query string, but `LoginRequestDto` / `RegisterRequestDto` use camelCase `userName` in the body. Easy to mix up.

### 2.7 Rate limits

All five auth entry points are rate-limited **10 attempts per 15 minutes** per the spec descriptions. The frontend should special-case `429 Too Many Requests` and surface a friendly "please wait N minutes" message instead of the generic error toast.

---

## 3. Pre-Login vs Post-Login Capabilities

The spec marks an endpoint as authenticated by including `401 Unauthorized` in its responses. Here's what each side of the auth boundary unlocks.

### 3.1 Anonymous user can:

- **Read all content** — articles, photos, videos, galleries, shorts, web stories, fan fictions, quizzes, movies, shows, celebs, help-center articles
- **Browse the forum read-only** — home, topics index, all threads & posts, hall of fame
- **Read comments** on any content type
- **View any user's public profile** via `/users/{id}/profile` and the `/users/{id}/*` sub-routes (privacy-locked profiles return 403, never 401)
- **Search** content + autocomplete + trending queries
- **Use the home page** — banners, latest, articles, topics, channels (no online members)
- **Check username/email availability**
- **Authenticate** (register / login / forgot-password / reset / external-login)

### 3.2 Authenticated user additionally can:

**Their identity & account**
- `GET/PUT /me`, `GET/PUT /me/preferences`
- `GET/PUT /me/status`
- `GET /me/username/history`, `PUT /me/username`

**Their own activity & content**
- `GET /my-badges`, `/my-buddy-list`, `/my-comments`, `/my-celebs`, `/my-forums`, `/my-movies`, `/my-shows`, `/my-fanfiction-followers`, `/my-fanfiction-authors`, `/my-forum-drafts`, `/my-posts`, `/my-posts-by-topic`, `/my-watching-topics`, `/my-warning-details`

**Social interactions**
- Friend graph: send / accept / cancel friend requests, block users
- Messaging: full PM inbox, drafts, threads, send, bulk actions, folders
- Notifications: list, unread badge count, mark read
- Activity feed: read, post, post-on-wall, edit, delete

**Devices**
- Register / unregister push device, update preferences

**Forum write**
- Create topic, reply, edit post, react, vote in poll, watch/unwatch
- Moderation (group-gated): close, move, merge, trash, restore, edit topic admin settings

**Engagement**
- `POST/PUT/DELETE /comments`, like, react, report
- `POST /movies/{id}/reviews`, `PUT/DELETE` own reviews
- `POST /shows/{id}/rate` (ChaskaMeter rating)
- Quiz play (creates leaderboard entries)

**Uploads**
- Avatar (`/upload/user-thumbnail`)
- Banner (`/upload/user-banner`)
- Post image (`/upload/post-image`)
- Cropped temp image (`/upload/cropped`)

**Gated reads**
- `GET /home/online-members` — only visible when authenticated

---

## 4. Current Integration Status

Status legend: ✅ done · 🟡 partial · ❌ not started · 🚫 blocked by backend

### 4.1 Auth & Identity

| Tag | Status | Files | Notes |
|---|---|---|---|
| Authentication | 🟡 | [authApi.js](indiaforums/src/services/authApi.js), [AuthContext.jsx](indiaforums/src/contexts/AuthContext.jsx), [LoginScreen.jsx](indiaforums/src/screens/auth/LoginScreen.jsx), [RegisterScreen.jsx](indiaforums/src/screens/auth/RegisterScreen.jsx), [ForgotPasswordScreen.jsx](indiaforums/src/screens/auth/ForgotPasswordScreen.jsx), [ResetPasswordScreen.jsx](indiaforums/src/screens/auth/ResetPasswordScreen.jsx) | Login/register/refresh/logout/forgot/reset all wired. `external-login`, `check-username`, `check-email` blocked by backend 500 |
| Email Verification | ✅ | [emailVerificationApi.js](indiaforums/src/services/emailVerificationApi.js), [VerifyEmailScreen.jsx](indiaforums/src/screens/auth/VerifyEmailScreen.jsx), [useEmailVerificationLogs.js](indiaforums/src/hooks/useEmailVerificationLogs.js) | Resend/confirm working after `{}` body fix |
| OAuth (server callbacks) | n/a | — | Server-side. Frontend uses `socialAuth.js` SDKs and posts to `/auth/external-login` |
| Username Management | 🟡 | [UsernameScreen.jsx](indiaforums/src/screens/account/UsernameScreen.jsx), [userProfileApi.js](indiaforums/src/services/userProfileApi.js) | History endpoint works. Change endpoint had wrong field name (`userName` → `newUsername`) — fixed; awaiting retest |
| Username Change Log | ❌ | — | `GET /username-change-log` not yet wired (history is shown via `/me/username/history`) |

### 4.2 "Me" namespace

| Tag | Status | Files | Notes |
|---|---|---|---|
| My Account | 🟡 | [AccountSettingsScreen.jsx](indiaforums/src/screens/account/AccountSettingsScreen.jsx), [userProfileApi.js](indiaforums/src/services/userProfileApi.js) | `GET /me` is 🚫 backend 500 — bypassed via `getProfile(userId)`. `PUT /me` now sends `userId/groupId/updateChecksum` per spec — awaiting retest. Preferences ✅ |
| User Status | ✅ | [StatusScreen.jsx](indiaforums/src/screens/account/StatusScreen.jsx) | `GET/PUT /me/status` working |
| My Badges | ✅ | userProfileApi.js, [ProfileScreen.jsx](indiaforums/src/screens/profile/ProfileScreen.jsx) (Badges tab) | List works; detail not yet surfaced |
| My Buddies | ✅ | userProfileApi.js, ProfileScreen.jsx (Buddies tab) | `/my-buddy-list` wired in Phase 8 (default mode `bl`) |
| My Comments | ✅ | userProfileApi.js, ProfileScreen.jsx | `pn/ps` pagination fixed |
| My Posts | ✅ | userProfileApi.js, ProfileScreen.jsx | `/my-posts` wired (Posts tab); `/my-watched-topics` surfaced as own-profile "Watching" tab in Phase 8. `/my-posts-by-topic` exported for future use |
| My Forum Drafts | ✅ | userProfileApi.js, ProfileScreen.jsx (Drafts tab) | Wired in Phase 8 as own-profile-only tab |
| My Celebrities | ✅ | userProfileApi.js, ProfileScreen.jsx (Favorites → Celebs) | Phase 8 switched Favorites tab to dedicated `/my-favourite-celebrities` for own profile |
| My Forums | ✅ | userProfileApi.js, ProfileScreen.jsx (Forums tab) | `/my-favourite-forums` wired in Phase 8 |
| My Movies | ✅ | userProfileApi.js, ProfileScreen.jsx (Favorites → Movies) | `/my-favourite-movies` wired in Phase 8 |
| My Shows | ✅ | userProfileApi.js, ProfileScreen.jsx (Favorites → Shows) | `/my-favourite-shows` wired in Phase 8 |
| My FanFiction | ✅ | userProfileApi.js, ProfileScreen.jsx (FF Fans + Following tabs) | Both `/my-fanfiction-followers` and `/my-fanfiction-following` wired in Phase 8 |
| My Warnings | ✅ | userProfileApi.js, ProfileScreen.jsx (Warnings tab) | `/my-warnings` wired in Phase 8 |

### 4.3 Other users

| Tag | Status | Files | Notes |
|---|---|---|---|
| User Profile (`/users/{id}/*`) | 🟡 | userProfileApi.js, ProfileScreen.jsx | Profile + posts + comments + buddies + favourites + forums + badges wired. Activities, fanfiction-followers, username-change-log, badge-detail not yet surfaced |

### 4.4 Social

| Tag | Status | Files | Notes |
|---|---|---|---|
| User Activities | ✅ | [activitiesApi.js](indiaforums/src/services/activitiesApi.js), [ActivitiesScreen.jsx](indiaforums/src/screens/account/ActivitiesScreen.jsx) | Feed + composer + edit + delete working |
| User Notifications | ✅ | [notificationsApi.js](indiaforums/src/services/notificationsApi.js), [NotificationsScreen.jsx](indiaforums/src/screens/account/NotificationsScreen.jsx), [useNotifications.js](indiaforums/src/hooks/useNotifications.js) | List + unread badge polling working |
| User Messages | ❌ | — | Not started — biggest unbuilt feature |
| User Buddies | ❌ | — | Friend requests, accept/cancel, block — not started |
| Devices | ✅ | [devicesApi.js](indiaforums/src/services/devicesApi.js), [DevicesScreen.jsx](indiaforums/src/screens/account/DevicesScreen.jsx) | List + register + unregister + preferences working |

### 4.5 Content & Engagement

| Tag | Status | Files | Notes |
|---|---|---|---|
| Articles (read) | ✅ | useArticles, useArticleDetails | Used in Explore/News/Article screens |
| Photos / Videos / Galleries | ✅ | useVideos, useMediaGalleries | Working |
| Forums (read) | ✅ | useForumHome, useForumTopics, useAllForumTopics, useTopicPosts | Read-only fully wired |
| Forums (write) | ❌ | — | Create topic, reply, edit, react, vote, watch — not started |
| Forums (admin) | ❌ | — | Close/move/merge/trash/restore — not started, group-gated |
| Forum Threads (react/likes) | ❌ | — | Not wired |
| Comments (read) | ✅ | useComments | Read-only working |
| Comments (write) | ❌ | — | Create, edit, delete, like, react, report — not started |
| Content Reactions | ❌ | — | Not wired |
| Content Reports | ❌ | — | Not wired |
| Content Sharing | ❌ | — | Not wired |
| Movies (read) | 🟡 | — | Browsing partially wired in Explore. Reviews not wired |
| Shows (read) | 🟡 | — | Same as movies. ChaskaMeter rating not wired |
| Celebrities | 🟡 | useCelebrities, useCelebrityBiography, useCelebrityFans | Working |
| FanFictions | ❌ | — | Read endpoints not wired |
| Quizzes | 🟡 | — | List visible in Explore. Detail / leaderboard not wired |

### 4.6 Discovery, Uploads, External

| Tag | Status | Files | Notes |
|---|---|---|---|
| Home | 🟡 | — | Several home endpoints already used in Explore. Online members not wired |
| Categories | 🟡 | useTagContent | Partially wired |
| Search | 🟡 | [searchApi.js](indiaforums/src/services/searchApi.js), [SearchScreen.jsx](indiaforums/src/screens/SearchScreen.jsx) | Phase 9: live search + suggestions dropdown + trending pills + content-type chips wired. **Class D backend bugs** (`/search/suggestions`, `/search/trending`, and `/search?contentType=1\|2\|3`) handled with silent fallbacks. Only `contentType=0` (Google CSE) currently returns results. |
| HelpCenter | ✅ | [helpCenterApi.js](indiaforums/src/services/helpCenterApi.js), [HelpCenterScreen.jsx](indiaforums/src/screens/help/HelpCenterScreen.jsx) | Phase 9: built around `/helpcenter/home` (categories + questionsByCategory) + `/helpcenter/question/{id}` detail. `/helpcenter/questions` filter is **Class D-3** broken — search-by-text deferred. |
| Image Upload | ❌ | — | Avatar / banner / post-image / cropped — not started |
| External Media (Giphy/Tenor/etc.) | ❌ | — | Not wired (low priority for prototype) |

---

## 5. Known Backend Bugs

These six endpoints are confirmed to crash with `HTTP 500 — "An unexpected error occurred"`. The full bug report (with curl reproductions) lives at [docs/backend-issues-2026-04-07.md](docs/backend-issues-2026-04-07.md).

| # | Endpoint | Status | Action |
|---|---|---|---|
| 1 | `GET /api/v1/me` | 🚫 | Worked around by calling `/users/{currentUserId}/profile` instead |
| 2 | `PUT /api/v1/me` | 🟡 (likely fixed) | Frontend was missing `userId/groupId/updateChecksum` from `UpdateProfileCommand` — now sent. Retest. |
| 3 | `PUT /api/v1/me/username` | 🟡 (likely fixed) | Frontend was sending `{ userName }` but spec requires `{ newUsername }` per `ChangeUsernameRequestDto` — now corrected. Retest. |
| 4 | `GET /api/v1/auth/check-username` | 🚫 | Frontend already sends correct `username` lowercase param. Real backend bug. |
| 5 | `GET /api/v1/auth/check-email` | 🚫 | Real backend bug. |
| 6 | `POST /api/v1/auth/external-login` | 🚫 | Frontend already matches `ExternalLoginRequestDto`. Real backend bug. |

**Action items**
- Retest #2 and #3 after the recent frontend fixes. If they pass, remove from this list and from `backend-issues-2026-04-07.md`.
- #1, #4, #5, #6 still need backend dev attention.

---

## 6. Frontend Field/Param Fixes Already Applied

Bugs found by reading the spec and fixed in the frontend (no backend change needed):

| File | Old | New | Reason |
|---|---|---|---|
| [UsernameScreen.jsx:71](indiaforums/src/screens/account/UsernameScreen.jsx#L71) | `{ userName: trimmed }` | `{ newUsername: trimmed }` | `ChangeUsernameRequestDto` requires `newUsername` |
| [AccountSettingsScreen.jsx](indiaforums/src/screens/account/AccountSettingsScreen.jsx) | `{ displayName, bio }` | `{ userId, groupId, updateChecksum, displayName, bio }` | `UpdateProfileCommand` requires those for optimistic concurrency |
| [useUserProfile.js](indiaforums/src/hooks/useUserProfile.js) | Called `/me`, set `res.data` | Calls `/users/{userId}/profile`, unwraps `res.data.user` | Bypass broken `/me`; response shape is `{ user, loggedInUser }` |
| [emailVerificationApi.js](indiaforums/src/services/emailVerificationApi.js) | `api.post('/email-verification/resend')` (no body) | `api.post('/email-verification/resend', {})` | Avoids `411 Length Required` |
| [RegisterScreen.jsx](indiaforums/src/screens/auth/RegisterScreen.jsx) | `register({ username, … })` | `register({ userName, … })` | `RegisterRequestDto` is camelCase |
| [api.js](indiaforums/src/services/api.js) | Read `err.response.data.message` | Added `extractApiError()` reading `detail/title/message/error` | RFC 7807 Problem Details |
| [userProfileApi.js](indiaforums/src/services/userProfileApi.js) | `getMyComments({ pageSize, currentPage })` | `getMyComments({ pn: 1, ps: 24 })` | Spec uses `pn`/`ps` |

---

## 7. Phased Integration Plan

The phases below are sequenced by **dependency** and **user-visible value**, not by alphabetical convenience. Each phase is independently shippable.

### Phase 0 — Stabilise Auth ✅ (probed 2026-04-08)

Goal: every existing auth/account flow works end-to-end, no remaining backend 500s in our list.

- [x] Retest `PUT /me` — **backend-side fix confirmed**: re-probed on 2026-04-08 and now returns clean `401` with a dummy bearer token instead of the previous Class A catch-all 500. The handler is reachable; a valid token should now succeed.
- [x] Retest `PUT /me/username` — **backend-side fix confirmed**: also returns `401` with a dummy token now, not 500. `GET /me` is also fixed (same probe).
- [x] Wire `429 Too Many Requests` handling in [api.js](indiaforums/src/services/api.js) — delivered as part of Phase 10: `extractApiError` detects 429 first and returns a friendly message respecting the `Retry-After` header (seconds or HTTP-date). Helpers: `isRateLimitError`, `formatRateLimitMessage`, `parseRetryAfter`. Richer opt-in UI in [components/ui/RateLimitNotice.jsx](indiaforums/src/components/ui/RateLimitNotice.jsx) with a live countdown.
- [x] Update [docs/backend-issues-2026-04-07.md](docs/backend-issues-2026-04-07.md) — Phase 0 re-probe section added reflecting the 3 newly-fixed Class A endpoints. Remaining Class A: `POST /auth/external-login`, `POST /comments`, `POST /reports`.

**Acceptance:** Edit Profile + Change Username reachable end-to-end (pending live-token smoke test). Auth screens use `extractApiError` so the real `detail` field always surfaces. ✅

### Phase 1 — Image Uploads ✅

Goal: user can upload an avatar and a cover banner.

Why next: avatar is referenced everywhere (profile, comments, activities, message lists). Without it, every other screen feels half-done.

- [x] Created [services/uploadsApi.js](indiaforums/src/services/uploadsApi.js) with `uploadCroppedImage`, `uploadAvatar`, `uploadBanner`, `uploadPostImage`, plus `validateImageFile`, `fileToBase64`, `MAX_UPLOAD_BYTES` helpers (10 MB cap, GIF rejected).
- [x] Added [components/account/AvatarUploader.jsx](indiaforums/src/components/account/AvatarUploader.jsx) — shared component with `variant="avatar"` / `variant="banner"`, file picker → base64 → upload → preview, Remove button sends empty `imageData` to clear the existing image.
- [x] Wired both variants into [screens/account/AccountSettingsScreen.jsx](indiaforums/src/screens/account/AccountSettingsScreen.jsx) — banner and avatar fields both live in the Profile section.

**Acceptance:** user can upload + remove avatar + banner. ⚠️ Blocked on backend: `/upload/user-thumbnail` and `/upload/user-banner` are still Class B MediatR-DI bugs per [backend-issues](docs/backend-issues-2026-04-07.md) — the frontend code is correct and ready; the endpoints return 400 until backend fixes DI registration.

### Phase 2 — Social Graph: Buddies ✅

Goal: friend request + accept + cancel + block flows.

Why before messages: messaging requires "is this user blocked / a buddy" context that the buddy graph provides.

- [x] Created [services/buddiesApi.js](indiaforums/src/services/buddiesApi.js) with `BUDDY_MODES` enum (`bl`/`pl`/`wl`/`bll`/`vl`), `getMyBuddyList(mode, params)`, `sendFriendRequest`, `acceptFriendRequest`, `cancelFriendRequest`, `blockUser`.
- [x] Created [screens/buddies/BuddiesScreen.jsx](indiaforums/src/screens/buddies/BuddiesScreen.jsx) with all 5 sub-tabs (Friends · Pending · Sent · Blocked · Visitors), per-row actions (accept / reject / cancel / unblock), and inline busy state.
- [x] Added "Add Buddy" + "Block" buttons under the header on other-user profiles via the new `ProfileActions` component in [screens/profile/ProfileScreen.jsx](indiaforums/src/screens/profile/ProfileScreen.jsx) — calls `sendFriendRequest` / `blockUser`, swaps to "Request Sent" after success, supports block/unblock toggle, surfaces success/error inline.
- [x] Added "Block user" item to the comment `⋯` menu in [components/comments/CommentsSection.jsx](indiaforums/src/components/comments/CommentsSection.jsx) (sits next to the existing Report item, only shown for comments by other users). Confirms before blocking and reports the result via alert.
- [x] Added Buddies entry to the [MySpaceScreen](indiaforums/src/screens/MySpaceScreen.jsx) menu.

**Acceptance:** Friend request from another user's profile lands in their Pending tab; accept moves it to Friends; blocking is reachable from both the profile header and the comment menu. ⚠️ Live verification of the full graph requires two real accounts; backend endpoints all return clean 401 in the audit.

### Phase 3 — Private Messages ✅

Goal: full PM inbox with folders and replies.

- [x] Created [services/messagesApi.js](indiaforums/src/services/messagesApi.js) with `MESSAGE_MODES` (Inbox/Outbox/Read/Unread) enum and full surface: `getFolders`, `createOrUpdateFolder`, `deleteFolder`, `getMessages`, `getMessageThread`, `getMessageDetail`, `getDrafts`, `getNewMessageForm`, `sendMessage`, `bulkAction`, `moveToFolder`.
- [x] Created [screens/messages/](indiaforums/src/screens/messages/):
    - `MessagesScreen.jsx` — router between inbox/thread/compose/folders sub-views
    - `InboxScreen.jsx` — mode pills (Inbox/Outbox/Read/Unread), search, folder filter, bulk actions
    - `ThreadScreen.jsx` — conversation view with reply composer
    - `ComposeScreen.jsx` — new PM form with recipient username lookup (via `/users/{id}/profile`)
    - `FoldersScreen.jsx` — manage folders (10 max, 10 char names)
- [x] Added Messages entry in MySpace menu, with unread badge powered by new `useUnreadMessageCount` hook in [hooks/useNotifications.js](indiaforums/src/hooks/useNotifications.js). Uses `getMessages({ mode: 'Unread', ps: 1 })` and reads `totalCount` from the envelope (no dedicated counter endpoint exists).
- [x] Recipient picker in ComposeScreen looks up target users by username first, falls back to `/users/{id}/profile`.

**Acceptance:** user can compose + send a PM, open inbox, switch modes, view a thread, reply, manage folders, and see the unread count reflected as a badge on the Messages menu item. ✅

### Phase 4 — Comments Write & Engagement ✅

Goal: users can comment, react, and report.

- [x] [services/commentsApi.js](indiaforums/src/services/commentsApi.js) surface: `getComments`, `createComment`, `updateComment`, `deleteComment`, `likeComment` (like/dislike with `LIKE_TYPES`), `getCommentLikes`, `reactToContent` (article/media/forum emoji reactions with `REACTION_TYPES`), `reportContent`, `getReportTypes`, `getMyExistingReport`. Content-type enum (`COMMENT_CONTENT_TYPES`) exported for ARTICLE/MEDIA/FORUM.
- [x] [hooks/useComments.js](indiaforums/src/hooks/useComments.js) hook: list + cursor load-more + add/edit/delete/toggleLike with optimistic updates and rollback on failure.
- [x] [components/comments/CommentsSection.jsx](indiaforums/src/components/comments/CommentsSection.jsx) — reusable composer + edit/delete + like/dislike + reply + overflow `⋯` menu with Report (+ Block user for others) + inline `ReportModal` that loads report types and submits with optional remark.
- [x] `reactToContent` wired into [ArticleScreen.jsx](indiaforums/src/screens/ArticleScreen.jsx) for the article-level reactions strip.

**Acceptance:** user can post a top-level comment + reply, edit own comment, delete own comment, like/dislike, react to articles with emoji, and report another user's comment with a reason from the live `/reports/types` list. ✅

### Phase 5 — Forum Write ✅

Goal: users can create topics + reply + react + vote.

- [x] [services/forumsApi.js](indiaforums/src/services/forumsApi.js) write surface: `createTopic`, `replyToTopic`, `editPost`, `reactToThread` (`THREAD_REACTION_TYPES`), `getThreadLikes`, `castPollVote`, `getPostEditHistory`. Note: there is **no** standalone watch-toggle endpoint in the spec — watching is done via the `addToWatchList` flag on topic create / reply, documented inline.
- [x] "New Topic" composer: [components/forum/NewTopicComposer.jsx](indiaforums/src/components/forum/NewTopicComposer.jsx) — wired into ForumListView / ForumThreadView, with subject, message, and `addToWatchList` opt-in.
- [x] Reply composer: bottom reply bar in [TopicDetailScreen.jsx](indiaforums/src/screens/TopicDetailScreen.jsx) calls `replyToTopic` and refreshes the thread. Auto-disabled for locked topics.
- [x] Inline edit: own-post rows expose an "Edit" action that opens an inline textarea → `editPost`. Cancel/save states + error surfacing.
- [x] Edit history viewer: added a **"(edited)"** chip in the post meta row that opens a new `PostEditHistoryModal` calling `getPostEditHistory`. `transformPost` in [services/api.js](indiaforums/src/services/api.js) was extended to probe `editedWhen`/`updatedWhen`/`editCount` defensively so the chip renders whenever the backend reports any edit signal.
- [x] Watch list: `addToWatchList` checkbox in NewTopicComposer (default on); reply composer passes through the flag as well. Read-side is `/my-watched-topics` already wired in Phase 8 as the own-profile "Watching" tab.
- [x] Poll voting: `PollWidget` on OP of topic → `castPollVote` with optimistic voted-ids state.
- [x] Post reactions: reaction picker on every post row → `reactToThread` with optimistic update + rollback.

**Acceptance:** user can create a topic, reply, edit own reply, view any post's edit history, watch topics via the checkbox, vote in a poll, and react with emoji. ✅

### Phase 6 — Forum Moderation ✅

Goal: admin/moderator users can run cleanup actions, group-gated by `isModerator`.

- [x] Full moderation surface in [services/forumsApi.js](indiaforums/src/services/forumsApi.js): `closeTopic`, `openTopic`, `moveTopic`, `mergeTopic`, `trashTopics`, `restoreTopic`, `trashPost`, `untrashPost`, `updateTopicAdminSettings`, `closeReportedTopic`, `closeReports`, `getReportedTopics`, `getReportedPosts`, `getTopicActionHistory`.
- [x] [components/forum/AdminPanel.jsx](indiaforums/src/components/forum/AdminPanel.jsx) — floating moderator panel rendered on TopicDetailScreen, hidden for non-moderators. Wires close / open / move / merge / trash / restore / pin (via `updateTopicAdminSettings priority`).
- [x] [screens/forum/ReportsInboxScreen.jsx](indiaforums/src/screens/forum/ReportsInboxScreen.jsx) + the **Reports Inbox** menu item in MySpace (visible only when `isModerator`). Wires `getReportedTopics`, drill-down to `getReportedPosts`, `closeReports` (per-report resolve), and `closeReportedTopic` (close-with-post).
- [x] Per-post moderator trash: `trashPost` is now wired into TopicDetailScreen as a "Trash" action on every post, conditionally rendered for moderators viewing other users' posts. Confirmation dialog + refresh after success.

**Acceptance:** a user in moderator group can lock/move/merge/trash topics from the AdminPanel, trash individual posts from each reply row, and resolve reports from the Reports Inbox. ✅

### Phase 7 — Engagement on Content ✅ (API surface) / 🟡 (write UI deferred — no detail screens)

Goal: users can rate shows and review movies.

- [x] [services/moviesApi.js](indiaforums/src/services/moviesApi.js) write surface: `addMovieReview(titleId, { rating, subject, review })`, `updateMovieReview(titleId, reviewId, { rating, subject, review })`, `deleteMovieReview(titleId, reviewId)`. Read side (`getMovies`, `getMoviesByMode`, `getMoviesByYear`, `getMovieStory`, `getMovieCast`, `getMovieFanclub`, `getMovieReviews`) verified working.
- [x] [services/showsApi.js](indiaforums/src/services/showsApi.js) write surface: `rateShow(showId, { rating })` for the 1–5 ChaskaMeter vote (auth-gated, one-vote-per-user).
- [x] `/users/{id}/movies` and `/users/{id}/shows` wired into ProfileScreen Favourites tab (delivered as part of Phase 8 — `/my-favourite-movies` and `/my-favourite-shows`).
- [ ] ~~Review composer on MovieDetailScreen~~ — **deferred**: the prototype never built `MovieDetailScreen.jsx` (zero results under `screens/**/Movie*`). The write API is ready to wire the moment the detail screen lands; until then there is no surface for the composer.
- [ ] ~~ChaskaMeter rating slider on ShowDetailScreen~~ — **deferred**: same situation. No `ShowDetailScreen.jsx` exists. `rateShow` is ready and waiting.

**Acceptance:** all four write endpoints (`addMovieReview`, `updateMovieReview`, `deleteMovieReview`, `rateShow`) are exported, documented, and 401-clean against the live backend. UI write surfaces are blocked on the absence of MovieDetail/ShowDetail screens — these will be built outside the API integration plan, at which point Phase 7's two `[ ]` items can be ticked off without any backend work. Profile-side reads are ✅. ⚠

### Phase 8 — Remaining "My" tabs ✅ (completed 2026-04-07)

Goal: round out MySpace with the niche read-only feeds.

- [x] Wire `getMyForumDrafts`, `getMyCelebs`, `getMyForums`, `getMyMovies`, `getMyShows`, `getMyFanfictionFollowers`, `getMyFanfictionAuthors`, `getMyWatchingTopics`, `getMyWarningDetails` — all added to [userProfileApi.js](indiaforums/src/services/userProfileApi.js). `getMyBuddyList` also added.
- [x] Add as tabs/cards inside [ProfileScreen.jsx](indiaforums/src/screens/profile/ProfileScreen.jsx) (own-profile mode) so the empty states are replaced with real data — new own-only tabs: Drafts, Watching, Following (FF authors), FF Fans, Warnings. BuddiesTab + ForumsTab wired to their self endpoints; FavoritesTab switched to `/my-favourite-{movies|shows|celebrities}` for own profile.
- [x] Backend health audit: all 9 endpoints return clean 401 unauthenticated — no new bugs.
- [x] Extended [useUserProfile.js](indiaforums/src/hooks/useUserProfile.js) `useProfileSection` unwrap list to handle new DTO shapes (`topics`, `drafts`, `buddies`, `movies`, `shows`, `celebrities`, `forums`, `followers`, `following`, `warningHistory`).

**Acceptance:** every "My" tag from §4.2 returns ✅ in this document. ✅

### Phase 9 — Discovery & Help Center ✅ (completed 2026-04-07)

Goal: search + help center are first-class.

- [x] Wire live `searchApi`: `search(query, contentType)`, `searchSuggestions(query)`, `getTrendingSearches()` — created [searchApi.js](indiaforums/src/services/searchApi.js) with `CONTENT_TYPE` enum.
- [x] Add suggestions dropdown to search input — built into [SearchScreen.jsx](indiaforums/src/screens/SearchScreen.jsx) (the app has no TopNav search; SearchScreen owns its own input). Debounced 250ms typeahead with graceful fallback to silent empty when D-1 backend bug fires.
- [x] Add Trending pills to empty `SearchScreen` — surfaces `/search/trending` results, falls back to a static "Try searching for" hint list when D-1 returns 500.
- [x] Create [services/helpCenterApi.js](indiaforums/src/services/helpCenterApi.js) and a [HelpCenterScreen](indiaforums/src/screens/help/HelpCenterScreen.jsx) reachable from MySpace footer — wired into MySpace menu under a "Help Center" item. Browses categories + questions from `/helpcenter/home` (single endpoint returns everything) and drills into `/helpcenter/question/{id}` for answers.
- [x] Backend audit: **4 NEW Class D bugs documented** in [docs/backend-issues-2026-04-07.md](docs/backend-issues-2026-04-07.md): D-1 `/search/suggestions` + `/search/trending` (EF Core FromSql `ContentTypeId` column missing); D-2 `/search?contentType=1|2|3` (different column missing per type); D-3 `/helpcenter/questions` (generic 500). Working: `/search?contentType=0` (Google CSE), `/helpcenter/home`, `/helpcenter/question/{id}`, `/helpcenter/topcontributors`, `/home/members`.
- [ ] ~~Optional: `getOnlineMembers` widget on Home (auth-only)~~ — deferred (Home screen redesign is out of Phase 9 scope; endpoint is healthy 401 and ready to wire).

**Acceptance:** typing in search shows suggestions (when backend is healthy; silent fallback otherwise); trending shows when empty (with static fallback); help center is browsable. ✅

**Frontend status today (with backend bugs in place):**
- Search with "All" content type → ✅ works (Google CSE)
- Search with Article/Movie/Show/etc → shows friendly "filter temporarily unavailable" banner
- Suggestions dropdown → silent (no errors surfaced)
- Trending pills → static fallback list
- Help Center browse → ✅ fully working
- Help Center search-by-text → not built (relies on broken `/helpcenter/questions`)

### Phase 10 — Cleanup & Polish ✅

- [x] Replace all remaining ad-hoc `err.response.data.message` reads with `extractApiError()` — converted 18 sites across 12 files: [hooks/useUserProfile.js](indiaforums/src/hooks/useUserProfile.js), [hooks/useEmailVerificationLogs.js](indiaforums/src/hooks/useEmailVerificationLogs.js), [screens/profile/ProfileScreen.jsx](indiaforums/src/screens/profile/ProfileScreen.jsx), [screens/SearchScreen.jsx](indiaforums/src/screens/SearchScreen.jsx), [screens/help/HelpCenterScreen.jsx](indiaforums/src/screens/help/HelpCenterScreen.jsx), [screens/ArticleScreen.jsx](indiaforums/src/screens/ArticleScreen.jsx), [screens/account/ActivitiesScreen.jsx](indiaforums/src/screens/account/ActivitiesScreen.jsx), [screens/account/AccountSettingsScreen.jsx](indiaforums/src/screens/account/AccountSettingsScreen.jsx), [screens/account/DevicesScreen.jsx](indiaforums/src/screens/account/DevicesScreen.jsx), [screens/account/NotificationsScreen.jsx](indiaforums/src/screens/account/NotificationsScreen.jsx), [screens/account/UsernameScreen.jsx](indiaforums/src/screens/account/UsernameScreen.jsx) (preserved ASP.NET `errors.userName[0]` validation special-case), [screens/account/StatusScreen.jsx](indiaforums/src/screens/account/StatusScreen.jsx).
- [x] Audit for hardcoded pagination defaults; centralise `pn=1, ps=24` — added `DEFAULT_PAGE`, `DEFAULT_PAGE_SIZE`, and `PAGINATION_DEFAULTS` exports in [services/api.js](indiaforums/src/services/api.js); rewired [services/userProfileApi.js](indiaforums/src/services/userProfileApi.js) (10 functions), [services/buddiesApi.js](indiaforums/src/services/buddiesApi.js), [services/activitiesApi.js](indiaforums/src/services/activitiesApi.js), [services/notificationsApi.js](indiaforums/src/services/notificationsApi.js), and [services/messagesApi.js](indiaforums/src/services/messagesApi.js) to use the centralised constants. Other services (`movies`, `shows`, `forums`, `fanFictions`, `helpCenter`, `search`) intentionally use different page sizes tied to their grid layouts (10/12/20/72) and were left untouched. Removed redundant inline `{ pn: 1, ps: 24 }` from [InboxScreen.jsx](indiaforums/src/screens/messages/InboxScreen.jsx) and [ThreadScreen.jsx](indiaforums/src/screens/messages/ThreadScreen.jsx).
- [x] Add a `useApiQuery` hook (loading/error/refetch) to remove copy-paste from every screen — created [hooks/useApiQuery.js](indiaforums/src/hooks/useApiQuery.js) with `{ data, loading, error, refetch, setData }`, `select`, `skip`, `initialData`, and an `extractApiError`-based fallback. Available for new screens; existing screens were left on their handwritten effects (covered by the existing `useUserProfile`/`useProfileSection` hooks already in use across the profile screens).
- [x] Add ESLint rule warning when calling `api.get/post/put/delete` outside of `services/` — added `no-restricted-imports` rule to [eslint.config.js](indiaforums/eslint.config.js) banning the **default** import from `services/api` outside `src/services/` (named imports like `extractApiError`, `timeAgo`, `PAGINATION_DEFAULTS` remain allowed). Codebase already complies — zero violations.
- [x] Add a `429` rate-limit error page — extended `extractApiError` in [services/api.js](indiaforums/src/services/api.js) to detect 429 first and produce a friendly message that respects the `Retry-After` header (seconds or HTTP-date), plus exported helpers `isRateLimitError(err)`, `formatRateLimitMessage(err)`, and `parseRetryAfter(err)`. Added a richer [components/ui/RateLimitNotice.jsx](indiaforums/src/components/ui/RateLimitNotice.jsx) component with a live countdown that disables the retry button until the window elapses — opt-in for screens that want a richer treatment than the generic `ErrorState` (which now also automatically shows the friendly 429 message via `extractApiError`).

**Acceptance:** lint count unchanged at 32 problems (all pre-existing — no new errors from Phase 10 changes); production build still clean at ~754 kB / 268 modules. ✅

---

## 8. Per-Module Implementation Notes

### 8.1 Auth — what to never forget

- **Token shape:** `accessToken`, `refreshToken`, `tokenType`, `expiresIn`, `userId`, `userName`, `email`, `displayName`. The first three live in `tokenStorage.js`; the last four become the user object in `AuthContext`.
- **Header on every request:** axios instance in [api.js](indiaforums/src/services/api.js) attaches `api-key` and `Authorization: Bearer …`.
- **Refresh queue:** if multiple requests 401 simultaneously, only one refresh fires; the rest wait. Already implemented in `api.js`.
- **Logout calls the server first** — revokes refresh token. If it fails, clear local storage anyway.

### 8.2 `/me` workaround

Until backend fixes `GET /me`, every screen that needs the current user's full profile should call `getProfile(authUser.userId)` and unwrap `res.data.user`. The shape of `/users/{id}/profile` is:

```json
{
  "user": { /* same fields as MyProfileResponseDto, minus phone/email-confirmed */ },
  "loggedInUser": { /* the requesting user, identical fields */ }
}
```

`loggedInUser.userId` is a useful sanity check that the token is still valid.

### 8.3 `PUT /me` body shape

`UpdateProfileCommand` requires:
- `userId` (current user's id)
- `groupId` (from `MyProfileResponseDto.groupId` of the loaded profile)
- `updateChecksum` (from `MyProfileResponseDto.updateChecksum` of the loaded profile)
- Plus the editable fields: `displayName`, `bio`, `dob`, `gender`, `forumSignature`, `facebook`, `twitter`, `youtube`, `instagram`, `avatarTitle`, `pronoun`

Server returns a fresh `updateChecksum` in `UpdateProfileResponseDto`. **Store it back into the form state** so the next save uses the new value, otherwise the second save will fail with a stale-checksum error.

### 8.4 Pagination conventions

- Most paginated endpoints use `pn` (page number, 1-based) and `ps` (page size). Both are **required** even when the spec lists them as integer-or-string.
- A handful (`/users/{id}/profile`, `/users/{id}/activities/load-more`) use `cursor` + `pageSize` instead. Don't mix them.
- `/forums/home` and similar use `pageNumber` + `pageSize` (full names). Spec is inconsistent — always grep the spec for the exact endpoint.

### 8.5 Error response shape (RFC 7807)

```json
{
  "type":   "https://tools.ietf.org/html/rfc7231#section-6.6.1",
  "title":  "Internal Server Error",
  "status": 500,
  "detail": "An unexpected error occurred. Please try again later."
}
```

For validation errors (`ValidationProblemDetails`), there's an additional `errors: { fieldName: ["msg1", "msg2"] }` map. The `extractApiError(err, fallback)` helper in [api.js](indiaforums/src/services/api.js) handles all of this. **Always use it.**

### 8.6 Avatar / privacy fields on responses

Most user-facing DTOs include these display fields:
- `avatarType` (int)
- `avatarAccent` (hex color string e.g. `"#805be7"`)
- `groupId` (user group — 1=user, 4/5=restricted, etc.)
- `privacy` (int)
- `statusCode` (online status code)

The frontend should cache these from `loggedInUser` on every response so we always have the freshest values for the current user.

---

## 9. Cross-Cutting Concerns

### 9.1 Need a shared `useApiQuery` hook

Every screen reimplements `loading / error / data / refetch`. That's ~20 copies now. The Phase 10 hook should look like:

```js
const { data, loading, error, refetch } = useApiQuery(
  () => profileApi.getProfile(userId),
  [userId],
  { unwrap: (d) => d?.user }
);
```

It would replace `useUserProfile`, `useNotifications`, `useEmailVerificationLogs`, the inline fetches inside every account screen, etc.

### 9.2 Where to put new API service files

```
src/services/
  api.js              ← axios instance + interceptors + extractApiError
  tokenStorage.js     ← localStorage helpers
  authApi.js          ← /auth/*
  socialAuth.js       ← Google/Facebook/Microsoft SDK loaders
  emailVerificationApi.js
  userProfileApi.js   ← /me/*, /my-*, /users/{id}/*, username
  devicesApi.js
  notificationsApi.js
  activitiesApi.js
  uploadsApi.js       ← NEW (Phase 1)
  buddiesApi.js       ← NEW (Phase 2)
  messagesApi.js      ← NEW (Phase 3)
  commentsApi.js      ← NEW (Phase 4) — currently inline in useComments
  forumsApi.js        ← NEW (Phase 5) — currently inline in hooks
  moviesApi.js        ← NEW (Phase 7)
  showsApi.js         ← NEW (Phase 7)
  searchApi.js        ← NEW (Phase 9)
  helpCenterApi.js    ← NEW (Phase 9)
```

One file per tag group. Don't mix concerns.

### 9.3 Where to put new screens

```
src/screens/
  auth/        ← login, register, forgot, reset, verify (existing)
  account/     ← settings, username, devices, status, notifications, activities (existing)
  profile/     ← public profile + own profile sub-tabs (existing)
  buddies/     ← NEW (Phase 2)
  messages/    ← NEW (Phase 3): inbox, thread, compose, folders
  help/        ← NEW (Phase 9)
```

### 9.4 MySpace navigation graph

[MySpaceScreen.jsx](indiaforums/src/screens/MySpaceScreen.jsx) is the menu hub. After Phases 2 and 3 land, add:

```
MySpace
  ├── Account Settings        ✅
  ├── Username                ✅
  ├── Devices                 ✅
  ├── Status                  ✅
  ├── Notifications  [badge]  ✅
  ├── Activities              ✅
  ├── Buddies                 ❌ Phase 2
  ├── Messages       [badge]  ❌ Phase 3
  ├── My Posts                🟡 (in Profile)
  ├── My Comments             🟡 (in Profile)
  ├── My Badges               🟡 (in Profile)
  ├── Drafts                  ❌ Phase 8
  ├── Help Center             ❌ Phase 9
  └── Logout                  ✅
```

---

## 10. Open Questions

Things the spec doesn't fully answer — flag for backend / product:

1. **Captcha on register/forgot-password.** Description says it's required, request DTO doesn't list a captcha field on `RegisterRequestDto` (it has `captchaToken` which is nullable) but `ForgotPasswordRequestDto` is unclear. Do we need to integrate Google reCAPTCHA before going live?
2. **Group permissions.** Several endpoints are described as "Users in groups 4 and 5 cannot upload images" or "moderator only". Where is the canonical list of group IDs and what each can do? Frontend currently has no awareness of groups.
3. **Privacy levels.** `MyProfileResponseDto.privacy` is `uint8` 0–N. What do the values mean? Need a mapping.
4. **Status codes.** `statusCode` for online/away/busy/invisible — confirmed list of integer values?
5. **Avatar URLs.** Spec returns `avatarType` (int) and `avatarAccent` (hex) but no URL. How does the client convert these into an `<img src>`? Is there a CDN convention like `cdn.indiaforums.com/avatars/{userId}.jpg`?
6. **`updateChecksum` semantics.** Confirmed it's optimistic concurrency, but does any other endpoint besides `PUT /me` need it? `UpdateTopicAdminRequestDto` doesn't show one — does that mean topic admin updates have last-writer-wins semantics?
7. **Friend request payload.** The exact field name for the recipient on `SendFriendRequestDto` needs to be confirmed (`targetUserId`? `userId`? `toUserId`?). Need to scan the spec or test before Phase 2.
8. **Notification filtering.** Which `templateType` values does `GET /user-notifications` accept? Currently the frontend passes none.
9. **Rate-limit headers.** Does the API return `Retry-After` on 429? The frontend should respect it instead of guessing "wait 1 minute".
10. **`POST /external-login` providerKey format.** Is it expected to be the raw OAuth `sub` claim (Google), or a verified ID token? Currently the frontend sends the `sub`. When backend fixes the 500 we'll need to confirm.

---

## Revision History

| Date | Author | Change |
|---|---|---|
| 2026-04-07 | Frontend Team | Initial plan after full spec review |

**Next review:** when Phase 0 acceptance is met (backend retest of `PUT /me` + `PUT /me/username`), update §5 and bump to v1.1.
