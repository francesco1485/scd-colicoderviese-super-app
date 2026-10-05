# SCD 360 — Requirements Traceability Matrix

| Requirement | Module | Canonical source/entity | Surface | Role | Verification |
|---|---|---|---|---|---|
| One person / one identity | Identity | R20 -> PERSON_ID -> SCD PULSE staged | ONE/CORE/GROW | all | identity/role contract tests |
| One event | Calendar | EVENT_ID | ONE/CORE | public/family/staff/direction | Calendar Fusion tests |
| Direction priorities | Control Room | operational sources + provenance | CORE | Direction | CORE contract + source diagnostics |
| Tesseramento status | Secretariat | official/Drive/master source | CORE/ONE scoped | Secretariat/athlete/family | source + role tests |
| Medical eligibility | Eligibility | restricted athlete status | CORE scoped | Secretariat/staff/self | privacy + expiry tests |
| Match callups | Matchday | match + athlete + eligibility | CORE/ONE scoped | staff/athlete/family | RLS + role tests |
| Facility state | Facility | asset/space source | CORE | staff/direction | no-fake-device state tests |
| Transport | Trips | event/team/person relations | CORE/ONE scoped | staff/family | privacy + scope tests |
| Sports-worker compliance | RASD | signed evidence/source docs | CORE | admin/direction | evidence completeness, no inferred compliance |
| Sponsor relationship | CRM | shared stakeholder/company IDs | GROW/ONE public subset | commercial/direction | prospect!=sponsor tests |
| Gmail operational intake | Automation | message_id/thread_id | CORE | authorized operators | idempotency/retry/privacy tests |
| Drive document routing | Documents | file_id + canonical folders | CORE | scoped | provenance/routing tests |
| Official schedule/sanction | Sports intelligence | FIGC/LND/CRL source ID | CORE/ONE | scoped/public | authority/conflict tests |
| Safeguarding case | Safeguarding | isolated restricted store/process | restricted | safeguarding only | isolation tests |
| Consent by purpose | Privacy | consent state/history | ONE/CORE | self/guardian/admin | revoke/purpose tests |
| AI next action | AI | permission-filtered facts | CORE/GROW | role scoped | source/freshness + human-gate tests |

## Trace rule

Every implementation PR must identify:
`USER_REQUIREMENT -> MODULE -> SOURCE -> ENTITY -> API -> UI -> ROLE -> TEST -> EVIDENCE`.

A PR with no source/entity/role/test mapping is not ready for integration.
