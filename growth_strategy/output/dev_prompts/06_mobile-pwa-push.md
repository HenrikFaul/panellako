# Dev Prompt #06 — Mobile PWA + Push Notifications (Resident Engagement Engine)

**Initiative:** Mobile PWA + Push Notifications
**Estimated value unlock:** +€180k–€420k ARR
**Target release:** v4.1.0
**Effort estimate:** 2–3 engineering days
**Risk level:** Medium (new infrastructure: VAPID keys, Edge Function, service worker)
**Prerequisite for:** Resident engagement metrics, WhatsApp-group replacement pitch, push-based reminders for meter readings and fee collection

---

## 1. Business Case

### 1.1 The WhatsApp group problem in Hungarian residential buildings

Every Hungarian társasház (residential building) runs a WhatsApp group. It is the de-facto communication channel between the közös képviselő (building representative), owners, and residents. The group serves announcements, maintenance notices, meter reading reminders, plumbing emergency alerts, and community votes. There are approximately 93,000 társasház buildings in Hungary. Each one has a WhatsApp group. That is 93,000 WhatsApp groups that produce no structured data, no audit trail, no notification history, and no integration with any management system. Every message sent in a WhatsApp group is permanently lost to the management company the moment it scrolls off the screen. PanelLakó's push notification system is a direct replacement for the WhatsApp group — not by blocking WhatsApp, but by making the PanelLakó channel demonstrably more useful: notifications arrive on the home screen, link directly into the relevant dashboard section, and are stored permanently in the audit log.

### 1.2 Push notification engagement statistics in the CEE market

Push notification open rates for PropTech and utility-adjacent applications in Central and Eastern Europe average 15–25% for opted-in users (source: Airship 2024 CEE Mobile Engagement Report; One Signal 2025 Push Notification Benchmark). This compares favorably to email open rates in the same segment of 18–22% — but crucially, push notifications achieve that open rate within 90 seconds of delivery, versus email open times that cluster at 4–6 hours after delivery. For urgent building communications — a water main burst, an elevator shutdown, a fire alarm test scheduled for 7 AM tomorrow — the 90-second delivery time is not a nice-to-have; it is the entire value proposition. Building residents who receive a critical alert via PanelLakó push while they receive nothing from the WhatsApp group (because the közös képviselő forgot to post) will demand that the building use PanelLakó as its primary communication channel. That demand creates lock-in at the resident level, not just at the manager level.

### 1.3 Daily vs monthly engagement: the retention multiplier

The current PanelLakó product is a monthly-engagement tool. A resident logs in when they receive a fee notice, when they have a maintenance request, or when a general assembly is scheduled. That is perhaps 3–5 logins per month. A product with push notifications becomes a daily-engagement tool. A resident who receives "Mérőóra leolvasási határidő: még 3 nap" (meter reading deadline: 3 days) opens the app, submits the reading, and logs out — a 45-second interaction that happens 12 times per year per metric per unit. With 20 units in a building and 3 meter types, that is 720 push-triggered sessions per year from meter readings alone. Add announcement notifications, ticket status updates, and meeting reminders, and the average building generates 2,000+ push-triggered sessions per year. Each session reinforces the habit of opening PanelLakó, increases the perceived indispensability of the product, and reduces the probability of the building switching to a competitor.

### 1.4 Revenue impact: premium tier justification and upsell

The push notification feature is a natural premium-tier differentiator. A "Resident" tier (free) can include in-app notifications only. A "Pro" tier (€29/building/month) includes push to all opted-in residents. An "ügynökség" tier (€49/building/month) includes push plus the analytics dashboard showing delivery rates, open rates, and engagement per announcement. The push infrastructure is a one-time investment that generates per-building subscription revenue in perpetuity. Based on comparable CEE PropTech conversions: if 30% of free-tier buildings convert to Pro specifically because of push notifications at €29/month average, and PanelLakó reaches 600 buildings in year 2, that is 180 buildings × €29 = €5,220/month = €62,640/year attributable to this single feature. At a 10× revenue multiple, that is €626,400 of enterprise value from a 2–3 day development investment.

---

## 2. Current State Analysis

### 2.1 What exists today

The current PanelLakó codebase is a responsive web application with no native mobile capabilities:

- **No `manifest.json`** — the app cannot be installed as a PWA on Android or iOS.
- **No service worker** — no offline capability, no background sync, no push subscription management.
- **No `push_subscriptions` table** — nowhere to store Web Push subscription objects.
- **No VAPID keys** — Web Push authentication infrastructure is absent.
- **No Supabase Edge Function** — push sending logic does not exist.
- **No `next-pwa` package** — `package.json` does not include it.
- **Notifications exist as in-app only** — the `notifications` table stores records, but they are only visible when the user has the app open.

The `app/layout.tsx` meta tags include a `title` and `description` but no `<meta name="theme-color">`, no `<link rel="manifest">`, and no apple-touch-icon references.

### 2.2 What the schema already supports

The existing `notifications` table captures `title`, `message`, `audience`, `channel` (`app` or `email`), and `read_at`. The `building_id` column is present. The `announcements` table is the source of truth for building communications. The `tickets` table has `status` and `reporter_id`. All three are ready to trigger push notifications without schema changes beyond adding the `push_subscriptions` table.

### 2.3 Technical constraints

- **iOS 16.4 minimum** — Web Push on Safari requires iOS 16.4 or later. Earlier iOS versions will see the "Enable notifications" button but the browser API will not be available. This must be handled gracefully: detect `'PushManager' in window` before attempting subscription.
- **HTTPS required** — Web Push and service workers only work on HTTPS. Local development must use the Next.js dev server on localhost (which browsers treat as a secure context). Production must use HTTPS (Vercel/Cloudflare/etc.).
- **PWA install prompt** — the install prompt (`BeforeInstallPromptEvent`) fires on Android Chrome but not on iOS Safari. iOS requires the user to manually use the "Add to Home Screen" share action. The UI must guide both paths.

---

## 3. Pre-conditions

Before starting implementation, verify all of the following:

