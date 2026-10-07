# SCD CORE — TODAY & ATTENTION Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the first R58.VI.4 replacement slice at `/r58/core-today/`: a role-aware, source-aware SCD CORE surface that shows one verified attention item or one useful fail-closed explanation, then the safest next action, with no synthetic operational data.

**Architecture:** Reuse the existing Node server, R20 identity/session authority, CORE Brain channels and verified adapters. Add a deterministic `TodayAttentionProjection`, a versioned semantic-command contract, and an isolated zero-based UI route; keep `/r58/manager/` untouched as rollback/evidence and never use it as the new visual baseline. The server owns authorization, source verification, filtering and projection so the browser never interprets raw upstream payloads.

**Tech Stack:** Node.js >=20, CommonJS/ESM already used by the repository, vanilla HTML/CSS/JS, existing R20 Apps Script bridge, Playwright browser QA, GitHub Actions, Render preview service.

**Spec:** `docs/superpowers/specs/2026-10-07-r58-vi-4-visual-reset-design.md` at approved commit `4dfc19ce2b5f61f355bfe178eff21ec2c696a4c4`.

## Global Constraints

- Canonical repository: `francesco1485/scd-colicoderviese-super-app`.
- Verified baseline: `main` = `b30669d85051d880ecac99e92199a3bb73e20c33`; R58 baseline = `5ca8998ba312d19ef32cf112e19e24e815f1e988`; both had zero drift when this plan was written.
- Implementation branch to create only after this plan gate: `r58-vi-4-core-today-reset`, based exactly on `r58-zero-based-product-rebuild` unless a fresh SCD:STATE check proves a newer approved baseline.
- `SCD_SYSTEM_MANIFEST.json` remains binding; current R58 candidate is `3.29.0 BINDING`. This slice changes UX/route/capability contracts, so implementation must advance the candidate manifest in the same branch/PR before claiming completion.
- R20 remains current identity / role / scope authority. No new auth system.
- Reuse existing CORE Brain and source adapters. No new database, calendar, CRM, server runtime or fourth SCD product.
- Supabase remains staged/dark wherever not already verified. No cutover in this slice.
- Old R57/R58 UI and preview surfaces are `SUPERSEDED_FOR_VISUAL_ACCEPTANCE`; preserve them for rollback/evidence and do not redesign in place.
- New acceptance target: route `/r58/core-today/`; preview service `scd-r58-core-today-preview`.
- Preview must run read-only (`SCD_PREVIEW_SAFE_MODE=true`). No production deployment, destructive migration, permission change, secret mutation or data write.
- No fake records, fake counts, synthetic deadlines, synthetic sponsor data, invented teams or invented calendar rows.
- U18 2026/27 is withdrawn/historical only and must never appear as active.
- Official marks come only from canonical verified assets; never regenerate an official logo with AI.
- Safeguarding remains isolated; no minor private data is surfaced by this slice.
- Above the fold contains one context line, one primary attention item or one fail-closed explanation, why it matters, one safe next action, and at most three secondary changed/next items.
- No decorative `URGENTI 0 / OGGI 0 / SCADENZE 0 / DOCUMENTI 0` strip, card wall, roadmap filler or fake AI action.
- Required viewport evidence: `360x800`, `390x844`, `430x932`, `1280x800`, `1440x900`, `1920x1080`.
- Accessibility gate: keyboard, visible focus, semantic labels, WCAG-compatible contrast, 44px mobile targets, `prefers-reduced-motion`.
- Completion requires exact route 2xx, expected commit served, tests/build green for the implementation branch, browser interaction green, provenance visible, useful fail-closed behavior, material visual difference, and human visual review.

## Review Focus

