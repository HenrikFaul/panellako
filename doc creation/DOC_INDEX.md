# Documentation Index

## Metadata
- Generated at: `__GENERATED_AT_ISO__`
- Repository: `__DERIVE_FROM_REPO__`
- Branch: `__DETECT_DEFAULT_BRANCH__`
- Revision: `__DETECT_CURRENT_REVISION__`
- Confidence: `__SET_BY_GENERATOR__`

## Purpose
This is the landing page for the generated documentation suite. It helps product, support, operations, engineering, and stakeholders quickly find the right document for business understanding, user workflows, technical structure, and historical change context.

## Main documents
- [Business System Reference](./BUSINESS_SYSTEM_REFERENCE.md)
- [User Manual](./USER_MANUAL.md)
- [Process Flows](./PROCESS_FLOWS.md)
- [Navigation Tree](./NAVIGATION_TREE.md)
- [Technical Architecture](./TECHNICAL_ARCHITECTURE.md)
- [Feature Catalog](./FEATURE_CATALOG.md)
- [Role Permission Matrix](./ROLE_PERMISSION_MATRIX.md)
- [Data Flow and Entity Reference](./DATA_FLOW_AND_ENTITY_REFERENCE.md)
- [Change Intelligence Appendix](./CHANGE_INTELLIGENCE_APPENDIX.md)
- [Doc Generation Report](./DOC_GENERATION_REPORT.md)

## Audience guide
| Audience | Best starting point |
|---|---|
| End users | [User Manual](./USER_MANUAL.md) |
| Support | [User Manual](./USER_MANUAL.md), [Navigation Tree](./NAVIGATION_TREE.md) |
| Product | [Business System Reference](./BUSINESS_SYSTEM_REFERENCE.md), [Feature Catalog](./FEATURE_CATALOG.md) |
| Engineering | [Technical Architecture](./TECHNICAL_ARCHITECTURE.md), [Data Flow and Entity Reference](./DATA_FLOW_AND_ENTITY_REFERENCE.md) |
| Operations | [Role Permission Matrix](./ROLE_PERMISSION_MATRIX.md), [Process Flows](./PROCESS_FLOWS.md) |

## Notes
All files in this directory are intended to be regenerated from repository evidence. The canonical machine-readable manifest for the Help Menu frontend is [`HELP_MENU_MASTERFILE.json`](./HELP_MENU_MASTERFILE.json).

## Generation contract
This document is generated from repository evidence and must stay repository-relative.

Required checks:
- Link only to generated docs using relative links.
- Keep this file as the human landing page, not as the machine-readable source of truth.
- Ensure every linked document has a matching entry in `./HELP_MENU_MASTERFILE.json`.
- If a generated document is missing, list it in `./DOC_GENERATION_REPORT.md` instead of silently omitting it.
- Do not include local machine paths or workstation-specific checkout paths.

Recommended order:
1. Start with user-facing docs.
2. Then expose business, feature, navigation, role, data, technical, and change-intelligence references.
3. End with generation report and confidence notes.
