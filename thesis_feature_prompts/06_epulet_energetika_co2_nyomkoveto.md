# FEATURE PROMPT 06 — Épületenergetikai és CO₂ Nyomkövető Modul

---

## 1. Motiváció és szakdolgozati háttér

### 1.1 Az energiagazdálkodás mint zöldváros-mutató

A panellako.hu mögött álló geoinformatikai szakdolgozat (SZTE, Természettudományi és Informatikai Kar) az Európa Zöld Fővárosa (European Green Capital) értékelési rendszerét vizsgálja Budapest szemszögéből. Az értékelési keretrendszer 12 mutató mentén ítéli meg egy város fenntarthatósági teljesítményét, amelyek között kiemelkedő helyen szerepel az **energiagazdálkodás és az épületek energiafelhasználása**.

Az Európai Bizottság által összeállított kritériumrendszer szerint az épületek felelősek az EU teljes végső energiafelhasználásának mintegy **40%-áért** és a CO₂-kibocsátás **36%-áért**. Ez az arány különösen magas Magyarországon, ahol a lakóépületek döntő többsége az energiaválság előtt tervezett, és ma is rendkívül elavult műszaki állapotban üzemel. A panelházak ebből a szempontból egyértelműen az energetikai örökség legproblematikusabb szegmensét alkotják.

A szakdolgozat részletesen elemzi, hogy a **beépítettségi arány (BCR) és az épületek közötti szabad területek aránya** közvetlen hatást gyakorol a hősziget-jelenségre (Urban Heat Island — UHI), ami növeli a lakóépületek hűtési energiaigényét. Sűrűn beépített lakótelepen például nyári időszakban 3–6 °C-kal magasabb hőmérséklet mérhető, mint a közeli zöldfelületekkel tagolt városrészekben. Ez a hőmérséklet-különbség — különösen az egyre intenzívebbé váló nyári hőhullámok idején — szignifikáns többletenergia-fogyasztást jelent a levegőtartásnál is rosszabb hőszigeteléssel rendelkező panelépületekben.

A tanulmány rámutat arra is, hogy a **zöldfelületek és az energiafelhasználás között inverz összefüggés** áll fenn: a több fát, cserjét és gyepfelületet felvonultató lakótelepek közegeiben az UHI-hatás kisebb, a nyári hőterhelés alacsonyabb, így az épületek hűtési energiaszükséglete is csökkenthetőbb. Ez az összefüggés makroszinten igazolt, és egyértelműen beépíthető a panelházak energetikai értékelési modelljébe.

### 1.2 A panelházak energetikai válsága

Magyarország kb. **1,5 millió lakosa** él panelépületekben — ez a teljes lakásállomány közel 20%-át teszi ki. A panelházak jellemzői energetikai szempontból:

| Jellemző | Tipikus panelház | Modern épület | Arány |
|---|---|---|---|
| Fajlagos hőfelhasználás | 180–300 kWh/m²/év | 40–80 kWh/m²/év | 3–6× rosszabb |
| Hőátbocsátási tényező (falak) | U = 0,5–1,5 W/m²K | U = 0,10–0,20 W/m²K | 5–10× rosszabb |
| Hőátbocsátási tényező (ablakok) | U = 2,8–4,5 W/m²K | U = 0,8–1,2 W/m²K | 3–5× rosszabb |
| Primer energiafelhasználás | 200–400 kWh/m²/év | 50–100 kWh/m²/év | 3–5× rosszabb |
| CO₂-kibocsátás (fűtés) | 35–80 kg CO₂/m²/év | 8–18 kg CO₂/m²/év | 4–5× rosszabb |

Az 1960–1990 között épített panelezési technológiák — az ÉM–38, ÉM–97, Larsen és egyéb típusok — nem tartalmaztak szintetikus hőszigeteléssel kombinált külső hőszigeteléses rendszert. A falak sokszor egyszerűen betonpanelből állnak, amelyek hővezetési ellenállása minimális. A tetraplánok (lapostetős ötszintes tömbök) és a toronyházak (9–12 emeletes épületek) egyaránt érintett épülettípusok.

### 1.3 Az EU Megújuló Energia és Épületenergetikai Keretrendszer

Az **EU Green Deal** részeként meghirdetett **Renovation Wave** stratégia célként tűzte ki, hogy 2030-ra az EU épületeinek energiafelhasználása 14–18%-kal csökkenjen, 2050-re pedig elérjük a karbon-semleges épületállományt. A stratégia **elsősorban a rossz energiaminőségű épületek felújítását** célozza — ami egyértelműen magában foglalja a magyar panelházakat.

Az EPBD (Energy Performance of Buildings Directive, 2023/1791) szerint:
- 2030-ig az EU lakóépületeinek el kell érniük legalább az **E energiaosztályt**
- 2033-ra a minimumkövetelmény az **D energiaosztály**
- A tagállamoknak kötelező Felújítási Nemzeti Terveket (NEAP) készíteni
- A legrosszabb 15%-os energiaminőségű épületek renoválása prioritás

Magyarország a 2021–2027-es EU programozási időszakban az **Otthon Melege Program** és a **Plus Otthon Program** keretében összesen több mint 200 milliárd forintot különít el a lakóépületek felújítására — ebből a panelházak kiemelt hangsúlyt kapnak.

### 1.4 Miért ide illik ez a feature?

A panellako.hu mérőóra-leolvasási modulja már tartalmazza a fogyasztási adatok rögzítésének infrastruktúráját (`meter_readings` tábla, `viz`, `gaz`, `villany` méréstípusok, Server Action). Ez a feature **közvetlen logikai folytatása**: a rögzített fogyasztási adatokat energetikai mutatókká, CO₂-egyenértékké, és végső soron **cselekvési javaslatokká** alakítja.

Azzal, hogy a panellako.hu kezeli az egyes épületek mérési adatait, egyedülálló helyzetben van egy olyan aggregált, épület-szintű energetikai portfólió felépítéséhez, amelyből:
1. A **lakóközösség** megérti valódi energetikai helyzetét
2. A **közös képviselő** dokumentumba foglalt érveket kap a felújítási döntésekhez
3. A **hatóság/pályázatíró** alap adatokhoz jut egy EPBD-kompatibilis felújítási tervhez

---

## 2. A fejlesztendő feature teljes specifikációja

### Feature neve: **Épületenergetikai és CO₂ Nyomkövető**
### Helye az alkalmazásban: `/w/:workspaceId/energetika`
### Prioritás: MAGAS (EU-kötelezettség + aktív pályázati környezet)
### Szükséges előfeltétel: meglévő mérőóra-leolvasás modul (`meter_readings` tábla)

---

## 3. Adatbázis-bővítések (Supabase / PostgreSQL)

### 3.1 A meglévő `meter_readings` tábla kiterjesztése

A meglévő tábla:
```sql
create table if not exists meter_readings (
  id uuid primary key default gen_random_uuid(),
  building_id uuid references buildings(id) on delete cascade,
  unit_id uuid references units(id) on delete set null,
  reported_by uuid references profiles(id) on delete set null,
  meter_type text not null check (meter_type in ('viz','gaz','villany')),
  value numeric(12,2) not null,
  reading_date date not null,
  unit_label text not null,
  reported_by_name text,
  created_at timestamptz not null default now()
);
```

Szükséges migrációs SQL:

```sql
-- Migrálás: 20260517_energetika_extension.sql

-- 1. Energia típus oszlop hozzáadása (visszafelé kompatibilis)
alter table meter_readings
  add column if not exists energy_type text
    check (energy_type in ('futes', 'hmv', 'villany', 'gaz', 'viz'))
    generated always as (
      case
        when meter_type = 'gaz'     then 'gaz'
        when meter_type = 'villany' then 'villany'
        when meter_type = 'viz'     then 'viz'
        else null
      end
    ) stored;

-- 2. Mértékegység és konverziós alap oszlop hozzáadása
alter table meter_readings
  add column if not exists unit_of_measure text default 'm3'
    check (unit_of_measure in ('m3', 'kWh', 'MJ', 'liter'));

alter table meter_readings
  add column if not exists conversion_factor numeric(10,6) default 1.0;

-- 3. Épület energetikai profil tábla
create table if not exists building_energy_profile (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references buildings(id) on delete cascade,
  heated_floor_area numeric(10,2),          -- m² fűtött alapterület
  construction_year integer,                -- építési év (pl. 1975)
  panel_type text,                          -- pl. 'EM-97', 'Larsen', 'egyéb'
  floors integer,                           -- emeletszám
  units_count integer,                      -- lakások száma
  wall_u_value numeric(6,4),               -- W/m²K falak hőátbocsátása
  window_u_value numeric(6,4),             -- W/m²K ablakok hőátbocsátása
  roof_u_value numeric(6,4),              -- W/m²K tető hőátbocsátása
  heating_system text default 'tavhő'
    check (heating_system in ('tavhő', 'gáz_central', 'gáz_egyéni', 'hőszivattyú', 'egyéb')),
  roof_area numeric(10,2),                  -- m² tetőfelület (napelem számításhoz)
  roof_orientation text default 'dél'
    check (roof_orientation in ('dél', 'dél-kelet', 'dél-nyugat', 'kelet', 'nyugat', 'észak')),
  latitude numeric(10,6),                   -- épület GPS-koordinátái
  longitude numeric(10,6),
  last_renovation_year integer,            -- utolsó felújítás éve (ha volt)
  has_external_insulation boolean default false,
  has_new_windows boolean default false,
  has_solar_panels boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (building_id)
);

-- RLS a building_energy_profile-ra
alter table building_energy_profile enable row level security;

create policy "Épülettagok olvashatják az energetikai profilt"
  on building_energy_profile for select
  using (
    exists (
      select 1 from building_members bm
      where bm.building_id = building_energy_profile.building_id
        and bm.profile_id = auth.uid()
    )
  );

create policy "Adminok szerkeszthetik az energetikai profilt"
  on building_energy_profile for all
  using (
    exists (
      select 1 from building_members bm
      where bm.building_id = building_energy_profile.building_id
        and bm.profile_id = auth.uid()
        and bm.role in ('admin', 'manager')
    )
  );

-- 4. Havi energia-összesítő materializált nézet
create materialized view if not exists energy_consumption_monthly as
select
  mr.building_id,
  mr.unit_id,
  mr.unit_label,
  mr.meter_type,
  date_trunc('month', mr.reading_date) as month,
  extract(year from mr.reading_date) as year,
  extract(month from mr.reading_date) as month_num,
  max(mr.value) - min(mr.value) as consumption,
  count(*) as reading_count,
  min(mr.reading_date) as first_reading,
  max(mr.reading_date) as last_reading
from meter_readings mr
where mr.reading_date >= current_date - interval '3 years'
group by
  mr.building_id,
  mr.unit_id,
  mr.unit_label,
  mr.meter_type,
  date_trunc('month', mr.reading_date),
  extract(year from mr.reading_date),
  extract(month from mr.reading_date)
with data;

create unique index if not exists energy_consumption_monthly_idx
  on energy_consumption_monthly (building_id, unit_id, meter_type, month);

-- Frissítés ütemezése (pg_cron szükséges — Supabase-en elérhető)
-- select cron.schedule('refresh-energy-monthly', '0 3 * * *',
--   'refresh materialized view concurrently energy_consumption_monthly');

-- 5. Felújítási becslések tábla
create table if not exists renovation_estimates (
  id uuid primary key default gen_random_uuid(),
  building_id uuid not null references buildings(id) on delete cascade,
  renovation_type text not null
    check (renovation_type in (
      'kulso_hoszigeteles', 'ablakcsere', 'napelem', 'hoszivattyú',
      'futes_korszerusites', 'tet_hoszigeteles', 'komplex'
    )),
  estimated_cost_huf numeric(14,2),         -- becsült beruházási költség
  estimated_savings_kwh_per_year numeric(10,2), -- éves megtakarítás kWh-ban
  estimated_co2_saving_kg_per_year numeric(10,2),
  payback_years numeric(6,2),               -- megtérülési idő (év)
  subsidy_program text,                     -- pl. 'Otthon Melege Program'
  subsidy_max_huf numeric(14,2),
  calculated_at timestamptz not null default now(),
  calculated_by uuid references profiles(id),
  notes text
);

alter table renovation_estimates enable row level security;

create policy "Épülettagok olvashatják a felújítási becsléseket"
  on renovation_estimates for select
  using (
    exists (
      select 1 from building_members bm
      where bm.building_id = renovation_estimates.building_id
        and bm.profile_id = auth.uid()
    )
  );
```

### 3.2 Emission faktorok és konstansok

A CO₂-számításhoz szükséges kibocsátási tényezők (magyar és EU-forrásokra alapozva):

| Energiahordozó | Faktor | Forrás |
|---|---|---|
| Távhő (FŐTÁV, Budapest) | 0,127 kg CO₂/kWh | FŐTÁV 2023 éves jelentés |
| Villamosenergia (MVM, magyar hálózat) | 0,264 kg CO₂/kWh | MEKH 2022 emissziós adat |
| Földgáz (égési emissziós faktor) | 0,202 kg CO₂/kWh | IPCC AR6, CH4 2022 |
| Víz (melegvíz-előállítás távhővel) | 0,127 kg CO₂/kWh | FŐTÁV |
| Napenergia (PV, életciklus-átlag) | 0,045 kg CO₂/kWh | JRC-PVGIS 2023 |

**Magyar referencia-értékek:**
- Átlag lakóépület fajlagos hőfelhasználása: **135 kWh/m²/év** (KSH 2022)
- EU-s 2030-as cél (EPBD): az aktuális szint −55%-a az 1990-es bázishoz képest
- Magyarország lakóépületállományának átlagos CO₂-kibocsátása: kb. **35 kg CO₂/m²/év**

---

## 4. TypeScript típusdefiníciók

```typescript
// lib/types/energetika.ts

export type EnergyType = 'futes' | 'hmv' | 'villany' | 'gaz' | 'viz';
export type HeatingSystem = 'tavhő' | 'gáz_central' | 'gáz_egyéni' | 'hőszivattyú' | 'egyéb';
export type RenovationType =
  | 'kulso_hoszigeteles'
  | 'ablakcsere'
  | 'napelem'
  | 'hoszivattyú'
  | 'futes_korszerusites'
  | 'tet_hoszigeteles'
  | 'komplex';

export type EnergyLabel = 'A+++' | 'A++' | 'A+' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G';

export interface EmissionFactors {
  tavho: number;     // kg CO2/kWh
  villany: number;   // kg CO2/kWh
  gaz: number;       // kg CO2/kWh
  viz: number;       // kg CO2/kWh (melegvíz esetén)
}

export const EMISSION_FACTORS: EmissionFactors = {
  tavho: 0.127,
  villany: 0.264,
  gaz: 0.202,
  viz: 0.127,
} as const;

export const HUNGARIAN_AVERAGE_PRIMARY_ENERGY_KWH_PER_M2 = 135;
export const BUDAPEST_SOLAR_IRRADIATION_KWH_PER_M2_YEAR = 1350;
export const PV_EFFICIENCY_MONO = 0.20;       // 20% monocrystalline hatásfok
export const PV_PERFORMANCE_RATIO = 0.80;    // 80% performance ratio (árnyék, hőmérséklet, inverter)

export interface BuildingEnergyProfile {
  id: string;
  building_id: string;
  heated_floor_area: number | null;
  construction_year: number | null;
  panel_type: string | null;
  floors: number | null;
  units_count: number | null;
  wall_u_value: number | null;
  window_u_value: number | null;
  roof_u_value: number | null;
  heating_system: HeatingSystem;
  roof_area: number | null;
  roof_orientation: string;
  latitude: number | null;
  longitude: number | null;
  last_renovation_year: number | null;
  has_external_insulation: boolean;
  has_new_windows: boolean;
  has_solar_panels: boolean;
}

export interface MonthlyConsumption {
  building_id: string;
  unit_id: string | null;
  unit_label: string;
  meter_type: string;
  month: string;          // ISO 8601 month string: "2025-11"
  year: number;
  month_num: number;
  consumption: number;
  reading_count: number;
}

export interface EnergyLabelResult {
  label: EnergyLabel;
  primary_energy_kwh_per_m2: number;
  co2_kg_per_m2: number;
  comparison_to_average: number; // százalék: -40 = 40%-kal jobb az átlagnál
}

export interface CO2FootprintResult {
  total_co2_kg_per_year: number;
  co2_per_m2_per_year: number;
  breakdown: {
    futes_co2: number;
    villany_co2: number;
    gaz_co2: number;
    viz_co2: number;
  };
  vs_hungarian_average_percent: number;
  vs_eu2030_target_percent: number;     // az EU 2030-as céltól hány %-ra vagyunk
}

export interface RenovationEstimate {
  id?: string;
  building_id: string;
  renovation_type: RenovationType;
  estimated_cost_huf: number;
  estimated_savings_kwh_per_year: number;
  estimated_co2_saving_kg_per_year: number;
  payback_years: number;
  subsidy_program: string | null;
  subsidy_max_huf: number | null;
  notes: string | null;
}

export interface SolarPotentialResult {
  usable_roof_area_m2: number;
  max_panel_count: number;
  max_installed_kw: number;
  estimated_annual_kwh: number;
  estimated_co2_offset_kg: number;
  estimated_cost_huf: number;
  payback_years: number;
  orientation_factor: number;
}
```

---

## 5. Server Actions — Energetika

```typescript
// app/actions/energetika.ts
'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type {
  BuildingEnergyProfile,
  RenovationEstimate,
  CO2FootprintResult,
  EnergyLabelResult,
  SolarPotentialResult,
  EnergyLabel,
} from '@/lib/types/energetika';
import {
  EMISSION_FACTORS,
  BUDAPEST_SOLAR_IRRADIATION_KWH_PER_M2_YEAR,
  PV_EFFICIENCY_MONO,
  PV_PERFORMANCE_RATIO,
  HUNGARIAN_AVERAGE_PRIMARY_ENERGY_KWH_PER_M2,
} from '@/lib/types/energetika';

// Energetikai profil mentése
export async function upsertBuildingEnergyProfile(
  profile: Partial<BuildingEnergyProfile> & { building_id: string }
) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Nem vagy bejelentkezve.' };

  const { error } = await supabase
    .from('building_energy_profile')
    .upsert({ ...profile, updated_at: new Date().toISOString() })
    .eq('building_id', profile.building_id);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/w/${profile.building_id}/energetika`);
  return { success: true };
}

