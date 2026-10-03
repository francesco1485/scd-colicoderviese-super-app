# AI-SPONSOR-01 — Sponsor Platform audit and consolidation plan

**Audit date:** 2026-10-03  
**Scope:** current repository snapshot at `d16a658786b7577af498a3104dc31ebdd17f7613`  
**Deliverable status:** audit and plan only; no production, data, permission, or hosting changes

## Executive summary

Sponsor Platform (`APP_ID: SCD_SPONSOR_PLATFORM`) is a distinct public/private companion web app and one of the three canonical SCD applications in the four-app portfolio. It complements SCD Universe; it is neither a replacement for Universe nor a standalone fifth Commercial/Lia app. Its public partnership experience and authenticated private Partner OS remain distinct worlds within this companion app. It reuses canonical SCD identity, data, provenance and security contracts, including R20/Apps Script for identity and operational reads, and connects CRM records to stakeholder IDs. Its development pipeline is live-master-first with a timestamped snapshot fallback. These are worth preserving.

The most urgent issue is data handling: the GitHub repository is public, while tracked client-side and snapshot files include sponsor/prospect/supplier records and commercial/contact fields. The private route guard protects the running web app, but it cannot protect records committed to a public repository. The UI also declares a `finance:false` capability for the Commercial profile without applying that capability to the finance-bearing client bundle or to route-level authorization in this service.

The project should not be rewritten or given a second CRM/database. First contain and review the committed data exposure with the data owner; then enforce R20-backed server-side scopes, remove duplicate inline records in favor of canonical projections, complete Drive/document linkage, and verify the declared Render/Pages contracts. Do not deploy or mutate production as part of this audit.

## SCD:STATE — hard gate

| Field | Status | Evidence / limitation |
|---|---|---|
| `REPOSITORY` | `VERIFIED` | `francesco1485/scd-colicoderviese-super-app` |
| `CURRENT_MAIN_SHA` | `VERIFIED` | `d16a658786b7577af498a3104dc31ebdd17f7613` |
| `CURRENT_WORKING_BRANCH` | `VERIFIED` | `copilot/ai-scd-sponsor-platform`; the requested `ai-scd-sponsor-platform` manifest/config refs were read remotely and are not the checked-out branch |
| `WORKING_TREE` | `VERIFIED` | Clean before this documentation update |
| `OPEN_PR` | `VERIFIED` | PR #93 is open for this audit branch; historical sponsor PR #55 remains open on `r45-sponsor-operations-radar` |
| `PR_STATUS` | `VERIFIED` | PR #93 is open/draft against main `d16a658`; no merge requested or performed |
| `CI_STATUS` | `VERIFIED` | GitHub showed PR #93's Copilot check `IN_PROGRESS` at 2026-10-03 10:17 UTC; no completed result was available |
| `PAGES_STATUS` | `UNVERIFIED` | GitHub reports Pages enabled, but the public URL could not be resolved from this environment |
| `RENDER_STATUS` | `UNVERIFIED` | `APP_AI_MANIFEST.md` declares `scd-sponsor-platform` on Render `main`; the health URL could not be resolved here. The checked-in root `render.yaml` defines only `scd-colicoderviese-super-app` |
| `MANIFEST_VERSION_OR_HASH` | `VERIFIED` | `SCD_SYSTEM_MANIFEST.json` v3.26.0; SHA-256 `46518c9e5aa258fd5bbc1e80ecf0d1fa7c65b12c6e32a7d721dc4b5ed3205baf` |
| `RELEASE_DEPENDENCIES` | `VERIFIED` | Task manifest declares protected runtime dependency `scd-colicoderviese-official-r21`; live dependency health is unverified. This documentation-only change makes no release/deployment request |
| `DATA_SOURCES_VERIFIED` | `UNVERIFIED` | Source contracts are present in the manifest and code, but live Google Sheets, Drive, Gmail, Calendar, and R20 contents/access were not queried |
| `KNOWN_BLOCKERS` | `VERIFIED` | Public-repository data exposure needs data-owner review; actual Render/Pages state and live upstream role enforcement are unavailable; checked-out branch differs from the named AI branch |
| `SAFE_NEXT_ACTION` | `VERIFIED` | Review the corrected portfolio scope and audit in PR #93. Do not deploy, merge, change production data/roles, or rewrite repository history |

