# PRODUCT DNA RECOVERY AND APP BRAINS

Status: CANONICAL RECOVERY / NO UI AUTHORITY YET
Branch: r58-zero-based-product-rebuild
Reason: current and first R58 UI structures do not express the user-authored product DNA.

## Absolute rule

Do not design or extend product navigation, dashboards or visual surfaces until the app brain has been recovered and accepted.

The existing backend, R20 authority, R22 command engine, source/provenance contracts, data fabric, automation, auth and verified functional modules are assets to recover.
Existing UI structures are not authoritative.

## Portfolio authority

Exactly four canonical products:
1. SCD ONE — ColicoDerviese Social Super App
2. SCD CORE — Association Operating System
3. SCD GROW — Partner & Sponsor Growth Engine
4. C.E.P.A. 360 — Maglia Assicurazioni consulting + agency operating system

Shared engines are infrastructure, not fifth products:
- R20 identity / role / scope authority
- SCD Command R22 orchestration
- SCD PULSE / Supabase staged data-auth-realtime target
- Google Workspace / Drive / Gmail / Calendar source engines

## What "DNA" means

Each product DNA is a coherent operating system, not a list of screens.

DNA = PURPOSE
    + USERS / ROLES / SCOPES
    + DOMAIN ENTITIES
    + VERIFIED SOURCES
    + HISTORY / MEMORY
    + CONTEXT
    + POLICIES / GUARDRAILS
    + PRIORITY / DECISION LOGIC
    + NEXT-BEST-ACTION
    + ACTION ROUTER
    + PROVENANCE / AUDIT
    + EXPERIENCE ADAPTATION
    + CONTINUOUS LEARNING / EVOLUTION

The interface must be a projection of this state.

## Common brain loop

PERCEIVE
  Read current verified state from canonical sources.

REMEMBER
  Preserve history, relationships, previous decisions, progress and unresolved work.

UNDERSTAND
  Build role-, scope-, entity-, time- and page-context.

DECIDE
  Determine what matters now, next, changed and requires attention.
  Never infer facts that are not verified.

PROPOSE
  Surface next-best-actions with reason, source and confidence/status.

ACT
  Route reversible commands through the correct backend/adapter.
  Sensitive or irreversible operations require human authorization.

PROVE
  Record source, actor, result, timestamps, IDs and evidence.

LEARN
  Use privacy-first telemetry, real usage, errors, feedback and outcomes to improve the product.
  No hidden psychological profiling.

## SCD ONE BRAIN

Mission:
A public/social/transactional club product where people understand what is happening now and next, follow teams and Matchday, use services, participate safely and access authorized family/athlete context.

Primary cognition:
- NOW
- NEXT
- CHANGED
- ATTENTION

Brain components:
- verified public calendar and event identity
- SCD Week / Friday-to-Friday experience where canonically required by product contract
- Team and Matchday context
- verified Social / Newsroom / Media signals
- Family / Athlete authorized context
- SCD Twin = evolving user identity
- SCD Mirror = contextual operational assistant, separate from Twin
- SCD Meta Engine = explicit role/scope/preference/context adaptation
- SCD Adaptive Engine = device/input/layout adaptation
- SCD Experience Engine = Discover / Quick / Focus modes
- safe community participation
- source-grounded partner visibility and benefits
- fail-closed missing data

ONE must never become an internal administration dashboard.

## SCD CORE BRAIN

Mission:
Internal association operating system connecting people, registrations, events, facilities, logistics, documents, administration and operational decisions without forcing staff to hunt across disconnected tools.

Primary cognition:
- WHAT REQUIRES ACTION NOW?
- WHO OWNS IT?
- WHAT IS BLOCKED?
- WHAT IS DUE?
- WHAT CHANGED?
- WHAT IS MISSING?
- WHAT DECISION IS REQUIRED?

Brain components:
- Direction Control Room
- Completeness Engine
- people / family / athlete / staff graph
- team / event / role / assignment graph
- Calendar Fusion
- Gmail / Drive / Calendar intake
- registrations / tesseramenti / certificates
- requests / approvals / deadlines
- documents and provenance
- transport / facilities / spaces / assets / warehouse / kit / laundry / access / maintenance
- administration / finance / worker / contract support
- role/scope-aware task queue
- R22 safe command execution
- audit / rollback / evidence

CORE principle:
ACTION_FIRST_ROLE_AWARE.
One event/entity may have many authorized projections, but one canonical identity/source.

