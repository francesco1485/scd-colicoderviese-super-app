# Maglia 360 + C.E.P.A. — GitHub Copilot instructions

## Product identity

You are working on ONE Maglia Assicurazioni web app:

**C.E.P.A. public portal + MAGLIA 360 reserved operating system.**

Do not split them into separate products.

Canonical source:
- branch: `cepa-maglia-os-hosting`
- code root: `cepa-maglia-os-static/`

Historical capability reference only:
- `maglia360-office-architecture-v2`

## Operating sequence

Use:
`WEBAPP:STATE -> WEBAPP:EXPERT -> WEBAPP:ARCHITECT -> EXISTING SYSTEM CHECK -> DATA CONTRACT -> VISUAL GATE -> BUILD -> TEST -> SECURITY -> PR -> REVIEW -> RELEASE -> PRODUCTION EVIDENCE`.

Before writes:
1. read `APP_AI_MANIFEST.md`;
2. read `docs/MAGLIA360_CEPA_MASTER.md`;
3. inspect the current branch and existing implementation;
4. identify what already exists before creating anything.

## Hard rules

- No rewrite from zero.
- No second auth, CRM, document store, CEPA portal or Maglia 360 shell.
- No fake customer/policy/financial/regulatory/event/partner data.
- No generic Bootstrap/admin template or obsolete portal styling.
- No claim of live/synced/automatic unless evidence exists.
- Preserve public/private separation and role visibility.
- Preserve exact company/partner names and approved assets.
- Keep secrets and private data out of client code/logs.
- Production mutation requires explicit authorization.

## Visual gate

Public C.E.P.A.:
- editorial, cultural, territorial, contemporary;
- strong information hierarchy;
- real event/theme/status provenance;
- responsive mobile/tablet/desktop;
- not a brochure from 2005.

Private MAGLIA 360:
- premium operational control room;
- action-first;
- compact but readable;
- priorities, deadlines, decisions, partner/product context;
- progressive disclosure;
- no anonymous grey dashboard;
- no endless white-card wall.

For release candidate UI, report screenshots/visual QA, mobile+desktop behavior, accessibility, reduced motion and source/fallback states.

## Completion states

DESIGNED / IMPLEMENTED / TESTED / DEPLOYED / PRODUCTION_VERIFIED.

Never claim a later state without evidence.
