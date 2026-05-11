/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}', './features/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Postervia warm cream palette (2026-05 redesign — Dribbble-grade).
        // Source of truth: theme/tokens.ts.
        // Avoid: purple-blue, periwinkle, neon, harsh red, pure black,
        // cold gray, cold blue.
        primary: '#FF9F6E',           // peach orange — legacy brand
        'primary-soft': '#FFD2B8',
        'primary-light': '#FFE8D9',

        // Brand v2 — coral / peach gradient pair
        coral: '#F67673',
        peach: '#FFAA7A',
        'peach-light': '#FFC59A',
        'brand-deep': '#623928',

        'accent-apricot': '#FFC98B',
        'accent-butter': '#FFE6A7',
        'accent-sage': '#CFE3C1',
        'accent-gold': '#FFE0A8',
        lavender: '#A99BFF',
        'lavender-soft': '#C5B4FF',

        cream: '#FFF8F1',
        'bg-warm': '#FBEDE1',
        'bg-warm-deep': '#F8E4D2',
        surface: '#FFFFFF',
        'surface-warm': '#FFF1E4',
        card: '#FFFFFF',

        'text-main': '#241A16',       // warm dark brown — v2
        'text-brown': '#3B2A22',
        'text-secondary': '#81746D',
        'text-subtle': '#A89A92',

        'border-warm': '#F2DCCB',
        'line-soft': 'rgba(98,57,40,0.10)',

        success: '#8FBC7A',
        danger: '#F47C7C',
        'danger-soft': '#F47C7C',
        secondary: '#FFC98B',
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
        '4xl': '28px',
        '5xl': '32px',
      },
      fontFamily: {
        sans: ['System'],
      },
    },
  },
  plugins: [],
};
