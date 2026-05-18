'use client';

import dynamic from 'next/dynamic';
import type { CyclingFeature } from '@/app/api/cycling/route';

const CyclingMapInner = dynamic(() => import('./cycling-map-inner'), {
  ssr: false,
  loading: () => (
    <div className="h-[520px] w-full animate-pulse overflow-hidden rounded-2xl"
      style={{ background: '#060c18' }} />
  ),
});

interface Props {
  buildingLat: number;
  buildingLon: number;
  routes:      CyclingFeature[];
}

export default function CyclingMap(props: Props) {
  return <CyclingMapInner {...props} />;
}
