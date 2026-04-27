'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  BellRing,
  CalendarDays,
  CircleDollarSign,
  FileText,
  Gauge,
  LogOut,
  Megaphone,
  MapPin,
  ShieldCheck,
  Siren,
  TicketCheck,
  UserCog,
  UserRound,
  Wrench
} from 'lucide-react';
import { Role, Ticket } from '@/lib/types';
import { hasSupabaseConfig, supabase } from '@/lib/supabase';

type DashboardData = {
  source: string;
  currentUser: { full_name: string; role: Role };
  news: Array<{
    id: string;
    title: string;
    content: string;
    target_group: string;
    created_at: string;
    created_by_name?: string;
    category?: string;
    source_label?: string;
  }>;
  notifications: Array<{ id: string; title: string; message: string; audience: string; channel: string; created_at: string }>;
  tickets: Array<{
    id: string;
    title: string;
    description: string;
    status: Ticket['status'];
    priority: Ticket['priority'];
    location: string;
    due_date: string | null;
    submitted_by?: string;
    unit_label?: string;
    created_at?: string;
    updated_at?: string;
  }>;
  meterReadings: Array<{ id: string; meter_type: string; value: number; reading_date: string; unit_label: string }>;
  documents: Array<{ id: string; title: string; category: string; version: string; uploaded_at: string }>;
  finances: Array<{ id: string; period: string; expected_amount: number; paid_amount: number; due_date: string }>;
  meetings: Array<{ id: string; title: string; scheduled_at: string; resolution_count: number }>;
};

const roleLabels: Record<Role, string> = {
  lako: 'Lakó',
  tulajdonos: 'Tulajdonos',
  kozos_kepviselo: 'Közös képviselő',
  megbizott: 'Megbízott',
  bizottsag: 'Bizottsági tag',
  konyvelo: 'Könyvelő'
};

