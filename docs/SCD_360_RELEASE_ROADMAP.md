# SCD 360 — Release Roadmap

## R57.1 — Reconciliation baseline [NOW]

Goal: one factual architecture and governance baseline.

Exit criteria:
- clean branch from current main;
- manifest + portfolio aligned;
- SCD 360 audit/matrices present;
- PR #82 supersession path documented;
- Production Evidence #286 classified;
- no production mutation.

## R57.2 — Operational Core completion

Priority:
1. CORE-02 source diagnostics;
2. task / approval / deadline drill-down using existing stores;
3. secretariat practice workflow;
4. medical eligibility gate;
5. privacy/consent center;
6. isolated safeguarding cockpit;
7. facility/assets/warehouse/kit/laundry;
8. transport/trips.

Exit: real role-scoped workflows, no parallel stores.

## R57.3 — Automation Plane

Pipeline:
`INGEST -> CLASSIFY -> DEDUPE -> NORMALIZE -> ENTITY_LINK -> HUMAN_GATE -> ACT -> AUDIT -> RETRY`.

Priority:
- Gmail review state machine;
- Drive document registry/routing;
- task/deadline extraction;
- EVENT creation with human review;
- official federation change adapters.

## R57.4 — Data Fabric / SCD PULSE hardening

Before any production cutover:
- reconcile R53→current schema;
- design policies for the 14 no-policy tables;
- verify security-invoker views and grants;
- apply/test covering indexes in staging;
- permission-filtered graph context;
- dual-read / rollback evidence;
- explicit human authorization for production migration.

## R57.5 — SCD ONE integration

- resolve PR #113/main divergence;
- public + family + athlete continuity;
- PWA/mobile/desktop QA;
- public showcase, calendar, teams, social/profile;
- no fake live data;
- same identity/event core.

## R57.6 — SCD GROW consolidation

- reconcile PR #117 and legacy Sponsor path/#93;
- one CRM truth;
- partner profile/evidence/follow-up;
- verified prospect intelligence;
- next-best-action with human approval;
- activation proof and renewal readiness.

## R57.7 — Visual / Accessibility / i18n convergence

- IT/EN central catalogs;
- WCAG 2.2 AA target;
- mobile/desktop visual QA;
- public -> auth -> private continuity;
- no generic SaaS drift.

## R57.8 — Release candidate

Required:
- full `npm run check`;
- branch/PR conflict-free;
- role/security QA;
- source/provenance QA;
- preview evidence;
- rollback;
- human review.

## R57.9 — Production gate

Only after explicit authorization:
- merge;
- production deploy;
- production migration where approved;
- post-deploy Production Evidence;
- status becomes PRODUCTION_VERIFIED only if exact deployed commit and runtime evidence are green.

## Post-release loop

FEEDBACK -> TELEMETRY -> DATA QUALITY -> PRIORITIZATION -> SAFE SLICE -> TEST -> HUMAN GATE -> RELEASE.
