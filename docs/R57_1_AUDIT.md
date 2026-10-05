# R57.1 — SCD 360 Repository, Runtime & Governance Audit

**Audit date:** 2026-10-05  
**Working branch:** `r57-scd360-reconciliation`  
**Base:** current `main` at audit start: `1ecfaf861eac1306f7805a71dd15bb49808a63e7`

## SCD:STATE

| Area | State | Evidence |
|---|---|---|
| Main repository | VERIFIED | `francesco1485/scd-colicoderviese-super-app` |
| Main SHA | VERIFIED | `1ecfaf861eac1306f7805a71dd15bb49808a63e7` |
| Clean reconciliation branch | VERIFIED | `r57-scd360-reconciliation`, created from current main |
| Legacy control-plane branch | DIVERGED | `r57-copilot-control-plane` at `10c0cf24796eb723e7ddab49638bfb54896624b6`; 79 ahead / 3 behind vs main at audit |
| Legacy PR #82 | BLOCKED | open draft, non-mergeable |
| Audit PR #85 | STALE | snapshot predates current main and current portfolio decision |
| Production Evidence #286 | FAILED | failure only on `RENDER_HEALTH_COMMIT` |
| Pages in #286 | VERIFIED | HTTP 200, build 40.0.0, NG-0.7.0, manifest 3.26.0 |
| Render in #286 | STALE_DEPLOY_AT_CHECK | health returned commit `d16a658...` while expected `1ecfaf861...` |
| Supabase project | VERIFIED | SCD PULSE `ndevtxxijbcnskgysdit`, ACTIVE_HEALTHY, PostgreSQL 17.6.1 |
| Production DB migrations | DRIFT | live migration history ends at R53 |
| RLS advisory | OPEN | 14 RLS-enabled tables with no policy |
| FK index advisory | OPEN | 20 foreign keys without covering index in live DB |
| R20 authority | KEEP | remains identity/role/scope authority until verified cutover |
| Production mutation | NOT AUTHORIZED | no production DDL/auth/deploy performed by this reconciliation |

## EXECUTIVE_FINDINGS

1. Product direction is valid: one coherent SCD 360 ecosystem with SCD ONE, CORE and GROW as coordinated surfaces over shared identity, event, provenance and operational truth.
2. The legacy control-plane branch contains valuable governance but is structurally diverged. Reconciliation must be performed from current main, not by blindly merging the 79-commit branch.
3. Production Evidence #286 did not show a general outage. Pages, manifest, capabilities and related checks were healthy; Render was still reporting the previous main commit.
4. Supabase is a sound staged target but not the current full operational truth. Most domain tables contain zero rows and production migration history ends at R53.
5. RLS enabled without policy is fail-closed, not a completed authorization contract. Those 14 tables must remain unavailable until explicit role/scope policies are designed and tested.
6. R57.D1 index hardening exists in repository code, but live performance advisors still show the production indexes are not applied.
7. SCD ONE / CORE / GROW development can continue only through already-started slices and must not create duplicated people, CRM, calendar, task or document stores.
8. The expired 24h sprint must be treated as an incomplete sprint, not retroactively labeled delivery-ready.

## ARCHITECTURE DECISION

Canonical product model:

```text
SCD 360 DIGITAL CLUB OPERATING SYSTEM
├── SCD ONE  -> public / family / athlete / community / services
├── SCD CORE -> Direction / secretariat / sport / facilities / administration
└── SCD GROW -> sponsor / partner / territory / relationship development

SHARED, NON-DUPLICABLE CORE
├── PERSON_ID / FAMILY / ROLE / SCOPE
├── TEAM_ID / EVENT_ID / DOCUMENT_ID
├── source registry + provenance
├── audit/correlation IDs
├── R20 authority during transition
├── SCD PULSE staged data core
└── R22 orchestration and durable commands
```

Separate deployments are acceptable only as packaging. They do not create separate business truth.

## RUNTIME MAP

- Public/PWA: repository root build and Pages artifact.
- Node API bridge: `server.js` on Render.
- Current operational identity/role/scope: R20.
- Target data/auth/realtime: Supabase SCD PULSE under staged migration.
- Automation: existing Gmail/Drive/Calendar adapters plus R22 orchestration.
- Mobile: same canonical product logic; no duplicated business rules.

## PRODUCTION EVIDENCE #286 ROOT CAUSE

The failing job retried 20 times. Every retry reported only:

`RENDER_HEALTH_COMMIT`

Final observed Render health:
- HTTP 200;
- version 40.0.0;
- service `SCD Super App`;
- Render commit `d16a658786b7577af498a3104dc31ebdd17f7613`;
- expected commit `1ecfaf861eac1306f7805a71dd15bb49808a63e7`.

Interpretation: the verification gate caught deployment lag or non-advanced Render runtime. This is a release-evidence failure, not proof that Pages or Supabase were unhealthy.

## SUPABASE LIVE DRIFT

Production migrations currently listed:
- r33_club_graph_foundation
- r34_rls_performance_hardening
- r35_auth_context_rls_normalization
- r51_core_operative_engine
- r51_1_operative_index_hardening
- r53_football_social_private_core

No R54-R57 production migration is registered.

Live public schema contains 33 SCD tables with RLS enabled. 14 currently have no policies, including operational/private tables such as training, attendance, match performance, callups, messages, live match events, deadlines and fan/social/reward tables.

Rule: do not enable client/runtime paths to those tables until grants + policies + role tests are explicit.

## SCD_360_MODULE_MATRIX

