# R58.VI.4 — Visual Reset & Product Design Gate

**Status:** DESIGN SPEC FOR HUMAN REVIEW  
**Date:** 2026-10-07  
**Branch:** `r58-vi-4-visual-reset-spec`  
**Parent:** #132  
**Gate issue:** #137  
**Baseline commit:** `5ca8998ba312d19ef32cf112e19e24e815f1e988`

## 1. Purpose

Rebuild the visible product experience of SCD ONE, SCD CORE and SCD GROW from first principles while preserving verified backend, data, auth, provenance and business logic.

The current R57/R58 visual language is **SUPERSEDED_FOR_VISUAL_ACCEPTANCE**. It remains useful only as rollback/evidence until replacement slices are verified and approved.

This is not a theme refresh. The objective is to replace the inherited “generic SaaS dashboard/card wall” model with a role-aware, command-aware, content-first experience where a user can understand in seconds:

1. where they are;
2. what matters now;
3. what is verified;
4. what they can do next;
5. what changed;
6. why the system is showing it.

## 2. Canonical constraints

The redesign must preserve:

- `SCD_SYSTEM_MANIFEST.json` as binding machine-readable authority;
- R20 as current identity / role / scope authority;
- existing source/provenance contracts;
- existing verified business logic;
- the no-duplicate rule for auth, database, calendar, CRM and identity;
- fail-closed behavior when source truth is unavailable;
- locked official assets from `config/scd-assets.v1.json`;
- PWA / responsive readiness from one canonical codebase;
- U18 2026/27 as withdrawn/historical only, never active;
- safeguarding isolation from ordinary CRM/social flows.

No production deploy, destructive migration, critical permission change, irreversible delete or sensitive-data mutation is part of this design.

## 3. Visual Intelligence inputs

The user references from Batches I and J are treated as **design intelligence**, not copy sources.

The useful recurring principles are:

- **Problem → Solution framing:** high contrast, immediate meaning, one dominant message.
- **Semantic commands:** short memorable triggers such as `/today`, `/attention`, `/matchday`, `/blueprint`, `/anatomy`, `/layers`, `/brand`.
- **Data under the app:** canonical records remain the source; the user interacts with a purpose-built interface rather than raw spreadsheets.
- **Specialist routing behind one product:** different expert roles and engines stay behind the scenes.
- **Trigger → agent/logic → tool → response:** explicit orchestration with audit and human gates.
- **Blueprint/anatomy/layers:** structural explanation, decomposition and composable visual generation.
- **Brand charter generation:** canonical logo/color/type/usage rules are data-bound.
- **Guided formation:** contextual help and walkthroughs instead of manual dumps.
- **Digital vs print profiles:** DIGITAL_RGB, PRINT_CMYK and accessible output profiles are explicit.

The redesign must not copy third-party visuals, proprietary layouts, brands or code.

## 4. Product architecture

Exactly three SCD business products remain visible:

1. **SCD ONE** — public/social/transactional club product.
2. **SCD CORE** — internal association operating system.
3. **SCD GROW** — partner/sponsor growth engine.

Shared infrastructure remains non-product:

- R20 identity / authorization;
- R22 orchestration;
- Data Fabric;
- Supabase staged target;
- Google Workspace adapters;
- provenance/audit;
- Brand Asset Registry;
- Template Factory;
- Expert Router.

No fourth SCD application is created.

## 5. First implementation slice

The first slice is:

# SCD CORE — TODAY & ATTENTION

Primary question:

> **What requires my attention now, and what is the safest next action?**

This slice is selected because it can prove product value with real operational sources before the rest of the visual system is rebuilt.

### 5.1 Above-the-fold hierarchy

The first viewport must contain only:

1. **Context line**  
   Club / role / date / source state.

2. **Dominant attention item**  
   One verified item requiring action now.  
   If no verified item exists, show one purposeful fail-closed explanation rather than zero-count tiles.

