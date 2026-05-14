# Mobile Color Palette Theming — Design

**Date:** 2026-05-14
**Branch:** feat/celebrity-profile-tier1 (theming work will likely land on a fresh branch)
**Scope:** mobile/

## Background

The mobile app already supports light/dark theming, wired through:

- `mobile/src/theme/tokens.ts` — `ThemeColors` shape + `lightColors` / `darkColors` token sets.
- `mobile/src/store/themeStore.ts` — Zustand store with MMKV persistence and a UI-thread transition overlay (`ThemeTransitionOverlay`) that masks the cascade.
- `mobile/src/theme/useThemedStyles.ts` — memoized per-render styles bound to the resolved palette.
- `SideMenu.tsx` — hosts the dark-mode toggle.

What is missing is **color-theme variety**. Today there is one brand identity (blue) in both light and dark. Popular modern apps (Slack, Telegram, Discord) ship named color palettes as a personalisation feature. This spec adds that capability.

## Goal

Let users pick from 5 named accent palettes. Each palette retunes the primary identity tokens while keeping neutrals and semantic colors stable. The palette preference is independent of light/dark — every palette works in both modes.

Non-goals (deferred to later work):

- System (auto-follow OS) mode.
- AMOLED true-black variant.
- Scheduled auto-switch.
- Per-screen reading themes (sepia for forum threads).
- Custom user-defined accent picker.

## Design philosophy

We follow the **Slack/Telegram named-palette** pattern, not the **Twitter accent-dot picker** pattern. Each palette is a designed identity (label + curated tokens) rather than a free-form color wheel, which keeps brand polish and avoids ugly user combinations.

## Palettes

Five palettes ship in v1. Each one resolves to a full `ThemeColors` set for both light and dark.

| ID | Label | Light primary | Dark primary |
|---|---|---|---|
| `blue` | Default Blue | `#3558F0` | `#6A88FF` |
| `sunset` | Sunset Orange | `#EA580C` | `#FB923C` |
| `forest` | Forest Green | `#16A34A` | `#34D399` |
| `purple` | Royal Purple | `#7C3AED` | `#A78BFA` |
| `crimson` | Crimson | `#DC2626` | `#F87171` |

Default palette is `blue` (matches current behavior — no visual change for existing installs).

## Token strategy

Only **5 tokens** change per palette. Everything else is shared between palettes.

| Per-palette (5 swap) | Neutral / Semantic (shared across all 5) |
|---|---|
| `primary` | `bg`, `surface`, `card`, `cardElevated` |
| `primarySoft` | `border`, `borderStrong` |
| `accent` | `text`, `textSecondary`, `textTertiary` |
| `accentSoft` | `success`, `successSoft`, `successSoftBorder` |
| `hamburgerAccent` | `warning`, `warningSoft`, `warningSoftBorder` |
| | `danger`, `dangerSoft`, `dangerSoftBorder` |
| | `scrim`, `mediaBg`, `overlayText`, `onPrimary` |

Rationale:

- **Semantic colors (success/warning/danger) stay green/amber/red in every palette.** A user picking "Crimson" must still see a distinct red error toast. This is the same rule Slack follows.
- **`accent` is the secondary identity color.** Each palette uses the opposite end of the wheel for `accent` so the secondary is visible against the primary (warm palettes get cool accents and vice versa).
- **Dark-mode primaries are lifted ~10–15% lighter** than their light-mode counterparts to maintain WCAG contrast against dark surfaces. This mirrors the existing `darkColors.primary` convention.

## Data model

