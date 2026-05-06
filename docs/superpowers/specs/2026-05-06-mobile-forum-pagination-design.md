# Mobile Forum Pagination — Design

**Date:** 2026-05-06
**Affects:** `mobile/` app — forum list and forum-thread (topics) screens.

## Problem

The web at `https://www.indiaforums.com/forum/bollywood?mode=card` uses numbered page buttons (1, 2, 3, …). The mobile app already loads more pages when you scroll, but it gives no orientation: users can't see what page they're on, can't see how many pages exist, and can't jump to a specific page (e.g. "page 7 where I was last reading"). For a power-user surface like Bollywood (15+ topic pages, 75+ forum pages overall), that's a real gap.

## Non-goals

- Replacing infinite scroll with old-school numbered pages — that's regressive on mobile.
- Touching `TopicDetailScreen` (posts inside a topic), search results, or "My Forums" — they have separate pagination needs.

## The pattern (modern mobile)

Pure infinite scroll wins for feeds (Reddit, X, Instagram, TikTok). Forums are a power-user surface — Tapatalk, Apple Mail (jump-to-date), and Slack (jump-to-date) all keep their main flow scroll-based but add a precise jump affordance for users who need it. We do the same:

1. **Keep infinite scroll exactly as it is.**
2. **Add a small chip to the existing count row** showing `Page X / Y · N topics`. The chip updates as the user scrolls — X reflects the topmost visible item's page, not the highest-loaded page.
3. **Tapping the chip opens a bottom sheet** with a numeric grid of pages plus a "Go to page ___" input for forums with many pages.
4. **Selecting page N resets the infinite query** with `initialPageParam: N` and scrolls the list to top. From there, scrolling continues N+1, N+2, …

This gives the website's mental model (visible page numbers, ability to jump) without breaking the mobile flow.

## Surfaces

| Screen | Hook | Total source |
|---|---|---|
| `ForumListView` (forum list) | `useForumHome` | server-provided `totalPages`, `totalForumCount` |
| `ForumThreadScreen` (topics in forum) | `useForumTopics` | derived: `ceil(forumDetail.topicCount / 20)` |

## Components

- **`PageIndicatorChip`** (new, shared): displays `Page X / Y` with a small chevron. Tappable. Hidden when totalPages ≤ 1.
- **`JumpToPageSheet`** (new, shared): bottom sheet with a grid of page numbers (responsive columns), a "Go to page" numeric input, and an apply button. Highlights the current page.

## Hook changes

Both `useForumHome` and `useForumTopics` accept an optional `startPage` parameter:
- Added to `queryKey` so changing it triggers a fresh query (cache-isolated per start page).
- Used as `initialPageParam`.
- `getNextPageParam` continues incrementing from there (`last.pageNumber + 1`).

## Tracking the visible page

Both lists already use FlashList / FlatList. We attach `onViewableItemsChanged` with `itemVisiblePercentThreshold: 50`, take the smallest visible index, and compute `currentPage = startPage + floor(visibleIndex / PAGE_SIZE)`. Mid-page items round down to that page; this is correct because each loaded page contains exactly `PAGE_SIZE` items except possibly the last.

## Edge cases

- Forum with 1 page → chip hidden.
- Jump beyond loaded data → `useInfiniteQuery` reset handles it; loading state is the existing `LoadingState` placeholder.
- User scrolls back into already-loaded earlier pages — chip's `currentPage` reflects that correctly.
- Search mode (active query in search bar) — chip hidden; pagination resumes when search clears.
- Network error on jump → existing `ErrorState` + retry already covers it.

## Out-of-scope improvements deliberately not bundled

- Persisting the user's last-read page across sessions (could be added later).
- Deep-linking into a specific page via URL (could be added later).
- Animated scroll-to-page transitions beyond the default scroll-to-top.
