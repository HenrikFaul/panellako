'use client';

import { useState } from 'react';
import { AlertTriangle, FolderOpen, Calculator, Vote, CheckCircle, Clock, FileText, ChevronRight, User, Bell } from 'lucide-react';

type DemoId = 'hiba' | 'dok' | 'koltseg' | 'kozgyules';

const TABS: { id: DemoId; label: string; icon: React.ElementType }[] = [
  { id: 'hiba', label: 'Hibabejelentés', icon: AlertTriangle },
  { id: 'dok', label: 'Dokumentumtár', icon: FolderOpen },
  { id: 'koltseg', label: 'Közös Költség', icon: Calculator },
  { id: 'kozgyules', label: 'Közgyűlés', icon: Vote },
];

function HibaDemo() {
  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Nyitott bejelentések</span>
        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700">3 aktív</span>
      </div>
      {[
        { title: 'Tetőn szivárgás — 4. emelet', user: 'Kovács István', time: '2 órája', status: 'Folyamatban', statusColor: 'bg-blue-100 text-blue-700', dot: 'bg-blue-400' },
        { title: 'Liftajtó nem záródik', user: 'Nagy Mária', time: '1 napja', status: 'Visszaigazolva', statusColor: 'bg-amber-100 text-amber-700', dot: 'bg-amber-400' },
        { title: 'Folyosói lámpa égett ki', user: 'Tóth Péter', time: '3 napja', status: 'Megoldva', statusColor: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-400' },
      ].map((item, i) => (
        <div key={i} className="rounded-xl border border-slate-100 bg-white p-3.5 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.dot}`} />
              <div>
                <p className="text-sm font-bold text-slate-800">{item.title}</p>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400">
                  <User size={10} />
                  <span>{item.user}</span>
                  <span>·</span>
                  <Clock size={10} />
                  <span>{item.time}</span>
                </div>
              </div>
            </div>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${item.statusColor}`}>{item.status}</span>
          </div>
        </div>
      ))}
      <button className="mt-auto flex items-center justify-center gap-2 rounded-xl bg-amber-50 border border-amber-100 px-4 py-2.5 text-sm font-bold text-amber-700 transition-colors hover:bg-amber-100">
        <AlertTriangle size={14} />
        Új hibabejelentés
      </button>
    </div>
  );
}

function DokDemo() {
  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Dokumentumtár</span>
        <span className="text-xs text-slate-400">24 fájl</span>
      </div>
      {[
        { folder: 'Közgyűlési határozatok', count: '8 fájl', color: 'bg-violet-50 border-violet-100', icon: 'text-violet-500' },
        { folder: 'Pénzügyi kimutatások', count: '6 fájl', color: 'bg-emerald-50 border-emerald-100', icon: 'text-emerald-500' },
        { folder: 'Szerződések', count: '5 fájl', color: 'bg-blue-50 border-blue-100', icon: 'text-blue-500' },
      ].map((item, i) => (
        <div key={i} className={`flex items-center gap-3 rounded-xl border ${item.color} px-3.5 py-3 transition-shadow hover:shadow-sm cursor-pointer`}>
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm`}>
            <FolderOpen size={16} className={item.icon} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-800">{item.folder}</p>
            <p className="text-xs text-slate-500">{item.count}</p>
          </div>
          <ChevronRight size={14} className="text-slate-300" />
        </div>
      ))}
      <div className="rounded-xl border border-slate-100 bg-slate-50 px-3.5 py-3">
        <div className="flex items-center gap-2 mb-2">
          <FileText size={14} className="text-slate-400" />
          <span className="text-xs font-bold text-slate-600">Legutóbb feltöltve</span>
        </div>
        <p className="text-sm font-medium text-slate-700">2024_evi_elszamolas.pdf</p>
        <p className="text-xs text-slate-400 mt-0.5">2025. május 20. · 1,2 MB</p>
      </div>
    </div>
  );
}