1. **Partially available sources:** verified records must render while missing channels are isolated as coverage gaps, never converted into global failure. Task 2 adds `partial_sources_keep_verified_primary`.
2. **Unauthorized or role-mismatched session:** API must fail closed server-side and the browser must not receive restricted projection data. Task 4 adds `role_scope_is_enforced_before_projection`.
3. **Withdrawn U18 2026/27 records:** an upstream/private source mentioning the withdrawn team must not become an active attention/next item. Task 2 adds `withdrawn_u18_is_filtered_before_ranking`.
4. **Command folklore / unavailable commands:** a configured label must not be reported as implemented unless the full chain is present. Task 3 adds `unimplemented_command_is_not_advertised_as_available`.
5. **Transient upstream failure / current CI 503 class:** preview and CI must remain deterministic and useful instead of failing because a live upstream is unavailable. Tasks 4 and 7 add fail-closed and deterministic-stub checks.

---

## File Structure Locked by This Plan

### Create
- `config/scd-command-grammar.v1.json` — versioned semantic command registry and implementation state.
- `lib/scd-command-grammar.js` — parser/lookup/role authorization for command records; no UI concerns.
- `lib/scd-today-attention.js` — deterministic `TodayAttentionProjection` builder; no network calls and no DOM.
- `r58/core-today/index.html` — isolated semantic shell for the new acceptance route.
- `r58/core-today/app.css` — zero-based responsive visual system for this slice only.
- `r58/core-today/app.js` — auth/session reuse, command launcher, projection rendering and interaction only.
- `tests/scd-command-grammar-contract.mjs` — command contract tests.
- `tests/scd-today-attention-contract.mjs` — projection/data truth tests.
- `tests/scd-core-today-api.mjs` — API auth/fail-closed/preview read-only integration tests using a deterministic stub.
- `tests/scd-core-today-browser.mjs` — six-viewport browser, accessibility, command and material-difference evidence.

### Modify
- `SCD_SYSTEM_MANIFEST.json` — register the new capability/route/command grammar and candidate release state; do not change product count or authorities.
- `server.js` — factor reusable CORE Brain builder, enforce withdrawn-team filtering, expose `/api/core-today`, and keep `/api/core-brain` backward compatible.
- `package.json` — add focused contract/API/browser scripts and wire contract tests into existing checks.
- `scripts/build-pages.mjs` — include the isolated R58 core-today static route/assets in exact build artifacts without caching private payload data.
- `.github/workflows/e2e.yml` — run focused contracts and start the existing deterministic upstream stub for browser/API smoke so CI does not depend on flaky live R20 availability.

### Explicitly Do Not Modify
- `r58/manager/*` except read-only comparison in browser QA.
- Existing R57 preview routes/services.
- Production Render services.
- R20 Apps Script deployment or secrets.
- Supabase schema/auth configuration.

## Interface Contracts

### `TodayAttentionProjection`
`buildTodayAttentionProjection(input) -> projection` in `lib/scd-today-attention.js`.

Input shape:
```js
{
  brain,              // normalized CORE Brain object, not raw upstream payload
  roleScope,          // verified server-side role/scope array
  commandTrigger,     // '/today' or '/attention' for this first vertical slice
  now                 // ISO timestamp injected by server/tests
}
```

Output shape:
```js
{
  generated_at,
  source_state,       // VERIFIED | PARTIAL | UNVERIFIED
  role_scope,
  primary_attention,  // null or {id,title,reason,owner,due_at,source,verification_state,next_action}
  changed,            // max 3
  next,               // max 3
  coverage,
  fail_closed         // null or actionable explanation with missing source + safe consequence
}
```

Ranking is deterministic and may use only explicit upstream evidence: `explicitPriorityScore DESC`, then valid `due_at ASC`, then stable `id ASC`. No text sentiment or inferred urgency.

### `SCD_COMMAND_GRAMMAR_V1`
`resolveCommand(trigger, identityContext) -> {ok, command, reason}` in `lib/scd-command-grammar.js`.

- Registry contains the spec P0 records: `/today`, `/attention`, `/calendar`, `/people`, `/deadlines`, `/brand`, `/layers`.
- Only commands whose complete runtime chain exists may have `implementation_state: IMPLEMENTED`.
- This first slice must implement `/today` and `/attention`; other P0 records remain explicitly `CONTRACT_DEFINED` or `BLOCKED_SOURCE` until their own visible/provenance chain exists.
- The UI shows only `IMPLEMENTED` commands as executable. No fake command capability.

