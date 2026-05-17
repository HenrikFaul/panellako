# FEATURE PROMPT 07 — Közlekedési Zaj és Forgalom Bejelentő + Zajnaptár

## Áttekintés és szakdolgozati motiváció

A panellako.hu webapp lakóközösségek digitális platformja, amelynek egyik legfontosabb egészségügyi relevanciájú fejlesztési iránya a közvetlen lakókörnyezetet érintő zajterhelés mérhetővé és kezelhetővé tétele. Ez a feature prompt részletesen dokumentálja a **Közlekedési Zaj és Forgalom Bejelentő + Zajnaptár** funkció teljes implementációját, amelynek szakmai hátterét az SZTE Természettudományi és Informatikai Karán készült geoinformatikai szakdolgozat szolgáltatja.

---

## 1. Szakdolgozati és tudományos háttér

### 1.1 Az EEA „Zaj Európában – 2020" tanulmány megállapításai

Az Európai Környezetvédelmi Ügynökség (EEA) 2020-ban kiadott *„Noise in Europe 2020"* tanulmánya — amelyet a szakdolgozat alapdokumentumként idéz — egyértelműen kimondja, hogy a **motorizált közúti forgalom Európa városainak domináns zajforrása**. A főbb megállapítások:

- Az Európai Unióban a közúti forgalomból eredő zajszennyezésnek kitett, 55 dB Lden feletti értékeket tapasztaló városiak száma meghaladja a **100 millió főt**.
- Az éjszakai zajterhelés (Lnight > 50 dB) mintegy **32 millió európait** érint, és közvetlen összefüggésbe hozható alvászavarral, stresszhormon-emelkedéssel, szív- és érrendszeri betegségekkel.
- A vasúti forgalom és a repülőtéri zaj együttesen sem éri el a közúti forgalom okozta zajkitettség szintjét.
- A krónikus zajexpozíció évente mintegy **12 000 idő előtti haláleset** okozója Európában, és hozzájárul 48 000 szívkoszorúér-betegség esethez, valamint 22 millió ember krónikus bosszúságérzetéhez.

A szakdolgozat e tanulmányt idézve hangsúlyozza: *„A közlekedés okozta zajszennyezés európai viszonylatának vizsgálati eredményeit mutatja be az Európai Környezetvédelmi Ügynökség (EEA) 'Zaj Európában – 2020' tanulmány"* — és rámutat, hogy a hazai helyzet nem kedvezőbb az európai átlagnál, különösen Budapest belső kerületeiben és az artériális utak mentén élők számára.

### 1.2 Budapest Stratégiai Zajtérkép (2007/2022)

