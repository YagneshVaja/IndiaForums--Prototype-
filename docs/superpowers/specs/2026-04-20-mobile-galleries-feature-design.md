# Mobile Galleries Feature — Design Spec

**Date:** 2026-04-20
**Target:** React Native mobile app (`mobile/`)
**Reference:** Web prototype (`indiaforums/src/screens/GalleryScreen.jsx`, `GalleryDetailScreen.jsx`)
**Pattern:** Mirrors existing Videos feature (`mobile/src/features/videos/`)

## Goal

Port the Galleries feature from the web prototype to the React Native mobile app with full parity: list screen with category tabs and pagination, detail screen with photo grid and related galleries, and a full-screen lightbox with navigation, captions, and person tags.

## Non-goals

- Upload / create galleries (read-only, like the prototype).
- Comments or reactions on galleries.
- Offline caching beyond React Query's default behaviour.
- Changes to prototype code.

## Architecture

### File structure

```
mobile/src/features/galleries/
  screens/
    GalleriesScreen.tsx
    GalleryDetailScreen.tsx
  components/
    CategoryTabs.tsx
    GalleryHeroCard.tsx
    GalleryCard.tsx
    PhotoGrid.tsx
    PhotoCell.tsx
    RelatedGalleryCard.tsx
    Lightbox.tsx
    GallerySkeleton.tsx
  hooks/
    useGalleries.ts
    useGalleryDetails.ts
```

### Data flow

```
GalleriesScreen ── useGalleries(categoryId) ──▶ fetchMediaGalleries ──▶ /media-galleries/list
                                                                        (mock fallback on error)

GalleryDetailScreen ── useGalleryDetails(id) ──▶ fetchMediaGalleryDetails ──▶ /media-galleries/:id/details

HomeScreen (PhotoGallerySection) ── navigate('Galleries')
                                 ── navigate('GalleryDetail', { gallery })
```

## API layer (`mobile/src/services/api.ts`)

### Types

```ts
export interface Gallery {
  id: string | number;
  title: string;
  pageUrl: string | null;
  cat: string | null;              // 'tv' | 'movies' | 'digital' | 'lifestyle' | 'sports'
  catLabel: string | null;
  count: number;
  emoji: string;
  bg: string;                       // hex color (not gradient — RN can't parse CSS gradients)
  time: string;                     // 'N hours ago' / 'Yesterday' / '3 days ago'
  featured: boolean;
  thumbnail: string | null;
  viewCount: number;
  views: string | null;             // formatted e.g. '12K'
}

export interface GalleryPhoto {
  id: string | number;
  imageUrl: string | null;
  caption: string;
  tags: { id: string | number; name: string }[];
  emoji: string;
  bg: string;
}

export interface GalleryDetail extends Gallery {
  description: string;
  keywords: string[];
  relatedGalleries: Gallery[];
  photos: GalleryPhoto[];
}

export interface GalleriesPage {
  galleries: Gallery[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface GalleryCatTab {
  id: string;
  label: string;
  categoryId: number | null;        // contentId passed to API
}
```

### Constants

```ts
export const GALLERY_CAT_TABS: GalleryCatTab[] = [
  { id: 'all',       label: 'All',       categoryId: null },
  { id: 'tv',        label: 'TV',        categoryId: 1    },
  { id: 'movies',    label: 'Movies',    categoryId: 2    },
  { id: 'digital',   label: 'Digital',   categoryId: 3    },
  { id: 'lifestyle', label: 'Lifestyle', categoryId: 4    },
  { id: 'sports',    label: 'Sports',    categoryId: 14   },
];
```

Category map (`GALLERY_CAT_MAP`), labels, single-hex bg colors, emojis — ported from prototype `api.js:582–614`, converting the web gradients to the first hex color (RN-compatible) as `VideoGridCard` already does via `firstHex()`.

### Functions

```ts
export async function fetchMediaGalleries(
  page = 1,
  pageSize = 25,
  categoryId: number | null = null,
): Promise<GalleriesPage>

export async function fetchMediaGalleryDetails(
  id: string | number,
): Promise<GalleryDetail | null>
```

**Transforms:** `transformGallery` and `transformGalleryDetail` — direct port of `indiaforums/src/services/api.js:619–699`. Parses each photo's `jsonData` string for person tags; reads `relatedMediaGalleries`; uses first photo's `/media/` URL as hero thumbnail.

**Mock fallback:** `fetchMediaGalleries` returns a `getMockGalleriesPage(page, pageSize)` on network error (pattern from `fetchVideos:1160`). `fetchMediaGalleryDetails` returns a mock detail on error. Mock data lives in a local helper, not exported.

