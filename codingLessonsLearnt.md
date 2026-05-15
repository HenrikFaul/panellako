# codingLessonsLearnt.md — Kapakka PubApp

## ⚠️ UTASÍTÁSOK (MINDIG OLVASD EL ELŐSZÖR!)

**KÖTELEZŐ MUNKAFOLYAMAT — Minden fejlesztés előtt:**
1. Nyisd meg és olvasd végig ezt a fájlt MIELŐTT bármit kódolnál
2. Ellenőrizd, hogy az új kódod nem tartalmaz-e az itt felsorolt hibamintákat
3. Ha új hibát találsz/javítasz, AZONNAL appendeld a megfelelő kategóriába
4. SOHA ne töröld a meglévő tartalmat — csak hozzáadni szabad
5. SOHA ne hozz létre új fájlt ezzel a céllal — mindig ebbe a fájlba írd

**Struktúra minden hiba bejegyzésnél:**
```
### [HIBA-XXX] Rövid cím
- **Dátum**: Mikor fordult elő
- **Fájl**: Melyik fájlban volt
- **Hibaüzenet**: Pontos TypeScript/build error
- **Gyökérok**: Miért történt
- **Javítás**: Hogyan lett megoldva
- **Megelőzés**: Hogyan kerüld el a jövőben
```

---

## 🔴 KATEGÓRIA 1: TypeScript típus hibák

### [HIBA-001] Hiányzó property az interface-ből
- **Dátum**: 2026-03-30 (v1.1.0)
- **Fájl**: `src/app/admin/menu/templates/page.tsx:157`
- **Hibaüzenet**: `Type error: Property 'item_sort' does not exist on type 'TemplateItem'.`
- **Gyökérok**: A `TemplateItem` interface-ben nem volt definiálva az `item_sort` property, miközben a kód hivatkozott rá (`sort_order: item.item_sort`). Az interface-t kézzel írtam, és kifelejtettem egy mezőt amit az SQL tábla tartalmaz.
- **Javítás**: Hozzáadtam `item_sort: number` a `TemplateItem` interface-hez.
- **Megelőzés**: **MINDIG** hasonlítsd össze az interface mezőket az SQL tábla oszlopaival. Ha az SQL-ben van `item_sort`, az interface-ben is KELL lennie. Checklist: minden SQL oszlop = egy interface property.

### [HIBA-002] Supabase FK reláció típusozás — `.table.number` hiba
- **Dátum**: 2026-03-30 (v1.2.0)
- **Fájl**: `src/app/admin/reports/page.tsx:61`
- **Hibaüzenet**: `Type error: Property 'number' does not exist on type '{ number: any; }[]'.`
- **Gyökérok**: Supabase `.select('table:tables(number)')` esetén a TypeScript a relációt **tömbként** (`{ number: any }[]`) típusozza, nem objektumként. Ezért `o.table.number` helyett `o.table[0].number` kellene, de valójában futásidőben objektumot ad vissza (nem tömböt).
- **Javítás**: A `.map()` callback-ben `(o: any)` típust használtam: `.map((o: any) => [...])` — ez megkerüli a Supabase TS típus problémát.
- **Megelőzés**: **MINDIG** használj `(item: any)` cast-ot amikor Supabase `.select()` eredményt iterálsz és FK relációkat (`table:tables(...)`, `venue:venues(...)`, `menu_item:menu_items(...)`) használsz. VAGY használj `useState<any[]>([])` a state-hez. A kettő közül az egyik KÖTELEZŐ.

### [HIBA-003] Supabase FK — új oszlopok nem ismertek a TS típusokban
- **Dátum**: 2026-03-30 (v1.2.0)
- **Fájl**: `src/app/admin/reports/page.tsx:137`
- **Hibaüzenet**: Potenciális — `total_orders`, `total_spent` nem létezik a `profiles` Supabase típusban
- **Gyökérok**: Ha ALTER TABLE-lel új oszlopot adsz hozzá (`total_orders`, `total_spent`), a Supabase TS generált típusok nem frissülnek automatikusan. A `.select()` eredmény típusa nem tartalmazza az új mezőket.
- **Javítás**: `(c: any)` cast a `.map()` callback-ben.
- **Megelőzés**: Ha SQL migrációval új oszlopokat adsz egy meglévő táblához, az adott tábla select eredményeit MINDIG `(row: any)` casttal kezeld, amíg a típusok nem lesznek újragenerálva (`supabase gen types`).

### [HIBA-018] Implicit `any` a chained `.map().filter()` callbackben
- **Dátum**: 2026-03-31 (v1.3.1)
- **Fájl**: `src/lib/place-search.ts:98`
- **Hibaüzenet**: `Type error: Parameter 'row' implicitly has an 'any' type.`
- **Gyökérok**: A `rows` tömb `any[]` típusú volt, és a `rows.map(...).filter((row) => row.external_id)` láncban a `filter` callback paramétere nem kapott explicit típust. `noImplicitAny` mellett ez build hibát okozott.
- **Javítás**: A nyers API választ `const rows: any[]` formában explicitáltam, külön `normalizedRows: ExternalPlace[]` tömbbe mapeltem, majd a filter callbacket `ExternalPlace` típussal adtam meg.
- **Megelőzés**: Ha `any[]` tömbből több lépéses `.map().filter().reduce()` lánc készül, a köztes eredményt MINDIG nevezd el és adj neki explicit típust. A végső callback paramétereknél ne hagyatkozz implicit inference-re `strict` TypeScript beállítás mellett.

---

## 🟡 KATEGÓRIA 2: SQL / RLS / Adatbázis hibák

### [HIBA-004] SQL szintaxis hiba — RLS policy zárójelezés
- **Dátum**: 2026-03-29 (v1.0.0)
- **Fájl**: `supabase/migrations/001_initial_schema.sql:47`
- **Hibaüzenet**: `syntax error at or near "or" LINE 47: ) or is_active = true;`
- **Gyökérok**: Az RLS policy USING() zárójelén kívül volt egy `or is_active = true` feltétel. A helyes szintaxis: `USING ((feltétel1) OR (feltétel2))` — minden feltétel a USING() BELSEJÉBE kerül.
- **Javítás**: Az egész policy-t újraírtam helyes zárójelezéssel.
- **Megelőzés**: RLS policy írásakor MINDIG ellenőrizd, hogy MINDEN feltétel a `USING(...)` zárójelen BELÜL van. Soha ne legyen logikai operátor a zárójelen kívül.

### [HIBA-005] RLS policy circular dependency — profil olvasás blokkolva
- **Dátum**: 2026-03-29 (v1.0.1)
- **Fájl**: Profiles RLS policies
- **Hibaüzenet**: Profil lekérdezés sikertelen admin felhasználóknál
- **Gyökérok**: A profiles SELECT policy JOIN-t tartalmazott a `venues` táblára, ami maga is RLS-sel volt védve. Ha a venues policy is hivatkozott a profiles-ra → circular dependency. Az admin felhasználó nem tudta olvasni a saját profilját.
- **Javítás**: Egyszerű policy: `CREATE POLICY "profiles_select_authenticated" ON public.profiles FOR SELECT USING (auth.uid() IS NOT NULL);` — minden bejelentkezett felhasználó olvashat minden profilt.
- **Megelőzés**: **SOHA** ne legyen RLS SELECT policy-ban JOIN más RLS-védett táblára. Ha kell cross-table check, használj egyszerű `auth.uid()` alapú feltételt, vagy SECURITY DEFINER funkciót.

### [HIBA-006] Profil email NULL — role update 0 rows
- **Dátum**: 2026-03-29 (v1.0.1)
- **Hibaüzenet**: `UPDATE public.profiles SET role = 'admin' WHERE email = 'x@y.com'` → 0 rows affected
- **Gyökérok**: A `handle_new_user()` trigger nem másolta át az email-t az `auth.users` táblából a `profiles` táblába. A `profiles.email` mező NULL volt, ezért a WHERE feltétel nem talált sort.
- **Javítás**: JOIN-os UPDATE: `UPDATE profiles p SET role = 'admin' FROM auth.users u WHERE p.id = u.id AND u.email = 'x@y.com';`
- **Megelőzés**: A `handle_new_user()` trigger MINDIG másolja át az email-t: `NEW.raw_user_meta_data->>'email'` VAGY `(SELECT email FROM auth.users WHERE id = NEW.id)`. Soha ne feltételezd, hogy a profiles.email ki van töltve.

### [HIBA-007] Supabase FK constraint név — törékeny hivatkozás
- **Dátum**: 2026-03-30 (v1.1.0)
- **Fájl**: `src/app/siteadmin/venues/page.tsx`
- **Hibaüzenet**: Potenciális — `profiles!venues_owner_id_fkey` nem létezik
- **Gyökérok**: `.select('*, owner:profiles!venues_owner_id_fkey(full_name, email)')` — a constraint név adatbázisonként eltérhet. A Supabase automatikusan generálja a FK constraint nevet, és nem garantált, hogy mindig `venues_owner_id_fkey`.
- **Javítás**: Lecseréltem `.select('*, owner:profiles(full_name, email)')` — constraint név nélkül, a Supabase automatikusan feloldja.
- **Megelőzés**: **SOHA** ne használj explicit FK constraint nevet a `.select()` relációkban. Használd a szimpla `table_name(columns)` szintaxist. Ha ambiguous, használd a `table_name!column_name(columns)` formátumot (oszlop nevet, NEM constraint nevet).

---

## 🟠 KATEGÓRIA 3: Auth / Redirect / Session hibák

### [HIBA-008] Auth redirect loop — 4 helyen konkurens redirect
- **Dátum**: 2026-03-29 (v1.0.0 → v1.0.1)
- **Fájl**: middleware.ts + page.tsx + customer/page.tsx + admin/layout.tsx
- **Hibaüzenet**: Végtelen loading screen — az alkalmazás sosem jutott túl az „Átirányítás..." képernyőn
- **Gyökérok**: 4 különböző helyen volt routing logika, és egymásba irányítottak: middleware → /admin → admin/layout ellenőrzi → /customer → customer/page ellenőrzi → /admin → ∞ loop
- **Javítás**:
  1. `middleware.ts` — CSAK cookie frissítés, NULLA redirect
  2. `page.tsx` — Egyetlen auth check 4s timeout-tal, `hasRedirected` ref a dupla redirect ellen
  3. `customer/page.tsx` — Admin felhasználóknak "Admin panel megnyitása" GOMB, nem redirect
  4. `admin/layout.tsx` — Nem-admin felhasználóknak error screen, nem redirect
- **Megelőzés**: **EGY SZABÁLY**: Routing döntés KIZÁRÓLAG client-side, egyetlen helyen. Middleware SOHA ne redirecteljen. Ha jogosultsági hiba van, mutass error screen-t, ne redirectelj másik oldalra.

### [HIBA-009] getSession() vs getUser() — elavult session
- **Dátum**: 2026-03-29
- **Gyökérok**: `getSession()` a helyi cache-ből olvas, ami elavult lehet. `getUser()` mindig a Supabase szerverhez fordul.
- **Megelőzés**: Auth ellenőrzésnél MINDIG `getUser()` a megbízható módszer, NEM `getSession()`.

### [HIBA-014] Venue JOIN a profil lekérdezésben blokkolja az auth-ot
- **Dátum**: 2026-03-30 (v1.2.0)
- **Fájl**: `src/app/admin/layout.tsx`
- **Hibaüzenet**: "Nincs hozzáférésed" — admin felhasználó nem tud belépni az admin panelre
- **Gyökérok**: A profil lekérdezés `select('*, venue:venues(*)')` formában volt, ami FK JOIN-t csinál a venues táblára. Ha a `profiles.venue_id` NULL (nincs venue hozzárendelve), VAGY ha nincs explicit FK constraint a DB-ben, VAGY ha az RLS policy blokkolja a venues lekérést, az EGÉSZ lekérdezés hibával tér vissza (`profileError` != null). Emiatt a kód a `no-permission` ágra futott, pedig a felhasználó valójában admin role-lal rendelkezett.
- **Javítás**: A profil és venue lekérdezést SZÉTVÁLASZTOTTAM:
  1. Először: `select('*')` a profiles-ból (FK JOIN nélkül) — ez az auth check
  2. Utána: külön `select('*')` a venues-ból venue_id alapján — ez már NEM blokkolja az auth-ot
- **Megelőzés**: **SOHA** ne legyen FK JOIN egy auth-kritikus lekérdezésben! Az auth ellenőrzés (profil + role check) MINDIG egyszerű, single-table query legyen. Ha kiegészítő adatok kellenek (venue, orders stb.), azokat KÜLÖN, NEM-BLOKKOLÓ lekérdezésben szerzd be MIUTÁN az auth check sikeres.

---

## 🔵 KATEGÓRIA 4: Build / Import / Kompatibilitás hibák

### [HIBA-010] Next.js fájlnév konvenció — page.tsx kötelező
- **Dátum**: 2026-03-29
- **Gyökérok**: A felhasználó a letöltött fájlokat `admin-layout.tsx` és `customer-page.tsx` néven mentette el `layout.tsx` és `page.tsx` helyett. Next.js App Router CSAK a `page.tsx`, `layout.tsx`, `loading.tsx` stb. pontos neveket ismeri fel.
- **Megelőzés**: Fájlok MINDIG a pontos Next.js konvenció szerinti nevekkel készüljenek. A letöltési/mentési utasításokban MINDIG jelöld meg a cél fájlnevet.

### [HIBA-011] Lucide React ikon import — nem létező ikon név
- **Dátum**: Általános (megelőző figyelmeztetés)
- **Megelőzés**: Lucide React ikonokat MINDIG a hivatalos listáról importáld. Ha nem biztos, hogy létezik, használj olyan ikont ami biztosan megvan (pl. `Settings`, `User`, `Search`, `Plus`, `Check`, `X`). A `lucide-react@0.363.0` verzióban ezek biztosan elérhetők: Zap, ClipboardList, UtensilsCrossed, Package, BarChart3, Settings, HelpCircle, Menu, Bell, LogOut, Shield, ChevronRight, X, Monitor, CalendarClock, FileDown, Plus, Pencil, Trash2, Search, CheckCircle, XCircle, Volume2, VolumeX, Maximize, Minimize, RefreshCw, Check, Clock, AlertTriangle, Download, FileSpreadsheet, Calendar, TrendingUp, ShoppingBag, Users, Phone, Mail, User, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, ArrowLeft, Sparkles, Star, MapPin, Store, ScrollText, LayoutDashboard, Activity, Info, AlertCircle, ToggleLeft, ToggleRight, Save, Filter, Bug, Send.

### [HIBA-015] Lucide React redesign patch — `House` ikon build hibát okozott
- **Dátum**: 2026-03-30 (v1.2.1)
- **Fájl**: `src/app/customer/page.tsx:15`
- **Hibaüzenet**: `Type error: "lucide-react" has no exported member named 'House'. Did you mean 'Mouse'?`
- **Gyökérok**: A redesign patch-ben olyan Lucide ikont importáltam (`House`), ami a projektben használt verzióban nem exportált. Ráadásul több más ikon is a "biztosan elérhető" listán kívül volt, ezért a patch nem követte a kötelező ikon-import szabályt.
- **Javítás**: A `House` importot `LayoutDashboard`-ra cseréltem, és a redesign patch összes új Lucide importját átnéztem. Az összes bizonytalan ikont lecseréltem a codingLessonsLearnt-ben felsorolt, biztosan elérhető ikonokra.
- **Megelőzés**: **MINDIG** ellenőrizd a redesign patch összes Lucide importját a `codingLessonsLearnt.md` [HIBA-011] pontja alapján. Új UI csomag kiadása előtt kötelező grep-pel végignézni az összes `from 'lucide-react'` importot, és csak a whitelistelt ikonok maradhatnak.



---

## 🟢 KATEGÓRIA 5: CSS / UI hibák

### [HIBA-012] Admin `.input` class hiányzik
- **Dátum**: 2026-03-30 (v1.1.0)
- **Gyökérok**: Az admin oldalak `.input` CSS class-t használnak az input mezőkhöz, de ez nem volt definiálva a globals.css-ben. A Tailwind nem generálja automatikusan.
- **Javítás**: `.input` class hozzáadása a globals.css-hez explicit CSS-ként.
- **Megelőzés**: Ha egyedi CSS class-t használsz (`.input`, `.status-badge`, `.animate-slide-up`), MINDIG ellenőrizd, hogy definiálva van-e a globals.css-ben.

### [HIBA-013] Admin sidebar mobil nézet — nem jelenik meg
- **Dátum**: 2026-03-30
- **Gyökérok**: A `display: none` `@media(max-width:768px)` felülírta a JavaScript-ből adott `translate-x-0` class-t.
- **Javítás**: CSS override: `.admin-sidebar.translate-x-0 { display: flex !important; }`
- **Megelőzés**: Ha egy elem CSS-ből `display:none`, a JS class hozzáadás NEM elég — `!important` kell a CSS-ben is.

---