1. Node.js 18+ and npm 9+ are installed.
2. The `web-push` npm package is available: `npm install web-push` and `npm install --save-dev @types/web-push`.
3. VAPID keys have been generated (instructions in Phase 3).
4. Environment variables are set in `.env.local` AND in the Vercel/hosting environment:
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY` — the base64-encoded public key
   - `VAPID_PRIVATE_KEY` — the base64-encoded private key (never expose to client)
   - `VAPID_SUBJECT` — `mailto:support@panellako.hu` or your mailto/URL
5. Supabase Edge Functions are enabled on the project (check Supabase Dashboard → Edge Functions).
6. `supabase/functions/` directory exists or will be created.
7. The Deno runtime is installed locally for Edge Function testing: `deno --version` (install from `deno.land` if absent).
8. `next-pwa` is installed: `npm install next-pwa` and `npm install --save-dev @types/next-pwa`.
9. A favicon.svg exists at `app/icon.svg` (already present per repo structure).
10. Run `git fetch origin main && git rebase origin/main` before writing any code.
11. Run `npm run build` on current main to confirm zero TypeScript errors before starting.

---

## 4. Phase 1 — Database: `push_subscriptions` Table

### 4.1 Migration SQL

Create `supabase/migrations/20260515_push_subscriptions.sql`:

```sql
-- Migration: 20260515_push_subscriptions.sql
-- Purpose: Store Web Push subscription objects for each opted-in user/building pair.
-- A user may have multiple subscriptions (phone, tablet, desktop) per building.

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id           uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id   uuid         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  building_id  uuid         NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  endpoint     text         NOT NULL,
  p256dh       text         NOT NULL,   -- encryption key (base64url)
  auth         text         NOT NULL,   -- auth secret (base64url)
  user_agent   text,
  created_at   timestamptz  NOT NULL DEFAULT now(),
  updated_at   timestamptz  NOT NULL DEFAULT now(),

  -- One endpoint can only belong to one profile/building pair.
  -- A user on a new device gets a new endpoint; same device replaces via upsert.
  UNIQUE (profile_id, building_id, endpoint)
);

-- Index for fast lookup by building (used by Edge Function when sending)
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_building_id
  ON public.push_subscriptions (building_id);

-- Index for fast lookup by profile (used when unsubscribing)
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_profile_id
  ON public.push_subscriptions (profile_id);

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can insert their own subscriptions
DROP POLICY IF EXISTS "Users can insert own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can insert own push subscriptions"
  ON public.push_subscriptions
  FOR INSERT
  WITH CHECK (profile_id = auth.uid());

-- Users can read their own subscriptions
DROP POLICY IF EXISTS "Users can read own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can read own push subscriptions"
  ON public.push_subscriptions
  FOR SELECT
  USING (profile_id = auth.uid());

-- Users can delete their own subscriptions (unsubscribe)
DROP POLICY IF EXISTS "Users can delete own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users can delete own push subscriptions"
  ON public.push_subscriptions
  FOR DELETE
  USING (profile_id = auth.uid());

-- Edge Function (service role) can read all subscriptions for a building
-- This is handled by the Edge Function using the service role key, which bypasses RLS.
-- No additional policy needed for the Edge Function.

-- Trigger to update updated_at on row change
CREATE OR REPLACE FUNCTION public.update_push_subscription_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_push_subscriptions_updated_at ON public.push_subscriptions;
CREATE TRIGGER trigger_push_subscriptions_updated_at
  BEFORE UPDATE ON public.push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_push_subscription_updated_at();
```

Apply via `supabase db push` or the Supabase SQL editor.

### 4.2 TypeScript types for `push_subscriptions`

Add to `lib/types.ts`:

```typescript
// lib/types.ts — add to end of file

export interface PushSubscriptionRecord {
  id:          string;
  profile_id:  string;
  building_id: string;
  endpoint:    string;
  p256dh:      string;
  auth:        string;
  user_agent?: string | null;
  created_at:  string;
  updated_at:  string;
}
```

---

## 5. Phase 2 — PWA Setup

### 5.1 Install `next-pwa`

```bash
npm install next-pwa
npm install --save-dev @types/next-pwa
```

### 5.2 Update `next.config.mjs`

Read the current `next.config.mjs` first. Replace or update it with the following. If the file uses `@type {import('next').NextConfig}` JSDoc, adapt accordingly:

```javascript
// next.config.mjs — full replacement
import withPWA from 'next-pwa';

const isDev = process.env.NODE_ENV === 'development';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Existing config options — preserve anything already here
  reactStrictMode: true,

  // next-pwa: disable during development to avoid service worker caching
  // interfering with hot reload. Only enable in production builds.
};

export default withPWA({
  dest: 'public',          // service worker goes to public/sw.js
  disable: isDev,          // no SW in dev mode
  register: true,          // auto-register the service worker
  skipWaiting: true,       // activate new SW immediately (no waiting)
  runtimeCaching: [
    // Cache API calls to Supabase for offline resilience (stale-while-revalidate)
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'supabase-api-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 5 // 5 minutes
        },
        networkTimeoutSeconds: 10
      }
    },
    // Cache static assets aggressively
    {
      urlPattern: /^https?.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'offlineCache',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 60 * 60 * 24 // 24 hours
        }
      }
    }
  ]
})(nextConfig);
```

**Important:** After adding `next-pwa`, the build will generate `public/sw.js` and `public/workbox-*.js`. Add these to `.gitignore` since they are build artifacts:

```
# .gitignore — add these lines
public/sw.js
public/workbox-*.js
```

### 5.3 `public/manifest.json` — complete file

Create `public/manifest.json`:

```json
{
  "name": "PanelLakó – Társasházi kezelőfelület",
  "short_name": "PanelLakó",
  "description": "Digitális működési központ társasházak számára. Bejelentések, hibabejelentések, dokumentumtár és pénzügyi átláthatóság.",
  "start_url": "/app",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait-primary",
  "theme_color": "#1D4ED8",
  "background_color": "#F8FAFC",
  "lang": "hu",
  "dir": "ltr",
  "categories": ["productivity", "utilities", "business"],
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ],
  "shortcuts": [
    {
      "name": "Épületeim",
      "short_name": "Épületek",
      "description": "Nyitd meg az épületválasztót",
      "url": "/app",
      "icons": [{ "src": "/icons/icon-96x96.png", "sizes": "96x96" }]
    },
    {
      "name": "Új bejelentés",
      "short_name": "Bejelentés",
      "description": "Adj hozzá új hibabejelentést",
      "url": "/app",
      "icons": [{ "src": "/icons/icon-96x96.png", "sizes": "96x96" }]
    }
  ],
  "screenshots": [],
  "prefer_related_applications": false
}
```

### 5.4 Icon generation

The existing logo SVG is at `app/icon.svg`. Generate all required PNG sizes using the following approach:

**Option A — Using `sharp` (Node.js, recommended):**

```bash
npm install --save-dev sharp
```

Create `scripts/generate-icons.mjs`:

```javascript
// scripts/generate-icons.mjs
import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';

