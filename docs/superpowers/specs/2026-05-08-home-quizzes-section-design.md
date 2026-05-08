# Home — Fan Quizzes Section (Hero + 2-card rail)

**Status:** Approved (design)
**Date:** 2026-05-08
**Scope:** `mobile/` app, Home tab only.
**Reference:** Live site `https://www.indiaforums.com` quizzes block + web prototype `indiaforums/src/components/sections/QuizSection.jsx` (interactive variant) + the established mobile Quizzes screen visual language.

---

## Goal

Add a Fan Quizzes section to the Home tab that promotes one featured quiz prominently, two follow-up quizzes inline, and links into the existing Quizzes screen. Renders directly **after** the Videos section and **before** the Web Stories strip.

The mobile app already has the full Quizzes feature (API, hook, list/detail/player/result screens, navigation routes, polished card components). This work is purely the home-feed preview surface, reusing existing card components.

---

## Visual Layout

```
┌─────────────────────────────────────────────┐
│ ▌ FAN QUIZZES                  See All →   │   header
│   Test your fan score · daily picks         │   subtitle
├─────────────────────────────────────────────┤
│ ┌───────────────────────────────────────┐   │
│ │ 🔥 TRENDING  [TRIVIA]  by Team IF      │   │
│ │                                        │   │
│ │ How well do you know Anupamaa?         │   │   FeaturedQuizCard (16:10)
│ │ ❓ 8 Qs · 👥 1.2k     [▶ Play Now]    │   │
│ └───────────────────────────────────────┘   │
├─────────────────────┬───────────────────────┤
│ ┌─────────────────┐ │ ┌───────────────────┐ │
│ │ Personality     │ │ │ Trivia            │ │
│ │ thumb           │ │ │ thumb             │ │   2 × QuizGridCard
│ │ Title           │ │ │ Title             │ │
│ │ 5 Qs    ▶       │ │ │ 10 Qs    ▶        │ │
│ └─────────────────┘ │ └───────────────────┘ │
└─────────────────────┴───────────────────────┘
```

- One full-width `FeaturedQuizCard` hero (16:10 gradient with category, plays count, "Play Now" button).
- Below it, a 2-column row of `QuizGridCard`s.
- Header style matches `VideosHomeSection` and `ChannelsSection` (accent bar + uppercase title + subtitle + right-aligned `See All ›`).

---

## Components

### `mobile/src/features/home/components/QuizzesHomeSection.tsx` (new)

Section wrapper. Responsibilities:

- Calls `useQuizzes()` to read the cached quiz list.
- Picks one hero quiz + two grid quizzes (selection rules below).
- Decides the hero's `kind` (`trending` / `fresh` / `surprise`).
- Renders the section header, the hero card, and the 2-card grid.
- Handles loading skeleton, hides on error/empty.
- Owns navigation: card tap → `QuizDetail`, See All → `Quizzes`.

### Reuses (no new card components)

- `mobile/src/features/quizzes/components/FeaturedQuizCard.tsx` — hero. Already accepts `quiz`, `kind`, `onPress`.
- `mobile/src/features/quizzes/components/QuizGridCard.tsx` — grid tile. Already accepts `quiz`, `onPress`.

> **Why reuse instead of building home-specific cards?** Unlike the Videos section (where the dedicated Videos screen card and the home tile have meaningfully different styles and meta lines), the existing quiz cards are already promo-styled and look identical to the visual language we want on Home. Building parallel home-specific quiz cards would duplicate look-and-feel work and cause drift over time.

---

## Data

### Source

- Reuse `useQuizzes()` from `mobile/src/features/quizzes/hooks/useQuizzes.ts`. Query key `['quizzes', 'list']` is shared with the Quizzes screen — opening either surface warms the other.
- `staleTime: 2 * 60 * 1000` (already set on the hook) is fine for a home preview.

### Selection logic