### [HIBA-015] Patch-only csomagból kimaradt új supporting fájlak
- **Dátum**: 2026-03-30 (v1.2.1)
- **Fájl**: patch csomag / `src/app/layout.tsx`, `src/app/admin/config/page.tsx`
- **Hibaüzenet**: Build/import hiba, mert az újonnan hivatkozott `@/components/AppShellProviders` és `@/lib/themes` fájlok nem voltak benne a patch-only zipben.
- **Gyökérok**: A patch-only csomagolásnál nem csak a módosított meglévő fájlakat, hanem az újonnan BEVEZETETT supporting fájlokat is csomagolni kell. Ezek kimaradtak.
- **Javítás**: A patch-only csomag listáját úgy kell összeállítani, hogy minden új import célfájlja bekerüljön.
- **Megelőzés**: Patch készítés előtt **MINDIG** futtasd le ezt a checklistet: minden `import '@/...'` útvonalhoz létezik fájl ÉS a zipben is benne van, ha újonnan lett bevezetve.

### [HIBA-016] Design patch buildbiztonság — csak syntax-ellenőrzött fájl csomagolható
- **Dátum**: 2026-03-30 (v1.3.0)
- **Fájl**: összes új / módosított `.tsx` fájl
- **Hibaüzenet**: Potenciális — reszponzív redesign közben könnyű szintaktikai hibát vagy félbehagyott importot hagyni.
- **Gyökérok**: Nagy redesignnál sok fájl változik egyszerre, ezért megnő a hibázás esélye.
- **Javítás**: A patch csomagolás előtt a módosított TS/TSX fájlakat legalább TypeScript parser szinten ellenőrizni kell.
- **Megelőzés**: **MINDIG** legyen build-safety lépés: ha teljes `npm build` nem futtatható, akkor minimum parser/syntax ellenőrzést kell végezni minden módosított TS/TSX fájlra.

### [HIBA-017] Új adatbázis tábla / migráció még nincs fent — UI ne omoljon össze
- **Dátum**: 2026-03-30 (v1.3.0)
- **Fájl**: `src/app/customer/page.tsx`, `src/app/admin/config/page.tsx`, új social/place feature lekérdezések
- **Hibaüzenet**: Potenciális — ha a `place_favorites`, `friendships`, `place_lists`, `app_settings` vagy `reservations` migráció még nincs lefuttatva, a featurelekérdezések hibát dobhatnak.
- **Gyökérok**: A frontend hamarabb kerülhet fel, mint az új migráció.
- **Javítás**: A lekérdezések `maybeSingle()` / `|| []` fallback mintával készültek, és a feature nem auth-kritikus ágon fut.
- **Megelőzés**: **SOHA** ne legyen új opcionális feature táblára épített lekérdezés auth-kritikus vagy page-blocking. Új feature tábla = null-safe, fallbackes, nem-blokkoló betöltés.

## 📋 ELLENŐRZŐ LISTA (Minden commit előtt)

- [ ] Auth-kritikus lekérdezésben NINCS FK JOIN? (profiles select = egyszerű `select('*')`)
- [ ] Minden interface/type property megegyezik az SQL tábla oszlopaival?
- [ ] Supabase `.select()` FK relációk használatánál van `(row: any)` cast?
- [ ] Nincs explicit FK constraint név a Supabase select-ben?
- [ ] Nincs middleware-ben redirect?
- [ ] Auth check `getUser()`-t használ, nem `getSession()`-t?
- [ ] Fájlnevek Next.js konvenciónak megfelelnek (`page.tsx`, `layout.tsx`)?
- [ ] Egyedi CSS class-ok definiálva vannak a globals.css-ben?
- [ ] Lucide ikonok a hivatalos listáról importálva?
- [ ] Minden új import célfájlja benne van a patch-only csomagban?
- [ ] Parser/syntax ellenőrzés lefutott a módosított TS/TSX fájlakon?
- [ ] RLS policy-kban nincs cross-table JOIN más RLS-védett táblára?
- [ ] Új SQL oszlopok esetén a kód `(: any)` castot használ?

---

*Utoljára frissítve: 2026-04-11 — v2.0.0*
*Ez egy FOLYAMATOSAN BŐVÜLŐ fájl. Új hibákat MINDIG appendelj, SOHA ne törölj!*

## ➕ APPEND — 2026-05-10 Org chart navigation + Bővebb adatok view

### [LESSON-UI-076]: Drawer / pan-zoom canvas belsejében a kattintható elemekre `onMouseDown stopPropagation` is kell
- **Context**: `OrgChartPremiumView` jobb oldali drawerében új interaktív gombok (`Vezető` + `Közvetlen beosztott` badge-ek, `Adatlap megnyitása` gomb) — egy pán-/zoom-os canvas mellett.
- **Problem**: Az ős `<div>` `onMouseDown` indít drag-et; a drag a `DRAG_THRESHOLD` (6 px) átlépésekor elnyeli a click-et a `onClickCapture`-ben. Ha a belső gomb csak `onClick`-et kap, a felhasználó kattintása drag-re változhat finommotorikus mozgásnál → a click sosem tüzel.
- **Fix**: Minden interaktív elem KAP `onMouseDown` handlert, ami `stopPropagation()`-t hív. Ezzel a drag NEM indul, és a `onClick` garantáltan tüzel. A `MiniPersonRow`, `DrawerLinkRow`, és az „Adatlap megnyitása" gomb mind ezt a mintát követi.
- **Pattern**:
  ```tsx
  <button
    onClick={onSwitchTo}
    onMouseDown={(e) => e.stopPropagation()}  // pan-zoom canvasban kötelező
  >
    …
  </button>
  ```

### [LESSON-SUPABASE-SDK-077]: Új opcionális tábla lekérdezésénél kezeljük explicit a "relation does not exist" (42P01) hibát
- **Context**: A `MemberExtendedDetails` „Meghatározott célok" szekciója az új `enterprise_member_goals` táblát olvassa, de a tábla még nem feltétlenül létezik (a migráció lehet külön deployolva).
- **Problem**: Ha az SDK egy nem-létező táblára hív `select`-et, az error.code === '42P01' (Postgres "relation does not exist"). A normál hibakezelés `toast.error(error.message)` mintával dobálná a piros toaszt minden render-nél.
- **Fix**: A goals query külön try-catch + error.code ellenőrzés. Ha 42P01 vagy a `message` "does not exist" stringet tartalmaz → `goalsTableMissing = true` flag-et állítunk. A UI inline figyelmeztetést mutat ("A célok modul még nincs telepítve. Futtasd le a legújabb migrációt"), nem dobja össze a többi szekciót, és nem ugrál a toast.
- **Pattern**:
  ```ts
  const res = await (supabase as any).from('enterprise_member_goals').select('id').limit(1);
  if (res.error) {
    if (String(res.error.code) === '42P01' || /does not exist/i.test(res.error.message ?? '')) {
      setTableMissing(true);
    } else {
      console.warn('[X] load error:', res.error.message);
    }
  }
  ```

### [LESSON-SEED-078]: Done jegyek `external_updated_at` mezőjét a seedben backdate-elni kell, hogy időbeli vizualizációk működjenek
- **Context**: A demo seed `enterprise_agile_issues` rekordokat hoz létre, részük `Done` státusszal. A MemberProfileSheet teljesítmény-diagramja az utolsó 12 hónap havi `story_points` összegét mutatja Done jegyekre az `external_updated_at` (vagy fallback `due_date`) alapján.
- **Problem**: A seed eredetileg nem állította az `external_updated_at` mezőt, és a Done jegyek `due_date`-je is csak az utolsó 1-2 hét volt — emiatt a 12 hónapos diagram szinte mindig üres, a demo nem mutatja értelmesen a feature-t.
- **Fix**: A seed insert előtt minden Done jegyhez számolunk egy backdated `external_updated_at` timestampet az utolsó 180 napra szétterítve, deterministic hash-szel (`(doneCounter * 37) % 175`). Így újra-seedelésnél is azonos eloszlást kapunk, és a chart a teljes 12 hónapos időablakot lefedi.
- **Pattern**:
  ```ts
  let doneCounter = 0;
  const issueRows = AGILE_ISSUE_DEFS.map(({ startOff, dueOff, ...rest }) => {
    const isDone = (rest.status ?? '').toLowerCase() === 'done';
    let externalUpdatedAt: string | null = null;
    if (isDone) {
      const offset = -180 + Math.round(((doneCounter * 37) % 175));
      doneCounter += 1;
      externalUpdatedAt = addDays(today, offset).toISOString();
    }
    return { ...rest, ...(externalUpdatedAt ? { external_updated_at: externalUpdatedAt } : {}) };
  });
  ```

### [LESSON-ROUTING-SPA-079]: Deep-link tabváltáshoz külső callback prop, NEM közvetlen URL manipuláció
- **Context**: A MemberProfileSheet „Bővebb adatok" szekcióiból deep-link gombokkal lehet a Resources / Workflows tabokra ugrani.
- **Problem**: A `MemberProfileSheet` mélyen a komponensfa belsejében ül (Sheet portal-ban renderelődik), így nincs natív hozzáférése sem a `useSearchParams`-hoz, sem a `WorkspaceDashboard.setActiveTab`-hez. Korábbi `LeaveCalendar` patternünk már `onNavigateTab?: (tab: string) => void` propot használ.
- **Fix**: Ugyanezt a prop pattern-t alkalmaztuk az új modulokra is. Az `onNavigateTab`-ot WorkspaceDashboard → MemberList / OrganizationModule → OrgChart → MemberProfileSheet láncon adjuk át. Minden köztes komponens csak forward-olja, és a végpontnál (MemberProfileSheet) a deep-link kattintáskor a helyi sheet bezárul, majd hívja `onNavigateTab(tab)` — így a setActiveTab dispatch + URL-szinkron a szülőben történik.
- **Pattern**:
  ```tsx
  // Top: WorkspaceDashboard
  <OrganizationModule onNavigateTab={setActiveTab} userId={userId} />
  // Mid: OrganizationModule → OrgChart, MemberList → MemberProfileSheet
  onNavigateTab={(tab) => { setSelectedMember(null); onNavigateTab?.(tab); }}
  ```

---

## ➕ APPEND — 2026-05-10 Import/Export Center implementáció

### [LESSON-IMPORT-081]: Config-driven entity registry > entity-specific UI komponensek
**Context**: Bulk import/export rendszer 7 entitásra (Members, Leave, Offices, Work Categories, Job Roles, Positions, Skills). Naiv megközelítés: minden entitásra külön panel komponens.
**Problem**: Külön komponens / entitás megduplikálja az UI logikát (mezőkijelölő, validátor, oszlopleképezés, error preview), és minden új entitás kódfejlesztést igényelne.
**Fix**: Egyetlen config tömb `ENTITY_REGISTRY[]` definiálja az összes entitást field-szinten (`FieldDefinition`: key, label, type, required, importable, exportable, computed, group, importAlias, templateExample, protected). A wizard, field picker, mapper, validátor mind ebből olvas. Új entitás = 1 sor a configban + Edge Function handler — UI komponens érintetlen.
**Pattern**:
```ts
export const ENTITY_REGISTRY: EntityConfig[] = [
  { key: 'members', label: 'Tagok', icon: Users, fields: MEMBER_FIELDS, ... },
  // ...további entitások
];

// UI:
const entity = getEntityConfig(entityKey);
entity.fields.filter(f => f.exportable).forEach(...)
```
**Megelőzés**: Mielőtt entitás-specifikus komponenst írsz: kérdezd meg, hogy egy config-driven approach megoldaná-e. Ha 3+ hasonló entitás van, KÖTELEZŐ a config-pattern.

### [LESSON-CSV-082]: RFC 4180-kompatibilis CSV parser saját kézzel — embedded comma + quote support
**Context**: A korábbi `CsvImportPanel.parseCSV` csak `line.split(',')`-ot használt. Ez töri a `"Kovács, Béla"` típusú quoted mezőket, és nem kezeli a `""` escape-et.
**Problem**: Felhasználói exportok gyakran tartalmaznak vesszőt (címek, megjegyzések) vagy idézőjelet (cégnevek). Naiv splitter `,`-nél töri, validációs hiba helyett rossz adat kerül a DB-be.
**Fix**: State-machine alapú parser `inQuotes` flag-el, kezeli a `""` escape-et, CRLF / LF line endings, BOM strip. Lásd `import-export/utils/file-parser.ts → parseCSV()`.
**Pattern**:
```ts
let inQuotes = false;
while (i < text.length) {
  const ch = text[i];
  if (inQuotes) {
    if (ch === '"' && text[i + 1] === '"') { cell += '"'; i += 2; continue; }
    if (ch === '"') { inQuotes = false; i++; continue; }
    cell += ch; i++; continue;
  }
  if (ch === '"') { inQuotes = true; i++; continue; }
  // ... comma, newline, default
}
```
**Megelőzés**: Soha ne használj `string.split(',')` CSV parsoláshoz. Ha nem akarsz library-t hozni (papaparse), írj state-machine parsert vagy regex-mentes karakter-szintű loopot.

### [LESSON-IMPORT-083]: Excel XML (.xls) format > .xlsx ZIP format browser környezetben library nélkül
**Context**: A felhasználók Excel-ben szerkesztett fájlokat töltenek fel. .xlsx valódi formátum: ZIP archívum XML fájlokkal — JSZip vagy SheetJS kell hozzá.
**Problem**: Külső library hozzáadása növeli a bundle-t (~300KB SheetJS). Sandbox környezetben nem mindig telepíthető.
**Fix**: Excel XML Spreadsheet 2003 formátum (`.xls`-ként mentve) — egy single XML fájl, semmilyen ZIP, könnyen olvasható/írható kézzel. Excel és LibreOffice natívan megnyitja. Generálás: `<Workbook><Worksheet><Table><Row><Cell><Data>...</Data></Cell></Row>...`. Olvasás: regex `/<Row[^>]*>([\s\S]*?)<\/Row>/g`.
**Megelőzés**: Ha XLSX-fertőző alkalmazást fejlesztesz library nélkül: használd az Excel XML Spreadsheet 2003 formátumot. Ha valódi .xlsx kell, hozz be SheetJS-t.

### [LESSON-IMPORT-084]: Auto-detect + skip guidance row template-ekben
**Context**: Az import-kompatibilis sablon második sora egy útmutató sor (`kovacs.bela@ceg.hu`, `Kovács Béla`, `Backend`...). Ha a felhasználó nem törli ki, az importba kerül mint adat.
**Problem**: Ha a wizard automatikusan elsőnek ezt importálja, hibát dob ("kovacs.bela@ceg.hu" nem létezik a profiles táblában). Vagy létrehoz egy hamis "Kovács Béla" tagot.
**Fix**: Auto-detect heurisztika a feltöltés után: ha a 2. sor email mezője nem érvényes email VAGY tartalmazza a `@ceg.hu` placeholder domaint → automatikusan kihagyjuk. Toast: "Útmutató sor automatikusan kihagyva".
**Pattern**:
```ts
function detectGuidanceRow(entity, mapping, firstRow) {
  const emailField = entity.fields.find(f => f.type === 'email' && f.required);
  if (!emailField) return false;
  const v = firstRow[mappedHeader].trim();
  if (v.includes('@ceg.hu')) return true;
  if (v && !EMAIL_RE.test(v)) return true;
  return false;
}
```
**Megelőzés**: Bármilyen template formátumnál, ahol vannak nem-adat sorok (header, guidance, totals): auto-detect logikát építs az importerbe. Soha ne hagyd a felhasználóra a manuális tisztogatást.

### [LESSON-IMPORT-085]: Members import = invitation flow új email-ekhez, közvetlen update meglévőkhöz
**Context**: Tagok bulk importálásánál két eset van: (a) új email cím nincs a `profiles` táblában (új user), (b) meglévő email a profiles-ban (létező user, esetleg másik workspace-ben).
**Problem**: Ha új user-t közvetlenül `enterprise_memberships`-be írunk be `user_id` nélkül, FK constraint sérül. Ha megpróbálunk auth admin API-val accountot létrehozni, az kötelez jelszó-stratégia + jelszó visszaállítás emailre küldést.
**Fix**:
- Új email (nincs profile): `enterprise_invitations`-be insert (létező pattern!) — a workspace owner később jóváhagyja, a felhasználó tudja regisztrálni az emailen kapott linkkel.
- Meglévő user, nincs membership: közvetlen `enterprise_memberships` insert.
- Meglévő user, van membership: create módban skip, upsert módban update.
**Megelőzés**: Bulk import felhasználó-kapcsolatos entitásoknál SOHA ne kerüld meg az auth flow-t. Új user-eket invitációval hozz be — ez biztonságos, audit-elhető, és a meglévő UX-szel konzisztens.

---

## ➕ APPEND — 2026-05-10 Sticky navigáció regresszió-javítás

### [LESSON-UI-080]: Sticky tab-sáv / almenü-sáv — CSS custom property alapú top-offset
**Context**: Többszintű navigáció (főmenü + almenü sávok) sticky pozicionálásánál a `top` értéket az összes sticky ancestor magasságának összegéből kell számítani. Az alkalmazásban két layout mode van: `sidebar` (a főmenü TabsList `sr-only`) és `tabs` (látható főmenü sáv).
**Problem**: A `TabsList` (főmenü sáv) és az almenü sávok (Naptár, Erőforrások) nem kaptak `sticky` pozicionálást. Görgetéskor eltűntek — felhasználó elvesztette a navigációs kontextust.
**Fix**: CSS custom property-k a közös ancestor container `style` prop-ján:
```tsx
style={{
  '--ws-header-h': '53px',                               // header magassága
  '--ws-main-tabs-h': layout === 'sidebar' ? '0px' : '65px',  // 0 ha sidebar mode
} as any}
```
- **Főmenü TabsList** (tabs mode): `sticky top-[var(--ws-header-h)] z-20`
- **Almenü TabsList** (Calendar, Resources): `sticky top-[calc(var(--ws-header-h)_+_var(--ws-main-tabs-h))] z-10 bg-background border-b rounded-none`
- Az almenük maguk öröklik a CSS változókat a DOM-on keresztül — nincs szükség új propra `ResourcesTab`-ban.
- A `_` Tailwind arbitrary értékben szóköznek felel meg: `calc(... + ...)` lesz a generált CSS-ben.
**Megelőzés**: Minden új sticky navigációs sávhoz:
1. Mérd fel a stacking sorrendet (hány sticky réteg van felette?)
2. Adj `bg-background` + megfelelő `z-index`-et (ne legyen 0)
3. Sidebar mode + tabs mode top-offset különbség KÖTELEZŐ (CSS var-ral kezeld)

