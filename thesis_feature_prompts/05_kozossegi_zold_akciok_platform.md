# FEATURE PROMPT 05 — Közösségi Zöld Akciók és Bejelentési Platform

## Áttekintés és motiváció (a szakdolgozat alapján)

A panellako.hu webapp lakóközösségek digitális otthona. Az ötödik thesis-feature a közösség aktív környezeti szerepvállalását teszi lehetővé: egy integrált platformon keresztül a lakók zöld akciókat szervezhetnek, környezeti problémákat jelenthetnek be, és nyomon követhetik az épület kollektív ökológiai lábnyomát.

### A geoinformatikai szakdolgozat releváns megállapításai

A csatolt SZTE-szakdolgozat (Természettudományi és Informatikai Kar, 2020) integratív szemlélettel közelíti meg a városi környezetgazdálkodást. A következő kulcsmegállapítások közvetlenül megalapozzák ezt a feature-t:

**1. Integrált városi környezetgazdálkodás**

A szakdolgozat hangsúlyozza, hogy Budapest zöld fejlesztési kihívásai nem kezelhetők egymástól elszigetelten. A levegőminőség, a zajszennyezés, a kerékpáros infrastruktúra, az igény szerinti közösségi közlekedés és a zöldfelület-gazdálkodás mind egymással összefüggő rendszerek. Az integrált megközelítés lényege: *a közösség mint aktív szereplő*, nem csupán a problémák elszenvedője, hanem azok feltárója és megoldásában résztvevő fél.

**2. Állampolgári tudomány (citizen science) — a megfigyelési hézagok betöltése**

A szakdolgozat részletesen bemutatja, hogy a Greenpeace Magyarország önkéntesei 2019-ben mérőeszközökkel felszerelve végigjárták Budapest forgalmas pontjait, köztük a Blaha Lujza teret. Az eredmény megdöbbentő volt: a Blaha Lujza téri buszmegállóban mért NO₂ és PM2.5 értékek több helyen meghaladták az EU határértékeit, miközben a legközelebbi hivatalos mérőállomás nem regisztrálta ezeket a csúcsokat, mivel más helyen volt elhelyezve.

Ez a példa bizonyítja: *az állampolgári mérés és bejelentés pótolhatatlan szerepet tölt be a hivatalos monitorozás hiányosságainak feltárásában.* A panellako.hu Környezeti Bejelentési Modulja pontosan ezt az elvet viszi digitális platformra: a lakók saját épületük közelében tapasztalt problémákat rögzíthetnek, amelyeket a rendszer aggregál és hatósági bejelentéssé konvertál.

**3. Kerékpárosklub–BKK együttműködés: közösség-vezérelt infrastruktúrafejlesztés**

A szakdolgozat egyik legillusztratívabb esettanulmánya a Budapest Kerékpárosklub és a BKK (Budapesti Közlekedési Központ) közötti együttműködés. A Kerékpárosklub tagjai rendszeresen dokumentálták a kerékpárút-hálózat hiányosságait, veszélyes pontjait és megszakadásait, majd ezeket strukturált formában nyújtották be a BKK-nak. Az eredmény: több kerékpárút-fejlesztési projekt prioritása megváltozott a közösségi visszajelzések alapján.

Ez a modell pontosan az, amit a panellako.hu megvalósít: az épület lakói bejelentik a kerékpárút-problémákat (hiányzó kerékpártároló, veszélyes útszakasz, ellopott kerékpárállvány), a rendszer aggregálja ezeket, és a közös hangot hatásosabban el lehet juttatni a Budapest Közúton keresztül az illetékes szervekhez.

**4. Telebusz rendszer és igény szerinti közlekedés**

A szakdolgozat tárgyalja Budapest telebusz-kísérletét: az igény szerint rendelt minibuszok csökkentik az autóhasználatot, ezáltal a CO₂-kibocsátást és a zajszennyezést. A panellako.hu CO₂-kalkulátora ezt a szemléletet alkalmazza: ha a lakók aktívan választják a kerékpározást vagy a tömegközlekedést, az épület aggregált szén-lábnyoma csökken, és ez a megtakarítás megjelenik a közösségi eredménytáblán.

**5. Zajszennyezés és közösségi bejelentés nehézségei**

A szakdolgozat külön fejezetet szentel a zajszennyezés monitorozásának kihívásaira. A hatósági mérés rendkívül körülményes: a Nemzeti Népegészségügyi Központ (NNK) csak bejelentésre végez mérést, a mérés előtt 24 órával értesíteni kell a zajforrást (pl. szórakozóhelyet), ami a mérés reprezentativitását kérdésessé teszi. A szakdolgozat konklúziója: *a közösségi zajbejelentési rendszer — amelyet a mobiltelefon beépített mikrofonjával rögzített mérések támasztanak alá — sokkal valósabb képet adhat, mint a ritkán elvégzett hatósági mérések.*

A panellako.hu Zajszennyezés Bejelentő almodulja erre a felismerésre épít: a lakók időbélyeggel és helyszínnel ellátott zajbejelentéseket tehetnek, amelyek aggregált formában erősebb bizonyítékot jelentenek egy hatósági eljárásban.

---

## A fejlesztendő feature teljes műszaki specifikációja

### Feature neve: **Közösségi Zöld Akciók és Bejelentési Platform**
### Helye az alkalmazásban: `/w/:workspaceId/green` — Zöld Hub főoldal
### Prioritás: MAGAS (közösségi elköteleződés és ESG-értékajánlat szempontjából)
### Kapcsolódó feature-k: Feature 03 (Közelségi Térkép), Feature 01 (Levegőminőség Widget)

---

## 1. Funkcionális követelmények

### 1.1 Zöld Akció Szervező Modul

#### Akciótípusok (előre definiált kategóriák)

| Kategória kulcs | Magyar megnevezés | Ikon | Alapértelmezett CO₂ hatás |
|----------------|-------------------|------|---------------------------|
| `tree_planting` | Faültetés | 🌳 | 21 kg CO₂/fa/év |
| `recycling` | Szelektív hulladékgyűjtés | ♻️ | 0.5 kg CO₂/kg hulladék |
| `energy_challenge` | Energiatakarékossági kihívás | ⚡ | változó (mérés alapján) |
| `bike_day` | Kerékpáros nap | 🚲 | 0.21 kg CO₂/km |
| `community_garden` | Közösségi kert | 🌱 | 5 kg CO₂/m²/év |
| `cleanup` | Közterület-takarítás | 🧹 | közvetett hatás |
| `insulation_audit` | Szigetelési audit | 🏠 | változó (audit alapján) |

#### Akció létrehozása

A `CreateGreenActionForm` komponens lehetővé teszi:
- Akció típusának kiválasztása (fenti kategóriák)
- Cím és részletes leírás megadása
- Dátum és időpont (datetime picker)
- Helyszín: az épület közös területei közül választható (udvari kert, tároló, közösségi helyiség), vagy külső helyszín szabad szöveggel
- Maximális résztvevőszám (opcionális)
- Szükséges eszközök listája
- Szervező neve (automatikusan kitöltve a bejelentkezett felhasználó alapján)
- Automatikus értesítés: az épület összes lakójának értesítő e-mail és push notification

#### RSVP rendszer

- Lakók jelentkezhetnek: „Részt veszek", „Érdeklőd" (tentative), „Nem tudok részt venni"
- Kapacitás-limit esetén várólistára kerülnek
- Emlékeztető értesítés: 24 órával és 2 órával az esemény előtt
- Lemondási lehetőség az esemény kezdete előtt 4 órával

#### Részvétel rögzítése

- Az akció szervezője az esemény napján „Megkezdte" státuszba helyezi
- Utána: résztvevők ténylegesen megjelent számának rögzítése
- CO₂/környezeti hatás automatikus kiszámítása a résztvevők és akciótípus alapján
- Eredmény automatikusan felkerül a Zöld Eredménytáblára

### 1.2 Zöld Eredménytábla (Green Scoreboard)

Az épület összesített zöld teljesítménye, amely az összes lakó összes akciójából aggregálódik:

**Fő mutatószámok (KPI-ok):**
- Elültetett fák száma (db)
- Összesített CO₂-megtakarítás (kg)
- Összegyűjtött hulladék (kg, bontva: papír, műanyag, üveg, fém, elektronikai)
- Kerékpározással megtett távolság (km)
- Közösségi kert területe (m²)
- Lebonyolított akciók száma
- Egyedi résztvevők száma (hány különböző lakó vett részt legalább egy akcióban)

**Időbeli nézetek:**
- Havi összesítő
- Éves összesítő
- Teljes idő (az épület regisztrációja óta)

**Havi Zöld Jelentés Kártya:**
- PDF vagy képes összefoglaló, amelyet az admin megoszthat a közösséggel
- Tartalmazza a havi top akciót, a legtöbb résztvevőt, és a CO₂-megtakarítást
- Automatikus generálás minden hónap elsején

**Gamifikációs rendszer — épületjelvények:**

| Jelvény neve | Feltétel | Szín |
|--------------|----------|------|
| Zöld Csíra (Bronze) | 5 lebonyolított akció | #cd7f32 |
| Zöld Hajtás (Silver) | 15 akció + 100 kg CO₂ megtakarítva | #c0c0c0 |
| Zöld Bajnok (Gold) | 30 akció + 500 kg CO₂ + 10 különböző lakó | #ffd700 |
| Zöld Mester (Platinum) | 50 akció + 1000 kg CO₂ + 50% lakói részvétel | #e5e4e2 |

### 1.3 Környezeti Bejelentési Modul

#### Bejelentés-kategóriák

| Kategória | Almodul | Prioritás |
|-----------|---------|-----------|
| `illegal_dumping` | Illegális hulladéklerakás | Magas |
| `cycling_infra` | Kerékpárút/infrastruktúra probléma | Közepes |
| `noise_pollution` | Zajszennyezés esemény | Magas |
| `air_quality` | Levegőminőség-aggály | Közepes |
| `broken_lighting` | Elromlott közvilágítás | Közepes |
| `abandoned_vehicle` | Elhagyott jármű | Alacsony |
| `green_space` | Zöldterületi probléma | Alacsony |
| `other` | Egyéb | Alacsony |

#### Bejelentési adatok

