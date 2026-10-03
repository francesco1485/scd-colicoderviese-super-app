# SCD ONE HANDOFF

Updated: 2026-10-03

## CURRENT_STATE
- APP_ID: SCD_ONE
- MAIN_BASELINE: `d16a658786b7577af498a3104dc31ebdd17f7613`
- ACTIVE_BRANCH: `copilot/ai-scd-one-again`
- DRAFT_PR: #104 -> `ai-scd-one`
- ACTIVE_HEAD: `1b423222d16f6d996176b2094fa75c2615d193d3`
- STATUS: ONE-01 `TESTED`
- ONLINE_PREVIEW: `BLOCKED_BY_HOSTING_CONFIGURATION`
- PRODUCTION: not changed
- R20: identity / role / scope authority unchanged
- EVENT_ID: existing Calendar Fusion contract unchanged
- PRODUCTION_MUTATION: not authorized

## USER COMMAND + VISUAL MEMORY
The active branch contains and consumes:
- `config/user-directives.v1.json`
- `docs/USER_COMMAND_RECOVERY_LEDGER.md`
- `config/scd-visual-references.v1.json`
- `config/project-delivery-registry.v1.json`

ONE-01 visual reconciliation uses the recovered SCD ONE reference family as product/design evidence while preserving factual data boundaries. Generated reference-board sample people, fixtures, scores, sponsors, prices and statuses are not runtime data.

## IMPLEMENTED_SLICE
- Canonical mobile/product navigation: HOME / CALENDAR / TEAMS / SOCIAL / PROFILE.
- Desktop adaptive command rail using the same canonical views.
- PULSE exposes NOW / NEXT / CHANGED / ATTENTION with explicit VERIFIED / PENDING / UNVERIFIED / UNAVAILABLE states.
- Friday-to-Friday public week window.
- Canonical deep links: `#home`, `#calendar`, `#teams`, `#social`, `#profile`.
- Existing `#pulse` / `#twin` routes remain normalized for continuity.
- PWA manifest and service worker preserved; ONE-01 runtime modules and R57 visual layer are cached.
- Native-readiness adapters isolate browser share, deep links, push, media and secure-storage capabilities.
- Existing R20 server-side authorization and Family/Athlete boundaries preserved.
- No duplicate identity, database, calendar, CRM or source registry.
- Production copy normalized to SCD product tone.
- Recovered SCD palette and visual identity integrated through `scd-one-r57.css`.
- Social surface reconciled away from the legacy white SaaS presentation.
- Closed Sky assistant panel no longer creates viewport overflow.
- Mobile Profile/Twin and desktop command-shell overflows fixed.

## VISUAL SYSTEM
Canonical ONE-01 palette in the active visual layer:
- navy `#031A35`
- navy 2 `#052E59`
- blue `#0870CF`
- lake `#0B98DD`
- cyan `#20B7E6`
- gold `#FFD500`
- muted gold `#F0B900`

Target classification:
`SPATIAL_SPORT_EDITORIAL_HIGH_IMPACT`

The official SCD crest remains a locked real asset.

## DATA SOURCES
- Pulse/calendar reuse existing same-origin newsroom/calendar paths.
- Calendar state is VERIFIED only after a successful upstream response.
- Unavailable upstream test sources fail closed and render an explicit state.
- Private/Family/Athlete projections continue to rely on server-side R20 role/scope.
- No sport/live/transaction fact is fabricated to fill an unavailable source.

## TEST EVIDENCE
GitHub Actions run:
`37137303669`

Result:
`SUCCESS`

URL:
https://github.com/francesco1485/scd-colicoderviese-super-app/actions/runs/37137303669

Verified in CI:
- `npm run test:manifest` — PASS
- `npm run test:scd-one-contract` — PASS
- runtime syntax — PASS
- `npm run check` full regression contract — PASS
- isolated test server — PASS
- Playwright Chromium visual QA — PASS

Automated responsive/visual QA:
- 360x800
- 390x844
- 393x852
- 430x932
- 1280x800
- 1440x900
- 1920x1080

The QA verifies:
- canonical navigation order
- all five routes
- canonical visual palette
- mobile bottom navigation
- desktop left command rail
- no horizontal overflow
- non-legacy Social presentation
- no page errors during tested routes

Visual evidence artifact:
- name: `scd-one-one-01-visual-qa`
- artifact ID: `11279135297`
- screenshots: 9
- digest: `sha256:b8df322f8a3c8a1f3e39a84cc5f6fd69df4e07004641ff591340180cc3a33ca3`

## SECURITY_IMPACT
- No role, permission, session, RLS or private-data contract changed.
- No production DB migration.
- No production deploy.
- No production write.
- No secret or credential introduced.
- Unsupported native capabilities remain unavailable instead of being simulated.

## PREVIEW BLOCKER
Current Render services have PR preview generation disabled and existing preview/staging services track other historical branches. Repointing an existing Render service or creating another service is an external hosting mutation and is not performed implicitly.

Therefore ONE-01 is:
- DESIGNED: PASS
- IMPLEMENTED: PASS
- TESTED: PASS
- PREVIEWABLE ONLINE: BLOCKED
- HUMAN_REVIEWED: PENDING
- DEPLOYED: NO
- PRODUCTION_VERIFIED: NO

## ROLLBACK
Revert the ONE-01 commits on draft PR #104. No production state, schema or live deployment was changed.

## NEXT_SAFE_ACTION
1. Keep PR #104 as the single canonical ONE-01 branch.
2. Continue non-production product hardening only if a test or review reveals a defect.
3. Do not create another parallel ONE-01 PR.
4. Online preview requires an explicitly selected non-production hosting path.
5. After ONE-01 preview/human review, MOBILE-01 may package the same canonical codebase for Android/iOS.
6. Portfolio safe engineering can continue with CORE-01 on a child branch of `ai-scd-core` without touching production.
