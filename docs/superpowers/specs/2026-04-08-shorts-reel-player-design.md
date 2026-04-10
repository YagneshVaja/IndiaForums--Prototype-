# Shorts Reel Player — Design Spec
**Date:** 2026-04-08
**Status:** Approved

---

## 1. Overview

Replace the existing 2-column grid `ShortsScreen` with an Instagram Reels / YouTube Shorts style vertical snap-scroll player. Wire it to the real `GET /api/v1/shorts` endpoint, removing all hardcoded mock data.

**Key constraints from codebase:**
- IndiaForums Shorts are **text + image** content (not video files). No `<video>` tag — thumbnails from `img.indiaforums.com/shorts/720x0/...webp`.
- App renders inside a 390px `PhoneShell` — no `100vh`. Each card uses `height: 100%` within a flex column.
- CSS Modules + design tokens only. No external UI libraries.
- Navigation is state-driven in `App.jsx` — `ShortsScreen` already wired under `activeStory === 'shorts'`.
- Tapping a short opens `pageUrl` in a new browser tab (`window.open(pageUrl, '_blank')`).

---

## 2. Architecture

### New files
| File | Purpose |
|------|---------|
| `src/services/shortsApi.js` | Single `getShorts({ page, pageSize })` function using the shared `api` axios instance |
| `src/hooks/useShorts.js` | Paginated fetch, data transform, client-side category filter, loadMore/refresh |

### Modified files
| File | Change |
|------|--------|
| `src/screens/ShortsScreen.jsx` | Full rewrite — grid → reel player |
| `src/screens/ShortsScreen.module.css` | Full rewrite — reel layout CSS |

### Deleted / no longer imported
| File | Reason |
|------|--------|
| `src/data/shorts.js` | Replaced by real API data. File can be removed once `ShortsScreen` no longer imports it. |

---

## 3. API Service — `shortsApi.js`

```js
import api from './api';

export async function getShorts({ page = 1, pageSize = 20 } = {}) {
  return api.get('/shorts', { params: { pageNumber: page, pageSize } });
}
```

Uses the shared `api` axios instance (base URL `/api/v1`, auth header, token refresh interceptor).

---

## 4. Data Transform (inside `useShorts.js`)

### Expected API response shape
```json
{
  "data": {
    "shorts": [
      {
        "shortId": 5057,
        "title": "...",
        "description": "...",
        "pageUrl": "/shorts/5057/...",
        "thumbnailUrl": "https://img.indiaforums.com/shorts/720x0/0/...",
        "publishedWhen": 1712345678,
        "categoryId": 1,
        "categoryName": "TV"
      }
    ],
    "categories": [
      { "categoryId": 1, "categoryName": "TV" }
    ]
  },
  "pagination": { "currentPage": 1, "pageSize": 20, "hasNextPage": true }
}
```

> **Note:** If the real API wraps differently (e.g. no `data` envelope, or `shorts` is at root), the transform fallback chain `res.data?.data?.shorts || res.data?.shorts || []` handles common variants.

### UI shape produced
```js
{
  id:          raw.shortId,
  title:       raw.title        || 'Untitled',
  description: raw.description  || '',
  pageUrl:     raw.pageUrl      || '',
  thumbnail:   raw.thumbnailUrl || raw.imageUrl || null,
  publishedAt: formatDate(raw.publishedWhen),   // "8 Apr 2026"
  category:    raw.categoryName || '',
  categoryId:  raw.categoryId   || 0,
  bg:          pickGradient(raw.categoryId, index), // fallback when thumbnail is null
}
```

**Category tab fallback:** If the API does not return a `categories` array, fall back to the existing `SHORTS_CATEGORIES` constant from `src/data/shorts.js` (imported only for this fallback; the shorts list data itself is no longer used).

Fallback gradients (reuse pattern from `useQuizzes.js`):
```js
const FALLBACK_GRADIENTS = [
  'linear-gradient(135deg,#7c3aed,#ec4899)',
  'linear-gradient(135deg,#0ea5e9,#6366f1)',
  'linear-gradient(135deg,#10b981,#0ea5e9)',
  'linear-gradient(135deg,#f59e0b,#ef4444)',
];
```

---

## 5. `useShorts` Hook

```js
export default function useShorts(initialParams = {})
```

