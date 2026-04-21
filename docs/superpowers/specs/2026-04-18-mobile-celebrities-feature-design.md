# Mobile Celebrities Feature — Design Spec

**Date:** 2026-04-18
**Scope:** Port the prototype's Celebrities list + detail screens to the React Native mobile app.
**Reference:** `indiaforums/src/screens/CelebritiesScreen.jsx`, `indiaforums/src/screens/CelebrityDetailScreen.jsx`, and associated hooks/services.

---

## 1. Goal

Replicate the prototype's Celebrities feature 1:1 in the mobile app: a weekly ranking list (hero / runner-up / list), tappable entries opening a biography + fans detail screen. Entry point is the ⭐ Celebrities circle in the Home stories strip.

Today in mobile:
- `HomeStack` has a `CelebrityProfile` route, but it is a placeholder.
- No `Celebrities` list route exists.
- `StoriesStrip` ⭐ Celebrities has no nav wiring.
- `fetchCelebrities` is a stub that returns a flat minimal list.

---

## 2. Navigation & Entry

Add two routes to `HomeStack`:

```ts
// mobile/src/navigation/types.ts
export type HomeStackParamList = {
  // ...existing
  Celebrities: undefined;
  CelebrityProfile: { celebrity: Celebrity };  // was { id: string }
};
```

- Entry: `StoriesStrip` Celebrities item → `navigation.navigate('Celebrities')`
- Drill-down: any card/row on `CelebritiesScreen` → `navigation.navigate('CelebrityProfile', { celebrity })`
- Passing the full `celebrity` object lets the detail hero render instantly while biography fetches
- Back behavior: native stack back (swipe-back iOS, hardware back Android)

---

## 3. Data Layer

### 3.1 Expand `mobile/src/services/api.ts`

Replace the minimal `Celebrity` interface with the prototype-aligned shape:

```ts
export interface Celebrity {
  id: string;
  name: string;
  shortDesc: string;
  thumbnail: string | null;
  pageUrl: string;
  shareUrl: string;
  category: 'bollywood' | 'television' | 'creators' | 'all';
  rank: number;
  prevRank: number;
  trend: 'up' | 'down' | 'stable';
  rankDiff: number;
}

export interface CelebritiesPayload {
  categories: {
    bollywood: Celebrity[];
    television: Celebrity[];
    creators: Celebrity[];
  };
  celebrities: Celebrity[];
  rankStartDate: string;
  rankEndDate: string;
  pagination: {
    currentPage: number;
    pageSize: number;
    totalPages: number;
    totalCount: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface CelebrityBiography {
  id: string;
  name: string;
  fullName: string;
  shortDesc: string;
  thumbnail: string | null;
  bioHtml: string;
  rank: number;
  prevRank: number;
  isFan: boolean;
  // Stats
  articleCount: number;
  fanCount: number;
  videoCount: number;
  viewCount: number;
  photoCount: number;
  topicsCount: number;
  // Structured info
  nicknames: string[];
  profession: string[];
  birthDate: string;
  birthPlace: string;
  zodiacSign: string;
  nationality: string;
  height: string;
  weight: string;
  debut: string[];
  hometown: string;
  education: string;
  maritalStatus: string;
  spouse: string[];
  children: string[];
  parents: string[];
  siblings: string[];
  religion: string;
  netWorth: string;
  favFilms: string[];
  favActors: string[];
  favFood: string[];
  hobbies: string[];
  // Social
  facebook: string;
  twitter: string;
  instagram: string;
}

export interface CelebrityFan {
  id: string;
  name: string;
  avatarAccent: string;
  level: string;
  groupId: number;
}

export interface CelebrityFansPayload {
  fans: CelebrityFan[];
  pagination: { currentPage: number; pageSize: number; totalPages: number; totalCount: number; hasNextPage: boolean; hasPreviousPage: boolean };
}
```

### 3.2 New / updated fetch functions

Port transforms from `indiaforums/src/services/api.js`:

- `fetchCelebrities(page = 1, pageSize = 20): Promise<CelebritiesPayload>` — **replaces** current stub. Calls `GET /celebrities`, returns categorized + flat + dates + pagination. Uses `transformCelebrity` (computes `trend` and `rankDiff` from current/last rank).
- `fetchCelebrityBiography(personId: string): Promise<CelebrityBiography | null>` — new. Calls `GET /celebrities/{id}/biography`. Flattens `personInfos` array into a keyed map, then extracts typed fields.
- `fetchCelebrityFans(personId: string, page = 1, pageSize = 20): Promise<CelebrityFansPayload>` — new. Calls `GET /celebrities/{id}/fans`.

Each function preserves the existing mobile pattern: wrap in try/catch, return mock data on network failure.

### 3.3 Constants

```ts
export const CELEB_CATEGORIES = [
  { id: 'bollywood',  label: 'Bollywood',  key: 'bollywoodCelebrities' },
  { id: 'television', label: 'Television', key: 'televisionCelebrities' },
  { id: 'creators',   label: 'Creators',   key: 'creators' },
] as const;
```