## SCD GROW BRAIN

Mission:
Continuously create, qualify, develop and retain partner/sponsor opportunities through verified research, relationship intelligence and measurable delivery.

Canonical growth loop:
RESEARCH -> VERIFY -> QUALIFY -> CONNECT -> PROPOSE -> ACTIVATE -> PROVE -> REPORT -> RENEW -> EXPAND

Primary cognition:
- WHICH RELATIONSHIP MATTERS NOW?
- WHY?
- WHAT IS THE VERIFIED STATUS?
- WHAT IS THE NEXT BEST ACTION?
- WHAT VALUE WAS PROMISED?
- WHAT VALUE WAS DELIVERED?
- WHAT SHOULD HAPPEN BEFORE RENEWAL?

Brain components:
- Stakeholder / company relationship graph
- research radar with provenance
- CRM and commercial pipeline
- Lia Sponsor workbench
- next-best-action
- proposal builder
- partner microsites
- LED / Sponsor Wall / Matchday activations
- conventions / Card / benefits
- Solidarity Fund
- projects / suppliers / assets
- activation proof
- reporting
- renewal/follow-up loop
- research automation with human verification

Guardrails:
PROSPECT != SPONSOR
PROPOSAL != CONTRACT
RESEARCH != FACT UNTIL VERIFIED
NO INVENTED VALUE / PROBABILITY / COMMITMENT

## C.E.P.A. 360 BRAIN

Mission:
One combined CEPA public education/consulting interface and Maglia 360 private agency operating system, CRM and growth environment using verified agency history, products, partners and relationships.

Primary cognition:
- WHAT DOES THIS PERSON / COMPANY / ENTITY NEED TO UNDERSTAND?
- WHAT IS THE NEXT EDUCATIONAL OR CONSULTING STEP?
- WHAT HISTORY AND RELATIONSHIP ALREADY EXIST?
- WHAT EVENT / CHECKUP / DEADLINE / FOLLOW-UP IS DUE?
- WHICH SAP / TERRITORY / COLLABORATOR IS INVOLVED?
- WHAT CAN BE PROPOSED ONLY AFTER EDUCATION AND VERIFIED NEED?

Core principle:
EDUCARE_PRIMA_DI_VENDERE

Brain components:
- CEPA public education and consulting journey
- virtual Center CEPA governance
- SAP network governance and quality
- territory Colico -> Mandello -> Lecco
- events / academy / asynchronous online university
- Maglia 360 Control Room
- clients / policies / portfolio
- checkups / renewals / pipeline
- collaborators and terms
- partners / products knowledge
- documents / contracts
- Lia Workbench
- AI Mail / Chat with human review
- Network Radar / IVASS public professional data
- development graph
- history intelligence
- relationship graph
- CRM
- continuous growth

CEPA public and Maglia private surfaces must share one verified intelligence layer but preserve access boundaries.

## Existing intelligence assets to recover

The repository already contains or defines:
- SCD Command Platform R22
- R20 identity/role/scope authority
- SCD Meta Engine
- SCD Adaptive Engine
- SCD Experience Engine
- SCD Twin
- SCD Mirror
- Completeness Engine
- Data Fabric
- Expert Router
- source/provenance rules
- asset integrity rules
- autonomous safe loop
- App Evolution Queue / privacy-first telemetry
- role-aware and source-aware behavior
- audit / idempotency / rollback concepts

These must be integrated into the four app brains instead of exposed as disconnected features.

## Product construction order

1. RECOVER USER-AUTHORED DIRECTIVES
2. RECOVER DOMAIN SOURCES AND ENTITIES
3. RECOVER DECISION / PRIORITY / NEXT-ACTION RULES
4. DEFINE APP BRAIN STATE MODEL
5. DEFINE BRAIN INPUTS / OUTPUTS / AUTHORIZATION
6. DEFINE EXPERIENCE PROJECTIONS BY USER / CONTEXT
7. ONLY THEN DEFINE INFORMATION ARCHITECTURE
8. ONLY THEN DEFINE VISUAL SYSTEM / MOTION
9. PROTOTYPE
10. HUMAN REVIEW
11. IMPLEMENT
12. VERIFY
13. CONTINUOUS EVOLUTION

## Stop condition

No new production-like UI implementation is authoritative until:
- the four DNA maps are complete;
- user directives have been reconciled;
- brain input/output contracts exist;
- product boundaries are clear;
- existing intelligence engines are mapped;
- no important original requirement is silently dropped.
