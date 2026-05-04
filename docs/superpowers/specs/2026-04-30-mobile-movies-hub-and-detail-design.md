# Mobile Movies Hub & Detail — Design Spec

**Date:** 2026-04-30
**Owner:** mobile

## Goal

Add a Movies surface to the mobile app, mirroring `/movie` on the live website
(indiaforums.com). Two screens, read-only:

1. **Movies hub** — entry from the Explore strip; Latest Releases / Upcoming
   tabs over a poster grid with infinite scroll.
2. **Movie detail** — single-scroll: hero, About/Story, Cast strip, Critic
   Reviews + User Reviews (top N each).

Out of scope for v1: year browser, fanclub, write-actions on reviews, favourite
movies. These are tap-throughs to placeholders or future work.

## API surface (`api2.indiaforums.com/api/v1`)

| Method | Path | Use |
|--------|------|-----|
| GET | `/movies?mode=latest\|upcoming&page=&pageSize=` | Hub list — both tabs |
| GET | `/movies/{titleId}/story` | Detail — about + plot |
| GET | `/movies/{titleId}/cast?page=&pageSize=` | Detail — cast strip |
| GET | `/movies/{titleId}/reviews?criticPage=&criticPageSize=&userPage=&userPageSize=` | Detail — both review lists |

List response shape:
```ts
{
  movies: Movie[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}
```

`Movie` (list-card shape):
```ts
{
  titleId: number;
  titleName: string;
  startYear: number | null;
  pageUrl: string;            // slug, e.g. "tu-yaa-main"
  posterUrl: string | null;   // 200x300 webp
  hasThumbnail: boolean;
  releaseDate: string | null; // ISO
  titleShortDesc: string | null;
  titleTypeId: number;
  audienceRating: number;     // 0–100 (percent)
  criticRating: number;       // 0–100 (percent)
  audienceRatingCount: number;
  criticRatingCount: number;
  averageRating: number;
}
```

The `/story`, `/cast`, `/reviews` shapes are not in our hands until first call —
we type them defensively (typed core fields, `unknown` overflow) and refine
once we observe real responses. `/story` 500s for some titleIds during testing
(7412, 6910); detail must handle this as "Story not available" without
gating the rest of the screen.

## Information architecture

**Strip entry**
`StoriesStrip.tsx` gains a Movies entry between `Galleries` and `Fan Fictions`
(after Galleries, before Fan Fictions — keeps content-heavy items grouped).
Emoji 🎬, light bg `#FEF2F2`, dark bg `#3A1A1A`.

**Movies hub (`MoviesScreen`)**
- Sticky `TopNavBack` header titled "Movies"
- Two pill tabs: **Latest Releases** (default) / **Upcoming**
- 2-column grid of `MoviePosterCard` (poster, title, release date,
  rating pill if present)
- Infinite scroll via `useInfiniteQuery`; `MoviesGridSkeleton` on first load,
  pull-to-refresh, end-of-list spinner
- Tapping a card → `MovieDetail({ titleId, titleName, posterUrl })`

**Movie detail (`MovieDetailScreen`)**
Single ScrollView, sections render independently as their query resolves:
1. **Hero** — backdrop (poster blurred behind), foreground poster + title +
   release date + ratings row (critic %, audience %, counts)
2. **About** — `/story` plot text. Hidden on 500/empty.
3. **Cast** — horizontal strip from `/cast`, "View all" if `totalCount > shown`
4. **Critic Reviews** — top 3 from `/reviews.criticReviews` + "View all critic
   reviews" → placeholder
5. **User Reviews** — top 3 from `/reviews.userReviews` + "View all user
   reviews" → placeholder
6. Empty/error blocks per section, never the whole screen

## File layout

```
mobile/src/features/movies/
  screens/
    MoviesScreen.tsx
    MovieDetailScreen.tsx
  components/
    MoviePosterCard.tsx
    MovieCastStrip.tsx
    ReviewCard.tsx
    MoviesGridSkeleton.tsx
    MovieDetailSkeleton.tsx
  hooks/
    useMovies.ts          // useInfiniteQuery, mode tab
    useMovieDetail.ts     // 3 parallel useQuery
mobile/src/services/api.ts                ← +types, +fetchMovies,
                                            fetchMovieStory, fetchMovieCast,
                                            fetchMovieReviews
mobile/src/navigation/types.ts            ← +Movies, +MovieDetail
mobile/src/navigation/HomeStack.tsx       ← register both screens
mobile/src/features/home/components/
  StoriesStrip.tsx                        ← +Movies entry + handlePress branch
```

## Non-goals / explicit YAGNI

- No year browser screen. Live site has it; not on the mobile critical path.
- No `/fanclub` integration. Cosmetic and auth-gated.
- No write actions on reviews (POST/PUT/DELETE). Auth-only, low ROI for
  read-first launch.
- No favourite-movies (`/my-favourite-movies`). Auth-only.
- No similar-movies / cross-link between titles.
- No deep linking to `/movie/<slug>_<id>` URLs from web. Internal nav only.

## Open implementation questions (resolve at code time, not spec time)

- **Cast page size**: live site shows ~6 names; pull `pageSize=12`, render
  first 8 in strip, "View all" when remaining > 0.
- **Rating pill on the poster card**: show only when `criticRatingCount > 0`
  *or* `audienceRatingCount > 0`; hide when both are zero (avoids "0%" noise on
  unrated upcoming titles).
- **Hero backdrop**: poster image with a heavy blur and dark overlay — there's
  no separate landscape backdrop in the API.

## Testing

- Type-check via the existing `tsc` task.
- Manual smoke: open hub, switch tabs, scroll past first page, tap a card with
  ratings, tap a card without (upcoming), confirm About hides on 500.
