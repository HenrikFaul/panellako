'use client';

import Link from 'next/link';
import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BellRing,
  BookOpen,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  ClipboardCheck,
  FileText,
  Gauge,
  Home,
  Layers3,
  LifeBuoy,
  LogOut,
  MapPin,
  Megaphone,
  MessageSquare,
  Search,
  ShieldCheck,
  Siren,
  Sparkles,
  TicketCheck,
  UserCog,
  UserRound,
  Vote,
  Wrench
} from 'lucide-react';
import {
  AuditLogItem,
  DocumentItem,
  FinanceItem,
  KnowledgeBaseArticle,
  MeetingItem,
  MeterReading,
  NotificationItem,
  Role,
  Ticket,
  UnitItem,
  VendorItem,
  WorkOrderItem
} from '@/lib/types';
import { hasSupabaseConfig, supabase } from '@/lib/supabase';

type DashboardData = {
  source: string;
  currentUser: { full_name: string; role: Role };
  news: Array<{
    id: string;
    title: string;
    content: string;
    target_group: string;
    created_at: string;
    created_by_name?: string;
    category?: string;
    source_label?: string;
  }>;
  notifications: NotificationItem[];
  tickets: Ticket[];
  meterReadings: MeterReading[];
  documents: DocumentItem[];
  finances: FinanceItem[];
  meetings: MeetingItem[];
  units: UnitItem[];
  vendors: VendorItem[];
  workOrders: WorkOrderItem[];
  kbArticles: KnowledgeBaseArticle[];
  auditLogs: AuditLogItem[];
};

const roleLabels: Record<Role, string> = {
  lako: 'Lakó',
  tulajdonos: 'Tulajdonos',
  kozos_kepviselo: 'Közös képviselő',
  megbizott: 'Megbízott',
  bizottsag: 'Bizottsági tag',
  konyvelo: 'Könyvelő'
};

const newsCategoryLabels: Record<string, string> = {
  tarsashazi_kozlony: 'Társasházi közlöny',
  keruleti_hir: 'Kerületi hír',
  uzemeltetes: 'Üzemeltetés',
  biztonsag: 'Biztonság',
  egyeb: 'Egyéb'
};

const navigation = [
  { href: '#overview', label: 'Áttekintő', icon: Home },
  { href: '#tasks', label: 'Teendők', icon: ClipboardCheck },
  { href: '#tickets', label: 'Bejelentések', icon: TicketCheck },
  { href: '#units', label: 'Albetétek', icon: Building2 },
  { href: '#documents', label: 'Dokumentumok', icon: FileText },
  { href: '#finances', label: 'Pénzügyek', icon: CircleDollarSign },
  { href: '#meters', label: 'Mérőórák', icon: Gauge },
  { href: '#meetings', label: 'Közgyűlések', icon: CalendarDays },
  { href: '#knowledge', label: 'Tudásbázis', icon: BookOpen },
  { href: '#audit', label: 'Audit napló', icon: ShieldCheck }
];

