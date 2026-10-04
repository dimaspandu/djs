# Changelog

## [1.1.0] - 2026-10-04

### Added
- Add `src/` as the latest runtime snapshot, a full mirror of `1.0.2/`
- Support `.jsx` in `isSupportedExtension()` on `src/template.js` and `src/runtime.js`
- Add `scripts/serve.js`, a zero-dependency static server for browser test runs
- Add `package.json` with `npm test`, `npm run test:browser`, and `npm run test:browser:native`
- Add `.gitignore` for local agent tooling directories (Kilo, Claude Code, Codex, Cursor, Gemini, Aider, Windsurf, Roo) and `node_modules/`

### Documentation
- Document the supported extension list and where to change it
- Document `src/` as the rolling snapshot and how it relates to immutable version folders
- Document browser testing commands and the requirement to serve over HTTP

### Notes
- `1.0.0/`, `1.0.1/`, `1.0.2/`, and root files are unchanged for backward compatibility
- `src/test.html` now labels itself `1.1.0`

## [1.0.2] - 2026-05-28

### Documentation
- Rename project title from "Distributed JavaScript Modules" to "Distributed JavaScript Runtime"
- Add explanation for "Why Distributed?" to clarify the naming concept
- Update `requireByHttp` documentation with clear examples for:
  - Relative paths within same bundle
  - External URLs with custom namespace
- Add ngapack integration example showing ESM to DJS transformation
- Clarify that namespace is resolved via dependency mapping, not direct argument