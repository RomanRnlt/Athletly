import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { AppFrame } from '@/components/ui/AppFrame';

const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Athletly',
  description: 'Dein Coach. Deine Daten. Dein Plan.',
};

export const viewport: Viewport = {
  themeColor: '#2563EB',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={inter.variable}>
      <body>
        {/* The app is a 1:1 port of a phone app, so it renders inside a centered,
            phone-width column on the web. AppFrame provides that shell. */}
        <AppFrame>
          <Providers>{children}</Providers>
        </AppFrame>
      </body>
    </html>
  );
}