const SVG_PATH   = resolve('./app/icon.svg');
const OUTPUT_DIR = resolve('./public/icons');
const SIZES      = [72, 96, 128, 144, 152, 192, 384, 512];

mkdirSync(OUTPUT_DIR, { recursive: true });

const svgBuffer = readFileSync(SVG_PATH);

await Promise.all(
  SIZES.map(size =>
    sharp(svgBuffer)
      .resize(size, size, { fit: 'contain', background: { r: 29, g: 78, b: 216, alpha: 1 } })
      .png()
      .toFile(resolve(OUTPUT_DIR, `icon-${size}x${size}.png`))
      .then(() => console.log(`Generated ${size}x${size}`))
  )
);

console.log('All icons generated.');
```

Run: `node scripts/generate-icons.mjs`

**Option B — Using the Supabase Storage + ImageMagick in a one-off CI job:**

If the SVG cannot be processed locally, use: `convert -background '#1D4ED8' -size 512x512 app/icon.svg -resize 512x512 public/icons/icon-512x512.png` and repeat for each size.

Add `public/icons/*.png` to `.gitignore` only if they are regenerated in CI; otherwise commit them as static assets.

### 5.5 Update `app/layout.tsx` with PWA meta tags

```typescript
// app/layout.tsx — full replacement
import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PanelLakó – Digitális működési központ',
  description:
    'Társasházi kommunikáció, hibakezelés, dokumentumtár és pénzügyi átláthatóság egy helyen.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable:        true,
    statusBarStyle: 'black-translucent',
    title:          'PanelLakó'
  },
  other: {
    'mobile-web-app-capable': 'yes'
  }
};

export const viewport: Viewport = {
  themeColor:    '#1D4ED8',
  width:         'device-width',
  initialScale:  1,
  maximumScale:  1,
  userScalable:  false
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hu">
      <head>
        {/* Apple touch icon — required for iOS Add to Home Screen */}
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="144x144" href="/icons/icon-144x144.png" />
        <link rel="apple-touch-icon" sizes="128x128" href="/icons/icon-128x128.png" />
        {/* Splash screen for iOS — optional but improves perceived performance */}
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

---

## 6. Phase 3 — VAPID Key Generation

VAPID (Voluntary Application Server Identification) keys authenticate the push server to the browser push service (FCM, APNS, etc.).

### 6.1 Generate keys using `web-push` CLI

```bash
# Install web-push globally if not already installed
npm install -g web-push

# Generate VAPID keys — run this ONCE and save the output
web-push generate-vapid-keys --json
```

Example output:
```json
{
  "publicKey":  "BJxZ2tZenRn...base64url-encoded-65-byte-key...",
  "privateKey": "AbCdEfGh...base64url-encoded-32-byte-key..."
}
```

### 6.2 Set environment variables

In `.env.local` (local development — never commit this file):
```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BJxZ2tZenRn...
VAPID_PRIVATE_KEY=AbCdEfGh...
VAPID_SUBJECT=mailto:support@panellako.hu
```

In Vercel Dashboard (production):
- Settings → Environment Variables → add the same three keys.

In Supabase Dashboard (for the Edge Function):
- Settings → Edge Functions → Secrets → add `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`.

**Security rule:** `NEXT_PUBLIC_VAPID_PUBLIC_KEY` is the only key that can be prefixed `NEXT_PUBLIC_` (it is literally public). `VAPID_PRIVATE_KEY` and `VAPID_SUBJECT` must NEVER have the `NEXT_PUBLIC_` prefix. If they appear in client-side bundle output, the VAPID infrastructure is compromised.

### 6.3 Add VAPID keys to `lib/vapid.ts`

```typescript
// lib/vapid.ts
// Public key accessor for client-side use.
// The private key is never imported here — it lives in Server Actions and Edge Functions only.

export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

if (typeof window === 'undefined' && !VAPID_PUBLIC_KEY) {
  console.warn('[VAPID] NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set. Push subscriptions will fail.');
}
```

---

## 7. Phase 4 — Push Subscription Server Action

Create `app/actions/push.ts`:

```typescript
// app/actions/push.ts
'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export interface PushSubscriptionPayload {
  endpoint: string;
  keys: {
    p256dh: string;
    auth:   string;
  };
}

/**
 * Store a push subscription for the current user in the given building.
 * Called from the client after navigator.serviceWorker.subscribe() succeeds.
 * Upserts on (profile_id, building_id, endpoint) to handle re-subscription
 * (e.g., browser rotated the subscription key).
 */
export async function subscribeToPush(
  subscription: PushSubscriptionPayload,
  buildingId:   string
) {
  const supabase = createClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Nem vagy bejelentkezve.' };
  }

  // Validate building membership before storing subscription
  const { data: membership } = await supabase
    .from('memberships')
    .select('id')
    .eq('profile_id', user.id)
    .eq('building_id', buildingId)
    .eq('active', true)
    .single();

  if (!membership) {
    return { success: false, error: 'Nincs jogosultságod ehhez az épülethez.' };
  }

  // Upsert the subscription
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(
      {
        profile_id:  user.id,
        building_id: buildingId,
        endpoint:    subscription.endpoint,
        p256dh:      subscription.keys.p256dh,
        auth:        subscription.keys.auth,
        updated_at:  new Date().toISOString()
      },
      {
        onConflict: 'profile_id,building_id,endpoint',
        ignoreDuplicates: false
      }
    );

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Remove a push subscription for the current user.
 * Called when the user explicitly disables notifications or when the
 * browser fires a pushsubscriptionchange event.
 */
export async function unsubscribeFromPush(
  endpoint:    string,
  buildingId:  string
) {
  const supabase = createClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'Nem vagy bejelentkezve.' };
  }

  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('profile_id', user.id)
    .eq('building_id', buildingId)
    .eq('endpoint', endpoint);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/w/${buildingId}`);
  return { success: true };
}

/**
 * Check whether the current user has an active push subscription for a building.
 * Used by the notification button to show the correct state (enabled/disabled).
 */
