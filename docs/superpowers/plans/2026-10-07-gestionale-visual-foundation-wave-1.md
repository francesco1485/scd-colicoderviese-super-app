# GESTIONALE Visual Foundation Wave 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and visually prove the first canonical SCD visual foundation for GESTIONALE without yet changing live product screens, authentication, databases, or production routing.

**Architecture:** Wave 1 creates a data-driven visual grammar, governed face/logo/accessory rules, shared CSS primitives, and an internal Visual Lab that demonstrates the eight approved macro templates and the reusable micro-primitives. Runtime adoption is deliberately deferred to later plans so the foundation can be rejected or corrected without destabilizing APP SOCIAL, GESTIONALE, SPONSOR, R20, Supabase, or production.

**Tech Stack:** Existing Node.js >=20 repository; JSON contracts; plain CSS; plain HTML/JavaScript; SVG assets; Node contract tests; Playwright visual QA in the existing CI stage after Playwright installation.

**Spec:** `docs/superpowers/specs/2026-10-07-gestionale-visual-foundation-design.md`

## Global Constraints

- No product code, auth migration, database migration, deploy, or production change before this plan is reviewed and its execution method is explicitly selected.
- User-facing project names are `APP SOCIAL`, `GESTIONALE`, and `SPONSOR`; historical SCD ONE / SCD CORE / SCD GROW names are implementation history only unless a runtime contract still requires them.
- R20 remains the current identity/role/scope authority until a verified migration is approved.
- No new parallel auth, database, calendar, CRM, or gestionale.
- Official SCD/LND/SGS/Monza/mascot assets remain `KEEP_LOCKED`; never redraw or regenerate them.
- Real faces, especially minors, are never introduced into the Visual Lab; only neutral/initials fallbacks are used in Wave 1.
- No fake sport, sponsor, financial, facility, or people data may be presented as real. All Visual Lab fixture content is visibly marked `DEMO_NOT_RUNTIME`.
- Safeguarding remains isolated from ordinary CRM, chat, analytics, and preview fixture data.
- Desktop and mobile are different compositions of the same semantic design system.
- Drag-only interaction is forbidden as the sole access path for any future spatial operation.
- WebGPU, 3D, CRDT collaboration, IoT, and physical digital twin are not Wave 1 dependencies.
- `prefers-reduced-motion`, keyboard focus, touch target sizing, and high-contrast behavior remain mandatory.
- The current live product surfaces must not load the new Wave 1 stylesheet until a later runtime-adoption plan is separately approved.

## Review Focus

1. **Minor/profile image without public consent** must resolve to initials or neutral silhouette, never an unauthorized photo; pinned by Task 3 tests.
2. **Unknown or unverified logo/accessory reference** must fail closed to a neutral `UNVERIFIED` representation rather than inventing an asset; pinned by Task 3 tests.
3. **Very narrow mobile viewport (320–379 px)** must not horizontally overflow the Visual Lab and must retain >=44 px interactive targets; pinned by Task 5 visual QA.
4. **Reduced-motion user preference** must eliminate non-essential transitions/animation while preserving state feedback; pinned by Task 4 contract and Task 5 browser QA.
5. **A component rendered in more than one macro template** must preserve the same semantic state and accessible label even when density/appearance changes; pinned by Task 4/5 tests.

---

## Program decomposition

The approved spec spans independent subsystems, so implementation is intentionally split into separate plans. This document is **Wave 1 only**.

Later plans, each requiring its own review before execution:

1. Identity & Cross-App Shell
2. Public Editorial Home
3. Spatial Engine Core
4. Formation Scene
5. Van / Transport Scene
6. Fields / Locker Rooms Scene
7. Warehouse / Supply Scene
8. Communication Hub + Operational CRM
9. Payments / Purchases / Sales
10. AI Workbench + Command / Simulation
11. Sponsor spatial/public projections
12. Observability / QA / evolution
13. Optional SCD project Skill packaging after the visual foundation is proven

Wave 1 must not smuggle those later subsystems into this change.

---

### Task 0: Execution Base and State Gate