### Inputs and AI instructions

- Read `SCD_SYSTEM_MANIFEST.json` v3.26.0 and `AGENTS.md` from the checked-out main snapshot.
- Read the updated task-branch `APP_AI_MANIFEST.md` from remote branch `ai-scd-sponsor-platform` (blob `711f116f0b994db154d2f9740b229820cce56579`), `config/ai-portfolio.v1.json` (blob `7c96798fcc257a8a59f2494636109d65378c751f`), and `docs/AI_CONTINUOUS_EXECUTION_PROTOCOL.md` (blob `c91805e1d5dbbef6b52321db4c3cda0d8f8413fb`).
- The checked-out snapshot does not contain `.github/copilot-instructions.md` or `APP_AI_MANIFEST.md`. Reviewed the repository instructions and frontend/security/Supabase path instructions from the open control-plane PR #82; these files are not part of the checked-out main snapshot. `.github/agents/` was not inspected.
- The updated task manifest identifies `APP_ID: SCD_SPONSOR_PLATFORM`, `sponsor/` as primary code, `scd-sponsor-platform` as the public runtime, and `scd-colicoderviese-official-r21` as a protected runtime dependency. It classifies Sponsor as one of the three canonical SCD applications and a distinct companion web app—not a replacement for SCD Universe, a second identity/calendar system, or a fifth Commercial/Lia app. It requires reuse of canonical models and contracts, no invented sponsor facts, explicit public/private boundaries, and no merge, deploy or production mutation from the AI branch.

## SCD:EXPERT + SCD:ARCHITECT

- `TASK_CLASS`: repository/runtime audit and consolidation plan; documentation-only change.
- `DOMAINS`: commercial operations, source lineage, CRM, identity/authorization, privacy, public/private UX, media/documents, hosting and QA.
- `ARCHITECT_STATUS`: applied to audit and recommendations; no implementation, visual redesign, schema change, or deploy in scope.
- `FIXED`: R20 remains authoritative for identity, roles and existing operations; canonical Sheets/Drive/Gmail remain source authorities by domain; no duplicate CRM/database; no invented sponsor facts; production mutations require human approval. Sponsor is the distinct `SCD_SPONSOR_PLATFORM` companion app in the canonical four-app portfolio, not a fifth Commercial/Lia app.
- `IMPROVABLE`: eliminate embedded duplicate records; enforce each capability on the server; make document/media links source-backed; specify the public/private hosting contract and validate it; recover useful Commercial/Lia capabilities into the Sponsor scope where verified and appropriate.
- `MISSING`: verified production service configuration/health, live source comparison, role-by-role R20 evidence, data-retention/visibility decision, visual-browser QA, and canonical Drive document-link implementation.
- `SOURCE_PLAN`: use the manifest’s `SPONSOR_MASTER_SHEET`, `SCD_OPERATIVO_PILOTA`, `R20`, `SCD_DRIVE`, `SCD_GMAIL`, and `SCD_GOOGLE_CALENDAR` only; use the R57 visual master and its canonical visual-system/gate files for presentation; do not add a source.
- `TOOLCHAIN`: existing root Node scripts; `npm run check`; static review of the current code and GitHub branch/PR metadata. No new dependencies or test tooling.
- `RISK`: high for commercial/contact data committed to a public repository; high for role-scope separation until checked at each server/upstream operation; medium for stale/duplicate commercial state and unverified hosting.
- `TEST`: full existing root check passed at the audited SHA. There is no evidence here of live-source integration, role-matrix, visual/accessibility, or production-runtime tests.
- `ROLLBACK_PLAN`: revert this documentation-only commit. It changes no runtime, data, role, source, or production state.
- `NEXT_ACTION`: data-owner review of public-repository records, followed by scoped hardening in a separate approved implementation PR.

