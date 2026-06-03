// SPDX-License-Identifier: MIT
import type { MetadataRoute } from 'next';
import { Colors } from '@athletly/shared';

// PWA web app manifest (App Router metadata route -> /manifest.webmanifest).
// Brand colors come from the shared design tokens (single source of truth).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Athletly',
    short_name: 'Athletly',
    description: 'Your coach. Your data. Your plan.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: Colors.background,
    theme_color: Colors.primary,
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
