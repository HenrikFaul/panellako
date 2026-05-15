# Template Usage Notes

This docs pack is a starter scaffold for repository-driven documentation generation.

## Single entry rule
Give the AI only `./SYSTEM.md` first.

`./SYSTEM.md` is responsible for loading this usage note, `./claude-code-docs-masterprompt.md`, `./HELP_MENU_MASTERFILE_TEMPLATE.json`, and every document template in the correct order.

If `../AI_PROMPTING_FOLDERSTRUCTURE/docs/README.md` exists in the same repository, `./SYSTEM.md` also loads that bridge so Product-Engineering OS documentation-governance rules and this document-generation pack work together.

## Repository-relative path rule
All generated paths must be relative to the repository root. Do not write local machine paths into generated docs, manifests, reports, or usage instructions.

Forbidden path styles:
- drive-letter absolute paths
- operating-system user-home absolute paths
- local desktop/download paths
- workstation-specific repository checkout paths

Allowed examples:
- `docs/DOC_INDEX.md`
- `docs/HELP_MENU_MASTERFILE.json`
- `docs/docx/USER_MANUAL.docx`
- `./USER_MANUAL.md`

## Dynamic placeholders
The generator must replace these placeholders at generation time:
- `__DERIVE_FROM_REPO__`
- `__DETECT_DEFAULT_BRANCH__`
- `__DETECT_CURRENT_REVISION__`
- `__GENERATED_AT_ISO__`
- `__SET_BY_GENERATOR__`

## Repository name rule
Do not hardcode the repository name.
Resolve it dynamically in this order:
1. Git remote origin repository name
2. Top-level package/app manifest name
3. Workspace root directory name
4. Fallback: `unknown-repository`

## Recommended implementation notes
- Keep `docs/HELP_MENU_MASTERFILE.json` as the canonical manifest.
- Use `./HELP_MENU_MASTERFILE_TEMPLATE.json` as the starter shape for that manifest.
- Keep markdown as the source of truth even if DOCX mirrors are generated.
- Refresh `generatedAt` and `analyzedRevision` on every generation run.
- Do not rely on filenames alone when metadata is available in the masterfile.
