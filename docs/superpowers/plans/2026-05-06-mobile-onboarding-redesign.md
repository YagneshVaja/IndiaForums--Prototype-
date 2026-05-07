# Mobile Onboarding Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the 3-slide onboarding carousel and the GetStartedScreen with a Spotify/Headspace-style editorial aesthetic — soft per-slide gradients, hero compositions built from RN primitives + Ionicons + the brand icon, animated pagination pill, and refined CTA buttons.

**Architecture:** Each slide gets its own hero component under `components/slideHeroes/`. The existing `OnboardingSlide.tsx` becomes a wrapper that picks the hero by `slide.id`, wraps with `expo-linear-gradient`, and renders the text area below. `PaginationDots` gains an `activeColor` prop. `OnboardingScreen` themes the CTA per active slide and fades Skip on the last slide. `GetStartedScreen` is restyled with the same gradient palette. No new dependencies.

**Tech Stack:** Expo SDK 55, React Native 0.83, TypeScript (strict), `expo-linear-gradient`, `@expo/vector-icons` (Ionicons), React Native `Animated` API.

**Spec:** [docs/superpowers/specs/2026-05-06-mobile-onboarding-redesign-design.md](../specs/2026-05-06-mobile-onboarding-redesign-design.md)

---

## File Structure

| Path | Action | Responsibility |
|---|---|---|
| `mobile/src/features/onboarding/types.ts` | Modify | Update `OnboardingSlide` interface: replace `emoji`+`accentColor` with `gradientStops`+`accent` |
| `mobile/src/features/onboarding/data/onboardingSlides.ts` | Modify | New gradient stops + accent color per slide; remove `emoji` |
| `mobile/src/features/onboarding/components/slideHeroes/CommunityHero.tsx` | Create | Slide 1 hero composition |
| `mobile/src/features/onboarding/components/slideHeroes/DiscussionHero.tsx` | Create | Slide 2 hero composition |
| `mobile/src/features/onboarding/components/slideHeroes/NewsHero.tsx` | Create | Slide 3 hero composition (with floating chip animation) |
| `mobile/src/features/onboarding/components/OnboardingSlide.tsx` | Rewrite | LinearGradient wrapper + hero dispatcher + slide-number/title/desc text area |
| `mobile/src/features/onboarding/components/PaginationDots.tsx` | Modify | Active dot animates to pill; accept optional `activeColor` prop |
| `mobile/src/features/onboarding/screens/OnboardingScreen.tsx` | Modify | Theme CTA color per slide, Skip fade on last slide, pass active accent to PaginationDots |
| `mobile/src/features/onboarding/screens/GetStartedScreen.tsx` | Rewrite (style only) | Gradient bg + splash-logo hero + new button styles. Existing entrance animation preserved. |

---

## Pre-flight

- [ ] **Step 1: Confirm clean working tree on `mobile/src/features/onboarding/`**

Run from repo root:
```
git status mobile/src/features/onboarding/
```
Expected: nothing modified except possibly the existing files we plan to touch.

- [ ] **Step 2: Confirm `expo-linear-gradient` is installed**

Run:
```
powershell -Command "(Get-Content mobile/package.json -Raw | ConvertFrom-Json).dependencies.'expo-linear-gradient'"
```
Expected output: a version string like `~55.0.13`. If missing, stop and tell the user.

---

## Task 1: Update slide type + data

**Files:**
- Modify: `mobile/src/features/onboarding/types.ts`
- Modify: `mobile/src/features/onboarding/data/onboardingSlides.ts`

This task changes the data shape. After this, the existing `OnboardingSlide.tsx` will fail tsc until Task 5 runs. That is intentional and expected — the next 3 tasks (heroes) don't depend on `OnboardingSlide.tsx` either.

- [ ] **Step 1: Replace `mobile/src/features/onboarding/types.ts` content**

Current content (lines 1-7):
```ts
export interface OnboardingSlide {
  id: string;
  title: string;
  description: string;
  emoji: string;
  accentColor: string;
}
```