3. **Why it matters**  
   Owner, due time, source and verification state.

4. **Primary next action**  
   One safe action or a clear “source required” instruction.

5. **Compact changed/next rail**  
   Maximum three secondary items.

The design explicitly rejects four decorative counters such as “URGENTI 0 / OGGI 0 / SCADENZE 0 / DOCUMENTI 0”.

### 5.2 Primary interaction model

The user can work in two equivalent ways:

- direct visible actions;
- semantic command input.

Example:

```
/today
/attention
/calendar
/people
/deadlines
```

The command layer is progressive enhancement, not the only navigation method.

### 5.3 Information architecture

CORE primary structure for this slice:

- **Today**
- **Attention**
- **Changes**
- **People**
- **Calendar**
- **Documents**
- **Operations**

Navigation must use meaningful text before anonymous icons.

Desktop may use a compact rail. Mobile uses a bottom or sheet-based navigation appropriate to thumb use. The same hierarchy is preserved, not merely squeezed.

## 6. SCD_COMMAND_GRAMMAR_V1

Each semantic command maps to a real capability.

Required record:

```json
{
  "command_id": "CMD-ATTENTION",
  "trigger": "/attention",
  "intent": "show_verified_attention_queue",
  "allowed_roles": ["DIRECTION", "SEGRETERIA", "AUTHORIZED_STAFF"],
  "input_schema": {},
  "source_requirements": ["R20_AUTH", "VERIFIED_OPERATIONAL_SOURCE"],
  "output_types": ["WEB"],
  "human_gate": false,
  "audit_event": "COMMAND_ATTENTION_VIEWED",
  "fail_closed_state": "SOURCE_UNVERIFIED"
}
```

P0 command set:

- `/today`
- `/attention`
- `/calendar`
- `/people`
- `/deadlines`
- `/brand`
- `/layers`

P1 command set:

- `/matchday`
- `/event`
- `/facility`
- `/registration`
- `/sponsor`
- `/blueprint`
- `/anatomy`
- `/print`
- `/social`

A command is not implemented until the full chain exists:

```
trigger
-> validation
-> authorization
-> verified source
-> deterministic projection
-> visible route
-> provenance/audit
-> browser verification
```

## 7. Composable visual layer model

Visual outputs must be data-bound and editable by layer instead of baking complex text into raster images.

Canonical layer order:

```
BACKGROUND
PHOTO_OR_VIDEO
BRAND_ASSET
DATA_LAYER
TEXT_LAYER
CTA_LAYER
LEGAL_SOURCE_LAYER
OUTPUT_PROFILE
```

Each layer declares:

- source;
- rights status;
- visibility;
- z-order;
- responsive behavior;
- output profile;
- provenance.

This model supports ONE matchday/social, CORE operational visualizations and GROW sponsor activations without duplicating rendering logic.

## 8. Blueprint and anatomy modes

### /blueprint

A structural/spatial projection for verified physical or organizational layouts.

Initial domains:

- fields;
- changing rooms;
- access;
- transport staging;
- event zones;
- sponsor zones;
- club house;
- family/play areas.

This maps to `CAP-FACILITY-SPATIAL-INTELLIGENCE`.

### /anatomy

An explanatory decomposition of a process/object into parts and relationships.

Initial domains:

- registration flow;
- matchday flow;
- tournament package;
- sponsor package;
- facility operation;
- SCD Card service;
- event setup.

An anatomy view is not decorative illustration. It must encode state, relationships and source truth.

## 9. Brand system

Extend `CAP-BRAND-ASSET-REGISTRY` to produce a data-bound brand charter.

Minimum contract:

- official logo masters;
- checksum;
- clear space;
- minimum size;
- approved variants;
- typography;
- DIGITAL_RGB palette;
- PRINT_CMYK palette;
- accessible contrast combinations;
- imagery policy;
- sponsor lockup rules;
- competition/season validity;
- allowed surfaces;
- prohibited transformations;
- provenance;
- review/expiry date.