- **Kategória**: legördülő lista
- **Cím**: rövid, max 100 karakter
- **Leírás**: részletes szöveg, max 2000 karakter
- **Fotók**: max 5 kép, egyenként max 10 MB (Supabase Storage-ba tölti fel, automatikus tömörítés 1200px-re)
- **GPS koordináták**: a böngésző Geolocation API-val automatikusan javasolt, manuálisan módosítható
- **Helyszín leírás**: szabad szöveges pontosítás (pl. „Az épület mögötti parkoló sarkán")
- **Időbélyeg**: automatikus (bejelentés időpontja), plusz opcionális „Mikor történt?" mező
- **Nyilvánossági szint**: „Csak az épület lakói látják" vs. „Közösségi térkép" (Feature 03 integrál)
- **Hatósági integrációs szándék**: jelölőnégyzet — „Kérem, hogy a rendszer megossza ezt Budapest Közút / Önkormányzattal"

#### Bejelentés státuszai

| Státusz | Szín | Leírás |
|---------|------|--------|
| `new` | Kék | Éppen beérkezett |
| `in_progress` | Narancs | Feldolgozás alatt / hatósághoz forwarding |
| `resolved` | Zöld | Megoldva |
| `rejected` | Piros | Elutasítva (indoklással) |
| `forwarded` | Lila | Hatósághoz továbbítva |

#### Statisztikák

- Leggyakoribb bejelentés-típusok (donut chart)
- Átlagos megoldási idő kategóriánként (bar chart)
- Havi bejelentés-trend (line chart)
- Megoldási arány (gauge)

### 1.4 CO₂ Megtakarítás Kalkulátor

#### Közlekedési módok és CO₂ faktorok

| Közlekedési mód | CO₂ (kg/km) | Megjegyzés |
|----------------|-------------|------------|
| Személyautó (átlag) | 0.192 | EU átlag, 2023 |
| Motorkerékpár | 0.103 | |
| Villamos | 0.029 | Budapest, MVM mix |
| Metro | 0.025 | Budapest |
| Busz (dízel) | 0.089 | BKK átlag |
| Kerékpár | 0.000 | Nulla közvetlen kibocsátás |
| Gyaloglás | 0.000 | |
| BKK e-busz | 0.018 | |

#### Kalkulátor funkciói

- **Személyes beviteli form**: napi munkába járás távolsága (km), jelenlegi közlekedési mód, alternatív mód
- **Heti megtakarítás**: ha kerékpárral megy a munkába X nap/héten
- **Éves projekció**: CO₂ és BKK bérlet megtakarítás (Ft-ban)
- **Épület aggregát**: ha az épület összes lakója megtenné, X tonna CO₂/évvel kevesebb
- **Budapest átlag összehasonlítás**: az épület teljesítménye vs. Budapest átlagos panel épület
- **BKK bérlet kalkul integráció**: jelzés a havi BKK bérlet megtérülési idejére

---

## 2. Adatbázis séma (Supabase)

### 2.1 Táblák

```sql
-- Zöld akciók főtábla
CREATE TABLE public.green_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  action_type TEXT NOT NULL CHECK (action_type IN (
    'tree_planting','recycling','energy_challenge',
    'bike_day','community_garden','cleanup','insulation_audit'
  )),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 3 AND 150),
  description TEXT,
  location_description TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 120,
  max_participants INTEGER,
  required_tools TEXT[],
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN (
    'upcoming','in_progress','completed','cancelled'
  )),
  actual_participants_count INTEGER,
  -- Környezeti hatás mezők (kitöltve az akció lezárásakor)
  co2_saved_kg NUMERIC(10,3),
  trees_planted INTEGER,
  waste_collected_kg NUMERIC(10,3),
  distance_cycled_km NUMERIC(10,3),
  garden_area_sqm NUMERIC(10,3),
  -- Metaadatok
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_rule TEXT, -- iCal RRULE formátum
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Résztvevők (RSVP)
CREATE TABLE public.green_action_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id UUID NOT NULL REFERENCES public.green_actions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'going' CHECK (status IN (
    'going','interested','not_going','waitlist'
  )),
  actually_attended BOOLEAN,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(action_id, user_id)
);

-- Környezeti bejelentések
CREATE TABLE public.environmental_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  reported_by UUID NOT NULL REFERENCES auth.users(id),
  category TEXT NOT NULL CHECK (category IN (
    'illegal_dumping','cycling_infra','noise_pollution',
    'air_quality','broken_lighting','abandoned_vehicle',
    'green_space','other'
  )),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 3 AND 100),
  description TEXT NOT NULL CHECK (char_length(description) BETWEEN 10 AND 2000),
  -- Helyszín
  lat NUMERIC(10,7),
  lng NUMERIC(10,7),
  location_description TEXT,
  -- Időzítés
  incident_at TIMESTAMPTZ, -- Mikor történt (ha eltér a bejelentéstől)
  -- Státusz
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN (
    'new','in_progress','resolved','rejected','forwarded'
  )),
  resolution_note TEXT,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  -- Hatósági integráció
  forward_to_authority BOOLEAN DEFAULT FALSE,
  authority_reference_id TEXT, -- Budapest Közút ticket szám
  forwarded_at TIMESTAMPTZ,
  -- Nyilvánosság
  visibility TEXT NOT NULL DEFAULT 'building' CHECK (visibility IN ('building','community_map','private')),
  -- Metaadatok
  is_anonymous BOOLEAN DEFAULT FALSE,
  upvotes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bejelentés fájlmellékletek
CREATE TABLE public.report_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.environmental_reports(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL, -- Supabase Storage path
  file_name TEXT NOT NULL,
  file_size_bytes INTEGER,
  mime_type TEXT,
  width_px INTEGER,
  height_px INTEGER,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Épület zöld jelvények
CREATE TABLE public.green_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  badge_key TEXT NOT NULL CHECK (badge_key IN (
    'green_sprout','green_shoot','green_champion','green_master'
  )),
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  snapshot_co2_kg NUMERIC(10,3),
  snapshot_actions_count INTEGER,
  snapshot_participants_count INTEGER,
  UNIQUE(workspace_id, badge_key)
);

-- CO₂ megtakarítás napló
CREATE TABLE public.co2_savings_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  transport_mode TEXT NOT NULL CHECK (transport_mode IN (
    'car','motorcycle','tram','metro','bus_diesel',
    'bicycle','walking','e_bus','bkk_pass'
  )),
  distance_km NUMERIC(8,2) NOT NULL,
  reference_mode TEXT NOT NULL DEFAULT 'car', -- mihez viszonyítjuk
  co2_saved_kg NUMERIC(8,4) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, log_date, transport_mode)
);

-- Bejelentés szavazatok (upvote)
CREATE TABLE public.report_upvotes (
  report_id UUID NOT NULL REFERENCES public.environmental_reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (report_id, user_id)
);
```

### 2.2 Indexek

```sql
CREATE INDEX idx_green_actions_workspace ON public.green_actions(workspace_id);
CREATE INDEX idx_green_actions_scheduled ON public.green_actions(scheduled_at);
CREATE INDEX idx_green_actions_status ON public.green_actions(status);
CREATE INDEX idx_env_reports_workspace ON public.environmental_reports(workspace_id);
CREATE INDEX idx_env_reports_category ON public.environmental_reports(category);
CREATE INDEX idx_env_reports_status ON public.environmental_reports(status);
CREATE INDEX idx_env_reports_location ON public.environmental_reports USING GIST (
  point(lng, lat)
) WHERE lat IS NOT NULL AND lng IS NOT NULL;
CREATE INDEX idx_co2_log_user_date ON public.co2_savings_log(user_id, log_date);
CREATE INDEX idx_co2_log_workspace ON public.co2_savings_log(workspace_id);
```

### 2.3 Row Level Security (RLS) szabályok

```sql
-- green_actions RLS
ALTER TABLE public.green_actions ENABLE ROW LEVEL SECURITY;

-- Saját workspace lakói látják az akciókat
CREATE POLICY "green_actions_select_workspace_members"
  ON public.green_actions FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

-- Csak workspace tagok hozhatnak létre akciót
CREATE POLICY "green_actions_insert_members"
  ON public.green_actions FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

-- Csak a szervező vagy admin módosíthatja
CREATE POLICY "green_actions_update_creator_or_admin"
  ON public.green_actions FOR UPDATE
  USING (
    created_by = auth.uid()
    OR workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND role IN ('admin','manager')
    )
  );

-- environmental_reports RLS
ALTER TABLE public.environmental_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "env_reports_select_workspace_members"
  ON public.environmental_reports FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "env_reports_insert_members"
  ON public.environmental_reports FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
    AND reported_by = auth.uid()
  );

-- Csak admin változtathatja a státuszt
CREATE POLICY "env_reports_update_admin"
  ON public.environmental_reports FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid() AND role IN ('admin','manager')
    )
  );

-- co2_savings_log RLS
ALTER TABLE public.co2_savings_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "co2_log_select_workspace_members"
  ON public.co2_savings_log FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "co2_log_insert_own"
  ON public.co2_savings_log FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND workspace_id IN (
      SELECT workspace_id FROM public.workspace_members
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "co2_log_update_own"
  ON public.co2_savings_log FOR UPDATE
  USING (user_id = auth.uid());
```

### 2.4 Aggregáló View-k

```sql
-- Épület összesített zöld statisztikái
CREATE OR REPLACE VIEW public.workspace_green_stats AS
SELECT
  ga.workspace_id,
  COUNT(DISTINCT ga.id) FILTER (WHERE ga.status = 'completed') AS completed_actions,
  COUNT(DISTINCT gap.user_id) FILTER (WHERE gap.actually_attended = TRUE) AS unique_participants,
  COALESCE(SUM(ga.co2_saved_kg), 0) AS total_co2_kg,
  COALESCE(SUM(ga.trees_planted), 0) AS total_trees,
  COALESCE(SUM(ga.waste_collected_kg), 0) AS total_waste_kg,
  COALESCE(SUM(ga.distance_cycled_km), 0) AS total_distance_km,
  COALESCE(SUM(co2.co2_saved_kg), 0) AS transport_co2_kg
FROM public.green_actions ga
LEFT JOIN public.green_action_participants gap ON ga.id = gap.action_id
LEFT JOIN public.co2_savings_log co2 ON co2.workspace_id = ga.workspace_id
GROUP BY ga.workspace_id;
```

---

## 3. React komponensek

### 3.1 GreenActionsHub — Fő Hub komponens

```tsx
// src/app/(app)/w/[workspaceId]/green/page.tsx
import { Suspense } from 'react'
import { createServerComponentClient } from '@/lib/supabase/server'
import { GreenActionsHub } from '@/components/green/GreenActionsHub'
import { GreenScorecard } from '@/components/green/GreenScorecard'
import { redirect } from 'next/navigation'

interface PageProps {
  params: { workspaceId: string }
  searchParams: { tab?: string }
}

export default async function GreenHubPage({ params, searchParams }: PageProps) {
  const supabase = createServerComponentClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const activeTab = searchParams.tab ?? 'actions'

  // Workspace-tagság ellenőrzés
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', params.workspaceId)
    .eq('user_id', user.id)
    .single()

  if (!membership) redirect('/app')

  // Párhuzamos adatlekérés
  const [actionsRes, statsRes, reportsRes] = await Promise.all([
    supabase
      .from('green_actions')
      .select(`
        *,
        creator:created_by(full_name, avatar_url),
        participants:green_action_participants(
          user_id, status, actually_attended
        )
      `)
      .eq('workspace_id', params.workspaceId)
      .gte('scheduled_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .order('scheduled_at', { ascending: true }),
    supabase
      .from('workspace_green_stats')
      .select('*')
      .eq('workspace_id', params.workspaceId)
      .single(),
    supabase
      .from('environmental_reports')
      .select('id, category, status, created_at, title')
      .eq('workspace_id', params.workspaceId)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero szekció */}
      <div className="bg-gradient-to-br from-green-700 via-green-600 to-emerald-500 text-white px-4 py-8 md:px-8">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold mb-1">
            Zöld Akciók & Bejelentések
          </h1>
          <p className="text-green-100 text-sm md:text-base">
            Közösen formáljuk zöldebb épületünk és szomszédságunk jövőjét
          </p>
        </div>
      </div>

      {/* Scorecard összefoglaló */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 -mt-4">
        <Suspense fallback={<ScorecardSkeleton />}>
          <GreenScorecard
            stats={statsRes.data}
            workspaceId={params.workspaceId}
          />
        </Suspense>
      </div>

      {/* Tab navigáció */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 mt-6">
        <GreenActionsHub
          workspaceId={params.workspaceId}
          initialActions={actionsRes.data ?? []}
          initialReports={reportsRes.data ?? []}
          userRole={membership.role}
          userId={user.id}
          activeTab={activeTab}
        />
      </div>
    </div>
  )
}
```

### 3.2 CreateGreenActionForm — Akció létrehozási űrlap

```tsx
// src/components/green/CreateGreenActionForm.tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createGreenAction } from '@/app/actions/green-actions'
import { ACTION_TYPES, type ActionType } from '@/lib/green/constants'
import { useI18n } from '@/i18n/hooks'
import {
  Calendar, MapPin, Users, Wrench, Leaf, X, Plus
} from 'lucide-react'

interface CreateGreenActionFormProps {
  workspaceId: string
  onSuccess?: () => void
}

const ACTION_TYPE_ICONS: Record<ActionType, string> = {
  tree_planting: '🌳',
  recycling: '♻️',
  energy_challenge: '⚡',
  bike_day: '🚲',
  community_garden: '🌱',
  cleanup: '🧹',
  insulation_audit: '🏠',
}

export function CreateGreenActionForm({
  workspaceId,
  onSuccess,
}: CreateGreenActionFormProps) {
  const { t } = useI18n()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [selectedType, setSelectedType] = useState<ActionType | null>(null)
  const [tools, setTools] = useState<string[]>([])
  const [newTool, setNewTool] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleAddTool = () => {
    if (newTool.trim() && !tools.includes(newTool.trim())) {
      setTools(prev => [...prev, newTool.trim()])
      setNewTool('')
    }
  }

  const handleRemoveTool = (tool: string) => {
    setTools(prev => prev.filter(t => t !== tool))
  }

  async function handleSubmit(formData: FormData) {
    setErrors({})
    formData.set('workspace_id', workspaceId)
    formData.set('action_type', selectedType ?? '')
    tools.forEach(tool => formData.append('required_tools[]', tool))

    startTransition(async () => {
      const result = await createGreenAction(formData)
      if (result.error) {
        setErrors(result.fieldErrors ?? { general: result.error })
        return
      }
      // pushState — Back gomb működik
      const next = new URLSearchParams(searchParams.toString())
      next.set('tab', 'actions')
      router.push(`/w/${workspaceId}/green?${next.toString()}`)
      onSuccess?.()
    })
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
        <Leaf className="w-5 h-5 text-green-600" />
        {t('green.createAction.title')}
      </h2>

      <form action={handleSubmit} className="space-y-6">
        {/* Akció típusa */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            {t('green.createAction.typeLabel')} *
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ACTION_TYPES.map((type) => (
              <button
                key={type.key}
                type="button"
                onClick={() => setSelectedType(type.key)}
                className={`
                  flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-sm
                  transition-all duration-150
                  ${selectedType === type.key
                    ? 'border-green-500 bg-green-50 text-green-800'
                    : 'border-gray-200 hover:border-green-300 text-gray-600'
                  }
                `}
              >
                <span className="text-2xl">{ACTION_TYPE_ICONS[type.key]}</span>
                <span className="font-medium text-center leading-tight">{type.label}</span>
                <span className="text-xs text-gray-400">{type.co2Label}</span>
              </button>
            ))}
          </div>
          {errors.action_type && (
            <p className="mt-1 text-sm text-red-600">{errors.action_type}</p>
          )}
        </div>

        {/* Cím */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            {t('green.createAction.titleLabel')} *
          </label>
          <input
            id="title"
            name="title"
            type="text"
            maxLength={150}
            placeholder={t('green.createAction.titlePlaceholder')}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm
                       focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
          {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
        </div>

        {/* Leírás */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            {t('green.createAction.descriptionLabel')}
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            placeholder={t('green.createAction.descriptionPlaceholder')}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm
                       focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                       resize-none"
          />
        </div>

        {/* Dátum és helyszín egy sorban (desktop), külön (mobile) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="scheduled_at" className="block text-sm font-medium text-gray-700 mb-1">
              <Calendar className="w-4 h-4 inline mr-1" />
              {t('green.createAction.dateLabel')} *
            </label>
            <input
              id="scheduled_at"
              name="scheduled_at"
              type="datetime-local"
              min={new Date().toISOString().slice(0, 16)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label htmlFor="duration_minutes" className="block text-sm font-medium text-gray-700 mb-1">
              {t('green.createAction.durationLabel')}
            </label>
            <select
              id="duration_minutes"
              name="duration_minutes"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="60">1 óra</option>
              <option value="120" selected>2 óra</option>
              <option value="180">3 óra</option>
              <option value="240">4 óra</option>
              <option value="480">Egész nap (8 óra)</option>
            </select>
          </div>
        </div>

        {/* Helyszín */}
        <div>
          <label htmlFor="location_description" className="block text-sm font-medium text-gray-700 mb-1">
            <MapPin className="w-4 h-4 inline mr-1" />
            {t('green.createAction.locationLabel')}
          </label>
          <input
            id="location_description"
            name="location_description"
            type="text"
            placeholder={t('green.createAction.locationPlaceholder')}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm
                       focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* Max résztvevők */}
        <div>
          <label htmlFor="max_participants" className="block text-sm font-medium text-gray-700 mb-1">
            <Users className="w-4 h-4 inline mr-1" />
            {t('green.createAction.maxParticipantsLabel')}
          </label>
          <input
            id="max_participants"
            name="max_participants"
            type="number"
            min={1}
            max={500}
            placeholder={t('green.createAction.maxParticipantsPlaceholder')}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm
                       focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* Szükséges eszközök */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Wrench className="w-4 h-4 inline mr-1" />
            {t('green.createAction.toolsLabel')}
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newTool}
              onChange={e => setNewTool(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTool())}
              placeholder={t('green.createAction.toolsPlaceholder')}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm
                         focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button
              type="button"
              onClick={handleAddTool}
              className="flex items-center gap-1 px-3 py-2 bg-green-50 text-green-700
                         rounded-lg text-sm font-medium hover:bg-green-100 transition"
            >
              <Plus className="w-4 h-4" />
              Hozzáad
            </button>
          </div>
          {tools.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tools.map(tool => (
                <span key={tool}
                  className="inline-flex items-center gap-1 px-2.5 py-1
                             bg-green-100 text-green-800 rounded-full text-xs font-medium"
                >
                  {tool}
                  <button type="button" onClick={() => handleRemoveTool(tool)}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Hibák */}
        {errors.general && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {errors.general}
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-sm
                       font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={isPending || !selectedType}
            className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl text-sm
                       font-semibold hover:bg-green-700 disabled:opacity-50
                       disabled:cursor-not-allowed transition"
          >
            {isPending ? t('green.createAction.saving') : t('green.createAction.submit')}
          </button>
        </div>
      </form>
    </div>
  )
}
```

### 3.3 EnvironmentalReportForm — Környezeti bejelentési űrlap fotófeltöltéssel

```tsx
// src/components/green/EnvironmentalReportForm.tsx
'use client'

import { useState, useRef, useTransition, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { submitEnvironmentalReport } from '@/app/actions/environmental-reports'
import { Camera, MapPin, X, AlertTriangle, Upload } from 'lucide-react'
import { useI18n } from '@/i18n/hooks'
import { compressImage } from '@/lib/images/compress'

const REPORT_CATEGORIES = [
  { key: 'illegal_dumping',  label: 'Illegális hulladéklerakás', icon: '🗑️', priority: 'high' },
  { key: 'cycling_infra',   label: 'Kerékpárút/infrastruktúra',  icon: '🚲', priority: 'medium' },
  { key: 'noise_pollution', label: 'Zajszennyezés esemény',       icon: '🔊', priority: 'high' },
  { key: 'air_quality',     label: 'Levegőminőség-aggály',        icon: '💨', priority: 'medium' },
  { key: 'broken_lighting', label: 'Elromlott közvilágítás',      icon: '💡', priority: 'medium' },
  { key: 'abandoned_vehicle',label: 'Elhagyott jármű',            icon: '🚗', priority: 'low' },
  { key: 'green_space',     label: 'Zöldterületi probléma',       icon: '🌿', priority: 'low' },
  { key: 'other',           label: 'Egyéb',                       icon: '📋', priority: 'low' },
] as const

type Category = typeof REPORT_CATEGORIES[number]['key']

interface PhotoPreview {
  file: File
  previewUrl: string
  compressed?: File
}

export function EnvironmentalReportForm({ workspaceId }: { workspaceId: string }) {
  const { t } = useI18n()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [photos, setPhotos] = useState<PhotoPreview[]>([])
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [forwardToAuthority, setForwardToAuthority] = useState(false)
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleGetLocation = useCallback(() => {
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setGpsLoading(false)
      },
      () => setGpsLoading(false),
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }, [])

  const handlePhotoAdd = useCallback(async (files: FileList | null) => {
    if (!files) return
    const remaining = 5 - photos.length
    const toProcess = Array.from(files).slice(0, remaining)

    const newPreviews: PhotoPreview[] = await Promise.all(
      toProcess.map(async (file) => {
        const previewUrl = URL.createObjectURL(file)
        // Automatikus tömörítés: max 1200px-es oldal, 85% minőség
        const compressed = await compressImage(file, { maxWidth: 1200, quality: 0.85 })
        return { file, previewUrl, compressed }
      })
    )
    setPhotos(prev => [...prev, ...newPreviews].slice(0, 5))
  }, [photos.length])

  const handlePhotoRemove = (index: number) => {
    setPhotos(prev => {
      URL.revokeObjectURL(prev[index].previewUrl)
      return prev.filter((_, i) => i !== index)
    })
  }

  async function handleSubmit(formData: FormData) {
    setErrors({})
    if (!selectedCategory) {
      setErrors({ category: 'Kategória kiválasztása kötelező' })
      return
    }

    formData.set('workspace_id', workspaceId)
    formData.set('category', selectedCategory)
    if (gps) {
      formData.set('lat', gps.lat.toString())
      formData.set('lng', gps.lng.toString())
    }
    formData.set('forward_to_authority', forwardToAuthority.toString())
    formData.set('is_anonymous', isAnonymous.toString())

    // Tömörített fotók csatolása
    photos.forEach((photo, i) => {
      formData.append(`photo_${i}`, photo.compressed ?? photo.file)
    })

    startTransition(async () => {
      const result = await submitEnvironmentalReport(formData)
      if (result.error) {
        setErrors(result.fieldErrors ?? { general: result.error })
        return
      }
      const next = new URLSearchParams(searchParams.toString())
      next.set('tab', 'reports')
      router.push(`/w/${workspaceId}/green?${next.toString()}`)
    })
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 max-w-2xl mx-auto">
      <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-amber-500" />
        {t('green.report.title')}
      </h2>

      <form action={handleSubmit} className="space-y-6">
        {/* Kategória */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            {t('green.report.categoryLabel')} *
          </label>
          <div className="grid grid-cols-2 gap-2">
            {REPORT_CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                type="button"
                onClick={() => setSelectedCategory(cat.key)}
                className={`
                  flex items-center gap-2 p-3 rounded-xl border-2 text-sm text-left
                  transition-all duration-150
                  ${selectedCategory === cat.key
                    ? 'border-amber-400 bg-amber-50 text-amber-900'
                    : 'border-gray-200 hover:border-amber-300 text-gray-700'
                  }
                `}
              >
                <span className="text-xl flex-shrink-0">{cat.icon}</span>
                <span className="font-medium leading-tight">{cat.label}</span>
              </button>
            ))}
          </div>
          {errors.category && <p className="mt-1 text-sm text-red-600">{errors.category}</p>}
        </div>

        {/* Cím */}
        <div>
          <label htmlFor="report-title" className="block text-sm font-medium text-gray-700 mb-1">
            {t('green.report.reportTitleLabel')} *
          </label>
          <input
            id="report-title"
            name="title"
            type="text"
            maxLength={100}
            placeholder={t('green.report.reportTitlePlaceholder')}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm
                       focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

        {/* Leírás */}
        <div>
          <label htmlFor="report-desc" className="block text-sm font-medium text-gray-700 mb-1">
            {t('green.report.descriptionLabel')} *
          </label>
          <textarea
            id="report-desc"
            name="description"
            rows={4}
            maxLength={2000}
            placeholder={t('green.report.descriptionPlaceholder')}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm
                       focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
          />
        </div>

        {/* GPS helymeghatározás */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <MapPin className="w-4 h-4 inline mr-1" />
            {t('green.report.locationLabel')}
          </label>
          <div className="flex gap-2 mb-2">
            <button
              type="button"
              onClick={handleGetLocation}
              disabled={gpsLoading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700
                         rounded-lg text-sm font-medium hover:bg-blue-100 transition
                         disabled:opacity-50"
            >
              <MapPin className="w-4 h-4" />
              {gpsLoading ? 'Helymeghatározás...' : 'GPS helyzet lekérése'}
            </button>
          </div>
          {gps && (
            <p className="text-xs text-green-700 bg-green-50 px-3 py-1.5 rounded-lg">
              ✓ GPS koordináták rögzítve: {gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}
            </p>
          )}
          <input
            name="location_description"
            type="text"
            placeholder="Helyszín leírása (pl. „az épület mögötti parkoló sarkán")"
            className="mt-2 w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm
                       focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

        {/* Fotófeltöltés */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Camera className="w-4 h-4 inline mr-1" />
            {t('green.report.photosLabel')} (max 5 kép)
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => handlePhotoAdd(e.target.files)}
          />
          {photos.length < 5 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-3 border-2 border-dashed
                         border-gray-300 rounded-xl text-sm text-gray-500
                         hover:border-amber-400 hover:text-amber-600 transition w-full
                         justify-center"
            >
              <Upload className="w-4 h-4" />
              Fotó hozzáadása
            </button>
          )}
          {photos.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-3">
              {photos.map((photo, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                  <img
                    src={photo.previewUrl}
                    alt={`Fotó ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handlePhotoRemove(i)}
                    className="absolute top-1 right-1 bg-black/50 text-white
                               rounded-full p-0.5 hover:bg-black/70 transition"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Hatósági integráció */}
        <div className="space-y-3 border border-gray-100 rounded-xl p-4 bg-gray-50">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={forwardToAuthority}
              onChange={e => setForwardToAuthority(e.target.checked)}
              className="mt-0.5 rounded border-gray-300 text-amber-500 focus:ring-amber-400"
            />
            <div>
              <span className="text-sm font-medium text-gray-800">
                Hatósági továbbítás kérése
              </span>
              <p className="text-xs text-gray-500 mt-0.5">
                A bejelentést megosszuk Budapest Közút / Fővárosi Önkormányzat
                illetékes szervével (ha az ügy azt indokolja)
              </p>
            </div>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isAnonymous}
              onChange={e => setIsAnonymous(e.target.checked)}
              className="mt-0.5 rounded border-gray-300 text-amber-500 focus:ring-amber-400"
            />
            <div>
              <span className="text-sm font-medium text-gray-800">
                Névtelen bejelentés
              </span>
              <p className="text-xs text-gray-500 mt-0.5">
                A neve nem jelenik meg a bejelentés mellett (csak az admin látja)
              </p>
            </div>
          </label>
        </div>

        {errors.general && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {errors.general}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-sm
                       font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="flex-1 px-4 py-3 bg-amber-500 text-white rounded-xl text-sm
                       font-semibold hover:bg-amber-600 disabled:opacity-50 transition"
          >
            {isPending ? 'Beküldés...' : t('green.report.submit')}
          </button>
        </div>
      </form>
    </div>
  )
}
```

### 3.4 GreenScorecard — Épület zöld eredménytábla

```tsx
// src/components/green/GreenScorecard.tsx
import { TreePine, Recycle, Wind, Bike, Trophy, TrendingUp } from 'lucide-react'
import { getBadgeForStats, type GreenBadge } from '@/lib/green/badges'