Replace with:
```ts
export interface OnboardingSlide {
  id: string;
  title: string;
  description: string;
  gradientStops: readonly [string, string];
  accent: string;
}
```

- [ ] **Step 2: Replace `mobile/src/features/onboarding/data/onboardingSlides.ts` content**

Replace the entire file with:
```ts
import { OnboardingSlide } from '../types';

export const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    id: '1',
    title: "India's Biggest\nFan Community",
    description:
      'Millions of fans discussing movies, shows, and celebrities — all in one place.',
    gradientStops: ['#F0F4FF', '#C9D6FF'],
    accent: '#3558F0',
  },
  {
    id: '2',
    title: 'Forums & Fan\nFiction',
    description:
      'Join thousands of active discussions or write your own fan stories.',
    gradientStops: ['#EEFAF6', '#B8EBDB'],
    accent: '#10B981',
  },
  {
    id: '3',
    title: 'Breaking News,\nEvery Hour',
    description:
      'Stay updated with the latest in Bollywood, OTT, and Indian entertainment.',
    gradientStops: ['#FFF7ED', '#FFD9A8'],
    accent: '#F59E0B',
  },
];
```

- [ ] **Step 3: Verify type-only check on the data file**

Skip running full tsc here — the existing `OnboardingSlide.tsx` will currently complain about missing `emoji`/`accentColor`. We'll fix that in Task 5. Move on.

- [ ] **Step 4: Stop. Do NOT commit.** The controller handles commit approval per task.

---

## Task 2: CommunityHero component (Slide 1)

**Files:**
- Create: `mobile/src/features/onboarding/components/slideHeroes/CommunityHero.tsx`

- [ ] **Step 1: Create the slideHeroes directory**

Run:
```
powershell -Command "New-Item -ItemType Directory -Force -Path mobile/src/features/onboarding/components/slideHeroes | Out-Null"
```

- [ ] **Step 2: Create `CommunityHero.tsx`**

Write the file with this exact content:

```tsx
import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const LOGO_ICON = require('../../../../../assets/icon.png');

const HERO_SIZE = 300;

const AVATAR_TINTS = ['#3558F0', '#EC4899', '#10B981', '#F59E0B'] as const;

export default function CommunityHero() {
  return (
    <View style={styles.wrapper}>
      {/* Soft glow disc behind everything */}
      <View style={styles.glowDisc} />

      {/* Feed card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Image source={LOGO_ICON} style={styles.cardAvatar} resizeMode="contain" />
          <View style={styles.cardHeaderBars}>
            <View style={[styles.bar, { width: 90, height: 8 }]} />
            <View style={[styles.bar, { width: 56, height: 6, opacity: 0.55 }]} />
          </View>
        </View>
        <View style={[styles.bar, styles.bodyBar, { width: '92%' }]} />
        <View style={[styles.bar, styles.bodyBar, { width: '88%' }]} />
        <View style={[styles.bar, styles.bodyBar, { width: '60%' }]} />
        <View style={styles.cardFooter}>
          <Ionicons name="heart-outline" size={14} color="#9CA3AF" />
          <View style={[styles.bar, { width: 18, height: 6, opacity: 0.5 }]} />
          <Ionicons name="chatbubble-outline" size={14} color="#9CA3AF" style={{ marginLeft: 12 }} />
          <View style={[styles.bar, { width: 18, height: 6, opacity: 0.5 }]} />
        </View>
      </View>

      {/* Avatar circles orbiting the card */}
      {AVATAR_TINTS.map((tint, i) => (
        <View
          key={tint}
          style={[
            styles.avatar,
            avatarPositions[i],
            { borderColor: tint },
          ]}
        >
          <Ionicons name="person" size={18} color={tint} />
        </View>
      ))}
    </View>
  );
}

const avatarPositions = [
  { top: 4, left: 8 },
  { top: 8, right: 4 },
  { bottom: 32, left: 0 },
  { bottom: 16, right: 12 },
] as const;

const styles = StyleSheet.create({
  wrapper: {
    width: HERO_SIZE,
    height: HERO_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowDisc: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 999,
    backgroundColor: 'rgba(53,88,240,0.10)',
    top: 10,
    left: 10,
  },
  card: {
    width: 240,
    height: 180,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.10,
    shadowRadius: 20,
    elevation: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  cardAvatar: {
    width: 32,
    height: 32,
  },
  cardHeaderBars: {
    flex: 1,
    gap: 4,
  },
  bar: {
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
  },
  bodyBar: {
    height: 7,
    marginBottom: 7,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  avatar: {
    position: 'absolute',
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 3,
  },
});
```

