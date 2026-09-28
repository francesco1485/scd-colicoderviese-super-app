# SCD EVOLUTION ENGINE

## Purpose
Continuous, privacy-first product improvement for the S.D.C. ColicoDerviese Super App.

## Listening matrix
| Signal | Example event | Purpose | Personal data |
|---|---|---|---|
| Navigation | page_view | Find most-used areas | No raw PII |
| Conversion | cta_click | Measure useful CTAs | No raw PII |
| Forms | form_start / form_complete / form_abandon | Detect friction | Never store form contents |
| Reliability | api_error / client_error | Fix broken flows | No sensitive payload |
| Performance | slow_load | Improve speed | Device class only |
| Adoption | install_pwa | PWA uptake | Aggregated |
| Growth | share | Organic referral | Aggregated |
| Retention | repeat_visit | Returning usage | Consent-based pseudonymous id |
| Feedback | feedback_submit | Direct user voice | Explicit content, separate store |

## Evolution score
PriorityScore = UserValue + OperationalImpact + CommercialImpact + Urgency + Confidence - Risk - Cost

Every proposal must include evidence, audience, risk, test plan, success metric and rollback.

## Guardrails
- No autonomous production changes.
- No hidden profiling.
- No safeguarding data in analytics.
- No PIN/password/token logging.
- No sensitive inferences from public images or people.
- No spam/dark patterns.
- External content must retain source, date and URL.