No official logo, federation mark, sponsor wordmark or kit mark may be regenerated by generative AI when a verified master exists.

## 10. Visual system

### 10.1 Design intent

**Operational clarity with sport identity.**

CORE must look like a serious club operating system, not a generic finance dashboard and not a public fan app.

The product should feel:

- precise;
- calm under pressure;
- spatially clear;
- fast;
- human;
- recognizably SCD;
- visually disciplined.

### 10.2 Information hierarchy

Priority order:

1. action required now;
2. verified reason/context;
3. next safe action;
4. what changed;
5. what follows;
6. supporting navigation.

### 10.3 Layout grid

Desktop:
- 12-column fluid grid;
- max content width optimized for working density, not marketing hero width;
- fixed readable measure for text;
- context/command rail may occupy 2–3 columns;
- primary work area 7–8 columns;
- secondary evidence rail 2–3 columns.

Mobile:
- single-column action flow;
- no desktop sidebar shrunk into a narrow strip;
- command entry becomes a bottom sheet or top compact launcher;
- tap targets minimum 44px.

### 10.4 Typography

Use a small number of semantic levels:

- Display: only for one dominant message.
- H1: page/task.
- H2: section.
- Body: operational text.
- Meta: source/time/state.
- Code/command: semantic command triggers only.

Avoid all-caps everywhere. All-caps is reserved for short state/section signals.

### 10.5 Spacing

Use a consistent 4/8px base scale.

No dense wall of equal cards. Group by meaning and relationship.

### 10.6 Color

Color must carry meaning but never be the only carrier.

Use canonical SCD colors from the asset/brand registry.

Status use:
- verified/ready;
- needs attention;
- blocked/unverified;
- informational.

Avoid decorative gradients unless they support hierarchy.

### 10.7 Iconography

Icons support text labels. They do not replace semantic labels for primary navigation.

No emoji-like production iconography for core operations.

### 10.8 Imagery

CORE uses imagery sparingly.

Real facility/territory imagery may appear when it adds spatial context and rights are verified. Athlete/minor imagery requires consent and safeguarding checks.

ONE may be more editorial/photographic.
GROW may be more premium/commercial.

### 10.9 Motion

Motion communicates:
- change;
- hierarchy;
- confirmation;
- navigation continuity.

No ornamental looping animation.

Respect `prefers-reduced-motion`.

## 11. State design

### Loading

Show the structure of the requested content without fake values.

### Empty

Explain why nothing is shown and what the user can do next.

Bad:
> 0 urgent / 0 today / 0 documents.

Good:
> “No verified operational source is available for today. Connect/restore R20 source before decisions are shown.”

### Unverified

Display:
- what is missing;
- last verified timestamp when available;
- source;
- safe consequence.

### Error

User-facing error text must be actionable and free of internal stack/runtime language.

### Partial

If some sources are verified and others are unavailable, render verified items and clearly isolate missing coverage.

## 12. Data flow for CORE Today & Attention

```
R20 session
  -> CORE Brain request
  -> verified source adapters
     -> agenda
     -> calendar
     -> requests
     -> documents/deadlines
     -> communications
  -> normalize records
  -> provenance check
  -> attention scoring
  -> next-safe-action resolution
  -> Today & Attention projection
  -> browser UI
  -> optional command projection
  -> audit view/action
```

The UI consumes a projection contract rather than parsing raw upstream payloads.

Proposed projection:

```json
{
  "generated_at": "ISO-8601",
  "source_state": "VERIFIED|PARTIAL|UNVERIFIED",
  "role_scope": [],
  "primary_attention": {
    "id": "stable-id",
    "title": "human-readable",
    "reason": "why it matters",
    "owner": "role-or-person-reference",
    "due_at": "ISO-8601|null",
    "source": "canonical-source-id",
    "verification_state": "VERIFIED",
    "next_action": {
      "action_id": "stable-action-id",
      "label": "human-readable",
      "mode": "READ|REVERSIBLE_WRITE|HUMAN_GATE"
    }
  },
  "changed": [],
  "next": [],
  "coverage": []
}
```