A szakdolgozat kifejezetten hivatkozik a Budapest Főváros Önkormányzatának **geoportálján** (https://geoportal.budapest.hu) elérhető stratégiai zajtérképre, amelyet a 2002/49/EK irányelv (Environmental Noise Directive) kötelező jelleggel írt elő az EU tagállamai számára. A stratégiai zajtérkép:

- **Lden** (nappali-esti-éjszakai súlyozott hangnyomásszint, dB(A)) — a nap 24 órájára vetített átlagos zajterhelés, az éjszakai 10 dB-es és esti 5 dB-es büntetőszorzóval.
- **Lnight** — kizárólag az éjszakai 22:00–06:00 közötti zajterhelés mértéke.
- Az adatok 10 dB-es sávokban (45–55, 55–65, 65–75, >75 dB) kerülnek megjelenítésre.
- Budapest esetén az első stratégiai zajtérkép 2007-ben készült, frissítése a 2002/49/EK irányelv 5 éves felülvizsgálati kötelezettsége alapján rendszeres.

**A zajtérkép legfontosabb tanulsága:** Budapest belső kerületeiben (V., VI., VII., VIII., IX. kerület), az Andrássy úton, a Nagykörúton, a Rákóczi úton és a főbb hídfőknél **65 dB(A) Lden feletti** zajkitettség jellemző, ami az WHO által egészségkárosítónak nyilvánított 53 dB(A) Lnight határértéket rendszeresen meghaladja.

### 1.3 A forgalomszámlálás és zajadatok megszerzésének nehézségei

A szakdolgozat személyes kutatói tapasztalatként rögzíti a **tényleges forgalmi adatok beszerzésének rendkívüli nehézségét**. A szerző megkísérelte a Duna-hidak forgalmát dokumentáló KTIKÖFE (Közlekedéstudományi Intézet Közlekedésfejlesztési és Értékelési Főosztálya) adatait felhasználni a zajmodellezéshez, de az adatok vagy elavultak, vagy nem publikusan elérhetők, vagy az adatgazdák nem válaszoltak a megkeresésre. Ez a tapasztalat közvetlen motiváció arra, hogy a **közösségi adatgyűjtés** (citizen science) módszerét alkalmazzuk: a lakók maguk rögzítik, mikor, milyen típusú és milyen intenzitású zajjal kénytelenek együtt élni.

### 1.4 A forgalom és zaj/légszennyezés korrelációja

A szakdolgozat részletezi, hogy a közúti forgalom volumene és a levegő- illetve zajszennyezés szintje között **erős pozitív korreláció** mutatható ki. Ez különösen igaz az artériás utak mentén lévő panelházakra:
- Egy forgalmas főút (napi >10 000 jármű) mentén lévő épület homlokzatán a zajterhelés 65–75 dB(A) Lden értéket is elérhet.
- A teherforgalom aránya kritikus: egyetlen nehézjármű akusztikusan kb. 10 személygépkocsinak felel meg.
- Az éjszakai teherforgalom (városba irányuló logisztika, szemétszállítás) az alvászavar egyik leggyakoribb forrása panelkörnyezetben.

### 1.5 Egészségügyi hatások: krónikus zajexpozíció

Az EEA tanulmány és a WHO iránymutatások alapján a tartós zajkitettség az alábbi egészségügyi hatásokat okozza, amelyeket a feature tervezésekor figyelembe kell venni (ezek az információk megjelennek a felhasználói felületen is):

| Zajszint (Lnight) | Egészségügyi hatás |
|---|---|
| < 40 dB | Nem kimutatható hatás |
| 40–55 dB | Alvászavar, kortizolszint-emelkedés, fáradékonyság |
| 55–65 dB | Megnövekedett szívinfarktus-kockázat (15–20%), magas vérnyomás |
| > 65 dB | Komoly szív- és érrendszeri kockázat, immunrendszer-gyengülés, kognitív romlás gyermekeknél |

---

## 2. Magyar jogszabályi háttér

### 2.1 Vonatkozó jogszabályok

A feature jogszabályi beágyazottságát a következő jogforrások adják:

- **4/2011. (I. 14.) VM rendelet** a levegőterheltségi szint és a helyhez kötött légszennyező pontforrások kibocsátásának vizsgálatáról — a zaj tekintetében is hivatkozott jogforrás, összeolvasva a következőkkel.
- **284/2007. (X. 29.) Korm. rendelet** a környezeti zaj értékeléséről és kezeléséről — implementálja a 2002/49/EK irányelvet.
- **27/2008. (XII. 3.) KvVM–EüM együttes rendelet** a környezeti zaj- és rezgésterhelési határértékekről.

### 2.2 Határértékek (a Hatósági Bejelentés Helper alapja)

A 27/2008. KvVM–EüM rendelet alapján a lakóterületi határértékek:

| Időszak | Határérték (dB(A)) |
|---|---|
| Nappal (06:00–22:00) | 55 dB(A) |
| Éjszaka (22:00–06:00) | 45 dB(A) |

A **MSZ EN ISO 1996-2 szabvány** írja elő a mérési módszertant (időtartam, mérőpont elhelyezése, meteorológiai korrekciók).

### 2.3 Panaszkezelési fórumok

1. **Fővárosi Önkormányzat** — stratégiai zajtérkép frissítési kötelezettség, zajcsökkentési akcióterv
2. **Budapest Főváros Kormányhivatala** (hatósági zajvizsgálat elrendelése)
3. **Rendőrség** — azonnali, kirívó zajsértések esetén (koncertek, építkezés éjszaka)
4. **Helyi önkormányzat** — kerületi közterületi építkezések, rendezvények

---

## 3. A feature teljes funkcionális specifikációja

### Feature neve: **Közlekedési Zaj és Forgalom Bejelentő + Zajnaptár**
### Helye az alkalmazásban: Dashboard overview + önálló `/w/:workspaceId/zaj` route
### Prioritás: MAGAS (egészségügyi relevanciájú, közösségépítő, hatósági eljárást segítő)

---

## 4. Adatbázis-séma (Supabase / PostgreSQL)

### 4.1 Enum típusok

```sql
-- Zajkategóriák
CREATE TYPE noise_category AS ENUM (
  'forgalmi_zaj',        -- Közúti forgalom (autók, motorok, kamionok)
  'epitkezesi_zaj',      -- Építkezési tevékenység
  'szorakozohelyi_zaj',  -- Szórakozóhelyek, vendéglők, rendezvények
  'legi_forgalom',       -- Repülőgép, helikopter
  'vasuti_zaj',          -- Vonat, villamos, metró
  'ipari_zaj',           -- Gyárak, ipari létesítmények
  'egyeb'                -- Egyéb azonosítatlan forrás
);

-- Nap szakaszok
CREATE TYPE time_of_day_period AS ENUM (
  'ejszaka',  -- 22:00–06:00
  'reggel',   -- 06:00–10:00
  'nappal',   -- 10:00–18:00
  'este'      -- 18:00–22:00
);

-- Épület zajkockázati kategória (Lden alapján)
CREATE TYPE building_noise_category AS ENUM (
  'A',  -- < 45 dB(A) Lden — csendes
  'B',  -- 45–55 dB(A) — elfogadható
  'C',  -- 55–65 dB(A) — mérsékelten terhelt
  'D',  -- 65–75 dB(A) — erősen terhelt
  'E'   -- > 75 dB(A) — kritikus
);
```

### 4.2 Fő táblák

```sql
-- Zajjelentések (közösségi riporter)
CREATE TABLE noise_reports (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  reporter_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Zajforrás jellemzői
  category          noise_category NOT NULL,
  severity          SMALLINT NOT NULL CHECK (severity BETWEEN 1 AND 5),
  period            time_of_day_period NOT NULL,
  duration_minutes  SMALLINT NOT NULL CHECK (duration_minutes BETWEEN 1 AND 480),
  
  -- Becsült zajszint (opcionális, felhasználói becslés)
  estimated_db      SMALLINT CHECK (estimated_db BETWEEN 30 AND 130),
  
  -- Időbeli adatok
  occurred_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reported_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Szöveges leírás (opcionális)
  description       TEXT CHECK (char_length(description) <= 500),
  
  -- Helyadatok
  latitude          DOUBLE PRECISION,
  longitude         DOUBLE PRECISION,
  
  -- Igazolás (jövőbeli feature: hangminta feltöltés)
  audio_evidence_url TEXT,
  
  -- Metaadatok
  is_recurring      BOOLEAN DEFAULT FALSE,  -- Visszatérő zaj?
  recurring_pattern TEXT,                   -- pl. "minden reggel 6-kor"
  
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Index a heatmap lekérdezésekhez
CREATE INDEX idx_noise_reports_workspace_occurred 
  ON noise_reports(workspace_id, occurred_at DESC);

CREATE INDEX idx_noise_reports_period 
  ON noise_reports(workspace_id, period, category);

-- Épület zajprofil (számított összefoglalás)
CREATE TABLE building_noise_profiles (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      UUID UNIQUE NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  
  -- Stratégiai zajtérkép adatok (kézzel feltöltve vagy API-ból)
  lden_category     building_noise_category,
  lnight_category   building_noise_category,
  lden_value_db     NUMERIC(4,1),    -- pl. 62.5 dB
  lnight_value_db   NUMERIC(4,1),
  noise_map_source  TEXT DEFAULT 'Budapest Geoportal 2007/2022',
  noise_map_url     TEXT DEFAULT 'https://geoportal.budapest.hu',
  noise_map_year    SMALLINT DEFAULT 2022,
  
  -- OSM-alapú forgalombecslés
  osm_road_class    TEXT,   -- motorway, primary, secondary, residential, service
  estimated_daily_vehicles INTEGER,
  
  -- Közösségi adatok összesítése
  community_reports_count      INTEGER DEFAULT 0,
  community_avg_severity       NUMERIC(3,2),
  community_dominant_category  noise_category,
  community_noisiest_period    time_of_day_period,
  
  -- Metaadatok
  last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

-- Hatósági bejelentések nyilvántartása
CREATE TABLE noise_complaints (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id     UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  reporter_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  authority        TEXT NOT NULL,  -- 'fovarosi_onkormanyzat', 'kormányhivatal', 'rendorseg'
  submitted_at     TIMESTAMPTZ,
  reference_number TEXT,           -- hatóság által adott iktatószám
  status           TEXT DEFAULT 'draft',  -- draft, submitted, acknowledged, resolved
  
  -- Összekapcsolt zajjelentések
  related_report_ids UUID[],
  
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Értesítési feliratkozások (szomszéd riasztás)
CREATE TABLE noise_alert_subscriptions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Mikor riasszon?
  alert_on_severity_gte  SMALLINT DEFAULT 4,  -- 4+ csillag zajnál riaszt
  alert_on_categories    noise_category[],     -- NULL = minden kategória
  alert_on_periods       time_of_day_period[], -- NULL = minden időszak
  
  -- Értesítési mód
  push_notifications BOOLEAN DEFAULT TRUE,
  email_alerts       BOOLEAN DEFAULT FALSE,
  
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(workspace_id, user_id)
);
```

### 4.3 Row Level Security (RLS) szabályok

```sql
-- RLS engedélyezése
ALTER TABLE noise_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE building_noise_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE noise_complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE noise_alert_subscriptions ENABLE ROW LEVEL SECURITY;

-- noise_reports: saját épület lakói olvashatják, tagok írhatják
CREATE POLICY "noise_reports_select" ON noise_reports
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "noise_reports_insert" ON noise_reports
  FOR INSERT WITH CHECK (
    reporter_id = auth.uid()
    AND workspace_id IN (
      SELECT workspace_id FROM workspace_memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "noise_reports_update_own" ON noise_reports
  FOR UPDATE USING (reporter_id = auth.uid())
  WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "noise_reports_delete_own" ON noise_reports
  FOR DELETE USING (reporter_id = auth.uid());

-- building_noise_profiles: workspace tagok olvashatják
CREATE POLICY "noise_profiles_select" ON building_noise_profiles
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Csak manager frissítheti a stratégiai zajtérkép adatokat
CREATE POLICY "noise_profiles_manager_upsert" ON building_noise_profiles
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_memberships
      WHERE user_id = auth.uid()
        AND role IN ('kozos_kepviselo', 'megbizott')
        AND status = 'active'
    )
  );

-- noise_complaints: saját és workspace manager látja
CREATE POLICY "noise_complaints_select" ON noise_complaints
  FOR SELECT USING (
    reporter_id = auth.uid()
    OR workspace_id IN (
      SELECT workspace_id FROM workspace_memberships
      WHERE user_id = auth.uid()
        AND role IN ('kozos_kepviselo', 'megbizott')
        AND status = 'active'
    )
  );

CREATE POLICY "noise_complaints_insert" ON noise_complaints
  FOR INSERT WITH CHECK (reporter_id = auth.uid());

-- noise_alert_subscriptions: mindenki csak saját rekordját
CREATE POLICY "noise_subscriptions_own" ON noise_alert_subscriptions
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

### 4.4 Számított nézetek és függvények

```sql
-- Zajjelentések napi összesítője (heatmap-hez)
CREATE OR REPLACE VIEW noise_daily_summary AS
SELECT
  workspace_id,
  DATE(occurred_at AT TIME ZONE 'Europe/Budapest') AS day,
  COUNT(*)                                          AS report_count,
  AVG(severity)                                     AS avg_severity,
  MAX(severity)                                     AS max_severity,
  MODE() WITHIN GROUP (ORDER BY category)           AS dominant_category,
  MODE() WITHIN GROUP (ORDER BY period)             AS dominant_period
FROM noise_reports
GROUP BY workspace_id, DATE(occurred_at AT TIME ZONE 'Europe/Budapest');

-- Óránkénti mintázat (radar chart-hoz)
CREATE OR REPLACE VIEW noise_hourly_pattern AS
SELECT
  workspace_id,
  EXTRACT(HOUR FROM occurred_at AT TIME ZONE 'Europe/Budapest')::INTEGER AS hour_of_day,
  COUNT(*)    AS report_count,
  AVG(severity) AS avg_severity
FROM noise_reports
GROUP BY workspace_id, EXTRACT(HOUR FROM occurred_at AT TIME ZONE 'Europe/Budapest');

-- Épület zajprofil automatikus frissítése trigger-rel
CREATE OR REPLACE FUNCTION refresh_building_noise_profile()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO building_noise_profiles (
    workspace_id,
    community_reports_count,
    community_avg_severity,
    community_dominant_category,
    community_noisiest_period,
    last_calculated_at
  )
  SELECT
    NEW.workspace_id,
    COUNT(*),
    AVG(severity),
    MODE() WITHIN GROUP (ORDER BY category),
    MODE() WITHIN GROUP (ORDER BY period),
    NOW()
  FROM noise_reports
  WHERE workspace_id = NEW.workspace_id
  ON CONFLICT (workspace_id) DO UPDATE SET
    community_reports_count     = EXCLUDED.community_reports_count,
    community_avg_severity      = EXCLUDED.community_avg_severity,
    community_dominant_category = EXCLUDED.community_dominant_category,
    community_noisiest_period   = EXCLUDED.community_noisiest_period,
    last_calculated_at          = EXCLUDED.last_calculated_at,
    updated_at                  = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_refresh_noise_profile
AFTER INSERT OR UPDATE ON noise_reports
FOR EACH ROW EXECUTE FUNCTION refresh_building_noise_profile();
```

---

## 5. TypeScript típusok

```typescript
// lib/types/noise.ts

export type NoiseCategory =
  | 'forgalmi_zaj'
  | 'epitkezesi_zaj'
  | 'szorakozohelyi_zaj'
  | 'legi_forgalom'
  | 'vasuti_zaj'
  | 'ipari_zaj'
  | 'egyeb';

export type TimeOfDayPeriod = 'ejszaka' | 'reggel' | 'nappal' | 'este';

export type BuildingNoiseCategory = 'A' | 'B' | 'C' | 'D' | 'E';

export interface NoiseReport {
  id: string;
  workspace_id: string;
  reporter_id: string;
  category: NoiseCategory;
  severity: 1 | 2 | 3 | 4 | 5;
  period: TimeOfDayPeriod;
  duration_minutes: number;
  estimated_db?: number;
  occurred_at: string;
  reported_at: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  is_recurring: boolean;
  recurring_pattern?: string;
  created_at: string;
}

export interface NoiseReportFormData {
  category: NoiseCategory;
  severity: 1 | 2 | 3 | 4 | 5;
  period: TimeOfDayPeriod;
  duration_minutes: number;
  estimated_db?: number;
  occurred_at: string;
  description?: string;
  is_recurring: boolean;
  recurring_pattern?: string;
}

export interface BuildingNoiseProfile {
  id: string;
  workspace_id: string;
  lden_category?: BuildingNoiseCategory;
  lnight_category?: BuildingNoiseCategory;
  lden_value_db?: number;
  lnight_value_db?: number;
  noise_map_source: string;
  noise_map_url: string;
  noise_map_year: number;
  osm_road_class?: string;
  estimated_daily_vehicles?: number;
  community_reports_count: number;
  community_avg_severity?: number;
  community_dominant_category?: NoiseCategory;
  community_noisiest_period?: TimeOfDayPeriod;
  last_calculated_at: string;
}

export interface NoiseDailySummary {
  workspace_id: string;
  day: string;           // YYYY-MM-DD
  report_count: number;
  avg_severity: number;
  max_severity: number;
  dominant_category: NoiseCategory;
  dominant_period: TimeOfDayPeriod;
}

export interface NoiseHourlyPattern {
  workspace_id: string;
  hour_of_day: number;   // 0–23
  report_count: number;
  avg_severity: number;
}

// Fordítások a UI-hoz
export const NOISE_CATEGORY_LABELS: Record<NoiseCategory, string> = {
  forgalmi_zaj:       'Forgalmi zaj',
  epitkezesi_zaj:     'Építkezési zaj',
  szorakozohelyi_zaj: 'Szórakozóhelyi zaj',
  legi_forgalom:      'Légi forgalom',
  vasuti_zaj:         'Vasúti zaj',
  ipari_zaj:          'Ipari zaj',
  egyeb:              'Egyéb',
};

export const NOISE_CATEGORY_ICONS: Record<NoiseCategory, string> = {
  forgalmi_zaj:       '🚗',
  epitkezesi_zaj:     '🏗️',
  szorakozohelyi_zaj: '🎵',
  legi_forgalom:      '✈️',
  vasuti_zaj:         '🚂',
  ipari_zaj:          '🏭',
  egyeb:              '📢',
};

export const PERIOD_LABELS: Record<TimeOfDayPeriod, string> = {
  ejszaka: 'Éjszaka (22:00–06:00)',
  reggel:  'Reggel (06:00–10:00)',
  nappal:  'Nappal (10:00–18:00)',
  este:    'Este (18:00–22:00)',
};

export const BUILDING_NOISE_CATEGORY_META: Record<
  BuildingNoiseCategory,
  { label: string; color: string; bgClass: string; description: string; lden: string }
> = {
  A: {
    label:       'Csendes',
    color:       '#22c55e',
    bgClass:     'bg-green-500',
    description: 'Kiváló zajkörnyezet, 45 dB(A) Lden alatt',
    lden:        '< 45 dB(A)',
  },
  B: {
    label:       'Elfogadható',
    color:       '#84cc16',
    bgClass:     'bg-lime-500',
    description: 'Enyhén terhelt környezet, EU-előírásoknak megfelel',
    lden:        '45–55 dB(A)',
  },
  C: {
    label:       'Mérsékelten terhelt',
    color:       '#eab308',
    bgClass:     'bg-yellow-500',
    description: 'A WHO-határértéket megközelíti, figyelmet igényel',
    lden:        '55–65 dB(A)',
  },
  D: {
    label:       'Erősen terhelt',
    color:       '#f97316',
    bgClass:     'bg-orange-500',
    description: 'Tartós expozíció szív- és érrendszeri kockázatot jelent',
    lden:        '65–75 dB(A)',
  },
  E: {
    label:       'Kritikus',
    color:       '#ef4444',
    bgClass:     'bg-red-500',
    description: 'Sürgős intézkedés szükséges — EU-határértéket meghaladja',
    lden:        '> 75 dB(A)',
  },
};

// Referencia hangok a decibel-becslő útmutatóhoz
export const DB_REFERENCE_SOUNDS = [
  { db: 30,  label: 'Suttogás',              icon: '🤫' },
  { db: 45,  label: 'Csendes szoba',          icon: '🏠' },
  { db: 60,  label: 'Normál társalgás',        icon: '💬' },
  { db: 70,  label: 'Forgalmas étterem',       icon: '🍽️' },
  { db: 80,  label: 'Városi forgalom',         icon: '🚗' },
  { db: 85,  label: 'Kamion (8 m-re)',         icon: '🚛' },
  { db: 90,  label: 'Metró megérkezése',       icon: '🚇' },
  { db: 95,  label: 'Fúrógép / kalapács',      icon: '🔨' },
  { db: 100, label: 'Pneumatikus bontó',       icon: '⚡' },
  { db: 110, label: 'Repülőgép-felszállás',    icon: '✈️' },
];
```

---

## 6. Server Actions

```typescript
// app/actions/noise.ts
'use server';

import { createServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { NoiseReportFormData } from '@/lib/types/noise';

// ─── Zajjelentés létrehozása ────────────────────────────────────────────────

export async function createNoiseReport(
  workspaceId: string,
  data: NoiseReportFormData
) {
  const supabase = createServerClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  // Tagság-ellenőrzés
  const { data: membership } = await supabase
    .from('workspace_memberships')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .single();

  if (!membership) {
    throw new Error('Nincs jogosultságod ehhez az épülethez.');
  }

  // Nap szakasz meghatározása az occurred_at alapján (ha nincs explicit megadva)
  const occurredDate = new Date(data.occurred_at);
  const hour = occurredDate.getHours();
  let period = data.period;
  if (!period) {
    if (hour >= 22 || hour < 6)  period = 'ejszaka';
    else if (hour < 10)           period = 'reggel';
    else if (hour < 18)           period = 'nappal';
    else                          period = 'este';
  }

  const { error } = await supabase.from('noise_reports').insert({
    workspace_id:      workspaceId,
    reporter_id:       user.id,
    category:          data.category,
    severity:          data.severity,
    period,
    duration_minutes:  data.duration_minutes,
    estimated_db:      data.estimated_db ?? null,
    occurred_at:       data.occurred_at,
    description:       data.description ?? null,
    is_recurring:      data.is_recurring,
    recurring_pattern: data.recurring_pattern ?? null,
  });

  if (error) {
    console.error('[createNoiseReport]', error);
    throw new Error('Hiba a zajjelentés rögzítésekor.');
  }

  // Szomszéd-értesítések kiküldése (aszinkron, Supabase Edge Function)
  await triggerNeighborAlerts(workspaceId, data.severity, data.category);

  revalidatePath(`/w/${workspaceId}`);
  return { success: true };
}

// ─── Zajjelentések lekérdezése (dashboard) ─────────────────────────────────

export async function getNoiseReports(
  workspaceId: string,
  options?: {
    limit?: number;
    since?: string;   // ISO dátum
    category?: string;
  }
) {
  const supabase = createServerClient();

  let query = supabase
    .from('noise_reports')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('occurred_at', { ascending: false });

  if (options?.limit) query = query.limit(options.limit);
  if (options?.since) query = query.gte('occurred_at', options.since);
  if (options?.category) query = query.eq('category', options.category);

  const { data, error } = await query;
  if (error) throw new Error('Hiba a zajjelentések lekérésekor.');
  return data ?? [];
}

// ─── Napi összesítő lekérdezése (zajnaptárhoz) ─────────────────────────────

export async function getNoiseDailySummary(
  workspaceId: string,
  days: number = 90
) {
  const supabase = createServerClient();

  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from('noise_daily_summary')
    .select('*')
    .eq('workspace_id', workspaceId)
    .gte('day', since.toISOString().slice(0, 10))
    .order('day', { ascending: true });

  if (error) throw new Error('Hiba a napi összesítő lekérésekor.');
  return data ?? [];
}

// ─── Szomszéd-értesítések indítása ─────────────────────────────────────────

async function triggerNeighborAlerts(
  workspaceId: string,
  severity: number,
  category: string
) {
  try {
    await fetch(`${process.env.SUPABASE_URL}/functions/v1/noise-neighbor-alert`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ workspaceId, severity, category }),
    });
  } catch (err) {
    // Nem kritikus hiba — a bejelentés mentése már megtörtént
    console.warn('[triggerNeighborAlerts] Edge function hívás sikertelen:', err);
  }
}

