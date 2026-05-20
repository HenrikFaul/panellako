import type { Metadata } from 'next';
import BudapestTransitAnalysisMount from './mount';

export const metadata: Metadata = {
  title: 'Budapest tömegközlekedésének elemzése — PanelLakó',
  description:
    'Budapest tömegközlekedésének analitikus térképe GTFS-adatok alapján, ArcGIS-stílusú vizualizációval, ' +
    'be-kikapcsolható rétegekkel: villamos, metró, busz, HÉV, troli, hajó + megálló-sűrűség, ' +
    '420 m bufferzónák és OSM lakóövezet.',
};

export default function BudapestTransitAnalysisPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-8">
      <header className="mx-auto mb-4 max-w-7xl">
        <h1 className="text-2xl md:text-3xl font-black text-slate-900">
          Budapest tömegközlekedésének elemzése
        </h1>
        <p className="mt-1 text-xs md:text-sm text-slate-500">
          GTFS-adatok alapján · ArcGIS-stílusú vizualizáció · interaktív rétegekkel
        </p>
      </header>
      <div className="mx-auto max-w-7xl">
        <BudapestTransitAnalysisMount />
      </div>
    </main>
  );
}
