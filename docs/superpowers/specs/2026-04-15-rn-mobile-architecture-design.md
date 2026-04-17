# IndiaForums — React Native Mobile App Architecture
**Date:** 2026-04-15  
**Stack:** React Native (TypeScript) + Expo Bare Workflow  
**State:** Zustand (client) + TanStack Query (server)  
**Navigation:** React Navigation v7  
**Styling:** NativeWind v4 (Tailwind syntax on RN)

---

## Table of Contents

1. [Full Project Analysis](#1-full-project-analysis)
2. [Mobile Architecture Design](#2-mobile-architecture-design)
3. [Feature Mapping — Web to Mobile](#3-feature-mapping--web-to-mobile)
4. [UI/UX Strategy](#4-uiux-strategy)
5. [Tech Stack Decisions](#5-tech-stack-decisions)
6. [Codebase Setup Plan](#6-codebase-setup-plan)
7. [Implementation Roadmap](#7-implementation-roadmap)
8. [Best Practices](#8-best-practices)
9. [Production Readiness — Millions of Users](#9-production-readiness--millions-of-users)

---

## 1. Full Project Analysis

### 1.1 What Exists

The web prototype is a React 19 + Vite app that renders inside a `PhoneShell` component simulating an iPhone in the browser. It is not a typical web app — it was architected from day one as a mobile-first simulation, which makes the RN migration unusually clean.

#### Navigation Model
Navigation is a custom `useReducer`-based state machine (`useAppNavigation.js`). No router library. A priority waterfall of `if/else` blocks in `App.jsx` decides which screen renders. This will be replaced 1:1 by React Navigation stacks.

**Bottom tabs (current):**
| Tab | Screen |
|-----|--------|
| Explore | Home feed, banners, articles, galleries, forum threads |
| News | News feed with category filter |
| Forums | Forum list → topic list → thread detail |
| Search | Full-text search |
| My Space | Profile, messages, activities, settings |

**Stack screens (pushed over tabs):**
ArticleScreen, GalleryScreen, GalleryDetailScreen, VideoScreen, VideoDetailScreen, CelebrityDetailScreen, FanFictionScreen, FanFictionDetailScreen, ChapterReaderScreen, FanFictionAuthorsScreen, AuthorFollowersScreen, QuizzesScreen, ShortsScreen, WebStoriesScreen + WebStoryPlayer, TopicDetailScreen, ProfileScreen, ComposeScreen, ReplyComposerSheet, TagDetailScreen

#### API Layer
25 service modules, all built on a single Axios instance (`services/api.js`) with:
- `api-key` header on every request
- `Authorization: Bearer <accessToken>` for authenticated routes
- Silent JWT refresh on 401 (single in-flight refresh promise, retry original request)
- Public path bypass list for auth endpoints

**Service inventory:**
```
api.js               — Axios base + interceptors
authApi.js           — login, register, refresh, logout, external login
userProfileApi.js    — profile read/update, follow, fans
homeApi.js           — /home/initial, /home/articles
categoryApi.js       — category list
forumsApi.js         — topics CRUD, replies, reactions, polls
commentsApi.js       — article/video comments
fanFictionsApi.js    — stories list, detail, chapters, authors
quizzesApi.js        — quiz list, detail, submit
shortsApi.js         — shorts feed
webStoriesApi.js     — web stories list + detail
messagesApi.js       — inbox, threads, compose, folders
notificationsApi.js  — notification list, mark read
buddiesApi.js        — buddy list, requests
activitiesApi.js     — activity feed
searchApi.js         — global search
moviesApi.js         — movie profiles
showsApi.js          — show profiles
uploadsApi.js        — file upload
devicesApi.js        — push device registration
externalMediaApi.js  — external media embeds
helpCenterApi.js     — FAQ / support
tokenStorage.js      — localStorage access/refresh token store
socialAuth.js        — Google/Apple social auth helpers
```

#### Data Fetching Pattern
`useApiQuery(fetcher, deps, options)` — a minimal hook providing `{ data, loading, error, refetch, setData }`. This maps directly to TanStack Query's `useQuery`. Every feature hook (`useHomeData`, `useFanFictions`, `useShorts`, `useQuizzes`, etc.) wraps `useApiQuery`.

#### Auth Context
`AuthContext` provides `{ user, isAuthenticated, isModerator, isLoading, login, register, externalLogin, logout, updateUser }`. Token hydration on mount via refresh endpoint. Group-based moderator detection (groupIds 3–6).

#### Component Library
```
cards/    — ArticleCard, FeaturedCard, NewsHorizontalCard, NewsVerticalCard, ThreadCard, TopicCard
layout/   — TopNav, BottomNav, SideDrawer (all web-only, will be replaced by RN Navigation)
sections/ — PhotoGallerySection, QuizSection, VideoSection, VisualStoriesSection
strips/   — StoriesStrip, FeaturedCarousel, ChipsRow, CategoryBar, LanguageBar
ui/       — SectionHeader, CarouselDots, StoryItem, LoadingState, ErrorState, EmptyState, SocialEmbed
stories/  — WebStoriesStrip, WebStoryPlayer, normalize.js
forum/    — NewTopicComposer, ReplyComposerSheet, ReactionsSheet, AdminPanel
auth/     — AuthGate
```

#### Design Token System
Brand: `#3558F0` (blue), `#F5F6F7` (bg), `#1A1A1A` (text), `#C8001E` (editorial red). Full token set covers surfaces, borders, feedback colors (success/error/amber/live), and typography. Maps to a Tailwind theme extension in NativeWind.

---

### 1.2 What Ports to Mobile Unchanged

| Layer | Portability | Notes |
|-------|-------------|-------|
| All 25 service modules | 100% | Axios works in RN. Change `localStorage` → `expo-secure-store` |
| `useApiQuery` pattern | 100% → TanStack Query | Direct upgrade, same mental model |
| AuthContext | 95% | Replace `localStorage` tokens with `expo-secure-store` |
| Business logic in hooks | 100% | Pure JS, no DOM dependency |
| Data models / type shapes | 100% | Add TypeScript interfaces |
| Design tokens | 100% | Re-express as NativeWind theme config |
| Quiz, FanFiction, Forum logic | 100% | No DOM dependencies |

### 1.3 What Must Be Rewritten

| Layer | Reason |
|-------|--------|
| All JSX / CSS Modules | RN uses StyleSheet / NativeWind, no `<div>` |
| Navigation | `useReducer` state machine → React Navigation |
| `PhoneShell`, `DynamicIsland`, `StatusBar` | Web-only simulator chrome, not needed |
| `tokenStorage.js` (localStorage) | Must use `expo-secure-store` |
| `socialAuth.js` | Must use `expo-auth-session` or `@react-native-google-signin` |
| Inline SVG icons | Must use `react-native-svg` or icon libraries |
| `SocialEmbed` (iframes) | Use `react-native-webview` for embeds |

### 1.4 Problems / Improvements to Carry Forward

| Issue | Fix in Mobile |
|-------|---------------|
| `App.jsx` priority waterfall (140+ lines) | React Navigation handles this declaratively |
| No pagination/infinite scroll | TanStack Query `useInfiniteQuery` + `FlatList` |
| Static mock data mixed with real API calls | Clean split: all data from API, no static files |
| No global error/retry boundary | TanStack Query + error boundary components |
| Forum navigation state duplicated between topics/threads | Clean stack-based navigation |
| `useApiQuery` has no caching | TanStack Query with `staleTime` per feature |

---

## 2. Mobile Architecture Design

### 2.1 Folder Structure

```
src/
├── app/                          # App entry, navigation root
│   ├── index.tsx                 # Expo entry point
│   ├── RootNavigator.tsx         # Auth gate + tab/stack router
│   └── linking.ts                # Deep link config
│
├── features/                     # One folder per product feature
│   ├── home/
│   │   ├── screens/
│   │   │   └── HomeScreen.tsx
│   │   ├── components/
│   │   │   ├── FeaturedBannerCarousel.tsx
│   │   │   ├── ArticleCard.tsx
│   │   │   └── CategoryChips.tsx
│   │   ├── hooks/
│   │   │   └── useHomeData.ts
│   │   └── types.ts
│   │
│   ├── news/
│   │   ├── screens/
│   │   │   ├── NewsScreen.tsx
│   │   │   └── ArticleScreen.tsx
│   │   ├── components/
│   │   │   ├── NewsCard.tsx
│   │   │   └── ArticleBody.tsx
│   │   ├── hooks/
│   │   │   └── useNews.ts
│   │   └── types.ts
│   │
│   ├── forums/
│   │   ├── screens/
│   │   │   ├── ForumsScreen.tsx
│   │   │   ├── ForumListScreen.tsx
│   │   │   ├── TopicListScreen.tsx
│   │   │   └── TopicDetailScreen.tsx
│   │   ├── components/
│   │   │   ├── ThreadCard.tsx
│   │   │   ├── PostItem.tsx
│   │   │   ├── ReactionsBar.tsx
│   │   │   ├── ReplyComposer.tsx
│   │   │   └── PollCard.tsx
│   │   ├── hooks/
│   │   │   ├── useForumTopics.ts
│   │   │   └── useTopicPosts.ts
│   │   └── types.ts
│   │
│   ├── fanfiction/
│   │   ├── screens/
│   │   │   ├── FanFictionScreen.tsx
│   │   │   ├── FanFictionDetailScreen.tsx
│   │   │   ├── ChapterReaderScreen.tsx
│   │   │   ├── FanFictionAuthorsScreen.tsx
│   │   │   └── AuthorFollowersScreen.tsx
│   │   ├── components/
│   │   │   ├── StoryCard.tsx
│   │   │   ├── ChapterList.tsx
│   │   │   └── AuthorCard.tsx
│   │   ├── hooks/
│   │   │   └── useFanFictions.ts
│   │   └── types.ts
│   │
│   ├── quizzes/
│   │   ├── screens/
│   │   │   ├── QuizzesScreen.tsx
│   │   │   ├── QuizPlayerScreen.tsx
│   │   │   ├── QuizResultScreen.tsx
│   │   │   └── QuizLeaderboardScreen.tsx
│   │   ├── components/
│   │   │   ├── QuizCard.tsx
│   │   │   ├── OptionButton.tsx
│   │   │   └── ProgressBar.tsx
│   │   ├── hooks/
│   │   │   └── useQuizzes.ts
│   │   └── types.ts
│   │
│   ├── shorts/
│   │   ├── screens/
│   │   │   └── ShortsScreen.tsx
│   │   ├── components/
│   │   │   └── ShortCard.tsx
│   │   ├── hooks/
│   │   │   └── useShorts.ts
│   │   └── types.ts
│   │
│   ├── webstories/
│   │   ├── screens/
│   │   │   ├── WebStoriesScreen.tsx
│   │   │   └── WebStoryPlayerScreen.tsx
│   │   ├── components/
│   │   │   ├── StoryThumbnail.tsx
│   │   │   └── StorySlide.tsx
│   │   ├── hooks/
│   │   │   └── useWebStories.ts
│   │   └── types.ts
│   │
│   ├── galleries/
│   │   ├── screens/
│   │   │   ├── GalleriesScreen.tsx
│   │   │   └── GalleryDetailScreen.tsx
│   │   ├── components/
│   │   │   └── GalleryGrid.tsx
│   │   ├── hooks/
│   │   │   └── useGalleries.ts
│   │   └── types.ts
│   │
│   ├── videos/
│   │   ├── screens/
│   │   │   ├── VideosScreen.tsx
│   │   │   └── VideoDetailScreen.tsx
│   │   ├── components/
│   │   │   ├── VideoCard.tsx
│   │   │   └── VideoPlayer.tsx
│   │   ├── hooks/
│   │   │   └── useVideos.ts
│   │   └── types.ts
│   │
│   ├── celebrities/
│   │   ├── screens/
│   │   │   ├── CelebritiesScreen.tsx
│   │   │   └── CelebrityDetailScreen.tsx
│   │   ├── components/
│   │   │   └── CelebCard.tsx
│   │   ├── hooks/
│   │   │   └── useCelebrities.ts
│   │   └── types.ts
│   │
│   ├── search/
│   │   ├── screens/
│   │   │   └── SearchScreen.tsx
│   │   ├── components/
│   │   │   └── SearchResultCard.tsx
│   │   ├── hooks/
│   │   │   └── useSearch.ts
│   │   └── types.ts
│   │
│   ├── myspace/
│   │   ├── screens/
│   │   │   ├── MySpaceScreen.tsx
│   │   │   ├── ProfileScreen.tsx
│   │   │   ├── AccountSettingsScreen.tsx
│   │   │   ├── NotificationsScreen.tsx
│   │   │   ├── ActivitiesScreen.tsx
│   │   │   ├── DevicesScreen.tsx
│   │   │   └── HelpCenterScreen.tsx
│   │   ├── components/
│   │   │   └── SettingsRow.tsx
│   │   ├── hooks/
│   │   │   └── useMySpace.ts
│   │   └── types.ts
│   │
│   ├── messages/
│   │   ├── screens/
│   │   │   ├── InboxScreen.tsx
│   │   │   ├── ThreadScreen.tsx
│   │   │   ├── ComposeScreen.tsx
│   │   │   └── FoldersScreen.tsx
│   │   ├── components/
│   │   │   └── MessageBubble.tsx
│   │   ├── hooks/
│   │   │   └── useMessages.ts
│   │   └── types.ts
│   │
│   └── auth/
│       ├── screens/
│       │   ├── LoginScreen.tsx
│       │   ├── RegisterScreen.tsx
│       │   ├── ForgotPasswordScreen.tsx
│       │   ├── ResetPasswordScreen.tsx
│       │   └── VerifyEmailScreen.tsx
│       ├── hooks/
│       │   └── useAuth.ts
│       └── types.ts
│
├── navigation/
│   ├── RootNavigator.tsx          # Auth gate → Auth stack OR Main tabs
│   ├── MainTabNavigator.tsx       # 5 bottom tabs
│   ├── HomeStack.tsx
│   ├── NewsStack.tsx
│   ├── ForumsStack.tsx
│   ├── SearchStack.tsx
│   ├── MySpaceStack.tsx
│   └── types.ts                   # RootStackParamList, TabParamList, etc.
│
├── services/                      # API layer — direct port from web
│   ├── api.ts                     # Axios instance + interceptors
│   ├── tokenStorage.ts            # expo-secure-store wrapper
│   ├── authApi.ts
│   ├── homeApi.ts
│   ├── forumsApi.ts
│   ├── fanFictionsApi.ts
│   ├── quizzesApi.ts
│   ├── shortsApi.ts
│   ├── webStoriesApi.ts
│   ├── messagesApi.ts
│   ├── notificationsApi.ts
│   ├── userProfileApi.ts
│   ├── searchApi.ts
│   ├── uploadsApi.ts
│   └── ... (remaining 10 services)
│
├── store/                         # Zustand — client-only global state
│   ├── authStore.ts               # user, isAuthenticated, isModerator
│   ├── uiStore.ts                 # theme (dark/light), drawer open, active tab
│   └── notificationsStore.ts     # unread badge count
│
├── components/                    # Shared cross-feature UI
│   ├── cards/
│   │   └── ArticleCard.tsx        # if used across news + home
│   ├── ui/
│   │   ├── SectionHeader.tsx
│   │   ├── LoadingState.tsx
│   │   ├── ErrorState.tsx
│   │   ├── EmptyState.tsx
│   │   ├── BottomSheet.tsx        # reusable sheet wrapper
│   │   ├── Badge.tsx
│   │   └── Avatar.tsx
│   └── layout/
│       ├── ScreenWrapper.tsx      # safe area + bg color
│       └── Divider.tsx
│
├── hooks/                         # App-wide hooks
│   ├── useDebounce.ts
│   ├── useInfiniteScroll.ts       # thin wrapper over useInfiniteQuery
│   └── usePushNotifications.ts
│
├── theme/
│   ├── colors.ts                  # Design token constants (maps from tokens.css)
│   ├── typography.ts              # Font sizes, weights, line heights
│   ├── spacing.ts                 # 4px base scale
│   └── index.ts                   # Combined theme export + NativeWind theme config
│
├── types/
│   ├── api.ts                     # Shared API response envelopes
│   ├── navigation.ts              # RootStackParamList, all param types
│   └── common.ts                  # Pagination, user, media types
│
└── utils/
    ├── formatDate.ts              # Indian date formats (en-IN locale)
    ├── formatCount.ts             # K / L / Cr number formatting
    ├── extractApiError.ts         # Port from api.js
    └── imageUri.ts                # CDN URL builders
```

---

### 2.2 Navigation Architecture

```
RootNavigator
├── AuthStack (when authState === 'unauthenticated' AND user tapped sign in)
│   ├── LoginScreen
│   ├── RegisterScreen
│   ├── ForgotPasswordScreen
│   ├── ResetPasswordScreen
│   └── VerifyEmailScreen
│
├── GuestStack (when authState === 'guest' — default on first open)
│   ├── HomeScreen       ← read-only, no compose/react
│   ├── NewsScreen
│   ├── ArticleScreen
│   ├── GalleryScreen    ← read-only
│   └── LoginPromptSheet ← bottom sheet on any write action
│
│   RATIONALE: Millions of users means a significant portion will not sign in
│   immediately. Forcing auth before seeing content kills retention. Let users
│   browse freely; gate write actions (reply, react, compose) behind a
│   non-blocking LoginPromptSheet that converts to AuthStack on confirm.
│
└── MainTabNavigator (when isAuthenticated)
    ├── HomeStack (Tab: Explore)
    │   ├── HomeScreen
    │   ├── ArticleScreen
    │   ├── GalleriesScreen
    │   ├── GalleryDetailScreen
    │   ├── VideoScreen        ← shared entry point
    │   ├── VideoDetailScreen
    │   ├── CelebritiesScreen
    │   ├── CelebrityDetailScreen
    │   ├── FanFictionScreen
    │   ├── FanFictionDetailScreen
    │   ├── ChapterReaderScreen
    │   ├── FanFictionAuthorsScreen
    │   ├── AuthorFollowersScreen
    │   ├── QuizzesScreen
    │   ├── WebStoriesScreen
    │   ├── TagDetailScreen
    │   └── ProfileScreen      ← navigated to from post headers
    │
    ├── NewsStack (Tab: News)
    │   ├── NewsScreen
    │   └── ArticleScreen
    │
    ├── ForumsStack (Tab: Forums)
    │   ├── ForumsScreen       ← home (forum list)
    │   ├── ForumListScreen    ← drilled forum
    │   ├── TopicListScreen
    │   └── TopicDetailScreen
    │
    ├── SearchStack (Tab: Search)
    │   ├── SearchScreen
    │   ├── ArticleScreen
    │   └── ProfileScreen
    │
    └── MySpaceStack (Tab: My Space)
        ├── MySpaceScreen
        ├── ProfileScreen
        ├── AccountSettingsScreen
        ├── NotificationsScreen
        ├── ActivitiesScreen
        ├── InboxScreen
        ├── ThreadScreen
        ├── ComposeScreen
        ├── FoldersScreen
        ├── DevicesScreen
        └── HelpCenterScreen

Modal Screens (presented over any tab):
├── ShortsScreen              ← full-screen vertical swipe feed
├── WebStoryPlayerScreen      ← full-screen story viewer
├── QuizPlayerScreen          ← full-screen quiz overlay
├── QuizResultScreen
├── ReplyComposerSheet        ← bottom sheet
├── ReactionsSheet            ← bottom sheet
└── NewTopicComposerSheet     ← bottom sheet / full screen
```

**Key decision:** Shorts, WebStoryPlayer, and QuizPlayer are presented as modals (`presentation: 'fullScreenModal'`) because they're immersive full-screen experiences that must overlay everything, exactly as the web prototype does.

---

### 2.3 State Management Split

| What | Where | Why |
|------|-------|-----|
| Authenticated user, tokens | Zustand `authStore` | Needs to be read by API layer and any component |
| Dark/light theme | Zustand `uiStore` | App-wide, rarely changes |
| Unread notification count | Zustand `notificationsStore` | Drives tab badge |
| Server data (articles, threads, stories…) | TanStack Query | Caching, stale-time, pagination |
| Navigation state | React Navigation | Its own context, do not duplicate |
| Local UI state (selected tab in quiz, expanded section) | `useState` inside component | No reason to lift out |
| Form state | `react-hook-form` local state | Isolated to form component |

---

### 2.4 Data Flow

```
Screen mounts
  → useQuery(queryKey, () => service.fetch(), { staleTime })
    → if cached + fresh: return immediately (no spinner)
    → if stale: return cached, refetch in background
    → if empty: fetch, show skeleton
  → on success: renders FlatList / component tree
  → on error: <ErrorState onRetry={refetch} />
  → on user action (reply, react): useMutation → onSuccess invalidates queryKey
```

---

## 3. Feature Mapping — Web to Mobile

### 3.1 Home / Explore Feed

**Web:** `ExploreScreen` — StoriesStrip + FeaturedCarousel + ChipsRow + ArticleCard list + PhotoGallerySection + forum threads. Single `useHomeData` hook calling `/home/initial` then `/home/articles?articleType=`.

**Mobile UX:** Same structure, mapped to native primitives.

**Screens:**
- `HomeScreen` — main feed

**Components:**
```
StoriesStrip          → horizontal FlatList of circular story avatars (120px tap targets)
FeaturedBannerCarousel→ PagerView (native swipe) + dot indicators
CategoryChips         → horizontal FlatList, pill buttons, sticky below header
ArticleCard           → Image + headline + meta row (source, time, category badge)
PhotoGallerySection   → 2-column FlashList grid with "See All" header
ForumThreadsSection   → 3 ThreadCard rows, vertical list
```

**API:** `homeApi.getInitial()`, `homeApi.getArticles({ articleType })`

**TanStack Query:**
```ts
useQuery({ queryKey: ['home', 'banners'], queryFn: homeApi.getInitial, staleTime: 5 * 60_000 })
useQuery({ queryKey: ['home', 'articles', category], queryFn: () => homeApi.getArticles({ articleType: category }) })
```

**Performance:** FlatList with `initialNumToRender={5}`, `maxToRenderPerBatch={8}`. Banner images preloaded via `expo-image` `prefetch`. Category chip change triggers new query (cached after first fetch).

---

### 3.2 News Feed + Article Detail

**Web:** `NewsScreen` with category bar + vertical NewsCard list. `ArticleScreen` renders full article body with related articles, tags, comments, social embeds.

**Screens:**
- `NewsScreen` — paginated feed
- `ArticleScreen` — detail, push from any screen

**Components:**
```
NewsCard        → full-width card (image top, headline, meta below)
ArticleBody     → ScrollView with RenderHTML for article body
CommentsSection → nested FlatList of comments with pagination
TagChip         → navigates to TagDetailScreen
RelatedArticles → horizontal FlatList at bottom
```

**API:** `homeApi.getArticles({ page, articleType })`, `commentsApi.getComments({ articleId, page })`  
**Pagination:** `useInfiniteQuery` + `FlatList.onEndReached`  
**Social embeds:** `react-native-webview` for Twitter/Instagram iframes (replaces `SocialEmbed`)

---

### 3.3 Web Stories

**Web:** `WebStoriesStrip` (avatar row) → `WebStoriesScreen` (grid) → `WebStoryPlayer` (full-screen immersive viewer with slide progress bars, swipe between stories, tap left/right to advance).

**Mobile UX:** The web player already behaves identically to Instagram Stories. Map directly.

**Screens:**
- `WebStoriesScreen` — grid of story thumbnails
- `WebStoryPlayerScreen` — modal, full-screen

**Components:**
```
StoryThumbnail    → circle avatar + title + seen ring
StorySlide        → full-screen image/video + progress bar strip
StoryProgressBar  → Animated.View width driven by timer
```

**Gestures:** `react-native-gesture-handler` — tap left half → prev slide, tap right half → next slide, swipe down → close (via `PanGestureHandler`).

**Navigation:** Presented as `fullScreenModal`. Receives `{ stories: Story[], idx: number }` as params, matching the existing web API shape exactly.

---

### 3.4 Quizzes

**Web:** `QuizzesScreen` → `QuizDetailSheet` (bottom sheet) → `QuizPlayer` (full-screen overlay) → `QuizResult` → `QuizLeaderboard`.

**Player types:**
- Trivia: one correct answer, correct/wrong feedback + reveal, countdown timer
- Personality: no correct answer, auto-advance after selection

**Mobile UX:** Everything already works as a full-screen modal on web. Map directly.

**Screens:**
- `QuizzesScreen` — list of quizzes with filter chips
- `QuizPlayerScreen` — modal (fullScreenModal)
- `QuizResultScreen` — pushed from player
- `QuizLeaderboardScreen` — pushed from result

**Components:**
```
QuizCard      → thumbnail + title + question count + difficulty badge
OptionButton  → pressable option row with correct/wrong color feedback (Animated)
ProgressBar   → question X of Y
TimerBar      → animated countdown (replaces JS interval with Animated)
```

**Countdown Timer:** Use `Animated.timing` driven by a `useRef` interval — same logic as web, but animation is offloaded to native driver.

**API:** `quizzesApi.getQuizzes()`, `quizzesApi.getQuizDetail(id)`, `quizzesApi.submit({ answers })` — all port unchanged.

---

### 3.5 Shorts (Reels-style)

**Web:** `ShortsScreen` — vertical swipe feed of full-screen cards. Progress bar auto-advances, tap to pause/play, swipe up/down to navigate.

**Mobile UX:** This is a natural `FlatList` with `pagingEnabled` + `snapToInterval` on RN — far smoother than the web version.

**Screen:** `ShortsScreen` — modal (fullScreenModal)

**Components:**
```
ShortCard   → full-screen image + overlay (title, description, CTA button)
ProgressBar → thin strip at top, driven by Animated
```

**Implementation:**
```tsx
// onViewableItemsChanged MUST be defined outside the component or wrapped in useRef —
// React Native crashes if you pass a new function reference on every render.
const onViewableItemsChanged = useRef(({ viewableItems }: ViewableItemsChanged) => {
  const first = viewableItems[0];
  if (first?.isViewable) setActiveIndex(first.index ?? 0);
}).current;

const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

// Use FlashList (not FlatList) — Shorts is the most scroll-intensive list in the app.
// FlashList achieves 60fps by recycling item views natively; FlatList JS-thread recycling
// drops frames on mid-range Android devices (which is most of the Indian market).
<FlashList
  data={shorts}
  estimatedItemSize={SCREEN_HEIGHT}
  pagingEnabled
  snapToInterval={SCREEN_HEIGHT}
  decelerationRate="fast"
  showsVerticalScrollIndicator={false}
  renderItem={({ item, index }) => (
    <ShortCard short={item} isActive={index === activeIndex} />
  )}
  onViewableItemsChanged={onViewableItemsChanged}
  viewabilityConfig={viewabilityConfig}
/>
```

**Viewability:** `onViewableItemsChanged` (in a `useRef`) sets `activeIndex` → pauses timer on previous card, starts on new card. `useRef` wrapper is mandatory — passing an inline function causes "Cannot update a component from inside the function body of a different component" crash on Android.

---

### 3.6 Fan Fiction

**Web:** `FanFictionScreen` (list) → `FanFictionDetailScreen` (story detail with chapters, ratings, tags) → `ChapterReaderScreen` (full text reader) → `AuthorFollowersScreen`. Plus `FanFictionAuthorsScreen` (top authors).

**Mobile UX:** Chapter reader becomes a full-screen `ScrollView` with font size controls and reading progress indicator.

**Screens:**
- `FanFictionScreen` — browse/filter stories
- `FanFictionDetailScreen` — story detail, chapter list
- `ChapterReaderScreen` — full reader
- `FanFictionAuthorsScreen`
- `AuthorFollowersScreen`

**Components:**
```
StoryCard         → cover image + title + genre + rating badge + stats (reads, likes)
ChapterListItem   → chapter number + title + date + word count
ReaderContent     → ScrollView with selectable text, font size controls
AuthorCard        → avatar + name + story count + follow button
```

**Data:** `formatCount` (K/L/Cr), `formatDate` (en-IN) utils port unchanged from web.

---

### 3.7 Forums

**Web:** `ForumScreen` → drillable forum list → `TopicListScreen` (AllTopicsView / ForumListView) → `TopicDetailScreen` (thread with posts, reactions, quotes, admin panel, poll).

**Mobile UX:** Deepest feature in the app — 4 levels of navigation. Each level is a stack push.

**Screens:**
- `ForumsScreen` — forum categories
- `ForumListScreen` — topics in a forum
- `TopicDetailScreen` — posts in a topic

**Components:**
```
ForumCard       → forum title + description + topic/post counts
ThreadCard      → title + author + post count + last-reply date + pinned/locked badges
PostItem        → author avatar + content + reactions bar + quote + edit history
ReactionsBar    → emoji row with counts, tap to react (bottom sheet)
PollCard        → options with vote counts + bar chart, submit button
ReplyComposer   → bottom sheet with text input + formatting + quote preview
AdminPanel      → mod-only actions (pin, lock, move, delete) gated on isModerator
```

**Infinite scroll:** `useInfiniteQuery` for posts with `pageParam`, `FlatList.onEndReached` triggers `fetchNextPage`.

**Optimistic updates:** Post reactions use `useMutation` with `onMutate` optimistic update + `onError` rollback — gives instant UI feedback.

---

### 3.8 Search

**Web:** `SearchScreen` — unified search across articles, videos, galleries, users. Debounced input, tabbed results.

**Mobile UX:** Native `TextInput` with keyboard-aware layout. Results in tabbed `FlatList` (articles | videos | users | galleries).

**Screen:** `SearchScreen`

**Components:**
```
SearchBar         → TextInput + clear button + back arrow
ResultTabs        → top tab bar (articles / videos / users / galleries)
SearchResultCard  → unified card adapting to result type
```

**Debounce:** `useDebounce(query, 350)` → triggers `useQuery` when value settles.

---

### 3.9 Profile + My Space

**Web:** `MySpaceScreen` (hub) → `ProfileScreen` (cover banner, stats bar, rank pill, timeline) → Account settings, devices, activities, notifications.

**Screens:**
- `MySpaceScreen` — hub with avatar, quick stats, nav rows
- `ProfileScreen` — another user's profile
- `AccountSettingsScreen` — display name, username, email, password, status
- `NotificationsScreen`
- `ActivitiesScreen`
- `DevicesScreen`
- `HelpCenterScreen`
- `InboxScreen`, `ThreadScreen`, `ComposeScreen` — messaging

---

## 4. UI/UX Strategy

### 4.1 Component Translations

| Web Pattern | React Native Equivalent |
|-------------|------------------------|
| `<div>` scroll container | `<ScrollView>` or `<FlatList>` |
| CSS Grid 2-col | `<FlatList numColumns={2}>` |
| Horizontal scroll strip | `<FlatList horizontal showsHorizontalScrollIndicator={false}>` |
| Modal / overlay | `<Modal>` or React Navigation modal stack |
| Bottom sheet | `@gorhom/bottom-sheet` |
| `position: sticky` header | `<FlatList ListHeaderComponent>` + `stickyHeaderIndices` |
| CSS Modules animation | `Animated` API or `react-native-reanimated` |
| `<img>` | `<Image>` from `expo-image` (caching, blurhash) |
| `<video>` | `expo-video` |
| iframe embed | `react-native-webview` |
| SVG inline | `react-native-svg` |
| `onClick` | `onPress` on `<Pressable>` (with `android_ripple`) |
| Keyboard form | `KeyboardAvoidingView` + `ScrollView` |

### 4.2 Typography Scale
Map design tokens → NativeWind theme:
```
display     → 28px / bold
headline    → 18px / semibold
body        → 15px / regular
caption     → 12px / regular
label       → 11px / medium, uppercase, 0.5 letter-spacing
```
Font: `Roboto` via `expo-font` or system default (`-apple-system` / `Roboto`).

### 4.3 Touch Targets
All interactive elements minimum 44×44 pt (Apple HIG / Material). Category chips: `paddingVertical: 8, paddingHorizontal: 16`. Story avatars: 68px circle. Bottom tab icons: 48pt touch area.

### 4.4 Performance

**Images:**
- `expo-image` with `contentFit="cover"`, `placeholder={blurhash}`, `cachePolicy="memory-disk"`
- Thumbnail sizes: 400×300 (card), 800×450 (featured banner), 120×120 (avatar)

**Lists:**
- Always use `FlatList` or `FlashList` — never `ScrollView` + `.map()` for data lists
- `FlashList` (from Shopify) for galleries and shorts grid (significantly faster recycling)
- `initialNumToRender={5}`, `windowSize={5}`, `removeClippedSubviews={true}`

**Pagination:**
- `useInfiniteQuery` + `onEndReachedThreshold={0.3}` → fetch next page before user hits bottom
- Skeleton placeholders during first load (not spinners)

**Network:**
- TanStack Query `staleTime` per feature (home: 5 min, forums: 2 min, user profile: 10 min)
- `gcTime` (formerly cacheTime) 30 min — keeps data in memory when navigating back
- Axios request cancellation via `AbortController` on screen unmount

**Animations:**
- `useNativeDriver: true` on all `Animated` transforms and opacity
- `react-native-reanimated` for gesture-driven animations (Shorts swipe, Web Story swipe, bottom sheet)

---

## 5. Tech Stack Decisions

### Core
| Package | Choice | Reason |
|---------|--------|--------|
| Framework | **Expo Bare** | OTA updates (EAS Update), managed build infra, ~95% native API coverage, avoids raw Xcode/Android Studio for most work |
| Language | **TypeScript** strict mode | Catch API shape mismatches at compile time, document navigation params |
| Navigation | **React Navigation v7** | Industry standard, native stack driver, typed params |

### State
| Package | Choice | Reason |
|---------|--------|--------|
| Server state | **TanStack Query v5** | Direct upgrade of `useApiQuery`, adds caching/pagination/background refetch |
| Client state | **Zustand v5** | Zero boilerplate for auth + UI state; no providers needed |
| Forms | **React Hook Form** | Minimal re-renders, easy validation, replaces uncontrolled form state in auth screens |

### Styling
| Package | Choice | Reason |
|---------|--------|--------|
| Styling | **NativeWind v4** | Tailwind utility syntax maps cleanly from tokens.css. Design tokens become `tailwind.config.ts` extensions. Consistent with web conventions the team already knows. |
| Icons | **@expo/vector-icons** (MaterialIcons + Ionicons) | Ships with Expo, covers all UI needs. Supplement with `react-native-svg` for custom brand icons. |
| Animations | **react-native-reanimated v3** | Native-thread animations for Shorts, Stories, bottom sheets. Required by `@gorhom/bottom-sheet`. |
| Gestures | **react-native-gesture-handler** | Required by Reanimated + React Navigation. Swipe, pan, tap gestures for story player, shorts. |

### Media + Native
| Package | Choice | Reason |
|---------|--------|--------|
| Images | **expo-image** | Disk + memory caching, blurhash placeholder, progressive loading |
| Video | **expo-video** | Managed Expo package, covers video playback in VideoDetailScreen + Shorts |
| Web content | **react-native-webview** | For social embeds (Twitter/Instagram) in article body |
| Bottom sheets | **@gorhom/bottom-sheet** | Smooth gesture-driven sheets for reply composer, reactions, quiz detail |
| Push notifications | **expo-notifications** + `devicesApi` | Device registration already wired on web |
| Secure storage | **expo-secure-store** | Replaces `localStorage` for access/refresh tokens |
| Auth sessions | **expo-auth-session** | Google/Apple OAuth (replaces `socialAuth.js` web flow) |
| Pager | **react-native-pager-view** | Native ViewPager for featured banner carousel + web story slides |

### Storage
| Package | Choice | Reason |
|---------|--------|--------|
| Secure tokens | **expo-secure-store** | Keychain (iOS) / Keystore (Android) backed |
| Fast local data | **react-native-mmkv** | User prefs, recently viewed, draft state — 10× faster than AsyncStorage, synchronous reads |
| Large blobs | **AsyncStorage** | Only for data that doesn't fit MMKV (>1MB blobs); avoid for anything read frequently |

### Observability
| Package | Choice | Reason |
|---------|--------|--------|
| Crash reporting | **@sentry/react-native** | Mandatory for millions of users. Captures JS + native crashes, breadcrumbs, user context. Must init before any other code. |
| Analytics | **@react-native-firebase/analytics** | Screen views, content engagement, quiz completions, funnel tracking. Free tier covers millions of events. |
| Performance | Sentry Performance Tracing | API latency, screen load time, cold start tracking |
| Network state | **@react-native-community/netinfo** | Detect offline, show banners, skip background refetch when offline |

### Localization
| Package | Choice | Reason |
|---------|--------|--------|
| i18n | **i18next + react-i18next** | India has 22 official languages. Even if launch is English-only, build the string extraction layer now or you'll regret it at 10M users. Start with `en`, `hi`. |

### Dev Tools
| Package | Choice | Reason |
|---------|--------|--------|
| Build | **EAS Build** | Cloud builds for iOS + Android without local Xcode/Android Studio dependency |
| OTA updates | **EAS Update** | Ship JS fixes without app store review |
| Environment | `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_API_KEY`, `EXPO_PUBLIC_SENTRY_DSN` in `.env` | Never hardcode; `.env.development`, `.env.production` per environment |
| Testing | **Jest** + `@testing-library/react-native` + **Maestro** (E2E) | See Section 9 |
| CI/CD | **GitHub Actions** → EAS Build | See Section 9 |
| Linting | **ESLint** + `@typescript-eslint` + `eslint-plugin-react-native` | |
| Formatting | **Prettier** with `tailwindcss` plugin for class sorting | |

---

## 6. Codebase Setup Plan

### Step 1 — Initialize Expo Bare Project
```bash
# Create new project
npx create-expo-app@latest indiaforums-mobile --template bare-minimum
cd indiaforums-mobile

# Confirm bare workflow (has ios/ and android/ folders)
ls # → ios/  android/  src/  app.json  package.json
```

### Step 2 — TypeScript Configuration
```bash
# tsconfig.json is already present from bare template
# Tighten to strict mode:
```
```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

### Step 3 — Install Core Dependencies
```bash
# Navigation
npx expo install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs react-native-screens react-native-safe-area-context

# State
npx expo install @tanstack/react-query zustand react-hook-form

# Styling
npm install nativewind
npx expo install tailwindcss

# Gestures + Animations (required by navigation + sheets)
npx expo install react-native-gesture-handler react-native-reanimated

# Media
npx expo install expo-image expo-video react-native-webview react-native-pager-view

# Bottom sheets + icons
npm install @gorhom/bottom-sheet
npx expo install @expo/vector-icons react-native-svg

# Native services
npx expo install expo-secure-store expo-notifications expo-auth-session expo-web-browser

# HTTP client
npm install axios

# Fonts (expo-google-fonts — tree-shaken, only loads what you use)
npx expo install @expo-google-fonts/roboto @expo-google-fonts/roboto-condensed expo-font

# Splash screen
npx expo install expo-splash-screen

# Crash reporting + performance monitoring
npm install @sentry/react-native
npx expo install @sentry/react-native   # wires Sentry native modules

# Analytics
npx expo install @react-native-firebase/app @react-native-firebase/analytics
# OR: npm install @segment/analytics-react-native (if not using Firebase)

# Network state — offline detection
npx expo install @react-native-community/netinfo

# Fast local storage — user prefs, recently viewed (10× faster than AsyncStorage)
npm install react-native-mmkv

# High-performance lists (use over FlatList for gallery grids, search results, shorts)
npm install @shopify/flash-list

# Localization
npm install i18next react-i18next

# Image picker (for profile photo upload)
npx expo install expo-image-picker
```

### Step 4 — Tailwind / NativeWind Config
```bash
npx tailwindcss init
```
```js
// tailwind.config.js
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand:    '#3558F0',
        'brand-light': '#EBF0FF',
        bg:       '#F5F6F7',
        card:     '#FFFFFF',
        dark:     '#0D0D0D',
        text:     '#1A1A1A',
        text2:    '#5F5F5F',
        text3:    '#9E9E9E',
        border:   '#E2E2E2',
        red:      '#C8001E',
        green:    '#1A7A48',
        amber:    '#D97706',
        live:     '#16A34A',
      },
      fontFamily: {
        sans:     ['Roboto_400Regular', 'System'],
        medium:   ['Roboto_500Medium', 'System'],
        bold:     ['Roboto_700Bold', 'System'],
        headline: ['RobotoCondensed_700Bold', 'System'],
      },
    },
  },
  plugins: [],
};
```

### Step 5 — Create Folder Structure
```bash
mkdir -p src/{app,features,navigation,services,store,components/{cards,ui,layout},hooks,theme,types,utils}

# Feature folders
for f in home news forums fanfiction quizzes shorts webstories galleries videos celebrities search myspace messages auth; do
  mkdir -p src/features/$f/{screens,components,hooks}
done
```

### Step 6 — Port Service Layer
```bash
# Copy all 25 service files from web project, rename .js → .ts
# Two critical changes vs web:
# 1. tokenStorage.ts: localStorage (sync) → expo-secure-store (async)
# 2. api.ts interceptor: must read tokens synchronously — solved by an in-memory cache
```

**The async token problem:** The web `api.js` interceptor reads tokens with synchronous `localStorage`. Axios request interceptors cannot be `async`. The solution is a small in-memory token cache that `tokenStorage.ts` keeps warm — the interceptor reads from memory (sync), while `setTokens`/`clearAll` write through to SecureStore (async).

```ts
// src/services/tokenStorage.ts
import * as SecureStore from 'expo-secure-store';

// In-memory cache — lets the Axios interceptor read tokens synchronously
let _cache: { accessToken: string | null; refreshToken: string | null } = {
  accessToken: null, refreshToken: null,
};

const KEYS = { access: 'if_access', refresh: 'if_refresh', user: 'if_user' };

/** Call once at app boot (before any API calls) to warm the cache */
export const hydrateTokens = async () => {
  _cache.accessToken  = await SecureStore.getItemAsync(KEYS.access);
  _cache.refreshToken = await SecureStore.getItemAsync(KEYS.refresh);
};

/** Synchronous read — safe for Axios interceptors after hydrateTokens() */
export const getTokens = () => ({ ..._cache });

export const setTokens = async (access: string, refresh: string) => {
  _cache = { accessToken: access, refreshToken: refresh };
  await SecureStore.setItemAsync(KEYS.access,  access);
  await SecureStore.setItemAsync(KEYS.refresh, refresh);
};
export const clearAll = async () => {
  _cache = { accessToken: null, refreshToken: null };
  await SecureStore.deleteItemAsync(KEYS.access);
  await SecureStore.deleteItemAsync(KEYS.refresh);
  await SecureStore.deleteItemAsync(KEYS.user);
};
```

### Step 7 — Zustand Auth Store
```ts
// src/store/authStore.ts
import { create } from 'zustand';

interface User { userId: number; userName: string; email: string; groupId: number | null; }
interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  isModerator: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
}

const MODERATOR_GROUP_IDS = new Set([3, 4, 5, 6]);

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  isModerator: false,
  setUser: (user) => set({
    user,
    isAuthenticated: !!user,
    isModerator: !!user && MODERATOR_GROUP_IDS.has(Number(user.groupId)),
  }),
  logout: () => set({ user: null, isAuthenticated: false, isModerator: false }),
}));
```

### Step 8 — App Entry + Providers Setup
```tsx
// src/app/index.tsx
import { useEffect, useState, Component, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { useFonts, Roboto_400Regular, Roboto_500Medium, Roboto_700Bold } from '@expo-google-fonts/roboto';
import { RobotoCondensed_700Bold } from '@expo-google-fonts/roboto-condensed';
import * as SplashScreen from 'expo-splash-screen';
import * as Sentry from '@sentry/react-native';
import { hydrateTokens } from '../services/tokenStorage';
import RootNavigator from '../navigation/RootNavigator';
import { View, Text } from 'react-native';

// Keep splash visible while we do async boot work
SplashScreen.preventAutoHideAsync();

// Sentry — init before anything else so crashes during boot are captured
Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.2,        // 20% of sessions get performance traces
  environment: process.env.EXPO_PUBLIC_ENV ?? 'development',
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:   2 * 60_000,  // 2 min default; override per feature
      gcTime:      30 * 60_000, // 30 min in memory — back-nav hits cache not network
      retry:       1,
      networkMode: 'offlineFirst', // serve cache even offline
    },
    mutations: { retry: 0 },
  },
});