// CO2 lábnyom kiszámítása a meglévő mérési adatokból
export async function calculateBuildingCO2Footprint(
  buildingId: string,
  year: number
): Promise<CO2FootprintResult | null> {
  const supabase = createClient();

  // Havi fogyasztás lekérése az adott évre
  const { data: consumptions, error } = await supabase
    .from('energy_consumption_monthly')
    .select('*')
    .eq('building_id', buildingId)
    .eq('year', year);

  if (error || !consumptions) return null;

  // Épület alapterülete
  const { data: profile } = await supabase
    .from('building_energy_profile')
    .select('heated_floor_area, heating_system')
    .eq('building_id', buildingId)
    .single();

  const heatedArea = profile?.heated_floor_area ?? 1;

  // Csoportosítás mérőtípus szerint
  let futes_kwh = 0;
  let villany_kwh = 0;
  let gaz_kwh = 0;
  let viz_kwh = 0;

  for (const row of consumptions) {
    const c = Number(row.consumption) || 0;
    if (row.meter_type === 'gaz') {
      // gáz: m³ → kWh konverzió (fűtőérték 10,55 kWh/m³)
      const kwh = c * 10.55;
      // Ha a fűtés forrása gáz, akkor fűtési emisszió
      if (profile?.heating_system === 'gáz_central' || profile?.heating_system === 'gáz_egyéni') {
        futes_kwh += kwh * 0.75; // 75% fűtés, 25% HMV
        viz_kwh += kwh * 0.25;
      } else {
        gaz_kwh += kwh;
      }
    } else if (row.meter_type === 'villany') {
      villany_kwh += c; // kWh
    } else if (row.meter_type === 'viz') {
      // hideg víz: nem számítunk CO2-t (vízszolgáltatás)
    }
  }

  // Távhő estén a gáz-adatból nem tudunk következtetni, külön értéket kell rögzíteni
  // Ide jövőbeli tavho_kwh mérőtípus kerül; egyelőre zéró
  const futes_co2 = futes_kwh * EMISSION_FACTORS.tavho;
  const villany_co2 = villany_kwh * EMISSION_FACTORS.villany;
  const gaz_co2 = gaz_kwh * EMISSION_FACTORS.gaz;
  const viz_co2 = viz_kwh * EMISSION_FACTORS.viz;

  const total_co2_kg_per_year = futes_co2 + villany_co2 + gaz_co2 + viz_co2;
  const co2_per_m2 = heatedArea > 0 ? total_co2_kg_per_year / heatedArea : 0;

  const HUNGARIAN_AVERAGE_CO2 = 35; // kg CO2/m²/év
  const EU_2030_TARGET_CO2 = HUNGARIAN_AVERAGE_CO2 * 0.45; // -55% az 1990-eshez képest (proxy)

  return {
    total_co2_kg_per_year,
    co2_per_m2_per_year: co2_per_m2,
    breakdown: { futes_co2, villany_co2, gaz_co2, viz_co2 },
    vs_hungarian_average_percent: ((co2_per_m2 - HUNGARIAN_AVERAGE_CO2) / HUNGARIAN_AVERAGE_CO2) * 100,
    vs_eu2030_target_percent: ((co2_per_m2 - EU_2030_TARGET_CO2) / EU_2030_TARGET_CO2) * 100,
  };
}

// EU energiaosztály becslése
export function estimateEnergyLabel(
  primaryEnergyKwhPerM2: number
): EnergyLabelResult {
  const thresholds: { max: number; label: EnergyLabel }[] = [
    { max: 25,  label: 'A+++' },
    { max: 50,  label: 'A++' },
    { max: 75,  label: 'A+' },
    { max: 100, label: 'A' },
    { max: 150, label: 'B' },
    { max: 200, label: 'C' },
    { max: 250, label: 'D' },
    { max: 300, label: 'E' },
    { max: 400, label: 'F' },
    { max: Infinity, label: 'G' },
  ];

  const found = thresholds.find(t => primaryEnergyKwhPerM2 <= t.max)!;
  const co2 = primaryEnergyKwhPerM2 * EMISSION_FACTORS.tavho; // proxy
  const comparison = ((primaryEnergyKwhPerM2 - HUNGARIAN_AVERAGE_PRIMARY_ENERGY_KWH_PER_M2) /
    HUNGARIAN_AVERAGE_PRIMARY_ENERGY_KWH_PER_M2) * 100;

  return {
    label: found.label,
    primary_energy_kwh_per_m2: primaryEnergyKwhPerM2,
    co2_kg_per_m2: co2,
    comparison_to_average: comparison,
  };
}

// Napelem-potenciál számítása
export function calculateSolarPotential(
  profile: Pick<BuildingEnergyProfile, 'roof_area' | 'roof_orientation' | 'units_count'>
): SolarPotentialResult {
  const orientationFactor: Record<string, number> = {
    'dél': 1.00,
    'dél-kelet': 0.94,
    'dél-nyugat': 0.94,
    'kelet': 0.80,
    'nyugat': 0.80,
    'észak': 0.55,
  };

  const orientation = profile.roof_orientation ?? 'dél';
  const factor = orientationFactor[orientation] ?? 0.80;
  const totalRoofArea = profile.roof_area ?? 0;

  // Hasznos tetőfelület: 60%-os kihasználtság (lépcsőházi bejáratok, kémények, biztonsági távolságok)
  const usableArea = totalRoofArea * 0.6;

  // 1 panel ≈ 2 m² (400W-os panel)
  const panelCount = Math.floor(usableArea / 2);
  const installedKw = (panelCount * 400) / 1000;

  // Éves termelés: Budapest napsugárzás × hatásfok × teljesítmény-arány × irányfaktor
  const annualKwh = BUDAPEST_SOLAR_IRRADIATION_KWH_PER_M2_YEAR
    * (installedKw / 1) // 1 kWp évi termelés
    * PV_PERFORMANCE_RATIO
    * factor;

  // CO2 megtakarítás: villamosenergia-emisszió kiváltása
  const co2OffsetKg = annualKwh * EMISSION_FACTORS.villany;

  // Beruházási költség: ~600 000 Ft/kWp (2025-ös piaci ár)
  const costHuf = installedKw * 600_000;

  // Megtérülés: éves megtakarítás (átlag 60 Ft/kWh önfelhasználással)
  const annualSavingsHuf = annualKwh * 60;
  const paybackYears = annualSavingsHuf > 0 ? costHuf / annualSavingsHuf : 99;

  return {
    usable_roof_area_m2: usableArea,
    max_panel_count: panelCount,
    max_installed_kw: installedKw,
    estimated_annual_kwh: annualKwh,
    estimated_co2_offset_kg: co2OffsetKg,
    estimated_cost_huf: costHuf,
    payback_years: paybackYears,
    orientation_factor: factor,
  };
}
```

---

## 6. React komponensek

### 6.1 Fő energetikai dashboard

```tsx
// components/energetika/EnergyDashboard.tsx
'use client';

import { useState } from 'react';
import { CO2FootprintCard } from './CO2FootprintCard';
import { EnergyTrendChart } from './EnergyTrendChart';
import { RenovationAdvisor } from './RenovationAdvisor';
import { SolarPotentialCard } from './SolarPotentialCard';
import { EnergyLabelBadge } from './EnergyLabelBadge';
import type { BuildingEnergyProfile, MonthlyConsumption, CO2FootprintResult } from '@/lib/types/energetika';
import { useI18n } from '@/lib/i18n';

interface EnergyDashboardProps {
  buildingId: string;
  profile: BuildingEnergyProfile | null;
  monthlyConsumptions: MonthlyConsumption[];
  co2Result: CO2FootprintResult | null;
  selectedYear: number;
}

