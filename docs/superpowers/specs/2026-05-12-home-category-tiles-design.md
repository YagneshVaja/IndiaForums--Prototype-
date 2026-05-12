# Home Category Tiles — Hotstar-style Redesign

**Date:** 2026-05-12
**Branch:** feat/celebrity-profile-tier1
**Owner:** Yagnesh

## Problem

The Home tab's category row ([mobile/src/features/home/components/StoriesStrip.tsx](../../../mobile/src/features/home/components/StoriesStrip.tsx)) renders eight categories as emoji inside a blue-ringed circle. The pattern looks dated next to popular Indian apps (JioHotstar, JioCinema, SonyLIV) and inconsistent with the rest of the home, which already leans Hotstar-style (image-led cards, accent-bar headers).

## Goal

Replace the emoji-in-circle pattern with rounded-square **gradient tiles** carrying a white line icon and label below, matching the JioHotstar/JioCinema category-row convention.

Out of scope:
- Navigation handlers (kept as-is)
- The strip's neighbors (TrendingNow header, ChannelsSection, etc.)
- The Home chrome (notification bell, brand mark, tab bar)

## Design

### Tile anatomy

- **Shape:** 72×72 rounded square, `borderRadius: 18`
- **Background:** `LinearGradient` (2-stop, ~135° diagonal) per category
- **Icon:** white Ionicon, size 30, centered
- **Label:** 11px, weight 600, `colors.textSecondary`, sits *below* the tile, max-width 72, `numberOfLines={1}`
- **Press state:** `scale(0.96)`, opacity 0.85
- **Elevation:** iOS `shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: {0, 3}`, Android `elevation: 3`

### Strip layout

- `ScrollView horizontal`, `showsHorizontalScrollIndicator={false}`
- `paddingHorizontal: 14`, `paddingTop: 12`, `paddingBottom: 10`
- `gap: 14` between items
- Item width 72 → ~4.5 tiles visible on a 390pt screen
- Strip `backgroundColor: colors.card` (unchanged)

### Category gradient + icon map

| id | Label | Gradient (start → end) | Icon (semantic) |
|---|---|---|---|
| 1 | Celebrities | `#FFB347 → #FF7E5F` | `star` |
| 2 | Movies | `#E94057 → #8A2387` | `video` |
| 3 | Videos | `#4FACFE → #00C6FB` | `play` |
| 4 | Galleries | `#43E97B → #38F9D7` | `images` |
| 5 | Fan Fictions | `#A18CD1 → #FBC2EB` | `book` |
| 6 | Quizzes | `#FA709A → #FEE140` | `helpCircle` (new) |
| 7 | Shorts | `#F857A6 → #FF5858` | `flash` (new) |
| 8 | Web Stories | `#5B86E5 → #36D1DC` | `globe` |

Gradients are vivid enough to read on both light and dark backgrounds, so the same values apply in both themes. The label color switches via `colors.textSecondary`.

### Icon-map additions

In [mobile/src/components/ui/Icon.tsx](../../../mobile/src/components/ui/Icon.tsx), add to `NAME_MAP`:

```ts
helpCircle: 'help-circle',
flash: 'flash',
```

### Data shape

The existing `STORIES` constant inside `StoriesStrip.tsx` is reshaped — `emoji` / `bgLight` / `bgDark` are removed and replaced with `icon` (IconName) and `gradient` ([string, string]). Navigation handler (`handlePress`) is untouched.

```ts
const CATEGORIES = [
  { id: 1, label: 'Celebrities',  icon: 'star',       gradient: ['#FFB347', '#FF7E5F'] },
  { id: 2, label: 'Movies',       icon: 'video',      gradient: ['#E94057', '#8A2387'] },
  { id: 3, label: 'Videos',       icon: 'play',       gradient: ['#4FACFE', '#00C6FB'] },
  { id: 4, label: 'Galleries',    icon: 'images',     gradient: ['#43E97B', '#38F9D7'] },
  { id: 5, label: 'Fan Fictions', icon: 'book',       gradient: ['#A18CD1', '#FBC2EB'] },
  { id: 6, label: 'Quizzes',      icon: 'helpCircle', gradient: ['#FA709A', '#FEE140'] },
  { id: 7, label: 'Shorts',       icon: 'flash',      gradient: ['#F857A6', '#FF5858'] },
  { id: 8, label: 'Web Stories',  icon: 'globe',      gradient: ['#5B86E5', '#36D1DC'] },
] as const;
```

### Render skeleton

```tsx
<Pressable style={styles.item} onPress={() => handlePress(c)}>
  <LinearGradient
    colors={c.gradient}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={styles.tile}
  >
    <Icon name={c.icon} size={30} color="#FFFFFF" />
  </LinearGradient>
  <Text style={styles.label} numberOfLines={1}>{c.label}</Text>
</Pressable>
```

## Acceptance criteria

1. Home tab renders eight gradient tiles in a horizontally scrollable row in place of the emoji circles.
2. Each tile shows a white Ionicon centered on a 2-stop diagonal gradient, with the label below.
3. Tapping a tile still navigates to the same destination as before (Celebrities, Movies, Videos, Galleries, FanFiction, Quizzes, Shorts, WebStories).
4. Press feedback (scale + opacity) is visible on tap.
5. Light and dark mode both render correctly: gradients unchanged, label uses `colors.textSecondary`, strip background uses `colors.card`.
6. `npm run tsc` passes with no new errors.
7. No new dependencies added (uses `expo-linear-gradient` already in `package.json`).

## Risks / notes

- **Gradient performance:** eight `LinearGradient` views in a scrollable row is well within RN's budget. No measurable cost expected on mid-range Android.
- **Icon weight:** Ionicons line icons are thinner than the previous emoji. The 30px size compensates so the tile doesn't feel empty. If icons still feel light at QA time, bump to 32 or swap select icons to filled variants (e.g., `star` is already filled, `play` is filled).
- **Color accessibility:** all gradients have a luminance midpoint dark enough that white icons clear WCAG AA contrast (≥4.5:1) against the lighter stop. Verify only if a category fails the eye test.
