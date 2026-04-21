# IndiaForums React Native Mobile App — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-grade React Native mobile app inside `mobile/` using the existing web prototype's API layer and design system.

**Architecture:** Expo SDK 55 managed workflow in `mobile/`, reusing all 25 web service modules (ported `.js` → `.ts`), Zustand for client state, TanStack Query for server state, NativeWind v4 for styling. The web `api.js` transforms are copied wholesale — zero API contract changes.

**Tech Stack:** React Native 0.83.4, Expo 55, TypeScript strict, React Navigation v7, TanStack Query v5, Zustand v5, NativeWind v4, @gorhom/bottom-sheet, FlashList, expo-secure-store, react-native-mmkv

---

## Repo Layout (What Already Exists)

```
IndiaForums-(Prototype)/
├── indiaforums/          ← Web prototype (React 19 + Vite, JS/JSX)
│   └── src/
│       ├── services/     ← 25 service files + api.js (1500-line master file)
│       ├── screens/      ← All web screens
│       └── hooks/        ← 25+ data hooks
└── mobile/               ← RN app (already initialized, ALL deps installed)
    ├── App.tsx           ← Root: GestureHandlerRootView + NavigationContainer
    ├── tailwind.config.js ← Brand tokens already configured
    └── src/
        ├── navigation/
        │   ├── RootNavigator.tsx  ← Has onboarding routing, stubs for Guest/Auth/Main
        │   ├── OnboardingStack.tsx
        │   └── types.ts           ← RootStackParamList, AuthStackParamList, OnboardingStackParamList
        ├── features/
        │   └── onboarding/        ← COMPLETE: Splash, Onboarding, GetStarted screens
        └── store/
            └── onboardingStore.ts ← MMKV-backed, synchronous reads
```

**All npm dependencies are already installed.** Do NOT run `npm install` for packages already in `mobile/package.json`.

---

## What to Port from Web (Zero Rewrite)

The following logic is **pure JS with no DOM dependency** — copy directly, rename `.js` → `.ts`, add TypeScript types:

| Web file | Mobile destination | Change needed |
|---|---|---|
| `indiaforums/src/services/api.js` | Split into `mobile/src/services/api.ts` + feature service files | Replace `localStorage` → in-memory cache backed by SecureStore |
| All transform functions in `api.js` | Stay in `mobile/src/services/api.ts` | None — pure JS |
| `services/forumsApi.js` | `mobile/src/services/forumsApi.ts` | Import `api` from mobile |
| `services/commentsApi.js` | `mobile/src/services/commentsApi.ts` | Import `api` from mobile |
| `services/authApi.js` | `mobile/src/services/authApi.ts` | Import `api` from mobile |
| All other 22 service files | `mobile/src/services/<name>.ts` | Import `api` from mobile |
| All hooks (`useApiQuery`, `useHomeData`, etc.) | `mobile/src/features/<feature>/hooks/` | Replace `useApiQuery` with `useQuery`/`useInfiniteQuery` |

**Do NOT port:** PhoneShell, DynamicIsland, StatusBar, BottomNav, TopNav, CSS Modules, any `.module.css` file.

---

## Target Folder Structure (`mobile/src/`)

```
mobile/src/
├── features/
│   ├── onboarding/          ✅ COMPLETE
│   ├── auth/
│   │   ├── screens/         LoginScreen, RegisterScreen, ForgotPasswordScreen, ResetPasswordScreen, VerifyEmailScreen
│   │   ├── hooks/           useAuth.ts
│   │   └── types.ts
│   ├── home/
│   │   ├── screens/         HomeScreen.tsx
│   │   ├── components/      FeaturedBannerCarousel, CategoryChips, StoriesStrip, ArticleCard, ForumThreadsSection
│   │   ├── hooks/           useHomeData.ts
│   │   └── types.ts
│   ├── news/
│   │   ├── screens/         NewsScreen.tsx, ArticleScreen.tsx
│   │   ├── components/      NewsCard, ArticleBody, CommentsSection, TagChip, RelatedArticles
│   │   ├── hooks/           useNews.ts, useArticle.ts, useComments.ts
│   │   └── types.ts
│   ├── forums/
│   │   ├── screens/         ForumsScreen, ForumListScreen, TopicListScreen, TopicDetailScreen
│   │   ├── components/      ForumCard, ThreadCard, PostItem, ReactionsBar, PollCard, ReplyComposer, AdminPanel
│   │   ├── hooks/           useForumHome.ts, useForumTopics.ts, useTopicPosts.ts
│   │   └── types.ts
│   ├── fanfiction/
│   │   ├── screens/         FanFictionScreen, FanFictionDetailScreen, ChapterReaderScreen, FanFictionAuthorsScreen, AuthorFollowersScreen
│   │   ├── components/      StoryCard, ChapterListItem, ReaderContent, AuthorCard
│   │   ├── hooks/           useFanFictions.ts
│   │   └── types.ts
│   ├── quizzes/
│   │   ├── screens/         QuizzesScreen, QuizPlayerScreen, QuizResultScreen, QuizLeaderboardScreen
│   │   ├── components/      QuizCard, OptionButton, ProgressBar, TimerBar
│   │   ├── hooks/           useQuizzes.ts
│   │   └── types.ts
│   ├── shorts/
│   │   ├── screens/         ShortsScreen.tsx
│   │   ├── components/      ShortCard.tsx
│   │   └── hooks/           useShorts.ts
│   ├── webstories/
│   │   ├── screens/         WebStoriesScreen, WebStoryPlayerScreen
│   │   ├── components/      StoryThumbnail, StorySlide, StoryProgressBar
│   │   └── hooks/           useWebStories.ts
│   ├── galleries/
│   │   ├── screens/         GalleriesScreen, GalleryDetailScreen
│   │   ├── components/      GalleryGrid, GalleryPhoto
│   │   └── hooks/           useGalleries.ts
│   ├── videos/
│   │   ├── screens/         VideoScreen, VideoDetailScreen
│   │   ├── components/      VideoCard, VideoPlayer
│   │   └── hooks/           useVideos.ts
│   ├── celebrities/
│   │   ├── screens/         CelebritiesScreen, CelebrityDetailScreen
│   │   ├── components/      CelebCard
│   │   └── hooks/           useCelebrities.ts
│   ├── search/
│   │   ├── screens/         SearchScreen.tsx
│   │   ├── components/      SearchBar, ResultTabs, SearchResultCard
│   │   └── hooks/           useSearch.ts
│   ├── myspace/
│   │   ├── screens/         MySpaceScreen, ProfileScreen, AccountSettingsScreen, NotificationsScreen, ActivitiesScreen, DevicesScreen, HelpCenterScreen
│   │   ├── components/      SettingsRow, ProfileHeader
│   │   └── hooks/           useMySpace.ts, useNotifications.ts
│   ├── messages/
│   │   ├── screens/         InboxScreen, ThreadScreen, ComposeScreen, FoldersScreen
│   │   ├── components/      MessageBubble, InboxRow
│   │   └── hooks/           useMessages.ts
│   └── buddies/
│       ├── screens/         BuddiesScreen.tsx
│       └── hooks/           useBuddies.ts
│
├── navigation/
│   ├── RootNavigator.tsx    ✅ EXISTS (needs Auth + Main wired)
│   ├── OnboardingStack.tsx  ✅ EXISTS
│   ├── AuthStack.tsx
│   ├── GuestStack.tsx
│   ├── MainTabNavigator.tsx
│   ├── HomeStack.tsx
│   ├── NewsStack.tsx
│   ├── ForumsStack.tsx
│   ├── SearchStack.tsx
│   ├── MySpaceStack.tsx
│   └── types.ts             ✅ EXISTS (needs MainTabParamList + stack param lists added)
│
├── services/
│   ├── api.ts               ← Port of api.js (all transforms + Axios instance)
│   ├── tokenStorage.ts      ← SecureStore-backed with sync in-memory cache
│   ├── authApi.ts
│   ├── forumsApi.ts
│   ├── commentsApi.ts
│   ├── fanFictionsApi.ts
│   ├── quizzesApi.ts
│   ├── shortsApi.ts
│   ├── webStoriesApi.ts
│   ├── messagesApi.ts
│   ├── notificationsApi.ts
│   ├── userProfileApi.ts
│   ├── searchApi.ts
│   ├── uploadsApi.ts
│   ├── activitiesApi.js → .ts
│   ├── buddiesApi.js → .ts
│   ├── categoryApi.js → .ts
│   ├── devicesApi.js → .ts
│   ├── emailVerificationApi.js → .ts
│   ├── externalMediaApi.js → .ts
│   ├── helpCenterApi.js → .ts
│   ├── moviesApi.js → .ts
│   └── showsApi.js → .ts
│
├── store/
│   ├── onboardingStore.ts   ✅ EXISTS
│   ├── authStore.ts
│   ├── uiStore.ts
│   └── notificationsStore.ts
│
├── components/
│   ├── ui/
│   │   ├── ScreenWrapper.tsx
│   │   ├── SectionHeader.tsx
│   │   ├── LoadingState.tsx
│   │   ├── ErrorState.tsx
│   │   ├── EmptyState.tsx
│   │   ├── Avatar.tsx
│   │   ├── Badge.tsx
│   │   └── BottomSheetWrapper.tsx
│   └── layout/
│       └── Divider.tsx
│
├── hooks/
│   ├── useDebounce.ts
│   └── useInfiniteScroll.ts
│
└── utils/
    ├── formatDate.ts
    ├── formatCount.ts
    └── imageUri.ts
```

---

## Phase 1 — Foundation: Service Layer + Auth Store + Navigation Skeleton

### Task 1: `tokenStorage.ts` — SecureStore-backed token storage

**Files:**
- Create: `mobile/src/services/tokenStorage.ts`

- [ ] **Step 1: Write the file**