- [ ] **Step 3: Type-check**

Run from `mobile/`:
```
npm run tsc
```

Expected output: no errors in `slideHeroes/CommunityHero.tsx`. Errors in `components/OnboardingSlide.tsx` ARE expected at this step (those will be fixed in Task 5). If any error names `CommunityHero.tsx`, stop and read it.

- [ ] **Step 4: Stop. Do NOT commit.**

---

## Task 3: DiscussionHero component (Slide 2)

**Files:**
- Create: `mobile/src/features/onboarding/components/slideHeroes/DiscussionHero.tsx`

- [ ] **Step 1: Create `DiscussionHero.tsx`**

Write the file with this exact content:

```tsx
import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const LOGO_ICON = require('../../../../../assets/icon.png');

const HERO_SIZE = 300;

export default function DiscussionHero() {
  return (
    <View style={styles.wrapper}>
      {/* Soft emerald glow disc */}
      <View style={styles.glowDisc} />

      {/* Bottom card — fan-fiction excerpt */}
      <View style={[styles.card, styles.cardBottom]}>
        <View style={styles.iconRow}>
          <Ionicons name="book-outline" size={16} color="#10B981" />
          <View style={[styles.bar, { width: 60, height: 6, opacity: 0.55 }]} />
        </View>
        <View style={[styles.bar, styles.bodyBar, { width: '95%' }]} />
        <View style={[styles.bar, styles.bodyBar, { width: '88%' }]} />
        <View style={[styles.bar, styles.bodyBar, { width: '70%' }]} />
        <View style={[styles.bar, styles.bodyBar, { width: '40%' }]} />
      </View>

      {/* Middle card — main post */}
      <View style={[styles.card, styles.cardMiddle]}>
        <View style={styles.iconRow}>
          <Image source={LOGO_ICON} style={styles.cardAvatar} resizeMode="contain" />
          <View style={styles.headerBars}>
            <View style={[styles.bar, { width: 70, height: 7 }]} />
            <View style={[styles.bar, { width: 40, height: 5, opacity: 0.5 }]} />
          </View>
        </View>
        <View style={[styles.bar, styles.bodyBar, { width: '90%' }]} />
        <View style={[styles.bar, styles.bodyBar, { width: '75%' }]} />
        <View style={styles.miniFooter}>
          <Ionicons name="heart" size={12} color="#EC4899" />
          <View style={[styles.bar, { width: 14, height: 5, opacity: 0.5 }]} />
        </View>
      </View>

      {/* Top card — reply */}
      <View style={[styles.card, styles.cardTop]}>
        <View style={styles.iconRow}>
          <Ionicons name="chatbubble-ellipses" size={16} color="#10B981" />
          <View style={[styles.bar, { width: 50, height: 6, opacity: 0.55 }]} />
        </View>
        <View style={[styles.bar, styles.bodyBar, { width: '85%' }]} />
        <View style={styles.replyRow}>
          <View style={styles.replyBadge}>
            <Text style={styles.replyBadgeText}>REPLY</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: HERO_SIZE,
    height: HERO_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowDisc: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 999,
    backgroundColor: 'rgba(16,185,129,0.10)',
  },
  card: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 14,
    elevation: 5,
  },
  cardBottom: {
    width: 220,
    height: 130,
    bottom: 30,
    left: 18,
    transform: [{ rotate: '-8deg' }],
  },
  cardMiddle: {
    width: 230,
    height: 130,
    top: 80,
    transform: [{ rotate: '4deg' }],
    zIndex: 2,
  },
  cardTop: {
    width: 210,
    height: 100,
    top: 24,
    right: 12,
    transform: [{ rotate: '-3deg' }],
    zIndex: 1,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  cardAvatar: {
    width: 26,
    height: 26,
  },
  headerBars: {
    flex: 1,
    gap: 3,
  },
  bar: {
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
  },
  bodyBar: {
    height: 6,
    marginBottom: 6,
  },
  miniFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  replyRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  replyBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  replyBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#065F46',
    letterSpacing: 1,
  },
});
```

