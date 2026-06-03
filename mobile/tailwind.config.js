/** @type {import('tailwindcss').Config} */
// Plain-JS tokens from the shared package (single source of truth for color
// VALUES). Required directly here so NativeWind has the values at build time.
const { tailwindColors } = require("@athletly/shared/tokens");

module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: tailwindColors,
      fontFamily: {
        sans: ['Inter', 'System'],
      },
    },
  },
  plugins: [],
};
