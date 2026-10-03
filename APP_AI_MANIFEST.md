# APP AI MANIFEST — MAGLIA 360 + C.E.P.A. UNIFIED

PROJECT: Maglia Assicurazioni Digital Operating System
APP_ID: MAGLIA_360_CEPA
AI_BRANCH: ai-maglia360-cepa-unified
CANONICAL_SOURCE_BRANCH: cepa-maglia-os-hosting
HISTORICAL_REFERENCE_BRANCH: maglia360-office-architecture-v2
PRIMARY_CODE: cepa-maglia-os-static/
CANONICAL_PUBLIC_RUNTIME: cepa-maglia-os
LEGACY_PREVIEW_RUNTIME: maglia360-office-v2-preview
CANONICAL_REPOSITORY: francesco1485/scd-colicoderviese-super-app

## One Maglia web app

This is ONE Maglia Assicurazioni web app with two coordinated worlds:

1. PUBLIC WORLD — C.E.P.A.
   - public educational and territorial portal;
   - people/families, companies, schools, entities, intermediaries;
   - themes, events, territory, SAP network, collaboration and partner entry;
   - public content must be verified and never invented.

2. PRIVATE WORLD — MAGLIA 360
   - reserved operational control room for authorized agency users;
   - partners/products/collaborators;
   - C.E.P.A. governance;
   - documents/contracts;
   - AI Mail & Chat;
   - Lia Workbench;
   - new business development;
   - Network Radar / IVASS;
   - activities/deadlines;
   - customer Recovery;
   - role-based visibility and office context.

C.E.P.A. is the public/relational front door.
MAGLIA 360 is the internal operating engine.
They are NOT two competing web apps.

## Binding rules

- Preserve the existing code and real workflows from `cepa-maglia-os-hosting`.
- Use `maglia360-office-architecture-v2` only as a historical/reference source for useful private-OS capabilities that are missing from the canonical source.
- No new CRM/auth/document system before auditing existing implementation.
- No invented customer, policy, commission, regulatory, financial, event, partner or office data.
- Preserve exact partner/brand identity and real provenance.
- Authorization is server-side where private data is involved.
- Public and private worlds share one coherent product identity but have different density and information hierarchy.
- Do not deploy from the AI branch.
- No production mutation without explicit authorization.

## Visual direction

Reject obsolete portal/admin templates.
Public C.E.P.A.: modern, editorial, cultural, territorial, premium, accessible.
Private Maglia 360: modern control room, dense but readable, action-first, role-aware, fast.
No generic card-wall dashboard, no fake live services, no decorative AI claims.

## First mission

Audit the current unified product from `cepa-maglia-os-hosting`, compare only missing capabilities against `maglia360-office-architecture-v2`, then build a single prioritized activation plan without splitting the product.
