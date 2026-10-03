# SCD ONE HANDOFF

Updated: 2026-10-03

## CURRENT_STATE
- APP_ID: SCD_ONE
- MAIN: `d16a658786b7577af498a3104dc31ebdd17f7613` (verified at task start)
- BRANCH: `copilot/ai-scd-one-again`, draft PR #104 targets `ai-scd-one`
- RUNTIME: root `index.html` + `scd-ng.js` + `scd-ng.css` + `ui-r52-social.css`
- STATUS: ONE-01 vertical slice IMPLEMENTED and TESTED locally; not deployed or production-verified
- CI: run `37134055115` was in progress at task start; re-check the PR checks after the code push
- R20: identity/role/scope authority unchanged
- EVENT_ID: existing Calendar Fusion contract unchanged
- PAGES / RENDER / SUPABASE production health: UNVERIFIED; no production action taken
- PRODUCTION MUTATION: not authorized

## AFFECTED_CAPABILITIES
- `CAP-PULSE`, `CAP-HOME`, `CAP-CALENDAR`, `CAP-PWA`, `CAP-PUBLIC-TEAMS`, `CAP-MEDIA-SOCIAL-HUB`
- Classification: KEEP R38-R56 data, APIs, identity, Family/Athlete boundaries and official assets; ENHANCE navigation, Pulse, routing, Friday-to-Friday week and PWA shell; FIX unverified source/live labels; REBUILD_IMPROVE presentation only.

## IMPLEMENTED_SLICE
- Canonical HOME / CALENDAR / TEAMS / SOCIAL / PROFILE navigation on mobile and a desktop rail using the same public views.
- Pulse reports today's verified public agenda, next event, changes between successful calendar checks, and explicit PENDING / UNVERIFIED / UNAVAILABLE alert-source state.
- Calendar source state fails closed when upstream reports an error; no live/sensor, sport, or transaction data is fabricated.
- Friday-to-Friday week range is shared by the public runtime and newsroom API.
- Canonical deep links support `#home`, `#calendar`, `#teams`, `#social`, and `#profile`; legacy `#pulse` / `#twin` routes are normalized.
- Existing PWA manifest and offline shell are retained, versioned, and cache the new runtime modules.
- Browser share, deep-link routing, push, media, and secure-storage ports are isolated behind native-adapter interfaces; unavailable native features fail closed.
- No duplicate identity, database, calendar, CRM, or source registry was added.

## DATA_SOURCES
- Pulse/calendar reads the existing same-origin `/api/newsroom` and `public.calendar` paths.
- Calendar status is VERIFIED only on a successful upstream response; missing or failed sources render explicit states.
- The `config/reference-sources.v1.json` registry is not present in this checkout; it was not copied or duplicated.
- Family/Athlete and private surfaces continue to rely on existing server-side R20 role/scope checks.

## TESTS_RUN
- `npm run test:scd-one-contract` — PASS, including Pulse and native-adapter contracts.
- `npm run test:manifest` — PASS.
- `npm run check` — PASS (repository contract and syntax suite).
- Chromium manual QA: 360×800, 390×844, 393×852, 430×932, 1280×800, 1440×900, and 1920×1080; all five deep links; five-item mobile nav; desktop fixed rail; no horizontal overflow.
- Local preview used `SCD_APPS_SCRIPT_URL=http://127.0.0.1:1`; visible unavailable states were intentional and no production reads/writes were made.
- Existing `tests/smoke-nextgen.mjs` Playwright suite was not runnable because `playwright` is not installed in this checkout. Chromium QA used the system browser directly.
- Screenshots were captured under `/tmp/scd-one-mobile-clean.png` and `/tmp/scd-one-desktop-clean.png`; they are temporary local evidence, not repository assets.

## VISUAL_QA
- `SPATIAL_SPORT_EDITORIAL_HIGH_IMPACT`; existing official SCD crest retained (`KEEP_LOCKED`).
- Mobile bottom navigation and desktop rail verified; reduced-motion behavior and visible keyboard focus remain supported by existing CSS.
- Offline/source-unavailable states are explicit; alert feed remains unavailable rather than implying there are no alerts.

## SECURITY_IMPACT
- No role, permission, session, RLS, or private-data contract changed.
- Public Pulse uses only public calendar/newsroom data; native secure-storage interface is unavailable until a native adapter is provided.
- No production DB migration, deploy, merge, or mutation performed.

## ROLLBACK
- Revert the ONE-01 commit(s) on this draft PR. No production state or schema has changed.

## NEXT_SAFE_ACTION
- Review the draft PR and current GitHub CI evidence; if checks remain green, request human review of the ONE-01 slice.
- Next implementation slice: verified SCD Week/Calendar projections and upstream change/alert provenance; do not merge or deploy without explicit authorization.
