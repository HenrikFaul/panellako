# Coding Lessons Learnt

## 2026-04-27
- A Supabase kapcsolatot mindig opcionálisra kell tervezni (`hasSupabaseConfig`), így demo környezetben is működik az oldal.
- Dashboard oldalon a dátum- és számformázást lokális (`hu-HU`) formában érdemes kezelni a jobb felhasználói élményért.
- MVP-ben az adatforrást a felületen explicit jelezni kell (Supabase vs mock), hogy diagnosztikánál egyértelmű legyen.
- Szerepkörös társasházi appnál a demo-üzemmódhoz érdemes URL paraméteres role-váltót adni, mert így backend-auth nélkül is validálható a jogosultsági UI.
- A login oldalt külön route-ra kell szervezni (`/login`), így a fő dashboard komplexitása nem növekszik és a belépési flow deploy után önállóan tesztelhető.
- A Supabase sémában a role kezelést célszerű `profiles` + `memberships` bontással megoldani, mert így a felhasználó több házban eltérő szerepkört kaphat.
