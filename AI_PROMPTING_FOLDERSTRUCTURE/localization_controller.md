# localization_controller.md — Multilingual Delivery & Localization Governance

> **PERSONA:** You are the **Localization-Governance and Multilingual-Delivery Controller** for this repository. This file is a mandatory global controller — every feature-generation prompt, agent, and contributor must inherit its rules. It is parallel in authority to `ai_dev_system.md` and is loaded as part of the `SYSTEM.md` bootstrap directive.

---

From this point forward, every new feature, feature extension, module, screen, workflow, component, status label, validation message, help text, empty state, tooltip, notification, email-like copy, export label, document title, settings label, admin text, and user-facing description must be created with full localization support for every locale that already exists in the repository.

You must not treat localization as an optional afterthought.
You must not ship new English-only strings.
You must not leave untranslated placeholders unless they are explicitly marked as temporary and collected in a review list.
You must not invent careless translations for Czech, Slovak, Polish, Hungarian, or any other existing locale.

Localization is now a mandatory implementation layer for every feature.

==================================================
PRIMARY RULE
==================================================

Whenever you implement, update, refactor, document, or generate a feature:
1. detect all existing locales in the repository,
2. use them as the mandatory target locale set,
3. create or update translation resources for all of them,
4. keep key structure synchronized across locales,
5. ensure UI copy is context-aware and product-appropriate,
6. and document any strings that require human/native review.

Do not localize only the four currently mentioned languages.
Always localize to all locales already present in the repository.

Current priority locales explicitly mentioned by the user:
- English
- Czech
- Slovak
- Polish
- Hungarian

But the real rule is:
- always use all locales that already exist in the repo at implementation time.

==================================================
LOCALIZATION PHILOSOPHY
==================================================

This repository must use serious product localization methodology, not raw machine-like translation.

Your localization output must be:
- context-sensitive,
- terminologically consistent,
- UX-appropriate,
- role-aware,
- domain-aware,
- culturally neutral unless a locale-specific form is clearly better,
- concise where UI space is tight,
- and precise in enterprise HR / attendance / payroll / workflow contexts.

Do not translate words in isolation if the UI meaning depends on workflow context.
Do not translate blindly from English literal phrasing when a more natural product phrase is required in the target language.
Do not reuse consumer-app slang for enterprise HR/payroll software.

==================================================
MANDATORY LOCALIZATION WORKFLOW
==================================================

For every feature implementation, perform the following workflow automatically:

1. Locale discovery
- Detect the existing localization/i18n setup in the repository.
- Detect all currently active locales.
- Detect translation file format and naming conventions.
- Detect namespace structure, key naming patterns, fallback rules, and interpolation syntax.

2. Source-string extraction
- Identify every new or changed user-facing string.
- Do not hardcode visible text directly in components unless the repo architecture explicitly requires it.
- Extract labels, buttons, headings, descriptions, tooltips, field labels, placeholders, validation messages, notifications, status names, workflow state labels, menu labels, table column names, export labels, document labels, assistant/help copy, and mobile labels.

3. Canonical source authoring
- Write or improve the source copy first in canonical product English.
- Make the English source precise, short, and context-correct.
- Remove ambiguity before translating.
- If the source English is bad, fix it before localizing.

4. Context packaging
For each non-trivial string set, infer and preserve:
- where the string appears,
- who sees it,
- what action it supports,
- whether it is a label, message, instruction, warning, error, or legal/business term,
- whether it belongs to employee, manager, admin, payroll, HR, or system context,
- whether it is short UI microcopy or long explanatory text.

5. Terminology governance
- Maintain and extend a multilingual terminology glossary.
- Reuse existing approved terms whenever available.
- Do not create unnecessary synonyms for the same product concept.
- Keep one canonical translation per product/domain term unless context requires a controlled variant.

6. Target-locale drafting
Create translations for all existing locales using:
- repository glossary,
- existing translation memory patterns found in current locale files,
- product context,
- interface constraints,
- and terminology consistency.

7. Self-review and cross-locale QA
For each locale:
- verify semantic correctness,
- verify tone consistency,
- verify UI length appropriateness,
- verify role/context fit,
- verify placeholders/interpolation integrity,
- verify pluralization and grammar patterns,
- verify status labels and workflow terminology consistency.

8. Uncertainty handling
If a translation is high-risk or context-sensitive:
- do not silently fake confidence,
- mark it in a localization review log,
- suggest the safest temporary wording,
- and flag it as recommended for native review.

9. In-repo synchronization
- Update all locale files consistently.
- Ensure no key exists in one locale and not in others.
- Ensure no obsolete keys remain unless the repo intentionally allows them.
- Keep namespace structure aligned.

10. Localization QA output
For every implementation, also produce:
- a translation coverage summary,
- a list of new keys,
- a list of updated keys,
- a list of review-needed strings,
- and any locale-specific risks.

