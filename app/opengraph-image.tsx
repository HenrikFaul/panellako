import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'PanelLakó – Társasházkezelő szoftver Magyarországon';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(135deg, #0f766e 0%, #0284c7 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '80px',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Logo mark */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '40px',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              background: 'rgba(255,255,255,0.2)',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: '28px',
                height: '28px',
                background: 'white',
                borderRadius: '6px',
              }}
            />
          </div>
          <span style={{ color: 'white', fontSize: '28px', fontWeight: 800 }}>
            PanelLakó
          </span>
        </div>

        {/* Headline */}
        <div
          style={{
            color: 'white',
            fontSize: '60px',
            fontWeight: 900,
            lineHeight: 1.1,
            maxWidth: '900px',
            marginBottom: '28px',
          }}
        >
          Digitális társasházkezelő platform
        </div>

        {/* Subline */}
        <div
          style={{
            color: 'rgba(255,255,255,0.85)',
            fontSize: '28px',
            fontWeight: 400,
            maxWidth: '780px',
            lineHeight: 1.4,
            marginBottom: '48px',
          }}
        >
          Hibabejelentések, dokumentumok, közös költség és közgyűlések — egyetlen felületen
        </div>

        {/* Badges */}
        <div style={{ display: 'flex', gap: '16px' }}>
          {['14 napos ingyenes próba', 'Kártyaadat nélkül', 'Magyar fejlesztés'].map((badge) => (
            <div
              key={badge}
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '100px',
                padding: '10px 20px',
                color: 'white',
                fontSize: '20px',
                fontWeight: 600,
              }}
            >
              {badge}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