export function EnergyDashboard({
  buildingId,
  profile,
  monthlyConsumptions,
  co2Result,
  selectedYear,
}: EnergyDashboardProps) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'overview' | 'co2' | 'renovation' | 'solar'>('overview');

  const tabs = [
    { id: 'overview' as const, label: t('energetika.tabs.overview'), icon: '⚡' },
    { id: 'co2' as const, label: t('energetika.tabs.co2'), icon: '🌱' },
    { id: 'renovation' as const, label: t('energetika.tabs.renovation'), icon: '🏗' },
    { id: 'solar' as const, label: t('energetika.tabs.solar'), icon: '☀' },
  ];

  // Becsült primer energiafelhasználás kWh/m²/év
  const totalKwh = monthlyConsumptions.reduce((sum, m) => sum + Number(m.consumption), 0);
  const heatedArea = profile?.heated_floor_area ?? 1;
  const primaryEnergyPerM2 = totalKwh / heatedArea;

  return (
    <div className="space-y-6">
      {/* Fejléc összesítő */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SummaryCard
          title={t('energetika.summary.total_kwh')}
          value={`${Math.round(totalKwh).toLocaleString('hu-HU')} kWh`}
          subtitle={t('energetika.summary.per_year', { year: selectedYear })}
          colorClass="bg-amber-50 border-amber-200"
          iconColorClass="text-amber-600"
        />
        <SummaryCard
          title={t('energetika.summary.per_m2')}
          value={`${Math.round(primaryEnergyPerM2)} kWh/m²`}
          subtitle={`${t('energetika.summary.hu_avg')}: 135 kWh/m²`}
          colorClass="bg-blue-50 border-blue-200"
          iconColorClass="text-blue-600"
        />
        {co2Result && (
          <SummaryCard
            title={t('energetika.summary.co2_total')}
            value={`${Math.round(co2Result.total_co2_kg_per_year / 1000)} t CO₂`}
            subtitle={`${Math.round(co2Result.co2_per_m2_per_year)} kg/m²/év`}
            colorClass="bg-green-50 border-green-200"
            iconColorClass="text-green-600"
          />
        )}
        <div className="rounded-xl border bg-purple-50 border-purple-200 p-4 flex flex-col items-start">
          <span className="text-xs font-medium text-purple-600 uppercase tracking-wide mb-1">
            {t('energetika.summary.energy_label')}
          </span>
          <EnergyLabelBadge primaryEnergyKwhPerM2={primaryEnergyPerM2} size="lg" />
        </div>
      </div>

      {/* Tab navigáció */}
      <div className="flex gap-1 rounded-xl bg-gray-100 p-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={[
              'flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              activeTab === tab.id
                ? 'bg-white shadow text-gray-900'
                : 'text-gray-500 hover:text-gray-700',
            ].join(' ')}
          >
            <span className="mr-1">{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab tartalom */}
      <div>
        {activeTab === 'overview' && (
          <EnergyTrendChart
            consumptions={monthlyConsumptions}
            buildingId={buildingId}
            selectedYear={selectedYear}
          />
        )}
        {activeTab === 'co2' && co2Result && (
          <CO2FootprintCard
            co2Result={co2Result}
            buildingId={buildingId}
            year={selectedYear}
          />
        )}
        {activeTab === 'renovation' && (
          <RenovationAdvisor
            buildingId={buildingId}
            profile={profile}
            primaryEnergyPerM2={primaryEnergyPerM2}
          />
        )}
        {activeTab === 'solar' && (
          <SolarPotentialCard
            buildingId={buildingId}
            profile={profile}
          />
        )}
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  subtitle,
  colorClass,
  iconColorClass,
}: {
  title: string;
  value: string;
  subtitle: string;
  colorClass: string;
  iconColorClass: string;
}) {
  return (
    <div className={`rounded-xl border ${colorClass} p-4`}>
      <p className={`text-xs font-medium ${iconColorClass} uppercase tracking-wide`}>{title}</p>
      <p className="mt-1 text-xl font-bold text-gray-900">{value}</p>
      <p className="mt-0.5 text-xs text-gray-500">{subtitle}</p>
    </div>
  );
}
```

### 6.2 CO₂ lábnyom kártya

```tsx
// components/energetika/CO2FootprintCard.tsx
'use client';

import { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { CO2FootprintResult } from '@/lib/types/energetika';
import { useI18n } from '@/lib/i18n';

interface CO2FootprintCardProps {
  co2Result: CO2FootprintResult;
  buildingId: string;
  year: number;
}

const COLORS = {
  futes: '#ef4444',    // piros
  villany: '#f59e0b',  // sárga
  gaz: '#3b82f6',      // kék
  viz: '#06b6d4',      // cián
};

export function CO2FootprintCard({ co2Result, year }: CO2FootprintCardProps) {
  const { t } = useI18n();

  const pieData = useMemo(() => [
    { name: t('energetika.co2.futes'), value: Math.round(co2Result.breakdown.futes_co2), color: COLORS.futes },
    { name: t('energetika.co2.villany'), value: Math.round(co2Result.breakdown.villany_co2), color: COLORS.villany },
    { name: t('energetika.co2.gaz'), value: Math.round(co2Result.breakdown.gaz_co2), color: COLORS.gaz },
    { name: t('energetika.co2.viz'), value: Math.round(co2Result.breakdown.viz_co2), color: COLORS.viz },
  ].filter(d => d.value > 0), [co2Result, t]);

  const vsAvgText = co2Result.vs_hungarian_average_percent > 0
    ? `+${Math.round(co2Result.vs_hungarian_average_percent)}% az országos átlagnál`
    : `${Math.round(co2Result.vs_hungarian_average_percent)}% az országos átlagnál`;

  const vsAvgColor = co2Result.vs_hungarian_average_percent > 0 ? 'text-red-600' : 'text-green-600';

  // EU 2030-as cél távolsága
  const eu2030Color = co2Result.vs_eu2030_target_percent > 0 ? 'text-orange-600' : 'text-green-600';
  const eu2030Text = co2Result.vs_eu2030_target_percent > 0
    ? `Az EU 2030-as céltól ${Math.round(co2Result.vs_eu2030_target_percent)}%-kal elmarad`
    : `EU 2030-as célt teljesíti (${Math.abs(Math.round(co2Result.vs_eu2030_target_percent))}%-os tartalékkal)`;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Bal panel: számok */}
      <div className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {t('energetika.co2.title', { year })}
        </h3>

        <div className="rounded-lg bg-gray-50 p-4 text-center">
          <p className="text-4xl font-bold text-gray-900">
            {Math.round(co2Result.total_co2_kg_per_year / 1000 * 10) / 10}
            <span className="text-xl font-normal text-gray-500 ml-1">t CO₂/év</span>
          </p>
          <p className="mt-1 text-sm text-gray-500">
            {Math.round(co2Result.co2_per_m2_per_year)} kg CO₂/m²/év
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
            <span className="text-sm text-gray-600">Viszonyítás (HU átlag)</span>
            <span className={`text-sm font-semibold ${vsAvgColor}`}>{vsAvgText}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
            <span className="text-sm text-gray-600">EU 2030-as cél</span>
            <span className={`text-sm font-semibold ${eu2030Color}`}>{eu2030Text}</span>
          </div>
        </div>

        {/* Kibocsátási tényezők forrása */}
        <details className="text-xs text-gray-400">
          <summary className="cursor-pointer hover:text-gray-600">Emissziósfaktor-források</summary>
          <ul className="mt-2 space-y-1 pl-4">
            <li>Távhő: 0,127 kg CO₂/kWh (FŐTÁV 2023)</li>
            <li>Villany: 0,264 kg CO₂/kWh (MEKH 2022)</li>
            <li>Földgáz: 0,202 kg CO₂/kWh (IPCC AR6)</li>
          </ul>
        </details>
      </div>

      {/* Jobb panel: kördiagram */}
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h4 className="mb-4 text-sm font-medium text-gray-700">
          {t('energetika.co2.breakdown_title')}
        </h4>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={3}
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell key={index} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => [`${value.toLocaleString('hu-HU')} kg CO₂`, '']}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
```

### 6.3 Felújítási javaslattevő

```tsx
// components/energetika/RenovationAdvisor.tsx
'use client';

import { useState, useTransition } from 'react';
import type { BuildingEnergyProfile, RenovationType } from '@/lib/types/energetika';
import { useI18n } from '@/lib/i18n';

interface RenovationOption {
  type: RenovationType;
  label: string;
  description: string;
  avgSavingsPercent: number;  // átlagos energiamegtakarítás %
  avgCostPerM2Huf: number;    // becsült Ft/m²
  subsidyProgram: string | null;
  subsidyMaxHuf: number | null;
  co2ReductionPercent: number;
  recommendedFor: ('G' | 'F' | 'E' | 'D' | 'C')[];  // melyik energiaosztályhoz ajánlott
}

