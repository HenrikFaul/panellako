'use client';

import dynamic from 'next/dynamic';

const NoiseMapInner = dynamic(() => import('./noise-map-inner'), {
  ssr: false,
  loading: () => (
    <div
      className="w-full animate-pulse overflow-hidden rounded-2xl"
      style={{ background: '#060c18', height: 288 }}
    />
  ),
});

interface Props {
  buildingLat: number;
  buildingLon: number;
  className?:  string;
}

export default function NoiseMap(props: Props) {
  return <NoiseMapInner {...props} />;
}
