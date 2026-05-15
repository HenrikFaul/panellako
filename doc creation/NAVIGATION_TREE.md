# Navigation Tree

## Metadata
- Generated at: `__GENERATED_AT_ISO__`
- Repository: `__DERIVE_FROM_REPO__`
- Revision: `__DETECT_CURRENT_REVISION__`
- Confidence: `__SET_BY_GENERATOR__`

## Purpose
Provide a code-derived tree of the real menu, route, section, and tab structure.

## Tree template
```text
Main Menu
├── Section A
│   ├── Subsection A1
│   └── Subsection A2
└── Section B
    └── Subsection B1
```

## Route mapping table
| Menu | Submenu | Route | Role visibility | Source evidence |
|---|---|---|---|---|
|  |  |  |  |  |

## Extraction rules
The navigation tree must be derived from real repository evidence, not from product intuition.

Inspect:
- route files and router configuration
- layouts and shell components
- sidebar/header/menu definitions
- tab definitions
- command menus and quick actions
- feature flags
- permission checks and role-gated rendering
- redirect and fallback routes

## Required output detail
For each navigation item, include:
- label
- route or route pattern
- parent menu/group
- role visibility
- feature flag or environment condition if present
- source evidence
- related user-manual section

## Repository-relative rule
Source evidence paths must be repository-relative. Application URLs may be route-relative.
