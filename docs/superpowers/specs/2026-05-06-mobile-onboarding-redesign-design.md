# Mobile Onboarding Redesign — Design Spec

**Date:** 2026-05-06
**Status:** Approved
**Owner:** Mobile

## Summary

Redesign the 3-slide onboarding carousel and the GetStartedScreen with a "Spotify / Headspace"-style editorial aesthetic. Each slide gets a soft per-theme gradient background, a hero composition built from layered React Native shapes + Ionicons + the brand icon, bold typography, and a coordinated CTA color. GetStartedScreen gets a matching gradient background with the full brand lockup as hero and refined button styles. No external photo or Lottie assets required.

## Goals

- Make the onboarding feel like a polished modern mobile app (Spotify Wrapped-class), not a rough prototype.
- Tell each slide's story visually in 1-2 seconds — community, discussion, news — without relying on emojis (which render unreliably across Android versions).
- Keep performance solid on mid-tier Android devices: no Lottie, no Reanimated worklets, only the React Native `Animated` API.
- Reuse what's already installed: `expo-linear-gradient`, `@expo/vector-icons`, the `icon.png` and `splash-logo.png` assets.

## Non-Goals

- LoginScreen redesign (separate concern; can be a follow-up to harmonize once the new palette is in place).
- Native splash redesign — the current `expo-splash-screen` config (white bg + vertical lockup, fade) stays. The user only sees our splash in a native dev/prod build, not in Expo Go.
- Dark-mode tuning of the new gradient palette. The spec nails light-mode polish; dark-mode appearance is acceptable but not optimized in this round.
- Sourcing or licensing photo / video / illustration assets. Everything is rendered from RN primitives + the existing brand icon.
- Animation choreography beyond simple fade+scale per slide and a pagination pill. No parallax, no shared element transitions.

## Source-of-truth references

- Spotify "Welcome" / Wrapped flows — bold per-slide color blocks
- Headspace onboarding — soft gradient bg + minimal hero composition
- Snapchat Bitmoji onboarding — layered card heroes

## Per-Slide Color Palette

Each slide picks one accent color and a 2-stop diagonal gradient (top-left → bottom-right). The gradients are intentionally soft so dark text stays readable without overlay tricks.

| Slide | Theme | Gradient stops (top-left → bottom-right) | Accent |
|---|---|---|---|
| 1 — Community | Indigo / brand blue | `#F0F4FF` → `#C9D6FF` | `#3558F0` |
| 2 — Discussion | Teal / emerald | `#EEFAF6` → `#B8EBDB` | `#10B981` |
| 3 — News | Warm amber | `#FFF7ED` → `#FFD9A8` | `#F59E0B` |

The accent color drives:
- The slide-number text (currently `c.primary`; will be `slide.accent`)
- The "Next →" CTA button background on that slide
- Small details inside the hero (badge dots, ring tints)

The pagination active-dot color is the current slide's accent color (animated as it changes).

## Slide Hero Compositions

All heroes render in a **square hero area sized to `min(SCREEN_WIDTH * 0.78, 320)`px**. Each is a separate component file under `components/slideHeroes/`. The `OnboardingSlide` component picks the hero by `slide.id` (no dynamic require).

### Slide 1 — `CommunityHero`

Tells the "people gathering around conversation" story.

Layered absolute-positioned elements inside the hero square:

1. **Soft gradient blur disc** (background layer) — circular `View` 280×280, `backgroundColor: 'rgba(53,88,240,0.10)'`, `borderRadius: 999`, slightly off-center. Adds depth.
2. **Feed card** — centered white `View`, ~280×190, `borderRadius: 24`, soft shadow (`shadowOpacity: 0.10`, offset `0,8`, radius `20`). Contains:
   - At top-left: brand icon `<Image source={icon.png} />` 36px square
   - Beside it: 2 short bars representing a post header (name, time) — Views with `borderRadius: 4`
   - Below: 3 thin "post body" bars, last one shorter (mimics paragraph)
   - At bottom-right: small Ionicons `heart-outline` (14px) + Ionicons `chatbubble-outline` (14px) with thin number-like bars next to each
