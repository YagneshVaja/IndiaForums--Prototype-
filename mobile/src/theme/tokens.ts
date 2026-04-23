export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
  bg: string;
  surface: string;
  card: string;
  border: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  primary: string;
  primarySoft: string;
  danger: string;
  dangerSoft: string;
  scrim: string;
  hamburgerAccent: string;
}

export const lightColors: ThemeColors = {
  bg: '#F5F6F7',
  surface: '#F5F6F7',
  card: '#FFFFFF',
  border: '#E2E2E2',
  text: '#1A1A1A',
  textSecondary: '#555555',
  textTertiary: '#9E9E9E',
  primary: '#3558F0',
  primarySoft: '#EBF0FF',
  danger: '#C8001E',
  dangerSoft: '#FFF0F1',
  scrim: 'rgba(0,0,0,0.48)',
  hamburgerAccent: '#3558F0',
};

export const darkColors: ThemeColors = {
  bg: '#0E0F12',
  surface: '#17181C',
  card: '#1C1D22',
  border: '#2A2C32',
  text: '#F1F2F4',
  textSecondary: '#B5B8BF',
  textTertiary: '#7E828B',
  primary: '#6A88FF',
  primarySoft: '#242A45',
  danger: '#FF5A6E',
  dangerSoft: '#3A1F22',
  scrim: 'rgba(0,0,0,0.6)',
  hamburgerAccent: '#6A88FF',
};

export const themes: Record<ThemeMode, ThemeColors> = {
  light: lightColors,
  dark: darkColors,
};
