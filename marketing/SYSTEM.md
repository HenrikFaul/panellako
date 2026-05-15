# Effectime Marketing System — Global Controller

> **This is the first file to read for any marketing-related AI work.**
> After reading this file, route to the most relevant specialist file using the routing table below.

---

## What this system is

This library is the complete marketing operating system for Effectime. It covers positioning, messaging, content production, campaign planning, visual art direction, website copy, sales enablement, analytics, and governance — all designed to work as a connected system, not as isolated prompts.

**Core principle:** Effectime must be communicated as an operational improvement system for people-managing businesses — not as a feature list, not as generic HR software, and never with startup hype language.

---

## Positioning doctrine (non-negotiable)

Always describe Effectime as solving a specific operational problem before describing it as software.

**Approved framing directions:**
- A system that reduces operational chaos in growing SMBs
- A way to make workforce coordination clear, traceable, and manageable
- A tool that eliminates the hidden admin friction that slows teams and managers
- A platform that gives leaders visibility without requiring them to micromanage
- A way to turn scattered people operations into structured, auditable workflows

**Never default to:**
- Generic feature lists ("leave management, attendance, HR workflows")
- Category clichés ("all-in-one HR platform")
- Empty transformation language ("revolutionize your workplace")
- Startup hype ("game-changer", "powerful AI-driven platform")
- Enterprise-scale claims unless the audience is explicitly enterprise

---

## Channel doctrine (default unless prompt overrides)

Priority order for demand generation and trust-building:

| Priority | Channel | Role |
|----------|---------|------|
| 1 | Website + conversion architecture | Demand capture, first impression, trial conversion |
| 2 | Founder-led LinkedIn | Authority building, organic reach, trust |
| 3 | SEO + pain-driven content | Long-term demand capture, search intent |
| 4 | Sales enablement content | Pipeline acceleration, objection handling |
| 5 | Retargeting (LinkedIn, Google, Meta) | Re-engagement of warm audiences |
| 6 | LinkedIn paid campaigns | Targeted demand generation |
| 7 | Email nurture | Lead development, reactivation |
| 8 | Events, webinars, partnerships | Community trust, qualified leads |
| 9 | Experimental / guerrilla tactics | Low-cost growth experiments |
| 10 | Facebook / Instagram | Only retargeting or employer brand |

**Facebook and Instagram rule:** Never recommend as primary demand-gen. Only use for: retargeting website visitors, employer brand / familiarity campaigns, event promotion, or tightly-defined paid social experiments with explicit audience, format, objective, and funnel-stage justification.

---

## Routing table — which file to use

### By task type

| Task | Primary file | Secondary file |
|------|-------------|----------------|
| Positioning, differentiation, market framing | `strategy/positioning_masterprompt.md` | `messaging/brand_messaging_framework.md` |
| Full GTM strategy | `strategy/go_to_market_masterprompt.md` | `strategy/marketing_master_controller.md` |
| Channel selection and prioritization | `strategy/channel_strategy_masterprompt.md` | `MASTERFILE.json` |
| Pricing and packaging messaging | `strategy/pricing_and_offer_masterprompt.md` | `messaging/value_prop_builder.md` |
| Founder LinkedIn content | `content/founder_post_masterprompt.md` | `content/linkedin_content_masterprompt.md` |
| SEO article writing | `content/seo_article_masterprompt.md` | `research/icp_persona_builder.md` |
| Case study creation | `content/case_study_masterprompt.md` | `visual/case_study_visuals.md` |
| Email campaigns / nurture | `content/email_nurture_masterprompt.md` | `campaigns/retargeting_masterprompt.md` |
| Feature → marketing message translation | `messaging/feature_to_outcome_translation.md` | `messaging/value_prop_builder.md` |
| Homepage copy | `website/homepage_masterprompt.md` | `messaging/narrative_house.md` |
| Landing pages | `website/landing_page_masterprompt.md` | `website/conversion_copy_controller.md` |
| Industry-specific pages | `website/industry_pages_masterprompt.md` | `messaging/feature_to_outcome_translation.md` |
| Competitor comparison pages | `website/comparison_pages_masterprompt.md` | `research/competitor_messaging_analysis.md` |
| LinkedIn paid ads | `campaigns/linkedin_ads_masterprompt.md` | `visual/ad_creative_prompt_library.md` |
| Retargeting campaigns | `campaigns/retargeting_masterprompt.md` | `visual/ad_creative_prompt_library.md` |
| Feature or product launch campaign | `campaigns/launch_campaign_masterprompt.md` | `campaigns/campaign_architecture_masterprompt.md` |
| Sales deck | `sales/sales_deck_masterprompt.md` | `messaging/narrative_house.md` |
| Demo script | `sales/demo_script_masterprompt.md` | `research/objections_and_pains.md` |
| Objection handling | `sales/objection_handling_masterprompt.md` | `research/objections_and_pains.md` |
| ICP and persona definition | `research/icp_persona_builder.md` | `research/jobs_to_be_done_research.md` |
| Competitor research | `research/competitor_messaging_analysis.md` | `strategy/positioning_masterprompt.md` |
| Visual brand system | `visual/brand_visual_system.md` | `visual/visual_direction_controller.md` |
| Ad creative generation | `visual/ad_creative_prompt_library.md` | `visual/brand_visual_system.md` |
| Measurement and KPIs | `analytics/measurement_framework.md` | `analytics/funnel_kpi_masterprompt.md` |
| Marketing experiments | `analytics/experiment_backlog_masterprompt.md` | `analytics/measurement_framework.md` |
| Content quality review | `governance/content_quality_checklist.md` | `governance/terminology_and_positioning_guardrails.md` |
| Terminology and tone review | `governance/terminology_and_positioning_guardrails.md` | `SYSTEM.md` |
| Localization of marketing assets | `governance/localization_marketing_rules.md` | `messaging/brand_messaging_framework.md` |
| Feature marketing value assessment | `marketing_values/` folder | `messaging/feature_to_outcome_translation.md` |