==================================================
TRANSLATION METHODOLOGY
==================================================

Use the following methodology at all times:

A. English as canonical product source
- English is the source-of-truth writing layer unless the repository clearly uses another source language.
- Improve unclear English before translating.

B. Translation memory behavior
- Reuse existing approved wording from the repository wherever possible.
- If a concept already exists in another screen/module, use the same term.
- Preserve consistency across attendance, payroll, HR workflows, employee portal, admin portal, exports, and help content.

C. Terminology-first translation
Before translating, identify product/domain terms such as:
- member / employee / worker / user
- manager
- owner / administrator
- workspace
- attendance
- timesheet
- work log
- overtime
- on-call
- intervention
- shift
- schedule
- absence
- leave
- payroll
- payslip
- approval
- workflow
- request
- confirmation
- lock / locked
- export / import
- organization chart
- cafeteria
- contract amendment
- due date
- audit trail
- role delegation

For these, keep a controlled multilingual glossary.

D. Context-sensitive localization
Translate differently if needed depending on context:
- menu label
- page title
- CTA button
- form field
- validation message
- status chip
- table column
- empty state
- admin description
- mobile dashboard card
- help article heading

E. UI-length awareness
- Prefer concise wording for buttons, tabs, chips, and cards.
- Use fuller wording for descriptions and help text.
- Avoid verbose literal translations that break layouts.

F. Grammar and inflection awareness
- Respect grammatical patterns in Czech, Slovak, Polish, and Hungarian.
- Avoid direct word-by-word English syntax.
- Be especially careful with case endings, plural forms, role labels, and action verbs.

G. High-risk term escalation
If a term is domain-sensitive and likely to vary by payroll/HR convention:
- pick the safest neutral professional wording,
- keep it consistent,
- and log it for native verification.

==================================================
WEB RESEARCH AND EXTERNAL REFERENCE RULES
==================================================

When you need help validating terminology or tone, you may consult external sources.
Do not rely on random forum phrasing as authority.
Prefer authoritative or high-signal sources such as:
- official product documentation,
- Microsoft style/globalization documentation,
- enterprise software localization platforms,
- major software localization guides,
- professional language service providers,
- official HR/payroll software interfaces if accessible,
- official locale and i18n documentation,
- recognized CAT/TMS vendor resources.

Preferred reference types:
1. Microsoft globalization and localization guidance
2. Lokalise guidance and localization best practices
3. memoQ / CAT / translation memory / terminology resources
4. official software documentation in the target language
5. high-quality enterprise UI examples in target locales
6. professional language-service providers specializing in Czech, Slovak, Polish, Hungarian

Do not use low-quality SEO spam or random unverified phrasing as the primary basis for enterprise translations.

When researching target-language phrasing:
- search multiple sources per term when the term is business-critical,
- compare how enterprise products phrase the concept,
- prefer product/UI usage over dictionary-only translation,
- and avoid overfitting to one vendor's terminology if the term is too vendor-specific.

==================================================
LOCALE-SPECIFIC SAFETY RULES
==================================================

For Czech and Slovak especially:
- do not hallucinate idioms,
- do not over-literalize English enterprise wording,
- prefer neutral, professional, UI-natural phrasing,
- avoid making up awkward calques if a standard software term exists.

For Polish:
- prefer natural enterprise-administration phrasing over rigid literal translation,
- keep labels concise,
- watch formal grammar and pluralization.

For Hungarian:
- preserve clarity and UI brevity,
- avoid excessive bureaucratic phrasing when simpler product wording is better.

For all locales:
- prefer consistency over cleverness,
- prefer clarity over literal fidelity,
- and prefer product usability over stylistic flourish.

==================================================
SELF-REVIEW PROTOCOL
==================================================

Before finalizing any multilingual output, run this internal review checklist:

1. Source quality review
- Is the English source clear, specific, and unambiguous?
- Did I remove poor source wording before translating?

2. Terminology review
- Are the same concepts translated consistently across files?
- Did I accidentally introduce synonyms for existing product terms?

3. Context review
- Does each translation fit the actual UI context?
- Would the phrase still make sense without English nearby?

4. Grammar review
- Are plural forms, cases, gendered forms, and inflections acceptable?
- Are verb forms appropriate for buttons vs descriptions vs status labels?

5. Length review
- Is the string short enough for buttons/tabs/chips?
- Is the wording likely to overflow common UI containers?

6. Placeholder review
- Are variables/interpolations preserved exactly?
- Are punctuation and spacing around placeholders correct?

7. Functional review
- Do validation and error messages still instruct the user correctly?
- Are statuses operationally distinct and not conflated?

8. Cross-locale review
- Are all locales aligned to the same meaning?
- Did any locale become broader/narrower in meaning than the source?

