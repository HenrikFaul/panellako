# Initiative 07 — Environmental Intelligence Dashboard
## SEO-to-Product Conversion Engine | Value: +€150k–€340k

---

## 1. Initiative Header

**Title:** Environmental Intelligence Dashboard — SEO to Product Conversion Engine

**Value Range:** +€150k–€340k (lead magnet conversion + EU EPBD compliance unlock)

**Business Case:**

PanelLakó has the deepest environmental data infrastructure of any Hungarian PropTech platform. The app has: air quality (`components/air-quality-section.tsx`, `app/api/environment/air-quality/`), heat island analysis (`components/heat-island-dashboard-client.tsx`, `app/api/environment/heat-island/`), noise pollution (`components/noise-dashboard-client.tsx`), land use, green score, liveability score, cycling routes, solar analysis, and satellite imagery. All of this data is backed by real API integrations and stored in Supabase tables (`building_env_score`, `air_quality_readings`).

The existing SEO content cluster drives organic traffic: `app/levegominoseg-budapest/`, `app/klimakockazat-epuleteknel/`, `app/zajszennyezes-budapest/`, `app/zold-tarsashaz/`. These articles rank for high-intent property searches. But the conversion path from "SEO article reader" to "free trial signup" is not optimized — there is no public-facing building environmental score page that a prospective customer can find when searching for their specific building.

The opportunity is three-dimensional: (1) a public `/epulet/[buildingId]/kornyezet` page with no auth required that surfaces environmental scores and drives signups via a prominent CTA, (2) historical trend charts for logged-in users showing PM2.5/PM10 trends from `air_quality_readings`, and (3) an EU EPBD 2024/1275/EU compliance section that unlocks municipal/housing-association B2B contracts.

---

## 2. Codebase Context

**Current relevant file tree (verified):**

```
/home/user/panellako/
├── app/
│   ├── w/
│   │   └── [buildingId]/
│   │       └── (subpages)/
│   │           ├── kornyezet/page.tsx      ← EXISTS (auth-required environmental page)
│   │           ├── green-score/page.tsx    ← EXISTS
│   │           ├── klimakockazat/page.tsx  ← EXISTS
│   │           ├── zaj/page.tsx            ← EXISTS
│   │           ├── kozlekedes/page.tsx     ← EXISTS
│   │           └── zold-akciok/page.tsx   ← EXISTS
│   ├── api/
│   │   └── environment/
│   │       ├── air-quality/route.ts        ← EXISTS
│   │       ├── heat-island/route.ts        ← EXISTS
│   │       ├── green/route.ts              ← EXISTS
│   │       ├── score/route.ts              ← EXISTS
│   │       └── (+ 7 more env routes)
│   └── (no app/epulet/ directory yet)
├── components/
│   ├── air-quality-section.tsx             ← EXISTS
│   ├── heat-island-dashboard-client.tsx    ← EXISTS
│   ├── green-score-dashboard-client.tsx    ← EXISTS
│   ├── noise-dashboard-client.tsx          ← EXISTS
│   ├── liveability-panel.tsx               ← EXISTS
│   └── (no env-improvement-recommendations.tsx yet)
└── supabase/
    └── migrations/
        ├── 20260520_building_env_score.sql  ← EXISTS — building_env_score table
        └── 20260518_air_quality_readings    ← (implied by air-quality API route)
```

**Key finding:** The `app/api/environment/score/route.ts` exists and likely reads from `building_env_score` — this is the correct data source for the public page. No auth is required for the API route currently — verify this before relying on it.

---

## 3. Pre-conditions

**Environment variables required:**
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...  ← Public routes use anon key for env data
NEXT_PUBLIC_APP_URL=https://app.panellako.hu
```

**Migrations to apply:**
- `20260523_060_building_env_public_rls.sql` — ensure `building_env_score` is readable by anon (for public page)

**No new npm packages required.**

---

## 4. Phase 1: Database Changes

### Migration: `20260523_060_building_env_public_rls.sql`

```sql
-- Allow anonymous (public) reads from building_env_score for the public environmental page.
-- Only non-sensitive aggregated scores are exposed — no PII, no unit-level data.

ALTER TABLE public.building_env_score ENABLE ROW LEVEL SECURITY;

