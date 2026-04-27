import {
  mockCurrentUser,
  mockDocuments,
  mockFinances,
  mockMeetings,
  mockMeterReadings,
  mockNews,
  mockNotifications,
  mockTickets
} from './mock-data';
import { hasSupabaseConfig, supabase } from './supabase';
import { Role } from './types';

export async function getDashboardData(role: Role = 'lako') {
  if (!hasSupabaseConfig || !supabase) {
    return {
      source: 'mock',
      currentUser: { ...mockCurrentUser, role },
      news: mockNews,
      notifications: mockNotifications,
      tickets: mockTickets,
      meterReadings: mockMeterReadings,
      documents: mockDocuments,
      finances: mockFinances,
      meetings: mockMeetings
    };
  }

  const [news, notifications, tickets, meterReadings, documents, finances, meetings] = await Promise.all([
    supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(5),
    supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(6),
    supabase.from('tickets').select('*').order('created_at', { ascending: false }).limit(8),
    supabase.from('meter_readings').select('*').order('reading_date', { ascending: false }).limit(6),
    supabase.from('documents').select('*').order('uploaded_at', { ascending: false }).limit(8),
    supabase.from('finance_entries').select('*').order('due_date', { ascending: false }).limit(6),
    supabase.from('meetings').select('*').order('scheduled_at', { ascending: false }).limit(5)
  ]);

  return {
    source: 'supabase',
    currentUser: { ...mockCurrentUser, role },
    news: news.data ?? mockNews,
    notifications: notifications.data ?? mockNotifications,
    tickets: tickets.data ?? mockTickets,
    meterReadings: meterReadings.data ?? mockMeterReadings,
    documents: documents.data ?? mockDocuments,
    finances: finances.data ?? mockFinances,
    meetings: meetings.data ?? mockMeetings
  };
}
