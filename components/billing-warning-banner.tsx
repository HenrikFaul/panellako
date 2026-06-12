'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Clock, XCircle, X } from 'lucide-react';

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'cancelled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'unpaid'
  | null
  | undefined;

interface BillingWarningBannerProps {
  buildingId: string;
  subscriptionStatus: SubscriptionStatus;
  trialEnd: string | null | undefined;
  isManager: boolean;
}

function getDaysUntil(dateStr: string): number {
  const now = new Date();
  const end = new Date(dateStr);
  const ms = end.getTime() - now.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export default function BillingWarningBanner({
  buildingId,
  subscriptionStatus,
  trialEnd,
  isManager,
}: BillingWarningBannerProps) {
  const storageKey = `billing-banner-dismissed-${buildingId}`;
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid hydration flicker

  useEffect(() => {
    const saved = sessionStorage.getItem(storageKey);
    if (!saved) setDismissed(false);
  }, [storageKey]);

  if (!isManager) return null;

  const handleDismiss = () => {
    sessionStorage.setItem(storageKey, '1');
    setDismissed(true);
  };

  // Determine which variant to show, if any
  type BannerVariant = 'past_due' | 'trial_ending' | 'cancelled' | null;
  let variant: BannerVariant = null;
  let daysLeft = 0;

  if (subscriptionStatus === 'past_due' || subscriptionStatus === 'unpaid') {
    variant = 'past_due';
  } else if (subscriptionStatus === 'cancelled' || subscriptionStatus === 'incomplete_expired') {
    variant = 'cancelled';
  } else if (subscriptionStatus === 'trialing' && trialEnd) {
    daysLeft = getDaysUntil(trialEnd);
    if (daysLeft <= 3) {
      variant = 'trial_ending';
    }
  }

  if (variant === null || dismissed) return null;

  if (variant === 'past_due') {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-rose-500/20 bg-rose-500/[0.07] px-4 py-3.5">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-rose-300">
            Fizetési probléma — Az előfizetés megújítása sikertelen. Frissítse bankkártyaadatait.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={`/billing?building=${buildingId}`}
            className="rounded-lg bg-rose-500/15 px-3 py-1.5 text-xs font-semibold text-rose-300 ring-1 ring-rose-500/30 hover:bg-rose-500/25 transition-colors"
          >
            Előfizetés kezelése
          </Link>
          <button
            onClick={handleDismiss}
            aria-label="Bezárás"
            className="rounded-lg p-1 text-rose-500 hover:bg-white/[0.06] hover:text-rose-300 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  if (variant === 'trial_ending') {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.07] px-4 py-3.5">
        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-amber-300">
            A próbaidőszak {daysLeft <= 0 ? 'ma' : `${daysLeft} nap múlva`} lejár. Válasszon csomagot a folytatáshoz.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={`/billing?building=${buildingId}`}
            className="rounded-lg bg-amber-500/15 px-3 py-1.5 text-xs font-semibold text-amber-300 ring-1 ring-amber-500/30 hover:bg-amber-500/25 transition-colors"
          >
            Csomag kiválasztása
          </Link>
          <button
            onClick={handleDismiss}
            aria-label="Bezárás"
            className="rounded-lg p-1 text-amber-500 hover:bg-white/[0.06] hover:text-amber-300 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // cancelled
  return (
    <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5">
      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-300">
          Az előfizetés lejárt. A funkciók korlátozottak.
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Link
          href={`/billing?building=${buildingId}`}
          className="rounded-xl bg-slate-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800 transition-colors"
        >
          Előfizetés megújítása
        </Link>
        <button
          onClick={handleDismiss}
          aria-label="Bezárás"
          className="rounded-lg p-1 text-slate-500 hover:bg-white/[0.08] hover:text-slate-300 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