3. **4 avatar circles** orbiting the card (each 38×38, `borderRadius: 999`, white background, 2px white border, soft shadow). Positions: top-left of card, top-right, bottom-left, bottom-right (all overlapping the card edge by ~50%). Each contains an Ionicons `person` (18px) tinted with one of: brand blue, pink `#EC4899`, emerald `#10B981`, amber `#F59E0B`. Subtle outer ring in matching color simulates online presence.

### Slide 2 — `DiscussionHero`

Tells the "active threads + fan-fiction" story.

3 stacked rotated cards forming a fanned stack:

1. **Bottom card** — 240×130, white, `borderRadius: 18`, rotated `-8deg`, shadow. Contents: small `book-outline` icon (16px, emerald), 4 thin text bars (last 2 shorter — mimics fan-fiction excerpt). Positioned bottom-left of hero.
2. **Middle card** — 240×130, white, `borderRadius: 18`, rotated `+4deg`, shadow stronger. Contents: brand icon 28px as avatar at top-left, 2 short bars for poster name + time, 3 body bars, a small heart row at bottom-right. Centered.
3. **Top card** — 240×100, white, `borderRadius: 18`, rotated `-3deg`, shadow strongest. Smaller card emphasizing reply: `chatbubble-ellipses` icon (16px, emerald) at left, 2 reply bars, "REPLY" pill badge in soft emerald (`#D1FAE5` bg, `#065F46` text, 10px, uppercase, tracked). Positioned top-right.
4. **Soft emerald glow disc** behind the stack (~300×300, `rgba(16,185,129,0.10)`).

### Slide 3 — `NewsHero`

Tells the "breaking news + freshness" story.

1. **Soft amber glow disc** behind everything (~280×280, `rgba(245,158,11,0.12)`).
2. **Main news card** (centered, ~290×220, white, `borderRadius: 22`, shadow). Contents:
   - Top: a 290×90 "image placeholder" — a 2-stop gradient block (`#FFE4B5` → `#F59E0B` at 30% opacity) with a small `newspaper-outline` icon (24px) bottom-left + "BREAKING" pill badge top-right (amber bg, white text, 9px, uppercase)
   - Below: 1 bold title bar (height 12, `borderRadius: 6`, dark gray ~`#1F2937`)
   - 2 thinner description bars (height 7, `borderRadius: 4`, lighter gray `#9CA3AF`, second one shorter)
   - Bottom row: a small dot + bar combo simulating "2 hrs ago" timestamp + a small heart icon
3. **3 floating notification chips** above the main card — smaller white pills (~140×34 each, `borderRadius: 17`, shadow), each with a 6px colored dot (one per accent color) on the left and 1 thin text bar. Stacked diagonally, slightly overlapping. Subtle floating animation (translateY -2px, infinite alternating, slow 2.5s).

The notification chips suggest "news arriving in real time" — the only place we use a continuous animation, intentionally subtle.

## Slide Text Layout

Below the hero (in the `OnboardingSlide` container):

- **Slide number**: `0{slide.id}` — 12px, weight 700, color `slide.accent`, letter-spacing 1, opacity 0.9
- **Title**: 32px, weight 800, color `c.text`, line-height 40, letter-spacing -0.6, respects `\n` line breaks in the data
- **Description**: 15px, weight 400, color `c.textSecondary`, line-height 23, max-width 320

Spacing: hero takes the upper ~55% of the slide vertical space, text area sits at ~30% with gap 12 between slide number, title, description. Bottom ~15% is the pagination + CTA bar.

## OnboardingScreen Updates

The screen-level layout is mostly unchanged — top row (logo + Skip), FlatList carousel, bottom bar (PaginationDots + CTA). Two updates:

1. **Themed CTA color**: the Next button background follows the active slide's accent color (smooth color tween across slides via `useAnimatedValue` + interpolate, OR simpler: use the active slide's accent and accept a snap on slide change — we'll do the snap, simpler is better here).
2. **Skip fade-out on last slide**: Skip Pressable opacity animates to 0 over 200ms when `isLastSlide` is true (and `pointerEvents: 'none'` to disable), and animates back to 1 if the user swipes back.

The "Next → / Get Started" text swap on the last slide already exists; we'll cross-fade it with a 200ms opacity transition for polish.