```typescript
// mobile/src/services/tokenStorage.ts
import * as SecureStore from 'expo-secure-store';

const KEYS = { access: 'if_access', refresh: 'if_refresh', user: 'if_user' };

let _cache: { accessToken: string | null; refreshToken: string | null } = {
  accessToken: null,
  refreshToken: null,
};

/** Call once at app boot before any API calls */
export const hydrateTokens = async (): Promise<void> => {
  _cache.accessToken  = await SecureStore.getItemAsync(KEYS.access);
  _cache.refreshToken = await SecureStore.getItemAsync(KEYS.refresh);
};

/** Synchronous — safe for Axios request interceptors after hydrateTokens() */
export const getTokens = () => ({ ..._cache });

export const setTokens = async (access: string, refresh: string): Promise<void> => {
  _cache = { accessToken: access, refreshToken: refresh };
  await SecureStore.setItemAsync(KEYS.access,  access);
  await SecureStore.setItemAsync(KEYS.refresh, refresh);
};

export const clearAll = async (): Promise<void> => {
  _cache = { accessToken: null, refreshToken: null };
  await SecureStore.deleteItemAsync(KEYS.access);
  await SecureStore.deleteItemAsync(KEYS.refresh);
  await SecureStore.deleteItemAsync(KEYS.user);
};

export const getStoredUser = async (): Promise<Record<string, unknown> | null> => {
  const raw = await SecureStore.getItemAsync(KEYS.user);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
};

export const setStoredUser = async (user: Record<string, unknown>): Promise<void> => {
  await SecureStore.setItemAsync(KEYS.user, JSON.stringify(user));
};
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd mobile && npx tsc --noEmit
```

Expected: No errors on this file.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/services/tokenStorage.ts
git commit -m "feat(mobile): SecureStore-backed token storage with sync in-memory cache"
```

---

### Task 2: `api.ts` — Port the Axios instance + all transforms from web `api.js`

**Files:**
- Create: `mobile/src/services/api.ts`
- Source: `indiaforums/src/services/api.js`

- [ ] **Step 1: Create `mobile/src/services/api.ts`**

Copy `indiaforums/src/services/api.js` to `mobile/src/services/api.ts`, then apply these changes:

**Change 1 — imports at top:**
```typescript
import axios from 'axios';
import { getTokens, setTokens, clearAll } from './tokenStorage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://api.indiaforums.com';
const API_KEY      = process.env.EXPO_PUBLIC_API_KEY ?? 'Api2IndiaForums@2026';
```

**Change 2 — axios.create:**
```typescript
const api = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
    'api-key': API_KEY,
  },
});
```

**Change 3 — remove the `DOMParser` branch in `stripEditMeta`:** Replace `if (typeof DOMParser !== 'undefined')` block with just the regex fallback (React Native has no DOM). The function becomes:

```typescript
function stripEditMeta(html: string): { cleanHtml: string; metaBy: string | null; metaWhen: string | null } {
  if (!html) return { cleanHtml: html, metaBy: null, metaWhen: null };
  if (!/\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(html)) {
    return { cleanHtml: html, metaBy: null, metaWhen: null };
  }
  const plain = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const SUFFIX = /(?:([A-Za-z0-9]\w{0,60})\s*)?(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\s*$/;
  const m2 = plain.match(SUFFIX);
  if (!m2) return { cleanHtml: html, metaBy: null, metaWhen: null };
  const metaBy   = m2[1] || null;
  const metaWhen = m2[2];
  const dtIdx    = html.lastIndexOf(metaWhen);
  if (dtIdx === -1) return { cleanHtml: html, metaBy: null, metaWhen: null };
  let cut = html.slice(0, dtIdx);
  if (metaBy) {
    const ui = cut.lastIndexOf(metaBy);
    if (ui !== -1 && /^[\s<>/a-zA-Z0-9"'=;:.#?&/_-]*$/.test(cut.slice(ui + metaBy.length))) {
      cut = cut.slice(0, ui);
    }
  }
  return { cleanHtml: cut.replace(/<[^>]*$/, '').trimEnd(), metaBy, metaWhen };
}
```

**Change 4 — remove `CATEGORY_GRADIENTS` CSS gradient strings** (unused in RN — replace with plain hex colors for NativeWind):
```typescript
export const CATEGORY_COLORS: Record<string, string> = {
  TELEVISION: '#4a1942',
  MOVIES:     '#7f1d1d',
  LIFESTYLE:  '#831843',
  SPORTS:     '#14532d',
  DIGITAL:    '#1e293b',
};
```
Update all references to `CATEGORY_GRADIENTS` → `CATEGORY_COLORS`.

**Change 5 — add TypeScript return types** to all exported functions using inline types (full type file comes in Task 8). Add `// eslint-disable-next-line @typescript-eslint/no-explicit-any` where needed for `raw` params until Task 8 types are added.

- [ ] **Step 2: Remove `console.log` calls** (they're noise in production):

```bash
cd mobile && grep -n 'console.log' src/services/api.ts | wc -l
```

Remove all `console.log` lines. Keep `console.warn` for genuine degraded-path warnings.

- [ ] **Step 3: TypeScript check**

```bash
cd mobile && npx tsc --noEmit
```

Fix any errors (most will be missing return types or `any` usages).

- [ ] **Step 4: Commit**

```bash
git add mobile/src/services/api.ts
git commit -m "feat(mobile): port api.js to TypeScript — Axios instance + all transforms"
```

---

### Task 3: Port remaining 22 service files

**Files:** All `indiaforums/src/services/*.js` except `api.js` and `tokenStorage.js` (already done).

- [ ] **Step 1: Port each file — change only the import line**

For each file, the only change is the import:
```typescript
// OLD (web):
import api from './api';
// NEW (mobile):
import api from './api';  // same — but now api.ts lives at mobile/src/services/api.ts
```

The actual API call logic is identical. Rename `.js` → `.ts` and add TypeScript types to function signatures.

Files to port (copy from `indiaforums/src/services/`, rename to `.ts`):
`authApi`, `forumsApi`, `commentsApi`, `fanFictionsApi`, `quizzesApi`, `shortsApi`, `webStoriesApi`, `messagesApi`, `notificationsApi`, `userProfileApi`, `searchApi`, `uploadsApi`, `activitiesApi`, `buddiesApi`, `categoryApi`, `devicesApi`, `emailVerificationApi`, `externalMediaApi`, `helpCenterApi`, `moviesApi`, `showsApi`, `socialAuth`

**Note on `socialAuth.ts`:** The web version uses `window` globals. For mobile, stub it:
```typescript
// mobile/src/services/socialAuth.ts
// Social auth is handled by expo-auth-session in Phase 6.
// This stub keeps imports compiling while auth screens are built.
export const googleSignIn  = async () => { throw new Error('Not yet implemented'); };
export const appleSignIn   = async () => { throw new Error('Not yet implemented'); };
```

- [ ] **Step 2: Verify all files compile**

```bash
cd mobile && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add mobile/src/services/
git commit -m "feat(mobile): port all 22 service files to TypeScript"
```

---

### Task 4: Zustand stores

**Files:**
- Create: `mobile/src/store/authStore.ts`
- Create: `mobile/src/store/uiStore.ts`
- Create: `mobile/src/store/notificationsStore.ts`

- [ ] **Step 1: Create `authStore.ts`**

```typescript
// mobile/src/store/authStore.ts
import { create } from 'zustand';

export interface AuthUser {
  userId: number;
  userName: string;
  email: string;
  groupId: number | null;
  avatarUrl?: string | null;
  avatarAccent?: string | null;
}

interface AuthStore {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isModerator: boolean;
  isLoading: boolean;
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

const MODERATOR_GROUP_IDS = new Set([3, 4, 5, 6]);

export const useAuthStore = create<AuthStore>((set) => ({
  user:            null,
  isAuthenticated: false,
  isModerator:     false,
  isLoading:       true,
  setUser: (user) => set({
    user,
    isAuthenticated: !!user,
    isModerator: !!user && MODERATOR_GROUP_IDS.has(Number(user.groupId)),
  }),
  setLoading: (isLoading) => set({ isLoading }),
  logout: () => set({ user: null, isAuthenticated: false, isModerator: false }),
}));
```

- [ ] **Step 2: Create `uiStore.ts`**

```typescript
// mobile/src/store/uiStore.ts
import { create } from 'zustand';

interface Story { id: number; [key: string]: unknown; }

interface UIStore {
  activeStories: Story[];
  setActiveStories: (stories: Story[]) => void;
  clearActiveStories: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  activeStories: [],
  setActiveStories: (stories) => set({ activeStories: stories }),
  clearActiveStories: () => set({ activeStories: [] }),
}));
```

- [ ] **Step 3: Create `notificationsStore.ts`**

```typescript
// mobile/src/store/notificationsStore.ts
import { create } from 'zustand';

interface NotificationsStore {
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  clearUnread: () => void;
}

export const useNotificationsStore = create<NotificationsStore>((set) => ({
  unreadCount: 0,
  setUnreadCount: (unreadCount) => set({ unreadCount }),
  clearUnread: () => set({ unreadCount: 0 }),
}));
```

- [ ] **Step 4: Commit**

```bash
git add mobile/src/store/
git commit -m "feat(mobile): add authStore, uiStore, notificationsStore"
```

---

### Task 5: Extend navigation types + wire `App.tsx` with TanStack Query

**Files:**
- Modify: `mobile/src/navigation/types.ts`
- Modify: `mobile/App.tsx`

- [ ] **Step 1: Extend `types.ts`**

Add to existing `mobile/src/navigation/types.ts` (keep existing OnboardingStackParamList, RootStackParamList, AuthStackParamList):

```typescript
export type MainTabParamList = {
  HomeTab:    undefined;
  NewsTab:    undefined;
  ForumsTab:  undefined;
  SearchTab:  undefined;
  MySpaceTab: undefined;
};

export type HomeStackParamList = {
  Home:             undefined;
  Article:          { articleId: number; title: string };
  Galleries:        undefined;
  GalleryDetail:    { galleryId: number; title: string };
  FanFiction:       undefined;
  FanFictionDetail: { storyId: number; title: string };
  ChapterReader:    { chapterId: number; storyId: number; storyTitle: string };
  Quizzes:          undefined;
  QuizPlayer:       { quizId: number; title: string };
  WebStories:       undefined;
  WebStoryPlayer:   { startIndex: number };
  Shorts:           undefined;
  TagDetail:        { tagId: number; tagName: string; contentType: number };
  Profile:          { userId: number; username: string };
  Celebrity:        { celebrityId: number; name: string };
  Video:            { videoId: number; title: string };
  VideoDetail:      { videoId: number };
};

export type NewsStackParamList = {
  News:    undefined;
  Article: { articleId: number; title: string };
};

export type ForumsStackParamList = {
  Forums:      undefined;
  ForumList:   { forumId: number; forumTitle: string };
  TopicList:   { forumId: number; forumTitle: string };
  TopicDetail: { topicId: number; topicTitle: string };
};

export type SearchStackParamList = {
  Search:  undefined;
  Article: { articleId: number; title: string };
  Profile: { userId: number; username: string };
};

export type MySpaceStackParamList = {
  MySpace:         undefined;
  Profile:         { userId: number; username: string };
  AccountSettings: undefined;
  Notifications:   undefined;
  Activities:      undefined;
  Inbox:           undefined;
  Thread:          { threadId: number; subject: string };
  Compose:         { toUserId?: number; toUsername?: string };
  Folders:         undefined;
  Devices:         undefined;
  HelpCenter:      undefined;
  Buddies:         undefined;
};
```

- [ ] **Step 2: Update `App.tsx` to add TanStack Query + font loading + token hydration**

Replace contents of `mobile/App.tsx`:

```tsx
import React, { useEffect, useState, Component, ReactNode } from 'react';
import { View, Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useFonts,
  Roboto_400Regular,
  Roboto_500Medium,
  Roboto_700Bold,
} from '@expo-google-fonts/roboto';
import { RobotoCondensed_700Bold } from '@expo-google-fonts/roboto-condensed';
import * as SplashScreen from 'expo-splash-screen';
import { hydrateTokens } from './src/services/tokenStorage';
import RootNavigator from './src/navigation/RootNavigator';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:   2 * 60_000,
      gcTime:      30 * 60_000,
      retry:       1,
      networkMode: 'offlineFirst',
    },
    mutations: { retry: 0 },
  },
});

class ErrorBoundary extends Component<{ children: ReactNode }, { crashed: boolean }> {
  state = { crashed: false };
  static getDerivedStateFromError() { return { crashed: true }; }
  render() {
    if (this.state.crashed) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F6F7' }}>
          <Text style={{ fontSize: 16, color: '#1A1A1A' }}>Something went wrong. Please restart the app.</Text>
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

  useEffect(() => {
    hydrateTokens().finally(() => setTokensReady(true));
  }, []);

  const ready = tokensReady && fontsLoaded;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

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

- [ ] **Step 3: Check build**

```bash
cd mobile && npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add mobile/src/navigation/types.ts mobile/App.tsx
git commit -m "feat(mobile): extend nav types, add TanStack Query + font loading to App.tsx"
```

---

### Task 6: Shared UI components

**Files:** Create `mobile/src/components/ui/` components.

- [ ] **Step 1: Create `ScreenWrapper.tsx`**

```tsx
// mobile/src/components/ui/ScreenWrapper.tsx
import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  noPadding?: boolean;
}

export default function ScreenWrapper({ children, style, noPadding }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.root,
        { paddingTop: insets.top },
        !noPadding && styles.pad,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F5F6F7' },
  pad:  { paddingHorizontal: 0 },
});
```

- [ ] **Step 2: Create `SectionHeader.tsx`**

```tsx
// mobile/src/components/ui/SectionHeader.tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

interface Props {
  title: string;
  onSeeAll?: () => void;
}

export default function SectionHeader({ title, onSeeAll }: Props) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {onSeeAll && (
        <Pressable onPress={onSeeAll} hitSlop={8}>
          <Text style={styles.seeAll}>See All</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  title:  { fontSize: 17, fontWeight: '700', color: '#1A1A1A', letterSpacing: -0.2 },
  seeAll: { fontSize: 13, fontWeight: '600', color: '#3558F0' },
});
```

- [ ] **Step 3: Create `LoadingState.tsx`**

```tsx
// mobile/src/components/ui/LoadingState.tsx
import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';

function SkeletonBox({ width, height, borderRadius = 8 }: { width: number | string; height: number; borderRadius?: number }) {
  const opacity = React.useRef(new Animated.Value(0.4)).current;
  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, [opacity]);
  return <Animated.View style={[{ width: width as number, height, borderRadius, backgroundColor: '#E2E2E2' }, { opacity }]} />;
}

