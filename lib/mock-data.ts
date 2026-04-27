import { DocumentItem, FinanceItem, MeetingItem, NewsItem, Ticket } from './types';

export const mockNews: NewsItem[] = [
  {
    id: 'n1',
    title: 'Kazán éves felülvizsgálat – május 4.',
    content: 'A karbantartó 08:00 és 12:00 között dolgozik. Kérjük a kazánház megközelíthetőségét biztosítani.',
    target_group: 'Minden lakó',
    created_at: '2026-04-20'
  },
  {
    id: 'n2',
    title: 'Közgyűlési meghívó feltöltve',
    content: 'A 2026. május 15-i közgyűlés napirendje és mellékletei elérhetőek a Dokumentumok modulban.',
    target_group: 'Tulajdonosok',
    created_at: '2026-04-18'
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
    due_date: '2026-04-30'
  },
  {
    id: 't2',
    title: 'Lift kijelző hibás',
    description: 'A kijelző villog és nem mutatja a szintet.',
    status: 'uj',
    priority: 'kozepes',
    location: 'A lépcsőház lift',
    due_date: null
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
