# Mobile App Icon & Splash Screen — Design Spec

**Date:** 2026-05-05
**Status:** Approved
**Owner:** Mobile

## Summary

Replace the existing placeholder app icons and splash screen with the official India Forums brand assets. Use Expo's native splash mechanism (`expo-splash-screen` plugin) with a fade-out into the app for an instant, polished boot experience. Also update the in-app onboarding splash component to use the real logo instead of its current "IF" placeholder.

## Goals

- Real brand logo on iOS & Android home screens
- Real brand splash screen at app launch (native, instant — no JS warmup flash)
- Smooth fade from native splash into the first app frame
- Consistent logo treatment between native splash and in-app onboarding splash

## Non-Goals

- Notification icon update (Android requires a separate monochrome white silhouette — out of scope)
- Custom splash animations beyond the built-in fade (Lottie, motion, etc.)
- Font loading optimisation (no `useFonts` is wired up today; addressing it is a separate task)
- Web favicon polish beyond a plain downscale
- Re-export of source vector assets (we work from the provided 1080×1350 PNGs)

## Source Assets

Provided by user at `C:\Users\Yagnesh\Downloads\`:

| File | Dimensions | Use |
|---|---|---|
| `vertical-black.png` | 1080×1350 | Primary source — icon glyph + "India Forums / tv movie digital" wordmark, black text on white |
| `vertical-white.png` | 1080×1350 | Reserved (white text on dark, not used in this round) |
| `horizontal-black.png` | 1080×1350 | Reserved (not used in this round) |
| `horizontal-white.png` | 1080×1350 | Reserved (not used in this round) |

The **icon glyph** (rainbow speech bubble) appears in the upper portion of `vertical-black.png`; the **wordmark** appears immediately below. Both will be extracted from this single source via pixel-bbox detection.

## Generated Assets

All outputs land in `mobile/assets/` and overwrite the existing placeholder files of the same names where applicable.

| Output file | Dimensions | Background | Source crop | Purpose |
|---|---|---|---|---|
| `icon.png` | 1024×1024 | transparent | icon glyph, ~10% padding inside the 1024 canvas | iOS app icon (system applies rounded mask) |
| `adaptive-icon.png` | 1024×1024 | transparent | icon glyph, ~33% padding (Android safe zone) | Android adaptive icon foreground; pairs with brand-blue background set in `app.json` |
| `splash-logo.png` | proportional, ~800px wide, transparent | full vertical lockup (icon + wordmark), trimmed to content bbox | Native splash image + in-app onboarding splash image |
| `favicon.png` | 48×48 | transparent | downscaled icon | Web only |

`notification-icon.png` is **not** regenerated — kept as-is.

### Bounding-box detection (icon vs wordmark separation)

Done via PowerShell + System.Drawing, no extra tooling:

1. Load `vertical-black.png` (1080×1350).
2. Scan all pixels, recording the bbox of every non-near-white pixel (treat alpha=0 OR R+G+B > 740 as background).
3. **Icon bbox**: limit the scan to rows where pixel saturation is high (rainbow icon has chromatic pixels; the wordmark below is achromatic / near-grayscale). The boundary between icon and wordmark is the first row, scanning top-to-bottom, where every non-background pixel is achromatic (max(R,G,B) − min(R,G,B) < 25).
4. **Lockup bbox**: full non-background bbox over the entire image (icon + wordmark together).
5. Crop to each bbox, then composite onto the target canvas with the specified padding, then save as PNG.

This keeps the script deterministic and avoids hardcoded pixel coordinates that could drift if the source changes.

## `app.json` Changes

**Remove** the legacy top-level `splash` block:

```json
"splash": {
  "backgroundColor": "#FFFFFF",
  "resizeMode": "contain"
}
```

**Replace** the existing `"expo-splash-screen"` string entry in `plugins` with a config-block form:

```json
[
  "expo-splash-screen",
  {
    "image": "./assets/splash-logo.png",
    "imageWidth": 280,
    "backgroundColor": "#FFFFFF",
    "resizeMode": "contain"
  }
]
```

`imageWidth: 280` renders the lockup at a comfortable size on a typical phone canvas — wide enough to read the wordmark, narrow enough to leave breathing room.

**Keep** `android.adaptiveIcon.backgroundColor: "#3558F0"` (brand blue). The rainbow icon's white interior counter-form needs a colored background to read on the home screen; white-on-white would lose the silhouette.

**Keep** `icon: "./assets/icon.png"` — the file is overwritten with the new asset, the path is stable.

**Keep** `expo-notifications` plugin block including `icon: "./assets/notification-icon.png"` — out of scope.

## App.tsx Changes

Add splash-control imports and effects:

```tsx
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({ duration: 400, fade: true });
```

Inside `App`, wrap the root `GestureHandlerRootView` so splash hides on first layout:

```tsx
const onLayoutReady = useCallback(() => {
  SplashScreen.hideAsync().catch(() => {});
}, []);

