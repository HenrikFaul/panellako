// UHI (Urban Heat Island) Calculator
// Thesis reference: Unger J. (2010), Oke (1982) UHI research, Budapest +4-6°C urban excess
// Estimates local temperature excess above rural baseline using OSM-derived data.

export interface UHIInputs {
  buildingDensityPercent: number; // % of 500m radius that is buildings (from OSM)
  greenCoveragePercent: number;   // % that is parks/forest/grass
  hasWaterBody500m: boolean;      // lake, river within 500m
  hasPark300m: boolean;           // park within 300m
  nearestParkDistanceM: number;
}

export interface CoolSpot {
  name: string;
  type: 'park' | 'konyvtar' | 'bevasarlokozpont' | 'szokokut' | 'melygarazs';
  openHours: string;
  distanceM: number | null;
}

export interface UHIResult {
  uhiCelsius: number;
  uhiCategory: 'alacsony' | 'kozepes' | 'magas' | 'kritikus';
  klimaScore: number; // 0-100, higher = better
  klimaCategory: 'kiváló' | 'jó' | 'közepes' | 'rossz' | 'kritikus';
  monthlyUHI: { month: number; label: string; celsius: number }[];
  colorHex: string;
  factors: UHIInputs;
  coolSpots: CoolSpot[];
}

const BASE_UHI = 2.0; // Budapest urban baseline °C

const SEASONAL_FACTORS: Record<number, number> = {
  1: 0.60, 2: 0.65, 3: 0.75, 4: 0.85, 5: 1.00,
  6: 1.15, 7: 1.25, 8: 1.20, 9: 1.05, 10: 0.85,
  11: 0.70, 12: 0.60,
};

const MONTH_LABELS: Record<number, string> = {
  1: 'Jan', 2: 'Feb', 3: 'Már', 4: 'Ápr', 5: 'Máj', 6: 'Jún',
  7: 'Júl', 8: 'Aug', 9: 'Sze', 10: 'Okt', 11: 'Nov', 12: 'Dec',
};

function uhiColor(celsius: number): string {
  if (celsius < 1.5) return '#38bdf8'; // blue — cool
  if (celsius < 2.5) return '#4ade80'; // green — ok
  if (celsius < 3.5) return '#eab308'; // yellow — moderate
  if (celsius < 4.5) return '#f97316'; // orange — high
  return '#ef4444'; // red — critical
}

export function calculateUHI(inputs: UHIInputs, coolSpots: CoolSpot[] = []): UHIResult {
  const { buildingDensityPercent, greenCoveragePercent, hasWaterBody500m, hasPark300m } = inputs;

  // Factor calculations per formula
  const kDensity = 0.8 + (buildingDensityPercent / 100) * 0.8;
  const kGreen   = 1.5 - (greenCoveragePercent   / 100) * 1.0;
  const kWater   = hasWaterBody500m ? 0.9 : 1.1;
  const kPark    = hasPark300m      ? 0.95 : 1.05;

  // Current month UHI
  const currentMonth = new Date().getMonth() + 1;
  const seasonalFactor = SEASONAL_FACTORS[currentMonth] ?? 1.0;

  const baseProduct = BASE_UHI * kDensity * kGreen * kWater * kPark;
  const uhiCelsius  = Math.max(0.2, Math.round(baseProduct * seasonalFactor * 10) / 10);

  // Category thresholds
  let uhiCategory: UHIResult['uhiCategory'];
  if      (uhiCelsius < 1.5) uhiCategory = 'alacsony';
  else if (uhiCelsius < 3.0) uhiCategory = 'kozepes';
  else if (uhiCelsius < 4.5) uhiCategory = 'magas';
  else                        uhiCategory = 'kritikus';

  // KlímaScore (0-100, higher = better)
  const uhiComponent   = Math.max(0, 40 - (uhiCelsius / 6.0) * 40);
  const aqiComponent   = 20; // fallback — no live AQI
  const floodComponent = 20; // fallback — elevation proxy not available
  const klimaScore     = Math.round(Math.min(100, uhiComponent + aqiComponent + floodComponent));

  // Category thresholds for klimaScore
  let klimaCategory: UHIResult['klimaCategory'];
  if      (klimaScore >= 80) klimaCategory = 'kiváló';
  else if (klimaScore >= 65) klimaCategory = 'jó';
  else if (klimaScore >= 50) klimaCategory = 'közepes';
  else if (klimaScore >= 35) klimaCategory = 'rossz';
  else                        klimaCategory = 'kritikus';

  // Monthly UHI (Jan-Dec)
  const monthlyUHI = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    const celsius = Math.max(0.2, Math.round(baseProduct * (SEASONAL_FACTORS[m] ?? 1.0) * 10) / 10);
    return { month: m, label: MONTH_LABELS[m] ?? String(m), celsius };
  });

  return {
    uhiCelsius,
    uhiCategory,
    klimaScore,
    klimaCategory,
    monthlyUHI,
    colorHex: uhiColor(uhiCelsius),
    factors: inputs,
    coolSpots,
  };
}
