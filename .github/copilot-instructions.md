# SCD ColicoDerviese — GitHub Copilot repository instructions

## Binding sources
Before any write:
1. Read `SCD_SYSTEM_MANIFEST.json` (machine-readable normative authority).
2. Read `AGENTS.md` (operating gate and agent rules).
3. Read `config/user-directives.v1.json` (recovered explicit user-command requirements).
4. For UI/media/product work read `config/scd-visual-references.v1.json` and the canonical asset registry.
5. Run/verify `SCD:STATE`. No verified state means read-only analysis only.

If any instruction conflicts with the manifest, the manifest wins.

## User-command & Library recovery gate

Before substantial planning, coding, UI or product work:
- execute the `SCD:MEMORY-RECOVER` gate from `AGENTS.md`;
- start from the user's recovered explicit commands, not from an assistant-created shorthand;
- inspect relevant internal Library boards, screenshots, graphics, documents and real photos registered in `config/scd-visual-references.v1.json`;
- compare the current implementation against those references before inventing a new direction;
- treat recovered generated boards as design references unless explicit approval evidence is available;
- preserve factual integrity: sample people, fixtures, prices, benefits, sponsors or statuses visible in a board are not runtime facts unless verified separately;
- when implementation is requested and technically possible, a docs-only result is insufficient.

## Portfolio gate
Before creating or reclassifying an application, read `config/ai-portfolio.v1.json`.

The canonical portfolio is exactly:
- SCD ONE
- SCD CORE
- SCD GROW
- C.E.P.A. 360

SCD Command Platform R22 remains a shared technical engine and is not counted as a fifth business/end-user app.

All canonical apps must support `WEBAPP:MASTER` and their app-specific RUN command.

## Product doctrine
This repository contains the shared SCD engineering ecosystem. The SCD portfolio has three coordinated applications: **SCD ONE**, **SCD CORE**, and **SCD GROW**. A fourth application, **C.E.P.A. 360**, belongs to Maglia Assicurazioni. Shared engines such as R22, R20 and SCD PULSE support the portfolio but do not become extra apps.

Do not create a parallel app, database, authentication system, calendar, private desk, repository, or hosting stack when the existing SCD system can be extended safely.

Classify findings and proposed changes as:
`KEEP`, `ENHANCE`, `FIX`, `INTEGRATE`, `COMPLETE`, or `REMOVE_WITH_REASON`.

Prefer progressive evolution over rewrites.

## Canonical stack
- Code: GitHub repository `francesco1485/scd-colicoderviese-super-app`
- Runtime: Node >= 20
- Production web service: Render, branch `main`
- Operational DB/Auth/Realtime target: Supabase project SCD PULSE
- Existing operational identity/role engine: R20 remains authoritative until a verified migration is explicitly approved
- Back-office sources: Gmail and Google Drive
- Calendar: one canonical EVENT_ID projected into authorized views

Never treat a UI, chat channel, spreadsheet copy, WhatsApp message, or static fixture as a new source of truth.

## SCD:STATE hard gate
Before writes, verify and report:
- repository and current main SHA
- working branch
- open PRs / merge state
- CI or workflow evidence
- Render production commit/status
- Supabase project health and migration state
- manifest version
- known blockers
- safe next action

Use `VERIFIED`, `UNVERIFIED`, `NOT_AVAILABLE`, or `NOT_APPLICABLE`.

## Visual & experience gate

For every UI/product task also read:
- `docs/SCD_VISUAL_EXPERIENCE_MASTER.md`
- `config/scd-visual-system.json`
- `config/scd-visual-experience-gate.v1.json`
- `config/scd-visual-references.v1.json`

Run `SCD:VISUAL-GATE` mentally before implementation and in review.

Reject generic SaaS/admin templates, obsolete portal layouts, anonymous grey dashboards, generic card grids, brochure-style hero pages, framed-phone desktop layouts and fake service/live states.

The target is `SPATIAL_SPORT_EDITORIAL_HIGH_IMPACT`: modern sports product, synthetic spatial atmosphere, purposeful motion, real next actions, adaptive responsive composition and unmistakable SCD identity.

A legacy visual may be `REBUILD_IMPROVE`: preserve valid backend/data/security/contracts while rebuilding presentation and interaction. Do not restart the product from zero.

