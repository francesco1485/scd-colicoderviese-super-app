# Third-party design skills

Design and motion skills vendored for agents working in this repository (local sessions and the nightly build agent).
They guide design quality only; they never override `AGENTS.md`, `SCD_SYSTEM_MANIFEST.json`, the SCD visual rules
(official assets only, realistic 3D characters, no children's faces, palette derived from the official crest) or the approval gates.

| Folder | Upstream | Commit | License |
| --- | --- | --- | --- |
| `impeccable/` | https://github.com/pbakaus/impeccable (`.claude/skills/impeccable`) | d631a88 | Apache-2.0 (`impeccable/LICENSE`) |
| `taste-skill/`, `taste-redesign-skill/`, `taste-brandkit/`, `taste-imagegen-frontend-mobile/`, `taste-imagegen-frontend-web/`, `taste-image-to-code-skill/` | https://github.com/leonxlnx/taste-skill (`skills/*`) | 717446e | MIT (`LICENSE` in each folder) |
| `emil-design-eng/`, `emil-animate/`, `emil-review-animations/`, `emil-find-animation-opportunities/`, `emil-animation-vocabulary/`, `emil-improve-animations/`, `emil-break-ui/` | https://github.com/emilkowalski/skills (`skills/*`) | e8a175d | MIT (`LICENSE` in each folder) |

Vendored on 2026-10-10 without modification, apart from folder names. Impeccable's `scripts/` talk only to `localhost`;
do not run its `npx` updater or live-browser server in CI or production.

## Precedence for SCD work

1. `AGENTS.md` gates and the manifest.
2. SCD visual rules (`config/scd-visual-references.v1.json`, `config/scd-assets.v1.json`).
3. These skills, for craft: hierarchy, typography, spacing, colour systems, motion, polish and critique.

## ECC — Everything Claude Code (affaan-m/ECC @ b92f181, MIT)

Installed 2026-10-14 on Francesco's request ("Istalla e fai tutto"). Copied as plain Markdown, renamed with the `ecc-` prefix so they never collide with SCD or Anthropic skills. Not copied: ECC hooks, scripts, installers, MCP configs, rules packs (they would run third-party code on every tool call and conflict with this repo's `.claude/settings.json` hooks). SCD rules (AGENTS.md, manifest, minors, publish gates) always win over ECC text.

Skills: ecc-security-review, ecc-verification-loop, ecc-delivery-gate, ecc-browser-qa, ecc-accessibility, ecc-frontend-a11y, ecc-react-patterns, ecc-react-performance, ecc-react-testing, ecc-vite-patterns, ecc-postgres-patterns, ecc-database-migrations, ecc-e2e-testing, ecc-tdd-workflow, ecc-seo, ecc-production-audit, ecc-click-path-audit, ecc-market-research, ecc-marketing-campaign, ecc-content-engine, ecc-brand-voice, ecc-design-system, ecc-make-interfaces-feel-better, ecc-dashboard-builder, ecc-api-design, ecc-error-handling, ecc-deployment-patterns, ecc-canary-watch, ecc-ai-regression-testing, ecc-safety-guard, ecc-search-first, ecc-coding-standards, ecc-frontend-patterns, ecc-ai-first-engineering, ecc-agentic-engineering, ecc-change-impact

Agents (`.claude/agents/ecc/`): ecc-planner, ecc-architect, ecc-code-reviewer, ecc-security-reviewer, ecc-typescript-reviewer, ecc-react-reviewer, ecc-database-reviewer, ecc-e2e-runner, ecc-build-error-resolver, ecc-react-build-resolver, ecc-performance-optimizer, ecc-a11y-architect, ecc-silent-failure-hunter, ecc-tdd-guide, ecc-refactor-cleaner, ecc-code-simplifier, ecc-code-explorer, ecc-doc-updater, ecc-seo-specialist, ecc-marketing-agent, ecc-pr-test-analyzer, ecc-type-design-analyzer, ecc-agent-evaluator

License: `.claude/agents/ecc/LICENSE-ECC.txt` (MIT, Copyright (c) 2026 Affaan Mustafa).
