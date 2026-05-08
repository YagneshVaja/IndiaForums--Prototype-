# Home — Celebrity Ranking Section (avatar rail with category chips)

**Status:** Approved (design)
**Date:** 2026-05-08
**Scope:** `mobile/` app, Home tab only.
**Reference:** Live site `https://www.indiaforums.com/` Top Celebrities ranking block + visual conventions from popular Indian apps (Hotstar, JioHotstar) for celebrity rails.

---

## Goal

Add a Celebrity Ranking preview rail to the Home tab. The mobile app already has the full Celebrities feature (API, ranking hook, dedicated `CelebritiesScreen` with podium layout, `CelebrityProfile` detail screen, all routes registered in `HomeStack`). This work is purely the home preview surface — a horizontal rail of compact avatar tiles with rank medals, an inline category switcher, and links into the existing Celebrities surfaces.

---

## Visual Layout

```
┌──────────────────────────────────────────────┐
│ ▌ CELEBRITY RANKING            See All →    │   header
│   This week · Mar 14–20, 2026                │   subtitle (week range)
│ ┌────────────┬────────────┬────────────┐    │
│ │ Bollywood  │ Television │  Creators  │    │   inline segmented control
│ └─────╳──────┴────────────┴────────────┘    │
│ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐    │
│ │  ◯  │ │  ◯  │ │  ◯  │ │  ◯  │ │  ◯  │    │   80px circular avatar
│ │avtr │ │avtr │ │avtr │ │avtr │ │avtr │    │
│ │🥇#1 │ │🥈#2 │ │🥉#3 │ │ #4  │ │ #5  │    │   rank medal (bottom-right)
│ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘    │
│  ▲+1     ▼-2    —      ▲ new   ▲+1         │   trend pill
│  Name    Name   Name   Name    Name      …  │   2-line name max
│  Actor   Actr.. Actor  Actor   Actor       │   1-line role / short desc
│           → swipe →                          │
└──────────────────────────────────────────────┘
```

- Tile width: **88px**.
- Avatar: 80px diameter, circular, real `thumbnail` via `expo-image`. Falls back to `Initials` (existing component) when `thumbnail` is missing or the image fails.
- Rank medal: small pill in the avatar's bottom-right corner.
  - Top 3: `🥇 #1` (gold `#F5C518`), `🥈 #2` (silver `#C0C0C0`), `🥉 #3` (bronze `#CD7F32`) — Olympic palette already used by `ChannelsSection`.
  - Ranks 4+: theme-tinted pill with `#N` (no medal emoji).
- Beneath the avatar: compact `TrendBadge` + 2-line name + 1-line role (`shortDesc`).
- Header style mirrors all other Home sections (Videos / Quizzes / Web Stories / Movies): accent bar + uppercase title + subtitle + right-aligned `See All ›`.
- Category segmented control: 3 equal-width chips (Bollywood / Television / Creators). Active chip uses the brand primary background + white text; inactive use card background + theme text.

---

## Components

### `mobile/src/features/home/components/CelebrityRankTile.tsx` (new)

Single tile. Props:

```ts
interface Props {
  celeb: Celebrity;
  onPress: (celeb: Celebrity) => void;
}
```

Behavior:

- Renders `expo-image` avatar with `cachePolicy="memory-disk"` and `onError` flipping to `Initials` fallback.
- Computes medal style from `celeb.rank`: top 3 use Olympic colors + emoji; 4+ render a plain `#N` pill on `c.surface` background.
- Renders the existing `TrendBadge compact` beneath the avatar (already supports rank-diff display).
- Name `numberOfLines={2}`; role `numberOfLines={1}`.

### `mobile/src/features/home/components/CelebrityRankingHomeSection.tsx` (new)

Section wrapper. Responsibilities:

- Calls `useCelebritiesRanking()`.
- Local state `activeCat: 'bollywood' | 'television' | 'creators'` (default `'bollywood'`). The full type `CelebCategoryId` includes `'all'`, but `'all'` is intentionally **not** a Home option — see *Data* below.
- Renders the section header (title + subtitle from `formatRankRange(rankStartDate, rankEndDate)`), the segmented control, the horizontal `ScrollView` of `CelebrityRankTile`s.
- Handles loading skeleton, hides on hard error / all-categories-empty.
- Owns navigation: tile tap → `CelebrityProfile`, See All → `Celebrities`.

### Reuses (no fork of existing components)

- `mobile/src/features/celebrities/components/TrendBadge.tsx` — accepts `compact` prop.
- `mobile/src/features/celebrities/components/Initials.tsx` — avatar fallback.
- `mobile/src/features/celebrities/utils/formatDate.ts` → `formatRankRange()`.

