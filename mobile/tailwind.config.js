/** @type {import('tailwindcss').Config} */
module.exports = {
  // Scan all source files for class names
  content: [
    './App.{tsx,jsx,ts,js}',
    './src/**/*.{tsx,jsx,ts,js}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand:       '#3558F0',
        'brand-light': '#EBF0FF',
        bg:          '#F5F6F7',
        card:        '#FFFFFF',
        dark:        '#0D0D0D',
        text:        '#1A1A1A',
        text2:       '#5F5F5F',
        text3:       '#9E9E9E',
        border:      '#E2E2E2',
        red:         '#C8001E',
        green:       '#1A7A48',
        amber:       '#D97706',
        live:        '#16A34A',
      },
      fontFamily: {
        sans:     ['Roboto_400Regular', 'System'],
        medium:   ['Roboto_500Medium', 'System'],
        bold:     ['Roboto_700Bold', 'System'],
        headline: ['RobotoCondensed_700Bold', 'System'],
      },
    },
  },
  plugins: [],
};
