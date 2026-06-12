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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#ccfbf1_0,#f8fafc_30%,#eef2ff_100%)] px-4 py-12">
      <div className="mx-auto max-w-5xl">

        {/* Back link */}
        {buildingId && (
          <Link
            href={`/w/${buildingId}`}
            className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800"
          >
            <Layers3 size={14} />
            Vissza az épület dashboardra
          </Link>
        )}

        {/* Header */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-teal-500 to-sky-500 text-white shadow-lg">
            <CreditCard size={24} />
          </div>
          <h1 className="text-3xl font-semibold text-slate-950">Előfizetési csomagok</h1>
          <p className="mt-2 text-slate-500">
            14 napos ingyenes próbaidőszak · Kártyaadatok nem szükségesek a próbához
          </p>
        </div>

        {successFromCheckout && (
          <div className="mb-6 flex items-center gap-3 rounded-3xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-700">
            <CheckCircle2 size={20} className="shrink-0" />
            <div>
              <p className="font-semibold">Sikeres előfizetés!</p>
              <p className="text-sm">Az előfizetés aktiválva. Köszönjük, hogy a PanelLakót választotta!</p>
            </div>
          </div>
        )}

        {cancelledFromCheckout && (
          <div className="mb-6 flex items-center gap-3 rounded-3xl bg-amber-50 border border-amber-200 p-4 text-amber-700">
            <AlertTriangle size={20} className="shrink-0" />
            <p className="text-sm font-semibold">A fizetési folyamat megszakadt. Bármikor folytathatja.</p>
          </div>
        )}

        {building && (
          <div className="mb-6 rounded-3xl border border-white/70 bg-white/90 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <Building2 size={18} className="text-teal-500" />
              <div>
                <p className="font-semibold text-slate-950">{building.name}</p>
                <p className="text-sm text-slate-500">{building.address} · {unitCount} albetét</p>
              </div>
            </div>
          </div>
        )}

        {subscription && (
          <div className={`mb-6 rounded-3xl p-4 border ${
            isActive   ? 'bg-emerald-50 border-emerald-200' :
            isTrialing ? 'bg-sky-50 border-sky-200' :
            isPastDue  ? 'bg-rose-50 border-rose-200' :
            'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="font-semibold">
                  {isActive    && '✓ Aktív előfizetés'}
                  {isTrialing  && `Próbaidőszak — ${trialDaysRemaining} nap hátra`}
                  {isPastDue   && '⚠ Fizetés sikertelen'}
                  {subscription.status === 'cancelled' && 'Előfizetés lemondva'}
                </p>
                <p className="text-sm text-slate-600">
                  Csomag: {subscription.plan.toUpperCase()}
                  {subscription.current_period_end && ` · Következő számlázás: ${formatDate(subscription.current_period_end)}`}
                </p>
              </div>
              {(isActive || isTrialing) && (
                <button
                  onClick={handleManageBilling}
                  disabled={loading === 'portal'}
                  className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  <ExternalLink size={14} />
                  {loading === 'portal' ? 'Betöltés...' : 'Számlázás kezelése'}
                </button>
              )}
            </div>

            {isTrialing && trialDaysRemaining <= 3 && (
              <div className="mt-3 rounded-2xl bg-amber-100 p-3 text-sm text-amber-800">
                <strong>Figyelem:</strong> A próbaidőszak {trialDaysRemaining} napon belül lejár.
                Aktiválja az előfizetést a folyamatos hozzáférés biztosításához.
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mb-6 flex items-start gap-2 rounded-3xl bg-rose-50 border border-rose-200 p-4 text-sm font-semibold text-rose-700">
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
                className={`relative rounded-[1.75rem] border p-6 ${
                  plan.highlight
                    ? 'border-teal-300 bg-gradient-to-br from-teal-50 to-white shadow-lg shadow-teal-100'
                    : 'border-white/70 bg-white/90 shadow-sm'
                }`}
              >
                {plan.badge && (
                  <span className="absolute -top-3 left-6 rounded-full bg-teal-500 px-3 py-1 text-xs font-semibold text-white shadow">
                    {plan.badge}
                  </span>
                )}

                <div className="mb-4">
                  <p className="text-lg font-semibold text-slate-950">{plan.name}</p>
                  <p className="mt-1 text-sm text-slate-500">{plan.description}</p>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-semibold text-slate-950">{plan.currency}{plan.pricePerUnit.toFixed(2)}</span>
                    <span className="text-sm text-slate-500">{plan.period}</span>
                  </div>
                  {unitCount > 0 && (
                    <p className="mt-1 text-sm font-bold text-teal-600">
                      = {plan.currency}{monthlyTotal}/hó ({unitCount} albetét)
                    </p>
                  )}
                </div>

                <ul className="mb-6 space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-slate-700">
                      <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-500" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {isCurrentPlan ? (
                  <div className="rounded-2xl bg-emerald-100 px-4 py-3 text-center text-sm font-semibold text-emerald-700">
                    Jelenlegi csomag
                  </div>
                ) : (
                  <button
                    onClick={() => handleSubscribe(plan.key)}
                    disabled={loading !== null}
                    className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                      plan.highlight
                        ? 'bg-teal-600 text-white hover:bg-teal-700 shadow-md shadow-teal-200'
                        : 'bg-slate-950 text-white hover:bg-slate-800'
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
            <p className="font-bold text-slate-700">Biztonságos fizetés</p>
            <p>Stripe. Adatait titkosítva kezeljük.</p>
          </div>
          <div>
            <p className="font-bold text-slate-700">Bármikor lemondható</p>
            <p>Nincs hosszú távú kötelezettség.</p>
          </div>
          <div>
            <p className="font-bold text-slate-700">GDPR-megfelelő</p>
            <p>Adatkezelés az EU jogszabályai szerint.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
