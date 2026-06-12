'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Building2, CheckCircle2, CreditCard, ExternalLink, Layers3, Zap } from 'lucide-react';

interface Subscription {
  plan: string;
  status: string;
  unit_count: number;
  current_period_end: string | null;
  trial_end: string | null;
  cancel_at_period_end: boolean;
}

interface Building {
  id: string;
  name: string;
  address: string;
}

interface BillingPageClientProps {
  subscription: Subscription | null;
  building: Building | null;
  unitCount: number;
  buildingId?: string;
  successFromCheckout: boolean;
  cancelledFromCheckout: boolean;
}

const PLANS = [
  {
    key: 'alap' as const,
    name: 'PanelLakó Alap',
    pricePerUnit: 1.50,
    currency: '€',
    period: '/albetét/hó',
    description: 'Tökéletes önszervező társasházaknak közös képviselővel',
    features: [
      'Digitális hibabejelentés (korlátlan)',
      'Dokumentumtár + visszaigazolás',
      'Mérőóra-diktálás',
      'Értesítések (app + push)',
      'Közgyűlési naptár',
      'Ház Radar műszerfal',
      'Alapszintű pénzügyi átláthatóság'
    ],
    highlight: false,
    badge: null
  },
  {
    key: 'pro' as const,
    name: 'PanelLakó Pro',
    pricePerUnit: 3.00,
    currency: '€',
    period: '/albetét/hó',
    description: 'Professzionális megbízott cégeknek, több épület kezeléséhez',
    features: [
      'Minden Alap funkció',
      'Korlátlan dokumentumfeltöltés (50 MB/fájl)',
      'Könyvelő hozzáférés',
      'AI hibabejelentés-triázs',
      'E-mail értesítések lakóknak',
      'Pénzügyi hátralék-riport',
      'Közgyűlési protokoll generator',
      'Szállítói adatbázis',
      'Prioritásos ügyfélszolgálat'
    ],
    highlight: true,
    badge: 'Ajánlott'
  }
];

