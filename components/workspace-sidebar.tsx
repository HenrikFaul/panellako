'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  BellRing,
  BookOpen,
  Building2,
  Bus,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Flame,
  Layers3,
  Leaf,
  MapPin,
  Menu,
  Recycle,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserCog,
  UserRound,
  Volume2,
  Wind,
  X,
} from 'lucide-react';
import type { WorkspaceCapability } from '@/lib/authorization/capabilities';

interface WorkspaceSidebarProps {
  buildingId: string;
  buildingName: string;
  buildingAddress: string;
  role: string;
  capabilities?: WorkspaceCapability[];
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
  capabilities = [],
  collapsed,
  onCollapse,
}: WorkspaceSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileDialogRef = useRef<HTMLElement>(null);
  const mobileTriggerRef = useRef<HTMLButtonElement>(null);

  const isManager = capabilities.length > 0
    ? capabilities.includes('announcement.publish') || capabilities.includes('membership.invite')
    : ['kozos_kepviselo', 'megbizott'].includes(role);
  const isAdminLike = capabilities.length > 0
    ? capabilities.includes('audit.read') || capabilities.includes('finance.workspace.read') || isManager
    : ['kozos_kepviselo', 'megbizott', 'bizottsag', 'konyvelo'].includes(role);
  const canManageBilling = capabilities.length > 0
    ? capabilities.includes('billing.manage')
    : ['kozos_kepviselo', 'megbizott'].includes(role);
  const canManageCommunity = capabilities.length > 0
    ? capabilities.some((capability) => [
      'unit.manage',
      'membership.invite',
      'membership.approve',
      'role.grant_limited',
    ].includes(capability))
    : ['kozos_kepviselo', 'megbizott'].includes(role);
  const base = `/w/${buildingId}`;

  const mainNav = [
    { href: `${base}/profil`, label: 'Lakói profil', icon: UserCog },
    { href: `${base}#meetings`, label: 'Közgyűlések', icon: CalendarDays },
    { href: `${base}#knowledge`, label: 'Tudásbázis', icon: BookOpen },
    ...(isAdminLike ? [{ href: `${base}#audit`, label: 'Audit napló', icon: ShieldCheck }] : []),
    ...(isManager ? [{ href: `${base}/ertesitesek`, label: 'Push értesítések', icon: BellRing }] : []),
    ...(canManageCommunity ? [{ href: `${base}/admin`, label: 'Közösség kezelése', icon: Layers3 }] : []),
  ];

  const envNav = [
    { href: `${base}/kozlekedes`, label: 'Közlekedés', icon: Bus },
    { href: `${base}/kornyezet`, label: 'Lakókörnyezet - természet', icon: Wind },
    { href: `${base}/lakokornyzet-szolgaltatasok`, label: 'Lakókörnyezet - szolgáltatások', icon: MapPin },
    { href: `${base}/klimakockazat`, label: 'Hősziget kockázat', icon: Flame },
    { href: `${base}/zaj`, label: 'Zajriporter', icon: Volume2 },
    { href: `${base}/hulladek`, label: 'Hulladék & Víz', icon: Recycle },
    { href: `${base}/budapest-2030`, label: 'Budapest 2030', icon: TrendingUp },
    { href: `${base}/green-score`, label: 'Zöld Épület Pontszám', icon: Sparkles },
    { href: `${base}/zold-akciok`, label: 'Zöld Akciók', icon: Leaf },
  ];

  const isActive = (href: string) =>
    !href.includes('#') && (pathname === href || pathname.startsWith(href + '/'));

  useEffect(() => {
    if (!mobileOpen) return;

    const previousOverflow = document.body.style.overflow;
    const dialog = mobileDialogRef.current;
    const mobileTrigger = mobileTriggerRef.current;
    const desktopQuery = window.matchMedia('(min-width: 1024px)');
    document.body.style.overflow = 'hidden';

    const focusable = dialog
      ? Array.from(dialog.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])'))
      : [];
    focusable[0]?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setMobileOpen(false);
        return;
      }

      if (event.key !== 'Tab' || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const handleViewportChange = (event: MediaQueryListEvent) => {
      if (event.matches) setMobileOpen(false);
    };

    document.addEventListener('keydown', handleKeyDown);
    desktopQuery.addEventListener('change', handleViewportChange);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      desktopQuery.removeEventListener('change', handleViewportChange);
      mobileTrigger?.focus();
    };
  }, [mobileOpen]);

  const expandedContent = (mobile: boolean) => (
    <div className="flex h-full min-h-0 flex-col px-3.5 py-4">
      <div className="mb-4 flex items-center gap-3 px-1">
        <a href={base} onClick={mobile ? () => setMobileOpen(false) : undefined} className="flex min-w-0 flex-1 items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-700 text-white shadow-sm">
            <Building2 size={17} />
          </span>
          <span className="truncate text-[15px] font-semibold tracking-[-0.015em] text-slate-900">PanelLakó</span>
        </a>
        <button
          type="button"
          onClick={() => mobile ? setMobileOpen(false) : onCollapse(true)}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-slate-500 transition-colors hover:bg-white hover:text-brand-800 hover:shadow-sm"
          title="Menü összecsukása"
          aria-label="Menü összecsukása"
        >
          {mobile ? <X size={18} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      <div className="mb-3 rounded-xl border border-brand-100 bg-brand-50/70 px-3.5 py-3">
        <p className="mb-1 text-[11px] font-medium text-slate-500">Aktuális épület</p>
        <p className="truncate text-[13px] font-semibold leading-snug text-slate-900">{buildingName}</p>
        <p className="mt-1 truncate text-[11px] text-slate-500">{buildingAddress}</p>
        <Link
          href="/app"
          onClick={mobile ? () => setMobileOpen(false) : undefined}
          className="mt-2.5 flex items-center gap-1.5 text-[11px] font-semibold text-brand-700 transition-colors hover:text-brand-900"
        >
          <Layers3 size={11} />
          Épület váltása
        </Link>
      </div>

      <nav className="sidebar-scroll min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-1" aria-label="Navigáció">
        {mainNav.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <a
              key={item.href}
              href={item.href}
              onClick={mobile ? () => setMobileOpen(false) : undefined}
              aria-current={active ? 'page' : undefined}
              className={`group flex min-h-11 items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium transition-colors ${
                active ? 'bg-brand-50 text-brand-900 ring-1 ring-brand-100' : 'text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm'
              }`}
            >
              <Icon size={15} className={`shrink-0 ${active ? 'text-brand-700' : 'text-slate-400 group-hover:text-brand-700'}`} />
              <span>{item.label}</span>
            </a>
          );
        })}

        <p className="mb-1 mt-4 px-3 text-[11px] font-medium text-slate-500">Élettér</p>

        {envNav.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <a
              key={item.href}
              href={item.href}
              onClick={mobile ? () => setMobileOpen(false) : undefined}
              aria-current={active ? 'page' : undefined}
              className={`group flex min-h-11 items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium transition-colors ${
                active ? 'bg-brand-50 text-brand-900 ring-1 ring-brand-100' : 'text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm'
              }`}
            >
              <Icon size={15} className={`shrink-0 ${active ? 'text-brand-700' : 'text-slate-400 group-hover:text-brand-700'}`} />
              <span>{item.label}</span>
            </a>
          );
        })}
      </nav>

      {canManageBilling && (
        <a
          href={`/billing?building=${buildingId}`}
          onClick={mobile ? () => setMobileOpen(false) : undefined}
          className="group mt-3 flex min-h-11 w-full items-center gap-2.5 rounded-xl border border-brand-100 bg-brand-50 px-3 transition-colors hover:border-brand-200 hover:bg-brand-100/70"
        >
          <Sparkles size={13} className="shrink-0 text-brand-700" />
          <span className="text-xs font-semibold text-brand-800">Előfizetés &amp; Számlázás</span>
          <ChevronRight size={12} className="ml-auto text-brand-500 transition-colors group-hover:text-brand-800" />
        </a>
      )}

      <div className="mt-3 flex items-center gap-2.5 border-t border-slate-200 px-1 pt-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white text-slate-500 shadow-sm ring-1 ring-slate-200">
          <UserRound size={14} />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-slate-500">Aktív szerepkör</p>
          <p className="truncate text-xs font-semibold text-slate-800">{roleLabels[role] ?? role}</p>
        </div>
        <a
          href="/account/security"
          onClick={mobile ? () => setMobileOpen(false) : undefined}
          className="ml-auto grid h-11 w-11 shrink-0 place-items-center rounded-xl text-slate-500 transition-colors hover:bg-white hover:text-brand-800 hover:shadow-sm"
          title="Fiókbiztonság és kétlépcsős azonosítás"
          aria-label="Fiókbiztonság és kétlépcsős azonosítás"
        >
          <ShieldCheck size={15} />
        </a>
      </div>
    </div>
  );

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center border-b border-slate-200/80 bg-white/90 px-4 shadow-sm backdrop-blur-xl lg:hidden">
        <a href={base} className="flex min-w-0 flex-1 items-center gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-brand-700 text-white">
            <Building2 size={15} />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold text-slate-900">{buildingName || 'PanelLakó'}</span>
            {buildingAddress && <span className="block truncate text-[10px] text-slate-500">{buildingAddress}</span>}
          </span>
        </a>
        <button
          ref={mobileTriggerRef}
          type="button"
          onClick={() => setMobileOpen(true)}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-slate-600 transition-colors hover:bg-brand-50 hover:text-brand-800"
          title="Menü megnyitása"
          aria-label="Menü megnyitása"
          aria-expanded={mobileOpen}
          aria-controls="workspace-mobile-navigation"
        >
          <Menu size={19} />
        </button>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 h-full w-full bg-black/65 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-label="Menü összecsukása"
          />
          <aside
            ref={mobileDialogRef}
            id="workspace-mobile-navigation"
            role="dialog"
            aria-modal="true"
            aria-label="Navigáció"
            className="relative h-full w-[min(88vw,320px)] border-r border-slate-200 bg-[#f7faf7] text-slate-700 shadow-overlay"
          >
            {expandedContent(true)}
          </aside>
        </div>
      )}

      {collapsed ? (
        <aside className="fixed left-0 top-0 z-40 hidden h-screen w-16 flex-col border-r border-slate-200 bg-[#f7faf7] text-slate-700 shadow-[4px_0_24px_-24px_rgba(31,57,45,0.5)] lg:flex">
          <button
            type="button"
            onClick={() => onCollapse(false)}
            className="grid h-14 w-full place-items-center border-b border-slate-200 text-slate-500 transition-colors hover:bg-white hover:text-brand-800"
            title="Menü megnyitása"
            aria-label="Menü megnyitása"
          >
            <ChevronRight size={17} />
          </button>
          <a href={base} title="Főoldal" className="mx-auto my-3 grid h-9 w-9 place-items-center rounded-xl bg-brand-700 text-white shadow-sm">
            <Building2 size={16} />
          </a>
          <nav className="sidebar-scroll min-h-0 flex-1 overflow-y-auto py-1" aria-label="Navigáció">
            {[...mainNav, ...envNav].map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <a
                  key={item.href}
                  href={item.href}
                  title={item.label}
                  aria-label={item.label}
                  aria-current={active ? 'page' : undefined}
                  className={`mx-2 grid h-11 place-items-center rounded-xl transition-colors ${
                    active ? 'bg-brand-50 text-brand-800 ring-1 ring-brand-100' : 'text-slate-400 hover:bg-white hover:text-brand-800'
                  }`}
                >
                  <Icon size={16} />
                </a>
              );
            })}
          </nav>
          {canManageBilling && (
            <a
              href={`/billing?building=${buildingId}`}
              title="Előfizetés & Számlázás"
              aria-label="Előfizetés & Számlázás"
              className="mx-2 mb-2 grid h-11 place-items-center rounded-xl bg-brand-50 text-brand-700 ring-1 ring-brand-100 transition-colors hover:bg-brand-100"
            >
              <Sparkles size={15} />
            </a>
          )}
          <div className="mx-auto mb-3 grid h-9 w-9 place-items-center rounded-xl bg-white text-slate-500 shadow-sm ring-1 ring-slate-200" title={roleLabels[role] ?? role}>
            <UserRound size={14} />
          </div>
          <a
            href="/account/security"
            title="Fiókbiztonság és kétlépcsős azonosítás"
            aria-label="Fiókbiztonság és kétlépcsős azonosítás"
            className="mx-2 mb-3 grid h-11 place-items-center rounded-xl text-slate-500 transition-colors hover:bg-white hover:text-brand-800"
          >
            <ShieldCheck size={15} />
          </a>
        </aside>
      ) : (
        <aside className="fixed left-0 top-0 z-40 hidden h-screen w-[248px] flex-col border-r border-slate-200 bg-[#f7faf7] text-slate-700 shadow-[4px_0_24px_-24px_rgba(31,57,45,0.5)] lg:flex">
          {expandedContent(false)}
        </aside>
      )}
    </>
  );
}
