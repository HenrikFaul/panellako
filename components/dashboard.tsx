import { BellRing, CalendarDays, CircleDollarSign, FileText, Siren, Wrench } from 'lucide-react';
import { getDashboardData } from '@/lib/data';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('hu-HU', { dateStyle: 'medium' }).format(new Date(value));
}

export default async function Dashboard() {
  const data = await getDashboardData();

  const totalDue = data.finances.reduce((acc, item) => acc + Number(item.expected_amount ?? 0), 0);
  const totalPaid = data.finances.reduce((acc, item) => acc + Number(item.paid_amount ?? 0), 0);

  return (
    <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 md:px-8">
      <section className="rounded-2xl bg-gradient-to-r from-brand-700 to-brand-500 p-6 text-white shadow-lg md:p-8">
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-white/80">PanelLakó – MVP</p>
          <h1 className="text-2xl font-bold md:text-4xl">Digitális működési központ társasházaknak</h1>
          <p className="max-w-3xl text-sm text-white/90 md:text-base">
            Kevesebb telefonálás, kevesebb vita, gyorsabb ügyintézés. Egy helyen kezelhető a kommunikáció,
            hibakövetés, dokumentumtár, pénzügyi átláthatóság és közgyűlési információ.
          </p>
          <p className="text-xs text-white/70">
            Adatforrás: {data.source === 'supabase' ? 'Supabase' : 'Mock adatok (kész konfiguráció nélkül)'}
          </p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center gap-2 text-brand-600"><BellRing size={18} /> Hírek</div>
          <p className="text-2xl font-bold">{data.news.length}</p>
          <p className="text-sm text-slate-500">Aktív közlemények</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center gap-2 text-brand-600"><Wrench size={18} /> Ticketek</div>
          <p className="text-2xl font-bold">{data.tickets.length}</p>
          <p className="text-sm text-slate-500">Nyitott vagy folyamatban</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center gap-2 text-brand-600"><FileText size={18} /> Dokumentumok</div>
          <p className="text-2xl font-bold">{data.documents.length}</p>
          <p className="text-sm text-slate-500">Elérhető fájl</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center gap-2 text-brand-600"><CircleDollarSign size={18} /> Pénzügyek</div>
          <p className="text-2xl font-bold">{(totalPaid / Math.max(totalDue, 1) * 100).toFixed(0)}%</p>
          <p className="text-sm text-slate-500">Befizetési arány</p>
        </article>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><BellRing size={18} className="text-brand-600" /> Hírfolyam</h2>
          <ul className="space-y-3">
            {data.news.map((item) => (
              <li key={item.id} className="rounded-lg border border-slate-100 p-3">
                <p className="font-semibold">{item.title}</p>
                <p className="text-sm text-slate-600">{item.content}</p>
                <p className="mt-1 text-xs text-slate-400">{item.target_group} • {formatDate(item.created_at)}</p>
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><Siren size={18} className="text-brand-600" /> Hibabejelentések</h2>
          <ul className="space-y-3">
            {data.tickets.map((item) => (
              <li key={item.id} className="rounded-lg border border-slate-100 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">{item.title}</p>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs">{item.status}</span>
                </div>
                <p className="text-sm text-slate-600">{item.description}</p>
                <p className="mt-1 text-xs text-slate-400">{item.location} • prioritás: {item.priority}</p>
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><FileText size={18} className="text-brand-600" /> Dokumentumtár</h2>
          <ul className="space-y-2">
            {data.documents.map((item) => (
              <li key={item.id} className="flex items-center justify-between rounded-lg border border-slate-100 p-3 text-sm">
                <div>
                  <p className="font-semibold">{item.title}</p>
                  <p className="text-slate-500">{item.category} • {item.version}</p>
                </div>
                <span className="text-xs text-slate-400">{formatDate(item.uploaded_at)}</span>
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold"><CalendarDays size={18} className="text-brand-600" /> Közgyűlés és pénzügy</h2>
          <div className="space-y-4">
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-sm text-slate-500">Közös költség összesen</p>
              <p className="text-xl font-semibold">{totalDue.toLocaleString('hu-HU')} Ft</p>
              <p className="text-sm text-slate-500">Befizetve: {totalPaid.toLocaleString('hu-HU')} Ft</p>
            </div>
            <ul className="space-y-2 text-sm">
              {data.meetings.map((meeting) => (
                <li key={meeting.id} className="rounded-lg border border-slate-100 p-3">
                  <p className="font-semibold">{meeting.title}</p>
                  <p className="text-slate-500">{formatDate(meeting.scheduled_at)} • határozatok: {meeting.resolution_count}</p>
                </li>
              ))}
            </ul>
          </div>
        </article>
      </section>
    </main>
  );
}
