# Release 2 — App madre · progress log

Nightly build agent log for branch `staging/superapp`, app `apps/superapp`.
Visual source of truth: Visual Master VR-022 (`docs/design/visual-master/`, approved by Francesco on 2026-10-11).
One backlog item per night, finished to a verifiable boundary. Status: `done`, `in-progress`, `blocked`, `todo`.

| # | Item | Status | Commit | Date |
|---|------|--------|--------|------|
| 1 | Foundations: tokens, area registry, interior shell, public chrome | done | see 2026-10-11 entry | 2026-10-11 |
| 2 | Access: "Accesso alle aree" menu + one access screen per area path | todo | | |
| 3 | Field rotation `/calendario/rotazione-campi` | todo | | |
| 4 | `/quadro` and `/gestionale` read-only | todo | | |
| 5 | Public: `/oggi`, match live page, LED sponsor, Sky Club, Foto | todo | | |
| 6 | Work areas read-only with honest empty states | todo | | |
| 7 | Gioca "in arrivo" teaser | todo | | |

## 2026-10-11 · Item 1 · Foundations · done

Delivered:
- **Design tokens** (`src/styles.css`, block "Release 2 · Visual Master VR-022"): outside palette `--out-*` (night #062a52, crest blue #0860A8, light blue #1898D8, yellow #F8D000 for actions only, white) and inside palette `--in-*` (ground #F2F7FC, white surfaces, ink #062a52, blue rail #0860A8, yellow action, state colours ok/warn/crit/info only for meaning). Tailwind theme colours `out-*` / `in-*`, fonts `font-title` (Big Shoulders Display) and `font-text` (Barlow, now loaded from Google Fonts), `--ease-out-strong`, `.scd-action` yellow button (scale .97 on press, 160 ms, reduced-motion safe), `.scd-led-strip`.
- **Typed area registry** `src/lib/areas.ts`: imports `config/superapp-areas.v1.json` directly (no copy), flattens the tree, `validateAreas()` (kebab-case ids, unique ids and paths, every child has a parent, aliases/flows/used_by resolve, boards exist in the Visual Master or are listed as private), `areaLink()` with the canonical path and the route that works today, `ACCESS_MENU` (board Accesso-aree), `INTERIOR_RAIL` + `railFor(roles)` (navigation filter only), `searchAreas()`, `stripValue()` (unknown → "—", zero and unknown muted), `formatClubDay()` (Europe/Rome). 20 vitest tests in `src/lib/areas.test.ts`, including a check that every current link is a real route of `routeTree.gen.ts` (no 404 from the menu).
- **`src/lib/satellites.ts` extended, not duplicated**: each role landing now carries the registry `areaId` it stands in for; `/aree/<slug>` is the "today" link of those areas until their direct path exists.
- **Interior shell** `src/components/scd/InteriorShell.tsx`: blue rail filtered by the role set (areas with no page yet shown as "presto", not as links), white header with title, copy-link path chip (with "Link copiato" live feedback), club date, real search over the area registry, dark "in evidenza" strip that mutes zero/unknown values. Phone: compact blue bar + rail drawer. Routes opt in with `staticData: { interior: true }`; the root then drops the public chrome (top bar, footer, sponsor band, bottom nav, Sky chat).
- **Public chrome**: top bar of board Accesso-aree (crest + COLICO/DERVIESE wordmark, Squadre · Calendario · Eventi · Sponsor · Contatti, yellow "Accesso aree" button, full menu button). `AccessMenu` opens the four groups of the board with lock icons and direct paths: desktop panel aligned to the bar, phone bottom sheet; Escape, outside click and route change close it. Areas without a page are marked "In arrivo"; areas reachable through their role landing say "link diretto presto". The full menu drawer gets an "Accesso aree" entry. Header height is now a token (`--pub-header-h`, 64 px phone / 72 px desktop) used by every sticky offset.
- **Registry corrections** (`config/superapp-areas.v1.json`): `quadro` board renamed to the real file `Quadro-settimanale.dc.html`; added `famiglia` (`/famiglia`) and `partner` (`/partner`) that the approved board Accesso-aree lists. Design status only, no roles or permissions changed.

QA:
- `npm run build`, `npm test` (170 passing, +20), `npm run test:manifest` green.
- Playwright 390×844 and 1440×900: `/calendario`, `/contatti` with the menu open, `/` (desktop bar; phone via the menu event), interior shell on a temporary harness route (rail, drawer, search, strip) removed before commit. No horizontal scroll, no console errors. Compared with boards Accesso-aree and Quadro-settimanale.
- `impeccable detect` on changed files: only advisory "bounce easing" findings on pre-existing Universe home animations (release 1, explosive style chosen by Francesco); nothing on the new code.

Notes / open points for Francesco:
- The registry has no role list for `segreteria`, `tesoreria`, `crm`, `magazzino`, `direzione`: the interior rail shows them to every staff role until roles are defined (navigation only; access stays with R20). Board Quadro-settimanale suggests a quadro manager should only see the Sport group.
- On phone board routes (Home), the public top bar is hidden by design: "Accesso aree" is reachable from the full menu and the Home "Il tuo ingresso" band. Item 2 should add a direct entry point on the phone Home header (board Main shows a yellow "Entra").
- Pre-existing: Vercel status "scd-superapp" fails on this branch (not used by staging; Render is the staging host).
