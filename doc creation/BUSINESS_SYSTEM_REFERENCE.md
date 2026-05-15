# Business System Reference

## Metadata
- Generated at: `__GENERATED_AT_ISO__`
- Repository: `__DERIVE_FROM_REPO__`
- Revision: `__DETECT_CURRENT_REVISION__`
- Evidence basis: source code, routes, backend services, changelog, codinglessonslearnt, versioning, tests
- Confidence: `__SET_BY_GENERATOR__`

## Purpose
Describe each discovered business capability in maximum detail and pair it with the corresponding technical implementation reality.

## Recommended structure per business capability
For each major capability include:
- Business purpose
- Target users and roles
- Trigger and entry points
- UI locations
- Backend modules/services/controllers
- Data entities involved
- Validations and rules
- Status lifecycle
- Notifications and side effects
- Edge cases and known limitations
- Historical notes from changelog/versioning/codinglessonslearnt

## Capability template
### [Capability name]
- Business purpose:
- Roles involved:
- Entry points:
- Menu path:
- Route(s):
- Frontend implementation:
- Backend implementation:
- Data/entities:
- Rules and validations:
- State transitions:
- Notifications/side effects:
- Integrations:
- Edge cases:
- Historical caveats:

## Evidence and no-invention rules
Every capability must be backed by repository evidence. Acceptable evidence includes routes, menu definitions, UI components, backend handlers, services, schema objects, tests, changelog entries, release notes, migrations, or existing docs.

If a capability is inferred from multiple weak signals, label it as inferred and record the uncertainty in `./DOC_GENERATION_REPORT.md`.

Do not invent:
- unavailable menu paths
- unsupported user actions
- hidden approval steps
- role permissions not visible in code or policy
- integrations not present in configuration, code, docs, or tests

## Capability evidence matrix
| Capability | Evidence type | Repository-relative evidence path | Confidence | Related docs |
|---|---|---|---|---|
|  |  |  |  |  |

## Repository-relative rule
All implementation references must use repository-relative paths. Never include local workstation paths.
