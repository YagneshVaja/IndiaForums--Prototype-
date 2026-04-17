# RN Onboarding Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the initial app opening experience — native splash, 3-slide onboarding carousel, and a "Get Started" entry screen — wired into the RootNavigator so first-time users see onboarding and returning users skip straight to the app.

**Architecture:** An `OnboardingStack` (SplashScreen → OnboardingScreen → GetStartedScreen) is rendered by `RootNavigator` when `hasSeenOnboarding` is `false`. MMKV provides a synchronous flag read so the navigator makes the correct routing decision on first render. Completing or skipping onboarding writes the flag and replaces the stack root with `GuestStack` or `AuthStack`.

**Tech Stack:** React Native (TypeScript), Expo Bare, React Navigation v7 (native-stack), react-native-reanimated v3, react-native-mmkv, NativeWind v4 / StyleSheet fallback, @expo/vector-icons.

---

## File Map

| Path | Responsibility |
|------|----------------|
| `mobile/src/features/onboarding/types.ts` | `OnboardingSlide` type |
| `mobile/src/features/onboarding/data/onboardingSlides.ts` | 3 slide definitions |
| `mobile/src/store/onboardingStore.ts` | MMKV `hasSeenOnboarding` flag |
| `mobile/src/features/onboarding/components/PaginationDots.tsx` | Animated dot indicator strip |
| `mobile/src/features/onboarding/components/OnboardingSlide.tsx` | Single slide: illustration + title + description |
| `mobile/src/features/onboarding/screens/SplashScreen.tsx` | Branded animated splash, auto-transitions after 2 s |
| `mobile/src/features/onboarding/screens/OnboardingScreen.tsx` | Horizontal carousel + skip/next/get-started |
| `mobile/src/features/onboarding/screens/GetStartedScreen.tsx` | Entry CTA: Create Account / Sign In / Guest |
| `mobile/src/navigation/types.ts` | `OnboardingStackParamList`, extended `RootStackParamList` |
| `mobile/src/navigation/OnboardingStack.tsx` | Stack: Splash → Onboarding → GetStarted |
| `mobile/src/navigation/RootNavigator.tsx` | Routes to OnboardingStack / GuestStack / AuthStack / MainTabs |
| `mobile/App.tsx` | App entry: providers + NavigationContainer |

---

## Task 1 — Types and Slide Data

**Files:**
- Create: `mobile/src/features/onboarding/types.ts`
- Create: `mobile/src/features/onboarding/data/onboardingSlides.ts`

- [ ] **Step 1: Create types**

```typescript
// mobile/src/features/onboarding/types.ts
export interface OnboardingSlide {
  id: string;
  title: string;
  description: string;
  emoji: string;
  accentColor: string;
}
```

- [ ] **Step 2: Create slide data**

```typescript
// mobile/src/features/onboarding/data/onboardingSlides.ts
import { OnboardingSlide } from '../types';

export const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    id: '1',
    title: "India's Biggest\nFan Community",
    description:
      'Millions of fans discussing movies, shows, and celebrities — all in one place.',
    emoji: '🎬',
    accentColor: '#EBF0FF',
  },
  {
    id: '2',
    title: 'Forums & Fan\nFiction',
    description:
      'Join thousands of active discussions or write your own fan stories.',
    emoji: '💬',
    accentColor: '#F0FFF4',
  },
  {
    id: '3',
    title: 'Breaking News,\nEvery Hour',
    description:
      'Stay updated with the latest in Bollywood, OTT, and Indian entertainment.',
    emoji: '📰',
    accentColor: '#FFF7ED',
  },
];
```

- [ ] **Step 3: Commit**

```bash
git add mobile/src/features/onboarding/types.ts mobile/src/features/onboarding/data/onboardingSlides.ts
git commit -m "feat(onboarding): add slide types and content data"
```

---

## Task 2 — MMKV Onboarding Store

**Files:**
- Create: `mobile/src/store/onboardingStore.ts`

- [ ] **Step 1: Create the store**

