/** @type {import('tailwindcss').Config} */

// Jewellery palette. The panels (admin / seller / super admin / courier) were
// built with Tailwind's blue / indigo / violet / slate classes; remapping those
// scales here re-skins every panel in gold + wine + warm espresso without
// touching hundreds of class names.
const gold = {
  50: '#fbf7ef', 100: '#f5ecd9', 200: '#ebd8b2', 300: '#ddbf86', 400: '#cea665',
  500: '#b98f4f', 600: '#a07637', 700: '#835e2b', 800: '#6b4c26', 900: '#573f22', 950: '#312211',
};
const wine = {
  50: '#fcf3f6', 100: '#f8e4eb', 200: '#f0c8d6', 300: '#e3a0b7', 400: '#cf6d90',
  500: '#b4466d', 600: '#962f55', 700: '#7a1f45', 800: '#660032', 900: '#520529', 950: '#310015',
};
const espresso = {
  50: '#faf8f4', 100: '#f3efe7', 200: '#e6dfd2', 300: '#d1c6b3', 400: '#a89a83',
  500: '#7e705b', 600: '#5f5343', 700: '#483e32', 800: '#2f2820', 900: '#211b15', 950: '#15110d',
};

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        blue: gold,
        indigo: gold,
        sky: gold,
        violet: wine,
        purple: wine,
        slate: espresso,
        wine,
        primary: gold,
        gold: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
        accent: {
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
        },
      },
      fontFamily: {
        sans: ['Poppins', 'Inter', 'Segoe UI', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        shimmer: 'shimmer 2s infinite',
        marquee: 'marquee 12s linear infinite',
        'card-glow': 'cardGlowPulse 4s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { transform: 'translateY(20px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        slideInRight: { '0%': { transform: 'translateX(100%)' }, '100%': { transform: 'translateX(0)' } },
        shimmer: { '0%': { backgroundPosition: '-200px 0' }, '100%': { backgroundPosition: 'calc(200px + 100%) 0' } },
        marquee: { '0%': { transform: 'translateX(0)' }, '100%': { transform: 'translateX(-50%)' } },
        cardGlowPulse: {
          '0%, 100%': { boxShadow: '0 0 0px rgba(185,143,79,0)', borderColor: 'rgba(255,255,255,0.1)' },
          '50%': { boxShadow: '0 0 26px rgba(185,143,79,0.22)', borderColor: 'rgba(206,166,101,0.4)' },
        },
      },
    },
  },
  plugins: [],
};