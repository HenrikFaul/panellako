# DOC_INDEX.md — PanelLakó Documentation Index

**Repository:** panellako

**Branch reviewed:** codex/light-workspace-redesign

**Generated:** 2026-05-15

**Last updated:** 2026-08-28

**Generator:** Claude Code documentation system

---

## Purpose

This index is the entry point for human- and machine-readable PanelLakó documentation. It lists the top-level documentation artifacts and the current architecture pack with their scope, audience, and confidence; nested pack chapters are indexed by their own README.

---

## Documentation Files

| # | File | Description | Primary Audience | Confidence |
|---|------|-------------|-----------------|------------|
| 1 | `DOC_INDEX.md` | This file — navigational entry point to all docs | All | High |
| 2 | `TECHNICAL_ARCHITECTURE.md` | Historical full-stack description; useful baseline, but its role-routing section requires reconciliation with current source and the multitenancy audit | Engineers, DevOps | Legacy — reconcile before implementation |
| 3 | `FEATURE_CATALOG.md` | Catalogue of all 11 product features with status, routes, actions, and per-role access | Engineers, PMs | High |
| 4 | `NAVIGATION_TREE.md` | Sidebar navigation structure, hash-based routing, role visibility per nav item | Engineers, Designers | High |
| 5 | `ROLE_PERMISSION_MATRIX.md` | Historical/current-UI role baseline; UI-inferred and not a canonical authorization contract, so reconcile it with runtime source and the target multitenancy authorization chapter | PMs, QA, Engineers | Legacy — non-canonical |
| 6 | `USER_MANUAL.md` | Step-by-step task guide for every persona: lako, tulajdonos, kozos_kepviselo, megbizott, bizottsag, konyvelo | Support, End Users | Medium-High |
| 7 | `BUSINESS_SYSTEM_REFERENCE.md` | Historical business baseline; mixes the former single-building MVP with later picker behavior and requires legal/product refresh | PMs, Legal, Compliance | Legacy — reconcile before implementation |
| 8 | `PROCESS_FLOWS.md` | Mermaid diagrams for ticket lifecycle, authentication flow, document read-receipt flow, meter reading flow, announcement flow | Engineers, QA | High |
| 9 | `DATA_FLOW_AND_ENTITY_REFERENCE.md` | Historical schema/data-flow reference; its building-scope statements are partially outdated and must be checked against source/live schema | Engineers, DBAs | Legacy — reconcile before implementation |
| 10 | `CHANGE_INTELLIGENCE_APPENDIX.md` | Sprint changes (SSR auth hardening, Server Actions, middleware.ts), regression risk map | Engineers, QA | High |
| 11 | `HELP_MENU_MASTERFILE.json` | Machine-readable manifest of all features, routes, and role access for a future in-app Help Menu component | Frontend Engineers | Medium-High |
| 12 | `DOC_GENERATION_REPORT.md` | Confidence levels per section, evidence gaps, inferred vs verified claims, recommended follow-up investigations | Engineers, Architects | High |
| 13 | `architecture/multitenancy/README.md` | Twelve-part, source-backed target architecture and v0.10.1 implementation record for workspace tenancy, buildings, canonical addresses, units, people, ownership/occupancy, representation, delegation, agency portfolios, password signup, onboarding, RLS, platform review, claimant MFA activation, content delivery, voting, migration and calendar accessibility | Architects, Engineers, Product, Legal, QA | High for repository implementation; live rollout remains HOLD |

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
2. For the real multitenancy model and the current v0.10.1 repository implementation status, start at `architecture/multitenancy/README.md`, then read chapters `10-implementation-status-v0.10.0.md`, `11-community-review-and-activation-v0.10.1.md`, and `12-operational-multitenancy-closure-v0.10.1.md`.
3. For the currently implemented technical architecture, go to `TECHNICAL_ARCHITECTURE.md`.
4. For the proposed authorization contract, use `architecture/multitenancy/03-authorization-and-rls.md`; use `ROLE_PERMISSION_MATRIX.md` only as a non-canonical legacy/current-UI baseline.
5. For user-facing instructions, see `USER_MANUAL.md`.
6. For current database/entity details, see `DATA_FLOW_AND_ENTITY_REFERENCE.md`.
7. For regression risks after recent changes, see `CHANGE_INTELLIGENCE_APPENDIX.md`.
8. To integrate a Help Menu component, consume `HELP_MENU_MASTERFILE.json`.

---

_All files use repository-relative paths. Confidence levels: High = directly verified from source code; Medium = inferred from code structure; Low = assumed from product context._
