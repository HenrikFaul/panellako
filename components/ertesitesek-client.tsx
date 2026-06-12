'use client';

import { useState } from 'react';
import { BellRing, Send, CheckCircle2, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

interface Props {
  buildingId: string;
  buildingName: string;
}

type TargetRole = 'all' | 'lako' | 'manager';

interface SendResult {
  sent: number;
  failed: number;
}

const TARGET_ROLE_LABELS: Record<TargetRole, string> = {
  all: 'Mindenki (lakók + kezelők)',
  lako: 'Csak lakók',
  manager: 'Csak kezelők',
};

export default function ErtesitesekClient({ buildingId, buildingName }: Props) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('');
  const [targetRole, setTargetRole] = useState<TargetRole>('all');
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<SendResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;

    setStatus('sending');
    setResult(null);
    setErrorMsg('');

    try {
      const res = await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buildingId,
          title: title.trim(),
          body: body.trim(),
          url: url.trim() || undefined,
          targetRole,
        }),
      });

      const data = await res.json() as SendResult & { error?: string };

      if (!res.ok) {
        setStatus('error');
        setErrorMsg(data.error ?? `Szerverhiba: ${res.status}`);
        return;
      }

      setResult({ sent: data.sent, failed: data.failed });
      setStatus('success');
      setTitle('');
      setBody('');
      setUrl('');
      setTargetRole('all');
    } catch (err) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Ismeretlen hiba');
    }
  };

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-2xl">
        {/* Back link */}
        <Link
          href={`/w/${buildingId}`}
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-slate-200"
        >
          <ChevronLeft size={15} />
          Vissza a dashboardra
        </Link>

        {/* Header */}
        <div className="mb-8">
          <p className="mb-1 text-sm text-slate-500">{buildingName}</p>
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-500/10 text-brand-300 ring-1 ring-brand-500/25">
              <BellRing size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-100">Push értesítések</h1>
              <p className="mt-0.5 text-sm text-slate-400">
                Küldjön azonnali értesítést a társasház tagjainak
              </p>
            </div>
          </div>
        </div>

        {/* Form card */}
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Title */}
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500" htmlFor="push-title">
                Cím <span className="text-rose-400">*</span>
              </label>
              <input
                id="push-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                required
                className="input-base"
                placeholder="pl. Vízelzárás holnap reggel"
              />
            </div>

            {/* Body */}
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500" htmlFor="push-body">
                Üzenet <span className="text-rose-400">*</span>
              </label>
              <textarea
                id="push-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={300}
                required
                rows={4}
                className="input-base"
                placeholder="A részletes értesítés szövege…"
              />
              <p className="mt-1 text-right text-xs tabular-nums text-slate-500">{body.length}/300</p>
            </div>

            {/* URL (optional) */}
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500" htmlFor="push-url">
                Hivatkozás URL{' '}
                <span className="text-[10px] font-normal normal-case tracking-normal text-slate-500">(opcionális — pl. /dokumentumok)</span>
              </label>
              <input
                id="push-url"
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="input-base"
                placeholder={`/w/${buildingId}`}
              />
            </div>

            {/* Target role */}
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-slate-500" htmlFor="push-target">
                Cél
              </label>
              <select
                id="push-target"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value as TargetRole)}
                className="input-base"
              >
                {(Object.entries(TARGET_ROLE_LABELS) as [TargetRole, string][]).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={status === 'sending' || !title.trim() || !body.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-[0.625rem] bg-brand-500 px-4 py-2.5 text-sm font-semibold text-ink-base transition-colors hover:bg-brand-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send size={15} />
              {status === 'sending' ? 'Küldés…' : 'Értesítés küldése'}
            </button>
          </form>

          {/* Result messages */}
          {status === 'success' && result && (
            <div className="mt-5 flex items-start gap-3 rounded-xl bg-emerald-500/10 p-4 ring-1 ring-emerald-500/25">
              <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-400" />
              <div>
                <p className="text-sm font-semibold text-emerald-300">Sikeresen elküldve!</p>
                <p className="mt-0.5 text-sm text-emerald-300/70">
                  {result.sent} értesítés elküldve
                  {result.failed > 0 && (
                    <span className="text-amber-300">
                      {' '}· {result.failed} sikertelen (lejárt feliratkozás)
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="mt-5 flex items-start gap-3 rounded-xl bg-rose-500/10 p-4 ring-1 ring-rose-500/25">
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-rose-400" />
              <div>
                <p className="text-sm font-semibold text-rose-300">Küldési hiba</p>
                <p className="mt-0.5 text-sm text-rose-300/70">{errorMsg}</p>
              </div>
            </div>
          )}
        </div>

        {/* Info box */}
        <div className="mt-6 rounded-xl border border-white/[0.06] bg-white/[0.03] p-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Tudnivalók</p>
          <ul className="space-y-1.5 text-xs text-slate-500">
            <li>• Az értesítés csak azoknak kerül kézbesítésre, akik engedélyezték a push értesítéseket.</li>
            <li>• A lejárt feliratkozások automatikusan törlésre kerülnek.</li>
            <li>• Az üzenet azonnal megjelenik az eszközökön, nem e-mail.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
