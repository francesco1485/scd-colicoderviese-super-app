# GESTIONALE SCD — Visual Foundation & Spatial Operations Design

**Date:** 2026-10-07  
**Status:** DRAFT FOR HUMAN REVIEW  
**Project:** GESTIONALE  
**Architecture direction:** Federated Adaptive Club OS  
**Branch:** `design/gestionale-visual-foundation-v1`  
**Runtime authority:** unchanged; this document is design-only until explicitly approved.

## 1. Purpose

This specification defines the visual, spatial, identity, asset, communication, and cross-application foundations for the future SCD Gestionale.

The product must not be a conventional sports-management dashboard. It must operate as the internal digital operating environment of SCD ColicoDerviese, while remaining connected to the public/social app and the Sponsor system through one shared identity, shared canonical entities, shared permissions, and controlled projections.

The design objective is:

> Understand the real state of the Club, represent it clearly, let authorized people act on it safely, and make the same reality available as data, editorial content, spatial scene, message, workflow, simulation, or AI-assisted command depending on context.

No product code, production change, authentication migration, database migration, or deploy is authorized by this document.

---

## 2. User intent captured

Current explicit user direction requires all of the following:

- a public first page that feels like a premium SCD website, not a login screen;
- club news, football-world news, results, statistics, player and team content, structures and projects;
- one SCD account that can later open Social, Gestionale and Sponsor according to authorization;
- internal dedicated areas for different roles and duties;
- strong graphics at macro and micro level;
- reusable templates rather than individually improvised screens;
- official logos, faces, accessories and real visual assets treated as first-class design objects;
- visual 2D management for people and real operational objects;
- football formation with draggable players, names, shirt numbers and tactical placement;
- transport scene with vans, seats, minors, drivers and companions;
- fields, locker rooms and facilities represented spatially;
- inventory, supplies, purchases, sales and warehouse operations;
- payments, administration, treasury and work relationships;
- CRM and messaging with WhatsApp/email/internal communication integration;
- large AI/chatbot management areas, not merely a floating chatbot;
- notifications and messaging designed as a modern operational system;
- dynamic, movable and configurable work areas;
- maximum future extensibility without premature technological lock-in.

---

## 3. Product constitution

### 3.1 Three simultaneous system roles

The Gestionale must combine:

1. **System of Record**  
   Verified entities, documents, events, payments, people, spaces, assets and history.

2. **System of Context**  
   Why a datum matters, for whom, in which role, for which team, season, place, time and process.

3. **System of Action**  
   What may happen next, which action is allowed, who may execute it, which source or external authority is affected, and what proof must remain.

### 3.2 Dominant questions

Every authorized user should be able to answer rapidly:

- Where am I?
- What is happening?
- What changed?
- What requires my attention?
- Why does it matter?
- What is the source?
- What can I do now?
- What happens if I do it?
- Who else is involved?
- What evidence remains afterward?

### 3.3 Core rules

- One real entity must not be duplicated across modules.
- FIGC, LND, SGS, RASD and other official systems remain external authorities.
- Google Workspace remains an operational source, not a decorative link collection.
- R20 remains current identity/role/scope authority until a verified migration is approved.
- No parallel auth, database, calendar or CRM is to be created.
- Every important operational value must retain provenance.
- Safeguarding remains isolated from ordinary CRM, chat and analytics.
- AI may interpret, correlate, simulate and prepare; sensitive actions remain governed.
- Important graphical elements must communicate operational meaning, not merely decorate.
- Mobile and desktop are the same product with different compositions, not scaled copies.
- 2D spatial interaction is a first-class capability.
- 3D, WebGPU, CRDT collaboration and physical digital twin are future-ready capabilities, not initial dependencies.

---

## 4. Ecosystem identity and cross-app access

### 4.1 One account, multiple roles

The target model is:

**ONE PERSON → ONE SCD ACCOUNT → MULTIPLE ROLES → MULTIPLE SCOPES → AUTHORIZED APPLICATIONS**

Applications:

- **APP SOCIAL** — public/social/editorial front door;
- **GESTIONALE** — internal operating system;
- **SPONSOR** — commercial partnership/sponsorship operating system.