## Architecture and source-of-truth map

| Domain | Current implementation | Authority and status |
|---|---|---|
| Public sponsor experience | `sponsor/index.html`, `sponsor/sponsor.js`, `sponsor/sponsor.css`; public lead/access forms submit to the SCD API | Public presentation is a useful SCD entry point. A preview contains unmarked example partner/KPI copy and should not be mistaken for verified activity |
| Private Partner OS | `sponsor/app.html`, `sponsor/app.js`, `sponsor/app.css`; private page and JS are routed through `serveSponsorPrivate` after `validateSponsorSession` | Keep the route/session boundary. It does not protect source files already committed to this public GitHub repository |
| Identity/session | `server.js` validates the sponsor session through R20/Apps Script; cookie is `HttpOnly`, `SameSite=Lax`, and `Secure` in production | R20 is the intended authority. Production behavior and role revocation were not exercised |
| Sponsor CRM | `/api/sponsor/crm` calls `private.crm.summary` / `private.crm.detail`; Partner Hub links records and detail to CRM IDs, agreements, touchpoints, tasks and opportunities | Integrate with canonical stakeholder/company records; do not create another CRM |
| Development projects | `/api/sponsor/development` calls `private.development.summary`; accepts live-master rows, then returns only the verified, timestamped snapshot fallback | Manifest sets `SCD_OPERATIVO_PILOTA/INIZIATIVE_COMMERCIALI` as the authority and requires snapshot provenance, explicit age, and live-master precedence |
| Agenda | `/api/sponsor/agenda` uses the Google Calendar-backed private summary/create actions | Keep one canonical event and human confirmation; actual upstream authorization was not verified |
| Documents/media | Motion/creative configuration is loaded from registered JSON/config and linked CRM IDs. The Document Hub currently renders static folder labels and “connect files” copy; no sponsor Drive-document API is present in the inspected route set | Incomplete: integrate Drive file IDs, versions, hashes and server-side access checks; do not copy private files into a second store |
| Community/benefits | `/api/sponsor/community` reads the upstream master and returns an explicitly marked snapshot fallback | Keep the source mode visible; verify fallback timestamp and validity at runtime |

Relevant manifest capability declarations include `CAP-SPONSOR-OPERATIONAL-FOCUS` (`PARTIAL`), `CAP-VALUE-ENGINE`, `CAP-ASSET-INTEGRITY`, `CAP-HOME`, and `CAP-IDENTITY-ACCESS`. The sponsor development contract explicitly distinguishes suppliers from sponsors, requires reconciliation of quotes, prohibits invented costs/partnerships, and requires snapshot provenance. No sponsor-specific item appears in `known_noncompliance`; that does not override the partial capability state or the gaps below.

### Data lineage and state model

- `SPONSOR_MASTER_SHEET` is registered for sponsor/partner/commercial/asset/follow-up authority.
- `SCD_OPERATIVO_PILOTA` is registered for stakeholders, suppliers, commercial initiatives, relationships, decisions and lineage. Initiative identities/statuses must remain canonical; a supplier is not thereby a sponsor.
- `R20` remains the identity, role and existing operations authority. `SCD_DRIVE` and `SCD_GMAIL` are the registered document and incoming-communication back-office authorities; `SCD_GOOGLE_CALENDAR` is the shared agenda.
- CRM-backed records are enriched through canonical IDs, but `sponsor/app.js` also contains independent sponsor, prospect, supplier, asset, event and report arrays. Those lists feed multiple screens and are merged with CRM data in some, but not all, views. Their source/version is not established in the UI and they can diverge from the canonical masters.
- The private development view is stronger: it labels `LIVE_MASTER` versus `SNAPSHOT_VERIFIED`, renders `generatedAt`, fails closed if the expected snapshot contract is invalid, and does not substitute a snapshot when its source provenance is wrong.
- No live source was queried for this audit. “Verified” describes repository declarations and code paths, not the present truth of individual commercial records.

