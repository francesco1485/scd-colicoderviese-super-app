# APP AI MANIFEST — SCD Command Platform R22

APP_ID: SCD_COMMAND_R22
PROJECT: SCD Command Platform R22
OWNER: SCD ColicoDerviese
AI_BRANCH: ai-scd-command-r22
PRIMARY_CODE: platform/
LIVE_RENDER_SERVICE: scd-colicoderviese-command-r22
CANONICAL_REPOSITORY: francesco1485/scd-colicoderviese-super-app

## Portfolio role

This is one of the 3 canonical SCD applications.

It is the technical web application/orchestration plane for SCD operations.

It is NOT:
- the public SCD Universe;
- the Sponsor Platform;
- a second source of truth;
- a second identity or permission system.

## Core purpose

- Command API;
- command registry and trusted plugins;
- schema validation;
- session/role verification through canonical authority;
- jobs/idempotency/correlation;
- audit/event flow;
- R20 bridge;
- optional queue/worker path;
- rollback/compensation;
- observability;
- controlled future AI command adapters.

Commercial/Lia orchestration belongs here only as commands/integration. Commercial user experience belongs in Sponsor Platform.

## Hard rules

- R20 remains authoritative where the SCD manifest requires it until verified migration.
- Development auth headers must never be accepted as production authorization.
- LLM/AI receives no special privileges.
- No arbitrary code loading from users.
- No production deploy from the AI branch.
