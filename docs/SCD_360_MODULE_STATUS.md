# SCD 360 — Module Status

Status legend:
- **KEEP** existing valid implementation
- **ENHANCE** valid but incomplete
- **INTEGRATE** duplicate/legacy work must converge
- **CONTRACT** designed/schema-ready but runtime unverified
- **SOURCE** source exists but product workflow incomplete
- **BLOCKED** unsafe until dependency is resolved

| Domain | Status | Primary continuation |
|---|---|---|
| Direction Control Room | ENHANCE | CORE-02 |
| Identity / roles / scopes | KEEP | R20 primary, staged migration only |
| Families / athletes / staff | KEEP+ENHANCE | ONE/CORE shared PERSON_ID |
| Secretariat / registrations | ENHANCE | practice workflow over existing sources |
| Medical eligibility | SOURCE+CONTRACT | restricted eligibility gate |
| Teams / rosters | KEEP | shared TEAM_ID |
| Calendar / events | ENHANCE | EVENT_ID reconciliation |
| Matchday / results | KEEP+ENHANCE | source freshness and scope |
| Convocations / distinte | CONTRACT/BLOCKED | RLS/policies before runtime activation |
| Training / attendance | CONTRACT/BLOCKED | staff policy before activation |
| Performance | CONTRACT/BLOCKED | staff-only/minor protections |
| Discipline | SOURCE | official-source adapter |
| Facility / fields | ENHANCE | verified/manual state model |
| Warehouse / kit / laundry | ENHANCE | canonical asset workflow |
| Transport / trips | ENHANCE | event-linked scoped workflow |
| Finance / fees | SOURCE+ENHANCE | reconcile current operational sources |
| Contracts / workers | SOURCE | restricted document registry |
| RASD | SOURCE | evidence checklist / UNVERIFIED semantics |
| Privacy / consent | ENHANCE | purpose-specific consent center |
| Safeguarding | KEEP_ISOLATED | separate restricted workflow |
| Sponsor / CRM | INTEGRATE | GROW + legacy Sponsor reconciliation |
| Card / SQUBy | INTEGRATE_EXTERNAL | no duplicate wallet |
| Ticketing | CONTRACT | shared identity/event integration |
| Community | KEEP+ENHANCE | supervised family/minor scopes |
| Tournaments | KEEP | module of shared event/logistics/finance |
| Media / Social | KEEP+ENHANCE | consent/provenance |
| Gmail / Drive automation | ENHANCE | R57.A1 state machine |
| Federation intelligence | SOURCE+ENHANCE | official-first adapters |
| Audit / Data Quality | ENHANCE | cross-domain provenance/telemetry |
| AI / Innovation Radar | CONTRACT+ENHANCE | human-in-the-loop only |
