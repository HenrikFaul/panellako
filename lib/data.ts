import {
  mockAuditLogs,
  mockCurrentUser,
  mockDocuments,
  mockFinances,
  mockKbArticles,
  mockMeetings,
  mockMeterReadings,
  mockNews,
  mockNotifications,
  mockTickets,
  mockUnits,
  mockVendors,
  mockWorkOrders
} from './mock-data';
import { createClient } from './supabase/server';
import { hasSupabaseConfig } from './supabase';
import { Role } from './types';

export async function getDashboardData(role: Role = 'lako', buildingId?: string) {
  const fallback = {
    source: 'mock',
    currentUser: { ...mockCurrentUser, role, free_trial_never_expires: false },
    news: mockNews,
    notifications: mockNotifications,
    tickets: mockTickets,
    meterReadings: mockMeterReadings,
    documents: mockDocuments,
    finances: mockFinances,
    meetings: mockMeetings,
    units: mockUnits,
    vendors: mockVendors,
    workOrders: mockWorkOrders,
    kbArticles: mockKbArticles,
    auditLogs: mockAuditLogs
  };

  if (!hasSupabaseConfig) {
    return fallback;
  }

  const supabase = createClient();

  // Get authenticated user first — needed for per-user document acknowledgement join
  const { data: { user } } = await supabase.auth.getUser();

  // Scope a query to the current building when buildingId is provided
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scoped = (q: any) => buildingId ? q.eq('building_id', buildingId) : q;

  // Residents and owners only see their own unit — fetch membership unit_id first
  let ownUnitId: string | null = null;
  const isResident = role === 'lako' || role === 'tulajdonos';
  if (user && buildingId && isResident) {
    const { data: mem } = await supabase
      .from('memberships')
      .select('unit_id')
      .eq('profile_id', user.id)
      .eq('building_id', buildingId)
      .maybeSingle();
    ownUnitId = (mem as { unit_id: string | null } | null)?.unit_id ?? null;
  }

  // Build units query — residents see only their own unit, managers see all
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const unitsQuery: any = isResident && ownUnitId
    ? supabase.from('units').select('*').eq('id', ownUnitId)
    : scoped(supabase.from('units').select('*').limit(12));

  const [
    news,
    notifications,
    tickets,
    meterReadings,
    documents,
    docAcks,
    annReads,
    meetings,
    units,
    vendors,
    workOrders,
    kbArticles,
    auditLogs,
    profileResult
  ] = await Promise.all([
    scoped(supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(10)),
    scoped(supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(8)),
    scoped(supabase.from('tickets').select('*').order('created_at', { ascending: false }).limit(12)),
    scoped(supabase.from('meter_readings').select('*').order('reading_date', { ascending: false }).limit(8)),
    scoped(supabase.from('documents').select('*').order('uploaded_at', { ascending: false }).limit(10)),
    // Per-user document acknowledgements
    user
      ? supabase.from('document_acknowledgements').select('document_id, viewed_at').eq('profile_id', user.id)
      : Promise.resolve({ data: [] as { document_id: string; viewed_at: string }[] }),
    // Per-user announcement reads
    user
      ? supabase.from('announcement_reads').select('announcement_id, read_at').eq('profile_id', user.id)
      : Promise.resolve({ data: [] as { announcement_id: string; read_at: string }[] }),
    scoped(supabase.from('meetings').select('*').order('scheduled_at', { ascending: false }).limit(6)),
    unitsQuery,
    scoped(supabase.from('vendors').select('*').limit(8)),
    supabase.from('work_orders').select('*').order('due_date', { ascending: true }).limit(8),
    scoped(supabase.from('knowledge_base_articles').select('*').limit(8)),
    supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(10),
    user
      ? supabase.from('profiles').select('id, full_name, email, role, free_trial_never_expires').eq('id', user.id).single()
      : Promise.resolve({ data: null })
  ]);

  // finance_entries has no direct building_id — join via units when buildingId is set
  let financesData: unknown[] | null = null;
  if (buildingId && units.data?.length) {
    const unitIds = units.data.map((u: { id: string }) => u.id);
    const { data: fe } = await supabase
      .from('finance_entries')
      .select('*')
      .in('unit_id', unitIds)
      .order('due_date', { ascending: false })
      .limit(8);
    financesData = fe;
  } else {
    const { data: fe } = await supabase
      .from('finance_entries')
      .select('*')
      .order('due_date', { ascending: false })
      .limit(8);
    financesData = fe;
  }

  // Build acknowledgement lookup: document_id → viewed_at
  const ackMap = new Map<string, string>();
  for (const ack of (docAcks.data ?? [])) {
    ackMap.set(ack.document_id, ack.viewed_at);
  }
  const rawDocuments = documents.data ?? [];
  const mergedDocuments = rawDocuments.map((doc: { id: string; [key: string]: unknown }) => ({
    ...doc,
    acknowledged_at: ackMap.get(doc.id) ?? null
  }));

  // Build announcement read lookup: announcement_id → read_at
  const annReadMap = new Map<string, string>();
  for (const r of (annReads.data ?? [])) {
    annReadMap.set(r.announcement_id, r.read_at);
  }
  const rawNews = news.data ?? [];
  const mergedNews = rawNews.map((item: { id: string; [key: string]: unknown }) => ({
    ...item,
    read_at: annReadMap.get(item.id) ?? null,
  }));

  const currentUser = profileResult.data
    ? {
        id: profileResult.data.id,
        full_name: profileResult.data.full_name,
        email: profileResult.data.email,
        role,
        free_trial_never_expires: Boolean(profileResult.data.free_trial_never_expires),
      }
    : { ...mockCurrentUser, role, free_trial_never_expires: false };

  return {
    source: 'supabase',
    currentUser,
    news: mergedNews.length ? mergedNews : mockNews,
    notifications: notifications.data?.length ? notifications.data : mockNotifications,
    tickets: tickets.data?.length ? tickets.data : mockTickets,
    meterReadings: meterReadings.data?.length ? meterReadings.data : mockMeterReadings,
    documents: mergedDocuments.length ? mergedDocuments : mockDocuments,
    finances: (financesData?.length ? financesData : mockFinances) as typeof mockFinances,
    meetings: meetings.data?.length ? meetings.data : mockMeetings,
    units: units.data?.length ? units.data : mockUnits,
    vendors: vendors.data?.length ? vendors.data : mockVendors,
    workOrders: workOrders.data?.length ? workOrders.data : mockWorkOrders,
    kbArticles: kbArticles.data?.length ? kbArticles.data : mockKbArticles,
    auditLogs: auditLogs.data?.length ? auditLogs.data : mockAuditLogs
  };
}