- [ ] **Step 2: Type-check**

Run from `mobile/`:
```
npm run tsc
```

Expected: no errors in `DiscussionHero.tsx`. (Errors in `OnboardingSlide.tsx` still expected.)

- [ ] **Step 3: Stop. Do NOT commit.**

---

## Task 4: NewsHero component (Slide 3)

**Files:**
- Create: `mobile/src/features/onboarding/components/slideHeroes/NewsHero.tsx`

This hero has a subtle infinite floating animation on 3 notification chips above the main news card.

- [ ] **Step 1: Create `NewsHero.tsx`**

Write the file with this exact content:

```tsx
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const HERO_SIZE = 300;

const CHIP_DOT_COLORS = ['#3558F0', '#EC4899', '#10B981'] as const;

function FloatingChip({
  delay,
  dotColor,
  style,
}: {
  delay: number;
  dotColor: string;
  style: object;
}) {
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: -3,
          duration: 1250,
          delay,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 1250,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [delay, translateY]);

  return (
    <Animated.View style={[styles.chip, style, { transform: [{ translateY }] }]}>
      <View style={[styles.chipDot, { backgroundColor: dotColor }]} />
      <View style={[styles.bar, { width: 70, height: 5, opacity: 0.6 }]} />
    </Animated.View>
  );
}

export default function NewsHero() {
  return (
    <View style={styles.wrapper}>
      {/* Soft amber glow */}
      <View style={styles.glowDisc} />

      {/* Floating notification chips */}
      <FloatingChip delay={0}    dotColor={CHIP_DOT_COLORS[0]} style={{ top: 4,  left: 24 }} />
      <FloatingChip delay={400}  dotColor={CHIP_DOT_COLORS[1]} style={{ top: 28, right: 16 }} />
      <FloatingChip delay={800}  dotColor={CHIP_DOT_COLORS[2]} style={{ top: 56, left: 44 }} />

      {/* Main news card */}
      <View style={styles.card}>
        <LinearGradient
          colors={['#FFE4B5', '#F59E0B']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardImage}
        >
          <Ionicons name="newspaper-outline" size={24} color="#FFFFFF" style={styles.cardImageIcon} />
          <View style={styles.breakingBadge}>
            <Text style={styles.breakingBadgeText}>BREAKING</Text>
          </View>
        </LinearGradient>
        <View style={styles.cardBody}>
          <View style={[styles.bar, { width: '85%', height: 11, backgroundColor: '#1F2937', opacity: 0.85 }]} />
          <View style={[styles.bar, { width: '95%', height: 6, backgroundColor: '#9CA3AF', marginTop: 8 }]} />
          <View style={[styles.bar, { width: '70%', height: 6, backgroundColor: '#9CA3AF', marginTop: 5 }]} />
          <View style={styles.cardFooter}>
            <View style={[styles.dotTiny, { backgroundColor: '#9CA3AF' }]} />
            <View style={[styles.bar, { width: 50, height: 5, backgroundColor: '#9CA3AF', opacity: 0.7 }]} />
            <Ionicons name="heart-outline" size={12} color="#9CA3AF" style={{ marginLeft: 'auto' }} />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: HERO_SIZE,
    height: HERO_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowDisc: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 999,
    backgroundColor: 'rgba(245,158,11,0.12)',
  },
  card: {
    width: 270,
    height: 210,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 6,
    marginTop: 40,
  },
  cardImage: {
    height: 86,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  cardImageIcon: {
    opacity: 0.9,
  },
  breakingBadge: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  breakingBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  cardBody: {
    padding: 14,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 12,
  },
  bar: {
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
  },
  dotTiny: {
    width: 4,
    height: 4,
    borderRadius: 999,
  },
  chip: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 10,
    elevation: 4,
    zIndex: 2,
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
  },
});
```