**Files:**
- Read: `AGENTS.md`
- Read: `SCD_SYSTEM_MANIFEST.json`
- Read: `config/user-directives.v1.json`
- Read: `config/scd-visual-references.v1.json`
- Read: `config/scd-assets.v1.json`
- Read: `docs/superpowers/specs/2026-10-07-gestionale-visual-foundation-design.md`
- No product file write until this task passes.

**Interfaces:**
- Consumes: Git branch state, manifest version, open PR state, CI state.
- Produces: exact implementation base SHA and isolated worktree/branch selected for Tasks 1–6.

- [ ] **Step 1: Re-run SCD:STATE before implementation**

Verify:
- repository;
- current `main` SHA;
- open PRs;
- current manifest version/hash on `main`;
- status of `r58-vi-4-core-today-reset`;
- comparison of `main...r58-vi-4-core-today-reset`;
- CI status of the candidate base;
- no newer approved GESTIONALE spec supersedes this one.

Expected: every field is `VERIFIED`, `NOT_APPLICABLE`, or explicitly `NOT_AVAILABLE`; no unknown is silently treated as absent.

- [ ] **Step 2: Select the implementation base by deterministic rule**

Rule:
1. If `r58-vi-4-core-today-reset` is still strictly ahead of `main`, not behind, and remains the branch containing newer valid technical contracts, use its verified head as the implementation base while treating its visual UI as `SUPERSEDED_FOR_VISUAL_ACCEPTANCE`.
2. If `main` already contains those technical commits, use current `main`.
3. If neither condition is true, STOP and surface the divergence before any write.

Expected: one exact base SHA, not a branch-name assumption.

- [ ] **Step 3: Create isolated implementation worktree/branch**

Use `superpowers:using-git-worktrees` at execution time.

Branch name:

`feat/gestionale-visual-foundation-wave-1`

Expected: clean working tree based on the exact SHA from Step 2.

- [ ] **Step 4: Run baseline tests before changes**

Run:
```bash
npm install
npm run test:manifest
npm run test:asset-adaptive-contract
npm run test:design-system
```

Expected: PASS. If a baseline test fails before this work, record it as pre-existing and stop before modifying its owned contract unless the plan explicitly includes the fix.

- [ ] **Step 5: Commit no changes**

Task 0 is a gate only. No commit.

---

### Task 1: Register Wave 1 Governance Contracts

**Files:**
- Modify: `SCD_SYSTEM_MANIFEST.json`
- Modify: `SCD_SYSTEM_MANIFEST.schema.json`
- Modify: `config/user-directives.v1.json`
- Modify: `scripts/validate-system-manifest.mjs`
- Test: `scripts/validate-system-manifest.mjs`

**Interfaces:**
- Consumes: approved spec path; current manifest version from Task 0.
- Produces:
  - capability ids `CAP-GESTIONALE-VISUAL-FOUNDATION` and `CAP-GESTIONALE-SPATIAL-UI`;
  - canonical user-facing project aliases `APP_SOCIAL`, `GESTIONALE`, `SPONSOR`;
  - design-only Wave 1 governance references;
  - no new core experience route.

- [ ] **Step 1: Write failing manifest assertions**

Add assertions to `scripts/validate-system-manifest.mjs` that require:

```js
CAP-GESTIONALE-VISUAL-FOUNDATION
CAP-GESTIONALE-SPATIAL-UI
```

and require a visual-system contract carrying:

```text
macro_template_registry
micro_primitive_registry
face_policy
accessory_library
spatial_scene_model
```

Expected state before implementation: FAIL because those contracts do not yet exist.

- [ ] **Step 2: Run the manifest test and prove RED**

Run:
```bash
npm run test:manifest
```

Expected: FAIL on the newly added Wave 1 assertions.

- [ ] **Step 3: Update manifest/schema with the minimum approved contract**

Modify `SCD_SYSTEM_MANIFEST.json` without changing the existing six core experiences.

Add capabilities:

```text
CAP-GESTIONALE-VISUAL-FOUNDATION
domain = UX_HMI_GRAPHICS
required = true
state = DESIGN_ONLY

CAP-GESTIONALE-SPATIAL-UI
domain = SPATIAL_OPERATIONS
required = true
state = DESIGN_ONLY
```

Add visual-system references pointing to:

```text
config/scd-ui-grammar.v1.json
config/scd-face-policy.v1.json
config/scd-accessory-library.v1.json
```

