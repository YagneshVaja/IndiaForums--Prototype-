# Celebrity Profile — Tier 1 parity with live site

**Date:** 2026-05-08
**Scope:** Mobile app (`mobile/`)
**Goal:** Bring `CelebrityDetailScreen` closer to https://www.indiaforums.com/person/&lt;name&gt;_&lt;id&gt; by adding the data the live site shows that the API already provides.

---

## Background

The live celebrity profile shows a 9-tab layout: Overview, About, Filmography, TV Shows, News, Photos, Videos, Discussion, Fanclub. The mobile app currently shows only **Biography** and **Fans**.

After auditing the backend, three of the missing surfaces use endpoints we already have wired or trivially can wire:

| Surface | Endpoint | Confirmed |
|---|---|---|
| Filmography | `GET /movies/by-mode?mode=3&id={personId}` | ✅ Used by web prototype against real `personId`s |
| Discussion | `GET /forums/{forumId}/topics` | ✅ Already in `mobile/src/services/api.ts` (`fetchForumTopics`) |
| Extended bio fields (chest, waist, biceps, eye/hair color, age) | `GET /celebrities/{id}/biography` (already used) | ✅ Fields already returned in `personInfos` array — we are just not parsing them |

The remaining live-site tabs (TV Shows, News, Photos, Videos, Fanclub-as-distinct-from-Fans, gender filter on listing) are deferred — TV Shows endpoint has a known backend bug returning empty, and News/Photos/Videos-by-person endpoints are not yet confirmed against the backend.

---

## What we are building

### 1. Tab bar restructure

`CelebrityDetailScreen` tabs become **four**, in this order:

1. **Biography** (existing)
2. **Filmography** (new)
3. **Discussion** (new)
4. **Fans** (existing)

The existing tab strip styling (active label color, underline indicator, theme-aware) is preserved. Four short labels fit at typical phone widths without horizontal scroll, so layout stays the same — only the `TABS` array grows.

### 2. Biography tab — extended fields

Update `CelebrityBiography` interface in `mobile/src/services/api.ts` and `transformBiography()` to extract additional `personInfos` fields the API already returns:

| New field | `personInfoTypeName` to read |
|---|---|
| `chest`  | `Chest (approx.)`  |
| `waist`  | `Waist (approx.)`  |
| `biceps` | `Biceps (approx.)` |
| `eyeColor`  | `Eye Color`  |
| `hairColor` | `Hair Color` |
| `forumId`  | `person.forumId` (root field, not from `personInfos`); fallback to `person.alternateForumId` |

`age` is computed from `birthDate` at render time (not stored on the type) — derive in a small helper in `parseBioHtml.ts` next to the existing `formatDateString`.

`BiographyTab` rendering changes:

- The **Physical** `FactsCard` adds rows for Chest / Waist / Biceps / Eye Color / Hair Color when present.
- The **Personal Info** `FactsCard` shows DOB as `January 12, 1985 · Age 41` when both are available; falls back to existing `formatDateString` output otherwise.

No design system / token changes; just additional `FactsCard` items.

### 3. Filmography tab

**Data layer.** Add to `mobile/src/services/api.ts`:

```ts
export async function fetchCelebrityFilmography(
  personId: string,
  page = 1,
  pageSize = 24,
): Promise<MoviesPage>
```

Calls `GET /movies/by-mode` with `params: { mode: 3, id: personId, page, pageSize }`. Reuses the existing `transformMovie` helper. Returns the existing `MoviesPage` shape. On network error, returns an empty page (no mocks — keeps surface honest).

**Hook.** New `mobile/src/features/celebrities/hooks/useCelebrityFilmography.ts` using `useInfiniteQuery`, mirroring `useCelebrityFans`:

```ts
queryKey: ['celebrity', personId, 'filmography']
queryFn: ({ pageParam }) => fetchCelebrityFilmography(personId, pageParam ?? 1, 24)
getNextPageParam: (last) => last.pagination.hasNextPage ? last.pagination.currentPage + 1 : undefined
staleTime: 10 * 60 * 1000
enabled: !!personId
```

**UI.** New `FilmographyTab.tsx` and `FilmographyRow.tsx`:

- `FilmographyTab` is a vertical FlashList of `FilmographyRow`. Skeleton on first load, infinite scroll, `ErrorBlock` with retry on error, empty-state message when the list is genuinely empty.
- `FilmographyRow` layout:
  ```
  [poster 60×80]  Title (numberOfLines={2}, fontWeight 700)
                  Year · Role label
                  ⭐ rating · Language    (rating row hidden if no rating)
  ```
  Tap → `navigation.navigate('MovieDetail', { movie })` using the existing `HomeStack` route. The `Movie` object from `MoviesPage.movies` is passed verbatim.

### 4. Discussion tab

**Data layer.** No new API function needed — `fetchForumTopics(forumId, page, pageSize, cursor)` already exists. The `forumId` is sourced from `CelebrityBiography.forumId` (added in section 2).

