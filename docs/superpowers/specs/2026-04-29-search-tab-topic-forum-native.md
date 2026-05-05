# Search Tab — Native Handling for Topic and Forum

**Date:** 2026-04-29
**Status:** Design approved, pending implementation plan
**Surface:** `mobile/` (React Native + Expo)
**Builds on:** [2026-04-29-mobile-search-tab-design.md](./2026-04-29-mobile-search-tab-design.md)

## Goal

Replace the "Open in browser" sheet for `Topic` and `Forum` search results with
native navigation into the existing `TopicDetailScreen` and `ForumThreadScreen`,
following the same stub-synthesis pattern already used for `Person`. Movie and
Show keep going to the sheet (their backends are non-functional today).

## Background — why the sheet existed

The original search-tab spec deliberately punted Topic, Forum, Movie, and Show
to a web-fallback sheet. The justification for Topic/Forum at the time was that
their detail screens require full domain objects (`ForumTopic` / `Forum`) and we
didn't have by-id fetchers. After the search feature shipped and the user saw
the sheet on a Show search-tap, they asked for native handling for everything
that backend reality permits. Movie and Show backends (`/movies/{id}/story`,
`/cast`, `/reviews`, `/shows/{id}/about`, `/cast`) are returning 500/400/404
right now, so they remain on the sheet. Topic and Forum are buildable.

## API reality check

Re-probed live (2026-04-29):

| Endpoint | Status |
|---|---|
| `GET /movies/{titleId}/story` | 500 Internal Server Error |
| `GET /movies/{titleId}/cast` | 400 Invalid Operation |
| `GET /movies/{titleId}/reviews` | 400 Invalid Operation |
| `GET /shows/{id}/about` | 404 "Error retrieving show information" |
| `GET /shows/{id}/cast` | 404 |
| `GET /forums/topics/{topicId}/posts` | 200 (already used by `useTopicPosts`) |
| `GET /forums/{forumId}/topics` | 200 (already used by `useForumTopics`) |

Topic + Forum work; Movie + Show don't.

## Decisions

1. **Stub-synthesis, not by-id fetch.** Like `Person → CelebrityProfile`, the
   search payload becomes a minimal `ForumTopic` (or `Forum`) stub with `id`
   and a display-friendly `title`/`name` set, and zero/empty/null for everything
   else. The reused screen self-fetches real data on mount.
2. **Reuse existing screens.** `TopicDetailScreen` and `ForumThreadScreen` are
   mounted in the search stack with the same param shapes used by
   `ForumsStackParamList` and `MySpaceStackParamList`. No copies.
3. **Movie/Show stay on the sheet.** Soften the body copy so users don't read
   it as a permanent "this feature doesn't exist" instead of "the backend
   isn't ready yet."
4. **Defensive zero-guards.** Spot-check `TopicDetailScreen` and
   `ForumThreadScreen` for visible header cosmetics that read raw zero counts
   from the route param (the way `CelebrityDetailScreen` did with the `#0 This
   Week` rank pill). Guard any that exist with a `> 0` conditional. If none,
   no extra change.

## Architecture

### Files modified

| File | Change |
|---|---|
| `mobile/src/navigation/types.ts` | Add `TopicDetail` and `ForumThread` routes to `SearchStackParamList`, mirroring `ForumsStackParamList`'s shapes. |
| `mobile/src/navigation/SearchStack.tsx` | Register the two reused screens. |
| `mobile/src/features/search/hooks/useEntityNavigator.ts` | Add `Topic` and `Forum` cases with stub synthesizers. Drop them from the `default` fallback. |
| `mobile/src/features/search/components/UnsupportedEntitySheet.tsx` | Update body copy from "isn't available in the app yet" → "We're still building this. Open it on the web for now." |
| `mobile/src/features/forums/screens/TopicDetailScreen.tsx` | Spot-check + zero-guard if needed. |
| `mobile/src/features/forums/screens/ForumThreadScreen.tsx` | Spot-check + zero-guard if needed. |

No new files. No new API client functions. No store changes.

### `useEntityNavigator` flow additions

```
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
```

### Stub synthesizer field map

**`synthesizeForumTopic(e: SearchEntityShape): ForumTopic`** — load-bearing
fields are `id` (real, from `entityId`), `title` (real, from search title).
Everything else is the safest zero/empty/null default the type allows:
`forumId: 0`, `forumName: ''`, `forumThumbnail: null`, `description: ''`,
`poster: ''`, `lastBy: ''`, `time: ''`, `lastTime: ''`, `replies: 0`,
`views: 0`, `likes: 0`, `locked: false`, `pinned: false`, `flairId: 0`,
`topicImage: e.imageUrl`, `tags: []`, `linkTypeValue: ''`, `poll: null`.

**`synthesizeForum(e: SearchEntityShape): Forum`** — load-bearing fields are
`id` (real, from `entityId`), `name` (real, from search title). Everything
else: `description: ''`, `categoryId: 0`, `slug: e.url ?? ''`,
`topicCount: 0`, `postCount: 0`, `followCount: 0`, `rank: 0`, `prevRank: 0`,
`rankDisplay: ''`, `bg: ''`, `emoji: ''`, `bannerUrl: null`,
`thumbnailUrl: e.imageUrl`, `locked: false`, `hot: false`,
`priorityPosts: 0`, `editPosts: 0`, `deletePosts: 0`.

### `TopicDetailScreen` confirmed dependency

`useTopicPosts(topic.id)` at line 116 — reads only `topic.id` to drive the
posts fetch. Header surfaces (subject, replies, views, last-by) render from
the route param initially but are non-blocking; they get replaced or remain
as zeros until the user pulls-to-refresh. Acceptable for this v1.

### `ForumThreadScreen` confirmed dependency

`useForumTopics(forum.id, ...)` (line 36 reads `forum`, line ~50 uses `forum.id`)
— drives the topic-list fetch. Header (forum name, follow count, rank) renders
from the route param initially.

## Error & edge cases

- **Stub leaks visible zeros.** If either screen prominently displays a zero
  count from the route param before its hook resolves, do the same `> 0`
  guard we applied to `CelebrityDetailScreen.tsx:117`. The implementation
  step inspects both screens; if no such display exists, no extra change.
- **Topic / Forum fetch fails.** The reused screens already render
  `ErrorState` with a retry button on fetch failure (verified in
  `TopicDetailScreen.tsx` imports). No new handling needed.
- **Movie/Show users.** They get the same sheet but with copy that frames
  the limitation as temporary, not as a deliberate omission.

## Acceptance criteria

1. Tap a `Topic` search result → `TopicDetailScreen` mounts, posts fetch
   succeeds, and the screen renders the topic body the way it would from
   any other entry point.
2. Tap a `Forum` search result → `ForumThreadScreen` mounts, the topic list
   fetches, and the screen renders normally.
3. Back-navigate from Topic / Forum → returns to `SearchResults` with the
   prior query, results, and active filter intact (already covered by the
   store's existing persistence).
4. Tap a `Movie` or `Show` result → still get the sheet, but the body now
   says "We're still building this. Open it on the web for now." (or
   equivalent that frames it as in-progress).
5. `npm run tsc` passes after every commit.
6. No visible `0`-padding cosmetics from the synthesized stubs (e.g. no
   "0 replies" pill before the real fetch resolves).

## Out of scope

- New native Movie / Show screens.
- New API endpoints.
- Refactoring the existing forum screens beyond zero-guards.
- Changing the search-tab store, results screen, or main screen.