### Portfolio boundary and Sponsor capability scope

- `config/ai-portfolio.v1.json` on `ai-scd-sponsor-platform` declares exactly four canonical apps: three owned by SCD ColicoDerviese and one by Maglia Assicurazioni. `SCD_SPONSOR_PLATFORM` is one of the three SCD apps, with `sponsor/` as its code root, `scd-sponsor-platform` as its canonical runtime and `scd-colicoderviese-official-r21` as a protected runtime dependency.
- Sponsor is a distinct companion public/private web app in the SCD portfolio, not an internal module of the SCD Universe app and not a replacement for it. The product portfolio is unified; each canonical app retains its assigned boundaries and runtime.
- The task manifest assigns public partnership/territory/sport/events/opportunities, LEDWall/Sponsor Wall, convenzioni/community benefits, solidarity fund and partner entry/contact to the public world. It assigns Partner Hub, CRM/stakeholders, commercial pipeline, Sponsor Operations, Lia Sponsor, initiatives/projects, supplier/sponsor radar, assets/media and proof/reporting to the private world.
- These are the app’s defined ownership boundaries, not a claim that every surface is complete, production-verified or currently wired to live sources. The audit findings and P0–P5 plan below identify observed gaps; no feature implementation or runtime change is included.
- Useful Commercial/Lia work belongs in Sponsor when it fits these boundaries. Recover and integrate it only after source/contract review; do not create a fifth app, parallel CRM, identity service or data store.

## KEEP / ENHANCE / FIX / INTEGRATE / COMPLETE / REMOVE_WITH_REASON