Historical internal labels such as SCD ONE / SCD CORE / SCD GROW may remain as implementation history, but the user-facing project names are APP SOCIAL, GESTIONALE and SPONSOR unless later explicitly changed.

### 4.2 Authorization model

Authorization is not merely ADMIN/USER.

It must evaluate:

- USER
- ROLE
- SCOPE
- CAPABILITY
- CONTEXT
- TIME

Example:

A coach with `ROLE=MISTER`, `TEAM=U16`, `SEASON=2026/27`, and `CAPABILITY=CONVOCATIONS_WRITE` may manage U16 convocations and formation, but must not automatically see unrestricted financial or sponsorship data.

### 4.3 App switcher

Authenticated users may move between authorized products without a new login.

The visible switcher must only show relevant applications and areas. Hidden capabilities must not appear as teasing locked commercial buttons.

Every application must still enforce authorization server-side.

---

## 5. Public / Social first page

The first public surface must behave as the living digital presentation of the Club.

It must not be a long generic marketing landing page and must not expose internal or minor-sensitive information.

### 5.1 Primary content families

- latest SCD news;
- weekly fixtures and results;
- next matches;
- team and player statistics when verified and publishable;
- rankings/competition context when sourced lawfully;
- club projects and facility development;
- centre/facility presentation;
- territorial identity;
- academy and teams;
- events and tournaments;
- official affiliations and partners;
- sponsor visibility according to verified commercial status;
- newsroom/editorial content;
- selected football-world news from lawful, attributed sources;
- public calendar/event projections;
- access/login entry.

### 5.2 Visual direction

The page must feel:

**SPORTING + EDITORIAL + TERRITORIAL + PREMIUM + LIVE**

It must avoid the appearance of an internal ERP or generic SaaS homepage.

### 5.3 Public projection rule

A public page never receives the internal record directly. It receives a public projection filtered for:

- privacy;
- minors;
- consent;
- publication rights;
- source confidence;
- sponsor validity;
- competition/season validity.

---

## 6. Internal information architecture

The Gestionale contains dedicated role-scoped areas, not one universal menu with hidden rows.

Initial domain map:

- Today / Attention
- People / Families
- Teams
- Convocations
- Formation / Matchday
- Calendar
- Fields & Spaces
- Locker Rooms
- Facilities
- Maintenance
- Transport
- Registrations / Tesseramenti
- Medical / Certificates
- Documents
- Administration
- Payments
- Treasury / Budget
- Workers / Volunteers
- Warehouse
- Suppliers
- Purchases
- Sales
- Projects / Development
- Media / Images
- Operational CRM
- Messaging
- Notifications
- AI Workbench
- Audit / Provenance

Sponsor commercial pipeline remains primarily in SPONSOR, while shared organization/person identities may be referenced from the canonical graph.

---

## 7. Macro visual templates

The design system must start from a finite template grammar rather than dozens of independent screens.

### T01 — PUBLIC / EDITORIAL
For:
- public home;
- club news;
- team pages;
- player statistics;
- structures;
- projects;
- matchday public presentation.

### T02 — OPERATIONAL HOME
For:
- attention;
- tasks;
- changes;
- operational messages;
- next events;
- AI dock;
- source health.

### T03 — DOMAIN HUB
For:
- people;
- teams;
- warehouse;
- payments;
- facilities;
- suppliers.

### T04 — ENTITY DETAIL
For:
- person;
- athlete;
- family;
- team;
- supplier;
- vehicle;
- room;
- field;
- project.

### T05 — SPATIAL WORKSPACE
For:
- formation;
- transport;
- locker rooms;
- field allocation;
- warehouse;
- event layout;
- sponsor zones.

### T06 — COMMUNICATION HUB
For:
- WhatsApp;
- email;
- internal messages;
- notifications;
- broadcasts;
- contextual threads.

### T07 — DATA / FINANCE
For:
- payments;
- treasury;
- purchases;
- orders;
- costs;
- sales;
- reconciliations.

