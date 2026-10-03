# R57.D1 — SCD Club Graph & Data Fabric Audit

## STATE

- Repository main SHA: `d16a658786b7577af498a3104dc31ebdd17f7613`
- Supabase project: `SCD PULSE` (`ndevtxxijbcnskgysdit`)
- Supabase status: `ACTIVE_HEALTHY`
- Live production migrations currently end at `r53_football_social_private_core`
- R20 remains identity/role/scope authority until an explicitly verified migration is approved.
- This document is read-only audit evidence. No production DDL has been applied.

## LIVE TABLE SURFACE

The live public schema currently includes the SCD graph/domain core for:
- organizations;
- profiles and memberships;
- people and families;
- athletes, categories and teams;
- team memberships;
- canonical events and event scopes;
- documents and external references;
- audit events;
- person roles;
- registrations/tesseramenti;
- matches;
- training sessions and attendance;
- match performance and callups;
- fan/social modules;
- team messages;
- live match events;
- deadlines.

All listed SCD tables currently report RLS enabled.

## ENTITY GRAPH

### Primary entity nodes

`PERSON -> FAMILY -> ATHLETE -> TEAM -> EVENT -> MATCH`

Additional nodes:
- STAFF / PERSON_ROLE;
- DOCUMENT;
- ORGANIZATION;
- DEADLINE;
- COMMUNICATION / TEAM_MESSAGE;
- LIVE_MATCH_EVENT;
- SOCIAL / REWARD projections.

### Canonical IDs already present

- PERSON: `scd_people.id`
- ATHLETE: `scd_athletes.id`
- TEAM: `scd_teams.id`
- EVENT: `scd_events.id`
- MATCH: `scd_matches.id`
- DOCUMENT: `scd_documents.id`

`scd_events.id` remains the single canonical EVENT_ID.

### Provenance bridge

`scd_external_refs` is the canonical adapter bridge for R20 / Drive / Gmail / Sheets source records.

Graph projections must preserve:
- source ID;
- source record ID;
- verification timestamp;
- correlation/audit context where applicable.

## SECURITY FINDINGS

Supabase Security Advisor currently reports 14 tables with RLS enabled but no RLS policies.

Affected runtime domains include:
- deadlines;
- fan gamification / ledger;
- live match events;
- match callups;
- match performance;
- MVP candidates and votes;
- reward/redemption surfaces;
- sponsor deals;
- team messages;
- training attendance and sessions.

Important interpretation:
R53 explicitly revoked direct `anon` and `authenticated` grants for these staged tables. Therefore the current finding is a **runtime-contract completion gap**, not evidence that those tables are publicly readable.

Required next step before activation:
1. define explicit server-side use cases;
2. define actor + role + scope;
3. add least-privilege policies/grants only where required;
4. validate minor/safeguarding boundaries;
5. test deny paths first;
6. keep feature flags off until production verification.

## PERFORMANCE FINDINGS

Supabase Performance Advisor currently reports 20 foreign keys without covering indexes.

Priority groups:
- organization references;
- actor/user references;
- candidate/reward relations;
- event relations;
- callup/training staff references.

This is safe to fix through additive indexes, but the SQL must remain staged until release authorization.

## GRAPH TECHNOLOGY DECISION

Do not introduce a second graph database at this stage.

Use:
- PostgreSQL/Supabase first-class entities;
- explicit relationship tables;
- indexed FK traversal;
- security-aware views/materialized projections;
- optional pgvector retrieval for AI context where useful.

Introduce a dedicated graph database only after measured workloads demonstrate a real PostgreSQL limitation.

## R53 -> R56 DRIFT

Current live migration history stops at R53.

Therefore any R54-R56 SQL/contract artifact in the repository must be classified as one of:
- schema already covered by R53;
- runtime-only change;
- staged migration not applied;
- obsolete/superseded;
- required production migration.

No R54-R56 production schema claim is valid until checked against live Supabase metadata.

## SAFE IMPLEMENTATION ORDER

1. Close R57.D1 entity/relation map.
2. Add staged FK indexes.
3. Design explicit RLS policies for currently fail-closed R53 tables.
4. Add tests for denied access and authorized access.
5. Reconcile R54-R56 schema artifacts with live metadata.
6. Prepare migration batch.
7. Review rollback.
8. Human release authorization.
9. Apply migration.
10. Re-run security/performance advisors and production evidence.

## ROLLBACK

No production change exists from this audit.
Rollback for future staged index migration is `drop index if exists ...` for the new R57-only indexes.
RLS rollout must include matching `drop policy if exists` rollback statements.

## SAFE_NEXT_ACTION

Prepare an additive, staged FK-index migration and a separate RLS policy design. Do not mix performance hardening with authorization activation in the same production change.