```typescript
// mobile/src/store/onboardingStore.ts
import { MMKV } from 'react-native-mmkv';

const storage = new MMKV({ id: 'onboarding' });

const KEY = 'onboarding_complete';

/** Synchronous — safe to call before first render */
export const hasSeenOnboarding = (): boolean =>
  storage.getBoolean(KEY) ?? false;

export const markOnboardingComplete = (): void =>
  storage.set(KEY, true);

/** For testing / dev reset only */
export const resetOnboarding = (): void =>
  storage.delete(KEY);
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/store/onboardingStore.ts
git commit -m "feat(onboarding): add MMKV-backed hasSeenOnboarding flag"
```

---

## Task 3 — PaginationDots Component

**Files:**
- Create: `mobile/src/features/onboarding/components/PaginationDots.tsx`

- [ ] **Step 1: Create the component**

```tsx
// mobile/src/features/onboarding/components/PaginationDots.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';

interface Props {
  count: number;
  activeIndex: number;
}

interface DotProps {
  isActive: boolean;
}

function Dot({ isActive }: DotProps) {
  const animatedStyle = useAnimatedStyle(() => ({
    width: withTiming(isActive ? 24 : 8, { duration: 300 }),
    backgroundColor: withTiming(isActive ? '#3558F0' : '#C8CFEA', {
      duration: 300,
    }),
  }));

  return <Animated.View style={[styles.dot, animatedStyle]} />;
}

export function PaginationDots({ count, activeIndex }: Props) {
  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, i) => (
        <Dot key={i} isActive={i === activeIndex} />
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

- [ ] **Step 2: Commit**

```bash
git add mobile/src/features/onboarding/components/PaginationDots.tsx
git commit -m "feat(onboarding): add animated PaginationDots component"
```

---

## Task 4 — OnboardingSlide Component

**Files:**
- Create: `mobile/src/features/onboarding/components/OnboardingSlide.tsx`

- [ ] **Step 1: Create the component**

```tsx
// mobile/src/features/onboarding/components/OnboardingSlide.tsx
import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { OnboardingSlide as SlideType } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  slide: SlideType;
}

