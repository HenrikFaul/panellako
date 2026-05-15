# Change Intelligence Appendix

## Metadata
- Generated at: `__GENERATED_AT_ISO__`
- Repository: `__DERIVE_FROM_REPO__`
- Revision: `__DETECT_CURRENT_REVISION__`
- Confidence: `__SET_BY_GENERATOR__`

## Purpose
Capture historical insights from changelog, codinglessonslearnt, versioning, release notes, and migrations.

## Recommended sections
- Feature evolution
- Repeated bug classes
- Fragile modules
- Migration-sensitive areas
- Hidden business requirements
- Do-not-rebreak knowledge

## Change intelligence rules
Historical evidence must shape the generated documentation. It is not an appendix-only afterthought.

Analyze:
- changelog entries
- coding lessons
- release notes
- versioning artifacts
- migration notes
- incident notes
- old implementation prompts
- previous documentation

For each discovered lesson, record:
- affected feature or module
- repeated bug class or fragile behavior
- non-regression warning
- related docs that should mention it
- confidence level

If historical evidence conflicts with current code, current code wins, but the historical conflict must be documented as a caveat.

## Repository-relative rule
Use repository-relative evidence paths only.
