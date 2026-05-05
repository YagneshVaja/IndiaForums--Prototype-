# Mobile Search Tab — Smart Search Integration

**Date:** 2026-04-29
**Status:** Design approved, pending implementation plan
**Surface:** `mobile/` (React Native app, Expo + React Navigation)

## Goal

Replace the placeholder Search tab with a production-grade search experience
backed by the Smart Search API (`/api/v1/search/{suggest,results,click}`).
Users can type queries, see fast typeahead suggestions that jump directly to
entity pages, submit full searches with entity-type filtering, and revisit
recent queries.

## API surface (already shipped server-side)

Tag: `Smart Search` on `https://api2.indiaforums.com`.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/v1/search/suggest?q=` | Fast typeahead. Returns up to 10 weight-ordered `SuggestItemDto`. No logging. |
| `GET` | `/api/v1/search/results?q=&entityType=&page=&pageSize=` | Up to 50 scored results. Returns a `searchLogId` used for click learning. |
| `POST` | `/api/v1/search/click` body `{searchLogId, entityType, entityId}` | Tracks the click and inserts a new suggestion for future autocomplete. |

`SuggestItemDto`: `phrase, entityType, entityId, url, imageUrl, weight`
`SearchResultItemDto`: `entityType, entityId, title, summary, url, imageUrl, score`

**Observed real `entityType` values:** `Movie`, `Person`, `Show`, `Article`,
`Video`, `Topic`. Other values (e.g. `Forum`, `Gallery`) are likely; the
client treats `entityType` as an open string and falls back gracefully.

**Pagination today:** the `page` parameter is plumbed but the live API
returned identical 50-item payloads for `page=1` and `page=2`. v1 ships as a
single page of up to 50 results. The page param stays in our client so an
infinite scroll can be slotted in once the backend fixes pagination, with no
restructuring.

## Decisions

1. **Empty state:** local recent-searches list + first-launch hint. No fake
   "trending" section (the API has no trending endpoint and faking it would
   look dishonest).
2. **Typeahead vs. full results:** suggest dropdown navigates *directly* to
   the entity (the DTO carries `entityId`/`entityType`/`url` for that
   purpose). Pressing Enter or tapping the trailing "Search for '{q}'" row
   submits the full search.
3. **Unsupported entity types (`Movie`, `Show`, future):** open a bottom
   sheet that links out to `https://www.indiaforums.com/{url}` via
   `Linking.openURL`. We still POST `/click` first.
4. **Click tracking:** fire-and-forget POST on results-screen taps only.
   Suggestion taps are not tracked (consistent with `/suggest` being
   no-logging).
5. **Persistence across re-entry:** query, results, and active filter live
   in a Zustand `searchStore` so tab switches and back-stack pops do not
   wipe state.
6. **Auth:** all three endpoints work with the API key alone. Search is
   available to Guest users too.

## Architecture

```
SearchStack
 ├─ SearchMain          input + recent searches + live typeahead dropdown
 ├─ SearchResults       submitted full results, filter chips, list
 ├─ ArticleDetail       (replace placeholder, wire to real screen)
 ├─ CelebrityProfile    (rename param to { celebrity } to match HomeStack)
 ├─ TopicDetail         (add — needs ForumTopic; fetched on click)
 ├─ ForumThread         (add)
 ├─ VideoDetail         (add — needs Video; fetched on click)
 └─ GalleryDetail       (add — supports id-only param shape already)
```

`MainTabParamList.Search` already exists. The tab icon is already wired in
`MainTabNavigator`.

## Components

### `mobile/src/services/searchApi.ts` (new)

Three thin functions returning typed DTOs that mirror the OpenAPI schemas:

- `suggest(q: string, signal?: AbortSignal): Promise<SuggestResponseDto>`
- `searchResults(args: { q; entityType?; page?; pageSize? }, signal?): Promise<SearchResultsResponseDto>`
- `trackClick(args: { searchLogId; entityType; entityId }): Promise<TrackSearchClickResponseDto>`

All three use the existing `apiClient` (handles `api-key` header and bearer
auth interceptor).

### `mobile/src/store/searchStore.ts` (new — Zustand)

State:
- `query: string`
- `submittedQuery: string` (the query that produced the current results)
- `suggestions: SuggestItemDto[]`
- `suggestStatus: 'idle' | 'loading' | 'error'`
- `results: SearchResultItemDto[]`
- `searchLogId: number | null`
- `resultsStatus: 'idle' | 'loading' | 'error' | 'empty' | 'success'`
- `activeEntityType: string | null` (null = All)
- `recents: { q: string; lastUsedAt: number }[]` (max 10)

