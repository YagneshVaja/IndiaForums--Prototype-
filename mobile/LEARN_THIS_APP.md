# Learn This App — A Beginner's Guide to the IndiaForums Mobile Codebase

> A grounded walkthrough of **your** IndiaForums mobile app — no generic theory.
> Every concept is tied back to a real file in this repo.

---

## Table of Contents

1. [Step 1 — Project Analysis](#step-1--project-analysis)
2. [Step 2 — System Design Explained](#step-2--system-design-explained-beginner-friendly)
3. [Step 3 — Core Concepts You Must Learn](#step-3--core-concepts-you-must-learn)
4. [Step 4 — Gap Analysis](#step-4--gap-analysis)
5. [Step 5 — Rebuild Strategy](#step-5--rebuild-strategy)
6. [The One Paragraph to Remember](#one-paragraph-to-carry-in-your-head)

---

## Step 1 — Project Analysis

### 1.1 What you actually built

You built an **Expo-managed React Native app** for IndiaForums. It is a content app with five bottom tabs (Home, News, Forums, Search, My Space), plus onboarding and auth flows. It talks to a real backend at `https://api2.indiaforums.com/api/v1`.

**Stats** (from the code knowledge graph): 79 source files, 347 functions, ~2000 call edges. That's a medium-sized app — not a toy.

### 1.2 Top-level shape

```
mobile/
├── App.tsx                  ← entry: wires all global providers
├── package.json             ← declares the stack (Expo 55, RN 0.83, React 19)
├── src/
│   ├── navigation/          ← every navigator + one types.ts for screen params
│   ├── services/            ← axios client + per-domain API wrappers + storage
│   ├── store/               ← Zustand slices (auth, theme, notifications, etc.)
│   ├── theme/               ← color tokens (light/dark)
│   ├── components/          ← shared UI (layout/, ui/)
│   └── features/            ← one folder per domain: home, forums, videos, …
│        └── <feature>/
│             ├── screens/       ← full-screen React components
│             ├── components/    ← pieces used only inside this feature
│             ├── hooks/         ← React Query hooks for this feature's data
│             ├── utils/         ← pure helpers
│             └── data/          ← static seed data / fixtures
```

This is called a **feature-sliced / modular architecture**. Think of each folder under `features/` as a mini-app that owns its own screens, components, hooks, and utilities. Shared things (UI primitives, theme, API client, navigation shell) live at the top of `src/`.

### 1.3 The architecture in one sentence

> *"Zustand holds global client state, React Query holds server state, React Navigation decides which screen shows, Axios talks to the backend, and screens are dumb: they just call hooks and render."*

That single sentence is the mental model. Every part of the code follows it.

### 1.4 What is done correctly

| Good decision | Where to see it |
|---|---|
| **One provider tree in App.tsx** — gesture handler, safe area, React Query, navigation, all wrapped once. | `App.tsx` lines 33–45 |
| **Separation of client vs server state** — Zustand for auth/theme/UI, React Query for API data. | `src/features/home/hooks/useHomeData.ts`, `src/store/authStore.ts` |
| **Fully typed navigation** — every screen's params are defined in one file. | `src/navigation/types.ts` |
| **Single axios client with interceptors** — adds auth header, refreshes expired tokens, handles 401s with single-flight. | `src/services/api.ts` lines 34–103 |
| **Hydration gate on boot** — splash spinner until tokens are restored. | `src/navigation/RootNavigator.tsx` lines 21–31 |
| **Smart retry policy** — don't retry 4xx or offline errors. | `App.tsx` lines 12–31 |
| **Memoized styles** — `useMemo(() => makeStyles(colors), [colors])` so theme-aware styles don't rebuild every render. | `src/features/home/screens/HomeScreen.tsx` line 37 |
| **FlashList over FlatList** — better for long, varying lists. | `src/features/home/screens/HomeScreen.tsx` line 161 |

### 1.5 What can be improved (gently)

1. **`services/api.ts` is a god file.** One file holds the axios client, error extractor, category maps, and transformers for every domain (videos, articles, galleries…). It will become unmaintainable. Split per domain, like you already did for `authApi.ts` and `userProfileApi.ts`.
2. **`any` in transformers** (`transformVideo(raw: any)` around line 254 of `api.ts`). The backend shape isn't typed. For now that's pragmatic, but long-term you want per-endpoint response types.
3. **Static data hardcoded in features** (`data/galleries.ts`, `data/webStories.ts`). Fine for a prototype, but these should come from the API eventually.
4. **`.bak` files in working tree** — delete them; that's not how you roll back in a git repo.
5. **A few stores import MMKV via `require()`** — works, but ties platform-gating logic into the store instead of the storage layer.
6. **No error boundaries.** One throw in a component crashes the whole screen.
7. **No tests committed** (jest is configured but there are no test files).

---

## Step 2 — System Design Explained (Beginner Friendly)

Think of your app as a **restaurant**:

- **React Navigation** = the host, deciding which dining room (screen) you're seated in.
- **Screens** = the waiter — they don't cook, they just take your order and serve what the kitchen returns.
- **React Query hooks** = the kitchen — they cook (fetch) data, keep it warm (cache), and know when to refresh it.
- **Axios (`api.ts`)** = the delivery driver who actually drives to the supplier (your backend).
- **Zustand stores** = the restaurant's front-of-house state: who's logged in, what theme is on, is the side menu open. Shared by everyone.
- **Components** = the plates and cutlery — reusable pieces the waiter arranges on your table.

### 2.1 App architecture — the provider stack

`App.tsx` lines 33–45:

```tsx
<GestureHandlerRootView>      // enables swipes/drags for the whole app
  <SafeAreaProvider>          // exposes notch/home-bar insets
    <QueryClientProvider>     // shares the server-state cache everywhere
      <NavigationContainer>   // owns the navigation state tree
        <RootNavigator />     // your screen graph
```

**Why providers?** React has a feature called **Context** — a way to make a value available to every component underneath without passing props. Each provider here plugs a library's context into your tree. Order matters: the React Query cache must wrap the navigator so any screen can read it.

### 2.2 Navigation system — three layers

Your screen graph is a **tree of navigators**, configured in `src/navigation/RootNavigator.tsx`:

```
RootNavigator (native-stack)
├── Onboarding    → OnboardingStack (Splash → Slides → GetStarted)
├── Guest         → GuestStack (read-only browsing)
├── Auth          → AuthStack (Login / Register / ForgotPassword)
└── Main          → MainTabNavigator
                      ├── Home    → HomeStack
                      ├── News    → NewsStack
                      ├── Forums  → ForumsStack
                      ├── Search  → SearchStack
                      └── MySpace → MySpaceStack
```

**Decision logic on boot** (`RootNavigator.tsx` lines 33–38):

1. If hydrating tokens → show spinner.
2. If authenticated → go to `Main`.
3. Else if they've seen onboarding → `Guest`.
4. Else → `Onboarding`.

**Why is this important?** Users must not see a flash of the login screen while tokens are still being restored from disk. The `isHydrating` flag solves this.

**Type safety** (`src/navigation/types.ts`): every navigator has a `ParamList` type. When you write `navigation.navigate('ArticleDetail', { id, thumbnailUrl, title })`, TypeScript checks that `ArticleDetail` exists and that `id` is required.

### 2.3 Data flow — from API to UI (the most important diagram)

Here is what happens when the Home tab loads:

```
┌─────────────────────────────────────────────────────────────────┐
│ HomeScreen renders                                              │
│   const { data: articles } = useHomeArticles(category)   ───┐   │
└─────────────────────────────────────────────────────────────│───┘
                                                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ React Query (cache keyed by ['articles','home',category])       │
│   • If fresh in cache  → returns immediately (no network)       │
│   • If stale/missing   → calls queryFn                          │
└─────────────────────────────────────────────────────────────│───┘
                                                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ fetchArticles({category,page:1,limit:20})   (services/api.ts)   │
│   → apiClient.get('/articles/list', {params})                   │
│   → request interceptor attaches Authorization header           │
│   → response interceptor catches 401 → refresh → retry          │
└─────────────────────────────────────────────────────────────│───┘
                                                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Raw JSON comes back → transform (e.g. transformVideo)           │
│   → React Query stores it, flips isLoading to false             │
│   → HomeScreen re-renders with articles                         │
└─────────────────────────────────────────────────────────────────┘
```

Two things to take from this:

1. **Screens never call axios directly.** They call a hook (`useHomeArticles`). The hook calls a service function (`fetchArticles`). The service function uses `apiClient`. Each layer does one job.
2. **React Query is a cache**, not just a fetcher. Visit Home, switch to News, come back — articles load instantly because cached. `staleTime: 2 * 60 * 1000` (`useHomeData.ts` line 29) says "consider this fresh for 2 minutes before refetching."

### 2.4 State management — two kinds of state

This is a concept people confuse constantly. **Learn this hard line:**

| Type | Example | Tool you used |
|---|---|---|
| **Server state** — data that lives on the backend, you just mirror it. | Articles, banners, celebrity profiles, videos. | **React Query** (`useQuery`) |
| **Client state** — data the app owns, the server doesn't care about. | Are you logged in? Is dark mode on? Is side menu open? | **Zustand** stores |

**Local UI state** (a search input's current text, a toggle) doesn't need a store at all. Use `useState`. Example: `HomeScreen.tsx` line 35 keeps `selectedCategory` in `useState` because only HomeScreen cares.

#### Zustand in your app

`src/store/themeStore.ts` lines 46–58:

```ts
export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: loadInitialMode(),
  colors: themes[loadInitialMode()],
  toggle: () => {
    const next = get().mode === 'dark' ? 'light' : 'dark';
    storage.set(KEY, next);
    set({ mode: next, colors: themes[next] });
  },
}));
```

**Anatomy:**

- `create(...)` defines a store with a state shape and actions (functions that call `set`).
- In any component: `const colors = useThemeStore(s => s.colors)` subscribes to just that slice. If only `colors` changes, only components using it re-render.
- `set(...)` is like React's `setState` for the store.
- `get()` reads the current state inside an action.

`src/store/authStore.ts` is more advanced: it also runs async work (`hydrate`, `login`, `logout`) and persists tokens via a separate `authStorage` module.

#### React Query is also state

Every `useQuery` writes into a shared cache (created in `App.tsx` line 12). Two components calling `useCelebrities()` share one network request and one result. That is the magic.

### 2.5 API handling — interceptors explained

`src/services/api.ts` lines 34–103 is the smartest file in your project.

**Request interceptor** (runs before every outgoing request):

- If the URL isn't a public auth endpoint, it grabs the access token from storage and sets `Authorization: Bearer <token>`. Your screens never touch tokens.

**Response interceptor** (runs after every response):

- If status is 401 (expired token) and we haven't retried yet:
  1. Fire a single refresh call. Even if 10 requests fail at once, only one refresh happens (that's the `refreshPromise` pattern).
  2. When the new access token arrives, replay the original request with it.
  3. If the refresh itself fails, wipe storage and log the user out.

**Why "single-flight"?** Imagine Home loads 3 queries in parallel and all 3 get 401 because the token just expired. Without single-flight, you'd fire 3 refresh calls and confuse the server. The `if (!refreshPromise)` check + `refreshPromise = null` in `.finally()` guarantees exactly one refresh.

**Error handling** — `api.ts` lines 109–151: `extractApiError` converts any messy error shape (offline, 429, HTML error page, backend validation array) into one user-readable string.

**Loading / error states in the UI** — each `useQuery` returns `{ data, isLoading, isError, error }`. Your screens handle these:

```tsx
{bannersLoading ? <LoadingState height={180} /> : <FeaturedBannerCarousel .../>}
```

### 2.6 Component design — reusability and separation of concerns

**Three levels of components in your app:**

1. **UI primitives** — `src/components/ui/`: `LoadingState`, `ErrorState`, `SectionHeader`, `ScreenWrapper`. These know nothing about your domain. Drop them into any app.
2. **Layout** — `src/components/layout/`: `SideMenu`, `TopNavBar`. App-wide chrome.
3. **Feature components** — `features/<x>/components/`: `ArticleCard`, `ForumCard`, `VideoGridCard`. Tied to one domain.

**"Separation of concerns"** in your code = a screen just composes things.

`HomeScreen.tsx` lines 99–130 — `HomeScreen` doesn't know how a banner is drawn, how articles are fetched, or how the stories strip works. It just arranges `<StoriesStrip/>`, `<FeaturedBannerCarousel/>`, `<CategoryChips/>`, `<ArticleCard/>` etc. Each child does one thing.

**Reusability example.** `<ArticleCard article={item} onPress={handle} />` is used in HomeScreen, NewsScreen, CategoryFeedScreen. It receives data via props and fires `onPress`. It doesn't know *where* it lives — that's what makes it reusable.

### 2.7 Folder structure — why it's designed this way

The rule is: **group by feature, not by file type.**

**Bad (by file type):**

```
components/ (500 files)
hooks/      (200 files)
screens/    (80 files)
```

When you edit the "videos" feature, you ping-pong across three folders.

**Good (your layout, by feature):**

```
features/videos/
  screens/VideoDetailScreen.tsx
  components/VideoPlayer.tsx
  hooks/useVideoDetails.ts
```

Everything about videos is in one place. Delete the folder → remove the feature. This is called **locality of behavior**.

Exceptions that *do* live at the top of `src/`: things shared across features (theme, navigation shell, API client, global stores, UI primitives).

---

## Step 3 — Core Concepts You Must Learn

Roadmap in the order you should learn. Every item shows where it appears in **your** code.

### Foundation

#### JavaScript

- **Closures** — a function "remembering" variables from where it was defined. Seen in `api.ts` lines 48–92 where `refreshPromise` is captured by the interceptor.
- **Promises & async/await** — every API call is async. Study `finalizeSession` in `authStore.ts` lines 56–82.
- **Destructuring & spread** — `{ data, isLoading }`, `{ ...prev, ...patch }`. Everywhere.
- **Array methods** — `.map`, `.filter`, `.slice`, `.flat`. Used in every list.
- **Optional chaining / nullish coalescing** — `anyErr?.response?.data`, `value ?? fallback`. `api.ts` lines 115–116.

#### TypeScript basics

- **Type aliases & interfaces** — `type AuthState = {...}` in `authStore.ts` line 37.
- **Generics** — `createNativeStackNavigator<RootStackParamList>()`. The `<...>` tells the navigator what routes exist.
- **Utility types** — `Partial<StoredUser>`, `Record<string, string>`, `keyof X`. All used in `types.ts` and `themeStore.ts`.
- **Type narrowing** — `if (axios.isAxiosError(err))` in `App.tsx` line 17.

### Frontend (React Native)

- **Components & props** — Study `src/features/home/components/ArticleCard.tsx` as your canonical example.
- **`useState` / `useEffect`** — `useState` holds local state (`HomeScreen.tsx` line 35); `useEffect` runs side effects (`RootNavigator.tsx` lines 21–23 calls `hydrate()` once on mount).
- **`useMemo` / `useCallback`** — Prevent recomputing expensive values or re-creating functions on every render. You use both in HomeScreen.
- **Navigation** — `useNavigation<...>()`, `navigation.navigate(...)`. Learn the native-stack → bottom-tabs distinction.
- **Styling** — You use three styles: StyleSheet (`makeStyles(colors)`), NativeWind (Tailwind classes via `className`), and inline styles. Pick one main style per component.
- **Lists at scale** — `FlashList` vs `FlatList`. FlashList needs an `estimatedItemSize` prop for best perf; check whether you're passing it.

### Intermediate

- **React Query** — `useQuery` keys, `staleTime`, `placeholderData`, invalidation via `queryClient.invalidateQueries`. You have all the basic patterns already.
- **Axios interceptors** — request/response pipelines. `api.ts` is your textbook.
- **Error handling in UI** — loading spinners, error states, empty states. You have `LoadingState` / `ErrorState` primitives — use them consistently.
- **Performance** — `React.memo` for pure list items, stable keys in lists, don't inline fresh objects as props (e.g. `style={{ marginTop: 8 }}` causes re-renders; use StyleSheet).
- **Reusable components** — learn the "data in via props, events out via callbacks" rule.

### Advanced (actually used here)

- **Feature-based architecture** — already live in `features/`.
- **Single-flight refresh / mutex patterns** — your interceptor.
- **Persisted state** — MMKV-backed Zustand (`themeStore.ts` line 32).
- **Imperative modal from anywhere** — `useSideMenuStore.getState().open()` (`HomeScreen.tsx` line 159) is the "grab state outside React" escape hatch.
- **Typed navigation with nested navigators** — `navigation/types.ts` + `NativeStackNavigationProp<HomeStackParamList>`.

---

## Step 4 — Gap Analysis

Ordered by payoff. Fix top-down.

1. **Break up `services/api.ts`.** It's too big. Create `services/articlesApi.ts`, `videosApi.ts`, `galleriesApi.ts`, etc. Keep the shared axios client and `extractApiError` in `api.ts`. Category maps move to `features/<x>/utils/categories.ts`.
2. **Delete the `.bak` files** in your working tree. Git is your backup.
3. **Type your API responses.** Start with one endpoint: write `type ArticleListResponse = { ... }`. No more `any` in transformers.
4. **Add an `ErrorBoundary`** around `<RootNavigator />` in `App.tsx`. One crash shouldn't kill the app.
5. **Wire error states consistently.** Every screen with `isLoading` should also handle `isError`. Right now many only show loading.
6. **Move static data to the API.** `galleries.ts`, `webStories.ts` → real endpoints.
7. **Consolidate styling choices.** You have NativeWind + StyleSheet + inline styles. Pick a primary convention. For a learner, stick with `StyleSheet.create` + theme tokens — it's clearer.
8. **Add a basic test** for one pure function (`extractApiError`, `formatCount`, `timeAgo`). You have Jest configured but unused.
9. **Understand every line of `api.ts` interceptor.** If you can't explain the `refreshPromise` single-flight to someone else, you don't own this file yet.
10. **Understand the difference between server state and client state.** If you can recite "React Query = server, Zustand = client, useState = local UI" in your sleep, you're ready.

---

## Step 5 — Rebuild Strategy

How to rebuild this app from scratch, broken into learnable phases. Each phase produces a runnable app.

### Phase 0 — Setup (1 day)

- Install Node, Git, Expo CLI.
- `npx create-expo-app mobile --template blank-typescript`.
- Add React Navigation, then Zustand, then React Query, then Axios. One library per commit so you see what each adds.
- Practice: run the app on your phone with Expo Go.

### Phase 1 — Navigation shell (2 days)

- Build the RootNavigator → MainTabNavigator skeleton with empty screens.
- Type every route in `navigation/types.ts`.
- Practice task: navigate from Home → a fake "ArticleDetail" and back. Pass params.

### Phase 2 — Theme + stores (2 days)

- Build `theme/tokens.ts` with light + dark palettes.
- Build `themeStore.ts`. Add a toggle button on one screen. Watch colors swap across the whole app.
- Practice: persist the chosen theme with MMKV.

### Phase 3 — API layer (3 days)

- Create `services/api.ts` with just an axios client.
- Add ONE endpoint (`fetchArticles`). Render the result in HomeScreen with plain `useState` + `useEffect`.
- Practice: handle loading, error, empty states manually.

### Phase 4 — React Query (2 days)

- Replace your manual `useEffect` fetch with `useQuery`. Notice how much code disappears.
- Add `staleTime`, observe caching by switching tabs.
- Practice: add a second endpoint (`fetchBanners`), memorize the pattern.

### Phase 5 — Auth flow (4 days)

- Build `authStore.ts` with `login` / `logout` / `hydrate`.
- Add `authStorage` using `expo-secure-store` for refresh tokens.
- Add request interceptor to attach `Authorization`.
- Add response interceptor with **single-flight refresh**. This is the hardest part — study your own `api.ts` line by line.
- Practice: force a token expiry, watch a request auto-refresh.

### Phase 6 — First real feature (1 week)

- Pick ONE domain (say "Videos"). Build its full slice: `features/videos/{screens,components,hooks,utils}`.
- List screen → detail screen → related list.
- Practice: reuse no code from your current repo; re-derive every pattern.

### Phase 7 — Reusable UI kit (ongoing)

- As you repeat patterns, extract them to `components/ui/`: `LoadingState`, `ErrorState`, `SectionHeader`, `ScreenWrapper`.
- Rule: if you write it twice, extract it.

### Phase 8 — Polish (ongoing)

- ErrorBoundary.
- Pull-to-refresh (`useQuery` + `refetch`).
- Skeletons instead of spinners.
- Analytics / basic perf monitoring.

### Weekly practice tasks (short, high-yield)

1. Add a "favorites" feature — requires server state (list) + client state (optimistic toggle).
2. Add a search bar that debounces input 300ms before querying.
3. Add paginated articles with `useInfiniteQuery`.
4. Replace a Zustand store with React Context — feel the difference.
5. Write a unit test for `extractApiError` covering offline, 429, 4xx, 5xx.

---

## One paragraph to carry in your head

Your app is a **provider stack around a typed navigator**. Navigation decides screens. Screens call **React Query hooks** for server data and **Zustand** for client data. Hooks call **service functions**, which use **one axios client** with interceptors that handle auth. Components are dumb — data in, events out. Folders are organized **by feature** so each domain is self-contained. Master that sentence and the code review you do on yourself every day will teach you the rest.

---

## Deep-dive candidates (pick one and ask)

- The auth interceptor (`api.ts`) — every line explained.
- React Query caching rules — keys, `staleTime`, invalidation, refetch.
- FlashList internals and why it's faster than FlatList.
- Rebuilding the Videos feature from scratch, step by step.
- Zustand vs Context vs Redux — which to reach for and when.
