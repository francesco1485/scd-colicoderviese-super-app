# SCD 360 — Role & Scope Matrix

| Role | Primary surfaces | Default scope | Sensitive limits |
|---|---|---|---|
| Public supporter/user | ONE public | public-approved only | no private people/documents |
| Athlete | ONE + scoped CORE projections | SELF + authorized TEAM/EVENT | no other athlete medical/private data |
| Parent/Guardian | ONE + scoped requests | linked minors/family only | relationship must be verified |
| Technician | CORE | assigned teams/categories/events | no finance/safeguarding unless separately granted |
| Team Manager / Dirigente | CORE | assigned teams/events/logistics | limited people/document scope |
| Secretariat | CORE | registrations/documents/deadlines | restricted health/identity only as needed |
| Facility operator | CORE | facilities/assets/tasks | no unrelated people/finance |
| Event operator | CORE | assigned event/tournament | no global admin |
| Commercial / Sponsor operator | GROW | companies/contacts/opportunities | no club medical/safeguarding |
| Media / Communication operator | ONE/CORE | approved content/media | consent state required before publication |
| Administration / Finance | CORE | fees/budgets/contracts/payments | no safeguarding case content |
| Direction | CORE + GROW oversight | organization-wide authorized | still subject to safeguarding/need-to-know separation |
| Safeguarding officer | isolated restricted workflow | safeguarding-only | not exposed through ordinary dashboards |
| System / automation | shared engines | explicit service scope only | least privilege; auditable correlation ID |

## Scope dimensions

Authorization must be evaluated server-side across relevant dimensions:

- organization;
- season;
- role;
- team/category;
- person/family relationship;
- event;
- functional area;
- document classification;
- purpose/consent;
- safeguarding isolation.

UI hiding is not authorization.

## Identity rule

One human must resolve to one canonical PERSON_ID. Never use a name alone as the join key. External IDs and source record IDs belong in provenance/external-reference mappings.
