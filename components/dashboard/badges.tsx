import { Sparkles } from 'lucide-react';
import Badge, { type BadgeTone } from '@/components/ui/badge';
import type { AiCategory, MeetingItem, Ticket, WorkOrderItem } from '@/lib/types';

/*
 * Domain badges — ticket/meeting/work-order status, priority and AI triage
 * (extracted from dashboard-client.tsx in v0.9.33; restyled on the shared
 * dark Badge primitive, semantics unchanged).
 */

const STATUS_TONE: Record<string, BadgeTone> = {
  uj:          'info',
  folyamatban: 'warning',
  varakozik:   'violet',
  lezarva:     'success',
  tervezett:   'info',
  kikuldve:    'violet',
  lezart:      'success',
};

const STATUS_LABEL: Record<string, string> = {
  uj: 'Új', folyamatban: 'Folyamatban', varakozik: 'Várakozik',
  lezarva: 'Lezárva', tervezett: 'Tervezett', kikuldve: 'Kiküldve', lezart: 'Lezárt',
};

export function StatusBadge({ status }: { status: Ticket['status'] | WorkOrderItem['status'] | MeetingItem['status'] }) {
  return <Badge tone={STATUS_TONE[status] ?? 'info'}>{STATUS_LABEL[status] ?? status}</Badge>;
}

const PRIORITY_TONE: Record<Ticket['priority'], BadgeTone> = {
  alacsony: 'neutral',
  kozepes:  'info',
  magas:    'warning',
  kritikus: 'danger',
};

const PRIORITY_LABEL: Record<Ticket['priority'], string> = {
  alacsony: 'Alacsony', kozepes: 'Közepes', magas: 'Magas', kritikus: 'Kritikus',
};

export function PriorityBadge({ priority }: { priority: Ticket['priority'] }) {
  return <Badge tone={PRIORITY_TONE[priority]}>{PRIORITY_LABEL[priority]}</Badge>;
}

// ─── AI triage ────────────────────────────────────────────────────────────────

export const AI_CATEGORY_LABELS: Record<AiCategory, string> = {
  plumbing: 'Vízvezeték',
  electrical: 'Elektromos',
  structural: 'Szerkezeti',
  common_area: 'Közös terület',
  emergency: 'Vészhelyzet',
  hvac: 'Fűtés/légk.',
  elevator: 'Lift',
  other: 'Egyéb',
};

const AI_CATEGORY_TONE: Record<AiCategory, BadgeTone> = {
  plumbing: 'info',
  electrical: 'warning',
  structural: 'neutral',
  common_area: 'violet',
  emergency: 'danger',
  hvac: 'warning',
  elevator: 'violet',
  other: 'neutral',
};

export function AiUrgencyBadge({ urgency }: { urgency: number | null | undefined }) {
  if (urgency === null || urgency === undefined) {
    return (
      <Badge tone="neutral" className="animate-pulse">
        <span className="h-2 w-2 rounded-full bg-slate-500" />
        AI…
      </Badge>
    );
  }
  const tone: BadgeTone = urgency <= 4 ? 'success' : urgency <= 7 ? 'warning' : 'danger';
  return (
    <Badge tone={tone}>
      <Sparkles size={10} />
      {`AI ${urgency}${urgency > 7 ? '!' : ''}`}
    </Badge>
  );
}

export function AiCategoryChip({ category }: { category: AiCategory | string | null | undefined }) {
  if (!category) return null;
  const safeCategory = (Object.keys(AI_CATEGORY_LABELS).includes(category) ? category : 'other') as AiCategory;
  return <Badge tone={AI_CATEGORY_TONE[safeCategory]}>{AI_CATEGORY_LABELS[safeCategory]}</Badge>;
}

export function AiTriagePendingSkeleton() {
  return (
    <div className="mt-2 flex animate-pulse items-center gap-2">
      <div className="h-5 w-16 rounded-full bg-white/[0.06]" />
      <div className="h-5 w-20 rounded-full bg-white/[0.06]" />
      <div className="h-4 w-32 rounded bg-white/[0.06]" />
    </div>
  );
}
