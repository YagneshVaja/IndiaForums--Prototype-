# Mobile Web Stories — Design

**Date:** 2026-04-23
**Status:** Approved for implementation
**Scope:** Replace the two `PlaceholderScreen`s wired to `HomeStack.WebStories` and `HomeStack.WebStoryPlayer` with a production React Native grid + immersive auto-advancing player. Mirrors the web prototype at `indiaforums/src/screens/WebStoriesScreen.jsx` and `indiaforums/src/components/stories/WebStoryPlayer.jsx`.

---

## 1. Goal

Ship two screens:

1. **`WebStoriesScreen`** — paginated 2-column grid of cover cards. Matches the second reference screenshot (intro block, "Latest Stories" header with `X of Y`, card grid, load-more).
2. **`WebStoryPlayerScreen`** — full-bleed dark immersive player. Auto-advances slides every 5s (per-slide override allowed via API), tap zones for prev/next slide, top header with author + pause + close, segmented progress bars (one segment per slide). Auto-advances into the next story in the snapshot when the last slide completes.

Data is sourced live from `GET /webstories?page&pageSize` and `GET /webstories/{id}/details` against `api2.indiaforums.com/api/v1`. No mock-only mode.

The Web Stories item in the home `StoriesStrip` (🌐 icon) is wired to navigate to `WebStories`.

---

## 2. Non-goals