```ts
const allQuizzes: Quiz[] = (data?.pages ?? []).flatMap(p => p.quizzes);

// Hero: highest plays_raw, with title-stable tie-break for deterministic order.
// Falls back to first quiz when all plays_raw are zero (new content).
const sortedByPlays = [...allQuizzes].sort((a, b) => {
  if (b.plays_raw !== a.plays_raw) return b.plays_raw - a.plays_raw;
  return a.title.localeCompare(b.title);
});
const hero = sortedByPlays[0];

// Grid: next two quizzes from the list, deduped against hero.
const grid = allQuizzes
  .filter(q => q.id !== hero?.id)
  .slice(0, 2);
```

**Render thresholds:**
- 0 quizzes → hide section entirely.
- 1 quiz → render hero only (no grid row).
- 2 quizzes → render hero + 1 grid card (left cell), no right cell.
- 3+ → full layout.

### Hero `kind` mapping

```ts
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function pickKind(quiz: Quiz, now = Date.now()): FeaturedKind {
  if (quiz.plays_raw > 500) return 'trending';
  const t = Date.parse(quiz.publishedWhen);
  if (!Number.isNaN(t) && now - t < SEVEN_DAYS_MS) return 'fresh';
  return 'surprise';
}
```

Deterministic so the hero badge does not flicker between renders or refreshes.

---

## States

| State | UI |
|---|---|
| Loading (no cached data) | Skeleton: hero 16:10 placeholder + 2 small square placeholder tiles |
| Loaded with ≥ 3 quizzes | Full layout (hero + 2 grid cards) |
| Loaded with 1–2 quizzes | Render available cards only (hero, optional 1 grid) |
| Error | Hide section (return `null`) |
| Empty | Hide section |

---

## Interactions

- **Card tap (hero or grid)** → `navigation.navigate('QuizDetail', { id: String(quiz.id), title: quiz.title, thumbnail: quiz.thumbnail })`. Matches the existing `HomeStackParamList.QuizDetail` signature.
- **See All** → `navigation.navigate('Quizzes')`. Already registered.
- **Pull-to-refresh** on Home → `handleRefresh` adds `['quizzes']` to its `Promise.all` invalidation list so the section refreshes alongside the rest of Home.

---

## Integration into HomeScreen

In `mobile/src/features/home/screens/HomeScreen.tsx`, inside the `ListFooter`, insert a new section between `VideosHomeSection` and `WebStoriesStrip`:

```tsx
<View style={styles.sectionGap}>
  <VideosHomeSection />
</View>

<View style={styles.sectionGap}>
  <QuizzesHomeSection />
</View>

<View style={styles.sectionGap}>
  <WebStoriesStrip stories={PREVIEW_WEB_STORIES} onSeeAll={() => {}} />
</View>
```

Add `['quizzes']` to the `Promise.all` invalidation list in `handleRefresh`.

---

## Theming

All styles built via `useMemo(() => makeStyles(colors), [colors])`. Section header uses the same accent bar + uppercase title + subtitle + `See All` pressable as `VideosHomeSection`. The reused `FeaturedQuizCard` / `QuizGridCard` components already handle their own theming.

---

## Out of scope

- Any inline mini-quiz interactivity (the web prototype's pattern). The hero CTA delegates to the existing player flow.
- New API endpoints, transformers, or query keys.
- Modifying any file under `mobile/src/features/quizzes/` (existing screens and card components).
- Per-category filtering on the home preview.
- Daily-rotation logic / personalised picks.

---

## Acceptance

- Section renders between Videos and Web Stories on Home.
- Header accent + title + subtitle + See All visually mirror the Videos section.
- Hero is the highest-plays quiz with a stable `kind` badge; two grid cards beneath it.
- Tapping any card opens `QuizDetail` with the correct params; See All opens `Quizzes`.
- Pull-to-refresh refreshes the section.
- `npm run tsc` passes; no new lint warnings introduced by these files.
