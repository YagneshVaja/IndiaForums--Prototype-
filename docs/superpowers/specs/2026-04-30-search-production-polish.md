# Search Tab — Production Polish Pass

**Date:** 2026-04-30
**Status:** Design approved (in-conversation), pending implementation plan
**Surface:** `mobile/`
**Builds on:** [2026-04-29-mobile-search-tab-design.md](./2026-04-29-mobile-search-tab-design.md)

## Goal

Lift the Search tab from "functional" to "feels like a production content app".
Eight changes aligned with patterns used in Spotify, IMDb, Netflix, Twitter,
YouTube, and Google search. No backend changes — every improvement uses data
already in the search payload.

## Reference matrix

| Change | Production references |
|---|---|
| Sectioned typeahead dropdown | Spotify search, IMDb, Apple Music |
| Top-result spotlight card | Spotify, Google Knowledge Graph, IMDb |
| Bold matched prefix | Universal (Google, YouTube, Apple) |
| Per-entity-type result-card metadata | Netflix, IMDb |
| Result-count + active-filter context | Twitter / X, IMDb |
| Skeleton loading states | Universal |
| Smart empty-state category tiles | Spotify, TikTok, YouTube |
| Debounce + filter-tap no-pull-refresh | Universal hygiene |

## Decisions

### 1. Sectioned typeahead dropdown

Group `suggestions` by `entityType` with sticky section headers in the
typeahead list. Section order is fixed: `Person → Movie → Show → Topic →
Forum → Article → Video → Gallery → Other`. Suggestions inside a section keep
their original weight order from the API.

The section header is a one-line label (UPPERCASE, letter-spaced) over a
divider. No section is rendered if its bucket is empty. The trailing
"Search for '{q}'" row stays at the bottom of the entire list.

### 2. Top-result spotlight card

When `suggestions.length > 0`, the first suggestion (highest weight) renders
as a "Top result" hero card at the top of the dropdown — bigger thumbnail
(64px), entity-type badge above the name, name in display weight, and a
secondary line that reuses the entity-aware metadata format from change #4.

The remaining suggestions render as compact rows under the section headers
from change #1. The top result is **not** duplicated in its section; it's
extracted out.

### 3. Bold matched prefix

In every suggestion row (compact or spotlight) and in result-card titles,
case-insensitively bold the substring of the displayed text that matches
the user's current `query`. Implemented as a small `HighlightedText`
component that takes `text`, `match`, and a `style`/`highlightStyle`.

### 4. Per-entity-type result-card metadata

`ResultCard` and the suggestion components render an entity-aware metadata
line under the title. Inputs come exclusively from the search payload —
no extra API calls.

| `entityType` | Metadata line |
|---|---|
| `Person` | "Celebrity" (or, if available, parse profession from `summary`) |
| `Movie` | "Movie" + year if `summary` contains a 4-digit year |
| `Show` | "TV Show" + year if available |
| `Article` | "Article" + first 80 chars of `summary` (current behavior) |
| `Video` | "Video" + first 80 chars of `summary` |
| `Gallery` | "Photo Gallery" |
| `Topic` | "Forum Topic" |
| `Forum` | "Forum" |
| Other | `entityType` verbatim |

The current entity-type pill stays as a small accent on the card; the
metadata line is a new secondary text under the title. No score / rating
chips are added — backend doesn't surface them on search results.

### 5. Result-count + active-filter context

A one-line context strip appears between the chip strip and the result
list when there are results:

- All filter: "**12 results** for "ramayan""
- Type filter: "**3 Articles** for "ramayan""

When `resultsStatus === 'loading'` or `'empty'` or `'error'`, the strip is
hidden — the body covers context already.

### 6. Skeleton loading states

- `SuggestionSkeleton` row × 5 renders inside the typeahead list when
  `suggestStatus === 'loading'` and `suggestions.length === 0` (i.e. on
  the first keystroke of a new query).
- `ResultCardSkeleton` × 4 renders in the results screen body when
  `resultsStatus === 'loading'` and `results.length === 0`. Replaces the
  centered `ActivityIndicator`.

Skeletons are pure View+View elements with `colors.surface` background and
the same heights as the real components, so the list never collapses.

### 7. Smart empty-state category tiles

Replace the centered "Search India Forums" hint that shows when `recents`
is empty with a 2x3 grid of `BrowseTile`s:

| Tile | Action |
|---|---|
| Movies | submit `q="" entityType="Movie"` — but `/results` requires `q`, so we fall back to navigating to `SearchResults` with a sentinel browse query (e.g. "movies"). See "Open question" below. |
| Shows | same |
| Celebrities | same |
| Articles | same |
| Forums | same |
| Topics | same |

**Open question — addressed in plan:** the `/search/results` endpoint
requires `q`, so a pure entity-type browse needs either a category-name
seed query (e.g. tap "Movies" → submit `q="movies" entityType="Movie"`) or
a different navigation target. We choose the seed-query approach: tap
"Movies" → submits `"latest"` (a broadly-matching seed) with the entity
filter pre-applied. If the seed produces poor results in practice, the
plan calls out the alternative of routing to feature-specific tabs
(`HomeStack.Celebrities`, etc.) — but that crosses tab boundaries, so
seed-query stays the v1.