### API
`POST /api/core-today`

Request:
```json
{"sessionToken":"<R20 session>","command":"/today","input":{}}
```

Success: `200` with `{ok:true, projection, command, runtime}`.

Auth failures: `401`/`403` with neutral error codes and no restricted projection body.

Source failure: `200` with a valid fail-closed projection when identity is valid but operational sources are unavailable. Upstream unavailability is a product state, not a reason to invent data.

---

## Task 1: Re-verify Baseline, Isolate Branch, and Register Manifest Impact

**Files:**
- Modify: `SCD_SYSTEM_MANIFEST.json`
- Test: existing `scripts/validate-system-manifest.mjs` plus new focused assertions in Task 2/3

**Interfaces:**
- Consumes: approved spec commit and live SCD:STATE.
- Produces: implementation branch baseline and manifest capability identifiers used by every later task.

- [ ] **Step 1: Run SCD:STATE again immediately before branch creation**

Verify repository, `main`, R58 baseline, open PRs, CI, Render services, manifest version/hash, data-source state, blockers and safe next action. Expected: no hidden drift; if drift exists, stop and reconcile before writing.

- [ ] **Step 2: Create isolated branch/worktree from the verified R58 baseline**

Branch: `r58-vi-4-core-today-reset`.

Do not branch from `main` and do not mutate `r58-zero-based-product-rebuild`.

- [ ] **Step 3: Add manifest contract for the slice**

Register one capability such as `CAP-CORE-TODAY-ATTENTION` under SCD CORE, route `/r58/core-today/`, sources `R20/SCD_GMAIL/SCD_DRIVE` through existing CORE Brain, command contract `SCD_COMMAND_GRAMMAR_V1`, state `IMPLEMENTATION_ACTIVE`, and old visual routes as rollback/evidence only. Advance candidate manifest from `3.29.0` to `3.30.0` unless live state has already advanced it.

- [ ] **Step 4: Run manifest validation**

Run: `npm run test:manifest`

Expected: PASS and exactly three SCD business products remain visible.

- [ ] **Step 5: Commit**

```bash
git add SCD_SYSTEM_MANIFEST.json
git commit -m "chore: register R58 core today attention slice"
```

---

## Task 2: Build the TodayAttentionProjection Contract First

**Files:**
- Create: `lib/scd-today-attention.js`
- Create: `tests/scd-today-attention-contract.mjs`
- Modify: `server.js` only to preserve team/source fields required by the projection after tests define them.

**Interfaces:**
- Consumes: existing CORE Brain `actionQueue`, `channels`, `health`, `identity`, `provenance`; `SCDSeasonStatus` withdrawn-team helpers.
- Produces: `buildTodayAttentionProjection(input)` for Task 4 and browser UI.

- [ ] **Step 1: Write failing projection tests**

Test names/assertions:
- `verified_priority_becomes_single_primary_attention`: one explicit P1/ALTA item becomes `primary_attention`; source and verification state are preserved.
- `ranking_is_deterministic`: explicit priority desc, due asc, stable id asc.
- `no_source_creates_useful_fail_closed_projection`: no primary item, no zero counters, `source_state=UNVERIFIED`, missing source and safe next action present.
- `partial_sources_keep_verified_primary`: verified item remains visible while unavailable channels appear in `coverage`.
- `changed_and_next_are_capped_at_three`: arrays never exceed three.
- `withdrawn_u18_is_filtered_before_ranking`: U18 2026/27 row is absent from primary/changed/next.
- `no_synthetic_item_is_created`: empty verified arrays stay empty.
- `next_action_mode_is_read_or_human_gate_only`: this preview slice never emits an unguarded write action.

- [ ] **Step 2: Run tests and confirm RED**

Run: `node tests/scd-today-attention-contract.mjs`

