import type { Metadata, Viewport } from 'next';
import './globals.css';
import { OriginMark } from '@/components/OriginMark';

export const metadata: Metadata = {
  title: 'CozyAI',
  description: 'Momcozy CozyAI demo — smart mom & baby care, daily logging, and AI guidance.',
  applicationName: 'CozyAI',
  appleWebApp: {
    capable: true,
    title: 'CozyAI',
    statusBarStyle: 'default',
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#F9F7F5',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-build="CZ-275C06BC-347D">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body>
        {children}
        <OriginMark />
      </body>
    </html>
  );
}
