import type { Config } from 'tailwindcss';
// Plain-JS tokens from the shared package (single source of truth for color
// VALUES). Same class names as mobile (bg-primary, text-text-primary, ...).
import { tailwindColors } from '@athletly/shared/tokens';

const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: tailwindColors,
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