- [ ] **Step 2: Type-check**

Run from `mobile/`:
```
npm run tsc
```

Expected: no errors in `NewsHero.tsx`. (`OnboardingSlide.tsx` still erroring.)

- [ ] **Step 3: Stop. Do NOT commit.**

---

## Task 5: Refactor OnboardingSlide

**Files:**
- Rewrite: `mobile/src/features/onboarding/components/OnboardingSlide.tsx`

After this task, the data shape mismatch from Task 1 is resolved.

- [ ] **Step 1: Replace the entire file content**

Replace the entire file (currently 167 lines) with:

```tsx
import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { OnboardingSlide as SlideType } from '../types';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';
import CommunityHero from './slideHeroes/CommunityHero';
import DiscussionHero from './slideHeroes/DiscussionHero';
import NewsHero from './slideHeroes/NewsHero';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const HEROES: Record<string, React.ComponentType> = {
  '1': CommunityHero,
  '2': DiscussionHero,
  '3': NewsHero,
};

interface Props {
  slide: SlideType;
}

export function OnboardingSlide({ slide }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const Hero = HEROES[slide.id];
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(scale,   { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
  }, [opacity, scale]);

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

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: 28,
      paddingTop: 16,
      paddingBottom: 24,
    },
    heroArea: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    textArea: {
      alignItems: 'flex-start',
      width: '100%',
      gap: 10,
      paddingTop: 8,
    },
    slideNumber: {
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 1,
      opacity: 0.9,
    },
    title: {
      fontSize: 32,
      fontWeight: '800',
      color: c.text,
      lineHeight: 40,
      letterSpacing: -0.6,
    },
    description: {
      fontSize: 15,
      fontWeight: '400',
      color: c.textSecondary,
      lineHeight: 23,
      maxWidth: 320,
    },
  });
}
```

- [ ] **Step 2: Type-check the whole project**

Run from `mobile/`:
```
npm run tsc
```

Expected: no errors related to onboarding files. (Pre-existing unrelated errors in other features may remain — e.g., `ForumThreadScreen.tsx`. Confirm none of the listed errors mention `onboarding`.)

- [ ] **Step 3: Stop. Do NOT commit.**

---

## Task 6: Update PaginationDots with active-pill animation + accent prop

**Files:**
- Modify: `mobile/src/features/onboarding/components/PaginationDots.tsx`

- [ ] **Step 1: Replace the entire file content**

Replace the entire file (currently 65 lines) with:

```tsx
import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useThemeStore } from '../../../store/themeStore';

interface Props {
  count: number;
  activeIndex: number;
  /** Color of the active dot. Falls back to theme primary. */
  activeColor?: string;
}

function Dot({ isActive, activeColor }: { isActive: boolean; activeColor: string }) {
  const colors = useThemeStore((s) => s.colors);
  const width = useRef(new Animated.Value(isActive ? 28 : 8)).current;
  const opacity = useRef(new Animated.Value(isActive ? 1 : 0.45)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(width, {
        toValue: isActive ? 28 : 8,
        duration: 250,
        useNativeDriver: false, // width cannot use native driver
      }),
      Animated.timing(opacity, {
        toValue: isActive ? 1 : 0.45,
        duration: 250,
        useNativeDriver: false,
      }),
    ]).start();
  }, [isActive, width, opacity]);

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          width,
          opacity,
          backgroundColor: isActive ? activeColor : colors.border,
        },
      ]}
    />
  );
}

export function PaginationDots({ count, activeIndex, activeColor }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const resolvedActive = activeColor ?? colors.primary;
  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, i) => (
        <Dot key={i} isActive={i === activeIndex} activeColor={resolvedActive} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
});
```