export default function BillingPageClient({
  subscription,
  building,
  unitCount,
  buildingId,
  successFromCheckout,
  cancelledFromCheckout
}: BillingPageClientProps) {
  const [loading, setLoading] = useState<'alap' | 'pro' | 'portal' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async (plan: 'alap' | 'pro') => {
    if (!buildingId) {
      setError('Kérjük, válasszon épületet a folytatáshoz.');
      return;
    }
    setLoading(plan);
    setError(null);

    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, buildingId })
      });
      const data = await response.json();
      if (!response.ok || !data.url) {
        setError(data.error ?? 'Checkout hiba. Kérjük, próbálja újra.');
        return;
      }
      window.location.href = data.url;
    } catch {
      setError('Hálózati hiba. Kérjük, ellenőrizze az internetkapcsolatát.');
    } finally {
      setLoading(null);
    }
  };

  const handleManageBilling = async () => {
    if (!buildingId) return;
    setLoading('portal');
    setError(null);

    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buildingId })
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error ?? 'Nem sikerült megnyitni a számlázási portált.');
      }
    } catch {
      setError('Hálózati hiba.');
    } finally {
      setLoading(null);
    }
  };

  const isActive   = subscription?.status === 'active';
  const isTrialing = subscription?.status === 'trialing';
  const isPastDue  = subscription?.status === 'past_due';

  const trialDaysRemaining = subscription?.trial_end
    ? Math.max(0, Math.ceil((new Date(subscription.trial_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 14;

  const formatDate = (iso: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <div className="app-surface min-h-screen px-4 py-12">
      <div className="mx-auto max-w-5xl">

        {/* Back link */}
        {buildingId && (
          <Link
            href={`/w/${buildingId}`}
            className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-slate-200"
          >
            <Layers3 size={14} />
            Vissza az épület dashboardra
          </Link>
        )}

        {/* Header */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand-500/10 text-brand-300 ring-1 ring-brand-500/25">
            <CreditCard size={24} />
          </div>
          <h1 className="text-3xl font-semibold text-slate-100">Előfizetési csomagok</h1>
          <p className="mt-2 text-slate-400">
            14 napos ingyenes próbaidőszak · Kártyaadatok nem szükségesek a próbához
          </p>
        </div>

        {successFromCheckout && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 p-4 text-emerald-300">
            <CheckCircle2 size={20} className="shrink-0" />
            <div>
              <p className="font-semibold">Sikeres előfizetés!</p>
              <p className="text-sm">Az előfizetés aktiválva. Köszönjük, hogy a PanelLakót választotta!</p>
            </div>
          </div>
        )}

        {cancelledFromCheckout && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 p-4 text-amber-300">
            <AlertTriangle size={20} className="shrink-0" />
            <p className="text-sm font-semibold">A fizetési folyamat megszakadt. Bármikor folytathatja.</p>
          </div>
        )}

        {building && (
          <div className="mb-6 rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4">
            <div className="flex items-center gap-3">
              <Building2 size={18} className="text-brand-300" />
              <div>
                <p className="font-semibold text-slate-100">{building.name}</p>
                <p className="text-sm text-slate-400">{building.address} · {unitCount} albetét</p>
              </div>
            </div>
          </div>
        )}

        {subscription && (
          <div className={`mb-6 rounded-2xl p-4 border ${
            isActive   ? 'bg-emerald-500/10 border-emerald-500/25' :
            isTrialing ? 'bg-sky-500/10 border-sky-500/25' :
            isPastDue  ? 'bg-rose-500/10 border-rose-500/25' :
            'bg-white/[0.04] border-white/10'
          }`}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="font-semibold text-slate-100">
                  {isActive    && '✓ Aktív előfizetés'}
                  {isTrialing  && `Próbaidőszak — ${trialDaysRemaining} nap hátra`}
                  {isPastDue   && 'Fizetés sikertelen'}
                  {subscription.status === 'cancelled' && 'Előfizetés lemondva'}
                </p>
                <p className="text-sm text-slate-400">
                  Csomag: {subscription.plan.toUpperCase()}
                  {subscription.current_period_end && ` · Következő számlázás: ${formatDate(subscription.current_period_end)}`}
                </p>
              </div>
              {(isActive || isTrialing) && (
                <button
                  onClick={handleManageBilling}
                  disabled={loading === 'portal'}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-white/[0.08] disabled:opacity-50"
                >
                  <ExternalLink size={14} />
                  {loading === 'portal' ? 'Betöltés...' : 'Számlázás kezelése'}
                </button>
              )}
            </div>

            {isTrialing && trialDaysRemaining <= 3 && (
              <div className="mt-3 rounded-xl bg-amber-500/10 ring-1 ring-amber-500/25 p-3 text-sm text-amber-300">
                <strong>Figyelem:</strong> A próbaidőszak {trialDaysRemaining} napon belül lejár.
                Aktiválja az előfizetést a folyamatos hozzáférés biztosításához.
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mb-6 flex items-start gap-2 rounded-2xl bg-rose-500/10 border border-rose-500/25 p-4 text-sm font-semibold text-rose-300">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Pricing cards */}
        <div className="grid gap-6 md:grid-cols-2">
          {PLANS.map((plan) => {
            const monthlyTotal = (plan.pricePerUnit * unitCount).toFixed(2);
            const isCurrentPlan = subscription?.plan === plan.key && (isActive || isTrialing);

            return (
              <div
                key={plan.key}
                className={`relative rounded-2xl border p-6 ${
                  plan.highlight
                    ? 'border-brand-500/40 bg-brand-500/[0.06]'
                    : 'border-white/[0.08] bg-white/[0.04]'
                }`}
              >
                {plan.badge && (
                  <span className="absolute -top-3 left-6 rounded-full bg-brand-500/10 px-3 py-1 text-xs font-semibold text-brand-300 ring-1 ring-brand-500/25 backdrop-blur">
                    {plan.badge}
                  </span>
                )}

                <div className="mb-4">
                  <p className="text-lg font-semibold text-slate-100">{plan.name}</p>
                  <p className="mt-1 text-sm text-slate-400">{plan.description}</p>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-semibold tabular-nums text-slate-100">{plan.currency}{plan.pricePerUnit.toFixed(2)}</span>
                    <span className="text-sm text-slate-400">{plan.period}</span>
                  </div>
                  {unitCount > 0 && (
                    <p className="mt-1 text-sm font-semibold tabular-nums text-brand-300">
                      = {plan.currency}{monthlyTotal}/hó ({unitCount} albetét)
                    </p>
                  )}
                </div>

                <ul className="mb-6 space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-slate-300">
                      <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-400" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {isCurrentPlan ? (
                  <div className="rounded-xl bg-emerald-500/10 px-4 py-3 text-center text-sm font-semibold text-emerald-300 ring-1 ring-emerald-500/25">
                    Jelenlegi csomag
                  </div>
                ) : (
                  <button
                    onClick={() => handleSubscribe(plan.key)}
                    disabled={loading !== null}
                    className={`flex w-full items-center justify-center gap-2 rounded-[0.625rem] py-3 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                      plan.highlight
                        ? 'bg-brand-500 text-ink-base hover:bg-brand-400'
                        : 'border border-white/10 bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]'
                    }`}
                  >
                    <Zap size={14} />
                    {loading === plan.key
                      ? 'Átirányítás...'
                      : subscription
                        ? 'Váltás erre a csomagra'
                        : '14 napos próba indítása'
                    }
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Trust signals */}
        <div className="mt-10 grid grid-cols-3 gap-4 text-center text-sm text-slate-500">
          <div>
            <p className="font-semibold text-slate-300">Biztonságos fizetés</p>
            <p>Stripe. Adatait titkosítva kezeljük.</p>
          </div>
          <div>
            <p className="font-semibold text-slate-300">Bármikor lemondható</p>
            <p>Nincs hosszú távú kötelezettség.</p>
          </div>
          <div>
            <p className="font-semibold text-slate-300">GDPR-megfelelő</p>
            <p>Adatkezelés az EU jogszabályai szerint.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