const newsCategoryLabels: Record<string, string> = {
  tarsashazi_kozlony: 'Társasházi közlöny',
  keruleti_hir: 'Kerületi hír',
  uzemeltetes: 'Üzemeltetés',
  biztonsag: 'Biztonság',
  egyeb: 'Egyéb'
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('hu-HU', { dateStyle: 'medium' }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('hu-HU', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function previewText(text: string) {
  const sentences = text.split('. ').slice(0, 2).join('. ');
  return sentences.endsWith('.') ? sentences : `${sentences}.`;
}

export default function DashboardClient({ data }: { data: DashboardData }) {
  const [ticketSaved, setTicketSaved] = useState(false);
  const [meterSaved, setMeterSaved] = useState(false);
  const [noticeSaved, setNoticeSaved] = useState(false);
  const [tickets, setTickets] = useState(data.tickets);
  const [expandedNews, setExpandedNews] = useState<string[]>([]);
  const [ticketFilter, setTicketFilter] = useState<Ticket['status'] | 'osszes'>('osszes');

  const [name, setName] = useState(data.currentUser.full_name);
  const [unit, setUnit] = useState('');
  const [address, setAddress] = useState('');
  const [profileSaved, setProfileSaved] = useState(false);
  const [addressQuery, setAddressQuery] = useState('');
  const [addressOptions, setAddressOptions] = useState<string[]>([]);
  const [addressError, setAddressError] = useState('');
  const [isAddressLoading, setIsAddressLoading] = useState(false);

  const [ticketTitle, setTicketTitle] = useState('');
  const [ticketDescription, setTicketDescription] = useState('');
  const [ticketLocation, setTicketLocation] = useState('');
  const [ticketPriority, setTicketPriority] = useState<Ticket['priority']>('kozepes');

  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const isManager = useMemo(() => ['kozos_kepviselo', 'megbizott'].includes(data.currentUser.role), [data.currentUser.role]);

  const totalDue = data.finances.reduce((acc, item) => acc + Number(item.expected_amount ?? 0), 0);
  const totalPaid = data.finances.reduce((acc, item) => acc + Number(item.paid_amount ?? 0), 0);

  useEffect(() => {
    if (!hasSupabaseConfig || !supabase) {
      return;
    }

    supabase.auth.getSession().then(({ data: sessionData }) => {
      setIsLoggedIn(Boolean(sessionData.session));
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(Boolean(session));
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!addressQuery || addressQuery.length < 3) {
      setAddressOptions([]);
      setAddressError('');
      return;
    }

    const apiKey = process.env.NEXT_PUBLIC_AWS_LOCATION_API_KEY || process.env.VITE_AWS_LOCATION_API_KEY;
    const region = process.env.NEXT_PUBLIC_AWS_LOCATION_REGION || process.env.VITE_AWS_LOCATION_REGION || 'eu-north-1';

    if (!apiKey) {
      setAddressError('AWS Location API kulcs hiányzik.');
      setAddressOptions([]);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setIsAddressLoading(true);
      setAddressError('');

      try {
        const response = await fetch(
          `https://places.geo.${region}.amazonaws.com/v2/autocomplete?query=${encodeURIComponent(addressQuery)}&maxResults=6&language=hu`,
          {
            method: 'GET',
            headers: {
              'X-Amz-Api-Key': apiKey
            },
            signal: controller.signal
          }
        );

        if (!response.ok) {
          setAddressError('Címkeresés most nem elérhető.');
          setAddressOptions([]);
          return;
        }

        const payload = await response.json();
        const labels = (payload?.ResultItems ?? [])
          .map((item: { Title?: string; Address?: { Label?: string } }) => item.Address?.Label || item.Title)
          .filter((label: string | undefined): label is string => Boolean(label));

        setAddressOptions(labels);
      } catch {
        if (!controller.signal.aborted) {
          setAddressError('Címkeresés hiba történt.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsAddressLoading(false);
        }
      }
    }, 350);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [addressQuery]);

  const visibleTickets = useMemo(() => {
    if (ticketFilter === 'osszes') {
      return tickets;
    }

    return tickets.filter((ticket) => ticket.status === ticketFilter);
  }, [ticketFilter, tickets]);

  const submitTicket = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const now = new Date().toISOString();

    const newTicket: DashboardData['tickets'][number] = {
      id: `ticket-${now}`,
      title: ticketTitle,
      description: ticketDescription,
      status: 'uj',
      priority: ticketPriority,
      location: ticketLocation,
      due_date: null,
      submitted_by: name,
      unit_label: unit || undefined,
      created_at: now,
      updated_at: now
    };

    setTickets((prev) => [newTicket, ...prev]);
    setTicketSaved(true);
    setTicketTitle('');
    setTicketDescription('');
    setTicketLocation('');
    setTicketPriority('kozepes');
  };

  const updateTicketStatus = (ticketId: string, nextStatus: Ticket['status']) => {
    setTickets((prev) =>
      prev.map((ticket) =>
        ticket.id === ticketId
          ? {
              ...ticket,
              status: nextStatus,
              updated_at: new Date().toISOString()
            }
          : ticket
      )
    );
  };

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 md:px-8">
      <section className="rounded-2xl bg-gradient-to-r from-brand-700 to-brand-500 p-6 text-white shadow-lg md:p-8">
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-white/80">PanelLakó – MVP+</p>
          <h1 className="text-2xl font-bold md:text-4xl">Digitális működési központ társasházaknak</h1>
          <p className="max-w-3xl text-sm text-white/90 md:text-base">
            Jogosultságkezelés, belépés, hibabejelentés, vízóra bejelentés, célzott értesítések és visszakövethető ügykezelés.
          </p>
          <div className="flex flex-wrap items-center gap-3 text-xs text-white/90">
            <span className="rounded-full bg-white/20 px-3 py-1">Adatforrás: {data.source === 'supabase' ? 'Supabase' : 'Mock'}</span>
            <span className="rounded-full bg-white/20 px-3 py-1">Aktív szerepkör: {roleLabels[data.currentUser.role]}</span>
            {isLoggedIn ? (
              <button
                className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 font-semibold text-brand-700"
                onClick={async () => {
                  if (supabase) {
                    await supabase.auth.signOut();
                  }
                  setIsLoggedIn(false);
                }}
                type="button"
              >
                <LogOut size={14} /> Kijelentkezés
              </button>
            ) : (
              <Link className="rounded-full bg-white px-3 py-1 font-semibold text-brand-700" href="/login">
                Bejelentkezés
              </Link>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><UserRound size={18} className="text-brand-600" /> Profil adatok</h2>
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            setProfileSaved(true);
          }}
        >
          <div className="grid gap-3 md:grid-cols-2">
            <input
              required
              className="rounded-lg border border-slate-200 px-3 py-2"
              placeholder="Teljes név"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="rounded-lg border border-slate-200 px-3 py-2"
              placeholder="Lakás (opcionális, pl. A/12)"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            />
          </div>

          <div className="rounded-lg border border-slate-200 p-3">
            <label className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-700"><MapPin size={14} className="text-brand-600" /> Cím (AWS Location)</label>
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2"
              placeholder="Kezdj el címet írni (min. 3 karakter)"
              value={addressQuery}
              onChange={(e) => {
                setAddressQuery(e.target.value);
                setAddress(e.target.value);
              }}
            />
            {isAddressLoading ? <p className="mt-2 text-xs text-slate-500">Címek keresése...</p> : null}
            {addressError ? <p className="mt-2 text-xs text-amber-700">{addressError}</p> : null}
            {addressOptions.length > 0 ? (
              <ul className="mt-2 space-y-1 rounded-lg border border-slate-100 bg-slate-50 p-2">
                {addressOptions.map((option) => (
                  <li key={option}>
                    <button
                      className="w-full rounded-md px-2 py-1 text-left text-sm hover:bg-white"
                      type="button"
                      onClick={() => {
                        setAddress(option);
                        setAddressQuery(option);
                        setAddressOptions([]);
                      }}
                    >
                      {option}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {address ? <p className="mt-2 text-xs text-slate-600">Kiválasztott cím: {address}</p> : null}
          </div>

          <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">Profil mentése</button>
          {profileSaved ? <p className="text-sm text-emerald-700">Profiladatok mentve (demo).</p> : null}
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><ShieldCheck size={16} className="text-brand-600" /> Szerepkör teszt (demo)</div>
        <div className="flex flex-wrap gap-2 text-sm">
          {(['lako', 'megbizott', 'kozos_kepviselo'] as Role[]).map((role) => (
            <Link key={role} href={`/?role=${role}`} className="rounded-full border border-slate-200 px-3 py-1 hover:border-brand-500 hover:text-brand-700">
              {roleLabels[role]}
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="mb-2 flex items-center gap-2 text-brand-600"><BellRing size={18} /> Hírek</div><p className="text-2xl font-bold">{data.news.length}</p></article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="mb-2 flex items-center gap-2 text-brand-600"><Wrench size={18} /> Ticketek</div><p className="text-2xl font-bold">{tickets.length}</p></article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="mb-2 flex items-center gap-2 text-brand-600"><Gauge size={18} /> Óraállások</div><p className="text-2xl font-bold">{data.meterReadings.length}</p></article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="mb-2 flex items-center gap-2 text-brand-600"><CircleDollarSign size={18} /> Pénzügyek</div><p className="text-2xl font-bold">{((totalPaid / Math.max(totalDue, 1)) * 100).toFixed(0)}%</p></article>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><Siren size={18} className="text-brand-600" /> Új hibabejelentés</h2>
          <form className="space-y-3" onSubmit={submitTicket}>
            <input required className="w-full rounded-lg border border-slate-200 px-3 py-2" placeholder="Rövid cím" value={ticketTitle} onChange={(e) => setTicketTitle(e.target.value)} />
            <textarea required className="w-full rounded-lg border border-slate-200 px-3 py-2" placeholder="Leírás" rows={3} value={ticketDescription} onChange={(e) => setTicketDescription(e.target.value)} />
            <div className="grid gap-3 sm:grid-cols-2">
              <input required className="rounded-lg border border-slate-200 px-3 py-2" placeholder="Helyszín (pl. A/12)" value={ticketLocation} onChange={(e) => setTicketLocation(e.target.value)} />
              <select className="rounded-lg border border-slate-200 px-3 py-2" value={ticketPriority} onChange={(e) => setTicketPriority(e.target.value as Ticket['priority'])}><option value="kozepes">közepes</option><option value="magas">magas</option><option value="kritikus">kritikus</option><option value="alacsony">alacsony</option></select>
            </div>
            <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">Bejelentés rögzítése</button>
            {ticketSaved ? <p className="text-sm text-emerald-700">A ticket mentése demo módban sikeres, megjelent a ticketek listában.</p> : null}
          </form>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><Gauge size={18} className="text-brand-600" /> Óraállás bejelentése</h2>
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); setMeterSaved(true); }}>
            <div className="grid gap-3 sm:grid-cols-2">
              <select className="rounded-lg border border-slate-200 px-3 py-2"><option>viz</option><option>gaz</option><option>villany</option></select>
              <input type="number" step="0.01" required className="rounded-lg border border-slate-200 px-3 py-2" placeholder="Érték" />
            </div>
            <input type="date" required className="w-full rounded-lg border border-slate-200 px-3 py-2" />
            <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">Óraállás elküldése</button>
            {meterSaved ? <p className="text-sm text-emerald-700">Óraállás rögzítve (demo).</p> : null}
          </form>
        </article>

        {isManager ? (
          <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><Megaphone size={18} className="text-brand-600" /> Célzott értesítés kiküldése (képviselő/megbízott)</h2>
            <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); setNoticeSaved(true); }}>
              <div className="grid gap-3 sm:grid-cols-2">
                <input required className="rounded-lg border border-slate-200 px-3 py-2" placeholder="Értesítés címe" />
                <input required className="rounded-lg border border-slate-200 px-3 py-2" placeholder="Célcsoport (pl. B lépcsőház)" />
              </div>
              <textarea required className="w-full rounded-lg border border-slate-200 px-3 py-2" rows={3} placeholder="Üzenet" />
              <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">Kiküldés</button>
              {noticeSaved ? <p className="text-sm text-emerald-700">Értesítés mentve és kiküldésre jelölve (demo).</p> : null}
            </form>
          </article>
        ) : null}
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><BellRing size={18} className="text-brand-600" /> Hírfolyam</h2>
          <ul className="space-y-3">
            {data.news.map((item) => {
              const expanded = expandedNews.includes(item.id);
              return (
                <li key={item.id} className="rounded-lg border border-slate-100 p-3">
                  <p className="font-semibold">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{expanded ? item.content : previewText(item.content)}</p>
                  <p className="mt-2 text-xs text-slate-400">
                    {newsCategoryLabels[item.category || 'egyeb']} • {item.source_label || item.created_by_name || 'Ismeretlen forrás'} • {formatDateTime(item.created_at)}
                  </p>
                  <button
                    type="button"
                    className="mt-2 text-xs font-semibold text-brand-700 hover:underline"
                    onClick={() => {
                      setExpandedNews((prev) => (prev.includes(item.id) ? prev.filter((newsId) => newsId !== item.id) : [...prev, item.id]));
                    }}
                  >
                    {expanded ? 'Összecsukás' : 'Teljes hír megnyitása'}
                  </button>
                </li>
              );
            })}
          </ul>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><UserCog size={18} className="text-brand-600" /> Értesítési napló</h2>
          <ul className="space-y-3">{data.notifications.map((item) => <li key={item.id} className="rounded-lg border border-slate-100 p-3"><p className="font-semibold">{item.title}</p><p className="text-sm text-slate-600">{item.message}</p><p className="mt-1 text-xs text-slate-400">{item.audience} • {item.channel} • {formatDateTime(item.created_at)}</p></li>)}</ul>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><FileText size={18} className="text-brand-600" /> Dokumentumok</h2>
          <ul className="space-y-2">{data.documents.map((item) => <li key={item.id} className="rounded-lg border border-slate-100 p-3 text-sm"><p className="font-semibold">{item.title}</p><p className="text-slate-500">{item.category} • {item.version} • {formatDate(item.uploaded_at)}</p></li>)}</ul>
        </article>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-lg font-semibold"><TicketCheck size={18} className="text-brand-600" /> Ticketek menü</h2>
          <select className="rounded-lg border border-slate-200 px-3 py-2 text-sm" value={ticketFilter} onChange={(e) => setTicketFilter(e.target.value as Ticket['status'] | 'osszes')}>
            <option value="osszes">Összes</option>
            <option value="uj">Új</option>
            <option value="folyamatban">Folyamatban</option>
            <option value="varakozik">Várakozik</option>
            <option value="lezarva">Lezárva</option>
          </select>
        </div>

        <ul className="space-y-3">
          {visibleTickets.map((ticket) => (
            <li key={ticket.id} className="rounded-lg border border-slate-100 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{ticket.title}</p>
                  <p className="text-sm text-slate-600">{ticket.description}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{ticket.status}</span>
              </div>
              <p className="mt-2 text-xs text-slate-500">Prioritás: {ticket.priority} • Helyszín: {ticket.location}</p>
              <p className="text-xs text-slate-500">Beküldte: {ticket.submitted_by || 'Ismeretlen'} {ticket.unit_label ? `(${ticket.unit_label})` : ''} • Frissítve: {ticket.updated_at ? formatDateTime(ticket.updated_at) : '-'}</p>
              {isManager ? (
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <button className="rounded-md border border-slate-200 px-2 py-1 hover:border-brand-400" onClick={() => updateTicketStatus(ticket.id, 'folyamatban')} type="button">Folyamatban</button>
                  <button className="rounded-md border border-slate-200 px-2 py-1 hover:border-brand-400" onClick={() => updateTicketStatus(ticket.id, 'varakozik')} type="button">Várakozik</button>
                  <button className="rounded-md border border-slate-200 px-2 py-1 hover:border-emerald-400" onClick={() => updateTicketStatus(ticket.id, 'lezarva')} type="button">Lezárás</button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><CalendarDays size={18} className="text-brand-600" /> Közgyűlések</h2>
          <ul className="space-y-2 text-sm">{data.meetings.map((meeting) => <li key={meeting.id} className="rounded-lg border border-slate-100 p-3"><p className="font-semibold">{meeting.title}</p><p className="text-slate-500">{formatDate(meeting.scheduled_at)} • határozatok: {meeting.resolution_count}</p></li>)}</ul>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><CircleDollarSign size={18} className="text-brand-600" /> Közös költség</h2>
          <p className="mb-4 text-sm text-slate-500">Összesen: {totalDue.toLocaleString('hu-HU')} Ft • Befizetve: {totalPaid.toLocaleString('hu-HU')} Ft</p>
          <ul className="space-y-2 text-sm">{data.finances.map((entry) => <li key={entry.id} className="rounded-lg border border-slate-100 p-3"><p className="font-semibold">{entry.period}</p><p className="text-slate-500">Esedékes: {Number(entry.expected_amount).toLocaleString('hu-HU')} Ft • Befizetve: {Number(entry.paid_amount).toLocaleString('hu-HU')} Ft • Határidő: {formatDate(entry.due_date)}</p></li>)}</ul>
        </article>
      </section>
    </main>
  );
}