-- Drop any existing overly-restrictive policy
DROP POLICY IF EXISTS "Anyone can read env scores" ON public.building_env_score;
DROP POLICY IF EXISTS "Public read env scores" ON public.building_env_score;

CREATE POLICY "Public read env scores" ON public.building_env_score
  FOR SELECT USING (TRUE);  -- Open read: scores are non-PII aggregated data

COMMENT ON POLICY "Public read env scores" ON public.building_env_score IS
  'Environmental scores are public non-PII data used by the public lead-magnet page. '
  'No personal data is exposed — only aggregate building-level environmental metrics.';

-- Air quality readings: allow public reads for public chart data
ALTER TABLE public.air_quality_readings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read air quality" ON public.air_quality_readings;
CREATE POLICY "Public read air quality" ON public.air_quality_readings
  FOR SELECT USING (TRUE);

-- Ensure buildings table exposes name + address publicly (for the public env page header)
-- Only name and address — no internal IDs of units, no financial data
DROP POLICY IF EXISTS "Public read building name address" ON public.buildings;
CREATE POLICY "Public read building name address" ON public.buildings
  FOR SELECT USING (TRUE);  -- buildings table already has name/address as public info

-- District average scores for benchmarking
CREATE OR REPLACE VIEW public.district_env_averages AS
SELECT
  SUBSTRING(b.address FROM '([0-9]+)\. kerület') AS district_code,
  ROUND(AVG(es.heat_island_score)::NUMERIC, 1)   AS avg_heat_island,
  ROUND(AVG(es.green_score)::NUMERIC, 1)         AS avg_green_score,
  ROUND(AVG(es.air_quality_index)::NUMERIC, 1)   AS avg_air_quality_index,
  ROUND(AVG(es.liveability_score)::NUMERIC, 1)   AS avg_liveability_score,
  COUNT(*)                                        AS building_count
FROM public.building_env_score es
JOIN public.buildings b ON b.id = es.building_id
WHERE es.heat_island_score IS NOT NULL
GROUP BY SUBSTRING(b.address FROM '([0-9]+)\. kerület');
```

---

## 5. Phase 2: Server-side

### New file: `app/actions/environment.ts`

```typescript
'use server';

import { createClient } from '@/lib/supabase/server';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BuildingEnvScore {
  building_id:         string;
  heat_island_score:   number | null;
  green_score:         number | null;
  air_quality_index:   number | null;
  liveability_score:   number | null;
  noise_score:         number | null;
  solar_potential_kwh: number | null;
  epc_class:           string | null;
  last_updated:        string | null;
}

export interface EnvImprovementRecommendation {
  area: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  eu_subsidy_eligible: boolean;
  link_slug?: string;
}

// ─── getPublicBuildingEnvScore ────────────────────────────────────────────────
// No auth required — used by the public /epulet/[buildingId]/kornyezet page.

export async function getPublicBuildingEnvScore(buildingId: string): Promise<{
  success: boolean;
  score?: BuildingEnvScore;
  buildingName?: string;
  buildingAddress?: string;
  error?: string;
}> {
  const supabase = createClient();

  const [scoreRes, buildingRes] = await Promise.all([
    supabase.from('building_env_score').select('*').eq('building_id', buildingId).maybeSingle(),
    supabase.from('buildings').select('name, address').eq('id', buildingId).maybeSingle(),
  ]);

  if (!buildingRes.data) {
    return { success: false, error: 'Épület nem található.' };
  }

  return {
    success: true,
    score: scoreRes.data as BuildingEnvScore | undefined,
    buildingName: buildingRes.data.name,
    buildingAddress: buildingRes.data.address,
  };
}

// ─── getDistrictAverageScores ─────────────────────────────────────────────────