### T08 — PROJECT / DEVELOPMENT
For:
- facility work;
- investments;
- sponsorship-funded projects;
- timeline;
- budget;
- progress imagery;
- suppliers and documents.

---

## 8. Micro visual primitives

The first reusable component library must include at least:

- Person Token
- Player Token
- Team Badge
- Role Badge
- Number Badge
- Status Chip
- Source Badge
- Consent Badge
- Logo Lockup
- Face / Avatar
- Jersey Token
- Vehicle Token
- Seat Slot
- Locker Slot
- Room Slot
- Field Zone
- Asset Token
- Warehouse Location
- Document Chip
- Payment Chip
- Message Bubble
- Notification Item
- Timeline Item
- Action Button
- AI Suggestion
- Provenance Tag
- Warning / Block State
- Availability Indicator
- Assignment Handle
- QR / Barcode Object
- Image / Media Tile

Each primitive must define:

- semantic purpose;
- allowed states;
- size/density variants;
- responsive behavior;
- keyboard/focus behavior;
- touch behavior;
- accessibility label;
- source/provenance behavior where applicable;
- public/internal visibility rules where applicable.

---

## 9. SCD asset system

### 9.1 Official logos

Official logos and marks are `KEEP_LOCKED`.

Existing canonical runtime assets such as SCD, LND, SGS, Monza and approved mascot files must not be regenerated with AI.

Every logo family must specify:

- master file;
- light/dark usage;
- mono variant if officially approved;
- minimum size;
- clear space;
- allowed backgrounds;
- digital RGB;
- print CMYK where known;
- season/validity;
- source;
- verification date;
- prohibited transformations.

### 9.2 Faces

Faces must be treated as governed identity assets, especially for minors.

A future face record must support:

- PERSON_ID
- PHOTO_ID
- CONSENT_STATE
- USAGE_SCOPE
- PUBLIC_ALLOWED
- INTERNAL_ALLOWED
- COMMERCIAL_ALLOWED
- VALID_FROM
- VALID_TO
- CROP_PROFILE
- SOURCE
- VERIFIED_AT

Visual face levels:

- **L0:** initials / neutral silhouette;
- **L1:** profile photo;
- **L2:** sport cutout;
- **L3:** premium editorial portrait.

The renderer selects the highest allowed level for the current context.

### 9.3 Accessories / object library

Create a coherent vector object library for:

**Football**
- ball
- cone
- bib
- goal
- bag
- tactical board
- whistle
- medical kit

**People**
- shirt
- number
- captain badge
- coach/staff badge
- director badge

**Logistics**
- van
- car
- seat
- bag/luggage
- stop
- key

**Facility**
- field
- goal
- locker room
- locker
- shower
- gym
- clubhouse
- warehouse

**Warehouse**
- box
- shelf
- size
- SKU
- barcode
- QR

**Administration**
- document
- invoice
- payment
- contract
- receipt

**Communication**
- message
- email
- WhatsApp
- push
- alert

**Sponsor**
- LED board
- banner
- shirt placement
- stand
- tribune
- hospitality asset

Every object must define operational states such as:

`NORMAL / SELECTED / ASSIGNED / AVAILABLE / BUSY / WARNING / ERROR / LOCKED / UNVERIFIED`.

---

## 10. Visual hierarchy from micro to macro

The canonical visual hierarchy is:

**TOKEN → PRIMITIVE → COMPONENT → MODULE → TEMPLATE → SCENE → APPLICATION**

Example:

SCD blue → badge → Player Token → roster module → formation template → Matchday Scene → GESTIONALE.

This hierarchy must be encoded in design tokens and component contracts so that the product cannot drift into unrelated styles across departments.

---

## 11. Dynamic workspace model

Some internal surfaces may be configurable, but not uncontrolled.

Allowed workspace operations:

- move;
- resize;
- collapse;
- pin;
- expand;
- hide when non-critical;
- save personal layout;
- save role layout.

Critical controls such as severe alerts, security state, source health and mandatory deadlines may define minimum visibility and cannot be silently removed.

Workspace freedom must never undermine operational priority or compliance.

---

## 12. SCD Spatial Operations Engine

