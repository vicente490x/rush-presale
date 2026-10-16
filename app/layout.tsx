import type { Metadata, Viewport } from 'next';
import './globals.css';
import { appEnv } from '@/lib/config';

export const metadata: Metadata = {
  title: 'RUSH — PRE-SALE',
  description: 'La PRE-SALE ufficiale RUSH. LICK ME HARD. LICK ME RUSH.',
  icons: { icon: '/assets/logo.png' },
  robots: appEnv() === 'production' ? { index: true, follow: true } : { index: false, follow: false }
};

export const viewport: Viewport = {
  themeColor: '#0A0A0A',
  width: 'device-width',
  initialScale: 1
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const preview = appEnv() !== 'production';
  return (
    <html lang="it" data-scroll-behavior="smooth">
      <body>{preview && <div role="status" style={{ position: 'sticky', top: 0, zIndex: 1000, padding: '8px 12px', textAlign: 'center', background: '#a51616', color: '#fff', fontWeight: 800, letterSpacing: '.08em' }}>ANTEPRIMA — PAGAMENTI DI TEST</div>}{children}</body>
    </html>
  );
}
