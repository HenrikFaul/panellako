# Documentation Creation System

## Single Entry Point

This is the only file an AI should be given first for this documentation-generation pack.

If an AI starts from any other file in this folder, it must stop, read this `SYSTEM.md`, and restart from this bootstrap sequence.

Recommended instruction for a coding or documentation AI:

```text
Read only the documentation pack's ./SYSTEM.md first. Follow its bootstrap read order, use only repository-relative paths, then generate or refresh the docs system from repository evidence.
```

## Path Policy

All paths in this pack are repository-relative.

Never write machine-specific paths such as drive-letter absolute paths, local usernames, operating-system home folders, or temporary desktop paths into generated documentation.

Forbidden path styles:

- drive-letter absolute paths
- user-home absolute paths
- local desktop/download paths
- workstation-specific repository checkout paths

Path meanings:

- Template pack root: the folder containing this `SYSTEM.md`.
- Repository root: the root of the repository where the pack is being used.
- Generated documentation root: `docs/` at repository root unless the user explicitly chooses another relative folder.
- Generated DOCX mirror root: `docs/docx/` when DOCX export is available.

Use relative links such as:

- `./claude-code-docs-masterprompt.md`
- `./DOC_INDEX.md`
- `docs/DOC_INDEX.md`
- `docs/HELP_MENU_MASTERFILE.json`

## Bootstrap Read Order

After reading this file, the AI must read these files in order:

1. `./BUILD_LOG.md` - local execution memory for this doc-creation pack.
2. `./claude-code-docs-masterprompt.md` - full repository-driven documentation generation prompt.
3. `./README_TEMPLATE_USAGE.md` - placeholder, repository-name, branch, and revision resolution rules.
4. `./HELP_MENU_MASTERFILE_TEMPLATE.json` - canonical JSON shape for `docs/HELP_MENU_MASTERFILE.json`.
5. If present, `../AI_PROMPTING_FOLDERSTRUCTURE/docs/README.md` - Product-Engineering OS documentation-governance bridge.
6. If present, also read these OS documentation-governance files:
   - `../AI_PROMPTING_FOLDERSTRUCTURE/docs/prd-template.md`
   - `../AI_PROMPTING_FOLDERSTRUCTURE/docs/arch-diagrams.md`
   - `../AI_PROMPTING_FOLDERSTRUCTURE/docs/source-to-template-traceability.md`
   - `../AI_PROMPTING_FOLDERSTRUCTURE/docs/interface-contract-registry.md`
   - `../AI_PROMPTING_FOLDERSTRUCTURE/docs/non-regression-matrix.md`
7. The output document templates:
   - `./DOC_INDEX.md`
   - `./BUSINESS_SYSTEM_REFERENCE.md`
   - `./USER_MANUAL.md`
   - `./PROCESS_FLOWS.md`
   - `./NAVIGATION_TREE.md`
   - `./TECHNICAL_ARCHITECTURE.md`
   - `./FEATURE_CATALOG.md`
   - `./ROLE_PERMISSION_MATRIX.md`
   - `./DATA_FLOW_AND_ENTITY_REFERENCE.md`
   - `./CHANGE_INTELLIGENCE_APPENDIX.md`
   - `./DOC_GENERATION_REPORT.md`

Archived provenance files, if present, are not part of the active read order:

- `./archive/2026-05-10-docs-harmonization/help-menu-masterfile-only.md`
- `./archive/2026-05-10-docs-harmonization/felhasználás.txt`

## Repository Analysis Contract

Before generating or refreshing documentation, inspect the target repository using only repository-relative references. The AI must analyze:

- current source code and repository structure
- frontend routes, navigation, menus, tabs, layouts, screens, forms, grids, dialogs, and feature flags
- backend handlers, controllers, services, jobs, schedulers, validation, auth, permission logic, and error handling
- database schemas, entities, migrations, seed data, permissions, and lifecycle states
- integrations, webhooks, third-party services, background flows, and provider-specific behavior
- tests, snapshots, fixtures, mocks, and QA checks that reveal intended behavior
- existing docs, README files, ADRs, architecture notes, changelogs, coding lessons, release notes, and versioning artifacts
- commit or branch evidence when available and safe to inspect