interface WorkspaceGreenStats {
  completed_actions: number
  unique_participants: number
  total_co2_kg: number
  total_trees: number
  total_waste_kg: number
  total_distance_km: number
  transport_co2_kg: number
}

interface GreenScorecardProps {
  stats: WorkspaceGreenStats | null
  workspaceId: string
}

const BADGE_CONFIG: Record<GreenBadge, { label: string; color: string; bg: string }> = {
  green_sprout:   { label: 'Zöld Csíra',   color: '#cd7f32', bg: '#fdf6ec' },
  green_shoot:    { label: 'Zöld Hajtás',  color: '#c0c0c0', bg: '#f8f8f8' },
  green_champion: { label: 'Zöld Bajnok',  color: '#ffd700', bg: '#fffbeb' },
  green_master:   { label: 'Zöld Mester',  color: '#b0c4de', bg: '#f0f4ff' },
}

export function GreenScorecard({ stats, workspaceId }: GreenScorecardProps) {
  const s = stats ?? {
    completed_actions: 0, unique_participants: 0, total_co2_kg: 0,
    total_trees: 0, total_waste_kg: 0, total_distance_km: 0, transport_co2_kg: 0,
  }

  const totalCO2 = s.total_co2_kg + s.transport_co2_kg
  const currentBadge = getBadgeForStats(s)
  const badgeCfg = currentBadge ? BADGE_CONFIG[currentBadge] : null

  const kpis = [
    {
      icon: <TreePine className="w-5 h-5 text-green-600" />,
      label: 'Elültetett fák',
      value: s.total_trees.toString(),
      unit: 'db',
      bg: 'bg-green-50',
    },
    {
      icon: <Wind className="w-5 h-5 text-sky-600" />,
      label: 'CO₂ megtakarítás',
      value: totalCO2 >= 1000
        ? (totalCO2 / 1000).toFixed(2)
        : totalCO2.toFixed(1),
      unit: totalCO2 >= 1000 ? 't CO₂' : 'kg CO₂',
      bg: 'bg-sky-50',
    },
    {
      icon: <Recycle className="w-5 h-5 text-amber-600" />,
      label: 'Szelektált hulladék',
      value: s.total_waste_kg.toFixed(1),
      unit: 'kg',
      bg: 'bg-amber-50',
    },
    {
      icon: <Bike className="w-5 h-5 text-purple-600" />,
      label: 'Kerékpáros km',
      value: s.total_distance_km.toFixed(0),
      unit: 'km',
      bg: 'bg-purple-50',
    },
    {
      icon: <TrendingUp className="w-5 h-5 text-rose-600" />,
      label: 'Akciók száma',
      value: s.completed_actions.toString(),
      unit: 'db',
      bg: 'bg-rose-50',
    },
    {
      icon: <Trophy className="w-5 h-5 text-indigo-600" />,
      label: 'Résztvevő lakók',
      value: s.unique_participants.toString(),
      unit: 'fő',
      bg: 'bg-indigo-50',
    },
  ]

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Jelvény fejléc */}
      {badgeCfg && (
        <div
          className="px-6 py-3 flex items-center gap-3 border-b"
          style={{ backgroundColor: badgeCfg.bg, borderColor: `${badgeCfg.color}30` }}
        >
          <span className="text-2xl">🏆</span>
          <div>
            <p className="text-xs text-gray-500">Épület jelvény</p>
            <p className="font-semibold text-sm" style={{ color: badgeCfg.color }}>
              {badgeCfg.label}
            </p>
          </div>
        </div>
      )}

      {/* KPI rácsok */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-0 divide-x divide-y divide-gray-100">
        {kpis.map((kpi) => (
          <div key={kpi.label} className={`${kpi.bg} p-4`}>
            <div className="flex items-center gap-2 mb-1">
              {kpi.icon}
              <span className="text-xs text-gray-500 font-medium">{kpi.label}</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {kpi.value}
              <span className="text-sm font-normal text-gray-500 ml-1">{kpi.unit}</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
```

### 3.5 CO2Calculator — Közlekedési CO₂ kalkulátor

```tsx
// src/components/green/CO2Calculator.tsx
'use client'

import { useState } from 'react'
import { logCO2Saving } from '@/app/actions/co2-savings'
import { Bike, Car, Bus, Footprints, BarChart3 } from 'lucide-react'
import { useTransition } from 'react'

const TRANSPORT_MODES = [
  { key: 'car',       label: 'Személyautó',    co2PerKm: 0.192, icon: '🚗' },
  { key: 'motorcycle',label: 'Motor',           co2PerKm: 0.103, icon: '🏍️' },
  { key: 'bus_diesel',label: 'Dízel busz',      co2PerKm: 0.089, icon: '🚌' },
  { key: 'tram',      label: 'Villamos',        co2PerKm: 0.029, icon: '🚋' },
  { key: 'metro',     label: 'Metró',           co2PerKm: 0.025, icon: '🚇' },
  { key: 'e_bus',     label: 'E-busz',          co2PerKm: 0.018, icon: '⚡🚌' },
  { key: 'bicycle',   label: 'Kerékpár',        co2PerKm: 0,     icon: '🚲' },
  { key: 'walking',   label: 'Gyaloglás',       co2PerKm: 0,     icon: '🚶' },
] as const

type TransportMode = typeof TRANSPORT_MODES[number]['key']

function getModeConfig(key: TransportMode) {
  return TRANSPORT_MODES.find(m => m.key === key)!
}

interface CO2CalculatorProps {
  workspaceId: string
  userId: string
}

export function CO2Calculator({ workspaceId, userId }: CO2CalculatorProps) {
  const [isPending, startTransition] = useTransition()
  const [distance, setDistance] = useState<number>(5)
  const [currentMode, setCurrentMode] = useState<TransportMode>('car')
  const [alternativeMode, setAlternativeMode] = useState<TransportMode>('bicycle')
  const [daysPerWeek, setDaysPerWeek] = useState<number>(5)
  const [saved, setSaved] = useState(false)

  const currentCO2 = getModeConfig(currentMode).co2PerKm * distance
  const altCO2 = getModeConfig(alternativeMode).co2PerKm * distance
  const savedPerTrip = Math.max(0, currentCO2 - altCO2)
  const savedPerWeek = savedPerTrip * 2 * daysPerWeek // oda-vissza
  const savedPerYear = savedPerWeek * 52

  // BKK bérlet megtérülése (ha autóról vált)
  const fuelCostPerKm = 60 // Ft/km (becsült)
  const moneySavedPerYear =
    currentMode === 'car' ? distance * 2 * daysPerWeek * 52 * fuelCostPerKm : 0
  const bkkPassCost = 11000 // Ft/hó, 2024
  const bkkPassPayback = moneySavedPerYear > 0
    ? `${Math.round(bkkPassCost / (moneySavedPerYear / 12))} hónap`
    : null

  function handleLog() {
    startTransition(async () => {
      await logCO2Saving({
        workspaceId,
        userId,
        transportMode: alternativeMode,
        distanceKm: distance * 2 * daysPerWeek,
        referenceMode: currentMode,
        co2SavedKg: savedPerWeek,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    })
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-green-600" />
        CO₂ Megtakarítás Kalkulátor
      </h3>

      <div className="space-y-5">
        {/* Távolság */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Munkahelyi távolság (km, egy irány)
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0.5} max={50} step={0.5}
              value={distance}
              onChange={e => setDistance(Number(e.target.value))}
              className="flex-1 accent-green-600"
            />
            <span className="text-lg font-bold text-gray-800 w-16 text-right">
              {distance} km
            </span>
          </div>
        </div>

        {/* Jelenlegi közlekedési mód */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Jelenlegi közlekedési módod
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {TRANSPORT_MODES.map(mode => (
              <button
                key={mode.key}
                type="button"
                onClick={() => setCurrentMode(mode.key)}
                className={`
                  flex flex-col items-center gap-1 p-2 rounded-lg border text-xs
                  transition-all
                  ${currentMode === mode.key
                    ? 'border-red-400 bg-red-50 text-red-800'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }
                `}
              >
                <span>{mode.icon}</span>
                <span className="leading-tight text-center">{mode.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Alternatív mód */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Alternatív mód (mi helyett?)
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {TRANSPORT_MODES.map(mode => (
              <button
                key={mode.key}
                type="button"
                onClick={() => setAlternativeMode(mode.key)}
                className={`
                  flex flex-col items-center gap-1 p-2 rounded-lg border text-xs
                  transition-all
                  ${alternativeMode === mode.key
                    ? 'border-green-500 bg-green-50 text-green-800'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }
                `}
              >
                <span>{mode.icon}</span>
                <span className="leading-tight text-center">{mode.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Napi rendszeresség */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Hány napon mész dolgozni hetente?
          </label>
          <div className="flex gap-2">
            {[1,2,3,4,5].map(d => (
              <button
                key={d}
                type="button"
                onClick={() => setDaysPerWeek(d)}
                className={`
                  flex-1 py-2 rounded-lg border text-sm font-medium transition
                  ${daysPerWeek === d
                    ? 'border-green-500 bg-green-600 text-white'
                    : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  }
                `}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Eredmény */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
          <p className="text-xs text-green-700 font-medium mb-3 uppercase tracking-wide">
            Megtakarítás összegzése
          </p>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-2xl font-bold text-green-800">
                {(savedPerTrip * 1000).toFixed(0)}g
              </p>
              <p className="text-xs text-green-600">/ út</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-800">
                {savedPerWeek.toFixed(2)}
              </p>
              <p className="text-xs text-green-600">kg CO₂ / hét</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-800">
                {savedPerYear >= 1000
                  ? `${(savedPerYear/1000).toFixed(2)}t`
                  : `${savedPerYear.toFixed(1)}kg`}
              </p>
              <p className="text-xs text-green-600">CO₂ / év</p>
            </div>
          </div>
          {moneySavedPerYear > 0 && (
            <div className="mt-3 pt-3 border-t border-green-200 text-center">
              <p className="text-sm text-green-700">
                Becsült üzemanyag-megtakarítás:{' '}
                <strong>{(moneySavedPerYear / 1000).toFixed(0)} 000 Ft/év</strong>
              </p>
              {bkkPassPayback && (
                <p className="text-xs text-green-600 mt-1">
                  BKK bérlet megtérülése: ~{bkkPassPayback}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Naplózás gomb */}
        <button
          type="button"
          onClick={handleLog}
          disabled={isPending || savedPerWeek === 0}
          className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold
                     text-sm hover:bg-green-700 disabled:opacity-50 transition"
        >
          {saved
            ? '✓ Megtakarítás naplózva!'
            : isPending
              ? 'Mentés...'
              : 'Heti megtakarítás naplózása'
          }
        </button>
      </div>
    </div>
  )
}
```

---

## 4. Server Actions

### 4.1 Zöld akció létrehozása

```typescript
// src/app/actions/green-actions.ts
'use server'

import { createServerActionClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { sendBrevoEmail } from '@/lib/brevo/client'

const CreateGreenActionSchema = z.object({
  workspace_id: z.string().uuid(),
  action_type: z.enum([
    'tree_planting','recycling','energy_challenge',
    'bike_day','community_garden','cleanup','insulation_audit',
  ]),
  title: z.string().min(3).max(150),
  description: z.string().max(5000).optional(),
  location_description: z.string().max(500).optional(),
  scheduled_at: z.string().datetime(),
  duration_minutes: z.coerce.number().int().min(15).max(1440).default(120),
  max_participants: z.coerce.number().int().min(1).max(500).optional(),
})

export async function createGreenAction(formData: FormData) {
  const supabase = createServerActionClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nem vagy bejelentkezve' }

  const raw = {
    workspace_id: formData.get('workspace_id'),
    action_type:  formData.get('action_type'),
    title:        formData.get('title'),
    description:  formData.get('description'),
    location_description: formData.get('location_description'),
    scheduled_at: new Date(formData.get('scheduled_at') as string).toISOString(),
    duration_minutes:  formData.get('duration_minutes'),
    max_participants:  formData.get('max_participants') || undefined,
  }

  const parsed = CreateGreenActionSchema.safeParse(raw)
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    parsed.error.issues.forEach(issue => {
      fieldErrors[issue.path[0] as string] = issue.message
    })
    return { error: 'Érvénytelen adatok', fieldErrors }
  }

  const tools = formData.getAll('required_tools[]').map(t => t.toString()).filter(Boolean)

  const { data: action, error } = await supabase
    .from('green_actions')
    .insert({
      ...parsed.data,
      created_by: user.id,
      required_tools: tools.length > 0 ? tools : null,
    })
    .select('id, title, scheduled_at, workspace_id')
    .single()

  if (error) return { error: 'Nem sikerült az akció létrehozása: ' + error.message }

  // Automatikus RSVP a szervező részéről
  await supabase
    .from('green_action_participants')
    .insert({ action_id: action.id, user_id: user.id, status: 'going' })

  // Értesítés az épület tagjainak (Brevo e-mail)
  try {
    const { data: members } = await supabase
      .from('workspace_members')
      .select('user_id, profiles(email, full_name)')
      .eq('workspace_id', parsed.data.workspace_id)
      .neq('user_id', user.id)

    if (members && members.length > 0) {
      await sendBrevoEmail({
        templateId: 'GREEN_ACTION_NEW',
        recipients: members.map((m: any) => ({
          email: m.profiles.email,
          name:  m.profiles.full_name,
        })),
        params: {
          action_title:    action.title,
          action_date:     new Date(action.scheduled_at).toLocaleDateString('hu-HU'),
          workspace_url:   `${process.env.NEXT_PUBLIC_APP_URL}/w/${action.workspace_id}/green`,
        },
      })
    }
  } catch (emailErr) {
    console.error('E-mail értesítés sikertelen:', emailErr)
    // Nem blokkoló hiba — az akció létrejött
  }

  revalidatePath(`/w/${parsed.data.workspace_id}/green`)
  return { data: action }
}

export async function rsvpGreenAction(
  actionId: string,
  status: 'going' | 'interested' | 'not_going'
) {
  const supabase = createServerActionClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nem vagy bejelentkezve' }

  const { error } = await supabase
    .from('green_action_participants')
    .upsert(
      { action_id: actionId, user_id: user.id, status },
      { onConflict: 'action_id,user_id' }
    )

  if (error) return { error: error.message }

  // Értesítés a szervezőnek, ha valaki jelentkezik
  if (status === 'going') {
    const { data: action } = await supabase
      .from('green_actions')
      .select('title, created_by, workspace_id, profiles!created_by(email)')
      .eq('id', actionId)
      .single()

    if (action) {
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()

      try {
        await sendBrevoEmail({
          templateId: 'GREEN_ACTION_RSVP',
          recipients: [{ email: (action as any).profiles.email }],
          params: {
            action_title:      action.title,
            participant_name:  userProfile?.full_name ?? 'Egy lakó',
          },
        })
      } catch (_) { /* nem blokkoló */ }
    }
  }

  revalidatePath(`/w`)
  return { data: { success: true } }
}

export async function completeGreenAction(
  actionId: string,
  results: {
    actual_participants_count: number
    co2_saved_kg?: number
    trees_planted?: number
    waste_collected_kg?: number
    distance_cycled_km?: number
    garden_area_sqm?: number
  }
) {
  const supabase = createServerActionClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nem vagy bejelentkezve' }

  const { data: action, error: fetchErr } = await supabase
    .from('green_actions')
    .select('workspace_id, created_by')
    .eq('id', actionId)
    .single()

  if (fetchErr || !action) return { error: 'Akció nem található' }

  // Csak szervező vagy admin zárhatja le
  const { data: membership } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', action.workspace_id)
    .eq('user_id', user.id)
    .single()

  const isCreator = action.created_by === user.id
  const isAdmin = membership?.role && ['admin','manager'].includes(membership.role)
  if (!isCreator && !isAdmin) return { error: 'Nincs jogosultságod' }

  const { error } = await supabase
    .from('green_actions')
    .update({ ...results, status: 'completed' })
    .eq('id', actionId)

  if (error) return { error: error.message }

  // Jelvény ellenőrzés (async, nem blokkoló)
  checkAndAwardBadges(action.workspace_id, supabase).catch(console.error)

  revalidatePath(`/w/${action.workspace_id}/green`)
  return { data: { success: true } }
}

async function checkAndAwardBadges(workspaceId: string, supabase: any) {
  const { data: stats } = await supabase
    .from('workspace_green_stats')
    .select('*')
    .eq('workspace_id', workspaceId)
    .single()

  if (!stats) return

  const badges = [
    {
      key: 'green_sprout',
      condition: stats.completed_actions >= 5,
    },
    {
      key: 'green_shoot',
      condition: stats.completed_actions >= 15 && stats.total_co2_kg >= 100,
    },
    {
      key: 'green_champion',
      condition: stats.completed_actions >= 30 && stats.total_co2_kg >= 500 && stats.unique_participants >= 10,
    },
    {
      key: 'green_master',
      condition: stats.completed_actions >= 50 && stats.total_co2_kg >= 1000,
    },
  ]

  for (const badge of badges) {
    if (badge.condition) {
      await supabase
        .from('green_achievements')
        .upsert(
          {
            workspace_id: workspaceId,
            badge_key: badge.key,
            snapshot_co2_kg: stats.total_co2_kg,
            snapshot_actions_count: stats.completed_actions,
            snapshot_participants_count: stats.unique_participants,
          },
          { onConflict: 'workspace_id,badge_key', ignoreDuplicates: true }
        )
    }
  }
}
```

### 4.2 Környezeti bejelentés beküldése fotófeltöltéssel

```typescript
// src/app/actions/environmental-reports.ts
'use server'

import { createServerActionClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { nanoid } from 'nanoid'

const ReportSchema = z.object({
  workspace_id: z.string().uuid(),
  category: z.enum([
    'illegal_dumping','cycling_infra','noise_pollution',
    'air_quality','broken_lighting','abandoned_vehicle','green_space','other',
  ]),
  title: z.string().min(3).max(100),
  description: z.string().min(10).max(2000),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  location_description: z.string().max(500).optional(),
  incident_at: z.string().datetime().optional(),
  forward_to_authority: z.coerce.boolean().default(false),
  is_anonymous: z.coerce.boolean().default(false),
  visibility: z.enum(['building','community_map','private']).default('building'),
})

const MAX_PHOTO_SIZE = 10 * 1024 * 1024 // 10 MB
const ALLOWED_MIME_TYPES = ['image/jpeg','image/png','image/webp','image/heic']

export async function submitEnvironmentalReport(formData: FormData) {
  const supabase = createServerActionClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nem vagy bejelentkezve' }

  const raw = Object.fromEntries(
    ['workspace_id','category','title','description','lat','lng',
     'location_description','incident_at','forward_to_authority',
     'is_anonymous','visibility'].map(k => [k, formData.get(k)])
  )

  const parsed = ReportSchema.safeParse(raw)
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {}
    parsed.error.issues.forEach(i => { fieldErrors[i.path[0] as string] = i.message })
    return { error: 'Érvénytelen adatok', fieldErrors }
  }

  // Fotók validálása
  const photoFiles: File[] = []
  for (let i = 0; i < 5; i++) {
    const file = formData.get(`photo_${i}`) as File | null
    if (!file || file.size === 0) continue
    if (file.size > MAX_PHOTO_SIZE) return { error: `${file.name} mérete meghaladja a 10 MB-ot` }
    if (!ALLOWED_MIME_TYPES.includes(file.type)) return { error: `${file.name} nem támogatott formátum` }
    photoFiles.push(file)
  }

  // Bejelentés létrehozása
  const { data: report, error: insertErr } = await supabase
    .from('environmental_reports')
    .insert({
      ...parsed.data,
      reported_by: user.id,
    })
    .select('id, workspace_id')
    .single()

  if (insertErr) return { error: 'Bejelentés mentése sikertelen: ' + insertErr.message }

  // Fotók feltöltése Supabase Storage-ba
  const attachmentInserts = []
  for (const file of photoFiles) {
    const ext = file.name.split('.').pop() ?? 'jpg'
    const path = `environmental-reports/${report.id}/${nanoid()}.${ext}`
    const { error: uploadErr } = await supabase.storage
      .from('report-attachments')
      .upload(path, file, {
        cacheControl: '31536000',
        upsert: false,
        contentType: file.type,
      })

    if (!uploadErr) {
      attachmentInserts.push({
        report_id: report.id,
        storage_path: path,
        file_name: file.name,
        file_size_bytes: file.size,
        mime_type: file.type,
      })
    }
  }

  if (attachmentInserts.length > 0) {
    await supabase.from('report_attachments').insert(attachmentInserts)
  }

  // Admin értesítés
  try {
    const { data: admins } = await supabase
      .from('workspace_members')
      .select('profiles(email)')
      .eq('workspace_id', parsed.data.workspace_id)
      .in('role', ['admin','manager'])

    if (admins && admins.length > 0) {
      const { sendBrevoEmail } = await import('@/lib/brevo/client')
      await sendBrevoEmail({
        templateId: 'ENV_REPORT_NEW_ADMIN',
        recipients: admins.map((a: any) => ({ email: a.profiles.email })),
        params: {
          report_title:    parsed.data.title,
          report_category: parsed.data.category,
          report_url: `${process.env.NEXT_PUBLIC_APP_URL}/w/${report.workspace_id}/green?tab=reports&id=${report.id}`,
        },
      })
    }
  } catch (_) { /* nem blokkoló */ }

  revalidatePath(`/w/${report.workspace_id}/green`)
  return { data: { reportId: report.id } }
}

export async function updateReportStatus(
  reportId: string,
  status: 'in_progress' | 'resolved' | 'rejected' | 'forwarded',
  resolutionNote?: string
) {
  const supabase = createServerActionClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Nem vagy bejelentkezve' }

  const { data: report } = await supabase
    .from('environmental_reports')
    .select('workspace_id, reported_by, profiles!reported_by(email)')
    .eq('id', reportId)
    .single()

  if (!report) return { error: 'Bejelentés nem található' }

  const updateData: Record<string, any> = {
    status,
    resolution_note: resolutionNote,
    resolved_by: user.id,
  }
  if (status === 'resolved') updateData.resolved_at = new Date().toISOString()

  const { error } = await supabase
    .from('environmental_reports')
    .update(updateData)
    .eq('id', reportId)

  if (error) return { error: error.message }

  // Bejelentő értesítése (ha nem anonim)
  if (['resolved','rejected'].includes(status)) {
    try {
      const { sendBrevoEmail } = await import('@/lib/brevo/client')
      await sendBrevoEmail({
        templateId: status === 'resolved' ? 'ENV_REPORT_RESOLVED' : 'ENV_REPORT_REJECTED',
        recipients: [{ email: (report as any).profiles.email }],
        params: { resolution_note: resolutionNote ?? '' },
      })
    } catch (_) { /* nem blokkoló */ }
  }

  revalidatePath(`/w/${report.workspace_id}/green`)
  return { data: { success: true } }
}
```

---

## 5. Lokalizáció

### 5.1 Magyar lokalizáció (en.ts és hu.ts)

A feature minden felhasználói szövegét mindkét locale fájlba fel kell venni a `useI18n()` → `t()` rendszeren keresztül.

**src/i18n/resources/hu.ts — green névtér bővítése:**

```typescript
// Hozzáadandó a hu.ts locale fájlhoz a meglévő kulcsok mellé:
green: {
  hub: {
    title: 'Zöld Akciók & Bejelentések',
    subtitle: 'Közösen formáljuk zöldebb épületünk és szomszédságunk jövőjét',
    tabActions: 'Zöld Akciók',
    tabReports: 'Bejelentések',
    tabCalculator: 'CO₂ Kalkulátor',
    tabScoreboard: 'Eredménytábla',
  },
  createAction: {
    title: 'Új Zöld Akció létrehozása',
    typeLabel: 'Akció típusa',
    titleLabel: 'Akció neve',
    titlePlaceholder: 'pl. Tavaszi faültetés az udvaron',
    descriptionLabel: 'Leírás',
    descriptionPlaceholder: 'Miről szól az akció? Mit kell hozni? Mi a cél?',
    dateLabel: 'Időpont',
    durationLabel: 'Várható időtartam',
    locationLabel: 'Helyszín',
    locationPlaceholder: 'pl. Épület udvara, tároló, X utca Y park',
    maxParticipantsLabel: 'Max. résztvevők száma',
    maxParticipantsPlaceholder: 'Hagyd üresen, ha korlátlan',
    toolsLabel: 'Szükséges eszközök',
    toolsPlaceholder: 'pl. kesztyű, ásó...',
    saving: 'Mentés...',
    submit: 'Akció meghirdetése',
  },
  report: {
    title: 'Környezeti Bejelentés',
    categoryLabel: 'Probléma típusa',
    reportTitleLabel: 'Rövid cím',
    reportTitlePlaceholder: 'pl. Illegális szemétle erakás az épület mögött',
    descriptionLabel: 'Részletes leírás',
    descriptionPlaceholder: 'Írj minél több részletet: mikor, hol, mennyiben érinti a lakókat...',
    locationLabel: 'Helyszín',
    photosLabel: 'Fényképek',
    submit: 'Bejelentés beküldése',
    statusNew: 'Új',
    statusInProgress: 'Folyamatban',
    statusResolved: 'Megoldva',
    statusRejected: 'Elutasítva',
    statusForwarded: 'Hatósághoz küldve',
  },
  scorecard: {
    badgeLabel: 'Épület jelvény',
    treesLabel: 'Elültetett fák',
    co2Label: 'CO₂ megtakarítás',
    wasteLabel: 'Szelektált hulladék',
    bikeLabel: 'Kerékpáros km',
    actionsLabel: 'Akciók száma',
    participantsLabel: 'Résztvevő lakók',
    monthlyReportBtn: 'Havi zöld jelentés',
  },
  badges: {
    green_sprout:   'Zöld Csíra',
    green_shoot:    'Zöld Hajtás',
    green_champion: 'Zöld Bajnok',
    green_master:   'Zöld Mester',
  },
},
```

**src/i18n/resources/en.ts — green névtér bővítése:**

```typescript
green: {
  hub: {
    title: 'Green Actions & Reports',
    subtitle: 'Together we shape a greener building and neighbourhood',
    tabActions: 'Green Actions',
    tabReports: 'Reports',
    tabCalculator: 'CO₂ Calculator',
    tabScoreboard: 'Scoreboard',
  },
  createAction: {
    title: 'Create New Green Action',
    typeLabel: 'Action type',
    titleLabel: 'Action name',
    titlePlaceholder: 'e.g. Spring tree planting in the courtyard',
    descriptionLabel: 'Description',
    descriptionPlaceholder: 'What is this about? What to bring? What is the goal?',
    dateLabel: 'Date & time',
    durationLabel: 'Expected duration',
    locationLabel: 'Location',
    locationPlaceholder: 'e.g. Building courtyard, storage room, X park',
    maxParticipantsLabel: 'Max. participants',
    maxParticipantsPlaceholder: 'Leave empty for unlimited',
    toolsLabel: 'Required tools',
    toolsPlaceholder: 'e.g. gloves, shovel...',
    saving: 'Saving...',
    submit: 'Announce action',
  },
  report: {
    title: 'Environmental Report',
    categoryLabel: 'Problem type',
    reportTitleLabel: 'Short title',
    reportTitlePlaceholder: 'e.g. Illegal dumping behind the building',
    descriptionLabel: 'Detailed description',
    descriptionPlaceholder: 'Provide as much detail as possible: when, where, how it affects residents...',
    locationLabel: 'Location',
    photosLabel: 'Photos',
    submit: 'Submit report',
    statusNew: 'New',
    statusInProgress: 'In progress',
    statusResolved: 'Resolved',
    statusRejected: 'Rejected',
    statusForwarded: 'Forwarded to authority',
  },
  scorecard: {
    badgeLabel: 'Building badge',
    treesLabel: 'Trees planted',
    co2Label: 'CO₂ saved',
    wasteLabel: 'Sorted waste',
    bikeLabel: 'Cycling km',
    actionsLabel: 'Actions count',
    participantsLabel: 'Participating residents',
    monthlyReportBtn: 'Monthly green report',
  },
  badges: {
    green_sprout:   'Green Sprout',
    green_shoot:    'Green Shoot',
    green_champion: 'Green Champion',
    green_master:   'Green Master',
  },
},
```

---

## 6. Admin panel kiterjesztések

### 6.1 Bejelentés-kezelő panel

Az admin panel `/w/:workspaceId/admin/reports` útvonalán egy teljes bejelentés-kezelő felület jelenik meg:

**Funkciók:**
- Táblázatos nézet minden bejelentéssel, szűrők: státusz, kategória, dátumtartomány
- Gyors státuszváltás: legördülőből „Folyamatban", „Megoldva", „Elutasítva", „Hatósághoz küldve"
- Indoklás mező: elutasítás esetén kötelező kitölteni
- Tömeges műveletek: több kiválasztott bejelentés egyszerre lezárható
- Export: CSV formátum (kategória, cím, dátum, státusz, megoldási idő)
- Hatósági hivatkozási szám rögzítése (Budapest Közút ticket ID)

### 6.2 Zöld Akciók moderálása

- Folyamatban lévő akciók listája szervező-névvel
- Akció törlése / módosítása admin jogosultsággal
- Eredmény jóváhagyása (ha a szervező által megadott adatokat ellenőrzés szükséges)
- Havi összesítő jelentés generálása (PDF/PNG)

### 6.3 Tömeges értesítési rendszer

```typescript
// src/app/actions/admin-notifications.ts
'use server'

export async function sendGreenBulkNotification(
  workspaceId: string,
  subject: string,
  message: string,
  targetGroups: ('all' | 'action_participants' | 'reporters')[]
) {
  // ...szükséges jogosultság-ellenőrzés + Brevo bulk e-mail...
}
```

---

## 7. Hatósági integráció — Budapest Közút és Önkormányzat

### 7.1 Budapest Közút bejelentési API integráció

A Budapest Közút jelenleg nyilvános webes bejelentési felületen ([kozut.budapest.hu](https://kozut.budapest.hu)) fogad bejelentéseket. Mivel közvetlen REST API nem érhető el nyilvánosan, a panellako.hu az alábbi megközelítést alkalmazza:

**Megközelítés 1: E-mail alapú továbbítás**
- A rendszer strukturált e-mailt generál a Budapest Közút bejelentési e-mail-címre (kozut@budapestkozut.hu)
- Az e-mail tartalmazza: kategória, leírás, GPS koordináták, fotók linkjei (Supabase Storage signed URL-ek), bejelentő lakóépület azonosítója
- A visszaigazolt ticket számot az admin manuálisan rögzíti a `authority_reference_id` mezőbe

**Megközelítés 2: Fővárosi Önkormányzat (future)**
- A Budapest Open Data portal és az e-Budapest rendszer nyilvános API-jával lehetséges közvetlen integráció
- Ez egy jövőbeni fejlesztési irány: webhook alapú visszajelzés a ticket státuszáról

### 7.2 Bejelentés formátuma hatóság felé

```typescript
function formatReportForAuthority(report: EnvironmentalReport): string {
  return `
PANELLAKO.HU — KÖZÖSSÉGI KÖRNYEZETI BEJELENTÉS
================================================
Kategória: ${CATEGORY_LABELS[report.category]}
Cím: ${report.title}
Leírás: ${report.description}
GPS: ${report.lat ? `${report.lat}, ${report.lng}` : 'Nem megadott'}
Helyszín pontosítás: ${report.location_description ?? 'N/A'}
Bejelentés időpontja: ${new Date(report.created_at).toLocaleString('hu-HU')}
${report.incident_at ? `Esemény időpontja: ${new Date(report.incident_at).toLocaleString('hu-HU')}` : ''}

A bejelentést ${report.forward_to_authority ? 'HATÓSÁGI TOVÁBBÍTÁS céljából' : ''} küldtük.
Fotók: [Supabase Storage signed URL-ek, 7 napos érvényes link]

Az épület adatai hatósági kérésre megadhatók.
— panellako.hu közösségi bejelentési rendszer
  `.trim()
}
```

---

## 8. Sprint terv

### Sprint 1 (1–2. hét) — Adatbázis és alapinfrastruktúra

**Feladatok:**
- [ ] Supabase migráció: `green_actions`, `green_action_participants`, `environmental_reports`, `report_attachments`, `green_achievements`, `co2_savings_log`, `report_upvotes` táblák létrehozása
- [ ] RLS szabályok implementálása és tesztelése
- [ ] `workspace_green_stats` aggregáló view létrehozása
- [ ] Supabase Storage bucket konfigurálása: `report-attachments` (privát, csak workspace tagok számára hozzáférhető)
- [ ] `lib/green/constants.ts` és `lib/green/badges.ts` könyvtár fájlok megírása
- [ ] `lib/images/compress.ts` — képtömörítési segédfüggvény (canvas API alapú)
- [ ] i18n kulcsok mindkét locale fájlba (`en.ts`, `hu.ts`)
- [ ] Route struktúra: `/w/[workspaceId]/green/page.tsx` scaffold
- [ ] Navigation menübe Zöld Hub link hozzáadása

**Átadási kritérium:** Az adatbázis működik, RLS helyes, a Storage bucket létezik, az oldalra navigálni lehet.

### Sprint 2 (3–4. hét) — Zöld Akció Szervező Modul

**Feladatok:**
- [ ] `CreateGreenActionForm` komponens teljes implementálása
- [ ] `createGreenAction` Server Action + Zod validáció
- [ ] `rsvpGreenAction` Server Action
- [ ] `GreenActionsHub` fő komponens: tab navigáció (pushState)
- [ ] Akciókártya komponens: `GreenActionCard` — megjelenítés, RSVP gombok, résztvevők száma
- [ ] Akció részletező oldal: `/w/[workspaceId]/green/actions/[actionId]`
- [ ] Akció lezárási form: `CompleteActionForm` (only creator/admin) — tényleges résztvevők és CO₂ hatás rögzítése
- [ ] `completeGreenAction` Server Action + jelvény-ellenőrző logika
- [ ] Brevo e-mail template integráció: `GREEN_ACTION_NEW`, `GREEN_ACTION_RSVP`
- [ ] Emlékeztető értesítés: Supabase Edge Function cron-job (24h és 2h előtt)

**Átadási kritérium:** Akció létrehozható, RSVP működik, lezárás után a scorecard frissül, e-mail küldés sikeres.

### Sprint 3 (5–6. hét) — Környezeti Bejelentési Modul

**Feladatok:**
- [ ] `EnvironmentalReportForm` teljes implementálása (fotófeltöltéssel, GPS-sel)
- [ ] `submitEnvironmentalReport` Server Action + Supabase Storage feltöltés
- [ ] `updateReportStatus` Server Action (admin)
- [ ] Bejelentés lista oldal: szűrhetőség kategória és státusz szerint
- [ ] Bejelentés részletező: fotó galéria, státusz idővonal, admin műveletek
- [ ] Feature 03 (térkép) integrálás: bejelentések pontként jelennek meg a közelségi térképen
- [ ] Admin panel: `/w/[workspaceId]/admin/reports` oldal
- [ ] `updateReportStatus` Server Action az admin panelhez
- [ ] Brevo template: `ENV_REPORT_NEW_ADMIN`, `ENV_REPORT_RESOLVED`, `ENV_REPORT_REJECTED`
- [ ] Upvote funkció: `report_upvotes` tábla + upvote gomb

**Átadási kritérium:** Bejelentés beküldhető fotóval és GPS-sel, admin látja és kezeli, a statisztikák megjelennek.

### Sprint 4 (7–8. hét) — CO₂ Kalkulátor, Gamifikáció, Havi Jelentés

**Feladatok:**
- [ ] `CO2Calculator` komponens teljes implementálása
- [ ] `logCO2Saving` Server Action
- [ ] `GreenScorecard` komponens jelvény megjelenítéssel
- [ ] Havi Zöld Jelentés PDF generálás (Supabase Edge Function + jsPDF vagy külső API)
- [ ] Admin: havi jelentés manuális generálása + e-mail a lakóknak
- [ ] Gamifikációs jelvények animált megjelenítése (Confetti animáció jelvény megszerzésekor)
- [ ] Statisztika diagramok: Recharts alapú donut chart (bejelentés kategóriák) + line chart (trend)
- [ ] Mobile UX audit: összes komponens tesztelése 375px szélességen
- [ ] End-to-end tesztek: Playwright alapú smoke teszt minden fő flow-ra
- [ ] Performance audit: Largest Contentful Paint < 2.5s, képek lazy load

**Átadási kritérium:** A teljes platform működik, mobilon is, jelvények kiosztódnak, havi jelentés generálható.

---

## 9. Tesztelési kritériumok

### 9.1 Funkcionális tesztek (manuális QA checklist)

**Zöld Akció Szervező:**
- [ ] Akció létrehozható mind a 7 akciótípussal
- [ ] Kötelező mezők hiányakor célzott hibaüzenet jelenik meg
- [ ] RSVP „Részt veszek" gomb működik, a résztvevők száma frissül
- [ ] Kapacitáslimit elérve: a következő jelentkezők várólistára kerülnek
- [ ] Csak az akció szervezője és az admin látja a „Lezárás" gombot
- [ ] Lezárás után a CO₂ adatok megjelennek a scorecardban
- [ ] 24h és 2h előtti emlékeztető e-mail megérkezik a résztvevőkhöz
- [ ] Elmúlt akciók nem jelennek meg az „Upcoming" listában

**Környezeti Bejelentés:**
- [ ] Bejelentés beküldhető fotó nélkül és fotóval (max 5 kép)
- [ ] 10 MB feletti kép elutasítva, hibaüzenettel
- [ ] GPS koordináták mentésre kerülnek, térkép ponton megjelennek
- [ ] Admin látja az összes bejelentést, státuszokat módosíthatja
- [ ] Státuszváltáskor (megoldva/elutasítva) a bejelentő e-mailt kap
- [ ] Anonim bejelentésnél az admin látja a valódi nevet, a többi lakó nem
- [ ] Upvote funkció: egy lakó csak egyszer szavazhat

**CO₂ Kalkulátor:**
- [ ] Összes közlekedési mód kiválasztható
- [ ] Számítás azonnal frissül csúszka mozgatásakor (nincs server round-trip)
- [ ] „Heti megtakarítás naplózása" gomb csak akkor aktív, ha van megtakarítás
- [ ] Naplózás után a workspace scorecard CO₂ értéke nő

**Gamifikáció:**
- [ ] Bronze jelvény megszerzésekor vizuális visszajelzés (toast + animáció)
- [ ] Jelvények nem duplán kioszthatók

### 9.2 Biztonsági tesztek

- [ ] RLS: más workspace lakója nem látja az épület bejelentéseit (közvetlen API hívással tesztelve)
- [ ] Storage: más workspace lakója nem töltheti le a bejelentések fotóit (signed URL lejár 1 órán belül)
- [ ] Server Action: CSRF védelem érvényes (Next.js beépített védelem + SameSite cookie)
- [ ] Fájl feltöltés: MIME type ellenőrzés (nem csak kiterjesztés alapján)
- [ ] GPS koordináták: lat/lng tartomány ellenőrzés (ne lehessen érvénytelen koordináta)
- [ ] Admin műveletek: nem admin felhasználó nem tud státuszt váltani (403 visszaad)

### 9.3 Teljesítménytesztek

- [ ] Bejelentés lista 100+ elemmel < 200ms szerver válaszidő
- [ ] Fotófeltöltés (5 kép, összesen 20 MB tömörítés előtt) < 8 másodperc
- [ ] Scorecard aggregált lekérés < 100ms (materialized view cache-el)
- [ ] CO₂ kalkulátor – nulla szerver hívás a kalkuláció közben (kliens oldali számítás)
- [ ] LCP (Largest Contentful Paint) < 2.5s mobilon (3G szimuláció)

### 9.4 Akadálymentesség (a11y)

- [ ] Minden form mező `label` elemmel rendelkezik
- [ ] Fotó upload drag-and-drop keyboard-accessible
- [ ] Státuszbadge-ek screen reader-barát szöveggel rendelkeznek (`aria-label`)
- [ ] Color contrast ratio legalább 4.5:1 minden szöveg-háttér párban
- [ ] Tab navigáció logikus sorrendben végigvezet az összes interaktív elemen

---

## 10. Kapcsolódó fájlok és könyvtár struktúra

```
src/
├── app/
│   ├── (app)/
│   │   └── w/
│   │       └── [workspaceId]/
│   │           ├── green/
│   │           │   ├── page.tsx                     ← Fő Green Hub oldal
│   │           │   └── actions/
│   │           │       └── [actionId]/
│   │           │           └── page.tsx             ← Akció részletező
│   │           └── admin/
│   │               └── reports/
│   │                   └── page.tsx                 ← Admin bejelentés-kezelő
│   └── actions/
│       ├── green-actions.ts                         ← Server Actions (akciók)
│       ├── environmental-reports.ts                 ← Server Actions (bejelentések)
│       └── co2-savings.ts                           ← Server Actions (CO₂ napló)
├── components/
│   └── green/
│       ├── GreenActionsHub.tsx                      ← Fő Hub kliens komponens
│       ├── CreateGreenActionForm.tsx                ← Akció létrehozás
│       ├── GreenActionCard.tsx                      ← Akció kártya
│       ├── CompleteActionForm.tsx                   ← Akció lezárása
│       ├── EnvironmentalReportForm.tsx              ← Bejelentési form
│       ├── ReportCard.tsx                           ← Bejelentés kártya
│       ├── GreenScorecard.tsx                       ← Épület scorecard
│       ├── CO2Calculator.tsx                        ← CO₂ kalkulátor
│       ├── BadgeDisplay.tsx                         ← Gamifikációs jelvények
│       └── ReportStatusTimeline.tsx                 ← Bejelentés státusz idővonal
├── lib/
│   └── green/
│       ├── constants.ts                             ← ACTION_TYPES, CO2_FACTORS
│       ├── badges.ts                                ← getBadgeForStats()
│       └── co2-calculator.ts                        ← CO₂ számítási logika
└── i18n/
    └── resources/
        ├── en.ts                                    ← angol fordítások (green névtér)
        └── hu.ts                                    ← magyar fordítások (green névtér)
```

---

## 11. Biztonsági és adatvédelmi szempontok

### 11.1 GPS adatok kezelése

A bejelentésekhez rögzített GPS koordináták érzékeny személyes adatnak minősülhetnek (pontosan megmutatják, hol tartózkodott valaki). Az alábbi óvintézkedések szükségesek:

- A GPS koordináták csak az épület tagjai számára láthatók (RLS védi)
- Anonim bejelentés esetén a GPS a névtelenség ellenére rögzítésre kerül (hatósági célra), de a lista nézetben csak a helyszín leírás szöveges formája jelenik meg
- A koordinátákat a bejelentéshez kötötten tároljuk, nem a felhasználói profilhoz
- GDPR: a bejelentés törlésekor (soft delete) a koordináták törlésre kerülnek

### 11.2 Fotó metaadatok

A feltöltött képek EXIF metaadatait a tömörítő függvény automatikusan eltávolítja (canvas újrarajzolás nem viszi át az EXIF-et), megakadályozva, hogy a kép eredeti GPS-koordinátái vagy eszköz-azonosítója kiszivárogjon.

### 11.3 Hatósági adatmegosztás

Amikor a lakó bejelöli a „hatósági továbbítás" opciót:
- Csak az admin tudja ténylegesen elküldeni a bejelentést
- A bejelentő értesítést kap, hogy mikor és milyen formában lett továbbítva
- A hatóság felé küldött e-mail nem tartalmaz személyes azonosítót, csak az épület azonosítóját és a bejelentés tartalmát

---

## 12. Jövőbeni fejlesztési irányok (v2 backlog)

1. **Valós idejű frissítés (Supabase Realtime):** Amikor egy admin státuszt vált, a bejelentő élőben látja a változást (nincs szükség lap-újratöltésre)
2. **Gamifikáció – egyéni pontszámok:** Nem csak épület-szintű, hanem lakó-szintű zöld pontszám (leaderboard az épületen belül)
3. **Periódikus kihívások:** Havonta automatikusan generált kihívás (pl. „Február: minden héten legalább egy kerékpáros nap")
4. **BKK API integráció:** Közvetlen kapcsolat a BKK Futár/GTFS API-val a tömegközlekedési utazások automatikus naplózásához
5. **Szenzoradatok integrálása:** Feature 01 (levegőminőség) és Feature 02 (zajszint) adatainak automatikus csatolása az időbélyeggel egyező bejelentésekhez
6. **Szomszéd épületek összehasonlítása:** Hasonló méretű épületek anonim benchmark adatai (opt-in alapon)
7. **OpenStreetMap overlay:** A bejelentések megjelenítése OSM térképen (nem csak az épület közelségén), kerékpárúthálózattal együtt

---

*Ez a prompt fájl a panellako.hu geoinformatikai szakdolgozat-alapú thesis feature sorozatának 5. eleme. A fejlesztés során minden commit message-nek követnie kell a `CHANGELOG.md` és `versioning/` fájlok frissítési konvencióját. Az összes felhasználói szöveg az `en.ts` és `hu.ts` locale fájlokon keresztül kezelendő — hardcoded string a komponensekben nem megengedett.*