### 3.4 React Query hooks

`mobile/src/features/celebrities/hooks/`:

- `useCelebritiesRanking()` — `useQuery`, 10 min `staleTime`
- `useCelebrityBiography(personId: string)` — `useQuery`, 30 min `staleTime`, `enabled: !!personId`
- `useCelebrityFans(personId: string)` — `useInfiniteQuery`, 20 per page (matches prototype `loadMore`)

---

## 4. CelebritiesScreen

**File:** `mobile/src/features/celebrities/screens/CelebritiesScreen.tsx`

### Layout

```
┌──────────────────────────────────┐
│ TopNavBar — "Celebrities" (back) │
├──────────────────────────────────┤
│ [Bollywood] [Television] [Crea.] │  ← category pills
│ · Apr 10 – Apr 17, 2026          │  ← week label
├──────────────────────────────────┤
│                                  │
│  ┌────────────────────────────┐  │
│  │ 👑 #1 This Week    ▲ 2     │  │
│  │                            │  │  ← HeroCard
│  │        [full image]        │  │     (4:5 aspect)
│  │                            │  │
│  │ Name                       │  │
│  │ shortDesc                  │  │
│  │ was #3                     │  │
│  └────────────────────────────┘  │
│                                  │
│  ┌──────────┐ ┌──────────┐       │
│  │ 🥈 #2    │ │ 🥉 #3    │       │  ← RunnerRow (2-col)
│  │ [img]    │ │ [img]    │       │
│  │ Name     │ │ Name     │       │
│  └──────────┘ └──────────┘       │
│                                  │
│  Rankings                        │
│  ┌──────────────────────────────┐│
│  │ 4 ▲1 | avatar | Name  | ›   ││  ← RankRow
│  │ 5 —  | avatar | Name  | ›   ││
│  │ ...                          ││
│  └──────────────────────────────┘│
└──────────────────────────────────┘
```

### States
- **Loading**: skeleton with 3 chip placeholders, hero block, 2 runner blocks, 4 row blocks
- **Error**: ⚠️ icon + message + "Try Again" button (calls `refresh`)
- **Empty** (selected category has 0): 🔍 + "No celebrities found"
- **Success**: feed above

### Interactions
- Tap category pill: toggles `activeCat` state; re-slices array from `categories[activeCat]`
- Tap any card/row: `navigation.navigate('CelebrityProfile', { celebrity })`
- Pull-to-refresh: `RefreshControl` → `refresh()`

### Sub-components (co-located or `components/`)
- `TrendBadge` — props: `trend`, `rankDiff`, `variant?: 'default' | 'small'`. ▲ green, ▼ red, — gray.
- `Initials` — props: `name`. Returns 2 uppercase initials from first two words.
- `HeroCard`, `RunnerCard`, `RankRow` — consume a `celebrity` prop + `onPress`.
- `CelebSkeleton` — matches prototype skeleton shape.

---

## 5. CelebrityDetailScreen

**File:** `mobile/src/features/celebrities/screens/CelebrityDetailScreen.tsx`

### Hero
Full-width image (aspect ~16:10), dark gradient scrim. Top-left: `#rank` pill + trend chip. Bottom: large name, shortDesc, "Previous rank: #N".

### Tabs
Two pills: **Biography** | **Fans**. Active = brand blue underline + font weight boost.

### BiographyTab
Hook: `useCelebrityBiography(personId)`.

States:
- Loading → `BioSkeleton` (stats chips + 2 card blocks)
- Error → `ErrorBlock`
- Null → `ErrorBlock` "No biography found"
- Success → content

Content:
1. **Stats row** (horizontal chips) — 👥 Fans, 📰 Articles, 🎬 Videos, 📸 Photos, 👁 Views, 💬 Topics. Hide chip if count is 0. Use `formatCount` (`1.2K`, `3.4M`).
2. **About card** — `shortDesc` in a white rounded card.
3. **Bio sections** — parse `bioHtml` via ported `parseBioHtml`. Each section:
   - Header: icon (`SECTION_ICONS` map: Bio 👤, Physical 📏, Career 🎬, Personal 📋, Relationships 💑, Family 👨‍👩‍👧‍👦, Favourites ❤️, Assets 🏎️, Money 💰, Awards 🏆, default 📌) + title
   - Body: label/value rows
   - Optional image grid (tap → lightbox)
4. **Fallback (if no `bioHtml`):** structured `FactsCard`s from the typed fields — Personal Info, Physical, Career, Family, Favorites.
5. **Social media card** — Instagram (gradient), X (black), Facebook (blue) — only rendered if the handle exists.

### FansTab
Hook: `useCelebrityFans(personId)`.

