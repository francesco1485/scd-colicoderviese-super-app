# SCD ColicoDerviese — GitHub Copilot repository instructions

## Binding sources
Before any write:
1. Read `SCD_SYSTEM_MANIFEST.json`.
2. Read `AGENTS.md`.
3. Run/verify `SCD:STATE`.
If state cannot be verified, remain read-only.

## Product doctrine
This branch is part of the SCD Digital Club Operating System. Do not create a parallel app, database, authentication system, calendar, CRM, private desk, repository, or hosting stack when the existing SCD system can be extended.

Classify findings as KEEP, ENHANCE, FIX, INTEGRATE, COMPLETE, or REMOVE_WITH_REASON.

## Shared WEBAPP commands
`WEBAPP:STATE`, `WEBAPP:EXPERT`, `WEBAPP:ARCHITECT`, `WEBAPP:BUILD`, `WEBAPP:TEST`, `WEBAPP:SECURITY`, `WEBAPP:RELEASE`, `WEBAPP:RUN`.
For this product, SCD:* aliases remain authoritative.

## Workflow
STATE -> REQUIREMENTS -> EXISTING SYSTEM CHECK -> DATA CONTRACT -> IMPLEMENT -> TEST -> PR -> REVIEW -> MERGE -> DEPLOY -> PRODUCTION EVIDENCE.

No direct write to main. No production mutation without explicit authorization. No fake data. Server-side authorization. Preserve provenance and rollback.

A feature state must be one of:
DESIGNED / IMPLEMENTED / TESTED / DEPLOYED / PRODUCTION_VERIFIED.
