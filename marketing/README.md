# Effectime Marketing Prompt Library

This folder is the complete marketing operating system for Effectime, structured as an AI-readable prompt library. It is designed to produce connected, consistent, and high-quality marketing outputs — not ad-hoc campaign ideas.

## How to use this library

**Always start with `SYSTEM.md`.** It contains the positioning doctrine, channel priority rules, routing table, and output quality bar. All other files operate within the system defined there.

For cross-library discovery and agent routing, use `MASTERFILE.json`.

## Folder structure

```
marketing/
├── SYSTEM.md                    ← Global controller — read first
├── README.md                    ← This file
├── MASTERFILE.json              ← Machine-readable routing index
├── folderstructure.md           ← Visual folder map
│
├── strategy/                    ← Positioning, GTM, channels, founder-led growth
│   ├── marketing_master_controller.md
│   ├── positioning_masterprompt.md
│   ├── go_to_market_masterprompt.md
│   ├── channel_strategy_masterprompt.md
│   ├── pricing_and_offer_masterprompt.md
│   └── founder_led_marketing_masterprompt.md
│
├── research/                    ← Market, competitor, ICP, pain, JTBD
│   ├── market_research_masterprompt.md
│   ├── competitor_messaging_analysis.md
│   ├── icp_persona_builder.md
│   ├── objections_and_pains.md
│   └── jobs_to_be_done_research.md
│
├── messaging/                   ← Brand framework, value props, narrative
│   ├── brand_messaging_framework.md
│   ├── homepage_messaging.md
│   ├── feature_to_outcome_translation.md
│   ├── value_prop_builder.md
│   ├── proof_and_trust_assets.md
│   └── narrative_house.md
│
├── content/                     ← Content engine, LinkedIn, SEO, cases, email
│   ├── content_engine_controller.md
│   ├── linkedin_content_masterprompt.md
│   ├── founder_post_masterprompt.md
│   ├── seo_article_masterprompt.md
│   ├── case_study_masterprompt.md
│   ├── email_nurture_masterprompt.md
│   ├── webinar_masterprompt.md
│   └── sales_enablement_content.md
│
├── campaigns/                   ← Demand gen, paid, retargeting, launches
│   ├── campaign_architecture_masterprompt.md
│   ├── linkedin_ads_masterprompt.md
│   ├── retargeting_masterprompt.md
│   ├── event_based_marketing.md
│   ├── guerilla_marketing_masterprompt.md
│   └── launch_campaign_masterprompt.md
│
├── visual/                      ← Brand visuals, ad creatives, social visuals
│   ├── visual_direction_controller.md
│   ├── brand_visual_system.md
│   ├── website_art_direction.md
│   ├── ad_creative_prompt_library.md
│   ├── social_visual_prompt_library.md
│   ├── case_study_visuals.md
│   └── infographic_prompt_library.md
│
├── website/                     ← Homepage, landing, solution, industry, comparison pages
│   ├── homepage_masterprompt.md
│   ├── landing_page_masterprompt.md
│   ├── solution_pages_masterprompt.md
│   ├── industry_pages_masterprompt.md
│   ├── comparison_pages_masterprompt.md
│   └── conversion_copy_controller.md
│
├── sales/                       ← Deck, one-pager, demo, objections, proposals
│   ├── sales_deck_masterprompt.md
│   ├── one_pager_masterprompt.md
│   ├── demo_script_masterprompt.md
│   ├── objection_handling_masterprompt.md
│   └── proposal_masterprompt.md
│
├── analytics/                   ← Measurement, KPIs, attribution, experiments
│   ├── measurement_framework.md
│   ├── funnel_kpi_masterprompt.md
│   ├── attribution_notes.md
│   └── experiment_backlog_masterprompt.md
│
├── governance/                  ← Terminology, quality checklists, brand safety, localization
│   ├── terminology_and_positioning_guardrails.md
│   ├── content_quality_checklist.md
│   ├── visual_quality_checklist.md
│   ├── brand_safety_rules.md
│   └── localization_marketing_rules.md
│
└── marketing_values/            ← Per-feature marketing impact log (auto-grown)
    ├── README.md
    └── YYYYMMDD_vX.Y.Z_feature-slug_marketing_value.md  ← one per release
```

## The marketing_values/ folder

This is the bridge between product development and marketing. Every time a new feature is shipped, a `marketing_values/*.md` file is created documenting the marketing-relevant impact: what problem it solves, who benefits, what claims it enables, what content angles it suggests, and which marketing library files should be updated.

Marketing agents read this folder to know what has been built and what can be marketed.

## Recommended usage sequence

1. **Start with `SYSTEM.md`** — doctrine, routing, guardrails
2. **Read `marketing_values/`** — understand current product capabilities
3. **Use `strategy/`** — confirm or define positioning
4. **Use `research/`** — ground messaging in audience reality
5. **Use `messaging/`** — build the message architecture
6. **Use `content/` + `visual/`** — produce assets
7. **Use `website/` + `sales/`** — convert interest to action
8. **Use `campaigns/`** — distribute and amplify
9. **Use `analytics/`** — measure and optimize
10. **Use `governance/`** — review before publishing

## Working philosophy

This library must produce connected outputs where strategy informs messaging, messaging informs content, content informs visuals, visuals support campaigns, and all of it is anchored in real audience pain and real product outcomes. It is not an ad-hoc prompt collection — it is a system.
