# Mobile App Icon & Splash Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace placeholder app icons and splash screen with the official India Forums brand assets, wired through Expo's native splash mechanism with a fade transition into the app.

**Architecture:** A standalone PowerShell script (run once, kept in repo) crops the icon and lockup from the source `vertical-black.png` via pixel-bbox detection and writes the four required PNGs into `mobile/assets/`. `app.json` is updated from the legacy `splash` block to the modern `expo-splash-screen` plugin config. `App.tsx` adds `preventAutoHideAsync` + `hideAsync` on first layout for a clean fade. The in-app onboarding splash component swaps its placeholder for the real lockup image.

**Tech Stack:** Expo SDK 55, React Native 0.83, `expo-splash-screen`, PowerShell + System.Drawing for asset generation.

**Spec:** [docs/superpowers/specs/2026-05-05-mobile-app-icon-and-splash-design.md](../specs/2026-05-05-mobile-app-icon-and-splash-design.md)

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `mobile/scripts/generate-brand-assets.ps1` | Create | One-shot PowerShell script that crops & resizes the four assets from `vertical-black.png` |
| `mobile/assets/icon.png` | Overwrite | iOS app icon (1024×1024, transparent, icon glyph centered with ~10% padding) |
| `mobile/assets/adaptive-icon.png` | Overwrite | Android adaptive icon foreground (1024×1024, transparent, icon glyph with ~33% safe-zone padding) |
| `mobile/assets/splash-logo.png` | Create | Full vertical lockup, transparent bg, content-trimmed (used by native splash + onboarding splash) |
| `mobile/assets/favicon.png` | Overwrite | Web favicon (48×48, transparent, downscaled icon) |
| `mobile/app.json` | Modify | Remove legacy `splash` block; replace `"expo-splash-screen"` plugin string with config-block form |
| `mobile/App.tsx` | Modify | Add splash-control imports + `onLayout` hide handler |
| `mobile/src/features/onboarding/screens/SplashScreen.tsx` | Modify | Replace "IF" placeholder with real `<Image>`; remove now-redundant brandName/tagline Text and their styles |

---

## Pre-flight: Confirm source file is present

- [ ] **Step 1: Verify source file exists**

Run (PowerShell):
```powershell
Test-Path "C:\Users\Yagnesh\Downloads\vertical-black.png"
```
Expected: `True`

If `False`, stop and ask the user to confirm the path before proceeding.

---

## Task 1: Asset generation script

**Files:**
- Create: `mobile/scripts/generate-brand-assets.ps1`

This task creates a deterministic, re-runnable script. It does NOT yet write the asset files — that happens in Task 2 by running the script.

- [ ] **Step 1: Create the scripts directory if missing**

Run (PowerShell, from repo root):
```powershell
New-Item -ItemType Directory -Force -Path "mobile\scripts" | Out-Null
```
Expected: no output (silent on success).

- [ ] **Step 2: Write the asset generation script**

Create `mobile/scripts/generate-brand-assets.ps1` with this exact content:

