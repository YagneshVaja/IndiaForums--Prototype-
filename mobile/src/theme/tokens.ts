export type ThemeMode = 'light' | 'dark';

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

export const lightColors: ThemeColors = {
  bg: '#FFFFFF',
  surface: '#F4F4F5',
  card: '#FFFFFF',
  cardElevated: '#FFFFFF',
  border: '#E2E2E2',
  borderStrong: '#C9CDD3',
  text: '#1A1A1A',
  textSecondary: '#555555',
  textTertiary: '#9E9E9E',
  primary: '#3558F0',
  primarySoft: '#EBF0FF',
  onPrimary: '#FFFFFF',
  danger: '#C8001E',
  dangerSoft: '#FFF0F1',
  dangerSoftBorder: '#FCD4D4',
  success: '#1F9254',
  successSoft: '#E8F5EE',
  successSoftBorder: '#C6E6D5',
  warning: '#B26A00',
  warningSoft: '#FEF3C7',
  warningSoftBorder: '#FCD38A',
  accent: '#EA580C',
  accentSoft: '#FFEDD5',
  scrim: 'rgba(0,0,0,0.48)',
  hamburgerAccent: '#3558F0',
  mediaBg: '#000000',
  overlayText: '#FFFFFF',
};

export const darkColors: ThemeColors = {
  bg: '#0E0F12',
  surface: '#17181C',
  card: '#1C1D22',
  cardElevated: '#23252B',
  border: '#2A2C32',
  borderStrong: '#3A3D45',
  text: '#F1F2F4',
  textSecondary: '#B5B8BF',
  textTertiary: '#7E828B',
  primary: '#6A88FF',
  primarySoft: '#242A45',
  onPrimary: '#FFFFFF',
  danger: '#FF5A6E',
  dangerSoft: '#3A1F22',
  dangerSoftBorder: '#5A2A30',
  success: '#43C281',
  successSoft: '#163225',
  successSoftBorder: '#274838',
  warning: '#F0B95C',
  warningSoft: '#3A2F1A',
  warningSoftBorder: '#5A4825',
  accent: '#F97316',
  accentSoft: '#3A2218',
  scrim: 'rgba(0,0,0,0.6)',
  hamburgerAccent: '#6A88FF',
  mediaBg: '#000000',
  overlayText: '#FFFFFF',
};

export const themes: Record<ThemeMode, ThemeColors> = {
  light: lightColors,
  dark: darkColors,
};