---

## ➕ APPEND — 2026-05-10 demo seed regresszió

### [HIBA-074] Edge seedben csendben elnyelt részleges insert-hiba → „kész” demo workspace, üres naptár
- **Dátum**: 2026-05-10
- **Fájl**: `supabase/functions/seed-demo-workspace/index.ts`
- **Hibaüzenet**: Frontenden tünetként jelentkezett: a demo workspace létrejött, de a `leave_requests` rekordok nem jelentek meg a Naptár / Idővonal / Kérelmek nézetekben.
- **Gyökérok**: A seed függvény a `leave_requests` insert eredményéből csak a `data` mezőt vette ki, az `error` mezőt nem kezelte. Ha a beszúrás bármely új séma-/policy-/trigger-változás miatt elbukott, a seed ettől még továbbfutott és „sikeres” workspace-et adott vissza, csak éppen szabadságadatok nélkül.
- **Javítás**: A `leave_requests` insert most már explicit `error` ellenőrzést kapott; hiba esetén a függvény logol és `throw`-val megszakítja a demo seedet. Emellett a seed-elágazás feltétele az lett, hogy valóban létezzenek seedelt szabadságtípusok, ne egy félrevezető, nem használt ID-változó.
- **Megelőzés**: Edge function seedekben **SOHA** ne hagyj részleges, üzletileg kritikus insertet fail-soft módban. Minden core demóadat-blokk (`memberships`, `leave_requests`, `projects`, stb.) esetén kötelező az `error` explicit kezelése; ha a blokk a felület működéséhez szükséges, fail-fast kell, nem csendes fallback.

### [HIBA-075] Demo leave seed csak részben kész, ha a kapcsolódó táblák nem követik a tényleges olvasási láncot
- **Dátum**: 2026-05-10
- **Fájl**: `supabase/functions/seed-demo-workspace/index.ts`
- **Hibaüzenet**: Frontenden tünetként jelentkezett: a demo workspace-ben voltak kvóták és egyéb leave entitások, de a napi szabályok üresek maradtak, az éves nézetben pedig a felhasznált napok / maradék nem tükrözte a demo szabadságokat.
- **Gyökérok**: A seed nem a modul teljes adatolvasási láncára készült. Az `enterprise_daily_rules` insertből hiányzott a kötelező `created_by`, az `enterprise_quota_transactions` pedig egyáltalán nem seedelődött, pedig az éves nézet ezt olvassa a quota felhasználás kiszámításához.
- **Javítás**: A daily rules seed már `created_by` mezővel fut, és a jóváhagyott demo `leave_requests` rekordokhoz automatikusan létrejönnek a kapcsolódó `enterprise_quota_transactions` sorok is.
- **Megelőzés**: Seed fejlesztésnél **MINDIG** a teljes UI adatforrás-láncot ellenőrizd, ne csak a „fő” táblát. Ha egy nézet több táblából áll össze (`leave_requests` + `enterprise_leave_quotas` + `enterprise_quota_transactions` + szabálytáblák), akkor a demo seed csak akkor tekinthető késznek, ha mindegyik workspace-scope forrás kap használható rekordokat.

## ➕ APPEND — 2026-03-31 build hiba kiegészítés

### [HIBA-023] Supabase Edge Function `Deno` globál — Next.js build alatti típushiba
- **Dátum**: 2026-03-31
- **Fájl**: `supabase/functions/place-search/index.ts:110`
- **Hibaüzenet**: `Type error: Cannot find name 'Deno'.`
- **Gyökérok**: A Next.js root build / TypeScript ellenőrzés belefutott a `supabase/functions/...` alatti Supabase Edge Function fájlba, ami **Deno runtime-ra** íródott (`Deno.serve(...)`). A Next/Node oldali TypeScript környezet nem ismeri automatikusan a `Deno` globált, ezért a build megállt. A probléma nem maga a business logika, hanem a runtime-keveredés: a Deno-s Edge Function ugyanabban a TypeScript ellenőrzési körben maradt, mint a Next app.
- **Javítás**: A stabil megoldás két részből áll:
  1. A Next app `tsconfig.json` fájljából ki kell zárni a `supabase/functions/**/*` útvonalat, hogy a Next build ne próbálja Node/Next környezetben típusellenőrizni a Deno Edge Functionöket.
  2. Az Edge Function saját Deno/Supabase runtime típusreferenciát kapjon, és külön Supabase / Deno folyamatban legyen ellenőrizve (például a projektben használt Supabase edge runtime type importtal).
- **Megelőzés**: **SOHA** ne hagyd a Deno runtime-ra írt Supabase Edge Function fájlokat a Next.js root typecheck hatókörében. Node/Next build és Supabase Edge Function typecheck legyen külön kezelve. Ha új Edge Function készül, azonnal ellenőrizd, hogy:
  - a `supabase/functions/**` mappa ki van-e zárva a root `tsconfig.json`-ból;
  - az adott function rendelkezik-e a szükséges Deno / Supabase edge runtime típusreferenciával;
  - az ellenőrzése külön Supabase / Deno parancsból történik-e, nem `npm run build` alatt.

## 📋 ELLENŐRZŐ LISTA — új buildbiztonsági pontok

- [ ] A `supabase/functions/**` mappa ki van zárva a Next.js root `tsconfig.json` typecheckjéből?
- [ ] A Deno runtime-os Edge Function saját runtime típusreferenciával rendelkezik?
- [ ] A Supabase Edge Function ellenőrzése külön történik a Next app buildtől?

*Appendelve: 2026-03-31 — v1.3.3*

### [HIBA-017] Supabase enum típus nem illeszkedik string filterhez
- **Dátum**: 2026-04-11 (v2.1.0)
- **Fájl**: `src/components/enterprise/ApprovalInbox.tsx:61`
- **Hibaüzenet**: `Argument of type 'string' is not assignable to parameter of type 'NonNullable<"approved" | ...>'`
- **Gyökérok**: A Supabase SDK generált típusai szűk uniót várnak, de a React state `string`-ként tárolta a filter értéket
- **Javítás**: `as any` cast alkalmazása a `.eq('status', statusFilter as any)` hívásban
- **Megelőzés**: Supabase `.eq()` hívásokban ha a filter értéke React state-ből jön és az enum típus szűk, használj explicit castot

*Appendelve: 2026-04-11 — v2.1.0*

---

## 🟢 KATEGÓRIA — Architektúra: Single Source of Truth (2026-04-22, v2.5.0)

### [LESSON-SSOT-001] Pozíció ↔ tag allokáció listázása JOIN-on keresztül
- **Dátum**: 2026-04-22
- **Fájl**: `src/components/enterprise/BusinessRoleManager.tsx`
- **Probléma**: A pozíció kártya csak 1 tagot mutatott, miközben a Member Profile %-os allokációt is támogat → adat-dissonance.
- **Gyökérok**: A korábbi lekérdezés a `business_role` mezőre szűrt a `enterprise_memberships`-en (régi 1:1 modell), figyelmen kívül hagyva az `enterprise_member_role_allocations` junction táblát.
- **Javítás**: Always read az allokációt a junction táblából, és join-old a `enterprise_memberships` + `profiles` adatokkal. UI-ban listázd MINDEN tagot %-os értékkel és számolt napi órával (`base_working_hours * pct / 100`).
- **Megelőzés**: Ha létezik junction tábla bármilyen N:M kapcsolatra, sose dolgozz a denormalizált, régi szűrőmezővel — a junction table az igazság forrása.

### [LESSON-SSOT-002] Dropdown / szűrő hardcoded listák tilosak
- **Dátum**: 2026-04-22
- **Fájl**: `src/components/enterprise/LeaveCalendar.tsx`
- **Probléma**: A csapat-szűrő hardcoded értékeket mutatott, eltérve a Settings → Teams modultól.
- **Javítás**: Minden szűrő opciólistát ugyanabból a Supabase táblából tölts (`enterprise_teams`), amit a CRUD-ot végző modul is használ.
- **Megelőzés**: Ha egy entitásnak van CRUD UI-ja, sose duplikáld statikusan máshol — egyetlen forrás (DB tábla / view) létezzen.

### [LESSON-PERMISSIONS-001] Hierarchikus jogosultság-fa katalógus táblából
- **Dátum**: 2026-04-22
- **Fájl**: `src/hooks/useEnterprisePermissions.ts`, `RolePermissionManager.tsx`
- **Probléma**: Statikus, lapos `FEATURE_GROUPS` array nehezen tartható szinkronban a tényleges navigációs fával.
- **Javítás**: `enterprise_feature_catalog` tábla bevezetése `parent_key` self-FK-val. A hook `featureTree`-t épít, az UI rekurzív komponenssel rendereli (`FeatureTreeRow`). Fallback: ha a katalógus üres, marad a régi flat lista.
- **Megelőzés**: Bármi, ami "tükrözi az alkalmazás struktúráját", legyen DB-ben tárolt fa, ne forrásban kódolt enum.

### [LESSON-CAPACITY-001] Kapacitás óra-egységben, ne csak százalékban
- **Dátum**: 2026-04-22
- **Fájl**: `src/lib/capacityEngine.ts`
- **Probléma**: Csak %-ban számolt kapacitás félrevezető részmunkaidős (4–6 órás) tagoknál.
- **Javítás**: Új `base_working_hours` mező a membership-en; minden ouputba (PositionSummary) számolj `total_available_hours = base_working_hours * (pct / 100)`-ot is.
- **Megelőzés**: Ha valós erőforrás-tervezést támogatunk, mindig legyen abszolút mértékegység (óra/nap), ne csak relatív arány.

### [LESSON-DASH-001] Új enterprise panelek integrálása csak meglévő tab/section alá
- **Dátum**: 2026-04-25
- **Fájl**: `src/components/enterprise/WorkspaceDashboard.tsx`
- **Probléma**: Új funkciók gyors beépítésekor könnyű külön tabot/szekciót nyitni, ami duplikált navigációt és regressziós kockázatot okoz.
- **Javítás**: Az új panelek (`AllowanceManager`, `WorkspaceGeneralSettings`, `BrandingManager`, `CsvImportPanel`) kizárólag meglévő `SettingsSection` blokkokba kerültek.
- **Megelőzés**: Dashboard bővítésnél elsődleges szabály: meglévő tab-hierarchiát bővíts, ne hozz létre párhuzamos felületet.

### [LESSON-CALENDAR-002] Éves nézetet sub-tabként kell integrálni, nem külön route-on
- **Dátum**: 2026-04-25
- **Fájl**: `src/components/enterprise/WorkspaceDashboard.tsx`, `src/components/enterprise/AnnualLeaveGrid.tsx`
- **Probléma**: Az éves naptár nézet külön route/tab esetén szétszórja a felhasználói flow-t.
- **Javítás**: A `Calendar` fülön belül másodlagos sub-tab struktúra (`Naptár`, `Éves nézet`) került bevezetésre.
- **Megelőzés**: Naptár-funkciók bővítésekor maradj a meglévő Calendar kontextusban.

### [LESSON-TEAMS-003] Team policy mezők szerkesztését validációval és blur-commit mintával kezeld
- **Dátum**: 2026-04-25
- **Fájl**: `src/components/enterprise/TeamManager.tsx`
- **Probléma**: Számmező közvetlen onChange mentése túl sok írást és hibás értéket okozhat.
- **Javítás**: `max_absent` mező draft state-ben tárolódik, és csak `onBlur` eseménykor mentődik validáció után; `approval_mode` explicit select opciókkal állítható.
- **Megelőzés**: Policy típusú mezőknél használj draft + commit mintát, ne per-keystroke adatbázis frissítést.

---

## ➕ APPEND — 2026-04-27 v2.5.1 Calendar/Capacity regression hotfix

### [LESSON-SCHEMA-002] Supabase schema-cache safe frontend payload kötelező új opcionális oszlopoknál
- **Dátum**: 2026-04-27
- **Fájl**: `src/components/enterprise/OfficeCoverageRuleManager.tsx`
- **Probléma**: A telephelyi szabály mentése eldobta a felületet `Could not find the 'business_roles' column of 'enterprise_office_coverage_rules' in the schema cache` hibával.
- **Gyökérok**: A frontend azonnal írta az új `business_roles` / `skill_ids` tömb oszlopokat, de a production Supabase/PostgREST schema cache vagy az aktuális adatbázis még a régi sémát látta.
- **Javítás**: Az új tömb oszlopos payload megmaradt elsődleges útnak, de PGRST/schema-cache hiányzó oszlop hibánál automatikus legacy fallback fut csak a régi `business_role` / `skill_id` oszlopokkal.
- **Megelőzés**: Új opcionális DB oszlop bevezetésekor a frontend írás legyen backward-compatible: régi payload fallback, célzott error-detekció, és csak az érintett schema-cache hibák kezelése fallbackként.

### [LESSON-UI-REGRESSION-004] Navigációs shortcutot ne hagyj bent, ha nem garantáltan jó célra visz
- **Dátum**: 2026-04-27
- **Fájl**: `src/components/enterprise/calendar/CoveragePlannerView.tsx`, `src/components/enterprise/WorkspaceDashboard.tsx`
- **Probléma**: A Kapacitástervező `Szabályok szerkesztése` gombja rossz helyre navigált.
- **Gyökérok**: A shortcut nem konkrét szekcióra/deep-linkre vitt, hanem túl általános tabváltást végzett.
- **Javítás**: A gomb eltávolításra került a Kapacitástervezőből; a szabálykezelés továbbra is a saját meglévő beállítási/szabálykezelő felületén érhető el.
- **Megelőzés**: Shortcut csak akkor maradhat, ha célzottan és validáltan a megfelelő modulrészhez visz. Ellenkező esetben jobb eltávolítani, mint félrenavigálni.

### [LESSON-CALENDAR-003] Havi gridben az üres állapot nem növelheti soronként a cellamagasságot
- **Dátum**: 2026-04-27
- **Fájl**: `src/components/enterprise/calendar/CoveragePlannerView.tsx`
- **Probléma**: Havi Kapacitástervező nézetben a `Nincs szabály — adj hozzá...` szöveg tördelődött és túl magas sorokat okozott.
- **Gyökérok**: A dinamikus `col-span-${colCount}` Tailwind class nem garantáltan generálódik, ezért a szöveg nem valódi többoszlopos cellaként viselkedett.
- **Javítás**: Szöveges üres állapot helyett napcellánként visszafogott szürke jelölés és vékony `border-border/70` elválasztó vonalak jelennek meg.
- **Megelőzés**: Dinamikus Tailwind class helyett inline style vagy explicit renderelt grid cellák használata szükséges változó oszlopszámnál.

### [LESSON-LAYOUT-002] Timeline szűrőpanel desktopon oldalsáv, nem teljes szélességű blokk
- **Dátum**: 2026-04-27
- **Fájl**: `src/components/enterprise/calendar/TimelineView.tsx`
- **Probléma**: Az Idővonal szűrők túl szélesen, teljes sorban jelentek meg.
- **Javítás**: Desktopon kétoszlopos grid layout: keskeny sticky bal oldali szűrősáv + mellette naptárterület. Mobilon megmarad az egymás alatti elrendezés.
- **Megelőzés**: Nagy naptár/grid nézetnél a konfigurációs/szűrőpanelt külön `aside` régióban kell kezelni, hogy ne nyomja le a fő tartalmat.

---

## ➕ APPEND — 2026-04-30 Produkció-stabilizálási audit (audit-stabilize-production)

### [LESSON-CONFLICT-001] officeRuleApplies ne hagyja ki a legacy `day_of_week` (singular) oszlopot
- **Dátum**: 2026-04-30
- **Fájl**: `src/lib/conflictEngine.ts`
- **Probléma**: A `ruleApplies` (daily rules) és az `officeRuleApplies` (coverage rules) függvény eltérően kezelte a `days_of_week` / `day_of_week` mezőket. A `officeRuleApplies` csak a tömb verziót (`days_of_week`) vizsgálta, ha az üres volt, visszaesett `[]`-re, ami miatt a rule minden napra érvényesnek számított (nem csak a konfigurált napra).
- **Gyökérok**: A multi-position/skill migrációkor az `officeRuleApplies` nem kapta meg a `ruleApplies`-ból már ismert legacy fallback logikát.
- **Javítás**: `officeRuleApplies` átírva: ha `days_of_week` tömb üres/null, fallback a `day_of_week` (singular) mezőre — azonos logika, mint `ruleApplies`.
- **Megelőzés**: Ha két kódhely azonos adatmodellt értelmez (rule applies), legyen egyetlen helper, ne duplikált, eltérő implementáció.