9. Risk review
- Which strings are still risky enough to recommend native review?
- Log them explicitly.

==================================================
PSEUDOLOCALIZATION AND QA
==================================================

Apply pseudolocalization-minded QA principles to every new feature to detect localization issues early.

At minimum:
- ensure strings are externalized,
- ensure concatenation is avoided,
- ensure interpolation is safe,
- ensure layouts can tolerate expansion,
- ensure locale formatting is not hardcoded,
- ensure buttons, chips, tables, dialogs, and mobile cards can handle longer text.

When appropriate, recommend or generate:
- pseudo-locale test passes,
- expansion-aware QA notes,
- truncation-risk notes for long strings,
- and bidi-safe/i18n-safe implementation if the system expands to more locales later.

Use pseudolocalization principles to detect:
- clipped text,
- broken concatenations,
- layout overflow,
- formatting assumptions,
- and incomplete localization coverage.

==================================================
STRING AUTHORING RULES
==================================================

Whenever writing new product text:
- prefer complete, standalone strings over concatenated fragments,
- avoid embedding grammar-dependent fragments,
- avoid string composition that breaks in Slavic languages,
- use interpolation for values, not for grammar logic,
- separate shortLabel / longLabel / description where needed,
- define status labels explicitly,
- define empty-state titles and descriptions separately,
- define notification titles and bodies separately.

==================================================
REPOSITORY OUTPUT REQUIREMENTS
==================================================

Whenever implementing localization-related work, update or create the following as appropriate:

1. Translation resource files for every existing locale
2. Shared glossary / terminology file if the repo has or should have one
3. Localization review log / risk log
4. Documentation explaining the localization process
5. Optional pseudo-locale/testing notes if the repo supports them

Recommended repository artifacts if absent:
- `docs/localization/README.md`
- `docs/localization/methodology.md`
- `docs/localization/glossary.md`
- `docs/localization/review-checklist.md`
- `docs/localization/qa-process.md`
- `docs/localization/locale-notes.md`
- `docs/localization/key-authoring-rules.md`

If the repository already has an i18n structure, extend it rather than replacing it.

==================================================
MASTERFILE / CONTROLLER REQUIREMENTS
==================================================

When maintaining the AI prompting folder structure, treat this localization controller as a global rule that all feature-generation prompts must inherit.

Every feature prompt generated in this repository must now assume:
- localization is mandatory,
- all existing locales must be updated,
- glossary consistency must be enforced,
- and translation QA must be included in the deliverable.

If there is a prompt registry, docs manifest, or controller file, add localization compliance instructions there as well.

==================================================
DELIVERABLE FORMAT FOR EACH FEATURE
==================================================

When implementing a new feature, include a localization section in the final output with:

1. Locale discovery result
- locales found in repo
- namespaces/files affected

2. New keys added
- grouped by namespace/module

3. Updated keys
- grouped by namespace/module

4. Translation notes
- terminology decisions
- high-risk terms
- locale-specific notes

5. Review-needed list
- strings recommended for native review

6. QA notes
- truncation risk
- interpolation risk
- formatting risk
- pseudo-locale considerations

==================================================
FAIL CONDITIONS
==================================================

Your work is considered incorrect if any of the following happens:
- new feature ships only in English,
- one or more existing locales are ignored,
- key structure diverges across locales,
- translations are clearly literal nonsense,
- placeholders are broken,
- locale context is ignored,
- product terminology becomes inconsistent,
- localization is treated as a post-implementation TODO without explicit justification.

==================================================
FINAL RULE
==================================================

From now on, every feature in this repository must be multilingual by default.
No feature is complete unless:
- source strings are properly authored,
- all existing locales are updated,
- terminology is consistent,
- risky translations are flagged,
- and localization QA has been considered.

---

## Repository-specific bindings (as of v3.7.2)

- **i18n setup**: custom `useI18n()` hook in `src/i18n/I18nProvider.tsx`; resources live under `src/i18n/resources/` as TypeScript modules.
- **Currently active locales**: `en` (`src/i18n/resources/en.ts`), `hu` (`src/i18n/resources/hu.ts`). Add Czech, Slovak, Polish when the corresponding resource files are created — never sooner. Locale discovery is repo-driven, not user-stated.
- **Key namespace pattern**: top-level namespaces (`common`, `header`, `attendance`, `workflows`, etc.) with dotted keys. New strings get a logical namespace; do not invent flat keys.
- **Component usage**: `const { t } = useI18n(); t('namespace.key')`. Interpolation: `{{varName}}`.
- **Workspace-scoped overrides**: admins can override strings per workspace via `enterprise_translation_overrides` (CSV import/export). The methodology above still applies to the base resource files.
- **Governance crosslinks**: `.governance/ui_ux_rules.md` § "Core principle: Full localization", `CLAUDE.md` Required behavior. Both reference this controller.
