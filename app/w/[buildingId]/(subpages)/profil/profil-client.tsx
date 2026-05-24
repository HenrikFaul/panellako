'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Home,
  Mail,
  Phone,
  UserRound,
  ShieldCheck,
  UserCog,
} from 'lucide-react';

interface Props {
  buildingId:    string;
  buildingName:  string;
  buildingAddress: string;
  role:          string;
  roleLabel:     string;
  email:         string;
  initialName:   string;
  initialPhone:  string;
  unit: { unit_label: string; floor: string | null; area_m2: number | null } | null;
}

const ROLE_COLOR: Record<string, string> = {
  lako:             'bg-sky-500/15 text-sky-300 border-sky-500/25',
  tulajdonos:       'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
  kozos_kepviselo:  'bg-violet-500/15 text-violet-300 border-violet-500/25',
  megbizott:        'bg-amber-500/15 text-amber-300 border-amber-500/25',
  bizottsag:        'bg-rose-500/15 text-rose-300 border-rose-500/25',
  konyvelo:         'bg-cyan-500/15 text-cyan-300 border-cyan-500/25',
};

export default function ProfilPageClient({
  buildingId,
  buildingName,
  buildingAddress,
  role,
  roleLabel,
  email,
  initialName,
  initialPhone,
  unit,
}: Props) {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: name.trim(), phone: phone.trim() }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError((d as { message?: string }).message ?? 'Mentés sikertelen.');
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch {
      setError('Hálózati hiba — próbáld újra.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      {/* ── Top bar ────────────────────────────────────────────────────── */}
      <div className="border-b border-slate-800/60 px-6 py-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/w/${buildingId}`}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-500 transition-colors hover:bg-white/[0.05] hover:text-slate-300"
          >
            <ArrowLeft size={13} />
            Vissza a dashboardra
          </Link>
          <span className="text-slate-700">·</span>
          <p className="text-[11px] text-slate-600 truncate">{buildingName}</p>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/15 border border-brand-500/25">
            <UserCog size={18} className="text-brand-400" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Lakói profil</p>
            <h1 className="text-xl font-black text-white leading-tight">
              {name || 'Névtelen'}
            </h1>
          </div>
          <span className={`ml-auto shrink-0 rounded-lg border px-2.5 py-1 text-[10px] font-bold ${ROLE_COLOR[role] ?? 'bg-slate-700/30 text-slate-400 border-slate-700/50'}`}>
            {roleLabel}
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-6 p-4 md:p-6">

        {/* ── Building context ───────────────────────────────────────────── */}
        <div className="rounded-2xl border border-slate-800/60 bg-white/[0.03] px-4 py-3">
          <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-slate-600">Épület</p>
          <div className="flex items-center gap-2">
            <Building2 size={14} className="shrink-0 text-slate-500" />
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">{buildingName}</p>
              <p className="text-[11px] text-slate-500 truncate">{buildingAddress}</p>
            </div>
          </div>
          {unit && (
            <div className="mt-2 border-t border-slate-800/50 pt-2 flex items-center gap-2">
              <Home size={13} className="shrink-0 text-slate-600" />
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600">Regisztrált albetét</p>
                <p className="text-sm font-semibold text-slate-300">
                  {[unit.floor, unit.unit_label].filter(Boolean).join(' / ')}
                </p>
                {unit.area_m2 && (
                  <p className="text-[10px] text-slate-500 mt-0.5">{unit.area_m2} m²</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Personal data form ─────────────────────────────────────────── */}
        <div className="rounded-2xl border border-slate-800/60 bg-white/[0.03] p-5">
          <div className="mb-4 flex items-center gap-2">
            <UserRound size={15} className="text-brand-400" />
            <h2 className="text-sm font-black text-white">Személyes adatok</h2>
          </div>
          <form onSubmit={handleSave} className="space-y-4">
            {/* Name */}
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-slate-500">
                Teljes név
              </label>
              <input
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Pl. Kovács Anna"
                className="w-full rounded-xl border border-slate-700/60 bg-white/[0.05] px-4 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-brand-500/60 focus:bg-white/[0.08] transition-colors"
              />
            </div>

            {/* Email (read-only) */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                <Mail size={10} />E-mail cím
                <span className="ml-1 rounded px-1.5 py-0.5 text-[8px] bg-slate-700/50 text-slate-500 font-normal normal-case tracking-normal">Csak olvasható</span>
              </label>
              <input
                readOnly
                value={email}
                className="w-full rounded-xl border border-slate-800/60 bg-white/[0.02] px-4 py-2.5 text-sm text-slate-500 outline-none cursor-not-allowed"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                <Phone size={10} />Telefonszám
              </label>
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+36 30 123 4567"
                type="tel"
                className="w-full rounded-xl border border-slate-700/60 bg-white/[0.05] px-4 py-2.5 text-sm text-white outline-none placeholder:text-slate-600 focus:border-brand-500/60 focus:bg-white/[0.08] transition-colors"
              />
            </div>

            {/* Save button */}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-brand-400 disabled:opacity-50"
              >
                {saving ? 'Mentés…' : 'Adatok mentése'}
              </button>
              {saved && (
                <span className="flex items-center gap-1.5 text-sm font-semibold text-emerald-400">
                  <CheckCircle2 size={14} />Mentve
                </span>
              )}
              {error && <span className="text-sm font-semibold text-rose-400">{error}</span>}
            </div>
          </form>
        </div>

        {/* ── Role & authorization ───────────────────────────────────────── */}
        <div className="rounded-2xl border border-slate-800/60 bg-white/[0.03] px-5 py-4">
          <div className="mb-3 flex items-center gap-2">
            <ShieldCheck size={15} className="text-slate-500" />
            <h2 className="text-sm font-black text-white">Szerepkör és jogosultság</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className={`rounded-lg border px-3 py-1.5 text-sm font-bold ${ROLE_COLOR[role] ?? 'bg-slate-700/30 text-slate-400 border-slate-700/50'}`}>
              {roleLabel}
            </span>
            <p className="text-xs text-slate-500">
              {role === 'kozos_kepviselo' || role === 'megbizott'
                ? 'Teljes körű kezelői hozzáférés az épülethez.'
                : role === 'bizottsag'
                ? 'Audit napló és riportok megtekintési jog.'
                : role === 'konyvelo'
                ? 'Pénzügyi modulok és számlázási funkciók elérése.'
                : 'Saját albetéthez kapcsolódó funkciók és bejelentések.'}
            </p>
          </div>
          <p className="mt-3 text-[10px] text-slate-600">
            A szerepkör módosításához lépj kapcsolatba a közös képviselővel.
          </p>
        </div>

        {/* ── Account actions ─────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-slate-800/60 bg-white/[0.03] px-5 py-4">
          <h2 className="mb-3 text-sm font-black text-white">Fiók</h2>
          <div className="space-y-2">
            <Link
              href="/app"
              className="flex items-center justify-between rounded-xl border border-slate-800/50 bg-white/[0.03] px-4 py-3 text-sm text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-slate-200"
            >
              <span>Épület váltása</span>
              <span className="text-slate-600">→</span>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
