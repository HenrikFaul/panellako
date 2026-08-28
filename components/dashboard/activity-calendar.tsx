'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { getHungarianDateKey } from '../../lib/hungarian-date';

/*
 * ActivityCalendar — 7-week building activity heatmap (extracted from
 * dashboard-client.tsx in v0.9.33; logic unchanged, emoji scope labels
 * replaced with plain text per enterprise design rules).
 */

const HU_MONTHS = ['jan.','feb.','már.','ápr.','máj.','jún.','júl.','aug.','szept.','okt.','nov.','dec.'];
const HU_MONTH_NAMES = ['január','február','március','április','május','június','július','augusztus','szeptember','október','november','december'];
const HU_DAY_NAMES = ['vasárnap','hétfő','kedd','szerda','csütörtök','péntek','szombat'];

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
    d.setUTCDate(viewStart.getUTCDate() + w);
    if (d.getUTCDate() === 20) {
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
  referenceDate: string;
}

export default function ActivityCalendar({ tickets, meetings, currentUnit, referenceDate }: ActivityCalendarProps) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [hovered, setHovered]       = useState<string | null>(null);
  const [mousePos, setMousePos]     = useState({ x: 0, y: 0 });
  const [selected, setSelected]     = useState<string | null>(null);
  const selectedTriggerRef = useRef<HTMLButtonElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  const closeDetails = useCallback(() => {
    const trigger = selectedTriggerRef.current;
    setSelected(null);
    trigger?.focus();
  }, []);

  useEffect(() => {
    if (!selected) return;

    closeButtonRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeDetails();
      } else if (event.key === 'Tab') {
        // The detail sheet deliberately has a single interactive control.
        // Keeping focus on it prevents keyboard users from moving behind the modal.
        event.preventDefault();
        closeButtonRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [closeDetails, selected]);

  const todayKey = referenceDate;
  const today = new Date(`${referenceDate}T00:00:00.000Z`);

  // Monday of the server-provided Hungarian calendar week. UTC-only date
  // arithmetic keeps the SSR and browser trees byte-for-byte identical.
  const dow = today.getUTCDay();
  const thisMon = new Date(today);
  thisMon.setUTCDate(today.getUTCDate() - (dow === 0 ? 6 : dow - 1));

  // View starts at: this Monday + weekOffset weeks
  const viewStart = new Date(thisMon);
  viewStart.setUTCDate(thisMon.getUTCDate() + weekOffset * 7);

  // Build unified event list from all sources
  const allEvents: CalendarEvent[] = [];

  // Tickets → unit scope (or building if no unit)
  for (const t of tickets) {
    if (!t.created_at) continue;
    const key = getHungarianDateKey(t.created_at);
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
    const key = getHungarianDateKey(m.scheduled_at);
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
    const groupedEvents = eventMap.get(ev.date);
    if (groupedEvents) groupedEvents.push(ev);
    else eventMap.set(ev.date, [ev]);
  }

  // Build 7 weeks × 7 days = 49 cells
  const cells: Array<{ key: string; events: CalendarEvent[]; date: Date; isFuture: boolean; isToday: boolean }> = [];
  for (let i = 0; i < 49; i++) {
    const d = new Date(viewStart);
    d.setUTCDate(viewStart.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);
    cells.push({
      key,
      events:   eventMap.get(key) ?? [],
      date:     d,
      isFuture: key > todayKey,
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
    if (cell.isToday) return 'bg-emerald-100 ring-1 ring-emerald-400';
    if (cell.isFuture) {
      // Future: show upcoming events with a soft highlight
      const cat = dominantCat(cell.events);
      if (!cat) return 'bg-slate-50 ring-1 ring-inset ring-slate-200';
      return 'bg-slate-100 ring-1 ring-inset ring-slate-300';
    }
    if (cell.events.length === 0) return 'bg-slate-100';
    const cat = dominantCat(cell.events);
    if (cat === 'ticket') {
      const n = cell.events.filter(e => e.category === 'ticket').length;
      const v = n / pastTicketMax;
      if (v < 0.2)  return 'bg-rose-50 ring-1 ring-rose-100';
      if (v < 0.4)  return 'bg-rose-100';
      if (v < 0.65) return 'bg-rose-200';
      if (v < 0.85) return 'bg-rose-300';
      return 'bg-rose-400 shadow-sm';
    }
    if (cat === 'vote')    return 'bg-amber-200';
    if (cat === 'meeting') return 'bg-sky-200';
    return 'bg-violet-200';
  }

  // Colored dot indicators per category present on a cell
  function cellDots(cell: typeof cells[0]) {
    const cats = Array.from(new Set(cell.events.map(e => e.category))).slice(0, 4);
    return cats.map(cat => (
      <span
        key={cat}
        data-event-dot={cat}
        aria-hidden="true"
        className="inline-block h-1.5 w-1.5 rounded-full shrink-0"
        style={{ backgroundColor: CAT_CFG[cat].color }}
      />
    ));
  }

  // Row labels
  const weeks = Array.from({ length: 7 }, (_, w) => {
    const mon = new Date(viewStart);
    mon.setUTCDate(viewStart.getUTCDate() + w * 7);
    const isCurrentWeek = mon.toISOString().slice(0, 10) === thisMon.toISOString().slice(0, 10);
    return { mon, label: `${HU_MONTHS[mon.getUTCMonth()]} ${mon.getUTCDate()}`, isCurrentWeek };
  });

  const DAYS = ['H', 'K', 'Sz', 'Cs', 'P', 'Szo', 'V'];

  function formatDate(d: Date) {
    return `${d.getUTCFullYear()}. ${HU_MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}.`;
  }

  function accessibleDateLabel(cell: typeof cells[0]) {
    const dateLabel = `${cell.date.getUTCFullYear()}. ${HU_MONTH_NAMES[cell.date.getUTCMonth()]} ${cell.date.getUTCDate()}., ${HU_DAY_NAMES[cell.date.getUTCDay()]}`;
    if (cell.events.length === 0) {
      return `${dateLabel}. ${cell.isFuture ? 'Nincs tervezett esemény.' : 'Nincs aktivitás ezen a napon.'}`;
    }

    const categorySummary = CAT_ORDER
      .map(cat => {
        const count = cell.events.filter(event => event.category === cat).length;
        return count > 0 ? `${CAT_CFG[cat].label}: ${count}` : null;
      })
      .filter((summary): summary is string => summary !== null)
      .join(', ');

    return `${dateLabel}. ${cell.events.length} esemény. ${categorySummary}.`;
  }

  const hoveredCell   = hovered ? cells.find(c => c.key === hovered) : undefined;
  const hoveredEvents = hoveredCell?.events ?? [];
  const selectedCell = selected ? cells.find(cell => cell.key === selected) : undefined;
  const selectedEvents = selectedCell?.events ?? [];

  // Group tooltip events by category for display
  const byCategory = CAT_ORDER.reduce<Partial<Record<EventCategory, CalendarEvent[]>>>((acc, cat) => {
    const evs = hoveredEvents.filter(e => e.category === cat);
    if (evs.length) acc[cat] = evs;
    return acc;
  }, {});

  const selectedByCategory = CAT_ORDER.reduce<Partial<Record<EventCategory, CalendarEvent[]>>>((acc, cat) => {
    const evs = selectedEvents.filter(event => event.category === cat);
    if (evs.length) acc[cat] = evs;
    return acc;
  }, {});

  function openDetails(dateKey: string, trigger: HTMLButtonElement) {
    selectedTriggerRef.current = trigger;
    setHovered(null);
    setSelected(dateKey);
  }

  const TT_W = 240;

  return (
    <div className="flex flex-col h-full select-none">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-700">Aktivitás naptár</p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setWeekOffset(o => o - 1)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-700 transition-colors hover:bg-white hover:text-brand-700 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            aria-label="Korábbi hét megjelenítése"
            title="Korábbi hetek"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M7 1L3 5l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          {weekOffset !== 0 && (
            <button
              type="button"
              onClick={() => setWeekOffset(0)}
              className="min-h-8 rounded-md px-2 text-[11px] font-bold text-slate-700 transition-colors hover:bg-white hover:text-brand-700 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              aria-label="Vissza az aktuális héthez"
            >
              ma
            </button>
          )}
          <button
            type="button"
            onClick={() => setWeekOffset(o => o + 1)}
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-700 transition-colors hover:bg-white hover:text-brand-700 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
            aria-label="Következő hét megjelenítése"
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
        <div className="flex flex-col gap-1.5 pt-6">
          {weeks.map((w) => (
            <div key={w.mon.toISOString()} className="h-8 flex items-center">
              <span data-week-label className={`whitespace-nowrap text-[10px] font-semibold leading-none ${w.isCurrentWeek ? 'text-brand-800' : 'text-slate-700'}`}>
                {w.label}
              </span>
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="flex-1">
          <div className="mb-1.5 grid grid-cols-7 gap-1.5">
            {DAYS.map((d) => (
              <span key={d} data-weekday-label className="text-center text-[10px] font-bold text-slate-700">{d}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {cells.map((cell) => (
              <button
                type="button"
                key={cell.key}
                data-date={cell.key}
                aria-label={accessibleDateLabel(cell)}
                aria-current={cell.isToday ? 'date' : undefined}
                aria-haspopup="dialog"
                aria-expanded={selected === cell.key}
                aria-controls="activity-calendar-details"
                onClick={(event) => openDetails(cell.key, event.currentTarget)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    openDetails(cell.key, event.currentTarget);
                  }
                }}
                onMouseEnter={(e) => { setHovered(cell.key); setMousePos({ x: e.clientX, y: e.clientY }); }}
                onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
                onMouseLeave={() => setHovered(null)}
                className={`relative flex h-8 w-full cursor-pointer flex-col items-center justify-end gap-px rounded pb-1 transition-colors hover:ring-2 hover:ring-brand-400 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 ${cellBg(cell)}`}
              >
                <span data-day-number className="absolute left-1 top-1 text-[11px] font-bold leading-none text-slate-900">
                  {cell.date.getUTCDate()}
                </span>
                {cell.date.getUTCDate() === 1 && (
                  <span className="absolute right-1 top-1 text-[8px] font-bold leading-none text-slate-700">
                    {HU_MONTHS[cell.date.getUTCMonth()]}
                  </span>
                )}
                {cell.events.length > 0 && (
                  <span className="flex items-center justify-center gap-0.5 px-0.5" aria-hidden="true">
                    {cellDots(cell)}
                    <span data-event-count className="ml-0.5 text-[8px] font-extrabold leading-none text-slate-800">
                      {cell.events.length}
                    </span>
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        {(Object.entries(CAT_CFG) as [EventCategory, typeof CAT_CFG[EventCategory]][]).map(([cat, cfg]) => (
          <div key={cat} className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-sm shrink-0" style={{ backgroundColor: cfg.color }} />
            <span className="text-[9px] font-medium text-slate-700">{cfg.label}</span>
          </div>
        ))}
      </div>

      {/* Fixed-position tooltip */}
      {hovered && hoveredCell && (
        <div
          className="pointer-events-none fixed z-[9999] hidden rounded-xl border border-slate-200 bg-white p-3 shadow-card-lg lg:block"
          style={{
            width: TT_W,
            left: Math.min(mousePos.x - TT_W / 2, (typeof window !== 'undefined' ? window.innerWidth : 1200) - TT_W - 8),
            top: mousePos.y - 130,
          }}
        >
          <p className="mb-2 text-[11px] font-bold text-slate-900">{formatDate(hoveredCell.date)}</p>
          {hoveredEvents.length === 0 ? (
            hoveredCell.isFuture
              ? <p className="text-[11px] italic text-slate-600">Nincs tervezett esemény.</p>
              : <p className="text-[11px] text-slate-600">Nincs aktivitás ezen a napon.</p>
          ) : (
            <div className="space-y-2">
              {(Object.entries(byCategory) as [EventCategory, CalendarEvent[]][]).map(([cat, evs]) => (
                <div key={cat}>
                  <div className="flex items-center gap-1 mb-0.5">
                    <span className="inline-block h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: CAT_CFG[cat].color }} />
                    <span className="text-[10px] font-bold" style={{ color: CAT_CFG[cat].color }}>{CAT_CFG[cat].label}</span>
                    <span className="ml-auto text-[9px] text-slate-600">{CAT_CFG[cat].scopeLabel}</span>
                  </div>
                  <ul className="space-y-0.5 pl-2.5">
                    {evs.slice(0, 4).map((ev, i) => (
                      <li key={i} className="flex items-start gap-1 text-[10px] leading-tight text-slate-700">
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
                      <li className="pl-2 text-[9px] font-semibold text-slate-700">+ {evs.length - 4} további…</li>
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
            <p className="mt-1.5 text-[9px] text-slate-600">{SCOPE_LABEL.unit}: {currentUnit}</p>
          )}
        </div>
      )}

      {/* Click/keyboard details: bottom sheet on mobile, centered dialog on desktop. */}
      {selected && selectedCell && (
        <div
          className="fixed inset-0 z-[10000] flex items-end justify-center bg-slate-950/40 sm:p-4 lg:items-center"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDetails();
          }}
        >
          <section
            id="activity-calendar-details"
            role="dialog"
            aria-modal="true"
            aria-labelledby="activity-calendar-details-title"
            aria-describedby="activity-calendar-details-summary"
            className="max-h-[82vh] w-full overflow-y-auto rounded-t-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:max-w-lg sm:rounded-2xl"
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-300 sm:hidden" aria-hidden="true" />
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="activity-calendar-details-title" className="text-base font-bold text-slate-950">
                  {formatDate(selectedCell.date)}
                </h2>
                <p id="activity-calendar-details-summary" className="mt-1 text-sm text-slate-700">
                  {selectedEvents.length > 0
                    ? `${selectedEvents.length} esemény ezen a napon.`
                    : selectedCell.isFuture
                      ? 'Nincs tervezett esemény.'
                      : 'Nincs aktivitás ezen a napon.'}
                </p>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={closeDetails}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-xl font-semibold text-slate-800 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
                aria-label="Bezárás"
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>

            {selectedEvents.length > 0 && (
              <div className="mt-5 space-y-4">
                {(Object.entries(selectedByCategory) as [EventCategory, CalendarEvent[]][]).map(([cat, evs]) => (
                  <div key={cat}>
                    <div className="mb-2 flex items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" aria-hidden="true" style={{ backgroundColor: CAT_CFG[cat].color }} />
                      <h3 className="text-sm font-bold text-slate-900">{CAT_CFG[cat].label}</h3>
                      <span className="ml-auto text-xs font-medium text-slate-600">{evs.length} db · {CAT_CFG[cat].scopeLabel}</span>
                    </div>
                    <ul className="space-y-2 rounded-xl bg-slate-50 p-3">
                      {evs.slice(0, 4).map((event, index) => (
                        <li key={`${event.title}-${index}`} className="text-sm leading-snug text-slate-800">
                          {event.title}
                          {event.unitLabel && (
                            <span className="ml-1 text-xs text-slate-600">({event.unitLabel})</span>
                          )}
                        </li>
                      ))}
                      {evs.length > 4 && (
                        <li className="text-xs font-semibold text-slate-700">+ {evs.length - 4} további esemény</li>
                      )}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {currentUnit && selectedEvents.some(event => event.scope === 'unit') && (
              <p className="mt-4 text-xs text-slate-700">{SCOPE_LABEL.unit}: {currentUnit}</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
