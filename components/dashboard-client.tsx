'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  BellRing,
  CalendarDays,
  CircleDollarSign,
  FileText,
  Gauge,
  Megaphone,
  ShieldCheck,
  Siren,
  UserCog,
  Wrench
} from 'lucide-react';
import { Role } from '@/lib/types';

type DashboardData = {
  source: string;
  currentUser: { full_name: string; role: Role };
  news: Array<{ id: string; title: string; content: string; target_group: string; created_at: string; created_by_name?: string }>;
  notifications: Array<{ id: string; title: string; message: string; audience: string; channel: string; created_at: string }>;
  tickets: Array<{ id: string; title: string; description: string; status: string; priority: string; location: string }>;
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat('hu-HU', { dateStyle: 'medium' }).format(new Date(value));
}

export default function DashboardClient({ data }: { data: DashboardData }) {
  const [ticketSaved, setTicketSaved] = useState(false);
  const [meterSaved, setMeterSaved] = useState(false);
  const [noticeSaved, setNoticeSaved] = useState(false);

  const isManager = useMemo(() => ['kozos_kepviselo', 'megbizott'].includes(data.currentUser.role), [data.currentUser.role]);

  const totalDue = data.finances.reduce((acc, item) => acc + Number(item.expected_amount ?? 0), 0);
  const totalPaid = data.finances.reduce((acc, item) => acc + Number(item.paid_amount ?? 0), 0);

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
            <Link className="rounded-full bg-white px-3 py-1 font-semibold text-brand-700" href="/login">Bejelentkezés</Link>
          </div>
        </div>
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
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="mb-2 flex items-center gap-2 text-brand-600"><Wrench size={18} /> Ticketek</div><p className="text-2xl font-bold">{data.tickets.length}</p></article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="mb-2 flex items-center gap-2 text-brand-600"><Gauge size={18} /> Óraállások</div><p className="text-2xl font-bold">{data.meterReadings.length}</p></article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"><div className="mb-2 flex items-center gap-2 text-brand-600"><CircleDollarSign size={18} /> Pénzügyek</div><p className="text-2xl font-bold">{(totalPaid / Math.max(totalDue, 1) * 100).toFixed(0)}%</p></article>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><Siren size={18} className="text-brand-600" /> Új hibabejelentés</h2>
          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); setTicketSaved(true); }}>
            <input required className="w-full rounded-lg border border-slate-200 px-3 py-2" placeholder="Rövid cím" />
            <textarea required className="w-full rounded-lg border border-slate-200 px-3 py-2" placeholder="Leírás" rows={3} />
            <div className="grid gap-3 sm:grid-cols-2">
              <input required className="rounded-lg border border-slate-200 px-3 py-2" placeholder="Helyszín (pl. A/12)" />
              <select className="rounded-lg border border-slate-200 px-3 py-2"><option>kozepes</option><option>magas</option><option>kritikus</option></select>
            </div>
            <button className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">Bejelentés rögzítése</button>
            {ticketSaved ? <p className="text-sm text-emerald-700">A ticket mentése demo módban sikeres.</p> : null}
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
          <ul className="space-y-3">{data.news.map((item) => <li key={item.id} className="rounded-lg border border-slate-100 p-3"><p className="font-semibold">{item.title}</p><p className="text-sm text-slate-600">{item.content}</p><p className="mt-1 text-xs text-slate-400">{item.target_group} • {formatDate(item.created_at)}</p></li>)}</ul>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><UserCog size={18} className="text-brand-600" /> Értesítési napló</h2>
          <ul className="space-y-3">{data.notifications.map((item) => <li key={item.id} className="rounded-lg border border-slate-100 p-3"><p className="font-semibold">{item.title}</p><p className="text-sm text-slate-600">{item.message}</p><p className="mt-1 text-xs text-slate-400">{item.audience} • {item.channel} • {formatDate(item.created_at)}</p></li>)}</ul>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><FileText size={18} className="text-brand-600" /> Dokumentumok</h2>
          <ul className="space-y-2">{data.documents.map((item) => <li key={item.id} className="rounded-lg border border-slate-100 p-3 text-sm"><p className="font-semibold">{item.title}</p><p className="text-slate-500">{item.category} • {item.version} • {formatDate(item.uploaded_at)}</p></li>)}</ul>
        </article>
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
