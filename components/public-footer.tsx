import Link from 'next/link';
import { Building2 } from 'lucide-react';

const FOOTER_COLS = [
  {
    heading: 'Platform',
    links: [
      { href: '/funkciok',                       label: 'Funkciók' },
      { href: '/funkciok/hibabejelentes-kezeles', label: 'Hibabejelentés' },
      { href: '/funkciok/dokumentumtar',          label: 'Dokumentumtár' },
      { href: '/funkciok/kozos-koltseg',          label: 'Közös költség' },
      { href: '/funkciok/online-kozgyules',       label: 'Online közgyűlés' },
      { href: '/arak',                            label: 'Árak' },
    ],
  },
  {
    heading: 'Tudástár',
    links: [
      { href: '/tarsashaz-kezeles',          label: 'Társasházkezelés' },
      { href: '/levegominoseg-budapest',     label: 'Levegőminőség Budapest' },
      { href: '/elemzes',                    label: 'Elemzések' },
      { href: '/gyik',                       label: 'GYIK' },
      { href: '/osszehasonlitas',            label: 'Összehasonlítás' },
    ],
  },
  {
    heading: 'Vállalat',
    links: [
      { href: '/rolunk',    label: 'Rólunk' },
      { href: '/kapcsolat', label: 'Kapcsolat' },
    ],
  },
  {
    heading: 'Jogi',
    links: [
      { href: '/adatvedelmi-iranyelvek', label: 'Adatvédelmi irányelvek' },
      { href: '/aszf',                   label: 'ÁSZF' },
    ],
  },
];

export default function PublicFooter() {
  return (
    <footer className="border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:grid-cols-5">
          {/* Brand col */}
          <div className="col-span-2 sm:col-span-4 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-3 group">
              <div className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-brand-500 to-teal-700 text-white">
                <Building2 size={14} />
              </div>
              <span className="text-sm font-black text-slate-900">PanelLakó</span>
            </Link>
            <p className="text-xs leading-relaxed text-slate-500 max-w-[200px]">
              Digitális társasházkezelő platform — bejelentések, dokumentumok, pénzügyek egy helyen.
            </p>
          </div>

          {/* Link cols */}
          {FOOTER_COLS.map((col) => (
            <div key={col.heading}>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">{col.heading}</h3>
              <ul className="space-y-2">
                {col.links.map(({ href, label }) => (
                  <li key={href}>
                    <Link href={href} className="text-xs text-slate-500 transition-colors hover:text-slate-900">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-slate-200 pt-6 sm:flex-row">
          <p className="text-xs text-slate-400">© {new Date().getFullYear()} PanelLakó. Minden jog fenntartva.</p>
          <p className="text-xs text-slate-400">Magyar fejlesztés · GDPR megfelelő · Biztonságos tárolás</p>
        </div>
      </div>
    </footer>
  );
}
