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
  hasPermanentAccess: boolean;
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
  hasPermanentAccess,
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
    <div className="app-surface min-h-screen px-4 py-10 sm:py-12" style={{ backgroundImage: 'none' }}>
      <div className="mx-auto max-w-5xl">

        {/* Back link */}
        {buildingId && (
          <Link
            href={`/w/${buildingId}`}
            className="mb-6 inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-canvas-muted transition-colors hover:text-brand-800"
          >
            <Layers3 size={14} />
            Vissza az épület dashboardra
          </Link>
        )}

        {/* Header */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-canvas-sage text-brand-800 ring-1 ring-brand-200">
            <CreditCard size={24} />
          </div>
          <h1 className="text-3xl font-semibold text-canvas-ink">Előfizetési csomagok</h1>
          <p className="mt-2 text-canvas-muted">
            14 napos ingyenes próbaidőszak · Kártyaadatok nem szükségesek a próbához
          </p>
        </div>

        {successFromCheckout && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
            <CheckCircle2 size={20} className="shrink-0" />
            <div>
              <p className="font-semibold">Sikeres előfizetés!</p>
              <p className="text-sm">Az előfizetés aktiválva. Köszönjük, hogy a PanelLakót választotta!</p>
            </div>
          </div>
        )}

        {cancelledFromCheckout && (
          <div className="mb-6 flex items-center gap-3 rounded-2xl border border-amber-200 bg-canvas-warm p-4 text-amber-900">
            <AlertTriangle size={20} className="shrink-0" />
            <p className="text-sm font-semibold">A fizetési folyamat megszakadt. Bármikor folytathatja.</p>
          </div>
        )}

        {building && (
          <div className="mb-6 rounded-2xl border border-canvas-line bg-white p-4 shadow-card">
            <div className="flex items-center gap-3">
              <Building2 size={18} className="text-brand-800" />
              <div>
                <p className="font-semibold text-canvas-ink">{building.name}</p>
                <p className="text-sm text-canvas-muted">{building.address} · {unitCount} albetét</p>
              </div>
            </div>
          </div>
        )}

        {subscription && (
          <div className={`mb-6 rounded-2xl p-4 border ${
            hasPermanentAccess ? 'border-emerald-200 bg-emerald-50' :
            isActive   ? 'border-emerald-200 bg-emerald-50' :
            isTrialing ? 'border-sky-200 bg-sky-50' :
            isPastDue  ? 'border-rose-200 bg-rose-50' :
            'border-canvas-line bg-white'
          }`}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="font-semibold text-canvas-ink">
                  {hasPermanentAccess && '✓ Demo hozzáférés — lejárat nélkül'}
                  {!hasPermanentAccess && isActive    && '✓ Aktív előfizetés'}
                  {!hasPermanentAccess && isTrialing  && `Próbaidőszak — ${trialDaysRemaining} nap hátra`}
                  {!hasPermanentAccess && isPastDue   && 'Fizetés sikertelen'}
                  {!hasPermanentAccess && subscription.status === 'cancelled' && 'Előfizetés lemondva'}
                </p>
                <p className="text-sm text-canvas-muted">
                  Csomag: {subscription.plan.toUpperCase()}
                  {!hasPermanentAccess && subscription.current_period_end && ` · Következő számlázás: ${formatDate(subscription.current_period_end)}`}
                </p>
              </div>
              {(isActive || isTrialing) && (
                <button
                  onClick={handleManageBilling}
                  disabled={loading === 'portal'}
                  className="flex min-h-11 items-center gap-1.5 rounded-xl border border-canvas-line bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-brand-200 hover:bg-canvas-sage hover:text-brand-900 disabled:opacity-50"
                >
                  <ExternalLink size={14} />
                  {loading === 'portal' ? 'Betöltés...' : 'Számlázás kezelése'}
                </button>
              )}
            </div>

            {!hasPermanentAccess && isTrialing && trialDaysRemaining <= 3 && (
              <div className="mt-3 rounded-xl bg-canvas-warm p-3 text-sm text-amber-900 ring-1 ring-amber-200">
                <strong>Figyelem:</strong> A próbaidőszak {trialDaysRemaining} napon belül lejár.
                Aktiválja az előfizetést a folyamatos hozzáférés biztosításához.
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mb-6 flex items-start gap-2 rounded-2xl border border-rose-200 bg-canvas-coral p-4 text-sm font-semibold text-rose-800">
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
                    ? 'border-brand-300 bg-canvas-sage shadow-card-md'
                    : 'border-canvas-line bg-white shadow-card'
                }`}
              >
                {plan.badge && (
                  <span className="absolute -top-3 left-6 rounded-full bg-brand-700 px-3 py-1 text-xs font-semibold text-white ring-4 ring-canvas-base">
                    {plan.badge}
                  </span>
                )}

                <div className="mb-4">
                  <p className="text-lg font-semibold text-canvas-ink">{plan.name}</p>
                  <p className="mt-1 text-sm text-canvas-muted">{plan.description}</p>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-semibold tabular-nums text-canvas-ink">{plan.currency}{plan.pricePerUnit.toFixed(2)}</span>
                    <span className="text-sm text-canvas-muted">{plan.period}</span>
                  </div>
                  {unitCount > 0 && (
                    <p className="mt-1 text-sm font-semibold tabular-nums text-brand-800">
                      = {plan.currency}{monthlyTotal}/hó ({unitCount} albetét)
                    </p>
                  )}
                </div>

                <ul className="mb-6 space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-slate-700">
                      <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-700" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {isCurrentPlan ? (
                  <div className="rounded-xl bg-emerald-50 px-4 py-3 text-center text-sm font-semibold text-emerald-800 ring-1 ring-emerald-200">
                    Jelenlegi csomag
                  </div>
                ) : (
                  <button
                    onClick={() => handleSubscribe(plan.key)}
                    disabled={loading !== null}
                    className={`flex min-h-11 w-full items-center justify-center gap-2 rounded-[0.625rem] py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                      plan.highlight
                        ? 'bg-brand-700 text-white hover:bg-brand-800'
                        : 'border border-canvas-line bg-white text-slate-700 shadow-sm hover:border-brand-200 hover:bg-canvas-sage hover:text-brand-900'
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
        <div className="mt-10 grid grid-cols-1 gap-4 text-center text-sm text-canvas-muted sm:grid-cols-3">
          <div>
            <p className="font-semibold text-slate-700">Biztonságos fizetés</p>
            <p>Stripe. Adatait titkosítva kezeljük.</p>
          </div>
          <div>
            <p className="font-semibold text-slate-700">Bármikor lemondható</p>
            <p>Nincs hosszú távú kötelezettség.</p>
          </div>
          <div>
            <p className="font-semibold text-slate-700">GDPR-megfelelő</p>
            <p>Adatkezelés az EU jogszabályai szerint.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
