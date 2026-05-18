'use client';

import dynamic from 'next/dynamic';
import { forwardRef } from 'react';
import type { AirQualityMapHandle } from './air-quality-map-inner';
import type { AQIStation } from '@/app/api/air-quality/stations/route';

// SSR-safe dynamic import — Leaflet requires window/document
const AirQualityMapInner = dynamic(() => import('./air-quality-map-inner'), {
  ssr: false,
  loading: () => (
    <div
      className="h-[380px] w-full animate-pulse overflow-hidden rounded-2xl"
      style={{ background: '#060c18' }}
    />
  ),
});

interface Props {
  buildingLat:      number;
  buildingLon:      number;
  stations:         AQIStation[];
  onSelectStation?: (uid: number) => void;
}

const AirQualityMap = forwardRef<AirQualityMapHandle, Props>(
  function AirQualityMap(props, ref) {
    return <AirQualityMapInner {...props} ref={ref} />;
  }
);

export default AirQualityMap;
export type { AirQualityMapHandle };
