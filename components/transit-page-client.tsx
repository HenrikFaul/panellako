'use client';

import TransportPanel from '@/components/transport-panel';

interface TransitPageClientProps {
  buildingId:      string;
  buildingName:    string;
  buildingAddress: string;
  buildingLat:     number;
  buildingLon:     number;
}

export default function TransitPageClient({
  buildingId,
  buildingName,
  buildingAddress,
  buildingLat,
  buildingLon,
}: TransitPageClientProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      {/* Page header */}
      <div className="border-b border-slate-800/60 px-6 py-5">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Élő adatok · BKK Zrt., CC BY 4.0</p>
        <h1 className="mt-0.5 text-xl font-black text-white">Közlekedés és tömegközlekedés</h1>
        <p className="mt-0.5 text-sm text-slate-500">{buildingName} · {buildingAddress}</p>
      </div>

      {/* Full-width transport panel */}
      <div className="p-4 md:p-6">
        <TransportPanel
          lat={buildingLat}
          lon={buildingLon}
          buildingAddress={buildingAddress}
          buildingId={buildingId}
        />
      </div>
    </div>
  );
}