- [ ] **Step 2: Type-check**

Run from `mobile/`:
```
npm run tsc
```

Expected: no errors related to `PaginationDots.tsx`.

- [ ] **Step 3: Stop. Do NOT commit.**

---

## Task 7: Wire OnboardingScreen — themed CTA + Skip fade

**Files:**
- Modify: `mobile/src/features/onboarding/screens/OnboardingScreen.tsx`

This task adjusts only the screen-level wiring. No layout overhaul.

- [ ] **Step 1: Add Animated import + useEffect import**

In the `react-native` named imports (lines 2-11) add `Animated`. The block becomes:

```tsx
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Dimensions,
  ViewToken,
  Image,
  Animated,
} from 'react-native';
```

In the React import on line 1, add `useEffect`. The line becomes:

```tsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
```

- [ ] **Step 2: Pass active accent to `PaginationDots`**

Replace the existing line:
```tsx
        <PaginationDots count={ONBOARDING_SLIDES.length} activeIndex={currentIndex} />
```

with:
```tsx
        <PaginationDots
          count={ONBOARDING_SLIDES.length}
          activeIndex={currentIndex}
          activeColor={ONBOARDING_SLIDES[currentIndex].accent}
        />
```

- [ ] **Step 3: Theme the Next button background using the active slide's accent**

Find the Next button JSX (currently around line 106-117):
```tsx
        <Pressable
          style={({ pressed }) => [
            styles.nextButton,
            isLastSlide && styles.nextButtonWide,
            pressed && styles.nextButtonPressed,
          ]}
          onPress={handleNext}
        >
          <Text style={styles.nextButtonText}>
            {isLastSlide ? 'Get Started' : 'Next →'}
          </Text>
        </Pressable>
```

Replace with:
```tsx
        <Pressable
          style={({ pressed }) => [
            styles.nextButton,
            { backgroundColor: ONBOARDING_SLIDES[currentIndex].accent, shadowColor: ONBOARDING_SLIDES[currentIndex].accent },
            isLastSlide && styles.nextButtonWide,
            pressed && styles.nextButtonPressed,
          ]}
          onPress={handleNext}
        >
          <Text style={styles.nextButtonText}>
            {isLastSlide ? 'Get Started' : 'Next →'}
          </Text>
        </Pressable>
```

The inline style overrides the static `backgroundColor: c.primary` and `shadowColor: c.primary` from the StyleSheet.

- [ ] **Step 4: Replace the Skip button block with an animated version**

Find:
```tsx
        {!isLastSlide && (
          <Pressable style={styles.skipButton} onPress={handleSkip} hitSlop={12}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        )}
```

Replace with (remove the conditional render; we now always render but fade it):
```tsx
        <Animated.View style={{ opacity: skipOpacity }} pointerEvents={isLastSlide ? 'none' : 'auto'}>
          <Pressable style={styles.skipButton} onPress={handleSkip} hitSlop={12}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        </Animated.View>
```

- [ ] **Step 5: Add the `skipOpacity` Animated value and effect**

Just below the existing `const isLastSlide = currentIndex === ONBOARDING_SLIDES.length - 1;` line (currently line 34), insert:

```tsx
  const skipOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(skipOpacity, {
      toValue: isLastSlide ? 0 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isLastSlide, skipOpacity]);
```

- [ ] **Step 6: Update the container backgroundColor**

The screen sits on top of each slide's gradient. The slides paint their own background, so the screen container can stay `c.bg`. No change needed here unless visual testing reveals a mismatch.

The static `nextButton` style still has `backgroundColor: c.primary` and `shadowColor: c.primary`. The inline style overrides take precedence at render time, so we leave the StyleSheet as-is (the static value is the fallback, never seen if data is intact).

- [ ] **Step 7: Type-check**