- Loading (first page) → `Spinner`
- Error + no fans → `ErrorBlock`
- Empty → 👥 + "No fans yet"
- Success:
  - Total count header — `{pagination.totalCount.toLocaleString()} fans`
  - 3-column grid of `FanCard`s (colored circle with initial letter + name + level)
  - "Load More" button when `hasNextPage`

### Image Lightbox (mobile adaptation)
Web uses `<div>` overlay + `window.keydown`. Mobile:
- `Modal` (RN) with dark backdrop (80% black)
- Image rendered centered with pinch-zoom (`react-native-gesture-handler` if installed; otherwise default `Image` with tap-to-close)
- Left/right tap zones (invisible `Pressable` covering left/right 30%) for prev/next
- "3 / 8" counter chip top-center
- ✕ button top-right
- Caption under image
- Tap backdrop → close

### Sub-components
`TrendBadge`, `StatsBar`, `AboutCard`, `BioSection`, `FactsCard`, `SocialMediaCard`, `FanCard`, `ImageLightbox`, `BioSkeleton`, `Spinner`, `ErrorBlock`.

---

## 6. Adaptations (Web → RN)

| Prototype (web) | Mobile (RN) |
|---|---|
| CSS modules | `StyleSheet.create` with token values (`#3558F0`, `#F5F6F7`, `#1A1A1A`) |
| `<img loading="lazy">` | `<Image>` with `source={{ uri }}`, `resizeMode` |
| `window.keydown` lightbox | `Modal` + tap zones, no keyboard handlers |
| `<div onClick>` | `Pressable` |
| CSS gradient scrim | `expo-linear-gradient` (verify in plan step — fall back to `LinearGradient` stand-in if not installed) |
| HTML regex parse | Ported as-is (pure JS) |
| `.toLocaleDateString('en-IN', ...)` | Same — `Intl.DateTimeFormat` works in RN with JSC/Hermes Intl enabled; otherwise a small manual month-map helper |

---

## 7. File Structure

```
mobile/src/features/celebrities/
├── screens/
│   ├── CelebritiesScreen.tsx
│   └── CelebrityDetailScreen.tsx
├── components/
│   ├── TrendBadge.tsx
│   ├── HeroCard.tsx
│   ├── RunnerCard.tsx
│   ├── RankRow.tsx
│   ├── StatsBar.tsx
│   ├── AboutCard.tsx
│   ├── BioSection.tsx
│   ├── FactsCard.tsx
│   ├── SocialMediaCard.tsx
│   ├── FanCard.tsx
│   ├── ImageLightbox.tsx
│   └── skeletons/
│       ├── CelebSkeleton.tsx
│       └── BioSkeleton.tsx
├── hooks/
│   ├── useCelebritiesRanking.ts
│   ├── useCelebrityBiography.ts
│   └── useCelebrityFans.ts
└── utils/
    ├── parseBioHtml.ts
    ├── formatCount.ts
    ├── formatDate.ts
    └── constants.ts
```

### Shared edits
- `mobile/src/services/api.ts` — expand types + port 3 fetch functions + mocks
- `mobile/src/navigation/types.ts` — add `Celebrities`, update `CelebrityProfile` param shape
- `mobile/src/navigation/HomeStack.tsx` — register `Celebrities` screen, swap placeholder for `CelebrityDetailScreen`
- `mobile/src/features/home/components/StoriesStrip.tsx` — wire ⭐ Celebrities → `navigation.navigate('Celebrities')`
- `docs/tracking/mobile-development-progress.md` — mark section 10 Celebrities as 2/2 complete

---

## 8. Edge Cases & Error Handling

- Null `thumbnail` → `Initials` component fallback
- Empty `bioHtml` → structured `FactsCard` fallback
- All stats zero → stats row hidden entirely
- Empty fans list → empty-state 👥
- API failure → mock data fallback (matches existing `api.ts` pattern for banners/articles)
- `personId` missing when navigating to detail → render `null` (prototype behavior)
- Long names in list rows → truncate with `numberOfLines={1}` + ellipsis

---

## 9. Out of Scope (Explicit)

- Follow/unfollow a celebrity (progress tracker mentions it, prototype doesn't implement it — mark TBD, skip here)
- Celebrity search / filter (beyond the 3 category tabs)
- Celebrity articles tab, photos tab, videos tab in detail (prototype has only Bio + Fans)
- Infinite scroll on the ranking list (prototype paginates via `pageSize=20` on load; loadMore not implemented in prototype either)
- Share button on detail (the `shareUrl` field is captured but no UI for it in prototype)

---

## 10. Success Criteria

- ⭐ Celebrities in Home stories strip opens the ranking list
- Rankings match the prototype's hero / runner / list layout
- Category switch (Bollywood / Television / Creators) re-slices instantly
- Tapping any celebrity navigates to detail with hero rendered immediately
- Biography tab shows stats, parsed bio sections, and social media
- Fans tab shows paginated grid with Load More
- All states (loading / error / empty / success) render per design
- Mock fallback works when API is unreachable
- No regressions in other Home stack screens
