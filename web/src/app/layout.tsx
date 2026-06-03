// SPDX-License-Identifier: MIT
import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { I18nProvider } from '@/i18n';
import { AppFrame } from '@/components/ui/AppFrame';
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration';

const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Athletly',
  description: 'Your coach. Your data. Your plan.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Athletly',
    statusBarStyle: 'default',
  },
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#2563EB',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        {/* The app is a 1:1 port of a phone app, so it renders inside a centered,
            phone-width column on the web. AppFrame provides that shell.
            I18nProvider lives OUTSIDE auth so the language works in demo mode too;
            it updates <html lang> client-side once the locale is resolved. */}
        <I18nProvider>
          <AppFrame>
            <Providers>{children}</Providers>
          </AppFrame>
        </I18nProvider>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