function formatDate(value?: string | null) {
  if (!value) {
    return '-';
  }
  return new Intl.DateTimeFormat('hu-HU', { dateStyle: 'medium' }).format(new Date(value));
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return '-';
  }
  return new Intl.DateTimeFormat('hu-HU', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function formatCurrency(value: number | string | null | undefined) {
  return `${Number(value ?? 0).toLocaleString('hu-HU')} Ft`;
}

function previewText(text: string) {
  const sentences = text.split('. ').slice(0, 2).join('. ');
  return sentences.endsWith('.') ? sentences : `${sentences}.`;
}

function numberOrZero(value: number | string | null | undefined) {
  return Number(value ?? 0);
}

function SectionCard({ id, title, icon, children, action }: { id?: string; title: string; icon: ReactNode; children: ReactNode; action?: ReactNode }) {
  return (
    <section id={id} className="rounded-[1.75rem] border border-white/70 bg-white/90 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-slate-950">
          <span className="rounded-2xl bg-brand-50 p-2 text-brand-700">{icon}</span>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function MetricCard({ title, value, subtitle, icon, tone = 'brand' }: { title: string; value: string; subtitle: string; icon: ReactNode; tone?: 'brand' | 'amber' | 'slate' | 'violet' }) {
  const toneClass = {
    brand: 'from-brand-600 to-cyan-500 text-white',
    amber: 'from-amber-500 to-orange-500 text-white',
    slate: 'from-slate-900 to-slate-700 text-white',
    violet: 'from-violet-600 to-fuchsia-500 text-white'
  }[tone];

  return (
    <article className={`rounded-[1.5rem] bg-gradient-to-br ${toneClass} p-5 shadow-lg shadow-slate-200/70`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium opacity-85">{title}</p>
          <p className="mt-2 text-3xl font-black tracking-tight">{value}</p>
        </div>
        <span className="rounded-2xl bg-white/18 p-3">{icon}</span>
      </div>
      <p className="mt-4 text-xs font-medium opacity-85">{subtitle}</p>
    </article>
  );
}

function StatusBadge({ status }: { status: Ticket['status'] | WorkOrderItem['status'] | MeetingItem['status'] }) {
  const classes: Record<string, string> = {
    uj: 'bg-sky-50 text-sky-700 ring-sky-100',
    folyamatban: 'bg-amber-50 text-amber-700 ring-amber-100',
    varakozik: 'bg-violet-50 text-violet-700 ring-violet-100',
    lezarva: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    tervezett: 'bg-sky-50 text-sky-700 ring-sky-100',
    kikuldve: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
    lezart: 'bg-emerald-50 text-emerald-700 ring-emerald-100'
  };

  return <span className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${classes[status] ?? classes.uj}`}>{status}</span>;
}

function PriorityBadge({ priority }: { priority: Ticket['priority'] }) {
  const classes: Record<Ticket['priority'], string> = {
    alacsony: 'bg-slate-100 text-slate-700',
    kozepes: 'bg-cyan-50 text-cyan-700',
    magas: 'bg-amber-50 text-amber-700',
    kritikus: 'bg-rose-50 text-rose-700'
  };

  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${classes[priority]}`}>{priority}</span>;
}

export default function DashboardClient({ data }: { data: DashboardData }) {
  const [ticketSaved, setTicketSaved] = useState(false);
  const [meterSaved, setMeterSaved] = useState(false);
  const [noticeSaved, setNoticeSaved] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [tickets, setTickets] = useState(data.tickets);
  const [expandedNews, setExpandedNews] = useState<string[]>([]);
  const [ticketFilter, setTicketFilter] = useState<Ticket['status'] | 'osszes'>('osszes');
  const [documentFilter, setDocumentFilter] = useState('osszes');
  const [unitSearch, setUnitSearch] = useState('');

  const [name, setName] = useState(data.currentUser.full_name);
  const [unit, setUnit] = useState('');
  const [address, setAddress] = useState('');
  const [addressQuery, setAddressQuery] = useState('');
  const [addressOptions, setAddressOptions] = useState<string[]>([]);
  const [addressError, setAddressError] = useState('');
  const [isAddressLoading, setIsAddressLoading] = useState(false);

  const [ticketTitle, setTicketTitle] = useState('');
  const [ticketDescription, setTicketDescription] = useState('');
  const [ticketLocation, setTicketLocation] = useState('');
  const [ticketPriority, setTicketPriority] = useState<Ticket['priority']>('kozepes');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const isManager = useMemo(() => ['kozos_kepviselo', 'megbizott'].includes(data.currentUser.role), [data.currentUser.role]);
  const isAdminLike = useMemo(() => ['kozos_kepviselo', 'megbizott', 'bizottsag', 'konyvelo'].includes(data.currentUser.role), [data.currentUser.role]);

  const totalDue = data.finances.reduce((acc, item) => acc + numberOrZero(item.expected_amount), 0);
  const totalPaid = data.finances.reduce((acc, item) => acc + numberOrZero(item.paid_amount), 0);
  const arrears = Math.max(totalDue - totalPaid, 0);
  const openTicketCount = tickets.filter((ticket) => ticket.status !== 'lezarva').length;
  const unreadNotificationCount = data.notifications.filter((notification) => !notification.read_at).length;
  const totalArea = data.units.reduce((acc, item) => acc + numberOrZero(item.area_m2), 0);
  const totalOwnershipShare = data.units.reduce((acc, item) => acc + numberOrZero(item.ownership_share), 0);

  useEffect(() => {
    if (!hasSupabaseConfig || !supabase) {
      return;
    }

    supabase.auth.getSession().then(({ data: sessionData }) => {
      setIsLoggedIn(Boolean(sessionData.session));
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(Boolean(session));
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!addressQuery || addressQuery.length < 3) {
      setAddressOptions([]);
      setAddressError('');
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setIsAddressLoading(true);
      setAddressError('');

      try {
        const response = await fetch(`/api/location/autocomplete?q=${encodeURIComponent(addressQuery)}`, {
          method: 'GET',
          signal: controller.signal
        });

        const payload = await response.json();

        if (!response.ok) {
          setAddressError(payload?.message || 'Címkeresés most nem elérhető.');
          setAddressOptions([]);
          return;
        }

        setAddressOptions(payload.suggestions ?? []);
      } catch {
        if (!controller.signal.aborted) {
          setAddressError('Címkeresés hiba történt.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsAddressLoading(false);
        }
      }
    }, 350);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [addressQuery]);

  const visibleTickets = useMemo(() => {
    if (ticketFilter === 'osszes') {
      return tickets;
    }

    return tickets.filter((ticket) => ticket.status === ticketFilter);
  }, [ticketFilter, tickets]);

  const documentCategories = useMemo(() => ['osszes', ...Array.from(new Set(data.documents.map((document) => document.category)))], [data.documents]);
  const visibleDocuments = useMemo(() => {
    if (documentFilter === 'osszes') {
      return data.documents;
    }

    return data.documents.filter((document) => document.category === documentFilter);
  }, [data.documents, documentFilter]);

  const visibleUnits = useMemo(() => {
    const normalized = unitSearch.trim().toLowerCase();
    if (!normalized) {
      return data.units;
    }

    return data.units.filter((unitItem) => `${unitItem.unit_label} ${unitItem.owner_name} ${unitItem.unit_type}`.toLowerCase().includes(normalized));
  }, [data.units, unitSearch]);

  const tasks = useMemo(() => {
    return [
      { id: 'task-1', title: 'Új hibabejelentések triage', meta: `${tickets.filter((ticket) => ticket.status === 'uj').length} új ticket`, tone: 'bg-sky-50 text-sky-700' },
      { id: 'task-2', title: 'Lejárt közös költség ellenőrzés', meta: formatCurrency(arrears), tone: 'bg-amber-50 text-amber-700' },
      { id: 'task-3', title: 'Közgyűlési dokumentumok olvasottsága', meta: `${data.documents.filter((document) => !document.acknowledged_at).length} nyitott visszaigazolás`, tone: 'bg-violet-50 text-violet-700' }
    ];
  }, [arrears, data.documents, tickets]);

  const submitTicket = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const now = new Date().toISOString();

    const newTicket: Ticket = {
      id: `ticket-${now}`,
      title: ticketTitle,
      description: ticketDescription,
      status: 'uj',
      priority: ticketPriority,
      location: ticketLocation,
      due_date: null,
      submitted_by: name,
      unit_label: unit || undefined,
      created_at: now,
      updated_at: now
    };

    setTickets((prev) => [newTicket, ...prev]);
    setTicketSaved(true);
    setTicketTitle('');
    setTicketDescription('');
    setTicketLocation('');
    setTicketPriority('kozepes');
  };

  const updateTicketStatus = (ticketId: string, nextStatus: Ticket['status']) => {
    setTickets((prev) =>
      prev.map((ticket) =>
        ticket.id === ticketId
          ? {
              ...ticket,
              status: nextStatus,
              updated_at: new Date().toISOString()
            }
          : ticket
      )
    );
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#ccfbf1_0,#f8fafc_30%,#eef2ff_100%)] text-slate-900">
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="hidden border-r border-white/50 bg-slate-950 text-slate-200 shadow-2xl lg:block">
          <div className="sticky top-0 flex h-screen flex-col p-5">
            <div className="mb-8 flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-sky-500 text-white shadow-lg shadow-brand-900/30">
                <Building2 size={24} />
              </div>
              <div>
                <p className="text-lg font-black tracking-tight text-white">PanelLakó</p>
                <p className="text-xs text-slate-400">Társasházi operációs központ</p>
              </div>
            </div>

            <nav className="space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <a key={item.href} href={item.href} className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white">
                    <Icon size={18} />
                    {item.label}
                  </a>
                );
              })}
            </nav>

            <div className="mt-auto rounded-3xl bg-white/8 p-4 ring-1 ring-white/10">
              <p className="text-xs uppercase tracking-wide text-slate-400">Aktív szerepkör</p>
              <p className="mt-1 font-bold text-white">{roleLabels[data.currentUser.role]}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {(['lako', 'megbizott', 'kozos_kepviselo'] as Role[]).map((role) => (
                  <Link key={role} href={`/?role=${role}`} className="rounded-full bg-white/10 px-2.5 py-1 text-slate-200 hover:bg-white/20">
                    {roleLabels[role]}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <main className="space-y-6 px-4 py-5 md:px-8 lg:px-10">
          <header className="flex flex-col gap-4 rounded-[2rem] border border-white/70 bg-white/80 p-4 shadow-[0_18px_70px_rgba(15,23,42,0.08)] backdrop-blur md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500">Teszt3</p>
              <h1 className="text-2xl font-black tracking-tight text-slate-950 md:text-3xl">Ház kiválasztása</h1>
              <p className="mt-1 text-sm text-slate-500">Adatforrás: {data.source === 'supabase' ? 'Supabase' : 'Mock/demo'} · Modern lakói és képviselői működés egy felületen.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 text-slate-400" size={18} />
                <input className="w-56 rounded-2xl border border-slate-200 bg-white px-10 py-2 text-sm outline-none transition focus:border-brand-400 focus:ring-4 focus:ring-brand-100" placeholder="Keresés..." />
              </div>
              <Link className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-slate-300 transition hover:-translate-y-0.5" href="/login">
                {isLoggedIn ? 'Session aktív' : 'Belépés'}
              </Link>
              {isLoggedIn ? (
                <button
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:border-brand-300"
                  onClick={async () => {
                    if (supabase) {
                      await supabase.auth.signOut();
                    }
                    setIsLoggedIn(false);
                  }}
                  type="button"
                >
                  <LogOut size={16} /> Kijelentkezés
                </button>
              ) : null}
            </div>
          </header>

          <section id="overview" className="overflow-hidden rounded-[2rem] bg-slate-950 text-white shadow-2xl shadow-slate-300/60">
            <div className="grid gap-6 p-6 md:grid-cols-[1.35fr_0.65fr] md:p-8">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-brand-100 ring-1 ring-white/10">
                  <Sparkles size={14} /> MVP+ feature refresh
                </div>
                <h2 className="max-w-3xl text-3xl font-black tracking-tight md:text-5xl">Panellakó, a társasházi app.</h2>
              
                <div className="mt-6 flex flex-wrap gap-3">
                  <a href="#tickets" className="rounded-2xl bg-brand-500 px-5 py-3 text-sm font-black text-white shadow-lg shadow-brand-950/20 hover:bg-brand-400">Új bejelentés</a>
                  <a href="#units" className="rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 hover:bg-slate-100">Albetétek nézete</a>
                </div>
              </div>
              <div className="rounded-[1.5rem] bg-white/10 p-5 ring-1 ring-white/10">
                <p className="text-sm font-bold text-brand-100">Feature lefedettség</p>
                <div className="mt-4 space-y-3 text-sm text-slate-200">
                  {['Hírek + push/email koncepció', 'Ticketing + SLA + vendor', 'Dokumentumtár + read receipt', 'Pénzügy + hátraléklista', 'Közgyűlés + szavazás előkészítés'].map((item) => (
                    <div key={item} className="flex items-center gap-2"><CheckCircle2 className="text-brand-300" size={16} /> {item}</div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard title="Nyitott ügyek" value={String(openTicketCount)} subtitle="Ticketek, SLA és felelős kijelölés" icon={<Wrench size={24} />} />
            <MetricCard title="Hátralék" value={formatCurrency(arrears)} subtitle="Lakói pénzügyi átláthatóság" icon={<CircleDollarSign size={24} />} tone="amber" />
            <MetricCard title="Olvasatlan értesítés" value={String(unreadNotificationCount)} subtitle="Push/e-mail és olvasottsági visszajelzés" icon={<BellRing size={24} />} tone="violet" />
            <MetricCard title="Albetétek" value={String(data.units.length)} subtitle={`${totalArea} m² · ${totalOwnershipShare} tulajdoni hányad`} icon={<Layers3 size={24} />} tone="slate" />
          </section>

          <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <SectionCard id="profile" title="Profil adatok és címkereső" icon={<UserRound size={18} />}>
              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  setProfileSaved(true);
                }}
              >
                <div className="grid gap-3 md:grid-cols-2">
                  <input required className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100" placeholder="Teljes név" value={name} onChange={(e) => setName(e.target.value)} />
                  <input className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100" placeholder="Lakás (pl. A/12)" value={unit} onChange={(e) => setUnit(e.target.value)} />
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                  <label className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700"><MapPin size={16} className="text-brand-600" /> Címkeresés saját GeoData adatbázisból</label>
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100"
                    placeholder="Kezdj el címet írni (pl. Budapest Gidófalvy Lajos utca 9)"
                    value={addressQuery}
                    onChange={(e) => {
                      setAddressQuery(e.target.value);
                      setAddress(e.target.value);
                    }}
                  />
                  {isAddressLoading ? <p className="mt-2 text-xs text-slate-500">Címek keresése...</p> : null}
                  {addressError ? <p className="mt-2 rounded-2xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">{addressError}</p> : null}
                  {addressOptions.length > 0 ? (
                    <ul className="mt-3 space-y-1 rounded-2xl border border-slate-100 bg-white p-2 shadow-sm">
                      {addressOptions.map((option) => (
                        <li key={option}>
                          <button
                            className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-brand-50 hover:text-brand-800"
                            type="button"
                            onClick={() => {
                              setAddress(option);
                              setAddressQuery(option);
                              setAddressOptions([]);
                            }}
                          >
                            {option}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {address ? <p className="mt-2 text-xs text-slate-600">Kiválasztott cím: {address}</p> : null}
                </div>

                <button className="rounded-2xl bg-brand-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-brand-100 hover:bg-brand-700">Profil mentése</button>
                {profileSaved ? <p className="text-sm font-semibold text-emerald-700">Profiladatok mentve demo módban.</p> : null}
              </form>
            </SectionCard>

            <SectionCard id="tasks" title="Teendők és gyors műveletek" icon={<ClipboardCheck size={18} />}>
              <div className="grid gap-3 md:grid-cols-3">
                {tasks.map((task) => (
                  <article key={task.id} className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
                    <div className={`mb-3 inline-flex rounded-full px-3 py-1 text-xs font-black ${task.tone}`}>{task.meta}</div>
                    <p className="font-bold text-slate-950">{task.title}</p>
                    <button className="mt-4 inline-flex items-center gap-1 text-xs font-black text-brand-700" type="button">Megnyitás <ChevronRight size={14} /></button>
                  </article>
                ))}
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                <a className="rounded-2xl bg-slate-950 px-4 py-3 text-center text-sm font-black text-white" href="#tickets">Ticket queue</a>
                <a className="rounded-2xl bg-brand-600 px-4 py-3 text-center text-sm font-black text-white" href="#documents">Dokumentumtár</a>
                <a className="rounded-2xl bg-white px-4 py-3 text-center text-sm font-black text-slate-800 ring-1 ring-slate-200" href="#meetings">Közgyűlés</a>
              </div>
            </SectionCard>
          </section>

          <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <SectionCard id="tickets" title="Hibabejelentés és ticketing" icon={<Siren size={18} />}>
              <form className="space-y-3" onSubmit={submitTicket}>
                <input required className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100" placeholder="Rövid cím" value={ticketTitle} onChange={(e) => setTicketTitle(e.target.value)} />
                <textarea required className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100" placeholder="Leírás, fotó/melléklet helye későbbi storage integrációhoz" rows={3} value={ticketDescription} onChange={(e) => setTicketDescription(e.target.value)} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <input required className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100" placeholder="Helyszín (pl. A/12 vagy lépcsőház)" value={ticketLocation} onChange={(e) => setTicketLocation(e.target.value)} />
                  <select className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100" value={ticketPriority} onChange={(e) => setTicketPriority(e.target.value as Ticket['priority'])}>
                    <option value="kozepes">közepes</option>
                    <option value="magas">magas</option>
                    <option value="kritikus">kritikus</option>
                    <option value="alacsony">alacsony</option>
                  </select>
                </div>
                <button className="rounded-2xl bg-brand-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-brand-100 hover:bg-brand-700">Bejelentés rögzítése</button>
                {ticketSaved ? <p className="text-sm font-semibold text-emerald-700">A ticket mentése demo módban sikeres, megjelent a listában.</p> : null}
              </form>
            </SectionCard>

            <SectionCard
              title="Ticket queue"
              icon={<TicketCheck size={18} />}
              action={
                <select className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold" value={ticketFilter} onChange={(e) => setTicketFilter(e.target.value as Ticket['status'] | 'osszes')}>
                  <option value="osszes">Összes</option>
                  <option value="uj">Új</option>
                  <option value="folyamatban">Folyamatban</option>
                  <option value="varakozik">Várakozik</option>
                  <option value="lezarva">Lezárva</option>
                </select>
              }
            >
              <div className="space-y-3">
                {visibleTickets.map((ticket) => (
                  <article key={ticket.id} className="rounded-3xl border border-slate-100 bg-slate-50/70 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-slate-950">{ticket.title}</p>
                        <p className="mt-1 text-sm text-slate-600">{ticket.description}</p>
                      </div>
                      <div className="flex flex-wrap gap-2"><StatusBadge status={ticket.status} /><PriorityBadge priority={ticket.priority} /></div>
                    </div>
                    <p className="mt-3 text-xs font-medium text-slate-500">Helyszín: {ticket.location} · Beküldte: {ticket.submitted_by || 'Ismeretlen'} {ticket.unit_label ? `(${ticket.unit_label})` : ''} · Frissítve: {formatDateTime(ticket.updated_at)}</p>
                    {isManager ? (
                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-bold hover:border-brand-400" onClick={() => updateTicketStatus(ticket.id, 'folyamatban')} type="button">Folyamatban</button>
                        <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-bold hover:border-violet-400" onClick={() => updateTicketStatus(ticket.id, 'varakozik')} type="button">Várakozik</button>
                        <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-bold hover:border-emerald-400" onClick={() => updateTicketStatus(ticket.id, 'lezarva')} type="button">Lezárás</button>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            </SectionCard>
          </section>

          <SectionCard id="units" title="Albetétek – OnlineHáz-szerű táblázatos master data" icon={<Building2 size={18} />} action={<input value={unitSearch} onChange={(e) => setUnitSearch(e.target.value)} className="rounded-2xl border border-slate-200 px-4 py-2 text-sm" placeholder="Albetét / tulajdonos keresés" />}>
            <div className="mb-4 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-600">
              Az összes albetét területe: {totalArea} m², tulajdoni hányada: {totalOwnershipShare}
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-3 py-3">Cím</th>
                    <th className="px-3 py-3">Tulajdonos</th>
                    <th className="px-3 py-3">Típus</th>
                    <th className="px-3 py-3">Σm²</th>
                    <th className="px-3 py-3">ΣTh</th>
                    <th className="px-3 py-3">Egyenleg</th>
                    <th className="px-3 py-3">Vízóra</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleUnits.map((unitItem) => (
                    <tr key={unitItem.id} className="hover:bg-brand-50/50">
                      <td className="px-3 py-4 font-bold text-slate-800">{unitItem.unit_label}</td>
                      <td className="px-3 py-4 text-slate-600">{unitItem.owner_name}</td>
                      <td className="px-3 py-4 text-slate-600">{unitItem.unit_type}</td>
                      <td className="px-3 py-4 text-slate-600">{numberOrZero(unitItem.area_m2)} m²</td>
                      <td className="px-3 py-4 text-slate-600">{numberOrZero(unitItem.ownership_share)}</td>
                      <td className={`px-3 py-4 font-bold ${numberOrZero(unitItem.balance_amount) < 0 ? 'text-rose-600' : 'text-emerald-700'}`}>{formatCurrency(unitItem.balance_amount)}</td>
                      <td className="px-3 py-4">{unitItem.has_water_meter ? <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700">igen</span> : <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-500">nem</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <section className="grid gap-6 xl:grid-cols-3">
            <SectionCard id="documents" title="Dokumentumtár" icon={<FileText size={18} />} action={<select value={documentFilter} onChange={(e) => setDocumentFilter(e.target.value)} className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold">{documentCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select>}>
              <div className="space-y-3">
                {visibleDocuments.map((item) => (
                  <article key={item.id} className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-black text-slate-950">{item.title}</p>
                        <p className="mt-1 text-xs font-medium text-slate-500">{item.category} · {item.version} · {formatDate(item.uploaded_at)} · {item.visibility || 'Mindenki'}</p>
                      </div>
                      {item.acknowledged_at ? <CheckCircle2 className="text-emerald-500" size={18} /> : <AlertTriangle className="text-amber-500" size={18} />}
                    </div>
                    <button className="mt-3 rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white" type="button">Megnyitás</button>
                  </article>
                ))}
              </div>
            </SectionCard>

            <SectionCard id="finances" title="Pénzügyi átláthatóság" icon={<CircleDollarSign size={18} />}>
              <p className="mb-4 text-sm text-slate-500">Összesen: {formatCurrency(totalDue)} · Befizetve: {formatCurrency(totalPaid)} · Hátralék: {formatCurrency(arrears)}</p>
              <div className="mb-4 h-3 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-cyan-400" style={{ width: `${Math.min((totalPaid / Math.max(totalDue, 1)) * 100, 100)}%` }} />
              </div>
              <ul className="space-y-2 text-sm">
                {data.finances.map((entry) => (
                  <li key={entry.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
                    <p className="font-bold text-slate-900">{entry.period}</p>
                    <p className="text-slate-500">Esedékes: {formatCurrency(entry.expected_amount)} · Befizetve: {formatCurrency(entry.paid_amount)} · Határidő: {formatDate(entry.due_date)}</p>
                  </li>
                ))}
              </ul>
            </SectionCard>

            <SectionCard id="meters" title="Mérőóra diktálás" icon={<Gauge size={18} />}>
              <form className="mb-4 space-y-3" onSubmit={(e) => { e.preventDefault(); setMeterSaved(true); }}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <select className="rounded-2xl border border-slate-200 px-3 py-2 text-sm"><option>viz</option><option>gaz</option><option>villany</option></select>
                  <input type="number" step="0.01" required className="rounded-2xl border border-slate-200 px-3 py-2 text-sm" placeholder="Érték" />
                </div>
                <input type="date" required className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm" />
                <button className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-black text-white hover:bg-slate-700">Óraállás elküldése</button>
                {meterSaved ? <p className="text-sm font-semibold text-emerald-700">Óraállás rögzítve demo módban.</p> : null}
              </form>
              <ul className="space-y-2 text-sm">
                {data.meterReadings.map((reading) => <li key={reading.id} className="rounded-2xl bg-slate-50 p-3"><b>{reading.unit_label}</b> · {reading.meter_type} · {reading.value} · {formatDate(reading.reading_date)}</li>)}
              </ul>
            </SectionCard>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <SectionCard id="meetings" title="Közgyűlés, határozatok és szavazás" icon={<Vote size={18} />}>
              <div className="space-y-3">
                {data.meetings.map((meeting) => (
                  <article key={meeting.id} className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-black text-slate-950">{meeting.title}</p>
                        <p className="mt-1 text-sm text-slate-500">{formatDateTime(meeting.scheduled_at)} · határozatok: {meeting.resolution_count}</p>
                        {meeting.agenda_preview ? <p className="mt-2 text-sm text-slate-600">Napirend: {meeting.agenda_preview}</p> : null}
                      </div>
                      <StatusBadge status={meeting.status} />
                    </div>
                    <div className="mt-3 grid gap-2 text-xs font-bold sm:grid-cols-3">
                      <button className="rounded-xl bg-brand-50 px-3 py-2 text-brand-700" type="button">Meghívó</button>
                      <button className="rounded-xl bg-violet-50 px-3 py-2 text-violet-700" type="button">Szavazás</button>
                      <button className="rounded-xl bg-slate-100 px-3 py-2 text-slate-700" type="button">Határozatok</button>
                    </div>
                  </article>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Vendor / work order workflow" icon={<LifeBuoy size={18} />}>
              <div className="mb-4 grid gap-3 md:grid-cols-3">
                {data.vendors.map((vendor) => (
                  <article key={vendor.id} className="rounded-3xl bg-slate-50 p-4">
                    <p className="font-black text-slate-950">{vendor.name}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{vendor.category}</p>
                    <p className="mt-2 text-xs text-slate-500">SLA: {vendor.sla_hours} óra</p>
                  </article>
                ))}
              </div>
              <div className="space-y-2">
                {data.workOrders.map((workOrder) => (
                  <article key={workOrder.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white p-3 text-sm">
                    <div>
                      <p className="font-bold text-slate-900">{workOrder.ticket_title}</p>
                      <p className="text-slate-500">{workOrder.vendor_name} · {formatDate(workOrder.due_date)} · {formatCurrency(workOrder.cost_estimate)}</p>
                    </div>
                    <StatusBadge status={workOrder.status} />
                  </article>
                ))}
              </div>
            </SectionCard>
          </section>

          <section className="grid gap-6 xl:grid-cols-3">
            <SectionCard title="Hírfolyam" icon={<BellRing size={18} />}>
              <ul className="space-y-3">
                {data.news.map((item) => {
                  const expanded = expandedNews.includes(item.id);
                  return (
                    <li key={item.id} className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
                      <p className="font-black text-slate-950">{item.title}</p>
                      <p className="mt-1 text-sm text-slate-600">{expanded ? item.content : previewText(item.content)}</p>
                      <p className="mt-2 text-xs text-slate-400">{newsCategoryLabels[item.category || 'egyeb']} · {item.source_label || item.created_by_name || 'Ismeretlen forrás'} · {formatDateTime(item.created_at)}</p>
                      <button type="button" className="mt-2 text-xs font-black text-brand-700 hover:underline" onClick={() => setExpandedNews((prev) => (prev.includes(item.id) ? prev.filter((newsId) => newsId !== item.id) : [...prev, item.id]))}>
                        {expanded ? 'Összecsukás' : 'Teljes hír megnyitása'}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </SectionCard>

            <SectionCard title="Értesítési napló" icon={<UserCog size={18} />}>
              <ul className="space-y-3">
                {data.notifications.map((item) => <li key={item.id} className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><p className="font-black text-slate-950">{item.title}</p>{item.read_at ? <CheckCircle2 className="text-emerald-500" size={16} /> : <span className="rounded-full bg-rose-50 px-2 py-1 text-xs font-bold text-rose-700">új</span>}</div><p className="mt-1 text-sm text-slate-600">{item.message}</p><p className="mt-2 text-xs text-slate-400">{item.audience} · {item.channel} · {formatDateTime(item.created_at)}</p></li>)}
              </ul>
            </SectionCard>

            <SectionCard id="knowledge" title="Tudásbázis / kihez forduljak?" icon={<BookOpen size={18} />}>
              <ul className="space-y-3">
                {data.kbArticles.map((article) => (
                  <li key={article.id} className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
                    <p className="text-xs font-black uppercase tracking-wide text-brand-700">{article.topic}</p>
                    <p className="mt-1 font-black text-slate-950">{article.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{article.body}</p>
                    <p className="mt-2 text-xs text-slate-400">Célcsoport: {article.audience}</p>
                  </li>
                ))}
              </ul>
            </SectionCard>
          </section>

          <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            {isAdminLike ? (
              <SectionCard title="Célzott kommunikáció / hírküldés" icon={<Megaphone size={18} />}>
                <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); setNoticeSaved(true); }}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input required className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Értesítés címe" />
                    <input required className="rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Célcsoport (pl. B lépcsőház)" />
                  </div>
                  <textarea required className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" rows={4} placeholder="Üzenet" />
                  <button className="rounded-2xl bg-brand-600 px-5 py-3 text-sm font-black text-white hover:bg-brand-700">Kiküldés előkészítése</button>
                  {noticeSaved ? <p className="text-sm font-semibold text-emerald-700">Értesítés mentve és kiküldésre jelölve demo módban.</p> : null}
                </form>
              </SectionCard>
            ) : (
              <SectionCard title="Lakói kapcsolat" icon={<MessageSquare size={18} />}>
                <p className="text-sm leading-6 text-slate-600">Lakói szerepkörben a célzott kommunikáció olvasási és visszajelzési nézete látszik. Képviselői vagy megbízotti szerepkörre váltva megjelenik a hírküldő űrlap is.</p>
              </SectionCard>
            )}

            <SectionCard id="audit" title="Audit napló" icon={<ShieldCheck size={18} />}>
              <div className="space-y-3">
                {data.auditLogs.map((log) => (
                  <article key={log.id} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-sm">
                    <div className="mt-1 rounded-full bg-brand-100 p-2 text-brand-700"><ShieldCheck size={14} /></div>
                    <div>
                      <p className="font-bold text-slate-950">{log.actor_name} · {log.action_type}</p>
                      <p className="text-slate-500">{log.entity_type}: {log.entity_label} · {formatDateTime(log.created_at)}</p>
                    </div>
                  </article>
                ))}
              </div>
            </SectionCard>
          </section>
        </main>
      </div>
    </div>
  );
}
