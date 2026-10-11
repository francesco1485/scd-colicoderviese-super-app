# Release 2 — App madre · progress log

Nightly build agent log for branch `staging/superapp`, app `apps/superapp`.
Visual source of truth: Visual Master VR-022 (`docs/design/visual-master/`, approved by Francesco on 2026-10-11).
One backlog item per night, finished to a verifiable boundary. Status: `done`, `in-progress`, `blocked`, `todo`.

| # | Item | Status | Commit | Date |
|---|------|--------|--------|------|
| 1 | Foundations: tokens, area registry, interior shell, public chrome | done | see 2026-10-11 entry | 2026-10-11 |
| 2 | Access: "Accesso alle aree" menu + one access screen per area path | done | 446e1e4 | 2026-10-11 |
| 3 | Field rotation → `/gestionale/impianti` (+ colico, dervio, simulazione, nuova, approvazioni) | done | 191ed97, bf401a4 | 2026-10-11 |
| 4 | `/quadro` and `/gestionale` read-only | done | 8ba2516 | 2026-10-11 |
| 5 | Public: `/oggi`, match live page, LED sponsor, Sky Club, Foto | todo | | |
| 6 | Work areas read-only with honest empty states | done | 678d4e3 | 2026-10-11 |
| 7 | Gioca "in arrivo" teaser | todo | | |
| 2b | Facility map `/impianti` + `/gestionale/mappa` | done | 06da5f2 | 2026-10-11 |
| 5a | Public hall (chi siamo, squadre, official results links, contatti) | done | 8ffd491 | 2026-10-11 |
| 8 | Impianti follow-ups from benchmark: one request for pitch+rooms+lights, state history (who/when), day view prenotato/disponibile/rilasciato, quadro trainings in pitch capacity check | todo | | |

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

## 2026-10-11 · Daytime parallel build (integrator session) · items 2, 3, 4, 6 and facility map · done

Built in parallel branches and merged into `staging/superapp` after build + vitest (309) + test:manifest + test:claude-hooks:
- item 2 access screens (`feat/r2-access`), item 4 quadro/gestionale (`feat/r2-quadro-gestionale`), facility map (`feat/r2-facility-map`), item 3 impianti e campi with deep links, booking hand-off and Direzione approvals (`feat/r2-rotation`), item 6 work areas (`feat/r2-work-areas`).
- Staging env: `SCD_STAGING_PREVIEW=1` set on the Render staging service (preview banner, never in production). `SCD_BOOKINGS_CSV_URL` not set yet (waits for the published CSV link of "17 - PRENOTAZIONI IMPIANTI 2026-27").
- Authorised positions for impianti: presidente, direttore-generale, responsabile-attivita-base, coordinatore-attivita-sportiva (approvals: first two), decided by Francesco 2026-10-11, mapped to manifest roles DIRECTION/MANAGER.
- Facts verified on 2026-10-11: Colico campo 2 synthetic 96x48 (master 16 - SEDI E IMPIANTI); first team in Promozione Lombardia girone D, Juniores Regionale U19 Élite girone C (gare.lnd.it).

## 2026-10-11 · Organigramma e 3° livello SGS (UD-024) · done on staging

- `config/sgs-quality-system.v1.json`: public rules of C.U. n.18 SGS / Manuale Sistema di Qualità 2026 (read in full on 2026-10-11): deadlines, roles and criteria with obligation per level 1-5 (tables pp. 18, 23, 25, 28, 41 read from the coloured legend), coaching rules, minimum players, score table and thresholds 30/60/100/140/180, mandatory SGS events, qualifying projects. Registered as manifest source `SGS_QUALITY_MANUAL_2026`.
- `src/lib/sgs-quality.ts` (+18 tests): obligations per level, deadlines with days left, gap rows, team-by-team coaching check with "Non Classificato" risk, organizational score (best item per group), strict parser of the private status.
- `/gestionale/organigramma` (registry child of gestionale; positions PROPOSED as for impianti, to be confirmed): level selector, roles, teams and coaches, other criteria, deadlines (first on phone), score, events and qualifying projects, sources. Gate via `getWorkAreaGate`; the private club status comes only from server env `SCD_SGS_STATUS_JSON` (statuses, qualification codes, counts; no names) and is never returned for a closed area (+3 tests).
- Drive: bozza "3° LIVELLO SGS 2026-27 - COSA MANCA ENTRO IL 31-10" in 02_BOZZA_PRONTA with names (private). Calendar: [BOZZA PRONTA] 12/10, [SCADENZA] 31/10, 31/12, 10/05.
- QA: build, vitest 339, test:manifest, test:claude-hooks; Playwright 1440 and 390, no horizontal scroll, no console errors.
- Open: Dichiarazione di Impegno 2026/27 status unknown; coach qualifications to verify on Portale Servizi; player counts per category; CR Lombardia may set earlier deadlines.