export async function getPushSubscriptionStatus(buildingId: string) {
  const supabase = createClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { subscribed: false };
  }

  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('id')
    .eq('profile_id', user.id)
    .eq('building_id', buildingId)
    .limit(1);

  return {
    subscribed: !error && Array.isArray(data) && data.length > 0
  };
}
```

---

## 8. Phase 5 — "Enable Notifications" Client Component

Create `components/push-notification-button.tsx`. This is a `'use client'` component because it uses browser APIs (`Notification`, `navigator.serviceWorker`, `PushManager`).

```typescript
// components/push-notification-button.tsx
'use client';

import { useState, useEffect, useTransition } from 'react';
import { Bell, BellOff, BellRing, AlertTriangle, Loader2 } from 'lucide-react';
import { subscribeToPush, unsubscribeFromPush } from '@/app/actions/push';
import { VAPID_PUBLIC_KEY } from '@/lib/vapid';

interface PushNotificationButtonProps {
  buildingId:          string;
  initiallySubscribed: boolean;
}

type PushState =
  | 'unsupported'   // Browser/OS does not support Web Push
  | 'denied'        // User previously denied permission
  | 'not-subscribed'
  | 'subscribing'
  | 'subscribed'
  | 'error';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding  = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64   = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData  = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PushNotificationButton({
  buildingId,
  initiallySubscribed
}: PushNotificationButtonProps) {
  const [state, setState] = useState<PushState>(
    initiallySubscribed ? 'subscribed' : 'not-subscribed'
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Check browser support and current permission state on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check for Web Push API support
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState('unsupported');
      return;
    }

    // Sync with current browser permission state
    if (Notification.permission === 'denied') {
      setState('denied');
      return;
    }

    // If we have a server-side subscription but the browser does not,
    // it means the subscription expired or the browser was reinstalled.
    // Reset to not-subscribed to let the user re-subscribe.
    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((sub) => {
        if (!sub && initiallySubscribed) {
          setState('not-subscribed');
        }
      })
      .catch(() => {
        // serviceWorker.ready may time out in unusual environments
      });
  }, [initiallySubscribed]);

  const handleSubscribe = async () => {
    if (!VAPID_PUBLIC_KEY) {
      setErrorMessage('A push értesítési konfiguráció hiányzik. Kérjük, lépj kapcsolatba a rendszergazdával.');
      setState('error');
      return;
    }

    setState('subscribing');
    setErrorMessage(null);

    try {
      // Request notification permission
      const permission = await Notification.requestPermission();

      if (permission === 'denied') {
        setState('denied');
        return;
      }

      if (permission !== 'granted') {
        setState('not-subscribed');
        return;
      }

      // Get or create a push subscription from the browser
      const registration = await navigator.serviceWorker.ready;
      const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);

      const pushSubscription = await registration.pushManager.subscribe({
        userVisibleOnly:      true,  // Required — must be true for Web Push
        applicationServerKey
      });

      // Extract the serializable parts of the PushSubscription
      const subscriptionJSON = pushSubscription.toJSON() as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };

      // Store in database via Server Action
      startTransition(async () => {
        const result = await subscribeToPush(subscriptionJSON, buildingId);

        if (!result.success) {
          setErrorMessage(result.error ?? 'Nem sikerült menteni a feliratkozást.');
          setState('error');
        } else {
          setState('subscribed');
        }
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ismeretlen hiba';
      setErrorMessage(`Hiba a feliratkozás során: ${message}`);
      setState('error');
    }
  };

  const handleUnsubscribe = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const pushSubscription = await registration.pushManager.getSubscription();

      if (pushSubscription) {
        const endpoint = pushSubscription.endpoint;

        // Unsubscribe from the browser
        await pushSubscription.unsubscribe();

        // Remove from database
        startTransition(async () => {
          await unsubscribeFromPush(endpoint, buildingId);
          setState('not-subscribed');
        });
      } else {
        setState('not-subscribed');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Ismeretlen hiba';
      setErrorMessage(`Hiba a leiratkozás során: ${message}`);
      setState('error');
    }
  };

  // ─── Render variants ─────────────────────────────────────────────────────

  if (state === 'unsupported') {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <BellOff className="w-4 h-4" />
        <span className="hidden sm:inline">Push értesítés nem támogatott</span>
      </div>
    );
  }

  if (state === 'denied') {
    return (
      <div className="flex items-center gap-2 text-xs text-amber-600">
        <AlertTriangle className="w-4 h-4" />
        <span>Értesítés letiltva a böngésző beállításokban</span>
      </div>
    );
  }

  if (state === 'subscribed') {
    return (
      <button
        onClick={handleUnsubscribe}
        disabled={isPending}
        className="flex items-center gap-2 text-sm text-slate-600 hover:text-red-600 transition-colors disabled:opacity-50"
        title="Értesítések kikapcsolása"
      >
        {isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <BellRing className="w-4 h-4 text-blue-600" />
        )}
        <span className="hidden sm:inline">
          {isPending ? 'Leiratkozás...' : 'Értesítések bekapcsolva'}
        </span>
      </button>
    );
  }

  if (state === 'subscribing') {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Feliratkozás...</span>
      </div>
    );
  }

  // Default: not-subscribed or error
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleSubscribe}
        disabled={isPending}
        className="flex items-center gap-2 text-sm text-blue-700 hover:text-blue-900 font-medium transition-colors disabled:opacity-50"
        title="Push értesítések bekapcsolása"
      >
        <Bell className="w-4 h-4" />
        <span className="hidden sm:inline">Értesítések bekapcsolása</span>
      </button>
      {state === 'error' && errorMessage && (
        <p className="text-xs text-red-600 max-w-xs text-right">{errorMessage}</p>
      )}
    </div>
  );
}
```

### 8.1 Add the button to the dashboard header

In `components/dashboard-client.tsx`, find the header area (the top bar with the user name and notification bell). Import the component and render it:

```typescript
// At the top of dashboard-client.tsx — add import
import PushNotificationButton from './push-notification-button';
```

In the header JSX, add the button next to the existing notification icon:

```tsx
{/* Add inside the header actions row, next to the existing bell icon */}
{data.buildingId && (
  <PushNotificationButton
    buildingId={data.buildingId}
    initiallySubscribed={false}
    // NOTE: For accurate initial state, call getPushSubscriptionStatus() in
    // the server component (app/w/[buildingId]/page.tsx) and pass the result
    // as a prop through DashboardData. See Phase 5.1 below.
  />
)}
```

### 8.2 Server-side initial subscription status

In `app/w/[buildingId]/page.tsx`, after fetching the dashboard data, also fetch the subscription status:

```typescript
// In app/w/[buildingId]/page.tsx — add after getDashboardData call
import { getPushSubscriptionStatus } from '@/app/actions/push';

