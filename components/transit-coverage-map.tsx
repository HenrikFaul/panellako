'use client';

import dynamic from 'next/dynamic';

const TransitCoverageMapInner = dynamic(() => import('./transit-coverage-map-inner'), {
  ssr: false,
  loading: () => (
    <div
      className="h-72 w-full animate-pulse overflow-hidden rounded-2xl"
      style={{ background: '#060c18' }}
    />
  ),
});

interface Stop {
  id:        string;
  name:      string;
  lat:       number;
  lon:       number;
  routeType?: string;
  routeTypes?: string[];
}

interface Props {
  buildingLat: number;
  buildingLon: number;
  stops:       Stop[];
}

export default function TransitCoverageMap(props: Props) {
  return <TransitCoverageMapInner {...props} />;
}