Actions:
- `setQuery(q)` — updates input + triggers debounced suggest fetch.
- `submit(q)` — clears suggestions, fetches `/results`, persists to recents.
- `setEntityFilter(type)` — refires `/results` with filter.
- `clearRecents()`, `removeRecent(q)`.
- `addRecent(q)` — dedupes (moves dup to top), caps at 10, persists to AsyncStorage.

Single in-flight `AbortController` per kind (suggest, results) so old
responses cannot overwrite newer ones.

Recent searches are persisted under AsyncStorage key `search.recents.v1`,
hydrated lazily on first store access.

### `mobile/src/features/search/screens/SearchMainScreen.tsx` (new)

States selected by `(query, recents)`:

| State | Trigger | Renders |
|---|---|---|
| Idle | `query === ''` | Header text + entity-type browse chips on first launch; otherwise "Recent searches" list with per-row delete + Clear all. |
| Typing | `query.length >= 2` (debounced 250ms) | Suggestion dropdown — image, phrase, small entityType pill. Trailing row: "Search for '{q}'". |
| Empty suggest | typing but `suggestions.length === 0` | Falls through to recents + the "Search for '{q}'" row. |

Tapping a suggestion calls `useEntityNavigator` with the suggestion shape.
Pressing Enter or the trailing row calls `submit(q)` and navigates to
`SearchResults`.

### `mobile/src/features/search/screens/SearchResultsScreen.tsx` (new)

- Editable header input (re-submitting replaces results).
- Sticky horizontal chip row: `All`, plus a chip per entity type observed
  in the current result set (so chips auto-adapt; we never show a chip
  with zero results).
- `FlatList` of result cards: thumbnail, title, 2-line summary preview,
  small entityType badge.
- Pull-to-refresh re-runs the query.
- Empty / error states as listed under "Error & edge cases".
- Tap → `useEntityNavigator(item, { searchLogId })` → fires
  `/search/click`, then navigates.

### `mobile/src/features/search/components/*` (new)

- `SearchInputHeader` — autoFocus-on-mount on `SearchMain`, controlled
  text input that writes to the store, clear-X button.
- `SuggestionRow` — image + phrase + entityType pill.
- `RecentRow` — phrase + clock icon + per-row "x".
- `EntityTypeChip` — single chip used by the filter strip and the
  first-launch browse strip.
- `ResultCard` — used in `SearchResults`.
- `UnsupportedEntitySheet` — bottom sheet for `Movie` / `Show` / unknown
  types: thumbnail, title, "Open in browser" CTA.

### `mobile/src/features/search/hooks/useEntityNavigator.ts` (new)

Single function that takes either a `SuggestItemDto` or a
`SearchResultItemDto` plus an optional `{ searchLogId }`, and:

