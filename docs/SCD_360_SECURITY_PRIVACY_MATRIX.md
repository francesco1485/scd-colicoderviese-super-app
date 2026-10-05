# SCD 360 — Security, Privacy & Safeguarding Matrix

| Domain | Classification | Required controls | Blocking condition |
|---|---|---|---|
| Public content | PUBLIC_APPROVED | editorial approval, provenance | unverified/private source |
| Contact/account identity | PRIVATE | server auth, minimization | ambiguous identity |
| Minor profile | RESTRICTED | guardian/team scope, least privilege | missing verified relationship |
| Medical certificate/eligibility | HIGHLY_RESTRICTED | minimum status/expiry projection | no role scope / no verified source |
| Contracts/IBAN/tax data | HIGHLY_RESTRICTED | restricted server access, versioning | client/public exposure |
| Payments/fees | RESTRICTED_FINANCIAL | role scope, audit, reconciliation | missing evidence / unauthorized role |
| Tesseramenti/federation state | RESTRICTED_OPERATIONAL | official source, audit | unverified source |
| Safeguarding | SEPARATE_HIGHLY_RESTRICTED | isolated workflow, need-to-know | ordinary CRM/dashboard path |
| Image/video/media consent | PURPOSE_SPECIFIC | explicit opt-in, timestamp, revocation | consent missing/withdrawn |
| Mandatory privacy notice | COMPLIANCE | acknowledgement/version | not acknowledged where required |
| Sponsor/CRM | COMMERCIAL_PRIVATE | evidence/provenance, role scope | inferred sponsor/amount/probability |
| Gmail/Drive automation | PRIVATE | IDs, idempotency, audit metadata | raw body/secret logging |
| AI context | DERIVED_PERMISSIONED | source + freshness + role filter | source unavailable or permission uncertain |
| Smart Facility | OPERATIONAL | verified adapter/manual state | fake device/live state |

## Supabase live security state at audit

- SCD PULSE ACTIVE_HEALTHY.
- RLS enabled on all listed public SCD tables.
- 14 tables currently report RLS enabled with no policy.
- This is fail-closed, not a completed authorization model.
- Do not “fix” permission errors by introducing SECURITY DEFINER.
- Exposed views require explicit security-invoker/grant review.
- Update policies require both row selection and write validation semantics.
- Frontend must never receive service-role credentials.

## Safeguarding invariants

1. no safeguarding detail in ordinary CRM, social or analytics;
2. no unsafe adult-minor private 1:1 flow;
3. immediate-risk procedures cannot be replaced by generic AI;
4. minimal metadata outside the restricted workflow;
5. every access is auditable;
6. retention/export follows approved policy and legal requirements.

## Human gates

Explicit human approval required for:
- role/permission changes;
- production auth/RLS changes;
- federation submissions;
- payments/financial commitments;
- legal/compliance declarations;
- safeguarding actions;
- destructive data changes;
- production deploy/migration.
