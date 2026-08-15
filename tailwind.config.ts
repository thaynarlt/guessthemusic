import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#0a0713',
          900: '#120c22',
          800: '#1b1332',
          700: '#271b48',
          600: '#3a2a63',
        },
        grape: {
          400: '#b78bff',
          500: '#9a5cff',
          600: '#7c3aed',
        },
        neon: {
          400: '#5cffb1',
          500: '#22e58a',
          600: '#0fbf6f',
        },
      },
      fontFamily: {
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%': { transform: 'translateX(-6px)' },
          '40%': { transform: 'translateX(6px)' },
          '60%': { transform: 'translateX(-4px)' },
          '80%': { transform: 'translateX(4px)' },
        },
        pulseRing: {
          '0%': { transform: 'scale(1)', opacity: '0.55' },
          '100%': { transform: 'scale(1.5)', opacity: '0' },
        },
        popIn: {
          from: { transform: 'scale(0.96)', opacity: '0' },
          to: { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        shake: 'shake 320ms ease-in-out',
        'pulse-ring': 'pulseRing 1.4s ease-out infinite',
        'pop-in': 'popIn 160ms ease-out',
      },
    },
  },
  plugins: [],
};

export default config;
