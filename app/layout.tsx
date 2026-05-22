import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-inter',
});

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://panellako.hu';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'PanelLakó – Társasházkezelő szoftver Magyarországon',
    template: '%s — PanelLakó',
  },
  description:
    'Kezeld a közös képviseletet digitálisan: bejelentések, dokumentumok, pénzügyek, közgyűlések — egy platformon, 14 napos ingyenes próbával.',
  keywords: [
    'társasházkezelő szoftver', 'közös képviselet', 'társasházi bejelentések',
    'közös költség kezelés', 'lakóközösség', 'társasházi app', 'panellakó',
  ],
  openGraph: {
    type: 'website',
    locale: 'hu_HU',
    url: BASE_URL,
    siteName: 'PanelLakó',
    title: 'PanelLakó – Társasházkezelő szoftver Magyarországon',
    description:
      'Kezeld a közös képviseletet digitálisan: bejelentések, dokumentumok, pénzügyek, közgyűlések — egy platformon, 14 napos ingyenes próbával.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'PanelLakó – Társasházkezelő szoftver',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PanelLakó – Társasházkezelő szoftver Magyarországon',
    description:
      'Kezeld a közös képviseletet digitálisan: bejelentések, dokumentumok, pénzügyek — egy platformon.',
    images: ['/og-image.png'],
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'PanelLakó',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  alternates: {
    canonical: BASE_URL,
  },
};

export const viewport: Viewport = {
  themeColor: '#0f766e',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

// Organization JSON-LD — entity definition for Google Knowledge Graph & LLM extractability
const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'PanelLakó',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web, iOS, Android',
  url: 'https://panellako.hu',
  description:
    'Magyar társasházkezelő szoftver: bejelentések, dokumentumok, pénzügyek és közgyűlések digitális kezelése.',
  inLanguage: 'hu',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'HUF',
    description: '14 napos ingyenes próbaidőszak, kártyaadatok nélkül',
  },
  publisher: {
    '@type': 'Organization',
    name: 'PanelLakó',
    url: 'https://panellako.hu',
    logo: {
      '@type': 'ImageObject',
      url: 'https://panellako.hu/icons/icon-512.png',
    },
  },
  sameAs: [],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hu" className={inter.variable}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
      </head>
      <body className="overflow-x-hidden font-sans">{children}</body>
    </html>
  );
}
