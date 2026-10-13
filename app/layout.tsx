import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RUSH — PRE-SALE',
  description: 'La PRE-SALE ufficiale RUSH. LICK ME HARD. LICK ME RUSH.',
  icons: { icon: '/assets/logo.png' },
  robots: { index: true, follow: true }
};

export const viewport: Viewport = {
  themeColor: '#0A0A0A',
  width: 'device-width',
  initialScale: 1
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}