Current code has priority over outdated prose. Historical files add context but must not override verified runtime behavior.

## Generation Mission

Generate or refresh a complete documentation system in `docs/` that supports:

- business and technical reference
- end-user manual
- process flow diagrams
- real navigation/menu tree
- feature catalog
- role and permission matrix
- entity and data-flow reference
- change-intelligence appendix
- machine-readable help-menu manifest
- generation report with confidence, evidence gaps, and recommendations

Do not generate isolated notes. Produce a coherent documentation product.

## Required Output Files

The generated repository documentation must include:

- `docs/DOC_INDEX.md`
- `docs/BUSINESS_SYSTEM_REFERENCE.md`
- `docs/USER_MANUAL.md`
- `docs/PROCESS_FLOWS.md`
- `docs/NAVIGATION_TREE.md`
- `docs/TECHNICAL_ARCHITECTURE.md`
- `docs/FEATURE_CATALOG.md`
- `docs/ROLE_PERMISSION_MATRIX.md`
- `docs/DATA_FLOW_AND_ENTITY_REFERENCE.md`
- `docs/CHANGE_INTELLIGENCE_APPENDIX.md`
- `docs/HELP_MENU_MASTERFILE.json`
- `docs/DOC_GENERATION_REPORT.md`

Optional generated folders:

- `docs/business/`
- `docs/manual/`
- `docs/flows/`
- `docs/navigation/`
- `docs/technical/`
- `docs/entities/`
- `docs/appendix/`
- `docs/docx/`

## Help Menu Masterfile Rule

`docs/HELP_MENU_MASTERFILE.json` is mandatory. It is the machine-readable contract for any Help Menu frontend.

The frontend must not infer document meaning from filenames alone. It must use the manifest fields:

- `documents`
- `navigationIndex`
- `featureIndex`
- `processIndex`
- `roleIndex`
- `entityIndex`
- `uiHints`
- `usageInstructions`

Use `./HELP_MENU_MASTERFILE_TEMPLATE.json` as the schema-style starting point, then fill it with repository-specific evidence.

If `AI_PROMPTING_FOLDERSTRUCTURE/docs/` is present, its documentation-governance rules must strengthen this manifest but must not change the output location: the generated manifest remains `docs/HELP_MENU_MASTERFILE.json`.

## Document Quality Rules

Every generated Markdown document must include:

- title and metadata
- generated timestamp
- repository name, branch, and analyzed revision
- evidence basis
- confidence level
- related documents
- verified facts separated from inferred or uncertain facts
- internal cross-links using repository-relative paths
- clear audience and purpose
- edge cases, limitations, and stale-area warnings where relevant

Mermaid diagrams must be valid, readable, and evidence-backed. Split large diagrams into smaller ones.

## Execution Phases

Do not skip phases:

1. Repository discovery
2. Current behavior reconstruction
3. Change/history intelligence
4. Feature and flow extraction
5. Navigation extraction
6. Document generation
7. Help menu masterfile generation
8. Cross-checking and consistency validation
9. Report generation
10. `./BUILD_LOG.md` update

## Non-Regression and No-Loss Rule

If existing `docs/` files already exist in the target repository, update and improve them without deleting useful structure. Preserve important content by merging it into the correct generated document or into an appendix section. If a file becomes superseded, mark it as superseded in documentation and preserve its meaningful content.

## Validation Checklist

Before finishing, verify:

- all generated paths are relative
- no local machine paths are present
- every primary docs file exists
- `docs/HELP_MENU_MASTERFILE.json` exists and is valid JSON
- document links resolve where expected
- Mermaid blocks are syntactically plausible
- navigation and user manual steps are grounded in repository evidence
- feature catalog entries map to routes, backend behavior, entities, tests, or explicit evidence gaps
- role and permission claims are not invented
- change-intelligence notes influence risky or fragile areas
- `docs/DOC_GENERATION_REPORT.md` records analyzed scope, gaps, confidence, and recommendations
- `./BUILD_LOG.md` is updated

## Completion Output

The AI's final response must summarize:

- generated or updated docs
- repository areas analyzed
- unresolved evidence gaps
- validation performed
- where the Help Menu frontend should start: `docs/HELP_MENU_MASTERFILE.json`