Run from `mobile/`:
```
npm run tsc
```

Expected: no errors mentioning `OnboardingScreen.tsx`.

- [ ] **Step 8: Stop. Do NOT commit.**

---

## Task 8: Restyle GetStartedScreen with gradient background + new buttons

**Files:**
- Rewrite: `mobile/src/features/onboarding/screens/GetStartedScreen.tsx`

The animation logic and navigation handlers are kept verbatim. Only imports, JSX content, and styles change.

- [ ] **Step 1: Replace the entire file content**

Replace the entire file (currently 178 lines) with:

```tsx
import React, { useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  Animated,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '../../../navigation/types';
import { markOnboardingComplete } from '../../../store/onboardingStore';
import { useThemeStore } from '../../../store/themeStore';
import type { ThemeColors } from '../../../theme/tokens';

const SPLASH_LOGO = require('../../../../assets/splash-logo.png');

type Props = NativeStackScreenProps<OnboardingStackParamList, 'GetStarted'>;

export default function GetStartedScreen({ navigation }: Props) {
  const colors = useThemeStore((s) => s.colors);
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerY = useRef(new Animated.Value(20)).current;
  const buttonsOpacity = useRef(new Animated.Value(0)).current;
  const buttonsY = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(headerY,       { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(buttonsOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(buttonsY,       { toValue: 0, duration: 600, useNativeDriver: true }),
      ]).start();
    }, 200);
  }, [headerOpacity, headerY, buttonsOpacity, buttonsY]);

  const handleCreateAccount = () => {
    markOnboardingComplete();
    navigation.getParent()?.navigate('Auth', { screen: 'Register' });
  };

  const handleSignIn = () => {
    markOnboardingComplete();
    navigation.getParent()?.navigate('Auth', { screen: 'Login' });
  };

  const handleGuest = () => {
    markOnboardingComplete();
    navigation.getParent()?.navigate('Guest');
  };

  return (
    <LinearGradient
      colors={['#FFF7ED', '#FFFFFF']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.container}
    >
      <Animated.View style={[styles.header, {
        opacity: headerOpacity,
        transform: [{ translateY: headerY }],
      }]}>
        <Image source={SPLASH_LOGO} style={styles.lockup} resizeMode="contain" />
        <Text style={styles.tagline}>
          {'Join millions of fans.\nYour community awaits.'}
        </Text>
      </Animated.View>

      <Animated.View style={[styles.actions, {
        opacity: buttonsOpacity,
        transform: [{ translateY: buttonsY }],
      }]}>
        <Pressable
          style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
          onPress={handleCreateAccount}
        >
          <Text style={styles.primaryButtonText}>Create Account</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.outlineButton, pressed && styles.outlineButtonPressed]}
          onPress={handleSignIn}
        >
          <Text style={styles.outlineButtonText}>Sign In</Text>
        </Pressable>

        <Pressable style={styles.ghostButton} onPress={handleGuest} hitSlop={8}>
          <Text style={styles.ghostButtonText}>Continue as Guest</Text>
        </Pressable>
      </Animated.View>
    </LinearGradient>
  );
}

const PRIMARY_BLUE = '#3558F0';

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: Platform.OS === 'ios' ? 100 : 80,
      paddingBottom: Platform.OS === 'ios' ? 52 : 36,
      paddingHorizontal: 24,
    },
    header: {
      alignItems: 'center',
      gap: 18,
      width: '100%',
    },
    lockup: {
      width: 240,
      height: 175,
    },
    tagline: {
      fontSize: 22,
      fontWeight: '700',
      color: c.text,
      textAlign: 'center',
      lineHeight: 30,
      letterSpacing: -0.4,
      maxWidth: 320,
    },
    actions: {
      width: '100%',
      gap: 12,
      alignItems: 'center',
    },
    primaryButton: {
      width: '100%',
      backgroundColor: PRIMARY_BLUE,
      paddingVertical: 18,
      borderRadius: 16,
      alignItems: 'center',
      shadowColor: PRIMARY_BLUE,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.18,
      shadowRadius: 12,
      elevation: 4,
    },
    primaryButtonPressed: {
      opacity: 0.9,
      transform: [{ scale: 0.98 }],
    },
    primaryButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#FFFFFF',
    },
    outlineButton: {
      width: '100%',
      paddingVertical: 16.5,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: PRIMARY_BLUE,
      alignItems: 'center',
      backgroundColor: '#FFFFFF',
    },
    outlineButtonPressed: {
      backgroundColor: 'rgba(53,88,240,0.06)',
    },
    outlineButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: PRIMARY_BLUE,
    },
    ghostButton: {
      paddingVertical: 8,
      alignItems: 'center',
    },
    ghostButtonText: {
      fontSize: 15,
      fontWeight: '600',
      color: c.textSecondary,
    },
  });
}
```

