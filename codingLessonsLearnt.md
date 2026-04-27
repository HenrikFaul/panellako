# Coding Lessons Learnt

## 2026-04-27
- A Supabase kapcsolatot mindig opcionálisra kell tervezni (`hasSupabaseConfig`), így demo környezetben is működik az oldal.
- Dashboard oldalon a dátum- és számformázást lokális (`hu-HU`) formában érdemes kezelni a jobb felhasználói élményért.
- MVP-ben az adatforrást a felületen explicit jelezni kell (Supabase vs mock), hogy diagnosztikánál egyértelmű legyen.
- Szerepkörös társasházi appnál a demo-üzemmódhoz érdemes URL paraméteres role-váltót adni, mert így backend-auth nélkül is validálható a jogosultsági UI.
- A login oldalt külön route-ra kell szervezni (`/login`), így a fő dashboard komplexitása nem növekszik és a belépési flow deploy után önállóan tesztelhető.
- A Supabase sémában a role kezelést célszerű `profiles` + `memberships` bontással megoldani, mert így a felhasználó több házban eltérő szerepkört kaphat.

## 2026-04-27 – AWS Location és Next.js env tanulság
- Next.js App Routerben a böngészőben futó komponens csak `NEXT_PUBLIC_*` változókat lát. A Vercel `VITE_*` változók nem jelennek meg automatikusan a client bundle-ben, ezért a client-side címkereső „AWS Location API kulcs hiányzik” hibát dobott.
- Külső API kulcsot, ha nem muszáj publikussá tenni, server-side API route mögé kell tenni. A frontend `/api/location/autocomplete` endpointot hív, a route pedig `AWS_LOCATION_API_KEY` / `AWS_LOCATION_REGION` env-ből dolgozik.
- Vercel env módosítás után mindig új redeploy kell, különben a serverless route és a buildelt client továbbra is a régi env snapshotot használhatja.
- Magic link authnál a Supabase redirect URL és a kódbeli `emailRedirectTo` csak akkor működik stabilan, ha a production domain szerepel a Supabase Authentication → URL Configuration allowlistában.
