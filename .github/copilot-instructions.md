# SCD ColicoDerviese — GitHub Copilot repository instructions

## Binding sources
Before any write:
1. Read `SCD_SYSTEM_MANIFEST.json` (machine-readable normative authority).
2. Read `AGENTS.md` (operating gate and agent rules).
3. Run/verify `SCD:STATE`. No verified state means read-only analysis only.

If any instruction conflicts with the manifest, the manifest wins.

## Product doctrine
This repository is the canonical codebase for the **SCD Digital Club Operating System**.
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

## Data and security
- Never invent sports, administrative, commercial, medical, identity, schedule, sponsor, or financial data.
- Missing verified data must fail closed or be clearly shown as unavailable/pending.
- Preserve provenance and source authority.
- Authorization must be enforced server-side. Hidden UI is not authorization.
- Never expose secrets, passwords, PINs, alarm codes, API credentials, private documents, safeguarding data, or raw sensitive location.
- No autonomous production changes to roles, permissions, payments, registrations, attendance, personal data, documents, safeguarding, DNS, or secrets.
- No unsupervised adult-minor 1:1 communication features.
- No public ranking or profiling of minors.

## Engineering workflow
Use:
`STATE -> REQUIREMENTS -> EXISTING SYSTEM CHECK -> DATA CONTRACT -> IMPLEMENT -> TEST -> PR -> REVIEW -> MERGE -> DEPLOY -> PRODUCTION EVIDENCE`.

Work on a branch. Do not write directly to `main`.
Do not merge or deploy production without explicit human authorization.

For architectural/contract changes, update the manifest in the same PR.

## Required validation
At minimum for relevant changes:
- `npm run test:manifest`
- targeted contract tests for the changed domain
- `npm run check` before release-candidate status
- syntax checks and regression checks
- responsive/accessibility validation for UI changes
- auth/RLS/security verification for private/data changes

A feature is not complete until its status is accurately described:
`DESIGNED`, `IMPLEMENTED`, `TESTED`, `DEPLOYED`, `PRODUCTION_VERIFIED`.

## UI / product rules
Public surfaces prioritize emotion, media, live information, discovery, territory and community.
Private surfaces prioritize speed, clarity, density, priority, decision, context and control.
Mobile and desktop are responsive compositions of the same product, not separate products.
Do not turn desktop into a framed phone, and do not create generic SaaS-card walls.

## Agent output
For meaningful engineering work report:
- CURRENT_STATE
- AFFECTED_CAPABILITIES
- CLASSIFICATION
- DATA_SOURCES
- SECURITY_IMPACT
- FILES_CHANGED
- TESTS_RUN
- RESULT
- KNOWN_LIMITATIONS
- ROLLBACK
- SAFE_NEXT_ACTION

Never claim success without evidence.
