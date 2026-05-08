# Home Fan Quizzes Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Fan Quizzes preview section to the Home tab between the Videos section and Web Stories — one featured hero card + two grid cards.

**Architecture:** A single new `QuizzesHomeSection` component reads the existing `useQuizzes()` query, picks one hero (highest plays) + two follow-ups, and renders them with the *existing* `FeaturedQuizCard` and `QuizGridCard` components. Tap → existing `QuizDetail` route; See All → existing `Quizzes` route. No new card components; only the wrapper section.

**Tech Stack:** React Native (Expo 55) · TypeScript · React Query · React Navigation. Verification via `npm run tsc` + Expo Metro visual check (mobile/CLAUDE.md established pattern; no Jest tests committed in this repo).

**Spec:** [`docs/superpowers/specs/2026-05-08-home-quizzes-section-design.md`](../specs/2026-05-08-home-quizzes-section-design.md)

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `mobile/src/features/home/components/QuizzesHomeSection.tsx` | new | Section header + hero `FeaturedQuizCard` + 2-column row of `QuizGridCard`s + loading skeleton + empty/error guard + navigation wiring + hero `kind` selection |
| `mobile/src/features/home/screens/HomeScreen.tsx` | modify | Render `<QuizzesHomeSection />` between `VideosHomeSection` and `WebStoriesStrip`; add `['quizzes']` to refresh invalidation list |

No new types, hooks, APIs, or card components. The reused components live in `mobile/src/features/quizzes/components/`.

---

### Task 1: Create `QuizzesHomeSection.tsx`

**Files:**
- Create: `mobile/src/features/home/components/QuizzesHomeSection.tsx`

- [ ] **Step 1: Write the file**