### [LESSON-QUERY-SCOPE-001] Supabase query-t mindig szűkítsd a szükséges dátumtartományra
- **Dátum**: 2026-04-30
- **Fájl**: `src/lib/conflictEngine.ts`
- **Probléma**: Az `enterprise_holidays` és `leave_requests` lekérdezések a TELJES workspace-rekordhalmazt hozták le dátumszűrés nélkül, majd JavaScript-szinten szűrtek.
- **Gyökérok**: A feature gyors fejlesztésekor a legegyszerűbb query-t írták meg, és a JS-oldali szűrés elfedi a felesleges adatátvitelt.
- **Javítás**: Mindkét lekérdezésbe bekerültek a `.gte` / `.lte` feltételek a kért napok tartományára.
- **Megelőzés**: Minden Supabase lekérdezésnél gondold végig: van-e dátum- vagy ID-alapú határoló feltétel, amit a DB-nek kell elvégeznie? Ne hagyd a szűrést csak JS-oldalra.

### [LESSON-CAPACITY-ERROR-001] Párhuzamos Supabase-hívások hibáit mindig logold
- **Dátum**: 2026-04-30
- **Fájl**: `src/lib/capacityEngine.ts`
- **Probléma**: A `computeWorkspaceCapacity` a `Promise.all`-ból érkező Supabase válaszokat destrukturáló módon kezelte (`{ data: allocs }`), az `.error` mezőt teljesen figyelmen kívül hagyva. Ha a lekérdezés meghiúsult, `allocs = null` lett, és a kapacitásszámítás némán nulla-eredményt adott vissza.
- **Gyökérok**: A Supabase SDK nem dob kivételt hálózati/RLS hibánál, hanem `{ data: null, error: ... }` formát ad vissza, amit explicit kezelni kell.
- **Javítás**: Minden párhuzamos hívás eredménye `allocsResult / membershipsResult` névvel van szétválasztva, `.error` mező ellenőrzött és konzolra logolt.
- **Megelőzés**: **MINDIG** destrukturáld ki az `.error` mezőt is, ne csak a `.data`-t. Engine-szintű üzleti logikánál egyetlen néma hiba elfedi az egész számítás helytelenségét.

### [LESSON-ADO-UPDATE-001] ADO update előtt ellenőrizd, hogy van-e módosítandó mező
- **Dátum**: 2026-04-30
- **Fájl**: `supabase/functions/jira-devops-proxy/index.ts`
- **Probléma**: Az `adoUpdate` függvény üres `ops = []` tömböt küldhetett Azure DevOps API-nak, ha a payload egyetlen szerkeszthető mezőt sem tartalmazott. Az ADO API üres JSON-patch-et visszautasítja, és félrevezető hibát ad.
- **Gyökérok**: Nem volt guard a `ops` tömb összerakása előtt.
- **Javítás**: `if (ops.length === 0) throw new Error(...)` kerül a `fetch` előtt.
- **Megelőzés**: Bármely patch/update API hívásnál, ahol a payload opcionális mezőkből épül fel, ellenőrizd, hogy legalább egy mező ki van töltve, mielőtt elküldenéd a kérést.

### [LESSON-JIRA-PROJECTKEY-001] sync_project_config ne fusson üres project_key-jel
- **Dátum**: 2026-04-30
- **Fájl**: `supabase/functions/jira-devops-proxy/index.ts`
- **Probléma**: A `jiraSyncProjectConfig` `integ.project_key ?? ''`-vel dolgozott. Ha a project_key nincs kitöltve az integrációs rekordban, az API-hívás üres project key-jel fut le, ami vagy rossz adatot hoz, vagy félrevezető Jira API hibát ad.
- **Gyökérok**: Nem volt korai validáció a project_key meglétére.
- **Javítás**: Explicit `if (!integ.project_key) throw new Error(...)` a függvény elején.
- **Megelőzés**: Minden külső API-hívás előtt validáld az összes kötelező paramétert, ne hagyd a null/empty értéket „csendesen" az API-nak.

---

## ➕ APPEND — 2026-05-09 Demo workspace seeder v8 tanulságok

### [LESSON-SEED-001] Supabase Auth Admin API — közvetlen fetch Deno edge functionban
- **Dátum**: 2026-05-09 (v8 seeder)
- **Fájl**: `supabase/functions/seed-demo-workspace/index.ts`
- **Probléma**: A `@supabase/supabase-js` SDK `auth.admin.createUser()` metódusa nem mindig érhető el megbízhatóan Deno edge function kontextusból — vagy hiányzó header, vagy undefined visszatérési érték, vagy runtime-version-függő viselkedés.
- **Gyökérok**: A Supabase JS SDK service-role auth.admin wrapperje edge function futtatásnál nem feltétlenül küldi el a szükséges `Authorization: Bearer <service_role_key>` headert, ami néma hibát okoz.
- **Javítás**: Közvetlen `fetch` hívás a Supabase REST Admin API-ra: `fetch(\`\${SUPABASE_URL}/auth/v1/admin/users\`, { method: 'POST', headers: { Authorization: \`Bearer \${SERVICE_ROLE_KEY}\`, apikey: SERVICE_ROLE_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })`. Az érkező JSON-ból `resp.json()` kell, és a `id` mező az auth user UUID.
- **Megelőzés**: Ha edge functionből service role-lal kell auth user-t létrehozni, MINDIG közvetlen REST API fetch mintát használj, ne a JS SDK `auth.admin.*` metódusaira bízd. Documéntáld a fejléceket kommentben a kódban.

### [LESSON-SEED-002] PERSONA_ORG_ASSIGNMENTS — adatvezérelt lookup tábla az összes personára
- **Dátum**: 2026-05-09 (v8 seeder)
- **Fájl**: `supabase/functions/seed-demo-workspace/seed-data.ts`
- **Probléma**: A v7-es seeder hardcoded if-else blokkokban csak 7/22 personának rendelt org_unit / manager / leadership_level / contract_type értéket. A maradék 15 tag hiányos org-struktúrával jött létre — SQL-ellenőrzés igazolta: `has_org_unit: 7/23`.
- **Gyökérok**: Személynév-alapú hardcoded hozzárendelés nem skálázható; ha új persona kerül be, a B8 blokkot kézzel kell bővíteni, és könnyen kihagyható valaki.
- **Javítás**: `PERSONA_ORG_ASSIGNMENTS: Record<string, PersonaOrgAssignment>` lookup objektum minden persona `display_name`-jéhez hozzárendeli az `{orgUnit, llCode, contractCode, leadershipCategory, seniority, managerName?}` struktúrát. A B8 seeding blokk egyszerűen iterál minden `demoUserId`-n, megkeresi a display_name-t, majd lookup-ol.
- **Megelőzés**: Összetett hierarchikus adat (org-struktúra, manager-lánc, több mező kombinációja) SOHA ne legyen hardcoded if-else mint — mindig `Record<string, T>` lookup tábla vagy konfigurációs objektum a `seed-data.ts`-ben.

### [LESSON-SEED-003] Min-enforced slice pattern a katalógus insert blokkokban
- **Dátum**: 2026-05-09 (v8 seeder)
- **Fájl**: `supabase/functions/seed-demo-workspace/index.ts`
- **Probléma**: Ha a felhasználó a seed config UI-ban pl. `leadership_levels=1`-et állít be, de a B8 blokk 4 különböző `llCode`-ot próbál feloldani (`strategic`, `operational`, `technical`, `execution`), az FK lookup `undefined`-ot ad vissza, és az UPDATE meghiúsul.
- **Gyökérok**: A seed config mennyiségeket a felhasználó szabadon csökkenthetné, ami letörheti a downstream FK-függőségeket.
- **Javítás**: `DEFS.slice(0, Math.max(MIN_COUNT, seedQty.key))` — a `MIN_COUNT` értékét minden katalógusnál a downstream FK-függőségek alapján kell meghatározni (pl. leadership levels min=4, contract types min=2).
- **Megelőzés**: Ha egy katalógus INSERT blokk más blokkok FK-forrása, MINDIG adj hozzá `Math.max(min, qty)` védelmet a slice-ba. Kommentben dokumentáld a min értéket és a függőség okát.

### [LESSON-SEED-004] Map-alapú FK-feloldás multi-entity seeder blokkokban
- **Dátum**: 2026-05-09 (v8 seeder)
- **Fájl**: `supabase/functions/seed-demo-workspace/index.ts`
- **Probléma**: A katalógus INSERT után UUID-k szükségesek a downstream FK mezőkhöz (`leadership_level_id`, `contract_type_id`, stb.). Iteratív DB lekérdezés minden egyes member-hez O(n) extra round-trip-et jelent.
- **Gyökérok**: Az INSERT eredmény UUID-jai elvesznek, ha nem tároljuk el; a következő blokk már nem tudja FK-ként feloldani őket anélkül, hogy újra lekérdezné.
- **Javítás**: Az INSERT válasz után azonnal Map-et építsünk: `const llByCode = new Map(llRows.map(r => [r.code, r.id]))`. A downstream blokk egyszerűen `llByCode.get(assignment.llCode)` — nulla extra DB round-trip.
- **Megelőzés**: Multi-entity seederben minden katalógus INSERT után AZONNAL építsd fel a `code→UUID` (vagy `name→UUID`) Map-et. A teljes seeder futás O(1) lookup-okkal dolgozzon, ne O(n) extra query-kel. Kövesd ezt a sorrendet: INSERT → `new Map(rows.map(...))` → downstream block uses Map.

### [LESSON-GOVERNANCE-001] entity-creation-inventory.md — governance source of truth az összes seedelt entitáshoz
- **Dátum**: 2026-05-09 (v8 seeder)
- **Fájl**: `.governance/entity-creation-inventory.md`
- **Probléma**: Az új katalógus entity típusok (job families, leadership levels, contract types, industries, work categories) be lettek illesztve a seederbe, de a governance dokumentum nem tükrözte ezt — audit trail hiány, és a következő fejlesztő nem látja, mi van seedelve.
- **Gyökérok**: A fejlesztés a governance dokumentum frissítése nélkül haladt.
- **Javítás**: Az `entity-creation-inventory.md` 2.1–2.5 szekciói frissítve ✅ markerekkel és seed config kulcsokkal.
- **Megelőzés**: Minden új seeded entity type bevezetésekor ELŐSZÖR frissítsd az `entity-creation-inventory.md`-t, MAJD implementáld a seeder kódot. A governance dokumentum a source of truth — a kód azt kövesse, ne fordítva.

---

## ➕ APPEND — 2026-05-09 Auth, routing, branding, katalógus és UI tanulságok (PRs #1–28)