| Classification | Area | Audit result and evidence |
|---|---|---|
| `KEEP` | Canonical app portfolio and public/private boundary | Sponsor Platform is its own companion app (`SCD_SPONSOR_PLATFORM`) within the three-app SCD portfolio; it complements, and does not replace or merge into, SCD Universe. Preserve separate public partnership presentation and protected private commercial operations within Sponsor. Public layout has responsive breakpoints, skip link, visible keyboard focus, reduced-motion handling and labeled forms |
| `KEEP` | R20 session and route guard | `server.js` validates session before serving private HTML/JS and before CRM, agenda, communication and development handlers; private responses use `no-store` in the reviewed handlers |
| `KEEP` | Canonical CRM/project bridge | CRM details and operational focus are linked to canonical CRM/stakeholder/project and Calendar endpoints. Preserve existing IDs and master authority |
| `ENHANCE` | Role and scope authorization | `sponsorCapabilities()` distinguishes Direction and Commercial (including `finance:false` for Commercial), but `applySponsorCapabilities()` only gates Settings in the client. The manifest identity-role list has no dedicated sponsor/commercial role; the service derives a profile from the R20 user’s role/type. Route handlers generally check broad sponsor eligibility and pass the session upstream; no local per-capability enforcement or role matrix is demonstrated. Upstream may add checks, but that was not verifiable. Reconcile the mapping with Direction and the existing R20 roles; do not add a role without the required manifest change and approval. |
| `FIX` | Public-repository data exposure | GitHub marks the repository `private: false`. Tracked `sponsor/app.js` and `config/sponsor-development.snapshot.json` contain commercial/contact record fields, including financial and follow-up data (`sponsor/app.js:192-267`; snapshot source/provenance begins at `config/sponsor-development.snapshot.json:1-15`). App-route authentication cannot protect public Git history. No record values are repeated in this report. Treat as an exposure requiring a data-owner/privacy decision; do not rewrite history or alter repository visibility automatically. |
| `FIX` | Duplicate/uncertain client-side records | Multiple screens render inline arrays for portfolio, contracts, proposals, suppliers, assets, events and analytics (`sponsor/app.js:192-303`, `570-645`, `724-731`, `1052-1081`). CRM merging applies only in selected Partner Hub flows (`sponsor/app.js:353-380`). Reconcile each field against the registered master and replace duplicates with server-authorized projections; fail closed on unknown provenance. |
| `FIX` | Capability boundary for financial data | Direction/Commercial capabilities are calculated server-side (`server.js:134-158`), but private JS is returned to any broadly sponsor-authorized session (`server.js:160-166`, `475-486`), and client gating currently covers only Settings (`sponsor/app.js:66-80`). Finance-bearing data is embedded in that client file. Enforce role/scope on server responses and minimize the bundle; verify actual commercial versus Direction access before further production use. |
| `FIX` | Public demo copy | A public interactive preview presents a named sample organization and completion/material/request KPIs without a clear simulation label (`sponsor/sponsor.js:6-14`). Remove or visibly label non-factual examples; public sponsor status and metrics must be verified. |
| `INTEGRATE` | Stakeholder and project linkage | Keep R20/SCD Operativo IDs as the joining mechanism and reuse canonical person/project/event/document/source models. Define a single field map for sponsor, prospect, supplier, agreement, follow-up and initiative state; avoid name-based matching as canonical identity |
| `INTEGRATE` | Commercial/Lia workstream | Sponsor scope includes Lia Sponsor and relevant commercial pipeline capabilities. Recover useful work from `r42-commercial-development-os` or `ai-scd-commercial-lia` into this app only after reviewing its code/contracts; do not split Lia/Commercial into a fifth app. No source branch contents were inspected as part of this audit, so no feature parity or recovery is claimed |
| `COMPLETE` | Document Hub | The UI currently maps fixed folder names to placeholder copy (`sponsor/app.js:291`, `855-856`; `sponsor/app.html:430-433`); the inspected sponsor routes have no Drive file-list/detail endpoint. Add no new storage: use authorized Drive IDs, lineage, version/hash and link permissions |
| `COMPLETE` | Media delivery/proof | Motion profiles are useful planning records with approval gates, but a concept/proof plan is not a verified delivery artifact. Link official approved assets and actual proof documents from Drive; maintain the asset registry’s exact-wordmark/provenance rules |
| `FIX` | Service and documentation contract | `sponsor/README.md` calls this a separate free app with external writes disabled, which no longer matches the current API-backed SCD module. The task manifest declares a separate Render service, while root `render.yaml` only describes the main web service. Update the service/ownership/runbook contract only after the actual Render configuration is verified |
| `REMOVE_WITH_REASON` | Unreferenced style candidates | `sponsor/public.css`, `sponsor/worlds.css`, and `sponsor/v5.css` have no references in the checked-in HTML/JS search; active public/private pages link `sponsor.css` and `app.css`. Treat these as removal candidates only after checking alternate service/build consumers and preserving a diff/rollback |
| `REMOVE_WITH_REASON` | Old branch/PR residue | The remote branch inventory includes older sponsor feature branches (R37–R53 and `feat/*`); PR #55 is still open from the R45 line and reports dirty merge state. Compare each branch/PR with current R56/R57 code and the canonical source before owner-approved close/archive/delete. Do not bulk-delete branches or merge the old PR as part of this audit |

## Security and privacy findings

### High — records in a public repository

The repository is confirmed public. The private web route is not a repository access control. Commercial/contact fields are tracked in client-side JS and the development snapshot. This audit deliberately does not reproduce any record values. The data owner should determine the exposed categories, applicable retention/notification steps, and approved remediation; do not rewrite Git history, change visibility, or alter source data without authorization.

### High — role-derived data is not consistently scoped

