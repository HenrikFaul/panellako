# PanelLakó – Társasházi digitális működési központ (MVP)

A projekt egy **alapos MVP alap** társasházaknak, a legfontosabb konfliktuscsökkentő modulokkal:

- Hírfolyam és tájékoztatás
- Hibabejelentések státuszkövetéssel
- Dokumentumtár
- Pénzügyi áttekintő
- Közgyűlési információk

## Tech stack
- Next.js 14 (App Router, TypeScript)
- Tailwind CSS
- Supabase (PostgreSQL + API)
- Vercel deploy kompatibilis

## 1) Telepítés

```bash
npm install
npm run dev
```

## 2) Környezeti változók

Másold az `.env.example` fájlt `.env.local` néven, és add meg az anon kulcsot:

```env
NEXT_PUBLIC_SUPABASE_URL=https://wzromwxpjlyrqbdiapep.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

> Ha nincs Supabase kulcs beállítva, az app mock adatokkal fut.

## 3) Supabase séma felhúzása

A `supabase/schema.sql` fájlt futtasd a Supabase SQL editorban.

## 4) Vercel deploy

1. Push GitHub-ra.
2. Vercelben importáld a repót.
3. Állítsd be env változókat:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy.

## 5) MVP roadmap (következő kör)

- Auth + szerepkörös jogosultság
- Ticket létrehozás űrlappal és fájlfeltöltéssel
- Közgyűlési határozatkövető részletes workflow-val
- Közmű bejelentés / vízóra diktálás modul
- Értesítések (email/push)
