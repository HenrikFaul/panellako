# PanelLakó – Társasházi digitális működési központ (MVP+)

Vercel-ready Next.js + Supabase alkalmazás társasházi működéshez.

## Elkészült fő modulok
- Bejelentkezés (Supabase magic link)
- Szerepkör-alapú működés (lakó, tulajdonos, közös képviselő, megbízott, bizottság, könyvelő)
- Modern dashboard sidebar navigációval és gyors műveletekkel
- Hibabejelentés (ticket) + státuszkezelés + SLA/work order koncepció
- Óraállás bejelentés (víz/gáz/villany)
- Hírfolyam + közös képviselői célzott értesítések
- Dokumentumtár olvasottsági visszajelzéssel
- Pénzügyi áttekintés és hátralék fókusz
- OnlineHáz-szerű albetét táblázat kereséssel
- Közgyűlés, határozat és szavazás előkészítő nézet
- Vendor/work order, tudásbázis és audit napló
- Supabase adatmodell ezekhez a folyamatokhoz
- Egyedi PanelLakó logó komponens

## Tech stack
- Next.js 14 (App Router, TypeScript)
- Tailwind CSS
- Supabase (Auth + PostgreSQL)
- AWS Location Service címkeresés server-side proxy route-on keresztül
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
NEXT_PUBLIC_SITE_URL=https://panellako.vercel.app

AWS_LOCATION_API_KEY=...
AWS_LOCATION_REGION=eu-central-1
```

> Fontos: Next.js-ben a böngésző csak `NEXT_PUBLIC_*` env változókat lát. Az AWS Location kulcsot ezért nem a client komponens olvassa, hanem az `app/api/location/autocomplete/route.ts` server-side proxy. Vercelben a kulcsot `AWS_LOCATION_API_KEY` néven add meg Production és Preview környezetre, majd redeploy.

> Ha régebben már `VITE_AWS_LOCATION_API_KEY` / `VITE_AWS_LOCATION_REGION` néven vetted fel Vercelben, a server route fallbackként azt is felismeri, de az ajánlott név az `AWS_LOCATION_*`.

> Ha nincs Supabase kulcs, az app mock adatokkal és demo űrlap-mentéssel fut.

## 3) Supabase Auth redirect beállítás
Supabase Dashboard → Authentication → URL Configuration:

- Site URL: `https://panellako.vercel.app`
- Redirect URLs:
  - `https://panellako.vercel.app/**`
  - `http://localhost:3000/**`
  - saját domain esetén: `https://panellako.hu/**` és `https://www.panellako.hu/**`

## 4) Supabase séma felhúzása
A `supabase/schema.sql` fájlt futtasd a Supabase SQL editorban.

A séma tartalmazza:
- profil + membership + szerepkör táblákat
- épület és albetét master data táblákat
- hibabejelentések és mérőóra állások tábláit
- értesítések és hírek tábláit
- dokumentum, dokumentum olvasottság, pénzügy, közgyűlés, napirend, határozat és szavazás táblákat
- vendor/work order, tudásbázis és audit log táblákat
- RLS + demo policy-kat

## 5) Fő route-ok
- `/` – dashboard és ügykezelés
- `/login` – magic link bejelentkezés
- `/api/location/autocomplete?q=...` – AWS Location server-side proxy

## 6) Vercel deploy
1. Push GitHub-ra.
2. Vercelben importáld a repót.
3. Állítsd be env változókat:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `AWS_LOCATION_API_KEY`
   - `AWS_LOCATION_REGION`
4. Deploy vagy redeploy.

## 7) Következő javasolt kör
- Supabase SSR session kezelés cookie-val
- Role alapú éles RLS policy-k auth.uid() ellenőrzéssel
- Ticket/meter/notification valós INSERT műveletek server actionnel vagy API route-tal
- Dokumentum feltöltés Supabase Storage-ra
- Fizetés, AI asszisztens, amenity booking és visitor management későbbi phase-ben