## PaginationDots Updates

Replace the current static dots with an animated bar:

- 3 dots in a row, gap 6
- Inactive dot: 8×8, `borderRadius: 4`, `c.border`
- Active dot: animates from 8×8 to **28×8 pill** (`borderRadius: 4`), background `slide.accent`
- Animate width via `Animated.timing` 250ms ease-out on `activeIndex` change
- The component currently takes `count` and `activeIndex` props — we'll add an optional `activeColor` prop (defaults to `c.primary`) for the accent

## GetStartedScreen Redesign

Currently: solid `c.primary` background, the icon (post Phase 2), brandName + tagline, 3 buttons (Create Account, Sign In, Continue as Guest). All white-on-blue.

**New layout:**

- **Background**: a vertical 2-stop linear gradient — `#FFF7ED` (top, slide-3 light amber) → `#FFFFFF` (bottom). Continues the visual energy from slide 3.
- **Hero (top ~55%)**: vertically centered
  - The full lockup `<Image source={splash-logo.png} />` at 240px wide (height auto via `resizeMode="contain"`)
  - Below it: tagline "Join millions of fans.\nYour community awaits." — 22px weight 700 line-height 30 color `c.text` letter-spacing -0.4 text-align center, max-width 320, with `\n` respected
- **Action group (bottom ~45%)**: pinned via flex layout, gap 12
  - **Primary CTA** "Create Account" — full-width 56px tall pill (`borderRadius: 16`), background `#3558F0` (brand blue), white text 16px weight 700, soft shadow (offset `0,4` radius `12` opacity `0.18` color `#3558F0`)
  - **Secondary CTA** "Sign In" — full-width 56px tall pill, white background, 1.5px border `#3558F0`, text `#3558F0` 16px weight 700
  - **Tertiary** "Continue as Guest" — text-only, 15px weight 600 color `c.textSecondary`, centered, hitSlop 12, no chrome
- **Safe area**: bottom padding `insets.bottom + 24`, top padding `insets.top + 32`, horizontal 24

The existing `Animated.parallel` entry animation (header fade-in + buttons fade-in with stagger) is kept verbatim. Only the visual style changes.

## Slide Data Update

Update `data/onboardingSlides.ts`:

```ts
export const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    id: '1',
    title: "India's Biggest\nFan Community",
    description: 'Millions of fans discussing movies, shows, and celebrities — all in one place.',
    gradientStops: ['#F0F4FF', '#C9D6FF'],
    accent: '#3558F0',
  },
  {
    id: '2',
    title: 'Forums & Fan\nFiction',
    description: 'Join thousands of active discussions or write your own fan stories.',
    gradientStops: ['#EEFAF6', '#B8EBDB'],
    accent: '#10B981',
  },
  {
    id: '3',
    title: 'Breaking News,\nEvery Hour',
    description: 'Stay updated with the latest in Bollywood, OTT, and Indian entertainment.',
    gradientStops: ['#FFF7ED', '#FFD9A8'],
    accent: '#F59E0B',
  },
];
```

The `OnboardingSlide` type in `mobile/src/features/onboarding/types.ts` updates accordingly: drop `emoji` and `accentColor`, add `gradientStops: [string, string]` and `accent: string`.

## OnboardingSlide Component Refactor

```tsx
import { LinearGradient } from 'expo-linear-gradient';
import CommunityHero from './slideHeroes/CommunityHero';
import DiscussionHero from './slideHeroes/DiscussionHero';
import NewsHero from './slideHeroes/NewsHero';

const HEROES: Record<string, React.ComponentType> = {
  '1': CommunityHero,
  '2': DiscussionHero,
  '3': NewsHero,
};

export function OnboardingSlide({ slide }: { slide: SlideType }) {
  const Hero = HEROES[slide.id];
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(scale,   { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <LinearGradient
      colors={slide.gradientStops}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, { width: SCREEN_WIDTH }]}
    >
      <Animated.View style={[styles.heroArea, { opacity, transform: [{ scale }] }]}>
        {Hero ? <Hero /> : null}
      </Animated.View>

      <View style={styles.textArea}>
        <Text style={[styles.slideNumber, { color: slide.accent }]}>0{slide.id}</Text>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.description}>{slide.description}</Text>
      </View>
    </LinearGradient>
  );
}
```