// ...inside the component, after getDashboardData:
const { subscribed: isPushSubscribed } = await getPushSubscriptionStatus(buildingId);

const enrichedData = {
  ...data,
  buildingId,
  buildingName: building.name,
  buildingAddress: building.address,
  isPushSubscribed  // ADD THIS
};
```

Update `DashboardData` type to include `isPushSubscribed?: boolean`.

Then pass `initiallySubscribed={data.isPushSubscribed ?? false}` to `PushNotificationButton`.

---

## 9. Phase 6 — Supabase Edge Function `send-push-notification`

Create `supabase/functions/send-push-notification/index.ts`. This is a Deno TypeScript file — use Deno import syntax, not Node.js `require`.

```typescript
// supabase/functions/send-push-notification/index.ts
// Deno runtime — Supabase Edge Function
// Sends a Web Push notification to all opted-in subscribers in a building.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'https://esm.sh/web-push@3.6.7';

// ─── Types ────────────────────────────────────────────────────────────────

interface PushRequestBody {
  building_id:  string;
  title:        string;
  body:         string;
  url?:         string;
  icon?:        string;
  tag?:         string;     // notification tag for deduplication
  data?:        Record<string, unknown>;
}

interface PushSubscriptionRow {
  id:          string;
  profile_id:  string;
  endpoint:    string;
  p256dh:      string;
  auth:        string;
}

// ─── VAPID configuration ─────────────────────────────────────────────────

const VAPID_PUBLIC_KEY  = Deno.env.get('VAPID_PUBLIC_KEY');
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY');
const VAPID_SUBJECT     = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:support@panellako.hu';

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  throw new Error('[send-push-notification] VAPID keys are not configured in Edge Function secrets.');
}

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

// ─── Supabase client (service role — bypasses RLS to read all subscriptions) ──

const supabaseUrl       = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ─── Main handler ─────────────────────────────────────────────────────────