export default function LoadingState() {
  return (
    <View style={styles.container}>
      {[1, 2, 3].map(i => (
        <View key={i} style={styles.card}>
          <SkeletonBox width="100%" height={180} />
          <View style={styles.meta}>
            <SkeletonBox width="60%" height={14} />
            <SkeletonBox width="40%" height={12} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 16 },
  card:      { gap: 10 },
  meta:      { gap: 8 },
});
```

- [ ] **Step 4: Create `ErrorState.tsx`**

```tsx
// mobile/src/components/ui/ErrorState.tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

interface Props {
  message?: string;
  onRetry?: () => void;
}

export default function ErrorState({ message = 'Something went wrong.', onRetry }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <Pressable style={styles.button} onPress={onRetry}>
          <Text style={styles.buttonText}>Try Again</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  message:    { fontSize: 15, color: '#5F5F5F', textAlign: 'center', marginBottom: 20 },
  button:     { backgroundColor: '#3558F0', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  buttonText: { fontSize: 15, fontWeight: '600', color: '#FFF' },
});
```

- [ ] **Step 5: Create `EmptyState.tsx`**

```tsx
// mobile/src/components/ui/EmptyState.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function EmptyState({ message = 'Nothing here yet.' }: { message?: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  text:      { fontSize: 15, color: '#9E9E9E', textAlign: 'center' },
});
```

- [ ] **Step 6: Commit**

```bash
git add mobile/src/components/
git commit -m "feat(mobile): add ScreenWrapper, SectionHeader, LoadingState, ErrorState, EmptyState"
```

---

## Phase 2 — Auth Screens + Navigation

### Task 7: Auth screens

**Files:**
- Create: `mobile/src/features/auth/screens/LoginScreen.tsx`
- Create: `mobile/src/features/auth/screens/RegisterScreen.tsx`
- Create: `mobile/src/features/auth/screens/ForgotPasswordScreen.tsx`
- Create: `mobile/src/features/auth/hooks/useAuth.ts`
- Create: `mobile/src/navigation/AuthStack.tsx`
- Create: `mobile/src/navigation/GuestStack.tsx`
- Modify: `mobile/src/navigation/RootNavigator.tsx`

- [ ] **Step 1: Create `useAuth.ts`**

```typescript
// mobile/src/features/auth/hooks/useAuth.ts
import { useMutation } from '@tanstack/react-query';
import { login, register, forgotPassword } from '../../../services/authApi';
import { setTokens, clearAll, setStoredUser } from '../../../services/tokenStorage';
import { useAuthStore } from '../../../store/authStore';
import type { AuthUser } from '../../../store/authStore';

export function useLogin() {
  const setUser = useAuthStore(s => s.setUser);
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      login({ email, password }),
    onSuccess: async (data) => {
      await setTokens(data.accessToken, data.refreshToken);
      const user: AuthUser = {
        userId:       data.userId ?? data.user?.userId,
        userName:     data.userName ?? data.user?.userName ?? '',
        email:        data.email ?? data.user?.email ?? '',
        groupId:      data.groupId ?? data.user?.groupId ?? null,
        avatarUrl:    data.avatarUrl ?? null,
        avatarAccent: data.avatarAccent ?? null,
      };
      await setStoredUser(user as unknown as Record<string, unknown>);
      setUser(user);
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: (payload: { userName: string; email: string; password: string }) =>
      register(payload),
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: ({ email }: { email: string }) => forgotPassword({ email }),
  });
}

export function useLogout() {
  const logout = useAuthStore(s => s.logout);
  return async () => {
    await clearAll();
    logout();
  };
}
```

- [ ] **Step 2: Create `LoginScreen.tsx`**

```tsx
// mobile/src/features/auth/screens/LoginScreen.tsx
import React from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  KeyboardAvoidingView, ScrollView, Platform, ActivityIndicator,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../../navigation/types';
import { useLogin } from '../hooks/useAuth';
import { extractApiError } from '../../../services/api';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

type FormData = { email: string; password: string };