export function OnboardingSlide({ slide }: Props) {
  return (
    <View style={[styles.container, { width: SCREEN_WIDTH }]}>
      {/* Illustration area */}
      <View style={[styles.illustrationWrapper, { backgroundColor: slide.accentColor }]}>
        <Text style={styles.emoji}>{slide.emoji}</Text>
      </View>

      {/* Text area */}
      <View style={styles.textArea}>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.description}>{slide.description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  illustrationWrapper: {
    width: SCREEN_WIDTH * 0.72,
    height: SCREEN_WIDTH * 0.72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 48,
  },
  emoji: {
    fontSize: 96,
  },
  textArea: {
    alignItems: 'center',
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  description: {
    fontSize: 16,
    fontWeight: '400',
    color: '#5F5F5F',
    textAlign: 'center',
    lineHeight: 24,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/features/onboarding/components/OnboardingSlide.tsx
git commit -m "feat(onboarding): add OnboardingSlide card component"
```

---

## Task 5 — SplashScreen

**Files:**
- Create: `mobile/src/features/onboarding/screens/SplashScreen.tsx`

- [ ] **Step 1: Create the screen**

```tsx
// mobile/src/features/onboarding/screens/SplashScreen.tsx
import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Splash'>;

export default function SplashScreen({ navigation }: Props) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.82);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  useEffect(() => {
    // Fade + spring in
    opacity.value = withTiming(1, { duration: 700 });
    scale.value = withSpring(1, { damping: 14, stiffness: 100 });

    // Auto-advance after 2.2 s
    const timer = setTimeout(() => {
      navigation.replace('Onboarding');
    }, 2200);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.logoArea, animatedStyle]}>
        {/* Brand mark — replace with actual SVG logo */}
        <View style={styles.logoMark}>
          <Text style={styles.logoInitial}>IF</Text>
        </View>

        <Text style={styles.brandName}>IndiaForums</Text>
        <Text style={styles.tagline}>India's Premier Fan Community</Text>
      </Animated.View>

      <ActivityIndicator
        style={styles.loader}
        color="#3558F0"
        size="small"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoArea: {
    alignItems: 'center',
    gap: 12,
  },
  logoMark: {
    width: 80,
    height: 80,
    borderRadius: 22,
    backgroundColor: '#3558F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    shadowColor: '#3558F0',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 12,
  },
  logoInitial: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  brandName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 14,
    fontWeight: '400',
    color: '#9E9E9E',
    letterSpacing: 0.2,
  },
  loader: {
    position: 'absolute',
    bottom: 60,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/features/onboarding/screens/SplashScreen.tsx
git commit -m "feat(onboarding): add animated SplashScreen with 2.2 s auto-transition"
```

---

## Task 6 — OnboardingScreen (Carousel)

**Files:**
- Create: `mobile/src/features/onboarding/screens/OnboardingScreen.tsx`

- [ ] **Step 1: Create the screen**

```tsx
// mobile/src/features/onboarding/screens/OnboardingScreen.tsx
import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  Dimensions,
  ViewToken,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OnboardingSlide } from '../components/OnboardingSlide';
import { PaginationDots } from '../components/PaginationDots';
import { ONBOARDING_SLIDES } from '../data/onboardingSlides';
import { OnboardingStackParamList } from '../../../navigation/types';
import { markOnboardingComplete } from '../../../store/onboardingStore';
import { OnboardingSlide as SlideType } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Props = NativeStackScreenProps<OnboardingStackParamList, 'Onboarding'>;

export default function OnboardingScreen({ navigation }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList<SlideType>>(null);
  const isLastSlide = currentIndex === ONBOARDING_SLIDES.length - 1;

  // Must be defined outside render (or in useRef) — RN crashes on inline fn
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const first = viewableItems[0];
      if (first?.isViewable && first.index !== null && first.index !== undefined) {
        setCurrentIndex(first.index);
      }
    },
  ).current;

  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 50,
  }).current;

  const handleNext = useCallback(() => {
    if (isLastSlide) {
      navigation.replace('GetStarted');
    } else {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
    }
  }, [currentIndex, isLastSlide, navigation]);

  const handleSkip = useCallback(() => {
    navigation.replace('GetStarted');
  }, [navigation]);

  return (
    <View style={styles.container}>
      {/* Skip button */}
      {!isLastSlide && (
        <Pressable
          style={styles.skipButton}
          onPress={handleSkip}
          hitSlop={12}
        >
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      )}

      {/* Slides carousel */}
      <FlatList
        ref={flatListRef}
        data={ONBOARDING_SLIDES}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <OnboardingSlide slide={item} />}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        style={styles.flatList}
        contentContainerStyle={styles.flatListContent}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
      />

      {/* Bottom control bar */}
      <View style={styles.bottomBar}>
        <PaginationDots
          count={ONBOARDING_SLIDES.length}
          activeIndex={currentIndex}
        />

        <Pressable
          style={({ pressed }) => [
            styles.nextButton,
            pressed && styles.nextButtonPressed,
          ]}
          onPress={handleNext}
        >
          <Text style={styles.nextButtonText}>
            {isLastSlide ? 'Get Started' : 'Next'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  skipButton: {
    alignSelf: 'flex-end',
    paddingHorizontal: 24,
    paddingVertical: 8,
    marginBottom: 8,
  },
  skipText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#9E9E9E',
  },
  flatList: {
    flex: 1,
  },
  flatListContent: {
    alignItems: 'center',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
    paddingTop: 24,
  },
  nextButton: {
    backgroundColor: '#3558F0',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
  },
  nextButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.1,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/features/onboarding/screens/OnboardingScreen.tsx