## Multifunctional developer command
For every canonical app, read `docs/AI_MULTIFUNCTIONAL_DEVELOPER_COMMAND.md` and apply `WEBAPP:MASTER`. App-specific shortcuts are `SCDONE:RUN`, `SCDCORE:RUN`, `SCDGROW:RUN`, `CEPA360:RUN`.

## Data and security
- Never invent sports, administrative, commercial, medical, identity, schedule, sponsor, facility, device or financial data.
- Missing verified data must fail closed or be clearly shown as unavailable/pending.
- Preserve provenance and source authority.
- Authorization must be enforced server-side. Hidden UI is not authorization.
- Never expose secrets, passwords, PINs, alarm codes, key/access codes, API credentials, private documents, safeguarding data, or raw sensitive location.
- No autonomous production changes to roles, permissions, payments, registrations, attendance, personal data, documents, safeguarding, DNS, or secrets.
- No unsupervised adult-minor 1:1 communication features.
- No public ranking or profiling of minors.

## Engineering workflow
Use:
`STATE -> REQUIREMENTS -> EXISTING SYSTEM CHECK -> DATA CONTRACT -> VISUAL GATE -> IMPLEMENT -> TEST -> PR -> REVIEW -> MERGE -> DEPLOY -> PRODUCTION EVIDENCE`.

Work on a branch. Do not write directly to `main`.
Do not merge or deploy production without explicit human authorization.

For architectural/contract changes, update the manifest in the same PR.

## Required validation
At minimum for relevant changes:
- `npm run test:manifest`
- targeted contract tests for the changed domain
- `npm run check` before release-candidate status
- syntax checks and regression checks
- responsive/accessibility/visual regression validation for UI changes
- auth/RLS/security verification for private/data changes

A feature is not complete until its status is accurately described:
`DESIGNED`, `IMPLEMENTED`, `TESTED`, `DEPLOYED`, `PRODUCTION_VERIFIED`.

## UI / product rules
Public surfaces prioritize emotion, media, live information, discovery, territory and community.
Private surfaces prioritize speed, clarity, density, priority, decision, context and control.
Mobile and desktop are responsive compositions of the same product, not separate products.

Smart Facility surfaces must distinguish verified connected services from READY_FOR_ADAPTER / NOT_CONNECTED / UNVERIFIED / MANUAL_CHECK_REQUIRED states. Never simulate a device integration as real.

## Agent output
For meaningful engineering work report:
- CURRENT_STATE
- AFFECTED_CAPABILITIES
- CLASSIFICATION
- VISUAL_CLASSIFICATION
- DATA_SOURCES
- SECURITY_IMPACT
- FILES_CHANGED
- TESTS_RUN
- VISUAL_QA
- RESULT
- KNOWN_LIMITATIONS
- ROLLBACK
- SAFE_NEXT_ACTION

Never claim success without evidence.


## Cumulative project memory

Before substantial planning, implementation or audit work, also read:
- `docs/SCD_COPILOT_OMNIBUS_DIRECTIVE.md`

This file consolidates the accumulated user directives, operating model, club workflows, portfolio boundaries, engineering doctrine, UX rules, automation priorities, source-of-truth requirements, safeguarding constraints and long-horizon product intent.

Rules:
- treat it as cumulative context, subordinate to `SCD_SYSTEM_MANIFEST.json`, `AGENTS.md` and `config/ai-portfolio.v1.json`;
- do not silently drop earlier valid requirements;
- if historical naming conflicts with the current machine-readable portfolio, document the drift and follow the current portfolio authority;
- when a broad user command asks to continue or complete development, execute the relevant app-specific RUN under `WEBAPP:MASTER`, using the omnibus directive as persistent project context;
- never convert archived chat context into operational truth unless it is backed by a canonical repository/data source or clearly labeled as proposal/history.


## Specialist agent routing

Read `config/scd-agent-orchestration.v1.json` for cross-domain tasks.
Use the specialist agents under `.github/agents/` rather than collapsing every discipline into one generic implementation pass.

For architecture planning also read:
- `docs/SCD_360_ARCHITECTURE_DECISION.md`
- `docs/SCD_GRAPH_FABRIC_ARCHITECTURE.md`
- `docs/SCD_AUTOMATION_PLANE.md`

SCD Master coordinates all specialist outputs. No specialist may introduce a parallel database, auth system, calendar, CRM or source of truth.