const RENOVATION_OPTIONS: RenovationOption[] = [
  {
    type: 'kulso_hoszigeteles',
    label: 'Külső hőszigetelés (ETICS)',
    description: 'Polisztirol vagy kőzetgyapot alapú külső homlokzati hőszigetelő rendszer. A panelházak legjelentősebb veszteségforrását (falakon át leadott hő) csökkenti 60–80%-kal.',
    avgSavingsPercent: 30,
    avgCostPerM2Huf: 35_000,
    subsidyProgram: 'Otthon Melege Program',
    subsidyMaxHuf: 6_000_000,
    co2ReductionPercent: 28,
    recommendedFor: ['G', 'F', 'E'],
  },
  {
    type: 'ablakcsere',
    label: 'Hőhídmentes nyílászárócsere',
    description: '3 rétegű, Ug ≤ 0,7 W/m²K-es ablakok beépítése. Panelházaknál az ablakcsere 15–25%-os fűtési megtakarítást eredményezhet.',
    avgSavingsPercent: 18,
    avgCostPerM2Huf: 120_000,  // ablakfelületre vetítve
    subsidyProgram: 'Plus Otthon Program',
    subsidyMaxHuf: 3_000_000,
    co2ReductionPercent: 16,
    recommendedFor: ['G', 'F', 'E', 'D'],
  },
  {
    type: 'napelem',
    label: 'Napelemes rendszer (PV)',
    description: 'Tetőfelületre telepített monokristályos napelemrendszer. A közös villamosenergia-fogyasztást (lépcsőházi világítás, lift, közös helyiségek) csökkenti.',
    avgSavingsPercent: 40,   // villamosenergia-fogyasztáson belül
    avgCostPerM2Huf: 300_000, // telepített kWp-re vetítve
    subsidyProgram: 'KEHOP 5.2.1 (pályázatfüggő)',
    subsidyMaxHuf: 15_000_000,
    co2ReductionPercent: 12,
    recommendedFor: ['G', 'F', 'E', 'D', 'C'],
  },
  {
    type: 'hoszivattyú',
    label: 'Hőszivattyús fűtésrendszer',
    description: 'Levegő–víz hőszivattyú a meglévő radiátoros fűtési rendszerhez. COP ≥ 3,0 esetén a fűtési energiaszükséglet villamos alapon biztosítható.',
    avgSavingsPercent: 45,
    avgCostPerM2Huf: 50_000,
    subsidyProgram: 'Magyar Hőszivattyú Program (2025)',
    subsidyMaxHuf: 4_000_000,
    co2ReductionPercent: 35,
    recommendedFor: ['G', 'F', 'E', 'D'],
  },
  {
    type: 'komplex',
    label: 'Komplex felújítás (EPBD-kompatibilis)',
    description: 'Hőszigetelés + ablakcsere + fűtéskorszerűsítés egyszerre. Az EPBD 2030-as kötelező minimumkövetelményt (E osztály) biztosan teljesíti. Legnagyobb megtakarítás és legjobb megtérülés.',
    avgSavingsPercent: 60,
    avgCostPerM2Huf: 80_000,
    subsidyProgram: 'Otthon Melege Komplex',
    subsidyMaxHuf: 15_000_000,
    co2ReductionPercent: 55,
    recommendedFor: ['G', 'F'],
  },
];

interface RenovationAdvisorProps {
  buildingId: string;
  profile: BuildingEnergyProfile | null;
  primaryEnergyPerM2: number;
}

