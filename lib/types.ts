export type Role = 'lako' | 'tulajdonos' | 'kozos_kepviselo' | 'megbizott' | 'bizottsag' | 'konyvelo';

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  notifications_email?: boolean;
  notifications_statutory_email?: boolean;
  unsubscribe_token?: string;
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
  // v2 communication fields
  scope?: 'all' | 'owners' | 'residents' | 'specific_units';
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  deadline?: string | null;
  requires_acknowledgement?: boolean;
  read_at?: string | null;       // per current user
  read_count?: number;           // total readers (for manager view)
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

export type AiCategory =
  | 'plumbing'
  | 'electrical'
  | 'structural'
  | 'common_area'
  | 'emergency'
  | 'hvac'
  | 'elevator'
  | 'other';

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
  // AI triage fields — null until Edge Function completes
  ai_category?: AiCategory | null;
  ai_urgency?: number | null;
  ai_vendor_suggestion?: string | null;
  ai_summary_hu?: string | null;
  ai_triage_at?: string | null;
  ai_override?: boolean | null;
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

export type FinanceEntryType = 'charge' | 'payment' | 'adjustment' | 'opening_balance';

export interface FinanceItem {
  id: string;
  unit_id?: string;
  period: string;
  expected_amount: number;
  paid_amount: number;
  due_date: string;
  entry_type?: FinanceEntryType;
  description?: string;
  payment_date?: string | null;
  payment_reference?: string | null;
  created_by?: string | null;
}

export interface MeetingItem {
  id: string;
  title: string;
  scheduled_at: string;
  status: 'tervezett' | 'lezart';
  status_detail?: string;
  resolution_count: number;
  agenda_preview?: string;
  location?: string;
  actual_quorum?: number | null;
  quorum_threshold?: number;
  invitation_sent_at?: string | null;
  protocol_url?: string | null;
  protocol_generated_at?: string | null;
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