git commit -m "feat(onboarding): add horizontal carousel OnboardingScreen with skip/next"
```

---

## Task 7 — GetStartedScreen

**Files:**
- Create: `mobile/src/features/onboarding/screens/GetStartedScreen.tsx`

- [ ] **Step 1: Create the screen**

```tsx
// mobile/src/features/onboarding/screens/GetStartedScreen.tsx
import React, { useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  StatusBar,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from '../../../navigation/types';
import { markOnboardingComplete } from '../../../store/onboardingStore';

type Props = NativeStackScreenProps<OnboardingStackParamList, 'GetStarted'>;

export default function GetStartedScreen({ navigation }: Props) {
  const headerOpacity = useSharedValue(0);
  const headerY = useSharedValue(20);
  const buttonsOpacity = useSharedValue(0);
  const buttonsY = useSharedValue(24);

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerY.value }],
  }));
  const buttonsStyle = useAnimatedStyle(() => ({
    opacity: buttonsOpacity.value,
    transform: [{ translateY: buttonsY.value }],
  }));

  useEffect(() => {
    headerOpacity.value = withTiming(1, { duration: 600 });
    headerY.value = withTiming(0, { duration: 600 });
    buttonsOpacity.value = withDelay(200, withTiming(1, { duration: 600 }));
    buttonsY.value = withDelay(200, withTiming(0, { duration: 600 }));
  }, []);

  const handleCreateAccount = () => {
    markOnboardingComplete();
    // Navigate to register — replace with actual navigator call once AuthStack exists
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
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#3558F0" />

      {/* Header — logo + brand */}
      <Animated.View style={[styles.header, headerStyle]}>
        <View style={styles.logoMark}>
          <Text style={styles.logoInitial}>IF</Text>
        </View>
        <Text style={styles.brandName}>IndiaForums</Text>
        <Text style={styles.tagline}>
          {'Join millions of fans.\nYour community awaits.'}
        </Text>
      </Animated.View>

      {/* CTA buttons */}
      <Animated.View style={[styles.actions, buttonsStyle]}>
        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.primaryButtonPressed,
          ]}
          onPress={handleCreateAccount}
        >
          <Text style={styles.primaryButtonText}>Create Account</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.outlineButton,
            pressed && styles.outlineButtonPressed,
          ]}
          onPress={handleSignIn}
        >
          <Text style={styles.outlineButtonText}>Sign In</Text>
        </Pressable>

        <Pressable
          style={styles.ghostButton}
          onPress={handleGuest}
          hitSlop={8}
        >
          <Text style={styles.ghostButtonText}>Continue as Guest</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#3558F0',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 100 : 80,
    paddingBottom: Platform.OS === 'ios' ? 52 : 36,
    paddingHorizontal: 32,
  },
  header: {
    alignItems: 'center',
    gap: 16,
  },
  logoMark: {
    width: 80,
    height: 80,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  logoInitial: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -1,
  },
  brandName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 16,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.72)',
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 4,
  },
  actions: {
    width: '100%',
    gap: 12,
    alignItems: 'center',
  },
  primaryButton: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3558F0',
    letterSpacing: 0.1,
  },
  outlineButton: {
    width: '100%',
    paddingVertical: 15,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
  },
  outlineButtonPressed: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  outlineButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.1,
  },
  ghostButton: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  ghostButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.6)',
    textDecorationLine: 'underline',
    textDecorationColor: 'rgba(255,255,255,0.4)',
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/features/onboarding/screens/GetStartedScreen.tsx
git commit -m "feat(onboarding): add GetStartedScreen with animated entry + three CTAs"
```

---

## Task 8 — Navigation Types + OnboardingStack

**Files:**
- Create: `mobile/src/navigation/types.ts`
- Create: `mobile/src/navigation/OnboardingStack.tsx`

- [ ] **Step 1: Create navigation types**

```typescript
// mobile/src/navigation/types.ts
export type OnboardingStackParamList = {
  Splash: undefined;
  Onboarding: undefined;
  GetStarted: undefined;
};

