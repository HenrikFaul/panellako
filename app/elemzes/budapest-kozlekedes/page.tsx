import type { Metadata } from 'next';
import BudapestTransitAnalysisMount from './mount';

export const metadata: Metadata = {
  title: 'Budapest tömegközlekedésének elemzése — GTFS-adatok és interaktív térkép',
  description:
    'Budapest összes tömegközlekedési vonala GTFS-adatok alapján: villamos, metró, busz, HÉV, trolibusz és hajójáratok interaktív, ' +
    'ArcGIS-stílusú térképen — 420 m bufferzónákkal, megálló-sűrűséggel és OSM lakóövezet-réteggel.',
  openGraph: {
    type: 'article',
    title: 'Budapest tömegközlekedésének elemzése — GTFS-adatok és interaktív térkép',
    description:
      'Villamos, metró, busz, HÉV, trolibusz és hajójáratok interaktív térképen GTFS-adatok alapján. ' +
      'Be- és kikapcsolható rétegek, 420 m gyalogos bufferzónák, megálló-sűrűség.',
    images: [{ url: '/og-elemzes-kozlekedes.png', width: 1200, height: 630, alt: 'Budapest tömegközlekedési elemzés' }],
  },
  alternates: { canonical: 'https://panellako.hu/elemzes/budapest-kozlekedes' },
};

// Static article schema for Google + LLM extractability
const articleSchema = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Budapest tömegközlekedésének elemzése GTFS-adatok alapján',
  description:
    'Budapest villamos, metró, busz, HÉV, trolibusz és hajójárat-hálózatának interaktív, ArcGIS-stílusú vizualizációja ' +
    'Open Data GTFS-forrásokból, megálló-sűrűség hőtérképpel és 420 méteres gyalogos lefedettségi zónákkal.',
  inLanguage: 'hu',
  publisher: { '@type': 'Organization', name: 'PanelLakó', url: 'https://panellako.hu' },
  url: 'https://panellako.hu/elemzes/budapest-kozlekedes',
  about: [
    { '@type': 'Thing', name: 'Budapest tömegközlekedés' },
    { '@type': 'Thing', name: 'GTFS adatok' },
    { '@type': 'Thing', name: 'BKK Futár' },
  ],
};

export default function BudapestTransitAnalysisPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-8">
        <header className="mx-auto mb-4 max-w-7xl">
          <h1 className="text-2xl md:text-3xl font-black text-slate-900">
            Budapest tömegközlekedésének elemzése
          </h1>
          <p className="mt-1 text-xs md:text-sm text-slate-500">
            GTFS-adatok alapján · ArcGIS-stílusú vizualizáció · interaktív rétegekkel
          </p>
        </header>

        {/* SSR-visible content block — Googlebot reads this; the Leaflet map below is client-only */}
        <section className="mx-auto mb-6 max-w-7xl rounded-2xl border border-slate-200 bg-white px-6 py-5 text-slate-700">
          <h2 className="mb-3 text-lg font-black text-slate-900">
            Budapest teljes tömegközlekedési hálózata egy térképen
          </h2>
          <p className="mb-3 text-sm leading-relaxed">
            Ez az elemzőoldal Budapest összes tömegközlekedési vonalát jeleníti meg valós BKK GTFS-adatok alapján,
            interaktív, ArcGIS-stílusú térképen. A vizualizáció tartalmazza a villamosokat, metrókat, buszokat,
            HÉV-vonalakat, trolibuszokat és hajójáratokat — összesen több mint 200 vonalat és 3&nbsp;000 megállót.
          </p>
          <div className="grid gap-4 sm:grid-cols-3 text-sm">
            <div>
              <h3 className="mb-1 font-black text-slate-800">Rétegek és szűrők</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Közlekedési mód szerint be- és kikapcsolható rétegek: villamos (sárga), metró (piros),
                busz (kék), HÉV (lila), trolibusz (narancs), hajó (türkiz).
              </p>
            </div>
            <div>
              <h3 className="mb-1 font-black text-slate-800">420 m bufferzóna</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Minden megálló körül 420 méteres (kb. 5 perces gyaloglás) lefedettségi zóna —
                megmutatja, Budapest melyik részén a legjobb a tömegközlekedési ellátottság.
              </p>
            </div>
            <div>
              <h3 className="mb-1 font-black text-slate-800">Megálló-sűrűség hőtérkép</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Kernel density hőtérkép a megállók koncentrációjáról: melyik kerületekben a
                legsűrűbb a közlekedési hálózat, és hol vannak fehér foltok?
              </p>
            </div>
          </div>
          <p className="mt-4 text-xs text-slate-400">
            Adatforrás: BKK Futár GTFS Open Data · OpenStreetMap · PanelLakó elemzőmotor
          </p>
        </section>

        <div className="mx-auto max-w-7xl">
          <BudapestTransitAnalysisMount />
        </div>
      </main>
    </>
  );
}