serve(async (req: Request) => {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Parse and validate request body
  let body: PushRequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (!body.building_id || !body.title || !body.body) {
    return new Response(
      JSON.stringify({ error: 'building_id, title, and body are required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Fetch all push subscriptions for this building
  const { data: subscriptions, error: fetchError } = await supabase
    .from('push_subscriptions')
    .select('id, profile_id, endpoint, p256dh, auth')
    .eq('building_id', body.building_id);

  if (fetchError) {
    console.error('[send-push] Failed to fetch subscriptions:', fetchError.message);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch subscriptions', detail: fetchError.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!subscriptions || subscriptions.length === 0) {
    return new Response(
      JSON.stringify({ sent: 0, message: 'No subscribers for this building' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Build the notification payload
  const notificationPayload = JSON.stringify({
    title:    body.title,
    body:     body.body,
    icon:     body.icon ?? '/icons/icon-192x192.png',
    badge:    '/icons/icon-96x96.png',
    url:      body.url ?? '/',
    tag:      body.tag,
    data:     body.data ?? {},
    timestamp: Date.now()
  });

  // Send push to all subscribers in parallel, batching in groups of 50
  // to avoid overwhelming the push service with simultaneous connections.
  const BATCH_SIZE    = 50;
  const invalidEndpoints: string[] = [];
  let sentCount       = 0;
  let errorCount      = 0;

  for (let i = 0; i < subscriptions.length; i += BATCH_SIZE) {
    const batch = (subscriptions as PushSubscriptionRow[]).slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys:     { p256dh: sub.p256dh, auth: sub.auth }
            },
            notificationPayload,
            {
              urgency: 'normal',
              TTL:     60 * 60 * 24  // 24 hours — notification survives if device is offline
            }
          );
          return { success: true, id: sub.id };
        } catch (err: unknown) {
          const statusCode = (err as { statusCode?: number }).statusCode;

          // 404 and 410 mean the endpoint is gone (device uninstalled app, browser cleared data)
          if (statusCode === 404 || statusCode === 410) {
            invalidEndpoints.push(sub.endpoint);
          }

          console.warn(
            `[send-push] Failed to send to endpoint ${sub.endpoint.substring(0, 40)}:`,
            statusCode ?? err
          );
          return { success: false, id: sub.id, statusCode };
        }
      })
    );

    sentCount  += results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    errorCount += results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;
  }

  // Clean up expired/invalid subscriptions (fire and forget — don't block response)
  if (invalidEndpoints.length > 0) {
    supabase
      .from('push_subscriptions')
      .delete()
      .in('endpoint', invalidEndpoints)
      .then(({ error }) => {
        if (error) {
          console.error('[send-push] Failed to clean invalid subscriptions:', error.message);
        } else {
          console.log(`[send-push] Removed ${invalidEndpoints.length} invalid subscriptions.`);
        }
      });
  }

  return new Response(
    JSON.stringify({
      sent:     sentCount,
      errors:   errorCount,
      cleaned:  invalidEndpoints.length,
      total:    subscriptions.length
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
});
```

### 9.1 Deploy the Edge Function

```bash
# From the project root
supabase functions deploy send-push-notification --no-verify-jwt

# Set secrets in the Edge Function environment
supabase secrets set VAPID_PUBLIC_KEY="<your-public-key>"
supabase secrets set VAPID_PRIVATE_KEY="<your-private-key>"
supabase secrets set VAPID_SUBJECT="mailto:support@panellako.hu"
```

The `--no-verify-jwt` flag is used because the Edge Function will be called from other Server Actions (not directly by a browser user). Authentication is enforced at the application layer (only the server calls this function, using the service role key internally via the Supabase client).

### 9.2 Test the Edge Function directly

```bash
curl -X POST \
  "https://<your-project>.supabase.co/functions/v1/send-push-notification" \
  -H "Authorization: Bearer <SUPABASE_ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "building_id": "<test-building-uuid>",
    "title":       "Teszt értesítés",
    "body":        "Ez egy tesztelési push értesítés a PanelLakóból.",
    "url":         "/app"
  }'
```

Expected response: `{ "sent": 1, "errors": 0, "cleaned": 0, "total": 1 }` (if one subscription exists for the building).

---

## 10. Phase 7 — Wire Announcements to Push Dispatch

Update `app/actions/announcements.ts` to call the Edge Function after a successful announcement insert. Push sending is fire-and-forget — do not await it, do not block the response on it, do not return an error if it fails.

```typescript
// app/actions/announcements.ts — updated (add push dispatch after successful insert)

'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export interface CreateAnnouncementInput {
  title:        string;
  content:      string;
  target_group: string;
  buildingId:   string;
  category?:    string;
}

async function assertManagerRole(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  buildingId: string
): Promise<{ success: true; role: string } | { success: false; error: string }> {
  const { data } = await supabase
    .from('memberships')
    .select('role')
    .eq('profile_id', userId)
    .eq('building_id', buildingId)
    .eq('active', true)
    .single();

  if (!data) {
    return { success: false, error: 'Nincs jogosultságod ehhez az épülethez.' };
  }

  const managerRoles = ['kozos_kepviselo', 'megbizott', 'bizottsag', 'konyvelo'];
  if (!managerRoles.includes(data.role)) {
    return { success: false, error: 'Csak kezelői jogkörrel lehet hirdetményt közzétenni.' };
  }
  return { success: true, role: data.role };
}

/**
 * Dispatch a push notification to all subscribers of a building.
 * Non-blocking: errors are logged but do not affect the announcement creation result.
 */
async function dispatchPushNotification(payload: {
  building_id: string;
  title:       string;
  body:        string;
  url?:        string;
}): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.warn('[dispatchPush] Supabase URL or service role key missing — push skipped.');
    return;
  }

  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/send-push-notification`,
      {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${serviceKey}`
        },
        body: JSON.stringify(payload)
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[dispatchPush] Edge Function returned ${response.status}: ${errorText}`
      );
    } else {
      const result = await response.json();
      console.log(`[dispatchPush] Push sent: ${JSON.stringify(result)}`);
    }
  } catch (err) {
    console.error('[dispatchPush] Network error calling Edge Function:', err);
  }
}

export async function createAnnouncement(input: CreateAnnouncementInput) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Nem vagy bejelentkezve.' };
  }

  const authCheck = await assertManagerRole(supabase, user.id, input.buildingId);
  if (!authCheck.success) {
    return authCheck;
  }

  const { data, error } = await supabase
    .from('announcements')
    .insert({
      title:        input.title,
      content:      input.content,
      target_group: input.target_group,
      category:     input.category ?? 'egyeb',
      building_id:  input.buildingId,
      created_by:   user.id
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  // Fire-and-forget push notification — do NOT await
  dispatchPushNotification({
    building_id: input.buildingId,
    title:       `Új hirdetmény: ${input.title}`,
    body:        input.content.length > 120
                   ? input.content.substring(0, 120) + '…'
                   : input.content,
    url:         `/w/${input.buildingId}?tab=overview`
  });

  revalidatePath(`/w/${input.buildingId}`);
  return { success: true, data };
}
```

---

## 11. Phase 8 — Wire Ticket Status Updates to Push Dispatch

Update `app/actions/tickets.ts` to notify the ticket reporter when a ticket's status changes to `folyamatban` (in progress), `varakozik` (waiting), or `lezarva` (closed).

In `updateTicketStatus`, after the successful `.update()` call, fetch the ticket to get the reporter's `reporter_id` and the building_id, then look up whether that reporter has a push subscription:

```typescript
// app/actions/tickets.ts — updateTicketStatus addition
// (Insert after the successful update, before revalidatePath)

  // Look up ticket details for push notification to the reporter
  const { data: ticket } = await supabase
    .from('tickets')
    .select('reporter_id, title, building_id')
    .eq('id', ticketId)
    .single();

  if (ticket?.reporter_id && ticket.building_id) {
    // Check if the reporter has push subscriptions for this building
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('profile_id', ticket.reporter_id)
      .eq('building_id', ticket.building_id);

    if (subs && subs.length > 0) {
      const statusMessages: Record<string, string> = {
        folyamatban: 'folyamatban van',
        varakozik:   'várakozik',
        lezarva:     'lezárva'
      };
      const statusLabel = statusMessages[status] ?? status;

      // Fire-and-forget push to reporter
      dispatchPushNotification({
        building_id: ticket.building_id,
        title:       `Bejelentés frissítve`,
        body:        `"${ticket.title}" – jelenleg: ${statusLabel}`,
        url:         `/w/${ticket.building_id}?tab=tickets`
      });
    }
  }
```

Import `dispatchPushNotification` from `announcements.ts` (export it from that file) or move it to a shared utility `lib/push-dispatch.ts` to avoid circular imports.

### 11.1 Shared push dispatch utility

Create `lib/push-dispatch.ts` to avoid circular imports between action files:

```typescript
// lib/push-dispatch.ts
// Shared utility for calling the send-push-notification Edge Function.
// Used by multiple Server Actions (announcements, tickets, etc.)
// This file runs server-side only.

export interface PushDispatchPayload {
  building_id: string;
  title:       string;
  body:        string;
  url?:        string;
  tag?:        string;
}

export async function dispatchPushNotification(
  payload: PushDispatchPayload
): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[dispatchPush] Skipped: SUPABASE_SERVICE_ROLE_KEY not configured.');
    }
    return;
  }

  // Non-blocking: catch all errors to prevent push failures from
  // disrupting the primary user action.
  fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${serviceKey}`
    },
    body: JSON.stringify(payload)
  }).catch((err) => {
    console.error('[dispatchPush] Failed to call Edge Function:', err);
  });
}
```

Import `dispatchPushNotification` from `@/lib/push-dispatch` in both `announcements.ts` and `tickets.ts`.

---

## 12. Phase 9 — iOS-Specific Considerations

### 12.1 iOS 16.4+ requirement

Web Push on iOS requires iOS 16.4 or later. On iOS 16.3 and earlier, `'PushManager' in window` returns `false` and the "Enable Notifications" button will show the `unsupported` state (bell with strikethrough, no error). This is handled in `PushNotificationButton` via the `unsupported` state branch.

To check iOS version and show a targeted message, add to `PushNotificationButton`:

```typescript
// Add inside the useEffect in PushNotificationButton, before the PushManager check:

const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent);
if (isIOS) {
  // Parse iOS version from user agent string
  const match = navigator.userAgent.match(/OS (\d+)_(\d+)/);
  const major = match ? parseInt(match[1], 10) : 0;

  if (major < 16) {
    setState('unsupported');
    setErrorMessage('iOS 16.4 vagy újabb szükséges a push értesítésekhez.');
    return;
  }
}
```

### 12.2 "Add to Home Screen" prompt for iOS

iOS does not fire the `BeforeInstallPromptEvent` — the user must manually add the app via the Share sheet. Show a contextual hint in the `PushNotificationButton` component when the app is running in Safari on iOS but is NOT already in standalone mode:

```typescript
// Add to the useEffect:
const isInStandaloneMode =
  ('standalone' in window.navigator) &&
  (window.navigator as { standalone?: boolean }).standalone === true;
const isIOSSafari = isIOS && /Safari/.test(navigator.userAgent);

if (isIOSSafari && !isInStandaloneMode) {
  // Show a hint to add to home screen — push only works in standalone mode on iOS
  setState('unsupported');
  setErrorMessage(
    'iOS-en a push értesítésekhez előbb add hozzá az appot a főképernyőhöz ' +
    '(Safari → Megosztás → Főképernyőhöz adás).'
  );
  return;
}
```

### 12.3 Service worker scope

The service worker generated by `next-pwa` is registered at the root scope (`/`). This is correct — no additional configuration is needed. The service worker handles `push` events automatically through the workbox precaching setup. For custom push event handling (e.g., showing the notification and handling click-to-open), `next-pwa` supports a custom service worker at `public/sw.js` that is merged with the generated one. For this initiative, the default next-pwa behavior is sufficient: the service worker will display incoming push payloads as browser notifications.

---

## 13. Testing Protocol

### 13.1 Setup

1. Run `npm run build && npm start` (production build required — service workers do not run in dev mode when `disable: isDev` is set in `next.config.mjs`).
2. Open Chrome DevTools → Application → Service Workers — verify the service worker is registered and active.
3. Verify `manifest.json` is accessible at `http://localhost:3000/manifest.json`.
4. Chrome DevTools → Application → Manifest — verify all fields are parsed correctly and icons load.

### 13.2 Test cases

| Test | Steps | Expected outcome |
|------|-------|-----------------|
| T01: Manifest install | Chrome on Android → open app → "Add to Home Screen" prompt appears | App installs with PanelLakó icon |
| T02: iOS install | Safari iOS 16.4+ → Share → Add to Home Screen | App opens in standalone mode with correct splash |
| T03: Permission request | Click "Értesítések bekapcsolása" | Browser permission dialog appears |
| T04: Permission granted | Grant permission | Button changes to "Értesítések bekapcsolva" + `BellRing` icon |
| T05: DB subscription | After T04, check `push_subscriptions` table in Supabase | Row exists with correct `profile_id`, `building_id`, `endpoint` |
| T06: Push sent | Create announcement as közös képviselő | Push notification appears on the subscriber's device within 5 seconds |
| T07: Permission denied | Deny permission → click button again | Button shows amber warning, no error, graceful state |
| T08: Ticket update push | Update ticket status as manager | Reporter receives push notification |
| T09: Unsubscribe | Click "Értesítések bekapcsolva" to toggle off | Row removed from `push_subscriptions`, button returns to "Bekapcsolás" |
| T10: Invalid endpoint cleanup | Simulate 410 from push service (curl Edge Function with deleted subscription) | Row is deleted from `push_subscriptions` within 5 seconds |
| T11: Offline resilience | Enable notifications, go offline, receive push | Push queued by browser, delivered when back online (TTL=86400) |
| T12: Multiple buildings | Subscribe on building A, create announcement on building B | No push received (correct building scoping) |

---

## 14. Error Handling

### 14.1 Invalid endpoint (404/410)

When the push service returns 404 (endpoint not found) or 410 (endpoint gone — subscription explicitly cancelled), the Edge Function adds the endpoint to `invalidEndpoints` and deletes those rows from `push_subscriptions` after the batch completes. This is the standard Web Push cleanup pattern.

### 14.2 VAPID key mismatch

If VAPID keys are rotated (e.g., the private key is regenerated), all existing subscriptions become invalid — the push service will return 401 or 403. The solution is to never rotate VAPID keys once subscriptions exist. If rotation is unavoidable (security breach), all subscriptions must be deleted from `push_subscriptions` and all users must re-subscribe. Add a migration to truncate `push_subscriptions` after a key rotation event.

### 14.3 Push quota exceeded

Some push services (particularly FCM) throttle at 1,000 messages per day for free projects. For buildings with 100+ units, a single announcement could approach this limit. The Edge Function's batching (50 subscriptions per batch with `Promise.allSettled`) spreads the load across time but does not solve the quota issue. For production, register the application for a FCM server key (for Chrome) and use it in the VAPID configuration. See `web-push` documentation for `gcmAPIKey` option.

### 14.4 Permission revoked after subscribe

If a user revokes notification permission in browser settings after subscribing, the next push attempt will fail with a non-200 status. The browser will NOT automatically fire `pushsubscriptionchange`. The stale subscription remains in the database and will fail silently on every push send (generating a 410 response after a browser-dependent timeout). The `invalidEndpoints` cleanup in the Edge Function handles this — within 1–2 push events the stale endpoint is removed.

### 14.5 Service worker update blocking

When a new version of `sw.js` is deployed, the old service worker continues serving until all browser tabs are closed. The `skipWaiting: true` in `next.config.mjs` forces the new service worker to activate immediately, potentially causing brief inconsistency. This is acceptable for a building management app (users tolerate one refresh). Do not remove `skipWaiting: true` — without it, users on mobile who never close tabs will run stale service workers indefinitely.

---

## 15. Performance — Batching for Large Buildings

Buildings with 100+ units (and up to 200+ push subscriptions if multiple devices per household) require batch processing to avoid:
1. Memory exhaustion in the Edge Function (Deno processes all subscriptions in RAM).
2. Network throttling from push services.
3. Deno Edge Function timeout (30 seconds default on Supabase free tier, 150 seconds on Pro).

The current implementation batches in groups of 50 with `Promise.allSettled`. For buildings with 300+ subscriptions, add pagination:

```typescript
// In the Edge Function, replace the single fetch with a paginated fetch:
const PAGE_SIZE = 200;
let offset      = 0;
let allSubs: PushSubscriptionRow[] = [];

while (true) {
  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('id, profile_id, endpoint, p256dh, auth')
    .eq('building_id', body.building_id)
    .range(offset, offset + PAGE_SIZE - 1);

  if (error || !data || data.length === 0) break;
  allSubs = allSubs.concat(data as PushSubscriptionRow[]);
  if (data.length < PAGE_SIZE) break;
  offset += PAGE_SIZE;
}
```

