# AI APP REGISTRY — 4 CANONICAL WEB APPLICATIONS

Updated: 2026-10-03  
Machine-readable source: `config/ai-portfolio.v1.json`

## Canonical portfolio

There are **4 applications total**.

### SCD-01 — SCD Universe / SCD ColicoDerviese Super App

- Owner: SCD ColicoDerviese
- AI branch: `r57-copilot-control-plane`
- Production runtime: `scd-colicoderviese-official-r21`
- Main code: root application + shared runtime
- Role: primary club application for public, personal and authorized operational experiences.

Inside this app, NOT separate apps:
- Segreteria
- Facility / Smart Facility
- Tornei
- Private Desk
- SCD Week
- Calendar
- Teams / Matchday
- Social / Community
- Twin / Mirror
- materials / kit / warehouse / laundry / access
- connected club services.

The manifest rule `single_product = true` applies here: these experiences must not be forked into competing club apps.

### SCD-02 — SCD Sponsor & Partner Platform

- Owner: SCD ColicoDerviese
- AI branch: `ai-scd-sponsor-platform`
- Code root: `sponsor/`
- Public runtime: `scd-sponsor-platform`
- Protected dependency: canonical SCD backend/private runtime.

This is a distinct companion web app in the SCD ecosystem.

It contains:
- public sponsor/partner experience;
- Partner Hub;
- commercial pipeline;
- CRM/stakeholders;
- Sponsor Operations;
- Lia Sponsor;
- LEDWall / Sponsor Wall;
- convenzioni;
- Fondo Solidale;
- proof/reporting.

`ai-scd-commercial-lia` is NOT a fifth app. Its useful work is absorbed here and, for orchestration, in Command R22.

### SCD-03 — SCD Command Platform R22

- Owner: SCD ColicoDerviese
- AI branch: `ai-scd-command-r22`
- Code root: `platform/`
- Runtime: `scd-colicoderviese-command-r22`
- Role: technical web application / orchestration plane.

It provides:
- Command API;
- registry/plugins;
- jobs/idempotency;
- event/audit flow;
- R20 bridge;
- queue/worker path;
- controlled automation and future AI commands.

It is not the public Super App and must not become a second source of truth.

### MAGLIA-01 — Maglia 360 + C.E.P.A.

- Owner: Maglia Assicurazioni
- Canonical source: `cepa-maglia-os-hosting`
- Historical reference: `maglia360-office-architecture-v2`
- AI branch: `ai-maglia360-cepa-unified`
- Code root: `cepa-maglia-os-static/`
- Canonical runtime: `cepa-maglia-os`
- Older preview runtime: `maglia360-office-v2-preview`

This is ONE Maglia Assicurazioni web app.

Public world:
- C.E.P.A.;
- themes/events;
- Center C.E.P.A.;
- SAP and territories;
- collaboration/partner entry.

Private world:
- Maglia 360 Control Room;
- partners/products;
- collaborators;
- C.E.P.A. governance;
- documents/contracts;
- AI Mail & Chat;
- Lia Workbench;
- Network Radar / IVASS;
- development;
- activities/deadlines;
- Recovery.

The current canonical source already contains both worlds. C.E.P.A. and Maglia 360 must not be developed as two competing apps.

## Superseded AI splits

Do not start new sessions from:
- `ai-scd-commercial-lia`
- `ai-cepa-maglia-os`
- `ai-maglia360-office`

Keep their branches temporarily as historical evidence until useful commits are reconciled.

## Render classification

Canonical/active portfolio runtimes:
- `scd-colicoderviese-official-r21`
- `scd-sponsor-platform`
- `scd-colicoderviese-command-r22`
- `cepa-maglia-os`

Reference/preview runtime:
- `maglia360-office-v2-preview`

Staging/historical runtimes to reconcile, not new apps:
- `scd-commercial-r42-staging`
- `scd-lia-r42-staging`
- `scd-universe`
- `scd-universe-nova-app`
- `scd-universe-nova`
- `scd-universe-nova-api`
- `scd-universe-ng-api`
- `scd-universe-synthetic`
- `scd-universe-nextgen`
- `scd-colicoderviese-restart`
- `scd-colicoderviese-preview-r21`
- `scd-colicoderviese-super-app`

No runtime is deleted during portfolio correction.

## Common workflow

`STATE -> REQUIREMENTS -> EXISTING SYSTEM CHECK -> DATA CONTRACT -> VISUAL GATE -> BUILD -> TEST -> SECURITY -> PR -> REVIEW -> RELEASE -> PRODUCTION EVIDENCE`

No fifth app without explicit Direction approval.
