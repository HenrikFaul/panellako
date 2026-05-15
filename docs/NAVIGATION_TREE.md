# NAVIGATION_TREE.md — PanelLakó Navigation Tree

**Repository:** panellako  
**Branch:** main  
**Generated:** 2026-05-15  
**Confidence:** High (verified from `components/dashboard-client.tsx` navigation array, lines 97–108)

---

## Overview

PanelLakó uses a **single-page architecture** with hash-based in-page anchors for navigation. The application is a single Next.js route (`/`). There is no multi-page routing implemented in the current MVP beyond the login page.

Navigation uses the sidebar on desktop (lg breakpoint and above). On mobile, the sidebar is hidden (`hidden lg:block`); mobile navigation is scroll-based only.

---

## Routes

| Route | Component | Type | Description |
|-------|-----------|------|-------------|
| `/` | `app/page.tsx` → `Dashboard` → `DashboardClient` | Server + Client | Main application |
| `/login` | `app/login/page.tsx` | Client | Magic link login |
| `/api/location/autocomplete` | `app/api/location/autocomplete/route.ts` | API Route | Address autocomplete |

**URL parameter on `/`:** `?role=<role>` — sets the active role for demo/testing purposes. Accepted values: `lako`, `tulajdonos`, `kozos_kepviselo`, `megbizott`, `bizottsag`, `konyvelo`. Defaults to `lako` if absent or invalid.

---

## Sidebar Navigation (Desktop)

Defined in `dashboard-client.tsx` as the `navigation` array (lines 97–108):

```
PanelLakó
Társasházi operációs központ
│
├── Áttekintő          #overview     Home icon
├── Teendők            #tasks        ClipboardCheck icon
├── Bejelentések       #tickets      TicketCheck icon
├── Albetétek          #units        Building2 icon
├── Dokumentumok       #documents    FileText icon
├── Pénzügyek          #finances     CircleDollarSign icon
├── Mérőórák           #meters       Gauge icon
├── Közgyűlések        #meetings     CalendarDays icon
├── Tudásbázis         #knowledge    BookOpen icon
└── Audit napló        #audit        ShieldCheck icon
```

**Sidebar footer:** Shows active role label and quick-switch links for `lako`, `megbizott`, `kozos_kepviselo` roles.

---

## Page Content Sections (in render order)

```
Page Header
│   Building selector / welcome + login button

#overview         Hero section with feature checklist + 4 metric cards

(profile)         Profile form + address autocomplete (id="profile")
#tasks            Task panel + quick action links (id="tasks")

#tickets          Fault report form + ticket queue (id="tickets")
#units            Unit registry table (id="units")

#documents        Document library (id="documents")
#finances         Financial overview (id="finances")
#meters           Meter reading form + history (id="meters")

#meetings         Meetings list (id="meetings")
(vendors)         Vendor cards + work orders (no nav item, no id)

(news)            News feed / Hírfolyam (no nav item, no id)
(notifications)   Notification log (no nav item, no id)
#knowledge        Knowledge base (id="knowledge")

(comms)           Targeted communication / Lakói kapcsolat (isAdminLike conditional)
#audit            Audit log (id="audit")
```

---

## Role Visibility Per Section

| Section | lako | tulajdonos | kozos_kepviselo | megbizott | bizottsag | konyvelo |
|---------|------|-----------|----------------|-----------|-----------|---------|
| Overview (metrics) | Yes | Yes | Yes | Yes | Yes | Yes |
| Profile + address | Yes | Yes | Yes | Yes | Yes | Yes |
| Tasks panel | Yes | Yes | Yes | Yes | Yes | Yes |
| Ticket submit form | Yes | Yes | Yes | Yes | Yes | Yes |
| Ticket queue | Yes | Yes | Yes | Yes | Yes | Yes |
| Ticket status buttons | No | No | Yes | Yes | No | No |
| Unit registry | Yes | Yes | Yes | Yes | Yes | Yes |
| Documents | Yes | Yes | Yes | Yes | Yes | Yes |
| Doc acknowledge button | Yes | Yes | Yes | Yes | Yes | Yes |
| Finances | Yes | Yes | Yes | Yes | Yes | Yes |
| Meter reading form | Yes | Yes | Yes | Yes | Yes | Yes |
| Meetings | Yes | Yes | Yes | Yes | Yes | Yes |
| Vendor / work orders | Yes | Yes | Yes | Yes | Yes | Yes |
| News feed | Yes | Yes | Yes | Yes | Yes | Yes |
| Notification log | Yes | Yes | Yes | Yes | Yes | Yes |
| Knowledge base | Yes | Yes | Yes | Yes | Yes | Yes |
| Targeted comms form | No | No | Yes | Yes | Yes | Yes |
| Lakói kapcsolat (read) | Yes | Yes | No | No | No | No |
| Audit log | Yes | Yes | Yes | Yes | Yes | Yes |

**Note:** Role-based visibility is computed client-side via `isManager` and `isAdminLike` booleans. There is no server-enforced route gating in the current MVP (inferred: single-page architecture with RLS as the data security layer).

---

## Lucide Icon Mapping

| Nav Item | Icon Name | Import |
|----------|-----------|--------|
| Áttekintő | Home | lucide-react |
| Teendők | ClipboardCheck | lucide-react |
| Bejelentések | TicketCheck | lucide-react |
| Albetétek | Building2 | lucide-react |
| Dokumentumok | FileText | lucide-react |
| Pénzügyek | CircleDollarSign | lucide-react |
| Mérőórák | Gauge | lucide-react |
| Közgyűlések | CalendarDays | lucide-react |
| Tudásbázis | BookOpen | lucide-react |
| Audit napló | ShieldCheck | lucide-react |

---

## Mobile Navigation

No dedicated mobile nav component is present in the current source. The sidebar is hidden on mobile. In-page navigation is achieved by scrolling to section anchors or using links like `<a href="#tickets">`. A mobile nav implementation is not present in `dashboard-client.tsx`.

---

## Header Elements

| Element | Description |
|---------|-------------|
| Building name | Static "Teszt3" in header (demo value) |
| Page title | "Ház kiválasztása" |
| Data source indicator | "Supabase" or "Mock/demo" based on `data.source` |
| Global search input | UI only — no search logic implemented |
| Login/Session button | Links to `/login` or shows "Session aktív" |
| Sign-out button | Visible when `isLoggedIn === true`; calls `supabase.auth.signOut()` |