The hero components are pure presentational (no props beyond what's static); each renders its own absolute-positioned composition inside a fixed-size square wrapper.

## Animations

All via React Native's `Animated` (no Reanimated worklets):

| Element | Trigger | From → To | Duration | Easing |
|---|---|---|---|---|
| Slide hero | mount | opacity 0→1, scale 0.92→1 | 500ms | linear (timing) |
| Pagination active dot | activeIndex change | width 8→28 (active), 28→8 (deactivating) | 250ms | ease-out |
| Pagination active dot color | activeIndex change | snap (no tween) | n/a | n/a |
| CTA bg color | activeIndex change | snap (no tween) | n/a | n/a |
| CTA text "Next →" / "Get Started" | last-slide toggle | cross-fade opacity | 200ms | linear |
| Skip button | last-slide toggle | opacity 1→0 (fade out), 0→1 (fade in) | 200ms | linear |
| News slide notification chips | mount + loop | translateY 0→-2→0 | 2500ms | ease-in-out |

Color snaps (vs tweens) are intentional — the slide is already crossfading via FlatList paging, and adding color tweens on top reads as noisy.

## File Structure

| Path | Action | Responsibility |
|---|---|---|
| `mobile/src/features/onboarding/types.ts` | Modify | Update `OnboardingSlide` type: replace `emoji`+`accentColor` with `gradientStops`+`accent` |
| `mobile/src/features/onboarding/data/onboardingSlides.ts` | Modify | New gradient stops + accent color per slide; remove emoji |
| `mobile/src/features/onboarding/components/OnboardingSlide.tsx` | Rewrite | LinearGradient wrapper + hero dispatcher + text area |
| `mobile/src/features/onboarding/components/slideHeroes/CommunityHero.tsx` | Create | Slide 1 hero composition |
| `mobile/src/features/onboarding/components/slideHeroes/DiscussionHero.tsx` | Create | Slide 2 hero composition |
| `mobile/src/features/onboarding/components/slideHeroes/NewsHero.tsx` | Create | Slide 3 hero composition (with floating chip animation) |
| `mobile/src/features/onboarding/components/PaginationDots.tsx` | Modify | Animated active-dot pill + accent color prop |
| `mobile/src/features/onboarding/screens/OnboardingScreen.tsx` | Modify | Themed CTA per active slide, Skip fade on last slide, pass accent to PaginationDots |
| `mobile/src/features/onboarding/screens/GetStartedScreen.tsx` | Rewrite (style only) | Gradient bg + splash-logo hero + new button styles. Existing entrance animation preserved. |

## Acceptance Criteria

- [ ] Each of the 3 slides shows a distinct gradient bg, a unique hero composition (community / discussion / news), bold title, accent-colored slide number.
- [ ] Hero compositions render correctly on Android (no missing emojis, no clipping). All visual elements come from RN primitives + Ionicons + the brand icon — no emoji glyphs anywhere.
- [ ] Pagination dots: active dot is a pill in the slide's accent color; inactive dots are small circles in `c.border`.
- [ ] CTA button on slide 3 reads "Get Started" (already in code) and the bg picks up the slide's accent.
- [ ] Skip button fades out on the last slide and is non-interactive there.
- [ ] GetStartedScreen shows the gradient amber→white background, the full splash-logo lockup at hero size, the tagline, and 3 buttons in the new style. Existing entrance animation still plays.
- [ ] No new TypeScript errors (`npm run tsc` from `mobile/` passes).
- [ ] No new dependencies in `package.json`.
- [ ] Visual check on a real device or emulator: slides feel like a polished modern app — no obvious blank zones, no pale-on-pale legibility issues.

## Out-of-scope follow-ups

- LoginScreen restyle to harmonize with the new palette
- Dark-mode tuning of the gradient stops + hero card colors
- Replacing hero compositions with proper Lottie animations or illustrator-authored SVGs once design has bandwidth
- Adding a subtle parallax on hero translateY tied to scroll offset (nice-to-have)
- Splash polish for production builds (current splash-logo + white bg + fade is a fine v1)
