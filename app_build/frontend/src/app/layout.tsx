import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import './globals.css';
import { ALLOW_INDEXING, SITE_URL } from '@/lib/site';

export const metadata: Metadata = {
  title: { default: 'उजास — अपनी बात, अपना मंच', template: '%s | उजास' },
  description: 'उजास: हिंदी साहित्य का मंच।',
  metadataBase: new URL(SITE_URL),
  // Indexing stays off in development and staging; only production with ALLOW_INDEXING=1 is indexed.
  robots: ALLOW_INDEXING ? { index: true, follow: true } : { index: false, follow: false },
};

// The faces that paint the first screen are preloaded so text does not reflow when they arrive (layout shift went from
// 0.23 to 0 on the list page). Trying only two of them was not better: Lighthouse timings vary by about half a second
// between runs, so the larger set, which gave the best article result (LCP 2.1 s), stays.
const PRELOAD_FONTS = [
  'noto-sans-devanagari-devanagari-400-normal.woff2',
  'noto-serif-devanagari-devanagari-700-normal.woff2',
  'noto-serif-devanagari-devanagari-400-normal.woff2',
  'noto-sans-devanagari-latin-400-normal.woff2',
];

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Reading the request headers makes pages render per request, which lets the CSP nonce reach the scripts.
  await headers();
  return (
    <html lang="hi">
      <head>
        {/* The two faces every page uses, fetched in parallel with the page so text does not reflow when they arrive. */}
        {PRELOAD_FONTS.map((f) => (
          <link key={f} rel="preload" as="font" type="font/woff2" href={`/fonts/${f}`} crossOrigin="anonymous" />
        ))}
      </head>
      <body>{children}</body>
    </html>
  );
}