The server returns separate Direction/Commercial capabilities, but the private client only hides the Settings view based on those capabilities. Commercial users are broadly accepted by `validateSponsorSession`; reviewed handler methods do not locally enforce each capability before returning CRM/communication/agenda data. The upstream Apps Script may enforce additional scopes, but that contract and current production policy were not available for verification. Static client data bypasses any upstream field filtering. Require a server-enforced permission matrix backed by R20, deny-by-default behavior, and tests for each audience before calling this boundary production-verified.

### Medium — public intake and OTP abuse/privacy controls

Public sponsor lead, access-request and OTP routes accept JSON with a generic body-size limit; the inspected service has no visible rate limiting or anti-automation control. OTP success logs the submitted email and failure logs both email and upstream error (`server.js:300-314`). Add input schema/length validation, abuse controls, enumeration-safe responses, and log redaction. Confirm any upstream throttling before treating it as a mitigating control.

### Positive controls verified in code

- Private page and app JavaScript route through `validateSponsorSession`.
- R20 is asked to validate the session; role data is not supplied by the browser for private APIs.
- Sponsor session cookie is HttpOnly, SameSite=Lax, and Secure when production/HTTPS is detected.
- Development data is served live-master-first with a provenance-checked snapshot fallback and no-store response.
- Public donation response states that an intent is not payment confirmation; donor wall and automatic tax benefit claims are disabled.
- No direct public route to CRM/development data was found in the reviewed route table. This does not resolve the public-repository exposure above.

## UX, accessibility and performance

- **Responsive:** public CSS includes tablet/mobile/narrow-phone breakpoints; private CSS also contains tablet/mobile breakpoints. Desktop and mobile use the same pages. This is code inspection, not a completed viewport review.
- **Layout/visual inspection:** public desktop uses a sticky 78px header, a two-column hero with a 360px insight panel, and multi-column opportunity/number grids; at 1150px the public navigation is hidden and the hero stacks, at 720px grids/form fields collapse, and at 380px branding is reduced. The inspected public markup has no alternate menu toggle, so mobile discovery/navigation needs a specific check. Private Partner OS uses a 205px fixed sidebar plus content area; its stylesheet switches the main/sidebar composition around 1000px and stacks selected modules below 700px. The styles define navy/blue/cyan/yellow tokens, but private CSS also contains layered R38/R48 token overrides. No screenshot comparison against the approved visual master was performed.
- **Accessibility foundations:** skip links, semantic landmarks, visible focus, reduced-motion rules, labeled public forms, status/live regions and dialog roles exist. Some private cards are custom interactive articles and should remain keyboard-tested. No automated accessibility or screen-reader run was found.
- **Visual QA:** no verified comparison against approved visual masters and no browser capture at the repository’s required viewport matrix was performed. Treat it as pending, not passed.
- **Performance:** active private source footprint is approximately 121 KB JavaScript and 137 KB CSS before transfer compression/assets; public markup/styles are also substantial. No production waterfall, Core Web Vitals, or device-performance measurement was available. Establish budgets and measure before further feature growth.

### VISUAL_CLASSIFICATION