Version rule: increment the manifest minor version by exactly one from the **actual implementation-base manifest version** observed in Task 0; do not hard-code `3.28.0` if the selected base is already newer.

Schema: permit and validate the new visual-system keys and capability ids without weakening existing constraints.

- [ ] **Step 4: Record the approved user directive**

Append one normalized directive to `config/user-directives.v1.json` named:

`GESTIONALE_VISUAL_FOUNDATION_AND_SPATIAL_UI_APPROVED`

It must preserve:
- public editorial front door;
- macro/micro template grammar;
- logos/faces/accessories as first-class objects;
- one-account future cross-app access;
- 2D spatial operations;
- no stack freeze before technical spikes.

- [ ] **Step 5: Run manifest validation**

Run:
```bash
npm run test:manifest
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add SCD_SYSTEM_MANIFEST.json SCD_SYSTEM_MANIFEST.schema.json config/user-directives.v1.json scripts/validate-system-manifest.mjs
git commit -m "chore: register Gestionale visual foundation contracts"
```

---

### Task 2: Create the Macro/Micro UI Grammar

**Files:**
- Create: `config/scd-ui-grammar.v1.json`
- Create: `tests/gestionale-visual-foundation-contract.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: `config/scd-visual-system.json`; Wave 1 manifest references from Task 1.
- Produces:
  - `macroTemplates[]`
  - `microPrimitives[]`
  - stable ids consumed by CSS, Visual Lab, and later runtime plans.

Required macro ids:

```text
T01_PUBLIC_EDITORIAL
T02_OPERATIONAL_HOME
T03_DOMAIN_HUB
T04_ENTITY_DETAIL
T05_SPATIAL_WORKSPACE
T06_COMMUNICATION_HUB
T07_DATA_FINANCE
T08_PROJECT_DEVELOPMENT
```

Required micro primitive ids:

```text
PERSON_TOKEN
PLAYER_TOKEN
TEAM_BADGE
ROLE_BADGE
NUMBER_BADGE
STATUS_CHIP
SOURCE_BADGE
CONSENT_BADGE
LOGO_LOCKUP
FACE_AVATAR
JERSEY_TOKEN
VEHICLE_TOKEN
SEAT_SLOT
LOCKER_SLOT
ROOM_SLOT
FIELD_ZONE
ASSET_TOKEN
WAREHOUSE_LOCATION
DOCUMENT_CHIP
PAYMENT_CHIP
MESSAGE_BUBBLE
NOTIFICATION_ITEM
TIMELINE_ITEM
ACTION_BUTTON
AI_SUGGESTION
PROVENANCE_TAG
WARNING_BLOCK_STATE
AVAILABILITY_INDICATOR
ASSIGNMENT_HANDLE
QR_BARCODE_OBJECT
MEDIA_TILE
```

- [ ] **Step 1: Write the failing grammar contract test**

In `tests/gestionale-visual-foundation-contract.mjs`, load the grammar file and assert:
- exactly 8 macro template ids above;
- all required micro ids exist and are unique;
- each macro declares `purpose`, `allowedPrimitives`, `density`, `responsiveMode`;
- each micro primitive declares `semanticPurpose`, `states`, `sizes`, `accessibility`;
- no template id is named after a historical product alias such as `SCD_CORE`.

- [ ] **Step 2: Add npm test command and prove RED**

Add:

```json
"test:gestionale-visual-foundation": "node tests/gestionale-visual-foundation-contract.mjs"
```

Run:
```bash
npm run test:gestionale-visual-foundation
```

Expected: FAIL because `config/scd-ui-grammar.v1.json` does not exist.

- [ ] **Step 3: Create `config/scd-ui-grammar.v1.json`**

Use:

```text
schemaVersion = 1.0.0
id = SCD_GESTIONALE_UI_GRAMMAR
status = DESIGN_FOUNDATION
```

Each macro template defines only composition rules, not business data.

Each primitive defines state vocabulary and semantic behavior, not fake runtime values.

- [ ] **Step 4: Run contract test**

Run:
```bash
npm run test:gestionale-visual-foundation
```

Expected: PASS for the grammar section.

- [ ] **Step 5: Commit**

```bash
git add config/scd-ui-grammar.v1.json tests/gestionale-visual-foundation-contract.mjs package.json
git commit -m "feat: define Gestionale macro and micro UI grammar"
```

---

### Task 3: Create Face, Logo and Accessory Governance

**Files:**
- Create: `config/scd-face-policy.v1.json`
- Create: `config/scd-accessory-library.v1.json`
- Create: `assets/ui/faces/neutral-person.svg`
- Create: `assets/ui/accessories/*.svg`
- Modify: `config/scd-assets.v1.json`
- Modify: `tests/gestionale-visual-foundation-contract.mjs`

**Interfaces:**
- Consumes: existing locked assets in `config/scd-assets.v1.json`.
- Produces:
  - `resolveFaceLevel` policy data for later runtime;
  - accessory ids grouped by domain;
  - neutral fallbacks;
  - exact provenance/verification requirements.

Required face levels:

```text
L0_INITIALS_OR_SILHOUETTE
L1_PROFILE_PHOTO
L2_SPORT_CUTOUT
L3_PREMIUM_EDITORIAL_PORTRAIT
```

Required accessory groups:

```text
FOOTBALL
PEOPLE
LOGISTICS
FACILITY
WAREHOUSE
ADMINISTRATION
COMMUNICATION
SPONSOR
```

- [ ] **Step 1: Extend the failing contract**

Assert:
- all four face levels exist;
- public visibility requires `PUBLIC_ALLOWED=true`;
- commercial visibility requires `COMMERCIAL_ALLOWED=true`;
- a minor/unknown-consent case resolves to L0 policy;
- accessory groups above exist;
- each accessory declares `id`, `group`, `masterPath`, `states`, `sourceClass`;
- every master path exists;
- locked official assets keep their current blob SHA entries untouched;
- unknown asset state is `UNVERIFIED`, never a fabricated logo.

- [ ] **Step 2: Run contract and prove RED**

Run:
```bash
npm run test:gestionale-visual-foundation
```

Expected: FAIL on missing face/accessory files.

- [ ] **Step 3: Create the face policy**

Create `config/scd-face-policy.v1.json` with decision order:

```text
NO_ALLOWED_PHOTO -> L0
INTERNAL_ALLOWED_ONLY + internal context -> highest internal-permitted level
PUBLIC_ALLOWED=false + public context -> L0
COMMERCIAL_ALLOWED=false + sponsor/commercial context -> L0
EXPIRED consent -> L0
UNKNOWN consent -> L0
```

Do not include any real person or real minor photo.

- [ ] **Step 4: Create the accessory registry and neutral SVG family**

Create original, non-branded vector masters for the accessory categories required by the approved spec.

Minimum accessory ids:

```text
FOOTBALL_BALL
FOOTBALL_CONE
FOOTBALL_BIB
FOOTBALL_GOAL
FOOTBALL_BAG
TACTICAL_BOARD
WHISTLE
MEDICAL_KIT
JERSEY
PLAYER_NUMBER
CAPTAIN_BADGE
STAFF_BADGE
DIRECTOR_BADGE
VAN
CAR
SEAT
LUGGAGE
STOP
KEY
FIELD
LOCKER_ROOM
LOCKER
SHOWER
GYM
CLUBHOUSE
WAREHOUSE
BOX
SHELF
SIZE
SKU
BARCODE
QR
DOCUMENT
INVOICE
PAYMENT
CONTRACT
RECEIPT
MESSAGE
EMAIL
WHATSAPP_CHANNEL
PUSH
ALERT
LED_BOARD
BANNER
SHIRT_PLACEMENT
STAND
TRIBUNE
HOSPITALITY
```

All original SVGs use the SCD token system and must not copy third-party icon artwork.

- [ ] **Step 5: Register generated originals without disturbing locked masters**

Update `config/scd-assets.v1.json` with a separate `ui_original_assets` collection.

Do not alter the locked SHA/provenance records for official assets.

- [ ] **Step 6: Run asset + visual foundation contracts**

Run:
```bash
npm run test:asset-adaptive-contract
npm run test:gestionale-visual-foundation
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add config/scd-face-policy.v1.json config/scd-accessory-library.v1.json config/scd-assets.v1.json assets/ui tests/gestionale-visual-foundation-contract.mjs
git commit -m "feat: add governed faces and SCD accessory library"
```

---

### Task 4: Build the Shared Visual Foundation CSS

**Files:**
- Create: `styles/scd-visual-foundation.css`
- Modify: `config/scd-visual-system.json`
- Modify: `tests/gestionale-visual-foundation-contract.mjs`
- Do not modify: live `index.html`, `sponsor/index.html`, or `sponsor/app.html` in Wave 1.

**Interfaces:**
- Consumes:
  - existing canonical color/shape/motion values from `config/scd-visual-system.json`;
  - ids from `config/scd-ui-grammar.v1.json`.
- Produces:
  - CSS variables prefixed `--scd-vf-*`;
  - primitive classes prefixed `.scd-vf-*`;
  - density and state modifiers;
  - no live page adoption yet.

Required class families:

```text
.scd-vf-person
.scd-vf-player
.scd-vf-team-badge
.scd-vf-role-badge
.scd-vf-number
.scd-vf-status
.scd-vf-source
.scd-vf-consent
.scd-vf-logo-lockup
.scd-vf-face
.scd-vf-vehicle
.scd-vf-slot
.scd-vf-room
.scd-vf-field-zone
.scd-vf-asset
.scd-vf-document
.scd-vf-payment
.scd-vf-message
.scd-vf-notification
.scd-vf-timeline
.scd-vf-action
.scd-vf-ai-suggestion
.scd-vf-provenance
```

Required states:

```text
is-normal
is-selected
is-assigned
is-available
is-busy
is-warning
is-error
is-locked
is-unverified
```

- [ ] **Step 1: Add failing CSS contract assertions**

Assert:
- all required class families exist;
- all required states exist;
- `:focus-visible` styling exists;
- reduced-motion media query exists;
- high-contrast preference handling exists;
- coarse-pointer minimum target is >=44px;
- no new hard-coded primary brand hex duplicates contradict the canonical visual JSON.

- [ ] **Step 2: Run test and prove RED**

Run:
```bash
npm run test:gestionale-visual-foundation
```

Expected: FAIL on missing stylesheet.

- [ ] **Step 3: Extend `config/scd-visual-system.json`**

Add semantic layers without changing current canonical brand colors:

```text
density
elevation
focus
stateSemantics
surfaceRoles
spatialTokens
```

The JSON remains the source for shared visual values.

- [ ] **Step 4: Implement `styles/scd-visual-foundation.css`**

Requirements:
- use existing SCD variables where possible;
- add visual foundation variables only for new semantic roles;
- support compact/balanced/comfortable densities;
- use container-friendly layouts;
- use logical properties where practical;
- support `prefers-reduced-motion: reduce`;
- support `prefers-contrast: more`;
- never rely on color alone to communicate warning/error/selection.

- [ ] **Step 5: Run contracts**

Run:
```bash
npm run test:design-system
npm run test:gestionale-visual-foundation
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add styles/scd-visual-foundation.css config/scd-visual-system.json tests/gestionale-visual-foundation-contract.mjs
git commit -m "feat: add shared Gestionale visual foundation styles"
```

---

### Task 5: Build the Internal Visual Lab and Visual QA

**Files:**
- Create: `docs/visual-lab/gestionale-foundation.html`
- Create: `docs/visual-lab/gestionale-foundation.js`
- Create: `tests/gestionale-visual-foundation-visual.mjs`
- Modify: `.github/workflows/e2e.yml`

**Interfaces:**
- Consumes:
  - `styles/scd-visual-foundation.css`
  - canonical locked logo assets;
  - neutral face fallback;
  - accessory SVG library;
  - macro/micro ids.
- Produces:
  - a non-production Visual Lab;
  - screenshots in `test-output/gestionale-visual-foundation/`;
  - browser assertions for mobile/desktop accessibility and overflow.

- [ ] **Step 1: Write the browser QA test before the lab exists**

Test viewports:

```text
PHONE_COMPACT = 360x800
PHONE = 390x844
TABLET = 820x1180
DESKTOP = 1440x1000
WIDE = 1920x1080
```

Assertions:
- no horizontal overflow at any viewport;
- all eight `data-scd-template` sections exist;
- at least one instance of every required primitive id exists in the DOM;
- buttons/interactive samples have accessible names;
- minimum interactive target >=44px for coarse/mobile fixtures;
- `DEMO_NOT_RUNTIME` label is visible;
- public macro example does not expose payment/admin examples in its own region;
- reduced-motion emulation yields no non-essential animation duration >100ms;
- one Player Token appears in both editorial and spatial contexts with the same `data-entity-id` and accessible name.

Expected before lab creation: FAIL because the file is absent.

- [ ] **Step 2: Implement the Visual Lab**

The lab must show:

1. T01 Public / Editorial
2. T02 Operational Home
3. T03 Domain Hub
4. T04 Entity Detail
5. T05 Spatial Workspace
6. T06 Communication Hub
7. T07 Data / Finance
8. T08 Project / Development

Use only demo identities such as:

```text
PLAYER-DEMO-09
PERSON-DEMO-01
TEAM-DEMO-A
SUPPLIER-DEMO-A
```

Visible banner:

`DEMO_NOT_RUNTIME · NESSUN DATO SPORTIVO REALE`

Use the real locked SCD logo because it is an official design asset, but no invented sponsor logos, opponent crests, or real person faces.

- [ ] **Step 3: Demonstrate micro/macro reuse**

Render the same semantic Player Token in at least:
- T01 editorial;
- T04 entity detail;
- T05 spatial workspace.

Only density/presentation may change. Entity id and semantic state remain identical.

- [ ] **Step 4: Add visual QA step to CI after Playwright installation**

In `.github/workflows/e2e.yml`, after Chromium install, run:

```bash
node tests/gestionale-visual-foundation-visual.mjs
```

The test writes viewport screenshots under:

`test-output/gestionale-visual-foundation/`

Existing artifact upload already captures `test-output/*`.

- [ ] **Step 5: Run local visual QA**

Run:
```bash
npm install --no-save playwright
npx playwright install chromium
node tests/gestionale-visual-foundation-visual.mjs
```

Expected: PASS and five screenshots generated.

- [ ] **Step 6: Inspect screenshots manually**

Required human/implementer checks:
- strong SCD identity without looking like generic SaaS;
- macro templates clearly distinct yet one family;
- faces/logos/accessories coherent;
- mobile composition is not desktop squeezed;
- no “wall of cards” effect in Operational Home;
- public/editorial sample feels like a sports/media product, not ERP;
- spatial sample communicates position and assignment rather than decorative circles.

If a screenshot fails any check, fix before commit.

- [ ] **Step 7: Commit**

```bash
git add docs/visual-lab tests/gestionale-visual-foundation-visual.mjs .github/workflows/e2e.yml
git commit -m "test: add Gestionale visual foundation lab and visual QA"
```

---

### Task 6: Integrate Contract Gates Without Runtime Adoption

**Files:**
- Modify: `package.json`
- Modify: `.github/workflows/e2e.yml`
- Modify: `docs/design/SCD-VISUAL-AND-MOTION-SYSTEM.md`
- Test: full existing contract suite plus Wave 1 contract.

**Interfaces:**
- Consumes: Tasks 1–5.
- Produces:
  - Wave 1 contract in normal repository checks;
  - documented CSS/config ownership;
  - explicit statement that live apps have not adopted the new foundation yet.

- [ ] **Step 1: Add Wave 1 test to the normal check chain**

Add `npm run test:gestionale-visual-foundation` to `npm run check` before syntax-only validation.

Expected: repository build cannot silently drop the Wave 1 contracts.

- [ ] **Step 2: Add a named CI contract step**

Add:

```text
Gestionale Visual Foundation contract gate
```

running:

```bash
npm run test:gestionale-visual-foundation
```

- [ ] **Step 3: Update visual governance documentation**

Update `docs/design/SCD-VISUAL-AND-MOTION-SYSTEM.md` to define ownership:

```text
config/scd-visual-system.json      = canonical brand + semantic visual tokens
config/scd-ui-grammar.v1.json      = macro/micro grammar
config/scd-face-policy.v1.json     = face/consent projection policy
config/scd-accessory-library.v1.json = original operational object registry
styles/scd-visual-foundation.css   = Wave 1 shared primitive implementation
sponsor/scd-design-system.css      = existing live sponsor layer until later migration/adoption plan
```

State explicitly that Wave 1 does not yet alter APP SOCIAL/GESTIONALE/SPONSOR runtime pages.

- [ ] **Step 4: Run targeted suite**

Run:
```bash
npm run test:manifest
npm run test:asset-adaptive-contract
npm run test:design-system
npm run test:gestionale-visual-foundation
```

Expected: PASS.

- [ ] **Step 5: Run full build**

Run:
```bash
npm run build
```

Expected: PASS.

- [ ] **Step 6: Re-run visual QA**

Run:
```bash
node tests/gestionale-visual-foundation-visual.mjs
```

Expected: PASS with fresh screenshots.

- [ ] **Step 7: Commit**

```bash
git add package.json .github/workflows/e2e.yml docs/design/SCD-VISUAL-AND-MOTION-SYSTEM.md
git commit -m "ci: enforce Gestionale visual foundation gate"
```

---

### Task 7: Whole-Branch Verification and Human Design Gate

**Files:**
- No new feature files.
- Evidence: git log, test output, screenshots, CI URL/status.

**Interfaces:**
- Consumes: completed Tasks 0–6.
- Produces: reviewable Wave 1 branch and evidence package; no production merge.

- [ ] **Step 1: Run final contract/build suite**

Run:
```bash
npm run build
```

Expected: PASS.

- [ ] **Step 2: Verify branch diff is Wave 1 only**

Run:
```bash
git diff --stat <implementation-base-sha>...HEAD
git diff --name-only <implementation-base-sha>...HEAD
```

Expected:
- no database migration;
- no auth replacement;
- no production secret/config mutation;
- no live public/app page adoption;
- no safeguarding data;
- only governance, visual configs, original UI assets, stylesheet, Visual Lab, tests, docs and CI changes.

- [ ] **Step 3: Verify locked assets**

Run:
```bash
npm run test:asset-adaptive-contract
```

Expected: PASS with unchanged locked official asset blob checks.

- [ ] **Step 4: Collect visual evidence**

Provide:
- phone compact screenshot;
- phone screenshot;
- tablet screenshot;
- desktop screenshot;
- wide screenshot.

Each image must be generated from the exact branch head being reviewed.

- [ ] **Step 5: Request whole-branch review**

Use `superpowers:requesting-code-review` before proposing merge.

Review focus:
- spec compliance;
- accessibility;
- brand integrity;
- minor/face privacy;
- no fake runtime data;
- no generic SaaS regression;
- no accidental live adoption;
- no duplication of canonical visual sources.

- [ ] **Step 6: Stop at human visual acceptance**

Do **not** merge or deploy.

Human must explicitly decide:
- approve foundation;
- request visual corrections;
- reject/rework direction.

- [ ] **Step 7: Final checkpoint commit only if review fixes were needed**

If review changes were required:

```bash
git add <reviewed-files>
git commit -m "fix: address Gestionale visual foundation review"
```

Then repeat final verification.

---

## Plan self-review result

### Spec coverage
Wave 1 covers the approved foundation portions:
- macro templates;
- micro primitives;
- logos;
- faces;
- accessories;
- shared visual hierarchy;
- visual governance;
- responsive/accessibility policy;
- first spatial visual language;
- explicit technical-spike deferral.

The following approved spec areas are intentionally **not** implemented in Wave 1 and remain separate plans:
- cross-app identity runtime;
- public home rewrite;
- spatial command engine;
- deterministic optimization;
- formation/van/facility/warehouse operational persistence;
- messaging/WhatsApp/CRM;
- finance;
- AI execution;
- deploy.

### Step scan
Every implementation step has one checkable output. Runtime adoption and visual-foundation creation are separated so a visual rejection does not contaminate live surfaces.

### Type/name consistency
Canonical ids used across tasks:
- `SCD_GESTIONALE_UI_GRAMMAR`
- `CAP-GESTIONALE-VISUAL-FOUNDATION`
- `CAP-GESTIONALE-SPATIAL-UI`
- eight `T0x_*` macro ids;
- the fixed micro primitive id list.

### Review Focus coverage
All five Review Focus items have explicit contract or browser assertions assigned to Tasks 3–5.

### Proportion
This plan is intentionally narrower than the approved 1,000+ line architecture spec. It implements one coherent, independently reviewable foundation and leaves later operating subsystems to separate plans.
