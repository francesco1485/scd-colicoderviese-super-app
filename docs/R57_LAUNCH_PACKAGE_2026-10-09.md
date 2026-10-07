# R57 Launch Package — Friday 9 October 2026

## Purpose

Present and start using the SCD digital system without confusing preview evidence with production readiness.

The launch core is limited to operational value: SCD ONE, SCD CORE and SCD GROW, with R20 as the current identity/role/scope authority. Missing source bindings remain fail-closed. No fake operational or sports data is permitted.

## Canonical environments

- R57 exact-head preview: https://scd-r57-product-preview.onrender.com
- Production remains unchanged and requires explicit Direction authorization for merge/deploy.
- Preview runtime uses `SCD_PREVIEW_SAFE_MODE=true`; write actions are blocked before the live upstream.

## Presentation order

1. **SCD ONE — public and club experience**
   - HOME / Pulse
   - Calendar
   - Teams
   - Social
   - Profile
   - responsive mobile/desktop behavior

2. **SCD CORE — Direction / operational experience**
   - Private Desk
   - Control Room
   - source state and provenance
   - requests / intake
   - calendar and event operations
   - communications
   - fail-closed operational surfaces

3. **SCD GROW — sponsor and commercial operations**
   - Partner / Sponsor public story
   - CRM 360°
   - pipeline
   - agenda
   - communications
   - development projects and delivery proof

4. **Launch safety**
   - R20 remains authority
   - provenance is visible
   - missing data is shown as unavailable/unverified
   - preview cannot perform production writes

## Demo path

### ONE
Open the preview and show:
- HOME / Pulse
- CALENDAR
- TEAMS
- SOCIAL
- PROFILE

Explain that public data is source-grounded. If a source is not available, the UI remains explicit rather than inventing records.

### CORE
Open the Private Desk / Direction surfaces and show:
- priority/action model
- Control Room
- source diagnostics
- provenance
- requests/intake
- operational service routes

Do not present a LIMITED or UNVERIFIED source as operationally complete.

### GROW
Open the sponsor surface and show:
- partner value proposition
- CRM/pipeline
- communication and agenda flows
- asset/development logic
- proof-oriented sponsor delivery

## Minimum launch-core status model

Use only these meanings:
- **VERIFIED**: tested and verified in the target preview/runtime.
- **LIMITED**: usable within a documented limitation.
- **IMPLEMENTED**: code/contract exists but runtime/source binding is not fully verified.
- **PENDING**: required evidence is missing.
- **UNAVAILABLE / UNVERIFIED**: fail-closed state; do not infer data.

## Known launch limitations

- R20 remains the production authority for identity, roles and scope.
- Supabase SCD PULSE remains staged and must not become primary without an approved migration and security verification.
- Tournament minimum is source-backed/read-only until a verified synchronized operational pipeline exists.
- Membership services remain source-binding limited.
- Facility/logistics remains source-binding limited; occupancy, homologation and availability must not be inferred.
- Intake upload readiness and authorized communication send paths require runtime verification before they are called fully operational.
- Production merge/deploy is not part of this release process without explicit Direction authorization.

## Release acceptance

A release candidate is presentation-ready only if:
1. manifest and policy gates pass;
2. full application E2E passes;
3. seven-viewport visual QA passes;
4. exact-head Render preview is live;
5. /health reports the expected commit;
6. /api/launch-readiness exposes explicit non-inferred states;
7. no critical regression is hidden by fallback/sample data.

## Rollback

If a release-candidate regression is detected:
- stop promotion;
- keep production unchanged;
- restore the previous verified preview commit;
- keep R20 authority and feature flags unchanged;
- record the blocker before any further release action.