### 12.1 Principle

The spatial engine is not an image editor.

It is a semantic projection of real entities, relationships, positions, constraints and actions.

The base abstraction is a **Scene**.

Scene types include:

- PITCH_SCENE
- VEHICLE_SCENE
- LOCKER_ROOM_SCENE
- FACILITY_SCENE
- WAREHOUSE_SCENE
- EVENT_SCENE
- OFFICE_SCENE
- ORG_SCENE
- PROJECT_SCENE
- SPONSOR_SCENE

### 12.2 Scene model

A scene must contain conceptually:

- scene_id
- scene_type
- dimensions / coordinate system
- zones
- objects
- placements
- relations
- constraints
- permissions
- state
- version
- provenance
- history

A spatial object references a canonical entity rather than duplicating it.

Example:

- entity_type = PERSON
- entity_id = PLAYER_ID
- scene_id = MATCH_ID formation scene
- x / y
- zone_id
- slot_id
- visual_profile
- state
- locked flag

### 12.3 Dual representation

Every important spatial workflow must retain both:

**DATA VIEW + SPATIAL VIEW**

Moving an object spatially updates the semantic assignment. Editing the semantic assignment updates the scene.

The renderer never becomes the source of truth.

---

## 13. First spatial scenes

### 13.1 Formation 2D

Coach workflow:

ROSTER → AVAILABLE → CONVOCATED → NUMBER → ROLE → POSITION → BENCH → SAVE VERSION → PUBLISH AUTHORIZED PROJECTION

Capabilities:

- drag player;
- keyboard alternative;
- touch alternative;
- assign number;
- assign role;
- choose formation;
- save variants;
- compare variants;
- bench area;
- publish public projection only after explicit authorization.

Future-ready, not initial requirements:

- tactical zones;
- lines;
- distance analysis;
- movement animation;
- timeline states;
- average position.

### 13.2 Van / transport 2D

Vehicle scene contains:

- driver slot;
- companion slots;
- passenger slots;
- capacity;
- trip;
- route;
- assignments.

Constraint examples:

- passenger count > capacity → BLOCK;
- no authorized driver → BLOCK;
- missing required transport authorization → WARNING/BLOCK according to verified policy;
- minor without required context → BLOCK;
- duplicate assignment → BLOCK.

### 13.3 Fields / locker rooms

Facility scene represents:

- fields;
- locker rooms;
- club house;
- gym;
- warehouse;
- entrances;
- restricted spaces;
- maintenance state;
- bookings;
- events.

A team or operational unit may be assigned to a room/field with time constraints.

### 13.4 Warehouse

Warehouse scene must map:

LOCATION → SHELF → SLOT → ASSET/ITEM

The scene must connect to:

- inventory count;
- assigned quantity;
- reorder threshold;
- supplier;
- last movement;
- QR/barcode;
- status.

---

## 14. Command, simulation and history

Every meaningful spatial change must produce a semantic command.

Examples:

- MOVE_PLAYER
- ASSIGN_PASSENGER
- SWAP_SEATS
- ASSIGN_TEAM_TO_ROOM
- ALLOCATE_FIELD
- MOVE_STOCK
- ASSIGN_ASSET
- PUBLISH_SCENE

Each command must carry:

- actor;
- role/scope;
- target entity;
- scene;
- previous state;
- proposed state;
- validation result;
- timestamp;
- audit event;
- rollback/undo semantics where allowed.

Modes:

- VIEW
- EDIT
- SIMULATE
- LIVE
- REPLAY

Simulation must be non-destructive until human confirmation.

---

## 15. Constraint and optimization layer

The architecture must separate AI reasoning from deterministic constraints.

Potential deterministic solver families:

- assignment;
- scheduling;
- routing;
- packing;
- capacity;
- collision;
- availability;
- eligibility;
- permissions.

Example:

“Organize 31 athletes across 4 vans” may be interpreted by AI, but the final feasible arrangements should be computed and validated by deterministic rules/optimization, then previewed visually.

No LLM may directly bypass constraint validation by manipulating coordinates.

---

## 16. AI operating model

AI has three visual modes:

### AI Dock
Persistent contextual assistant for short requests.

### AI Full Workspace
Large surface for:
- multi-source analysis;
- plans;
- comparisons;
- simulations;
- document generation;
- operational preparation.

### Context AI
Embedded within domain pages.

Examples:

Formation:
- “show only available players”
- “prepare 4-3-3 with convocated players”

Transport:
- “find who has no seat”
- “propose three feasible allocations”

Facilities:
- “find conflicts Friday 18:00–20:00”
- “simulate moving U15 to field B”

Warehouse:
- “what should we reorder?”
- “where is this item?”

AI outputs semantic intentions and proposals. Commands are validated by policy, source and deterministic constraints before execution.

---

## 17. Communication, WhatsApp and CRM

The Communication Hub must unify contextual communication, not merely aggregate inboxes.

Channels may include:

- WhatsApp;
- Gmail/email;
- internal messages;
- in-app notifications;
- push;
- authorized broadcasts.

A message can relate to:

- person;
- family;
- athlete;
- team;
- event;
- registration;
- order;
- supplier;
- payment;
- project.

This contextual relation prevents important operational information from disappearing inside chat history.

WhatsApp integration must respect opt-in, channel policy, template requirements, conversation windows and privacy rules. It is not a generic “send to all” button.

CRM boundaries:

- GESTIONALE: operational relationships, families, staff, suppliers, institutions;
- SPONSOR: commercial prospect/deal/activation/renewal pipeline;
- shared canonical identities must prevent duplicate organizations and contacts.

---

## 18. Payments, purchasing, sales and supply

Internal finance surfaces must support role-gated views for:

- athlete fees;
- installments;
- reimbursements;
- sports workers;
- suppliers;
- expenses;
- income;
- sales;
- sponsor/contribution flows where applicable;
- deadlines;
- reconciliation;
- budget;
- treasury.

Purchasing workflow:

REQUEST → APPROVAL → QUOTES → SUPPLIER → ORDER → DELIVERY → WAREHOUSE → INVOICE → PAYMENT → ARCHIVE

Sales may cover:

- merchandising;
- clothing;
- services;
- tournaments;
- camps;
- events;
- club-house activity;
- card/benefit initiatives.

No payment or financial workflow may become automatically mutable by AI without policy and human gates.

---

## 19. Security, privacy and minors

Mandatory principles:

- server-side authorization;
- role + scope + capability checks;
- least privilege;
- step-up authentication for future sensitive operations;
- no public direct private-person data;
- consent-aware media;
- source-aware publication;
- immutable audit evidence for important actions;
- safeguarding isolated from normal CRM/chat/analytics;
- no hidden collection of device identity for visual adaptation.

Faces, media and minor-related public projections require explicit permission logic.

---

## 20. Rendering architecture

The design must not hard-code one renderer as the product architecture.

Recommended abstraction:

### Semantic layer
Canonical scene/entity/placement/constraint model.

### Interaction layer
Pointer, touch, keyboard, drag, snap, zoom, pan, select, multi-select.

### Renderer adapters
Candidates to be tested, not yet frozen:

- SVG/DOM renderer for semantic scenes;
- PixiJS/WebGL for larger scene density;
- geographic/map renderer for real maps;
- graph/workflow renderer for relational processes;
- print/PDF renderer for exported operational sheets.

The first release must remain usable without WebGPU.

---

## 21. Skill and plugin strategy

No plugin is mandatory to begin product design.

Existing connected systems already cover core project work: GitHub, Google Workspace, Supabase, Vercel/Render, Canva for editorial assets, PostHog, and image-generation capabilities.

A dedicated reusable project skill is recommended after written design approval:

**`scd-design-system-spatial-ui`**

Its intended responsibilities:

- load SCD visual/asset governance;
- enforce macro/micro template grammar;
- enforce official asset handling;
- enforce face/consent rules;
- enforce spatial object semantics;
- enforce responsive and accessibility rules;
- route to the correct design/code/data tools;
- prevent generic SaaS regressions.

Potential prototyping plugins/tools remain optional candidates, not architecture dependencies.