```ts
// tokens.ts

export type ThemeMode = 'light' | 'dark';
export type PaletteId = 'blue' | 'sunset' | 'forest' | 'purple' | 'crimson';

export const PALETTE_IDS: PaletteId[] =
  ['blue', 'sunset', 'forest', 'purple', 'crimson'];

export const PALETTE_META: Record<PaletteId, { label: string; swatch: string }> = {
  blue:    { label: 'Default Blue',  swatch: '#3558F0' },
  sunset:  { label: 'Sunset Orange', swatch: '#EA580C' },
  forest:  { label: 'Forest Green',  swatch: '#16A34A' },
  purple:  { label: 'Royal Purple',  swatch: '#7C3AED' },
  crimson: { label: 'Crimson',       swatch: '#DC2626' },
};

type PaletteDelta = Pick<
  ThemeColors,
  'primary' | 'primarySoft' | 'accent' | 'accentSoft' | 'hamburgerAccent'
>;

// 5-key delta per palette, per mode
const palettes: Record<PaletteId, { light: PaletteDelta; dark: PaletteDelta }> = { ... };

// Neutral + semantic base, shared across all palettes
const lightNeutralBase: Omit<ThemeColors, keyof PaletteDelta> = { ... };
const darkNeutralBase:  Omit<ThemeColors, keyof PaletteDelta> = { ... };

// Resolved themes map
export const themes: Record<PaletteId, Record<ThemeMode, ThemeColors>>;
//   usage: themes[palette][mode] -> ThemeColors
```

`ThemeColors` shape is unchanged — every existing consumer (`useThemeStore(s => s.colors)`) continues to work without modification.

### Per-palette delta values

```ts
const palettes: Record<PaletteId, { light: PaletteDelta; dark: PaletteDelta }> = {
  blue: {
    light: { primary: '#3558F0', primarySoft: '#EBF0FF', accent: '#EA580C', accentSoft: '#FFEDD5', hamburgerAccent: '#3558F0' },
    dark:  { primary: '#6A88FF', primarySoft: '#242A45', accent: '#F97316', accentSoft: '#3A2218', hamburgerAccent: '#6A88FF' },
  },
  sunset: {
    light: { primary: '#EA580C', primarySoft: '#FFEDD5', accent: '#3558F0', accentSoft: '#EBF0FF', hamburgerAccent: '#EA580C' },
    dark:  { primary: '#FB923C', primarySoft: '#3A2218', accent: '#6A88FF', accentSoft: '#242A45', hamburgerAccent: '#FB923C' },
  },
  forest: {
    light: { primary: '#16A34A', primarySoft: '#DCFCE7', accent: '#EA580C', accentSoft: '#FFEDD5', hamburgerAccent: '#16A34A' },
    dark:  { primary: '#34D399', primarySoft: '#13301F', accent: '#F97316', accentSoft: '#3A2218', hamburgerAccent: '#34D399' },
  },
  purple: {
    light: { primary: '#7C3AED', primarySoft: '#EDE4FF', accent: '#EA580C', accentSoft: '#FFEDD5', hamburgerAccent: '#7C3AED' },
    dark:  { primary: '#A78BFA', primarySoft: '#2B1F44', accent: '#F97316', accentSoft: '#3A2218', hamburgerAccent: '#A78BFA' },
  },
  crimson: {
    light: { primary: '#DC2626', primarySoft: '#FEE2E2', accent: '#3558F0', accentSoft: '#EBF0FF', hamburgerAccent: '#DC2626' },
    dark:  { primary: '#F87171', primarySoft: '#3A1F22', accent: '#6A88FF', accentSoft: '#242A45', hamburgerAccent: '#F87171' },
  },
};
```

### Neutral base values

The neutral bases are the existing `lightColors` / `darkColors` minus the 5 per-palette keys. No values change — they are extracted as-is.

## Storage

MMKV keys (under the existing `theme` MMKV instance):

| Key | Type | Default | Notes |
|---|---|---|---|
| `theme_mode` | `'light' \| 'dark'` | `'light'` | Unchanged from today. |
| `theme_palette` | `PaletteId` | `'blue'` | New. Unknown / legacy values fall back to `'blue'`. |

Loaders validate against `PALETTE_IDS` so a corrupt MMKV value cannot brick the app.

## Store

`themeStore.ts` extended shape:

```ts
interface ThemeState {
  mode: ThemeMode;
  palette: PaletteId;
  colors: ThemeColors;            // resolved = themes[palette][mode]
  setMode: (mode: ThemeMode) => void;
  setPalette: (palette: PaletteId) => void;
  toggle: () => void;             // toggles mode only — behavior unchanged
}
```

`setPalette` reuses the existing `triggerThemeTransition(get().colors.bg)` overlay before flipping `palette` + `colors`. The cascade is masked the same way as light/dark today, so palette swaps look as polished as mode swaps.

