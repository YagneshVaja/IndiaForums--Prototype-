export type ThemeMode = 'light' | 'dark';

export type PaletteId = 'blue' | 'sunset' | 'forest' | 'purple' | 'crimson';

export const PALETTE_IDS: PaletteId[] = ['blue', 'sunset', 'forest', 'purple', 'crimson'];

export const PALETTE_META: Record<PaletteId, { label: string; swatch: string }> = {
  blue:    { label: 'Default Blue',  swatch: '#3558F0' },
  sunset:  { label: 'Sunset Orange', swatch: '#EA580C' },
  forest:  { label: 'Forest Green',  swatch: '#16A34A' },
  purple:  { label: 'Royal Purple',  swatch: '#7C3AED' },
  crimson: { label: 'Crimson',       swatch: '#DC2626' },
};

export interface ThemeColors {
  bg: string;
  surface: string;
  card: string;
  cardElevated: string;
  border: string;
  borderStrong: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  primary: string;
  primarySoft: string;
  onPrimary: string;
  danger: string;
  dangerSoft: string;
  dangerSoftBorder: string;
  success: string;
  successSoft: string;
  successSoftBorder: string;
  warning: string;
  warningSoft: string;
  warningSoftBorder: string;
  accent: string;
  accentSoft: string;
  scrim: string;
  hamburgerAccent: string;
  mediaBg: string;
  overlayText: string;
}

type PaletteDelta = Pick<
  ThemeColors,
  'primary' | 'primarySoft' | 'accent' | 'accentSoft' | 'hamburgerAccent'
>;

type NeutralBase = Omit<ThemeColors, keyof PaletteDelta>;

// Neutral + semantic base, shared across every palette. Picking a palette swaps
// only the brand-identity tokens (primary/primarySoft/accent/accentSoft/
// hamburgerAccent) — surfaces, text, borders, and success/warning/danger
// semantics stay stable so error states remain unambiguously red across all
// 5 themes.
const lightNeutralBase: NeutralBase = {
  bg:                '#FFFFFF',
  surface:           '#F4F4F5',
  card:              '#FFFFFF',
  cardElevated:      '#FFFFFF',
  border:            '#E2E2E2',
  borderStrong:      '#C9CDD3',
  text:              '#1A1A1A',
  textSecondary:     '#555555',
  textTertiary:      '#9E9E9E',
  onPrimary:         '#FFFFFF',
  danger:            '#C8001E',
  dangerSoft:        '#FFF0F1',
  dangerSoftBorder:  '#FCD4D4',
  success:           '#1F9254',
  successSoft:       '#E8F5EE',
  successSoftBorder: '#C6E6D5',
  warning:           '#B26A00',
  warningSoft:       '#FEF3C7',
  warningSoftBorder: '#FCD38A',
  scrim:             'rgba(0,0,0,0.48)',
  mediaBg:           '#000000',
  overlayText:       '#FFFFFF',
};

const darkNeutralBase: NeutralBase = {
  bg:                '#0E0F12',
  surface:           '#17181C',
  card:              '#1C1D22',
  cardElevated:      '#23252B',
  border:            '#2A2C32',
  borderStrong:      '#3A3D45',
  text:              '#F1F2F4',
  textSecondary:     '#B5B8BF',
  textTertiary:      '#7E828B',
  onPrimary:         '#FFFFFF',
  danger:            '#FF5A6E',
  dangerSoft:        '#3A1F22',
  dangerSoftBorder:  '#5A2A30',
  success:           '#43C281',
  successSoft:       '#163225',
  successSoftBorder: '#274838',
  warning:           '#F0B95C',
  warningSoft:       '#3A2F1A',
  warningSoftBorder: '#5A4825',
  scrim:             'rgba(0,0,0,0.6)',
  mediaBg:           '#000000',
  overlayText:       '#FFFFFF',
};

const paletteDeltas: Record<PaletteId, { light: PaletteDelta; dark: PaletteDelta }> = {
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

function buildPalette(id: PaletteId): Record<ThemeMode, ThemeColors> {
  return {
    light: { ...lightNeutralBase, ...paletteDeltas[id].light },
    dark:  { ...darkNeutralBase,  ...paletteDeltas[id].dark  },
  };
}

export const themes: Record<PaletteId, Record<ThemeMode, ThemeColors>> = {
  blue:    buildPalette('blue'),
  sunset:  buildPalette('sunset'),
  forest:  buildPalette('forest'),
  purple:  buildPalette('purple'),
  crimson: buildPalette('crimson'),
};

export const lightColors: ThemeColors = themes.blue.light;
export const darkColors:  ThemeColors = themes.blue.dark;