1. If a `searchLogId` is provided, fires `trackClick(...)` (no await).
2. Adds the current submitted query to recents (only when called from
   results — suggestion taps don't pollute recents).
3. Switches on `entityType`:
   - `Article` → `navigation.push('ArticleDetail', { id: String(entityId) })`
   - `Person` → fetch via existing `getCelebrity(entityId)` then push
     `CelebrityProfile` with `{ celebrity }`. Show a brief inline loader
     under the tapped row to avoid a blank navigation.
   - `Topic` → fetch via existing topic-by-id endpoint then push
     `TopicDetail` with `{ topic }`.
   - `Video` → fetch via `getVideo(entityId)` then push `VideoDetail`.
   - `Forum` → fetch then push `ForumThread`.
   - `Gallery` → push `GalleryDetail` with `{ id, title, thumbnail }`
     (id-only variant already supported).
   - `Movie` / `Show` / default → open `UnsupportedEntitySheet`.

If a fetch fails, surface a toast ("Couldn't open this result") and stay
on the search screen.

**By-id fetcher coverage in `services/api.ts` today:**

| Entity type | Existing fetcher | Strategy |
|---|---|---|
| `Article` | n/a — `ArticleDetail` already accepts `{ id }` directly | Push with `id` only. |
| `Gallery` | n/a — `GalleryDetail` already accepts `{ id, title?, thumbnail? }` | Push with hints from result. |
| `Video` | `fetchVideoDetails(id)` exists | Fetch then push. |
| `Person` | none — only `fetchCelebrityBiography` / `fetchCelebrityFans` | Implementation plan adds `fetchCelebrityById` to `services/api.ts`. |
| `Topic` | none — only `fetchTopicPosts` | Implementation plan adds `fetchTopicById`. |
| `Forum` | none currently | Implementation plan adds `fetchForumById`, OR falls through to the web-fallback sheet if the backend has no such endpoint. |
| `Movie`, `Show`, anything else | n/a | Web-fallback sheet. |

The implementation plan must verify (against the OpenAPI spec) which of
these by-id endpoints actually exist on the backend before adding them
to the client. Any entity type whose by-id endpoint does not exist
falls through to the web-fallback sheet — same UX as `Movie`/`Show`.

## Data flow

```
SearchMain mount
 └─ recents auto-hydrate on first store read

User types "ramay" (5 chars)
 └─ store.setQuery("ramay")
     ├─ debounce 250ms, abort previous
     └─ searchApi.suggest("ramay") → store.suggestions

User taps "Shrimad Ramayan" (Show)
 └─ useEntityNavigator(suggestion)
     ├─ no searchLogId → skip trackClick
     └─ entityType "Show" → UnsupportedEntitySheet

User presses Enter on "ramay"
 └─ store.submit("ramay")
     ├─ store.addRecent("ramay") → AsyncStorage
     ├─ searchApi.searchResults({ q: "ramay" })
     │   └─ store.results, store.searchLogId
     └─ navigation.push("SearchResults")

User taps "Article" chip
 └─ store.setEntityFilter("Article")
     └─ searchApi.searchResults({ q: "ramay", entityType: "Article" })

User taps an Article result card
 └─ useEntityNavigator(item, { searchLogId })
     ├─ searchApi.trackClick({ searchLogId, entityType, entityId }) (fire-and-forget)
     └─ navigation.push("ArticleDetail", { id: String(entityId) })
```

## Recent searches

- Storage key: `search.recents.v1` (versioned for future migration).
- Shape: `{ q: string; lastUsedAt: number }[]`.
- Cap: 10. Adding a duplicate moves it to the top.
- "Clear all" wipes the array; per-row "x" removes one.
- Hydrated lazily on first store access (no impact on app cold start).
- Not synced across devices — no API for it, and recents are device-local
  context by nature.

## Error & edge cases

- **Suggest network failure:** silently swallow, hide dropdown. No toast.
- **Results network failure:** retry-with-button empty state ("Couldn't
  load search. Retry").
- **Empty results:** "No results for '{q}'. Try a different spelling or
  remove filters."
- **Query < 2 chars:** suppress suggest call, show recents.
- **Rapid typing:** 250ms debounce + per-kind `AbortController` so out-of-
  order responses cannot flicker the dropdown.
- **Empty `q` submit:** ignored (button disabled).
- **Web fallback:** `Linking.openURL('https://www.indiaforums.com/' + url)`.
  If `url` is empty, falls back to a plain `https://www.indiaforums.com/`
  search-by-query URL.
- **Existing `SearchStack` routes:** `ArticleDetail` and `CelebrityProfile`
  are currently `PlaceholderScreen` stubs. They are wired to the real
  screens. The `CelebrityProfile` route currently takes `{ id: string }`
  but the real screen expects `{ celebrity: Celebrity }` — the param
  shape in `SearchStackParamList` is updated to match `HomeStackParamList`.

## Out of scope (v1)

- Voice search.
- In-app WebView for unsupported entity types — external browser only.
- Server-synced search history.
- Custom analytics beyond `/click`.
- Native `Movie` / `Show` detail screens — separate workstream.
- Infinite-scroll pagination — wait for the backend pagination fix.

## Files touched

New:
- `mobile/src/services/searchApi.ts`
- `mobile/src/store/searchStore.ts`
- `mobile/src/features/search/screens/SearchMainScreen.tsx`
- `mobile/src/features/search/screens/SearchResultsScreen.tsx`
- `mobile/src/features/search/components/SearchInputHeader.tsx`
- `mobile/src/features/search/components/SuggestionRow.tsx`
- `mobile/src/features/search/components/RecentRow.tsx`
- `mobile/src/features/search/components/EntityTypeChip.tsx`
- `mobile/src/features/search/components/ResultCard.tsx`
- `mobile/src/features/search/components/UnsupportedEntitySheet.tsx`
- `mobile/src/features/search/hooks/useEntityNavigator.ts`

Modified:
- `mobile/src/navigation/SearchStack.tsx` — add real screens, drop placeholder.
- `mobile/src/navigation/types.ts` — extend `SearchStackParamList` with the
  added entity-detail routes; fix `CelebrityProfile` param shape.

## Acceptance criteria

1. Tapping the Search tab shows the recent searches list (or first-launch
   hint), with the input autofocused.
2. Typing "shah" shows a typeahead dropdown of up to 10 suggestions within
   ~300ms of the last keystroke.
3. Tapping a `Person` suggestion fetches and pushes the existing
   `CelebrityProfile` screen.
4. Pressing Enter pushes `SearchResults`, which displays scored results
   and an entity-type filter strip.
5. Tapping an `Article` result POSTs `/search/click` (verifiable in logs)
   and pushes the existing `ArticleDetail` screen.
6. Tapping a `Movie` or `Show` result opens the unsupported-entity sheet
   with a link to the public web page.
7. Switching tabs and returning preserves the query, results, and filter.
8. Closing and reopening the app preserves recent searches.
9. All endpoints work without a logged-in user.