- `sponsor/index.html` and the legacy public sponsor presentation: `REBUILD_IMPROVE`. Preserve its public partnership purpose, verified content, canonical IDs, endpoints, source provenance, accessibility and public/private separation; improve composition and interaction using the R57 SCD visual system rather than retaining a generic brochure treatment.
- `sponsor/app.html` / `sponsor/app.js` Partner OS presentation: `REBUILD_IMPROVE`. Preserve its private operational purpose, R20 authorization, CRM/project links and real service states; evolve hierarchy toward action/context, not a generic admin dashboard. This classification does not authorize a rewrite or any runtime change in this audit.
- Canonical person, project, event, document and source models, IDs, R20 security and data provenance: `KEEP_LOCKED`. Preserve this companion app’s assigned boundary; do not create another Sponsor/Commercial application, a parallel CRM, or replace real data with examples or inferred values.
- Official SCD/sponsor marks and verified logos: `KEEP_LOCKED`; where an official source asset is missing or unverified, `RESEARCH_REAL_ASSET`. Never redraw or invent sponsor identity.
- Use `config/scd-visual-system.json` as the sole palette source (mineral/navy, lake/aqua, muted gold, warm white and low-saturation accents); do not infer a new palette from legacy CSS overrides. Keep the Sponsor companion app’s public presentation distinct from its private commercial operations, while retaining its clear identity as part of the SCD portfolio.
- No Smart Facility/device surface was changed. Any future facility tile must use only verified explicit states (`CONNECTED`, `READY_FOR_ADAPTER`, `NOT_CONNECTED`, `UNVERIFIED`, `MANUAL_CHECK_REQUIRED`); never imply a live sensor, lock, alarm or service without a real adapter.

### VISUAL_QA

- `STATUS: NOT_RUN` for browser/visual QA. This PR changes audit documentation only; the layout and CSS observations above are static source inspection, not proof of compliance with the R57 visual gate.
- `MASTER_REFERENCES`: `docs/SCD_VISUAL_EXPERIENCE_MASTER.md`, `config/scd-visual-system.json`, and `config/scd-visual-experience-gate.v1.json` from `r57-copilot-control-plane` (visual master blob `5921af1ee3b597ac7ad005759d1af884539c37a4`; machine gate blob `1a71032631007519f0da815139603dfc61a5fc6c`).
- `VISUAL_COMPARISON`: not performed; no approved-master screenshot comparison is claimed. `VIEWPORTS`: none captured at 360×800, 390×844, 393×852, 430×932, 1280×800, 1440×900, or 1920×1080.
- `OVERFLOW / KEYBOARD / FOCUS / CONTRAST / REDUCED_MOTION`: no runtime/browser verification. Source contains some focus and reduced-motion provisions, but required interaction checks remain open.
- `LOADING / EMPTY / ERROR / OFFLINE / SOURCE_FALLBACK`: source states were inspected selectively; no visual-state regression or end-to-end test was performed. Preserve explicit unavailable/stale-source states and never label an unverified service “live”.
- `SMART_FACILITY`: not applicable to this audit deliverable; no device status is introduced.
- Before any future Sponsor UI release, satisfy the R57 gate with visual comparison, required viewports, no overflow, keyboard/focus, contrast, reduced-motion, loading/empty/error/offline and provenance/fallback states, asset integrity, and targeted E2E evidence.

## Tests and verification

Ran `npm run check` at the audited main SHA; it exited successfully. This includes:

- `npm run test:manifest` — manifest v3.26.0 passed.
- Sponsor vision contract — passed.
- Sponsor runtime smoke — passed; public route returned 200, anonymous private route redirected to access.
- CRM/communication contract — passed.
- LED production, design-system and community-benefit contracts — passed.
- Repository syntax checks — passed as part of `npm run check`.

The existing tests are valuable contract/smoke coverage but do not prove live Apps Script/Google source correctness, commercial-vs-Direction authorization, public-repository data minimization, OTP abuse controls, actual Render/Pages deployment, or responsive/accessibility/performance outcomes. Add those as explicit gates in the hardening phases below; do not mislabel current code as `PRODUCTION_VERIFIED`.

## Safe consolidation and hardening plan

### P0 — Data exposure decision and containment

1. Have the data owner classify the tracked commercial/contact fields and decide approved repository visibility, retention and remediation. Keep this review out of ordinary sponsor workflows.
2. Stop adding real commercial records to browser bundles, demo copy, or public snapshots. Do not paste record contents into issues, PR descriptions, logs, or this audit.
3. With approval, remove unnecessary personal/commercial fields from public-tracked files and history only through an explicit incident/remediation process. No history rewrite or production-data change is authorized by this audit.
4. Record which canonical source owns each removed field; do not replace it with a new CRM or spreadsheet copy.

