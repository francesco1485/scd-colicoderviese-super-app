# SCD VISUAL & EXPERIENCE MASTER — R57 LOCK

Status: DEVELOPMENT GATE  
Date: 2026-10-03  
Authority: subordinate to `SCD_SYSTEM_MANIFEST.json`  
Machine-readable companion: `config/scd-visual-experience-gate.v1.json`

## SCD:STATE

- REPOSITORY: VERIFIED — `francesco1485/scd-colicoderviese-super-app`
- CURRENT_MAIN_SHA: VERIFIED — `d16a658786b7577af498a3104dc31ebdd17f7613`
- CURRENT_WORKING_BRANCH: VERIFIED — `r57-copilot-control-plane`
- WORKING_TREE: NOT_APPLICABLE — remote GitHub contents workflow, no local working tree
- OPEN_PR: VERIFIED — #82 draft control-plane
- PR_STATUS: VERIFIED — draft, no merge/deploy authorized
- CI_STATUS: UNVERIFIED for this governance change; current connector returned no main workflow runs for the exact SHA
- PAGES_STATUS: UNVERIFIED in this state snapshot
- RENDER_STATUS: VERIFIED — canonical Render service is live on exact main SHA `d16a658...`
- MANIFEST_VERSION_OR_HASH: VERIFIED — manifest v3.26.0
- RELEASE_DEPENDENCIES: VERIFIED — R20 remains primary; Supabase remains staged until verified migration
- DATA_SOURCES_VERIFIED: VERIFIED at registry/contract level; live freshness is not implied
- KNOWN_BLOCKERS: VERIFIED — GAP-UI-001, GAP-UI-002 plus R57 runtime/data reconciliation
- SAFE_NEXT_ACTION: VERIFIED — lock visual/experience quality before further UI implementation; no production mutation

## SCD:EXPERT

- TASK_CLASS: visual/product governance + Vision-to-Code guardrail
- DOMAINS: UX/UI, responsive design, motion, accessibility, facility operations, public/private product surfaces
- FIXED: one SCD Universe product; canonical visual tokens; official assets; real-data/fail-closed rules
- IMPROVABLE: all obsolete/legacy UI surfaces, density, motion, responsiveness, action hierarchy
- MISSING: visual regression evidence for every legacy screen and complete runtime Smart Facility integrations
- SOURCE_PLAN: manifest → config/scd-visual-system.json → approved SCD visual boards → current NextGen runtime
- TOOLCHAIN: existing HTML/CSS/JS, adaptive engine, E2E/visual regression, Copilot agents under this gate
- RISK: rebuilding from zero, generic templates, disconnected modules, fake services, visual drift
- TEST: mobile + desktop visual QA, accessibility, reduced-motion, runtime states, targeted E2E
- ROLLBACK: documentation/instruction commits only; revert branch commits
- NEXT_ACTION: enforce this gate on every UI branch before implementation/review

## 1. Product identity

The product is ONE product:

**SCD UNIVERSE / SCD COLICODERVIESE SUPER APP / SCD DIGITAL CLUB OPERATING SYSTEM**

It must feel like a modern sports operating system, not a brochure site and not a generic back-office dashboard.

Required character:
- sport;
- territory;
- future;
- editorial impact;
- live state;
- spatial depth;
- useful motion;
- immediate action;
- multi-generation clarity.

Forbidden character:
- 2000-era portal;
- generic Bootstrap/Admin template;
- WordPress theme look;
- anonymous grey SaaS dashboard;
- giant static hero with brochure text;
- endless white-card grid;
- flat pages with no hierarchy;
- decorative features with no real service behind them.

## 2. Canonical visual tokens

The canonical machine-readable palette remains `config/scd-visual-system.json`.

Do not invent a replacement palette.

Core colors:
- Mineral/Navy: `#031A35`
- Deep Navy: `#052E59`
- SCD Blue: `#0870CF`
- Lake: `#0B98DD`
- Cyan: `#20B7E6`
- Yellow: `#FFD500`
- Muted Gold: `#F0B900`
- Warm White: `#FFFFFF`
- Paper: `#EEF5FB`
- Ink: `#123657`
- Muted: `#627E98`
- Line: `#D5E4F0`
- Success: `#179765`
- Warning: `#E49B2F`
- Danger: `#CA5656`

Palette principle:
**MINERAL_NAVY + LAKE_AQUA + MUTED_GOLD + WARM_WHITE + LOW_SATURATION_ACCENTS.**

High saturation is for micro-accent and state, never full-screen visual fatigue.

Typography:
- Inter/system sans stack;
- strong editorial hierarchy;
- high-weight headings used selectively;
- readable body copy;
- no ornamental pseudo-luxury serif unless explicitly approved for a separate campaign asset.

## 3. Visual language

Every primary surface must use a composition, not a template.

Required patterns:
- compact shell;
- live strip;
- sponsor marquee;
- event rails;
- match cards;
- story/orbit modules;
- quick-action ring;
- role worlds;
- source-status chips;
- spatial synthetic hero;
- contextual overlays;
- persistent profile/navigation appropriate to viewport.

The first viewport must answer at least one real question:
- What is happening now?
- What happens next?
- What requires my action?
- What changed?
- Where do I go?
- What is live / verified / pending?

## 4. Public experience

Public = emotion + sport + territory + discovery + media + community + services.