// ─── CSV export (admin) ─────────────────────────────────────────────────────

export async function exportNoiseReportsCsv(workspaceId: string) {
  const supabase = createServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Manager jogosultság ellenőrzése
  const { data: membership } = await supabase
    .from('workspace_memberships')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', user.id)
    .in('role', ['kozos_kepviselo', 'megbizott'])
    .single();

  if (!membership) throw new Error('Csak a közös képviselő exportálhat adatokat.');

  const { data: reports } = await supabase
    .from('noise_reports')
    .select(`
      occurred_at, category, severity, period, duration_minutes,
      estimated_db, description, is_recurring
    `)
    .eq('workspace_id', workspaceId)
    .order('occurred_at', { ascending: true });

  // CSV formátum összeállítása
  const headers = [
    'Időpont', 'Kategória', 'Súlyosság (1-5)', 'Napszak',
    'Időtartam (perc)', 'Becsült dB', 'Leírás', 'Visszatérő'
  ];

  const rows = (reports ?? []).map(r => [
    new Date(r.occurred_at).toLocaleString('hu-HU'),
    r.category,
    r.severity,
    r.period,
    r.duration_minutes,
    r.estimated_db ?? '',
    (r.description ?? '').replace(/,/g, ';'),
    r.is_recurring ? 'Igen' : 'Nem',
  ]);

  const csv = [headers, ...rows]
    .map(row => row.join(','))
    .join('\n');

  return csv;
}
```

---

## 7. React komponensek

### 7.1 NoiseLevelBadge — Épület zajkategória jelvény

```tsx
// components/noise/NoiseLevelBadge.tsx
'use client';

import { Volume2 } from 'lucide-react';
import { BUILDING_NOISE_CATEGORY_META } from '@/lib/types/noise';
import type { BuildingNoiseCategory } from '@/lib/types/noise';

interface NoiseLevelBadgeProps {
  category: BuildingNoiseCategory;
  ldenValue?: number;
  compact?: boolean;
  onClick?: () => void;
}

export function NoiseLevelBadge({
  category,
  ldenValue,
  compact = false,
  onClick,
}: NoiseLevelBadgeProps) {
  const meta = BUILDING_NOISE_CATEGORY_META[category];

  if (compact) {
    return (
      <button
        onClick={onClick}
        className={`
          inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold
          text-white shadow-sm transition-transform hover:scale-105
          ${meta.bgClass}
        `}
        title={`Zajkategória: ${meta.label} — ${meta.lden}`}
      >
        <Volume2 size={12} />
        <span>Zaj: {category}</span>
        {ldenValue && <span className="opacity-80">({ldenValue} dB)</span>}
      </button>
    );
  }

  return (
    <div
      className={`
        rounded-xl p-4 text-white shadow-md cursor-pointer
        transition-transform hover:scale-[1.02]
        ${meta.bgClass}
      `}
      onClick={onClick}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-center gap-2 mb-1">
        <Volume2 size={18} />
        <span className="font-bold text-lg">{meta.label}</span>
        <span className="ml-auto text-2xl font-black">{category}</span>
      </div>
      <p className="text-sm opacity-90">{meta.lden} Lden</p>
      <p className="text-xs opacity-75 mt-1">{meta.description}</p>
      <p className="text-xs opacity-60 mt-2">
        Forrás: Budapest Geoportal — Stratégiai Zajtérkép
      </p>
    </div>
  );
}
```

### 7.2 NoiseReporterForm — Közösségi zajriporter űrlap

```tsx
// components/noise/NoiseReporterForm.tsx
'use client';