### State
| Variable | Type | Description |
|----------|------|-------------|
| `allShorts` | `Short[]` | All fetched items (accumulates on loadMore) |
| `categories` | `Category[]` | From first API response — drives tab bar |
| `pagination` | `object \| null` | `{ currentPage, pageSize, hasNextPage }` |
| `loading` | `boolean` | True on initial or replace load |
| `error` | `string \| null` | Error message from `extractApiError` |
| `params` | `object` | `{ pageSize, categoryId }` — drives re-fetch |

### Behaviour
- `load(pageNum, replace)` — guarded by `loadingRef.current` to prevent double-fetches
- `useEffect` fires `load(1, true)` when `params.pageSize` changes
- `loadMore()` — appends next page when `pagination.hasNextPage` is true
- `refresh()` — calls `load(1, true)`
- `shorts` — derived: client-side filter by `params.categoryId` (0 = all)

### Return value
```js
{ shorts, allShorts, categories, pagination, loading, error, params, setParams, loadMore, refresh }
```

---

## 6. UI — `ShortsScreen.jsx`

### Component tree
```
ShortsScreen
├── CategoryTabBar          (sticky, scrollable chips)
├── ReelFeed                (snap-scroll container)
│   ├── ShortCard × N       (full-height card)
│   │   ├── thumbnail img / gradient fallback
│   │   ├── gradient scrim  (bottom fade)
│   │   ├── CategoryChip    (top-left)
│   │   ├── ProgressBar     (top, active card only)
│   │   └── BottomOverlay
│   │       ├── title
│   │       ├── description (2 lines, clamp)
│   │       ├── date
│   │       └── Read button → window.open(pageUrl)
│   ├── LoadMoreTrigger     (last item sentinel for Intersection Observer)
│   └── SkeletonCard × 3   (shown while loading === true and shorts.length === 0)
└── ErrorState              (shown when error !== null)
```

### Key layout rules
- `ReelFeed`: `overflow-y: scroll; scroll-snap-type: y mandatory; flex: 1`
- `ShortCard`: `height: 100%; scroll-snap-align: start; flex-shrink: 0; position: relative`
- Thumbnail: `width: 100%; height: 100%; object-fit: cover`
- Bottom overlay: `position: absolute; bottom: 0; left: 0; right: 0; padding: 16px`

### Auto-advance interaction
Each `ShortCard` receives `isActive` (boolean). When `isActive` becomes true:
1. A 5-second `setInterval` ticks a `progress` state (0→100)
2. CSS progress bar width = `${progress}%`, transition `width 0.1s linear`
3. At 100%, the interval clears and `scrollIntoView({ behavior: 'smooth' })` is called on the next card's ref. On the last card, the interval clears and progress stays at 100% — no wrap-around. New content will have loaded via `loadMore()` before the user reaches the last card.

### Intersection Observer
- A single `IntersectionObserver` (threshold: 0.6) watches all `ShortCard` refs
- Fires `setActiveIndex(index)` when a card becomes the dominant visible item
- The `LoadMoreTrigger` sentinel (a 1px div after the last card) also observed — triggers `loadMore()` when visible
- Observer created once in `useEffect`, cleaned up on unmount

---

## 7. Loading & Error States

**Loading (initial):** 3 skeleton `ShortCard`-sized divs with a shimmer animation. No separate component — inline in `ShortsScreen.jsx`.

**Loading (loadMore):** Small centered spinner below the last card (does not replace content).

**Error:** `<ErrorState message={error} onRetry={refresh} />` — existing component from `src/components/ui/ErrorState.jsx`, centered in the feed area.

**Empty (API returns 0 items):** `<EmptyState message="No shorts available" />` — existing component.

---

## 8. CSS Strategy

All styles in `ShortsScreen.module.css` using only `var(--*)` tokens. Key new tokens needed: none — existing tokens cover all cases.

Shimmer skeleton animation uses `@keyframes shimmer` with a background gradient sweep — same pattern used in other skeleton implementations.

Progress bar: `height: 3px; background: var(--brand); border-radius: 2px` inside a `height: 3px; background: rgba(255,255,255,0.3)` track.

---

## 9. Folder Structure (after implementation)

```
src/
  services/
    api.js                   (unchanged)
    shortsApi.js             ← new
  hooks/
    useShorts.js             ← new
  screens/
    ShortsScreen.jsx         ← rewritten
    ShortsScreen.module.css  ← rewritten
  data/
    shorts.js                ← no longer imported, can be removed
```

---

## 10. Out of Scope

- Mute/unmute toggle (no audio)
- Like / bookmark / share counts (not in API response)
- In-app webview for full article (opens in browser tab)
- Right-side action icons (no data to back them)
- Infinite scroll with virtualization (not needed at prototype scale)
