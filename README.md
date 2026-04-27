# PanelLakó – Társasházi digitális működési központ (MVP+)

Vercel-ready Next.js + Supabase alkalmazás társasházi működéshez.

## Elkészült fő modulok
- Bejelentkezés (Supabase magic link)
- Szerepkör-alapú működés (lakó, tulajdonos, közös képviselő, megbízott, stb.)
- Hibabejelentés (ticket) felület
- Óraállás bejelentés (víz/gáz/villany)
- Hírfolyam + közös képviselői célzott értesítések
- Dokumentumtár, pénzügy és közgyűlés áttekintő
- Supabase adatmodell ezekhez a folyamatokhoz
- Egyedi PanelLakó logó komponens

## Tech stack
- Next.js 14 (App Router, TypeScript)
- Tailwind CSS
- Supabase (Auth + PostgreSQL)
- Vercel deploy kompatibilis

## 1) Telepítés
```bash
npm install
npm run dev
```

## 2) Környezeti változók
Másold az `.env.example` fájlt `.env.local` néven:

```env
NEXT_PUBLIC_SUPABASE_URL=https://wzromwxpjlyrqbdiapep.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_AWS_LOCATION_API_KEY=...
NEXT_PUBLIC_AWS_LOCATION_REGION=eu-north-1
```

> Ha nincs Supabase kulcs, az app mock adatokkal és demo űrlap-mentéssel fut.

## 3) Supabase séma felhúzása
A `supabase/schema.sql` fájlt futtasd a Supabase SQL editorban.

A séma tartalmazza:
- profil + membership + szerepkör táblákat
- hibabejelentések és mérőóra állások tábláit
- értesítések és hírek tábláit
- dokumentum, pénzügy, közgyűlés táblákat
- RLS + demo policy-k

## 4) Fő route-ok
- `/` – dashboard és ügykezelés
- `/login` – magic link bejelentkezés

## 5) Vercel deploy
1. Push GitHub-ra.
2. Vercelben importáld a repót.
3. Állítsd be env változókat:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy.

## 6) Következő javasolt kör
- Supabase SSR session kezelés cookie-val
- Role alapú éles RLS policy-k auth.uid() ellenőrzéssel
- Ticket/meter/notification valós INSERT műveletek szerver oldali actionnel
- Dokumentum feltöltés Supabase Storage-ra
