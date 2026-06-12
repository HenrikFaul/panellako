'use client';

import { useState } from 'react';

/*
 * ActivityCalendar — 7-week building activity heatmap (extracted from
 * dashboard-client.tsx in v0.9.33; logic unchanged, emoji scope labels
 * replaced with plain text per enterprise design rules).
 */

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
  ticket:  { label: 'Hibabejelentés',    color: '#f43f5e', scopeLabel: 'Albetét' },
  meeting: { label: 'Közgyűlés',         color: '#3b82f6', scopeLabel: 'Épület'  },
  meter:   { label: 'Mérőóra határidő',  color: '#a855f7', scopeLabel: 'Épület'  },
  vote:    { label: 'Szavazás',          color: '#f59e0b', scopeLabel: 'Épület'  },
};
const SCOPE_LABEL: Record<EventScope, string> = {
  building: 'Épület', unit: 'Albetét', manager: 'Közös képviselő',
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

export interface ActivityCalendarProps {
  tickets:  Array<{ created_at?: string; title?: string; unit_label?: string }>;
  meetings: Array<{ scheduled_at: string; title: string; status: string; agenda_preview?: string }>;
  currentUnit?: string;
}

export default function ActivityCalendar({ tickets, meetings, currentUnit }: ActivityCalendarProps) {
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
    if (cell.isToday) return 'bg-emerald-500/20 ring-1 ring-emerald-500/50';
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
    return 'bg-purple-600/60';
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
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Aktivitás naptár</p>
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
              <span className={`text-[8px] whitespace-nowrap leading-none ${w.isCurrentWeek ? 'font-bold text-slate-400' : 'text-slate-600'}`}>
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
            <span className="text-[8px] text-slate-500">{cfg.label}</span>
          </div>
        ))}
      </div>

      {/* Fixed-position tooltip */}
      {hovered && hoveredCell && (
        <div
          className="pointer-events-none fixed z-[9999] rounded-xl border border-white/10 bg-ink-panel p-3 shadow-overlay"
          style={{
            width: TT_W,
            left: Math.min(mousePos.x - TT_W / 2, (typeof window !== 'undefined' ? window.innerWidth : 1200) - TT_W - 8),
            top: mousePos.y - 130,
          }}
        >
          <p className="mb-2 text-[10px] font-bold text-slate-200">{formatDate(hoveredCell.date)}</p>
          {hoveredEvents.length === 0 ? (
            hoveredCell.isFuture
              ? <p className="text-[9px] italic text-slate-500">Nincs tervezett esemény.</p>
              : <p className="text-[9px] text-slate-500">Nincs aktivitás ezen a napon.</p>
          ) : (
            <div className="space-y-2">
              {(Object.entries(byCategory) as [EventCategory, CalendarEvent[]][]).map(([cat, evs]) => (
                <div key={cat}>
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="inline-block h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: CAT_CFG[cat].color }} />
                    <span className="text-[9px] font-bold" style={{ color: CAT_CFG[cat].color }}>{CAT_CFG[cat].label}</span>
                    <span className="text-[8px] text-slate-500 ml-auto">{CAT_CFG[cat].scopeLabel}</span>
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
