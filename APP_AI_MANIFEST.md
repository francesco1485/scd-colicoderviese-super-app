# APP AI MANIFEST — SCD Command Platform R22

PROJECT: SCD Command Platform R22
AI_BRANCH: ai-scd-command-r22
SOURCE_BASE: r57-copilot-control-plane
LIVE_RENDER_SERVICE: scd-colicoderviese-command-r22
LIVE_RENDER_BRANCH: main
CANONICAL_REPOSITORY: francesco1485/scd-colicoderviese-super-app
PRIMARY_CODE: platform/

PRODUCT PURPOSE:
Command/orchestration layer for executing, observing and automating SCD operations while preserving canonical identity, data and role systems.

HARD RULES:
- Command Platform is not a second source of truth.
- R20 remains authoritative where the SCD manifest requires it until verified migration.
- AI/LLM functions must enter as authorized commands with schema, audit, event and rollback semantics.
- Development auth headers must never be accepted as production authorization.
- No production deploy from the AI branch.

FIRST MISSION:
Audit command registry, plugins, API auth, job/idempotency model, Redis/BullMQ optional path, R20 bridge, event flow, tests, Render contract and production safety. Produce a hardening and integration plan.