Expected: FAIL because `lib/scd-today-attention.js` does not exist.

- [ ] **Step 3: Implement the minimal pure projection module**

Export `buildTodayAttentionProjection`, `rankAttention`, and `sourceStateFromBrain`. No fetch, DOM, localStorage or server globals.

- [ ] **Step 4: Preserve required verified fields in CORE Brain**

In `server.js`, extend `coreBrainActionFromRow()` only with source-backed fields needed by the projection (`team/category`, explicit approval flag, safe source URL where already verified). Filter withdrawn U18 records before they enter `actionQueue`. Do not change auth or source definitions.

- [ ] **Step 5: Run focused and legacy CORE tests**

Run:
```bash
node tests/scd-today-attention-contract.mjs
npm run test:scd-core-contract
```

Expected: both PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/scd-today-attention.js tests/scd-today-attention-contract.mjs server.js
git commit -m "feat: add verified today attention projection"
```

---

## Task 3: Define and Enforce SCD_COMMAND_GRAMMAR_V1

**Files:**
- Create: `config/scd-command-grammar.v1.json`
- Create: `lib/scd-command-grammar.js`
- Create: `tests/scd-command-grammar-contract.mjs`

**Interfaces:**
- Consumes: verified R20 role/scope identity.
- Produces: `resolveCommand(trigger, identityContext)` and `listImplementedCommands(identityContext)` for Task 4/5.

- [ ] **Step 1: Write failing grammar tests**

Assertions:
- every record has `command_id`, `trigger`, `intent`, `allowed_roles`, `input_schema`, `source_requirements`, `output_types`, `human_gate`, `audit_event`, `fail_closed_state`, `implementation_state`;
- triggers are unique and start with `/`;
- `/today` and `/attention` are `IMPLEMENTED` for authorized CORE roles;
- unauthorized role returns `ROLE_SCOPE_DENIED`;
- unknown trigger returns `UNKNOWN_COMMAND`;
- `unimplemented_command_is_not_advertised_as_available`: `/brand`, `/layers`, `/people`, `/calendar`, `/deadlines` are not exposed as implemented unless their full chain is added in the same implementation branch.

- [ ] **Step 2: Run tests and confirm RED**

Run: `node tests/scd-command-grammar-contract.mjs`

Expected: FAIL because registry/engine do not exist.

- [ ] **Step 3: Implement registry + pure resolver**

Keep data in JSON and logic in JS. No prompt strings, hidden aliases or magical fallbacks.

- [ ] **Step 4: Run grammar tests**

Run: `node tests/scd-command-grammar-contract.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add config/scd-command-grammar.v1.json lib/scd-command-grammar.js tests/scd-command-grammar-contract.mjs
git commit -m "feat: add SCD command grammar v1"
```

---

## Task 4: Expose a Server-Owned `/api/core-today` Projection

**Files:**
- Modify: `server.js`
- Create: `tests/scd-core-today-api.mjs`
- Modify: `tests/ci-upstream-stub.mjs` only if additional deterministic authorized fixtures are required.

**Interfaces:**
- Consumes: `resolveCommand()`, `buildTodayAttentionProjection()`, existing `coreBrainChannel()` and R20 session validation.
- Produces: authenticated `POST /api/core-today` response for Task 5.

- [ ] **Step 1: Write failing API integration tests**

Cases:
- `missing_session_returns_401`;
- `invalid_session_returns_401_without_projection`;
- `role_scope_is_enforced_before_projection`;
- `authorized_session_returns_projection_not_raw_channels`;
- `unavailable_operational_sources_return_200_fail_closed_projection`;
- `preview_mode_blocks_write_actions_and_core_today_remains_read_only`;
- `unknown_or_contract_only_command_is_rejected_without_fake_output`.

- [ ] **Step 2: Run API test and confirm RED**

Run: `node tests/scd-core-today-api.mjs`

Expected: FAIL because `/api/core-today` does not exist.

- [ ] **Step 3: Refactor CORE Brain construction without changing its public contract**

Extract `buildCoreBrain(sessionToken)` from the current handler. `handleCoreBrain()` remains backward compatible; `handleCoreToday()` calls the same builder then the projection module.

- [ ] **Step 4: Add `/api/core-today`**

Server sequence must be: parse request -> validate R20 session -> derive verified role/scope -> resolve/authorize command -> build CORE Brain from existing channels -> filter/projection -> return provenance-aware projection.

- [ ] **Step 5: Run API, CORE and preview-safety tests**

Run:
```bash
node tests/scd-core-today-api.mjs
npm run test:scd-core-contract
npm run test:preview-safe-mode
```

Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add server.js tests/scd-core-today-api.mjs tests/ci-upstream-stub.mjs
git commit -m "feat: expose authorized core today projection"
```

