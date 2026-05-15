# Search: switch to `/search/smart` single-endpoint design

**Date:** 2026-05-14
**Branch:** `feat/celebrity-profile-tier1`
**Owner:** mobile app

## Goal

Replace the current two-endpoint search (`/search/suggest` + `/search/results`) with the single `/search/smart` endpoint, and collapse the two-screen flow (SearchMain + SearchResults) into one screen. Surface the `trendingSearches` payload as the empty-state hero.

## Why

- `/search/smart` returns server-grouped, server-ordered sections plus trending searches in a single call — the typeahead and the "submitted" view become identical, so two screens add no value.
- The current client-side `groupSuggestions` / `groupResults` utilities reinvent ordering the server now provides natively.
- `/search/smart` drops `searchLogId` and per-item `score`, so `/search/click` tracking and the "scored top result" idea no longer apply — simpler store shape.

## API surface (from OpenAPI v1)

`GET /api/v1/search/smart?query=<q>&contentTypeId=<n>`

- **No query** → trending-only response (sections empty).
- **query + `contentTypeId=0`** → up to 3 items per section across all content types + trending.
- **query + `contentTypeId=1..9`** → only that section + trending.

ContentType IDs: `1=Article, 2=Movie, 3=Show, 4=Celebrity, 5=Video, 6=Photo/Gallery, 7=Channel, 8=Topic, 9=User/Member`.

**`SmartSearchResponseDto`**
```
query: string
contentTypeId: int
sections: SmartSearchSectionDto[]
trendingSearches: SmartTrendingItemDto[]
```

**`SmartSearchSectionDto`** — `{ section: string, contentTypeId: int, items: SmartSearchItemDto[] }`

**`SmartSearchItemDto`** — `{ itemId, title, pageUrl?, updateChecksum?, thumbnailUrl?, contentType }`

**`SmartTrendingItemDto`** — `{ query, searchCount }`

## Scope

In scope:

- New `searchApi.smart()` function; deletion of `suggest`, `searchResults`, `trackClick`.
- Rewrite of `searchStore` to a single status/sections/trending model.
- One-screen `SearchScreen` (rename of `SearchMainScreen`); deletion of `SearchResultsScreen`.
- New `TrendingChips` component for the empty state.
- Adaptation of item-renderers (`ResultCard`, `TopResultCard`) and the entity-navigator hook to `SmartSearchItemDto`.

Out of scope (future):

- `/search` paginated endpoint to power "See all" within a section.
- Persisting `trending` to MMKV.
- Re-introducing click tracking once a future API supports it on `/search/smart`.

## Store shape

```ts
interface SearchState {
  query: string;
  status: 'idle' | 'loading' | 'success' | 'empty' | 'error';
  sections: SmartSearchSectionDto[];
  trending: SmartTrendingItemDto[];
  activeContentTypeId: number | null;   // null = "All"; client-side filter
  recents: RecentSearch[];              // MMKV-backed, unchanged

  setQuery(q: string): void;            // 200ms debounce → smart(q, 0); empty q → loadTrending()
  submit(q: string): void;              // immediate smart(q, 0) + addRecent
  setFilter(id: number | null): void;   // pure client-side
  loadTrending(): void;                 // smart() with no query (mount)
  addRecent / removeRecent / clearRecents  // unchanged
}
```

Drops from current store: `submittedQuery`, `searchLogId`, `results` vs `suggestions` split, `activeEntityType` (string → numeric `activeContentTypeId`). The two abort controllers collapse to one (`smartController`). Pull-to-refresh removed — refresh is rerunning the same `smart(query, 0)` call, which the user gets by submitting again; no list-level refresh control needed.

## Screen states

**A. Empty input** — Trending chip cloud at top, then Recents list.

**B. Typing OR after submit** (same render path; submit does not navigate)
- Chip strip derived from `sections[].contentTypeId` (prefixed with "All").
- "TOP RESULT" hero card = `sections[0].items[0]` when `activeContentTypeId == null` and `sections.length > 0`.
- Sections render in server order, capped to 3 items per the API.