## Hooks

### `useGalleries(categoryId: number | null)`

```ts
useInfiniteQuery<GalleriesPage>({
  queryKey: ['galleries', categoryId ?? 'all'],
  queryFn: ({ pageParam = 1 }) =>
    fetchMediaGalleries(pageParam as number, 25, categoryId),
  initialPageParam: 1,
  getNextPageParam: (last) =>
    last.pagination.hasNextPage ? last.pagination.currentPage + 1 : undefined,
  staleTime: 2 * 60 * 1000,
});
```

Exact shape of `useVideos`, substituting the fetch fn and key.

### `useGalleryDetails(id)`

```ts
useQuery<GalleryDetail | null>({
  queryKey: ['gallery-details', id],
  queryFn: () => fetchMediaGalleryDetails(id),
  enabled: !!id,
  staleTime: 5 * 60 * 1000,
});
```

## Screens

### GalleriesScreen

```
┌───────────────────────────────┐
│ ← Galleries                   │  TopNavBack
├───────────────────────────────┤
│ [All] [TV] [Movies] [Digital] │  CategoryTabs (horizontal scroll, red active)
├───────────────────────────────┤
│ ── All view ──                │
│ Stats: Albums · Loaded · Pages│  Flat card with red numbers
│ ALL GALLERIES (red underline) │  Section label
│ ┌──┐ ┌──┐                     │  FlatList numColumns=2
│ └──┘ └──┘                     │
│ ┌──┐ ┌──┐                     │
│ └──┘ └──┘                     │
│       [Load More]             │
│                               │
│ ── Category view ──           │
│ ┌─────────────────────────┐   │  GalleryHeroCard (200px tall)
│ │  HERO  title + meta     │   │
│ └─────────────────────────┘   │
│ <CAT> · N albums              │  Section label
│ ┌──┐ ┌──┐   ┌──┐ ┌──┐         │  Remaining grid
└───────────────────────────────┘
```

**Behavior:**
- `activeCat` state local to screen; changing tab triggers new `useGalleries` query (cache keyed per category).
- `useMemo` flattens `data.pages` into `allGalleries`; in category view, the first item becomes the hero and is removed from the grid.
- `FlatList` `ListHeaderComponent` holds the stats/hero + section label; grid is the data.
- `ListFooterComponent` shows a "Load More" pressable when `hasNextPage` (plus inline skeletons while `isFetchingNextPage`).
- Initial load: `GallerySkeleton` shimmer for 6 cards.
- Error: `ErrorState` with retry.

### GalleryDetailScreen

```
┌───────────────────────────────┐
│ ←   TV SHOWS                ⋯ │  Sticky header: back | cat+count | share
│     24 photos · 5K views      │
├───────────────────────────────┤
│ ┌───────────────────────────┐ │
│ │  HERO IMAGE               │ │  200px, full-width
│ │  title + meta scrim       │ │
│ └───────────────────────────┘ │
│ Share: [W] [X] [F] [⧉]        │  WhatsApp / X / FB / Copy
│ Description text...           │
│ #keyword #keyword             │
│ PHOTOS ── 24 of 24            │  Grid header (red underline)
│ ┌──────┐ ┌──┐                 │  3-col grid, [0] spans 2×2
│ │  0   │ │ 1│                 │
│ │      │ └──┘                 │
│ │      │ ┌──┐                 │
│ └──────┘ │ 2│                 │
│ ┌──┐┌──┐┌──┐                  │
│ │ 3││ 4││ 5│                  │
│ └──┘└──┘└──┘                  │
│ MORE GALLERIES                │
│ ┌───┐ ┌───┐ ┌───┐ →           │  Horizontal scroll
│ └───┘ └───┘ └───┘             │
└───────────────────────────────┘
```

**Behavior:**
- Route param `gallery: Gallery` renders immediately (title, emoji, count).
- `useGalleryDetails(id)` fetches full detail; once loaded, photos/description/related appear.
- Tapping a photo opens `<Lightbox>` (Modal).
- Tapping a related gallery: `navigation.push('GalleryDetail', { gallery })`.
- Share buttons: WhatsApp/X/Facebook open app-specific URLs via `Linking.openURL`, Copy uses `expo-clipboard`. RN `Share.share()` also wired on the header share icon.
- Broken images: each `Image` wrapped with `onError` → swap to gradient bg + emoji.

### Lightbox (Modal)

