'use client';

import { CoolSpot } from '@/lib/uhi-calculator';

interface Props {
  spots: CoolSpot[];
}

const TYPE_LABEL: Record<string, string> = {
  park:              'Park / Zöldterület',
  konyvtar:          'Könyvtár',
  bevasarlokozpont:  'Bevásárlóközpont',
  szokokut:          'Szökőkút',
  melygarazs:        'Mélygarázs',
};

function formatDistance(m: number | null): string {
  if (m === null) return '—';
  if (m < 1000) return `${m} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

export default function CoolSpotsList({ spots }: Props) {
  return (
    <div className="rounded-2xl bg-slate-900 border border-white/10 p-6">
      <div className="mb-4">
        <h3 className="text-white font-semibold text-base">Hűsölőhelyek a közelben</h3>
        <p className="text-slate-400 text-sm mt-0.5">
          Természetes és épített hűtési lehetőségek forró napokon
        </p>
      </div>

      {spots.length === 0 ? (
        <p className="text-slate-500 text-sm py-4 text-center">
          Nincs elérhető hűsölőhely-adat erre a területre.
        </p>
      ) : (
        <ul className="space-y-2">
          {spots.map((spot, idx) => (
            <li
              key={idx}
              className="flex items-center gap-3 rounded-xl bg-slate-800/50 border border-white/5 px-4 py-3"
            >
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 shrink-0" aria-hidden />
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{spot.name}</p>
                <p className="text-slate-500 text-xs mt-0.5">
                  {TYPE_LABEL[spot.type] ?? spot.type}
                  {spot.openHours ? ` · Nyitva: ${spot.openHours}` : ''}
                </p>
              </div>
              <div className="flex-shrink-0 text-right">
                <span className="text-sky-400 text-sm font-mono font-medium">
                  {formatDistance(spot.distanceM)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-xs text-slate-500">
        Forrás: OpenStreetMap · Távolság légvonalban számítva
      </p>
    </div>
  );
}
