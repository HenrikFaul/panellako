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
import { hasSupabaseConfig, supabase } from './supabase';
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

  if (!hasSupabaseConfig || !supabase) {
    return fallback;
  }

  const [news, notifications, tickets, meterReadings, documents, finances, meetings, units, vendors, workOrders, kbArticles, auditLogs] = await Promise.all([
    supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(5),
    supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(8),
    supabase.from('tickets').select('*').order('created_at', { ascending: false }).limit(12),
    supabase.from('meter_readings').select('*').order('reading_date', { ascending: false }).limit(8),
    supabase.from('documents').select('*').order('uploaded_at', { ascending: false }).limit(10),
    supabase.from('finance_entries').select('*').order('due_date', { ascending: false }).limit(8),
    supabase.from('meetings').select('*').order('scheduled_at', { ascending: false }).limit(6),
    supabase.from('units').select('*').limit(12),
    supabase.from('vendors').select('*').limit(8),
    supabase.from('work_orders').select('*').order('due_date', { ascending: true }).limit(8),
    supabase.from('knowledge_base_articles').select('*').limit(8),
    supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(10)
  ]);

  return {
    source: 'supabase',
    currentUser: { ...mockCurrentUser, role },
    news: news.data?.length ? news.data : mockNews,
    notifications: notifications.data?.length ? notifications.data : mockNotifications,
    tickets: tickets.data?.length ? tickets.data : mockTickets,
    meterReadings: meterReadings.data?.length ? meterReadings.data : mockMeterReadings,
    documents: documents.data?.length ? documents.data : mockDocuments,
    finances: finances.data?.length ? finances.data : mockFinances,
    meetings: meetings.data?.length ? meetings.data : mockMeetings,
    units: units.data?.length ? units.data : mockUnits,
    vendors: vendors.data?.length ? vendors.data : mockVendors,
    workOrders: workOrders.data?.length ? workOrders.data : mockWorkOrders,
    kbArticles: kbArticles.data?.length ? kbArticles.data : mockKbArticles,
    auditLogs: auditLogs.data?.length ? auditLogs.data : mockAuditLogs
  };
}
