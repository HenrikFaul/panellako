import { mockDocuments, mockFinances, mockMeetings, mockNews, mockTickets } from './mock-data';
import { hasSupabaseConfig, supabase } from './supabase';

export async function getDashboardData() {
  if (!hasSupabaseConfig || !supabase) {
    return {
      source: 'mock',
      news: mockNews,
      tickets: mockTickets,
      documents: mockDocuments,
      finances: mockFinances,
      meetings: mockMeetings
    };
  }

  const [news, tickets, documents, finances, meetings] = await Promise.all([
    supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(5),
    supabase.from('tickets').select('*').order('created_at', { ascending: false }).limit(8),
    supabase.from('documents').select('*').order('uploaded_at', { ascending: false }).limit(8),
    supabase.from('finance_entries').select('*').order('due_date', { ascending: false }).limit(6),
    supabase.from('meetings').select('*').order('scheduled_at', { ascending: false }).limit(5)
  ]);

  return {
    source: 'supabase',
    news: news.data ?? mockNews,
    tickets: tickets.data ?? mockTickets,
    documents: documents.data ?? mockDocuments,
    finances: finances.data ?? mockFinances,
    meetings: meetings.data ?? mockMeetings
  };
}