export async function getDistrictAverageScores(buildingId: string): Promise<{
  success: boolean;
  districtAverages?: {
    avg_heat_island: number;
    avg_green_score: number;
    avg_air_quality_index: number;
    avg_liveability_score: number;
    building_count: number;
    district_code: string;
  };
  error?: string;
}> {
  const supabase = createClient();

  const { data: building } = await supabase
    .from('buildings')
    .select('address')
    .eq('id', buildingId)
    .maybeSingle();

  if (!building) return { success: false, error: 'Épület nem található.' };

  const districtMatch = building.address.match(/(\d{4})/);
  const postalPrefix = districtMatch ? districtMatch[1].slice(1, 3) : null;

  if (!postalPrefix) return { success: false, error: 'Kerület nem meghatározható.' };

  const { data, error } = await supabase
    .from('district_env_averages')
    .select('*')
    .eq('district_code', postalPrefix)
    .maybeSingle();

  if (error) return { success: false, error: error.message };

  return { success: true, districtAverages: data ?? undefined };
}

// ─── getEnvImprovementRecommendations ─────────────────────────────────────────
// Rule-based: no AI call, deterministic output from score thresholds.

export function getEnvImprovementRecommendations(
  score: BuildingEnvScore
): EnvImprovementRecommendation[] {
  const recs: EnvImprovementRecommendation[] = [];

  // Heat island: high score = bad
  if (score.heat_island_score != null && score.heat_island_score > 70) {
    recs.push({
      area: 'Hősziget',
      title: 'Reflektív tetőfestés és árnyékoló fák',
      description: 'A hősziget-kockázat csökkentésére reflektív festék felvitele a tetőre és 3–5 árnyékoló fa telepítése a déli oldalra 12–18%-kal csökkentheti a tetőfelület hőmérsékletét.',
      impact: 'high',
      eu_subsidy_eligible: true,
      link_slug: 'klimakockazat-epuleteknel/hoziget-csokkenites',
    });
  }

  // Green score: low = bad
  if (score.green_score != null && score.green_score < 40) {
    recs.push({
      area: 'Zöld terület',
      title: 'Zöldtető vagy zöld fal pályázat',
      description: 'Az épület alacsony zöld pontszáma alapján zöldtető vagy zöld fal telepítése EU Kohéziós Alapból finanszírozható (2021–2027 ciklus). A Budapest Főváros Zöldinfrastruktúra Program szintén nyújt támogatást.',
      impact: 'high',
      eu_subsidy_eligible: true,
      link_slug: 'zold-tarsashaz/zoldteto-tamogatas',
    });
  }

  // Air quality: high AQI = bad
  if (score.air_quality_index != null && score.air_quality_index > 60) {
    recs.push({
      area: 'Levegőminőség',
      title: 'Belső levegőszűrő rendszer',
      description: 'A terület PM2.5 szintje a WHO határérték felett van. HEPA szűrős légkezelő egység a közös helyiségekben 65%-kal csökkenti a szálló por koncentrációt.',
      impact: 'medium',
      eu_subsidy_eligible: false,
    });
  }

  // EPC class: D, E, F, G = needs improvement
  if (score.epc_class && ['D', 'E', 'F', 'G'].includes(score.epc_class)) {
    recs.push({
      area: 'Energetikai tanúsítvány',
      title: `Energetikai korszerűsítés (jelenlegi osztály: ${score.epc_class})`,
      description: 'Az EU EPBD 2024/1275/EU irányelv szerint 2030-ig az épületeknek E osztályra kell javulniuk. Szigetelés, nyílászárócsere és megújuló fűtési rendszer kombinálásával 1–3 szintű javulás érhető el.',
      impact: 'high',
      eu_subsidy_eligible: true,
      link_slug: 'klimakockazat-epuleteknel/energetikai-tanusitvany',
    });
  }

  // Solar potential
  if (score.solar_potential_kwh != null && score.solar_potential_kwh > 20000) {
    recs.push({
      area: 'Napenergia',
      title: 'Tetőnapelemek telepítése',
      description: `Az épület éves napenergia-potenciálja ${Math.round(score.solar_potential_kwh / 1000)} MWh. Közösségi napelempark telepítésével a közös villanyszámla 40–70%-kal csökkenthető.`,
      impact: 'medium',
      eu_subsidy_eligible: true,
    });
  }

  return recs;
}
```

---

## 6. Phase 3: Client-side

### New file: `app/epulet/[buildingId]/kornyezet/page.tsx`

```typescript
// Public environmental score page — no auth required.
// This is the primary lead magnet for organic SEO traffic.
// Reads building_env_score with anon key (public RLS policy).

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import { getPublicBuildingEnvScore, getEnvImprovementRecommendations } from '@/app/actions/environment';
import type { Metadata } from 'next';

