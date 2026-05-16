'use client';

import Link from 'next/link';
import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react';
import {
  Activity,
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
  Radio,
  MessageSquare,
  Search,
  ShieldCheck,
  Siren,
  Sparkles,
  Terminal,
  TicketCheck,
  UserCog,
  UserRound,
  Vote,
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
import { acknowledgeDocument as acknowledgeDocumentAction, uploadDocument as uploadDocumentAction, getDocumentSignedUrl as getDocumentSignedUrlAction, deleteDocument as deleteDocumentAction, updateDocument as updateDocumentAction } from '@/app/actions/documents';
import { updateWorkOrderStatus as updateWorkOrderStatusAction } from '@/app/actions/work-orders';
// votes action imported on-demand in the votes tab handler
import { createCharge as createChargeAction, recordPayment as recordPaymentAction } from '@/app/actions/finance';
import { createMeeting as createMeetingAction, closeMeeting as closeMeetingAction, sendAssemblyInvitation as sendInvitationAction, getMeetingWithDetails } from '@/app/actions/meetings';
import MeetingDetailPanel from '@/components/meeting-detail-panel';
import AnnouncementComposer from '@/components/announcement-composer';

type DashboardData = {
  source: string;
  buildingId?: string;
  buildingName?: string;
  buildingAddress?: string;
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
  const [addressOptions, setAddressOptions] = useState<string[]>([]);
  const [addressError, setAddressError] = useState('');
  const [isAddressLoading, setIsAddressLoading] = useState(false);

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

  // === HÁZ RADAR: building health score ===
  const criticalTickets = tickets.filter((t) => t.priority === 'kritikus' && t.status !== 'lezarva').length;
  const highTickets = tickets.filter((t) => t.priority === 'magas' && t.status !== 'lezarva').length;
  const unacknowledgedDocs = data.documents.filter((d) => !d.acknowledged_at).length;
  const upcomingMeetings = data.meetings.filter((m) => m.status === 'tervezett').length;
  const buildingHealth = Math.max(0, Math.min(100,
    100
    - criticalTickets * 20
    - highTickets * 8
    - Math.min(openTicketCount * 3, 15)
    - (arrears > 100000 ? 15 : arrears > 50000 ? 8 : 0)
    - Math.min(unreadNotificationCount * 3, 12)
  ));

  // === SIGNAL NAV: nav items with live counts ===
  const signalNav = [
    { href: '#overview', label: 'Áttekintő', icon: Home, count: 0, critical: 0 },
    { href: '#tasks', label: 'Teendők', icon: ClipboardCheck, count: openTicketCount + unreadNotificationCount, critical: criticalTickets },
    { href: '#tickets', label: 'Bejelentések', icon: TicketCheck, count: openTicketCount, critical: criticalTickets },
    { href: '#units', label: 'Albetétek', icon: Building2, count: 0, critical: 0 },
    { href: '#documents', label: 'Dokumentumok', icon: FileText, count: unacknowledgedDocs, critical: 0 },
    { href: '#finances', label: 'Pénzügyek', icon: CircleDollarSign, count: arrears > 0 ? 1 : 0, critical: arrears > 100000 ? 1 : 0 },
    { href: '#meters', label: 'Mérőórák', icon: Gauge, count: 0, critical: 0 },
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setKommandOpen(false); setKommandQuery(''); }
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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#ccfbf1_0,#f8fafc_30%,#eef2ff_100%)] text-slate-900">
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="hidden border-r border-slate-800/60 bg-slate-950 text-slate-200 shadow-2xl lg:block">
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
                <div className="mb-3 rounded-xl border border-slate-800/60 bg-black/20 px-3 py-2.5">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-700 mb-1">Aktuális épület</p>
                  <p className="text-xs font-semibold text-slate-300 leading-snug truncate">{data.buildingName}</p>
                  {data.buildingAddress && (
                    <p className="text-[10px] text-slate-600 truncate mt-0.5">{data.buildingAddress}</p>
                  )}
                  <Link
                    href="/app"
                    className="mt-2 flex items-center gap-1.5 text-[10px] font-medium text-teal-500 hover:text-teal-400 transition-colors"
                  >
                    <Layers3 size={11} />
                    Épület váltása
                  </Link>
                </div>
              )}

              {/* HÁZ RADAR */}
              <div className="mb-4 rounded-2xl border border-slate-800/80 bg-black/40 p-3.5">
                <div className="mb-2.5 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Ház Radar</span>
                  <Activity size={11} className="text-slate-700" />
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative h-16 w-16 shrink-0">
                    <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
                      <circle cx="32" cy="32" r="24" fill="none" stroke="#0f172a" strokeWidth="6" />
                      <circle
                        cx="32" cy="32" r="24"
                        fill="none"
                        stroke={buildingHealth > 75 ? '#10b981' : buildingHealth > 45 ? '#f59e0b' : '#ef4444'}
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={`${(buildingHealth / 100) * 150.8} 150.8`}
                        className="transition-all duration-1000"
                        style={{ filter: `drop-shadow(0 0 4px ${buildingHealth > 75 ? '#10b98166' : buildingHealth > 45 ? '#f59e0b66' : '#ef444466'})` }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className={`text-base font-black tabular-nums leading-none ${buildingHealth > 75 ? 'text-emerald-400' : buildingHealth > 45 ? 'text-amber-400' : 'text-rose-400'}`}>
                        {buildingHealth}
                      </span>
                      <span className="mt-0.5 text-[9px] text-slate-700">/ 100</span>
                    </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    {[
                      { label: 'Ügyek', val: openTicketCount, max: 10, bar: 'bg-sky-500' },
                      { label: 'Hátralék', val: arrears > 0 ? 1 : 0, max: 1, bar: 'bg-amber-500' },
                      { label: 'Értesítés', val: unreadNotificationCount, max: 8, bar: 'bg-violet-500' },
                    ].map((sig) => (
                      <div key={sig.label} className="flex items-center gap-2">
                        <span className="w-12 shrink-0 text-[10px] text-slate-700">{sig.label}</span>
                        <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-800">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${sig.bar}`}
                            style={{ width: `${Math.min((sig.val / sig.max) * 100, 100)}%` }}
                          />
                        </div>
                        <span className="w-3 shrink-0 text-right text-[10px] tabular-nums text-slate-700">{sig.val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* SIGNAL NAV */}
              <nav className="sidebar-scroll flex-1 space-y-0.5 overflow-y-auto">
                {signalNav.map((item) => {
                  const Icon = item.icon;
                  const hasCritical = item.critical > 0;
                  const hasActivity = item.count > 0;
                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      className="group relative flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all hover:bg-white/8 hover:text-white"
                    >
                      {hasCritical && (
                        <span className="absolute left-1.5 top-1/2 h-3.5 w-0.5 -translate-y-1/2 animate-pulse rounded-full bg-rose-500" />
                      )}
                      <Icon
                        size={15}
                        className={hasCritical ? 'text-rose-400' : hasActivity ? 'text-slate-300' : 'text-slate-700'}
                      />
                      <span className={hasCritical ? 'text-slate-300' : hasActivity ? 'text-slate-400' : 'text-slate-700'}>
                        {item.label}
                      </span>
                      {hasActivity && (
                        <span className={`ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-black tabular-nums ${hasCritical ? 'bg-rose-500/15 text-rose-400' : 'bg-white/8 text-slate-500'}`}>
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

              {/* ROLE PANEL */}
              <div className="mt-3 rounded-2xl border border-slate-800/60 bg-black/30 p-3.5">
                <p className="text-[10px] uppercase tracking-widest text-slate-700">Aktív szerepkör</p>
                <p className="mt-1 text-sm font-bold text-white">{roleLabels[data.currentUser.role]}</p>
                <div className="mt-2.5 flex flex-wrap gap-1.5 text-xs">
                  {(['lako', 'megbizott', 'kozos_kepviselo'] as Role[]).map((role) => (
                    <Link key={role} href={`/?role=${role}`} className="rounded-full bg-slate-900 px-2.5 py-1 text-slate-500 transition hover:bg-slate-800 hover:text-slate-300">
                      {roleLabels[role]}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </aside>

        <main className="space-y-6 px-4 py-5 md:px-8 lg:px-10">
          <header className="flex flex-col gap-4 rounded-[2rem] border border-white/70 bg-white/80 p-4 shadow-[0_18px_70px_rgba(15,23,42,0.08)] backdrop-blur md:flex-row md:items-center md:justify-between">
            <div>
              {data.buildingName ? (
                <>
                  {/* Mobile building switcher — tappable breadcrumb, hidden on lg (sidebar handles it) */}
                  <Link
                    href="/app"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-teal-600 hover:text-teal-800 mb-1 lg:hidden"
                  >
                    <Layers3 size={12} />
                    <span className="truncate max-w-[200px]">{data.buildingName}</span>
                    <ChevronRight size={11} className="text-slate-400 flex-shrink-0" />
                  </Link>
                  <h1 className="text-2xl font-black tracking-tight text-slate-950 md:text-3xl">{data.buildingName}</h1>
                  <p className="mt-1 text-sm text-slate-500">{data.buildingAddress} · Adatforrás: {data.source === 'supabase' ? 'Supabase' : 'Mock/demo'}</p>
                </>
              ) : (
                <>
                  <h1 className="text-2xl font-black tracking-tight text-slate-950 md:text-3xl">PanelLakó</h1>
                  <p className="mt-1 text-sm text-slate-500">Adatforrás: {data.source === 'supabase' ? 'Supabase' : 'Mock/demo'} · Modern lakói és képviselői működés egy felületen.</p>
                </>
              )}
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
                    const supabase = createClient();
                    await supabase.auth.signOut();
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

          <section className="grid gap-6 xl:grid-cols-3">
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
                  <button type="submit" disabled={chargeStatus === 'saving'} className="rounded-2xl bg-brand-600 px-4 py-2 text-sm font-black text-white hover:bg-brand-700 disabled:opacity-50">
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

            <SectionCard id="meters" title="Mérőóra diktálás" icon={<Gauge size={18} />}>
              <form className="mb-4 space-y-3" onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const meterType = (form.elements.namedItem('meter_type') as HTMLSelectElement).value as 'viz' | 'gaz' | 'villany';
                const value = parseFloat((form.elements.namedItem('meter_value') as HTMLInputElement).value);
                const readingDate = (form.elements.namedItem('reading_date') as HTMLInputElement).value;
                await submitMeterReadingAction({ meter_type: meterType, value, reading_date: readingDate, unit_label: unit || undefined });
                setMeterSaved(true);
                form.reset();
              }}>
                <div className="grid gap-3 sm:grid-cols-2">
                  <select name="meter_type" className="rounded-2xl border border-slate-200 px-3 py-2 text-sm"><option value="viz">víz</option><option value="gaz">gáz</option><option value="villany">villany</option></select>
                  <input name="meter_value" type="number" step="0.01" required className="rounded-2xl border border-slate-200 px-3 py-2 text-sm" placeholder="Érték" />
                </div>
                <input name="reading_date" type="date" required className="w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm" />
                <button className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-black text-white hover:bg-slate-700">Óraállás elküldése</button>
                {meterSaved ? <p className="text-sm font-semibold text-emerald-700">Óraállás rögzítve.</p> : null}
              </form>
              <ul className="space-y-2 text-sm">
                {data.meterReadings.map((reading) => <li key={reading.id} className="rounded-2xl bg-slate-50 p-3"><b>{reading.unit_label}</b> · {reading.meter_type} · {reading.value} · {formatDate(reading.reading_date)}</li>)}
              </ul>
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
                  <button type="submit" disabled={meetingStatus === 'saving'} className="rounded-2xl bg-brand-600 px-4 py-2 text-sm font-black text-white hover:bg-brand-700 disabled:opacity-50">
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

          <section className="grid gap-6 xl:grid-cols-3">
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
        </main>
      </div>

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