If the user already has recents, the tiles are not shown — recents
take priority.

### 8. Debounce + filter-tap polish

- Add a 200ms `setTimeout` debounce inside `searchStore.setQuery` before
  invoking `fetchSuggestions`. Cancel-on-supersession stays.
- Add a separate `isPullRefreshing` boolean to the search store. The
  `RefreshControl` on `SearchResultsScreen` only shows its spinner when
  `isPullRefreshing` is `true`. Filter-chip taps and resubmits update
  `resultsStatus` but not `isPullRefreshing`.

## File map

**New:**
- `mobile/src/features/search/components/HighlightedText.tsx` — small text component that splits and bolds matched substring.
- `mobile/src/features/search/components/SuggestionSection.tsx` — section header (UPPERCASE label).
- `mobile/src/features/search/components/SuggestionSpotlight.tsx` — top-result hero row.
- `mobile/src/features/search/components/SuggestionSkeleton.tsx` — placeholder row.
- `mobile/src/features/search/components/ResultCardSkeleton.tsx` — placeholder result card.
- `mobile/src/features/search/components/BrowseTile.tsx` — empty-state category tile.
- `mobile/src/features/search/components/ResultsContextLine.tsx` — count + filter strip.
- `mobile/src/features/search/utils/entityMetadata.ts` — pure function `entityMetadataLine(entityType, summary?) → string`.
- `mobile/src/features/search/utils/groupSuggestions.ts` — pure function that groups suggestions by entityType in fixed order.

**Modified:**
- `mobile/src/store/searchStore.ts` — add `setQueryDebounceTimer`; add `isPullRefreshing` flag + actions.
- `mobile/src/features/search/components/SuggestionRow.tsx` — use `HighlightedText`, add metadata line.
- `mobile/src/features/search/components/ResultCard.tsx` — use `HighlightedText` on title, add metadata line.
- `mobile/src/features/search/screens/SearchMainScreen.tsx` — render sectioned dropdown + spotlight + skeletons + browse tiles.
- `mobile/src/features/search/screens/SearchResultsScreen.tsx` — render context line + skeletons + filter-tap polish.

## Architecture invariants

- No new API calls. Every improvement uses payload already returned by `/suggest` or `/results`.
- No new persistent state. Everything new is either ephemeral (debounce timer, skeletons) or derived from existing state.
- Components stay small (≤ 100 lines each). The `SearchMainScreen` body grows but stays readable; if it crosses ~250 lines, factor the typeahead branch into a `SuggestionsList` sub-component.

## Error & edge cases

- **Browse-tile seed query returns 0 results.** The user sees the standard "no results" empty state. Acceptable for v1; if the seeds prove dud, the plan calls out swapping them.
- **Highlighted prefix on case-mismatched substrings.** `HighlightedText` is case-insensitive; the displayed casing remains the source's casing.
- **Section reorder on entity filter change.** When the user filters to one entity type from the results screen, the typeahead doesn't change — typeahead only renders on the main screen.
- **Top-result spotlight when `suggestions.length === 1`.** Only the spotlight renders, no compact section underneath. The "Search for '{q}'" footer still appears.
- **Debounce + abort interaction.** The debounce timer is cleared on every `setQuery` call. If a new keystroke arrives before the timer fires, the timer resets. If the timer fires, `fetchSuggestions` runs and uses the existing AbortController logic.

## Acceptance criteria

1. Typing "shah" shows a sectioned dropdown — "PEOPLE" header above Person rows, "MOVIES" header above Movie rows, etc. Section order is fixed.
2. The top-weighted suggestion renders as a hero card (larger thumbnail, "Top result" label, name with bold matched substring) above the sectioned list.
3. Result-card titles have the matched substring bolded.
4. Each result card shows an entity-aware metadata line (e.g. "Movie · 2024" for Movies).
5. Above the results list, "**12 results** for 'ramayan'" appears (or "**3 Articles** for 'ramayan'" when filtered).
6. While `/suggest` or `/results` are loading and there's no prior data, skeleton rows render. No blank list, no centered spinner.
7. On a fresh install with no recents, the empty state shows 6 browse tiles in a 2x3 grid. Tapping "Movies" lands on `SearchResults` with `entityType="Movie"` and a seed query.
8. Typing "ramayan" fast fires only one `/search/suggest` call (debounced 200ms).
9. Tapping a chip on `SearchResults` does not show the pull-to-refresh spinner — pull-to-refresh still works for explicit pulls.
10. `npm run tsc` passes after every commit.

## Out of scope

- New API endpoints, voice search, saved searches, share-from-search.
- Result list pagination (still backend-blocked).
- Native Movie / Show detail screens (separate workstream).
- Haptics on every entity tap (already covered).