## Persone: ciclo di vita e ascensore (UD-054) · 2026-10-11

Decisione Direzione 2026-10-11: il gestionale persone si costruisce sul progetto Supabase SCD esistente;
chi esce resta nello storico e sparisce dalle viste.

Migrazione `supabase/migrations/20261011_r59_people_lifecycle_and_consents.sql`:
- `scd_people`: stati ACTIVE / PENDING / LEFT / ARCHIVED, `left_at`, `left_reason`, `display_name`, provenienza;
- `scd_structure_roles`: ruoli di struttura con le etichette del club, squadra/area, omino sì/no, contatti (mai pubblici);
- `scd_person_events`: storico append-only (ENTRATA, USCITA, TRASFERIMENTO, PRESTITO, RIENTRO, CAMBIO_SQUADRA, CAMBIO_RUOLO, NOTA) con autore;
- `scd_person_consents`: consensi del modulo (immagini, promozionali, pulmino, uscita autonoma, avatar, foto partita) con tutore e versione informativa;
- viste `scd_v_people_active`, `scd_v_structure_active`, `scd_v_structure_public` (senza minori né contatti);
- funzione `scd_person_mark_left(...)`: solo DIRECTION/SECRETARIAT; chiude ruoli e appartenenze, scrive storico e audit; rifiuta la doppia uscita.

Verifica locale (PostgreSQL 16, tutte le migrazioni r33→r59 applicate in ordine su database vuoto):
tifoso non può scrivere né segnare uscite; Direttore segna uscita → stato LEFT con data e motivo, 0 in vista attiva e pubblica,
1 riga di storico con autore, 1 riga di audit; lo storico non si cancella; seconda uscita rifiutata.

Non ancora applicata sul progetto Supabase reale: il connettore Supabase di questa sessione non ha il permesso di
leggere o migrare il progetto. Applicazione dal pannello Supabase (SQL editor) o dopo concessione del permesso.

## Ascensore: accesso e pagina Persone (UD-054, UD-056) · 2026-10-11 pomeriggio

Codice su staging (`adabffd`, `3e728c4`, `1232b5e`):
- `/accedi`: magic link via e-mail (Supabase Auth, `shouldCreateUser: false`, sessione in cookie httpOnly); `/accedi/conferma` scambia il codice e atterra per ruolo (`session.ts landingFor`: Direzione → /direzione, autisti → /pulmini, famiglie → /famiglia …);
- ruoli: `scd_my_context()` → posizioni del registro (`ROLE_POSITIONS` + `scope.positions`); `workAreaView` apre le aree con sessione verificata, Direzione tutte, aree senza ruoli solo a posizioni di staff; il flag R20 non blocca più;
- menu "Accesso aree": riga sessione (e-mail e badge, oppure "Accedi con la tua e-mail"); schermate d'area: CTA verso `/accedi?next=…`;
- `/segreteria/persone` (area `persone`, ruoli direzione/segreteria): elenco con ricerca e filtri, contatori, scheda con ruoli/consensi/storico, **Inserisci** (scd_people + ENTRATA + ruolo o atleta), **Segna uscito/a** (rpc `scd_person_mark_left`). Letture con la sessione dell'utente: la RLS del database vale sempre.
- `config/scd-prompt-library.v1.json`: 14 modelli commerciali/gestionali forniti dalla Direzione (UD-056), conservati per questo e i prossimi progetti.

Test: vitest 399 verdi, `test:manifest`, `test:claude-hooks`. Build node + smoke locale (accesso non configurato, preview staging).

Attivazione (manuale, Direzione): `apps/superapp/docs/ELEVATOR_ACTIVATION.md` + `supabase/setup/elevator_activation.sql`.
Bloccante: il connettore Supabase della chat vede zero progetti (account diverso dal proprietario di `ndevtxxijbcnskgysdit`).