### P1 — Server-side authorization

1. Define a matrix of sponsor capabilities, roles and scopes from R20 for Direction and authorized Commercial users.
2. Enforce each permission at the API/service boundary for CRM detail/finance, communication send, agenda creation, settings and document access. Client hiding is only presentation.
3. Return minimum fields needed for the authorized view; never ship restricted values in a static client file. Revalidate role/scope when handling each sensitive request and fail closed on R20 failure/ambiguous identity.
4. Add role-matrix tests proving anonymous denial, least-privilege Commercial access, Direction-only access, revocation/upstream failure behavior, and no private data in public responses.

### P2 — Canonical commercial model

1. Map `SPONSOR_MASTER_SHEET`, `SCD_OPERATIVO_PILOTA`, and R20 CRM IDs by domain: company/stakeholder, sponsor agreement, prospect, supplier, opportunity, follow-up, project and source lineage. Reuse canonical SCD models; keep this work in the assigned Sponsor companion app and do not create a parallel CRM or fifth Commercial/Lia application.
2. Make the canonical master/API the single source for all portfolio, contract, proposal, supplier and reporting views. Remove duplicate client arrays only after reconciliation and parity tests.
3. Preserve canonical status distinctions (prospect vs confirmed sponsor; supplier vs sponsor; concept vs approved; quote received vs reconciled). Unknown amount/date/commitment remains unavailable, not inferred.
4. Keep operational focus derived from verified project status and the single Calendar event model; any create action remains human-confirmed.

### P3 — Documents, assets and proof

1. Implement the Document Hub as an authorized projection of `SCD_DRIVE` using canonical file IDs, lineage, version/hash and source labels; do not upload a parallel copy.
2. Link agreements, approved logos, motion approvals and delivery proof to canonical CRM/project/stakeholder IDs.
3. Keep public wordmarks and media behind exact official asset/provenance gates. Concept previews must remain visibly conceptual until native LED specifications, rights and approvals are verified.
4. Add tests for access scope, stale/missing-source state, revocation and no-store behavior.

### P4 — Hosting contract and release evidence

1. Verify with the service owner whether `scd-sponsor-platform` is the public static Render service, how it maps to the main R20 API, and its canonical branch, build, health, CORS/cookie and rollback settings.
2. Align `sponsor/README.md`, the AI manifest and repository deployment descriptors with that verified topology. Do not add a new service or hosting stack to resolve documentation ambiguity.
3. Before any separately authorized release, collect live Render/Pages commit and health evidence, verify R20 and source dependencies, run the role/data gates, and document rollback. This audit authorizes no deploy.

### P5 — UI and ongoing QA

1. Run real browser QA at 360×800, 390×844, 393×852, 430×932 and 1280×800, 1440×900, 1920×1080; test keyboard, focus, dialogs, reduced motion, contrast and screen-reader landmarks.
2. Measure public and authenticated routes on mobile and desktop; define budgets for JS/CSS/images and regressions.
3. Add visual snapshots only from approved SCD visual masters and real/verified assets. Maintain public/private empty, loading, unavailable and stale-source states.

## Acceptance gates, rollback and limitations

- No new source, role, database, CRM, or core experience is introduced by this audit. The manifest contract is unchanged, so no manifest edit is required.
- The audit PR must remain documentation-only. No merge-to-main, production data mutation, role change, service change, deployment, or history rewrite.
- Hardening is not complete until public-repository data handling is decided, role scopes are enforced and tested server-side, data views are canonical, and runtime/source/visual evidence is captured.
- Rollback for this deliverable is a revert of the audit document commit; there are no data migrations or runtime side effects.
- Remaining unverified items: current Render/Pages health and commits, live Sheet/Drive/Gmail/Calendar contents, exact production R20 role policies, real responsive/accessibility/performance metrics, and historical branch ownership.
