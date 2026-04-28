/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}', './features/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#5B67CA',    // Duolingo-style indigo
        secondary: '#FF9500',  // warm orange accent
        success: '#58CC02',    // Duolingo green
        danger: '#FF4B4B',
        surface: '#F7F7F7',
        card: '#FFFFFF',
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
      },
      fontFamily: {
        sans: ['System'],
      },
    },
  },
  plugins: [],
};