- [ ] **Step 2: Type-check**

Run from `mobile/`:
```
npm run tsc
```

Expected: no errors mentioning `GetStartedScreen.tsx`.

- [ ] **Step 3: Stop. Do NOT commit.**

---

## Task 9: Final tsc + visual check

**Files:** none (verification only)

- [ ] **Step 1: Full project type-check**

Run from `mobile/`:
```
npm run tsc
```

Expected: any pre-existing unrelated errors are OK (e.g., `ForumThreadScreen.tsx`). No errors in any onboarding file. If a redesign file errors, return to its task and fix.

- [ ] **Step 2: Visual smoke test** (user-driven)

Run from `mobile/`:
```
npm run start
```

Reload the app on Expo Go. Walk through the onboarding flow:

- Slide 1: blue-tinted gradient bg, feed card with brand icon + 4 colored avatar circles around it
- Slide 2: green-tinted gradient bg, fanned stack of 3 chat-bubble cards including a `REPLY` badge
- Slide 3: amber-tinted gradient bg, news card with `BREAKING` badge + 3 floating notification chips above (subtle infinite up/down)
- Pagination dots: active dot is a colored pill, color matches current slide's accent
- Next button: bg color changes per slide (blue → green → amber)
- Skip button: visible on slides 1-2, fades out on slide 3
- Last slide CTA: reads "Get Started"
- After tapping Get Started: GetStartedScreen shows amber→white gradient bg, full India Forums lockup, tagline, and 3 buttons (Create Account in solid blue, Sign In as outlined blue, Continue as Guest as plain text)

If any of these are missing or visually wrong, return to the relevant task.

- [ ] **Step 3: Confirm no commit was made**

Run from repo root:
```
git log -1 --oneline
```

Expected: the most recent commit is `ea63191` (the Phase 2 logo replacement) — nothing from this plan should be committed yet.

The controller will batch this whole plan into appropriate commits in the next phase.

---

## Self-review notes

- **Spec coverage**:
  - Color palette → Task 1 (data) + Tasks 2-4 (heroes use accent colors) + Task 7 (CTA + dots) ✓
  - Per-slide hero compositions → Tasks 2, 3, 4 (one each) ✓
  - LinearGradient wrapper → Task 5 ✓
  - PaginationDots active pill → Task 6 ✓
  - Themed CTA + Skip fade → Task 7 ✓
  - GetStartedScreen redesign → Task 8 ✓
  - No new dependencies → confirmed (`expo-linear-gradient`, `@expo/vector-icons` already installed)
  - No emojis anywhere → none in any code block ✓
  - Animations limited to `Animated` API → all examples use `Animated.timing` / `Animated.loop`, no Reanimated ✓
- **Placeholder scan**: no TBD/TODO/"add error handling"/"similar to" patterns in any task.
- **Type consistency**: `gradientStops`, `accent`, `OnboardingSlide` interface all match across Task 1, Task 5, Task 7. `activeColor` prop matches between Task 6 (definition) and Task 7 (use).
- **Out-of-scope items intentionally absent**: LoginScreen, dark-mode tuning, splash polish — none have a task and are listed in the spec's out-of-scope.
