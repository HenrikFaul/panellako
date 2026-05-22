import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Superadmin belépés',
  robots: { index: false, follow: false },
};

export default function SuperadminLoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
