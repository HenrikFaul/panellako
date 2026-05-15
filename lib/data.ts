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

export async function getDashboardData(role: Role = 'lako') {
  const fallback = {
    source: 'mock',
    currentUser: { ...mockCurrentUser, role },
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

  const [
    news,
    notifications,
    tickets,
    meterReadings,
    documents,
    docAcks,
    finances,
    meetings,
    units,
    vendors,
    workOrders,
    kbArticles,
    auditLogs,
    profileResult
  ] = await Promise.all([
    supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(5),
    supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(8),
    supabase.from('tickets').select('*').order('created_at', { ascending: false }).limit(12),
    supabase.from('meter_readings').select('*').order('reading_date', { ascending: false }).limit(8),
    supabase.from('documents').select('*').order('uploaded_at', { ascending: false }).limit(10),
    // Per-user acknowledgement status — only fetch if user is authenticated
    user
      ? supabase.from('document_acknowledgements').select('document_id, viewed_at').eq('profile_id', user.id)
      : Promise.resolve({ data: [] as { document_id: string; viewed_at: string }[] }),
    supabase.from('finance_entries').select('*').order('due_date', { ascending: false }).limit(8),
    supabase.from('meetings').select('*').order('scheduled_at', { ascending: false }).limit(6),
    supabase.from('units').select('*').limit(12),
    supabase.from('vendors').select('*').limit(8),
    supabase.from('work_orders').select('*').order('due_date', { ascending: true }).limit(8),
    supabase.from('knowledge_base_articles').select('*').limit(8),
    supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(10),
    user
      ? supabase.from('profiles').select('id, full_name, email, role').eq('id', user.id).single()
      : Promise.resolve({ data: null })
  ]);

  // Build acknowledgement lookup: document_id → viewed_at timestamp
  const ackMap = new Map<string, string>();
  for (const ack of (docAcks.data ?? [])) {
    ackMap.set(ack.document_id, ack.viewed_at);
  }

  // Merge per-user acknowledged_at into each document row
  const rawDocuments = documents.data ?? [];
  const mergedDocuments = rawDocuments.map((doc) => ({
    ...doc,
    acknowledged_at: ackMap.get(doc.id) ?? null
  }));

  const currentUser = profileResult.data
    ? {
        id: profileResult.data.id,
        full_name: profileResult.data.full_name,
        email: profileResult.data.email,
        role
      }
    : { ...mockCurrentUser, role };

  return {
    source: 'supabase',
    currentUser,
    news: news.data?.length ? news.data : mockNews,
    notifications: notifications.data?.length ? notifications.data : mockNotifications,
    tickets: tickets.data?.length ? tickets.data : mockTickets,
    meterReadings: meterReadings.data?.length ? meterReadings.data : mockMeterReadings,
    documents: mergedDocuments.length ? mergedDocuments : mockDocuments,
    finances: finances.data?.length ? finances.data : mockFinances,
    meetings: meetings.data?.length ? meetings.data : mockMeetings,
    units: units.data?.length ? units.data : mockUnits,
    vendors: vendors.data?.length ? vendors.data : mockVendors,
    workOrders: workOrders.data?.length ? workOrders.data : mockWorkOrders,
    kbArticles: kbArticles.data?.length ? kbArticles.data : mockKbArticles,
    auditLogs: auditLogs.data?.length ? auditLogs.data : mockAuditLogs
  };
}
