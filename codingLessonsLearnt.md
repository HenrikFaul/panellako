# Coding Lessons Learnt

## 2026-04-27
- A Supabase kapcsolatot mindig opcionálisra kell tervezni (`hasSupabaseConfig`), így demo környezetben is működik az oldal.
- Dashboard oldalon a dátum- és számformázást lokális (`hu-HU`) formában érdemes kezelni a jobb felhasználói élményért.
- MVP-ben az adatforrást a felületen explicit jelezni kell (Supabase vs mock), hogy diagnosztikánál egyértelmű legyen.