---

## Task 5: Build the Zero-Based `/r58/core-today/` UI

**Files:**
- Create: `r58/core-today/index.html`
- Create: `r58/core-today/app.css`
- Create: `r58/core-today/app.js`

**Interfaces:**
- Consumes: `POST /api/core-today`, existing R20 session semantics, canonical logo asset path.
- Produces: first human-judgable replacement view.

- [ ] **Step 1: Write the static/browser assertions before UI implementation**

Place initial structure assertions in `tests/scd-core-today-browser.mjs`: exact route exists; one `<main>` landmark; context region; one primary attention region; one primary action; one compact secondary rail; command launcher; no `.priority-strip`; no decorative zero metrics; meaningful text navigation.

- [ ] **Step 2: Run browser test and confirm RED**

Expected: 404 or missing selectors for `/r58/core-today/`.

- [ ] **Step 3: Implement semantic HTML first**

Above the fold order is fixed: club/role/date/source -> dominant item or fail-closed message -> why/source/owner/due -> one safe primary action -> max-three secondary changed/next.

- [ ] **Step 4: Implement projection rendering only**

`app.js` may render the normalized projection but must not score, infer, merge or reconstruct raw upstream data. Escape all source text. No `innerHTML` with unescaped operational data.

- [ ] **Step 5: Reuse R20 session without duplicating auth**

Use the current session key/handshake semantics already present in R58. If no valid session exists, show the existing R20 access flow or a neutral access-required state; do not create credentials or role selectors.

- [ ] **Step 6: Implement semantic command launcher as progressive enhancement**

Expose only commands returned as implemented/authorized. Direct visible action remains available without typing a command.

- [ ] **Step 7: Commit**

```bash
git add r58/core-today/
git commit -m "feat: build zero based core today experience"
```

---

## Task 6: Responsive, Accessibility, Brand and State Quality Gate

**Files:**
- Modify: `r58/core-today/app.css`
- Modify: `r58/core-today/index.html`
- Modify: `r58/core-today/app.js`
- Modify: `tests/scd-core-today-browser.mjs`

**Interfaces:**
- Consumes: Task 5 UI.
- Produces: viewport/accessibility behavior required before deployment.

- [ ] **Step 1: Add failing accessibility/responsive browser assertions**

Assert: no horizontal overflow at all six target viewports; 44px interactive targets on mobile; keyboard can reach command launcher and primary action; focus ring is visible; state is not color-only; reduced motion disables non-essential transitions; canonical logo URL resolves; no unauthorized raster/logo replacement.

- [ ] **Step 2: Run and confirm failures where expected**

Run the focused Playwright test against local server.

- [ ] **Step 3: Implement 12-column desktop / single-column mobile composition**

Desktop may use context/work/evidence columns; mobile must become one action flow, not a squeezed sidebar. Use 4/8px spacing scale and a small semantic type hierarchy.

- [ ] **Step 4: Implement true loading/empty/partial/error states**

No skeleton fake numbers. Internal runtime/stack language never appears in user-facing copy.

- [ ] **Step 5: Run browser assertions**

Expected: PASS for layout/accessibility state assertions.

- [ ] **Step 6: Commit**

```bash
git add r58/core-today/ tests/scd-core-today-browser.mjs
git commit -m "feat: harden core today responsive accessibility"
```