**Hook.** New `mobile/src/features/celebrities/hooks/useCelebrityDiscussion.ts`:

```ts
queryKey: ['celebrity', forumId, 'discussion']
queryFn: ({ pageParam }) => fetchForumTopics(forumId, pageParam ?? 1, 20)
enabled: !!forumId && forumId > 0
staleTime: 5 * 60 * 1000
```

The hook accepts a `forumId: number` (not `personId`) so it cleanly disables when the bio hasn't loaded or the celebrity has no associated forum.

**UI.** New `DiscussionTab.tsx` and `ForumTopicRow.tsx`:

- `DiscussionTab` props: `forumId: number | null`, plus the standard loading/error/empty/infinite props.
- While the bio query is in flight (forumId not yet known), show the `BioSkeleton`-style placeholder.
- If the bio resolves but `forumId` is missing/zero, show the empty state ("No discussion forum for this celebrity.").
- `ForumTopicRow` is a new component that takes a `ForumTopic` directly (no synth-stub). Tap → `navigation.navigate('TopicDetail', { topic })`. Visual style: card with primary accent bar on the left, title (2 lines, bold), description (2 lines, secondary), and a meta row showing `replies · views · last activity`.

### 5. File layout

```
mobile/src/features/celebrities/
├── components/
│   ├── BiographyTab.tsx          ← modified (new physical fields, age in personal info)
│   ├── FilmographyTab.tsx        ← NEW
│   ├── FilmographyRow.tsx        ← NEW
│   ├── DiscussionTab.tsx         ← NEW
│   └── ForumTopicRow.tsx         ← NEW
├── hooks/
│   ├── useCelebrityFilmography.ts ← NEW
│   └── useCelebrityDiscussion.ts  ← NEW
├── screens/
│   └── CelebrityDetailScreen.tsx ← modified (4-tab strip)
└── utils/
    └── parseBioHtml.ts           ← modified (add `computeAge(birthDate)`)

mobile/src/services/api.ts
├── CelebrityBiography interface  ← extend with chest/waist/biceps/eyeColor/hairColor/forumId
├── transformBiography            ← parse new personInfos keys + person.forumId
└── fetchCelebrityFilmography     ← NEW function
```

No changes to `mobile/src/navigation/`. `MovieDetail` and `TopicDetail` routes already exist on `HomeStack`.

---

## Behaviour & error handling

- **Tier 1 surfaces never silently swap to mock data.** If `fetchCelebrityFilmography` fails, the tab shows the standard `ErrorBlock` with a retry button. (The existing `fetchCelebrities` mock fallback in `api.ts` is *not* a precedent we extend here — it's pre-existing tech debt and mock data hides backend regressions.)
- **`forumId` missing.** Some celebrities have no associated forum (`forumId === 0` and `alternateForumId === 0`). Discussion tab renders empty state, does not error.
- **Empty filmography.** New / niche celebrities may have zero movies. Empty state copy: "No filmography listed."
- **Theme awareness.** All new components must follow the existing pattern: `const styles = useMemo(() => makeStyles(colors), [colors])`. Hardcoded greys in `CelebrityDetailScreen.tsx` (e.g., `#1A1A1A` for the hero) are out of scope to fix here.

---

## Out of scope (deferred)

| Surface | Reason |
|---|---|
| TV Shows tab | Backend `/shows/by-mode` returns empty for `mode=3` (Class C-1 bug, see web prototype `showsApi.js`). Wire it once backend is fixed. |
| News tab | No confirmed person-scoped articles endpoint. Probe and spec separately. |
| Photos tab | No confirmed person-scoped photos endpoint. Probe and spec separately. |
| Videos tab | Same as Photos. |
| Become-a-Fan button | `isFan` is read-only today; mutation endpoint not wired. Separate concern. |
| Gender filter on `CelebritiesScreen` | Listing-page change; not blocking detail-screen parity. |

---

## Acceptance criteria

1. Opening any celebrity from the Home rail or Celebrities listing shows a 4-tab strip: **Biography · Filmography · Discussion · Fans**.
2. Biography tab's **Physical** card shows Chest / Waist / Biceps / Eye Color / Hair Color rows when the API returns them; absent rows are skipped (no "—" placeholders).
3. Biography tab's **Personal Info** card shows DOB plus computed Age when birthDate is present.
4. Filmography tab shows a vertical list of movies the celebrity is associated with, paginated via infinite scroll, with poster + title + year + role + rating + language. Tapping a row pushes `MovieDetail`.
5. Discussion tab shows the celebrity's forum topics, paginated via infinite scroll. Tapping a row pushes `TopicDetail`. Celebrities with no `forumId` show an empty state instead of an error.
6. `npm run tsc` passes with zero new errors.
7. No new ESLint warnings introduced (existing `@typescript-eslint/no-explicit-any` directives in `transformBiography`-style helpers may be reused for `transformMovie` reuse).