**C. Error** — centered offline icon + Retry (re-invokes `setQuery(query)`).

**D. Empty results** — "No results for "<q>"" + tip line.

## Entity navigation

`SmartSearchItemDto.contentType` is a string from the set `{Topics, Articles, People, Videos, Galleries, Members, Movies, Shows, Channels}`. `useEntityNavigator` becomes a switch on that string, using `itemId` + `pageUrl` for routing. Unknown / unsupported types fall through to `UnsupportedEntitySheet`. Click tracking is dropped.

## File-level changes

| Path | Action |
|---|---|
| `mobile/src/services/searchApi.ts` | Replace contents — `smart()` only, three DTO exports |
| `mobile/src/store/searchStore.ts` | Rewrite per Store Shape above |
| `mobile/src/navigation/SearchStack.tsx` | Remove `SearchResults` route |
| `mobile/src/navigation/types.ts` | Remove `SearchResults` from `SearchStackParamList` |
| `mobile/src/features/search/screens/SearchMainScreen.tsx` | Rename → `SearchScreen.tsx`; absorb results body |
| `mobile/src/features/search/screens/SearchResultsScreen.tsx` | Delete |
| `mobile/src/features/search/components/SuggestionSpotlight.tsx` | Rename → `TopResultCard.tsx`; adapt to `SmartSearchItemDto` |
| `mobile/src/features/search/components/ResultCard.tsx` | Adapt to `SmartSearchItemDto` |
| `mobile/src/features/search/components/SuggestionRow.tsx` | Delete (merged into `ResultCard`) |
| `mobile/src/features/search/components/SuggestionSection.tsx` | Rename → `SectionHeader.tsx`; add optional `onSeeAll` slot (no-op for now) |
| `mobile/src/features/search/components/EntityTypeChip.tsx` | Keep; accepts numeric `contentTypeId` |
| `mobile/src/features/search/components/ResultCardSkeleton.tsx` | Keep |
| `mobile/src/features/search/components/SuggestionSkeleton.tsx` | Delete |
| `mobile/src/features/search/components/BrowseTile.tsx` | Delete |
| `mobile/src/features/search/components/ResultsContextLine.tsx` | Keep |
| `mobile/src/features/search/components/RecentRow.tsx` | Keep |
| `mobile/src/features/search/components/SearchInputHeader.tsx` | Keep |
| `mobile/src/features/search/components/HighlightedText.tsx` | Keep |
| `mobile/src/features/search/components/Shimmer.tsx` | Keep |
| `mobile/src/features/search/components/UnsupportedEntitySheet.tsx` | Keep |
| `mobile/src/features/search/components/TrendingChips.tsx` | New — chip cloud rendering `SmartTrendingItemDto[]` |
| `mobile/src/features/search/utils/groupSuggestions.ts` | Delete |
| `mobile/src/features/search/utils/entityMetadata.ts` | Adapt — maps `contentType` string → label + Ionicon + `contentTypeId` |
| `mobile/src/features/search/utils/entityIcon.ts` | Keep |
| `mobile/src/features/search/hooks/useEntityNavigator.ts` | Adapt — `openItem(item: SmartSearchItemDto)`; drop click-tracking |

## Verification

- `npm run tsc` clean.
- `npm run lint` clean for touched files.
- Manual smoke: empty input → trending chips + recents; type "salman" → Top Result + sections matching the documented response; tap "People" chip → filters to People rows only; tap a Topic / Member / Article → opens entity; clear input → back to trending.

## Risks

- `/search/smart` is heavier per keystroke than `/search/suggest` (full items with thumbnails vs phrase strings). Mitigation: existing 200ms debounce + single-flight abort. If perceived latency is poor, we can later add `/suggest` back as a fast-path for the first 1–2 characters.
- Entity-navigation behavior must be re-verified for every `contentType` string — we lose the `entityType` enum we were mapping against.
