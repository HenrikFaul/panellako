'use client';

import Link from 'next/link';
import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BellRing,
  BookOpen,
  Building2,
  Bus,
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
  Mail,
  MapPin,
  Radio,
  MessageSquare,
  Search,
  Send,
  ShieldCheck,
  Siren,
  Sparkles,
  Terminal,
  TicketCheck,
  UserCog,
  UserRound,
  Vote,
  Wind,
  Wrench,
  X
} from 'lucide-react';
import {
  AiCategory,
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
import { createClient, hasSupabaseConfig } from '@/lib/supabase/browser';
import { createTicket as createTicketAction, updateTicketStatus as updateTicketStatusAction, updateTicketAiOverride as updateTicketAiOverrideAction } from '@/app/actions/tickets';
import { submitMeterReading as submitMeterReadingAction } from '@/app/actions/meter-readings';
import { acknowledgeAnnouncement as acknowledgeAnnouncementAction } from '@/app/actions/announcements';
import { sendContactMessage } from '@/app/actions/contact';
import type { ContactSubject } from '@/app/actions/contact';
import WeatherWidget from '@/components/weather-widget';
import AirQualityWidget from '@/components/air-quality-widget';
import EnergyDashboard from '@/components/energy-dashboard';
import TransportPanel from '@/components/transport-panel';

// Defined here (not imported from server action file) to avoid 'use server' serialization issues
const CONTACT_SUBJECTS: ContactSubject[] = ['Ajánlatkérés', 'Érdeklődés', 'Hibabejelentés', 'Visszajelzés', 'Partnerség', 'Egyéb'];
import { acknowledgeDocument as acknowledgeDocumentAction, uploadDocument as uploadDocumentAction, getDocumentSignedUrl as getDocumentSignedUrlAction, deleteDocument as deleteDocumentAction, updateDocument as updateDocumentAction } from '@/app/actions/documents';
import { updateWorkOrderStatus as updateWorkOrderStatusAction } from '@/app/actions/work-orders';
// votes action imported on-demand in the votes tab handler
import { createCharge as createChargeAction, recordPayment as recordPaymentAction } from '@/app/actions/finance';
import { createMeeting as createMeetingAction, closeMeeting as closeMeetingAction, sendAssemblyInvitation as sendInvitationAction, getMeetingWithDetails } from '@/app/actions/meetings';
import MeetingDetailPanel from '@/components/meeting-detail-panel';
import AnnouncementComposer from '@/components/announcement-composer';
import DashboardHeroScene, { detectTimeOfDay as heroDetectTod, skyGradient as heroSkyGradient, type TimeOfDay as HeroTimeOfDay } from '@/components/dashboard-hero-scene';
import HeroVehicle from '@/components/HeroVehicle';

// v0.7.14 — Magyarország-szintű címkereső eredmény-shape
// (api/location/autocomplete válasz egy eleme)
type AddressOption = {
  id: string;
  label: string;
  countryCode?: string;
  postcode?: string;
  settlement?: string;
  street?: string;
  district?: string;
  houseNumber?: string;
  lat: number | null;
  lon: number | null;
  source: 'supabase' | 'nominatim';
  confidence?: number;
};

type DashboardData = {
  source: string;
  buildingId?: string;
  buildingName?: string;
  buildingAddress?: string;
  buildingLat?: number;
  buildingLon?: number;
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
    scope?: string;
    priority?: string;
    deadline?: string | null;
    requires_acknowledgement?: boolean;
    read_at?: string | null;
    read_count?: number;
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
  { href: '#transport', label: 'Közlekedés', icon: Bus },
  { href: `#kornyezet-link`, label: 'Levegő & Kerékpár', icon: Wind },
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

// ─── Activity Calendar ────────────────────────────────────────────────────────
const HU_MONTHS = ['jan.','feb.','már.','ápr.','máj.','jún.','júl.','aug.','szept.','okt.','nov.','dec.'];

type EventScope    = 'building' | 'unit' | 'manager';
type EventCategory = 'ticket' | 'meeting' | 'meter' | 'vote';

interface CalendarEvent {
  date:       string;        // YYYY-MM-DD
  title:      string;
  category:   EventCategory;
  scope:      EventScope;
  unitLabel?: string;
}

const CAT_CFG: Record<EventCategory, { label: string; color: string; scopeLabel: string }> = {
  ticket:  { label: 'Hibabejelentés',    color: '#f43f5e', scopeLabel: '🏠 Albetét' },
  meeting: { label: 'Közgyűlés',         color: '#3b82f6', scopeLabel: '🏢 Épület'  },
  meter:   { label: 'Mérőóra határidő',  color: '#10b981', scopeLabel: '🏢 Épület'  },
  vote:    { label: 'Szavazás',          color: '#f59e0b', scopeLabel: '🏢 Épület'  },
};
const SCOPE_LABEL: Record<EventScope, string> = {
  building: '🏢 Épület', unit: '🏠 Albetét', manager: '👤 Közös képviselő',
};

// Generate meter-reading deadlines: 20th of each visible month (building-wide)
function meterDeadlines(viewStart: Date, weeks: number): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const seen = new Set<string>();
  for (let w = 0; w < weeks * 7; w++) {
    const d = new Date(viewStart);
    d.setDate(viewStart.getDate() + w);
    if (d.getDate() === 20) {
      const key = d.toISOString().slice(0, 10);
      if (!seen.has(key)) {
        seen.add(key);
        events.push({ date: key, title: 'Mérőóra lejelentési határidő', category: 'meter', scope: 'building' });
      }
    }
  }
  return events;
}

interface ActivityCalendarProps {
  tickets:  Array<{ created_at?: string; title?: string; unit_label?: string }>;
  meetings: Array<{ scheduled_at: string; title: string; status: string; agenda_preview?: string }>;
  currentUnit?: string;
}

function ActivityCalendar({ tickets, meetings, currentUnit }: ActivityCalendarProps) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [hovered, setHovered]       = useState<string | null>(null);
  const [mousePos, setMousePos]     = useState({ x: 0, y: 0 });

  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const todayKey = today.toISOString().slice(0, 10);

  // Monday of current real week
  const dow = today.getDay();
  const thisMon = new Date(today);
  thisMon.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
  thisMon.setHours(0, 0, 0, 0);

  // View starts at: this Monday + weekOffset weeks
  const viewStart = new Date(thisMon);
  viewStart.setDate(thisMon.getDate() + weekOffset * 7);

  // Build unified event list from all sources
  const allEvents: CalendarEvent[] = [];

  // Tickets → unit scope (or building if no unit)
  for (const t of tickets) {
    if (!t.created_at) continue;
    const key = new Date(t.created_at).toISOString().slice(0, 10);
    allEvents.push({
      date:      key,
      title:     t.title ?? 'Hibabejelentés',
      category:  'ticket',
      scope:     t.unit_label ? 'unit' : 'building',
      unitLabel: t.unit_label,
    });
  }

  // Meetings + votes → building scope
  for (const m of meetings) {
    if (!m.scheduled_at) continue;
    const key = new Date(m.scheduled_at).toISOString().slice(0, 10);
    const isVote = m.agenda_preview?.toLowerCase().includes('szavaz') ?? false;
    allEvents.push({
      date:     key,
      title:    m.title,
      category: isVote ? 'vote' : 'meeting',
      scope:    'building',
    });
  }

  // Meter deadlines (20th of each visible month) → building scope
  allEvents.push(...meterDeadlines(viewStart, 7));

  // Group by date
  const eventMap = new Map<string, CalendarEvent[]>();
  for (const ev of allEvents) {
    eventMap.set(ev.date, [...(eventMap.get(ev.date) ?? []), ev]);
  }

  // Build 7 weeks × 7 days = 49 cells
  const cells: Array<{ key: string; events: CalendarEvent[]; date: Date; isFuture: boolean; isToday: boolean }> = [];
  for (let i = 0; i < 49; i++) {
    const d = new Date(viewStart);
    d.setDate(viewStart.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    cells.push({
      key,
      events:   eventMap.get(key) ?? [],
      date:     d,
      isFuture: d > today,
      isToday:  key === todayKey,
    });
  }

  // Dominant category determines cell background (past days)
  const CAT_ORDER: EventCategory[] = ['ticket', 'vote', 'meeting', 'meter'];
  function dominantCat(events: CalendarEvent[]): EventCategory | null {
    for (const cat of CAT_ORDER) {
      if (events.some(e => e.category === cat)) return cat;
    }
    return null;
  }

  const pastTicketMax = Math.max(1, ...cells.filter(c => !c.isFuture).map(c => c.events.filter(e => e.category === 'ticket').length));

  function cellBg(cell: typeof cells[0]): string {
    if (cell.isToday && cell.events.length === 0) return 'bg-white/[0.12] ring-1 ring-white/20';
    if (cell.isFuture) {
      // Future: show upcoming events with a soft highlight
      const cat = dominantCat(cell.events);
      if (!cat) return 'bg-white/[0.03] opacity-40';
      return 'bg-white/[0.06] opacity-70';
    }
    if (cell.events.length === 0) return 'bg-white/[0.06]';
    const cat = dominantCat(cell.events);
    if (cat === 'ticket') {
      const n = cell.events.filter(e => e.category === 'ticket').length;
      const v = n / pastTicketMax;
      if (v < 0.2)  return 'bg-rose-950/70';
      if (v < 0.4)  return 'bg-rose-800/75';
      if (v < 0.65) return 'bg-rose-600/80';
      if (v < 0.85) return 'bg-rose-500';
      return 'bg-rose-400 shadow-[0_0_6px_rgba(251,113,133,0.7)]';
    }
    if (cat === 'vote')    return 'bg-amber-500/70';
    if (cat === 'meeting') return 'bg-blue-600/70';
    return 'bg-emerald-600/60';
  }

  // Colored dot indicators per category present on a cell
  function cellDots(cell: typeof cells[0]) {
    const cats = Array.from(new Set(cell.events.map(e => e.category)));
    return cats.map(cat => (
      <span
        key={cat}
        className="inline-block h-1 w-1 rounded-full shrink-0"
        style={{ backgroundColor: CAT_CFG[cat].color }}
      />
    ));
  }

  // Row labels
  const weeks = Array.from({ length: 7 }, (_, w) => {
    const mon = new Date(viewStart);
    mon.setDate(viewStart.getDate() + w * 7);
    const isCurrentWeek = mon.toISOString().slice(0, 10) === thisMon.toISOString().slice(0, 10);
    return { mon, label: `${HU_MONTHS[mon.getMonth()]} ${mon.getDate()}`, isCurrentWeek };
  });

  const DAYS = ['H', 'K', 'Sz', 'Cs', 'P', 'Szo', 'V'];

  function formatDate(d: Date) {
    return `${d.getFullYear()}. ${HU_MONTHS[d.getMonth()]} ${d.getDate()}.`;
  }

  const hoveredCell   = hovered ? cells.find(c => c.key === hovered) : undefined;
  const hoveredEvents = hoveredCell?.events ?? [];

  // Group tooltip events by category for display
  const byCategory = CAT_ORDER.reduce<Partial<Record<EventCategory, CalendarEvent[]>>>((acc, cat) => {
    const evs = hoveredEvents.filter(e => e.category === cat);
    if (evs.length) acc[cat] = evs;
    return acc;
  }, {});

  const TT_W = 240;

  return (
    <div className="flex flex-col h-full select-none">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Aktivitás naptár</p>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setWeekOffset(o => o - 1)}
            className="flex h-5 w-5 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-white/10 hover:text-slate-300"
            title="Korábbi hetek"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M7 1L3 5l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          {weekOffset !== 0 && (
            <button
              onClick={() => setWeekOffset(0)}
              className="rounded-md px-1.5 py-0.5 text-[8px] font-bold text-slate-500 transition-colors hover:bg-white/10 hover:text-slate-300"
            >
              ma
            </button>
          )}
          <button
            onClick={() => setWeekOffset(o => o + 1)}
            className="flex h-5 w-5 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-white/10 hover:text-slate-300"
            title="Következő hetek"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M3 1l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        {/* Week row labels */}
        <div className="flex flex-col gap-1.5 pt-5">
          {weeks.map((w) => (
            <div key={w.mon.toISOString()} className="h-7 flex items-center">
              <span className={`text-[8px] whitespace-nowrap leading-none ${w.isCurrentWeek ? 'font-bold text-slate-400' : 'text-slate-700'}`}>
                {w.label}
              </span>
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="flex-1">
          <div className="mb-1.5 grid grid-cols-7 gap-1.5">
            {DAYS.map((d) => (
              <span key={d} className="text-center text-[9px] text-slate-600 font-bold">{d}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {cells.map((cell) => (
              <div
                key={cell.key}
                onMouseEnter={(e) => { setHovered(cell.key); setMousePos({ x: e.clientX, y: e.clientY }); }}
                onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
                onMouseLeave={() => setHovered(null)}
                className={`h-7 w-full rounded transition-colors cursor-pointer relative flex flex-col items-center justify-end pb-0.5 gap-px ${cellBg(cell)}`}
              >
                {cell.date.getDate() === 1 && (
                  <span className="absolute top-0.5 left-0.5 text-[6px] text-white/40 font-bold leading-none">
                    {HU_MONTHS[cell.date.getMonth()]}
                  </span>
                )}
                {cell.events.length > 0 && (
                  <div className="flex gap-px justify-center flex-wrap px-0.5">
                    {cellDots(cell)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        {(Object.entries(CAT_CFG) as [EventCategory, typeof CAT_CFG[EventCategory]][]).map(([cat, cfg]) => (
          <div key={cat} className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-sm shrink-0" style={{ backgroundColor: cfg.color }} />
            <span className="text-[8px] text-slate-600">{cfg.label}</span>
          </div>
        ))}
      </div>

      {/* Fixed-position tooltip */}
      {hovered && hoveredCell && (
        <div
          className="pointer-events-none fixed z-[9999] rounded-2xl border border-white/10 bg-slate-900 p-3 shadow-2xl"
          style={{
            width: TT_W,
            left: Math.min(mousePos.x - TT_W / 2, (typeof window !== 'undefined' ? window.innerWidth : 1200) - TT_W - 8),
            top: mousePos.y - 130,
          }}
        >
          <p className="mb-2 text-[10px] font-bold text-slate-200">{formatDate(hoveredCell.date)}</p>
          {hoveredEvents.length === 0 ? (
            hoveredCell.isFuture
              ? <p className="text-[9px] italic text-slate-600">Nincs tervezett esemény.</p>
              : <p className="text-[9px] text-slate-600">Nincs aktivitás ezen a napon.</p>
          ) : (
            <div className="space-y-2">
              {(Object.entries(byCategory) as [EventCategory, CalendarEvent[]][]).map(([cat, evs]) => (
                <div key={cat}>
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="inline-block h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: CAT_CFG[cat].color }} />
                    <span className="text-[9px] font-bold" style={{ color: CAT_CFG[cat].color }}>{CAT_CFG[cat].label}</span>
                    <span className="text-[8px] text-slate-600 ml-auto">{CAT_CFG[cat].scopeLabel}</span>
                  </div>
                  <ul className="space-y-0.5 pl-2.5">
                    {evs.slice(0, 4).map((ev, i) => (
                      <li key={i} className="flex items-start gap-1 text-[9px] text-slate-300 leading-tight">
                        <span className="shrink-0 text-slate-600">·</span>
                        <span>
                          {ev.title}
                          {ev.unitLabel && (
                            <span className="ml-1 text-[8px] text-slate-500">({ev.unitLabel})</span>
                          )}
                        </span>
                      </li>
                    ))}
                    {evs.length > 4 && (
                      <li className="text-[8px] text-slate-600 pl-2">+ {evs.length - 4} további…</li>
                    )}
                  </ul>
                </div>
              ))}
            </div>
          )}
          {hoveredCell.isFuture && hoveredEvents.length > 0 && (
            <p className="mt-1.5 text-[8px] text-slate-600 italic">Közelgő esemény</p>
          )}
          {currentUnit && hoveredEvents.some(e => e.scope === 'unit') && (
            <p className="mt-1.5 text-[8px] text-slate-500">{SCOPE_LABEL.unit}: {currentUnit}</p>
          )}
        </div>
      )}
    </div>
  );
}

function numberOrZero(value: number | string | null | undefined) {
  return Number(value ?? 0);
}

// ─── Panel skyline illustration · v3 · architectural detail ──────────────────
function PanelSkylineSvg() {
  type Building = {
    x: number; top: number; w: number; cols: number; rows: number;
    chimneys: number[];
    antenna?: boolean;
  };
  const buildings: Building[] = [
    { x: 4,   top: 29, w: 86,  cols: 4, rows: 6, chimneys: [16, 58] },
    { x: 94,  top: 3,  w: 122, cols: 6, rows: 8, chimneys: [16, 56, 100], antenna: true },
    { x: 220, top: 16, w: 104, cols: 5, rows: 7, chimneys: [18, 80] },
    { x: 328, top: 42, w: 86,  cols: 4, rows: 5, chimneys: [14, 62] },
  ];
  const GROUND = 118;
  const winW = 12; const winH = 8;
  const gapX = 6;  const gapY = 5;
  const padX = 10; const padTop = 10;

  const windows = buildings.flatMap((b, bi) =>
    Array.from({ length: b.rows }, (_, r) =>
      Array.from({ length: b.cols }, (_, c) => {
        const seed = bi * 37 + r * 17 + c * 11;
        const lit  = seed % 10 < 7;
        const warm = (seed * 3) % 10 < 8;
        const wx   = b.x + padX + c * (winW + gapX);
        const wy   = b.top + padTop + r * (winH + gapY);
        return { wx, wy, lit, warm };
      })
    ).flat()
  );

  return (
    <svg
      viewBox="0 -20 418 138"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="sky-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#010610" />
          <stop offset="40%"  stopColor="#040e24" />
          <stop offset="75%"  stopColor="#08193a" />
          <stop offset="100%" stopColor="#0d2248" />
        </linearGradient>
        <radialGradient id="sun-glow" cx="50%" cy="115%" r="35%">
          <stop offset="0%"   stopColor="#1a4a8a" stopOpacity="0.5" />
          <stop offset="60%"  stopColor="#0e2e5e" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#0e2e5e" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="bld-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#10182a" />
          <stop offset="100%" stopColor="#070a14" />
        </linearGradient>
        <linearGradient id="rim" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#4a7ab5" stopOpacity="0" />
          <stop offset="100%" stopColor="#4a7ab5" stopOpacity="0.4" />
        </linearGradient>
      </defs>

      {/* Sky — covers extended viewBox */}
      <rect x="0" y="-20" width="418" height="138" fill="url(#sky-grad)" />
      {/* City horizon glow */}
      <ellipse cx="209" cy="138" rx="200" ry="48" fill="url(#sun-glow)" />
      {/* Atmospheric haze */}
      <rect x="0" y="60" width="418" height="1"   fill="#4a7ab5" fillOpacity="0.08" />
      <rect x="0" y="78" width="418" height="1.5" fill="#4a7ab5" fillOpacity="0.06" />
      {/* Stars */}
      <circle cx="30"  cy="8"  r="0.8" fill="#c8dff5" fillOpacity="0.7" />
      <circle cx="75"  cy="5"  r="1.0" fill="#d8e8ff" fillOpacity="0.8" />
      <circle cx="145" cy="10" r="0.7" fill="#c8dff5" fillOpacity="0.6" />
      <circle cx="200" cy="4"  r="0.9" fill="#d8e8ff" fillOpacity="0.75" />
      <circle cx="280" cy="7"  r="0.6" fill="#c8dff5" fillOpacity="0.5" />
      <circle cx="340" cy="12" r="0.8" fill="#d8e8ff" fillOpacity="0.7" />
      <circle cx="390" cy="6"  r="1.0" fill="#c8dff5" fillOpacity="0.8" />
      {/* Moon */}
      <circle cx="362" cy="18" r="5"   fill="#d4e8ff" fillOpacity="0.12" />
      <circle cx="362" cy="18" r="2.2" fill="#e8f4ff" fillOpacity="0.9" />

      {/* Buildings with architectural detail */}
      {buildings.map((b, bi) => {
        const bH = GROUND - b.top;
        // Pilasters: left edge, between each window col, right edge
        const pilasters = [
          b.x + 1,
          ...Array.from({ length: b.cols - 1 }, (_, c) =>
            b.x + padX + (c + 1) * (winW + gapX) - 3
          ),
          b.x + b.w - 4,
        ];
        // Slab joints between every row of windows
        const slabs = Array.from({ length: b.rows - 1 }, (_, r) =>
          b.top + padTop + (r + 1) * (winH + gapY) - 2.5
        );
        return (
          <g key={`bld-${bi}`}>
            {/* Body */}
            <rect x={b.x} y={b.top} width={b.w} height={bH} fill="url(#bld-grad)" rx="1.5" />
            {/* Vertical pilasters */}
            {pilasters.map((px, pi) => (
              <rect key={`p-${bi}-${pi}`} x={px} y={b.top} width={3} height={bH} fill="#14202e" rx="0.5" />
            ))}
            {/* Horizontal slab joints */}
            {slabs.map((sy, si) => (
              <rect key={`s-${bi}-${si}`} x={b.x} y={sy} width={b.w} height={1.5} fill="#1b2d44" />
            ))}
            {/* Rooftop chimneys */}
            {b.chimneys.map((off, ci) => {
              const ch = 9 + (ci % 2) * 5;
              return (
                <g key={`ch-${bi}-${ci}`}>
                  <rect x={b.x + off - 2.5} y={b.top - ch} width={5} height={ch} fill="#0d1520" rx="0.5" />
                  <rect x={b.x + off - 3.5} y={b.top - ch} width={7} height={2} fill="#16253a" rx="0.3" />
                </g>
              );
            })}
            {/* Antenna — tallest building only */}
            {b.antenna && (
              <g opacity="0.75">
                <line x1={b.x + b.w / 2} y1={b.top - 19} x2={b.x + b.w / 2} y2={b.top} stroke="#2a3f5c" strokeWidth="1" />
                <line x1={b.x + b.w / 2 - 9} y1={b.top - 14} x2={b.x + b.w / 2 + 9} y2={b.top - 14} stroke="#2a3f5c" strokeWidth="0.8" />
                <line x1={b.x + b.w / 2 - 5} y1={b.top - 9}  x2={b.x + b.w / 2 + 5} y2={b.top - 9}  stroke="#2a3f5c" strokeWidth="0.8" />
                <circle cx={b.x + b.w / 2} cy={b.top - 20} r="1.5" fill="#e03030" fillOpacity="0.65" />
              </g>
            )}
            {/* Copper rim light */}
            <rect x={b.x + b.w - 1.5} y={b.top} width="1.5" height={bH} fill="url(#rim)" />
          </g>
        );
      })}

      {/* Ground line — cool blue */}
      <rect x="0" y={GROUND} width="418" height="2" fill="#2a5080" fillOpacity="0.6" />

      {/* Windows */}
      {windows.map(({ wx, wy, lit, warm }, i) => (
        <rect
          key={`w-${i}`}
          x={wx} y={wy} width={winW} height={winH}
          rx="1"
          fill={lit ? (warm ? '#f7c873' : '#7fb6e8') : '#0a0f1c'}
          fillOpacity={lit ? (warm ? 0.92 : 0.55) : 0.6}
        />
      ))}
    </svg>
  );
}
function SectionCard({ id, title, icon, children, action, className, note }: { id?: string; title: string; icon: ReactNode; children: ReactNode; action?: ReactNode; className?: string; note?: string }) {
  return (
    <section
      id={id}
      className={`min-w-0 overflow-hidden rounded-[1.75rem] border border-slate-200/70 bg-white p-5 shadow-card-md transition-shadow hover:shadow-card-lg${className ? ` ${className}` : ''}`}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2.5 text-base font-bold text-slate-900">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100/60">
              {icon}
            </span>
            {title}
          </h2>
          {note && <p className="ml-[42px] mt-0.5 text-[9px] text-slate-400">{note}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function MetricCard({ title, value, subtitle, icon, tone = 'brand', href }: { title: string; value: string; subtitle: string; icon: ReactNode; tone?: 'brand' | 'amber' | 'slate' | 'violet'; href?: string }) {
  const toneClass = {
    brand:  'from-brand-600 via-brand-500 to-teal-400 text-white shadow-brand-200/60',
    amber:  'from-amber-500 via-orange-400 to-yellow-400 text-white shadow-amber-200/60',
    slate:  'from-slate-800 via-slate-700 to-slate-600 text-white shadow-slate-300/60',
    violet: 'from-violet-600 via-purple-500 to-fuchsia-400 text-white shadow-violet-200/60',
  }[tone];

  const inner = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide opacity-75">{title}</p>
          <p className="mt-2 text-3xl font-black tracking-tight">{value}</p>
        </div>
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-white/15 backdrop-blur-sm ring-1 ring-white/20">
          {icon}
        </span>
      </div>
      <p className="mt-4 text-xs font-medium leading-relaxed opacity-75">{subtitle}</p>
    </>
  );

  if (href) {
    return (
      <a
        href={href}
        className={`block rounded-[1.5rem] bg-gradient-to-br ${toneClass} p-5 shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl cursor-pointer`}
      >
        {inner}
      </a>
    );
  }

  return (
    <article className={`rounded-[1.5rem] bg-gradient-to-br ${toneClass} p-5 shadow-lg`}>
      {inner}
    </article>
  );
}

function StatusBadge({ status }: { status: Ticket['status'] | WorkOrderItem['status'] | MeetingItem['status'] }) {
  const classes: Record<string, string> = {
    uj:         'bg-sky-50    text-sky-700    ring-1 ring-sky-200/60',
    folyamatban:'bg-amber-50  text-amber-700  ring-1 ring-amber-200/60',
    varakozik:  'bg-violet-50 text-violet-700 ring-1 ring-violet-200/60',
    lezarva:    'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60',
    tervezett:  'bg-sky-50    text-sky-700    ring-1 ring-sky-200/60',
    kikuldve:   'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200/60',
    lezart:     'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60',
  };
  const labels: Record<string, string> = {
    uj: 'Új', folyamatban: 'Folyamatban', varakozik: 'Várakozik',
    lezarva: 'Lezárva', tervezett: 'Tervezett', kikuldve: 'Kiküldve', lezart: 'Lezárt',
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${classes[status] ?? classes.uj}`}>
      {labels[status] ?? status}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: Ticket['priority'] }) {
  const classes: Record<Ticket['priority'], string> = {
    alacsony: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200/60',
    kozepes:  'bg-sky-50    text-sky-700   ring-1 ring-sky-200/60',
    magas:    'bg-amber-50  text-amber-700 ring-1 ring-amber-200/60',
    kritikus: 'bg-rose-50   text-rose-700  ring-1 ring-rose-200/60',
  };
  const labels: Record<Ticket['priority'], string> = {
    alacsony: 'Alacsony', kozepes: 'Közepes', magas: 'Magas', kritikus: 'Kritikus',
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ${classes[priority]}`}>
      {labels[priority]}
    </span>
  );
}

// ─── AI Triage UI Components ──────────────────────────────────────────────────

const AI_CATEGORY_LABELS: Record<AiCategory, string> = {
  plumbing: 'Vízvezeték',
  electrical: 'Elektromos',
  structural: 'Szerkezeti',
  common_area: 'Közös terület',
  emergency: 'Vészhelyzet',
  hvac: 'Fűtés/légk.',
  elevator: 'Lift',
  other: 'Egyéb',
};

const AI_CATEGORY_COLORS: Record<AiCategory, string> = {
  plumbing: 'bg-sky-50 text-sky-700 ring-sky-200',
  electrical: 'bg-amber-50 text-amber-700 ring-amber-200',
  structural: 'bg-stone-50 text-stone-700 ring-stone-200',
  common_area: 'bg-violet-50 text-violet-700 ring-violet-200',
  emergency: 'bg-rose-50 text-rose-700 ring-rose-200',
  hvac: 'bg-orange-50 text-orange-700 ring-orange-200',
  elevator: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  other: 'bg-slate-100 text-slate-600 ring-slate-200',
};

function AiUrgencyBadge({ urgency }: { urgency: number | null | undefined }) {
  if (urgency === null || urgency === undefined) {
    return (
      <span className="inline-flex animate-pulse items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-400 ring-1 ring-slate-200">
        <span className="h-2 w-2 rounded-full bg-slate-300" />
        AI...
      </span>
    );
  }
  let colorClass: string;
  let label: string;
  if (urgency <= 4) {
    colorClass = 'bg-emerald-50 text-emerald-700 ring-emerald-200';
    label = `AI ${urgency}`;
  } else if (urgency <= 7) {
    colorClass = 'bg-amber-50 text-amber-700 ring-amber-200';
    label = `AI ${urgency}`;
  } else {
    colorClass = 'bg-rose-50 text-rose-700 ring-rose-200';
    label = `AI ${urgency}!`;
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${colorClass}`}>
      <Sparkles size={10} />
      {label}
    </span>
  );
}

function AiCategoryChip({ category }: { category: AiCategory | string | null | undefined }) {
  if (!category) return null;
  const safeCategory = (Object.keys(AI_CATEGORY_LABELS).includes(category) ? category : 'other') as AiCategory;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${AI_CATEGORY_COLORS[safeCategory]}`}>
      {AI_CATEGORY_LABELS[safeCategory]}
    </span>
  );
}

function AiTriagePendingSkeleton() {
  return (
    <div className="mt-2 flex animate-pulse items-center gap-2">
      <div className="h-5 w-16 rounded-full bg-slate-100" />
      <div className="h-5 w-20 rounded-full bg-slate-100" />
      <div className="h-4 w-32 rounded bg-slate-100" />
    </div>
  );
}

function hexToRgba(hex: string, alpha: number): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return `rgba(0,0,0,${alpha})`;
  return `rgba(${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)},${alpha})`;
}

export default function DashboardClient({ data }: { data: DashboardData }) {
  const [ticketSaved, setTicketSaved] = useState(false);
  const [meterSaved, setMeterSaved] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [tickets, setTickets] = useState(data.tickets);
  const [expandedNews, setExpandedNews] = useState<string[]>([]);
  const [newsItems, setNewsItems] = useState(data.news);
  const [ackingNewsId, setAckingNewsId] = useState<string | null>(null);
  const [ticketFilter, setTicketFilter] = useState<Ticket['status'] | 'osszes'>('osszes');
  const [documentFilter, setDocumentFilter] = useState('osszes');
  const [unitSearch, setUnitSearch] = useState('');

  const [name, setName] = useState(data.currentUser.full_name);
  const [unit, setUnit] = useState('');
  const [address, setAddress] = useState('');
  const [addressQuery, setAddressQuery] = useState('');
  const [addressOptions, setAddressOptions] = useState<AddressOption[]>([]);
  const [addressSource, setAddressSource] = useState<'supabase' | 'nominatim' | null>(null);
  const [addressError, setAddressError] = useState('');
  const [isAddressLoading, setIsAddressLoading] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<AddressOption | null>(null);
  const [floor, setFloor] = useState('');
  const [door, setDoor] = useState('');
  const [profileSaveError, setProfileSaveError] = useState('');

  const [ticketTitle, setTicketTitle] = useState('');
  const [ticketDescription, setTicketDescription] = useState('');
  const [ticketLocation, setTicketLocation] = useState('');
  const [ticketPriority, setTicketPriority] = useState<Ticket['priority']>('kozepes');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Document upload state
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>('idle');
  const [uploadError, setUploadError] = useState('');
  // Document management state (manager only)
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editDocData, setEditDocData] = useState({ title: '', category: '', version: '', visibility: 'Mindenki' });
  const [docActionLoading, setDocActionLoading] = useState(false);
  const [docActionError, setDocActionError] = useState('');
  const [demoInitStatus, setDemoInitStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [kommandOpen, setKommandOpen] = useState(false);
  const [kommandQuery, setKommandQuery] = useState('');

  // Header search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Contact modal state
  const [contactOpen, setContactOpen] = useState(false);
  const [contactSubject, setContactSubject] = useState<ContactSubject>(CONTACT_SUBJECTS[0]);
  const [contactMessage, setContactMessage] = useState('');
  const [contactStatus, setContactStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [contactError, setContactError] = useState('');

  // Push notification state
  const [pushSupported, setPushSupported] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  // Meetings state
  const [showMeetingForm, setShowMeetingForm] = useState(false);
  const [meetingStatus, setMeetingStatus] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');
  const [meetingError, setMeetingError] = useState('');
  const [meetings, setMeetings] = useState(data.meetings);
  const [selectedMeeting, setSelectedMeeting] = useState<MeetingItem | null>(null);
  const [meetingPanelData, setMeetingPanelData] = useState<Awaited<ReturnType<typeof getMeetingWithDetails>> | null>(null);
  const [meetingPanelLoading, setMeetingPanelLoading] = useState(false);

  // Finance state
  const [showChargeForm, setShowChargeForm] = useState(false);
  const [chargeStatus, setChargeStatus] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');
  const [chargeError, setChargeError] = useState('');
  const [showPaymentForm, setShowPaymentForm] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');

  // AI override modal state
  const [overrideTicketId, setOverrideTicketId] = useState<string | null>(null);
  const [overrideUrgency, setOverrideUrgency] = useState<number>(5);
  const [overrideCategory, setOverrideCategory] = useState<string>('other');
  const [overrideSaving, setOverrideSaving] = useState(false);

  const isManager = useMemo(() => ['kozos_kepviselo', 'megbizott'].includes(data.currentUser.role), [data.currentUser.role]);
  const isAdminLike = useMemo(() => ['kozos_kepviselo', 'megbizott', 'bizottsag', 'konyvelo'].includes(data.currentUser.role), [data.currentUser.role]);

  const totalDue = data.finances.reduce((acc, item) => acc + numberOrZero(item.expected_amount), 0);
  const totalPaid = data.finances.reduce((acc, item) => acc + numberOrZero(item.paid_amount), 0);
  const arrears = Math.max(totalDue - totalPaid, 0);
  const openTicketCount = tickets.filter((ticket) => ticket.status !== 'lezarva').length;
  const unreadNotificationCount = data.notifications.filter((notification) => !notification.read_at).length;
  const totalArea = data.units.reduce((acc, item) => acc + numberOrZero(item.area_m2), 0);
  const totalOwnershipShare = data.units.reduce((acc, item) => acc + numberOrZero(item.ownership_share), 0);

  const criticalTickets = tickets.filter((t) => t.priority === 'kritikus' && t.status !== 'lezarva').length;
  const unacknowledgedDocs = data.documents.filter((d) => !d.acknowledged_at).length;
  const upcomingMeetings = data.meetings.filter((m) => m.status === 'tervezett').length;

  // === SIGNAL NAV: nav items with live counts ===
  const signalNav = [
    { href: '#overview', label: 'Áttekintő', icon: Home, count: 0, critical: 0 },
    { href: '#tasks', label: 'Teendők', icon: ClipboardCheck, count: openTicketCount + unreadNotificationCount, critical: criticalTickets },
    { href: '#tickets', label: 'Bejelentések', icon: TicketCheck, count: openTicketCount, critical: criticalTickets },
    { href: '#units', label: 'Albetétek', icon: Building2, count: 0, critical: 0 },
    { href: '#documents', label: 'Dokumentumok', icon: FileText, count: unacknowledgedDocs, critical: 0 },
    { href: '#finances', label: 'Pénzügyek', icon: CircleDollarSign, count: arrears > 0 ? 1 : 0, critical: arrears > 100000 ? 1 : 0 },
    { href: '#meters', label: 'Mérőórák', icon: Gauge, count: 0, critical: 0 },
    { href: '#transport', label: 'Közlekedés', icon: Bus, count: 0, critical: 0 },
    { href: `/w/${data.buildingId}/kornyezet`, label: 'Levegő & Kerékpár', icon: Wind, count: 0, critical: 0 },
    { href: '#meetings', label: 'Közgyűlések', icon: CalendarDays, count: upcomingMeetings, critical: 0 },
    { href: '#knowledge', label: 'Tudásbázis', icon: BookOpen, count: 0, critical: 0 },
    ...(isAdminLike ? [{ href: '#audit', label: 'Audit napló', icon: ShieldCheck, count: 0, critical: 0 }] : []),
  ];

  const handleOpenMeeting = async (meeting: MeetingItem) => {
    setSelectedMeeting(meeting);
    setMeetingPanelLoading(true);
    const details = await getMeetingWithDetails(meeting.id);
    setMeetingPanelData(details);
    setMeetingPanelLoading(false);
  };

  const handleRefreshMeetingPanel = async () => {
    if (!selectedMeeting) return;
    const details = await getMeetingWithDetails(selectedMeeting.id);
    setMeetingPanelData(details);
    setMeetings((prev) => prev.map((m) => m.id === selectedMeeting.id && details.meeting ? { ...m, ...details.meeting } : m));
  };

  // === KOMMAND: searchable command palette items ===
  const kommandItems = useMemo(() => [
    ...navigation.map((n) => ({ id: `nav-${n.href}`, type: 'nav', label: n.label, href: n.href, meta: '' })),
    ...tickets.slice(0, 6).map((t) => ({ id: `t-${t.id}`, type: 'ügy', label: t.title, href: '#tickets', meta: t.status })),
    ...data.documents.slice(0, 4).map((d) => ({ id: `d-${d.id}`, type: 'dok', label: d.title, href: '#documents', meta: d.category })),
  ], [tickets, data.documents]);

  const kommandResults = kommandQuery.trim()
    ? kommandItems.filter((i) => i.label.toLowerCase().includes(kommandQuery.toLowerCase()))
    : kommandItems;

  // === HEADER SEARCH items (expanded set) ===
  const searchItems = useMemo(() => [
    ...navigation.map((n) => ({ id: `nav-${n.href}`, type: 'Navigáció', label: n.label, href: n.href, meta: '' })),
    ...tickets.map((t) => ({ id: `t-${t.id}`, type: 'Ügy', label: t.title, href: '#tickets', meta: t.status })),
    ...data.documents.map((d) => ({ id: `d-${d.id}`, type: 'Dokumentum', label: d.title, href: '#documents', meta: d.category })),
    ...newsItems.map((n) => ({ id: `n-${n.id}`, type: 'Hír', label: n.title, href: '#overview', meta: n.category ?? '' })),
    ...data.units.map((u) => ({ id: `u-${u.id}`, type: 'Albetét', label: `${u.unit_label} — ${u.owner_name}`, href: '#units', meta: u.unit_type })),
    ...data.meetings.map((m) => ({ id: `m-${m.id}`, type: 'Közgyűlés', label: m.title, href: '#meetings', meta: m.status })),
    ...data.kbArticles.map((k) => ({ id: `k-${k.id}`, type: 'Tudásbázis', label: k.title, href: '#knowledge', meta: k.topic })),
    ...data.vendors.map((v) => ({ id: `v-${v.id}`, type: 'Partner', label: v.name, href: '#overview', meta: v.category })),
  ], [tickets, data.documents, data.units, data.meetings, data.kbArticles, data.vendors, newsItems]);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return searchItems
      .filter((i) => i.label.toLowerCase().includes(q) || i.type.toLowerCase().includes(q) || i.meta.toLowerCase().includes(q))
      .slice(0, 8);
  }, [searchQuery, searchItems]);

  // Hero ambient colour — tracks time-of-day so the seasonal sky glow updates live
  const [heroTod, setHeroTod] = useState<HeroTimeOfDay>(() => heroDetectTod());
  useEffect(() => {
    const id = setInterval(() => setHeroTod(heroDetectTod()), 60_000);
    return () => clearInterval(id);
  }, []);
  const heroAmbient = heroSkyGradient(heroTod).mid;

  // Close search dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Contact form handler
  const handleContactSend = async () => {
    if (!contactMessage.trim()) return;
    setContactStatus('sending');
    setContactError('');
    const result = await sendContactMessage({ subject: contactSubject, message: contactMessage });
    if (result.success) {
      setContactStatus('done');
      setContactMessage('');
      setTimeout(() => { setContactStatus('idle'); setContactOpen(false); }, 3000);
    } else {
      setContactStatus('error');
      setContactError(result.error ?? 'Ismeretlen hiba');
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setKommandOpen(false); setKommandQuery('');
        setSearchOpen(false); setSearchQuery('');
        setContactOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Detect push notification support
  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setPushSupported(true);
      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          setPushSubscribed(Boolean(sub));
        });
      });
    }
  }, []);

  useEffect(() => {
    if (!hasSupabaseConfig) {
      return;
    }

    const supabase = createClient();

    // getUser() hits the server — always accurate (never stale cache)
    supabase.auth.getUser().then(({ data }) => {
      setIsLoggedIn(Boolean(data.user));
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(Boolean(session?.user));
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!addressQuery || addressQuery.length < 3) {
      setAddressOptions([]);
      setAddressSource(null);
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
          setAddressSource(null);
          return;
        }

        // v0.7.14 — `suggestions` is now an array of AddressOption objects (was string[])
        const raw = Array.isArray(payload.suggestions) ? payload.suggestions : [];
        // Backward-compat guard: if some legacy caller returns strings, normalize to objects
        const normalized: AddressOption[] = raw.map((item: AddressOption | string, idx: number) =>
          typeof item === 'string'
            ? { id: `legacy:${idx}:${item}`, label: item, lat: null, lon: null, source: 'supabase' as const }
            : item
        );
        setAddressOptions(normalized);
        setAddressSource(payload.source ?? null);
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

  // Banner shows for legacy URLs OR for demo/ paths (files not yet in Supabase Storage)
  const hasLegacyDocUrls = useMemo(() => data.documents.some((d) => d.file_url?.includes('storage.panellako.hu') || d.file_url?.startsWith('demo/')), [data.documents]);
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

  const submitTicket = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const now = new Date().toISOString();

    // Optimistic local update for snappy UX
    const optimisticTicket: Ticket = {
      id: `optimistic-${now}`,
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
    setTickets((prev) => [optimisticTicket, ...prev]);

    const result = await createTicketAction({
      title: ticketTitle,
      description: ticketDescription,
      location: ticketLocation,
      priority: ticketPriority,
      submitted_by: name,
      unit_label: unit || undefined
    });

    if (result.success) {
      setTicketSaved(true);
      setTicketTitle('');
      setTicketDescription('');
      setTicketLocation('');
      setTicketPriority('kozepes');
    } else {
      // Roll back optimistic insert on failure
      setTickets((prev) => prev.filter((t) => t.id !== optimisticTicket.id));
    }
  };

  const updateTicketStatus = async (ticketId: string, nextStatus: Ticket['status']) => {
    const previousTickets = tickets;
    setTickets((prev) =>
      prev.map((ticket) =>
        ticket.id === ticketId
          ? { ...ticket, status: nextStatus, updated_at: new Date().toISOString() }
          : ticket
      )
    );

    const result = await updateTicketStatusAction(ticketId, nextStatus);
    if (!result.success) {
      setTickets(previousTickets);
    }
  };

  const handleAiOverrideClick = (ticketId: string) => {
    const ticket = tickets.find((t) => t.id === ticketId);
    if (!ticket) return;
    setOverrideTicketId(ticketId);
    setOverrideUrgency(ticket.ai_urgency ?? 5);
    setOverrideCategory(ticket.ai_category ?? 'other');
  };

  const submitAiOverride = async () => {
    if (!overrideTicketId) return;
    setOverrideSaving(true);
    try {
      const result = await updateTicketAiOverrideAction(overrideTicketId, {
        ai_category: overrideCategory as AiCategory,
        ai_urgency: overrideUrgency,
      });
      if (result.success) {
        setTickets((prev) =>
          prev.map((t) =>
            t.id === overrideTicketId
              ? { ...t, ai_category: overrideCategory as AiCategory, ai_urgency: overrideUrgency, ai_override: true }
              : t
          )
        );
        setOverrideTicketId(null);
      }
    } finally {
      setOverrideSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_left,theme(colors.brand.50)_0%,theme(colors.slate.50)_40%,theme(colors.indigo.50/30%)_100%)] text-slate-900">
      <div className="grid min-h-screen lg:grid-cols-[272px_1fr]">
        <aside className="hidden border-r border-slate-800/50 bg-slate-950 text-slate-200 shadow-2xl lg:block">
          <div className="relative sticky top-0 flex h-screen flex-col overflow-hidden">

            {/* KOMMAND OVERLAY */}
            {kommandOpen && (
              <div className="absolute inset-0 z-50 flex flex-col bg-slate-950 p-4">
                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-black px-3 py-2.5 ring-2 ring-emerald-500/15 shadow-lg shadow-emerald-900/20">
                  <span className="select-none font-mono text-base text-emerald-400">›</span>
                  <input
                    autoFocus
                    className="flex-1 bg-transparent font-mono text-sm text-emerald-300 outline-none placeholder:text-emerald-900"
                    placeholder="parancs vagy keresés..."
                    value={kommandQuery}
                    onChange={(e) => setKommandQuery(e.target.value)}
                  />
                  <button onClick={() => { setKommandOpen(false); setKommandQuery(''); }} className="rounded p-0.5 hover:bg-emerald-500/10">
                    <X size={13} className="text-slate-600 transition-colors hover:text-emerald-400" />
                  </button>
                </div>
                <div className="mt-3 flex-1 space-y-0.5 overflow-y-auto">
                  {kommandResults.length === 0 && (
                    <p className="py-6 text-center font-mono text-xs text-slate-700">nincs találat</p>
                  )}
                  {kommandResults.map((item) => (
                    <a
                      key={item.id}
                      href={item.href}
                      onClick={() => { setKommandOpen(false); setKommandQuery(''); }}
                      className="group flex items-center gap-2.5 rounded-lg px-3 py-2.5 transition-colors hover:bg-emerald-500/10"
                    >
                      <span className="w-6 shrink-0 text-center font-mono text-[10px] text-emerald-800 transition-colors group-hover:text-emerald-500">{item.type}</span>
                      <span className="flex-1 truncate text-sm text-slate-400 transition-colors group-hover:text-white">{item.label}</span>
                      {item.meta && <span className="shrink-0 rounded-full bg-slate-900 px-1.5 py-0.5 text-[10px] text-slate-600">{item.meta}</span>}
                    </a>
                  ))}
                </div>
                <p className="mt-3 select-none text-center font-mono text-[10px] text-slate-800">ESC bezár</p>
              </div>
            )}

            <div className="flex h-full flex-col p-4">

              {/* LOGO */}
              <div className="mb-4 flex items-center gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-sky-500 text-white shadow-lg shadow-brand-900/30">
                  <Building2 size={20} />
                </div>
                <div>
                  <p className="text-base font-black tracking-tight text-white">PanelLakó</p>
                  <p className="text-[11px] text-slate-600">Operációs központ</p>
                </div>
              </div>

              {/* BUILDING CONTEXT */}
              {data.buildingName && (
                <div className="mb-3 rounded-xl border border-slate-800/50 bg-white/[0.04] px-3 py-2.5">
                  <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-slate-600">Aktuális épület</p>
                  <p className="truncate text-xs font-semibold leading-snug text-slate-200">{data.buildingName}</p>
                  {data.buildingAddress && (
                    <p className="mt-0.5 truncate text-[10px] text-slate-500">{data.buildingAddress}</p>
                  )}
                  <Link
                    href="/app"
                    className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold text-brand-400 transition-colors hover:text-brand-300"
                  >
                    <Layers3 size={11} />
                    Épület váltása
                  </Link>
                </div>
              )}

              {/* SIGNAL NAV — scrollable, takes all remaining space */}
              <nav className="sidebar-scroll flex-1 space-y-px overflow-y-auto">
                {signalNav.map((item) => {
                  const Icon = item.icon;
                  const hasCritical = item.critical > 0;
                  const hasActivity = item.count > 0;
                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      className="group relative flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 hover:bg-white/[0.07] hover:text-white"
                    >
                      {hasCritical && (
                        <span className="absolute left-1.5 top-1/2 h-3.5 w-0.5 -translate-y-1/2 animate-pulse rounded-full bg-rose-500" />
                      )}
                      <Icon
                        size={15}
                        className={`shrink-0 transition-colors ${hasCritical ? 'text-rose-400' : hasActivity ? 'text-slate-400' : 'text-slate-600'} group-hover:text-current`}
                      />
                      <span className={`transition-colors ${hasCritical ? 'text-slate-300' : hasActivity ? 'text-slate-400' : 'text-slate-600'} group-hover:text-white`}>
                        {item.label}
                      </span>
                      {hasActivity && (
                        <span className={`ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${hasCritical ? 'bg-rose-500/20 text-rose-400' : 'bg-white/[0.07] text-slate-500'}`}>
                          {item.count}
                        </span>
                      )}
                    </a>
                  );
                })}
              </nav>

              {/* KOMMAND LAUNCHER */}
              <div className="mt-3">
                <button
                  onClick={() => setKommandOpen(true)}
                  className="group flex w-full items-center gap-2.5 rounded-xl border border-slate-800 bg-black/30 px-3 py-2.5 text-left transition-all hover:border-emerald-500/30 hover:bg-emerald-500/5"
                >
                  <Terminal size={12} className="shrink-0 text-slate-700 transition-colors group-hover:text-emerald-500" />
                  <span className="font-mono text-xs text-slate-700 transition-colors group-hover:text-emerald-500">parancs / ugrás</span>
                  <span className="ml-auto rounded bg-slate-900 px-1.5 py-0.5 font-mono text-[10px] text-slate-700">›_</span>
                </button>
              </div>

              {/* BILLING LINK — managers only */}
              {isManager && (
                <div className="mt-2">
                  <a
                    href={'/billing' + (data.buildingId ? `?building=${data.buildingId}` : '')}
                    className="group flex w-full items-center gap-2.5 rounded-xl border border-violet-900/40 bg-violet-950/30 px-3 py-2.5 text-left transition-all hover:border-violet-500/40 hover:bg-violet-500/10"
                  >
                    <Sparkles size={12} className="shrink-0 text-violet-700 transition-colors group-hover:text-violet-400" />
                    <span className="text-xs font-bold text-violet-700 transition-colors group-hover:text-violet-400">Előfizetés &amp; Számlázás</span>
                    <ChevronRight size={11} className="ml-auto text-violet-800 group-hover:text-violet-500" />
                  </a>
                </div>
              )}

              {/* ROLE PANEL — compact, active role only */}
              <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-slate-800/50 bg-white/[0.04] px-3 py-2.5">
                <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand-900/60 text-brand-400 ring-1 ring-brand-800/40">
                  <UserRound size={13} />
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600">Aktív szerepkör</p>
                  <p className="truncate text-xs font-bold text-slate-200">{roleLabels[data.currentUser.role]}</p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0 overflow-x-hidden space-y-5 px-4 py-5 md:px-8 lg:px-10">
          {/* ── Premium header ──────────────────────────────────────────────── */}
          <header
            className="relative overflow-hidden rounded-[2rem] shadow-2xl shadow-slate-950/60"
            style={{
              background: `radial-gradient(ellipse 88% 300% at 50% 50%, ${heroAmbient} 0%, ${hexToRgba(heroAmbient, 0.88)} 20%, ${hexToRgba(heroAmbient, 0.48)} 44%, ${hexToRgba(heroAmbient, 0.12)} 63%, #05091a 80%)`,
            }}
          >
            {/* Gold accent top line */}
            <div className="absolute inset-x-0 top-0 h-[2px]" style={{ background: 'linear-gradient(90deg, transparent 0%, #c87920 30%, #f5c842 55%, #c87920 80%, transparent 100%)' }} />

            {/* Content — skyline sits inline between title and actions */}
            <div className="relative z-10 flex items-center gap-3 px-5 py-4">
              {/* Left: building info */}
              <div className="min-w-0 shrink-0">
                {data.buildingName ? (
                  <>
                    {/* Mobile building switcher */}
                    <Link
                      href="/app"
                      className="inline-flex items-center gap-1.5 text-xs font-medium mb-1 lg:hidden"
                      style={{ color: '#8ba3c7' }}
                    >
                      <Layers3 size={12} />
                      <span className="truncate max-w-[200px]">{data.buildingName}</span>
                      <ChevronRight size={11} className="flex-shrink-0 opacity-60" />
                    </Link>
                    <h1
                      className="text-2xl font-black tracking-tight break-words md:text-3xl"
                      style={{ color: '#f0f4ff', textShadow: '0 2px 24px rgba(200,121,32,0.18)' }}
                    >
                      {data.buildingName}
                    </h1>
                    <p className="mt-1 text-xs" style={{ color: '#4a6080' }}>{data.buildingAddress}</p>
                  </>
                ) : (
                  <>
                    <h1 className="text-2xl font-black tracking-tight md:text-3xl" style={{ color: '#f0f4ff' }}>PanelLakó</h1>
                    <p className="mt-1 text-xs" style={{ color: '#4a6080' }}>Modern lakói és képviselői működés egy felületen.</p>
                  </>
                )}
              </div>

              {/* Center: animated time/season-aware skyline scene (v0.7.15) */}
              <div className="pointer-events-none select-none relative flex-1 min-w-0 h-[108px] overflow-hidden">
                {/* DashboardHeroScene with internal tram suppressed — HeroVehicle replaces it */}
                <DashboardHeroScene hideTram />
                {/* Multi-vehicle overlay: tram / trolley / bus / cyclists / A380 */}
                <HeroVehicle />
                {/* Thin top/bottom blends only — no left/right dark fades so the sky
                    colour flows seamlessly into the seasonal header background. */}
                <div className="absolute inset-x-0 top-0 h-4" style={{ background: 'linear-gradient(to bottom, rgba(5,9,26,0.45) 0%, transparent 100%)' }} />
                <div className="absolute inset-x-0 bottom-0 h-4" style={{ background: 'linear-gradient(to top, rgba(5,9,26,0.45) 0%, transparent 100%)' }} />
              </div>

              {/* Right: actions */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Header search */}
                <div className="relative" ref={searchRef}>
                  <Search className="pointer-events-none absolute left-3 top-2.5" style={{ color: '#4a6080' }} size={14} />
                  <input
                    className="w-full rounded-xl py-2 pl-9 pr-4 text-sm outline-none transition-all md:w-48"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: '#c8d8f0',
                    }}
                    placeholder="Keresés…"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); }}
                    onFocus={() => setSearchOpen(true)}
                  />
                  {searchOpen && searchQuery.trim().length > 0 && (
                    <div className="absolute left-0 top-full z-50 mt-1.5 w-80 rounded-2xl border border-slate-200 bg-white shadow-xl">
                      {searchResults.length === 0 ? (
                        <p className="px-4 py-3 text-sm text-slate-400">Nincs találat</p>
                      ) : (
                        <ul className="py-1">
                          {searchResults.map((item) => (
                            <li key={item.id}>
                              <a
                                href={item.href}
                                onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                                className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-brand-50"
                              >
                                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">{item.type}</span>
                                <span className="flex-1 truncate text-slate-800">{item.label}</span>
                                {item.meta && <span className="shrink-0 text-xs text-slate-400">{item.meta}</span>}
                              </a>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>

                {/* Kapcsolat — hidden for now */}
                <button
                  type="button"
                  onClick={() => setContactOpen(true)}
                  className="hidden btn-secondary px-3.5 py-2 text-xs"
                  style={{ display: 'none' }}
                >
                  <Mail size={13} /> Kapcsolat
                </button>

                {/* Session aktív — hidden for now */}
                <Link className="hidden rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:-translate-y-px hover:bg-slate-800" href="/login">
                  {isLoggedIn ? 'Session aktív' : 'Belépés'}
                </Link>

                {isLoggedIn ? (
                  <button
                    className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: '#7a90aa',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.12)';
                      (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239,68,68,0.3)';
                      (e.currentTarget as HTMLButtonElement).style.color = '#fca5a5';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.04)';
                      (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.08)';
                      (e.currentTarget as HTMLButtonElement).style.color = '#7a90aa';
                    }}
                    onClick={async () => {
                      const supabase = createClient();
                      await supabase.auth.signOut();
                      setIsLoggedIn(false);
                    }}
                    type="button"
                  >
                    <LogOut size={13} /> Kilépés
                  </button>
                ) : null}
              </div>
            </div>
          </header>

          <section id="overview" className="overflow-hidden rounded-[2rem] bg-slate-950 text-white shadow-2xl shadow-slate-900/25">
            <div className="grid gap-0 md:grid-cols-[1fr_auto]">
              {/* Left: hero text + CTAs */}
              <div className="p-6 md:p-8">
                {data.buildingName ? (
                  <>
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">Digitális műveleti központ</p>
                    <h2 className="max-w-xl text-3xl font-black leading-tight tracking-tight text-white md:text-4xl">
                      {data.buildingName}
                    </h2>
                    {data.buildingAddress && (
                      <p className="mt-1.5 flex items-center gap-1.5 text-sm text-slate-400">
                        <MapPin size={13} className="shrink-0 text-slate-500" />
                        {data.buildingAddress}
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">Digitális műveleti központ</p>
                    <h2 className="max-w-2xl text-4xl font-black leading-tight tracking-tight md:text-5xl">
                      PanelLakó,<br/>a társasházi app.
                    </h2>
                  </>
                )}
                <div className="mt-5 flex flex-wrap gap-3">
                  <a href="#tickets" className="rounded-2xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand-950/30 transition-all hover:bg-brand-400 hover:-translate-y-px">Új bejelentés</a>
                  <a href="#units" className="rounded-2xl bg-white/10 px-5 py-2.5 text-sm font-bold text-white ring-1 ring-white/15 transition-all hover:bg-white/15">Albetétek nézete</a>
                </div>
              </div>

              {/* Right: weather + air quality + ticket heatmap */}
              <div className="hidden lg:flex gap-0 border-l border-white/10 overflow-x-auto">

                {/* Weather panel */}
                <div className="w-44 shrink-0 border-r border-white/10 p-3">
                  <WeatherWidget city={
                    data.buildingAddress?.match(/\d{4}\s+([A-Za-záéíóöőúüűÁÉÍÓÖŐÚÜŰ-]+)/)?.[1]
                    ?? 'Budapest'
                  } />
                </div>

                {/* Air quality panel */}
                <div className="w-40 shrink-0 border-r border-white/10 p-3">
                  <AirQualityWidget />
                </div>

                {/* Ticket activity heatmap */}
                <div className="p-4 w-[340px] max-w-full">
                  <ActivityCalendar tickets={tickets} meetings={meetings} currentUnit={unit || undefined} />
                </div>

              </div>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <MetricCard title="Nyitott ügyek" value={String(openTicketCount)} subtitle="Ticketek, SLA és felelős kijelölés" icon={<Wrench size={24} />} href="#tickets" />
            <MetricCard title="Hátralék" value={formatCurrency(arrears)} subtitle="Lakói pénzügyi átláthatóság" icon={<CircleDollarSign size={24} />} tone="amber" href="#finances" />
            <MetricCard title="Olvasatlan értesítés" value={String(unreadNotificationCount)} subtitle="Push/e-mail és olvasottsági visszajelzés" icon={<BellRing size={24} />} tone="violet" href="#notifications" />
            <MetricCard title="Albetétek" value={String(data.units.length)} subtitle={`${totalArea} m² · ${totalOwnershipShare} tulajdoni hányad`} icon={<Layers3 size={24} />} tone="slate" href="#units" />
          </section>

          <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <SectionCard id="profile" title="Profil adatok és címkereső" icon={<UserRound size={18} />}>
              <form
                className="space-y-4"
                onSubmit={async (event) => {
                  event.preventDefault();
                  setProfileSaveError('');

                  let saveOk = true;

                  // Ha van kiválasztott cím, mentsük el a Supabase-be
                  if (selectedAddress && selectedAddress.lat !== null && selectedAddress.lon !== null) {
                    try {
                      const res = await fetch('/api/user/reference-address', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          display_name: selectedAddress.label,
                          lat: selectedAddress.lat,
                          lon: selectedAddress.lon,
                          street: selectedAddress.street ?? null,
                          house_number: selectedAddress.houseNumber ?? null,
                          city: selectedAddress.settlement ?? null,
                          district: selectedAddress.district ?? null,
                          postcode: selectedAddress.postcode ?? null,
                          floor: floor || null,
                          door: door || null,
                          source: selectedAddress.source,
                        }),
                      });
                      if (!res.ok) {
                        saveOk = false;
                        const payload = await res.json().catch(() => ({}));
                        if (res.status === 401) {
                          setProfileSaveError('A cím mentéséhez bejelentkezés szükséges.');
                        } else {
                          setProfileSaveError(payload?.message || 'A cím mentése nem sikerült.');
                        }
                      }
                    } catch {
                      saveOk = false;
                      setProfileSaveError('Hálózati hiba — a cím mentése nem sikerült.');
                    }
                  }

                  if (saveOk) {
                    setProfileSaved(true);
                    setTimeout(() => setProfileSaved(false), 3000);
                  }
                }}
              >
                <div className="grid gap-3 md:grid-cols-2">
                  <input required className="input-base" placeholder="Teljes név" value={name} onChange={(e) => setName(e.target.value)} />
                  <input className="input-base" placeholder="Lakás (pl. A/12)" value={unit} onChange={(e) => setUnit(e.target.value)} />
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                  <label className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-700"><MapPin size={16} className="text-brand-600" /> Címkeresés (Magyarország)</label>
                  <input
                    className="input-base"
                    placeholder="Kezdj el címet írni (pl. Budapest Gidófalvy Lajos utca 9)"
                    value={addressQuery}
                    onChange={(e) => {
                      setAddressQuery(e.target.value);
                      setAddress(e.target.value);
                      setSelectedAddress(null);
                    }}
                  />
                  {isAddressLoading ? <p className="mt-2 text-xs text-slate-500">Címek keresése...</p> : null}
                  {addressError ? <p className="mt-2 rounded-2xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">{addressError}</p> : null}
                  {addressOptions.length > 0 ? (
                    <ul className="mt-3 space-y-1 rounded-2xl border border-slate-100 bg-white p-2 shadow-sm">
                      {addressOptions.map((option) => (
                        <li key={option.id}>
                          <button
                            className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-brand-50 hover:text-brand-800"
                            type="button"
                            onClick={() => {
                              setAddress(option.label);
                              setAddressQuery(option.label);
                              setSelectedAddress(option);
                              setAddressOptions([]);
                            }}
                          >
                            <span className="truncate">{option.label}</span>
                            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${option.source === 'supabase' ? 'bg-emerald-100 text-emerald-700' : 'bg-sky-100 text-sky-700'}`}>
                              {option.source === 'supabase' ? 'GeoData' : 'OSM'}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {addressSource ? (
                    <p className="mt-2 text-[10px] uppercase tracking-wider text-slate-400">
                      Forrás: {addressSource === 'supabase' ? 'PanelLakó GeoData' : 'OpenStreetMap (Nominatim)'}
                    </p>
                  ) : null}
                  {selectedAddress ? (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs text-slate-600">Kiválasztott cím: <span className="font-semibold">{selectedAddress.label}</span></p>
                      <div className="grid gap-2 md:grid-cols-2">
                        <input className="input-base" placeholder="Emelet (opcionális)" value={floor} onChange={(e) => setFloor(e.target.value)} />
                        <input className="input-base" placeholder="Ajtó (opcionális)" value={door} onChange={(e) => setDoor(e.target.value)} />
                      </div>
                    </div>
                  ) : address ? (
                    <p className="mt-2 text-xs text-slate-600">Kiválasztott cím: {address}</p>
                  ) : null}
                </div>

                <button className="btn-primary">Profil mentése</button>
                {profileSaved ? <p className="text-sm font-semibold text-emerald-700">{selectedAddress ? 'Cím elmentve.' : 'Profiladatok mentve.'}</p> : null}
                {profileSaveError ? <p className="text-sm font-semibold text-rose-700">{profileSaveError}</p> : null}
              </form>

              {/* Push notification toggle */}
              {pushSupported ? (
                <div className="mt-4 flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <div>
                    <p className="text-sm font-bold text-slate-900">Push értesítések</p>
                    <p className="text-xs text-slate-500">Kapjon azonnali értesítést hirdetményekről és hibabejelentés frissítésekről.</p>
                  </div>
                  <button
                    type="button"
                    disabled={pushLoading}
                    onClick={async () => {
                      setPushLoading(true);
                      try {
                        if (pushSubscribed) {
                          // Unsubscribe
                          const reg = await navigator.serviceWorker.ready;
                          const sub = await reg.pushManager.getSubscription();
                          if (sub) {
                            await fetch('/api/push/subscribe', { method: 'DELETE', body: JSON.stringify({ endpoint: sub.endpoint }), headers: { 'Content-Type': 'application/json' } });
                            await sub.unsubscribe();
                          }
                          setPushSubscribed(false);
                        } else {
                          // Subscribe
                          const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
                          if (!vapidKey) { alert('VAPID kulcs nincs beállítva — push értesítés nem elérhető.'); return; }
                          const permission = await Notification.requestPermission();
                          if (permission !== 'granted') { alert('Push értesítések engedélyezése megtagadva.'); return; }
                          const reg = await navigator.serviceWorker.ready;
                          const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidKey });
                          await fetch('/api/push/subscribe', { method: 'POST', body: JSON.stringify(sub), headers: { 'Content-Type': 'application/json' } });
                          setPushSubscribed(true);
                        }
                      } finally {
                        setPushLoading(false);
                      }
                    }}
                    className={`rounded-full px-4 py-2 text-xs font-black transition-colors ${pushSubscribed ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'} disabled:opacity-50`}
                  >
                    {pushLoading ? '...' : pushSubscribed ? '✓ Bekapcsolva' : 'Bekapcsolás'}
                  </button>
                </div>
              ) : null}
            </SectionCard>

            <SectionCard id="tasks" title="Teendők és gyors műveletek" icon={<ClipboardCheck size={18} />}>
              <div className="grid gap-3 md:grid-cols-3">
                {tasks.map((task) => (
                  <article key={task.id} className="card-lift rounded-2xl border border-slate-100/80 bg-slate-50/80 p-4">
                    <div className={`mb-3 inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ring-inset ${task.tone.replace('bg-', 'bg-').replace('text-', 'text-')}`}>{task.meta}</div>
                    <p className="text-sm font-bold leading-snug text-slate-900">{task.title}</p>
                    <button className="mt-3.5 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-800" type="button">
                      Megnyitás <ChevronRight size={13} />
                    </button>
                  </article>
                ))}
              </div>

              <div className="mt-4 grid gap-2.5 md:grid-cols-3">
                <a className="rounded-xl bg-slate-900 px-4 py-2.5 text-center text-xs font-bold text-white transition-all hover:bg-slate-800" href="#tickets">Ticket queue</a>
                <a className="rounded-xl bg-brand-600 px-4 py-2.5 text-center text-xs font-bold text-white transition-all hover:bg-brand-700" href="#documents">Dokumentumtár</a>
                <a className="rounded-xl bg-white px-4 py-2.5 text-center text-xs font-bold text-slate-700 ring-1 ring-slate-200 transition-all hover:bg-slate-50" href="#meetings">Közgyűlés</a>
              </div>
            </SectionCard>
          </section>

          <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
            <SectionCard id="tickets" title="Hibabejelentés és ticketing" icon={<Siren size={18} />}>
              <form className="space-y-3" onSubmit={submitTicket}>
                <input required className="input-base" placeholder="Rövid cím" value={ticketTitle} onChange={(e) => setTicketTitle(e.target.value)} />
                <textarea required className="input-base min-h-[88px] resize-none" placeholder="Leírás, fotó/melléklet helye későbbi storage integrációhoz" rows={3} value={ticketDescription} onChange={(e) => setTicketDescription(e.target.value)} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <input required className="input-base" placeholder="Helyszín (pl. A/12 vagy lépcsőház)" value={ticketLocation} onChange={(e) => setTicketLocation(e.target.value)} />
                  <select className="input-base" value={ticketPriority} onChange={(e) => setTicketPriority(e.target.value as Ticket['priority'])}>
                    <option value="kozepes">Közepes</option>
                    <option value="magas">Magas</option>
                    <option value="kritikus">Kritikus</option>
                    <option value="alacsony">Alacsony</option>
                  </select>
                </div>
                <button className="btn-primary">Bejelentés rögzítése</button>
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
                {visibleTickets.map((ticket) => {
                  const isAiPending = ticket.ai_triage_at === null || ticket.ai_triage_at === undefined;
                  const isAiOverridden = ticket.ai_override === true;
                  const isHighUrgency = typeof ticket.ai_urgency === 'number' && ticket.ai_urgency >= 8;
                  return (
                    <article
                      key={ticket.id}
                      className={`rounded-3xl border p-4 transition-colors ${isHighUrgency ? 'border-rose-200 bg-rose-50/60' : 'border-slate-100 bg-slate-50/70'}`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-black text-slate-950">{ticket.title}</p>
                          {ticket.ai_summary_hu ? (
                            <p className="mt-1 text-sm italic text-slate-600">{ticket.ai_summary_hu}</p>
                          ) : (
                            <p className="mt-1 text-sm text-slate-600">{ticket.description}</p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <StatusBadge status={ticket.status} />
                          <PriorityBadge priority={ticket.priority} />
                          <AiUrgencyBadge urgency={ticket.ai_urgency} />
                        </div>
                      </div>
                      {isAiPending ? (
                        <AiTriagePendingSkeleton />
                      ) : (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <AiCategoryChip category={ticket.ai_category} />
                          {ticket.ai_vendor_suggestion ? (
                            <span className="text-xs text-slate-500">{ticket.ai_vendor_suggestion}</span>
                          ) : null}
                          {isAiOverridden ? (
                            <span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-bold text-violet-600 ring-1 ring-violet-200">Manuálisan módosítva</span>
                          ) : (
                            <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-600 ring-1 ring-emerald-200">
                              <Sparkles size={9} />AI triázs
                            </span>
                          )}
                        </div>
                      )}
                      <p className="mt-3 text-xs font-medium text-slate-500">
                        Helyszín: {ticket.location} · Beküldte: {ticket.submitted_by || 'Ismeretlen'}{ticket.unit_label ? ` (${ticket.unit_label})` : ''} · Frissítve: {formatDateTime(ticket.updated_at)}
                      </p>
                      {isManager ? (
                        <div className="mt-3 flex flex-wrap gap-2 text-xs">
                          <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-bold hover:border-brand-400" onClick={() => updateTicketStatus(ticket.id, 'folyamatban')} type="button">Folyamatban</button>
                          <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-bold hover:border-violet-400" onClick={() => updateTicketStatus(ticket.id, 'varakozik')} type="button">Várakozik</button>
                          <button className="rounded-xl border border-slate-200 bg-white px-3 py-2 font-bold hover:border-emerald-400" onClick={() => updateTicketStatus(ticket.id, 'lezarva')} type="button">Lezárás</button>
                          {!isAiPending ? (
                            <button className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 font-bold text-violet-700 hover:border-violet-400" onClick={() => handleAiOverrideClick(ticket.id)} type="button">AI módosítás</button>
                          ) : null}
                        </div>
                      ) : null}
                    </article>
                  );
                })}
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

          <section className="grid gap-6 lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.6fr)]">
            <SectionCard id="documents" title="Dokumentumtár" icon={<FileText size={18} />} action={
              <div className="flex items-center gap-2">
                <select value={documentFilter} onChange={(e) => setDocumentFilter(e.target.value)} className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold">
                  {documentCategories.map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
                {isManager && (
                  <button
                    type="button"
                    onClick={() => setShowUploadForm((v) => !v)}
                    className="rounded-2xl bg-brand-600 px-3 py-2 text-xs font-bold text-white hover:bg-brand-700"
                  >
                    + Feltöltés
                  </button>
                )}
              </div>
            }>
              {/* Manager upload form */}
              {isManager && showUploadForm && (
                <form
                  className="mb-4 rounded-2xl border border-brand-100 bg-brand-50 p-4"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setUploadStatus('uploading');
                    setUploadError('');
                    const fd = new FormData(e.currentTarget);
                    const result = await uploadDocumentAction(fd);
                    if (result.success) {
                      setUploadStatus('done');
                      setShowUploadForm(false);
                      (e.target as HTMLFormElement).reset();
                      setTimeout(() => setUploadStatus('idle'), 2000);
                    } else {
                      setUploadStatus('error');
                      setUploadError(result.error ?? 'Ismeretlen hiba');
                    }
                  }}
                >
                  <p className="mb-3 text-sm font-bold text-brand-800">Dokumentum feltöltése</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input required name="title" placeholder="Cím *" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                    <input required name="category" placeholder="Kategória *" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                    <input name="version" placeholder="Verzió (pl. 1.0)" defaultValue="1.0" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" />
                    <select name="visibility" className="rounded-xl border border-slate-200 px-3 py-2 text-sm">
                      <option value="Mindenki">Mindenki</option>
                      <option value="Tulajdonosok">Tulajdonosok</option>
                      <option value="Kezelők">Kezelők</option>
                    </select>
                  </div>
                  <input required name="file" type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" className="mt-3 block w-full text-sm text-slate-600 file:mr-3 file:rounded-xl file:border-0 file:bg-brand-600 file:px-3 file:py-2 file:text-xs file:font-bold file:text-white hover:file:bg-brand-700" />
                  {uploadError && <p className="mt-2 text-xs text-rose-600">{uploadError}</p>}
                  <div className="mt-3 flex gap-2">
                    <button type="submit" disabled={uploadStatus === 'uploading'} className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-50">
                      {uploadStatus === 'uploading' ? 'Feltöltés…' : 'Feltöltés'}
                    </button>
                    <button type="button" onClick={() => setShowUploadForm(false)} className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200">Mégse</button>
                  </div>
                </form>
              )}
              {uploadStatus === 'done' && <p className="mb-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">✓ Dokumentum sikeresen feltöltve</p>}
              {isManager && hasLegacyDocUrls && demoInitStatus !== 'done' && (
                <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-xs font-medium text-amber-800">A demo dokumentumfájlok még nem kerültek fel a tárolóba — a megnyitás nem fog működni.</p>
                  <button
                    type="button"
                    disabled={demoInitStatus === 'loading'}
                    className="shrink-0 rounded-xl bg-amber-600 px-3 py-2 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-50"
                    onClick={async () => {
                      setDemoInitStatus('loading');
                      try {
                        const res = await fetch('/api/init-demo-docs', { method: 'POST' });
                        const json = await res.json();
                        const allOk = json.results?.every((r: { status: string }) => r.status === 'ok' || r.status === 'skipped');
                        setDemoInitStatus(allOk ? 'done' : 'error');
                      } catch {
                        setDemoInitStatus('error');
                      }
                    }}
                  >
                    {demoInitStatus === 'loading' ? 'Feltöltés…' : 'Demo fájlok feltöltése'}
                  </button>
                </div>
              )}
              {demoInitStatus === 'done' && <p className="mb-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700">✓ Demo dokumentumfájlok sikeresen feltöltve</p>}
              {demoInitStatus === 'error' && <p className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">Hiba a demo fájlok feltöltésekor. Ellenőrizd a konzolt.</p>}
              <div className="space-y-3">
                {visibleDocuments.map((item) => (
                  <article key={item.id} className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
                    {editingDocId === item.id ? (
                      <form
                        className="space-y-3"
                        onSubmit={async (e) => {
                          e.preventDefault();
                          setDocActionLoading(true);
                          setDocActionError('');
                          const result = await updateDocumentAction(item.id, editDocData, data.buildingId);
                          setDocActionLoading(false);
                          if (result.success) {
                            setEditingDocId(null);
                          } else {
                            setDocActionError(result.error ?? 'Hiba történt');
                          }
                        }}
                      >
                        <p className="text-xs font-bold text-brand-700">Dokumentum szerkesztése</p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <input
                            required
                            value={editDocData.title}
                            onChange={(e) => setEditDocData((d) => ({ ...d, title: e.target.value }))}
                            placeholder="Cím *"
                            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                          />
                          <input
                            required
                            value={editDocData.category}
                            onChange={(e) => setEditDocData((d) => ({ ...d, category: e.target.value }))}
                            placeholder="Kategória *"
                            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                          />
                          <input
                            value={editDocData.version}
                            onChange={(e) => setEditDocData((d) => ({ ...d, version: e.target.value }))}
                            placeholder="Verzió"
                            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                          />
                          <select
                            value={editDocData.visibility}
                            onChange={(e) => setEditDocData((d) => ({ ...d, visibility: e.target.value }))}
                            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                          >
                            <option value="Mindenki">Mindenki</option>
                            <option value="Tulajdonosok">Tulajdonosok</option>
                            <option value="Kezelők">Kezelők</option>
                          </select>
                        </div>
                        {docActionError && <p className="text-xs text-rose-600">{docActionError}</p>}
                        <div className="flex gap-2">
                          <button type="submit" disabled={docActionLoading} className="rounded-xl bg-brand-600 px-3 py-2 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-50">
                            {docActionLoading ? 'Mentés…' : 'Mentés'}
                          </button>
                          <button type="button" onClick={() => setEditingDocId(null)} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200">Mégse</button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-black text-slate-950">{item.title}</p>
                            <p className="mt-1 text-xs font-medium text-slate-500">{item.category} · {item.version} · {formatDate(item.uploaded_at)} · {item.visibility || 'Mindenki'}</p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            {item.acknowledged_at ? <CheckCircle2 className="text-emerald-500" size={18} /> : <AlertTriangle className="text-amber-500" size={18} />}
                            {isManager && (
                              <button
                                type="button"
                                title="Szerkesztés"
                                onClick={() => {
                                  setEditingDocId(item.id);
                                  setEditDocData({
                                    title: item.title,
                                    category: item.category,
                                    version: item.version ?? '1.0',
                                    visibility: item.visibility ?? 'Mindenki',
                                  });
                                  setDocActionError('');
                                }}
                                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-brand-600"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white hover:bg-slate-700"
                            type="button"
                            onClick={async () => {
                              const result = await getDocumentSignedUrlAction(item.file_url);
                              if (result.success && result.url) {
                                window.open(result.url, '_blank', 'noopener,noreferrer');
                              } else {
                                alert(result.error ?? 'Nem sikerült megnyitni a dokumentumot.');
                              }
                            }}
                          >
                            Megnyitás
                          </button>
                          {!item.acknowledged_at && (
                            <button
                              className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white hover:bg-emerald-700"
                              type="button"
                              onClick={() => acknowledgeDocumentAction(item.id)}
                            >
                              Elolvasva
                            </button>
                          )}
                          {isManager && deletingDocId === item.id ? (
                            <span className="flex items-center gap-1">
                              <span className="text-xs text-rose-600 font-medium">Biztosan törlöd?</span>
                              <button
                                type="button"
                                disabled={docActionLoading}
                                className="rounded-xl bg-rose-600 px-3 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
                                onClick={async () => {
                                  setDocActionLoading(true);
                                  await deleteDocumentAction(item.id, data.buildingId);
                                  setDocActionLoading(false);
                                  setDeletingDocId(null);
                                }}
                              >
                                Igen, törlés
                              </button>
                              <button type="button" onClick={() => setDeletingDocId(null)} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200">Mégse</button>
                            </span>
                          ) : isManager && (
                            <button
                              type="button"
                              onClick={() => setDeletingDocId(item.id)}
                              className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50"
                            >
                              Törlés
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </article>
                ))}
              </div>
            </SectionCard>

            <SectionCard id="finances" title="Pénzügyi átláthatóság" icon={<CircleDollarSign size={18} />} action={
              isAdminLike ? (
                <button
                  type="button"
                  onClick={() => { setShowChargeForm((v) => !v); setChargeStatus('idle'); setChargeError(''); }}
                  className="rounded-2xl bg-brand-600 px-3 py-2 text-xs font-bold text-white hover:bg-brand-700"
                >
                  + Terhelés rögzítése
                </button>
              ) : undefined
            }>
              <p className="mb-4 text-sm text-slate-500">Összesen: {formatCurrency(totalDue)} · Befizetve: {formatCurrency(totalPaid)} · Hátralék: <span className={arrears > 0 ? 'font-bold text-rose-600' : 'text-emerald-700'}>{formatCurrency(arrears)}</span></p>
              <div className="mb-4 h-3 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-cyan-400" style={{ width: `${Math.min((totalPaid / Math.max(totalDue, 1)) * 100, 100)}%` }} />
              </div>

              {/* Charge generation form */}
              {isAdminLike && showChargeForm && (
                <form
                  className="mb-4 space-y-3 rounded-2xl border border-brand-100 bg-brand-50/60 p-4"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    setChargeStatus('saving');
                    setChargeError('');
                    const result = await createChargeAction({
                      buildingId: (fd.get('building_id') as string) || 'global',
                      period: fd.get('period') as string,
                      chargePerUnit: parseFloat(fd.get('charge_per_unit') as string),
                      dueDate: fd.get('due_date') as string,
                      description: (fd.get('description') as string) || undefined,
                    });
                    if (result.success) {
                      setChargeStatus('done');
                      (e.target as HTMLFormElement).reset();
                    } else {
                      setChargeStatus('error');
                      setChargeError(result.error ?? 'Ismeretlen hiba');
                    }
                  }}
                >
                  <p className="text-xs font-bold text-brand-800">Közös költség terhelés — összes albetétnek</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input name="period" type="month" required className="rounded-2xl border border-slate-200 px-3 py-2 text-sm" placeholder="Időszak (YYYY-MM)" />
                    <input name="charge_per_unit" type="number" min={1} max={10000000} required className="rounded-2xl border border-slate-200 px-3 py-2 text-sm" placeholder="Összeg (Ft/albetét)" />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input name="due_date" type="date" required className="rounded-2xl border border-slate-200 px-3 py-2 text-sm" />
                    <input name="description" className="rounded-2xl border border-slate-200 px-3 py-2 text-sm" placeholder="Leírás (opcionális)" />
                  </div>
                  <input name="building_id" type="hidden" value="" />
                  <button type="submit" disabled={chargeStatus === 'saving'} className="btn-primary disabled:opacity-50">
                    {chargeStatus === 'saving' ? 'Rögzítés...' : 'Terhelés rögzítése'}
                  </button>
                  {chargeStatus === 'done' && <p className="text-sm font-semibold text-emerald-700">Terhelés rögzítve.</p>}
                  {chargeStatus === 'error' && <p className="text-sm font-semibold text-rose-600">{chargeError}</p>}
                </form>
              )}

              <ul className="space-y-2 text-sm">
                {data.finances.map((entry) => {
                  const isCharge = !entry.entry_type || entry.entry_type === 'charge';
                  const isPayment = entry.entry_type === 'payment';
                  return (
                    <li key={entry.id} className={`rounded-2xl border p-3 ${isPayment ? 'border-emerald-100 bg-emerald-50/60' : 'border-slate-100 bg-slate-50'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-slate-900">{entry.description ?? entry.period}</p>
                          {isCharge && <p className="text-slate-500">Esedékes: {formatCurrency(entry.expected_amount)} · Befizetve: {formatCurrency(entry.paid_amount)} · Határidő: {formatDate(entry.due_date)}</p>}
                          {isPayment && <p className="text-emerald-700 font-semibold">+{formatCurrency(entry.paid_amount)} befizetés{entry.payment_reference ? ` · Ref: ${entry.payment_reference}` : ''}</p>}
                        </div>
                        {isCharge && isAdminLike && (
                          <button
                            type="button"
                            onClick={() => setShowPaymentForm(entry.id)}
                            className="rounded-xl border border-emerald-200 bg-white px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50 shrink-0"
                          >
                            Befizetés
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </SectionCard>

            <SectionCard id="meters" title="Energiafogyasztás és mérőórák" icon={<Gauge size={18} />}>
              <EnergyDashboard
                readings={data.meterReadings}
                saved={meterSaved}
                onSubmit={async (type, value, date) => {
                  await submitMeterReadingAction({ meter_type: type, value, reading_date: date, unit_label: unit || undefined });
                  setMeterSaved(true);
                  setTimeout(() => setMeterSaved(false), 3000);
                }}
              />
            </SectionCard>

          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <SectionCard id="meetings" title="Közgyűlés, határozatok és szavazás" icon={<Vote size={18} />} action={
              isManager ? (
                <button
                  type="button"
                  onClick={() => { setShowMeetingForm((v) => !v); setMeetingStatus('idle'); setMeetingError(''); }}
                  className="rounded-2xl bg-brand-600 px-3 py-2 text-xs font-bold text-white hover:bg-brand-700"
                >
                  + Közgyűlés
                </button>
              ) : undefined
            }>
              {/* Meeting creation form */}
              {isManager && showMeetingForm && (
                <form
                  className="mb-4 space-y-3 rounded-2xl border border-brand-100 bg-brand-50/60 p-4"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    const agendaRaw = (fd.get('agenda') as string).split('\n').filter(Boolean);
                    const agendaItems = agendaRaw.map((title, i) => ({ order_no: i + 1, title: title.trim() }));
                    setMeetingStatus('saving');
                    setMeetingError('');
                    const result = await createMeetingAction({
                      building_id: (fd.get('building_id') as string) || 'global',
                      title: fd.get('title') as string,
                      scheduled_at: fd.get('scheduled_at') as string,
                      location: fd.get('location') as string,
                      chairperson_name: (fd.get('chairperson') as string) || undefined,
                      secretary_name: (fd.get('secretary') as string) || undefined,
                      agenda_items: agendaItems,
                    });
                    if (result.success) {
                      setMeetingStatus('done');
                      (e.target as HTMLFormElement).reset();
                      setShowMeetingForm(false);
                    } else {
                      setMeetingStatus('error');
                      setMeetingError(result.error ?? 'Ismeretlen hiba');
                    }
                  }}
                >
                  <p className="text-xs font-bold text-brand-800">Új közgyűlés létrehozása</p>
                  <input name="title" required className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm" placeholder="Közgyűlés neve" />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input name="scheduled_at" type="datetime-local" required className="rounded-2xl border border-slate-200 px-3 py-2 text-sm" />
                    <input name="location" className="rounded-2xl border border-slate-200 px-3 py-2 text-sm" placeholder="Helyszín" />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input name="chairperson" className="rounded-2xl border border-slate-200 px-3 py-2 text-sm" placeholder="Levezető elnök neve" />
                    <input name="secretary" className="rounded-2xl border border-slate-200 px-3 py-2 text-sm" placeholder="Jegyzőkönyvvezető neve" />
                  </div>
                  <textarea name="agenda" required rows={4} className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm" placeholder="Napirendi pontok (soronként egy)" />
                  <input name="building_id" type="hidden" value="" />
                  <button type="submit" disabled={meetingStatus === 'saving'} className="btn-primary disabled:opacity-50">
                    {meetingStatus === 'saving' ? 'Létrehozás...' : 'Közgyűlés létrehozása'}
                  </button>
                  {meetingStatus === 'error' && <p className="text-sm font-semibold text-rose-600">{meetingError}</p>}
                </form>
              )}

              <div className="space-y-3">
                {meetings.map((meeting) => {
                  const quorumPct = meeting.actual_quorum != null ? (meeting.actual_quorum * 100).toFixed(1) : null;
                  const thresholdPct = ((meeting.quorum_threshold ?? 0.5) * 100).toFixed(0);
                  const quorumMet = meeting.actual_quorum != null && meeting.actual_quorum >= (meeting.quorum_threshold ?? 0.5);

                  return (
                    <article key={meeting.id} className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <button
                            type="button"
                            className="text-left font-black text-slate-950 hover:text-brand-700"
                            onClick={() => handleOpenMeeting(meeting)}
                          >
                            {meeting.title}
                          </button>
                          <p className="mt-1 text-sm text-slate-500">
                            {formatDateTime(meeting.scheduled_at)}
                            {meeting.location ? ` · ${meeting.location}` : ''}
                            {' · '}{meeting.resolution_count} határozat
                          </p>
                          {meeting.agenda_preview ? <p className="mt-1 text-sm italic text-slate-600">Napirend: {meeting.agenda_preview}</p> : null}
                          {quorumPct ? (
                            <p className={`mt-1 text-xs font-bold ${quorumMet ? 'text-emerald-700' : 'text-rose-600'}`}>
                              Kvórum: {quorumPct}% ({quorumMet ? `✓ határozatképes (min. ${thresholdPct}%)` : `✗ nem határozatképes (min. ${thresholdPct}%)`})
                            </p>
                          ) : null}
                          {meeting.invitation_sent_at ? (
                            <p className="mt-1 text-xs text-emerald-700">Meghívó kiküldve: {formatDateTime(meeting.invitation_sent_at)}</p>
                          ) : null}
                        </div>
                        <StatusBadge status={meeting.status} />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                        <button
                          type="button"
                          className="rounded-xl bg-brand-600 px-3 py-2 text-white hover:bg-brand-700"
                          onClick={() => handleOpenMeeting(meeting)}
                        >
                          Részletek / Jelenlét
                        </button>
                        {isManager && meeting.status === 'tervezett' && (
                          <>
                            <button
                              type="button"
                              className="rounded-xl bg-brand-50 px-3 py-2 text-brand-700 hover:bg-brand-100"
                              onClick={async () => {
                                const result = await sendInvitationAction(meeting.id);
                                if (!result.success) alert(result.error);
                                else alert(`Meghívó kiküldési rekord rögzítve (${result.days_until_meeting} nap múlva a közgyűlés).`);
                              }}
                            >
                              Meghívó küldés
                            </button>
                            <button
                              type="button"
                              className="rounded-xl bg-slate-100 px-3 py-2 text-slate-700 hover:bg-slate-200"
                              onClick={async () => {
                                if (!confirm('Közgyűlés lezárása? A kvórum és határozatképesség rögzítve lesz.')) return;
                                const result = await closeMeetingAction(meeting.id, data.buildingId ?? '');
                                if (!result.success) alert(result.error);
                                else {
                                  const pct = result.actual_quorum != null ? (result.actual_quorum * 100).toFixed(1) : '?';
                                  alert(`Közgyűlés lezárva. Megjelent tulajdoni hányad: ${pct}%`);
                                  setMeetings((prev) => prev.map((m) => m.id === meeting.id ? { ...m, status: 'lezart' as const, actual_quorum: result.actual_quorum } : m));
                                }
                              }}
                            >
                              Lezárás
                            </button>
                          </>
                        )}
                      </div>
                    </article>
                  );
                })}
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
                    {isManager ? (
                      <select
                        defaultValue={workOrder.status}
                        onChange={async (e) => {
                          await updateWorkOrderStatusAction(workOrder.id, e.target.value as WorkOrderItem['status']);
                        }}
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      >
                        <option value="tervezett">Tervezett</option>
                        <option value="kikuldve">Kiküldve</option>
                        <option value="folyamatban">Folyamatban</option>
                        <option value="lezarva">Lezárva</option>
                      </select>
                    ) : (
                      <StatusBadge status={workOrder.status} />
                    )}
                  </article>
                ))}
              </div>
            </SectionCard>
          </section>

          <section className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
            <SectionCard title="Hírfolyam" icon={<BellRing size={18} />}>
              <ul className="space-y-3">
                {newsItems.map((item) => {
                  const expanded = expandedNews.includes(item.id);
                  const isUnread = !item.read_at;
                  const isUrgent = item.priority === 'urgent';
                  const isHigh = item.priority === 'high';
                  return (
                    <li
                      key={item.id}
                      className={`rounded-3xl border p-4 shadow-sm ${
                        isUrgent
                          ? 'border-rose-200 bg-rose-50'
                          : isHigh
                          ? 'border-amber-200 bg-amber-50'
                          : isUnread
                          ? 'border-brand-100 bg-brand-50/50'
                          : 'border-slate-100 bg-white'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className={`font-black ${isUnread ? 'text-slate-950' : 'text-slate-700'}`}>{item.title}</p>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {isUrgent && <span className="rounded-full bg-rose-500 px-2 py-0.5 text-xs font-bold text-white">Sürgős</span>}
                          {isHigh && !isUrgent && <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white">Fontos</span>}
                          {isUnread && !isUrgent && !isHigh && <span className="h-2 w-2 rounded-full bg-brand-500" />}
                          {!isUnread && <CheckCircle2 size={14} className="text-emerald-500" />}
                        </div>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">{expanded ? item.content : previewText(item.content)}</p>
                      <p className="mt-2 text-xs text-slate-400">
                        {newsCategoryLabels[item.category || 'egyeb']} · {item.source_label || item.created_by_name || 'Ismeretlen forrás'} · {formatDateTime(item.created_at)}
                        {item.deadline ? ` · Határidő: ${formatDate(item.deadline)}` : ''}
                        {isManager && item.read_count != null ? ` · ${item.read_count} olvasva` : ''}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          className="text-xs font-black text-brand-700 hover:underline"
                          onClick={() => setExpandedNews((prev) => (prev.includes(item.id) ? prev.filter((newsId) => newsId !== item.id) : [...prev, item.id]))}
                        >
                          {expanded ? 'Összecsukás' : 'Teljes hír megnyitása'}
                        </button>
                        {isUnread && item.requires_acknowledgement && !isManager && (
                          <button
                            type="button"
                            disabled={ackingNewsId === item.id}
                            className="rounded-full bg-brand-600 px-3 py-1 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-60"
                            onClick={async () => {
                              setAckingNewsId(item.id);
                              const result = await acknowledgeAnnouncementAction(item.id, data.buildingId);
                              if (result.success) {
                                setNewsItems((prev) => prev.map((n) => n.id === item.id ? { ...n, read_at: new Date().toISOString() } : n));
                              }
                              setAckingNewsId(null);
                            }}
                          >
                            {ackingNewsId === item.id ? 'Mentés…' : 'Elolvasva ✓'}
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </SectionCard>

            <SectionCard id="notifications" title="Értesítési napló" icon={<UserCog size={18} />}>
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
              <SectionCard title="Célzott kommunikáció / hírküldés" icon={<Radio size={18} />}>
                <AnnouncementComposer
                  buildingId={data.buildingId}
                  units={data.units.map((u) => ({ id: u.id, unit_label: u.unit_label }))}
                  onSuccess={() => {
                    // News feed will refresh on next page load; optimistic feedback handled inside composer
                  }}
                />
              </SectionCard>
            ) : (
              <SectionCard title="Értesítések" icon={<MessageSquare size={18} />}>
                <p className="text-sm leading-6 text-slate-600">
                  Az épület értesítései a Hírfolyam blokkban jelennek meg. A visszaigazolást igénylő értesítéseken az &quot;Elolvasva&quot; gombbal jelezheted, hogy tudomásul vetted.
                </p>
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

          {/* ── Térképek — oldal legaljára ─────────────────────────────────── */}
          <SectionCard id="transport" title="Közlekedés és tömegközl. lefedettség" icon={<Bus size={18} />} note="Közlekedési adat: BKK Zrt., CC BY 4.0">
            <TransportPanel
              lat={data.buildingLat}
              lon={data.buildingLon}
              buildingAddress={data.buildingAddress}
              buildingId={data.buildingId}
            />
          </SectionCard>

          {/* Environment deep-link card */}
          <a
            id="kornyezet-link"
            href={`/w/${data.buildingId}/kornyezet`}
            className="group flex items-center justify-between gap-4 overflow-hidden rounded-[2rem] border border-slate-200/60 bg-white px-6 py-5 shadow-card-md transition-shadow hover:shadow-card-lg"
          >
            <div className="flex items-center gap-4">
              <div className="rounded-2xl bg-sky-50 p-3">
                <Wind size={22} className="text-sky-500" />
              </div>
              <div>
                <p className="text-sm font-black text-slate-900">Levegőminőség és kerékpárutak</p>
                <p className="text-xs text-slate-500">AQI, OLM hőtérkép, kerékpáros infrastruktúra térkép</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-brand-600 group-hover:text-brand-700">
              Megnyitás →
            </div>
          </a>

          {/* Decorative footer skyline — static SVG panel-building band that
              echoes the original v0.6.x branding. Kept as a subtle, low-
              opacity visual signature at the bottom of every dashboard view
              (the live animated DashboardHeroScene is in the header). */}
          <div className="mt-8 pointer-events-none select-none" aria-hidden="true">
            <div
              className="relative mx-auto h-32 max-w-3xl overflow-hidden opacity-40"
              style={{
                WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 18%, black 82%, transparent 100%), linear-gradient(to bottom, transparent 0%, black 22%, black 100%)',
                WebkitMaskComposite: 'source-in',
                maskImage: 'linear-gradient(to right, transparent 0%, black 18%, black 82%, transparent 100%), linear-gradient(to bottom, transparent 0%, black 22%, black 100%)',
                maskComposite: 'intersect',
              }}
            >
              <PanelSkylineSvg />
            </div>
            <p className="mt-2 text-center text-[10px] font-medium tracking-widest text-slate-400 uppercase">
              PanelLakó · a társasházak digitális központja
            </p>
          </div>
        </main>
      </div>

      {/* Kapcsolat modal */}
      {contactOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-black text-slate-900">
                <Mail size={18} className="text-brand-600" /> Kapcsolat
              </h3>
              <button type="button" onClick={() => { setContactOpen(false); setContactStatus('idle'); setContactMessage(''); }} className="rounded-xl p-1.5 hover:bg-slate-100">
                <X size={16} className="text-slate-400" />
              </button>
            </div>

            {contactStatus === 'done' ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <CheckCircle2 size={40} className="text-emerald-500" />
                <p className="font-black text-slate-900">Üzenet elküldve!</p>
                <p className="text-sm text-slate-500">Hamarosan felvesszük veled a kapcsolatot.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Tárgy</label>
                  <select
                    value={contactSubject}
                    onChange={(e) => setContactSubject(e.target.value as ContactSubject)}
                    className="input-base"
                  >
                    {CONTACT_SUBJECTS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
                    Üzenet <span className="normal-case font-normal text-slate-400">({contactMessage.length}/2000)</span>
                  </label>
                  <textarea
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value.slice(0, 2000))}
                    rows={6}
                    placeholder="Írd le röviden, miben segíthetünk…"
                    className="input-base min-h-[120px] resize-none"
                  />
                </div>

                {contactStatus === 'error' && (
                  <p className="rounded-2xl bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700">{contactError}</p>
                )}

                <button
                  type="button"
                  disabled={!contactMessage.trim() || contactStatus === 'sending'}
                  onClick={handleContactSend}
                  className="btn-primary w-full"
                >
                  {contactStatus === 'sending' ? (
                    <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Küldés…</>
                  ) : (
                    <><Send size={15} /> Üzenet elküldése</>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Payment Recording Modal */}
      {showPaymentForm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="mb-4 text-lg font-black text-slate-900 flex items-center gap-2">
              <CircleDollarSign size={18} className="text-emerald-600" />
              Befizetés rögzítése
            </h3>
            <form
              className="space-y-3"
              onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                setPaymentStatus('saving');
                const entry = data.finances.find((f) => f.id === showPaymentForm);
                const result = await recordPaymentAction({
                  unitId: entry?.unit_id ?? '',
                  amount: parseFloat(fd.get('amount') as string),
                  paymentDate: fd.get('payment_date') as string,
                  reference: (fd.get('reference') as string) || undefined,
                });
                if (result.success) {
                  setPaymentStatus('done');
                  setShowPaymentForm(null);
                } else {
                  setPaymentStatus('error');
                }
              }}
            >
              <input name="amount" type="number" min={1} max={10000000} required className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Összeg (Ft)" />
              <input name="payment_date" type="date" required className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" />
              <input name="reference" className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm" placeholder="Banki hivatkozás (opcionális)" />
              <div className="flex gap-3 mt-4">
                <button type="submit" disabled={paymentStatus === 'saving'} className="flex-1 rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-50">
                  {paymentStatus === 'saving' ? 'Mentés...' : 'Befizetés rögzítése'}
                </button>
                <button type="button" onClick={() => { setShowPaymentForm(null); setPaymentStatus('idle'); }} className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50">
                  Mégse
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* AI Override Modal */}
      {overrideTicketId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-black text-slate-900">
              <Sparkles size={18} className="text-violet-600" />
              AI triázs módosítása
            </h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-700">Kategória</label>
                <select
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                  value={overrideCategory}
                  onChange={(e) => setOverrideCategory(e.target.value)}
                >
                  <option value="plumbing">Vízvezeték</option>
                  <option value="electrical">Elektromos</option>
                  <option value="structural">Szerkezeti</option>
                  <option value="common_area">Közös terület</option>
                  <option value="emergency">Vészhelyzet</option>
                  <option value="hvac">Fűtés / Légkond.</option>
                  <option value="elevator">Lift</option>
                  <option value="other">Egyéb</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold text-slate-700">Sürgősség: {overrideUrgency}/10</label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={overrideUrgency}
                  onChange={(e) => setOverrideUrgency(Number(e.target.value))}
                  className="w-full accent-violet-600"
                />
                <div className="mt-1 flex justify-between text-xs text-slate-400">
                  <span>1 — Rutinkarbantartás</span>
                  <span>10 — Életveszély</span>
                </div>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                className="flex-1 rounded-2xl bg-violet-600 px-4 py-3 text-sm font-black text-white hover:bg-violet-700 disabled:opacity-50"
                onClick={submitAiOverride}
                disabled={overrideSaving}
                type="button"
              >
                {overrideSaving ? 'Mentés...' : 'Mentés'}
              </button>
              <button
                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
                onClick={() => setOverrideTicketId(null)}
                type="button"
              >
                Mégse
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {selectedMeeting && (
        meetingPanelLoading ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <div className="rounded-2xl bg-white px-8 py-6 text-sm font-semibold text-slate-700 shadow-2xl">Betöltés...</div>
          </div>
        ) : meetingPanelData ? (
          <MeetingDetailPanel
            meeting={{ ...selectedMeeting, ...meetingPanelData.meeting }}
            buildingId={data.buildingId ?? ''}
            units={data.units}
            attendances={meetingPanelData.attendances}
            agendaItems={meetingPanelData.agenda_items}
            resolutions={meetingPanelData.resolutions}
            isManager={isManager}
            supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''}
            onClose={() => { setSelectedMeeting(null); setMeetingPanelData(null); }}
            onRefresh={handleRefreshMeetingPanel}
          />
        ) : null
      )}
    </div>
  );
}
