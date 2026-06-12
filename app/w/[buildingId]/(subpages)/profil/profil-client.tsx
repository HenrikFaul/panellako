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
  lako:             'bg-sky-500/10 text-sky-300 ring-1 ring-sky-500/25',
  tulajdonos:       'bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/25',
  kozos_kepviselo:  'bg-violet-500/10 text-violet-300 ring-1 ring-violet-500/25',
  megbizott:        'bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/25',
  bizottsag:        'bg-rose-500/10 text-rose-300 ring-1 ring-rose-500/25',
  konyvelo:         'bg-brand-500/10 text-brand-300 ring-1 ring-brand-500/25',
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
    <div className="min-h-screen text-slate-200">
      {/* ── Top bar ────────────────────────────────────────────────────── */}
      <div className="border-b border-white/[0.06] px-6 py-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/w/${buildingId}`}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-500 transition-colors hover:bg-white/[0.05] hover:text-slate-300"
          >
            <ArrowLeft size={13} />
            Vissza a dashboardra
          </Link>
          <span className="text-slate-600">·</span>
          <p className="text-[11px] text-slate-500 truncate">{buildingName}</p>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 ring-1 ring-brand-500/25">
            <UserCog size={18} className="text-brand-300" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Lakói profil</p>
            <h1 className="text-xl font-semibold text-slate-100 leading-tight">
              {name || 'Névtelen'}
            </h1>
          </div>
          <span className={`ml-auto shrink-0 rounded-lg px-2.5 py-1 text-[10px] font-semibold ${ROLE_COLOR[role] ?? 'bg-white/[0.06] text-slate-400 ring-1 ring-white/10'}`}>
            {roleLabel}
          </span>
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-6 p-4 md:p-6">

        {/* ── Building context ───────────────────────────────────────────── */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Épület</p>
          <div className="flex items-center gap-2">
            <Building2 size={14} className="shrink-0 text-slate-500" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-100 truncate">{buildingName}</p>
              <p className="text-[11px] text-slate-500 truncate">{buildingAddress}</p>
            </div>
          </div>
          {unit && (
            <div className="mt-2 border-t border-white/[0.06] pt-2 flex items-center gap-2">
              <Home size={13} className="shrink-0 text-slate-500" />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Regisztrált albetét</p>
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
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5">
          <div className="mb-4 flex items-center gap-2">
            <UserRound size={15} className="text-brand-300" />
            <h2 className="text-sm font-semibold text-slate-100">Személyes adatok</h2>
          </div>
          <form onSubmit={handleSave} className="space-y-4">
            {/* Name */}
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Teljes név
              </label>
              <input
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Pl. Kovács Anna"
                className="input-base"
              />
            </div>

            {/* Email (read-only) */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <Mail size={10} />E-mail cím
                <span className="ml-1 rounded bg-white/[0.06] px-1.5 py-0.5 text-[8px] font-normal normal-case tracking-normal text-slate-500">Csak olvasható</span>
              </label>
              <input
                readOnly
                value={email}
                className="input-base cursor-not-allowed opacity-60"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <Phone size={10} />Telefonszám
              </label>
              <input
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+36 30 123 4567"
                type="tel"
                className="input-base"
              />
            </div>

            {/* Save button */}
            <div className="flex items-center gap-3 pt-1">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 rounded-[0.625rem] bg-brand-500 px-4 py-2.5 text-sm font-semibold text-ink-base transition-colors hover:bg-brand-400 disabled:opacity-50"
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
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] px-5 py-4">
          <div className="mb-3 flex items-center gap-2">
            <ShieldCheck size={15} className="text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-100">Szerepkör és jogosultság</h2>
          </div>
          <div className="flex items-center gap-3">
            <span className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${ROLE_COLOR[role] ?? 'bg-white/[0.06] text-slate-400 ring-1 ring-white/10'}`}>
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
          <p className="mt-3 text-xs text-slate-500">
            A szerepkör módosításához lépj kapcsolatba a közös képviselővel.
          </p>
        </div>

        {/* ── Account actions ─────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] px-5 py-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-100">Fiók</h2>
          <div className="space-y-2">
            <Link
              href="/app"
              className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-sm text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-slate-200"
            >
              <span>Épület váltása</span>
              <span className="text-slate-500">→</span>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
