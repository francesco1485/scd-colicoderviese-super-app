# SCD 360 — Master Requirements

## Product outcome

Build the real operating system of S.D.C. ColicoDerviese, not a tournament site or a brochure portal.

## Architectural invariants

1. One coherent SCD ecosystem.
2. SCD ONE, CORE and GROW are coordinated surfaces, not separate business truths.
3. One PERSON_ID, TEAM_ID, EVENT_ID, DOCUMENT_ID and source/provenance model.
4. No duplicate auth, database, CRM, calendar, people store, audit store or task engine.
5. R20 remains authoritative until verified migration.
6. SCD PULSE is the staged target data core.
7. R22 is shared orchestration, not another business app.
8. Official sports sources outrank secondary aggregators.
9. Missing evidence never becomes FALSE or fabricated completion.
10. Production mutation requires explicit human authorization.

## Functional domains

- Direction & Control Room
- People, families, staff, athletes
- Secretariat and registrations
- Medical expiry/eligibility
- Teams, categories and rosters
- Match, calendar, results, convocations and distinte
- Training, attendance and internal performance
- Discipline and federation communications
- Fields, facilities, locker rooms, keys/access
- Warehouse, kit, laundry, equipment and maintenance
- Vehicles, drivers, stops and trips
- Administration, fees, budgets and event economics
- Contracts, workers, volunteers and RASD support
- Privacy, consent and safeguarding
- Sponsor/partner CRM and territorial development
- Card/SQUBy integration
- Ticketing/access
- Community/family/supporter services
- Tournaments and events
- Media, press and social workflows
- Gmail/Drive/Calendar automation
- FIGC/LND/SGS/CRL/Tuttocampo intelligence
- Audit, telemetry, source health, data quality and AI assistance

## UX requirements

- mobile and desktop first-class;
- IT/EN minimum;
- WCAG 2.2 AA target;
- action-first dashboards;
- loading/empty/error/offline/unverified states;
- no fake realtime;
- public showcase -> login -> private OS for management products;
- complex text remains HTML/CSS, not baked into imagery;
- official assets remain locked.

## AI requirements

AI may:
- classify;
- summarize;
- detect missing data;
- prioritize;
- draft;
- suggest next actions;
- explain source/freshness.

AI must not autonomously:
- change roles/permissions;
- finalize federation/legal/compliance states;
- approve payments;
- expose safeguarding;
- invent sponsor values/probabilities;
- publish private/minor-sensitive information;
- mutate production.

## Completion model

DESIGNED -> IMPLEMENTED -> TESTED -> PREVIEWED -> ROLE/SECURITY VERIFIED -> INTEGRATION VERIFIED -> HUMAN REVIEW -> DEPLOYED -> PRODUCTION_VERIFIED.

Any earlier state must not be described as complete.
