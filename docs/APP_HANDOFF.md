# SCD CORE HANDOFF

Updated: 2026-10-03

## CURRENT_STATE
- APP_ID: SCD_CORE
- BASE_BRANCH: `ai-scd-core`
- ACTIVE_BRANCH: `core-01-direction-control-room`
- STATUS: CORE-01 `IMPLEMENTED + CONTRACT_TESTED`
- PRODUCTION: unchanged
- AUTHORITY: R20 identity / role / scope remains authoritative
- PRODUCTION_MUTATION: not authorized

## CORE-01 IMPLEMENTED
Direction Control Room is integrated into the existing authenticated Private Desk instead of creating a parallel application or authentication system.

Operational lanes:
- OGGI
- PRIORITÀ
- DA FARE
- DA APPROVARE
- SCADENZE
- CAMBIAMENTI

The Control Room:
- appears only for explicit Direction profiles / permissions;
- reuses the existing R20 session and `privatePost` transport;
- reads existing authenticated sources;
- preserves source state and provenance;
- fails closed when a source is unavailable;
- never manufactures replacement tasks, approvals, deadlines or live status.

## EXISTING SOURCES REUSED
Read-only calls:
- `dashboard.summary` already loaded by Private Desk
- `private.agenda.summary`
- `direction.evolution`
- `direction.diagnostics`
- `direction.datafabric.status`

The repository already whitelists these calls in `server.js` and bridges them through the R21.6 Apps Script HTTP API.

Agenda facts are used directly.
A deadline enters the deadline lane only when the source explicitly marks it as DEADLINE or provides a deadline field.
Priority, approval and change classification requires explicit source evidence. Free-text titles alone do not create an approval/priority state.

## ARCHITECTURE BOUNDARY FIX
`APPROVAZIONI`, `SCADENZE` and `DASHBOARD` now route to SCD CORE Control Room.

They are no longer grouped with the Sponsor Platform fallback.

Commercial `CRM / CONTRATTI / REPORT` remain outside the CORE operational lane and continue toward the commercial/sponsor boundary where configured.

## FILES
- `lib/scd-core-control-room.js`
- `scd-core-control-room.css`
- `index.html`
- `scd-ng.js`
- `tests/scd-core-control-room-contract.mjs`
- `scripts/validate-scd-core-contract.mjs`
- `package.json`
- `.github/workflows/core-01-verify.yml`

## TEST EVIDENCE
GitHub Actions run:
`37137960492`

URL:
https://github.com/francesco1485/scd-colicoderviese-super-app/actions/runs/37137960492

Conclusion:
`SUCCESS`

Tested implementation head:
`6491a5739c5cf40b3409df32054dd26ea60d0aa6`

Passed:
- canonical manifest
- CORE-01 executable contract
- Control Room source-truth unit contract
- JS syntax checks
- full repository `npm run check`

## SECURITY
- no auth bypass;
- no client-selected privileged role;
- Direction visibility is role/scope gated;
- Direction APIs remain server-side authenticated;
- no secret introduced;
- no production write;
- no database migration;
- no approval action is executed by CORE-01;
- unavailable sources remain explicit instead of being simulated.

## LIMITATIONS / REAL BLOCKER
The repository contains the R21.6 bridge references for `direction.evolution` and `direction.diagnostics`, while their base Apps Script implementation is external to the checked-in patch set. CORE-01 therefore handles those sources defensively and marks them unavailable if the live upstream does not provide them.

Authenticated visual/operator QA requires a real authorized Direction session. No development auth bypass or fake Direction account is added merely to make screenshots look complete.

## COMPLETION STATE
- DESIGNED: PASS
- IMPLEMENTED: PASS
- CONTRACT_TESTED: PASS
- AUTHENTICATED_SOURCE_SHAPE_QA: PENDING
- AUTHENTICATED_VISUAL_OPERATOR_QA: PENDING
- PREVIEWABLE: PENDING
- DEPLOYED: NO
- PRODUCTION_VERIFIED: NO

## NEXT SAFE ACTION
1. Keep CORE-01 on this single branch/PR.
2. Verify source shapes under a real authorized Direction session when a safe non-production runtime is available.
3. Correct only verified mismatches; do not invent adapters.
4. Continue the portfolio with GROW-01 while CORE authenticated runtime QA remains a real external boundary.