Target rhythm:
1. Pulse / current week;
2. next verified match;
3. calendar / upcoming;
4. teams;
5. Matchday;
6. Club Now / newsroom;
7. media/social;
8. events;
9. sponsor/partner rail;
10. community and family-value services;
11. join/profile path.

The UI must feel alive even when a source is unavailable. Missing data uses a designed state such as `DATO_IN_AGGIORNAMENTO`, never invented content.

NextGen media rule remains binding:
- no dependency on real photography for hero/background UI;
- use original synthetic scenes, CSS/SVG/WebGL/Canvas or approved generated originals;
- official logos and functional/user media remain allowed according to policy.

## 5. Private Desk

Private ≠ old management software.

Private = speed + context + priority + action + control.

Primary hierarchy:
- OGGI
- PRIORITÀ
- DA FARE
- DA VERIFICARE
- DA APPROVARE
- IN SCADENZA
- CAMBIAMENTI
- EVENTI
- COMUNICAZIONI
- ALERT

Data tables can exist where useful, but they are secondary to action-oriented summaries and drill-down.

No archive hunting. Gmail and Drive remain back-office engines; users see decisions, documents, tasks, events and provenance.

## 6. Smart Facility / “domotica” product rule

Smart Facility is a first-class operating experience, not decorative “smart” copy.

Canonical UX domains:
- field/space occupancy;
- locker rooms;
- opening/closing checklist;
- keys/access points;
- alarms/status where an authorized adapter exists;
- lights/energy status only where a real adapter exists;
- maintenance;
- assets/equipment;
- warehouse;
- kit;
- laundry;
- transport/vehicle readiness where authorized;
- responsible person / handoff;
- last-action and next-action state.

Service states are explicit:
- `CONNECTED`
- `READY_FOR_ADAPTER`
- `NOT_CONNECTED`
- `UNVERIFIED`
- `MANUAL_CHECK_REQUIRED`

Never show a fake switch, sensor, lock, alarm or “live” device status when no verified integration exists.

No alarm code, key code, credential or sensitive access datum is ever exposed in public UI or client logs.

## 7. Motion & interaction

Motion must explain state or improve orientation.

Required:
- fast micro-interactions;
- progressive panel transitions;
- active/live affordances;
- responsive feedback;
- skeleton/loading states where appropriate;
- subtle spatial depth;
- contextual reveal;
- reduced-motion equivalent.

Forbidden:
- pointless parallax;
- constant bouncing;
- autoplay motion that obscures data;
- game-like distraction in dense administrative screens;
- animation used to hide slow architecture.

Reference timing from the visual system:
- micro interaction ~180 ms;
- panel transition ~260 ms;
- motion always subject to `prefers-reduced-motion`.

## 8. Responsive composition

Mobile, tablet, desktop, wide and ultrawide are compositions of the same product.

Do not:
- wrap a 430px phone inside desktop chrome;
- stretch mobile cards across 1920px;
- amputate desktop functions on mobile without an alternative;
- create separate feature sets without explicit contract.

Required baseline:
- 360x800
- 390x844
- 393x852
- 430x932
- 1280x800
- 1440x900
- 1920x1080

Also verify:
- safe areas;
- virtual keyboard;
- high DPR;
- orientation;
- font scaling;
- touch vs pointer;
- reduced motion;
- contrast preference;
- slow network/fallback.

## 9. Official assets

Classify every visual asset before change:
- KEEP_LOCKED
- KEEP_ENHANCE
- REBUILD_IMPROVE
- RESEARCH_REAL_ASSET
- GENERATE_ORIGINAL

Official club/federation/partner/sponsor/opponent/kit assets are never regenerated or redrawn when a real verified asset exists.

No invented sponsor wordmarks.
No invented opponent crests.
No invented kit details.

## 10. Service reality gate

A visually beautiful tile does not make a service real.

Every service surface must declare internally:
- capability ID;
- source;
- state;
- role/scope;
- runtime dependency;
- fallback;
- next action.

Allowed product states:
- DESIGNED
- IMPLEMENTED
- TESTED
- DEPLOYED
- PRODUCTION_VERIFIED

UI copy must not use “live”, “connected”, “synced”, “real-time”, “automatic” or equivalent unless evidence supports it.

## 11. Visual rejection gate

A UI change is rejected if any of the following is true:
- generic template look;
- anonymous card wall;
- no SCD identity;
- wrong palette;
- giant blue bar dominating the screen;
- brochure hero;
- static page with no next action;
- fake service/data;
- sponsor hidden;
- desktop behaves like framed phone;
- public/private goals mixed;
- motion absent where feedback is needed;
- motion excessive where focus is needed;
- official assets altered;
- accessibility/focus/reduced-motion missing;
- mobile/desktop verification missing.

## 12. Rebuild policy

Old visuals can be classified `REBUILD_IMPROVE`.

Rebuild means:
- preserve valid data contracts;
- preserve sources/provenance;
- preserve IDs;
- preserve backend/runtime capability;
- preserve permissions/security;
- rebuild presentation, navigation, hierarchy and interaction.

It does NOT mean starting the product from zero.

## 13. Release evidence

No UI is considered ready without:
- screenshot or visual comparison evidence;
- required viewport coverage;
- no overflow/clipping;
- keyboard/focus check;
- contrast check;
- reduced-motion check;
- loading/empty/error/offline states;
- source/fallback state check;
- exact asset integrity check;
- targeted E2E/contract test.

The visual target is not “acceptable website”.

The target is:
**a living, modern, premium, adaptive football-club operating system that is recognizably SCD before the user reads the logo.**