import { useState, useTransition } from 'react';
import { createNoiseReport } from '@/app/actions/noise';
import {
  NOISE_CATEGORY_LABELS,
  NOISE_CATEGORY_ICONS,
  PERIOD_LABELS,
  DB_REFERENCE_SOUNDS,
} from '@/lib/types/noise';
import type { NoiseCategory, TimeOfDayPeriod } from '@/lib/types/noise';
import { AlertCircle, CheckCircle, Volume2, Clock, Info } from 'lucide-react';

interface NoiseReporterFormProps {
  workspaceId: string;
  onSuccess?: () => void;
}

export function NoiseReporterForm({ workspaceId, onSuccess }: NoiseReporterFormProps) {
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDbGuide, setShowDbGuide] = useState(false);

  // Form állapot
  const [category, setCategory]         = useState<NoiseCategory>('forgalmi_zaj');
  const [severity, setSeverity]         = useState<1|2|3|4|5>(3);
  const [period, setPeriod]             = useState<TimeOfDayPeriod>('nappal');
  const [duration, setDuration]         = useState(15);
  const [estimatedDb, setEstimatedDb]   = useState<number | undefined>();
  const [occurredAt, setOccurredAt]     = useState(
    new Date().toISOString().slice(0, 16)
  );
  const [description, setDescription]   = useState('');
  const [isRecurring, setIsRecurring]   = useState(false);
  const [recurringPattern, setRecurringPattern] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        await createNoiseReport(workspaceId, {
          category,
          severity,
          period,
          duration_minutes: duration,
          estimated_db: estimatedDb,
          occurred_at: new Date(occurredAt).toISOString(),
          description: description.trim() || undefined,
          is_recurring: isRecurring,
          recurring_pattern: isRecurring ? recurringPattern : undefined,
        });
        setSuccess(true);
        onSuccess?.();
        setTimeout(() => setSuccess(false), 4000);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Ismeretlen hiba.');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Zajforrás kategória */}
      <div>
        <label className="block text-sm font-medium text-white/80 mb-2">
          Zajforrás típusa
        </label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {(Object.entries(NOISE_CATEGORY_LABELS) as [NoiseCategory, string][]).map(
            ([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setCategory(key)}
                className={`
                  flex items-center gap-2 p-2.5 rounded-lg text-sm font-medium
                  border transition-all
                  ${category === key
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                    : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                  }
                `}
              >
                <span>{NOISE_CATEGORY_ICONS[key]}</span>
                <span className="truncate">{label}</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* Súlyosság (1–5 csillag) */}
      <div>
        <label className="block text-sm font-medium text-white/80 mb-2">
          Mennyire volt zavaró?
        </label>
        <div className="flex gap-2">
          {([1, 2, 3, 4, 5] as const).map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setSeverity(s)}
              className={`
                flex-1 py-2 rounded-lg text-lg font-bold transition-all
                ${severity >= s
                  ? 'bg-amber-400 text-amber-900 shadow-md'
                  : 'bg-white/10 text-white/30'
                }
              `}
              title={['Alig zavaró', 'Kissé zavaró', 'Közepesen zavaró', 'Nagyon zavaró', 'Elviselhetetlen'][s - 1]}
            >
              ★
            </button>
          ))}
        </div>
        <p className="text-xs text-white/40 mt-1 text-center">
          {['Alig zavaró', 'Kissé zavaró', 'Közepesen zavaró', 'Nagyon zavaró', 'Elviselhetetlen'][severity - 1]}
        </p>
      </div>

      {/* Időszak és időpont */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            <Clock size={14} className="inline mr-1" />
            Mikor történt?
          </label>
          <input
            type="datetime-local"
            value={occurredAt}
            onChange={e => setOccurredAt(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2
                       text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Napszak
          </label>
          <select
            value={period}
            onChange={e => setPeriod(e.target.value as TimeOfDayPeriod)}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2
                       text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            {(Object.entries(PERIOD_LABELS) as [TimeOfDayPeriod, string][]).map(
              ([key, label]) => (
                <option key={key} value={key} className="bg-gray-900">{label}</option>
              )
            )}
          </select>
        </div>
      </div>

      {/* Időtartam */}
      <div>
        <label className="block text-sm font-medium text-white/80 mb-2">
          Mennyi ideig tartott? — <span className="text-amber-400">{duration} perc</span>
        </label>
        <input
          type="range"
          min={1}
          max={240}
          step={5}
          value={duration}
          onChange={e => setDuration(parseInt(e.target.value))}
          className="w-full accent-amber-400"
        />
        <div className="flex justify-between text-xs text-white/30 mt-1">
          <span>1 perc</span>
          <span>1 óra</span>
          <span>4 óra</span>
        </div>
      </div>

      {/* Decibel becslő */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-white/80">
            Becsült hangszint (opcionális)
          </label>
          <button
            type="button"
            onClick={() => setShowDbGuide(!showDbGuide)}
            className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"
          >
            <Info size={12} />
            Referencia hangok
          </button>
        </div>

        {showDbGuide && (
          <div className="mb-3 p-3 rounded-lg bg-amber-950/30 border border-amber-800/30">
            <p className="text-xs text-amber-300 font-medium mb-2">
              Hangszint referencia:
            </p>
            <div className="grid grid-cols-2 gap-1">
              {DB_REFERENCE_SOUNDS.map(ref => (
                <button
                  key={ref.db}
                  type="button"
                  onClick={() => { setEstimatedDb(ref.db); setShowDbGuide(false); }}
                  className="flex items-center gap-2 text-xs text-white/70
                             hover:text-white p-1.5 rounded hover:bg-white/5 text-left"
                >
                  <span>{ref.icon}</span>
                  <span>{ref.label}</span>
                  <span className="ml-auto font-mono text-amber-400">{ref.db} dB</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <input
            type="number"
            min={30}
            max={130}
            value={estimatedDb ?? ''}
            onChange={e => setEstimatedDb(e.target.value ? parseInt(e.target.value) : undefined)}
            placeholder="pl. 80"
            className="w-28 bg-white/5 border border-white/10 rounded-lg px-3 py-2
                       text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <span className="text-sm text-white/50">dB(A)</span>
          {estimatedDb && (
            <span className="text-xs text-white/40">
              ≈ {DB_REFERENCE_SOUNDS.reduce((prev, curr) =>
                Math.abs(curr.db - estimatedDb) < Math.abs(prev.db - estimatedDb)
                  ? curr : prev
              ).label}
            </span>
          )}
        </div>
      </div>

      {/* Leírás */}
      <div>
        <label className="block text-sm font-medium text-white/80 mb-2">
          Megjegyzés (opcionális)
        </label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          maxLength={500}
          rows={3}
          placeholder="pl. Hajnali 4-kor érkező teherautó rendszeresen lerak a ház előtt..."
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2
                     text-white text-sm placeholder-white/25 resize-none
                     focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        <p className="text-right text-xs text-white/30 mt-1">{description.length}/500</p>
      </div>

      {/* Visszatérő zaj */}
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          id="is-recurring"
          checked={isRecurring}
          onChange={e => setIsRecurring(e.target.checked)}
          className="mt-0.5 w-4 h-4 accent-amber-400"
        />
        <div className="flex-1">
          <label htmlFor="is-recurring" className="text-sm font-medium text-white/80">
            Visszatérő, rendszeres zaj
          </label>
          {isRecurring && (
            <input
              type="text"
              value={recurringPattern}
              onChange={e => setRecurringPattern(e.target.value)}
              placeholder="pl. minden reggel 6-kor, hétköznapokon"
              className="mt-2 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2
                         text-white text-sm placeholder-white/25
                         focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          )}
        </div>
      </div>

      {/* Státusz üzenetek */}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-900/30 border border-green-600/30
                        rounded-lg text-green-400 text-sm">
          <CheckCircle size={16} />
          Zajjelentés sikeresen rögzítve! Köszönjük a közösségi adatot.
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-900/30 border border-red-600/30
                        rounded-lg text-red-400 text-sm">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Küldés gomb */}
      <button
        type="submit"
        disabled={isPending}
        className="w-full flex items-center justify-center gap-2 py-3 px-6
                   bg-amber-500 hover:bg-amber-400 disabled:bg-amber-800
                   text-amber-950 font-semibold rounded-xl transition-colors"
      >
        <Volume2 size={18} />
        {isPending ? 'Rögzítés...' : 'Zajjelentés beküldése'}
      </button>

      <p className="text-xs text-white/30 text-center">
        Az épület többi lakója értesítést kaphat a bejelentésről (ha feliratkozott).
        Az adatok csak az épület tagjai számára láthatók.
      </p>
    </form>
  );
}
```

### 7.3 NoiseCalendar — Zajnaptár hőtérkép

A `NoiseCalendar` komponens a meglévő `TicketHeatmap` mintájára épül (azonos hét×nap gridszerkezet, azonos navigációs logika), de az amber/sárga zajszín-palettát és a napi összesítő adatokat használja.

```tsx
// components/noise/NoiseCalendar.tsx
'use client';

import { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { NOISE_CATEGORY_LABELS } from '@/lib/types/noise';
import type { NoiseDailySummary } from '@/lib/types/noise';

const HU_MONTHS = [
  'jan.','feb.','már.','ápr.','máj.','jún.',
  'júl.','aug.','szept.','okt.','nov.','dec.'
];
const DAYS = ['H','K','Sz','Cs','P','Szo','V'];

interface NoiseCalendarProps {
  summaries: NoiseDailySummary[];
}

export function NoiseCalendar({ summaries }: NoiseCalendarProps) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [hovered, setHovered]       = useState<string | null>(null);
  const [mousePos, setMousePos]     = useState({ x: 0, y: 0 });

  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const todayKey = today.toISOString().slice(0, 10);

  // Összesítő térkép
  const countMap   = new Map<string, number>();
  const severityMap = new Map<string, number>();
  const catMap     = new Map<string, string>();
  for (const s of summaries) {
    countMap.set(s.day, s.report_count);
    severityMap.set(s.day, s.avg_severity);
    catMap.set(s.day, s.dominant_category);
  }

  const dow = today.getDay();
  const thisMon = new Date(today);
  thisMon.setDate(today.getDate() - (dow === 0 ? 6 : dow - 1));
  thisMon.setHours(0, 0, 0, 0);

  const viewStart = new Date(thisMon);
  viewStart.setDate(thisMon.getDate() + weekOffset * 7);

  const cells = Array.from({ length: 49 }, (_, i) => {
    const d = new Date(viewStart);
    d.setDate(viewStart.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    return {
      key,
      count:    countMap.get(key) ?? 0,
      severity: severityMap.get(key) ?? 0,
      category: catMap.get(key),
      date:     d,
      isFuture: d > today,
      isToday:  key === todayKey,
    };
  });

  const maxCount = Math.max(1, ...cells.filter(c => !c.isFuture).map(c => c.count));

  function cellColor(count: number, isFuture: boolean, isToday: boolean) {
    if (isToday && count === 0) return 'bg-white/[0.12] ring-1 ring-white/20';
    if (isFuture) return 'bg-white/[0.03] opacity-40';
    if (count === 0) return 'bg-white/[0.06]';
    const v = count / maxCount;
    if (v < 0.2)  return 'bg-amber-950/70';
    if (v < 0.4)  return 'bg-amber-800/75';
    if (v < 0.65) return 'bg-amber-600/80';
    if (v < 0.85) return 'bg-amber-500';
    return 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.7)]';
  }

  const weeks = Array.from({ length: 7 }, (_, w) => {
    const mon = new Date(viewStart);
    mon.setDate(viewStart.getDate() + w * 7);
    const isCurrentWeek =
      mon.toISOString().slice(0, 10) === thisMon.toISOString().slice(0, 10);
    return {
      mon,
      label: `${HU_MONTHS[mon.getMonth()]} ${mon.getDate()}`,
      isCurrentWeek,
    };
  });

  const hoveredCell = hovered ? cells.find(c => c.key === hovered) : undefined;

  return (
    <div className="relative select-none">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-white/80 flex items-center gap-2">
          🗓 Zajnaptár
          <span className="text-xs text-white/40 font-normal">
            (utolsó 7 hét)
          </span>
        </h3>
        <div className="flex gap-1">
          <button
            onClick={() => setWeekOffset(w => w - 1)}
            className="p-1 rounded hover:bg-white/10 text-white/50 transition-colors"
            title="Korábbi hetek"
          >
            <ChevronUp size={14} />
          </button>
          <button
            onClick={() => setWeekOffset(0)}
            className="px-2 py-0.5 text-xs rounded hover:bg-white/10 text-white/40"
            title="Ugrás a mai hétre"
          >
            Ma
          </button>
          <button
            onClick={() => setWeekOffset(w => Math.min(w + 1, 0))}
            className="p-1 rounded hover:bg-white/10 text-white/50 transition-colors"
            title="Következő hetek"
          >
            <ChevronDown size={14} />
          </button>
        </div>
      </div>

      {/* Napok fejléce */}
      <div className="grid mb-1" style={{ gridTemplateColumns: '52px repeat(7, 1fr)' }}>
        <div />
        {DAYS.map(d => (
          <div key={d} className="text-center text-[10px] text-white/30 font-medium">
            {d}
          </div>
        ))}
      </div>

      {/* Hetek sorai */}
      <div className="space-y-1">
        {weeks.map(({ mon, label, isCurrentWeek }, wi) => (
          <div
            key={label}
            className="grid gap-1"
            style={{ gridTemplateColumns: '52px repeat(7, 1fr)' }}
          >
            <div
              className={`
                text-[10px] self-center pr-2 text-right truncate
                ${isCurrentWeek ? 'text-amber-400 font-semibold' : 'text-white/30'}
              `}
            >
              {label}
            </div>
            {DAYS.map((_, di) => {
              const cell = cells[wi * 7 + di];
              return (
                <div
                  key={cell.key}
                  className={`
                    aspect-square rounded-[3px] cursor-pointer transition-transform
                    hover:scale-110 hover:z-10
                    ${cellColor(cell.count, cell.isFuture, cell.isToday)}
                  `}
                  onMouseEnter={e => {
                    setHovered(cell.key);
                    setMousePos({ x: e.clientX, y: e.clientY });
                  }}
                  onMouseLeave={() => setHovered(null)}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Tooltip */}
      {hovered && hoveredCell && (
        <div
          className="fixed z-50 pointer-events-none px-3 py-2 rounded-lg
                     bg-gray-900 border border-white/10 text-xs text-white shadow-xl"
          style={{ left: mousePos.x + 12, top: mousePos.y - 40 }}
        >
          <p className="font-semibold">
            {hoveredCell.date.toLocaleDateString('hu-HU', {
              year: 'numeric', month: 'long', day: 'numeric', weekday: 'short'
            })}
          </p>
          {hoveredCell.count > 0 ? (
            <>
              <p className="text-amber-400">
                {hoveredCell.count} zajjelentés
              </p>
              {hoveredCell.category && (
                <p className="text-white/60">
                  Főleg: {NOISE_CATEGORY_LABELS[hoveredCell.category as keyof typeof NOISE_CATEGORY_LABELS]}
                </p>
              )}
              <p className="text-white/50">
                Átlagos súlyosság: {hoveredCell.severity.toFixed(1)} / 5
              </p>
            </>
          ) : (
            <p className="text-white/40">Nincs bejelentett zaj</p>
          )}
        </div>
      )}

      {/* Jelmagyarázat */}
      <div className="flex items-center gap-2 mt-3 justify-end">
        <span className="text-xs text-white/30">Kevesebb</span>
        {['bg-white/[0.06]', 'bg-amber-950/70', 'bg-amber-800/75', 'bg-amber-600/80', 'bg-amber-400'].map(
          (cls, i) => (
            <div key={i} className={`w-3 h-3 rounded-[2px] ${cls}`} />
          )
        )}
        <span className="text-xs text-white/30">Több</span>
      </div>
    </div>
  );
}
```

### 7.4 NoisePatternChart — Óránkénti mintázat (Recharts)

```tsx
// components/noise/NoisePatternChart.tsx
'use client';

import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { NoiseHourlyPattern } from '@/lib/types/noise';

interface NoisePatternChartProps {
  hourlyData: NoiseHourlyPattern[];
}

// Óra csoportok (4 órás sávok) a radar chart-hoz
const HOUR_GROUPS = [
  { name: '22–02', hours: [22, 23, 0, 1], label: '🌙 Éjjel' },
  { name: '02–06', hours: [2, 3, 4, 5],   label: '🌃 Hajnal' },
  { name: '06–10', hours: [6, 7, 8, 9],   label: '🌅 Reggel' },
  { name: '10–14', hours: [10, 11, 12, 13], label: '☀️ Delelő' },
  { name: '14–18', hours: [14, 15, 16, 17], label: '🌤 Délután' },
  { name: '18–22', hours: [18, 19, 20, 21], label: '🌆 Este' },
];

export function NoisePatternChart({ hourlyData }: NoisePatternChartProps) {
  // Óránkénti adat Map
  const hourMap = new Map(hourlyData.map(h => [h.hour_of_day, h.report_count]));

  const radarData = HOUR_GROUPS.map(g => ({
    subject: g.name,
    label:   g.label,
    count:   g.hours.reduce((sum, h) => sum + (hourMap.get(h) ?? 0), 0),
  }));

  const maxCount = Math.max(1, ...radarData.map(d => d.count));

  return (
    <div className="w-full">
      <h4 className="text-sm font-semibold text-white/80 mb-3 flex items-center gap-2">
        🕐 Zajmintázat napszak szerint
      </h4>
      <ResponsiveContainer width="100%" height={240}>
        <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
          <PolarGrid stroke="rgba(255,255,255,0.1)" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
          />
          <PolarRadiusAxis
            angle={30}
            domain={[0, maxCount]}
            tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }}
          />
          <Radar
            name="Zajjelentések"
            dataKey="count"
            stroke="#f59e0b"
            fill="#f59e0b"
            fillOpacity={0.3}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '12px',
            }}
            formatter={(value: number, name: string, props) => [
              `${value} bejelentés`,
              props.payload.label,
            ]}
          />
        </RadarChart>
      </ResponsiveContainer>

      {/* Szöveges összefoglalás */}
      <div className="grid grid-cols-3 gap-2 mt-2">
        {radarData.map(d => (
          <div
            key={d.subject}
            className={`
              p-2 rounded-lg text-center
              ${d.count === Math.max(...radarData.map(x => x.count))
                ? 'bg-amber-500/20 border border-amber-500/30'
                : 'bg-white/5 border border-white/10'
              }
            `}
          >
            <div className="text-xs text-white/50">{d.label}</div>
            <div className="font-bold text-white text-sm">{d.count}</div>
            <div className="text-[10px] text-white/30">bejelentés</div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 7.5 ComplaintHelper — Hatósági bejelentés segédlet

```tsx
// components/noise/ComplaintHelper.tsx
'use client';

import { useState } from 'react';
import { FileText, ExternalLink, Copy, CheckCircle, ChevronRight } from 'lucide-react';
import type { NoiseReport } from '@/lib/types/noise';
import { NOISE_CATEGORY_LABELS, PERIOD_LABELS } from '@/lib/types/noise';

interface ComplaintHelperProps {
  reports: NoiseReport[];
  buildingAddress: string;
  workspaceName: string;
}

type Authority = 'rendorseg' | 'kormányhivatal' | 'fovarosi_onkormanyzat';

const AUTHORITY_META: Record<Authority, {
  name: string;
  contact: string;
  url: string;
  when: string;
  processingTime: string;
}> = {
  rendorseg: {
    name: 'Rendőrség (107)',
    contact: 'tel:107',
    url: 'https://www.police.hu',
    when: 'Azonnali, kirívó zajsértés esetén (éjszakai építkezés, hangos rendezvény)',
    processingTime: 'Azonnali intézkedés',
  },
  kormányhivatal: {
    name: 'Budapest Főváros Kormányhivatala',
    contact: 'https://bfkh.kormany.hu',
    url: 'https://bfkh.kormany.hu/kornyezeti-ugyek',
    when: 'Hatósági zajvizsgálat kérése, rendszeres jogsértés esetén',
    processingTime: '30 nap (ügyintézési határidő)',
  },
  fovarosi_onkormanyzat: {
    name: 'Budapest Főváros Önkormányzata',
    contact: 'https://budapest.hu',
    url: 'https://budapest.hu/Lapok/hirek.aspx',
    when: 'Stratégiai zajtérkép frissítési igény, zajcsökkentési akcióterv',
    processingTime: '60 nap',
  },
};

function generateComplaintText(
  authority: Authority,
  reports: NoiseReport[],
  buildingAddress: string,
  workspaceName: string
): string {
  const now = new Date().toLocaleDateString('hu-HU', {
    year: 'numeric', month: 'long', day: 'numeric'
  });

  const reportSummary = reports.slice(0, 5).map((r, i) => {
    const date = new Date(r.occurred_at).toLocaleString('hu-HU');
    const cat  = NOISE_CATEGORY_LABELS[r.category] ?? r.category;
    const per  = PERIOD_LABELS[r.period] ?? r.period;
    return `  ${i + 1}. ${date} — ${cat}, ${per}, ${r.duration_minutes} percig, súlyosság: ${r.severity}/5${r.description ? `\n     Megjegyzés: ${r.description}` : ''}`;
  }).join('\n');

  return `Tisztelt Hatóság!

Alulírott, a(z) ${buildingAddress} alatti társasház (${workspaceName}) lakóközösségének tagja, az alábbi zajszennyezési bejelentést teszem.

BEJELENTÉS TÁRGYA: Rendszeres közlekedési és/vagy egyéb zajterhelés, amely meghaladja a 27/2008. (XII. 3.) KvVM–EüM rendeletben megállapított határértékeket.

ÉRINTETT INGATLAN: ${buildingAddress}

RÖGZÍTETT ZAJESEMÉNYEK (összesen ${reports.length} bejelentés, ebből kiemelve):
${reportSummary}

A fentiek alapján kérem a hatóság illetékes szerveinek intézkedését, különösen:
- helyszíni zajmérés elrendelését (MSZ EN ISO 1996-2 szabvány szerint),
- jogsértés esetén szükséges hatósági intézkedések megtételét,
- az eredményről való értesítésemet.

Kelt: Budapest, ${now}

Bejelentő:
[Név]
[Cím: ${buildingAddress}]
[Email / Telefon]`;
}

export function ComplaintHelper({ reports, buildingAddress, workspaceName }: ComplaintHelperProps) {
  const [step, setStep]         = useState<1 | 2 | 3>(1);
  const [authority, setAuthority] = useState<Authority>('rendorseg');
  const [copied, setCopied]     = useState(false);

  const nightReports = reports.filter(r => r.period === 'ejszaka');
  const highSeverityReports = reports.filter(r => r.severity >= 4);
  const isLegallyExceeded = nightReports.length > 0 || highSeverityReports.length >= 3;

  const complaintText = generateComplaintText(authority, reports, buildingAddress, workspaceName);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(complaintText);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="space-y-4">
      {/* Jogszabályi figyelmeztetés */}
      {isLegallyExceeded && (
        <div className="p-3 rounded-xl bg-red-900/20 border border-red-600/30">
          <p className="text-sm font-semibold text-red-400 mb-1">
            ⚠️ Határérték-túllépés valószínűsíthető
          </p>
          <p className="text-xs text-red-300/80">
            {nightReports.length} éjszakai bejelentés rögzítve (határérték: 45 dB(A) éjszaka).
            A 27/2008. KvVM–EüM rendelet alapján hatósági eljárás kezdeményezhető.
          </p>
        </div>
      )}

      {/* Lépések */}
      <div className="flex items-center gap-2 text-xs text-white/40">
        {['Hatóság kiválasztása', 'Beadvány generálása', 'Beküldés'].map((s, i) => (
          <div key={s} className="flex items-center gap-1">
            <div className={`
              w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold
              ${step > i + 1 ? 'bg-green-500 text-white' :
                step === i + 1 ? 'bg-amber-500 text-amber-950' :
                'bg-white/10 text-white/30'}
            `}>
              {step > i + 1 ? '✓' : i + 1}
            </div>
            <span className={step === i + 1 ? 'text-white/70' : ''}>{s}</span>
            {i < 2 && <ChevronRight size={10} />}
          </div>
        ))}
      </div>

      {/* 1. lépés: hatóság */}
      {step === 1 && (
        <div className="space-y-2">
          <p className="text-sm text-white/60">
            Válassza ki a megfelelő hatóságot a zajsértés típusa alapján:
          </p>
          {(Object.entries(AUTHORITY_META) as [Authority, typeof AUTHORITY_META[Authority]][]).map(
            ([key, meta]) => (
              <button
                key={key}
                type="button"
                onClick={() => setAuthority(key)}
                className={`
                  w-full text-left p-3 rounded-xl border transition-all
                  ${authority === key
                    ? 'bg-amber-500/15 border-amber-500/40'
                    : 'bg-white/5 border-white/10 hover:bg-white/8'
                  }
                `}
              >
                <p className="text-sm font-semibold text-white">{meta.name}</p>
                <p className="text-xs text-white/50 mt-0.5">{meta.when}</p>
                <p className="text-xs text-amber-400/70 mt-0.5">
                  Ügyintézési idő: {meta.processingTime}
                </p>
              </button>
            )
          )}
          <button
            onClick={() => setStep(2)}
            className="w-full mt-2 py-2.5 bg-amber-500 hover:bg-amber-400 text-amber-950
                       font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            Beadvány generálása
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* 2. lépés: beadvány */}
      {step === 2 && (
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-white/5 border border-white/10">
            <pre className="text-xs text-white/70 whitespace-pre-wrap font-mono leading-relaxed">
              {complaintText}
            </pre>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="flex-1 flex items-center justify-center gap-2 py-2.5
                         bg-white/10 hover:bg-white/15 text-white rounded-xl
                         transition-colors text-sm font-medium"
            >
              {copied ? <CheckCircle size={14} className="text-green-400" /> : <Copy size={14} />}
              {copied ? 'Másolva!' : 'Másolás vágólapra'}
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5
                         bg-amber-500 hover:bg-amber-400 text-amber-950
                         rounded-xl transition-colors text-sm font-semibold"
            >
              Tovább a beküldéshez
              <ChevronRight size={14} />
            </button>
          </div>
          <button onClick={() => setStep(1)} className="text-xs text-white/30 w-full text-center">
            ← Vissza
          </button>
        </div>
      )}

      {/* 3. lépés: beküldés */}
      {step === 3 && (
        <div className="space-y-3">
          <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-800/30">
            <p className="text-sm font-semibold text-amber-300 mb-2">
              📬 Beküldési lehetőségek
            </p>
            <div className="space-y-2 text-sm text-white/70">
              <p>
                <strong className="text-white/90">Online:</strong>{' '}
                <a
                  href={AUTHORITY_META[authority].url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-400 underline inline-flex items-center gap-1"
                >
                  {AUTHORITY_META[authority].name}
                  <ExternalLink size={10} />
                </a>
              </p>
              <p>
                <strong className="text-white/90">Tértivevényes levél:</strong>{' '}
                Budapest Főváros Kormányhivatala — 1066 Budapest, Teréz krt. 24–26.
              </p>
              <p>
                <strong className="text-white/90">Személyesen:</strong>{' '}
                Előzetes időpont-foglalással (ügyfélszolgálati nyitvatartás szerint)
              </p>
            </div>
          </div>
          <p className="text-xs text-white/40">
            Javaslat: a beadványhoz mellékelje a panellako.hu alkalmazásból exportált
            CSV fájlt is, amely a rögzített zajjelentések pontos időbélyegeivel
            és adataival szolgál bizonyítékként.
          </p>
          <button onClick={() => setStep(1)} className="text-xs text-white/30 w-full text-center">
            ← Vissza az elejére
          </button>
        </div>
      )}
    </div>
  );
}
```

---

## 8. Dashboard integráció

### 8.1 Épület fejlécbe kerülő zajbadge

A `dashboard-client.tsx`-ben a building info section-be integrálni kell a `NoiseLevelBadge` komponenst:

```tsx
// dashboard-client.tsx releváns módosítás (kódrészlet)
import { NoiseLevelBadge } from '@/components/noise/NoiseLevelBadge';

// A building header szekciójában, a meglévő badge-ek mellé:
{noiseProfile?.lden_category && (
  <NoiseLevelBadge
    category={noiseProfile.lden_category}
    ldenValue={noiseProfile.lden_value_db}
    compact
    onClick={() => scrollToSection('noise')}
  />
)}
```

### 8.2 Zajnaptár és riporter szekció a dashboardon

Új `SectionCard` a dashboard overview-ban, az időjárás és a ticket heatmap szomszédságában:

```tsx
{/* Zajnaptár szekció */}
<SectionCard id="noise" title="Közösségi Zajmonitor" icon={<Volume2 size={18} />}>
  <div className="space-y-6">
    {/* Statisztika sorok */}
    <div className="grid grid-cols-3 gap-3">
      <StatTile
        label="Összes bejelentés"
        value={noiseProfile?.community_reports_count ?? 0}
        unit="db"
        color="amber"
      />
      <StatTile
        label="Átlag súlyosság"
        value={noiseProfile?.community_avg_severity?.toFixed(1) ?? '—'}
        unit="/ 5"
        color="amber"
      />
      <StatTile
        label="Zajkategória"
        value={noiseProfile?.lden_category ?? '—'}
        unit="Lden"
        color={noiseProfile?.lden_category === 'E' ? 'red' : 'amber'}
      />
    </div>

    {/* Zajnaptár */}
    <NoiseCalendar summaries={noiseDailySummaries} />

    {/* Napszak mintázat */}
    {noiseHourlyPattern.length > 0 && (
      <NoisePatternChart hourlyData={noiseHourlyPattern} />
    )}

    {/* Zajriporter gomb */}
    <button
      onClick={() => setNoiseReporterOpen(true)}
      className="w-full py-3 rounded-xl bg-amber-500/10 border border-amber-500/20
                 hover:bg-amber-500/20 text-amber-300 font-medium text-sm
                 flex items-center justify-center gap-2 transition-colors"
    >
      <Volume2 size={16} />
      Új zajjelentés beküldése
    </button>
  </div>
</SectionCard>
```

---

## 9. Közúti Forgalom Becslő (OSM-alapú)

```typescript
// lib/noise/traffic-estimator.ts

type OsmRoadClass = 
  | 'motorway' | 'trunk' | 'primary' | 'secondary' 
  | 'tertiary' | 'residential' | 'service' | 'path';

// Az OSM road class alapján becsült napi forgalom és zajhozzájárulás
const ROAD_CLASS_TRAFFIC: Record<OsmRoadClass, {
  dailyVehicles: number;
  noiseLevelLden: number;
  noiseCategory: BuildingNoiseCategory;
  description: string;
}> = {
  motorway:    { dailyVehicles: 80_000, noiseLevelLden: 75, noiseCategory: 'E', description: 'Autópálya' },
  trunk:       { dailyVehicles: 40_000, noiseLevelLden: 70, noiseCategory: 'D', description: 'Főút (autóút)' },
  primary:     { dailyVehicles: 20_000, noiseLevelLden: 68, noiseCategory: 'D', description: 'Elsőrendű főút' },
  secondary:   { dailyVehicles: 10_000, noiseLevelLden: 63, noiseCategory: 'C', description: 'Másodrendű főút' },
  tertiary:    { dailyVehicles:  5_000, noiseLevelLden: 58, noiseCategory: 'C', description: 'Összekötő út' },
  residential: { dailyVehicles:  1_000, noiseLevelLden: 50, noiseCategory: 'B', description: 'Lakóövezeti út' },
  service:     { dailyVehicles:    200, noiseLevelLden: 44, noiseCategory: 'A', description: 'Kiszolgáló út' },
  path:        { dailyVehicles:      0, noiseLevelLden: 38, noiseCategory: 'A', description: 'Gyalogút / kerékpárút' },
};

export function estimateTrafficNoise(osmRoadClass: string): {
  dailyVehicles: number;
  noiseLevelLden: number;
  noiseCategory: BuildingNoiseCategory;
  description: string;
} {
  const key = osmRoadClass as OsmRoadClass;
  return ROAD_CLASS_TRAFFIC[key] ?? ROAD_CLASS_TRAFFIC['residential'];
}

export function getKtikofeDataUrl(lat: number, lon: number): string {
  // KTIKÖFE forgalomszámlálási adatok — ha elérhetők
  return `https://www.ktekombindikator.hu/?lat=${lat}&lon=${lon}`;
}

export function getBudapestGeoportalNoiseUrl(): string {
  return 'https://geoportal.budapest.hu/home/';
}
```

---

## 10. Push értesítési integráció (Edge Function)

```typescript
// supabase/functions/noise-neighbor-alert/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  const { workspaceId, severity, category } = await req.json();

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  // Feliratkozott szomszédok lekérdezése
  const { data: subscriptions } = await supabase
    .from('noise_alert_subscriptions')
    .select('user_id, alert_on_severity_gte, alert_on_categories')
    .eq('workspace_id', workspaceId)
    .eq('is_active', true);

  if (!subscriptions?.length) return new Response('OK');

  // Szűrés súlyosság és kategória alapján
  const eligibleUserIds = subscriptions
    .filter(s => {
      const severityOk = severity >= s.alert_on_severity_gte;
      const categoryOk = !s.alert_on_categories?.length || 
                         s.alert_on_categories.includes(category);
      return severityOk && categoryOk;
    })
    .map(s => s.user_id);

  if (!eligibleUserIds.length) return new Response('OK');

  // App értesítések létrehozása
  const notifications = eligibleUserIds.map(userId => ({
    user_id: userId,
    workspace_id: workspaceId,
    type: 'noise_report',
    title: 'Új zajjelentés az épületben',
    body: `Egy szomszéd ${severity}/5 súlyosságú zajt jelentett be.`,
    data: JSON.stringify({ category, severity }),
  }));

  await supabase.from('notifications').insert(notifications);

  return new Response(JSON.stringify({ notified: eligibleUserIds.length }));
});
```

---

## 11. Admin funkciók

### 11.1 Admin nézet — összes zajjelentés

A közös képviselő számára elérhető `/w/:workspaceId/admin/zaj` route, amely tartalmazza:
- Összes bejelentés időrendi listája (szűrési lehetőségekkel: kategória, időszak, dátumtartomány)
- Aggregált statisztikák: napi/heti/havi trendek
- CSV export gomb (`exportNoiseReportsCsv` server action)
- Épület zajprofil szerkesztése (stratégiai zajtérkép adatok kézi frissítése)
- Hatósági bejelentések nyilvántartása (`noise_complaints` tábla)

### 11.2 CSV export formátum

Az exportált CSV tartalmazza a hatósági beadványhoz szükséges összes adatot:
- Időpont (ISO 8601 formátum), Kategória (magyar megnevezés), Súlyosság (1–5), Napszak, Időtartam (perc), Becsült dB(A), Leírás, Visszatérő (Igen/Nem)

---

## 12. Lokalizáció (i18n)

Minden új felhasználói szöveg hozzáadandó az `src/i18n/resources/en.ts` és `src/i18n/resources/hu.ts` fájlokhoz. Kulcsok:

```typescript
// Magyar (hu.ts) — releváns kulcsok
noise: {
  badge: {
    title: 'Zajkategória',
    source: 'Forrás: Budapest Geoportal',
  },
  categories: {
    forgalmi_zaj: 'Forgalmi zaj',
    epitkezesi_zaj: 'Építkezési zaj',
    szorakozohelyi_zaj: 'Szórakozóhelyi zaj',
    legi_forgalom: 'Légi forgalom',
    vasuti_zaj: 'Vasúti zaj',
    ipari_zaj: 'Ipari zaj',
    egyeb: 'Egyéb',
  },
  form: {
    title: 'Zajjelentés beküldése',
    category: 'Zajforrás típusa',
    severity: 'Mennyire volt zavaró?',
    period: 'Napszak',
    occurredAt: 'Mikor történt?',
    duration: 'Mennyi ideig tartott?',
    estimatedDb: 'Becsült hangszint (opcionális)',
    description: 'Megjegyzés (opcionális)',
    isRecurring: 'Visszatérő, rendszeres zaj',
    submit: 'Zajjelentés beküldése',
    success: 'Zajjelentés sikeresen rögzítve!',
  },
  calendar: {
    title: 'Zajnaptár',
    tooltip: {
      reports: 'zajjelentés',
      noReports: 'Nincs bejelentett zaj',
      avgSeverity: 'Átlagos súlyosság',
      dominant: 'Főleg',
    },
    legend: {
      less: 'Kevesebb',
      more: 'Több',
    },
  },
  pattern: {
    title: 'Zajmintázat napszak szerint',
  },
  complaint: {
    title: 'Hatósági bejelentés',
    step1: 'Hatóság kiválasztása',
    step2: 'Beadvány generálása',
    step3: 'Beküldés',
    exceeded: 'Határérték-túllépés valószínűsíthető',
    copyToClipboard: 'Másolás vágólapra',
    copied: 'Másolva!',
  },
},
```

---

## 13. Sprint terv

### 13.1 Sprint 1 — Adatbázis alapok + Zajriporter (1 hét)

**Célok:**
- Supabase migrációs fájl elkészítése és futtatása (összes tábla, enum, index, RLS, trigger, view)
- TypeScript típusok (`lib/types/noise.ts`)
- Server actions (`app/actions/noise.ts`): `createNoiseReport`, `getNoiseReports`
- `NoiseReporterForm` komponens elkészítése és tesztelése
- `NoiseLevelBadge` komponens (kompakt és teljes változat)
- Dashboard integráció: badge a building header-ben, riporter modal/drawer

**Tesztkritériumok Sprint 1-hez:**
- [ ] Lakó be tud küldeni zajjelentést (kategória, súlyosság, időszak, időtartam megadásával)
- [ ] A beküldött adat megjelenik a `noise_reports` táblában
- [ ] A RLS működik: más workspace tagjai nem látják az adatot
- [ ] A trigger frissíti a `building_noise_profiles` táblát
- [ ] A NoiseLevelBadge megjelenik a dashboard fejlécben (ha van profil adat)
- [ ] Form validáció: kötelező mezők, értéktartomány-ellenőrzés

### 13.2 Sprint 2 — Zajnaptár + Mintázat grafikon (1 hét)

**Célok:**
- `getNoiseDailySummary` és `getNoiseHourlyPattern` server actions (a view-okra támaszkodva)
- `NoiseCalendar` komponens: 7×7 heatmap, hover tooltip, hét-navigáció
- `NoisePatternChart`: Recharts RadarChart integráció, 6 napszak-sáv
- Dashboard szekció: `SectionCard id="noise"` a statisztikákkal, naptárral, mintázattal
- Zajriporter slide-over/modal megfelelő UX-szel (mobilon is működő)
- Szomszéd-értesítési feliratkozás UI (`noise_alert_subscriptions`)

**Tesztkritériumok Sprint 2-hez:**
- [ ] A zajnaptár megjelenít adatot az utolsó 90 napra
- [ ] A hover tooltip helyesen mutatja a napi összesítőt
- [ ] A hét-navigáció (vissza/előre) működik, a "Ma" gomb visszaállít
- [ ] A RadarChart megjelenít óránkénti adatot
- [ ] Mobilon (375px) a komponensek nem lógnak ki, a grid összeszűkül
- [ ] Az értesítési feliratkozás mentése és visszatöltése működik

### 13.3 Sprint 3 — Hatósági Helper + Admin + Export (1 hét)

**Célok:**
- `ComplaintHelper` komponens: 3-lépéses flow, beadvány-generátor, másolás
- `noise_complaints` tábla CRUD (admin nézet)
- CSV export: `exportNoiseReportsCsv` server action
- Admin route `/w/:workspaceId/admin/zaj` — összes bejelentés listája, szűrők
- Supabase Edge Function: `noise-neighbor-alert` (push értesítések)
- Épület zajprofil admin szerkesztése (stratégiai zajtérkép adatok kézi megadása)
- Forgalombecslő: OSM road class alapján becsült Lden és járműszám megjelenítése
- i18n: összes szöveg hozzáadása `en.ts` és `hu.ts` fájlokhoz

**Tesztkritériumok Sprint 3-hez:**
- [ ] A hatósági bejelentés sablonszöveg helyesen tölti ki az épület adatait és a jelent ések listáját
- [ ] A vágólapra másolás működik Chrome, Firefox és Safari böngészőkben
- [ ] Az admin CSV export formátuma megnyitható Excelben UTF-8 BOM fejléccel
- [ ] A szomszéd-értesítő Edge Function megfelelő felhasználóknak küld értesítést
- [ ] A jogosultsági szintek helyesek: lakó nem látja más lakók személyes adatait a listában
- [ ] A browser back gomb a zaj szekció megnyitása után visszavisz (pushState, nem replace)

---

## 14. Tesztkritériumok (összefoglalás)

### Funkcionális tesztek

| # | Tesztelendő | Elvárt eredmény |
|---|---|---|
| F01 | Zajjelentés beküldése kitöltött formmal | Sikerüzenet, adatbázisba kerül, profil frissül |
| F02 | Zajjelentés beküldése hiányos adatokkal | Validációs hibaüzenet, nem kerül be |
| F03 | Más épület lakója megpróbálja beküldeni | 403-as hiba (RLS blokkolja) |
| F04 | Zajnaptár 90 napos időablakra | Helyes napi összesítők, hover tooltip adatok |
| F05 | RadarChart üres adatbázisra | Üres állapot gracefully kezelve (0 értékek) |
| F06 | Hatósági beadvány szöveg generálása | Minden mező kitöltve, érvényes magyar szöveg |
| F07 | CSV export — admin felhasználó | Letöltés indul, fájl helyes formátumú |
| F08 | CSV export — normál lakó | Jogosultságsértési hiba |
| F09 | Szomszéd-értesítő — 4-es súlyosságú bejelentés | Feliratkozott szomszéd kap értesítést |
| F10 | Szomszéd-értesítő — 2-es súlyosságú bejelentés | Feliratkozott szomszéd NEM kap értesítést (küszöb: 4) |

### Teljesítmény és UX tesztek

| # | Tesztelendő | Elvárt eredmény |
|---|---|---|
| P01 | Dashboard betöltése 500+ zajjelentéssel | Heatmap render < 300ms |
| P02 | NoiseCalendar navigáció heti lépéssel | Azonnali, animáció törés nélkül |
| P03 | Mobilnézet (375px szélesség) | Minden komponens scroll nélkül látható, gombok tapinthatók |
| P04 | Browser back gomb a zajriporter megnyitása után | Visszalép az előző route-ra (nem a landingre) |
| P05 | URL nem tartalmaz PII-t | URL csak workspaceId-t tartalmaz, nem user ID-t |

### Egészségügyi és jogi tesztek

| # | Tesztelendő | Elvárt eredmény |
|---|---|---|
| J01 | Éjszakai bejelentésnél jogszabályi figyelmeztetés | ComplaintHelper banner megjelenik |
| J02 | Geoportal link működése | https://geoportal.budapest.hu megnyílik új lapon |
| J03 | dB referencia útmutató megjelenítése | Info panel kinyílik, kattintható hangszint kiválasztás |

---

## 15. Biztonsági és adatvédelmi megfontolások

1. **Anonimitás a listákban:** A zajjelentések a dashboard listájában nem mutatnak reporter nevét — csak az időpontot, kategóriát és súlyosságot. A manager admin nézetben látja a reporter_id-t, de az UX nem tárja fel a nevet.

2. **Helyadatok kezelése:** A `latitude` és `longitude` mezők opcionálisak. Ha az épület fix geocoding-gal rendelkezik (workspace szintű adat), egyedi helyadatot nem tárolunk felhasználónként.

3. **Hangfájl feltöltés (jövő feature):** Az `audio_evidence_url` mező jövőbeli hangminta-bizonyíték tárolására fenntartott. Ha implementálásra kerül, GDPR-kompatibilis törlési mechanizmust kell hozzá implementálni.

4. **Export jogosultság:** A CSV export kizárólag a `kozos_kepviselo` és `megbizott` szerepköröknek elérhető — ez mind az adatvédelmi, mind a GDPR-megfelelési követelményeket teljesíti.

5. **Értesítések opt-in:** A szomszéd-értesítési rendszer teljes egészében opt-in — az alapértelmezett állapot: nincs feliratkozva. A felhasználó bármikor leiratkozhat.

---

## 16. Jövőbeli fejlesztési irányok

1. **Valós dB mérés integrációja:** Ha a böngésző engedélyt kap a mikrofonhoz (`getUserMedia`), egy egyszerű JavaScript-alapú SPL-mérő futtatható, amely a WebAudio API `AnalyserNode` segítségével hozzávetőleges dB(A) értéket mér és automatikusan kitölti a becsült zajszint mezőt.

2. **Budapest Geoportal API integráció:** Ha a Fővárosi Önkormányzat nyilvánossá teszi a stratégiai zajtérkép API-ját (WMS/WFS), az épület koordinátái alapján automatikusan lekérdezhető az Lden és Lnight kategória, így nem szükséges kézi adatbevitel.

3. **Időjárás-korreláció:** A meglévő időjárás-widget adataival (szélirány, csapadék, hőmérséklet) összekapcsolva elemzeni lehet, hogy az ablaknyitás (meleg, szélcsendes idő) hogyan korrelál a zajbejelentések számával — a kapcsolat feltételezhetően erős.

4. **AI-alapú kategorizálás:** Ha hangminta-feltöltés kerül implementálásra, ML modell (pl. YAMNet) segítségével automatikusan kategorizálható a zajforrás.

5. **Közösségi petíció generátor:** Ha egy épületben rövid idő alatt sok súlyos zajbejelentés érkezik, automatikus petíció-sablon generálható a helyi önkormányzathoz.

6. **Zajcsökkentési tippek:** Az épület zajkategóriájához igazodó praktikus tanácsok (zajcsillapított ablakok, zajgátló függönyök, ablakresztor-programok) megjelenítése.

---

## 17. Hivatkozott szakirodalmi és adatforrások

1. **EEA (2020):** *Noise in Europe 2020.* European Environment Agency Report. EEA Report No 22/2019. Copenhagen. URL: https://www.eea.europa.eu/publications/noise-in-europe-2020
2. **WHO (2018):** *Environmental Noise Guidelines for the European Region.* World Health Organization Regional Office for Europe. Copenhagen.
3. **Budapest Geoportal:** Stratégiai Zajtérkép (Lden, Lnight). Budapest Főváros Önkormányzata. URL: https://geoportal.budapest.hu
4. **27/2008. (XII. 3.) KvVM–EüM együttes rendelet** a környezeti zaj- és rezgésterhelési határértékekről.
5. **284/2007. (X. 29.) Korm. rendelet** a környezeti zaj értékeléséről és kezeléséről (2002/49/EK irányelv implementáció).
6. **MSZ EN ISO 1996-2:2017** — Akusztika. A környezeti zaj leírása, mérése és értékelése. 2. rész: A hangnyomásszint meghatározásának módszerei.
7. **SZTE TTK Geoinformatikai szakdolgozat (2020):** Budapest levegőminőségének és zajterhelésének vizsgálata geoinformatikai módszerekkel. Hivatkozik az EEA Noise in Europe 2020 tanulmányra és a Budapest Geoportal stratégiai zajtérkép adatbázisára.

---

## 18. Implementációs ellenőrzőlista

Az alábbi lista a feature teljes körű leszállításakor pipálható ki:

### Adatbázis
- [ ] `supabase/migrations/YYYYMMDD_noise_reporter.sql` migrációs fájl elkészítve és futtatva
- [ ] `noise_reports` tábla, összes mezővel, indexekkel
- [ ] `building_noise_profiles` tábla
- [ ] `noise_complaints` tábla
- [ ] `noise_alert_subscriptions` tábla
- [ ] `noise_daily_summary` nézet
- [ ] `noise_hourly_pattern` nézet
- [ ] `refresh_building_noise_profile()` trigger
- [ ] RLS szabályok minden táblán engedélyezve és tesztelve

### TypeScript
- [ ] `lib/types/noise.ts` — összes type, interface, const
- [ ] `lib/noise/traffic-estimator.ts`

### Server Actions
- [ ] `app/actions/noise.ts`: `createNoiseReport`, `getNoiseReports`, `getNoiseDailySummary`, `exportNoiseReportsCsv`

### Komponensek
- [ ] `components/noise/NoiseLevelBadge.tsx`
- [ ] `components/noise/NoiseReporterForm.tsx`
- [ ] `components/noise/NoiseCalendar.tsx`
- [ ] `components/noise/NoisePatternChart.tsx`
- [ ] `components/noise/ComplaintHelper.tsx`

### Integráció
- [ ] Dashboard fejléc: `NoiseLevelBadge` compact
- [ ] Dashboard overview: zajmonitor `SectionCard`
- [ ] Zajriporter modal/drawer a dashboardon
- [ ] Admin route: `/w/:workspaceId/admin/zaj`

### Edge Function
- [ ] `supabase/functions/noise-neighbor-alert/index.ts`

### i18n
- [ ] `src/i18n/resources/hu.ts` — `noise` namespace összes kulcsa
- [ ] `src/i18n/resources/en.ts` — `noise` namespace összes kulcsa (angol fordítás)

### Dokumentáció
- [ ] `versioning/DDMMYYNNN_vX.Y.Z_noise-reporter.md`
- [ ] `marketing/marketing_values/YYYYMMDD_vX.Y.Z_noise-reporter_marketing_value.md`

---

*Ez a prompt dokumentum a panellako.hu webapp 07-es thesis-feature promptja. Az EEA Noise in Europe 2020 adatai, a Budapest Stratégiai Zajtérkép és a 27/2008. KvVM–EüM rendelet határértékei valós, hivatkozható forrásokból származnak. A közösségi zajriporter rendszer célja, hogy a szakdolgozatban dokumentált adathozzáférési nehézségeket (hatósági forgalmi és zajadatok nem publikus volta) citizen science módszerrel kompenzálja, és a lakóközösségek számára valós, cselekvésre alkalmas zajinformációt biztosítson.*
