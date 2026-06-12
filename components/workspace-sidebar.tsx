'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Building2,
  Bus,
  BellRing,
  CalendarDays,
  BookOpen,
  ShieldCheck,
  Wind,
  Flame,
  Volume2,
  Recycle,
  TrendingUp,
  Sparkles,
  Leaf,
  Layers3,
  ChevronLeft,
  ChevronRight,
  UserRound,
  MapPin,
  UserCog,
} from 'lucide-react';

interface WorkspaceSidebarProps {
  buildingId: string;
  buildingName: string;
  buildingAddress: string;
  role: string;
  collapsed: boolean;
  onCollapse: (v: boolean) => void;
}

const roleLabels: Record<string, string> = {
  lako: 'Lakó',
  tulajdonos: 'Tulajdonos',
  kozos_kepviselo: 'Közös képviselő',
  megbizott: 'Megbízott',
  bizottsag: 'Bizottsági tag',
  konyvelo: 'Könyvelő',
};

export default function WorkspaceSidebar({
  buildingId,
  buildingName,
  buildingAddress,
  role,
  collapsed,
  onCollapse,
}: WorkspaceSidebarProps) {
  const pathname = usePathname();

  const isManager = ['kozos_kepviselo', 'megbizott'].includes(role);
  const isAdminLike = ['kozos_kepviselo', 'megbizott', 'bizottsag', 'konyvelo'].includes(role);

  const base = `/w/${buildingId}`;

  const mainNav = [
    { href: `${base}/profil`,      label: 'Lakói profil',    icon: UserCog },
    { href: `${base}#meetings`,    label: 'Közgyűlések',     icon: CalendarDays },
    { href: `${base}#knowledge`,   label: 'Tudásbázis',      icon: BookOpen },
    ...(isAdminLike ? [{ href: `${base}#audit`, label: 'Audit napló', icon: ShieldCheck }] : []),
    ...(isManager ? [{ href: `${base}/ertesitesek`, label: 'Push értesítések', icon: BellRing }] : []),
  ];

  const envNav = [
    { href: `${base}/kozlekedes`,                    label: 'Közlekedés',                      icon: Bus },
    { href: `${base}/kornyezet`,                     label: 'Lakókörnyezet - természet',        icon: Wind },
    { href: `${base}/lakokornyzet-szolgaltatasok`,   label: 'Lakókörnyezet - szolgáltatások',   icon: MapPin },
    { href: `${base}/klimakockazat`,                 label: 'Hősziget kockázat',               icon: Flame },
    { href: `${base}/zaj`,                           label: 'Zajriporter',                      icon: Volume2 },
    { href: `${base}/hulladek`,                      label: 'Hulladék & Víz',                   icon: Recycle },
    { href: `${base}/budapest-2030`,                 label: 'Budapest 2030',                    icon: TrendingUp },
    { href: `${base}/green-score`,                   label: 'Zöld Épület Pontszám',             icon: Sparkles },
    { href: `${base}/zold-akciok`,                   label: 'Zöld Akciók',                      icon: Leaf },
  ];

  const isActive = (href: string) =>
    !href.includes('#') && (pathname === href || pathname.startsWith(href + '/'));

  if (collapsed) {
    return (
      <aside className="fixed left-0 top-0 z-40 flex h-screen w-[60px] flex-col border-r border-white/[0.08] bg-ink-deep">
        {/* Expand */}
        <button
          onClick={() => onCollapse(false)}
          className="flex h-14 w-full items-center justify-center border-b border-white/[0.08] text-slate-500 transition-colors hover:bg-white/[0.06] hover:text-slate-200"
          title="Menü megnyitása"
          aria-label="Menü megnyitása"
        >
          <ChevronRight size={18} />
        </button>

        {/* Logo */}
        <div className="flex justify-center py-3">
          <a href={base} title="Főoldal">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand-500 text-ink-base">
              <Building2 size={15} />
            </div>
          </a>
        </div>

        {/* Icon-only nav */}
        <nav className="sidebar-scroll flex-1 overflow-y-auto py-2" aria-label="Navigáció">
          {mainNav.map((item) => {
            const Icon = item.icon;
            return (
              <a
                key={item.href}
                href={item.href}
                title={item.label}
                aria-label={item.label}
                className="flex h-10 w-full items-center justify-center text-slate-500 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                <Icon size={16} />
              </a>
            );
          })}
          <div className="mx-auto my-2 w-8 border-t border-white/[0.08]" />
          {envNav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <a
                key={item.href}
                href={item.href}
                title={item.label}
                aria-label={item.label}
                className={`flex h-10 w-full items-center justify-center transition-colors hover:bg-white/[0.06] hover:text-white ${
                  active ? 'text-brand-400' : 'text-slate-500'
                }`}
              >
                <Icon size={16} />
              </a>
            );
          })}
        </nav>

        {/* Role icon */}
        <div className="flex justify-center p-3">
          <div
            className="grid h-8 w-8 place-items-center rounded-lg bg-brand-500/10 text-brand-400 ring-1 ring-brand-500/20"
            title={roleLabels[role] ?? role}
          >
            <UserRound size={14} />
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-[272px] flex-col border-r border-white/[0.08] bg-ink-deep text-slate-200">
      <div className="flex h-full flex-col p-4">

        {/* LOGO + collapse */}
        <div className="mb-4 flex items-center gap-3">
          <a href={base}>
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-500 text-ink-base">
              <Building2 size={18} />
            </div>
          </a>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-semibold tracking-tight text-white">PanelLakó</p>
          </div>
          <button
            onClick={() => onCollapse(true)}
            className="shrink-0 rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-white/[0.06] hover:text-slate-300"
            title="Menü összecsukása"
            aria-label="Menü összecsukása"
          >
            <ChevronLeft size={16} />
          </button>
        </div>

        {/* BUILDING CARD */}
        <div className="mb-3 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Aktuális épület</p>
          <p className="truncate text-xs font-semibold leading-snug text-slate-200">{buildingName}</p>
          <p className="mt-0.5 truncate text-[11px] text-slate-500">{buildingAddress}</p>
          <Link
            href="/app"
            className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-brand-400 transition-colors hover:text-brand-300"
          >
            <Layers3 size={11} />
            Épület váltása
          </Link>
        </div>

        {/* NAV */}
        <nav className="sidebar-scroll flex-1 space-y-px overflow-y-auto" aria-label="Navigáció">
          {mainNav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <a
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors hover:bg-white/[0.05] hover:text-white ${
                  active ? 'bg-white/[0.06] text-white' : 'text-slate-400'
                }`}
              >
                {active && <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-brand-400" aria-hidden="true" />}
                <Icon size={15} className={`shrink-0 transition-colors ${active ? 'text-brand-400' : 'text-slate-500'} group-hover:text-slate-300`} />
                <span>{item.label}</span>
              </a>
            );
          })}

          <p className="mt-4 mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
            Élettér
          </p>

          {envNav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <a
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors hover:bg-white/[0.05] hover:text-white ${
                  active ? 'bg-white/[0.06] text-white' : 'text-slate-400'
                }`}
              >
                {active && <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-brand-400" aria-hidden="true" />}
                <Icon size={15} className={`shrink-0 transition-colors ${active ? 'text-brand-400' : 'text-slate-500'} group-hover:text-slate-300`} />
                <span>{item.label}</span>
              </a>
            );
          })}
        </nav>

        {/* BILLING */}
        {isManager && (
          <div className="mt-2">
            <a
              href={`/billing?building=${buildingId}`}
              className="group flex w-full items-center gap-2.5 rounded-lg border border-violet-500/20 bg-violet-500/[0.06] px-3 py-2.5 transition-colors hover:border-violet-500/35 hover:bg-violet-500/10"
            >
              <Sparkles size={12} className="shrink-0 text-violet-400" />
              <span className="text-xs font-semibold text-violet-300">Előfizetés &amp; Számlázás</span>
              <ChevronRight size={11} className="ml-auto text-violet-500 transition-colors group-hover:text-violet-300" />
            </a>
          </div>
        )}

        {/* ROLE */}
        <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5">
          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand-500/10 text-brand-400 ring-1 ring-brand-500/20">
            <UserRound size={13} />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Aktív szerepkör</p>
            <p className="truncate text-xs font-semibold text-slate-200">{roleLabels[role] ?? role}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
