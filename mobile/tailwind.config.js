/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: '#F0F2F5',
        surface: '#FFFFFF',
        'surface-nested': '#F5F6F8',
        'surface-muted': '#E8EBF0',
        primary: '#2563EB',
        'primary-dark': '#1D4ED8',
        'primary-light': '#DBEAFE',
        'primary-ultra-light': '#EFF6FF',
        'text-primary': '#0F172A',
        'text-secondary': '#475569',
        'text-muted': '#94A3B8',
        divider: '#E2E8F0',
        success: '#22C55E',
        'success-light': '#DCFCE7',
        warning: '#F59E0B',
        'warning-light': '#FEF3C7',
        error: '#EF4444',
        'error-light': '#FEE2E2',
        sport: {
          running: '#3B82F6',
          cycling: '#A855F7',
          swimming: '#06B6D4',
          gym: '#F59E0B',
          rest: '#6B7280',
        },
      },
      fontFamily: {
        sans: ['Inter', 'System'],
      },
    },
  },
  plugins: [],
};