For buildings with 500+ subscribers (outlier buildings like large apartment complexes in Budapest), consider using a Supabase Queue (pgmq) to fan out push sends asynchronously, with a separate Edge Function worker processing the queue. This is a separate engineering initiative.

---

## 16. Integration with Email Notifications Initiative

The push and email notification systems are parallel, not competing. The `notifications` table already has a `channel` field (`app` or `email`). When the email initiative is implemented:

1. `createAnnouncement` will call both `dispatchPushNotification` (for push subscribers) and `dispatchEmailNotification` (for all members, via Resend or Postmark).
2. A user preference table (`notification_preferences`) will eventually let users choose: push only, email only, both, or none.
3. Push should be the default opt-in channel (because it is free to send); email should require explicit opt-in (because it has per-send cost implications).

For this PR, add a TODO comment in `app/actions/announcements.ts`:

```typescript
// TODO(email-notifications): After email initiative is implemented,
// call dispatchEmailNotification() here alongside dispatchPushNotification().
// See dev_prompts/07_email-notifications.md for the email initiative spec.
```

---

## 17. Rollback Plan

If this PR needs to be reverted:

1. **`next-pwa` removal:** `npm uninstall next-pwa` and revert `next.config.mjs` to its pre-PWA state. Remove the `withPWA()` wrapper.
2. **Service worker deregistration:** Browsers that have already registered the service worker will continue to use it until they visit the site again after the SW is removed. To actively deregister: create a new `public/sw.js` with just `self.skipWaiting(); clients.claim();` and wait for browser propagation (1–7 days depending on user activity).
3. **Database:** The `push_subscriptions` table is additive. It can remain deployed without impact. To remove it: `DROP TABLE IF EXISTS public.push_subscriptions;`.
4. **Edge Function:** Supabase Edge Functions can be deleted from the Supabase Dashboard → Edge Functions → Delete. This is instant.
5. **VAPID keys:** If the keys have been set in Vercel environment variables, remove them via Vercel Dashboard. The `NEXT_PUBLIC_VAPID_PUBLIC_KEY` being present but unused (after removing the subscription component) has no negative effect.

The highest-risk item is the `next.config.mjs` change — if `withPWA()` causes a build failure (e.g., incompatibility with a newer Next.js version), the entire build breaks. Test on a branch with `npm run build` before merging.

---

## 18. Definition of Done

A PR implementing this initiative is complete when ALL of the following are true:

- [ ] `supabase/migrations/20260515_push_subscriptions.sql` exists and has been applied
- [ ] `lib/types.ts` includes `PushSubscriptionRecord` interface
- [ ] `lib/vapid.ts` exists and exports `VAPID_PUBLIC_KEY`
- [ ] `lib/push-dispatch.ts` exists and exports `dispatchPushNotification`
- [ ] `app/actions/push.ts` exists with `subscribeToPush`, `unsubscribeFromPush`, `getPushSubscriptionStatus`
- [ ] `components/push-notification-button.tsx` exists with all 5 states: unsupported, denied, not-subscribed, subscribing, subscribed
- [ ] `public/manifest.json` exists with all required fields (name, short_name, icons ×8, theme_color, background_color, display, start_url, orientation)
- [ ] `public/icons/` directory contains all 8 PNG icon sizes (72, 96, 128, 144, 152, 192, 384, 512)
- [ ] `next.config.mjs` includes `withPWA()` wrapper with `disable: isDev`
- [ ] `app/layout.tsx` includes manifest link, theme-color meta, and apple-touch-icon links
- [ ] `supabase/functions/send-push-notification/index.ts` exists (Deno, complete)
- [ ] Edge Function is deployed to the Supabase project
- [ ] VAPID secrets are set in both `.env.local` and Vercel (or hosting provider) environment
- [ ] VAPID secrets are set as Supabase Edge Function secrets
- [ ] `app/actions/announcements.ts` calls `dispatchPushNotification` (fire-and-forget) after successful insert
- [ ] `app/actions/tickets.ts` calls `dispatchPushNotification` to ticket reporter on status update
- [ ] `PushNotificationButton` renders correctly in the dashboard header (desktop + mobile)
- [ ] iOS 16.3 and earlier shows a graceful "unsupported" state, not an error
- [ ] iOS 16.4+ shows the correct "Add to Home Screen first" hint when running in Safari (not standalone)
- [ ] `npm run build` passes with zero TypeScript errors
- [ ] All 12 manual test cases (T01–T12) pass
- [ ] `.gitignore` includes `public/sw.js` and `public/workbox-*.js`
- [ ] `CHANGELOG.md` entry added under the next available version number
- [ ] `versioning/DDMMYYNNN_v4.1.0_mobile-pwa-push.md` created
- [ ] `marketing/marketing_values/YYYYMMDD_v4.1.0_mobile-pwa-push_marketing_value.md` created

---

## 19. Files Changed Summary

| File | Change type |
|------|-------------|
| `supabase/migrations/20260515_push_subscriptions.sql` | CREATE — push_subscriptions table + RLS |
| `supabase/functions/send-push-notification/index.ts` | CREATE — Deno Edge Function |
| `lib/types.ts` | MODIFY — add PushSubscriptionRecord |
| `lib/vapid.ts` | CREATE — VAPID public key accessor |
| `lib/push-dispatch.ts` | CREATE — shared push dispatch utility |
| `app/actions/push.ts` | CREATE — subscribe/unsubscribe/status Server Actions |
| `app/actions/announcements.ts` | MODIFY — add push dispatch after insert |
| `app/actions/tickets.ts` | MODIFY — add push dispatch on status update |
| `components/push-notification-button.tsx` | CREATE — client component with 5 states |
| `components/dashboard-client.tsx` | MODIFY — add PushNotificationButton to header |
| `app/w/[buildingId]/page.tsx` | MODIFY — pass isPushSubscribed to data |
| `public/manifest.json` | CREATE — full PWA manifest |
| `public/icons/*.png` | CREATE — 8 icon sizes (generated from SVG) |
| `next.config.mjs` | MODIFY — wrap with withPWA() |
| `app/layout.tsx` | MODIFY — add manifest, meta, apple-touch-icon |
| `scripts/generate-icons.mjs` | CREATE — one-off icon generation script |
| `.gitignore` | MODIFY — add public/sw.js, public/workbox-*.js |

Total: 10 new files, 7 modified files.