export type RootStackParamList = {
  Onboarding: undefined;   // first-time users
  Guest: undefined;        // unauthenticated browsing
  Auth: {                  // sign in / register
    screen?: 'Login' | 'Register' | 'ForgotPassword';
  };
  Main: undefined;         // authenticated main tabs
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: { token: string };
  VerifyEmail: { email: string };
};
```

- [ ] **Step 2: Create OnboardingStack**

```tsx
// mobile/src/navigation/OnboardingStack.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { OnboardingStackParamList } from './types';
import SplashScreen from '../features/onboarding/screens/SplashScreen';
import OnboardingScreen from '../features/onboarding/screens/OnboardingScreen';
import GetStartedScreen from '../features/onboarding/screens/GetStartedScreen';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export default function OnboardingStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen
        name="Onboarding"
        component={OnboardingScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="GetStarted"
        component={GetStartedScreen}
        options={{ animation: 'slide_from_right' }}
      />
    </Stack.Navigator>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add mobile/src/navigation/types.ts mobile/src/navigation/OnboardingStack.tsx
git commit -m "feat(onboarding): add OnboardingStack navigator and nav types"
```

---

## Task 9 — RootNavigator

**Files:**
- Create: `mobile/src/navigation/RootNavigator.tsx`

- [ ] **Step 1: Create the root navigator**

```tsx
// mobile/src/navigation/RootNavigator.tsx
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { hasSeenOnboarding } from '../store/onboardingStore';
import OnboardingStack from './OnboardingStack';

// Placeholder stacks — replace with real implementations in later phases
import { View, Text, StyleSheet } from 'react-native';

function PlaceholderScreen({ label }: { label: string }) {
  return (
    <View style={placeholderStyles.container}>
      <Text style={placeholderStyles.text}>{label}</Text>
    </View>
  );
}
const GuestStackPlaceholder = () => (
  <PlaceholderScreen label="Guest Stack (TODO)" />
);
const AuthStackPlaceholder = () => (
  <PlaceholderScreen label="Auth Stack (TODO)" />
);
const MainTabsPlaceholder = () => (
  <PlaceholderScreen label="Main Tabs (TODO)" />
);
const placeholderStyles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F6F7' },
  text: { fontSize: 18, color: '#5F5F5F' },
});

const Root = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  // Synchronous MMKV read — determines initial route before first render
  const seenOnboarding = hasSeenOnboarding();

  // TODO: replace with Zustand authStore.isAuthenticated once auth is wired
  const isAuthenticated = false;

  const initialRoute: keyof RootStackParamList = seenOnboarding
    ? isAuthenticated
      ? 'Main'
      : 'Guest'
    : 'Onboarding';

  return (
    <Root.Navigator
      initialRouteName={initialRoute}
      screenOptions={{ headerShown: false, animation: 'fade' }}
    >
      <Root.Screen name="Onboarding" component={OnboardingStack} />
      <Root.Screen name="Guest" component={GuestStackPlaceholder} />
      <Root.Screen name="Auth" component={AuthStackPlaceholder} />
      <Root.Screen name="Main" component={MainTabsPlaceholder} />
    </Root.Navigator>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/navigation/RootNavigator.tsx
git commit -m "feat(onboarding): add RootNavigator with onboarding gate logic"
```

---

## Task 10 — App Entry Point

**Files:**
- Create: `mobile/App.tsx`

- [ ] **Step 1: Create App.tsx**

```tsx
// mobile/App.tsx
import 'react-native-gesture-handler'; // must be first import
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { StyleSheet } from 'react-native';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
```

- [ ] **Step 2: Commit**

```bash
git add mobile/App.tsx
git commit -m "feat(onboarding): wire App.tsx entry with providers and RootNavigator"
```

---

## Verification

After all tasks are complete, confirm these behaviors manually in the Expo simulator:

- [ ] App opens → native splash shows → custom SplashScreen fades in → transitions to Onboarding after ~2 s
- [ ] All 3 slides render with correct emoji, title, description
- [ ] Swiping horizontally between slides moves pagination dots (active dot widens)
- [ ] "Skip" button appears on slides 1 and 2, goes to GetStarted directly
- [ ] "Next" advances through slides; on slide 3 button reads "Get Started" and navigates to GetStartedScreen
- [ ] GetStartedScreen shows brand blue background, logo, tagline, three buttons with entry animations
- [ ] "Continue as Guest" marks onboarding complete + navigates to Guest stack
- [ ] Killing the app and re-opening skips straight to Guest stack (MMKV flag persists)