### [LESSON-AUTH-OAUTH-001] Google OAuth URL fragment session restoration
- **Dátum**: 2026-05-04 (PR #1, #2)
- **Fájl**: `src/pages/Auth.tsx`, `src/hooks/useAuth.tsx`, `src/pages/Landing.tsx`
- **Probléma**: Google OAuth visszatérés után a `access_token` és `refresh_token` a `window.location.hash`-ben (`#access_token=...`) érkezett, de az app nem parseolta a hash-t — session nem lett visszaállítva, a UI az `/auth` oldalon fagy.
- **Gyökérok 1**: `Auth.tsx` nem olvasta a `window.location.hash` fragmentet `?oauth=google` esetén.
- **Gyökérok 2**: A `redirectTo: '/auth'` az OAuth provider-nél a Cloudflare Pages-en hard-404-ot okoz, mert az SPA shell nem töltődik be közvetlen navigációnál.
- **Javítás**: (a) Explicit hash-token feldolgozás `Auth.tsx`-ben: `?oauth=google` + nem hydratált user esetén `window.location.hash`-ből kiolvasni az access/refresh token-t, `setSessionFromTokens()` hívás, majd `history.replaceState` a hash törlésére. (b) `redirectTo` átírva `/`-re (mindig kiszolgált). (c) `AuthProvider`-ben centralizált fragment-feloldás app bootstrap-kor. (d) Landing page navigál a `redirect` targetbe miután session + `?oauth=google` detektálva.
- **Megelőzés**: OAuth `redirectTo` SOHA ne mutasson `/auth`-ra SPA-ban — mindig a root `/` az, ami biztosan kiszolgált. Az `#access_token=...` URL fragmentet a kliens oldalon kell kézzel kezelni; `history.replaceState`-tel töröld a feldolgozás után.

### [LESSON-ROUTING-SPA-001] Cloudflare Pages SPA fallback — `_redirects` formátum kritikus
- **Dátum**: 2026-05-04 (PR #6, #7, #8)
- **Fájl**: `public/_redirects`, `public/404.html`, `src/App.tsx`
- **Probléma**: Direkt URL navigáció (`/auth`, `/app?tab=resources` stb.) 404-et adott Cloudflare Pages-en.
- **Gyökérok**: A `_redirects` fájlnak PONTOSAN egyszeri szóközzel kell elválasztani a mezőket: `/*  /index.html  200`. Kettős szóköz vagy tab elvétheti a Cloudflare / Netlify parsert.
- **Háromrétegű megoldás**:
  1. `public/_redirects`: `/*  /index.html  200` (szimpla szóköz formátum)
  2. `public/404.html`: eltárolja a teljes path+query+hash-t `sessionStorage`-ban, átirányít `/?r=...`-re
  3. `src/App.tsx` `SpaRedirectHandler`: `sessionStorage`/`?r=` alapján kliens oldali navigáció
- **Megelőzés**: Új Cloudflare Pages / Netlify SPA deploymentnél MINDIG ellenőrizd a `_redirects` szóköz-formátumát. A `404.html` fallback + `SpaRedirectHandler` páros a legellenállóbb megoldás mert statikus hostoknál is működik.

### [LESSON-ROUTING-SPA-002] URL UUID-mentesítés: workspace ID localStorage-ban, ne URL-ben
- **Dátum**: 2026-05-04 (PR #3)
- **Fájl**: `src/pages/Enterprise.tsx`, `src/App.tsx`, `src/hooks/useAuth.tsx`
- **Probléma**: A `?ws=<uuid>` URL param lehetővé tette a workspace UUID kiszivárgását a böngésző history-ban, megosztott linkekben, analytics toolokban.
- **Gyökérok**: Az aktív workspace azonosítását az URL-re bízta a kód, ahelyett hogy kliens-oldali state-ben tárolná.
- **Javítás**: Workspace feloldási sorrend: (1) `?ws=` egyszer, backward compat → (2) `localStorage.active_workspace_id` → (3) első elérhető workspace. A `?ws=` paraméter `history.replaceState`-tel el lesz távolítva a feloldás után. `/enterprise` backward-compat redirect alias → `/app`.
- **Megelőzés**: Munkamenethez kötött belsős azonosítók (UUID-k, session ID-k) NE kerüljenek az URL-be. Használj `localStorage` vagy `sessionStorage` persistent state-et. Deep-link-ek csak olvasható, nem szenzitív paramétereket tartalmazzanak (pl. `?tab=`).

### [LESSON-SUPABASE-SDK-VERSION-001] Supabase JS verzió kompatibilitás Deno edge function-ökben
- **Dátum**: 2026-05-09 (PR #23)
- **Fájl**: `supabase/functions/seed-demo-workspace/index.ts`
- **Probléma**: Supabase JS `v2.45.0`-val a service role admin client minden insert operációt némán eldobott Deno edge function runtime-ban — sem hiba, sem log, sem beillesztett sor.
- **Gyökérok**: A `v2.45.0` SDK auth layer a Deno runtime-ban nem kezelte megfelelően a service role token-t a schema-szintű insert hívásokban.
- **Javítás**: Upgrade `v2.98.0`-ra (amely a többi működő edge functionben, pl. `create-instant-enterprise-member`, már jelen volt). Explicit auth options: `autoRefreshToken: false, persistSession: false, detectSessionInUrl: false`. Smoke test a startup-ban.
- **Megelőzés**: Edge function SDK verziót MINDIG az összes többi működő edge functionnel egységesítsd. Ha egy edge function néma hibával meghiúsul (no error, no rows), ELŐSZÖR az SDK verziót ellenőrizd — ez a leggyakoribb rejlő ok Deno futtatásnál.

### [LESSON-SELECTITEM-EMPTY-001] Radix UI `SelectItem` üres string `value` crash
- **Dátum**: 2026-05-09 (PR #21)
- **Fájl**: `src/components/enterprise/*` — minden Radix `Select` komponens
- **Probléma**: `<SelectItem value="">` futásidejű hibát dob Radix UI-ban — az üres string mint "nincs kiválasztva" sentinel érték nem támogatott.
- **Gyökérok**: A Radix UI Select component belső logikája az üres stringet érvénytelen értékként kezeli és kivételt dob.
- **Javítás**: Minden `value=""` helyettesítve nem-üres sentinel értékkel (pl. `value="__none__"`, `value="unselected"`).
- **Megelőzés**: Radix UI `Select` és `SelectItem` komponenseknél SOHA ne használj üres string `value`-t. Az "üres / nincs kiválasztva" állapothoz mindig használj nem-üres placeholder értéket, pl. `"__none__"` vagy a domain-specifikus sentinel.

### [LESSON-EMAIL-DIACRITIC-001] Magyar ékezetes karakterek slugify-álása email-generálásban
- **Dátum**: 2026-05-09 (PR #25)
- **Fájl**: `supabase/functions/seed-demo-workspace/index.ts`
- **Probléma**: Magyar nevekből generált email-ek (pl. `"Viktor Mátyás"` → `"viktor.matyas@demo.test"`) ékezetes karaktereket tartalmaztak, amelyek email-validáción elbuknak.
- **Gyökérok**: Közvetlen lowercase + `.replace(' ', '.')` transzformáció az ékezetes betűket megtartja.
- **Javítás**: `slugify()` helper: unicode normalizer (`NFD`) + `/[̀-ͯ]/g` regex strip + alphanum-only szűrő. `"Mátyás"` → `"matyas"`, `"Ádám"` → `"adam"`.
- **Megelőzés**: Névből generált email-eknél, username-eknél, slug-oknál MINDIG alkalmazz diacritic normalizálást. A magyar ábécé problémás karakterek: á→a, é→e, í→i, ó/ö/ő→o, ú/ü/ű→u. Email domain: `.local` helyett `.test` (RFC 2606 szerint a `.test` az ajánlott tesztkörnyezeti TLD).

### [LESSON-CATALOG-RLS-001] Globális katalógus táblák: RLS engedélyezve, de policy nélkül = 0 sor
- **Dátum**: 2026-05-09 (PR #22)
- **Fájl**: `supabase/migrations/` — `enterprise_catalog_categories`, `enterprise_catalog_roles`, `enterprise_catalog_skills`, `enterprise_catalog_role_skills`
- **Probléma**: A globális katalógus táblák RLS-sel lettek létrehozva, de egyetlen SELECT policy sem volt definiálva. Eredmény: minden `authenticated` user lekérdezése 0 sort adott vissza — `PositionPickerDialog` mindig üres volt.
- **Gyökérok**: A migráció hozzáadta az `ENABLE ROW LEVEL SECURITY`-t, de elfelejtette hozzáadni az olvasási policy-t a megosztott (nem workspace-scoped) globális táblákhoz.
- **Javítás**: `CREATE POLICY ... FOR SELECT USING (auth.uid() IS NOT NULL)` minden globális katalógus táblán.
- **Megelőzés**: Ha egy táblán `ENABLE ROW LEVEL SECURITY` szerepel, MINDIG adj hozzá legalább egy olvasási policy-t. Globális, workspace-független adatoknál (`enterprise_catalog_*`) a `authenticated` role számára egyszerű `auth.uid() IS NOT NULL` policy elegendő. Checklist: minden `ENABLE ROW LEVEL SECURITY` mellé kell legalább egy USING feltétel.

### [LESSON-POSITION-SOURCE-001] Pozíció dropdown: mindkét forrás szükséges (legacy + junction tábla)
- **Dátum**: 2026-05-04 (PR #6)
- **Fájl**: `src/components/enterprise/TeamManager.tsx`, `src/components/enterprise/InviteMemberDialog.tsx`
- **Probléma**: A pozíció dropdownok kizárólag az `enterprise_memberships.business_role` (legacy text oszlop) alapján épültek. Az `enterprise_member_role_allocations` junction táblában létrehozott pozíciók láthatatlanok maradtak minden dropdownban.
- **Gyökérok**: A junction tábla volt a kanonikus forrás, de a UI csak a régi denormalizált oszlopot nézte.
- **Javítás**: Mindkét forrás párhuzamos lekérdezése + halmazegyesítés: `[...new Set([...legacyRoles, ...allocationRoles])]`.
- **Megelőzés**: Ha létezik junction tábla bármely N:M kapcsolatra, a UI MINDIG innen olvassa az opciókat — nem a denormalizált legacy oszlopból. Ha backward compat miatt mindkettő létezik, MINDIG mergeld a kettőt.

### [LESSON-ORGCHART-FLATTEN-001] Org fa pre-flattening premium rendererhez
- **Dátum**: 2026-05-09 (PR #28)
- **Fájl**: `src/components/enterprise/organization/OrgChartPremiumView.tsx`
- **Probléma**: Rekurzív fa-renderelés során minden kártya megnyitásakor újra kellett bejárni a fát a manager/gyerek relációk feloldásához — O(n²) komplexitás nagy csapatoknál.
- **Gyökérok**: A fa-struktúra nem volt indexelve, mindig traversal kellett.
- **Javítás**: A render előtt egyszer `flatNodes: Map<string, OrgNode>` map buildek a teljes fából — ezután minden lookup O(1). A drawer adatai (manager neve, közvetlen beosztottak listája) egy `Map.get(id)` hívással elérhetők.
- **Megelőzés**: Bármely fa-alapú UI rendernél (org chart, comment thread, category tree) MINDIG prepare-elj egy `Map<id, node>` flat lookup structure-t a render előtt. A rekurzív traversal csak az initial tree build-hez szükséges, utána minden lookup O(1) legyen.

### [LESSON-THEME-CSS-001] CSS változó token alapú téma rendszer — 6 sablon
- **Dátum**: 2026-05-04 (PR #5)
- **Fájl**: `src/hooks/useTheme.tsx`, `src/styles/themes.css`
- **Probléma**: Komponensekbe kódolt szín- és stílusértékek témaváltást lehetetlenné tesznek, vagy minden egyes komponenst módosítani kell.
- **Gyökérok**: Közvetlenül Tailwind szín-class-ok komponens szinten, nincs CSS változó réteg.
- **Javítás**: `themes.css`-ben CSS változók definiálva minden témához (`enterprise`, `nebula`, `aurora`, `graphite`, `sunrise`, `mono`). `<html>` root osztályváltás (`document.documentElement.classList`) + `localStorage` perzisztencia. Komponensek ugyanazon token neveket használják — csak a gyökerükön definiált értékek változnak.
- **Megelőzés**: Témát igénylő alkalmazásoknál MINDIG CSS változó token réteget vezess be. A komponensek ne hard-coded Tailwind színeket (`bg-purple-600`) használjanak, hanem semantic token osztályokat (`bg-primary`). A témaváltás egyetlen osztálycsere legyen a `<html>` elemen.

---

## ➕ APPEND — 2026-05-09 Versioning fájlokból kinyert mélyebb technikai tanulságok

### [LESSON-JIRA-PROJECTID-001] Jira API: numeric project ID vs. project key — különböző endpointok különbözőt várnak
- **Dátum**: 2026-05-08 (v3.1.1, versioning: 08052601)
- **Fájl**: `supabase/functions/jira-devops-proxy/index.ts`
- **Probléma**: `jiraSyncProjectConfig` a `/rest/api/3/issuetype/project?projectId=SYN` formát használta. Az `issuetype/project` endpoint a `projectId` query paramétereként **numerikus ID-t** vár (pl. `10000`), nem projekt kulcsot (pl. `SYN`) — Jira 500-at dobott.
- **Gyökérok**: A Jira API különböző endpointokon különböző azonosítótípust vár: `projectId` (numerikus) vs. `projectIdOrKey` (mindkettő elfogadott). A project key ≠ project ID.
- **Javítás**: `GET /rest/api/3/project/{projectIdOrKey}` — ez visszaadja a projektet annak `issueTypes` tömbjével együtt. Fallback idősebb tenant-okhoz: `GET /rest/api/3/issue/createmeta?projectKeys={key}`.
- **Megelőzés**: Minden Jira API hívásnál ellenőrizd az endpoint dokumentációját: `projectId` (numerikus) vs. `projectIdOrKey` (string kulcs is elfogadott). Ha nem vagy biztos, a `/project/{projectIdOrKey}` az univerzálisan biztonságos form.

### [LESSON-JIRA-SEARCH-CASCADE-001] Jira search API: háromszintű endpoint cascade a kompatibilitáshoz
- **Dátum**: 2026-05-06 (v3.0.1, versioning: 06052601)
- **Fájl**: `supabase/functions/jira-devops-proxy/index.ts`
- **Probléma**: A Jira Cloud tenant-ok különböző API verziókra vannak, és nem minden tenant válaszol ugyanazon a search endpoint-on. Egyetlen fixen beégetett endpoint 410 Gone vagy üres eredmény hibát adott.
- **Gyökérok**: Az Atlassian a `/rest/api/3/search`-t deprecálta a `/rest/api/3/search/jql` javára, de a migráció tenant-szintű és lépcsőzetes — nem minden tenant frissített.
- **Javítás**: Cascade sorrend: `POST /rest/api/3/search/jql` → `GET /rest/api/3/search/jql` → `GET /rest/api/3/search` (legacy). Az első 2xx válasz nyer.
- **Megelőzés**: Külső SaaS API hívásoknál, ahol a provider fokozatosan deprecál endpointokat, mindig implementálj fallback cascade-et. Ne feltételezd, hogy minden tenant azonos API verziót futtat.

### [LESSON-ADF-PLAINTEXT-001] Jira description Atlassian Document Format (ADF) — plain text konverzió kötelező
- **Dátum**: 2026-05-06 (v3.0.1, versioning: 06052601)
- **Fájl**: `supabase/functions/jira-devops-proxy/index.ts`
- **Probléma**: A Jira `fields.description` mező **nem plain text** — Atlassian Document Format (ADF) JSON objektum érkezik vissza. Közvetlen mentés az `enterprise_agile_issues.description`-be ADF JSON-t tárol, ami az UI-ban megjeleníthetetlen.
- **Gyökérok**: Az ADF a Jira modern rich-text formátuma: `{ "type": "doc", "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "..." }] }] }`. Nem kompatibilis plain text mezőkkel.
- **Javítás**: Rekurzív `adfToText(node)` walker implementáció, amely kezeli: `text`, `paragraph`, `heading`, `bulletList`, `listItem`, `codeBlock`, `inlineCard` node típusokat. Minden egyéb node-ot figyelmen kívül hagy.
- **Megelőzés**: Jira leírás mező feldolgozásakor MINDIG `adfToText()` konverziót alkalmazz. A raw ADF JSON-t SOHA ne mentsd közvetlenül felhasználói felületre szánt szöveges mezőbe.

### [LESSON-DEMO-PERSONA-STRATEGY-001] Demo felhasználók: valódi auth.users + app_metadata tag = legkisebb schema változás
- **Dátum**: 2026-05-08 (v3.1.1, versioning: 08052601)
- **Fájl**: `supabase/functions/seed-demo-workspace/index.ts`
- **Probléma**: Demo munkaterület seedelésekor szükség van valódi felhasználószerű entitásokra (profilok, tagságok, szabadságkérelmek, skill assignmentek) — de anélkül hogy új sémát kellene bevezetni vagy meglévő componenseket módosítani.
- **Gyökérok**: Ha "fake" user ID-kat használsz, az összes meglévő komponens (profil lookup, leave_request user display, member-skill join) meghibásodik vagy nullt ad vissza.
- **Javítás**: Valódi `auth.users` rekordok létrehozása `admin.createUser({ email_confirm: true, app_metadata: { is_demo_persona: true } })` hívással. Az `is_demo_persona: true` app_metadata tag azonosítja a demo usereket a cleanup folyamathoz. Minden meglévő komponens transzparensen működik velük.
- **Megelőzés**: Demo/teszt usereket MINDIG valódi auth.users rekordként hozz létre, `app_metadata.is_demo_persona: true` taggel. Ne vezess be mock user entity típust — ez schema változást és component módosítást igényel. A cleanup a tag alapján azonosítja és törli őket.

### [LESSON-WEBHOOK-HMAC-SKIP-001] Webhook HMAC verifikáció: skip ha nincs secret beállítva (ne fail)
- **Dátum**: 2026-05-07 (v3.2.0, versioning: 07052602)
- **Fájl**: `supabase/functions/help-regenerator/index.ts`
- **Probléma**: Ha a HMAC webhook secret env var nincs beállítva, a strict verify meghiúsítja az összes manuális teszthívást (`curl`) — még fejlesztés/debug közben is.
- **Gyökérok**: A szigorú "ha nincs secret → fail" policy blokkolja a fejlesztési workflow-t és a manuális regenerálást.
- **Javítás**: `if (!GITHUB_RELEASE_WEBHOOK_SECRET) { /* skip verification */ }` — ha a secret nincs beállítva, a verifikáció ki van hagyva. Ha be van állítva, HMAC-SHA256 kötelező.
- **Megelőzés**: Webhook HMAC verifikációnál kövesd ezt a mintát: SECRET_SET → verify (fail ha mismatch), SECRET_NOT_SET → skip (allow). Ez teszi lehetővé a manuális tesztelést secret nélkül, miközben production-ban a webhook biztonságos.

### [LESSON-AI-STRUCTURED-OUTPUT-001] Gemini 2.0 Flash: strukturált JSON output generálás help rendszerhez
- **Dátum**: 2026-05-07 (v3.2.0, versioning: 07052602)
- **Fájl**: `supabase/functions/help-regenerator/index.ts`
- **Probléma**: Az AI-generált help cikkeket konzisztens struktúrában (title, summary, body_md, taxonomy, tags, anchor_id stb.) kell tárolni — szabad szöveges AI output nem parseable.
- **Gyökérok**: Szabad szöveges AI output variábilis formátumot produkál, amely nehezen parseable és megbízhatatlanul illeszkedik a DB sémához.
- **Javítás**: `responseMimeType: "application/json"` + `temperature: 0.3` + strukturált JSON array system prompt. A model `[{ "topic_key": "...", "locale": "en", "title": "...", ... }]` formátumban ad vissza eredményt, amely közvetlenül upsertálható.
- **Megelőzés**: Ha AI-t használsz strukturált adatok generálásához (DB insert, API payload), MINDIG `responseMimeType: "application/json"`-t alkalmazz, és add meg a pontos JSON struktúrát a system promptban. `temperature: 0.3` → konzisztens, alacsony variabilitású output.

### [LESSON-GIT-REBASE-MAIN-FIRST-001] CHANGELOG conflict + verzió-ütközés: mindig sync `origin/main`-nel a munka előtt
- **Dátum**: 2026-05-09 (v3.2.7)
- **Fájl**: `CLAUDE.md`, `.governance/controller.md`, `AI_EXECUTION_PROMPTS.md`
- **Probléma**: A feature branch (`claude/org-chart-menu-development-mQEhU`) ágon `v3.2.5` CHANGELOG bejegyzést írtam, miközben időközben más PR-ek mergelődtek `main`-be és ott már `v3.2.5` (Seeder v8) és `v3.2.6` (Premium Org Chart) verziók voltak. Ezért a PR mergelhetetlen lett: két `v3.2.5` szakasz ütközött a CHANGELOG.md tetején.
- **Gyökérok**: A munka megkezdése előtt nem futtattam `git fetch origin main && git rebase origin/main`-t, így nem láttam, hogy a verziószámaim már foglaltak. Emellett a CHANGELOG bejegyzés írásakor sem ellenőriztem újra a `main` aktuális tetejét.
- **Javítás**: Branch `--hard reset`-elve `origin/main`-re (a redundáns commit eldobva, mert a kódváltozások már main-ben voltak egy korábbi merge-ből). Új CHANGELOG bejegyzés **csak az új RLS hardening tartalommal**, a következő szabad verziószámon (`v3.2.7`).
- **Megelőzés**:
  1. **Minden session elején**: `git fetch origin main && git rebase origin/main` (vagy `git pull --rebase origin main`)
  2. **Minden CHANGELOG.md edit előtt MÉG EGYSZER**: re-fetch + re-rebase, hogy biztosan a legfrissebb `main`-ről indulj
  3. **Verziószám választás**: olvasd el a `CHANGELOG.md` aktuális tetejét `origin/main`-en (`git show origin/main:CHANGELOG.md | head -3`) és a következő SZABAD verziót használd
  4. **Soha ne tételezd fel**, hogy a saját branched egy verzió-számot lefoglalhat — más PR-ek párhuzamosan haladhatnak

---

## ➕ APPEND — 2026-05-09 GiGanttIc flagship Gantt board (v3.3.0)

### [LESSON-GANTT-STICKY-001] Single-container sticky scroll: no JS needed for synced Gantt axes
- **Dátum**: 2026-05-09 (v3.3.0)
- **Fájl**: `src/components/enterprise/agile/GiGanttIcBoard.tsx`
- **Probléma**: A classic two-panel Gantt (left grid + right chart) requires synchronized vertical scroll (left follows right) and synchronized horizontal scroll (header follows chart). JS-based scroll sync via `onScroll` + `ref.scrollLeft =` is fragile and causes visual lag/jitter.
- **Javítás**: Single `overflow: auto` container holding the full content width (`LEFT_W + chartWidth`). Left task cells use `position: sticky; left: 0; z-index: 10` — they stay pinned during horizontal scroll. Timeline header uses `position: sticky; top: 0; z-index: 20` — it stays pinned during vertical scroll. The top-left intersection cell uses `position: sticky; top: 0; left: 0; z-index: 30`. All rows scroll together naturally.
- **Megelőzés**: For any split-pane board (Gantt, spreadsheet, timeline), prefer this single-container sticky approach over dual-container JS scroll sync. Requirements: (1) inner content `width = leftW + chartW`, (2) left cells sticky-left, (3) header row sticky-top, (4) both cells carry a solid background color so scrolled content doesn't bleed through.

### [LESSON-GANTT-SVG-OVERLAY-001] Absolute SVG overlay for cross-row dependency lines
- **Dátum**: 2026-05-09 (v3.3.0)
- **Fájl**: `src/components/enterprise/agile/GiGanttIcBoard.tsx`
- **Probléma**: Dependency lines in a Gantt connect rows at different vertical positions. Rendering them per-row (one SVG per row div) can't span across rows. Using `position: fixed` won't scroll with the content.
- **Javítás**: Place a single SVG with `position: absolute; left: LEFT_W; top: 0; pointer-events: none; z-index: 6` inside the rows wrapper div. The SVG is `width = chartWidth; height = totalRows * ROW_H`. Since it's inside the single scroll container (not fixed), it scrolls naturally with the content. Row y-positions are computed as `rowIndex * ROW_H + BAR_Y + BAR_H/2`.
- **Megelőzés**: Any overlay spanning multiple rows (dependency lines, highlight bands, today marker) should be an absolutely positioned SVG/div inside the scroll container — NOT position:fixed, NOT one element per row.

### [LESSON-GANTT-CYCLE-GUARD-001] Dependency cycle prevention with recursive CTE BFS
- **Dátum**: 2026-05-09 (v3.3.0)
- **Fájl**: `supabase/migrations/20260509030000_giganttIc_scheduling_fields.sql`
- **Probléma**: Allowing circular dependencies in a Gantt breaks topological sort, critical path computation, and can cause infinite loops in rendering logic.
- **Javítás**: `ganttIc_has_dependency_cycle(workspace, integration, predecessor, successor)` PL/pgSQL function uses a `WITH RECURSIVE reachable AS (...)` CTE BFS starting from `successor`, checking if `predecessor` is reachable. If yes → cycle detected → return true → caller blocks the INSERT.
- **Megelőzés**: Any scheduling system with dependency edges MUST implement cycle detection before INSERT. The recursive CTE BFS in PostgreSQL is the idiomatic, set-based approach — avoid application-side graph traversal for this guard (it races with concurrent writes). Use SECURITY DEFINER + `SET search_path` to prevent injection.

### [LESSON-GANTT-BRANDING-001] Premium flagship tab: teal accent + data-[state=active] class for branded active state
- **Dátum**: 2026-05-09 (v3.3.0)
- **Fájl**: `src/components/enterprise/agile/AgileBoards.tsx`
- **Probléma**: Standard Radix `TabsTrigger` active state uses the theme's default ring/underline, which looks identical to other tabs — no visual hierarchy for flagship features.
- **Javítás**: Add `data-[state=active]:bg-teal-500/15 data-[state=active]:text-teal-300 data-[state=active]:border-teal-500/30` to the flagship tab's className. Inside the trigger, use span elements with alternating color classes (`text-teal-400` for "Gi" and italic "Ic", neutral for "Gantt") to create a branded typographic treatment. A `Sparkles` icon preceding the text signals premium status.
- **Megelőzés**: For any flagship or premium-tier tab/nav item, use `data-[state=active]` variant classes to apply custom active styling without overriding the global tab component. Branded typography (colored portions of a product name) is more tasteful than heavy badges — use it for feature-level identity.

### [LESSON-GANTT-PROGRESS-001] Multi-source progress: hours → status fallback → manual override
- **Dátum**: 2026-05-09 (v3.3.0)
- **Fájl**: `src/components/enterprise/agile/GiGanttIcBoard.tsx`
- **Probléma**: Agile issues may have progress data from multiple sources with inconsistent coverage: some have `completed_hours/original_estimate_hours`, some only have `status`, some have neither.
- **Javítás**: Priority cascade: (1) status = Done/Closed → 100%, (2) `completed_hours` + `original_estimate_hours` both present → ratio (clamped 0–1), (3) `In Review` → 65%, `In Progress` → 40%, (4) else 0. The new `progress_pct` DB column (added in migration) provides a manual override path for future use.
- **Megelőzés**: Any progress/completion indicator in a planning tool should implement a multi-source cascade like this. Never assume a single field will always be populated — use the richest available signal with graceful fallbacks.

### [LESSON-ROUTING-HASH-001] Static host + React Router: a hash routing az egyetlen biztos „örök” refresh-safe megoldás
- **Dátum**: 2026-05-09
- **Fájl**: `src/App.tsx`, `src/pages/Auth.tsx`, `src/hooks/useAuth.tsx`, `src/components/enterprise/InviteMemberDialog.tsx`
- **Probléma**: Published környezetben a `/app?tab=organization` és más belső útvonalak frissítéskor vagy közvetlen megnyitáskor időnként nyers szerveroldali `Not Found` választ adtak, tehát az app shell el sem indult.
- **Gyökérok**: A `BrowserRouter` arra épít, hogy a host minden belső route-ra az SPA entrypointot szolgálja ki. Ha a hosting réteg vagy a preview/publish infrastruktúra ezt csak részben vagy intermittensen teszi meg, a kliensoldali router már nem tud helyreállni, mert a böngésző még az app betöltése előtt 404-et kap.
- **Javítás**:
  1. `BrowserRouter` → `HashRouter`, így a szerver mindig csak a `/` oldalt kapja meg.
  2. Minden auth callback URL hash-alapú lett (`/#/auth?...`, `/#/reset-password`).
  3. A query-param olvasást a router aktuális `location.search` értékére kell kötni, nem a `window.location.search`-re, mert hash-routernél a keresőparaméterek a hash-részben élnek.
  4. Meghívó- és email-linkeknél is hash-alapú belső linket kell generálni, különben a felhasználó ismét szerveroldali 404-re eshet.
- **Megelőzés**: Ha egy React Router app static/published hoston **akár csak egyszer is** intermittens refresh-404-ot produkál belső route-okon, ne told tovább rewrite/404 fallback hackekkel. A tartós megoldás: `HashRouter`, és minden külső callback / email / OAuth redirect URL-t ehhez kell igazítani.

### [LESSON-ORGCHART-PANZOOM-001] CSS transform for diagram pan/zoom — single state, no scroll container
- **Dátum**: 2026-05-09 (v3.3.1)
- **Fájl**: `src/components/enterprise/organization/OrgChartPremiumView.tsx`
- **Probléma**: An org chart with hundreds of nodes can't be scrolled with `overflow: auto` alone — the diagram is too wide/tall for a fixed viewport. Adding drag/zoom requires either a complex scrollable canvas or a transform layer.
- **Javítás**: Use `overflow: hidden` on the outer container + an absolutely positioned inner div with `transform: translate(${offsetX}px, ${offsetY}px) scale(${scale})`. Pan state `(offsetX, offsetY)` updated in `onMouseMove`; zoom `scale` updated in `onWheel` / button clicks. This entirely avoids scroll infrastructure and gives pixel-perfect control.
- **Megelőzés**: For diagrams (org charts, flowcharts, mind maps), prefer a `transform`-based pan/zoom over scroll containers — it supports infinite canvas semantics and allows zoom-in-place via `transform-origin`.

### [LESSON-ORGCHART-DRAG-CLICK-001] Distinguishing drag vs click with a pixel threshold + capture-phase stop
- **Dátum**: 2026-05-09 (v3.3.1)
- **Fájl**: `src/components/enterprise/organization/OrgChartPremiumView.tsx`
- **Probléma**: When the user finishes a pan drag, the `mouseup` event fires and immediately triggers the card's `onClick` handler — unintentionally opening the employee drawer.
- **Javítás**: Track `hasDragged` ref (`useRef(false)`). In `onMouseMove`, set `hasDragged.current = true` only once the total displacement from `dragStart` exceeds `DRAG_THRESHOLD` (6 px). In a capture-phase `onClickCapture` handler on the container, call `e.stopPropagation()` and reset `hasDragged` if it was true — the card's bubbled click never fires.
- **Megelőzés**: Any draggable canvas with clickable children MUST use capture-phase interception to block click after drag. The 6 px threshold prevents false drag detection from accidental mouse jitter.

### [LESSON-ORGCHART-POPUP-001] Near-fullscreen popup via Radix Dialog + containerHeight prop
- **Dátum**: 2026-05-09 (v3.3.1)
- **Fájl**: `src/components/enterprise/organization/OrgChart.tsx`
- **Probléma**: The inline org chart view is constrained to 520 px height. Users need a way to see the full hierarchy without leaving the page.
- **Javítás**: Add `containerHeight?: string` prop (default `'520px'`) to `OrgChartPremiumView`. In `OrgChart`, add a `Maximize2` button (visible only in premium view) that opens a Radix `Dialog` (`max-w-[95vw]`). Inside the dialog, render `<OrgChartPremiumView ... containerHeight=”calc(90vh - 80px)” />` — same data, same functionality, but 90 % of the viewport height. The dialog overlay handles close on backdrop click.
- **Megelőzés**: For any complex visualization (charts, diagrams, boards), design a `containerHeight` escape hatch from the start. Reusing the existing component inside a Dialog is zero-duplication fullscreen — no separate “fullscreen component” needed.

### [LESSON-TIMELINE-INFINITE-LOOP-001] Inline callback prop → végtelen React újrarenderelés + skeleton freeze
- **Dátum**: 2026-05-09 (v3.3.3)
- **Fájl**: `src/components/enterprise/WorkspaceDashboard.tsx`, `src/components/enterprise/calendar/TimelineView.tsx`
- **Hibaüzenet**: "Maximum update depth exceeded" (React, runtime); UI: az Idővonal örökre skeleton állapotban marad.
- **Gyökérok**: `WorkspaceDashboard` JSX-ben inline arrow fn volt az `onFilteredUsersChange` propba: `(userIds, range) => setTimelineReport(...)`. Minden szülő-render új fn referenciát adott. `TimelineView`-ban `useEffect([..., onFilteredUsersChange])` ezt a referenciát dep-ként figyelte → effect újrafut → `setTimelineReport` → szülő újrarendel → új fn → loop → ~50 iteráció után React kidobja a hibát → az összetevő megfagy, `setLoading(false)` sohasem hívódik meg → skeleton.
- **Javítás**:
  1. **Szülőben**: `useCallback(() => setTimelineReport(...), [])` — stabil referencia, mert `setTimelineReport` (useState setter) maga is stabil.
  2. **Gyermekben**: `useRef` pattern a callbackre: külön mellékhatás frissíti `ref.current = prop`; a notify-effect `ref.current?.()`-t hív, és **nem** sorolja fel a prop-ot a dep-tömbben. Guard: `if (loading || members.length === 0) return` — megakadályozza a korai (üres adattal való) tüzelést mount után.
- **Megelőzés**: Ha egy gyermek-komponens szülőnek `callback` propot hív `useEffect`-ből, a propot SOHA ne listázd a dep-tömbben közvetlenül — ez garantált végtelen loop, ha a szülő inline-ban adja át. Mindig: `useCallback` a szülőben VAGY `useRef`-es indirection a gyermekben (mindkettő), soha egyik sem önmagában nem elégséges, ha a szülő nem stabilan adja át.

### [LESSON-TIMELINE-FETCH-001] Promise.allSettled + debounce a hónapváltás "Failed to fetch" bug ellen
- **Dátum**: 2026-05-09 (v3.3.2)
- **Fájl**: `src/components/enterprise/calendar/TimelineView.tsx`
- **Probléma**: Az Idővonal nézet `Promise.all`-ba csomagolt 7 párhuzamos Supabase queryt. Gyors hónapváltásnál egyszerre futó kérések terhelték a kapcsolatot (vagy a böngésző abortálta a régi kéréseket), ami "TypeError: Failed to fetch" hibát okozott még az aktuális kérésnél is.
- **Javítás**:
  1. `Promise.all` → `Promise.allSettled` + `toRes()` helper: nem-kritikus queryek (leaves, holidays, skills) hálózati hibán is üres tömbbel degradálnak, nem dobnak.
  2. 250 ms debounce a `useEffect`-ben: `loadTimerRef`-ből futtató `setTimeout(load, 250)` — gyors navigálásnál csak az utolsó klikk indít tényleges hálózati kérést.
- **Megelőzés**: Bármelyik nézetben, ahol hónapváltás → új lekérdezés, mindig debounce-old a triggert (250–300 ms) és használj `allSettled`-et a resilience miatt. Soha ne feltételezd, hogy párhuzamos `Promise.all` stabil — különösen Supabase pooler limites környezetben.

---

## [LESSON-REDESIGN-SHELL-001] Adaptive shell + density tokens (Phase 1)

**Context:** A teljes app eddig `max-w-5xl mx-auto` köré szorult — ultrawide
(1536px+) képernyőn üres oldalsávok, density tablet és 4K-n is azonos. A
redesign Phase 1 bevezeti a shell és density rendszert úgy, hogy a meglévő
`WorkspaceDashboard` (1076 sor) **érintetlen marad** — zero regresszió.

**Új architektúra:**
- `src/styles/density.css` — három density tier (`compact` / `comfortable` /
  `expansive`) + `auto` (viewport-alapú). Tokenek: `--density-row-h`,
  `--density-pad-x/y`, `--density-gap`, `--density-card-pad`,
  `--density-section-gap`, `--density-page-pad-x/y`. A `<html data-density>`
  attribútum felülírja a media query-ket.
- `src/hooks/useDensity.tsx` — `DensityProvider` + `useDensity()`. Munkaterület
  scope-olt preferencia (`effectime.density.ws.<id>` localStorage), fallback
  globális (`effectime.density`), végül `auto`. **Soha nem `auto`-t alkalmaz**
  a DOM-ra — mindig feloldja viewportból.
- `src/components/shell/AppShell.tsx` — root layout primitív. Soha nem ad
  `max-width`-et a `<main>`-re. `SkipToContent` a11y-hez.
- `src/components/shell/PageHeader.tsx` — title + description + crumbs +
  actions, density-token alapú padding.
- `src/components/shell/DensityToggle.tsx` — fejlécbe ágyazható toggle 4
  opcióval (Auto/Tömör/Kényelmes/Tágas).

**Use-on-page:**
- `Enterprise.tsx` workspace picker átállt: full-bleed grid (`shell-grid-bento`
  → 1/2/3/4/5 col 640/1024/1536/1920px-en), modern kártyák gradient ikon
  badge-dzsel, billentyűzettel navigálható (Enter/Space).
- `Landing.tsx` — full-bleed hero `clamp()` típusskálával, feature grid 4
  oszlopra megy 2xl-en, benefit szekció 1400px-ig nyúlik ultrawide-on.
- `App.tsx` — `<DensityProvider>` a gyökér szinten.

**KRITIKUS REGRESSZIÓ-VÉDELEM:**
1. `WorkspaceDashboard.tsx` **nem módosult** — minden tab content, integráció,
   Supabase query, RLS hívás, edge function, audit log érintetlen.
2. URL search params (`?tab=`, `?ws=`, `?invite=`, `?select=1`) viselkedése
   bit-pontosan megegyezik az eredetivel.
3. Auth flow (HashRouter, OAuth callback, invite token, password reset)
   érintetlen.
4. A density tokenek **csak akkor hatnak** ha egy komponens explicit
   `var(--density-*)`-ot használ. A meglévő tailwind paddingek (`p-4`, stb.)
   változatlanul működnek — semmi nem törik attól, hogy a `data-density`
   attribútum megjelenik a `<html>`-en.

**Phase 2 előkészítve:** a shell komponensek készek arra, hogy a
`WorkspaceDashboard` belsejét körülöleljék — modul-szintű sidebar nav (ami
ugyanazt a `?tab=` paramétert hajtja, így zero state-loss), TopBar az
értesítésekkel/profil menüvel, és a bento grid widgetekkel a dashboard
áttekintő nézethez.

---

## [LESSON-REDESIGN-SHELL-002] Persistent collapsible sidebar a workspace nézethez (zero functional regression)

**Dátum:** 2026-05-09  
**Kontextus:** A teljes Effectime Enterprise redesign Phase 2 — a horizontális, túlcsorduló tab-csík lecserélése egy összecsukható oldalsávra a /app munkaterület-nézetben, miközben minden meglévő tab-érték (members, organization, calendar, requests, workflows, resources, reports-audit, settings) változatlanul működik.

### Probléma
- A WorkspaceDashboard 1076 soros monolit; a tabok URL paraméteren keresztül vezéreltek (?tab=...).
- A horizontális TabsList kis viewporton túlcsordul, és nem skálázódik ultrawide-ra (max-w-5xl mx-auto).
- Funkcionalitás-regresszió tilos: a Tabs/TabsContent kontraktnak változatlanul kell maradnia.

### Megoldás (minimálisan invazív)
1. Új `src/components/shell/WorkspaceSidebar.tsx`: shadcn `Sidebar collapsible="icon"` — kapja az `activeTab`-ot és `onTabChange`-t props-ként, plus per-permission visible flageket. Csak `setActiveTab(value)`-t hív, semmilyen Tabs-belső API-hoz nem nyúl.
2. WorkspaceDashboard outer wrapper: `<SidebarProvider><WorkspaceSidebar/><SidebarInset>…</SidebarInset></SidebarProvider>`. A header SidebarTrigger-rel kibővítve, max-w-5xl korlát eltávolítva, full-bleed padding density tokenből (`--shell-pad-x`/`--shell-pad-y` fallback 1rem).
3. A régi horizontális TabsList nem törölve, hanem `className="sr-only"` — Radix Tabs továbbra is megtalálja a triggereket, screen reader/keyboard-flow megmarad, vizuálisan a sidebar veszi át.
4. DensityToggle bekerült a workspace headerbe `workspaceId` propszal — workspace-onként mentett preferencia (`effectime.density.ws.<id>` localStorage), auto fallback a viewportra.

### Tanulság
- **Sose töröld a meglévő Tabs-triggereket**, ha külső navigációval cseréled le őket — `sr-only`-vel rejtsd el; így a Radix value-mapping és a billentyűzet-flow változatlan, nincs regresszió.
- A shadcn `Sidebar` `collapsible="icon"` mód mind desktopon, mind tableten egyaránt használható; mobilra `offcanvas` automatikusan érvényesül a komponens belső breakpointja miatt — nem kell külön mobile drawer.
- A sidebar gyökérblokk **kötelezően** `<div className="min-h-screen flex w-full">` — `w-full` nélkül a Tailwind 4 + sidebar layout összeomlik (ld. tailwind4-sidebar-width-fix).
- Ne nest-elj `<main>` elemeket: `SidebarInset` már main; a belső skip-target div legyen `id="main-content"`.


### [LESSON-REDESIGN-SHELL-003] Rules of Hooks — useState above early returns
A workspace-picker `useState('')` került a `if (selectedWorkspaceId) return <WorkspaceDashboard/>` early return UTÁN. Amikor a felhasználó belépett egy workspace-be (early return aktív), a hook nem futott le; visszanavigáláskor lefutott — eltérő hook-szám → React production error #300 (Too many re-renders / hook mismatch), teljes app-blank.
**Szabály:** minden useState/useEffect/useMemo HÍVÁS a komponens TETEJÉN, BÁRMILYEN feltételes return ELŐTT, kivétel nélkül. Új state-et SOHA ne tegyél conditional return alá.

---

### [HIBA-076] Demo seed schema drift — kötelező leave mezők + megszűnt seed oszlopok 500-as hibát okoztak
- **Dátum**: 2026-05-10
- **Fájl**: `supabase/functions/seed-demo-workspace/index.ts`, `supabase/functions/seed-demo-workspace/seed-data.ts`
- **Hibaüzenet**: `null value in column "is_half_day" of relation "leave_requests" violates not-null constraint`, plus schema-cache figyelmeztetések a nem létező `enterprise_daily_rules.is_active` és `enterprise_job_families.sort_order` mezőkre.
- **Gyökérok**: A demo seed részben régi DB-sémát követett. A szabadságkérelmek egy részénél a jelenlegi kötelező mezők nem lettek explicit kitöltve, miközben egyes seed definíciók még olyan oszlopokat is tartalmaztak, amelyek már nem léteznek az aktuális táblákban.
- **Javítás**: A `leave_requests` seed minden rekordja normalizálva lett (`is_half_day`, `half_day_period`, `is_private`, `cancellation_reason`), a daily rule és job family seed-definíciókból pedig kikerültek a megszűnt mezők.
- **Megelőzés**: Demo / edge seed módosítás előtt **mindig** a jelenlegi `src/integrations/supabase/types.ts` Insert-sémát vagy az aktuális migrációkat kell forrásigazságnak tekinteni; a seed-manifestben tilos legacy mezőt bent hagyni.

---

### [LESSON-EXPORT-086] Supabase profiles táblában nincs email oszlop — SECURITY DEFINER RPC a megoldás
- **Dátum**: 2026-05-10
- **Fájl**: `src/components/enterprise/import-export/utils/data-fetcher.ts`
- **Gyökérok**: A Supabase `profiles` (public schema) táblának nincs `email` oszlopa. Az auth email kizárólag `auth.users.email`-ben él, amit az anon key frontend kliens nem érhet el direktben.
- **Javítás**: `SECURITY DEFINER` PostgreSQL függvények: `get_workspace_members_for_export` és `get_workspace_leave_for_export` — ezek `auth.users`-hez csatlakoznak, de csak `has_enterprise_role` ellenőrzés után futnak le. A frontend `supabase.rpc()` hívással éri el őket.
- **Megelőzés**: Ha bármilyen exporthoz/listázáshoz user email kell, SOHA ne próbáld `profiles.email`-ből olvasni — mindig SECURITY DEFINER függvényt írj, amely `auth.users`-t joinol.

### [LESSON-EXPORT-087] Edge Function: profiles.email import-hoz szintén nem létezik — get_user_ids_by_emails RPC
- **Dátum**: 2026-05-10
- **Fájl**: `supabase/functions/import-entity-data/index.ts`
- **Gyökérok**: Az Edge Function service role klienssel is hiába queryczi `profiles.select('user_id, email')` — az oszlop egyszerűen nem létezik, üres eredményt ad.
- **Javítás**: Új `get_user_ids_by_emails(p_emails text[])` SECURITY DEFINER függvény, amelyet az Edge Function `serviceClient.rpc()`-vel hív. Ez `auth.users`-ből `ANY(p_emails)` szűréssel adja vissza a user_id↔email párokat.
- **Megelőzés**: Import flow-ban email → user_id feloldásnál mindig a `get_user_ids_by_emails` RPC-t használd.

### [LESSON-EXPORT-088] has_enterprise_role paraméternevei: _ prefix (nem p_ prefix)
- **Dátum**: 2026-05-10
- **Fájl**: `supabase/functions/import-entity-data/index.ts`
- **Gyökérok**: A `has_enterprise_role` függvény paraméterei: `_workspace_id`, `_user_id`, `_roles` (underscore prefix). A v3.5.1 Edge Function tévesen `p_workspace_id`, `p_user_id`, `p_roles` névvel hívta.
- **Javítás**: `_workspace_id`, `_user_id`, `_roles` névvel hívva.
- **Megelőzés**: Ismeretlen RPC hívás előtt mindig ellenőrizd a függvény szignaturát: `SELECT pg_get_function_arguments(oid) FROM pg_proc WHERE proname = 'function_name'`.

### [LESSON-FLEX-089] Tailwind truncate + flex-1 testvér: min-w-0 a szülőre kötelező
- **Dátum**: 2026-05-10
- **Fájl**: `src/components/enterprise/MemberExtendedDetails.tsx`
- **Tünet**: Egy Jira-jegy sor utolsó eleme (külső link ikon) levágva a kártya jobb szélén — pedig a sor `flex items-center` és a középső span `flex-1 truncate`, a többi `shrink-0`.
- **Gyökérok**: A flex container alapértelmezett `min-width: auto`-val nem zsugorítja le az tartalmát a `max-content` alá. A `truncate` szülőjének is kell `min-w-0` — különben a `flex-1` span megtartja a teljes szöveg szélességét, és a `shrink-0` testvér elemek a szülő bounding box-án kívül renderelődnek.
- **Javítás**: `min-w-0` hozzáadva a sor `<div>`-re ÉS a `<span>`-re (mindkettő szükséges többszintű flex esetén).
- **Megelőzés**: Bármikor amikor `truncate flex-1`-t teszel egy flex item-re, a szülő flex container-nek MINDIG kell `min-w-0` — így a shrink-0 testvérek nem fognak túlfolyni.

### [LESSON-RPC-090] Komplex calc engine: server SECURITY DEFINER + client mirror
- **Dátum**: 2026-05-10
- **Fájl**: `supabase/migrations/.._create_time_attendance_rpcs.sql`, `src/components/enterprise/time-attendance/calculations.ts`
- **Probléma**: Egy bonyolult bér-számítómotor (regular/overtime/weekend OT/night/standby×0.20/intervention/leave-adjusted) dolgozhat-e csak kliens-oldalon? Nem — az export bizonyítható-helyesnek kell lennie és nem szabad UI állapotból következtetni.
- **Megoldás**: Hiteles számítás SQL függvényben (`attendance_recompute_totals`) ami a periódus minden mutációja után fut és cache-eli az eredményt jsonb-ben. A kliens (`previewTotals`) 1:1 tükrözi ezt a logikát az UX preview-hoz, és 18 unit teszt szigorúan pin-eli a két oldal egyenlőségét.
- **Megelőzés**: Bármilyen pénzügyi vagy bér-releváns számítás server-side hiteles legyen, a kliens-oldali változat csak preview. Mindkét oldalt fedjük le egyszerű unit tesztekkel.

### [LESSON-AUDIT-091] Append-only audit: csak SELECT policy + SECURITY DEFINER írás
- **Dátum**: 2026-05-10
- **Fájl**: `supabase/migrations/.._create_time_attendance_module.sql`
- **Megoldás**: `enterprise_attendance_audit` táblának CSAK egy SELECT policy van. Nincs INSERT/UPDATE/DELETE policy, így anon és authenticated szerepkör nem tud közvetlenül írni. Az írás minden mutáció során a `SECURITY DEFINER` RPC-kből történik (pl. `attendance_upsert_segment` `INSERT INTO enterprise_attendance_audit`-tal zár).
- **Megelőzés**: Audit / immutable history tábláknál mindig vegyük figyelembe — RLS nincs INSERT policy = nincs direkt írás, kontrollált audit-emit a hivatalos RPC-kből.

### [LESSON-DUAL-SOURCE-092] Forward-compatible field-ek a jövőbeli integrációkhoz
- **Dátum**: 2026-05-10
- **Fájl**: `enterprise_attendance_segments` séma
- **Logika**: A v1 csak manuális idő-rögzítést szállít, de a `source text DEFAULT 'manual'` és `device_event_id uuid` oszlopok már a sémában vannak. Amikor a jövőben hardver-alapú attendance esemény ingestion bekerül, csak egy új `enterprise_attendance_device_events` tábla és egy új edge function kell — sem séma-migrációra, sem UI átalakításra nincs szükség.
- **Megelőzés**: Ha tudjuk hogy a v2 új írási forrást fog hozzáadni, már a v1 sémájában legyen ott a `source` flag és FK-helyek. Az alábbi belső költség ezt később már nehéz hozzáadni törés nélkül.

### [LESSON-WF-093] HR workflow engine: pre-built template bank + runtime instance pattern
- **Dátum**: 2026-05-11
- **Fájl**: `src/components/enterprise/workflows/HRWorkflowTemplates.tsx`, `supabase/migrations/20260511000001_create_hr_workflows.sql`
- **Logika**: HR folyamatsablonok (orvosi vizsgálat, előleg-igény, szerződésmódosítás stb.) a DB-ben tárolva (`enterprise_hr_workflow_templates` + `steps` jsonb tömb), fut-time instance-ok az `enterprise_hr_workflow_instances` táblában. Az admin "6 alapértelmezett betöltése" gombbal egyszer feltölti a sablonokat, utána folyamatokat indít belőlük. A template `steps[]` tömbből az `hr_workflow_create_instance` SECURITY DEFINER RPC automatikusan létrehozza a `enterprise_hr_workflow_tasks` sorokat `due_date = instance.due_date + offset_days` logikával.
- **Megelőzés**: Komplex workflow engine esetén válaszd el: (1) sablonok (statikus definíciók), (2) instance-ok (futó folyamatok), (3) feladatok (lépések). Ez biztosítja a visszakereshetőséget és az auditálhatóságot.

### [LESSON-SELFSERVICE-094] Employee Self-Service portal: aggregált view meglévő táblákból, új UI entrypoint
- **Dátum**: 2026-05-11
- **Fájl**: `src/components/enterprise/self-service/EmployeeDashboard.tsx`
- **Logika**: Az "Önkiszolgáló portál" (Saját portál tab) nem igényel új DB táblákat — a meglévő `enterprise_attendance_periods`, `enterprise_leave_quota_balances`, `leave_requests`, `enterprise_hr_workflow_tasks` lekérdezések összerakva adják a komplett employee dashboard-ot. Kulcs: `membership_id` alapján szűr, ami az aktuális user saját membershipje a workspaceben.
- **Megelőzés**: Új "összesítő" dashboardhoz elsőként nézd meg, hogy a szükséges adatok már megvannak-e különálló táblákban — nagy valószínűséggel igen, és csak egy aggregáló UI kell hozzá.

### [LESSON-DRAGSELECT-095] Drag-select naptár cellákon: pointer events + data-attribute + elementFromPoint
- **Dátum**: 2026-05-11
- **Fájl**: `src/components/enterprise/time-attendance/EmployeeMonthView.tsx`
- **Probléma**: A felhasználó egér-húzással vagy érintéssel akar több naptárcellát kijelölni (Mac trackpad lasso-szerűen). A naïv `onMouseEnter` megoldás nem működik mobilon (nincs hover).
- **Megoldás**: Pointer events (`onPointerDown`/`onPointerUp` a cellára, `onPointerMove` a gridre), minden cella `data-day-cell data-date={key}` attribútummal. Touch-on érintés alatt `document.elementFromPoint(e.clientX, e.clientY).closest('[data-day-cell]')` adja vissza az aktuális cellát. A `useRef` tárolja a drag állapotot (active, hovered Set, moved flag, pointerId) hogy ne triggereljen re-rendert minden pointer-move-on. `touch-action: none` a gridre amíg edit mode aktív, különben a mobil scroll-jitter zavarja a húzást. Globális `pointercancel` listener resetolja az állapotot.
- **Kulcs UX szabály**: Single click (no movement) → per-day editor; drag (moved=true, hovered.length > 1) → batch dialog `[min, max]`-szal pre-populated.
- **Megelőzés**: Bármilyen drag-to-select naptáron / gridre — soha ne csak `onMouseEnter`-rel oldd meg (mobil halott). Pointer events + data-attribute + elementFromPoint a kompatibilis recept.

### [LESSON-EDITMODE-096] Explicit edit-mode gate komoly mutációkhoz: véletlen szerkesztés elkerülése
- **Dátum**: 2026-05-11
- **Fájl**: `src/components/enterprise/time-attendance/EmployeeMonthView.tsx`
- **Probléma**: Időnyilvántartás közvetlenül kattintható volt — egy véletlen tap is megnyitotta a napi szerkesztőt. A user nem kapott egyértelmű "kész vagyok" commit pontot, ami megkülönböztette volna a piszkozati változásokat a hivatalos benyújtástól.
- **Megoldás**: `editMode` UI-state (default `false`). „Szerkesztés" ceruza gomb → `setEditMode(true)` → sárga „Szerkesztésre megnyitva" badge + helper banner. Cellák `cursor: pointer` és reagálnak. „Módosítások mentése" save ikonra → `setEditMode(false)`. A „Benyújtás" gomb egy SEPARATE záró művelet (server-side state transition). A two-tier gate: server-side `period.status` (állapotgép) + client-side `editMode` flag. Ha bármelyik nem engedélyez, a UI nem szerkeszthető.
- **Megelőzés**: Bármilyen formanyomtatvány / time-tracker / pénzügyi modul, ahol az adatok módosítása következményekkel jár — explicit „edit / save / submit" three-stage flow, nem one-click direct mutation. A user mindig tudja, hogy most miben van.

## ➕ APPEND — 2026-05-14 v3.33.1 stabilization findings

### [LESSON-GOVERNANCE-002]: MCP-applied migrations must be committed to disk in the same session
- **Context**: v3.17.0 → v3.33.0 — schema objects (`superadmin_change_workspace_tier`, `validate_password_policy`, `workspace_permission_catalog`, `enterprise_feature_catalog.tier_feature_keys`, and ~30 other functions/tables) were applied via Supabase MCP `apply_migration` and never persisted to `supabase/migrations/`.
- **Problem**: Repo↔DB drift. Rebuilding from disk regresses every MCP-only fix — including the v3.17.1 silent-freemium-fallback fix in `create_workspace_with_owner`. Audit, code review, and rollback all become unreliable.
- **Fix**: After EVERY `apply_migration` call, immediately persist the SQL to `supabase/migrations/YYYYMMDDHHMMSS_<slug>.sql` with the same body and commit alongside the code change. The disk file is the source of truth for disaster recovery.
- **Warning**: Most dangerous when MCP is used to FIX a previous on-disk migration — the bug remains in version control while the live DB is patched. Anyone who resets the dev DB from disk regresses the fix without noticing.

### [LESSON-TIER-001]: Tier-id immutability is a DB invariant, not a code convention
- **Context**: `tenant_subscriptions.tier_id` must change only via `superadmin_change_workspace_tier` per v3.17.0.
- **Problem**: The original `tenant_subscriptions_admin_all` RLS policy permitted any platform admin to `UPDATE tier_id` directly. Audit-event write was therefore bypassable.
- **Fix**: BEFORE-UPDATE trigger `enforce_tier_id_immutability` raises unless `current_setting('app.tier_change_rpc_active', true) = 'true'`. The RPC sets the marker via `set_config(..., true)` (txn-local) inside its body. `create_workspace_with_owner` also sets it before the initial INSERT path.
- **Pattern**:
  ```sql
  -- inside the privileged RPC:
  PERFORM set_config('app.tier_change_rpc_active', 'true', true);
  UPDATE tenant_subscriptions SET tier_id = _new_id WHERE tenant_id = _tenant;
  -- the trigger checks this marker; reset_config not needed (txn-local).
  ```

### [LESSON-CATALOG-002]: `text[]` columns mapping to another table's primary key need a delta-validation trigger
- **Context**: `enterprise_feature_catalog.tier_feature_keys text[]` references `features.feature_key`. Same pattern with `features.dependencies`.
- **Problem**: Postgres CHECK can't subquery. Without a trigger, a typo silently hides a UI permission slot (because the EXISTS-check in the visibility computation evaluates to false). Undetectable except by manual inspection.
- **Fix**: BEFORE INSERT OR UPDATE trigger that validates only NEWLY-ADDED elements:
  ```sql
  IF TG_OP = 'INSERT' THEN _added := COALESCE(NEW.col, '{}');
  ELSE
    SELECT array_agg(k) INTO _added FROM unnest(NEW.col) AS k
    WHERE k <> ALL(COALESCE(OLD.col, '{}'));
  END IF;
  -- then check _added against the target table
  ```
  Delta-validation is critical: full validation would reject any future UPDATE on a row containing a pre-existing typo even if the UPDATE doesn't touch the bad column.

### [LESSON-RPC-091]: Empty array from RPC ≠ RPC failure — keep them distinguishable
- **Context**: `useEnterprisePermissions` calls `workspace_permission_catalog` and previously fell back to a legacy unfiltered SELECT when the result was empty.
- **Problem**: The fallback condition `visibleCatalog.length === 0` cannot tell a successful-but-empty response from an error. On error the fallback returned the unfiltered catalog — defeating tier filtering.
- **Fix**: Inspect the response's `error` field explicitly. Fall back only when `catalogRes.error` is truthy. A legitimately-empty result is rendered as an empty tree with the existing `hiddenByTier` notice.
- **Pattern**:
  ```ts
  if (catalogRes.error) {
    // legitimate fallback path (older workspace, RPC doesn't exist)
    const fallback = await supabase.from('legacy_table').select(...);
    setTree(buildTree(fallback.data ?? []));
  } else {
    // empty array is a real answer; render it
    setTree(buildTree(catalogRes.data ?? []));
  }
  ```

### [LESSON-CLEANUP-001]: `useEffect` firing 3+ Supabase queries needs cancellation
- **Context**: `InviteMemberDialog` fires 8 parallel queries on open with no cleanup. Closing mid-fetch caused React state-on-unmounted-component warnings.
- **Problem**: Without a cancellation flag, every awaited setState fires regardless of whether the component is still mounted. Beyond the React warning, any subsequent audit-log write or toast triggered by the post-fetch code path can leak.
- **Fix**:
  ```tsx
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    Promise.all([...]).then(([...]) => {
      if (cancelled) return;
      // safe setState calls
    });
    return () => { cancelled = true; };
  }, [open, workspaceId]);
  ```

### [LESSON-AUDIT-092]: Every privileged edge function must write its own audit row
- **Context**: `superadmin-hub` performed 10 different platform-admin actions (workspace-action, toggle-feature-flag, trigger-edge-function, etc.) with only the role check; no audit row was written for any of them.
- **Problem**: Compliance gap — ISO 27001 A.12.4 / GDPR Art. 5 require traceability for privileged operations. Convention said "track in platform_audit_events"; convention was not enforced.
- **Fix**: Immediately after the role-check passes and the action is identified, fire-and-forget an `insert` to `platform_audit_events` with `actor_id = user.id`, `action = '<edge_fn_name>.<action>'`, `target_id` derived from body, and `metadata: { body }`. Log (don't throw) on insert failure so the action doesn't fail because of audit latency.

### [LESSON-PARTIAL-FAIL-001]: "Partial success returned as success" recurs every quarter — protect against it explicitly
- **Context**: Documented twice already (HIBA-074 demo seed, HIBA-075 demo leave seed). Now resurfaced in `send-scheduled-reports` (emails) and `cleanup-demo-workspace` (auth user deletes).
- **Problem**: A loop that catches per-item errors but reports overall success is the canonical fail-soft anti-pattern. The downstream observer (UI, ops, audit) sees green where there is yellow.
- **Fix**: Count successes and failures explicitly; emit three states (success / partial_failure / error) and include the list of failed items in the error payload. HTTP 207 Multi-Status is the right code for partial-success HTTP responses.
- **Pattern**:
  ```ts
  const failed: string[] = [];
  for (const item of items) {
    try { await doIt(item); } catch (e) { failed.push(item); }
  }
  const status = failed.length === 0 ? 'success'
              : failed.length === items.length ? 'error' : 'partial_failure';
  ```

### [LESSON-DEAD-SQL-001]: Delete dead raw-SQL strings — they become live injection vectors
- **Context**: `run-report/index.ts` contained a `wrapped = \`SELECT * FROM (${sql}) WHERE workspace_id = '${workspaceId}'\`` string that was never executed (the function always took the safer JS-builder fallback path).
- **Problem**: The string was an SQL-injection template waiting to be activated by anyone who later wired up an `exec_sql` RPC. Dead-code injection footguns are common in evolving codebases.
- **Fix**: Delete dead raw-SQL strings entirely. If a future feature needs raw SQL, it must be designed with parameter binding from the start, not by activating dormant string-concat code.

## ➕ APPEND — 2026-05-15 v3.33.2 hotfix lessons

### [LESSON-TRIGGER-PAIR-001]: Never ship an enforcement trigger without verifying every legitimate writer arms its guard
- **Context**: v3.33.1 added an `enforce_tier_id_immutability` trigger on `tenant_subscriptions` that requires `current_setting('app.tier_change_rpc_active', true) = 'true'`. The expectation was that `superadmin_change_workspace_tier` (the sole legitimate writer) sets that marker.
- **Problem**: The RPC body in the remote DB never set the marker. The trigger would have blocked every legitimate tier change in production once v3.33.1 went live. We assumed the RPC sets it because we agreed it would; we never read the live body.
- **Fix**: Always pull `pg_get_functiondef()` of the writer RPC and grep for the `set_config` call BEFORE shipping the trigger. Better: write a migration-invariant test that asserts the call exists, so the assumption is enforced forever.
- **Pattern**: When a trigger + an RPC form a "trigger-RPC pair" (trigger blocks, RPC arms guard), treat them as one atomic deliverable. Read both function bodies during PR review. Write a regression test that asserts both halves of the pair.

### [LESSON-PG-SEARCH-PATH-001]: Every new SECURITY DEFINER / trigger function must declare SET search_path
- **Context**: The 4 functions added in v3.33.1 (`enforce_tier_id_immutability`, `validate_tier_feature_keys`, `validate_feature_dependencies`, `require_feature_id`) all lacked `SET search_path TO 'public'`. Caught by Supabase `function_search_path_mutable` advisor.
- **Problem**: Without `SET search_path`, an attacker who can manipulate session search_path can shadow `public.features` / `public.tenant_subscriptions` from inside a trigger or DEFINER context. The Supabase advisor flags this as a security warning.
- **Fix**: Every `CREATE OR REPLACE FUNCTION public.foo() ... LANGUAGE plpgsql` block must include `SET search_path TO 'public'` (or another explicit schema list) BEFORE the `AS $$`. This applies to triggers and helpers too, not just SECURITY DEFINER RPCs.
- **Pattern**:
  ```sql
  CREATE OR REPLACE FUNCTION public.foo()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'   -- mandatory
  AS $$
    ...
  $$;
  ```
- **Enforcement**: After applying any migration, run `mcp__supabase__get_advisors({type: 'security'})` and grep the result for the new function names. If any new function appears in `function_search_path_mutable`, it must be patched before merging.

### [LESSON-MIGRATION-INVARIANTS-001]: Migration-invariant tests are the right level for "convention enforcement"
- **Context**: The two v3.33.2 hotfixes (trigger-pair marker + search_path) were exactly the kind of bug a vitest test could catch by scanning `supabase/migrations/` text.
- **Problem**: When invariants live as conventions ("the RPC sets the marker", "all functions set search_path"), they drift silently across PRs. By the time a Supabase advisor or a production failure surfaces them, several PRs have shipped on top.
- **Fix**: For any DB invariant we write down, also write a test in `src/test/migrationInvariants.test.ts` that scans the migrations corpus and asserts the LATEST `CREATE OR REPLACE` block of the protected object satisfies the invariant. Tests run on every commit; convention drift becomes a red CI signal.
- **Pattern** — see `src/test/migrationInvariants.test.ts`:
  ```ts
  // Find the LATEST CREATE OR REPLACE FUNCTION block (later migrations override earlier).
  // Don't assert against historical snapshots — only the current shipped definition.
  // Use $$ ... $$ matching for un-tagged dollar quotes; backreferences over empty
  // captures fail in JS regex, so prefer two simple regexes (one for $$, one for $function$).
  ```

---

## ➕ APPEND — 2026-05-15 Password-policy split + audit-log silent failure

### [LESSON-SECURITY-001]: Dual password-validator split — always keep a single source of truth for validation rules
**Context**: Any time a validation rule (min length, regex, etc.) exists in both a frontend helper and a server-side function, they must agree exactly.
**Problem**: v3.33.0 introduced `src/lib/security/passwordPolicy.ts` (min 10 chars) alongside the older `src/lib/passwordValidation.ts` (min 8 chars). `InviteMemberDialog` consumed the new 10-char policy; `ChangePasswordCard` + `PasswordRequirements` silently kept the old 8-char policy. Users saw green UI checkmarks for 8- or 9-char passwords that violated company policy. The test suite remained green because it only tested the old file.
**Fix**: Raised the `minLength` threshold in `passwordValidation.ts` from `>= 8` to `>= 10`. Updated `password_req.min_length` i18n key in all 8 locale files. Updated `passwordValidation.test.ts` boundary assertions.
**Pattern**: After introducing a canonical validation rule anywhere in the stack, immediately grep the codebase for every other validator covering the same domain and update them in the same commit. Never leave two implementations with different thresholds.
**Regression trap**: A test suite that only tests the OLD validator file will stay green even as the app silently violates the new policy. Add an explicit cross-check test, or better, consolidate into a single validator.

### [LESSON-SUPABASE-SDK-086]: `logAuditEvent` — Supabase insert errors are not thrown; they must be destructured
**Context**: Any Supabase JS `.insert()` / `.update()` / `.delete()` call.
**Problem**: `logAuditEvent()` used `await supabase.from(...).insert(...)` inside a `try/catch`. The Supabase JS client returns `{ data, error }` on DB-level failures (RLS rejection, constraint violation) — it does NOT throw. The `catch` block therefore never fired for real failures. Audit events were silently lost with no log entry and no return signal to callers.
**Fix**: Destructure `{ error }` from every Supabase mutating call. Check `if (error)` explicitly. `logAuditEvent` now returns `Promise<boolean>` so callers can react to failures.
**Pattern**:
```ts
const { error } = await supabase.from('table').insert([...]);
if (error) { console.warn('insert failed:', error); return false; }
```
**Regression trap**: A `try/catch` around a Supabase call gives false confidence. The only network-level failure that throws is a complete fetch rejection. All application-layer errors come via the `error` field.

## ➕ APPEND — 2026-05-15 Edge-function data integrity, TOCTOU hardening, localization

### [LESSON-SCHEMA-001]: GDPR exports — always join through membership_id, not user_id, for workspace-scoped tables
**Context**: `enterprise_attendance_periods`, `wellbeing_scores`, and similar workspace-scoped tables that link to users via `enterprise_memberships`.
**Problem**: `security-admin` GDPR export queried both tables with `.eq('user_id', targetUserId)`. Both tables use `membership_id` (a FK to `enterprise_memberships`) not a direct `user_id`. The queries returned empty arrays silently — PostgREST does not error on a WHERE clause that matches no rows.
**Fix**: Use `targetMembership.id` (already fetched for the workspace-guard check) as `.eq('membership_id', ...)`.
**Pattern**: Before writing any query on a workspace-scoped table, grep the migration for the actual column name. Never assume `user_id` — many tables use `membership_id` as the user link to preserve referential integrity through the membership layer.

### [LESSON-SCHEMA-002]: Always verify select columns against migration DDL before shipping a hook
**Context**: `useWellbeing.ts` select query included `period_start`, `period_end` (wellbeing_scores) and `metadata` (wellbeing_alerts).
**Problem**: The `wellbeing_scores` migration has no `period_start` or `period_end` columns. `wellbeing_alerts` has `message`, not `metadata`. PostgREST silently returns `undefined` for unknown select columns — no error, no warning, just missing data at runtime.
**Fix**: Removed the non-existent columns from both the select string and the TypeScript interface. `metadata` → `message`.
**Pattern**: Run `grep "CREATE TABLE.*wellbeing_scores" migrations/` and read the DDL before writing a hook. Never trust an interface that was written without checking the migration.

### [LESSON-SECURITY-002]: Never accept actor identity from the request body — always derive it from the JWT
**Context**: `payroll-export` lock-period action.
**Problem**: `locked_by` was set from `body.userId`. Any authenticated workspace admin could claim to lock on behalf of any user by sending a different userId. The JWT is already verified; `user.id` is the single source of truth for the caller's identity.
**Fix**: Removed `userId` from body destructuring; replaced all uses with `user.id`.
**Pattern**: For any audit trail, ownership, or attribution field, always use the identity derived from the verified JWT. Never trust client-supplied identity.

### [LESSON-TOCTOU-001]: Use atomic WHERE clauses on UPDATE to prevent TOCTOU races, then check row count
**Context**: `payroll-export` lock-period: check status = 'open', then update status = 'locked'.
**Problem**: Between the SELECT (status check) and the UPDATE (lock), another concurrent request could lock the same period, resulting in a double-lock acknowledgment.
**Fix**: Add `.eq('status', 'open')` to the UPDATE WHERE clause and `.select('id')` to detect 0-row results. If `lockedRows.length === 0`, the period was already locked — return 409.
**Pattern**:
```ts
const { data: rows } = await admin.from('table')
  .update({ status: 'locked', locked_by: user.id })
  .eq('id', id)
  .eq('status', 'open')  // ← atomic guard
  .select('id');
if (!rows || rows.length === 0) return jsonRes({ error: 'Already locked' }, 409);
```

### [LESSON-ORDER-001]: Write audit rows BEFORE destructive operations, not after
**Context**: `superadmin-hub` workspace-delete action.
**Problem**: The audit INSERT happened after the workspace DELETE. If the workspace FK cascades to `enterprise_audit_events`, the insert could fail (FK no longer exists) and the audit event is silently lost.
**Fix**: Insert the audit row before the DELETE. If the DELETE fails, the audit row is a false positive (harmless); if the INSERT fails, we log it and proceed with the DELETE (audit failure is non-fatal).
**Pattern**: For any hard-delete action, always write the audit trail before the delete, not after.

### [LESSON-LOCALIZATION-001]: Module-level constants cannot use t() — move them inside the component
**Context**: `LeaveCalendar.tsx` `WEEKDAY_LABELS` array defined outside the component.
**Problem**: Constants defined at module level cannot call `t()` because `t()` requires the React context. The array was hardcoded in Hungarian, violating the localization mandate for all 7 other locales.
**Fix**: Removed the module-level constant. Added `weekdayLabels` as a `useMemo` inside the component that calls `t('leave_calendar.weekday_*')` for each of 7 keys. Added all 9 new i18n keys to all 8 locale files.
**Pattern**: Any user-visible string that appears in a module-level constant is a localization gap. Always move such strings inside the component scope where `t()` is available, or define them as i18n keys.

## ➕ APPEND — 2026-05-15 Supabase error-visibility sweep (v3.33.6)

### [LESSON-SUPABASE-SDK-087]: Every `.select()` destructure in a component must include `.error` and early-return
**Context**: AuditLog, ApprovalInbox, LeaveCalendar, WorkspaceDashboard fetchData.
**Problem**: All four components used `const { data } = await supabase.from(...)...` without checking `.error`. On any DB-level failure (RLS rejection, constraint, network), `data` is `null`, items array becomes `[]`, and the UI silently shows "no results" instead of an error state.
**Fix**: `const { data, error } = await ...; if (error) { console.error(...); return; }` in every case.
**Pattern**: The Supabase JS client contract is explicit: errors come via `{ error }`, not via thrown exceptions. ALWAYS destructure both.

### [LESSON-SUPABASE-SDK-088]: Check `.error` on all mutation operations (insert/update/delete) even fire-and-forget paths
**Context**: RolePermissionManager insert/update/delete, ApprovalInbox bulk operations.
**Problem**: `await supabase.from('table').insert(...)` with no error check means RLS rejections, constraint violations, and schema mismatches are completely invisible — no log, no user feedback.
**Fix**: Destructure `{ error }`, log on failure. For UX-critical paths, surface to the user via toast.

### [LESSON-POLLING-001]: Extract interval callback to a named function and check errors in all paths
**Context**: WorkspaceDashboard recovery_mode polling.
**Problem**: Two copies of the same async code (initial fetch + setInterval callback) had inconsistent error handling and relied on shared state. Copying code into interval callbacks is a regression trap.
**Fix**: Extract to a named `pollX()` function. Both the initial call and the interval call invoke the same function. Errors are checked in one place.

### [LESSON-RPC-001]: Distinguish RPC operational failure from authorization denial
**Context**: sync-holidays `has_enterprise_role` RPC.
**Problem**: `const { data: roleCheck } = await supabaseAdmin.rpc(...)` without error check means RPC unavailability is treated the same as "user is not authorized" (returns falsy). The user gets a 403 Forbidden when the real issue is a 500 server error.
**Fix**: Check `{ error: roleErr }` on RPC calls. Return 500 on RPC failure, 403 on explicit denial.

### [LESSON-LOCALE-002]: Never use Hungarian as an English fallback — hardcode 'Unknown', not 'Ismeretlen'
**Context**: capacityEngine.ts, run-report edge function.
**Problem**: `'Ismeretlen'` is the Hungarian word for "Unknown". Using it as a fallback in a shared library means all non-Hungarian users see Hungarian text in display_name fallbacks.
**Fix**: Use `'Unknown'` (English) as the universal fallback for missing display names in library/engine code. Let UI layers apply i18n on top.

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
