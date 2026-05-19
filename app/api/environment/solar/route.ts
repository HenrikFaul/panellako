import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
export const dynamic = 'force-dynamic';

export interface SolarMonthly { month: number; e: number; }

export interface SolarData {
  eYearKwhKwp:  number;
  hOptKwhM2:    number;
  eDayKwhKwp:   number;
  monthly:      SolarMonthly[];
  estimatedFor1kWp: {
    annualKwh: number;
    co2SavedKg: number;
  };
  computedAt: string;
  source:     'cache' | 'pvgis';
}

function createServiceClient() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function fetchPvgis(lat: number, lon: number): Promise<SolarData> {
  const params = new URLSearchParams({
    lat: lat.toString(), lon: lon.toString(),
    peakpower: '1', loss: '14', outputformat: 'json', raddatabase: 'PVGIS-SARAH3',
  });
  const res = await fetch(`https://re.jrc.ec.europa.eu/api/v5_3/PVcalc?${params}`, {
    signal: AbortSignal.timeout(15000),
    headers: { 'Accept': 'application/json', 'User-Agent': 'panellako.hu/1.0' },
  });
  if (!res.ok) throw new Error(`PVGIS HTTP ${res.status}`);
  const json = await res.json() as {
    outputs: {
      totals: { fixed: { E_y: number; H_i_opt: number; E_d: number } };
      monthly: { fixed: Array<{ month: number; E_m: number }> };
    };
  };

  const totals = json.outputs.totals.fixed;
  const eYear  = totals.E_y;

  return {
    eYearKwhKwp:  Math.round(eYear * 10) / 10,
    hOptKwhM2:    Math.round(totals.H_i_opt * 10) / 10,
    eDayKwhKwp:   Math.round(totals.E_d * 100) / 100,
    monthly:      json.outputs.monthly.fixed.map(m => ({ month: m.month, e: Math.round(m.E_m * 10) / 10 })),
    estimatedFor1kWp: {
      annualKwh:  Math.round(eYear),
      co2SavedKg: Math.round(eYear * 0.233),
    },
    computedAt: new Date().toISOString(),
    source:     'pvgis',
  };
}

export async function GET(request: NextRequest) {
  const sp         = request.nextUrl.searchParams;
  const buildingId = sp.get('buildingId') ?? '';
  const lat        = parseFloat(sp.get('lat') ?? '47.4979');
  const lon        = parseFloat(sp.get('lon') ?? '19.0402');

  const supabase = createServiceClient();

  // Check cache (30-day TTL)
  if (supabase && buildingId) {
    const { data: cached } = await supabase
      .from('building_solar_cache')
      .select('*')
      .eq('building_id', buildingId)
      .gt('computed_at', new Date(Date.now() - 30 * 24 * 60 * 60_000).toISOString())
      .maybeSingle();

    if (cached && cached.e_y_kwh_kwp != null && cached.h_i_opt != null && cached.e_d_kwh_kwp != null) {
      const solar: SolarData = {
        eYearKwhKwp:  cached.e_y_kwh_kwp,
        hOptKwhM2:    cached.h_i_opt,
        eDayKwhKwp:   cached.e_d_kwh_kwp,
        monthly:      (cached.monthly_kwh as SolarMonthly[]) ?? [],
        estimatedFor1kWp: {
          annualKwh:  Math.round(cached.e_y_kwh_kwp),
          co2SavedKg: Math.round(cached.e_y_kwh_kwp * 0.233),
        },
        computedAt: cached.computed_at,
        source:     'cache',
      };
      return NextResponse.json(solar);
    }
  }

  try {
    const solar = await fetchPvgis(lat, lon);

    if (supabase && buildingId) {
      await supabase.from('building_solar_cache').upsert({
        building_id:  buildingId,
        e_y_kwh_kwp:  solar.eYearKwhKwp,
        h_i_opt:      solar.hOptKwhM2,
        e_d_kwh_kwp:  solar.eDayKwhKwp,
        monthly_kwh:  solar.monthly,
        pvgis_raw:    null,
        computed_at:  solar.computedAt,
      }, { onConflict: 'building_id' });
    }

    return NextResponse.json(solar);
  } catch (err) {
    console.warn('[environment/solar] PVGIS failed:', err);
    return NextResponse.json(null);
  }
}
