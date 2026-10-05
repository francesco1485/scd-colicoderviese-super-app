# SCD 360 ARCHITECTURE DECISION

## Decision
The canonical model is **one SCD digital ecosystem with three coordinated web applications**:
- SCD ONE: public/social/transactional experience;
- SCD CORE: internal club operating system;
- SCD GROW: sponsor/partner growth engine.

This resolves the historical "one product" vs "three apps" tension by keeping one identity, one data fabric and one operational truth while allowing three specialized user-facing applications.

## Shared non-duplicable core
The following are shared across the ecosystem and must never be independently recreated per app:
- PERSON_ID and identity;
- roles/scopes;
- TEAM_ID;
- EVENT_ID and canonical calendar;
- DOCUMENT_ID;
- organization/entity references;
- source registry and provenance;
- audit/correlation IDs;
- notification contracts;
- R20 bridge during transition;
- SCD PULSE target data core;
- R22 command/orchestration contracts.

## Packaging rule
Separate apps may have different UX, routes and deployments, but they are not separate business realities. They consume shared canonical entities and integration contracts.

## Data architecture
Use PostgreSQL/Supabase as the target domain core. Preserve R20 as current authority until a verified migration is approved. Use STRANGLER_DUAL_RUN and explicit adapters.

## Graph strategy
Use first-class domain tables and explicit relationship tables as the source of truth. Build graph-style projections above them. Do not add another graph database until PostgreSQL limits are demonstrated by measured workloads.

## Automation
R22 is the shared orchestration layer. UI code must not reimplement command queues, retries or integration workflows.

## Visual system
SCD ONE, CORE and GROW share brand primitives but may adapt density and interaction to audience. All remain recognizably SCD.

## Rollback
This decision changes packaging/governance only. It does not require production migration. Existing runtimes stay untouched until separately approved.

## Safe next action
Complete R57 audit and then implement staged vertical slices for graph, automation and operating core.
