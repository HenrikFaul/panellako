import {
  AuditLogItem,
  DocumentItem,
  FinanceItem,
  KnowledgeBaseArticle,
  MeetingItem,
  MeterReading,
  NewsItem,
  NotificationItem,
  Ticket,
  UnitItem,
  UserProfile,
  VendorItem,
  WorkOrderItem
} from './types';

export const mockCurrentUser: UserProfile = {
  id: 'u1',
  full_name: 'Minta Mária',
  email: 'maria@example.com',
  role: 'lako'
};

export const mockNews: NewsItem[] = [
  {
    id: 'n1',
    title: 'Kazán éves felülvizsgálat – május 4.',
    content: 'A karbantartó 08:00 és 12:00 között dolgozik. Kérjük a kazánház megközelíthetőségét biztosítani. A melegvíz-szolgáltatás időszakosan szünetelhet.',
    target_group: 'Minden lakó',
    created_at: '2026-04-20T08:00:00Z',
    created_by_name: 'Közös képviselő',
    category: 'uzemeltetes',
    source_label: 'PanelLakó társasházi közlöny'
  },
  {
    id: 'n2',
    title: 'Közgyűlési meghívó feltöltve',
    content: 'A 2026. május 15-i közgyűlés napirendje és mellékletei elérhetőek a Dokumentumok modulban. Kérjük, olvassák át a költségvetési mellékletet is.',
    target_group: 'Tulajdonosok',
    created_at: '2026-04-18T16:30:00Z',
    created_by_name: 'Közös képviselő',
    category: 'tarsashazi_kozlony',
    source_label: 'Társasházi közlöny'
  },
  {
    id: 'n3',
    title: 'Kerületi lomtalanítás időpontja',
    content: 'A XIII. kerületben a következő lomtalanítás 2026. május 26-án lesz. A kihelyezés szabályairól részletes tájékoztatás a kerületi oldalon olvasható.',
    target_group: 'Minden lakó',
    created_at: '2026-04-17T12:20:00Z',
    created_by_name: 'Önkormányzati hírfigyelő',
    category: 'keruleti_hir',
    source_label: 'XIII. kerületi önkormányzat'
  }
];

export const mockNotifications: NotificationItem[] = [
  {
    id: 'nt1',
    title: 'Csőtörés miatti vízszünet',
    message: 'A B lépcsőházban 14:00-16:00 között vízszünet várható.',
    channel: 'app',
    audience: 'B lépcsőház lakói',
    created_at: '2026-04-26T08:10:00Z',
    read_at: null
  },
  {
    id: 'nt2',
    title: 'Lakói visszajelzés: kapu nehezen záródik',
    message: 'Szabó András (A/9) jelezte, hogy az utcafronti kapu rugója gyengült.',
    channel: 'app',
    audience: 'Közös képviselő + műszaki megbízott',
    created_at: '2026-04-25T18:45:00Z',
    read_at: null
  },
  {
    id: 'nt3',
    title: 'Közös képviselői emlékeztető',
    message: 'Május 2-ig kérjük beküldeni a vízóra állásokat az elszámoláshoz.',
    channel: 'email',
    audience: 'Minden lakó',
    created_at: '2026-04-24T07:30:00Z',
    read_at: '2026-04-24T09:00:00Z'
  }
];

export const mockTickets: Ticket[] = [
  {
    id: 't1',
    title: 'Beázás a 3. emeleten',
    description: 'Erős eső után csöpög a mennyezet a lépcsőházban.',
    status: 'folyamatban',
    priority: 'magas',
    location: 'B lépcsőház, 3. emelet',
    due_date: '2026-04-30',
    submitted_by: 'Varga Lilla',
    unit_label: 'B/32',
    created_at: '2026-04-22T09:00:00Z',
    updated_at: '2026-04-26T11:00:00Z'
  },
  {
    id: 't2',
    title: 'Lift kijelző hibás',
    description: 'A kijelző villog és nem mutatja a szintet.',
    status: 'uj',
    priority: 'kozepes',
    location: 'A lépcsőház lift',
    due_date: null,
    submitted_by: 'Minta Mária',
    unit_label: 'A/12',
    created_at: '2026-04-24T14:10:00Z',
    updated_at: '2026-04-24T14:10:00Z'
  },
  {
    id: 't3',
    title: 'Kapu záródása bizonytalan',
    description: 'A mágneszár néha nyitva marad, ezért biztonsági kockázat.',
    status: 'varakozik',
    priority: 'kritikus',
    location: 'Főbejárat',
    due_date: '2026-04-28',
    submitted_by: 'Szabó András',
    unit_label: 'A/9',
    created_at: '2026-04-25T07:30:00Z',
    updated_at: '2026-04-26T13:20:00Z'
  }
];

export const mockMeterReadings: MeterReading[] = [
  {
    id: 'mr1',
    meter_type: 'viz',
    value: 128.4,
    reading_date: '2026-04-25',
    unit_label: 'A/12',
    reported_by_name: 'Minta Mária'
  },
  {
    id: 'mr2',
    meter_type: 'villany',
    value: 2291,
    reading_date: '2026-04-22',
    unit_label: 'B/32',
    reported_by_name: 'Varga Lilla'
  }
];