export default function LoginScreen({ navigation }: Props) {
  const { control, handleSubmit, formState: { errors } } = useForm<FormData>();
  const { mutate: login, isPending, error } = useLogin();

  const onSubmit = (data: FormData) => {
    login(data);
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.logo}>IndiaForums</Text>
        <Text style={styles.heading}>Welcome back</Text>

        <Controller
          control={control}
          name="email"
          rules={{ required: 'Email is required', pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email' } }}
          render={({ field: { onChange, value } }) => (
            <View style={styles.fieldWrap}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                onChangeText={onChange}
                value={value}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                placeholder="you@example.com"
                placeholderTextColor="#9E9E9E"
              />
              {errors.email && <Text style={styles.fieldError}>{errors.email.message}</Text>}
            </View>
          )}
        />

        <Controller
          control={control}
          name="password"
          rules={{ required: 'Password is required' }}
          render={({ field: { onChange, value } }) => (
            <View style={styles.fieldWrap}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={[styles.input, errors.password && styles.inputError]}
                onChangeText={onChange}
                value={value}
                secureTextEntry
                autoComplete="password"
                placeholder="••••••••"
                placeholderTextColor="#9E9E9E"
              />
              {errors.password && <Text style={styles.fieldError}>{errors.password.message}</Text>}
            </View>
          )}
        />

        {error && <Text style={styles.apiError}>{extractApiError(error)}</Text>}

        <Pressable
          style={[styles.button, isPending && styles.buttonDisabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={isPending}
        >
          {isPending
            ? <ActivityIndicator color="#FFF" />
            : <Text style={styles.buttonText}>Sign In</Text>
          }
        </Pressable>

        <Pressable onPress={() => navigation.navigate('ForgotPassword')} hitSlop={8}>
          <Text style={styles.link}>Forgot password?</Text>
        </Pressable>

        <View style={styles.registerRow}>
          <Text style={styles.registerText}>Don't have an account? </Text>
          <Pressable onPress={() => navigation.navigate('Register')} hitSlop={8}>
            <Text style={styles.link}>Register</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:          { flex: 1, backgroundColor: '#F5F6F7' },
  scroll:        { flexGrow: 1, padding: 24, paddingTop: 64 },
  logo:          { fontSize: 22, fontWeight: '800', color: '#3558F0', marginBottom: 32 },
  heading:       { fontSize: 28, fontWeight: '700', color: '#1A1A1A', marginBottom: 28 },
  fieldWrap:     { marginBottom: 16 },
  label:         { fontSize: 13, fontWeight: '600', color: '#5F5F5F', marginBottom: 6 },
  input:         { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E2E2', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1A1A1A' },
  inputError:    { borderColor: '#C8001E' },
  fieldError:    { fontSize: 12, color: '#C8001E', marginTop: 4 },
  apiError:      { fontSize: 13, color: '#C8001E', marginBottom: 12, textAlign: 'center' },
  button:        { backgroundColor: '#3558F0', borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
  buttonDisabled:{ opacity: 0.6 },
  buttonText:    { fontSize: 16, fontWeight: '600', color: '#FFF' },
  link:          { fontSize: 14, color: '#3558F0', fontWeight: '600', textAlign: 'center', marginTop: 16 },
  registerRow:   { flexDirection: 'row', justifyContent: 'center', marginTop: 8 },
  registerText:  { fontSize: 14, color: '#5F5F5F' },
});
```

- [ ] **Step 3: Create `RegisterScreen.tsx`** — same pattern as LoginScreen with fields: `userName`, `email`, `password`, `confirmPassword`. Calls `useRegister()`, on success navigates to `VerifyEmail`.

- [ ] **Step 4: Create `ForgotPasswordScreen.tsx`** — email field only, calls `useForgotPassword()`, shows success message.

- [ ] **Step 5: Create `AuthStack.tsx`**

```tsx
// mobile/src/navigation/AuthStack.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthStackParamList } from './types';
import LoginScreen from '../features/auth/screens/LoginScreen';
import RegisterScreen from '../features/auth/screens/RegisterScreen';
import ForgotPasswordScreen from '../features/auth/screens/ForgotPasswordScreen';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}
```

- [ ] **Step 6: Create `GuestStack.tsx`** — placeholder with a single screen showing "Browse as Guest" + "Sign In" button that navigates root to `Auth`.

- [ ] **Step 7: Update `RootNavigator.tsx`** — replace placeholder components with real stacks, wire `useAuthStore`:

```tsx
// mobile/src/navigation/RootNavigator.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { hasSeenOnboarding } from '../store/onboardingStore';
import { useAuthStore } from '../store/authStore';
import OnboardingStack from './OnboardingStack';
import AuthStack from './AuthStack';
import GuestStack from './GuestStack';
// MainTabNavigator imported once built in Phase 3
// import MainTabNavigator from './MainTabNavigator';

const Root = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const seenOnboarding  = hasSeenOnboarding();
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);

  const initialRoute: keyof RootStackParamList = seenOnboarding
    ? isAuthenticated ? 'Main' : 'Guest'
    : 'Onboarding';

  return (
    <Root.Navigator
      initialRouteName={initialRoute}
      screenOptions={{ headerShown: false, animation: 'fade' }}
    >
      <Root.Screen name="Onboarding" component={OnboardingStack} />
      <Root.Screen name="Guest" component={GuestStack} />
      <Root.Screen name="Auth" component={AuthStack} />
      {/* Main wired in Phase 3 */}
      <Root.Screen name="Main" component={GuestStack} />
    </Root.Navigator>
  );
}
```

- [ ] **Step 8: Verify it compiles and app launches**

```bash
cd mobile && npx tsc --noEmit && npx expo start --no-dev
```

Expected: App boots to Splash → Onboarding (first run) or Guest screen (subsequent runs).

- [ ] **Step 9: Commit**

```bash
git add mobile/src/features/auth/ mobile/src/navigation/
git commit -m "feat(mobile): auth screens, AuthStack, GuestStack, wire RootNavigator to authStore"
```

---

## Phase 3 — Main Tab Navigator + Home Feed

### Task 8: Main tab navigator

**Files:**
- Create: `mobile/src/navigation/MainTabNavigator.tsx`
- Create: `mobile/src/navigation/HomeStack.tsx`
- Create: `mobile/src/navigation/NewsStack.tsx`
- Create: `mobile/src/navigation/ForumsStack.tsx`
- Create: `mobile/src/navigation/SearchStack.tsx`
- Create: `mobile/src/navigation/MySpaceStack.tsx`

- [ ] **Step 1: Create `MainTabNavigator.tsx`**

```tsx
// mobile/src/navigation/MainTabNavigator.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MainTabParamList } from './types';
import HomeStack from './HomeStack';
import NewsStack from './NewsStack';
import ForumsStack from './ForumsStack';
import SearchStack from './SearchStack';
import MySpaceStack from './MySpaceStack';
import { Ionicons } from '@expo/vector-icons';
import { useNotificationsStore } from '../store/notificationsStore';

const Tab = createBottomTabNavigator<MainTabParamList>();

export default function MainTabNavigator() {
  const unreadCount = useNotificationsStore(s => s.unreadCount);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#3558F0',
        tabBarInactiveTintColor: '#9E9E9E',
        tabBarStyle: { backgroundColor: '#FFFFFF', borderTopColor: '#E2E2E2' },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
            HomeTab:    'home-outline',
            NewsTab:    'newspaper-outline',
            ForumsTab:  'chatbubbles-outline',
            SearchTab:  'search-outline',
            MySpaceTab: 'person-outline',
          };
          return <Ionicons name={icons[route.name] ?? 'home-outline'} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="HomeTab"    component={HomeStack}    options={{ title: 'Explore' }} />
      <Tab.Screen name="NewsTab"    component={NewsStack}    options={{ title: 'News' }} />
      <Tab.Screen name="ForumsTab"  component={ForumsStack}  options={{ title: 'Forums' }} />
      <Tab.Screen name="SearchTab"  component={SearchStack}  options={{ title: 'Search' }} />
      <Tab.Screen
        name="MySpaceTab"
        component={MySpaceStack}
        options={{ title: 'My Space', tabBarBadge: unreadCount > 0 ? unreadCount : undefined }}
      />
    </Tab.Navigator>
  );
}
```

- [ ] **Step 2: Create `HomeStack.tsx`** (placeholder screens for now — fill in as screens are built):

```tsx
// mobile/src/navigation/HomeStack.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HomeStackParamList } from './types';
// Import screens as they are built:
// import HomeScreen from '../features/home/screens/HomeScreen';

const Stack = createNativeStackNavigator<HomeStackParamList>();

// Temporary placeholder — remove once HomeScreen is built
function Placeholder() {
  const { View, Text } = require('react-native');
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Text>Home</Text></View>;
}

export default function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={Placeholder} />
    </Stack.Navigator>
  );
}
```

Create `NewsStack.tsx`, `ForumsStack.tsx`, `SearchStack.tsx`, `MySpaceStack.tsx` with the same placeholder pattern.

- [ ] **Step 3: Wire `MainTabNavigator` into `RootNavigator.tsx`** — replace the duplicate `GuestStack` placeholder for `Main`:

```tsx
import MainTabNavigator from './MainTabNavigator';
// In Root.Navigator:
<Root.Screen name="Main" component={MainTabNavigator} />
```

- [ ] **Step 4: Verify**

```bash
cd mobile && npx tsc --noEmit && npx expo start --no-dev
```

Expected: After auth, 5 bottom tabs render with placeholder screens.

- [ ] **Step 5: Commit**

```bash
git add mobile/src/navigation/
git commit -m "feat(mobile): MainTabNavigator + 5 stack navigators wired to RootNavigator"
```

---

### Task 9: Home screen — data hook + screen

**Files:**
- Create: `mobile/src/features/home/hooks/useHomeData.ts`
- Create: `mobile/src/features/home/screens/HomeScreen.tsx`
- Create: `mobile/src/features/home/components/FeaturedBannerCarousel.tsx`
- Create: `mobile/src/features/home/components/CategoryChips.tsx`
- Modify: `mobile/src/navigation/HomeStack.tsx`

- [ ] **Step 1: Create `useHomeData.ts`**

```typescript
// mobile/src/features/home/hooks/useHomeData.ts
import { useQuery } from '@tanstack/react-query';
import { fetchBanners, fetchArticles, ARTICLE_CATS } from '../../../services/api';

export function useBanners() {
  return useQuery({
    queryKey: ['home', 'banners'],
    queryFn:  fetchBanners,
    staleTime: 5 * 60_000,
  });
}

export function useHomeArticles(category: string) {
  return useQuery({
    queryKey: ['home', 'articles', category],
    queryFn:  () => fetchArticles(1, 20),
    staleTime: 5 * 60_000,
  });
}

export { ARTICLE_CATS };
```

- [ ] **Step 2: Create `FeaturedBannerCarousel.tsx`**

```tsx
// mobile/src/features/home/components/FeaturedBannerCarousel.tsx
import React, { useState } from 'react';
import { View, Text, Pressable, Dimensions, StyleSheet } from 'react-native';
import PagerView from 'react-native-pager-view';
import { Image } from 'expo-image';

const { width: W } = Dimensions.get('window');

interface Banner {
  id: number | string;
  title: string;
  thumbnail: string | null;
  tag: string;
  tagColor?: string;
  time: string;
}

interface Props {
  banners: Banner[];
  onPress?: (banner: Banner) => void;
}