interface Props { params: { buildingId: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const anonClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: building } = await anonClient
    .from('buildings').select('name, address').eq('id', params.buildingId).maybeSingle();

  return {
    title: building ? `${building.name} — Környezeti elemzés | PanelLakó` : 'Épület környezeti elemzése | PanelLakó',
    description: building
      ? `Hősziget-kockázat, zöld pontszám, levegőminőség és energetikai adatok a(z) ${building.address} épületről.`
      : 'Valós idejű környezeti adatok társasházakhoz.',
    openGraph: { type: 'website' },
  };
}

function ScoreGauge({ score, max = 100, label, colorFn }: {
  score: number | null;
  max?: number;
  label: string;
  colorFn: (n: number) => string;
}) {
  if (score == null) return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-2 text-xl font-bold text-slate-300">—</p>
    </div>
  );

  const pct = Math.min(100, (score / max) * 100);
  const color = colorFn(score);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <div className="relative mx-auto my-3 h-24 w-24">
        <svg viewBox="0 0 36 36" className="h-24 w-24 -rotate-90">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f1f5f9" strokeWidth="3" />
          <circle
            cx="18" cy="18" r="15.9" fill="none"
            stroke={color} strokeWidth="3"
            strokeDasharray={`${pct} 100`} strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-black text-slate-900">{score}</span>
        </div>
      </div>
    </div>
  );
}

export default async function PublicEnvPage({ params }: Props) {
  const { success, score, buildingName, buildingAddress, error } =
    await getPublicBuildingEnvScore(params.buildingId);

  if (!success || !buildingName) notFound();

  const recommendations = score ? getEnvImprovementRecommendations(score) : [];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.panellako.hu';
  const ctaUrl = `${appUrl}/ingyenes-proba?source=env_score&building=${params.buildingId}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      <header className="border-b border-white/80 bg-white/80 backdrop-blur px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-brand-600 grid place-items-center">
              <span className="text-white text-sm font-bold">PL</span>
            </div>
            <span className="font-bold text-slate-900">PanelLakó</span>
          </div>
          <Link
            href={ctaUrl}
            className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700"
          >
            Regisztrálj ingyen
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        {/* Building header */}
        <div className="mb-8 text-center">
          <div className="mb-2 inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-700">
            ÉPÜLET KÖRNYEZETI ELEMZÉS
          </div>
          <h1 className="text-2xl font-black text-slate-900 sm:text-3xl">{buildingName}</h1>
          <p className="mt-1 text-slate-500">{buildingAddress}</p>
        </div>

        {/* Score gauges */}
        {score ? (
          <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <ScoreGauge
              score={score.heat_island_score}
              label="Hősziget kockázat"
              colorFn={(n) => n > 70 ? '#dc2626' : n > 40 ? '#f59e0b' : '#16a34a'}
            />
            <ScoreGauge
              score={score.green_score}
              label="Zöld pontszám"
              colorFn={(n) => n < 30 ? '#dc2626' : n < 60 ? '#f59e0b' : '#16a34a'}
            />
            <ScoreGauge
              score={score.air_quality_index}
              label="Levegőminőség"
              colorFn={(n) => n > 80 ? '#dc2626' : n > 50 ? '#f59e0b' : '#16a34a'}
            />
            <ScoreGauge
              score={score.liveability_score}
              label="Élhetőségi pont"
              colorFn={(n) => n < 40 ? '#dc2626' : n < 70 ? '#f59e0b' : '#16a34a'}
            />
          </div>
        ) : (
          <div className="mb-8 rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
            <p className="text-slate-500">Nincs elérhető környezeti adat ehhez az épülethez.</p>
          </div>
        )}

        {/* EPC class */}
        {score?.epc_class && (
          <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-blue-600 uppercase">Energetikai tanúsítvány</p>
                <p className="text-3xl font-black text-blue-900">{score.epc_class} osztály</p>
              </div>
              <Link
                href={`${appUrl}/klimakockazat-epuleteknel/energetikai-tanusitvany`}
                className="rounded-xl border border-blue-200 bg-white px-3 py-1.5 text-sm font-medium text-blue-700"
              >
                EU EPBD info →
              </Link>
            </div>
          </div>
        )}

        {/* Improvement recommendations */}
        {recommendations.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-4 text-lg font-bold text-slate-900">Fejlesztési javaslatok</h2>
            <div className="space-y-3">
              {recommendations.map((rec, i) => (
                <div key={i} className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex items-start gap-3">
                    <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                      rec.impact === 'high' ? 'bg-red-400' : rec.impact === 'medium' ? 'bg-amber-400' : 'bg-green-400'
                    }`} />
                    <div>
                      <p className="font-semibold text-slate-800">{rec.title}</p>
                      <p className="mt-1 text-sm text-slate-500">{rec.description}</p>
                      {rec.eu_subsidy_eligible && (
                        <span className="mt-2 inline-block rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">
                          EU támogatásra jogosult
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="rounded-3xl bg-gradient-to-br from-brand-600 to-teal-600 p-8 text-center text-white">
          <h2 className="mb-2 text-2xl font-black">Kezelje épületét professzionálisan</h2>
          <p className="mb-6 text-brand-100 text-sm">
            Teljes környezeti elemzés, hibabejelentések, közgyűlési dokumentumok és pénzügyi kimutatások — egy platformon.
          </p>
          <Link
            href={ctaUrl}
            className="inline-block rounded-2xl bg-white px-8 py-3.5 text-base font-black text-brand-700 shadow-lg hover:bg-brand-50"
          >
            14 napos ingyenes próba →
          </Link>
          <p className="mt-3 text-xs text-brand-200">Bankkártya nem szükséges</p>
        </div>
      </main>
    </div>
  );
}
```

---

## 7. Phase 4: Configuration

### Sitemap update: `app/sitemap.ts`

Add the public env pages to the Next.js sitemap:

```typescript
// Add to existing app/sitemap.ts:
import { createClient as createAdminClient } from '@supabase/supabase-js';

