import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PanelLakó – Digitális működési központ',
  description: 'Társasházi kommunikáció, hibakezelés, dokumentumtár és pénzügyi átláthatóság egy helyen.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hu">
      <body>{children}</body>
    </html>
  );
}
