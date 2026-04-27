import {
  DocumentItem,
  FinanceItem,
  MeetingItem,
  MeterReading,
  NewsItem,
  NotificationItem,
  Ticket,
  UserProfile
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
    created_at: '2026-04-26T08:10:00Z'
  },
  {
    id: 'nt2',
    title: 'Lakói visszajelzés: kapu nehezen záródik',
    message: 'Szabó András (A/9) jelezte, hogy az utcafronti kapu rugója gyengült.',
    channel: 'app',
    audience: 'Közös képviselő + műszaki megbízott',
    created_at: '2026-04-25T18:45:00Z'
  },
  {
    id: 'nt3',
    title: 'Közös képviselői emlékeztető',
    message: 'Május 2-ig kérjük beküldeni a vízóra állásokat az elszámoláshoz.',
    channel: 'email',
    audience: 'Minden lakó',
    created_at: '2026-04-24T07:30:00Z'
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
  }
];

export const mockDocuments: DocumentItem[] = [
  {
    id: 'd1',
    title: 'SZMSZ 2026',
    category: 'Szabályzat',
    version: 'v3.1',
    uploaded_at: '2026-02-11',
    file_url: '#'
  },
  {
    id: 'd2',
    title: 'Közgyűlési jegyzőkönyv 2026.03.12',
    category: 'Jegyzőkönyv',
    version: 'v1.0',
    uploaded_at: '2026-03-13',
    file_url: '#'
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
  }
];

export const mockMeetings: MeetingItem[] = [
  {
    id: 'm1',
    title: 'Rendes évi közgyűlés',
    scheduled_at: '2026-05-15T17:00:00Z',
    status: 'tervezett',
    resolution_count: 4
  }
];