- **Inline video playback.** `expo-av` is not installed. Slides with `mediaType === 'video'` render their `imageUrl` if present; otherwise the deterministic gradient. CTA on the slide remains untouched.
- **Category filter.** The web `WebStoriesScreen` has no category bar — neither does mobile.
- **Slide-level poll/quiz submission.** The web renders poll/quiz options as a read-only list (the submit endpoint isn't finalised). Mobile does the same.
- **Offline caching** beyond React Query's default in-memory cache.
- **Deep-link into a single story** (`WebStoryPlayer/{id}`) without the surrounding list. The route param requires the full snapshot from the grid (per Question 2 design decision).
- **New design tokens.** All colors/spacing come from existing `theme/tokens` (player chrome uses constants because it's cinematic dark UI, mirroring the shorts spec decision).

---

## 3. Module layout

```
mobile/src/features/webstories/
├── screens/
│   ├── WebStoriesScreen.tsx
│   └── WebStoryPlayerScreen.tsx
├── components/
│   ├── WebStoryCard.tsx
│   ├── WebStoryGridSkeleton.tsx
│   ├── PlayerHeader.tsx
│   ├── PlayerProgressBar.tsx
│   ├── SlideRenderer.tsx
│   └── SlideCaption.tsx
├── hooks/
│   ├── useWebStories.ts
│   └── useWebStoryDetails.ts
└── utils/
    └── normalize.ts
```

Changes outside the feature folder:

- `mobile/src/services/api.ts` — add types and the two `fetch*` functions (see §4).
- `mobile/src/navigation/types.ts:56-57` — change `WebStoryPlayer: { id: string }` to `WebStoryPlayer: { stories: WebStorySummary[]; index: number }`.
- `mobile/src/navigation/HomeStack.tsx:49-50` — replace both `PlaceholderScreen` lines with `WebStoriesScreen` and `WebStoryPlayerScreen` (with `import` adjustments at the top of the file).
- `mobile/src/features/home/components/StoriesStrip.tsx:58` — add a route case for `'Web Stories'` mirroring the existing cases for Shorts/Quizzes/etc.

---

## 4. Data layer

### 4.1 API shapes (live, verified by web client)

```
GET /webstories?page=1&pageSize=24
→ { data: RawWebStorySummary[], totalCount: number }

RawWebStorySummary = {
  storyId: number;
  title: string;
  pageUrl: string;                   // slug
  publishedWhen: string;             // ISO
  hasThumbnail: boolean;
  thumbnailUrl: string | null;
  webStoryUpdateChecksum: string;    // skip
}
```

```
GET /webstories/{storyId}/details
→ flat object (no envelope), includes:
  // Author block (top-level):
  userId, userName, realName, groupId, groupName,
  avatarType, avatarAccent,

  // Story block:
  storyId, title, pageUrl, description,
  hasThumbnail, thumbnailUrl, webStoryUpdateChecksum, statusCode,
  createdWhen, lastEditedWhen, publishedWhen,
  theme, approvedBy, featured, authorByLine,

  // Slides — JSON STRING that must be parsed:
  slidesJson,
  slidesHtmlContent      // legacy/null
```

Each parsed slide has `slideNumber, slideType, title, description, image, video, imageSource, imageCredits, videoCredits, mediaSource, cite, quote, pollId, quizId, question, options, fact, listicle, listItems, animation, timer, author, authorByLine, attribute, url, urlAction`.

### 4.2 TypeScript types (new in `services/api.ts`)

```ts
export interface WebStorySummary {
  id: number;
  title: string;
  slug: string;
  coverImage: string;          // '' when no thumbnail
  coverBg: string | null;      // gradient CSS string when no cover
  publishedWhen: string | null;
  timeAgo: string;             // relative ("3mo ago"), '' when unparseable
  featured: boolean;
}

export interface WebStoriesPage {
  stories: WebStorySummary[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface WebStoryAuthor {
  userId: number | null;
  userName: string;
  realName: string;
  displayName: string;
  groupName: string;
  initials: string;
  avatarColor: string;         // single accent (e.g. "#3558F0")
  avatarBg: string;            // linear-gradient string
}

export type SlideMediaType = 'image' | 'video' | 'text';

export interface WebStorySlide {
  id: string;                  // `${storyId}-${order}`
  order: number;
  slideType: string;
  isCover: boolean;
  mediaType: SlideMediaType;
  imageUrl: string;
  videoUrl: string;
  title: string;
  caption: string;
  extra:
    | { kind: 'list'; items: Array<string | { text?: string; title?: string }> }
    | { kind: 'poll' | 'quiz'; options: Array<string | { text?: string; title?: string; label?: string }> }
    | null;
  mediaCredit: string;
  actionUrl: string;
  actionLabel: string;
  slideAuthor: string;
  authorByLine: boolean;
  attribute: string;
  pollId: number | null;
  quizId: number | null;
  durationMs: number;          // default 5000
  bg: string;                  // gradient fallback
}

export interface WebStoryDetails {
  story: {
    id: number;
    title: string;
    slug: string;
    description: string;
    coverImage: string;
    coverBg: string | null;
    publishedWhen: string | null;
    timeAgo: string;
    author: WebStoryAuthor | null;
    featured: boolean;
    theme: unknown;
    authorByLine: unknown;
  };
  slides: WebStorySlide[];
}
```

### 4.3 Transform rules

Direct TS port of `indiaforums/src/components/stories/normalize.js`. The full mapping is documented there; the mobile copy lives at `mobile/src/features/webstories/utils/normalize.ts` and re-uses the same logic. Key bits:

- **Fallback gradient** — deterministic from `id % 8`, palette of 8 vivid `linear-gradient(160deg, …)` strings. Used when `hasThumbnail` is false (cards) or a slide has no image/video (player).
- **Initials** — first two whitespace-separated tokens of the display name, uppercase. Default `'IF'`.
- **Relative time** — `< 60s → 'just now'`, then `Xm`/`Xh`/`Xd`/`Xmo`/`Xy ago`. Returns `''` on parse failure.
- **slideType branches** — `quote`, `fact`, `listicle`, `poll`/`quiz` each remap title/caption from their type-specific fields. Unknown types default to title/description.
- **`durationMs`** — `Number(raw.timer) * 1000` if valid; else 5000.
- **`mediaCredit`** — first non-empty of `mediaSource`, `imageCredits`, `videoCredits`, `imageSource`.
- **slidesJson parsing** — accept JSON string (canonical), already-parsed array, or `slides` key. Malformed JSON → empty slides + console.error (don't crash).

### 4.4 `fetchWebStories` and `fetchWebStoryDetails`

Both follow the `fetchShorts` template (`services/api.ts:4480`):

```ts
export async function fetchWebStories(
  page = 1,
  pageSize = 24,
): Promise<WebStoriesPage> {
  const { data } = await apiClient.get('/webstories', {
    params: { page, pageSize },
  });
  const rawList: RawWebStorySummary[] = Array.isArray(data?.data) ? data.data : [];
  const totalCount: number = Number(data?.totalCount) || 0;
  const totalPages = pageSize > 0 ? Math.ceil(totalCount / pageSize) : 0;

  return {
    stories: rawList.map(transformWebStorySummary),
    pagination: {
      currentPage: page,
      pageSize,
      totalItems: totalCount,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}

export async function fetchWebStoryDetails(
  storyId: string | number,
): Promise<WebStoryDetails> {
  const { data } = await apiClient.get(`/webstories/${storyId}/details`);
  return transformWebStoryDetails(data, storyId);
}
```

On failure: log + rethrow (match `fetchShorts`). No mock fallback.

### 4.5 Hooks

```ts
// useWebStories.ts
export function useWebStories() {
  return useInfiniteQuery<WebStoriesPage>({
    queryKey: ['webstories'],
    queryFn: ({ pageParam = 1 }) => fetchWebStories(pageParam as number, 24),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.pagination.hasNextPage ? last.pagination.currentPage + 1 : undefined,
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

// useWebStoryDetails.ts — disabled when storyId is null
export function useWebStoryDetails(storyId: number | null) {
  return useQuery<WebStoryDetails>({
    queryKey: ['webstory', storyId],
    queryFn: () => fetchWebStoryDetails(storyId!),
    enabled: storyId != null,
    staleTime: 10 * 60 * 1000,
  });
}
```

---

## 5. `WebStoriesScreen` composition

Layout (top to bottom inside `View {flex:1, bg: colors.bg}`):

1. **`<TopNavBack title="Web Stories" onBack={navigation.goBack} />`** — standard back chrome.
2. **Intro block** (matches web's `.introBlock`): vertical padding 16, horizontal 14, `card` background, `border` bottom 1px.
   - Title: `'Web Stories'`, 22px 800-weight, `colors.text`.
   - Subtitle: `'Tap any card to play an immersive, auto-advancing story.'`, 13px 500-weight, `colors.textSecondary`, marginTop 4.
3. **Section header row** (sticky? no — scrolls with content):
   - Left: `'Latest Stories'`, 16px 700-weight, `colors.text`, padding 14/12.
   - Right: `'{showingCount} of {totalCount}'`, 11px 700-weight uppercase letter-spacing 0.5, `colors.textTertiary`. Hidden until first page lands.
4. **`FlatList` (numColumns=2)** of `WebStoryCard`s, gap 10, contentContainerStyle horizontal 12 vertical 4.
5. **Footer** — when `hasNextPage`, render a centered `'Load more stories'` `Pressable` (matches the quizzes screen pattern at `QuizzesScreen.tsx:139`). Triggers `fetchNextPage`.
6. **States** — see §9.

The `FlatList` `ListHeaderComponent` contains the intro block and section header, so they scroll with the grid (matches web). `keyExtractor`: `String(story.id)`.

---

## 6. `WebStoryCard` layout

Card matches web's `.webstories-item`:

- Width: `(viewportWidth - 12*2 - 10) / 2` (handled by `flex: 1` inside the row + columnWrapperStyle gap).
- Aspect ratio: 9:16 cover → use `aspectRatio: 9/16` on the cover container.
- Border radius 14, overflow hidden, `colors.card` background, 1px `colors.border`.

Cover container (relative):
- `expo-image` for the cover; `style={StyleSheet.absoluteFill}`, `contentFit="cover"`. Falls back to a `View` with `backgroundColor: story.coverBg` (gradient as flat color via `expo-linear-gradient` `LinearGradient` — actually use `LinearGradient` here because `coverBg` is a CSS gradient string we can't apply to React Native style; we parse the colors from our own deterministic palette and render `<LinearGradient colors={[c1, c2]} angle={160} />`).

  → Implementation note: rather than emitting CSS gradient strings, the TS `gradientFor` should return `{ colors: [string, string], angle: number }` and the consumer renders an `expo-linear-gradient`. Update `coverBg` type to `{ colors: [string, string]; angle: number } | null`. (Same for slide `bg`.)

Overlays on top of the cover:
- **Top scrim**: `LinearGradient` `colors={['rgba(0,0,0,0.45)', 'transparent']}` height 56, top 0.
- **Progress dots**: 5 `View`s, top 8 left 8, gap 3, each `width: 18, height: 2.5, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.55)'`. Static — purely visual marker.
- **Story badge**: bottom-right inset 8, 22×22 rounded square `rgba(0,0,0,0.55)` background, `Ionicons name="albums-outline" size={12} color="#fff"`.

Body (below cover, inside the card):
- Title: `numberOfLines={3}`, 13px 700-weight, `colors.text`, line-height 18, padding 10 top, 10 horizontal.
- Footer row: `Ionicons name="time-outline" size={11} color={colors.textTertiary}` + `story.timeAgo`, 11px 500-weight, `colors.textTertiary`. Padding 6/10/10.

Press behavior: `Pressable` with `({ pressed }) => [styles.card, pressed && styles.cardPressed]`. Press → call `onOpen(idx)`.

---

## 7. `WebStoryPlayerScreen` composition

Full-bleed black `View {flex:1, backgroundColor: '#000'}`. Status bar: `<StatusBar style="light" />`, scoped via `useFocusEffect`.

Route params: `{ stories: WebStorySummary[]; index: number }`.

Local state:
- `storyIdx` (initialised from `route.params.index`)
- `slideIdx` (resets to 0 when `storyIdx` changes)
- `paused` (boolean)
- `progress` (0..1, current slide)

Compute `currentStory = stories[storyIdx]`. Pass `currentStory.id` into `useWebStoryDetails`. While loading, render the cover image (from the summary) as the background + a centered spinner. While erroring, render `ErrorState` with `onRetry={refetch}`.

Layered children (bottom → top):

1. **Media layer** — `SlideRenderer` (see §8) fills the screen.
2. **Bottom scrim** — `LinearGradient` `colors={['transparent', 'rgba(0,0,0,0.8)']}`, height ~50% of screen, anchored bottom. Pointer-events none.
3. **`PlayerProgressBar`** — pinned `top: insets.top + 8`, left/right 12. One segment per slide. Each seg: `flex: 1, height: 2, borderRadius: 1, bg: 'rgba(255,255,255,0.25)'`. Active seg: `Animated.View` width interpolated from `progress`. Past segs: full white.
4. **`PlayerHeader`** — pinned `top: insets.top + 18`, left/right 14. Author row left + buttons right.
   - Author left: `40×40` round avatar (linear gradient from `author.avatarColor`), white initials 13px 800-weight; column right: `displayName` 13px 700-weight white, optional `groupName` chip (8.5px white text, padding 2/6, bg `rgba(255,255,255,0.16)`, marginLeft 6); `timeAgo` 10.5px `rgba(255,255,255,0.65)`.
   - Buttons right: pause/play (`Ionicons name={paused ? 'play' : 'pause'} size={16}`) + close (`Ionicons name="close" size={18}`). Each in a 32×32 round `rgba(0,0,0,0.4)` button, gap 8.
5. **`SlideCaption`** — pinned bottom, `bottom: insets.bottom + 24`, left/right 18. See §8.
6. **Tap zones** — full-height `Pressable`s, left 1/3 = prev, right 2/3 = next. `pointerEvents='box-only'`. Below `PlayerHeader` and above `SlideCaption` in z-order so taps on the caption CTA aren't intercepted.

### 7.1 Auto-advance timer

Wall-clock timer, mirroring the web pattern at `WebStoryPlayer.jsx:100-140`:

```ts
useEffect(() => {
  if (paused || isLoading || isError || slides.length === 0) return;

  let elapsed = elapsedRef.current; // resumes from pause
  const start = Date.now() - elapsed;
  const id = setInterval(() => {
    if (paused) return;
    const e = Date.now() - start;
    elapsedRef.current = e;
    const p = Math.min(1, e / slideDuration);
    progressAnim.setValue(p);
    if (p >= 1) {
      clearInterval(id);
      elapsedRef.current = 0;
      goNext();
    }
  }, 50);
  return () => clearInterval(id);
}, [paused, isLoading, isError, slides.length, slideIdx, slideDuration]);
```

`goNext`: if not last slide → `slideIdx + 1`. Else if `storyIdx < stories.length - 1` → `setStoryIdx(s => s + 1); setSlideIdx(0)`. Else → `navigation.goBack()`.

`goPrev`: if not first slide → `slideIdx - 1`. Else if `storyIdx > 0` → previous story, slide 0. Else no-op.

When `slideIdx` changes, reset `progressAnim` to 0 and `elapsedRef.current` to 0 in a synchronous render-time check (the same `prevSlideIdx` pattern web uses at `WebStoryPlayer.jsx:64-68`).

When `storyIdx` changes, the `useWebStoryDetails(currentStory.id)` invocation refetches automatically via React Query's `queryKey` change.

### 7.2 Pause behavior

Pause button toggles `paused`. Tap zones don't toggle pause (left=prev, right=next). The web uses tap zones for navigation only — same here. (The Shorts screen's tap-to-pause is a different feature.)

---

## 8. `SlideRenderer` and `SlideCaption`

### 8.1 `SlideRenderer`

Picks media based on `slide.mediaType`:

- **`image`** → `<Image source={{ uri: slide.imageUrl }} contentFit="cover" style={StyleSheet.absoluteFill} />` (`expo-image`).
- **`video`** → since `expo-av` isn't installed, fall back to `slide.imageUrl` if non-empty, else the gradient. Log a one-time `console.warn('[webstories] inline video not supported, falling back to image/gradient')`.
- **`text`** → `<LinearGradient colors={slide.bg.colors} angle={slide.bg.angle} style={StyleSheet.absoluteFill} />`.

Image error → `onError` swaps to the gradient via local `hasErrored` state.

### 8.2 `SlideCaption`

Bottom block. All text white-ish, with `textShadow: 0 1 8 rgba(0,0,0,0.6)` on the title for legibility.

Conditional renders:

- **Featured badge** (only on cover slide if `story.featured`): pill 4/8 padding, 9px 700-weight uppercase white text on `colors.primary` background, marginBottom 8.
- **`slide.title`** → 18px 800-weight white, line-height 24, marginBottom 6, `numberOfLines={3}`.
- **`slide.caption`** → 13px 500-weight `rgba(255,255,255,0.85)`, line-height 19, marginBottom 6, `numberOfLines={4}`.
- **Story description** (only on cover slide if `story.description` differs from `slide.caption`) → 12px 500-weight `rgba(255,255,255,0.7)`, line-height 18, `numberOfLines={4}`.
- **Slide byline** (`slide.slideAuthor`) → `'— {author}'`, 11px italic `rgba(255,255,255,0.7)`.
- **Listicle** (`extra.kind === 'list'`) → bullet `•` prefix, 12px white, line-height 18, `numberOfLines={1}` per item.
- **Poll/quiz options** (`extra.kind === 'poll' | 'quiz'`) → same shape as listicle but no bullet. Read-only.
- **CTA** (`actionUrl && actionLabel`) → `Pressable` 11/16 padding, `colors.primary` background, white 12px 700-weight text, marginTop 8. Label = `${actionLabel} →`. Press → `Linking.openURL(actionUrl)`.
- **Media credit** (`slide.mediaCredit`) → 9.5px 600-weight `rgba(255,255,255,0.55)`, prefix `'Credit: '`, marginTop 4.

Items render in this exact stacking order (matches web).

---

## 9. States

| State | Rendering |
|---|---|
| **List initial loading** (`isLoading && stories.length === 0`) | 6 `WebStoryGridSkeleton` cells in a 2-column grid (cover shimmer + two title bars). |
| **List error, no data** | Centered `ErrorState message="Couldn't load web stories" onRetry={refetch}`. |
| **List empty** | Centered emoji `'📭'` + title `'No web stories yet'` + subtitle `'Check back soon'`. |
| **List loading more** | Footer pressable label flips to `'Loading…'` and is disabled. |
| **Player details loading** | Cover image (from summary) as the media, centered 22px white `ActivityIndicator`. Header still visible. |
| **Player details error** | `ErrorState` overlay with retry. Header (close button) still visible. |
| **Player no slides** (rare) | Cover image, header, single slide caption with the story title only, no progress. Tapping close goes back. |

---

## 10. Theming

- Player chrome (`#000` bg, white text, scrims): **constants** — cinematic dark, not theme-adaptive.
- Grid screen (`WebStoriesScreen`, `WebStoryCard`): theme-adaptive via `useThemeStore`.
- Brand blue for the slide CTA and any `colors.primary` use in the card: theme-adaptive (`colors.primary`).
- Status bar style: `'light'` on the player, restored to ambient on blur (via `useFocusEffect`).

---

## 11. Navigation and entry points

- `mobile/src/features/home/components/StoriesStrip.tsx:58` — add `if (s.label === 'Web Stories') { navigation.navigate('WebStories'); return; }` alongside existing cases.
- `mobile/src/navigation/types.ts:57` — change `WebStoryPlayer: { id: string }` → `WebStoryPlayer: { stories: import('../services/api').WebStorySummary[]; index: number }`.
- `mobile/src/navigation/HomeStack.tsx:49-50` — replace `PlaceholderScreen` with `WebStoriesScreen` and `WebStoryPlayerScreen`. Add the imports.
- `WebStoriesScreen` opens the player via `navigation.navigate('WebStoryPlayer', { stories, index })` where `stories` is the flattened, dedup'd `useWebStories` result.

---

## 12. Dependencies

Already present (verified in `mobile/package.json`):

- `@tanstack/react-query` ^5.99 — used for both hooks
- `expo-image` ~55.0.8 — preferred image component
- `expo-linear-gradient` ~55.0.13 — gradients (cover fallback, scrims, slide background)
- `expo-status-bar` ~55.0.5 — status bar control
- `@expo/vector-icons` (via Ionicons) — back, close, pause, play, time, albums icons
- `@react-navigation/bottom-tabs` ^7.15.9 — for `useBottomTabBarHeight` if needed in player

**Not present, not added**: `expo-av` (no inline video), `expo-blur` (no BlurView; player uses solid `rgba` overlays).

---

## 13. Testing

No unit-test infra in `mobile/`. Verification is manual:

- Home → 🌐 Web Stories icon → grid loads (skeletons → cards). Verify `'X of 95'` count appears and is correct.
- Tap a card → player opens with cover as background → spinner while details load → first slide appears → progress bar fills over ~5s → auto-advances.
- Verify pause button stops the timer; play resumes from the same point (not from 0).
- Verify left tap = prev slide / story; right tap = next slide / story. Verify the CTA inside the caption isn't swallowed by the right tap zone.
- Open last slide of last story → wait → player closes.
- Open a story with `featured: true` → "Featured" badge appears on the cover slide only.
- Open a story whose details payload has a `listicle` slide → list items render.
- Force airplane mode → list refetch shows error+retry; opening a story shows the player error+retry.
- Verify status bar is light on the player and reverts to ambient on close.
- Scroll grid to bottom → `Load more stories` fetches page 2 → new cards append, count updates.

---

## 14. Risks

1. **Snapshot stale-ness in player params** — `WebStoryPlayer` receives a frozen array. If `useWebStories` refetches mid-play, the player won't see new pages until it re-opens. Acceptable: the whole point of passing the snapshot is determinism.
2. **`scrollToIndex`-style guards** — N/A (no horizontal list in player); but `goNext` must guard `storyIdx + 1 < stories.length` before advancing. Last-of-last → close.
3. **Timer leaks on rapid navigation** — `useEffect` cleanup clears the interval. Verify by mounting/unmounting via fast back-tap during play.
4. **`elapsedRef` reset on slide change** — using a ref synced via the `prevSlideIdx` render-time check; identical to the web pattern. The risk is that a delayed `setProgress` after slide change writes to the new slide's anim — mitigated because `progressAnim` is an `Animated.Value` shared per render and the cleanup runs before the new effect schedules.
5. **`slidesJson` malformed** — handled in `normalize.ts` with try/catch + console.error; UI shows the cover only.
6. **Image 404s** — `expo-image` `onError` callback swaps to the gradient.

---

## 15. Out of scope (future work)

- Inline video playback (requires `expo-av` or `react-native-webview` with YouTube embed)
- Like / share / save actions on a story or slide
- Poll / quiz vote submission
- Deep-link `WebStoryPlayer/{id}` without surrounding list (would need to fall back to a single-story snapshot)
- Analytics events for impressions / advances / CTA taps
- Offline prefetch of the next slide's image
- Story-level category filter