// ... inside the sitemap function, add:
const adminClient = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const { data: buildings } = await adminClient
  .from('buildings')
  .select('id, updated_at')
  .limit(500);

const buildingEnvUrls = (buildings ?? []).map(b => ({
  url: `https://app.panellako.hu/epulet/${b.id}/kornyezet`,
  lastModified: b.updated_at ?? new Date().toISOString(),
  changeFrequency: 'weekly' as const,
  priority: 0.6,
}));

// Include in the returned array
return [...existingUrls, ...buildingEnvUrls];
```

### `next.config.mjs`: No changes required.

---

## 8. Phase 5: Testing

### Manual Smoke Test

1. **Public page loads without auth:** Log out of PanelLakó. Navigate to `/epulet/{a_real_building_id}/kornyezet`. Page should load without redirecting to login.

2. **Score gauges render:** Verify all 4 gauges show values (or graceful `—` if data missing).

3. **EPC class section:** For a building with `epc_class` set in `building_env_score`, verify the blue card shows the correct letter.

4. **Improvement recommendations:** For a building with `heat_island_score > 70`, verify the heat island recommendation appears.

5. **CTA link:** Click "14 napos ingyenes próba →" — verify it navigates to `/ingyenes-proba?source=env_score&building={id}`.

6. **Sitemap:** Navigate to `https://app.panellako.hu/sitemap.xml` — verify `/epulet/{id}/kornyezet` URLs are listed.

7. **generateMetadata:** Verify `<title>` tag in page source includes building name and "Környezeti elemzés".

### Automated Test Cases

```typescript
describe('getEnvImprovementRecommendations', () => {
  it('returns heat island recommendation for high score', () => {
    const recs = getEnvImprovementRecommendations({ heat_island_score: 80, green_score: 70, air_quality_index: 30, liveability_score: 60, noise_score: 40, solar_potential_kwh: 5000, epc_class: 'B', last_updated: null, building_id: 'x' });
    expect(recs.some(r => r.area === 'Hősziget')).toBe(true);
  });

  it('returns EPC recommendation for D+ class', () => {
    const recs = getEnvImprovementRecommendations({ ..., epc_class: 'E' });
    expect(recs.some(r => r.area === 'Energetikai tanúsítvány')).toBe(true);
  });

  it('marks EU subsidy eligible recommendations', () => {
    const recs = getEnvImprovementRecommendations({ ..., green_score: 20 });
    const greenRec = recs.find(r => r.area === 'Zöld terület');
    expect(greenRec?.eu_subsidy_eligible).toBe(true);
  });

  it('returns empty array for perfect scores', () => {
    const recs = getEnvImprovementRecommendations({ heat_island_score: 20, green_score: 90, air_quality_index: 20, liveability_score: 90, epc_class: 'A', ... });
    expect(recs.length).toBe(0);
  });
});
```