---

## marketing_values/ folder — mandatory for every feature delivery

Every time a new product feature or significant improvement is shipped, a new file MUST be created in `marketing/marketing_values/` documenting the marketing-relevant impact.

**File naming:** `YYYYMMDD_vX.Y.Z_feature-slug_marketing_value.md`

**Required contents of each marketing_values file:**
1. Feature name and version
2. The operational problem it solves (in user language, not technical language)
3. Target persona(s) who benefit most
4. Marketing-ready 1-sentence description
5. Claim types it enables (time saving, error reduction, visibility, compliance, etc.)
6. Content angles it suggests (LinkedIn post ideas, SEO topic, case study hook)
7. Which marketing files should be updated or re-run based on this feature
8. Funnel stage relevance (awareness / consideration / conversion / retention)

This folder is the bridge between product development and marketing. It allows marketing AI agents to understand what has been built, what can be claimed, and what content should be produced next.

---

## Integration with product development

This marketing system must be used alongside the product development governance in:
- `AI_EXECUTION_PROMPTS.md` — engineering session governance
- `CHANGELOG.md` — authoritative feature registry
- `versioning/*.md` — delivery artifacts

When a feature is delivered:
1. A `versioning/*.md` file is created (engineering record)
2. A `marketing_values/*.md` file is created (marketing record)
3. Both are committed together or in the same release cycle

Marketing AI agents should read `marketing_values/` folder entries to stay current on what product capabilities exist and what claims can be made.

---

## Founder-led growth doctrine

The founder should be positioned as a practical operational expert who has observed real workplace dysfunction, not as a motivational influencer or startup evangelist.

Founder content should:
- Describe real patterns of organizational friction observed in SMBs
- Teach better coordination and management habits
- Expose the hidden cost of informal, manual processes
- Connect insights back to Effectime only after genuine value has been given
- Never open with "excited to announce" or close with "thoughts?"

---

## Output quality bar

Every marketing output must be:
- **Specific** — no generic B2B SaaS language that could apply to any product
- **Outcome-driven** — connects to a real business result a manager or HR person cares about
- **Credible** — no overclaiming, no hype, no unverifiable superlatives
- **Reusable** — structured so it can be adapted across channels and formats
- **Connected** — audience + pain + message + proof + CTA + channel all linked

---

## Global guardrails

Never produce outputs that:
- Reduce Effectime to a feature list
- Use language that sounds like every other HR platform
- Suggest campaigns without explaining the audience, objective, and channel logic
- Make claims the product cannot yet substantiate
- Create disconnected visuals and copy (visual system and messaging must be aligned)
- Recommend vanity content without pipeline or trust-building value
- Use startup hype language unanchored to operational outcomes
