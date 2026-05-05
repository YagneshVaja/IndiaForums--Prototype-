# Search Tab — Native Topic + Forum Handling — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the "Open in browser" sheet for `Topic` and `Forum` search results with native navigation into the existing forum screens, plus soften the sheet copy that still applies to Movie / Show.

**Architecture:** Same stub-synthesis pattern already used for `Person → CelebrityProfile`. The reused screens (`TopicDetailScreen`, `ForumThreadScreen`) already merge the route-param object with their server fetch (`{ ...topic, ...firstPage.topicDetail }`), so a minimal stub heals as soon as the data lands.

**Tech Stack:** React Native, Expo, TypeScript, `@react-navigation/native-stack`. No new dependencies.

**Spec:** [docs/superpowers/specs/2026-04-29-search-tab-topic-forum-native.md](../specs/2026-04-29-search-tab-topic-forum-native.md)

**Verification model:** `cd mobile && npm run tsc` after every task. `npm run lint` is broken repo-wide for unrelated eslint 9 reasons. Manual smoke test at the end (Task 4).

---

## File map

**Modified:**
- `mobile/src/navigation/types.ts` — add `TopicDetail` and `ForumThread` routes to `SearchStackParamList`.
- `mobile/src/navigation/SearchStack.tsx` — register the two reused screens.
- `mobile/src/features/search/hooks/useEntityNavigator.ts` — add `Topic` and `Forum` cases plus their stub synthesizers.
- `mobile/src/features/search/components/UnsupportedEntitySheet.tsx` — soften copy.

No new files.

---

## Task 1: Extend `SearchStackParamList`

**Files:**
- Modify: `mobile/src/navigation/types.ts:105-114`

- [ ] **Step 1: Open the file and locate the `SearchStackParamList` type.** It currently looks like this:

```ts
export type SearchStackParamList = {
  SearchMain: undefined;
  SearchResults: undefined;
  ArticleDetail: { id: string; thumbnailUrl?: string; title?: string };
  CelebrityProfile: { celebrity: import('../services/api').Celebrity };
  VideoDetail: { video: import('../services/api').Video };
  GalleryDetail:
    | { gallery: import('../services/api').Gallery }
    | { id: string | number; title?: string; thumbnail?: string | null };
};
```

- [ ] **Step 2: Replace it with the version below.** Two new routes are added, mirroring the param shapes already used by `ForumsStackParamList` and `MySpaceStackParamList`. Note that `TopicDetail` accepts the same optional `forum`, `jumpToLast`, and `autoAction` fields the existing route does — search will only ever pass `{ topic }`, but the broader shape keeps the type compatible if the screen ever pushes back into the stack with a richer payload.

```ts
export type SearchStackParamList = {
  SearchMain: undefined;
  SearchResults: undefined;
  ArticleDetail: { id: string; thumbnailUrl?: string; title?: string };
  CelebrityProfile: { celebrity: import('../services/api').Celebrity };
  VideoDetail: { video: import('../services/api').Video };
  GalleryDetail:
    | { gallery: import('../services/api').Gallery }
    | { id: string | number; title?: string; thumbnail?: string | null };
  ForumThread: { forum: import('../services/api').Forum };
  TopicDetail: {
    topic: import('../services/api').ForumTopic;
    forum?: import('../services/api').Forum;
    jumpToLast?: boolean;
    autoAction?: 'like' | 'reply' | 'quote';
  };
};
```

- [ ] **Step 3: Verify type-check.**

```bash
cd mobile && npm run tsc
```

Expected: exit 0.

- [ ] **Step 4: Stage but do NOT commit.**

```bash
git add mobile/src/navigation/types.ts
```

Suggested commit message (controller will commit): `refactor(mobile): add Topic and Forum routes to SearchStackParamList`.

---

## Task 2: Wire `SearchStack.tsx` to the reused forum screens

**Files:**
- Modify: `mobile/src/navigation/SearchStack.tsx`

- [ ] **Step 1: Open the file. It currently registers six screens.** Replace the entire file contents with the version below — adds two `Stack.Screen` registrations and two imports.

```tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { SearchStackParamList } from './types';

import SearchMainScreen from '../features/search/screens/SearchMainScreen';
import SearchResultsScreen from '../features/search/screens/SearchResultsScreen';
import ArticleDetailScreen from '../features/news/screens/ArticleDetailScreen';
import CelebrityDetailScreen from '../features/celebrities/screens/CelebrityDetailScreen';
import VideoDetailScreen from '../features/videos/screens/VideoDetailScreen';
import GalleryDetailScreen from '../features/galleries/screens/GalleryDetailScreen';
import TopicDetailScreen from '../features/forums/screens/TopicDetailScreen';
import ForumThreadScreen from '../features/forums/screens/ForumThreadScreen';

const Stack = createNativeStackNavigator<SearchStackParamList>();

export default function SearchStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SearchMain" component={SearchMainScreen} />
      <Stack.Screen name="SearchResults" component={SearchResultsScreen} />
      <Stack.Screen name="ArticleDetail" component={ArticleDetailScreen} />
      <Stack.Screen name="CelebrityProfile" component={CelebrityDetailScreen} />
      <Stack.Screen name="VideoDetail" component={VideoDetailScreen} />
      <Stack.Screen name="GalleryDetail" component={GalleryDetailScreen} />
      <Stack.Screen name="TopicDetail" component={TopicDetailScreen} />
      <Stack.Screen name="ForumThread" component={ForumThreadScreen} />
    </Stack.Navigator>
  );
}
```

- [ ] **Step 2: Verify type-check.**

```bash
cd mobile && npm run tsc
```

Expected: exit 0. (TypeScript may warn about route-prop nominal types if either screen types its `useRoute<RouteProp<ForumsStackParamList, ...>>()` — but the same screens are already shared by `MySpaceStack` so the pattern is established.)

- [ ] **Step 3: Stage but do NOT commit.**

```bash
git add mobile/src/navigation/SearchStack.tsx
```

Suggested commit message: `feat(mobile): wire Topic and Forum screens into SearchStack`.

---

## Task 3: Add `Topic` and `Forum` cases to `useEntityNavigator`

**Files:**
- Modify: `mobile/src/features/search/hooks/useEntityNavigator.ts`

The current default case opens the `UnsupportedEntitySheet` for any `entityType` not explicitly handled. We add two new switch cases, define two new stub synthesizers, and leave the `default` for `Movie`, `Show`, and unknowns.

- [ ] **Step 1: Open the file and find the import block (lines 12–13).** The existing line is:

```ts
import { fetchVideoDetails, type Celebrity } from '../../../services/api';
```

Replace it with:

```ts
import {
  fetchVideoDetails,
  type Celebrity,
  type Forum,
  type ForumTopic,
} from '../../../services/api';
```

- [ ] **Step 2: Find the `synthesizeCelebrity` helper (around line 49–69) and add two new helpers immediately below it.** Insert this block after the closing `}` of `synthesizeCelebrity`:

```ts
/**
 * Builds a minimal ForumTopic from a search payload. TopicDetailScreen drives
 * its post fetch off `topic.id` and merges the server's `topicDetail` over the
 * route param via `{ ...topic, ...firstPage.topicDetail }`, so the zeroed
 * fields below are placeholders that are replaced as soon as the first page
 * lands.
 */
function synthesizeForumTopic(e: SearchEntityShape): ForumTopic {
  return {
    id: e.entityId ?? 0,
    forumId: 0,
    forumName: '',
    forumThumbnail: null,
    title: e.title,
    description: '',
    poster: '',
    lastBy: '',
    time: '',
    lastTime: '',
    replies: 0,
    views: 0,
    likes: 0,
    locked: false,
    pinned: false,
    flairId: 0,
    topicImage: e.imageUrl,
    tags: [],
    linkTypeValue: '',
    poll: null,
  };
}

/**
 * Builds a minimal Forum from a search payload. ForumThreadScreen drives its
 * topic-list fetch off `forum.id` and merges the server's `forumDetail` over
 * the route param via `firstPage?.forumDetail || forum`, so the zeroed fields
 * below are placeholders that get replaced as soon as the first page lands.
 */
function synthesizeForum(e: SearchEntityShape): Forum {
  return {
    id: e.entityId ?? 0,
    name: e.title,
    description: '',
    categoryId: 0,
    slug: e.url ?? '',
    topicCount: 0,
    postCount: 0,
    followCount: 0,
    rank: 0,
    prevRank: 0,
    rankDisplay: '',
    bg: '',
    emoji: '',
    bannerUrl: null,
    thumbnailUrl: e.imageUrl,
    locked: false,
    hot: false,
    priorityPosts: 0,
    editPosts: 0,
    deletePosts: 0,
  };
}
```

- [ ] **Step 3: Find the switch statement inside `navigateNative` (around line 96–137). The current `case 'Person':` block reads:**

```ts
        case 'Person':
          navigation.push('CelebrityProfile', {
            celebrity: synthesizeCelebrity(e),
          });
          return;
        default:
```

Insert two new cases between `'Person'` and `default`:

```ts
        case 'Person':
          navigation.push('CelebrityProfile', {
            celebrity: synthesizeCelebrity(e),
          });
          return;
        case 'Topic':
          navigation.push('TopicDetail', {
            topic: synthesizeForumTopic(e),
          });
          return;
        case 'Forum':
          navigation.push('ForumThread', {
            forum: synthesizeForum(e),
          });
          return;
        default:
```