```powershell
# Generates mobile/assets/{icon,adaptive-icon,splash-logo,favicon}.png from
# the brand source PNG via pixel-bbox detection. Re-runnable.
#
# Usage (from repo root):
#   powershell -ExecutionPolicy Bypass -File mobile/scripts/generate-brand-assets.ps1
#
# Defaults assume the source lives in the user's Downloads folder. Override
# with -Source if needed.

param(
    [string]$Source = "$env:USERPROFILE\Downloads\vertical-black.png",
    [string]$OutDir = (Join-Path $PSScriptRoot "..\assets")
)

Add-Type -AssemblyName System.Drawing

if (-not (Test-Path $Source)) {
    throw "Source file not found: $Source"
}

$OutDir = (Resolve-Path $OutDir).Path
Write-Host "Source: $Source"
Write-Host "Output: $OutDir"

# --- Load source into a Bitmap with raw pixel access ---
$srcImg = [System.Drawing.Image]::FromFile($Source)
$src = New-Object System.Drawing.Bitmap $srcImg
$srcImg.Dispose()

$w = $src.Width
$h = $src.Height
Write-Host "Source dimensions: ${w}x${h}"

$rect = New-Object System.Drawing.Rectangle 0, 0, $w, $h
$data = $src.LockBits(
    $rect,
    [System.Drawing.Imaging.ImageLockMode]::ReadOnly,
    [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
)
$stride = $data.Stride
$bytes = New-Object byte[] ($stride * $h)
[System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $bytes, 0, $bytes.Length)
$src.UnlockBits($data)

# --- Pixel classification helpers ---
# Pixel format is BGRA in memory. A pixel is "background" if alpha is 0
# OR R+G+B > 740 (near-white on the white-canvas source).
function Get-Pixel {
    param([int]$x, [int]$y)
    $i = ($y * $stride) + ($x * 4)
    return @{ B = $bytes[$i]; G = $bytes[$i + 1]; R = $bytes[$i + 2]; A = $bytes[$i + 3] }
}

function Is-Background {
    param($p)
    if ($p.A -eq 0) { return $true }
    return ($p.R + $p.G + $p.B) -gt 740
}

function Is-Chromatic {
    param($p)
    # The rainbow icon has saturated pixels; the wordmark is near-grayscale.
    $max = [Math]::Max($p.R, [Math]::Max($p.G, $p.B))
    $min = [Math]::Min($p.R, [Math]::Min($p.G, $p.B))
    return ($max - $min) -gt 25
}

# --- Find icon-vs-wordmark split row ---
# Scan top-to-bottom. Track when we leave the icon: the first row, after at
# least one chromatic row, where every non-background pixel is achromatic.
$inIcon = $false
$splitY = $h
for ($y = 0; $y -lt $h; $y++) {
    $hasChromatic = $false
    $hasContent = $false
    for ($x = 0; $x -lt $w; $x++) {
        $p = Get-Pixel $x $y
        if (Is-Background $p) { continue }
        $hasContent = $true
        if (Is-Chromatic $p) { $hasChromatic = $true; break }
    }
    if ($hasChromatic) { $inIcon = $true }
    elseif ($inIcon -and $hasContent -and -not $hasChromatic) {
        $splitY = $y
        break
    }
}
Write-Host "Icon-vs-wordmark split row: $splitY"

# --- Bounding-box helpers ---
function Get-BBox {
    param([int]$yStart, [int]$yEnd)
    $minX = $w; $minY = $h; $maxX = -1; $maxY = -1
    for ($y = $yStart; $y -lt $yEnd; $y++) {
        for ($x = 0; $x -lt $w; $x++) {
            $p = Get-Pixel $x $y
            if (Is-Background $p) { continue }
            if ($x -lt $minX) { $minX = $x }
            if ($y -lt $minY) { $minY = $y }
            if ($x -gt $maxX) { $maxX = $x }
            if ($y -gt $maxY) { $maxY = $y }
        }
    }
    if ($maxX -lt 0) { throw "Empty bbox between rows $yStart..$yEnd" }
    return @{ X = $minX; Y = $minY; W = ($maxX - $minX + 1); H = ($maxY - $minY + 1) }
}

$iconBBox = Get-BBox 0 $splitY
$lockupBBox = Get-BBox 0 $h
Write-Host "Icon bbox:   x=$($iconBBox.X) y=$($iconBBox.Y) w=$($iconBBox.W) h=$($iconBBox.H)"
Write-Host "Lockup bbox: x=$($lockupBBox.X) y=$($lockupBBox.Y) w=$($lockupBBox.W) h=$($lockupBBox.H)"

# --- Cropping helper ---
function Crop-Source {
    param($bbox)
    $r = New-Object System.Drawing.Rectangle $bbox.X, $bbox.Y, $bbox.W, $bbox.H
    return $src.Clone($r, $src.PixelFormat)
}

# --- Save helpers ---
function Save-Centered {
    param(
        [System.Drawing.Bitmap]$content,
        [int]$canvasSize,
        [double]$paddingPct,
        [string]$outPath
    )
    $canvas = New-Object System.Drawing.Bitmap $canvasSize, $canvasSize, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($canvas)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    $available = $canvasSize * (1.0 - 2.0 * $paddingPct)
    $scale = [Math]::Min($available / $content.Width, $available / $content.Height)
    $drawW = [int]($content.Width * $scale)
    $drawH = [int]($content.Height * $scale)
    $offX = [int](($canvasSize - $drawW) / 2)
    $offY = [int](($canvasSize - $drawH) / 2)
    $g.DrawImage($content, $offX, $offY, $drawW, $drawH)
    $g.Dispose()

    $canvas.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $canvas.Dispose()
    Write-Host "Wrote: $outPath"
}

function Save-Trimmed {
    param(
        [System.Drawing.Bitmap]$content,
        [int]$targetWidth,
        [string]$outPath
    )
    # Preserve aspect ratio; transparent background; no extra padding.
    $scale = $targetWidth / $content.Width
    $targetHeight = [int]($content.Height * $scale)
    $canvas = New-Object System.Drawing.Bitmap $targetWidth, $targetHeight, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($canvas)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.DrawImage($content, 0, 0, $targetWidth, $targetHeight)
    $g.Dispose()

    $canvas.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $canvas.Dispose()
    Write-Host "Wrote: $outPath"
}

# --- Generate outputs ---
$iconCrop = Crop-Source $iconBBox
$lockupCrop = Crop-Source $lockupBBox

Save-Centered -content $iconCrop -canvasSize 1024 -paddingPct 0.10 -outPath (Join-Path $OutDir "icon.png")
Save-Centered -content $iconCrop -canvasSize 1024 -paddingPct 0.33 -outPath (Join-Path $OutDir "adaptive-icon.png")
Save-Centered -content $iconCrop -canvasSize 48   -paddingPct 0.05 -outPath (Join-Path $OutDir "favicon.png")
Save-Trimmed  -content $lockupCrop -targetWidth 800 -outPath (Join-Path $OutDir "splash-logo.png")

$iconCrop.Dispose()
$lockupCrop.Dispose()
$src.Dispose()

Write-Host "`nDone. Generated 4 brand assets in $OutDir."
```

- [ ] **Step 3: Commit**

```powershell
git add mobile/scripts/generate-brand-assets.ps1
git commit -m "build(mobile): add brand asset generation script"
```

---

## Task 2: Generate the brand assets

**Files:**
- Overwrite: `mobile/assets/icon.png`
- Overwrite: `mobile/assets/adaptive-icon.png`
- Overwrite: `mobile/assets/favicon.png`
- Create: `mobile/assets/splash-logo.png`

- [ ] **Step 1: Run the script**

Run (PowerShell, from repo root):
```powershell
powershell -ExecutionPolicy Bypass -File mobile/scripts/generate-brand-assets.ps1
```
Expected output (last line): `Done. Generated 4 brand assets in <abs path>\mobile\assets.`

You should also see logged bbox coordinates and 4 `Wrote: ...` lines.

- [ ] **Step 2: Verify output dimensions**

Run (PowerShell):
```powershell
Add-Type -AssemblyName System.Drawing
foreach ($f in 'icon.png','adaptive-icon.png','favicon.png','splash-logo.png') {
    $p = "mobile\assets\$f"
    $img = [System.Drawing.Image]::FromFile((Resolve-Path $p))
    Write-Host "$f : $($img.Width)x$($img.Height)"
    $img.Dispose()
}
```
Expected:
```
icon.png : 1024x1024
adaptive-icon.png : 1024x1024
favicon.png : 48x48
splash-logo.png : 800x???    (height proportional, typically 600-1000px)
```

- [ ] **Step 3: Visual sanity check**

Open each generated PNG in an image viewer. Confirm:
- `icon.png` — rainbow speech bubble centered, ~10% gutter on all sides, transparent bg
- `adaptive-icon.png` — same icon but smaller (more padding) so it survives the Android safe zone mask
- `favicon.png` — tiny version of the icon, still recognisable
- `splash-logo.png` — full lockup (icon + "India Forums / tv movie digital"), tightly trimmed to content, transparent bg

If any look wrong, stop here and re-check the source file or script before continuing.

- [ ] **Step 4: Commit**

```powershell
git add mobile/assets/icon.png mobile/assets/adaptive-icon.png mobile/assets/favicon.png mobile/assets/splash-logo.png
git commit -m "feat(mobile): add India Forums brand assets (icon, adaptive icon, favicon, splash logo)"
```

---

## Task 3: Update `app.json` to use modern splash plugin config

**Files:**
- Modify: `mobile/app.json`

- [ ] **Step 1: Remove the legacy `splash` block**

Edit `mobile/app.json`. Find and delete these lines (currently lines 10-13):

```json
    "splash": {
      "backgroundColor": "#FFFFFF",
      "resizeMode": "contain"
    },