---

## Task 7: Integrate Build and Deterministic CI

**Files:**
- Modify: `package.json`
- Modify: `scripts/build-pages.mjs`
- Modify: `.github/workflows/e2e.yml`
- Reuse: `tests/ci-upstream-stub.mjs`

**Interfaces:**
- Consumes: all focused tests and static route files.
- Produces: reproducible branch CI and exact preview artifact.

- [ ] **Step 1: Add focused npm scripts**

Add scripts for command grammar, today projection, core-today API and core-today browser tests. Wire non-browser contracts into `npm run check`.

- [ ] **Step 2: Add route files to exact build artifact**

`scripts/build-pages.mjs` must copy `r58/core-today/index.html`, `app.css`, `app.js`, command registry and required pure modules. Do not cache private API payloads.

- [ ] **Step 3: Make E2E use the existing deterministic CI upstream**

Start `tests/ci-upstream-stub.mjs` before the SCD server in GitHub Actions and set `SCD_APPS_SCRIPT_URL=http://127.0.0.1:18080/` for CI browser/API checks. This removes the inherited live-upstream HTTP 503 class from CI without pretending production R20 is healthy.

- [ ] **Step 4: Add the focused core-today browser step after Playwright install**

Upload screenshots/evidence as workflow artifacts even on failure.

- [ ] **Step 5: Run local verification**

Run:
```bash
npm run check
npm run build:pages
node tests/scd-core-today-api.mjs
node tests/scd-core-today-browser.mjs
```

Expected: all focused checks PASS; full legacy suite may only be called green when the exact run evidence is green.

- [ ] **Step 6: Commit**

```bash
git add package.json scripts/build-pages.mjs .github/workflows/e2e.yml
git commit -m "ci: verify core today with deterministic upstream"
```

---

## Task 8: Browser Verification and Material-Difference Evidence

**Files:**
- Modify: `tests/scd-core-today-browser.mjs`
- Evidence output: `test-output/r58-core-today-*` and `test-output/r58-manager-baseline-*` (CI artifact, not canonical runtime data).

**Interfaces:**
- Consumes: local exact build/server and both new/old routes.
- Produces: objective acceptance evidence before Render.

- [ ] **Step 1: Test all six required viewports**

At each viewport assert route 2xx, no overflow, no console/page errors caused by this slice, primary hierarchy exists, source/provenance is visible, and command/direct action interaction works.

- [ ] **Step 2: Test fail-closed browser state**

Use deterministic authorized identity with unavailable operational channels. Assert one purposeful explanation is shown and there are no zero-count tiles or synthetic records.

- [ ] **Step 3: Test verified browser state**

Use deterministic verified source fixture. Assert exactly one dominant primary attention item, one safe action and max three secondary items.

- [ ] **Step 4: Capture side-by-side screenshots against `/r58/manager/`**

Assert structural markers from the rejected UI (`priority-strip`, four zero counters, generic card wall) are absent from the new route. Screenshots prove material difference; they do not mutate the old route.

- [ ] **Step 5: Commit test/evidence logic only**

```bash
git add tests/scd-core-today-browser.mjs
git commit -m "test: prove core today material visual difference"
```

---

## Task 9: Fresh Render Preview and Exact-SHA Proof

**Files/Infra:**
- No production file change required unless a Render-specific config is already canonical in-repo.
- New service: `scd-r58-core-today-preview`.

**Interfaces:**
- Consumes: verified branch HEAD after Tasks 1–8.
- Produces: public preview URL/evidence for human review.

- [ ] **Step 1: Re-run SCD:STATE before deploy**

Verify exact branch HEAD, CI run, no unexpected drift, preview-safe env and no production target.

- [ ] **Step 2: Create or configure the fresh Render preview service**

Required branch: `r58-vi-4-core-today-reset`; build: existing `npm install && npm run build`; start: existing `npm start`; env includes `SCD_PREVIEW_SAFE_MODE=true`. Do not repoint old preview services.

