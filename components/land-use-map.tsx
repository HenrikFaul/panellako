'use client';

import dynamic from 'next/dynamic';

const LandUseMapInner = dynamic(() => import('./land-use-map-inner'), {
  ssr: false,
  loading: () => (
    <div
      className="h-72 w-full animate-pulse overflow-hidden rounded-2xl"
      style={{ background: '#060c18' }}
    />
  ),
});

interface Props {
  buildingLat: number;
  buildingLon: number;
}

export default function LandUseMap(props: Props) {
  return <LandUseMapInner {...props} />;
}