```tsx
import React, { useCallback, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import type { HomeStackParamList } from '../../../navigation/types';
import type { Quiz } from '../../../services/api';
import { useQuizzes } from '../../quizzes/hooks/useQuizzes';
import FeaturedQuizCard, {
  type FeaturedKind,
} from '../../quizzes/components/FeaturedQuizCard';
import QuizGridCard from '../../quizzes/components/QuizGridCard';

type NavigationProp = NativeStackNavigationProp<HomeStackParamList>;

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function pickKind(quiz: Quiz, now: number = Date.now()): FeaturedKind {
  if (quiz.plays_raw > 500) return 'trending';
  const t = Date.parse(quiz.publishedWhen);
  if (!Number.isNaN(t) && now - t < SEVEN_DAYS_MS) return 'fresh';
  return 'surprise';
}

interface PreviewSelection {
  hero: Quiz | null;
  grid: Quiz[];
}

function selectPreview(quizzes: Quiz[]): PreviewSelection {
  if (!quizzes.length) return { hero: null, grid: [] };

  const sorted = [...quizzes].sort((a, b) => {
    if (b.plays_raw !== a.plays_raw) return b.plays_raw - a.plays_raw;
    return a.title.localeCompare(b.title);
  });
  const hero = sorted[0];
  const grid = quizzes.filter((q) => q.id !== hero.id).slice(0, 2);
  return { hero, grid };
}

export default function QuizzesHomeSection() {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<NavigationProp>();

  const { data, isLoading, isError } = useQuizzes();

  const allQuizzes = useMemo<Quiz[]>(
    () => (data?.pages ?? []).flatMap((p) => p.quizzes),
    [data],
  );
  const { hero, grid } = useMemo(() => selectPreview(allQuizzes), [allQuizzes]);
  const heroKind = useMemo(() => (hero ? pickKind(hero) : 'trending'), [hero]);

  const handleQuizPress = useCallback(
    (quiz: Quiz) => {
      navigation.navigate('QuizDetail', {
        id: String(quiz.id),
        title: quiz.title,
        thumbnail: quiz.thumbnail,
      });
    },
    [navigation],
  );

  const handleSeeAll = useCallback(
    () => navigation.navigate('Quizzes'),
    [navigation],
  );

  if (isError && !hero) return null;
  if (!isLoading && !hero) return null;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.accentBar} />
          <View style={styles.titleCol}>
            <Text style={styles.title}>FAN QUIZZES</Text>
            <Text style={styles.subtitle}>
              Test your fan score · daily picks
            </Text>
          </View>
        </View>
        <Pressable
          onPress={handleSeeAll}
          style={({ pressed }) => [
            styles.seeAll,
            pressed && styles.seeAllPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="See all quizzes"
        >
          <Text style={styles.seeAllText}>See All</Text>
          <Ionicons name="chevron-forward" size={13} color={colors.primary} />
        </Pressable>
      </View>

      <View style={styles.body}>
        {isLoading && !hero ? (
          <>
            <View style={[styles.skeleton, styles.skeletonHero]} />
            <View style={styles.gridRow}>
              <View style={[styles.skeleton, styles.skeletonGrid]} />
              <View style={[styles.skeleton, styles.skeletonGrid]} />
            </View>
          </>
        ) : null}

        {hero ? (
          <View style={styles.heroWrap}>
            <FeaturedQuizCard
              quiz={hero}
              kind={heroKind}
              onPress={handleQuizPress}
            />
          </View>
        ) : null}

        {grid.length ? (
          <View style={styles.gridRow}>
            {grid.map((quiz) => (
              <View key={quiz.id} style={styles.gridCell}>
                <QuizGridCard quiz={quiz} onPress={handleQuizPress} />
              </View>
            ))}
            {grid.length === 1 ? <View style={styles.gridCell} /> : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    section: {
      backgroundColor: c.card,
      borderTopWidth: 1,
      borderTopColor: c.border,
      paddingTop: 16,
      paddingBottom: 16,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingBottom: 14,
      gap: 10,
    },
    titleRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'stretch',
      gap: 10,
    },
    accentBar: {
      width: 3.5,
      borderRadius: 2,
      backgroundColor: c.primary,
    },
    titleCol: {
      flex: 1,
      justifyContent: 'center',
    },
    title: {
      fontSize: 13,
      fontWeight: '900',
      color: c.text,
      letterSpacing: 1.5,
      textTransform: 'uppercase',
    },
    subtitle: {
      fontSize: 11,
      fontWeight: '600',
      color: c.textTertiary,
      marginTop: 2,
      letterSpacing: 0.2,
    },
    seeAll: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      paddingVertical: 4,
      paddingHorizontal: 6,
    },
    seeAllPressed: { opacity: 0.6 },
    seeAllText: {
      fontSize: 12,
      fontWeight: '700',
      color: c.primary,
      letterSpacing: 0.2,
    },

    body: {
      paddingHorizontal: 14,
      gap: 12,
    },
    heroWrap: {
      // FeaturedQuizCard owns its shadow/border-radius; no extra wrapper styling needed.
    },
    gridRow: {
      flexDirection: 'row',
      gap: 10,
    },
    gridCell: {
      flex: 1,
    },

    skeleton: {
      backgroundColor: c.surface,
      borderRadius: 14,
    },
    skeletonHero: {
      width: '100%',
      aspectRatio: 16 / 10,
      borderRadius: 18,
    },
    skeletonGrid: {
      flex: 1,
      aspectRatio: 0.78,
    },
  });
}
```

> **Why `FeaturedKind` is imported as a `type`:** The named export `FeaturedKind` from `FeaturedQuizCard` is declared as `export type FeaturedKind = 'trending' | 'fresh' | 'surprise'`. Using `import { type FeaturedKind }` keeps the import type-only and tree-shakeable, matching the convention used in sibling Home components.