```

Make sure to also delete the trailing comma on the line above so JSON stays valid (the line after `"newArchEnabled": true,` should now be `"ios": {`).

- [ ] **Step 2: Replace the `"expo-splash-screen"` plugin string with config-block form**

In the `plugins` array, find:

```json
    "plugins": [
      "expo-splash-screen",
      "expo-secure-store",
```

Replace the bare `"expo-splash-screen",` line with the config block:

```json
    "plugins": [
      [
        "expo-splash-screen",
        {
          "image": "./assets/splash-logo.png",
          "imageWidth": 280,
          "backgroundColor": "#FFFFFF",
          "resizeMode": "contain"
        }
      ],
      "expo-secure-store",
```

- [ ] **Step 3: Validate JSON syntax**

Run (PowerShell, from repo root):
```powershell
Get-Content mobile/app.json -Raw | ConvertFrom-Json | Out-Null
```
Expected: no output (silent on success). If it errors, the JSON is malformed — re-check the previous edits.

- [ ] **Step 4: Confirm Android adaptive icon background unchanged**

Run (PowerShell):
```powershell
Get-Content mobile/app.json -Raw | ConvertFrom-Json | Select-Object -ExpandProperty expo | Select-Object -ExpandProperty android | Select-Object -ExpandProperty adaptiveIcon
```
Expected output includes:
```
backgroundColor : #3558F0
```

- [ ] **Step 5: Commit**

```powershell
git add mobile/app.json
git commit -m "build(mobile): wire splash through expo-splash-screen plugin config"
```

---

## Task 4: Add splash control to `App.tsx`

**Files:**
- Modify: `mobile/App.tsx`

- [ ] **Step 1: Add the `useCallback` import**

Edit `mobile/App.tsx`. Replace line 1:

```tsx
import React, { useMemo } from 'react';
```

with:

```tsx
import React, { useCallback, useMemo } from 'react';
```

- [ ] **Step 2: Add the splash-screen import and module-level setup**

After the existing imports (after line 9, the `useThemeStore` import), add:

```tsx
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({ duration: 400, fade: true });
```

- [ ] **Step 3: Add the `onLayout` handler and wire it to the root view**

Replace the entire `App` component (currently lines 59-69) with:

```tsx
export default function App() {
  const onLayoutReady = useCallback(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  return (
    <GestureHandlerRootView style={styles.root} onLayout={onLayoutReady}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemedNavigation />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
```

Note: line numbers above shift by +3 once Step 2 inserts new lines — refer to the component by name, not line number.

- [ ] **Step 4: Type-check**

Run (PowerShell, from `mobile/`):
```powershell
npm run tsc
```
Expected: no errors.

- [ ] **Step 5: Commit**

```powershell
git add mobile/App.tsx
git commit -m "feat(mobile): hide native splash on first layout with fade transition"
```

---

## Task 5: Update in-app onboarding splash to use the real logo

**Files:**
- Modify: `mobile/src/features/onboarding/screens/SplashScreen.tsx`

- [ ] **Step 1: Add the `Image` import**

In line 2, replace:

```tsx
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Animated,
} from 'react-native';
```

with:

```tsx
import {
  View,
  Image,
  ActivityIndicator,
  StyleSheet,
  Animated,
} from 'react-native';
```

(`Text` is no longer needed; `Image` replaces it.)

- [ ] **Step 2: Replace the placeholder logoArea contents with the real image**

Find the JSX block (currently lines 46-52):

```tsx
      <Animated.View style={[styles.logoArea, { opacity, transform: [{ scale }] }]}>
        <View style={styles.logoMark}>
          <Text style={styles.logoInitial}>IF</Text>
        </View>
        <Text style={styles.brandName}>IndiaForums</Text>
        <Text style={styles.tagline}>India's Premier Fan Community</Text>
      </Animated.View>
```

Replace with:

```tsx
      <Animated.View style={[styles.logoArea, { opacity, transform: [{ scale }] }]}>
        <Image
          source={require('../../../../assets/splash-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>
```

- [ ] **Step 3: Update the styles — remove old, add new**

In `makeStyles` (currently starting at line 59), make these changes:

Inside the `logoArea` style, remove the `gap: 12` line (the single `Image` doesn't need gap):

```tsx
    logoArea: {
      alignItems: 'center',
    },
```

Delete these style entries entirely:
- `logoMark: { ... }`
- `logoInitial: { ... }`
- `brandName: { ... }`
- `tagline: { ... }`

Add a new `logo` style entry (anywhere inside the `StyleSheet.create({...})` object — sensible placement is right after `logoArea`):

```tsx
    logo: {
      width: 240,
      height: 240,
    },
```

The remaining styles after this task should be: `container`, `logoArea`, `logo`, `loader`.

- [ ] **Step 4: Remove unused parameter `c` from `makeStyles` if no longer referenced**

Check whether `c` (the `ThemeColors` parameter) is still used. After the deletions in Step 3, only `container` should reference `c.bg`. If that's the only usage, **keep** `c` (it's still needed). If `c` becomes fully unused, remove the parameter and the `ThemeColors` import — but verify first; do not remove if still referenced.

Expected after this task: `c.bg` is still referenced inside `container`, so `c` stays.

- [ ] **Step 5: Type-check**

Run (PowerShell, from `mobile/`):
```powershell
npm run tsc
```
Expected: no errors. If you see "Text is declared but never used" or similar, you forgot a removal — re-check Step 1.

- [ ] **Step 6: Lint**

Run (PowerShell, from `mobile/`):
```powershell
npm run lint
```
Expected: no new lint errors in `SplashScreen.tsx`. (Pre-existing warnings elsewhere are OK.)

- [ ] **Step 7: Commit**

```powershell
git add mobile/src/features/onboarding/screens/SplashScreen.tsx
git commit -m "feat(mobile): use real India Forums lockup on onboarding splash"
```

---

## Task 6: Manual smoke test

This is a verification task — no code changes. Cannot be skipped before claiming the work complete.

- [ ] **Step 1: Start the Expo dev server**

Run (PowerShell, from `mobile/`):
```powershell
npm start
```
Wait for the QR code / dev menu.

- [ ] **Step 2: Launch on device or simulator**

- iOS: press `i` in the Expo terminal, OR scan the QR code with the Expo Go app
- Android: press `a` in the Expo terminal, OR scan the QR code

> **Note:** If the user is iterating in Expo Go (managed workflow), the native splash may show Expo's default splash for the dev build, NOT our configured splash — the configured splash only fully takes effect in a development build / production build. Confirm in the spec acceptance check via a dev-build (`npx expo run:ios` or `npx expo run:android`) if available.

- [ ] **Step 3: Verify acceptance criteria**

Visual checks:
- [ ] Cold launch shows white splash with the vertical India Forums lockup, then fades into the first app screen with no blank flash.
- [ ] iOS home screen icon shows the rainbow speech bubble glyph inside the rounded mask.
- [ ] Android home screen icon (adaptive) shows the rainbow speech bubble centered on brand-blue background, surviving circle/squircle/square mask shapes from the launcher.
- [ ] Onboarding flow's in-app splash shows the real logo lockup (not "IF"), with the existing fade+scale animation, and auto-advances to onboarding slides after ~2.2s.

If any check fails, do NOT mark the task complete. Diagnose and fix; re-run from the failing step.

- [ ] **Step 4: Confirm source files in `Downloads/` are untouched**

Run (PowerShell):
```powershell
Get-ChildItem "$env:USERPROFILE\Downloads\horizontal-black.png","$env:USERPROFILE\Downloads\horizontal-white.png","$env:USERPROFILE\Downloads\vertical-black.png","$env:USERPROFILE\Downloads\vertical-white.png" | Select-Object Name, Length
```
Expected: all 4 files listed with their original sizes.

---

## Self-review notes

- **Spec coverage**: every section in the design spec maps to a task — assets (Tasks 1-2), `app.json` (Task 3), `App.tsx` (Task 4), in-app splash (Task 5), acceptance (Task 6).
- **Out-of-scope items** (notification icon, dark splash, font loading) are intentionally not in the plan, per spec.
- **No placeholders** in any step — every code block is the real text to write.
- **Type consistency**: `splash-logo.png` is the file name used in the script output, in `app.json`, and in the `require(...)` call in `SplashScreen.tsx` — all matching.
