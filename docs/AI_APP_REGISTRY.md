# AI APP REGISTRY — SCD / sportclubcolico development portfolio

Updated: 2026-10-03

## Active AI development branches

| Product | AI branch | Current runtime/source line | AI role |
|---|---|---|---|
| SCD Digital Club Operating System | r57-copilot-control-plane | main / scd-colicoderviese-official-r21 | Canonical SCD product |
| SCD Sponsor Platform | ai-scd-sponsor-platform | main / scd-sponsor-platform | SCD module |
| SCD Command Platform R22 | ai-scd-command-r22 | main / scd-colicoderviese-command-r22 | SCD orchestration module |
| SCD Commercial / Lia | ai-scd-commercial-lia | r42-commercial-development-os / scd-commercial-r42-staging + scd-lia-r42-staging | SCD commercial/staging line |
| C.E.P.A. Maglia OS | ai-cepa-maglia-os | cepa-maglia-os-hosting / cepa-maglia-os | Separate business product |
| Maglia 360 Office | ai-maglia360-office | maglia360-office-architecture-v2 / maglia360-office-v2-preview | Separate business product |

## Render service classification for reconciliation

CANONICAL:
- scd-colicoderviese-official-r21

ACTIVE_MODULE / PRODUCT:
- scd-sponsor-platform
- scd-colicoderviese-command-r22
- cepa-maglia-os
- maglia360-office-v2-preview

STAGING / DEVELOPMENT:
- scd-commercial-r42-staging
- scd-lia-r42-staging

LEGACY / EXPERIMENTAL — DO NOT DEVELOP FURTHER UNTIL RECONCILED:
- scd-universe
- scd-universe-nova-app
- scd-universe-nova
- scd-universe-nova-api
- scd-universe-ng-api
- scd-universe-synthetic
- scd-universe-nextgen
- scd-colicoderviese-restart
- scd-colicoderviese-preview-r21
- scd-colicoderviese-super-app

## Common AI operating doctrine

Every active product uses the same engineering cycle:
STATE -> REQUIREMENTS -> REALITY CHECK -> EXISTING SYSTEM CHECK -> DATA CONTRACT -> BUILD -> TEST -> SECURITY -> PR -> REVIEW -> RELEASE -> PRODUCTION EVIDENCE.

Shared commands:
WEBAPP:STATE
WEBAPP:EXPERT
WEBAPP:ARCHITECT
WEBAPP:NO-DUPLICATE
WEBAPP:DATA
WEBAPP:BUILD
WEBAPP:TEST
WEBAPP:SECURITY
WEBAPP:RELEASE
WEBAPP:RUN

SCD products additionally keep SCD:* commands and SCD_SYSTEM_MANIFEST.json authority.

## Production rule
AI branches are isolated from Render watched branches. No AI bootstrap branch is wired to production. Activation happens only after audit, tests, review and explicit release authorization.
