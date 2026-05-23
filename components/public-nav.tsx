import Link from 'next/link';
import { Building2, Menu, X } from 'lucide-react';

const NAV_LINKS = [
  { href: '/funkciok',  label: 'Funkciók' },
  { href: '/arak',      label: 'Árak' },
  { href: '/elemzes',   label: 'Elemzések' },
  { href: '/gyik',      label: 'GYIK' },
  { href: '/rolunk',    label: 'Rólunk' },
];

export default function PublicNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-900/[0.06] bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-teal-700 text-white shadow-md shadow-brand-200 transition-transform group-hover:scale-105">
            <Building2 size={16} />
          </div>
          <span className="text-base font-black tracking-tight text-slate-900">PanelLakó</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="rounded-xl px-3.5 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* CTA */}
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50 sm:inline-flex"
          >
            Belépés
          </Link>
          <Link
            href="/login"
            className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold text-white shadow-sm shadow-brand-200 transition-all hover:bg-brand-700"
          >
            Ingyenes próba
          </Link>
        </div>
      </div>
    </header>
  );
}
