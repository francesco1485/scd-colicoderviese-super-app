# AI APP REGISTRY — SCD / sportclubcolico development portfolio

Updated: 2026-10-03

## Canonical product hierarchy

### 1. SCD UNIVERSE / SCD COLICODERVIESE SUPER APP — SINGLE PRODUCT

This is the primary SCD product and the destination of the current development program.

Canonical repository:
`francesco1485/scd-colicoderviese-super-app`

Current AI control branch:
`r57-copilot-control-plane`

Current production runtime:
`scd-colicoderviese-official-r21`

The SCD manifest rule `single_product = true` is binding.

The following are NOT separate competing SCD web apps. They are capabilities, modules, workbenches, adapters or historical runtimes that must converge into the single SCD Universe experience:
- Sponsor / Partner
- Command Platform R22
- Commercial / Lia
- Private Desk
- Calendar Fusion
- SCD Week
- Facility Week
- Teams / Matchday
- Social / Community
- Identity / Family / Athlete / Staff
- Club Intelligence
- Intake / Documents
- Materials / Kit / Warehouse / Laundry / Access / Closure
- Gmail / Drive / Calendar / LND / Tuttocampo / WhatsApp connectors
- Automation and AI

Dedicated branches may exist for safe parallel engineering, but they do not create separate SCD products.

### 2. Separate non-SCD business products

These may share the same AI engineering standard but remain separate products because their business identity, users and domain are different:
- C.E.P.A. Maglia OS
- Maglia 360 Office

## Active AI engineering branches

| Scope | AI branch | Role |
|---|---|---|
| SCD Universe / Super App master | r57-copilot-control-plane | Canonical SCD product and integration authority |
| Sponsor module | ai-scd-sponsor-platform | Module audit/integration only |
| Command Platform R22 | ai-scd-command-r22 | Orchestration module audit/integration only |
| Commercial / Lia | ai-scd-commercial-lia | Recovery/integration line only |
| C.E.P.A. Maglia OS | ai-cepa-maglia-os | Separate business product |
| Maglia 360 Office | ai-maglia360-office | Separate business product |

## Render classification

CANONICAL SCD PRODUCTION:
- scd-colicoderviese-official-r21

SCD MODULE / SUPPORT RUNTIMES TO RECONCILE, NOT NEW PRODUCTS:
- scd-sponsor-platform
- scd-colicoderviese-command-r22
- scd-commercial-r42-staging
- scd-lia-r42-staging

LEGACY / EXPERIMENTAL SCD RUNTIMES — preserve until audited; do not develop as competing products:
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

SEPARATE BUSINESS PRODUCT RUNTIMES:
- cepa-maglia-os
- maglia360-office-v2-preview

## Common AI operating doctrine

Every product uses:
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

SCD additionally uses the full SCD:* command set and SCD_SYSTEM_MANIFEST.json as binding authority.

## Production rule

No AI branch is a production replacement.
No SCD module becomes a new standalone product by accident.
Activation occurs only through the canonical SCD Universe release path after integration, tests, security review, rollback and production evidence.
