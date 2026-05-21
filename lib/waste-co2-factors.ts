// CO2 megtakarítási tényezők szelektív hulladékgyűjtéshez
// Forrás: Európai Környezetvédelmi Ügynökség (EEA) átlagértékek

export const WASTE_CO2_FACTORS = {
  paper: 0.70,       // kg CO2 megtakarítás / kg papír újrahasznosítva
  plastic: 1.50,     // kg CO2 megtakarítás / kg műanyag újrahasznosítva
  glass: 0.30,       // kg CO2 megtakarítás / kg üveg újrahasznosítva
  organic: 0.10,     // kg CO2 megtakarítás / kg bio komposztálva
  electronic: 4.50,  // kg CO2 megtakarítás / kg elektronikai hulladék feldolgozva
} as const;

export interface WasteReport {
  paper_kg: number;
  plastic_kg: number;
  glass_kg: number;
  organic_kg: number;
  electronic_kg: number;
}

export function calcWasteCO2Savings(report: WasteReport): number {
  return (
    (report.paper_kg || 0) * WASTE_CO2_FACTORS.paper +
    (report.plastic_kg || 0) * WASTE_CO2_FACTORS.plastic +
    (report.glass_kg || 0) * WASTE_CO2_FACTORS.glass +
    (report.organic_kg || 0) * WASTE_CO2_FACTORS.organic +
    (report.electronic_kg || 0) * WASTE_CO2_FACTORS.electronic
  );
}

export function calcTotalWasteKg(report: WasteReport): number {
  return (
    (report.paper_kg || 0) +
    (report.plastic_kg || 0) +
    (report.glass_kg || 0) +
    (report.organic_kg || 0) +
    (report.electronic_kg || 0)
  );
}
