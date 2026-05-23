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
      <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3.5 shadow-sm">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-red-800">
            Fizetési probléma — Az előfizetés megújítása sikertelen. Frissítse bankkártyaadatait.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={`/billing?building=${buildingId}`}
            className="rounded-xl bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 transition-colors"
          >
            Előfizetés kezelése
          </Link>
          <button
            onClick={handleDismiss}
            aria-label="Bezárás"
            className="rounded-lg p-1 text-red-400 hover:bg-red-100 hover:text-red-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  if (variant === 'trial_ending') {
    return (
      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 shadow-sm">
        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-amber-800">
            A próbaidőszak {daysLeft <= 0 ? 'ma' : `${daysLeft} nap múlva`} lejár. Válasszon csomagot a folytatáshoz.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={`/billing?building=${buildingId}`}
            className="rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 transition-colors"
          >
            Csomag kiválasztása
          </Link>
          <button
            onClick={handleDismiss}
            aria-label="Bezárás"
            className="rounded-lg p-1 text-amber-400 hover:bg-amber-100 hover:text-amber-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  // cancelled
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-300 bg-slate-100 px-4 py-3.5 shadow-sm">
      <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-700">
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
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