- [ ] **Step 3: Verify deploy status and commit**

Render deploy must be `live` and its commit must equal the branch HEAD.

- [ ] **Step 4: Verify exact route**

Open `https://<new-service>.onrender.com/r58/core-today/` and verify the six target viewports, interactions, fail-closed behavior, network status and console.

- [ ] **Step 5: Verify served SHA**

`GET /health` must expose the expected `commit`; mismatch blocks delivery.

---

## Task 10: Canonical Checkpoint, Review and Human Visual Gate

**Files/State:**
- GitHub Issue `#137` — implementation gate and visual review evidence.
- GitHub Issue `#132` — master R58.VI checkpoint/link.
- PR from `r58-vi-4-core-today-reset` only when branch evidence is ready.

**Interfaces:**
- Consumes: test/CI/Render/browser evidence.
- Produces: auditable checkpoint; no merge/decommission authorization.

- [ ] **Step 1: Run whole-branch code/review gate**

Use the required review skill/agent for the chosen execution method. Resolve high-confidence defects before presenting the preview.

- [ ] **Step 2: Post evidence to Issue #137**

Include exact branch, commit SHA, CI run/result, Render deploy ID, exact route, viewport/browser results, fail-closed result, provenance result, material-difference evidence and any remaining blocker.

- [ ] **Step 3: Link the checkpoint from Issue #132**

Keep #132 master concise; #137 remains the detailed gate.

- [ ] **Step 4: Present the preview to the user for human visual review**

Delivery must include: EXACT URL, EXACT ROUTE, COMMIT SHA, DEPLOY ID, TEST RESULT, and what can actually be seen/used.

- [ ] **Step 5: Stop before merge/decommission**

No production merge, no old-preview deletion and no production cutover until explicit human authorization after visual review.

---

## WP Coverage Map

| Required WP | Plan task |
|---|---|
| WP1 State recovery + exact branch baseline | Task 1 |
| WP2 Acceptance/contract tests first | Tasks 2–4 |
| WP3 TodayAttentionProjection | Task 2 |
| WP4 SCD_COMMAND_GRAMMAR_V1 P0 | Task 3 |
| WP5 New zero-based visual frontend | Task 5 |
| WP6 Responsive / accessibility | Task 6 |
| WP7 Build + CI | Task 7 |
| WP8 Fresh Render preview | Task 9 |
| WP9 Browser verification exact route | Tasks 8–9 |
| WP10 Side-by-side material-difference review | Task 8 |
| WP11 Human visual review | Task 10 |
| WP12 Checkpoint / issue update / PR readiness | Task 10 |

## Definition of Done

The slice is DONE only when code exists; focused and applicable regression tests pass; build passes; CI evidence is green for the implementation branch; fresh preview is live; served SHA is verified; `/r58/core-today/` is browser-tested; six viewports pass; no fake data appears; role/scope is enforced server-side; provenance is visible; fail-closed is useful; accessibility gates pass; visual hierarchy is materially different from rejected R57/R58; and the user can judge the exact URL.

Anything less is `IN_PROGRESS` or `BLOCKED`, never `DONE`.

## Rollback

- Delete/disable only the new isolated route/service or revert the implementation branch commits.
- No data migration is required.
- `/r58/manager/` and existing R57/R58 services remain untouched as rollback/evidence.
- R20, existing auth, current source adapters and production services remain unchanged.

## Self-Review Result

- Spec coverage: PASS. Every first-slice requirement in sections 5, 6, 10–18 of the approved spec maps to a task.
- Step scan: PASS. Each step has one checkable result; implementation bodies are intentionally not pre-written.
- Type consistency: PASS. `buildTodayAttentionProjection`, `resolveCommand`, `POST /api/core-today`, and the projection field names are stable across tasks.
- Review Focus: PASS. Partial source, authorization, withdrawn U18, command implementation truth and upstream 503 classes each have an owning test.
- Proportion: PASS. The plan fixes interfaces/tests/files without transcribing the application.
