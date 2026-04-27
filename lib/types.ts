export type Role = 'lako' | 'tulajdonos' | 'kozos_kepviselo' | 'megbizott' | 'bizottsag' | 'konyvelo';

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: Role;
}

export type NewsCategory = 'tarsashazi_kozlony' | 'keruleti_hir' | 'uzemeltetes' | 'biztonsag' | 'egyeb';

export interface NewsItem {
  id: string;
  title: string;
  content: string;
  target_group: string;
  created_at: string;
  created_by_name?: string;
  category?: NewsCategory;
  source_label?: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  channel: 'app' | 'email';
  audience: string;
  created_at: string;
  read_at?: string | null;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: 'uj' | 'folyamatban' | 'varakozik' | 'lezarva';
  priority: 'alacsony' | 'kozepes' | 'magas' | 'kritikus';
  location: string;
  due_date: string | null;
  submitted_by?: string;
  unit_label?: string;
  created_at?: string;
  updated_at?: string;
}

export interface MeterReading {
  id: string;
  meter_type: 'viz' | 'gaz' | 'villany';
  value: number;
  reading_date: string;
  unit_label: string;
  reported_by_name?: string;
}

export interface DocumentItem {
  id: string;
  title: string;
  category: string;
  version: string;
  uploaded_at: string;
  file_url: string;
  visibility?: string;
  acknowledged_at?: string | null;
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
  agenda_preview?: string;
}

export interface UnitItem {
  id: string;
  unit_label: string;
  owner_name: string;
  unit_type: 'Lakas' | 'Tarolo' | 'Garazs' | 'Uzlethelyiseg' | string;
  area_m2: number;
  ownership_share: number;
  balance_amount: number;
  has_water_meter?: boolean;
}

export interface VendorItem {
  id: string;
  name: string;
  category: string;
  contact: string;
  sla_hours: number;
}

export interface WorkOrderItem {
  id: string;
  ticket_title: string;
  vendor_name: string;
  status: 'tervezett' | 'kikuldve' | 'folyamatban' | 'lezarva';
  due_date: string;
  cost_estimate: number;
}

export interface KnowledgeBaseArticle {
  id: string;
  title: string;
  topic: string;
  body: string;
  audience: string;
}

export interface AuditLogItem {
  id: string;
  actor_name: string;
  action_type: string;
  entity_type: string;
  entity_label: string;
  created_at: string;
}
