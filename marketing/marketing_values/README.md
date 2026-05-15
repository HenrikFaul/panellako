# marketing_values/ — Feature Marketing Impact Log

## Purpose

This folder is the **bridge between product development and marketing**. Every time a new feature, module, or significant improvement is shipped, a new file is created here documenting its marketing-relevant impact.

Marketing AI agents read this folder to understand:
- What has been built and what it does for users
- What business outcomes it enables (and therefore what claims can be made)
- Which personas benefit most
- What content angles, SEO topics, and campaign hooks it suggests
- Which marketing library files should be updated or re-run

## Who creates these files

The engineering/development AI agent creates a new file here **alongside every `versioning/*.md` delivery artifact**. Both are committed in the same release cycle.

This is a non-optional governance requirement defined in `CLAUDE.md` and `AI_EXECUTION_PROMPTS.md`.

## File naming convention

```
YYYYMMDD_vX.Y.Z_feature-slug_marketing_value.md
```

Examples:
- `20260512_v3.7.9_office_extended_params_marketing_value.md`
- `20260509_v3.7.0_hr_workflows_marketing_value.md`
- `20260426_v3.5.0_import_export_center_marketing_value.md`

## Required sections in every file

1. **Feature name and version** — technical name + version number
2. **One-sentence user-language description** — what it does for a non-technical user
3. **Problem it replaces** — the manual / broken process this eliminates
4. **Primary beneficiary persona(s)** — HR manager / Ops manager / Owner / Team lead
5. **Marketing-ready claim** — the sentence you can actually say in an ad or on the website
6. **Claim types enabled** — time saving / error reduction / visibility / compliance / coordination / cost reduction
7. **Content angles** — 3–5 specific LinkedIn post ideas, SEO article titles, or case study hooks
8. **Funnel stage** — awareness / consideration / conversion / retention
9. **Marketing files to update** — which `messaging/`, `website/`, or `content/` files should be reviewed

## How marketing agents use this folder

Before producing any marketing output, a marketing AI agent should:
1. Read the most recent 3–5 files in this folder
2. Identify which features are most relevant to the audience and message being crafted
3. Reference specific feature capabilities when making claims
4. Use the "content angles" section to suggest post or article ideas
5. Cross-reference `messaging/feature_to_outcome_translation.md` for approved messaging

## Governance note

Do not delete or overwrite files in this folder. Each file is a permanent record of what was built and what marketing value it was assessed to have at the time of release. Over time, this folder becomes a complete marketing-readable product history.
