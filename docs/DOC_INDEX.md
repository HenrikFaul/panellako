# DOC_INDEX.md — PanelLakó Documentation Index

**Repository:** panellako  
**Branch:** main  
**Generated:** 2026-05-15  
**Generator:** Claude Code documentation system  

---

## Purpose

This index is the entry point for all human- and machine-readable documentation covering the PanelLakó multi-tenant residential building management SaaS platform. Every file in this `docs/` folder is described below with its scope, intended audience, and confidence level.

---

## Documentation Files

| # | File | Description | Primary Audience | Confidence |
|---|------|-------------|-----------------|------------|
| 1 | `DOC_INDEX.md` | This file — navigational entry point to all docs | All | High |
| 2 | `TECHNICAL_ARCHITECTURE.md` | Full stack description: Next.js 14 App Router, Supabase, SSR auth, deployment on Vercel, AWS/Supabase GeoData proxy | Engineers, DevOps | High |
| 3 | `FEATURE_CATALOG.md` | Catalogue of all 11 product features with status, routes, actions, and per-role access | Engineers, PMs | High |
| 4 | `NAVIGATION_TREE.md` | Sidebar navigation structure, hash-based routing, role visibility per nav item | Engineers, Designers | High |
| 5 | `ROLE_PERMISSION_MATRIX.md` | Matrix showing which of the six user roles can create, read, update, or trigger each feature | PMs, QA, Engineers | High |
| 6 | `USER_MANUAL.md` | Step-by-step task guide for every persona: lako, tulajdonos, kozos_kepviselo, megbizott, bizottsag, konyvelo | Support, End Users | Medium-High |
| 7 | `BUSINESS_SYSTEM_REFERENCE.md` | Business rules, SLA definitions, legal references (Hungarian Ptk. társasházi law), data retention | PMs, Legal, Compliance | Medium |
| 8 | `PROCESS_FLOWS.md` | Mermaid diagrams for ticket lifecycle, authentication flow, document read-receipt flow, meter reading flow, announcement flow | Engineers, QA | High |
| 9 | `DATA_FLOW_AND_ENTITY_REFERENCE.md` | All 19 database tables, foreign key graph, current RLS policy status, data fetching limits | Engineers, DBAs | High |
| 10 | `CHANGE_INTELLIGENCE_APPENDIX.md` | Sprint changes (SSR auth hardening, Server Actions, middleware.ts), regression risk map | Engineers, QA | High |
| 11 | `HELP_MENU_MASTERFILE.json` | Machine-readable manifest of all features, routes, and role access for a future in-app Help Menu component | Frontend Engineers | Medium-High |
| 12 | `DOC_GENERATION_REPORT.md` | Confidence levels per section, evidence gaps, inferred vs verified claims, recommended follow-up investigations | Engineers, Architects | High |

---

## Terminology Glossary (quick reference)

| Hungarian term | English meaning |
|----------------|-----------------|
| lako | resident / tenant |
| tulajdonos | owner |
| kozos_kepviselo | building manager / common representative |
| megbizott | delegate (authorized representative) |
| bizottsag | committee member |
| konyvelo | accountant |
| társasház | condominium / apartment building |
| hibabejelentés | fault/defect report |
| mérőóra | utility meter |
| albetét | unit (apartment, storage, garage, commercial space) |
| közgyűlés | general assembly |
| hátralék | arrears / outstanding balance |
| határozat | resolution |
| Ptk. | Polgári Törvénykönyv (Hungarian Civil Code) |

---

## How to Read These Docs

1. **Start here** to locate the right document.
2. For architectural questions, go to `TECHNICAL_ARCHITECTURE.md`.
3. For what a role can do, see `ROLE_PERMISSION_MATRIX.md`.
4. For user-facing instructions, see `USER_MANUAL.md`.
5. For database/entity details, see `DATA_FLOW_AND_ENTITY_REFERENCE.md`.
6. For regression risks after recent changes, see `CHANGE_INTELLIGENCE_APPENDIX.md`.
7. To integrate a Help Menu component, consume `HELP_MENU_MASTERFILE.json`.

---

_All files use repository-relative paths. Confidence levels: High = directly verified from source code; Medium = inferred from code structure; Low = assumed from product context._
