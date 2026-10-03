# AI CONTINUOUS EXECUTION PROTOCOL — 4 APP PORTFOLIO

## Rule zero

Always read `config/ai-portfolio.v1.json` before creating an app, branch, issue or session.

The portfolio is exactly:
1. SCD Universe / Super App
2. SCD Sponsor & Partner Platform
3. SCD Command Platform R22
4. Maglia 360 + C.E.P.A.

## Shared loop

Every session executes the next safe block:

`STATE -> READ CURRENT APP MANIFEST -> REVIEW OPEN WORK -> CLASSIFY -> IMPLEMENT OR AUDIT -> TEST -> SECURITY -> VISUAL QA WHEN UI -> UPDATE DOCS -> DRAFT PR -> EVIDENCE -> NEXT_SAFE_ACTION`

Never create a new app to solve a module problem.

## SCD-01 session prompt

```
Work on SCD_UNIVERSE from branch r57-copilot-control-plane.
Read SCD_SYSTEM_MANIFEST.json, AGENTS.md, config/ai-portfolio.v1.json, docs/SCD_UNIVERSE_MASTER_BUILD.md, docs/SCD_VISUAL_EXPERIENCE_MASTER.md and the current R57 issues/PRs.

Continue the next safe R57/R58 work block without starting from zero.
Preserve R38-R56 data contracts, identity, source provenance, security and valid functionality.
Segreteria, Facility, Tornei, Private Desk, SCD Week, Calendar, Teams, Matchday, Social, Twin/Mirror and material operations are modules of this app, not new apps.

Use KEEP / ENHANCE / FIX / INTEGRATE / COMPLETE / REMOVE_WITH_REASON and REBUILD_IMPROVE for obsolete UI.

Do not merge, deploy, apply production migrations, change DNS/secrets/roles, invent data or fake Smart Facility states.
Run relevant tests and leave a draft PR/evidence with SAFE_NEXT_ACTION.
```

## SCD-02 session prompt

```
Work on SCD_SPONSOR_PLATFORM from branch ai-scd-sponsor-platform.
Read APP_AI_MANIFEST.md, SCD_SYSTEM_MANIFEST.json, AGENTS.md and config/ai-portfolio.v1.json.

Continue the Sponsor & Partner Platform as its own SCD companion web app.
Public: partnership/territory/opportunities/LED/events/convenzioni/fondo.
Private: CRM/stakeholders, commercial pipeline, Sponsor Operations, Lia Sponsor, assets, proof/reporting.

Recover useful Commercial/Lia work from r42-commercial-development-os or ai-scd-commercial-lia only when it improves this app. Do not create a separate Commercial/Lia app.
Preserve real sources and exact sponsor status. No invented prospects-as-sponsors, values, contracts or deadlines.
Modernize obsolete UI with REBUILD_IMPROVE, keep backend/data contracts.
No merge/deploy/production mutation.
```

## SCD-03 session prompt

```
Work on SCD_COMMAND_R22 from branch ai-scd-command-r22.
Read APP_AI_MANIFEST.md, SCD_SYSTEM_MANIFEST.json, AGENTS.md, platform/README.md and config/ai-portfolio.v1.json.

Continue Command Platform R22 as the SCD technical orchestration application.
Focus on command registry, schemas, auth, R20 bridge, idempotency, jobs, event/audit flow, queue/worker, rollback, observability and safe AI command adapters.
It is not a second source of truth and not the public Super App.
Do not accept development auth in production.
No merge/deploy/production mutation.
```

## MAGLIA-01 session prompt

```
Work on MAGLIA_360_CEPA from branch ai-maglia360-cepa-unified.
Read APP_AI_MANIFEST.md, docs/MAGLIA360_CEPA_MASTER.md and .github/copilot-instructions.md.

Treat C.E.P.A. public + MAGLIA 360 private as ONE Maglia Assicurazioni web app.
Use cepa-maglia-os-hosting as canonical source and maglia360-office-architecture-v2 only as historical capability reference.

Public C.E.P.A.: project, themes, events, Center/SAP/territory, collaboration.
Private Maglia 360: control room, partners/products, collaborators, CEPA governance, documents, Lia Workbench, AI Mail/Chat, Network Radar, development, activities/deadlines, Recovery.

Do not split CEPA and Maglia360 again.
Do not create parallel CRM/auth/document systems.
Do not invent customer/policy/financial/regulatory/event data.
Modernize obsolete UI while preserving business logic and role boundaries.
No merge/deploy/production mutation.
```

## Handoff rule

At the end of each agent block, always write:
- CURRENT_STATE
- WORK_COMPLETED
- FILES_CHANGED
- TESTS
- BLOCKERS
- NEXT_SAFE_ACTION
- EXACT_BRANCH
- EXACT_PR

The next session starts from that handoff instead of re-auditing the whole world.