`setMode` and `toggle` are unchanged except that the resolved colors now read from `themes[palette][mode]` instead of `themes[mode]`.

## Settings UI

Two surfaces:

1. **`SideMenu.tsx`** — keep the existing light/dark toggle exactly as it is. **No palette picker here** — adding 5 swatches to a side menu hurts the quick-toggle UX. Quick access remains for the more frequent action (mode flip).

2. **`MySpaceSettingsScreen.tsx`** — new "Appearance" section at the top of the screen with two rows:

   ```
   APPEARANCE
   ┌─────────────────────────────────────────────────┐
   │ 🌗 Theme                              Light  ❯ │   opens light/dark sheet
   ├─────────────────────────────────────────────────┤
   │ 🎨 Accent color                  ●  Blue    ❯ │   opens palette sheet
   └─────────────────────────────────────────────────┘
   ```

   The "Accent color" row's trailing widget shows a filled circle in the current palette's swatch + the palette label.

3. **New file** `mobile/src/features/myspace/components/PalettePickerSheet.tsx` — bottom sheet following the same idiom as `ReportsForumPickerSheet` already imported in this screen. Layout:

   ```
   Pick an accent
   ⬤  Default Blue          ✓
   ⬤  Sunset Orange
   ⬤  Forest Green
   ⬤  Royal Purple
   ⬤  Crimson
   ```

   Behavior on tap: `setPalette(id)` → transition overlay masks the cascade → sheet stays open for ~250ms (so the user sees the swap reflected behind the partially-visible sheet) → auto-dismisses.

4. **Theme row behavior.** v1 ships the "Theme" row as a tap target that calls `useThemeStore.getState().toggle()` directly (same behavior as the SideMenu switch). The trailing label shows "Light" / "Dark" and updates live. A full mode picker sheet (System / Light / Dark) is deferred to the future "system auto-follow" work — it would be wasted code now when there are only two values to choose from.

## File touch list

```
mobile/src/theme/tokens.ts                                   [edit]  — new types, palette deltas, themes map
mobile/src/store/themeStore.ts                               [edit]  — palette field, setPalette, MMKV key
mobile/src/features/myspace/screens/MySpaceSettingsScreen.tsx [edit]  — Appearance section
mobile/src/features/myspace/components/PalettePickerSheet.tsx [new]   — bottom sheet
```

No other files change. Every consumer that reads `useThemeStore(s => s.colors)` picks up palette changes automatically.

## Risks and trade-offs

- **`tailwind.config.js` is static.** The Tailwind palette in `tailwind.config.js` will continue to reflect the default blue. Any class like `bg-brand` is therefore not palette-aware. This is acceptable because the codebase already prefers dynamic `colors` from the store via `useThemedStyles` for theme-aware surfaces; static Tailwind classes are mostly used for layout. We do **not** plan to dynamically rewrite Tailwind tokens.

- **Brand-color in `<BrandSplash />` / native splash.** The launch splash is static and shows the blue brand. It will not adapt to the user's chosen palette until app launch completes and the store hydrates. Acceptable for v1 — splash is a brand surface, not a personalisation surface.

- **Server-side avatar/badge colors** that reference brand blue remain blue. Out of scope.

- **Migration.** Existing users with `theme_mode` set but no `theme_palette` simply get `'blue'` (visual identity unchanged). No migration code needed.

## Testing

- TypeScript: `npm run tsc` must pass with the new `PaletteId` and extended store.
- Manual QA per palette × per mode (10 combinations) on representative screens: Home, Forums list, Post detail, MySpace, Notifications, Search.
- Verify semantic colors (success/warning/danger toasts) stay green/amber/red in all 10 combinations.
- Verify transition overlay still masks the cascade for both `setMode` and `setPalette`.
- Verify MMKV persistence: kill app, relaunch, palette restored.
- Verify corrupt MMKV value (`theme_palette` set to garbage) falls back to `'blue'` without crashing.

## Out of scope

- System auto-follow (OS appearance).
- AMOLED true-black variant.
- Scheduled mode switching.
- Reading themes for forum thread reader.
- Custom user-defined accent picker.
- Dynamic Tailwind config rewrite.
- Native splash personalisation.

Any of these can be a follow-up spec.