> **Why `gap` instead of `width: '48%'`:** The 2-card row only ever holds two cells, each with `flex: 1`, separated by `gap: 10`. This keeps the math implicit and matches the `gridRow` pattern used by skeleton tiles immediately above. (Differs from `VideosHomeSection`, which uses `flexWrap: 'wrap'` for a 2×2 grid — that needed percentage widths because the gap can't bridge a wrap.)

> **Why `aspectRatio: 0.78` for the grid skeleton:** `QuizGridCard` is `aspectRatio: 1` (square thumb) plus a body block with `minHeight: 90`. At a typical width of ~165px on iPhone 14, that totals roughly 165 / (165 + 90) ≈ 0.78. Close enough to avoid layout pop when the real cards mount.

- [ ] **Step 2: Type-check**

Run: `cd mobile; npm run tsc`

Expected: PASS (no errors).

- [ ] **Step 3: Commit (only after user authorizes)**

> **Note:** Per user memory `feedback_always_ask_before_commit.md`, do NOT run `git commit` until the user explicitly authorizes it. Stop here, present the diff, and ask.

```bash
git add mobile/src/features/home/components/QuizzesHomeSection.tsx
git commit -m "feat(mobile): add QuizzesHomeSection (hero + 2-card rail)"
```

---

### Task 2: Wire `QuizzesHomeSection` into `HomeScreen`

**Files:**
- Modify: `mobile/src/features/home/screens/HomeScreen.tsx`

- [ ] **Step 1: Add the import**

In `HomeScreen.tsx`, immediately after the existing line:

```tsx
import VideosHomeSection from '../components/VideosHomeSection';
```

…add:

```tsx
import QuizzesHomeSection from '../components/QuizzesHomeSection';
```

- [ ] **Step 2: Add `['quizzes']` to pull-to-refresh invalidation**

Find the existing block in `handleRefresh`:

```tsx
await Promise.all([
  queryClient.invalidateQueries({ queryKey: ['banners'] }),
  queryClient.invalidateQueries({ queryKey: ['articles'] }),
  queryClient.invalidateQueries({ queryKey: ['home-forum-topics'] }),
  queryClient.invalidateQueries({ queryKey: ['home-media-galleries'] }),
  queryClient.invalidateQueries({ queryKey: ['videos'] }),
]);
```

Replace with:

```tsx
await Promise.all([
  queryClient.invalidateQueries({ queryKey: ['banners'] }),
  queryClient.invalidateQueries({ queryKey: ['articles'] }),
  queryClient.invalidateQueries({ queryKey: ['home-forum-topics'] }),
  queryClient.invalidateQueries({ queryKey: ['home-media-galleries'] }),
  queryClient.invalidateQueries({ queryKey: ['videos'] }),
  queryClient.invalidateQueries({ queryKey: ['quizzes'] }),
]);
```

The `useQuizzes` hook keys as `['quizzes', 'list']`, so invalidating the `['quizzes']` prefix covers it (and any future quiz-related sub-keys like `['quizzes', 'creators']`).

- [ ] **Step 3: Render the section in `ListFooter`**

Locate the existing block in the `ListFooter` `useMemo`:

```tsx
<View style={styles.sectionGap}>
  <VideosHomeSection />
</View>

<View style={styles.sectionGap}>
  <WebStoriesStrip stories={PREVIEW_WEB_STORIES} onSeeAll={() => {}} />
</View>
```

Insert a new section between them:

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

No dependency change is needed for the `ListFooter` `useMemo` — `QuizzesHomeSection` is parameterless and self-contained (it owns its own query, navigation, and state).

- [ ] **Step 4: Type-check**

Run: `cd mobile; npm run tsc`

Expected: PASS.

- [ ] **Step 5: Visual verification — Home tab**

Run: `cd mobile; npm run start`

Open the app on a device/emulator and verify on the Home tab:

1. Scroll past Trending Now / Latest News / Forums / Photo Galleries / Popular Indian TV Shows / VIDEOS.
2. The new **FAN QUIZZES** section appears immediately after VIDEOS and before Web Stories.
3. Header shows the red accent bar + "FAN QUIZZES" + subtitle "Test your fan score · daily picks" + right-aligned "See All ›" pressable.
4. Below the header, a full-width hero `FeaturedQuizCard` renders with:
   - Gradient background (or thumbnail when present), darkening overlay at the bottom.
   - A `kind` pill in the top-left: `🔥 TRENDING`, `🌟 FRESH PICK`, or `🎲 TODAY'S PICK` depending on the chosen quiz.
   - Quiz title (bold, large), byline, and a `▶ Play Now` pill bottom-right.
5. Below the hero, a 2-column row of `QuizGridCard`s with square thumbnails, type chip (Trivia/Personality/Range-Based), play-count badge, title, Qs count, and a small play affordance.
6. Tap the hero → navigates to `QuizDetail` with the matching quiz. Back returns to Home with scroll position preserved.
7. Tap a grid card → navigates to `QuizDetail` for that quiz.
8. Tap "See All" → navigates to `Quizzes` screen. Back returns to Home.
9. Pull to refresh → spinner appears, releases, the section stays populated; if upstream data changed, the hero/grid update accordingly.
10. Toggle dark mode (via Side Menu / theme toggle) → header text color, accent bar, subtitle, See All, and section background all adapt; the hero/grid card internals already handle theming.

If the section is empty or hides itself, open the **Quizzes** screen (Home → Side Menu → Quizzes, or wherever it's reachable) and confirm `useQuizzes` returns data — the home section deliberately hides when there are no quizzes.

- [ ] **Step 6: Commit (only after user authorizes)**

> **Note:** Do not run `git commit` until the user explicitly authorizes it (memory rule).

```bash
git add mobile/src/features/home/screens/HomeScreen.tsx
git commit -m "feat(mobile): show Fan Quizzes section on Home after Videos"
```

---

## Self-review

- **Spec coverage:**
  - Hero `FeaturedQuizCard` + 2 `QuizGridCard`s → Task 1 layout. ✓
  - Header style mirrors `VideosHomeSection` → Task 1 `header` styles. ✓
  - Selection rules (sort by `plays_raw` desc, dedup grid, render thresholds for 0/1/2/3+) → `selectPreview` + render guards in Task 1. ✓
  - Hero `kind` mapping (`trending` > 500 plays, else `fresh` if < 7 days, else `surprise`) → `pickKind` in Task 1. ✓
  - Card tap → `QuizDetail` with `{ id, title, thumbnail }` matching `HomeStackParamList` → `handleQuizPress` in Task 1. ✓
  - See All → `Quizzes` → `handleSeeAll` in Task 1. ✓
  - Loading skeleton → conditional in Task 1. ✓
  - Hide on error/empty → guards in Task 1. ✓
  - Insertion between `VideosHomeSection` and `WebStoriesStrip` → Task 2 step 3. ✓
  - Pull-to-refresh covers `['quizzes']` → Task 2 step 2. ✓
  - Theming via `makeStyles(colors)` → Task 1. ✓
- **Placeholder scan:** No "TBD"/"TODO"/"Similar to Task N" in any step. All code blocks are complete and self-contained.
- **Type consistency:**
  - `Quiz` imported from `../../../services/api` matches the type used by `useQuizzes`, `FeaturedQuizCard`, and `QuizGridCard`.
  - `FeaturedKind` imported from `FeaturedQuizCard` (where it is declared and exported).
  - `HomeStackParamList.QuizDetail` signature `{ id: string; title?: string; thumbnail?: string | null }` is satisfied by `{ id: String(quiz.id), title: quiz.title, thumbnail: quiz.thumbnail }`.
  - Route name `Quizzes` (no params) matches `HomeStackParamList.Quizzes: undefined`.
  - `useQuizzes` returns an `UseInfiniteQueryResult<QuizzesPage>`; reading `data.pages` and flattening `p.quizzes` matches that shape (verified against `useQuizzes` definition).

---

## Out of scope (explicitly not in this plan)

- Modifying any file under `mobile/src/features/quizzes/` (the existing Quizzes feature).
- Building parallel home-specific quiz card components (we reuse the existing ones).
- Adding query keys, transformers, or API endpoints.
- Inline mini-quiz interactivity from the web prototype.
- Daily-rotation logic or personalized hero selection.
- Unit tests (this codebase has no test pattern committed yet).