No new plugin should be installed solely because it exists.

---

## 22. Technical spikes required before stack freeze

The exact implementation stack remains intentionally unfrozen until three bounded proof exercises are completed after implementation planning approval.

### Spike A — Formation 2D
Must prove:

- desktop pointer interaction;
- mobile touch interaction;
- keyboard-accessible alternative;
- drag/drop;
- deterministic save/load;
- semantic data binding;
- responsive layout;
- acceptable performance;
- print/export feasibility.

### Spike B — Van + constraints
Must prove:

- seats as semantic slots;
- person assignment;
- capacity validation;
- duplicate prevention;
- warning/block states;
- deterministic solver integration feasibility;
- mobile usability.

### Spike C — Facility plan
Must prove:

- multiple spaces;
- zoom/pan;
- layered objects;
- occupancy/time states;
- room/field assignment;
- responsive behavior;
- performance on realistic SCD scale.

Only after these spikes should the renderer stack be frozen.

---

## 23. Visual acceptance criteria

The Visual Foundation passes only if:

- public home does not look like the internal ERP;
- internal home does not look like a generic SaaS card wall;
- at least eight macro templates share one coherent visual grammar;
- micro-components preserve meaning across contexts;
- official logos use verified masters;
- faces obey consent and projection policy;
- accessories use one coherent visual family;
- formation, van and facility scenes use the same spatial semantics;
- drag interaction has non-drag accessibility alternatives;
- mobile is purpose-composed, not desktop shrunk;
- desktop uses available space professionally;
- no fake sports, sponsor, finance or facility data is used;
- every operational value can expose provenance or a verified unavailable state;
- AI suggestions are clearly distinguishable from executed state;
- simulation is clearly distinguishable from live state;
- high-risk actions remain human-gated.

---

## 24. Decomposition into design workstreams

The approved architecture should later be delivered through separate implementation specs/plans, not one giant code change.

Recommended order:

1. **Identity & Cross-App Shell**
2. **Visual Design Tokens + Macro/Micro System**
3. **Public Editorial Home**
4. **Entity Cards / Faces / Asset Registry**
5. **Spatial Engine Foundation**
6. **Formation Scene**
7. **Van / Transport Scene**
8. **Fields / Locker Rooms Scene**
9. **Warehouse / Supply Scene**
10. **Communication Hub + Operational CRM**
11. **Payments / Purchases / Sales**
12. **AI Workbench + Command/Simulation**
13. **Sponsor spatial/public projections**
14. **Observability, QA and evolution**

Each workstream receives its own acceptance evidence.

---

## 25. Non-goals for the first implementation cycle

The following are explicitly deferred:

- full 3D digital twin;
- WebGPU dependency;
- real-time multiplayer editing;
- autonomous financial execution;
- autonomous permission changes;
- autonomous registrations/tesseramenti;
- autonomous safeguarding handling;
- complete IoT integration;
- complete physical access-control integration;
- advanced tactical analytics;
- predictive athlete performance ranking;
- replacing official federation systems.

Deferral means architecture-ready, not forgotten.

---

## 26. Governance impact

This design introduces architectural concepts that will require controlled updates to the machine-readable governance after human approval, including:

- current user-facing project naming;
- single-account cross-app access policy;
- Visual Foundation capability IDs;
- Spatial Operations capability IDs;
- public/editorial projection contract;
- face/consent asset policy;
- scene/command/constraint contracts.

The runtime manifest is intentionally **not changed by this design-only commit**. Updating runtime governance before the human approves this written specification would make an unapproved design binding, which is explicitly forbidden by the design workflow.

After written-spec approval, the implementation plan must schedule the manifest and directive-registry updates before product code.

---

## 27. Definition of design completion

This design stage is complete only when:

1. this document is committed on an isolated design branch;
2. placeholder/ambiguity/contradiction review passes;
3. the human explicitly reviews and approves the written specification;
4. only then is the implementation-planning workflow started.

Until those gates pass:

**NO PRODUCT CODE. NO NEW AUTH. NO NEW DATABASE. NO DEPLOY. NO PRODUCTION CHANGE.**
