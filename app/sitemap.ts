import type { MetadataRoute } from 'next';

const BASE = 'https://panellako.hu';
const MONTHLY_DATE = new Date('2026-05-23');
const YEARLY_DATE = new Date('2026-05-23');

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    // ── Homepage ──────────────────────────────────────────────────────────────
    {
      url: BASE,
      lastModified: MONTHLY_DATE,
      changeFrequency: 'monthly',
      priority: 1.0,
    },

    // ── Feature pages ─────────────────────────────────────────────────────────
    {
      url: `${BASE}/funkciok`,
      lastModified: MONTHLY_DATE,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${BASE}/funkciok/hibabejelentes-kezeles`,
      lastModified: MONTHLY_DATE,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE}/funkciok/dokumentumtar`,
      lastModified: MONTHLY_DATE,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE}/funkciok/kozos-koltseg`,
      lastModified: MONTHLY_DATE,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE}/funkciok/online-kozgyules`,
      lastModified: MONTHLY_DATE,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE}/arak`,
      lastModified: MONTHLY_DATE,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${BASE}/gyik`,
      lastModified: MONTHLY_DATE,
      changeFrequency: 'monthly',
      priority: 0.8,
    },

    // ── Info / trust pages ────────────────────────────────────────────────────
    {
      url: `${BASE}/rolunk`,
      lastModified: YEARLY_DATE,
      changeFrequency: 'yearly',
      priority: 0.6,
    },
    {
      url: `${BASE}/kapcsolat`,
      lastModified: YEARLY_DATE,
      changeFrequency: 'yearly',
      priority: 0.6,
    },
    {
      url: `${BASE}/adatvedelmi-iranyelvek`,
      lastModified: YEARLY_DATE,
      changeFrequency: 'yearly',
      priority: 0.4,
    },
    {
      url: `${BASE}/aszf`,
      lastModified: YEARLY_DATE,
      changeFrequency: 'yearly',
      priority: 0.4,
    },
    {
      url: `${BASE}/osszehasonlitas`,
      lastModified: MONTHLY_DATE,
      changeFrequency: 'monthly',
      priority: 0.7,
    },

    // ── Analysis pages ────────────────────────────────────────────────────────
    {
      url: `${BASE}/elemzes`,
      lastModified: MONTHLY_DATE,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${BASE}/elemzes/budapest-kozlekedes`,
      lastModified: MONTHLY_DATE,
      changeFrequency: 'weekly',
      priority: 0.8,
    },

    // ── Content pillars (hub pages) ───────────────────────────────────────────
    {
      url: `${BASE}/tarsashaz-kezeles`,
      lastModified: MONTHLY_DATE,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${BASE}/levegominoseg-budapest`,
      lastModified: MONTHLY_DATE,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${BASE}/zajszennyezes-budapest`,
      lastModified: MONTHLY_DATE,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE}/klimakockazat-epuleteknel`,
      lastModified: MONTHLY_DATE,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE}/zold-tarsashaz`,
      lastModified: MONTHLY_DATE,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE}/tarsashazi-jog`,
      lastModified: MONTHLY_DATE,
      changeFrequency: 'monthly',
      priority: 0.7,
    },

    // ── Cluster articles ──────────────────────────────────────────────────────
    {
      url: `${BASE}/tarsashaz-kezeles/kozos-kepviselo-feladatai`,
      lastModified: MONTHLY_DATE,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${BASE}/tarsashaz-kezeles/kozgyules-osszehivasa`,
      lastModified: MONTHLY_DATE,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${BASE}/tarsashaz-kezeles/szmsz-keszitese`,
      lastModified: MONTHLY_DATE,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE}/tarsashaz-kezeles/kozos-koltseg-nyilvantartas`,
      lastModified: MONTHLY_DATE,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE}/tarsashaz-kezeles/dijhatlarak-kezelese`,
      lastModified: MONTHLY_DATE,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE}/tarsashaz-kezeles/dokumentumkezeles-tarsashazban`,
      lastModified: MONTHLY_DATE,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE}/levegominoseg-budapest/pm25-pm10-mit-jelent`,
      lastModified: MONTHLY_DATE,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE}/levegominoseg-budapest/budapest-legszennyezettebb-keruletek`,
      lastModified: MONTHLY_DATE,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE}/levegominoseg-budapest/belteri-levegominoseg-tarsashazban`,
      lastModified: MONTHLY_DATE,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
  ];
}