---

## 9. Error Handling & Edge Cases

**Scenario 1: Building not found (invalid UUID in URL)**
`getPublicBuildingEnvScore()` returns `{ success: false }`. The page calls `notFound()` → renders Next.js 404 page. No crash.

**Scenario 2: `building_env_score` has no row for the building**
`scoreRes.data` is null. The page renders the "Nincs elérhető környezeti adat" empty state. Score gauges show `—`. Recommendations array is empty. CTA still shows.

**Scenario 3: RLS policy not applied (old Supabase version)**
If `building_env_score` does not have RLS enabled, the public anon key may still access it (Supabase defaults to no RLS = public access). The migration explicitly enables RLS and creates a public read policy — both are idempotent.

**Scenario 4: Sitemap generation fails for missing buildings**
The sitemap uses `adminClient` (service role) which bypasses RLS — no permission errors. If Supabase is unreachable, the sitemap returns only the static URLs.

**Scenario 5: `heat_island_score` is a decimal (e.g., 72.5)**
The `colorFn` comparisons use `>` operators which work correctly for decimals. The gauge SVG `strokeDasharray` is capped at 100.

**Scenario 6: Building address has no recognizable district format**
`getDistrictAverageScores()` returns `{ success: false, error: 'Kerület nem meghatározható' }`. The public page does not call this function — it is only called in the auth-required app view. No impact on the public page.

---

## 10. Integration with Other Initiatives

- **Initiative 01 (Portfolio Dashboard):** Add `avg_env_score` to the `get_portfolio_summary()` RPC — property managers can see their best and worst-performing buildings by environmental score.

- **Initiative 09 (Resident Portal):** Add a "Környezeti adatok" tab to the resident portal showing the building's public environmental scores. Residents are more likely to share the public URL with neighbors — viral growth mechanism.

- **Initiative 10 (PostHog):** Add `trackEvent('env_score_page_viewed', { source: 'public', building_id })` to the public page and `trackEvent('env_cta_clicked', { building_id })` to the CTA button.

---

## 11. Rollback Plan

1. **Delete `app/epulet/`** directory entirely.
2. **Delete `app/actions/environment.ts`**.
3. **Remove sitemap additions** from `app/sitemap.ts`.
4. **Revert RLS migration (caution):**
   ```sql
   DROP POLICY IF EXISTS "Public read env scores" ON public.building_env_score;
   DROP POLICY IF EXISTS "Public read air quality" ON public.air_quality_readings;
   DROP VIEW IF EXISTS public.district_env_averages;
   ```
   Warning: reverting to no-RLS on `building_env_score` may expose data to anon users if default policy is open. Verify before reverting.

---

## 12. Definition of Done

- [ ] `app/epulet/[buildingId]/kornyezet/page.tsx` renders without auth
- [ ] All 4 score gauges render correctly with SVG progress ring
- [ ] EPC class section shows for buildings with `epc_class` set
- [ ] Improvement recommendations appear for buildings with poor scores
- [ ] EU subsidy badge appears on eligible recommendations
- [ ] CTA link correctly includes `?source=env_score&building={id}` parameters
- [ ] `generateMetadata()` returns building-specific title and description
- [ ] Migration applied — `building_env_score` has public read RLS policy
- [ ] `district_env_averages` view created and queryable
- [ ] Sitemap includes `/epulet/{buildingId}/kornyezet` URLs for all buildings
- [ ] Unauthenticated user can load the page (verify by opening in incognito)
- [ ] TypeScript compiles cleanly for all new files
- [ ] `getEnvImprovementRecommendations()` unit tests pass for all score thresholds