export function RenovationAdvisor({ buildingId, profile, primaryEnergyPerM2 }: RenovationAdvisorProps) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState<RenovationType | null>(null);
  const [, startTransition] = useTransition();

  const heatedArea = profile?.heated_floor_area ?? 500;

  // Jelenlegi energiaosztály meghatározása
  const currentLabel = primaryEnergyPerM2 > 400 ? 'G'
    : primaryEnergyPerM2 > 300 ? 'F'
    : primaryEnergyPerM2 > 250 ? 'E'
    : primaryEnergyPerM2 > 200 ? 'D'
    : 'C';

  const relevantOptions = RENOVATION_OPTIONS.filter(
    opt => opt.recommendedFor.includes(currentLabel as never)
  );

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-amber-50 border-amber-200 p-4">
        <p className="text-sm text-amber-800">
          <strong>Jelenlegi becsült energiaosztály: {currentLabel}</strong>
          {' '}— Az alábbi felújítási javaslatok az épület aktuális állapota és az EU 2030-as kötelező
          minimumkövetelmények alapján kerültek rangsorolásra.
        </p>
      </div>

      {relevantOptions.map(option => {
        const estimatedSavingsKwh = (primaryEnergyPerM2 * option.avgSavingsPercent / 100) * heatedArea;
        const estimatedCostHuf = option.type === 'napelem'
          ? 600_000 * 10  // 10 kWp rendszer proxy
          : option.avgCostPerM2Huf * heatedArea;
        const annualEnergyCostHuf = estimatedSavingsKwh * 55; // ~55 Ft/kWh átlag
        const paybackYears = annualEnergyCostHuf > 0 ? estimatedCostHuf / annualEnergyCostHuf : 99;
        const netCostAfterSubsidy = option.subsidyMaxHuf
          ? Math.max(0, estimatedCostHuf - option.subsidyMaxHuf)
          : estimatedCostHuf;

        return (
          <div key={option.type} className="rounded-xl border bg-white shadow-sm overflow-hidden">
            <button
              className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
              onClick={() => setExpanded(expanded === option.type ? null : option.type)}
            >
              <div>
                <h4 className="font-semibold text-gray-900">{option.label}</h4>
                <div className="mt-1 flex gap-3 text-xs text-gray-500">
                  <span className="text-green-700 font-medium">
                    -{option.avgSavingsPercent}% energia
                  </span>
                  <span className="text-blue-700 font-medium">
                    -{option.co2ReductionPercent}% CO₂
                  </span>
                  {option.subsidyProgram && (
                    <span className="text-purple-700 font-medium">Támogatható</span>
                  )}
                </div>
              </div>
              <span className="text-gray-400 ml-4">{expanded === option.type ? '▲' : '▼'}</span>
            </button>

            {expanded === option.type && (
              <div className="border-t px-4 pb-4 pt-3 space-y-3">
                <p className="text-sm text-gray-600">{option.description}</p>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <MetricBox label="Becsült beruházás" value={`${(estimatedCostHuf / 1_000_000).toFixed(1)} M Ft`} />
                  <MetricBox label="Max. támogatás" value={option.subsidyMaxHuf ? `${(option.subsidyMaxHuf / 1_000_000).toFixed(0)} M Ft` : '—'} />
                  <MetricBox label="Nettó önrész" value={`${(netCostAfterSubsidy / 1_000_000).toFixed(1)} M Ft`} />
                  <MetricBox label="Megtérülés" value={`${paybackYears.toFixed(1)} év`} />
                </div>

                {option.subsidyProgram && (
                  <div className="rounded-lg bg-purple-50 border border-purple-200 px-3 py-2">
                    <p className="text-xs text-purple-700">
                      <strong>Támogatási program:</strong> {option.subsidyProgram}
                    </p>
                    <p className="text-xs text-purple-600 mt-0.5">
                      Részletek: palyazat.gov.hu — ajánlott pályázatíró bevonása
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 p-3 text-center">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-gray-900">{value}</p>
    </div>
  );
}
```

### 6.4 Napelemes potenciál kártya

```tsx
// components/energetika/SolarPotentialCard.tsx
'use client';

import { useMemo } from 'react';
import type { BuildingEnergyProfile } from '@/lib/types/energetika';
import { calculateSolarPotential } from '@/app/actions/energetika';
import { useI18n } from '@/lib/i18n';

interface SolarPotentialCardProps {
  buildingId: string;
  profile: BuildingEnergyProfile | null;
}

const ORIENTATION_LABELS: Record<string, string> = {
  'dél': 'Dél (optimális)',
  'dél-kelet': 'Dél-kelet',
  'dél-nyugat': 'Dél-nyugat',
  'kelet': 'Kelet',
  'nyugat': 'Nyugat',
  'észak': 'Észak (nem ajánlott)',
};

export function SolarPotentialCard({ profile }: SolarPotentialCardProps) {
  const { t } = useI18n();

  const solar = useMemo(() => {
    if (!profile?.roof_area) return null;
    return calculateSolarPotential({
      roof_area: profile.roof_area,
      roof_orientation: profile.roof_orientation ?? 'dél',
      units_count: profile.units_count,
    });
  }, [profile]);

  if (!profile?.roof_area) {
    return (
      <div className="rounded-xl border bg-amber-50 border-amber-200 p-8 text-center">
        <p className="text-amber-800 font-medium">
          A napelem-potenciál számításhoz meg kell adni az épület tetőfelületét az Energetikai Profil szerkesztőjében.
        </p>
      </div>
    );
  }

  if (!solar) return null;

  const perUnitKwh = profile.units_count && profile.units_count > 0
    ? solar.estimated_annual_kwh / profile.units_count
    : null;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Baloldal: fő számok */}
      <div className="rounded-xl border bg-white shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">☀</span>
          <div>
            <h3 className="font-semibold text-gray-900">Napelem-potenciál számítás</h3>
            <p className="text-xs text-gray-500">
              Budapest napenergia: 1 350 kWh/m²/év (PVGIS 2023) |{' '}
              {ORIENTATION_LABELS[profile.roof_orientation ?? 'dél']}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <StatBox label="Felhasználható tetőfelület" value={`${Math.round(solar.usable_roof_area_m2)} m²`} />
          <StatBox label="Max. telepíthető kapacitás" value={`${solar.max_installed_kw.toFixed(1)} kWp`} />
          <StatBox label="Becsült éves termelés" value={`${Math.round(solar.estimated_annual_kwh).toLocaleString('hu-HU')} kWh`} />
          <StatBox label="CO₂ megtakarítás" value={`${Math.round(solar.estimated_co2_offset_kg / 1000 * 10) / 10} t CO₂/év`} />
        </div>

        {perUnitKwh && (
          <div className="rounded-lg bg-green-50 border border-green-200 px-3 py-2">
            <p className="text-sm text-green-800">
              <strong>Lakásonkénti részesedés:</strong>{' '}
              ~{Math.round(perUnitKwh).toLocaleString('hu-HU')} kWh/év
              ({Math.round(perUnitKwh * 60).toLocaleString('hu-HU')} Ft/év megtakarítás lakásonként)
            </p>
          </div>
        )}

        <div className="rounded-lg bg-gray-50 p-3 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Becsült beruházási költség:</span>
            <span className="font-semibold">{(solar.estimated_cost_huf / 1_000_000).toFixed(1)} M Ft</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Megtérülési idő (60 Ft/kWh önfelhasználással):</span>
            <span className="font-semibold">{solar.payback_years.toFixed(1)} év</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Irány-korrekciós tényező:</span>
            <span className="font-semibold">{(solar.orientation_factor * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>

      {/* Jobboldal: infografika és megjegyzések */}
      <div className="rounded-xl border bg-white shadow-sm p-6 space-y-4">
        <h4 className="font-medium text-gray-900">Számítási módszertan</h4>
        <ul className="space-y-2 text-sm text-gray-600">
          <li className="flex gap-2">
            <span className="text-blue-500 mt-0.5">→</span>
            <span>Teljes tetőfelület × 60% kihasználtság = hasznos felület (lépcsőházak, kémények, biztonsági zónák levonva)</span>
          </li>
          <li className="flex gap-2">
            <span className="text-blue-500 mt-0.5">→</span>
            <span>Panelszám: hasznos felület / 2 m² (400W monokristályos panel)</span>
          </li>
          <li className="flex gap-2">
            <span className="text-blue-500 mt-0.5">→</span>
            <span>Termelés: Budapest napsugárzás (1 350 kWh/m²/év) × 0,80 teljesítmény-arány × irányfaktor</span>
          </li>
          <li className="flex gap-2">
            <span className="text-blue-500 mt-0.5">→</span>
            <span>CO₂ megtakarítás: MVM hálózati emissziós faktor (0,264 kg CO₂/kWh)</span>
          </li>
        </ul>

        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
          <p className="text-xs text-blue-800">
            <strong>Fontos:</strong> Ez egy tájékoztató jellegű becslés. Pontos tervezéshez
            árnyék-analízis (PVGIS.ec.europa.eu), statikai felmérés és engedélyezési eljárás szükséges.
            Közös épületen telepített napelemes rendszer esetén a lakóközösség 2/3-os szavazattöbbsége szükséges
            (Társasházi törvény 2003. évi CXXXIII. tv.).
          </p>
        </div>

        <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
          <p className="text-xs text-amber-800">
            <strong>Támogatás:</strong> Közösségi napelemes rendszerekre a KEHOP 5.2.1 és a
            Kis-és középvállalkozói energetikai pályázatok nyújtanak forrást. Az aktuális kiírásokat
            a palyazat.gov.hu oldalon lehet nyomon követni.
          </p>
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-gray-900">{value}</p>
    </div>
  );
}
```

---

## 7. Energiatrend grafikon (Recharts integráció)

```tsx
// components/energetika/EnergyTrendChart.tsx
'use client';

import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { MonthlyConsumption } from '@/lib/types/energetika';
import { useI18n } from '@/lib/i18n';

const HUNGARIAN_MONTHS = [
  'Jan', 'Feb', 'Már', 'Ápr', 'Máj', 'Jún',
  'Júl', 'Aug', 'Szep', 'Okt', 'Nov', 'Dec',
];

const METER_COLORS: Record<string, string> = {
  viz: '#06b6d4',
  gaz: '#3b82f6',
  villany: '#f59e0b',
};

const METER_LABELS: Record<string, string> = {
  viz: 'Víz (m³)',
  gaz: 'Gáz (m³)',
  villany: 'Villany (kWh)',
};

interface EnergyTrendChartProps {
  consumptions: MonthlyConsumption[];
  buildingId: string;
  selectedYear: number;
}

export function EnergyTrendChart({ consumptions, selectedYear }: EnergyTrendChartProps) {
  const { t } = useI18n();

  // Adatok átalakítása: hónapok × mérőtípusok pivot
  const chartData = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const monthName = HUNGARIAN_MONTHS[i];
    const row: Record<string, string | number> = { month: monthName };

    for (const meterType of ['viz', 'gaz', 'villany'] as const) {
      const found = consumptions.find(
        c => Number(c.month_num) === month && c.meter_type === meterType
      );
      row[meterType] = found ? Number(found.consumption) : 0;
    }
    return row;
  });

  const activeMeterTypes = ['viz', 'gaz', 'villany'].filter(mt =>
    consumptions.some(c => c.meter_type === mt && Number(c.consumption) > 0)
  );

  if (consumptions.length === 0) {
    return (
      <div className="rounded-xl border bg-gray-50 p-12 text-center">
        <p className="text-gray-500">
          Még nincs elegendő mérési adat a grafikon megjelenítéséhez.
          Rögzíts mérőállásokat a Mérőóra modul segítségével.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-white shadow-sm p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-4">
          Havi fogyasztás — {selectedYear}
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value: number, name: string) => [
                value.toLocaleString('hu-HU'),
                METER_LABELS[name] ?? name,
              ]}
            />
            <Legend
              formatter={(value) => METER_LABELS[value] ?? value}
            />
            {activeMeterTypes.map(mt => (
              <Bar
                key={mt}
                dataKey={mt}
                fill={METER_COLORS[mt]}
                radius={[3, 3, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Év-összehasonlítás alap */}
      <div className="rounded-xl border bg-white shadow-sm p-6">
        <h3 className="text-base font-semibold text-gray-900 mb-2">
          Éves összesítő
        </h3>
        <div className="grid grid-cols-3 gap-3">
          {activeMeterTypes.map(mt => {
            const total = consumptions
              .filter(c => c.meter_type === mt)
              .reduce((sum, c) => sum + Number(c.consumption), 0);
            return (
              <div
                key={mt}
                className="rounded-lg p-3 text-center"
                style={{ backgroundColor: METER_COLORS[mt] + '22', borderColor: METER_COLORS[mt] + '44', borderWidth: 1 }}
              >
                <p className="text-xs text-gray-600">{METER_LABELS[mt]}</p>
                <p className="mt-1 text-xl font-bold text-gray-900">
                  {Math.round(total).toLocaleString('hu-HU')}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

---

## 8. Route és oldal (Next.js 14 App Router)

```tsx
// app/w/[workspaceId]/energetika/page.tsx
import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { EnergyDashboard } from '@/components/energetika/EnergyDashboard';
import { calculateBuildingCO2Footprint } from '@/app/actions/energetika';
import { redirect } from 'next/navigation';

interface PageProps {
  params: { workspaceId: string };
  searchParams: { year?: string };
}

export default async function EnergetikaPage({ params, searchParams }: PageProps) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const buildingId = params.workspaceId;
  const selectedYear = parseInt(searchParams.year ?? String(new Date().getFullYear()), 10);

  // Energetikai profil lekérése
  const { data: profile } = await supabase
    .from('building_energy_profile')
    .select('*')
    .eq('building_id', buildingId)
    .single();

  // Havi fogyasztás lekérése (materializált nézetből, ha rendelkezésre áll)
  const { data: rawConsumptions } = await supabase
    .from('energy_consumption_monthly')
    .select('*')
    .eq('building_id', buildingId)
    .eq('year', selectedYear)
    .order('month_num', { ascending: true });

  const monthlyConsumptions = rawConsumptions ?? [];

  // CO2 számítás szerver oldalon
  const co2Result = await calculateBuildingCO2Footprint(buildingId, selectedYear);

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Épületenergetika és CO₂ Nyomkövető</h1>
        <p className="mt-1 text-sm text-gray-500">
          Az épület energiafogyasztásának elemzése, szénlábnyom és felújítási javaslatok
        </p>
      </div>

      <Suspense fallback={<div className="animate-pulse h-96 bg-gray-100 rounded-xl" />}>
        <EnergyDashboard
          buildingId={buildingId}
          profile={profile}
          monthlyConsumptions={monthlyConsumptions}
          co2Result={co2Result}
          selectedYear={selectedYear}
        />
      </Suspense>
    </div>
  );
}
```

---

## 9. Lokalizáció (i18n)

A feature minden felhasználói szövege hozzáadandó a meglévő lokalizációs fájlokhoz.

### Magyar (`src/i18n/resources/hu.ts`) — kiegészítés:

```typescript
// Hozzáadandó az energetika névtérbe
energetika: {
  tabs: {
    overview: 'Fogyasztás áttekintés',
    co2: 'CO₂ lábnyom',
    renovation: 'Felújítási javaslatok',
    solar: 'Napelem-potenciál',
  },
  summary: {
    total_kwh: 'Összes fogyasztás',
    per_year: '{{year}}. évi adat',
    per_m2: 'Fajlagos fogyasztás',
    hu_avg: 'Magyar átlag',
    co2_total: 'CO₂ kibocsátás',
    energy_label: 'Energiaosztály',
  },
  co2: {
    title: 'CO₂ lábnyom — {{year}}',
    breakdown_title: 'Kibocsátás összetevői',
    futes: 'Fűtés',
    villany: 'Villany',
    gaz: 'Gáz',
    viz: 'Melegvíz',
  },
  label: {
    excellent: 'Kiváló',
    good: 'Jó',
    average: 'Átlagos',
    below_average: 'Átlag alatti',
    poor: 'Gyenge',
    very_poor: 'Nagyon gyenge',
  },
},
```

### Angol (`src/i18n/resources/en.ts`) — kiegészítés:

```typescript
energetika: {
  tabs: {
    overview: 'Consumption overview',
    co2: 'CO₂ footprint',
    renovation: 'Renovation advice',
    solar: 'Solar potential',
  },
  summary: {
    total_kwh: 'Total consumption',
    per_year: '{{year}} data',
    per_m2: 'Specific consumption',
    hu_avg: 'Hungarian average',
    co2_total: 'CO₂ emissions',
    energy_label: 'Energy class',
  },
  co2: {
    title: 'CO₂ footprint — {{year}}',
    breakdown_title: 'Emissions breakdown',
    futes: 'Heating',
    villany: 'Electricity',
    gaz: 'Gas',
    viz: 'Hot water',
  },
  label: {
    excellent: 'Excellent',
    good: 'Good',
    average: 'Average',
    below_average: 'Below average',
    poor: 'Poor',
    very_poor: 'Very poor',
  },
},
```

---

## 10. EU Energiaosztály (EPC) Számítási Módszertan

### 10.1 Az EPBD kategóriarendszer

Az EU Épületenergetikai Irányelv (EPBD, 2002/91/EK és 2018/844/EU módosítása) alapján az energiaosztályok a **primer energiafelhasználás** (kWh/m²/év) alapján kerülnek meghatározásra. Magyarországon az MSZ EN ISO 52000-es szabványsorozat az alkalmazandó keretrendszer.

**Primer energiaszükséglet = végső energiafelhasználás × primer energiafaktor**

| Energiahordozó | Primer energiafaktor (Fp) |
|---|---|
| Villamos energia | 2,5 |
| Földgáz | 1,0 |
| Megújuló energia | 1,0 |
| Távhő (átlag) | 0,8 |

**Energiaosztályok (Magyarország, TNM rendelet 7/2006.):**

| Osztály | Primer energia (kWh/m²/év) | Jellemző épülettípus |
|---|---|---|
| A+++ | ≤ 25 | Passzívház, közel nulla energiájú |
| A++ | 26–50 | Közel nulla energiájú (NZEB) |
| A+ | 51–75 | Új építésű, 2023 utáni szabvány |
| A | 76–100 | Korszerűen felújított |
| B | 101–150 | Jó minőségű 2000-es évek épülete |
| C | 151–200 | Átlagos |
| D | 201–250 | Gyenge szigetelés |
| E | 251–300 | Elavult — EPBD 2030-as minimumkövetelmény határa |
| F | 301–400 | Nagyon elavult |
| G | > 400 | Panelház korszerűsítés nélkül (tipikus érték: 300–500) |

### 10.2 A panelházak helyzete

A nem felújított panelházak tipikusan **E–G osztályba** esnek, ahol:
- Az 1960–1975 között épített korai panelépületek általában G osztályba kerülnek (primer energia > 400 kWh/m²/év)
- Az 1975–1990 között épültek F–G osztályba (350–450 kWh/m²/év)
- Homlokzati hőszigetelés + ablakcsere után: E–D osztályba (250–300 kWh/m²/év)
- Komplex felújítás (ETICS + ablak + fűtés) esetén: C–B (150–200 kWh/m²/év)

### 10.3 Számítási egyszerűsítés (proxy módszer)

Mivel a panellako.hu mérőóra-adatok alapján nem áll rendelkezésre mérnöki részletességű energetikai audit, a feature **proxy módszert** alkalmaz:

```
primer_energia ≈ (mért_végső_energia_kWh / fűtött_alapterület_m²) × átlag_primer_energiafaktor
```

A felhasználó figyelmeztetést kap, hogy ez nem helyettesíti az MSZ EN ISO 52000 szerinti auditot, amelyet hatósági célra (pályázat, eladás) tanúsított energetikus által végzett szakértői vizsgálattal kell alátámasztani.

---

## 11. Magyar energiaár-referencia táblázat (frissítendő)

A feature hardkódolt, de dokumentált energiaárakat használ az ROI számításhoz. Ezeket évente frissíteni kell — a frissítés helye: `lib/constants/energy-prices.ts`.

```typescript
// lib/constants/energy-prices.ts
// Frissítve: 2025. május — forrás: MVM Next, FŐTÁV díjszabások

export const ENERGY_PRICES_HUF = {
  // MVM Next — védett fogyasztói ár (háztartások, 2025. jan. 1-től)
  villany_protected_huf_per_kwh: 36,    // védett fogyasztói ár (évi 2523 kWh-ig)
  villany_market_huf_per_kwh: 95,       // piaci ár feletti fogyasztás

  // FŐTÁV távhőszolgáltatás Budapest
  tavho_huf_per_gj: 4_850,             // 2025 Q1 FŐTÁV alaptarifa (GJ)
  tavho_huf_per_kwh: 1.347,            // 1 GJ = 277,78 kWh → 4850/3600

  // MVM Next gáz (háztartási védett ár)
  gaz_protected_huf_per_m3: 340,       // védett ár (2023-as befagyasztott ár státusz)
  gaz_market_huf_per_m3: 590,          // piaci ár

  // Hideg víz (Budapest Főváros Vízművek Zrt.)
  viz_huf_per_m3: 580,                 // 2025 Q1 Budapest díj

  // Átlagos megtakarítási érték (önfelhasználásnál)
  solar_self_consumption_value_huf_per_kwh: 60,

  _last_updated: '2025-05-17',
  _source: 'MVM Next 2025 díjszabás, FŐTÁV 2025 Q1, BFV Vízművek 2025',
} as const;
```

---

## 12. Sprint terv

### Sprint 1 (1. hét) — Adatbázis és alapinfrastruktúra

**Feladatok:**
- [ ] Migrációs SQL fájl elkészítése: `supabase/migrations/20260517_energetika_extension.sql`
  - `building_energy_profile` tábla létrehozása
  - `energy_consumption_monthly` materializált nézet létrehozása
  - `renovation_estimates` tábla
  - `meter_readings` tábla bővítése (`unit_of_measure`, `conversion_factor`)
  - RLS policy-k az összes új táblára
- [ ] TypeScript típusdefiníciók: `lib/types/energetika.ts`
- [ ] Konstans fájlok: `lib/constants/energy-prices.ts`, emissziós faktorok integrálása
- [ ] `calculateBuildingCO2Footprint()` Server Action megírása és unit tesztje
- [ ] `estimateEnergyLabel()` tiszta függvény tesztelése határértékeken

**Elfogadási kritérium:**
- Migráció sikeresen lefut a Supabase-en
- A CO₂ számítás egységtesztje zöld (Jest)
- A materializált nézet frissíthető

### Sprint 2 (2. hét) — Alap UI komponensek

**Feladatok:**
- [ ] `EnergyDashboard` layout komponens négy tabbal
- [ ] `EnergyTrendChart` Recharts bar chart (havi bontás)
- [ ] `CO2FootprintCard` Recharts pie chart + összehasonlítás
- [ ] `EnergyLabelBadge` vizuális energiaosztály-jelző
- [ ] `/w/[workspaceId]/energetika` route oldal (Server Component)
- [ ] Éves szűrő (év-választó `<select>` az URL searchParam alapján)
- [ ] i18n kulcsok hozzáadása `en.ts` és `hu.ts` fájlokhoz

**Elfogadási kritérium:**
- Az oldal betöltődik meglévő mérőóra-adattal rendelkező workspace-ben
- A tab-navigáció pushState-et használ (Back gomb visszalép)
- Desktop + mobil reszponzivitás ellenőrzve (Chrome DevTools, 375px, 768px, 1440px)

### Sprint 3 (3. hét) — Felújítási javaslattevő + Napelem

**Feladatok:**
- [ ] `RenovationAdvisor` komponens az 5 renovációs opcióval
- [ ] ROI kalkulátor logika (beruházás, megtérülés, nettó önrész)
- [ ] `SolarPotentialCard` komponens a `calculateSolarPotential()` függvénnyel
- [ ] Épületprofil szerkesztő form (`BuildingEnergyProfileForm`)
  - Fűtött alapterület, építési év, fűtési rendszer
  - Tetőfelület, tájolás
  - Jelenlegi állapot checkboxok (hőszigetelés, ablakok, napelem)
- [ ] `upsertBuildingEnergyProfile()` Server Action összekötése a formmal

**Elfogadási kritérium:**
- Az épületprofil form mentése munkaterülethez köthető (admin/manager jog)
- A napelem-számítás minden tájolásra helyes eredményt ad
- A felújítási javaslatok az épülettípus szerint szűrtek

### Sprint 4 (4. hét) — Meglévő mérőóra-modul integráció + export

**Feladatok:**
- [ ] A meglévő `submitMeterReading()` Server Action bővítése `unit_of_measure` mezővel
- [ ] Átirányítás az energetika oldalra a mérőóra-leolvasás rögzítése után (opcionális)
- [ ] PDF export gomb az energetikai összesítőhöz (jsPDF vagy server-side PDF)
- [ ] Adatfrissítési jelző: ha a materializált nézet 24 óránál régebbi, figyelmeztetés
- [ ] `renovation_estimates` mentése és megjelenítése (előző számítások listája)
- [ ] End-to-end Playwright teszt az energetika oldal fő folyamatára
- [ ] Hibaüzenetek, üres állapot (empty state) minden szekciónál

**Elfogadási kritérium:**
- A teljes flow (mérőóra beírás → energetika oldal megjelenés → CO₂ eredmény) hibátlanul működik
- Playwright e2e teszt zöld
- Nincs TypeScript hiba (`tsc --noEmit`)

---

## 13. Tesztelési kritériumok

### 13.1 Funkcionális tesztek

| Teszt | Bemenet | Elvárt kimenet |
|---|---|---|
| CO₂ számítás — gáz fűtés | 1000 m³ gáz/év, 100 m² fűtött terület | ≈2130 kg CO₂/év, 21,3 kg CO₂/m² |
| CO₂ számítás — villany | 3000 kWh/év | ≈792 kg CO₂/év |
| CO₂ számítás — távhő | 15 GJ/év ≈ 4167 kWh | ≈529 kg CO₂/év |
| Energiaosztály — A+++ | 20 kWh/m²/év primer | `A+++` label |
| Energiaosztály — G | 450 kWh/m²/év primer | `G` label |
| Napelem — dél, 200 m² tető | Orientáció 100%, 60% kihasználtság | 120 m² hasznos, ~60 panel, ~19 440 kWh/év |
| Napelem — észak | U.a., de északi tájolás | Factor = 0,55, ~10 692 kWh/év |
| Megtérülés — homlokzati hőszigetelés | 500 m² fűtött, 180 kWh/m²/év | ~8,5–12 éves megtérülés |

### 13.2 Biztonsági tesztek (RLS)

- [ ] Más workspace-hez tartozó felhasználó nem olvashatja az energetikai profilt
- [ ] Csak admin/manager tud `building_energy_profile`-t szerkeszteni
- [ ] A materializált nézet csak az adott `building_id`-hez tartozó sorokat adja vissza

### 13.3 UI/UX tesztek

- [ ] Az energetika oldal mobilon (375px) hibátlanul megjelenik — tab-ok scrollozhatók
- [ ] A CO₂ pie chart nem törik el nulla értékű szekciókkal
- [ ] A felújítási javaslatok lenyithatók és becsukhatók (akadálymentesség: `aria-expanded`)
- [ ] Az üres állapot (nincs mérési adat) informatív üzenetet mutat, nem hibát
- [ ] A Browser Back gomb az energetika tabból visszalép a dashboard-ra (pushState)
- [ ] Az URL nem tartalmaz felhasználói azonosítót, token-t, vagy PII adatot

### 13.4 Teljesítmény tesztek

- [ ] Az energetika oldal 3G hálózaton belül 4 másodpercen belül betölt (Lighthouse)
- [ ] A Recharts grafikonok 500+ adatpont esetén nem fagyasztják a böngészőt
- [ ] A materializált nézet lekérdezése 200 ms alatt fut (EXPLAIN ANALYZE ellenőrzés)

---

## 14. Biztonsági és adatvédelmi szempontok

### 14.1 Adatminimalizálás

Az energetika modul által gyűjtött és tárolt adatok:
- **Épület-szintű aggregátumok** (nem lakás-szintű részletek harmadik fél számára)
- A `building_energy_profile` tábla **nem tartalmaz személyes adatot** — csupán az épület fizikai jellemzőit
- A CO₂ számítás szerver oldalon történik, az emissziós faktorok kliensre nem kerülnek szükségtelenül ki

### 14.2 GPS koordináták kezelése

Az épület lat/lon koordinátái a napelemzési és épületprofil-funkcióhoz szükségesek. Ezek **közcélú épületek közismert adatai** (telekhatár koordináta, amely a kataszteri nyilvántartásból elérhető), nem minősülnek személyes adatnak a GDPR értelmében. Ugyanakkor:
- Az adatok csak az adott workspace tagjainak érhetők el (RLS)
- Az URL-ben soha nem jelennek meg GPS koordináták

### 14.3 Energiaár-adatok

Az energiaárak hardkódt konstansok (nem valós idejű API), amelyek:
- Nem alkalmasak kereskedelmi vagy pénzügyi döntésekre
- Az UI-on egyértelműen meg kell jelölni: „Tájékoztató jellegű becsült értékek — frissítve: [dátum]"

---

## 15. Kapcsolódó dokumentumok és referenciák

### Jogszabályi háttér

- **2003. évi CXXXIII. tv.** — Társasházakról szóló törvény (közös tulajdon és felújítás)
- **7/2006. (V. 24.) TNM rendelet** — Az épületek energetikai jellemzőiről
- **2018/844/EU irányelv** — EPBD módosítás (közel nulla energiájú épületek)
- **2023/1791/EU irányelv** — EPBD újabb módosítás (2030-as minimumkövetelmények)
- **176/2008. (VI. 30.) Korm. rendelet** — Energetikai tanúsítvány

### Adatforrások

- **KSH** — Lakásstatisztika (fajlagos energiafogyasztás, panelállomány)
- **MEKH** — Magyar Energetikai és Közmű-szabályozási Hivatal (emissziós faktorok)
- **FŐTÁV** — Fővárosi Távhőszolgáltató Zrt. (díjak, emissziós tényező)
- **MVM Next** — Elektromos energia (díjszabás, védett ár)
- **JRC-PVGIS** — Photovoltaic Geographical Information System (napenergia-adatok)
- **Otthonfelújítási Program** — palyazat.gov.hu (aktuális pályázati keretek)

### Szakmai referenciák

- Pálvölgyi T. (2009): *Magyarország épületállományának felújítási potenciálja* — ÉMI Nonprofit Kft.
- Csoknyai T. (2016): *Energy renovation of Hungarian panel buildings* — Energy and Buildings
- Reith A. (2014): *Nearly Zero Energy Building design* — Budapesti Műszaki Egyetem

---

## 16. Kapcsolat a mérőóra-modullal (integráció)

### 16.1 Meglévő módszer bővítése

A jelenlegi `submitMeterReading()` Server Action (`app/actions/meter-readings.ts`) a `meter_type` mezőt `'viz' | 'gaz' | 'villany'` értékekkel tölti ki. Az energetika feature **visszafelé kompatibilis** marad: a meglévő leolvasások automatikusan megjelennek a fogyasztási grafikonon.

A **generated column** (`energy_type`) automatikusan kiszámolja az energiatípust a meglévő `meter_type` alapján, így nem szükséges az összes meglévő sort migrálni.

### 16.2 Jövőbeli bővítés: távhő-fogyasztásmérő

Ha egy épületben van FŐTÁV GJ-mérő (amelyre egyre több társasház tér át), a `meter_type` értéket ki kell bővíteni `'tavho'`-val, és a fogyasztást GJ-ban kell tárolni. Ez az energetika modul szempontjából teljesen kezelt: a konverziós faktor (`1 GJ = 277.78 kWh`) és a FŐTÁV emissziós faktor (0,127 kg CO₂/kWh) már rendelkezésre áll a konstans fájlban.

### 16.3 Navigáció az energetika modulhoz

A mérőóra-leolvasás panel alsó részén megjelenik egy „Energetikai elemzés megtekintése" link, amely az `/w/:workspaceId/energetika` oldalra mutat. Ez **pushState navigáció** (nem replace), a Back gombbal visszajön a mérőóra modulba.

---

## 17. Változásnapló és verziókövetés

Ez a feature a panellako.hu **v3.21.0** verziójában kerül bevezetésre. A kapcsolódó fájlok:

- `versioning/17052026_001_v3.21.0_epulet-energetika-co2-nyomkoveto.md` — mérnöki rekord
- `marketing/marketing_values/20260517_v3.21.0_epulet-energetika-co2-nyomkoveto_marketing_value.md` — marketing rekord
- `supabase/migrations/20260517_energetika_extension.sql` — adatbázis migráció
- `CHANGELOG.md` — v3.21.0 bejegyzés

---

*Ez a prompt fájl a panellako.hu szakdolgozati alapú feature implementációs sorozatának 6. eleme. A featureek sorrendben: 01 Levegőminőség, 02–05 [korábbi feature-ök], 06 Épületenergetika és CO₂ Nyomkövető (jelen dokumentum).*

*A dokumentum az SZTE geoinformatikai szakdolgozat energiagazdálkodási fejezetének közvetlen technikai lefordítása a panellako.hu platform kontextusára — az ott bemutatott zöldváros-indikátorok, EU Green Deal kötelezettségek és a panelházas lakóállomány energetikai jellemzői mind közvetlen bemeneti adatként szolgálnak a feature tervezéséhez.*
