export type Role = 'lako' | 'tulajdonos' | 'kozos_kepviselo' | 'bizottsag' | 'konyvelo';

export interface NewsItem {
  id: string;
  title: string;
  content: string;
  target_group: string;
  created_at: string;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: 'uj' | 'folyamatban' | 'varakozik' | 'lezarva';
  priority: 'alacsony' | 'kozepes' | 'magas' | 'kritikus';
  location: string;
  due_date: string | null;
}

export interface DocumentItem {
  id: string;
  title: string;
  category: string;
  version: string;
  uploaded_at: string;
  file_url: string;
}

export interface FinanceItem {
  id: string;
  period: string;
  expected_amount: number;
  paid_amount: number;
  due_date: string;
}

export interface MeetingItem {
  id: string;
  title: string;
  scheduled_at: string;
  status: 'tervezett' | 'lezart';
  resolution_count: number;
}
