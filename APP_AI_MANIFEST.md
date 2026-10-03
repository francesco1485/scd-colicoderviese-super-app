# APP AI MANIFEST — SCD ONE

APP_ID: SCD_ONE
NAME: SCD ONE — ColicoDerviese Social Super App
TAGLINE: Tutto il Club. Una sola app.
OWNER: SCD ColicoDerviese
AI_BRANCH: ai-scd-one
SOURCE_BASE: r57-copilot-control-plane
CURRENT_RUNTIME: scd-colicoderviese-official-r21

## Mission
Build the high-scale public/social/transactional SCD experience for supporters, families, athletes, staff, teams, territory and external users.

## In scope
Pulse, SCD Week, Calendar, Teams, Matchday, Social/Community, Media/Newsroom, Twin, Family/Athlete context, Join, events, tournament entry, field requests, tickets, cards and public services.

## Out of scope
Internal association operations belong to SCD CORE.
Deep sponsor/CRM development belongs to SCD GROW.
Command orchestration belongs to shared SCD Command R22.

## Command
SCDONE:RUN -> WEBAPP:MASTER

## Rules
No restart from zero.
No fake live data.
No generic obsolete template.
Preserve verified data, identity, provenance, security and integrations.
No production mutation without explicit authorization.


## Definitive continuity package
Read before work:
- docs/SCD_ONE_PRODUCT_MEMORY.md
- docs/SCD_ONE_DEFINITIVE_BUILD_COMMAND.md
- docs/SCD_ONE_VISUAL_EXPERIENCE_MASTER.md
- config/scd-one-product-contract.v1.json
- docs/AI_MULTIFUNCTIONAL_DEVELOPER_COMMAND.md
- docs/APP_HANDOFF.md

Definitive command: SCDONE:MASTER
Continuous command: SCDONE:RUN

App boundary:
- internal association management -> SCD CORE
- sponsor/partner CRM and growth -> SCD GROW
- technical orchestration -> SCD Command R22
- identity/role authority -> R20 until verified migration

Product memory rules:
- preserve and recover valid R38-R56 work before rebuilding;
- SCD Week is Friday-to-Friday with weekend priority;
- mobile bottom navigation is HOME / CALENDAR / TEAMS / SOCIAL / PROFILE;
- no duplicate identity/database/calendar/CRM/source-of-truth;
- no invented sport/live/transaction facts;
- no merge/deploy/production mutation without explicit authorization.