// Top-level error boundary — catches JS crashes that bypass Sentry's auto-capture
class ErrorBoundary extends Component<{ children: ReactNode }, { crashed: boolean }> {
  state = { crashed: false };
  componentDidCatch(err: Error) { Sentry.captureException(err); }
  static getDerivedStateFromError() { return { crashed: true }; }
  render() {
    if (this.state.crashed) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text>Something went wrong. Please restart the app.</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [tokensReady, setTokensReady] = useState(false);
  const [fontsLoaded] = useFonts({
    Roboto_400Regular,
    Roboto_500Medium,
    Roboto_700Bold,
    RobotoCondensed_700Bold,
  });

  // Warm the in-memory token cache BEFORE any API calls fire
  useEffect(() => {
    hydrateTokens().finally(() => setTokensReady(true));
  }, []);

  const ready = tokensReady && fontsLoaded;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null; // splash screen remains visible

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <QueryClientProvider client={queryClient}>
            <NavigationContainer>
              <RootNavigator />
            </NavigationContainer>
          </QueryClientProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
```

### Step 9 — Navigation Types

> **Rule:** Never pass full objects or arrays through navigation params. Pass only IDs and
> minimal display strings. The receiving screen reads full data from TanStack Query cache
> (already fetched by the list screen). This prevents navigation state bloat and keeps
> back-stack transitions fast even with 50+ screens in memory.

```ts
// src/types/navigation.ts
export type RootStackParamList = {
  Auth:  undefined;
  Main:  undefined;
  Guest: undefined;   // unauthenticated browsing — home/news/galleries readable without login
};

export type MainTabParamList = {
  HomeTab:    undefined;
  NewsTab:    undefined;
  ForumsTab:  undefined;
  SearchTab:  undefined;
  MySpaceTab: undefined;
};

export type HomeStackParamList = {
  Home:             undefined;
  Article:          { articleId: number; title: string };   // NOT { article: Article }
  Galleries:        undefined;
  GalleryDetail:    { galleryId: number; title: string };
  FanFiction:       undefined;
  FanFictionDetail: { storyId: number; title: string };
  ChapterReader:    { chapterId: number; storyId: number; storyTitle: string };
                    // chapters fetched from cache via ['fanfiction', 'detail', storyId]
  Quizzes:          undefined;
  QuizPlayer:       { quizId: number; title: string };      // NOT { quiz: Quiz }
  WebStories:       undefined;
  WebStoryPlayer:   { startIndex: number };
                    // full story list lives in Zustand uiStore.activeStories set before navigation
  Shorts:           undefined;
  TagDetail:        { tagId: number; tagName: string };
  Profile:          { userId: number; username: string };
  Celebrity:        { celebrityId: number; name: string };
  Video:            { videoId: number; title: string };
  VideoDetail:      { videoId: number };
};

// Repeat pattern for NewsStack, ForumsStack, SearchStack, MySpaceStack
export type ForumsStackParamList = {
  Forums:        undefined;
  ForumList:     { forumId: number; forumTitle: string };
  TopicList:     { forumId: number; forumTitle: string };
  TopicDetail:   { topicId: number; topicTitle: string };
};
```

**Why `WebStoryPlayer` uses Zustand for the story list:** A user on a slow connection may have fetched 30 stories. Passing them via params exceeds React Navigation's recommended param payload. Instead, before navigating, call `uiStore.setActiveStories(stories)`, navigate with just `{ startIndex }`, and read from the store in the player. Clear on close.

### Step 10 — EAS Setup
```bash
npm install -g eas-cli
eas login
eas build:configure
# Creates eas.json with development / preview / production profiles
```

---

## 7. Implementation Roadmap

### Phase 1 — Foundation (Week 1–2)
**Goal:** Project runs on simulator, navigation skeleton works, service layer is ready.

| Task | Deliverable |
|------|-------------|
| Initialize Expo Bare project | `indiaforums-mobile/` repo |
| Configure TypeScript strict + path aliases | `tsconfig.json` |
| Install all dependencies | `package.json` locked |
| Create full folder structure | All `features/` dirs |
| Port 25 service files (.js → .ts) | Typed API layer |
| Implement `tokenStorage.ts` (expo-secure-store) | Secure token storage |
| Configure Zustand stores (auth, ui, notifications) | Global state ready |
| Configure TanStack Query | QueryClient with defaults |
| Configure NativeWind + Tailwind theme (all tokens) | Design system ready |
| Scaffold navigation (RootNavigator, MainTabNavigator, 5 stacks) | Navigation compiles |
| Auth screens: Login, Register, Forgot Password | Auth flow works |

**Expected output:** App opens on simulator, shows login screen, can authenticate against real API, stores tokens securely, navigates to a blank home tab.

---

### Phase 2 — Home Feed + Core Cards (Week 3–4)
**Goal:** The app feels real — scrollable content, real data, polished cards.

| Task | Deliverable |
|------|-------------|
| `ScreenWrapper` (safe area + bg) | Reusable layout shell |
| `SectionHeader` component | Reusable section title |
| `LoadingState` (skeleton) + `ErrorState` + `EmptyState` | Feedback states |
| `ArticleCard` | Core content card |
| `FeaturedBannerCarousel` (PagerView + dots) | Hero carousel |
| `CategoryChips` (horizontal FlatList) | Filter strip |
| `StoriesStrip` (circular avatars, horizontal) | Story row |
| `HomeScreen` — wired to `homeApi` via TanStack Query | Live home feed |
| `NewsScreen` — paginated via `useInfiniteQuery` | Live news feed |
| `ArticleScreen` — full article with RenderHTML body | Article detail |

**Expected output:** Home and News tabs show live data with skeleton loading, pull-to-refresh, infinite scroll.

---

### Phase 3 — Forums (Week 5–6)
**Goal:** Full forum browsing and participation working.

| Task | Deliverable |
|------|-------------|
| `ForumsScreen` — category list | Forum home |
| `ForumListScreen` — topics in a forum | Topic list |
| `TopicDetailScreen` — post list with pagination | Thread detail |
| `PostItem` — content + reactions bar + quote display | Post component |
| `ReplyComposerSheet` — `@gorhom/bottom-sheet` | Reply UX |
| `ReactionsSheet` — emoji grid bottom sheet | Reactions UX |
| `PollCard` — vote + results bar chart | Poll component |
| `AdminPanel` — mod actions gated on `isModerator` | Moderation UI |
| Optimistic reactions (useMutation + rollback) | Instant reaction feedback |

**Expected output:** Users can browse forums, read full threads, post replies, react to posts, and see poll results.

---

### Phase 4 — Fan Fiction, Celebrities, Search, Galleries, Videos (Week 7–8)
**Goal:** All secondary content features working.

| Task | Deliverable |
|------|-------------|
| `FanFictionScreen` + `FanFictionDetailScreen` | Story browse + detail |
| `ChapterReaderScreen` with font size controls | Chapter reader |
| `FanFictionAuthorsScreen` + `AuthorFollowersScreen` | Authors section |
| `CelebritiesScreen` + `CelebrityDetailScreen` | Celeb profiles |
| `GalleriesScreen` (FlashList 2-col) + `GalleryDetailScreen` | Photo galleries |
| `VideoScreen` + `VideoDetailScreen` (expo-video) | Video playback |
| `SearchScreen` — tabbed results, debounced | Global search |
| `TagDetailScreen` | Tag content hub |
| `ProfileScreen` — cover banner, stats, timeline | User profiles |

**Expected output:** All content browsing features complete. Users can navigate the full content graph.

---

### Phase 5 — Immersive Features (Week 9–10)
**Goal:** Shorts, Web Stories, Quizzes working as full-screen modal experiences.

| Task | Deliverable |
|------|-------------|
| `ShortsScreen` — vertical paginated FlatList | TikTok-style shorts |
| `WebStoriesScreen` + `WebStoryPlayerScreen` | Instagram-style stories |
| Story progress bars (Reanimated) | Smooth progress animation |
| Story swipe gestures (GestureHandler PanGesture) | Native swipe feel |
| `QuizzesScreen` | Quiz list |
| `QuizPlayerScreen` — trivia + personality flow | Full quiz experience |
| `QuizResultScreen` + `QuizLeaderboardScreen` | Post-quiz screens |
| Quiz countdown timer (Reanimated) | Smooth timer bar |

**Expected output:** All three immersive experiences feel native and smooth.

---

### Phase 6 — My Space, Messages, Notifications (Week 11–12)
**Goal:** User account and social features complete.

| Task | Deliverable |
|------|-------------|
| `MySpaceScreen` — hub with nav rows | My Space home |
| `AccountSettingsScreen` — username, display name, password | Account settings |
| `InboxScreen` + `ThreadScreen` + `ComposeScreen` | Messaging |
| `NotificationsScreen` | Notification list |
| `ActivitiesScreen` | Activity log |
| Push notification setup (expo-notifications + devicesApi) | Device registration |
| `DevicesScreen` | Logged-in devices |
| `HelpCenterScreen` | FAQ / support |
| `BuddiesScreen` — buddy list, requests | Social graph |

**Expected output:** Full account management and messaging working.

---

### Phase 7 — Polish + Launch Prep (Week 13–14)
**Goal:** Production-ready quality.

| Task | Deliverable |
|------|-------------|
| Deep link config (`linking.ts`) | Universal links for articles, profiles |
| Error boundaries (React + TanStack Query) | No uncaught crash |
| Offline states — graceful degradation | Works with cached data |
| App icons, splash screen (`expo-splash-screen`) | Store-ready assets |
| `expo-updates` / EAS Update config | OTA update pipeline |
| Performance audit — FlashList everywhere, image sizes | Frame rate profiling |
| Accessibility — `accessibilityLabel` on all interactive elements | Screen reader support |
| EAS Build — iOS + Android production builds | Signed artifacts |
| TestFlight / Play Console upload | Beta distribution |

---

## 8. Best Practices

### Code Structure

**One screen per file.** Every screen is a default export in its own `screens/ScreenName.tsx`. No barrel files for screens.

**Feature isolation.** Features import from `services/`, `store/`, `components/`, and `hooks/`. Features do not import from each other's folders. Cross-feature navigation uses typed navigation params, not direct imports.

**Typed navigation everywhere.** Every `navigation.navigate()` call is typed against `ParamList`. Use `useNavigation<NativeStackNavigationProp<HomeStackParamList>>()` — never untyped navigation.

**No any.** Strict TypeScript. API responses get typed interfaces in `features/<name>/types.ts`. The `extractApiError` util returns `string`, not `any`.

### Reusability

**Threshold for shared components:** If a component is used in 3+ features, move it to `src/components/`. Otherwise keep it in the feature folder.

**Hook naming:** All hooks are named `use<Resource>` or `use<Action>`. Hooks that hit the API always return `{ data, isLoading, isError, error, refetch }` (TanStack Query shape).

**Service functions:** Each service file exports named functions only (no classes, no default export). Functions are thin — one API call, no business logic. Business logic lives in hooks.

### Performance

**Never use ScrollView for lists.** `FlatList` for all lists. `FlashList` for high-frequency-render lists (galleries, search results). `SectionList` for grouped content (notification list, activity feed).

**Memoize selectively.** `React.memo` only where profiling shows unnecessary re-renders. Never memo by default. `useMemo`/`useCallback` only for expensive computations or stable callback references passed to `FlatList` `renderItem`.

**Image discipline.** Every `expo-image` must have `contentFit`, `cachePolicy="memory-disk"`, and a `placeholder` (blurhash string from API response or a brand-colored static blurhash).

**useNativeDriver always.** Every `Animated.timing`/`Animated.spring` must set `useNativeDriver: true`. If a property can't use native driver (e.g. `height`), use `react-native-reanimated` instead.

### Scalability

**TanStack Query key conventions:**
```ts
['home', 'articles', category]         // home articles by category
['forums', 'topics', forumId, page]    // topics in a forum
['forums', 'posts', topicId]           // posts in a topic
['fanfiction', 'stories', filters]     // filtered story list
['user', userId, 'profile']            // user profile
```
Consistent key shape means `queryClient.invalidateQueries({ queryKey: ['forums', 'posts', topicId] })` after a reply correctly refetches the thread.

**Zustand store slices.** Keep stores small and focused. Do not put server-fetched data in Zustand. If you find yourself putting API response data in a Zustand store, move it to TanStack Query instead.

**Environment config:**
```ts
// src/config.ts
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://api.indiaforums.com';
export const API_KEY      = process.env.EXPO_PUBLIC_API_KEY ?? '';
```
Never hardcode API URLs or keys in service files.

### Clean Architecture Summary

```
UI (screens, components)
  ↓ calls
Hooks (useQuery, useMutation, Zustand selectors)
  ↓ calls
Services (typed API functions, Axios)
  ↓ calls
API (REST endpoints)

Data flows up. Dependencies flow down. No circular imports.
```

Every layer is independently testable:
- Services: mock Axios, test request shapes
- Hooks: wrap in `QueryClientProvider`, test states
- Components: render with mock hook returns, test UI

---

## Appendix — Design Token → NativeWind Mapping

| CSS Token | NativeWind Class | Value |
|-----------|-----------------|-------|
| `--brand` | `bg-brand` / `text-brand` | `#3558F0` |
| `--bg` | `bg-bg` | `#F5F6F7` |
| `--card` | `bg-card` | `#FFFFFF` |
| `--text` | `text-text` | `#1A1A1A` |
| `--text2` | `text-text2` | `#5F5F5F` |
| `--text3` | `text-text3` | `#9E9E9E` |
| `--border` | `border-border` | `#E2E2E2` |
| `--red` | `text-red` / `bg-red` | `#C8001E` |
| `--green` | `text-green` | `#1A7A48` |
| `--amber` | `text-amber` | `#D97706` |
| `--live` | `bg-live` | `#16A34A` |

---

---

## 9. Production Readiness — Millions of Users

This section covers everything that separates a prototype from an app that runs reliably at scale. Every item here is mandatory, not optional.

---

### 9.1 Crash Reporting — Sentry

Without crash reporting you are blind. You will not know that a specific Android device model crashes on the quiz screen, or that a specific API response shape breaks fan fiction on Hindi titles.

**Setup:**
```ts
// src/app/index.tsx — init before ANYTHING else
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.2,        // capture 20% of sessions for performance profiling
  environment: process.env.EXPO_PUBLIC_ENV,
  beforeSend(event) {
    // Strip PII — never send user email or phone in error payloads
    if (event.user) { delete event.user.email; }
    return event;
  },
});
```

**Usage in hooks:**
```ts
// In every useMutation onError:
onError: (err) => {
  Sentry.captureException(err, { tags: { feature: 'forums', action: 'reply' } });
}
```

**Wrap navigation container** to capture screen-change breadcrumbs:
```tsx
<Sentry.TouchEventBoundary>
  <NavigationContainer ref={navigationRef} onStateChange={Sentry.addBreadcrumb}>
```

---

### 9.2 Analytics — Firebase

Track what users actually do. Without this you cannot prioritize features, diagnose drop-offs, or measure the impact of A/B tests.

**Events to instrument from day one:**

| Event | Trigger |
|-------|---------|
| `screen_view` | Auto-tracked by Firebase + Navigation listener |
| `article_open` | User taps any ArticleCard |
| `article_complete` | User scrolls past 80% of ArticleScreen |
| `quiz_start` | QuizPlayerScreen mounts |
| `quiz_complete` | QuizResultScreen mounts |
| `shorts_swipe` | onViewableItemsChanged in ShortsScreen |
| `story_open` | WebStoryPlayerScreen mounts |
| `forum_reply_sent` | successful `createReply` mutation |
| `search_query` | debounced search executes |
| `login_success` | Auth success in authStore |
| `login_failure` | Auth error |
| `push_tap` | User opens app via push notification |

**Implementation:**
```ts
// src/utils/analytics.ts
import analytics from '@react-native-firebase/analytics';

export const track = (event: string, params?: Record<string, string | number>) => {
  analytics().logEvent(event, params).catch(() => {}); // never throw on analytics failure
};
```

---

### 9.3 Testing Strategy

**Layer 1 — Unit tests (Jest):**
- All utility functions: `formatDate`, `formatCount`, `extractApiError`
- All Zustand store actions: `authStore.setUser`, `authStore.logout`
- All service functions: mock Axios, assert correct endpoint + payload

**Layer 2 — Component tests (`@testing-library/react-native`):**
- `ArticleCard` renders headline, image, meta
- `QuizPlayer` option tap triggers correct state transition
- `ErrorState` shows retry button and calls `onRetry`
- Auth screens: invalid email shows error message

**Layer 3 — Integration tests:**
- Wrap screens in `QueryClientProvider` with `msw` (Mock Service Worker) handlers
- Test full screen data flow: fetch → render → interaction → mutation

**Layer 4 — E2E tests (Maestro):**
- Happy path: open app → browse home feed → tap article → read → back
- Forum: browse → open topic → scroll to post 20 → tap reply → submit → see new post
- Quiz: open → answer all questions → see result → leaderboard
- Auth: register → verify email → login → logout

**Test file location:** Co-located with the module: `ArticleCard.test.tsx` next to `ArticleCard.tsx`.

---

### 9.4 CI/CD Pipeline

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npx tsc --noEmit          # TypeScript check
      - run: npm run lint               # ESLint
      - run: npm test -- --coverage    # Jest

  eas-preview:
    needs: lint-and-test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: expo/expo-github-action@v8
        with: { eas-version: latest, token: ${{ secrets.EXPO_TOKEN }} }
      - run: eas update --branch preview --message "${{ github.event.head_commit.message }}"
```

**Branch strategy:**
- `main` → OTA update to Preview channel (internal testing)
- `release/x.y.z` → EAS Build → TestFlight + Play Internal Testing
- Tags `vX.Y.Z` → Production submission

---

### 9.5 Offline Strategy

The Indian mobile network is patchy. At 10M users, a meaningful % are on 2G or intermittent 4G.

**Implementation:**
```ts
// src/hooks/useNetworkState.ts
import NetInfo from '@react-native-community/netinfo';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export function useNetworkState() {
  const qc = useQueryClient();
  useEffect(() => {
    return NetInfo.addEventListener(state => {
      if (state.isConnected && state.isInternetReachable) {
        // Back online — refetch stale queries silently
        qc.resumePausedMutations();
        qc.invalidateQueries({ type: 'stale' });
      }
    });
  }, [qc]);
}
```

**Rules:**
- TanStack Query `networkMode: 'offlineFirst'` — serve cache, queue mutations when offline
- Show a non-intrusive offline banner (top of screen, 32px, brand-amber background) when `isConnected === false`
- Mutations (reply, react, compose) that fail offline are queued via `useMutation` + `persister` and retried on reconnect
- Never show an empty screen when cached data exists — always prefer stale cache over error screen

---

### 9.6 Security

**Token handling:**
- Access tokens stored in Keychain/Keystore via `expo-secure-store` — never in AsyncStorage or MMKV
- Refresh tokens have a long TTL; rotate on every use (server-side, already in API)
- On 3 consecutive 401s without successful refresh, force logout — prevents infinite retry loops

**Input sanitisation:**
- All user-generated content (forum posts, replies, compose) is rendered server-side HTML — strip on the server, trust nothing from the client
- In `ArticleBody` (RenderHTML), configure `ignoredTags` to block `<script>`, `<iframe>`, `<object>` — defence in depth even if the API sanitises
- Search query: debounce + trim — never send empty or whitespace-only queries

**API key:**
- The `api-key` header value must be in `.env.production` — never committed to git
- Rotate the key via `eas secret:push` — keep out of codebase entirely

**WebView (social embeds):**
```ts
<WebView
  source={{ uri: embedUrl }}
  javaScriptEnabled={false}   // embeds don't need JS unless it's a player
  originWhitelist={['https://twitter.com', 'https://www.instagram.com']}
  sandboxed={true}            // Android 21+ sandboxed WebView
/>
```

---

### 9.7 App Store Compliance

**iOS (App Store Review Guidelines):**
- Push notifications: request permission only after demonstrating value (not on first launch) — use a pre-permission prompt explaining why
- Social auth: Google Sign-In + Apple Sign-In **both required** if any third-party auth is offered (App Store Rule 4.8)
- Privacy nutrition labels: declare `Photos`, `Notifications`, `Name`, `Email`, `User Content` usage in App Privacy

**Android (Play Store):**
- `INTERNET`, `RECEIVE_BOOT_COMPLETED` (push), `VIBRATE` (notification haptics) — declare in `AndroidManifest.xml`
- Target API 34+ (required for 2026 Play submissions)
- 64-bit requirement: Expo Bare meets this by default

**Both platforms:**
- Include Terms of Service and Privacy Policy URLs in app settings
- COPPA: if any content is accessible to under-13 users, add age gate
- Content rating: declare `Violence: None`, `Sexual Content: None`, `Language: Mild` based on fan fiction/forum content

---

### 9.8 Performance Benchmarks (Targets)

Define these before launch. Measure with Sentry Performance + Flipper.

| Metric | Target |
|--------|--------|
| Cold start (JS bundle parse + first render) | < 2.5 seconds |
| Home feed Time-to-Interact | < 1.5 seconds on cached data |
| Article open (navigate + render) | < 800ms |
| Shorts swipe frame rate | 60fps sustained on Snapdragon 665 (mid-range India) |
| Quiz option tap → feedback | < 100ms (optimistic local state) |
| Search result appearance | < 400ms after debounce fires |
| API p95 latency (application-level) | Monitor via Sentry, alert if > 3s |

**JS bundle size:** Run `npx expo export --dump-sourcemap` and inspect with `source-map-explorer`. Target < 3MB parsed JS. Code-split heavy screens (ChapterReader, WebStoryPlayer) via `React.lazy` equivalents in RN (dynamic imports).

---

### 9.9 Localization Structure

Even if v1 launches in English only, build the plumbing now.

```ts
// src/i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import hi from './locales/hi.json';

i18n.use(initReactI18next).init({
  lng: 'en',       // detect from device: use expo-localization
  fallbackLng: 'en',
  resources: { en: { translation: en }, hi: { translation: hi } },
  interpolation: { escapeValue: false },
});

export default i18n;
```

```ts
// Usage in components:
import { useTranslation } from 'react-i18next';
const { t } = useTranslation();
<Text>{t('home.trending_now')}</Text>
```

All UI strings go into `src/i18n/locales/en.json`. No hardcoded strings in JSX. This is a strict rule from day one.

---

## Appendix — Key Package Versions (as of April 2026)

```json
{
  "expo": "^53.0.0",
  "@react-navigation/native": "^7.0.0",
  "@react-navigation/native-stack": "^7.0.0",
  "@react-navigation/bottom-tabs": "^7.0.0",
  "@tanstack/react-query": "^5.0.0",
  "zustand": "^5.0.0",
  "react-hook-form": "^7.0.0",
  "nativewind": "^4.0.0",
  "react-native-reanimated": "^3.0.0",
  "react-native-gesture-handler": "^2.0.0",
  "@gorhom/bottom-sheet": "^5.0.0",
  "expo-image": "^2.0.0",
  "expo-video": "^2.0.0",
  "expo-secure-store": "^14.0.0",
  "expo-notifications": "^0.29.0",
  "expo-auth-session": "^6.0.0",
  "expo-splash-screen": "^0.27.0",
  "react-native-webview": "^13.0.0",
  "react-native-pager-view": "^6.0.0",
  "react-native-mmkv": "^2.0.0",
  "@shopify/flash-list": "^1.7.0",
  "@sentry/react-native": "^6.0.0",
  "@react-native-firebase/app": "^21.0.0",
  "@react-native-firebase/analytics": "^21.0.0",
  "@react-native-community/netinfo": "^11.0.0",
  "i18next": "^23.0.0",
  "react-i18next": "^14.0.0",
  "axios": "^1.7.0"
}
```