No synthetic operational item may be created to fill the interface.

## 13. Authorization and privacy

- R20 remains authority.
- UI hides data outside role/scope.
- Command grammar is role-scoped.
- Sensitive actions remain human-gated.
- No minor private data appears in public/shared projections.
- GROW receives only permitted commercial/aggregate data.
- Safeguarding remains isolated.

## 14. Technical implementation boundary

The first visual slice should reuse the current Node server and existing R20/CORE Brain adapters.

It may add:

- a new isolated UI route for the reset;
- a projection module for Today & Attention;
- command grammar configuration;
- contract tests;
- responsive CSS/JS/components;
- visual regression/browser checks.

It must not add:

- a second server runtime;
- a second auth system;
- a second database;
- a second calendar;
- a second CRM.

The old `r58/manager` route remains rollback/evidence and is not the new acceptance target.

## 15. New preview policy

The replacement slice must use a fresh exact route and, when deployed, a fresh preview service or clearly isolated route.

Working naming convention:

- branch: `r58-vi-4-core-today-reset`
- route: `/r58/core-today/`
- preview service: `scd-r58-core-today-preview`

The preview is not called accepted until:
- exact commit is known;
- exact route is browser-tested;
- required viewports pass;
- data truth is verified;
- the user visually reviews it.

Old preview services remain available for rollback until explicit decommission authorization.

## 16. Acceptance tests

### Product
1. First viewport has one dominant attention item or one useful fail-closed explanation.
2. No decorative zero-count metric strip.
3. No internal engineering/roadmap filler text.
4. Navigation labels are understandable without icon interpretation.
5. Command input works as progressive enhancement, not mandatory navigation.

### Data
6. Every rendered operational item has source/provenance.
7. Unverified records are withheld or explicitly isolated.
8. U18 withdrawn status never appears as active.
9. No fake operational records.

### Authorization
10. Role/scope changes visible data correctly.
11. No client-side privilege escalation.
12. Sensitive write actions require the appropriate human gate.

### Visual
13. Side-by-side comparison with rejected R57/R58 shows a materially different information hierarchy and interaction model.
14. Viewports: 360, 390, 430, 1280, 1440, 1920.
15. Keyboard/focus/semantic labels pass.
16. Contrast is WCAG-compatible.
17. Reduced-motion mode is respected.
18. Official assets resolve only from canonical registry.

### Runtime
19. Exact preview route returns 2xx.
20. Browser interaction smoke passes.
21. Commit served by preview matches expected SHA.
22. Fail-closed state remains usable when upstream source is unavailable.

## 17. Rollback

Rollback is simple and non-destructive:

- old R57/R58 visual routes remain untouched;
- new slice is isolated by route/branch;
- removal of the new route reverts without data migration;
- no production data model mutation is required for first slice;
- old preview services remain until human approval of replacement.

## 18. Delivery sequence

1. finalize this design spec;
2. human review/approval;
3. write implementation plan;
4. isolate implementation branch/worktree;
5. write acceptance tests first;
6. implement projection contract;
7. implement zero-based visual slice;
8. run local/CI checks;
9. deploy new preview;
10. browser-verify exact route and viewports;
11. human visual review;
12. only then consider integration or old-preview decommission.

## 19. Success definition

The first slice succeeds when the user opens a new URL and immediately sees a product that:

- is visibly different from the rejected previews;
- contains real verified operational value or an intelligent fail-closed state;
- uses words/commands that map to actual capabilities;
- feels like an operating system for SCD rather than a generic dashboard;
- has a clear path from data to action to proof.