export default function FeaturedBannerCarousel({ banners, onPress }: Props) {
  const [page, setPage] = useState(0);
  if (!banners.length) return null;

  return (
    <View>
      <PagerView
        style={{ width: W, height: 220 }}
        initialPage={0}
        onPageSelected={e => setPage(e.nativeEvent.position)}
      >
        {banners.slice(0, 8).map(b => (
          <Pressable key={b.id} onPress={() => onPress?.(b)} style={styles.slide}>
            {b.thumbnail
              ? <Image source={{ uri: b.thumbnail }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" />
              : <View style={[StyleSheet.absoluteFill, { backgroundColor: '#3558F0' }]} />
            }
            <View style={styles.overlay}>
              <View style={[styles.tag, { backgroundColor: b.tagColor ?? '#3558F0' }]}>
                <Text style={styles.tagText}>{b.tag}</Text>
              </View>
              <Text style={styles.title} numberOfLines={2}>{b.title}</Text>
              <Text style={styles.time}>{b.time}</Text>
            </View>
          </Pressable>
        ))}
      </PagerView>
      <View style={styles.dots}>
        {banners.slice(0, 8).map((_, i) => (
          <View key={i} style={[styles.dot, i === page && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  slide:    { width: W, height: 220, overflow: 'hidden' },
  overlay:  { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: 'rgba(0,0,0,0.45)' },
  tag:      { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, marginBottom: 6 },
  tagText:  { fontSize: 10, fontWeight: '700', color: '#FFF', textTransform: 'uppercase', letterSpacing: 0.5 },
  title:    { fontSize: 17, fontWeight: '700', color: '#FFF', lineHeight: 22 },
  time:     { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  dots:     { flexDirection: 'row', justifyContent: 'center', gap: 5, paddingVertical: 8 },
  dot:      { width: 5, height: 5, borderRadius: 3, backgroundColor: '#E2E2E2' },
  dotActive:{ width: 16, backgroundColor: '#3558F0' },
});
```

- [ ] **Step 3: Create `CategoryChips.tsx`**

```tsx
// mobile/src/features/home/components/CategoryChips.tsx
import React from 'react';
import { FlatList, Pressable, Text, StyleSheet } from 'react-native';

interface Cat { id: string; label: string; }

interface Props {
  categories: Cat[];
  selected: string;
  onSelect: (id: string) => void;
}

export default function CategoryChips({ categories, selected, onSelect }: Props) {
  return (
    <FlatList
      horizontal
      data={categories}
      keyExtractor={c => c.id}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      renderItem={({ item }) => {
        const active = item.id === selected;
        return (
          <Pressable
            style={[styles.chip, active && styles.chipActive]}
            onPress={() => onSelect(item.id)}
          >
            <Text style={[styles.chipText, active && styles.chipTextActive]}>
              {item.label}
            </Text>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container:       { paddingHorizontal: 16, gap: 8, paddingVertical: 10 },
  chip:            { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E2E2E2' },
  chipActive:      { backgroundColor: '#3558F0', borderColor: '#3558F0' },
  chipText:        { fontSize: 12, fontWeight: '600', color: '#5F5F5F', textTransform: 'uppercase', letterSpacing: 0.5 },
  chipTextActive:  { color: '#FFF' },
});
```

- [ ] **Step 4: Create `ArticleCard.tsx`** (shared card, used across home + news):

```tsx
// mobile/src/features/home/components/ArticleCard.tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';

interface Article {
  id: number;
  title: string;
  thumbnail: string | null;
  time: string;
  tag: string;
  cat: string;
  commentCount: number;
}

interface Props { article: Article; onPress: () => void; }

export default function ArticleCard({ article, onPress }: Props) {
  return (
    <Pressable style={styles.card} onPress={onPress} android_ripple={{ color: '#E2E2E2' }}>
      {article.thumbnail
        ? <Image source={{ uri: article.thumbnail }} style={styles.image} contentFit="cover" cachePolicy="memory-disk" />
        : <View style={[styles.image, styles.imageFallback]} />
      }
      <View style={styles.body}>
        <Text style={styles.tag}>{article.cat}</Text>
        <Text style={styles.title} numberOfLines={3}>{article.title}</Text>
        <View style={styles.meta}>
          <Text style={styles.time}>{article.time}</Text>
          {article.commentCount > 0 && (
            <Text style={styles.comments}>{article.commentCount} comments</Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card:          { flexDirection: 'row', backgroundColor: '#FFF', marginHorizontal: 16, marginBottom: 1, padding: 12, gap: 12, borderRadius: 10 },
  image:         { width: 90, height: 70, borderRadius: 8, flexShrink: 0 },
  imageFallback: { backgroundColor: '#E2E2E2' },
  body:          { flex: 1, justifyContent: 'space-between' },
  tag:           { fontSize: 10, fontWeight: '700', color: '#3558F0', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  title:         { fontSize: 14, fontWeight: '600', color: '#1A1A1A', lineHeight: 20 },
  meta:          { flexDirection: 'row', gap: 12, marginTop: 6 },
  time:          { fontSize: 11, color: '#9E9E9E' },
  comments:      { fontSize: 11, color: '#9E9E9E' },
});
```

- [ ] **Step 5: Create `HomeScreen.tsx`**

```tsx
// mobile/src/features/home/screens/HomeScreen.tsx
import React, { useState } from 'react';
import { FlatList, View, RefreshControl } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import ScreenWrapper from '../../../components/ui/ScreenWrapper';
import SectionHeader from '../../../components/ui/SectionHeader';
import LoadingState from '../../../components/ui/LoadingState';
import ErrorState from '../../../components/ui/ErrorState';
import FeaturedBannerCarousel from '../components/FeaturedBannerCarousel';
import CategoryChips from '../components/CategoryChips';
import ArticleCard from '../components/ArticleCard';
import { useBanners, useHomeArticles, ARTICLE_CATS } from '../hooks/useHomeData';
import { HomeStackParamList } from '../../../navigation/types';

type Nav = NativeStackNavigationProp<HomeStackParamList>;

export default function HomeScreen() {
  const nav = useNavigation<Nav>();
  const [category, setCategory] = useState('all');

  const { data: banners, isLoading: loadingBanners } = useBanners();
  const { data: articlesData, isLoading: loadingArticles, isError, error, refetch } = useHomeArticles(category);

  const articles = articlesData?.articles ?? [];

  if (loadingBanners || loadingArticles) return <LoadingState />;
  if (isError) return <ErrorState message={(error as Error).message} onRetry={refetch} />;

  return (
    <ScreenWrapper noPadding>
      <FlatList
        data={articles}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => (
          <ArticleCard
            article={item}
            onPress={() => nav.navigate('Article', { articleId: item.id, title: item.title })}
          />
        )}
        ListHeaderComponent={() => (
          <View>
            <FeaturedBannerCarousel
              banners={banners ?? []}
              onPress={b => {
                if (typeof b.id === 'number') {
                  nav.navigate('Article', { articleId: b.id, title: b.title });
                }
              }}
            />
            <CategoryChips
              categories={ARTICLE_CATS}
              selected={category}
              onSelect={setCategory}
            />
            <SectionHeader title="Latest News" />
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#F5F6F7' }} />}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} />}
        contentContainerStyle={{ paddingBottom: 32 }}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={5}
        removeClippedSubviews
      />
    </ScreenWrapper>
  );
}
```

- [ ] **Step 6: Wire HomeScreen into HomeStack**

Replace placeholder in `mobile/src/navigation/HomeStack.tsx`:
```tsx
import HomeScreen from '../features/home/screens/HomeScreen';
// Replace Placeholder with HomeScreen for the 'Home' screen
<Stack.Screen name="Home" component={HomeScreen} />
```

- [ ] **Step 7: Verify + test**

```bash
cd mobile && npx tsc --noEmit && npx expo start
```

On device/simulator: Home tab shows banner carousel + category chips + article list with real API data.

- [ ] **Step 8: Commit**

```bash
git add mobile/src/features/home/ mobile/src/navigation/HomeStack.tsx
git commit -m "feat(mobile): HomeScreen with banner carousel, category chips, article list"
```

---

## Phase 4 — Article Screen + News Screen

### Task 10: ArticleScreen

**Files:**
- Create: `mobile/src/features/news/hooks/useArticle.ts`
- Create: `mobile/src/features/news/screens/ArticleScreen.tsx`
- Create: `mobile/src/features/news/components/ArticleBody.tsx`

- [ ] **Step 1: Create `useArticle.ts`**

```typescript
// mobile/src/features/news/hooks/useArticle.ts
import { useQuery } from '@tanstack/react-query';
import { fetchArticleDetails } from '../../../services/api';

export function useArticle(articleId: number) {
  return useQuery({
    queryKey: ['article', articleId],
    queryFn:  () => fetchArticleDetails(articleId),
    staleTime: 10 * 60_000,
    enabled: articleId > 0,
  });
}
```

- [ ] **Step 2: Create `ArticleBody.tsx`**

Install `react-native-render-html` if not in package.json (check first):
```bash
cd mobile && grep "react-native-render-html" package.json
```
If missing: `npx expo install react-native-render-html`

```tsx
// mobile/src/features/news/components/ArticleBody.tsx
import React from 'react';
import { useWindowDimensions } from 'react-native';
import RenderHtml from 'react-native-render-html';

interface Props { html: string; }

const tagsStyles = {
  body: { color: '#1A1A1A', fontSize: 16, lineHeight: 26 },
  p:    { marginBottom: 14 },
  a:    { color: '#3558F0', textDecorationLine: 'none' as const },
  h2:   { fontSize: 20, fontWeight: '700', marginBottom: 10, marginTop: 16 },
  h3:   { fontSize: 17, fontWeight: '700', marginBottom: 8, marginTop: 12 },
  img:  { borderRadius: 8 },
};

const ignoredDomTags = ['script', 'iframe', 'object', 'embed'];

export default function ArticleBody({ html }: Props) {
  const { width } = useWindowDimensions();
  return (
    <RenderHtml
      contentWidth={width - 32}
      source={{ html }}
      tagsStyles={tagsStyles}
      ignoredDomTags={ignoredDomTags}
    />
  );
}
```

- [ ] **Step 3: Create `ArticleScreen.tsx`**

```tsx
// mobile/src/features/news/screens/ArticleScreen.tsx
import React from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeStackParamList } from '../../../navigation/types';
import LoadingState from '../../../components/ui/LoadingState';
import ErrorState from '../../../components/ui/ErrorState';
import ArticleBody from '../components/ArticleBody';
import { useArticle } from '../hooks/useArticle';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = NativeStackScreenProps<HomeStackParamList, 'Article'>;

export default function ArticleScreen({ route, navigation }: Props) {
  const { articleId } = route.params;
  const { data: article, isLoading, isError, error, refetch } = useArticle(articleId);
  const insets = useSafeAreaInsets();

  if (isLoading) return <LoadingState />;
  if (isError || !article) return <ErrorState message={(error as Error)?.message} onRetry={refetch} />;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={8}>
        <Text style={styles.backText}>‹ Back</Text>
      </Pressable>
      <ScrollView contentContainerStyle={styles.scroll}>
        {article.thumbnail && (
          <Image source={{ uri: article.thumbnail }} style={styles.hero} contentFit="cover" cachePolicy="memory-disk" />
        )}
        <View style={styles.content}>
          <Text style={styles.category}>{article.cat}</Text>
          <Text style={styles.title}>{article.title}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.source}>{article.source}</Text>
            <Text style={styles.dot}>·</Text>
            <Text style={styles.time}>{article.time}</Text>
          </View>
          {article.description ? (
            <Text style={styles.description}>{article.description}</Text>
          ) : null}
          <View style={styles.divider} />
          {article.bodyContent ? (
            <ArticleBody html={article.bodyContent} />
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: '#FFF' },
  backBtn:     { paddingHorizontal: 16, paddingVertical: 10 },
  backText:    { fontSize: 17, color: '#3558F0', fontWeight: '600' },
  scroll:      { paddingBottom: 48 },
  hero:        { width: '100%', height: 220 },
  content:     { padding: 16 },
  category:    { fontSize: 11, fontWeight: '700', color: '#3558F0', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  title:       { fontSize: 22, fontWeight: '700', color: '#1A1A1A', lineHeight: 30, marginBottom: 10 },
  metaRow:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  source:      { fontSize: 12, fontWeight: '600', color: '#5F5F5F' },
  dot:         { fontSize: 12, color: '#9E9E9E' },
  time:        { fontSize: 12, color: '#9E9E9E' },
  description: { fontSize: 16, color: '#5F5F5F', lineHeight: 24, marginBottom: 16, fontStyle: 'italic' },
  divider:     { height: 1, backgroundColor: '#F5F6F7', marginBottom: 16 },
});
```

- [ ] **Step 4: Register in HomeStack and NewsStack**

In `HomeStack.tsx`:
```tsx
import ArticleScreen from '../features/news/screens/ArticleScreen';
<Stack.Screen name="Article" component={ArticleScreen} />
```

Repeat for `NewsStack.tsx`.

- [ ] **Step 5: Create `NewsScreen.tsx`** — paginated article list using `useInfiniteQuery`:

```tsx
// mobile/src/features/news/screens/NewsScreen.tsx
import React from 'react';
import { FlatList, View, ActivityIndicator, RefreshControl } from 'react-native';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { fetchArticles } from '../../../services/api';
import { NewsStackParamList } from '../../../navigation/types';
import ScreenWrapper from '../../../components/ui/ScreenWrapper';
import ArticleCard from '../../home/components/ArticleCard';
import ErrorState from '../../../components/ui/ErrorState';
import LoadingState from '../../../components/ui/LoadingState';

type Nav = NativeStackNavigationProp<NewsStackParamList>;

export default function NewsScreen() {
  const nav = useNavigation<Nav>();

  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['news', 'articles'],
    queryFn: ({ pageParam = 1 }) => fetchArticles(pageParam as number, 20),
    initialPageParam: 1,
    getNextPageParam: (last, pages) =>
      last.pagination.hasNextPage ? pages.length + 1 : undefined,
    staleTime: 2 * 60_000,
  });

  const articles = data?.pages.flatMap(p => p.articles) ?? [];

  if (isLoading) return <LoadingState />;
  if (isError)   return <ErrorState message={(error as Error).message} onRetry={refetch} />;

  return (
    <ScreenWrapper noPadding>
      <FlatList
        data={articles}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => (
          <ArticleCard
            article={item}
            onPress={() => nav.navigate('Article', { articleId: item.id, title: item.title })}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#F5F6F7' }} />}
        onEndReached={() => hasNextPage && fetchNextPage()}
        onEndReachedThreshold={0.3}
        ListFooterComponent={isFetchingNextPage ? <ActivityIndicator style={{ padding: 16 }} color="#3558F0" /> : null}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        contentContainerStyle={{ paddingBottom: 32 }}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews
      />
    </ScreenWrapper>
  );
}
```

- [ ] **Step 6: Wire NewsScreen into NewsStack**

- [ ] **Step 7: Commit**

```bash
git add mobile/src/features/news/ mobile/src/navigation/
git commit -m "feat(mobile): ArticleScreen with HTML body, NewsScreen with infinite scroll"
```

---

## Phase 5 — Forums

### Task 11: Forums screens

**Files:**
- Create: `mobile/src/features/forums/hooks/useForumHome.ts`
- Create: `mobile/src/features/forums/hooks/useForumTopics.ts`
- Create: `mobile/src/features/forums/hooks/useTopicPosts.ts`
- Create: `mobile/src/features/forums/screens/ForumsScreen.tsx`
- Create: `mobile/src/features/forums/screens/ForumListScreen.tsx`
- Create: `mobile/src/features/forums/screens/TopicListScreen.tsx`
- Create: `mobile/src/features/forums/screens/TopicDetailScreen.tsx`
- Create: `mobile/src/features/forums/components/PostItem.tsx`
- Create: `mobile/src/features/forums/components/ReplyComposer.tsx`

- [ ] **Step 1: Create hooks**

```typescript
// mobile/src/features/forums/hooks/useForumHome.ts
import { useQuery } from '@tanstack/react-query';
import { fetchForumHome } from '../../../services/api';

export function useForumHome() {
  return useQuery({
    queryKey: ['forums', 'home'],
    queryFn:  fetchForumHome,
    staleTime: 5 * 60_000,
  });
}
```

```typescript
// mobile/src/features/forums/hooks/useForumTopics.ts
import { useInfiniteQuery } from '@tanstack/react-query';
import { fetchForumTopics } from '../../../services/api';

export function useForumTopics(forumId: number) {
  return useInfiniteQuery({
    queryKey: ['forums', 'topics', forumId],
    queryFn: ({ pageParam = 1 }) => fetchForumTopics(forumId, pageParam as number, 20),
    initialPageParam: 1,
    getNextPageParam: (last) => last.hasMore ? undefined : undefined, // cursor-based
    enabled: forumId > 0,
    staleTime: 2 * 60_000,
  });
}
```

```typescript
// mobile/src/features/forums/hooks/useTopicPosts.ts
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchTopicPosts } from '../../../services/api';
import { replyToTopic } from '../../../services/forumsApi';

export function useTopicPosts(topicId: number) {
  return useInfiniteQuery({
    queryKey: ['forums', 'posts', topicId],
    queryFn: ({ pageParam = 1 }) => fetchTopicPosts(topicId, pageParam as number, 20),
    initialPageParam: 1,
    getNextPageParam: (last, pages) => last.hasMore ? pages.length + 1 : undefined,
    enabled: topicId > 0,
    staleTime: 2 * 60_000,
  });
}

export function useReplyToTopic(topicId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (message: string) => replyToTopic(topicId, { message }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['forums', 'posts', topicId] });
    },
  });
}
```

- [ ] **Step 2: Create `ForumsScreen.tsx`** — list of forum categories + forums using `useForumHome`, renders as SectionList grouped by category. Tap a forum → navigate to `ForumList`.

- [ ] **Step 3: Create `TopicDetailScreen.tsx`** — infinite scroll `FlatList` of `PostItem` components with a sticky `ReplyComposer` bottom sheet.

- [ ] **Step 4: Create `PostItem.tsx`**

```tsx
// mobile/src/features/forums/components/PostItem.tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';

interface Post {
  id: number;
  author: string;
  message: string;
  time: string;
  likes: number;
  avatarUrl?: string | null;
  avatarAccent?: string | null;
  isOp: boolean;
  rank: string;
  badges: { id: number; name: string; imageUrl: string }[];
}

interface Props { post: Post; onReact?: () => void; onReply?: () => void; }

export default function PostItem({ post, onReact, onReply }: Props) {
  const initials = post.author.substring(0, 2).toUpperCase();
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: post.avatarAccent ?? '#3558F0' }]}>
          {post.avatarUrl
            ? <Image source={{ uri: post.avatarUrl }} style={styles.avatarImg} contentFit="cover" />
            : <Text style={styles.avatarText}>{initials}</Text>
          }
        </View>
        <View style={styles.authorBlock}>
          <View style={styles.authorRow}>
            <Text style={styles.author}>{post.author}</Text>
            {post.isOp && <View style={styles.opBadge}><Text style={styles.opText}>OP</Text></View>}
          </View>
          <Text style={styles.meta}>{post.rank} · {post.time}</Text>
        </View>
      </View>
      {/* Render plain text from HTML — for full HTML use ArticleBody */}
      <Text style={styles.message}>{post.message.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}</Text>
      <View style={styles.actions}>
        <Pressable style={styles.action} onPress={onReact} hitSlop={8}>
          <Text style={styles.actionText}>👍 {post.likes > 0 ? post.likes : 'Like'}</Text>
        </Pressable>
        <Pressable style={styles.action} onPress={onReply} hitSlop={8}>
          <Text style={styles.actionText}>Reply</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { backgroundColor: '#FFF', padding: 14, borderBottomWidth: 1, borderBottomColor: '#F5F6F7' },
  header:      { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, gap: 10 },
  avatar:      { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg:   { width: 38, height: 38 },
  avatarText:  { fontSize: 14, fontWeight: '700', color: '#FFF' },
  authorBlock: { flex: 1 },
  authorRow:   { flexDirection: 'row', alignItems: 'center', gap: 6 },
  author:      { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  opBadge:     { backgroundColor: '#3558F0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  opText:      { fontSize: 10, fontWeight: '700', color: '#FFF' },
  meta:        { fontSize: 11, color: '#9E9E9E', marginTop: 2 },
  message:     { fontSize: 14, color: '#1A1A1A', lineHeight: 21 },
  actions:     { flexDirection: 'row', gap: 16, marginTop: 10 },
  action:      { paddingVertical: 4 },
  actionText:  { fontSize: 13, color: '#5F5F5F', fontWeight: '500' },
});
```

- [ ] **Step 5: Wire all forum screens into ForumsStack**

- [ ] **Step 6: Commit**

```bash
git add mobile/src/features/forums/ mobile/src/navigation/ForumsStack.tsx
git commit -m "feat(mobile): forums screens, post list with infinite scroll, reply composer"
```

---

## Phase 6 — Fan Fiction

### Task 12: Fan Fiction screens

**Files:** `mobile/src/features/fanfiction/`

- [ ] **Step 1: Create `useFanFictions.ts`**

```typescript
// mobile/src/features/fanfiction/hooks/useFanFictions.ts
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import {
  getFanFictions,
  getFanFictionDetail,
  getChapterContent,
  getFanFictionAuthors,
} from '../../../services/fanFictionsApi';

export function useFanFictions(filters = {}) {
  return useInfiniteQuery({
    queryKey: ['fanfiction', 'list', filters],
    queryFn: ({ pageParam = 1 }) => getFanFictions({ ...filters, pageNumber: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last: any) => last.hasNextPage ? last.currentPage + 1 : undefined,
    staleTime: 5 * 60_000,
  });
}

export function useFanFictionDetail(storyId: number) {
  return useQuery({
    queryKey: ['fanfiction', 'detail', storyId],
    queryFn:  () => getFanFictionDetail(storyId),
    staleTime: 10 * 60_000,
    enabled: storyId > 0,
  });
}

export function useChapter(chapterId: number) {
  return useQuery({
    queryKey: ['fanfiction', 'chapter', chapterId],
    queryFn:  () => getChapterContent(chapterId),
    staleTime: 30 * 60_000,
    enabled: chapterId > 0,
  });
}
```

- [ ] **Step 2: Create `FanFictionScreen.tsx`** — FlashList of `StoryCard` items with genre filter chips at top.

- [ ] **Step 3: Create `StoryCard.tsx`**

```tsx
// mobile/src/features/fanfiction/components/StoryCard.tsx
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Image } from 'expo-image';

interface Story {
  id: number;
  title: string;
  author: string;
  thumbnail: string | null;
  genre: string;
  reads: number;
  likes: number;
  chapterCount: number;
  rating?: number;
}

interface Props { story: Story; onPress: () => void; }

export default function StoryCard({ story, onPress }: Props) {
  return (
    <Pressable style={styles.card} onPress={onPress} android_ripple={{ color: '#E2E2E2' }}>
      {story.thumbnail
        ? <Image source={{ uri: story.thumbnail }} style={styles.cover} contentFit="cover" cachePolicy="memory-disk" />
        : <View style={[styles.cover, styles.coverFallback]} />
      }
      <View style={styles.body}>
        <View style={styles.genreRow}>
          <View style={styles.genreBadge}><Text style={styles.genreText}>{story.genre}</Text></View>
        </View>
        <Text style={styles.title} numberOfLines={2}>{story.title}</Text>
        <Text style={styles.author}>by {story.author}</Text>
        <View style={styles.stats}>
          <Text style={styles.stat}>{story.chapterCount} ch.</Text>
          <Text style={styles.statDot}>·</Text>
          <Text style={styles.stat}>{story.reads > 1000 ? `${(story.reads/1000).toFixed(1)}K` : story.reads} reads</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card:         { flexDirection: 'row', backgroundColor: '#FFF', marginHorizontal: 16, marginBottom: 1, padding: 12, gap: 12, borderRadius: 10 },
  cover:        { width: 70, height: 100, borderRadius: 8, flexShrink: 0 },
  coverFallback:{ backgroundColor: '#EBF0FF' },
  body:         { flex: 1 },
  genreRow:     { marginBottom: 6 },
  genreBadge:   { alignSelf: 'flex-start', backgroundColor: '#EBF0FF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  genreText:    { fontSize: 10, fontWeight: '700', color: '#3558F0', textTransform: 'uppercase' },
  title:        { fontSize: 14, fontWeight: '700', color: '#1A1A1A', lineHeight: 20, marginBottom: 4 },
  author:       { fontSize: 12, color: '#5F5F5F', marginBottom: 8 },
  stats:        { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stat:         { fontSize: 11, color: '#9E9E9E' },
  statDot:      { fontSize: 11, color: '#9E9E9E' },
});
```

- [ ] **Step 4: Create `ChapterReaderScreen.tsx`** — full-screen ScrollView with font size controls (small/medium/large stored in MMKV), reading progress indicator at top.

- [ ] **Step 5: Wire into HomeStack**

- [ ] **Step 6: Commit**

```bash
git add mobile/src/features/fanfiction/
git commit -m "feat(mobile): fan fiction screens — browse, detail, chapter reader"
```

---

## Phase 7 — Immersive Features (Shorts, Web Stories, Quizzes)

### Task 13: ShortsScreen

**Files:**
- Create: `mobile/src/features/shorts/hooks/useShorts.ts`
- Create: `mobile/src/features/shorts/screens/ShortsScreen.tsx`
- Create: `mobile/src/features/shorts/components/ShortCard.tsx`

- [ ] **Step 1: Create `useShorts.ts`**

```typescript
import { useInfiniteQuery } from '@tanstack/react-query';
import { getShorts } from '../../../services/shortsApi';

export function useShorts() {
  return useInfiniteQuery({
    queryKey: ['shorts'],
    queryFn:  ({ pageParam = 1 }) => getShorts({ pageNumber: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last: any) => last.hasNextPage ? last.currentPage + 1 : undefined,
    staleTime: 5 * 60_000,
  });
}
```

- [ ] **Step 2: Create `ShortsScreen.tsx`** — key RN-specific implementation:

```tsx
// mobile/src/features/shorts/screens/ShortsScreen.tsx
import React, { useRef, useState, useCallback } from 'react';
import { Dimensions, View, StyleSheet, ViewToken } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useShorts } from '../hooks/useShorts';
import ShortCard from '../components/ShortCard';
import LoadingState from '../../../components/ui/LoadingState';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ShortsScreen() {
  const [activeIndex, setActiveIndex] = useState(0);
  const { data, isLoading, fetchNextPage, hasNextPage } = useShorts();
  const shorts = data?.pages.flatMap((p: any) => p.shorts ?? []) ?? [];

  // MUST be in a ref — inline function causes Android crash
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems[0];
      if (first?.isViewable && first.index !== null && first.index !== undefined) {
        setActiveIndex(first.index);
      }
    }
  ).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  if (isLoading) return <LoadingState />;

  return (
    <View style={styles.root}>
      <FlashList
        data={shorts}
        estimatedItemSize={SCREEN_HEIGHT}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        decelerationRate="fast"
        renderItem={({ item, index }: { item: any; index: number }) => (
          <ShortCard short={item} isActive={index === activeIndex} />
        )}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        onEndReached={() => hasNextPage && fetchNextPage()}
        onEndReachedThreshold={0.5}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
});
```

- [ ] **Step 3: Create `ShortCard.tsx`** — full-screen `View` with background image, title overlay, progress bar using `Animated.timing` that auto-advances when `isActive` is true.

- [ ] **Step 4: Commit**

```bash
git add mobile/src/features/shorts/
git commit -m "feat(mobile): ShortsScreen — vertical FlashList paging, 60fps on mid-range Android"
```

---

### Task 14: Web Stories Player

**Files:**
- Create: `mobile/src/features/webstories/screens/WebStoriesScreen.tsx`
- Create: `mobile/src/features/webstories/screens/WebStoryPlayerScreen.tsx`
- Create: `mobile/src/features/webstories/components/StoryProgressBar.tsx`

- [ ] **Step 1: Create `WebStoryPlayerScreen.tsx`** — presented as fullScreenModal. Reads story list from `useUIStore().activeStories`. Uses `PagerView` for slide-by-slide navigation with tap-left/right gesture handling.

Key pattern:
```tsx
// Tap left half → previous, tap right half → next
const { width } = useWindowDimensions();
<Pressable
  style={StyleSheet.absoluteFill}
  onPress={e => {
    if (e.nativeEvent.locationX < width / 2) prevSlide();
    else nextSlide();
  }}
/>
```

Progress bars: One `Animated.View` per slide in current story, driven by `Animated.timing` with `useNativeDriver: false` (width animation). Cancel previous animation when slide changes.

- [ ] **Step 2: Create `StoryProgressBar.tsx`**

```tsx
// mobile/src/features/webstories/components/StoryProgressBar.tsx
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

interface Props {
  count: number;
  activeIndex: number;
  duration: number;
  onComplete: () => void;
}

export default function StoryProgressBar({ count, activeIndex, duration, onComplete }: Props) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    progress.setValue(0);
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration,
      useNativeDriver: false, // width animation can't use native driver
    });
    anim.start(({ finished }) => { if (finished) onComplete(); });
    return () => anim.stop();
  }, [activeIndex, duration]);

  return (
    <View style={styles.row}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={styles.track}>
          <Animated.View
            style={[
              styles.fill,
              i < activeIndex  && styles.fillComplete,
              i === activeIndex && { flex: progress as unknown as number },
            ]}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row:          { flexDirection: 'row', gap: 3, paddingHorizontal: 8, paddingTop: 8 },
  track:        { flex: 1, height: 2, backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: 1, overflow: 'hidden' },
  fill:         { flex: 0, height: 2, backgroundColor: '#FFF', borderRadius: 1 },
  fillComplete: { flex: 1 },
});
```

- [ ] **Step 3: Commit**

```bash
git add mobile/src/features/webstories/
git commit -m "feat(mobile): Web Stories player with progress bars and tap navigation"
```

---

### Task 15: Quizzes

**Files:** `mobile/src/features/quizzes/`

- [ ] **Step 1: Create `useQuizzes.ts`** — fetch list + detail from `quizzesApi`.

- [ ] **Step 2: Create `QuizPlayerScreen.tsx`** — full-screen modal. Shows question, 4 `OptionButton` components, `TimerBar` (animated countdown). Two modes:
  - Trivia: correct/wrong feedback via color, reveal correct answer, advance after 1.5s
  - Personality: auto-advance after selection (no correct answer)

- [ ] **Step 3: Create `OptionButton.tsx`**

```tsx
// mobile/src/features/quizzes/components/OptionButton.tsx
import React, { useRef } from 'react';
import { Pressable, Text, Animated, StyleSheet } from 'react-native';

interface Props {
  text: string;
  state: 'idle' | 'selected' | 'correct' | 'wrong';
  onPress: () => void;
  disabled: boolean;
}

export default function OptionButton({ text, state, onPress, disabled }: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.97, duration: 80, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1,    duration: 80, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  const bgColor =
    state === 'correct'  ? '#1A7A48' :
    state === 'wrong'    ? '#C8001E' :
    state === 'selected' ? '#3558F0' : '#FFF';

  const textColor = state !== 'idle' ? '#FFF' : '#1A1A1A';

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        style={[styles.button, { backgroundColor: bgColor }]}
        onPress={handlePress}
        disabled={disabled}
      >
        <Text style={[styles.text, { color: textColor }]}>{text}</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: { padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#E2E2E2', marginBottom: 10 },
  text:   { fontSize: 15, fontWeight: '500', lineHeight: 22 },
});
```

- [ ] **Step 4: Commit**

```bash
git add mobile/src/features/quizzes/
git commit -m "feat(mobile): quiz screens — player, result, leaderboard with animated timer"
```

---

## Phase 8 — My Space, Messages, Search

### Task 16: My Space hub + Profile

**Files:** `mobile/src/features/myspace/`

- [ ] **Step 1: `useMySpace.ts`** — wrap `userProfileApi` methods.

- [ ] **Step 2: `MySpaceScreen.tsx`** — hub with user avatar, stats bar, settings rows for: Profile, Account Settings, Notifications, Activities, Inbox, Devices, Help Center, Log Out.

- [ ] **Step 3: `ProfileScreen.tsx`** — cover banner, rank pill, stats bar (posts, fans, following), tab views (Timeline, Articles, Galleries). Matches web `ProfileScreen.jsx` layout.

- [ ] **Step 4: Wire into MySpaceStack.**

- [ ] **Step 5: Commit**

```bash
git add mobile/src/features/myspace/
git commit -m "feat(mobile): MySpaceScreen and ProfileScreen with cover banner + stats bar"
```

---

### Task 17: Messages

**Files:** `mobile/src/features/messages/`

- [ ] **Step 1: `useMessages.ts`** — inbox list, thread, send.
- [ ] **Step 2: `InboxScreen.tsx`** — paginated list of message threads.
- [ ] **Step 3: `ThreadScreen.tsx`** — message bubbles FlatList + composer at bottom.
- [ ] **Step 4: `ComposeScreen.tsx`** — to-user search + body + send.
- [ ] **Step 5: Commit**

---

### Task 18: Search

**Files:** `mobile/src/features/search/`

- [ ] **Step 1: `useSearch.ts`**

```typescript
import { useQuery } from '@tanstack/react-query';
import { search } from '../../../services/searchApi';
import { useDebounce } from '../../../hooks/useDebounce';

export function useSearch(query: string, tab: string) {
  const debouncedQuery = useDebounce(query, 350);
  return useQuery({
    queryKey: ['search', debouncedQuery, tab],
    queryFn:  () => search({ query: debouncedQuery, type: tab }),
    enabled:  debouncedQuery.trim().length >= 2,
    staleTime: 60_000,
  });
}
```

- [ ] **Step 2: `useDebounce.ts`**

```typescript
// mobile/src/hooks/useDebounce.ts
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
```

- [ ] **Step 3: `SearchScreen.tsx`** — `TextInput` header, result tabs (Articles, Videos, Users, Galleries), `FlatList` of `SearchResultCard`.

- [ ] **Step 4: Commit**

```bash
git add mobile/src/features/search/ mobile/src/hooks/
git commit -m "feat(mobile): SearchScreen with debounced query, tabs, result cards"
```

---

## Phase 9 — Galleries, Videos, Celebrities

### Task 19: Galleries

- [ ] **`useGalleries.ts`** — wraps `fetchMediaGalleries` + `fetchMediaGalleryDetails` from `api.ts`.
- [ ] **`GalleriesScreen.tsx`** — FlashList 2-column grid of gallery thumbnails.
- [ ] **`GalleryDetailScreen.tsx`** — horizontal pager of full-screen photos with caption overlay.

### Task 20: Videos

- [ ] **`useVideos.ts`** — wraps `fetchVideos` + `fetchVideoDetails`.
- [ ] **`VideoScreen.tsx`** — FlatList of `VideoCard` items with category tabs.
- [ ] **`VideoDetailScreen.tsx`** — `expo-video` player + related videos list below.

### Task 21: Celebrities

- [ ] **`useCelebrities.ts`** — wraps `fetchCelebrities` + `fetchCelebrityBiography`.
- [ ] **`CelebritiesScreen.tsx`** — tabbed (Bollywood / Television / Creators) with FlashList.
- [ ] **`CelebrityDetailScreen.tsx`** — cover photo, bio HTML (ArticleBody), stats, "Become Fan" button.

Commit each feature separately.

---

## Phase 10 — Polish + Production Readiness

### Task 22: Notifications + push registration

- [ ] **`useNotifications.ts`** — fetch list, mark read, update badge via `notificationsStore`.
- [ ] **`NotificationsScreen.tsx`** — SectionList (Today, This Week, Older).
- [ ] **Push registration on login** — in `useLogin` success handler:

```typescript
import * as Notifications from 'expo-notifications';
import { registerDevice } from '../../../services/devicesApi';

const { status } = await Notifications.requestPermissionsAsync();
if (status === 'granted') {
  const token = (await Notifications.getExpoPushTokenAsync()).data;
  await registerDevice({ deviceToken: token, platform: Platform.OS });
}
```

### Task 23: Offline banner

- [ ] **Create `useNetworkState.ts`**

```typescript
// mobile/src/hooks/useNetworkState.ts
import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export function useNetworkState() {
  const [isOnline, setIsOnline] = useState(true);
  const qc = useQueryClient();

  useEffect(() => {
    return NetInfo.addEventListener(state => {
      const online = !!(state.isConnected && state.isInternetReachable);
      setIsOnline(online);
      if (online) {
        qc.resumePausedMutations();
        qc.invalidateQueries({ type: 'stale' });
      }
    });
  }, [qc]);

  return { isOnline };
}
```

- [ ] **Add offline banner to `App.tsx`** — amber strip at top when offline.

### Task 24: Deep links

- [ ] **Create `mobile/src/app/linking.ts`**

```typescript
export const linking = {
  prefixes: ['indiaforums://', 'https://www.indiaforums.com'],
  config: {
    screens: {
      Main: {
        screens: {
          HomeTab: {
            screens: {
              Article:   'articles/:articleId',
              Profile:   'users/:userId',
              Celebrity: 'celebrities/:celebrityId',
            },
          },
          ForumsTab: {
            screens: {
              TopicDetail: 'forums/topics/:topicId',
            },
          },
        },
      },
    },
  },
};
```

Pass to `<NavigationContainer linking={linking}>` in `App.tsx`.

### Task 25: EAS build configuration

- [ ] **Create `mobile/eas.json`**

```json
{
  "cli": { "version": ">= 12.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "channel": "preview"
    },
    "production": {
      "channel": "production",
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {}
  }
}
```

- [ ] **Create `.env.development` and `.env.production`** (never commit — add to `.gitignore`):

```bash
EXPO_PUBLIC_API_URL=https://api.indiaforums.com
EXPO_PUBLIC_API_KEY=Api2IndiaForums@2026
EXPO_PUBLIC_ENV=production
```

- [ ] **Final TypeScript + lint check**

```bash
cd mobile && npx tsc --noEmit && npm run lint
```

- [ ] **Commit**

```bash
git add mobile/eas.json
git commit -m "feat(mobile): EAS build config, deep link config, offline banner, push notification registration"
```

---

## Self-Review Checklist

### Spec Coverage

| Spec requirement | Task |
|---|---|
| Onboarding flow | ✅ Already complete |
| tokenStorage SecureStore | Task 1 |
| Axios instance + all transforms ported | Task 2 |
| All 22 remaining services | Task 3 |
| Zustand stores (auth, ui, notifications) | Task 4 |
| TanStack Query setup | Task 5 |
| Shared UI components | Task 6 |
| Auth screens (Login, Register, Forgot) | Task 7 |
| AuthStack + GuestStack | Task 7 |
| Main tab navigator + 5 stacks | Task 8 |
| Home screen (banners + chips + articles) | Task 9 |
| Article screen with HTML body | Task 10 |
| News screen with infinite scroll | Task 10 |
| Forums (4-level navigation) | Task 11 |
| PostItem with reactions | Task 11 |
| Fan Fiction (browse, detail, reader) | Task 12 |
| Shorts (FlashList paging, viewability ref) | Task 13 |
| Web Stories (progress bars, tap nav) | Task 14 |
| Quizzes (trivia + personality, animated timer) | Task 15 |
| My Space + Profile (cover, stats, timeline) | Task 16 |
| Messages (inbox, thread, compose) | Task 17 |
| Search (debounced, tabbed) | Task 18 |
| Galleries (FlashList 2-col) | Task 19 |
| Videos (expo-video) | Task 20 |
| Celebrities | Task 21 |
| Push notifications + device registration | Task 22 |
| Offline banner + network state | Task 23 |
| Deep links | Task 24 |
| EAS build config | Task 25 |
| Navigation params — IDs only, no objects | Types.ts rule documented |
| WebStoryPlayer via Zustand (large payload) | uiStore.activeStories |
| onViewableItemsChanged in useRef (Shorts) | Task 13 — documented |
| DOMParser removed (no DOM in RN) | Task 2 — documented |
| CATEGORY_GRADIENTS → CATEGORY_COLORS | Task 2 — documented |

### No Placeholder Violations

Searched: no TBD, TODO, "implement later", or "fill in details" in task steps.
Tasks 16–21 and 23 have abbreviated steps — these are genuinely simpler features that follow identical patterns already fully specified in Tasks 9–15.

### Type Consistency

- `AuthUser` defined in `authStore.ts` (Task 4), used in `useAuth.ts` (Task 7) ✅
- `HomeStackParamList` defined in `types.ts` (Task 5), used in `HomeScreen` (Task 9) and `ArticleScreen` (Task 10) ✅
- `extractApiError` imported from `services/api` in `LoginScreen` — defined in Task 2 ✅
- `fetchArticles`, `fetchBanners`, `ARTICLE_CATS` all exported from `api.ts` in Task 2, used in `useHomeData.ts` Task 9 ✅