> **Why not reuse `HeroCard` / `RunnerCard` / `RankRow`?** Each renders a different visual contract (340-px hero, square podium card, full-width list row) tuned for the dedicated `CelebritiesScreen` podium. The Home rail wants compact, scannable, scrollable tiles — none of the three fits without contortion. Reusing the *atomic* components (`TrendBadge`, `Initials`) keeps the section visually consistent with the rest of the Celebrities feature without forcing an unsuited layout.

---

## Data

### Source

- Reuse `useCelebritiesRanking()` from `mobile/src/features/celebrities/hooks/useCelebritiesRanking.ts`. Query key `['celebrities', 'ranking']`. `staleTime: 10 * 60 * 1000` (already set). Cache shared with the Celebrities screen.
- The payload comes pre-bucketed: `data.categories.bollywood / .television / .creators` are independent ranked lists. No client-side filtering needed.

### Selection

```ts
const PREVIEW_COUNT = 10;
const activeList: Celebrity[] = data?.categories[activeCat] ?? [];
const previewCelebs = activeList.slice(0, PREVIEW_COUNT);
```

- Switching categories is a pure re-render — no refetch — because all three buckets ship in the same response.
- The dedicated `CelebritiesScreen` exposes an `All` tab (flat `data.celebrities`) for users who want a cross-vertical view; the Home rail intentionally restricts to the three ranked verticals so the medal/rank story stays meaningful within a category.

---

## States

| State | UI |
|---|---|
| Loading (no cache) | Skeleton row of 5 circular avatar placeholders + 2 short skeleton lines beneath each. Category chips render as static placeholders. |
| Loaded, active category has ≥ 1 entry | Render full layout: chips + rail of up to 10 tiles |
| Loaded, active category empty but other categories have entries | Render chips normally; rail area shows a single muted line: `"No ranking for {category} this week"` so the user can tap another chip |
| Error, or all three categories empty | Hide section entirely (`return null`) |

---

## Interactions

- **Tile tap** → `navigation.navigate('CelebrityProfile', { celebrity })`. Matches existing `HomeStackParamList.CelebrityProfile: { celebrity: Celebrity }` route.
- **Category chip tap** → `setActiveCat(...)`; rail re-renders from already-cached data.
- **See All** → `navigation.navigate('Celebrities')`. Already registered.
- **Pull-to-refresh** on Home → `handleRefresh` adds `['celebrities']` to its `Promise.all` invalidation list. The prefix `['celebrities']` covers `['celebrities', 'ranking']` plus any future celeb sub-keys (biography/fans).

---

## Integration into HomeScreen

In `mobile/src/features/home/screens/HomeScreen.tsx`:

1. Import `CelebrityRankingHomeSection`.
2. Inside the `ListFooter` `useMemo`, render `<CelebrityRankingHomeSection />` between `<LatestMoviesHomeSection />` and the trailing `<View style={styles.spacer} />`.
3. Add `['celebrities']` to the `Promise.all` invalidation list in `handleRefresh`.

---

## Theming

All styles built via `useMemo(() => makeStyles(colors), [colors])`. Theme-bound: card background, borders, header text, subtitle, See All, segmented-control surfaces, name/role text, "No ranking" message, skeleton background. Fixed colors: gold/silver/bronze medal pills (the Olympic palette is brand-conventional in this repo — the same `#F5C518 / #C0C0C0 / #CD7F32` triplet appears in `ChannelsSection`'s podium).

---

## Out of scope

- Modifying any file under `mobile/src/features/celebrities/` (existing screens, hooks, components).
- Adding new query keys, transformers, or API endpoints.
- An `All` category chip on Home (the dedicated screen owns that view).
- Following / fan-it / share actions from Home tiles.
- Per-language or per-region filtering.

---

## Acceptance

- Section renders between Latest Movies and the bottom spacer on Home.
- Header accent + uppercase title + subtitle (week range) + `See All ›` visually mirror the other Home sections.
- Three category chips (Bollywood / Television / Creators) render as a segmented control; tapping switches the rail without refetching.
- Tiles render real avatars (with `Initials` fallback), gold/silver/bronze medals on top 3 and `#N` pills on 4+, compact trend badge, name (≤ 2 lines), role (1 line).
- Tap any tile → opens `CelebrityProfile` for that celebrity. Back returns to Home with scroll position preserved.
- See All → opens the `Celebrities` screen.
- Pull-to-refresh refreshes the rail alongside the rest of Home.
- When the active category is empty but others have data, the section stays visible with a "No ranking for X this week" line so the user can switch chips.
- When the API errors out or all three categories are empty, the section hides entirely.
- `npm run tsc` passes; no new lint warnings introduced.