function KoltsegDemo() {
  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Közös Költség — 2025. május</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3">
          <p className="text-xs text-emerald-600 font-medium">Befolyt</p>
          <p className="text-lg font-black text-emerald-700 mt-0.5">324 000 Ft</p>
        </div>
        <div className="rounded-xl border border-red-100 bg-red-50 p-3">
          <p className="text-xs text-red-500 font-medium">Hátralék</p>
          <p className="text-lg font-black text-red-600 mt-0.5">48 000 Ft</p>
        </div>
      </div>
      <div className="rounded-xl border border-slate-100 bg-white overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-3 py-2 font-bold text-slate-500">Lakás</th>
              <th className="text-right px-3 py-2 font-bold text-slate-500">Összeg</th>
              <th className="text-right px-3 py-2 font-bold text-slate-500">Állapot</th>
            </tr>
          </thead>
          <tbody>
            {[
              { flat: '1/A', amount: '24 000 Ft', paid: true },
              { flat: '1/B', amount: '24 000 Ft', paid: true },
              { flat: '2/A', amount: '24 000 Ft', paid: false },
              { flat: '2/B', amount: '24 000 Ft', paid: true },
            ].map((row, i) => (
              <tr key={i} className="border-b border-slate-50 last:border-0">
                <td className="px-3 py-2 font-medium text-slate-700">{row.flat}</td>
                <td className="px-3 py-2 text-right text-slate-600">{row.amount}</td>
                <td className="px-3 py-2 text-right">
                  {row.paid
                    ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-700">Fizetve</span>
                    : <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600">Hátralék</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KozgyulesDemo() {
  const [voted, setVoted] = useState<number | null>(null);
  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Online szavazás</span>
        <span className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-bold text-violet-700">Aktív</span>
      </div>
      <div className="rounded-xl border border-violet-100 bg-violet-50 p-3.5">
        <p className="text-sm font-black text-slate-800">Tetőfelújítás elfogadása</p>
        <p className="text-xs text-slate-500 mt-1">Határozati javaslat: Megbízzuk a TetőMester Kft-t a 2025. évi felújítással, 4,8M Ft értékben.</p>
        <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
          <Bell size={10} />
          <span>Szavazati határidő: 2025. május 30.</span>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        {[
          { label: 'Igen, elfogadom', votes: 14, pct: 70, color: 'bg-emerald-500' },
          { label: 'Nem, elutasítom', votes: 4, pct: 20, color: 'bg-red-400' },
          { label: 'Tartózkodok', votes: 2, pct: 10, color: 'bg-slate-300' },
        ].map((opt, i) => (
          <button
            key={i}
            onClick={() => setVoted(i)}
            className={`w-full rounded-xl border p-3 text-left transition-all ${voted === i ? 'border-violet-400 bg-violet-50 ring-2 ring-violet-200' : 'border-slate-100 bg-white hover:border-violet-200 hover:bg-violet-50/40'}`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-bold text-slate-700">{opt.label}</span>
              <span className="text-xs text-slate-500">{opt.votes} szavazat</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
              <div className={`h-full rounded-full ${opt.color} transition-all duration-500`} style={{ width: `${opt.pct}%` }} />
            </div>
          </button>
        ))}
      </div>
      {voted !== null && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 px-3.5 py-2.5 text-sm font-bold text-emerald-700">
          <CheckCircle size={15} />
          Szavazatát rögzítettük. Köszönjük!
        </div>
      )}
    </div>
  );
}

const DEMOS: Record<DemoId, React.FC> = {
  hiba: HibaDemo,
  dok: DokDemo,
  koltseg: KoltsegDemo,
  kozgyules: KozgyulesDemo,
};

const DESCRIPTIONS: Record<DemoId, { title: string; text: string }> = {
  hiba: {
    title: 'Hibabejelentés percek alatt',
    text: 'Lakók egy gombnyomással jelzik a problémát — fotóval, helyszín megjelöléssel. A közös képviselő azonnal értesítést kap és nyomon követheti a javítás státuszát.',
  },
  dok: {
    title: 'Minden irat egy helyen',
    text: 'SZMSZ, közgyűlési határozatok, szerződések — digitálisan tárolva, jogosultság-kezeléssel védve. Bármikor, bárhonnan elérhető, kereső funkcióval.',
  },
  koltseg: {
    title: 'Átlátható pénzügyek',
    text: 'Tételesen nyilvántartja a befizetéseket és hátralékokat. Automatikus fizetési felszólítás, könyvelési export, al-mérőóra számítás — mind automatikusan.',
  },
  kozgyules: {
    title: 'Törvényes digitális szavazás',
    text: 'Szervezzen online közgyűlést a 2021. évi CXLIII. törvény szerint. Határozati javaslatok, elektronikus szavazás, automatikus határozatképesség-számítás.',
  },
};

export default function FunkcioDemo() {
  const [active, setActive] = useState<DemoId>('hiba');
  const DemoContent = DEMOS[active];
  const desc = DESCRIPTIONS[active];

  return (
    <section className="mb-16" aria-label="Interaktív bemutatók">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-black text-slate-900">Lásd működés közben</h2>
        <p className="mt-2 text-slate-500 text-sm">Kattints egy funkcióra és próbáld ki — pontosan így néz ki a valóságban.</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 flex-wrap justify-center mb-6">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all ${
                isActive
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-200'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Demo panel */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Live mockup */}
        <div className="relative rounded-2xl border border-slate-200 bg-slate-50 p-1 shadow-card">
          {/* Browser chrome */}
          <div className="flex items-center gap-1.5 rounded-t-xl bg-slate-200/60 px-3 py-2">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            <span className="ml-2 rounded-md bg-white/70 px-3 py-0.5 text-xs text-slate-400 font-mono">
              panellako.hu/app
            </span>
          </div>
          <div className="rounded-b-xl bg-white p-4 min-h-[340px]">
            <DemoContent key={active} />
          </div>
        </div>

        {/* Description */}
        <div className="flex flex-col justify-center gap-4 px-2">
          <h3 className="text-xl font-black text-slate-900">{desc.title}</h3>
          <p className="text-slate-600 leading-relaxed">{desc.text}</p>
          <ul className="flex flex-col gap-2">
            {active === 'hiba' && [
              'Fotócsatolás és helyszín megjelölés',
              'Automatikus értesítés a közös képviselőnek',
              'Státuszkövetés a megoldásig',
              'Teljes előzmény és dokumentáció',
            ].map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-slate-600">
                <CheckCircle size={15} className="shrink-0 text-brand-500" />
                {item}
              </li>
            ))}
            {active === 'dok' && [
              'Korlátlan tárolási kapacitás',
              'Jogosultság-kezelés lakásonként',
              'Teljes szöveges keresés',
              'GDPR-kompatibilis adatkezelés',
            ].map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-slate-600">
                <CheckCircle size={15} className="shrink-0 text-brand-500" />
                {item}
              </li>
            ))}
            {active === 'koltseg' && [
              'Tételes befizetés-nyilvántartás',
              'Automatikus fizetési felszólítás',
              'Könyvelési export (ANYK, Excel)',
              'Al-mérőóra díjszámítás',
            ].map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-slate-600">
                <CheckCircle size={15} className="shrink-0 text-brand-500" />
                {item}
              </li>
            ))}
            {active === 'kozgyules' && [
              '2021. évi CXLIII. tv. szerinti online szavazás',
              'Automatikus határozatképesség-számítás',
              'Elektronikus jelenléti ív és határozatnyilvántartás',
              'Egyidejű szavazás több határozati javaslatról',
            ].map((item) => (
              <li key={item} className="flex items-center gap-2 text-sm text-slate-600">
                <CheckCircle size={15} className="shrink-0 text-brand-500" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
