'use client';

import Link from 'next/link';
import React, { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
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

// Defined here (not imported from server action file) to avoid 'use server' serialization issues
const CONTACT_SUBJECTS: ContactSubject[] = ['Ajánlatkérés', 'Érdeklődés', 'Hibabejelentés', 'Visszajelzés', 'Partnerség', 'Egyéb'];
import { acknowledgeDocument as acknowledgeDocumentAction, uploadDocument as uploadDocumentAction, getDocumentSignedUrl as getDocumentSignedUrlAction, deleteDocument as deleteDocumentAction, updateDocument as updateDocumentAction } from '@/app/actions/documents';
import { updateWorkOrderStatus as updateWorkOrderStatusAction } from '@/app/actions/work-orders';
// votes action imported on-demand in the votes tab handler
import { createCharge as createChargeAction, recordPayment as recordPaymentAction } from '@/app/actions/finance';
import { createMeeting as createMeetingAction, closeMeeting as closeMeetingAction, sendAssemblyInvitation as sendInvitationAction, getMeetingWithDetails } from '@/app/actions/meetings';
import MeetingDetailPanel from '@/components/meeting-detail-panel';
import AnnouncementComposer from '@/components/announcement-composer';
import WorkspaceSidebar from '@/components/workspace-sidebar';
import BillingWarningBanner, { type SubscriptionStatus } from '@/components/billing-warning-banner';
import ResidentBottomNav from '@/components/resident-bottom-nav';
import SectionCard from '@/components/ui/section-card';
import StatCard from '@/components/ui/stat-card';
import ActivityCalendar from '@/components/dashboard/activity-calendar';
import {
  AiCategoryChip,
  AiTriagePendingSkeleton,
  AiUrgencyBadge,
  PriorityBadge,
  StatusBadge,
} from '@/components/dashboard/badges';

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
  unitId?: string;
  subscriptionStatus?: string;
  trialEnd?: string;
  currentUser: { full_name: string; role: Role; free_trial_never_expires: boolean };
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
  { href: '#kornyezet-link', label: 'Levegő & Kerékpár', icon: Wind },
  { href: '#meetings', label: 'Közgyűlések', icon: CalendarDays },
  { href: '#knowledge', label: 'Tudásbázis', icon: BookOpen },
  { href: '#audit', label: 'Audit napló', icon: ShieldCheck },
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

function addressCityLine(fullAddress: string, streetName: string): string {
  const stripped = fullAddress.replace(streetName, '').replace(/,\s*$/, '').replace(/^\s*,\s*/, '').trim();
  const postcodeMatch = fullAddress.match(/\b(\d{4})\b/);
  const cleanCity = stripped.replace(/,\s*$/, '').trim();
  if (postcodeMatch && cleanCity && !cleanCity.includes(postcodeMatch[1])) {
    return `${cleanCity} ${postcodeMatch[1]}`;
  }
  return cleanCity || fullAddress;
}

function numberOrZero(value: number | string | null | undefined) {
  return Number(value ?? 0);
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
  const [addressEditMode, setAddressEditMode] = useState(false);

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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
  const isResident = useMemo(() => ['lako', 'tulajdonos'].includes(data.currentUser.role), [data.currentUser.role]);

  const totalDue = data.finances.reduce((acc, item) => acc + numberOrZero(item.expected_amount), 0);
  const totalPaid = data.finances.reduce((acc, item) => acc + numberOrZero(item.paid_amount), 0);
  const arrears = Math.max(totalDue - totalPaid, 0);
  const openTicketCount = tickets.filter((ticket) => ticket.status !== 'lezarva').length;
  const unreadNotificationCount = data.notifications.filter((notification) => !notification.read_at).length;
  const totalArea = data.units.reduce((acc, item) => acc + numberOrZero(item.area_m2), 0);
  const totalOwnershipShare = data.units.reduce((acc, item) => acc + numberOrZero(item.ownership_share), 0);

  // Resident's own unit — matched by unitId prop; fall back to sole unit if unambiguous
  const myUnit = data.unitId
    ? (data.units.find(u => u.id === data.unitId) ?? null)
    : (data.units.length === 1 ? data.units[0] : null);

  const ROLE_LABEL: Record<string, string> = {
    lako: 'Lakó', tulajdonos: 'Tulajdonos', kozos_kepviselo: 'Közös képviselő',
    megbizott: 'Megbízott', bizottsag: 'Bizottsági tag', konyvelo: 'Könyvelő',
  };


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

  // Load saved reference address from DB on mount
  useEffect(() => {
    fetch('/api/user/reference-address')
      .then(r => r.ok ? r.json() : null)
      .then((data: { address?: { display_name: string; lat: number; lon: number; street?: string | null; house_number?: string | null; city?: string | null; district?: string | null; postcode?: string | null; floor?: string | null; door?: string | null; source?: string } | null } | null) => {
        const addr = data?.address;
        if (!addr) {
          setAddressEditMode(true);
          return;
        }
        const opt: AddressOption = {
          id: `saved:${addr.display_name}`,
          label: addr.display_name,
          lat: addr.lat,
          lon: addr.lon,
          street: addr.street ?? undefined,
          houseNumber: addr.house_number ?? undefined,
          settlement: addr.city ?? undefined,
          district: addr.district ?? undefined,
          postcode: addr.postcode ?? undefined,
          source: (addr.source === 'supabase' ? 'supabase' : 'nominatim') as 'supabase' | 'nominatim',
        };
        setSelectedAddress(opt);
        setAddress(addr.display_name);
        if (addr.floor) setFloor(addr.floor);
        if (addr.door) setDoor(addr.door);
        // addressEditMode stays false → compact locked state
      })
      .catch(() => setAddressEditMode(true));
  }, []);

  useEffect(() => {
    if (!addressEditMode || !addressQuery || addressQuery.length < 3) {
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
  }, [addressQuery, addressEditMode]);

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
      { id: 'task-1', title: 'Új hibabejelentések triage', meta: `${tickets.filter((ticket) => ticket.status === 'uj').length} új ticket`, tone: 'bg-brand-500/[0.08] text-brand-300 ring-brand-500/20', href: '#tickets' },
      { id: 'task-2', title: 'Lejárt közös költség ellenőrzés', meta: formatCurrency(arrears), tone: 'bg-amber-500/[0.08] text-amber-300 ring-amber-500/20', href: '#finances' },
      { id: 'task-3', title: 'Közgyűlési dokumentumok olvasottsága', meta: `${data.documents.filter((document) => !document.acknowledged_at).length} nyitott visszaigazolás`, tone: 'bg-white/[0.055] text-slate-300 ring-white/10', href: '#documents' }
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
      unit_label: myUnit?.unit_label || undefined,
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
      unit_label: myUnit?.unit_label || undefined
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
    <div className="app-surface min-h-screen">
      <div className="flex min-h-screen">
        <WorkspaceSidebar
          buildingId={data.buildingId ?? ''}
          buildingName={data.buildingName ?? ''}
          buildingAddress={data.buildingAddress ?? ''}
          role={data.currentUser.role}
          collapsed={sidebarCollapsed}
          onCollapse={setSidebarCollapsed}
        />

        <main
          id="workspace-main"
          className={`min-w-0 flex-1 space-y-4 overflow-x-hidden px-4 pb-8 pt-20 transition-[padding] duration-200 md:px-6 lg:py-6 lg:pr-8 xl:pr-10 ${
            sidebarCollapsed ? 'lg:pl-[84px]' : 'lg:pl-[268px]'
          }`}
        >
          {/* ── Billing warning banner ────────────────────────────────────── */}
          <BillingWarningBanner
            buildingId={data.buildingId ?? ''}
            subscriptionStatus={data.subscriptionStatus as SubscriptionStatus}
            trialEnd={data.trialEnd}
            isManager={isManager}
            hasPermanentAccess={data.currentUser.free_trial_never_expires}
          />

          {/* ── Static workspace context ────────────────────────────────────── */}
          <header className="relative z-20 rounded-[18px] border border-white/[0.07] bg-white/[0.035] px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] md:px-6">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="flex min-w-0 items-start gap-4">
                <div className="mt-0.5 hidden h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-500/[0.08] text-brand-300 sm:grid">
                  <Building2 size={18} />
                </div>
                <div className="min-w-0">
                {data.buildingName ? (
                  <>
                    {/* Mobile building switcher */}
                    <Link
                      href="/app"
                      className="mb-1 inline-flex max-w-full items-center gap-1.5 text-xs font-medium text-slate-400 transition-colors hover:text-brand-300 lg:hidden"
                    >
                      <Layers3 size={12} />
                      <span className="truncate max-w-[200px]">{data.buildingName}</span>
                      <ChevronRight size={11} className="flex-shrink-0 opacity-60" />
                    </Link>
                    <h1 className="break-words font-display text-[1.75rem] font-medium leading-tight tracking-[-0.025em] text-slate-50 md:text-[2rem]">
                      {data.buildingName}
                    </h1>
                    <p className="mt-1.5 text-xs text-slate-400">
                      {addressCityLine(data.buildingAddress ?? '', data.buildingName ?? '')}
                    </p>
                    {myUnit && (myUnit.floor || myUnit.unit_label) && (
                      <p className="mt-1 text-[11px] font-medium text-slate-400">
                        {[myUnit.floor, myUnit.unit_label].filter(Boolean).join(' / ')}
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <h1 className="font-display text-[1.75rem] font-medium leading-tight tracking-[-0.025em] text-slate-50 md:text-[2rem]">PanelLakó</h1>
                    <p className="mt-1.5 text-xs text-slate-400">Modern lakói és képviselői működés egy felületen.</p>
                  </>
                )}
                </div>
              </div>

              <div className="flex w-full shrink-0 items-center gap-2 md:w-auto">
                {/* Header search */}
                <div className="relative min-w-0 flex-1 md:flex-none" ref={searchRef}>
                  <Search className="pointer-events-none absolute left-3 top-2.5 text-slate-500" size={14} />
                  <input
                    aria-label="Keresés…"
                    className="w-full rounded-[0.625rem] border border-white/[0.09] bg-black/15 py-2 pl-9 pr-4 text-sm text-slate-200 outline-none transition-colors placeholder:text-slate-400 hover:border-white/[0.14] focus:border-brand-400/50 focus:bg-black/25 md:w-56"
                    placeholder="Keresés…"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setSearchOpen(true); }}
                    onFocus={() => setSearchOpen(true)}
                  />
                  {searchOpen && searchQuery.trim().length > 0 && (
                    <div className="absolute right-0 top-full z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-white/10 bg-ink-panel shadow-overlay md:w-80">
                      {searchResults.length === 0 ? (
                        <p className="px-4 py-3 text-sm text-slate-400">Nincs találat</p>
                      ) : (
                        <ul className="py-1">
                          {searchResults.map((item) => (
                            <li key={item.id}>
                              <a
                                href={item.href}
                                onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                                className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-white/[0.05]"
                              >
                                <span className="shrink-0 rounded-full bg-white/[0.07] px-2 py-0.5 text-[10px] font-semibold text-slate-400 ring-1 ring-white/10">{item.type}</span>
                                <span className="flex-1 truncate text-slate-200">{item.label}</span>
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
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-[0.625rem] border border-white/[0.08] bg-white/[0.025] px-3.5 py-2 text-xs font-semibold text-slate-400 transition-colors hover:border-white/[0.14] hover:bg-white/[0.055] hover:text-slate-200"
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

          <section id="overview" className="grid items-start gap-4 xl:grid-cols-[minmax(0,0.82fr)_minmax(660px,1.18fr)]">
              <article className="self-start rounded-[18px] border border-white/[0.07] bg-white/[0.035] p-5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] md:p-6">
                {/* Who is logged in */}
                <div className="mb-5 flex items-start gap-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.055]">
                    <UserRound size={18} className="text-slate-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="mb-1 text-[11px] font-medium text-slate-400">Bejelentkezett lakó</p>
                    <p className="truncate text-lg font-semibold leading-tight tracking-[-0.015em] text-white">
                      {data.currentUser.full_name || 'Ismeretlen'}
                    </p>
                  </div>
                  <span className="mt-0.5 shrink-0 rounded-full bg-brand-500/[0.1] px-2.5 py-1 text-[10px] font-semibold text-brand-300">
                    {ROLE_LABEL[data.currentUser.role] ?? data.currentUser.role}
                  </span>
                </div>

                {/* Linked unit */}
                {myUnit ? (
                  <div className="mb-5 flex items-start gap-3 rounded-xl bg-black/[0.12] px-3.5 py-3.5">
                    <Building2 size={14} className="mt-0.5 shrink-0 text-slate-500" />
                    <div className="min-w-0">
                      <p className="mb-1 text-[11px] font-medium text-slate-400">Regisztrált albetét</p>
                      <p className="text-sm font-semibold text-white">
                        {[myUnit.floor, myUnit.unit_label].filter(Boolean).join(' / ')}
                      </p>
                      {myUnit.area_m2 ? (
                        <p className="mt-0.5 text-[10px] text-slate-400">{myUnit.area_m2} m²</p>
                      ) : null}
                    </div>
                  </div>
                ) : isManager ? (
                  <div className="mb-5 flex items-center gap-2.5 rounded-xl bg-black/[0.12] px-3.5 py-3.5">
                    <Layers3 size={14} className="shrink-0 text-slate-500" />
                    <p className="text-sm text-slate-400">{data.units.length} albetét ebben az épületben</p>
                  </div>
                ) : null}

                <div className="flex flex-wrap gap-2.5">
                  <a href="#tickets" className="rounded-[0.625rem] bg-brand-500 px-4 py-2.5 text-sm font-semibold text-ink-base transition-colors hover:bg-brand-400">Új bejelentés</a>
                  <a href="#units" className="rounded-[0.625rem] bg-white/[0.055] px-4 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/[0.09]">Albetétek</a>
                  <a href={`/w/${data.buildingId}/profil`} className="flex items-center gap-1.5 rounded-[0.625rem] bg-white/[0.055] px-4 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/[0.09]"><UserCog size={13} />Profil</a>
                </div>
              </article>

              <article className="rounded-[18px] border border-white/[0.07] bg-white/[0.035] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] md:p-4">
                <div className="grid h-full gap-3 md:grid-cols-2 lg:grid-cols-[160px_160px_minmax(0,1fr)]">
                  <div className="min-h-36 rounded-xl bg-black/[0.11] p-3">
                    <WeatherWidget quiet city={
                    data.buildingAddress?.match(/\d{4}\s+([A-Za-záéíóöőúüűÁÉÍÓÖŐÚÜŰ-]+)/)?.[1]
                    ?? 'Budapest'
                  } />
                  </div>
                  <div className="min-h-36 rounded-xl bg-black/[0.11] p-3">
                    <AirQualityWidget quiet href={`/w/${data.buildingId}/kornyezet#sec-air`} />
                  </div>
                  <div className="hidden min-w-0 rounded-xl bg-black/[0.11] p-4 lg:col-span-1 lg:block">
                    <ActivityCalendar tickets={tickets} meetings={meetings} currentUnit={myUnit?.unit_label || undefined} />
                  </div>
                </div>
              </article>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <StatCard title="Nyitott ügyek" value={String(openTicketCount)} subtitle="Ticketek, SLA és felelős kijelölés" icon={<Wrench size={17} />} href="#tickets" />
            <StatCard title="Hátralék" value={formatCurrency(arrears)} subtitle="Lakói pénzügyi átláthatóság" icon={<CircleDollarSign size={17} />} tone="amber" href="#finances" />
            <StatCard title="Olvasatlan értesítés" value={String(unreadNotificationCount)} subtitle="Push/e-mail és olvasottsági visszajelzés" icon={<BellRing size={17} />} tone="violet" href="#notifications" />
            <StatCard title="Albetétek" value={String(data.units.length)} subtitle={`${totalArea} m² · ${totalOwnershipShare} tulajdoni hányad`} icon={<Layers3 size={17} />} tone="neutral" href="#units" />
          </section>

          <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <SectionCard id="profile" title="Lakói profil" icon={<UserRound size={18} />} action={<a href={`/w/${data.buildingId}/profil`} className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-[10px] font-semibold text-slate-400 hover:bg-white/[0.06] hover:text-slate-200"><UserCog size={11} />Teljes profil szerkesztése</a>}>
              <form
                className="space-y-4"
                onSubmit={async (event) => {
                  event.preventDefault();
                  setProfileSaveError('');

                  let saveOk = true;

                  // Mentjük a nevet a profiles táblába
                  if (name.trim()) {
                    try {
                      const nameRes = await fetch('/api/user/profile', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ full_name: name.trim() }),
                      });
                      if (!nameRes.ok) {
                        saveOk = false;
                        const payload = await nameRes.json().catch(() => ({}));
                        setProfileSaveError(payload?.message || 'A név mentése nem sikerült.');
                      }
                    } catch {
                      saveOk = false;
                      setProfileSaveError('Hálózati hiba — a név mentése nem sikerült.');
                    }
                  }

                  // Ha van kiválasztott cím, mentsük el a Supabase-be
                  if (saveOk && selectedAddress && selectedAddress.lat !== null && selectedAddress.lon !== null) {
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
                <input required className="input-base" placeholder="Teljes név" value={name} onChange={(e) => setName(e.target.value)} />

                <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
                  <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-300"><MapPin size={16} className="text-brand-400" /> Otthoni cím (Magyarország)</label>
                  {selectedAddress && !addressEditMode ? (
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-300 leading-snug">{selectedAddress.label}</p>
                        {(floor || door) && (
                          <p className="mt-0.5 text-[10px] text-slate-500">
                            {[floor && `${floor}. emelet`, door && `${door}. ajtó`].filter(Boolean).join(' · ')}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => { setAddressEditMode(true); setAddressQuery(selectedAddress.label); }}
                        className="ml-3 shrink-0 rounded-lg border border-white/10 px-2.5 py-1 text-[10px] font-semibold text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-slate-200"
                      >
                        Módosítás
                      </button>
                    </div>
                  ) : (
                    <>
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
                      {addressError ? <p className="mt-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-300">{addressError}</p> : null}
                      {addressOptions.length > 0 ? (
                        <ul className="mt-3 space-y-1 rounded-xl border border-white/10 bg-ink-panel p-2 shadow-overlay">
                          {addressOptions.map((option) => (
                            <li key={option.id}>
                              <button
                                className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-300 hover:bg-white/[0.05] hover:text-brand-300"
                                type="button"
                                onClick={() => {
                                  setAddress(option.label);
                                  setAddressQuery(option.label);
                                  setSelectedAddress(option);
                                  setAddressOptions([]);
                                  setAddressEditMode(false);
                                }}
                              >
                                <span className="truncate">{option.label}</span>
                                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${option.source === 'supabase' ? 'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/25' : 'bg-sky-500/10 text-sky-300 ring-1 ring-sky-500/25'}`}>
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
                          <p className="text-xs text-slate-400">Kiválasztott cím: <span className="font-semibold text-slate-300">{selectedAddress.label}</span></p>
                          <div className="grid gap-2 md:grid-cols-2">
                            <input className="input-base" placeholder="Emelet (opcionális)" value={floor} onChange={(e) => setFloor(e.target.value)} />
                            <input className="input-base" placeholder="Ajtó (opcionális)" value={door} onChange={(e) => setDoor(e.target.value)} />
                          </div>
                        </div>
                      ) : address ? (
                        <p className="mt-2 text-xs text-slate-400">Kiválasztott cím: {address}</p>
                      ) : null}
                    </>
                  )}
                </div>

                <button className="btn-primary">Profil mentése</button>
                {profileSaved ? <p className="text-sm font-semibold text-emerald-400">{selectedAddress ? 'Cím elmentve.' : 'Profiladatok mentve.'}</p> : null}
                {profileSaveError ? <p className="text-sm font-semibold text-rose-400">{profileSaveError}</p> : null}
              </form>

              {/* Push notification toggle */}
              {pushSupported ? (
                <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-100">Push értesítések</p>
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
                    className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${pushSubscribed ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30 hover:bg-emerald-500/25' : 'bg-white/[0.08] text-slate-300 hover:bg-white/[0.12]'} disabled:opacity-50`}
                  >
                    {pushLoading ? '...' : pushSubscribed ? 'Bekapcsolva' : 'Bekapcsolás'}
                  </button>
                </div>
              ) : null}
            </SectionCard>

            <SectionCard id="tasks" title="Teendők és gyors műveletek" icon={<ClipboardCheck size={18} />}>
              <div className="grid gap-3 md:grid-cols-3">
                {tasks.map((task) => (
                  <article key={task.id} className="rounded-xl bg-black/[0.11] p-4">
                    <div className={`mb-3 inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${task.tone}`}>{task.meta}</div>
                    <p className="text-sm font-semibold leading-snug text-slate-100">{task.title}</p>
                    <a className="mt-3.5 inline-flex items-center gap-1 text-xs font-semibold text-brand-300 hover:text-brand-200" href={task.href}>
                      Megnyitás <ChevronRight size={13} />
                    </a>
                  </article>
                ))}
              </div>

              <div className="mt-4 grid gap-2.5 md:grid-cols-3">
                <a className="rounded-lg bg-white/[0.08] px-4 py-2.5 text-center text-xs font-semibold text-slate-200 ring-1 ring-white/10 transition-colors hover:bg-white/[0.12]" href="#tickets">Ticket queue</a>
                <a className="rounded-lg bg-brand-500 px-4 py-2.5 text-center text-xs font-semibold text-ink-base transition-colors hover:bg-brand-400" href="#documents">Dokumentumtár</a>
                <a className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2.5 text-center text-xs font-semibold text-slate-300 transition-colors hover:bg-white/[0.08]" href="#meetings">Közgyűlés</a>
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
                {ticketSaved ? <p className="text-sm font-semibold text-emerald-400">A ticket mentése demo módban sikeres, megjelent a listában.</p> : null}
              </form>
            </SectionCard>

            <SectionCard
              title="Ticket queue"
              icon={<TicketCheck size={18} />}
              action={
                <select className="rounded-[0.625rem] border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm font-medium text-slate-200 outline-none focus:border-brand-400/60" value={ticketFilter} onChange={(e) => setTicketFilter(e.target.value as Ticket['status'] | 'osszes')}>
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
                      className={`rounded-xl border p-4 transition-colors ${isHighUrgency ? 'border-rose-500/25 bg-rose-500/[0.07]' : 'border-white/[0.06] bg-white/[0.03]'}`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-100">{ticket.title}</p>
                          {ticket.ai_summary_hu ? (
                            <p className="mt-1 text-sm italic text-slate-400">{ticket.ai_summary_hu}</p>
                          ) : (
                            <p className="mt-1 text-sm text-slate-400">{ticket.description}</p>
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
                            <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-xs font-semibold text-violet-300 ring-1 ring-violet-500/25">Manuálisan módosítva</span>
                          ) : (
                            <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-500/25">
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
                          <button className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 font-semibold text-slate-300 hover:border-brand-400/50 hover:text-white" onClick={() => updateTicketStatus(ticket.id, 'folyamatban')} type="button">Folyamatban</button>
                          <button className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 font-semibold text-slate-300 hover:border-violet-400/50 hover:text-white" onClick={() => updateTicketStatus(ticket.id, 'varakozik')} type="button">Várakozik</button>
                          <button className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 font-semibold text-slate-300 hover:border-emerald-400/50 hover:text-white" onClick={() => updateTicketStatus(ticket.id, 'lezarva')} type="button">Lezárás</button>
                          {!isAiPending ? (
                            <button className="rounded-lg border border-violet-500/25 bg-violet-500/10 px-3 py-2 font-semibold text-violet-300 hover:bg-violet-500/20" onClick={() => handleAiOverrideClick(ticket.id)} type="button">AI módosítás</button>
                          ) : null}
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </SectionCard>
          </section>

          <SectionCard id="units" title="Albetét törzsadatok" icon={<Building2 size={18} />} action={<input value={unitSearch} onChange={(e) => setUnitSearch(e.target.value)} className="rounded-[0.625rem] border border-white/10 bg-white/[0.04] px-3.5 py-2 text-sm text-slate-200 placeholder:text-slate-500 outline-none focus:border-brand-400/60" placeholder="Albetét / tulajdonos keresés" />}>
            <div className="mb-4 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-sm font-medium text-slate-400">
              Az összes albetét területe: {totalArea} m², tulajdoni hányada: {totalOwnershipShare}
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-500">
                    <th className="px-3 py-3">Cím</th>
                    <th className="px-3 py-3">Tulajdonos</th>
                    <th className="px-3 py-3">Típus</th>
                    <th className="px-3 py-3">Σm²</th>
                    <th className="px-3 py-3">ΣTh</th>
                    <th className="px-3 py-3">Egyenleg</th>
                    <th className="px-3 py-3">Vízóra</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {visibleUnits.map((unitItem) => (
                    <tr key={unitItem.id} className="hover:bg-white/[0.03]">
                      <td className="px-3 py-4 font-semibold text-slate-200">{unitItem.unit_label}</td>
                      <td className="px-3 py-4 text-slate-400 tabular-nums">{unitItem.owner_name}</td>
                      <td className="px-3 py-4 text-slate-400 tabular-nums">{unitItem.unit_type}</td>
                      <td className="px-3 py-4 text-slate-400 tabular-nums">{numberOrZero(unitItem.area_m2)} m²</td>
                      <td className="px-3 py-4 text-slate-400 tabular-nums">{numberOrZero(unitItem.ownership_share)}</td>
                      <td className={`px-3 py-4 font-semibold tabular-nums ${numberOrZero(unitItem.balance_amount) < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{formatCurrency(unitItem.balance_amount)}</td>
                      <td className="px-3 py-4">{unitItem.has_water_meter ? <span className="rounded-full bg-sky-500/10 px-2.5 py-1 text-xs font-semibold text-sky-300 ring-1 ring-sky-500/25">igen</span> : <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-xs font-semibold text-slate-400 ring-1 ring-white/10">nem</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <section className="grid gap-6 lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.6fr)]">
            <SectionCard id="documents" title="Dokumentumtár" icon={<FileText size={18} />} action={
              <div className="flex items-center gap-2">
                <select value={documentFilter} onChange={(e) => setDocumentFilter(e.target.value)} className="rounded-[0.625rem] border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-medium text-slate-200 outline-none focus:border-brand-400/60">
                  {documentCategories.map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
                {isManager && (
                  <button
                    type="button"
                    onClick={() => setShowUploadForm((v) => !v)}
                    className="rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold text-ink-base hover:bg-brand-400"
                  >
                    + Feltöltés
                  </button>
                )}
              </div>
            }>
              {/* Manager upload form */}
              {isManager && showUploadForm && (
                <form
                  className="mb-4 rounded-xl border border-brand-500/20 bg-brand-500/[0.06] p-4"
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
                  <p className="mb-3 text-sm font-semibold text-brand-300">Dokumentum feltöltése</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input required name="title" placeholder="Cím *" className="input-base" />
                    <input required name="category" placeholder="Kategória *" className="input-base" />
                    <input name="version" placeholder="Verzió (pl. 1.0)" defaultValue="1.0" className="input-base" />
                    <select name="visibility" className="input-base">
                      <option value="Mindenki">Mindenki</option>
                      <option value="Tulajdonosok">Tulajdonosok</option>
                      <option value="Kezelők">Kezelők</option>
                    </select>
                  </div>
                  <input required name="file" type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" className="mt-3 block w-full text-sm text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-500 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-ink-base hover:file:bg-brand-400" />
                  {uploadError && <p className="mt-2 text-xs text-rose-400">{uploadError}</p>}
                  <div className="mt-3 flex gap-2">
                    <button type="submit" disabled={uploadStatus === 'uploading'} className="rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-ink-base hover:bg-brand-400 disabled:opacity-50">
                      {uploadStatus === 'uploading' ? 'Feltöltés…' : 'Feltöltés'}
                    </button>
                    <button type="button" onClick={() => setShowUploadForm(false)} className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-white/[0.08]">Mégse</button>
                  </div>
                </form>
              )}
              {uploadStatus === 'done' && <p className="mb-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-300">Dokumentum sikeresen feltöltve</p>}
              {isManager && hasLegacyDocUrls && demoInitStatus !== 'done' && (
                <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.07] px-4 py-3">
                  <p className="text-xs font-medium text-amber-300">A demo dokumentumfájlok még nem kerültek fel a tárolóba — a megnyitás nem fog működni.</p>
                  <button
                    type="button"
                    disabled={demoInitStatus === 'loading'}
                    className="shrink-0 rounded-lg bg-amber-500/15 px-3 py-2 text-xs font-semibold text-amber-300 ring-1 ring-amber-500/30 hover:bg-amber-500/25 disabled:opacity-50"
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
              {demoInitStatus === 'done' && <p className="mb-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-300">Demo dokumentumfájlok sikeresen feltöltve</p>}
              {demoInitStatus === 'error' && <p className="mb-3 rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm font-semibold text-rose-300">Hiba a demo fájlok feltöltésekor. Ellenőrizd a konzolt.</p>}
              <div className="space-y-3">
                {visibleDocuments.map((item) => (
                  <article key={item.id} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
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
                        <p className="text-xs font-semibold text-brand-300">Dokumentum szerkesztése</p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <input
                            required
                            value={editDocData.title}
                            onChange={(e) => setEditDocData((d) => ({ ...d, title: e.target.value }))}
                            placeholder="Cím *"
                            className="input-base"
                          />
                          <input
                            required
                            value={editDocData.category}
                            onChange={(e) => setEditDocData((d) => ({ ...d, category: e.target.value }))}
                            placeholder="Kategória *"
                            className="input-base"
                          />
                          <input
                            value={editDocData.version}
                            onChange={(e) => setEditDocData((d) => ({ ...d, version: e.target.value }))}
                            placeholder="Verzió"
                            className="input-base"
                          />
                          <select
                            value={editDocData.visibility}
                            onChange={(e) => setEditDocData((d) => ({ ...d, visibility: e.target.value }))}
                            className="input-base"
                          >
                            <option value="Mindenki">Mindenki</option>
                            <option value="Tulajdonosok">Tulajdonosok</option>
                            <option value="Kezelők">Kezelők</option>
                          </select>
                        </div>
                        {docActionError && <p className="text-xs text-rose-400">{docActionError}</p>}
                        <div className="flex gap-2">
                          <button type="submit" disabled={docActionLoading} className="rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold text-ink-base hover:bg-brand-400 disabled:opacity-50">
                            {docActionLoading ? 'Mentés…' : 'Mentés'}
                          </button>
                          <button type="button" onClick={() => setEditingDocId(null)} className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/[0.08]">Mégse</button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-slate-100">{item.title}</p>
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
                                className="rounded-lg p-1 text-slate-500 hover:bg-white/[0.08] hover:text-brand-400"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            className="rounded-lg bg-white/[0.08] px-3 py-2 text-xs font-semibold text-slate-100 ring-1 ring-white/10 hover:bg-white/[0.14]"
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
                              className="rounded-lg bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-500/30 hover:bg-emerald-500/25"
                              type="button"
                              onClick={() => acknowledgeDocumentAction(item.id)}
                            >
                              Elolvasva
                            </button>
                          )}
                          {isManager && deletingDocId === item.id ? (
                            <span className="flex items-center gap-1">
                              <span className="text-xs text-rose-300 font-medium">Biztosan törlöd?</span>
                              <button
                                type="button"
                                disabled={docActionLoading}
                                className="rounded-lg bg-rose-500/15 px-3 py-2 text-xs font-semibold text-rose-300 ring-1 ring-rose-500/30 hover:bg-rose-500/25 disabled:opacity-50"
                                onClick={async () => {
                                  setDocActionLoading(true);
                                  await deleteDocumentAction(item.id, data.buildingId);
                                  setDocActionLoading(false);
                                  setDeletingDocId(null);
                                }}
                              >
                                Igen, törlés
                              </button>
                              <button type="button" onClick={() => setDeletingDocId(null)} className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/[0.08]">Mégse</button>
                            </span>
                          ) : isManager && (
                            <button
                              type="button"
                              onClick={() => setDeletingDocId(item.id)}
                              className="rounded-lg border border-rose-500/25 px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/10"
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
                  className="rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold text-ink-base hover:bg-brand-400"
                >
                  + Terhelés rögzítése
                </button>
              ) : undefined
            }>
              {/* ── Resident balance quick-view (read-only) ── */}
              {isResident && (() => {
                // Find the most recent charge entry for this period's due date
                const charges = data.finances.filter((f) => !f.entry_type || f.entry_type === 'charge');
                const nextDue = charges
                  .filter((f) => f.due_date)
                  .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
                  .find((f) => new Date(f.due_date) >= new Date(new Date().toDateString()));
                const isOverdue = nextDue && new Date(nextDue.due_date) < new Date();
                return (
                  <div className="mb-5 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Előírt összeg</p>
                      <p className="text-lg font-semibold text-slate-100 tabular-nums">{formatCurrency(totalDue)}</p>
                    </div>
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] px-4 py-3">
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Befizetve</p>
                      <p className="text-lg font-semibold text-emerald-400 tabular-nums">{formatCurrency(totalPaid)}</p>
                    </div>
                    <div className={`rounded-2xl border px-4 py-3 ${arrears > 0 ? 'border-rose-500/20 bg-rose-500/[0.06]' : 'border-white/[0.06] bg-white/[0.03]'}`}>
                      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Hátralék</p>
                      <p className={`text-lg font-semibold tabular-nums ${arrears > 0 ? 'text-rose-400' : 'text-slate-100'}`}>{formatCurrency(arrears)}</p>
                    </div>
                    {nextDue && (
                      <div className={`sm:col-span-3 rounded-2xl border px-4 py-3 flex items-center gap-3 ${isOverdue ? 'border-rose-500/25 bg-rose-500/[0.07]' : 'border-white/[0.06] bg-white/[0.03]'}`}>
                        <CircleDollarSign size={16} className={isOverdue ? 'text-rose-500 shrink-0' : 'text-slate-400 shrink-0'} />
                        <div>
                          <span className="text-xs font-semibold text-slate-500">Következő esedékes: </span>
                          <span className={`text-sm font-semibold ${isOverdue ? 'text-rose-300' : 'text-slate-300'}`}>
                            {formatDate(nextDue.due_date)}
                            {isOverdue && ' — Lejárt!'}
                          </span>
                          {nextDue.description && (
                            <span className="ml-1 text-xs text-slate-500">({nextDue.description})</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              <p className="mb-4 text-sm text-slate-400">Összesen: {formatCurrency(totalDue)} · Befizetve: {formatCurrency(totalPaid)} · Hátralék: <span className={arrears > 0 ? 'font-semibold text-rose-400' : 'text-emerald-400'}>{formatCurrency(arrears)}</span></p>
              <div className="mb-4 h-2 overflow-hidden rounded-full bg-white/[0.07]">
                <div className="h-full rounded-full bg-brand-500" style={{ width: `${Math.min((totalPaid / Math.max(totalDue, 1)) * 100, 100)}%` }} />
              </div>

              {/* Charge generation form */}
              {isAdminLike && showChargeForm && (
                <form
                  className="mb-4 space-y-3 rounded-xl border border-brand-500/20 bg-brand-500/[0.06] p-4"
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
                  <p className="text-xs font-semibold text-brand-300">Közös költség terhelés — összes albetétnek</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input name="period" type="month" required className="input-base" placeholder="Időszak (YYYY-MM)" />
                    <input name="charge_per_unit" type="number" min={1} max={10000000} required className="input-base" placeholder="Összeg (Ft/albetét)" />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input name="due_date" type="date" required className="input-base" />
                    <input name="description" className="input-base" placeholder="Leírás (opcionális)" />
                  </div>
                  <input name="building_id" type="hidden" value="" />
                  <button type="submit" disabled={chargeStatus === 'saving'} className="btn-primary disabled:opacity-50">
                    {chargeStatus === 'saving' ? 'Rögzítés...' : 'Terhelés rögzítése'}
                  </button>
                  {chargeStatus === 'done' && <p className="text-sm font-semibold text-emerald-400">Terhelés rögzítve.</p>}
                  {chargeStatus === 'error' && <p className="text-sm font-semibold text-rose-400">{chargeError}</p>}
                </form>
              )}

              <ul className="space-y-2 text-sm">
                {data.finances.map((entry) => {
                  const isCharge = !entry.entry_type || entry.entry_type === 'charge';
                  const isPayment = entry.entry_type === 'payment';
                  return (
                    <li key={entry.id} className={`rounded-xl border p-3 ${isPayment ? 'border-emerald-500/20 bg-emerald-500/[0.06]' : 'border-white/[0.06] bg-white/[0.03]'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-slate-100">{entry.description ?? entry.period}</p>
                          {isCharge && <p className="text-slate-400">Esedékes: {formatCurrency(entry.expected_amount)} · Befizetve: {formatCurrency(entry.paid_amount)} · Határidő: {formatDate(entry.due_date)}</p>}
                          {isPayment && <p className="text-emerald-400 font-semibold">+{formatCurrency(entry.paid_amount)} befizetés{entry.payment_reference ? ` · Ref: ${entry.payment_reference}` : ''}</p>}
                        </div>
                        {isCharge && isAdminLike && (
                          <button
                            type="button"
                            onClick={() => setShowPaymentForm(entry.id)}
                            className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 shrink-0"
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
                  await submitMeterReadingAction({ meter_type: type, value, reading_date: date, unit_label: myUnit?.unit_label || undefined });
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
                  className="rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold text-ink-base hover:bg-brand-400"
                >
                  + Közgyűlés
                </button>
              ) : undefined
            }>
              {/* Meeting creation form */}
              {isManager && showMeetingForm && (
                <form
                  className="mb-4 space-y-3 rounded-xl border border-brand-500/20 bg-brand-500/[0.06] p-4"
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
                  <p className="text-xs font-semibold text-brand-300">Új közgyűlés létrehozása</p>
                  <input name="title" required className="input-base" placeholder="Közgyűlés neve" />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input name="scheduled_at" type="datetime-local" required className="input-base" />
                    <input name="location" className="input-base" placeholder="Helyszín" />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input name="chairperson" className="input-base" placeholder="Levezető elnök neve" />
                    <input name="secretary" className="input-base" placeholder="Jegyzőkönyvvezető neve" />
                  </div>
                  <textarea name="agenda" required rows={4} className="input-base" placeholder="Napirendi pontok (soronként egy)" />
                  <input name="building_id" type="hidden" value="" />
                  <button type="submit" disabled={meetingStatus === 'saving'} className="btn-primary disabled:opacity-50">
                    {meetingStatus === 'saving' ? 'Létrehozás...' : 'Közgyűlés létrehozása'}
                  </button>
                  {meetingStatus === 'error' && <p className="text-sm font-semibold text-rose-400">{meetingError}</p>}
                </form>
              )}

              <div className="space-y-3">
                {meetings.map((meeting) => {
                  const quorumPct = meeting.actual_quorum != null ? (meeting.actual_quorum * 100).toFixed(1) : null;
                  const thresholdPct = ((meeting.quorum_threshold ?? 0.5) * 100).toFixed(0);
                  const quorumMet = meeting.actual_quorum != null && meeting.actual_quorum >= (meeting.quorum_threshold ?? 0.5);

                  return (
                    <article key={meeting.id} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <button
                            type="button"
                            className="text-left font-semibold text-slate-100 hover:text-brand-700"
                            onClick={() => handleOpenMeeting(meeting)}
                          >
                            {meeting.title}
                          </button>
                          <p className="mt-1 text-sm text-slate-400">
                            {formatDateTime(meeting.scheduled_at)}
                            {meeting.location ? ` · ${meeting.location}` : ''}
                            {' · '}{meeting.resolution_count} határozat
                          </p>
                          {meeting.agenda_preview ? <p className="mt-1 text-sm italic text-slate-400">Napirend: {meeting.agenda_preview}</p> : null}
                          {quorumPct ? (
                            <p className={`mt-1 text-xs font-bold ${quorumMet ? 'text-emerald-400' : 'text-rose-400'}`}>
                              Kvórum: {quorumPct}% ({quorumMet ? `határozatképes (min. ${thresholdPct}%)` : `nem határozatképes (min. ${thresholdPct}%)`})
                            </p>
                          ) : null}
                          {meeting.invitation_sent_at ? (
                            <p className="mt-1 text-xs text-emerald-400">Meghívó kiküldve: {formatDateTime(meeting.invitation_sent_at)}</p>
                          ) : null}
                        </div>
                        <StatusBadge status={meeting.status} />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                        <button
                          type="button"
                          className="rounded-lg bg-brand-500 px-3 py-2 text-ink-base hover:bg-brand-400"
                          onClick={() => handleOpenMeeting(meeting)}
                        >
                          Részletek / Jelenlét
                        </button>
                        {isManager && meeting.status === 'tervezett' && (
                          <>
                            <button
                              type="button"
                              className="rounded-lg bg-brand-500/10 px-3 py-2 text-brand-300 ring-1 ring-brand-500/25 hover:bg-brand-500/20"
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
                              className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-slate-300 hover:bg-white/[0.08]"
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
                  <article key={vendor.id} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
                    <p className="font-semibold text-slate-100">{vendor.name}</p>
                    <p className="mt-1 text-xs font-medium text-slate-400">{vendor.category}</p>
                    <p className="mt-2 text-xs text-slate-500">SLA: {vendor.sla_hours} óra</p>
                  </article>
                ))}
              </div>
              <div className="space-y-2">
                {data.workOrders.map((workOrder) => (
                  <article key={workOrder.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 text-sm">
                    <div>
                      <p className="font-semibold text-slate-100">{workOrder.ticket_title}</p>
                      <p className="text-slate-400">{workOrder.vendor_name} · {formatDate(workOrder.due_date)} · {formatCurrency(workOrder.cost_estimate)}</p>
                    </div>
                    {isManager ? (
                      <select
                        defaultValue={workOrder.status}
                        onChange={async (e) => {
                          await updateWorkOrderStatusAction(workOrder.id, e.target.value as WorkOrderItem['status']);
                        }}
                        className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-xs font-medium text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
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
                      className={`rounded-xl border p-4 ${
                        isUrgent
                          ? 'border-rose-500/25 bg-rose-500/[0.07]'
                          : isHigh
                          ? 'border-amber-500/25 bg-amber-500/[0.07]'
                          : isUnread
                          ? 'border-brand-500/20 bg-brand-500/[0.05]'
                          : 'border-white/[0.06] bg-white/[0.03]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className={`font-semibold ${isUnread ? 'text-slate-100' : 'text-slate-300'}`}>{item.title}</p>
                        <div className="flex shrink-0 items-center gap-1.5">
                          {isUrgent && <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-xs font-semibold text-rose-300 ring-1 ring-rose-500/30">Sürgős</span>}
                          {isHigh && !isUrgent && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-300 ring-1 ring-amber-500/30">Fontos</span>}
                          {isUnread && !isUrgent && !isHigh && <span className="h-2 w-2 rounded-full bg-brand-400" />}
                          {!isUnread && <CheckCircle2 size={14} className="text-emerald-500" />}
                        </div>
                      </div>
                      <p className="mt-1 text-sm text-slate-400">{expanded ? item.content : previewText(item.content)}</p>
                      <p className="mt-2 text-xs text-slate-500">
                        {newsCategoryLabels[item.category || 'egyeb']} · {item.source_label || item.created_by_name || 'Ismeretlen forrás'} · {formatDateTime(item.created_at)}
                        {item.deadline ? ` · Határidő: ${formatDate(item.deadline)}` : ''}
                        {isManager && item.read_count != null ? ` · ${item.read_count} olvasva` : ''}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          className="text-xs font-semibold text-brand-400 hover:underline"
                          onClick={() => setExpandedNews((prev) => (prev.includes(item.id) ? prev.filter((newsId) => newsId !== item.id) : [...prev, item.id]))}
                        >
                          {expanded ? 'Összecsukás' : 'Teljes hír megnyitása'}
                        </button>
                        {isUnread && item.requires_acknowledgement && !isManager && (
                          <button
                            type="button"
                            disabled={ackingNewsId === item.id}
                            className="rounded-full bg-brand-500 px-3 py-1 text-xs font-semibold text-ink-base hover:bg-brand-400 disabled:opacity-60"
                            onClick={async () => {
                              setAckingNewsId(item.id);
                              const result = await acknowledgeAnnouncementAction(item.id, data.buildingId);
                              if (result.success) {
                                setNewsItems((prev) => prev.map((n) => n.id === item.id ? { ...n, read_at: new Date().toISOString() } : n));
                              }
                              setAckingNewsId(null);
                            }}
                          >
                            {ackingNewsId === item.id ? 'Mentés…' : 'Elolvasva'}
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
                {data.notifications.map((item) => <li key={item.id} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4"><div className="flex items-start justify-between gap-3"><p className="font-semibold text-slate-100">{item.title}</p>{item.read_at ? <CheckCircle2 className="text-emerald-500" size={16} /> : <span className="rounded-full bg-rose-500/10 px-2 py-1 text-xs font-semibold text-rose-300 ring-1 ring-rose-500/25">új</span>}</div><p className="mt-1 text-sm text-slate-400">{item.message}</p><p className="mt-2 text-xs text-slate-500">{item.audience} · {item.channel} · {formatDateTime(item.created_at)}</p></li>)}
              </ul>
            </SectionCard>

            <SectionCard id="knowledge" title="Tudásbázis / kihez forduljak?" icon={<BookOpen size={18} />}>
              <ul className="space-y-3">
                {data.kbArticles.map((article) => (
                  <li key={article.id} className="rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-brand-400">{article.topic}</p>
                    <p className="mt-1 font-semibold text-slate-100">{article.title}</p>
                    <p className="mt-1 text-sm text-slate-400">{article.body}</p>
                    <p className="mt-2 text-xs text-slate-500">Célcsoport: {article.audience}</p>
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
                <p className="text-sm leading-6 text-slate-400">
                  Az épület értesítései a Hírfolyam blokkban jelennek meg. A visszaigazolást igénylő értesítéseken az &quot;Elolvasva&quot; gombbal jelezheted, hogy tudomásul vetted.
                </p>
              </SectionCard>
            )}

            <SectionCard id="audit" title="Audit napló" icon={<ShieldCheck size={18} />}>
              <div className="space-y-3">
                {data.auditLogs.map((log) => (
                  <article key={log.id} className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] p-3 text-sm">
                    <div className="mt-1 rounded-full bg-brand-500/10 p-2 text-brand-400 ring-1 ring-brand-500/20"><ShieldCheck size={14} /></div>
                    <div>
                      <p className="font-semibold text-slate-100">{log.actor_name} · {log.action_type}</p>
                      <p className="text-slate-400">{log.entity_type}: {log.entity_label} · {formatDateTime(log.created_at)}</p>
                    </div>
                  </article>
                ))}
              </div>
            </SectionCard>
          </section>

          {/* ── Deep-link cards ─────────────────────────────────────────────── */}
          {/* Transport deep-link card */}
          <a
            id="transport"
            href={`/w/${data.buildingId}/kozlekedes`}
            className="group flex items-center justify-between gap-4 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.04] px-6 py-5 transition-colors hover:border-white/[0.14] hover:bg-white/[0.06]"
          >
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-sky-500/10 p-3 ring-1 ring-sky-500/25">
                <Bus size={22} className="text-sky-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-100">Közlekedés és tömegközlekedés</p>
                <p className="text-xs text-slate-500">Élő járattérkép, BKK menetrend, megállók, lefedettség</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-brand-400 group-hover:text-brand-300">
              Megnyitás →
            </div>
          </a>

          {/* Environment deep-link card */}
          <a
            id="kornyezet-link"
            href={`/w/${data.buildingId}/kornyezet`}
            className="group flex items-center justify-between gap-4 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.04] px-6 py-5 transition-colors hover:border-white/[0.14] hover:bg-white/[0.06]"
          >
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-sky-500/10 p-3 ring-1 ring-sky-500/25">
                <Wind size={22} className="text-sky-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-100">Levegőminőség és kerékpárutak</p>
                <p className="text-xs text-slate-500">AQI, OLM hőtérkép, kerékpáros infrastruktúra térkép</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-brand-400 group-hover:text-brand-300">
              Megnyitás →
            </div>
          </a>

        </main>
      </div>

      {/* Kapcsolat modal */}
      {contactOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-ink-panel p-6 shadow-overlay">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-100">
                <Mail size={18} className="text-brand-600" /> Kapcsolat
              </h3>
              <button type="button" onClick={() => { setContactOpen(false); setContactStatus('idle'); setContactMessage(''); }} className="rounded-lg p-1.5 hover:bg-white/[0.08]">
                <X size={16} className="text-slate-400" />
              </button>
            </div>

            {contactStatus === 'done' ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <CheckCircle2 size={40} className="text-emerald-500" />
                <p className="font-semibold text-slate-100">Üzenet elküldve!</p>
                <p className="text-sm text-slate-500">Hamarosan felvesszük veled a kapcsolatot.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">Tárgy</label>
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
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
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
                  <p className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-2.5 text-sm font-semibold text-rose-300">{contactError}</p>
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
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-ink-panel p-6 shadow-overlay">
            <h3 className="mb-4 text-lg font-semibold text-slate-100 flex items-center gap-2">
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
              <input name="amount" type="number" min={1} max={10000000} required className="input-base" placeholder="Összeg (Ft)" />
              <input name="payment_date" type="date" required className="input-base" />
              <input name="reference" className="input-base" placeholder="Banki hivatkozás (opcionális)" />
              <div className="flex gap-3 mt-4">
                <button type="submit" disabled={paymentStatus === 'saving'} className="flex-1 rounded-[0.625rem] bg-emerald-500 px-4 py-3 text-sm font-semibold text-ink-base hover:bg-emerald-400 disabled:opacity-50">
                  {paymentStatus === 'saving' ? 'Mentés...' : 'Befizetés rögzítése'}
                </button>
                <button type="button" onClick={() => { setShowPaymentForm(null); setPaymentStatus('idle'); }} className="rounded-[0.625rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-300 hover:bg-white/[0.08]">
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
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-ink-panel p-6 shadow-overlay">
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-100">
              <Sparkles size={18} className="text-violet-600" />
              AI triázs módosítása
            </h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-300">Kategória</label>
                <select
                  className="input-base"
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
                <label className="mb-1 block text-sm font-semibold text-slate-300">Sürgősség: {overrideUrgency}/10</label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={overrideUrgency}
                  onChange={(e) => setOverrideUrgency(Number(e.target.value))}
                  className="w-full accent-violet-500"
                />
                <div className="mt-1 flex justify-between text-xs text-slate-500">
                  <span>1 — Rutinkarbantartás</span>
                  <span>10 — Életveszély</span>
                </div>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                className="flex-1 rounded-[0.625rem] bg-violet-500 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-400 disabled:opacity-50"
                onClick={submitAiOverride}
                disabled={overrideSaving}
                type="button"
              >
                {overrideSaving ? 'Mentés...' : 'Mentés'}
              </button>
              <button
                className="rounded-[0.625rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-300 hover:bg-white/[0.08]"
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
            <div className="rounded-2xl border border-white/10 bg-ink-panel px-8 py-6 text-sm font-semibold text-slate-200 shadow-overlay">Betöltés...</div>
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

      {/* ── Resident mobile bottom navigation (mobile-only, residents only) ── */}
      {isResident && <ResidentBottomNav />}
    </div>
  );
}
