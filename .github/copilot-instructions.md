# SCD ColicoDerviese — GitHub Copilot repository instructions

## Binding sources
Before any write:
1. Read `SCD_SYSTEM_MANIFEST.json` (machine-readable normative authority).
2. Read `AGENTS.md` (operating gate and agent rules).
3. Run/verify `SCD:STATE`. No verified state means read-only analysis only.

If any instruction conflicts with the manifest, the manifest wins.

## Portfolio gate
Before creating or reclassifying an application, read `config/ai-portfolio.v1.json`.
The portfolio is exactly 4 apps: 3 SCD + 1 Maglia. Do not create a fifth app without explicit Direction approval.
For SCD work, route modules to SCD Universe, Sponsor & Partner Platform, or Command Platform R22 according to the registry.
C.E.P.A. and Maglia 360 are one unified Maglia web app on `ai-maglia360-cepa-unified`.

## Product doctrine
This repository is the canonical codebase for the **SCD UNIVERSE / SCD ColicoDerviese Super App / Digital Club Operating System**.
It is ONE product.

Sponsor, Command Platform, Commercial/Lia, Private Desk, Facility, Social and similar SCD scopes are modules/capabilities/workbenches that converge into the single product unless Direction explicitly approves separation.

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

Run `SCD:VISUAL-GATE` mentally before implementation and in review.

Reject generic SaaS/admin templates, obsolete portal layouts, anonymous grey dashboards, generic card grids, brochure-style hero pages, framed-phone desktop layouts and fake service/live states.

The target is `SPATIAL_SPORT_EDITORIAL_HIGH_IMPACT`: modern sports product, synthetic spatial atmosphere, purposeful motion, real next actions, adaptive responsive composition and unmistakable SCD identity.

A legacy visual may be `REBUILD_IMPROVE`: preserve valid backend/data/security/contracts while rebuilding presentation and interaction. Do not restart the product from zero.

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