return (
  <GestureHandlerRootView style={styles.root} onLayout={onLayoutReady}>
    {/* ...existing tree... */}
  </GestureHandlerRootView>
);
```

The 400ms fade (`setOptions`) gives a perceptible but quick transition. `onLayout` fires once the first frame is laid out, which is the right moment — before that, hiding the splash would expose blank pixels.

The `.catch(() => {})` on both calls is intentional: if the splash module is unavailable (e.g., web), we don't want to crash startup.

## In-App Onboarding Splash Changes

File: `mobile/src/features/onboarding/screens/SplashScreen.tsx`

Current: a blue rounded square containing the text "IF", followed by `<Text>IndiaForums</Text>` and a tagline. Replace the placeholder lockup with the real logo image — keep the existing `Animated` opacity + scale-in entrance and the 2.2s timer that navigates to `OnboardingSlides`.

Replacement structure inside `<Animated.View style={styles.logoArea}>`:

```tsx
<Image
  source={require('../../../../assets/splash-logo.png')}
  style={styles.logo}
  resizeMode="contain"
/>
```

Remove these now-redundant pieces:
- The `logoMark` View and its `logoInitial` Text ("IF")
- The `brandName` Text ("IndiaForums") — already in the image
- The `tagline` Text ("India's Premier Fan Community") — replaced by the lockup's "tv movie digital" tagline

Keep:
- The `ActivityIndicator` at the bottom
- The fade-in / scale-in animation
- The 2.2s navigation timer
- Theming via `useThemeStore` (the screen background still pulls from `c.bg`)

New `logo` style: `{ width: 240, height: 240 }` with `resizeMode="contain"` — matches the visual weight of the previous mark+text combination.

The associated style entries (`logoMark`, `logoInitial`, `brandName`, `tagline`) get removed from `makeStyles`.

## Out of Scope / Follow-ups

- **Notification icon** — author a 96×96 monochrome white silhouette PNG of the icon glyph for Android push notifications. The current `notification-icon.png` stays in place.
- **Dark-mode splash** — `expo-splash-screen` supports a `dark` variant. We have `vertical-white.png` available for this; deferred until we ship a dark-aware native splash (the in-app onboarding splash already uses themed `c.bg`).
- **Higher-res icon source** — current crop is upscaled from a ~400px region of a 1080px PNG; acceptable but not crisp at 1024². If a vector source becomes available, regenerate `icon.png` and `adaptive-icon.png` only — no config changes needed.
- **Font loading via `useFonts`** — `@expo-google-fonts/roboto` is in `package.json` but never loaded; this likely affects rendering. Separate ticket.

## Acceptance Criteria

- [ ] Cold-launching the app shows the white splash with the vertical India Forums lockup, then fades into the first app screen with no blank flash.
- [ ] Home screen icon on iOS shows the rainbow speech bubble glyph, properly inset within the rounded mask.
- [ ] Home screen icon on Android (adaptive) shows the rainbow speech bubble glyph centered on a brand-blue background, surviving circle / squircle / square mask shapes from the system.
- [ ] The in-app onboarding splash shows the real logo lockup (no "IF" placeholder), with the existing fade + scale animation intact, and still auto-advances to onboarding slides after ~2.2s.
- [ ] No TypeScript errors (`npm run tsc` from `mobile/`).
- [ ] No new lint errors (`npm run lint` from `mobile/`).
- [ ] Source files in `Downloads/` remain untouched.
