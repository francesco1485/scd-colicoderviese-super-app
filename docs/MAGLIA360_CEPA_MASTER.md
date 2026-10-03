# MAGLIA 360 + C.E.P.A. MASTER

Status: CANONICAL AI DEVELOPMENT DIRECTION
Date: 2026-10-03

## Product

One Maglia Assicurazioni web app with two worlds.

### PUBLIC — C.E.P.A.

Purpose:
- education before selling;
- previdenza, protezione, welfare, salute, tutela;
- people/families, PMI/companies, schools/entities;
- Center C.E.P.A. governance;
- SAP territorial network;
- events, content, territory, collaborations.

Public experience must be modern, credible and cultural, not a static agency brochure.

### PRIVATE — MAGLIA 360

Purpose:
- agency control room;
- role-based workspaces;
- partner/product ecosystem;
- collaborators;
- C.E.P.A. governance;
- documents/contracts;
- Lia Workbench;
- mail/chat support;
- development pipeline;
- Network Radar / IVASS;
- actions/deadlines;
- Recovery.

The private experience must not collapse into a basic CRM.

## Source strategy

Canonical source branch:
`cepa-maglia-os-hosting`

Why:
- newer than the Maglia 360 architecture branch;
- already contains public C.E.P.A.;
- already contains MAGLIA 360 reserved environment;
- includes C.E.P.A., products, collaborators, Lia Workbench, Network Radar, Recovery and operational views.

Historical comparison source:
`maglia360-office-architecture-v2`

Use it only to recover capabilities or UX that are genuinely better/missing. Do not fork a second product.

## Development rule

KEEP / ENHANCE / FIX / INTEGRATE / COMPLETE / REMOVE_WITH_REASON.

When visual presentation is obsolete:
REBUILD_IMPROVE the presentation while preserving verified data, roles, auth, workflows, provenance and business logic.

## Runtime

Canonical public runtime to reconcile:
`cepa-maglia-os`

Older/preview runtime:
`maglia360-office-v2-preview`

Do not delete or repoint either service until the unified branch is tested and release evidence exists.