- [ ] **Step 4: Verify type-check.**

```bash
cd mobile && npm run tsc
```

Expected: exit 0.

- [ ] **Step 5: Stage but do NOT commit.**

```bash
git add mobile/src/features/search/hooks/useEntityNavigator.ts
```

Suggested commit message: `feat(mobile): route Topic and Forum search results to native screens`.

---

## Task 4: Soften `UnsupportedEntitySheet` copy and run final smoke test

**Files:**
- Modify: `mobile/src/features/search/components/UnsupportedEntitySheet.tsx`

After Task 3 the sheet only ever fires for `Movie`, `Show`, and unknown future types. Reframe the body copy from "isn't available in the app yet" to "we're still building this" so users read it as in-progress, not as a permanent omission.

- [ ] **Step 1: Open the file and find the body text (around line 92–95):**

```tsx
              <Text style={styles.body2}>
                This {payload.entityType.toLowerCase()} page isn't available in
                the app yet. Open it on the web to view full details.
              </Text>
```

Replace it with:

```tsx
              <Text style={styles.body2}>
                We're still building {payload.entityType.toLowerCase()} pages
                in the app. Open it on the web for now.
              </Text>
```

- [ ] **Step 2: Verify type-check.**

```bash
cd mobile && npm run tsc
```

Expected: exit 0.

- [ ] **Step 3: Stage but do NOT commit.**

```bash
git add mobile/src/features/search/components/UnsupportedEntitySheet.tsx
```

- [ ] **Step 4: Manual smoke test on device / simulator.** Start the dev server:

```bash
cd mobile && npm start
```

Walk through:
1. Open the Search tab. Type a query that returns Topic results (e.g. `"shrimad ramayan"` returned a `Show` and `Topic` mix earlier — try `"karan johar"` or any active forum's name).
2. Tap a `Topic` result → `TopicDetailScreen` mounts. Header may briefly show empty/zero values. Within ~500ms the post fetch lands and the topic header populates with the real subject, replies, etc. Posts render below.
3. Tap back → returns to `SearchResults` with prior state intact.
4. Re-search and tap a `Forum` result → `ForumThreadScreen` mounts. Topic list fetches and renders. Header forum name and follow button populate from the merged `firstPage?.forumDetail`.
5. Re-search "shaheed" or "tu yaa main" (Movie) and tap → `UnsupportedEntitySheet` opens with the new copy: "We're still building movie pages in the app. Open it on the web for now." Tap "Open in browser" → public web page opens, sheet closes.
6. Re-search a `Show` and confirm the same softer copy appears.

If any cosmetic zero-count breaks the topic / forum header during the loading window, note the specific element. The Celebrity-style `> 0` guard pattern can patch it in a follow-up; based on the screen code (`{ ...topic, ...firstPage.topicDetail }` for Topic, `firstPage?.forumDetail || forum` for Forum), the most likely candidates are:
- `replies` / `views` count pills in the topic header.
- `followCount` / `topicCount` in the forum header.

If something looks broken, re-open `mobile/src/features/forums/screens/TopicDetailScreen.tsx` (or `ForumThreadScreen.tsx`), find the offending render, and add a `> 0` guard. Keep the change scoped — don't refactor the screen.

- [ ] **Step 5: Final type-check sweep.**

```bash
cd mobile && npm run tsc
```

Expected: exit 0.

- [ ] **Step 6: Commit (controller will run this after you confirm).** Suggested message:
`feat(mobile): native Topic/Forum from search; soften sheet copy for Movie/Show`.

---

## Acceptance criteria coverage

| Spec criterion | Task |
|---|---|
| 1. Topic search-tap → native TopicDetailScreen with posts | Tasks 1–3 |
| 2. Forum search-tap → native ForumThreadScreen with topic list | Tasks 1–3 |
| 3. Back-nav preserves search state | Already covered by store; verified in Task 4 smoke test |
| 4. Movie/Show sheet body uses softer copy | Task 4 |
| 5. `npm run tsc` passes after every commit | Tasks 1–4 |
| 6. No visible 0-padding cosmetics from stubs | Task 4 smoke test + targeted guard if needed |

---

## Self-review notes

- All steps contain concrete code, exact paths, and exact commands.
- No TBD / TODO / "implement later" markers.
- Type identifiers are consistent: `synthesizeForumTopic`, `synthesizeForum` are introduced in Task 3 and only consumed in the same task.
- Spec coverage: every numbered acceptance criterion has a task that implements or verifies it.
- Granularity is intentionally moderate (not 1–2 minute steps) because each task is a single small edit; over-decomposing would add noise.
