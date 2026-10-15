import type { Metadata, Viewport } from 'next';
import './globals.css';

const previewDeployment = process.env.APP_ENV === 'preview' || process.env.VERCEL_ENV === 'preview';

export const metadata: Metadata = {
  title: 'RUSH — PRE-SALE',
  description: 'La PRE-SALE ufficiale RUSH. LICK ME HARD. LICK ME RUSH.',
  icons: { icon: '/assets/logo.png' },
  robots: previewDeployment ? { index: false, follow: false, noarchive: true } : { index: true, follow: true }
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