export const mockDocuments: DocumentItem[] = [
  {
    id: 'd1',
    title: 'SZMSZ 2026',
    category: 'Szabályzat',
    version: 'v3.1',
    uploaded_at: '2026-02-11',
    file_url: '#',
    visibility: 'Tulajdonosok',
    acknowledged_at: '2026-02-12T10:00:00Z'
  },
  {
    id: 'd2',
    title: 'Közgyűlési jegyzőkönyv 2026.03.12',
    category: 'Jegyzőkönyv',
    version: 'v1.0',
    uploaded_at: '2026-03-13',
    file_url: '#',
    visibility: 'Minden lakó',
    acknowledged_at: null
  },
  {
    id: 'd3',
    title: 'Biztosítási kötvény és kárrendezési útmutató',
    category: 'Biztosítás',
    version: 'v2.0',
    uploaded_at: '2026-04-01',
    file_url: '#',
    visibility: 'Tulajdonosok',
    acknowledged_at: null
  }
];

export const mockFinances: FinanceItem[] = [
  {
    id: 'f1',
    period: '2026-04',
    expected_amount: 28000,
    paid_amount: 28000,
    due_date: '2026-04-10'
  },
  {
    id: 'f2',
    period: '2026-05',
    expected_amount: 28000,
    paid_amount: 0,
    due_date: '2026-05-10'
  },
  {
    id: 'f3',
    period: 'Felújítási alap 2026 Q2',
    expected_amount: 12000,
    paid_amount: 12000,
    due_date: '2026-05-20'
  }
];

export const mockMeetings: MeetingItem[] = [
  {
    id: 'm1',
    title: 'Rendes évi közgyűlés',
    scheduled_at: '2026-05-15T17:00:00Z',
    status: 'tervezett',
    resolution_count: 4,
    agenda_preview: 'Költségvetés, felújítási alap, kazánkarbantartás, SZMSZ módosítás'
  },
  {
    id: 'm2',
    title: 'Rendkívüli online szavazás – kapurendszer',
    scheduled_at: '2026-05-29T18:00:00Z',
    status: 'tervezett',
    resolution_count: 1,
    agenda_preview: 'Beléptetőrendszer árajánlat elfogadása'
  }
];

export const mockUnits: UnitItem[] = [
  { id: 'u-a-t4', unit_label: 'A / T4', owner_name: 'Kovács Mónika', unit_type: 'Tarolo', area_m2: 6, ownership_share: 18, balance_amount: -29000, has_water_meter: false },
  { id: 'u-a-l2', unit_label: 'A / Földszint / L2', owner_name: 'Németh Orsolya', unit_type: 'Lakas', area_m2: 67, ownership_share: 262, balance_amount: -8500, has_water_meter: true },
  { id: 'u-a-l3', unit_label: 'A / 1. emelet / L3', owner_name: 'Gombai Norina', unit_type: 'Lakas', area_m2: 62, ownership_share: 238, balance_amount: -7500, has_water_meter: true },
  { id: 'u-g02', unit_label: 'G02', owner_name: 'Kovács Mónika', unit_type: 'Garazs', area_m2: 0, ownership_share: 0, balance_amount: 4000, has_water_meter: false },
  { id: 'u-a-l1', unit_label: 'A / Földszint / L1', owner_name: 'Németh Orsolya', unit_type: 'Lakas', area_m2: 87, ownership_share: 317, balance_amount: 0, has_water_meter: true }
];

export const mockVendors: VendorItem[] = [
  { id: 'v1', name: 'GyorsLift Kft.', category: 'Liftkarbantartás', contact: 'ugyelet@gyorslift.hu', sla_hours: 24 },
  { id: 'v2', name: 'FixVíz Partner', category: 'Víz- és fűtésszerelés', contact: '+36 30 555 0101', sla_hours: 12 },
  { id: 'v3', name: 'CleanCourt Bt.', category: 'Takarítás', contact: 'iroda@cleancourt.hu', sla_hours: 48 }
];

export const mockWorkOrders: WorkOrderItem[] = [
  { id: 'wo1', ticket_title: 'Beázás a 3. emeleten', vendor_name: 'FixVíz Partner', status: 'folyamatban', due_date: '2026-04-30', cost_estimate: 95000 },
  { id: 'wo2', ticket_title: 'Lift kijelző hibás', vendor_name: 'GyorsLift Kft.', status: 'kikuldve', due_date: '2026-05-02', cost_estimate: 42000 }
];

export const mockKbArticles: KnowledgeBaseArticle[] = [
  { id: 'kb1', title: 'Kihez forduljak sürgős csőtörésnél?', topic: 'Vészhelyzet', body: 'Elsőként a közös képviselői ügyeletet és a kijelölt vízszerelő partnert kell értesíteni.', audience: 'Minden lakó' },
  { id: 'kb2', title: 'Hogyan működik a meghatalmazás közgyűlésre?', topic: 'Közgyűlés', body: 'A tulajdonos meghatalmazást adhat másik személynek, a rendszer ezt a közgyűléshez kapcsolva naplózza.', audience: 'Tulajdonosok' },
  { id: 'kb3', title: 'Mikor kell vízóraállást diktálni?', topic: 'Mérőórák', body: 'A diktálási ablak minden hónap 25. és utolsó napja között aktív.', audience: 'Lakók' }
];

export const mockAuditLogs: AuditLogItem[] = [
  { id: 'a1', actor_name: 'Közös képviselő', action_type: 'document_uploaded', entity_type: 'document', entity_label: 'Biztosítási kötvény', created_at: '2026-04-26T09:15:00Z' },
  { id: 'a2', actor_name: 'Varga Lilla', action_type: 'ticket_created', entity_type: 'ticket', entity_label: 'Beázás a 3. emeleten', created_at: '2026-04-22T09:00:00Z' },
  { id: 'a3', actor_name: 'Minta Mária', action_type: 'meter_reading_submitted', entity_type: 'meter_reading', entity_label: 'A/12 vízóra', created_at: '2026-04-25T18:44:00Z' }
];
