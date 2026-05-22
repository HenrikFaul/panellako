import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/superadmin',
          '/superadmin/',
          '/w/',
          '/app',
          '/app/',
          '/offline',
          '/billing',
          '/login',
        ],
      },
    ],
    sitemap: 'https://panellako.hu/sitemap.xml',
  };
}