| Module | Current state | Main risk | Next safe action |
|---|---|---|---|
| Direction / Control Room | EXISTING_BUT_INCOMPLETE | source diagnostics/task closure incomplete | finish CORE-02 on existing branch |
| People / Identity / Family | EXISTING_AND_KEEP / R20_PRIMARY | cutover drift | map one PERSON_ID and role scopes |
| Secretariat / Tesseramenti | EXISTING_BUT_INCOMPLETE | source fragmentation | practice workflow over existing stores |
| Medical / Eligibility | CONTRACT_ONLY / DATA_SOURCE_ONLY | sensitive data | explicit expiry/eligibility gate, no public exposure |
| Teams / Rosters | EXISTING_AND_KEEP | dual source risk | shared TEAM_ID |
| Matches / Matchday | EXISTING_AND_KEEP | runtime source freshness | source authority + EVENT relation |
| Calendar / EVENT Fusion | EXISTING_BUT_INCOMPLETE | conflict reconciliation | one EVENT_ID + review state |
| Convocations / Distinte | SCHEMA_READY_RUNTIME_UNVERIFIED | RLS missing policy | keep disabled until policy/test |
| Training / Attendance | SCHEMA_READY_RUNTIME_UNVERIFIED | RLS missing policy | role policy + staff-only runtime test |
| Performance | SCHEMA_READY_RUNTIME_UNVERIFIED | minors/privacy | staff-only, never public ranking |
| Discipline | DATA_SOURCE_ONLY / CONTRACT_ONLY | official-source authority | federation adapter + verified state |
| Facilities / Smart Facility | EXISTING_BUT_INCOMPLETE | fake IoT risk | manual/verified adapter states only |
| Warehouse / Kit / Laundry | EXISTING_BUT_INCOMPLETE | no canonical asset workflow | extend existing facility/asset structures |
| Transport / Trips | EXISTING_BUT_INCOMPLETE | minor/location privacy | scoped trip workflow |
| Administration / Finance | DATA_SOURCE_ONLY / CONTRACT_ONLY | sensitive financial data | reconcile existing sheets/contracts before schema |
| Contracts / Sports Work | DATA_SOURCE_ONLY | restricted documents | document registry + versioning |
| RASD / Compliance | DATA_SOURCE_ONLY | legal inference risk | evidence checklist, UNVERIFIED when missing |
| Privacy / Consent | EXISTING_BUT_INCOMPLETE | purpose mixing | separate mandatory notice vs optional media/marketing |
| Safeguarding | KEEP_ISOLATED | extreme confidentiality | separate restricted workflow only |
| Sponsor / CRM | EXISTING_BUT_INCOMPLETE | duplicate CRM | consolidate GROW and legacy Sponsor paths |
| SCD Card / SQUBy | INTEGRATION_ONLY | duplicate wallet | SQUBy remains wallet engine |
| Ticketing / Access | CONTRACT_ONLY | identity linkage | staged shared-person integration |
| Community / Families | EXISTING_AND_KEEP | minors communications | supervised scope-aware channels |
| Tournaments / Events | EXISTING_AND_KEEP | scope overemphasis | keep as one module, shared EVENT/logistics/economics |
| Media / Social | EXISTING_AND_KEEP | consent/provenance | verified content + consent gate |
| Gmail / Drive / Calendar | EXISTING_BUT_INCOMPLETE | state/retry | complete R57.A1 state machine |
| FIGC/LND/SGS/CRL/Tuttocampo | DATA_SOURCE_ONLY / PARTIAL | source conflicts | official-first normalized adapters |
| Audit / Data Quality / AI | EXISTING_BUT_INCOMPLETE | unsupported automation | provenance + human approval |

## AUTHORIZATION PRINCIPLES

- authorization server-side;
- R20 remains authoritative until explicit verified cutover;
- no `service_role` in browser;
- app authorization data must not rely on user-editable metadata;
- exposed Supabase tables need explicit RLS policies matching business scopes;
- safeguarding separated from ordinary dashboards;
- health/medical data minimized and never exposed publicly;
- no unsafe adult-minor private 1:1 communication design.

## BRANCH / PR RECONCILIATION

- Preserve main R57.A1 and R57.D1.
- Port control-plane governance into `r57-scd360-reconciliation`.
- Do not merge PR #82 as-is.
- Create a clean replacement draft PR from the reconciliation branch.
- PR #85 becomes historical audit evidence, not canonical current audit.
- ONE/CORE/GROW branches must rebase/integrate only after the governance baseline is stable.

## TEST STRATEGY

Required before merge recommendation:
1. `npm run test:manifest`
2. `npm run test:ai-portfolio`
3. `npm run test:supabase-contract`
4. `npm run test:r57-d1-graph`
5. targeted R57/CORE/ONE/GROW tests
6. full `npm run check`
7. PR policy checks
8. preview/browser QA where UI is changed
9. production evidence only after authorized merge/deploy

## PRODUCTION BLOCKERS

- Render commit evidence for current main not yet green.
- R53→current Supabase migration drift.
- 14 RLS-enabled/no-policy tables.
- 20 live FK index advisories.
- legacy control plane non-mergeable.
- stale audit PR #85.
- ONE/GROW integration PR conflicts.
- no current full delivery report for expired sprint.

## SAFE IMPLEMENTATION PLAN

1. Reconciliation branch + canonical governance.
2. Fresh R57.1 audit and matrices.
3. Draft replacement PR.
4. Re-run failed Production Evidence to see whether Render advanced.
5. Finish CORE-02, R57.A1 and R57.D1 as existing safe slices.
6. Reconcile ONE and GROW branches onto the stable baseline.
7. Only then open additional functional slices.

## ROLLBACK

All work in this reconciliation is branch-only and reversible. No production schema/auth/deploy changes were made.

## SAFE_NEXT_ACTION

Open the clean reconciliation PR, run CI, fix factual contract failures, then use its green head as the new base for SCD 360 continuation.