```
┌───────────────────────────────┐
│ 3 / 24                  [×]   │  counter + close
│                               │
│    [‹]   [ IMAGE ]   [›]      │  nav arrows, 40×40 glass circles
│                               │
│ caption text...               │
│ #personTag #personTag         │
│ ┌┐┌┐┌┐┌┐┌┐┌┐┌┐                │  thumbnail strip (horizontal scroll)
│ └┘└┘└┘└┘└┘└┘└┘                │  active: blue border + scale 1.1
└───────────────────────────────┘
```

**Behavior:**
- RN `Modal` with `transparent={true}`, `animationType="fade"`, black bg `rgba(0,0,0,0.95)`.
- Tapping outside the photo closes (touch-through propagation handled with `Pressable`).
- `ScrollView` horizontal for thumbnail strip; active thumb scrolls into view via `scrollToIndex`.
- Image loading failure → emoji + bg fallback, same pattern as prototype.

## Navigation wiring

### Type additions (`mobile/src/navigation/types.ts`)

Append to `HomeStackParamList`:

```ts
Galleries: undefined;
GalleryDetail: { gallery: import('../services/api').Gallery };
```

### Stack registration (`mobile/src/navigation/HomeStack.tsx`)

Import and register the two screens. Remove any placeholder entries with the same names if present (currently not present — only Videos/Celebrities are wired; Galleries routes are new).

### HomeScreen integration

Replace the two empty arrow stubs in [HomeScreen.tsx:100-101](mobile/src/features/home/screens/HomeScreen.tsx#L100-L101):

```tsx
<PhotoGallerySection
  galleries={PREVIEW_GALLERIES}
  onSeeAll={() => navigation.navigate('Galleries')}
  onGalleryPress={(g) => navigation.navigate('GalleryDetail', { gallery: g })}
/>
```

**Preview data source:** Keep the current static `PREVIEW_GALLERIES` for this spec — switching it to the live hook is a follow-up to keep this spec focused.

## Styling

All values inline (RN has no CSS vars). Mirror existing mobile palette:

| Token       | Value     | Use                                   |
|-------------|-----------|---------------------------------------|
| brand       | `#3558F0` | active borders, person tag bg         |
| red accent  | `#D63636` | active category tab, section underline, stat numbers |
| bg          | `#F5F6F7` | screen background                     |
| card        | `#FFFFFF` | cards, sticky header                  |
| text        | `#1A1A1A` | headlines                             |
| text2       | `#4A4A4A` | body                                  |
| text3       | `#8A8A8A` | metadata, timestamps                  |
| border      | `#E2E2E2` | hairline borders                      |

Skeleton shimmer: `Animated.Value` looped `opacity` 0.3 → 0.7, matching `CelebSkeleton.tsx`.

## Error handling and edge cases

| Case | Behavior |
|------|----------|
| Network error on list | Mock fallback (6–8 galleries) — user still sees content |
| Network error on detail | Mock fallback detail with 12 placeholder photos |
| `thumbnailUrl` 404 | `Image.onError` → gradient bg + emoji |
| Empty category | "No galleries in this category yet." row |
| Gallery with 0 photos | "No photos available" empty state (prototype parity) |
| `jsonData` malformed | Catch + empty tags (prototype parity) |
| Gallery with no related | Hide related section entirely |

## Testing

No test runner is currently configured in `mobile/` (per `mobile/package.json` inspection during exploration). Manual QA checklist:

- [ ] Home → "See All →" on gallery strip navigates to GalleriesScreen
- [ ] Home → tap gallery card navigates to GalleryDetail
- [ ] GalleriesScreen loads All tab by default
- [ ] Switching category re-fetches (stats row replaced by hero card)
- [ ] Load More appends next page
- [ ] Tap gallery card → GalleryDetail opens with immediate title/count, photos populate after fetch
- [ ] Tap photo → Lightbox opens at that index
- [ ] Lightbox prev/next cycles photos; close button dismisses
- [ ] Thumbnail strip scrolls active thumb into view
- [ ] Related gallery tap pushes new GalleryDetail
- [ ] Share header icon opens native share sheet
- [ ] WhatsApp / X / FB buttons open respective app intents; Copy copies URL
- [ ] Broken thumbnail URLs fall back to emoji + bg
- [ ] Empty category shows friendly message
- [ ] Airplane mode → mock fallback renders instead of error

## Out of scope for this spec

- Wiring `PREVIEW_GALLERIES` on HomeScreen to live API.
- Web Stories, Quizzes, Fan Fiction (separate specs).
- Gallery search/filter beyond category tabs.
- Pinch-zoom on lightbox images.
