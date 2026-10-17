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
| 8 | Impianti follow-ups from benchmark: one request for pitch+rooms+lights, state history (who/when), day view prenotato/disponibile/rilasciato, quadro trainings in pitch capacity check | done | see item 8 entry | 2026-10-14 |
| L1 | Launch performance: Lighthouse mobile/desktop on /, /guida, /accedi, /calendario, /squadre; fixes; `docs/LAUNCH_QUALITY.md` | done | see L1 entry | 2026-10-12 |
| L4 | Presentation screenshots 390×844 / 1440×900 of the main flows, fixture data only, `docs/presentation/` | done | see L4 entry | 2026-10-13 |

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

## Home telefono/tablet rifatta sulla tavola VR-010 · 2026-10-11 pomeriggio

Base: tavola `SCD_HOME_PUBBLICA_ORIGINALE_2026_27.png` (Drive, VR-010, CRITICAL) + schemi collaudati delle app sportive
più usate (FotMob: striscia giorni con "Oggi", righe compatte, tocco → dettaglio; app di squadra tipo Spond/TeamSnap:
prossimi impegni e "ci sarò" in primo piano). Desktop invariato.
- `src/components/universe/HomeMobile.tsx`: header stemma + nome, foto Lario con "Questa settimana" e Sky in divisa ATV scontornata,
  4 azioni rapide, scheda gara con stemmi "vs" (avversario solo da DB club, altrimenti iniziali), tutte le gare dello stesso giorno,
  meteo, Mappa, Biglietteria, Ci sarò; gare della settimana; Allenamenti / Entra nella SCD; sponsor in sezione; avatar; porte del club.
- Biglietteria: `config/scd-ticketing.v1.json` CONFIRMED dalla tavola ufficiale (Promozione 10/5 €, Juniores Élite e U16 Élite 7/4 €,
  bambini fino a 12 anni gratis, altri campionati gratis, tesserati + 1 accompagnatore gratis in campionato, coppa/play off: tesserato gratis).
- Fascia sponsor fissa nascosta solo sulla home telefono (gli sponsor sono già in sezione).

## Ascensore attivo e anagrafica importata · 2026-10-11 sera

- `VERIFIED` accesso Direzione su staging (magic link, sessione 14:22 UTC, atterraggio `/direzione`).
- `VERIFIED` r60 (`supabase/migrations/20261011_r60_people_read_minimisation.sql`): letture persone/atleti/rose/famiglie
  solo per DIRECTION/SECRETARIAT/REGISTRATION; gli altri membri vedono solo lo staff maggiorenne con ruolo attivo.
- `VERIFIED` import da `TESSERATI_MASTER_2026_27` (provenance `source_id` + `source_record_id` = CODICE PERSONA, evento NOTA per riga):
  stagione 2026-27, 10 squadre, 363 persone (268 attive, 61 in attesa, resto archiviate), 315 atleti (stato tesseramento UNVERIFIED),
  221 iscrizioni a rosa, 246 minori con 0 codici fiscali/e-mail/telefoni salvati, 6 persone senza data di nascita.
- `VERIFIED` simulazione permessi: Direzione 363/315/221, utente autenticato estraneo 0/0/0, anonimo 0/0/0.
- Dato mancante nel master: scadenze certificati medici (0 date valide) → promemoria certificati non attivi.
- Nota: la U18 (ritirata) ha 9 iscrizioni a rosa provenienti dal master; da confermare con la segreteria.
- Aperti: r61 (accesso per squadra mister/dirigenti, famiglia propria), revoca grant di tabella ad anon (oggi protetto dall'RLS),
  account personali Direzione/Segreteria, r56 e r57_1.

## r61: rosa per il mister, famiglia propria · 2026-10-11 sera

- `VERIFIED` r61 applicata (`supabase/migrations/20261011_r61_team_and_family_scoped_access.sql`), approvata dalla Direzione ("Si r61").
  - collegamento utente↔persona in `scd_identity_links` (stessa definizione di r56, nessun duplicato), solo link verificati;
  - squadre del mister/dirigente dai ruoli attivi dell'organigramma importato dal master (nessun registro parallelo);
  - `scd_my_team_roster` e `scd_my_family`: solo nome, anno di nascita, squadra, tesseramento, scadenza certificato;
  - `scd_link_person`: solo Direzione/Segreteria collegano un accesso esistente a una scheda persona.
- `VERIFIED` prova in transazione annullata: Direzione 222 righe; mister di prova 28 = rosa attesa, 1 squadra su 1, nessun accesso alle tabelle atleti;
  mister non può collegare persone; genitore di prova vede sé e il figlio (minore, squadra corretta), 0 righe di rosa;
  utente senza collegamento 0/0; anonimo non può chiamare le funzioni. Nessun dato di prova rimasto.
- App: `src/lib/roster.ts` (+ test), `src/lib/roster.functions.ts`; `/gestionale/mister` mostra la rosa vera della propria squadra
  (riepilogo tesseramenti e certificati), altrimenti spiega perché non la vede.
- Nota: un nuovo utente riceve in automatico l'iscrizione USER_BASE (trigger esistente) e quindi vede l'elenco dello staff maggiorenne.
- Aperti: famiglie vuote (il master non contiene i genitori) → pagina Famiglia con dati veri quando esiste la fonte dei legami famiglia.

## Primo mister, coordinatore, modulo iscrizioni · 2026-10-11 sera (UD-060, UD-061)

- `VERIFIED` accesso creato per il mister pilota (e-mail dall'organigramma), collegato alla sua scheda: vede 2015 e U15 (U18 ritirata non in calendario).
- `VERIFIED` r61_1 (`20261011_r61_1_sports_coordinator_scope.sql`): il ruolo RESPONSABILE area `coordinamento-sportivo` vede tutte le squadre;
  ruolo "Coordinatore Attività Sportive" assegnato al mister pilota con fonte `USER_COMMAND_2026_10_11` → ora vede 10 squadre, 221 ragazzi.
- `VERIFIED` modulo iscrizioni (fonte `ISCRIZIONI_ATLETI_2026_27`, registrata nel manifest 3.27.6): 27 moduli, tutti Prima Squadra; 26 abbinati
  su nome + data di nascita, 1 no (data diversa dal tabulato FIGC). Importate 23 scadenze certificato (solo dove vuote) e 2 famiglie (4 genitori:
  nome, e-mail, parentela). Nessun CF, IBAN, documento, indirizzo.
- Certificati Prima Squadra secondo il modulo: 13 scaduti, 1 in scadenza entro 30 giorni, 8 validi, 5 senza data → da verificare in segreteria.
- Registrata anche la fonte `TESSERATI_MASTER_2026_27` (già usata per l'import del pomeriggio).
- Convocazioni (UD-062): `scd_match_callups` (r53) esiste con regola di idoneità (certificato valido alla data gara + tesseramento FIGC approvato).
  Oggi 0 gare e 0 tesseramenti nel database. Prova sul tabulato FIGC del 09/10 (foglio del master): 138/159 abbinati con impronte, 7 ambigui
  (doppioni nel master), 14 non abbinati, 1 in prestito. Import tesseramenti in attesa di approvazione Direzione.

## Tesseramenti FIGC e convocazioni "Ci sarò" · 2026-10-11 sera (UD-062)

- `VERIFIED` approvato dalla Direzione: 137 tesseramenti `APPROVATO_FIGC` da tabulato FIGC 09/10 (foglio `FIGC_09OTT_2026_UFFICIALI`
  di `TESSERATI_SHEET`), abbinati con impronta nome + data di nascita, matricola come riferimento, nessun CF. Escluso 1 in prestito.
  137 atleti passano a "Tesserato". 22 casi (7 doppioni nel master, 14 non abbinati, 1 prestito) in un elenco per la segreteria.
- Manifest: `TESSERATI_MASTER_2026_27` era un doppione di `TESSERATI_SHEET` → unito; registrata `MASTER_CALENDARIO_2026_27` (calendario già usato dall'app).
- `VERIFIED` r62 (`20261011_r62_callups_ci_saro.sql`): gara creata solo quando il mister convoca (id evento del calendario come riferimento),
  invio convocazioni con esito per ragazzo (regola r53: certificato valido il giorno gara + tesseramento FIGC), vista staff, vista famiglia,
  risposta "Ci sarò / Non ci sarò" solo da atleta o genitore collegato, prima del calcio d'inizio.
  Prova in transazione annullata sulla prossima gara della Prima: 4 convocati, 1 bloccato per certificato; genitore vede convocazione con ritrovo,
  risponde, il mister vede "Ci sarà"; genitore non può convocare né rispondere per altri; risposte non valide rifiutate. Nessun dato rimasto.
- `PENDING` r62_1 (ritiro convocazione): contiene DELETE, lo strumento chiede conferma esplicita → da applicare con conferma Direzione.
- App: `src/lib/callups.ts` (+ test), `src/lib/callups.functions.ts`, `src/components/scd/CallupPanel.tsx` nella pagina Mister,
  `/famiglia` diventa la pagina vera per chi è entrato (convocazioni con "Ci sarò", ragazzi collegati); chi non è entrato vede la schermata di accesso.
- Visual QA telefono 390px su pagina di prova con nomi fittizi (rimossa): corretti 2 difetti (spunte perse durante il caricamento e dopo invio fallito).

## Tutti online: famiglie, atleti, staff · 2026-10-11 sera ("Devi lavorare per mettere on line tutti")

- `VERIFIED` famiglie dal foglio ATLETI di `TESSERATI_SHEET`, collegate per CODICE TESSERAMENTO (nessun abbinamento per nome):
  188 famiglie nuove (190 totali), 264 genitori/referenti (solo nome, e-mail, parentela GENITORE/REFERENTE), 209 ragazzi collegati;
  minorenni raggiungibili 210/213; 60 e-mail di atleti maggiorenni salvate sulla loro scheda. Scartata 1 e-mail con dominio errato.
- `VERIFIED` accessi: 355 utenti (una per e-mail), collegamento `AUTO_VERIFIED / IMPORT_CANONICAL` alle schede con quella e-mail.
  Ruoli: 260 FAMILY, 51 ATHLETE, 24 MANAGER, 11 STAFF, 8 MISTER, 1 DIRECTION. Ruoli d'ufficio (Presidente, VP, Consigliere,
  DG, DS, Segreteria) lasciati a STAFF in attesa di conferma Direzione. Nessuna e-mail inviata: si entra chiedendo il link su /accedi.
- `VERIFIED` r63/r63_1: chiusa la lettura di contatti staff e tesseramenti da parte di tutti i membri (vedi migrazioni).
  Prova per profilo: famiglia 2 persone (sé + figlio), atleta 1, mister/dirigente rosa della propria squadra + elenco staff,
  nessun contatto altrui; Direzione tutto.
- App: l'atleta maggiorenne atterra su /famiglia ("Le mie convocazioni").
- `VERIFIED` ruoli d'ufficio approvati dalla Direzione ("Come proposto"): Presidente, VP, Consigliere, DG, DS → DIRECTION (4 accessi);
  Segreteria, Segreteria remoto → SECRETARIAT (2 accessi). Messa online: prima gruppo pilota sullo staging, poi pubblicazione per tutti.

## Registrazione con autorizzazione della segreteria · 2026-10-11 sera (UD-063)

- `VERIFIED` r64 (`20261011_r64_access_requests.sql`): coda `scd_access_requests` (solo uffici), `scd_request_access` pubblica
  (consenso obbligatorio, sotto 14 anni rifiutata, 14-17 segnalata, limite globale orario, nessuna rivelazione di account esistenti),
  `scd_access_request_matches` (stessa e-mail / nome + data di nascita / nome), `scd_approve_access_request` (collega o crea la scheda,
  crea l'accesso, ruolo FAMILY/ATHLETE/MISTER/MANAGER/STAFF, per un genitore collega la famiglia del figlio), `scd_reject_access_request`.
  Prova in transazione annullata: tutti i casi come previsto; il genitore autorizzato vede il figlio. Nessun dato rimasto.
- App: `/registrati` (5 campi + consenso, honeypot, limite per IP), link da `/accedi`, coda "Richieste di accesso" in
  `/segreteria/persone` con finestra di verifica (corrispondenze, ruolo, figlio, nota). Visual QA telefono 390px.

## Accessi e permessi su misura · 2026-10-11 sera (UD-064)

- `VERIFIED` r65 (`20261011_r65_access_admin.sql`): `scd_access_audit`, guardia unica `scd_access_admin_guard`, `scd_admin_accounts`,
  `scd_admin_set_access` (ruolo + aree `scope.positions` + sospensione), `scd_admin_grant_person_access`, `scd_admin_revoke_link`
  (stato REVOKED, mai cancellato), `scd_admin_audit`; trigger che registra anche autorizzazioni/rifiuti delle richieste r64.
  Prova in transazione annullata: Direzione gestisce tutti tranne sé; Segreteria non dà ruoli/aree d'ufficio né tocca account d'ufficio;
  posizione sconosciuta rifiutata; utente sospeso perde ogni ruolo (scd_my_context vuoto); collegamento revocato non vede più la persona;
  famiglia e anonimo 0 righe; storico completo.
- App: area registro `accessi` (`/direzione/accessi`): elenco con ricerca/filtri, scheda accesso (persone collegate con Revoca, ruolo,
  aree in più per gruppi, sospensione, motivo), "Dai accesso" a una persona, regole, storico. `/direzione` diventa la pagina di partenza
  della Direzione (scorciatoie + richieste in attesa). Testata aree: opzione `editable` (niente "Sola lettura" dove si scrive: Accessi,
  Persone, Mister con rosa). Link "Accessi" in Segreteria. Test: elenco aree assegnabili identico tra app e SQL.
- `VERIFIED` r65_1 (`20261011_r65_1_team_scope.sql`): squadre assegnate a mano (`scope.teams`) e area "coordinatore attività sportiva"
  entrano nel perimetro di rosa e convocazioni (`scd_my_team_ids`); `scd_admin_account_teams`, `scd_admin_set_teams` (con storico).
  Prova annullata: utente senza ruoli in organigramma 0 → U15 + 2015 dopo l'assegnazione; con l'area coordinatore 10 squadre;
  squadra inesistente rifiutata. Scheda accesso: "Squadre in più". Visual QA telefono.

## Registro certificati medici · 2026-10-11 sera (UD-065)

- `VERIFIED` r66 (`20261011_r66_certificate_register.sql`): la data resta solo in `scd_athletes.medical_certificate_expires_at`;
  nuove colonne di provenienza `medical_certificate_status` (DECLARED dal modulo d'iscrizione, VERIFIED se la segreteria ha visto il
  cartaceo), `medical_certificate_kind` (agonistico / non agonistico), `medical_certificate_checked_at/_by`. Le 22 date della Prima
  prese dal modulo diventano DECLARED. `scd_certificate_register` (lettura ufficio, niente recapiti) e `scd_set_certificate`
  (solo Direzione/Segreteria, finestra da 3 anni fa a 2 anni avanti, storico in `scd_audit_events`).
  Prova in transazione annullata: Direzione scrive e lo storico registra prima/dopo; Mister 0 righe e scrittura rifiutata;
  anonimo senza permesso di esecuzione.
- App: area registro `certificati` (`/segreteria/certificati`): filtri Da fare / Scaduti / Senza data / In scadenza / Da controllare,
  avanzamento per squadra ("possono giocare oggi"), inserimento in riga con data, tipo e "Ho visto il certificato"; dopo il
  salvataggio si apre l'atleta successivo. Link "Certificati" in Segreteria. Visual QA telefono e desktop con dati di prova
  (nessun nome reale), nessuno scorrimento orizzontale.
- Stato reale al 11/10: settore giovanile 0 date su 194 atleti; Prima 22 su 27 (13 scadute). Le convocazioni dei ragazzi
  restano bloccate finché la segreteria non inserisce le date.

## Notifiche sul telefono per le convocazioni · 2026-10-11 sera (UD-066)

- `VERIFIED` r67 (`20261011_r67_callup_push.sql`): `scd_push_subscriptions` (RLS attivo senza policy: nessun accesso diretto da
  app o browser), `scd_push_subscribe` / `scd_push_unsubscribe` (disattiva, non cancella) / `scd_push_my_devices` per il proprio
  telefono; `scd_push_callup_targets` e `scd_push_mark_sent` solo per il ruolo di servizio; `scd_match_callups.notified_at` = un
  avviso per convocazione. Destinatari = account verificati dell'atleta o dei genitori/tutori della sua famiglia.
  Prova annullata: convocazione di prova U15 → 1 telefono del genitore trovato; permessi: anonimo e utenti non leggono iscrizioni
  né chiavi.
- `VERIFIED` r67_1 (`20261011_r67_1_push_keys_in_vault.sql`): le chiavi VAPID nascono dentro la funzione e stanno solo in
  Supabase Vault; l'app legge solo la chiave pubblica. Nessuna chiave nel repository, su Render o in chat.
- Edge function `callup-push` (verify_jwt): verifica l'utente e che possa gestire la squadra della gara, invia, segna gli avvisi,
  disattiva i telefoni non più validi (404/410).
- App: card "Ricevi le convocazioni sul telefono" in `/famiglia` (stati: iPhone da aggiungere alla Home, attiva, bloccate, non
  supportato); worker separato `/push-sw.js` (scope `/push/`, nessuna cache, apre `/famiglia` al tocco). Dopo "Invia
  convocazione" il mister vede quanti avvisi sono partiti. Visual QA telefono (Android e iPhone simulati).
- Da verificare su telefono vero: il primo invio reale (serve una gara nel calendario e una famiglia che abbia attivato).

## Togliere un ragazzo da una convocazione · 2026-10-11 sera (UD-067)

- `VERIFIED` r68 (`20261011_r68_callup_withdraw.sql`, sostituisce r62_1 mai applicata): `scd_match_callups.withdrawn_at/_by`;
  `scd_staff_withdraw_callups` (staff della squadra, prima dell'inizio, nessuna riga cancellata). Le convocazioni ritirate spariscono
  da vista mister, pagina famiglia, risposte e notifiche; riconvocando, la risposta torna "in attesa" e la notifica riparte.
  Prova annullata: convoca → famiglia "Ci sarò" → la famiglia non può ritirare → il mister ritira → 0 righe per mister e famiglia,
  risposta rifiutata → riconvoca → PENDING.
- App: nel pannello convocazione basta togliere la spunta a un convocato ("Da togliere") e premere il pulsante, che dice cosa
  succede ("Invia convocazione (2) · togli 1" / "Togli 1 dalla convocazione"). Visual QA telefono.
- Correzione: in chat il tasto era stato descritto come "la famiglia annulla Ci sarò"; le famiglie potevano già cambiare risposta.

## Convocazione da più annate · 2026-10-11 sera (UD-068)

- Regola della Direzione: la convocazione non è la distinta. Il mister convoca 1-2 giorni prima chi vuole, anche da altre annate
  che può convocare; tutti i convocati si presentano; la distinta (chi scende in campo) si fa alla gara.
- `VERIFIED` r69 (`20261011_r69_callup_multi_annata.sql`): `scd_staff_send_callups` accetta atleti di tutte le squadre del
  perimetro di chi convoca (`scd_my_team_ids`), non solo della squadra della gara. Certificato e tesseramento restano obbligatori.
  Prova annullata: Direzione convoca un 2015 nella gara U15 → SENT; staff della Prima senza il 2015 nel perimetro → NOT_IN_TEAM.
- App: nel pannello convocazione, sotto la rosa, la sezione "Da altre annate" (chiusa, si apre da sola se ci sono già convocati
  da lì) con i ragazzi delle altre squadre del mister, raggruppati per squadra. Visual QA telefono.
- Distinta: da decidere con la Direzione (in app o portale FIGC).

## Pre-distinta dalla convocazione · 2026-10-11 sera (UD-069)

- Decisione della Direzione: pre-distinta nell'app, formato FIGC/LND. Verificato che per Allievi e Giovanissimi il CRL Lombardia
  obbliga la "lista di presentazione" sul portale LND: l'app prepara, il dirigente ricopia (niente doppione del portale).
- Fonti: LND CRL Lombardia, Regolamento competizioni dilettantistiche 26-27 (art. 19.1 capitano e vice tra i titolari, art. 26.2
  max 9 riserve); CRL Lombardia, Regolamenti SGS Campionato (art. 6 max 20 in lista, 7 sostituzioni; art. 19-20 portieri 1/12/22).
- `VERIFIED` r70 (`20261011_r70_match_sheet_draft.sql`): `scd_match_sheets`, regole per squadra, candidati in panchina (staff della
  squadra + dirigenti di società), lettura e salvataggio con tutti i controlli e storico. Prova annullata: troppi titolari, maglie
  doppie, non convocato, capitano in riserva, persona fuori staff, "pronta" senza dirigente o senza capitano → rifiutati; bozza e
  pronta salvate; dopo il ritiro di un convocato in lista il nuovo salvataggio è rifiutato finché non lo si toglie.
- App: card "Distinta" nella pagina Mister: spunta tra i convocati, numero (proposto quello dell'ultima gara), titolare/riserva,
  C/VC, panchina, "Salva bozza" / "Segna pronta", testo da copiare e stampa con colonna tessera/documento vuota da verificare sul
  portale. Visual QA telefono.

## Preparazione al lancio: controllo indipendente e correzioni · 2026-10-12 (UD-070)

- Controllo indipendente (agente separato, sola lettura): build, test, link e pagine ok; 5 blocchi e 6 punti alti trovati.
- `VERIFIED` corretti nel codice: pagine private e funzioni server `no-store`; copia offline solo per le pagine pubbliche e cancellata
  all'uscita; intestazioni di sicurezza (HSTS, frame-ancestors, nosniff, referrer, permissions); `/healthz`, `robots.txt`
  (staging escluso), `sitemap.xml` in produzione; link di accesso da `SCD_SITE_URL`; risposta di "Accedi" uguale per e-mail
  registrate e non; `/core` e `/grow` portano alle pagine vere in produzione; vecchie funzioni PIN chiuse lato server;
  anteprima staging solo dietro il gateway (`SCD_STAGING_GATEWAY`, prova: senza gateway niente anteprima); moduli pubblici
  sospesi con contatti ufficiali (nulla viene inviato, safeguarding solo PEC con oggetto riservato); pagina `/privacy`
  (stato bozza) collegata da registrazione, banner e piè di pagina; banner cookie veritiero (solo cookie tecnici);
  limitatore registrazioni sull'IP del proxy.
- `VERIFIED` r71 (`20261012_r71_launch_hardening.sql`): una seconda richiesta di accesso per la stessa e-mail non sovrascrive
  quella in attesa; anon senza alcun privilegio sulle tabelle (prova: 0 tabelle leggibili, registrazione funzionante).
- Pronti per la Direzione: `docs/EMAIL_GMAIL_SMTP.md` (Gmail della società) con testi italiani in
  `supabase/setup/email-templates/`, `docs/PRODUCTION_LAUNCH.md` con le decisioni aperte.
- App: pagina pubblica `/guida` "Come funziona l'app" (famiglie, mister, segreteria), collegata da Accedi e dal piè di pagina.

## UD-071 — Indirizzo fisso, pagina /installa, icone store (2026-10-12)
- Stato: DONE su staging/superapp.
- Decisione: indirizzo definitivo app.colicoderviese.it (passi DNS e store in `docs/DOMINIO_E_STORE.md`).
- Fatto: icone dallo stemma ufficiale (192/512/maskable/apple-touch/favicon; rimosso lo stemma non ufficiale "SDC"), manifest aggiornato, pagina pubblica `/installa` con QR e condivisione, link in footer e guida, route `/.well-known/assetlinks.json` (attiva solo con SCD_ANDROID_PACKAGE + SCD_ANDROID_SHA256), test (manifest icone, assetlinks, install-link).

## r72 — Segreteria: conferma tesseramento e assegnazione squadra (2026-10-12)
- Stato: DONE su staging/superapp. Migrazione `20261012_r72_team_assignment.sql` applicata a SCD PULSE (+ r72.1 spostamento nello stesso giorno), provata in transazione annullata come Direzione.
- Dato reale: i 94 "senza squadra" sono 61 persone PENDING (tesseramento in corso) + 33 ARCHIVED; tutti gli atleti attivi hanno squadra.
- App: squadre degli atleti ora lette da scd_team_memberships e mostrate in elenco e scheda; filtro "Senza squadra"; contatore "atleti da assegnare"; azione "Conferma e assegna" / "Cambia o aggiungi" (sposta = chiude la precedente, aggiungi = più annate); spunta "ho verificato il tesseramento FIGC"; tutto nello storico e in audit.

## L1 — Prestazioni per il lancio (Lighthouse) · 2026-10-12
- Stato: DONE su staging/superapp. Numeri prima/dopo (mediana di 3, mobile e desktop, build di produzione con compressione
  come Render) in `docs/LAUNCH_QUALITY.md`.
- Fatto: font self-hosted (`@fontsource`, stesse famiglie e pesi; niente più Google Fonts né IP verso Google; il blocco
  "Design tokens" sopra che cita Google Fonts è superato); bundle principale 578 → 348 KB (planimetria Dervio, istantanea
  impianti e regole SGS fuori dal codice comune); stemma ufficiale in WebP senza perdita (pixel identici, 69 → 35 KB,
  registrato in `config/scd-assets.v1.json`); cache browser 1 giorno per `/media` e icone; letture pubbliche R20 in cache
  60 s (errori 15 s) con richieste condivise — home da 1,2–2,8 s a ~0,07 s al primo byte.
- Test: `launch-performance.test.ts`, `public-read-cache.test.ts`, `section-ids.test.ts`; test SGS spostato su `sgs-quality.data.ts`.
- Aperto: CLS mobile /calendario 0.092 e /squadre 0.062 (sotto 0.1) per lo scambio di carattere; idratazione della home;
  loghi categoria PNG da 330 KB; HDI scaduto ancora nel nastro sponsor (decisione Direzione).

## 2026-10-12 — UD-073 home look restored (SCD Universe on every screen)
- Direzione rejected the phone home with the Sky hero and stacked bars: "era migliore quella di prima".
- The phone/tablet fork (HomeMobile.tsx, da79f09/bec299b) is removed; the SCD Universe page (crest, wordmark, ticket, fixtures) is the single responsive home again. Sky stays a side helper (SkyCameo) only.
- Checks: tsc, build, vitest 467, test:manifest, test:claude-hooks.

## 2026-10-12 — r73 Scrivania del giorno (Segreteria)
- `scd_secretariat_desk(org)` (applied on SCD PULSE) returns the day's queue as counts only; `/segreteria` opens on "Scrivania del giorno": each line links to Persone (pre-filtered `?squadra=nessuna`, `?stato=pending`), Certificati or Accessi. Manifest 3.28.3.
- Real counts verified on staging data (13 expired certificates, 61 people pending, 84 registrations to verify, 354 accounts never signed in). Tests: 472 (5 new).

## 2026-10-12 — r75/r76 Compensi e stipendi (UD-075) + nuove posizioni (UD-076)
- DB (SCD PULSE): r75 tabelle e funzioni `scd_comp_*`, bucket privato `scd-private` (`<org>/comp/`); import di 36 accordi dalla Control Tower 2026/27 (senza IBAN). r76: nuove posizioni assegnabili (tesoreria solo Direzione; lavanderia, pulizia, infermeria, magazzino, tornei, struttura Colico/Dervio, segreteria in presenza/da remoto, dirigente collaboratore).
- App: `/tesoreria/compensi` — mese di competenza con scadenza il 15 del mese dopo, totali, filtri (da sistemare, pronti, da pagare, pagati, bloccati), scheda persona con calcolo fisso + voci − acconti, verifiche IBAN/contratto (solo stato), "usa importo storico", voci con allegato e annullamento motivato, autorizza/blocca (Direzione), segna pagato con data, metodo, CRO e contabile (Tesoreria), documenti apribili con link a 2 minuti, "Elenco bonifici" copiabile senza IBAN.
- Test: compensation.test.ts (9), suite 493; build, tsc, test:manifest, test:claude-hooks.
- Aperto: ogni persona va verificata (IBAN e contratto) dalla Direzione prima di autorizzare; la posizione "tesoreria" va assegnata da /direzione/accessi.

## 2026-10-12 — Impianti: dati ufficiali dai documenti agli atti (UD-077)
- `config/scd-facilities.v1.json`: blocco `technical` per Colico (catasto D/6 f.10 p.21081, tribuna 250 posti, spogliatoi, 6 estintori e piano emergenza 2019, illuminazione e progetti torri, club house 2017, rilievo area retro campi) e Dervio (verbale omologazione LND CRL campo 0865 del 28/09/2024: 97,80 x 50,00 m, 1ª categoria fino al 28/09/2028, 190 posti, spogliatoi e prescrizioni); `official` su SPA-DER-C1 accanto al valore del master (96 x 48, da correggere sul master); `drawing_standard` per piante 2D, mappa e rendering.
- Test facilities aggiornati (indirizzo Dervio verificato, fatti ufficiali con fonte). Suite 494.

## 2026-10-12 — r77 Cervellone in app (UD-077)
- DB: `scd_kb_items` + `scd_kb_search` / `scd_kb_upsert` (applicata su SCD PULSE). Caricamento dal catalogo del Drive: documenti agli atti, indice file, indice posta, economia enti 2026/27, storia, impianti.
- App: `/direzione/cervellone` con ricerca libera, filtri area/stagione/tipo e "Scadenze in vista"; link da /direzione (anche a Compensi). Solo link https verso gli originali.
- Test: knowledge.test.ts; suite 497.

## 2026-10-12 — Quattro porte: lavoro, associazione, tifosi, partner (UD-078)
- `config/superapp-audiences.v1.json`: tifosi e simpatizzanti (senza account), soci/atleti/famiglie (account personale), chi lavora nel club (ruolo dato dalla Direzione), aziende e partner. Ogni compito punta a una pagina esistente; ogni satellite sta in una sola porta.
- App: `/aree` riorganizzata nelle quattro porte con i compiti più usati in evidenza; `/guida` con le sezioni "Tifosi e simpatizzanti" e "Soci e volontari" e i passi Compensi e Cervellone per Segreteria e Direzione.
- Test: audiences.test.ts (contratto, ordine porte, errori rilevati); suite 500.
- Aperto: regola gratuità familiari in biglietteria da confermare (master 06/10 "fino a 2 familiari" contro tavola 11/10 "1 familiare").

## 2026-10-12 — Biglietteria: regola tesserati e familiari confermata (UD-079)
- `config/scd-ticketing.v1.json`: campionato = tesserato + fino a 2 familiari gratis (dal terzo ridotto); coppa, play off e play out = gratis solo il tesserato, pagano tutti gli altri. Tolta la tariffa U18 Élite (squadra ritirata).
- Scheda partita: testo tesserati letto dalla configurazione (`membersShort`), non più scritto nel codice. Test match-extras estesi.

## 2026-10-12 — Pulmini: copia del Master collegata e corse organizzabili dall'app (r74, UD-076)
- `/pulmini` legge la copia del Master Flotta e Trasporti (`getTransportBoard`): "Da sistemare nel Master" (scadenze, posti, targhe, autisti, fermate, utenti, con la scheda del foglio), "Flotta e autisti" con scadenze assicurazione/revisione/bollo e patenti (telefoni solo a Direzione, Segreteria, responsabile trasporti), "Corse organizzate".
- Organizza una corsa: dalla trasferta del weekend ("Organizza" la compila con data, squadra e destinazione) o "Nuova corsa"; pulmino, autista, orari, passeggeri (solo numero), stato, nota; avvisi su doppia prenotazione, disponibilità autista e posti; salvataggio con `scd_transport_plan_run` (controllo ruolo e doppioni nel database, storico con autore). Gli autisti vedono le corse senza poterle modificare.
- Copia automatica: attività programmata "SCD Pulmini · copia del Master" (06:59, 12:59, 18:59) con `tools/sync/pulmini_master_payload.py` e `scd_transport_sync`; scrive solo se il foglio è cambiato e solo dopo i controlli (nessun nome degli utenti, nessun crollo dei conteggi). Copia attuale verificata: 4 mezzi, 6 autisti, 8 regole, 17 fermate, 61 utenti (foglio modificato il 26/09).
- Test: transport.test.ts (+5), TransportDesk.test.tsx (render lato server: coda, scadenze, telefoni, form, vista autista); vitest include anche i test .tsx.

## 2026-10-12 — Tutto nella Super App, un link per area (UD-080) + scadenze del club
- Ogni area di lavoro ha il pulsante "Copia link" (indirizzo della pagina da mandare a chi la usa; cosa vede dipende dal ruolo). Anche su /direzione.
- Scadenze del club dal Cervellone (`ClubDeadlinesCard`): in /segreteria sostituisce il riquadro vuoto "da collegare a R20"; in /direzione accanto alle scorciatoie. Aggiunte al Cervellone le scadenze note: bando RL Area Sportiva Giovani 29/10 ore 12, istanza SUAP Colico 30/10, bando Manifestazioni 5/11, Delegato tutela minori 15/11.
- Test: ClubDeadlines.test.tsx (3).

## 2026-10-12 — Mappa A–Z (progetto) e parte A1: incoerenze corrette
- Mappa unica del progetto salvata nel Project claude.ai (`claude/SCD_MAPPA_A_Z_v1.md`, non nel repo pubblico): sistemi, 18 processi con master, pagina e stato verificato, nodi N1–N5, decisioni, ordine di lavoro.
- `/tesoreria/biglietteria`: mostra le tariffe e le gratuità confermate (UD-079) e le partite in casa con biglietteria dal calendario; tolto "Tariffario da confermare" e il finto "Vendi biglietto" (l'app non vende). `ticketedHomeMatches` in match-extras con test.
- `/segreteria`: la distinta non è più "in R20": il pulsante porta a /gestionale/mister dove si prepara.
- `config/superapp-areas.v1.json`: stato "live" per le aree che funzionano con dati reali in staging; significato degli stati scritto nel registro.
- `PRODUCT.md`: decisioni su indirizzo e login aggiornate; aperti N1 (identità) e N2 (master per dominio).

## L2 — Accessibilità per il lancio (axe-core, bersagli 44 px) · 2026-10-12
- Stato: DONE su staging/superapp. Dettaglio e numeri prima/dopo in `docs/LAUNCH_QUALITY.md` (sezione L2).
- Nuovo `scripts/a11y-audit.mjs`: axe-core (WCAG 2.2 A/AA) + controllo bersagli ≥ 44 px a 390×844 e 1440×900; pagine riservate con
  dati di prova inventati intercettando le funzioni server (nessun database, scritture bloccate). `axe-core` in devDependencies.
- Pagine: /guida, /accedi, /registrati, /privacy, /famiglia, /gestionale/mister, /segreteria/certificati — da 8 violazioni axe e
  ~450 bersagli piccoli a 0 e 0.
- Corretti: `aria-controls` rotto del menu, contrasto "Ci sarò", piè di pagina (altezza link, opacità testi), barra laterale e
  ricerca delle aree interne, "Copia link", fonti, distinta (Titolare/Riserva/C/VC, casella, maglia), filtri certificati.
- Test: `touch-targets.test.ts` (8). Suite 521.
- Aperto: estendere lo script a home, calendario, squadre, impianti.

## L3 — Regola sui formati degli asset · 2026-10-13
- Stato: DONE su staging/superapp (SHA nel commit che aggiunge questa voce). Dettaglio in `docs/LAUNCH_QUALITY.md` (sezione L3).
- `config/scd-assets.v1.json` 1.1.0: `format_policy` (marchi SVG se esiste il vettoriale ufficiale, altrimenti raster con
  RESEARCH_REAL_ASSET; scontornati con alpha; foto WebP/JPG; PDF; icone PNG; originali mai serviti), `runtime_assets` (tutti i
  file serviti da public/ registrati), `vector_research` (stemma, LND/SGS/Monza, sponsor, badge annate), `known_format_debt`
  (5 copie legacy con perdita in `assets/`).
- Nuovo `src/lib/asset-format.ts` + `asset-format.test.ts` (16 test). Suite 611.
- Badge annate: resa 96 px WebP senza perdita servita al posto dei PNG 512 px (asset.json con `derived_from`), ~2,9 MB → ~163 KB;
  originali invariati. Schermate 390×844 e 1440×900 di /allenamenti e /core/impianti-calendari: badge nitidi, nessuno scorrimento orizzontale.
- Aperto (Direzione): stato ufficiale dei badge annate (PENDING_VERIFICATION); file vettoriali ufficiali di stemma e sponsor da recuperare.

## L4 — Schermate per la presentazione ufficiale · 2026-10-13
- Stato: DONE su staging/superapp (SHA nel commit che aggiunge questa voce). Prima cattura il 12/10 (fc5a220, 3b2fc8c) senza voce
  nel registro e senza distinta: completata oggi.
- Nuovo `scripts/presentation-shots.mjs`: 10 flussi × 2 formati (390×844, 1440×900) in `docs/presentation/`, risposta cookie
  "solo tecnici" preimpostata, sezione portata in vista, uscita con errore se un flusso non si apre o scorre in orizzontale.
- Nuove: `mister-distinta-{m,d}`, `mister-convocazione-d`. Ricatturate: home, installa, guida, accedi (ora e-mail + password
  "Ricordami", come a database collegato), calendario, squadre, famiglia ("Presa visione"), mister, certificati.
- Dati di prova spostati in `scripts/lib/private-fixtures.mjs`, condivisi con `scripts/a11y-audit.mjs` (nomi inventati,
  solo adulti, scritture bloccate); aggiunta la sessione "non entrato a database collegato" per /accedi.
- Regressione L2 trovata rifacendo l'audit: 3 bersagli sotto 44 px nel piè di pagina (e-mail della società 17 px, "Eventi"
  39 px, "Privacy" 40 px) → `SiteChrome.tsx` min-h-11/min-w-11, guardia in `touch-targets.test.ts` (9 test). Audit di
  nuovo a 0 violazioni axe e 0 bersagli piccoli. Suite 977.
- Aperto: `installa-*` va ricatturata sul dominio definitivo; `persone-*` restano del 12/10 (nessun dato di prova nello script).

## Item 8 — Impianti e campi: richiesta unica, storico, giornata per campo, Quadro nel controllo · 2026-10-14
- Stato: DONE su staging/superapp (SHA nel commit che aggiunge questa voce).
- Motore puro `src/lib/impianti-planning.ts` (+23 test vitest in `impianti-planning.test.ts`), riusa `rotation.ts`, `bookings-register.ts`, `facilities.ts`:
  - (a) una richiesta = zona di campo + spogliatoi + luci: `Booking.lights`, `lightsAdvice` (luci dalle 17:00, regola proposta già usata per Dervio; omologazione luci registrata solo per Colico campo 1), `requestResources`, `checkRequest` (tutto o niente: campo nelle due settimane, spogliatoi liberi; luci mancanti = avviso). In /gestionale/impianti/nuova: casella «Chiedi anche le luci» e riquadro «Una sola richiesta» con stato di ogni risorsa.
  - (b) storico dello stato chi/quando: nessuna colonna nuova nel master «17 - PRENOTAZIONI IMPIANTI» (colonne nel manifest); lo storico vive nella colonna Note come `Storico: gg/mm/aaaa hh:mm STATO (ruolo); …`, insieme a `Luci: …` e `Respinta: motivo`. La riga copiata per il registro porta la prima voce PROPOSTA; in /approvazioni ogni proposta mostra lo storico e la decisione prepara la Note completa da copiare. Righe senza storico: voci «dedotte» dalla riga, senza data (mai inventata). Ruoli, mai nomi.
  - (c) giornata per campo `pitchDayView` + componente `PitchDayView` (Colico 1, Colico 2, Dervio; 08–23): prenotato (gare, righe CONFERMATA, Quadro della settimana scelta, con quota di campo libera), rilasciato (righe ANNULLATA), disponibile; richieste in attesa e ipotesi elencate ma non bloccano. In /nuova per il giorno della bozza (registro non letto lì, detto in pagina) e in /approvazioni con scelta del giorno e registro quando configurato.
  - (d) allenamenti del Quadro nel controllo capienza: `quadroTrainings` (campo 1 in terzi, campo 2 in metà, unione per zona: nessun doppio conteggio), `checkSlotWithQuadro` controlla settimana A e settimana B (non determinabile) e chiede che stiano in entrambe; etichetta «Allenamento dal Quadro settimanale (settimana …)». Usato in anteprima 2D, scheda per la Direzione e /approvazioni. Quadro assente = «non disponibile», mai «nessun allenamento».
- QA: build, tsc, vitest (tutti verdi), test:manifest, test:claude-hooks; Playwright 390×844 e 1440×900 di /gestionale/impianti/nuova e /approvazioni (build di produzione locale in anteprima staging, dati di prova inventati): nessuno scorrimento orizzontale, nessun errore in console; impeccable detect senza segnalazioni sui file cambiati.
- Note: `vite dev` locale si ferma su un errore preesistente di import-protection (`/fantacalcio` → `supabase.server.ts`), non toccato; la build di produzione è sana.
- Da decidere (Francesco): confermare il formato «Storico:» nella colonna Note del registro (in alternativa una colonna «Storico» da aggiungere al master e al manifest); confermare la regola luci dalle 17:00.


## C4 — Home: «Sostieni il club» dopo la settimana · 2026-10-14
- Stato: DONE su integ/r2-hall → wip/superapp-20261013-otp (non pubblicato).
- `src/lib/home-support.ts` (+4 test): tre azioni fisse che portano soldi al club — Diventa partner (/sponsor, unico evidenziato in giallo), Adotta un seggiolino (/sostieni#seggiolino-title), Dona materiale (/sostieni#campagne-title). La lotteria entra solo quando la Direzione la pubblica (`supportActions({ lotteryPublic })`, oggi false: la pagina resta non collegata come da UD-115). Nessun prezzo, numero o parola gonfiata (test).
- `SupportStrip` in `HomePractical.tsx`: fascia blu notte, un blocco unico; home pubblica subito dopo «Oggi e questa settimana», home soci dopo «Vai subito a». `/sostieni` aggiunto a `vetrinaRepeats` (niente si ripete).
- QA: tsc, vitest 1406, build; Playwright 390×844 e 1440×900 (anteprima staging locale): nessun errore in console, nessuno scorrimento orizzontale, i link aprono le sezioni giuste.
## C3 — Condivisione (og:image, testo, WhatsApp) · 2026-10-14
- Stato: DONE su agent/condividi (SHA nel commit che aggiunge questa voce). Richiesta Direzione 14/10: l'app deve potersi condividere e girare col passaparola.
- Nuovo `src/lib/share.ts`: indirizzo assoluto sempre sul dominio ufficiale (`officialOrigin`, https://app.colicoderviese.it), link WhatsApp `https://wa.me/?text=` (testo + link, nessun SDK, nessun tracciamento), `pageMeta()` per `head()` (title, description, og:type/site_name/locale/title/description/url/image + dimensioni e alt, twitter:card/title/description/image). Registro `SHARE_PAGES` con testo di condivisione breve per pagina; date solo se già in pagina (Christmas Lario Cup 8/12/2026).
- Nuovo `components/scd/ShareButton.tsx`: «Condividi» è un vero link wa.me (funziona anche prima dell'idratazione); con `navigator.share` apre il menu di condivisione del telefono. «Copia link» copia l'indirizzo assoluto; se gli appunti sono bloccati il link compare selezionato in un campo. Bersagli 44 px, stato `aria-live` «Link copiato». `PageHero` e `PublicPageHeader` hanno lo spazio `action` sotto il sottotitolo.
- Pagine: /sponsor, /sostieni, /sostieni/dona-materiale, /sostieni/fondo-solidale, /sostieni/proponi, /eventi/lotteria-dello-sport (Open Graph sempre, `noindex` e niente pulsante finché non è pubblicata), /tornei, /eventi/christmas-lario-cup (il vecchio pulsante che copiava `location.href` è sostituito).
- og:image solo asset ufficiali registrati in `config/scd-assets.v1.json`: stemma su fondo blu del club (`/icon-maskable-512.png`, APP_ICON dallo stemma ufficiale) e, per la Christmas Lario Cup, la locandina ufficiale maschile (EVENT_POSTER). Prima l'og:image era relativo (inutilizzabile da WhatsApp) e mancava su quasi tutte le pagine.
- Test: `share.test.ts` (34: codifica WhatsApp, URL assoluti, meta completi e non vuoti, og:url assoluto, nessun duplicato, immagini esistenti e registrate, ogni route usa `pageMeta` e mostra `ShareButton`), `ShareButton.test.tsx` (3). Suite 1428 + 11 saltati.
- QA: tsc, build, vitest, test:manifest, test:claude-hooks verdi. Build di produzione locale: `<head>` delle 8 pagine stampato (og:url e og:image assoluti, nessun tag og/twitter duplicato dal root); Playwright 390×844 e 1440×900 di /sostieni, /eventi/christmas-lario-cup, /tornei in `/tmp/claude-0/qa/condividi/`: nessuno scorrimento orizzontale, nessun errore in console, «Copia link» → «Link copiato» con l'indirizzo ufficiale negli appunti.
- Aperto: un'immagine 1200×630 dedicata (stemma + foto del centro sportivo) darebbe anteprime più grandi su WhatsApp/Facebook, da approvare dalla Direzione prima di crearla; la verifica dell'anteprima reale va fatta sul dominio pubblicato.
## C2 — Adotta un seggiolino (tribuna) · 2026-10-14
- Stato: DONE su `agent/seggiolino` (da `integ/r2-hall`; non spinto, nessun deploy). UD-113 «oggetti divisibili in unità (posti di una tribuna, targhetta numerata)».
- Dove: /sostieni, parte Adotta, sezione «Adotta un seggiolino · Un posto, una targhetta» prima del catalogo. Nessun catalogo parallelo: la tribuna è l'oggetto del catalogo r101 esistente (categoria «Tribuna e impianto», 60 unità numerate, `findTribuneItem`) e viene tolta dalla griglia generale solo per non mostrarla due volte. Il CTA «Adotta un seggiolino» / «Adotta il posto N» apre il `PledgeDialog` esistente con il posto già scelto (nessun pagamento; la Tesoreria conferma e rilascia la ricevuta).
- Modalità attuale (r101 non applicata): 60 posti liberi, «0 di 60 posti adottati», il dialogo dice «Da attivare» e non invia nulla. Database attivo ma tribuna non pubblicata: niente CTA, «Si apre quando la Direzione pubblica la tribuna nel catalogo».
- Importo: `TRIBUNE_SEAT_AMOUNT = null` → «Importo in aggiornamento», nessuna cifra (offerta fornitore del 14/05/2026 scaduta: 54.500 € + IVA = 66.490 €, 60 posti, consegna 90–180 giorni; diventa 66.490/60 ≈ 1.108 € solo con preventivo aggiornato confermato dalla Direzione).
- Mappa: disposizione indicativa neutra 2 settori × 3 file × 10 (`TRIBUNE_LAYOUT`, una sola costante; la tribuna esistente in scd-facilities è «2 settori x 5 file x 25 posti», altra struttura). Stati libero / promesso / adottato solo dai dati reali delle unità; adottato = soldi ricevuti dalla Tesoreria, promesso contato a parte, mai come adottato. Bottoni 44 px (5 per riga su telefono, 10 da tablet in su), `aria-label` «Posto 12, libero», dettaglio del posto con fila, stato, importo e targhetta.
- Co-adozione: modello puro max 3 persone per posto (`addHolder`, `coAdoptionCheck`, annullate liberano il posto). `CO_ADOPTION_LIVE = false`: oggi si sceglie solo un posto libero, perché r101 tiene una sola donazione ricevuta per posto (`scd_donations_one_unit_idx`) e rifiuta promesse su posti adottati.
- Targhetta: testo del donatore solo con nome pubblico + consenso esplicito (nuova casella nel dialogo; senza consenso il testo non viene inviato), altrimenti «Un amico della ColicoDerviese» (più anonimi: «Amici della ColicoDerviese»); le promesse non arrivano mai sulla targhetta; suggerimento «niente nomi di ragazzi minorenni».
- Donazione ≠ sponsorizzazione: in pagina e nel dialogo «erogazione liberale, ricevuta» per privati e famiglie; aziende con visibilità e fattura → /sponsor#proposta.
- File: `src/lib/tribune-seats.ts` (nuovo), `src/components/giving/TribuneSeats.tsx` (nuovo), `src/components/giving/buttons.ts` (nuovo, classi bottoni condivise), `src/lib/giving.ts` (`PublicUnit` + `pledges`/`adopters`/`plates` opzionali con ricaduta su ciò che r101 emette oggi), `src/components/giving/public.tsx` (`PledgeDialog`: posto iniziale, consenso targhetta, nota donazione/sponsor, «Da attivare» in testa; `UnitsGrid` con aria-label), `src/routes/sostieni.index.tsx`.
- Test: `tribune-seats.test.ts` (16), `TribuneSeats.test.tsx` (3, render lato server: 60 liberi, 0 di 60, nessun «€», stati da unità reali). Suite 1421 verdi; tsc, build, test:manifest, test:claude-hooks verdi. Nessuna migrazione nuova, nessuna scrittura Supabase.
- QA: build di produzione locale (`PORT=4191 node .output/server/index.mjs`), Playwright 390×844 e 1440×900 in `/tmp/claude-0/qa/seggiolino/` (pagina intera, sezione, mappa con posto scelto, dialogo): nessuno scorrimento orizzontale, nessun errore in console, posti ≥ 44 px.
- Da approvare (Francesco/Direzione): (1) preventivo aggiornato e importo per posto (poi `TRIBUNE_SEAT_AMOUNT` + oggetto nel catalogo); (2) pianta dei posti (sostituire la disposizione indicativa) e capienza: il fornitore dice 60 posti, `sponsor-development.snapshot.json` parla di «Tribuna Campo 2 · circa 80 posti» da riconciliare; (3) testo della targhetta e formula anonima «Un amico della ColicoDerviese»; (4) co-adozione fino a 3: serve un emendamento di r101 (indice unico per posto, promesse su posti condivisi, `pledges`/`adopters`/`plates` nella lettura pubblica) prima di accendere `CO_ADOPTION_LIVE`; (5) dicitura erogazione liberale/ricevuta da far confermare al commercialista.
## C1 — Listino partner su /sponsor · 2026-10-14
- Stato: DONE su agent/listino (SHA nel commit che aggiunge questa voce). Non pubblicato.
- Nuovo `src/lib/sponsor-packages.ts`: 5 pacchetti tipizzati — LED wall (principale), Maglia e kit, Tornei (Christmas Lario Cup 8/12/2026 maschile e femminile, Memorial Nasazzi maggio 2027 date da confermare), Digitale e settore giovanile, Seggiolino in tribuna (rimanda a /sostieni). Per ognuno: cosa comprende, chi lo vede (a parole; numeri "da misurare"), prezzo `{ kind: "da_approvare" } | { kind: "euro", from, to? }`. Oggi tutti `da_approvare` → "Prezzo su richiesta · in approvazione". Nessun prezzo, numero di pubblico o sponsor inventato.
- `/sponsor`: la vecchia griglia "Scegli il livello di partnership" (6 livelli di `catalog.SPONSOR_PACKAGES`) è sostituita dal listino (`PartnerPackages.tsx`): LED wall grande in evidenza, tre pacchetti affiancati, seggiolino in riga leggera; striscia "Come funziona" (scegli il pacchetto → ti ricontattiamo → contratto e fattura dalla società; nessun tempo di risposta documentato, quindi nessuna promessa). `catalog.SPONSOR_PACKAGES` resta per /grow e l'assistente.
- "Chiedi questo pacchetto": preseleziona il pacchetto nel modulo #proposta, mette `?pacchetto=<id>` nell'indirizzo (link condivisibile, solo id noti) e scorre al modulo. Il modulo partner è in pausa (`PUBLIC_FORMS_LIVE = false`): l'avviso mostra "Hai scelto: Pacchetto …" e l'e-mail alla società parte con oggetto "Partnership · Pacchetto …" e testo precompilato. Quando il modulo sarà attivo, il pacchetto viaggia in `interessi` (campo già esistente) e nel messaggio. Nessuna nuova scrittura backend, nessuna migrazione. L'oggetto della PEC safeguarding non cambia mai.
- Accessibilità: pulsanti ≥ 44 px (anche le scelte "Interessi" del modulo, con `aria-pressed`, e il link "Proponi prodotti o servizi"), titoli h2/h3 in ordine, sezione modulo focalizzabile, scorrimento senza animazione con riduzione movimento.
- Test: `sponsor-packages.test.ts` (14: campi e ≥3 vantaggi, id unici, LED wall unico principale, nessun numero con `da_approvare`, nessun numero di pubblico, nessun €, nessuna parola enfatica, nessuno sponsor nominato, seggiolino non richiedibile dal modulo, helper), `PartnerFormPackage.test.tsx` (5: mailto con pacchetto, safeguarding invariato). Suite completa 1421 test verdi; tsc, build, test:manifest, test:claude-hooks verdi.
- QA: build di produzione locale, Playwright 390×844 e 1440×900 (`/tmp/claude-0/qa/listino/`): nessuno scorrimento orizzontale, nessun errore in console, nessun bersaglio sotto 44 px nel listino e nel modulo; link `?pacchetto=ledwall` e id sconosciuto verificati.
- Da approvare (Francesco/Direzione): prezzo di ogni pacchetto (LED wall, Maglia e kit, Tornei, Digitale e settore giovanile, Seggiolino); conferma dei contenuti di ogni pacchetto (in particolare title partner e premio fair play dei tornei, partner di squadra giovanile); tempo di ricontatto da promettere, se si vuole.

## C6 — Spot LED in onda su home, player LED e vetrina gestionale · 2026-10-14
- Stato: DONE su `agent/spot` (da `integ/r2-hall`; non spinto, nessun deploy, nessuna pubblicazione social). Decisione di Francesco 14/10/2026 18:14 registrata come **UD-119** in `config/user-directives.v1.json`: gli spot girano in app (home + vetrina gestionale) e alimentano il LED wall, niente invio per mail; Presidente o commerciale propone, lo sponsor accetta o chiede modifiche.
- Spot (Drive `02_V4_SPONSOR_VALIDATI`, solo sponsor di `sponsors.ts`, confermati da Francesco il 14/10): HDI Maglia, Dell'Oca, ATV, Carcano, nbc, Saglio Sport. Esclusi: Iperal e Legea (non confermati). Dego Arredamenti aggiunto subito dopo (vedi aggiornamento in fondo alla voce).
- Media `public/media/ledwall/2026-27/` (solo transcodifica, contenuto non toccato, KEEP_LOCKED): `<slug>-master.mp4` 1920×164 H.264 25 fps CRF 28 senza audio, faststart (172–885 KB, sotto 1 MB); `<slug>-preview-720.mp4` 1280×720 CRF 30 (469–699 KB); poster WebP (fotogramma a 3 s, ~134 KB). Totale 7,1 MB. Saglio Sport: anteprima campo su Drive 11,2 MB oltre il limite di download del connettore (10 MB) → per ora si mostra il master LED su fondo scuro (`saglio-sport-master-poster.webp`). Tutti i file registrati in `config/scd-assets.v1.json` con id del file Drive e nota «spot ufficiale sponsor confermato; approvazione testi da registrare». Nessun volto: sono rendering del campo vuoto.
- `src/lib/sponsor-spots.ts`: configurazione tipizzata (slug, nome da `sponsors.ts`, master, preview, poster, cartella Drive, stato `IN_ONDA | DA_APPROVARE | MODIFICHE_RICHIESTE | APPROVATO`, sito solo se documentato: HDI Maglia, Dell'Oca, Carcano dai file contatti delle cartelle Drive, Saglio Sport da SRC-0032; ATV e nbc senza sito → «Scopri il partner» porta a /sponsor). Tutti `DA_APPROVARE` ma già in onda (decisione di Francesco). `spotsForHome()`/`spotsForLedwall()` escludono chi non è in `sponsors.ts` e chi ha `MODIFICHE_RICHIESTE`; ordine del giorno di Roma con la stessa logica di `ledwall-rotation` (`dailyOrder`). Testo social per spot «In arrivo a Colico: il nuovo LED wall del campo. Grazie a … [@handle da verificare] …» (nessun profilo inventato, nulla pubblicato).
- Home pubblica: blocco «Sul LED wall» subito dopo «Sostieni il club» (`SponsorSpotsHome` in `components/SponsorSpots.tsx`); la fascia partner in fondo resta una sola. Anteprime a rotazione, mute, `playsInline`, una dopo l'altra; prima il poster, solo il video corrente si carica e solo quando il blocco è a schermo; si ferma fuori schermo, pausa/precedente/successivo (44 px); con riduzione movimento solo poster + «Guarda lo spot». Nome sponsor, «Partner della S.C.D. ColicoDerviese», «Scopri il partner», «Vuoi il tuo spot qui?» → `/sponsor?pacchetto=ledwall`. Riquadro 16:9 fisso: nessuno spostamento del layout.
- `/ledwall/player`: pagina nera senza intestazione, piè di pagina, chat, banner cookie o PWA (nuovo `staticData.bare` nel root), `noindex, nofollow`; tela 1920×164 scalata alla larghezza della finestra; master in loop nell'ordine del giorno con due video alternati (il successivo è già caricato); Wake Lock con fallback silenzioso; doppio clic o tasto F per lo schermo intero. Mai spot con `MODIFICHE_RICHIESTE`.
- Gestionale sponsor (`/crm`, scheda «Sponsor e partner», sotto il kit partner; nessun CRM parallelo): sezione «Spot LED» con anteprima (si carica al clic), badge di stato, passaggi «Proposto dal Presidente o dal commerciale → Approvato dallo sponsor / Modifiche richieste → In onda», testo social da copiare, link al master e al player; nota «Lo stato si aggiorna dal gestionale quando sarà attivo il registro spot (migrazione da approvare)».
- PROPOSED (non applicata): `supabase/migrations/20261014_r106_sponsor_spots.sql` — registro spot (`scd_sponsor_spots`) e audit (`scd_sponsor_spot_events`), RLS attiva e tabelle chiuse ad anon/authenticated, scrittura solo con funzioni security definer con controlli espliciti (ufficio: Direzione, presidente, direttore-generale; transizioni consentite; feedback obbligatorio per «Modifiche richieste»), lettura pubblica solo lato server (`scd_sponsor_spot_showable`, service role, mai `MODIFICHE_RICHIESTE`). Manca una posizione «commerciale» nel registro ruoli: va aggiunta (cambio manifest) prima di darle accesso.
- Test: `sponsor-spots.test.ts` (12: solo sponsor confermati, file esistenti e registrati, pesi < 1 MB / < 2 MB, nessun duplicato, ordine deterministico per giorno, `MODIFICHE_RICHIESTE` esclusi, testo social con segnaposto, migrazione r106 senza parole distruttive e con RLS), `SponsorSpots.test.tsx` (4: posizione in home, lazy/mute/riduzione movimento, vetrina dentro /crm, player bare + noindex + wake lock). Suite 138 file / 1497 test verdi; tsc, build, test:manifest, test:claude-hooks verdi.
- QA (build di produzione locale, Chromium in `/opt/pw-browsers`; questo Chromium non ha H.264, quindi nel solo test i master/anteprime sono serviti come copie VP9 per verificare la riproduzione): home 390×844 e 1440×900, riduzione movimento, `/ledwall/player` a 1920×164 e 1280×110 (passa da uno spot al successivo a fine video), vetrina `/crm` 1440 e 390 in `/tmp/claude-0/qa/spot/`. Nessun errore in console, nessuno scorrimento orizzontale, altezza del blocco stabile al cambio spot.
- Aperti (Francesco/Direzione): (1) Dego Arredamenti è in `sponsors.ts` e ha gli spot su Drive: confermare se metterlo in rotazione; (2) anteprima campo di Saglio Sport da caricare (file > 10 MB per il connettore); (3) nome di nbc in `sponsors.ts` non verificato («nbc»; cartella Drive «NBC_ELETTRONICA»); (4) profili social ufficiali degli sponsor da verificare per sostituire «[@handle da verificare]»; (5) approvazione della migrazione r106 e della posizione «commerciale»; (6) prova sul PC del LED controller (risoluzione di uscita, schermo intero, Chrome/Edge con H.264).
## C5 — Personaggi semplificati: Vera + 4 volti · 2026-10-14
- Stato: DONE su `agent/vera` (da `integ/r2-hall`; non spinto, nessun deploy, nessuna migrazione, nessuna scrittura Supabase). Decisione di Francesco 14/10/2026 ~18:05 registrata come **UD-121** in `config/user-directives.v1.json` (supera in parte UD-111, UD-114, UD-116).
- Una sola chat in tutta l'app: **Vera**, la reception del club (persona `vera`, al posto di Genny). Risponde con i dati veri citando la fonte (regola nel prompt), porta dal volto giusto, apre una richiesta alla segreteria con il motore richieste (UD-045), risponde su biglietti e card. Sky resta solo per i soci più giovani e il mondo under 14 (stessa regola di prima: età sconosciuta = Sky).
- Compatibilità: `genny` e `crovi` sono alias di `vera` (`assistant.ts normalizePersona`, `LEGACY_PERSONA_ALIASES`); i vecchi eventi `genny:open` / `crovi:open` e `assistant:open {persona}` aprono ancora Vera; il server accetta ancora `persona` dai client vecchi e lo ricontrolla (`resolveChat`).
- Volti con azioni (`cast-personas.ts CAST_FACES`, 2-3 azioni su route esistenti + «Chiedi a Vera» che apre la chat di Vera con l'area): Chef della Club House (ordine per una festa `/famiglia#richiesta-ordine`, sondaggio piatti `/famiglia#sondaggi-piatti`, eventi), Volto sponsor (ora su **/sponsor**: chiedi un pacchetto `#proposta`, listino `#listino`, partner), Mentore dei tornei (/tornei: iscrivi la squadra e ospitalità sulla pagina della Christmas Lario Cup, tutti i tornei), Sky (scuola calcio, squadre, fantacalcio; nessuna area chat). Aperta da un volto, Vera dice «Per la Club House ti aiuta lo Chef: …» e mostra i pulsanti dell'area.
- Solo «consiglio del giorno» (nessuna chat, nessun pulsante «Chiedi a …»): Era, Dottor Acanfora, Preparatore atletico, Mental coach, Musica e relax. `home-tips.ts` ruota questi cinque + i promemoria di Vera; schede Era/Acanfora e `CastHelpersCard` senza pulsante chat.
- Assorbiti da Vera: biglietteria (su /impianti e /tesoreria/biglietteria la scheda è «Vera» con le azioni biglietti) e Crovi: nel registro asset Crovi v3 è `VERIFIED` con «not an official asset», mai `APPROVED`, quindi chat e cameo passano a Vera; i file restano nel repository.
- /guida#personaggi (`CastDirectory`): Vera per prima, poi i 4 volti, poi il gruppo piccolo «Consigli del giorno»; una riga semplice per personaggio su cosa fa per te.
- Sicurezza invariata: disagio → testo fisso di rimando prima di tutto (mai al modello) per ogni chat e area; safeguarding nel canale riservato; ordini, iscrizioni e acquisti di biglietti mai confermati né pagati; guardia di Vera (`veraAnswerProblems`) severa su pagine pubbliche e aree (niente diete, farmaci/diagnosi, terapia, schede personali), solo conferme per lo staff che legge il Cervellone; nessun nome proprio inventato ai volti; ritratti nascosti (Vera usa la cartella `cast/genny` in attesa, `ready=false`, registro ON_HOLD con `character: "vera"`).
- Contratto: `SCD_SYSTEM_MANIFEST.json` (`sky_and_avatar.ai_assistants.personas`, `assistant_cast`, home daily tip) e `docs/AI_ASSISTANT.md` aggiornati.
- Test: nuovi/aggiornati `assistant.test.ts` (unico id chat `vera`, alias genny/crovi → vera), `cast-personas.test.ts` (consigli senza chat, 4 volti con ≥2 azioni su route esistenti, guardie), `cast-rules.test.ts`, `assistant.server.test.ts`, `SkyJolly.test.ts` (evento legacy `{persona:"genny"}`), `home-tips.test.ts`, `assistant-cast.test.ts`. Suite vitest verde; tsc, build, test:manifest, test:claude-hooks verdi.
- QA: build di produzione locale con `SCD_STAGING_PREVIEW=1`, Playwright 390×844 e 1440×900 in `/tmp/claude-0/qa/vera/` (home, consiglio del giorno, /guida#personaggi, /sponsor con Vera aperta nell'area sponsor, Club House con la scheda dello Chef e la chat di Vera aperta; per la Club House la sessione staff è simulata solo nel browser di test). Nessuno scorrimento orizzontale, nessun errore in console, pulsanti «Chiedi a Vera» 44 px.
- Da approvare (Direzione): immagine ufficiale di Vera (e nuove immagini di Era) prima di mostrare ritratti; voce sintetica originale (UD-092); Crovi mascotte APPROVED (solo immagine, senza chat) oppure ritirato; nomi propri dei volti (Chef, Volto sponsor, Mentore dei tornei).
- Aperti (Francesco/Direzione): (1) testi dello spot Dego da confrontare con la scheda contatti (numero da mostrare: il sito pubblica solo il cellulare aziendale); (2) anteprima campo di Saglio Sport da caricare (file > 10 MB per il connettore); (3) nome di nbc in `sponsors.ts` non verificato («nbc»; cartella Drive «NBC_ELETTRONICA»); (4) profili social ufficiali degli sponsor da verificare per sostituire «[@handle da verificare]»; (5) approvazione della migrazione r106 e della posizione «commerciale»; (6) prova sul PC del LED controller (risoluzione di uscita, schermo intero, Chrome/Edge con H.264).
- Aggiornamento C6 (stesso giorno): Dego Arredamenti è confermato (è in `sponsors.ts`, regola di Francesco). Spot aggiunto come gli altri: master `DEGO_01_MASTER_LED_V4_EVOLUTO_20SEC.mp4` → `dego-arredamenti-master.mp4` (688 KB), anteprima `DEGO_02_PREVIEW_CAMPO_GIORNO_V4_EVOLUTO.mp4` → `dego-arredamenti-preview-720.mp4` (662 KB) + poster (131 KB), registrati in `config/scd-assets.v1.json`; stato `DA_APPROVARE`; sito https://www.degoarredamenti.it/ dalla scheda Drive «05_SCHEDA_CONTATTI_FONTI - DEGO_ARREDAMENTI» (sito VERIFICATO 14/10/2026). Ora 7 spot, cartella 8,5 MB. Saglio Sport resta senza anteprima (file oltre il limite del connettore).

## UD-122 — Nomi Garrison ed Enea, Crovi mascotte · 2026-10-14
- Stato: DONE su integ/r2-hall (pubblicato con il "pubblica" delle 18:46).
- Chef della Club House = **Garrison**, Mentore dei tornei = **Enea** (cast-personas, assistant-cast, testi di Vera, test aggiornati). Volto sponsor: nome ancora da decidere.
- **Crovi resta la mascotte** (asset Crovi v3 → APPROVED, solo immagine): una volta per visita sulle pagine pubbliche saluta e indica la chat di Vera ("Chiedi a Vera"); nessuna chat sua. Frasi del saluto riscritte per rimandare a Vera.
- QA: tsc, build, vitest 1505, test:manifest, test:claude-hooks; Playwright 390×844 della home con `?crovi`: saluto visibile, nessun errore.

- Nota 14/10 sera: rinumerazioni per collisione con l'altra sessione (accesso classico pubblicato): registro spot r105 → **r106**; direttiva nomi/mascotte UD-120 → **UD-122**; personaggi semplificati UD-118 → **UD-121**. UD-120 = accesso classico (altra sessione).

## C7 — Pulmini in 2D sotto gli allenamenti · 2026-10-14

Richiesta della Direzione (14/10/2026 11:00), registrata come **UD-130**: sotto gli allenamenti una pianta 2D di ogni pulmino come campi e spogliatoi, con chi c'è dentro, chi sale e chi scende e dove; contatti di genitori, dirigenti e mister riservati.

- `src/lib/van-plan.ts` (+ `van-plan.test.tsx`, 23 test): pianta Fiat Ducato 9 posti (D autista, 1-2 davanti, 3-5 centro, 6-8 dietro); `seatsFor` usa i posti del Master Flotta, altrimenti la disposizione verificata del club **solo come "disposizione indicativa"**; posti assegnati **solo** con pulmino scritto nel Master + posto fisso (pulmino senza posto = "posto non fissato", senza pulmino = "da collocare"); giro per linea con fermate in ordine, ▲ chi sale (andata) e ▼ chi scende (ritorno), orari solo se nel Master; avvisi: oltre i posti, ragazzi senza fermata, senza pulmino, scadenze mezzi e patenti solo da date esistenti.
- `pulmini-vans.ts` / `.functions.ts`: ogni ragazzo porta pulmino assegnato (solo da MEZZO del Master), posto fisso e fermate **solo come fermate registrate della linea**: il testo libero del Master (può essere un indirizzo) non esce mai dal server.
- `components/scd/VanPlan2D.tsx`: vista dall'alto (contorno blu notte, sfondo chiaro, giallo per l'evidenza), tocca un posto → nome e iniziale, annata, sale a / scende a con orario; scheda "Giro di …"; stato vuoto con i numeri reali ("Assegna i ragazzi ai pulmini nel Master Flotta: oggi 0 su 61 assegnati"); contatti: segnaposto bloccato "Contatti riservati… (sezione pulmini-contatti)", nessun dato richiesto (non esiste una funzione server con permessi per i contatti dei genitori).
- Posizionato in /pulmini sotto gli allenamenti della settimana e in /allenamenti solo per chi apre l'area Pulmini (stessa funzione server `getPulminiVans`).
- Nessuna tabella, migrazione, scrittura Supabase, ruolo o permesso nuovo.
- QA: tsc, build, vitest 1553, test:manifest, test:claude-hooks; Playwright 390×844 e 1440×900 su build locale in anteprima (piano bloccato) e su dati di prova con nomi inventati; nessun errore, nessuno scroll orizzontale. Screenshot in `/tmp/claude-0/qa/pulmini2d/`.
- Da completare nel Master Pulmini/Flotta: pulmino (MEZZO) per ognuno dei 61 ragazzi, posto fisso se deciso, posti/targa/scadenze dei mezzi, orari delle fermate, divisione della linea LAGO/LECCO tra Pulmino 1 e 2, autisti per corsa. Per mostrare fermate e posto accanto ai nomi serve un aggiornamento (da approvare) di `scd_transport_rider_roster` che restituisca anche fermata andata/ritorno e posto.

## UD-131 — Gestionale sponsor a regime: gli spot girano da soli · 2026-10-14

Francesco 14/10 20:56: «No nessun messaggio … devi lavorare nel gestionale sponsor per metterlo a regime, quei video e spot devono girare».

- `src/lib/spot-schedule.ts` (+ test): un solo orologio (Roma, slot di 20 s = durata del master, ordine del giorno) per player LED, home e regia; `passesPerHour` calcolato (mai pubblico stimato); `chooseVideoFormat`/`spotVideoFile`: MP4 H.264 dove si riproduce, altrimenti il gemello WebM VP9.
- 13 file `.webm` (VP9) accanto agli MP4 in `public/media/ledwall/2026-27/` (master e anteprime).
- `/ledwall/player`: rotazione guidata dall'orologio (non più dall'evento «ended»): un video che non si carica non blocca il giro; ricaricando la pagina riparte al secondo giusto; stesso spot della home e della regia.
- Home «Sul LED wall»: segue la diretta («In onda ora sul LED wall»), le frecce passano al manuale con «Torna alla diretta».
- `/crm` → Spot LED: nuova **Regia LED wall · in diretta** (tabellone che gira, in onda ora, poi tra N s, spot in rotazione, giro completo, passaggi per partner ogni ora calcolati, palinsesto con orari); tolto il pulsante WhatsApp (nessun messaggio dall'app).
- QA locale (Playwright, Chromium senza H.264 → WebM): player cambia spot allo scadere dei 20 s; home e regia riproducono; 390/1440 senza scroll orizzontale né errori.

## Strategia 14/10 — prime mosse pubbliche · 2026-10-14

Francesco 14/10 22:42: «procedi a fare quello che secondo te fa il meglio e la renda sempre migliore oggi e domani». Fonte: documento «SCD Super App — Analisi e strategia» e giro sull'app pubblicata (7 percorsi, 50 pagine).

- **Christmas Lario Cup in italiano, tedesco e inglese** (`?lang=de|en`, selettore lingua, hreflang): i fatti restano in `events.ts`, si traducono solo le parole; tutela dei minori in tutte le lingue.
- **«Quando va in onda»** su `/spot/<slug>`: prossimi passaggi dello spot oggi dallo stesso orologio del LED (`nextAirings`/`ledAirings`, mai oltre la mezzanotte di Roma), passaggi e secondi per ora di LED acceso; calcolati, pubblico mai stimato.
- **/impianti «Come arrivare»**: link Maps per Colico e Dervio dagli indirizzi del master impianti.
- **Parole semplici**: nelle pagine pubbliche di Sostieni e in /entra niente più «r101» o «lead»; il back-office dice «serve l'apertura da parte della Direzione (migrazione r101)». Manifest `safe_runtime_behavior` aggiornato.
- **/entra pubblica** (sitemap e robots in produzione, offline worker): nessun dato di sessione. **/sostieni resta privata**: la revisione di sicurezza ha trovato che `/sostieni/fondo-solidale` incorpora i figli del genitore collegato; in più la pagina usa `getMyFamilyForFund`, che dal server restituisce solo id, nome, relazione e minore (niente anno, squadre, tesseramento, scadenza certificato), sia al primo caricamento sia navigando nell'app. Test che la pagina resti `private, no-store`.
- Revisione: primo giro BLOCK (scd-sicurezza CRITICA su /sostieni; scd-revisore stessa causa + manifest, messaggio staff, fonte e traduzioni) → corretti.

## UD-132 — Seggiolino e lotteria interni · 2026-10-14

Francesco 14/10 23:20: «Adotta un seggiolino e lotteria al momento teniamoli interni senza pubblicazione. Mettiamo concentrati su quello che è spingere i ragazzi e le famiglie a starci sopra e viverla».

- `src/lib/internal-initiatives.ts`: `INTERNAL_ONLY = { seatAdoption: true, lottery: true }`.
- Home (pubblica e iscritti): la striscia «Sostieni il club» mostra solo «Diventa partner» e «Dona materiale»; seggiolino e lotteria mai, anche se la lotteria venisse pubblicata dal pannello.
- /sponsor: tolto il pacchetto «Seggiolino in tribuna» (resta come `SEAT_PACKAGE_INTERNAL`).
- /sostieni: nascosta la mappa dei posti della tribuna.
- /eventi/lotteria-dello-sport: sempre «Iniziativa in preparazione» e noindex, niente anteprima di struttura; /eventi non la elenca.
- Pagine Direzione e Tesoreria invariate.

## Home pubblica Matchday · 2026-10-15

UD-132 (Francesco 14/10 23:20: spingere ragazzi e famiglie a vivere l'app; «la home non è per nulla un'idea bella»). Solo home pubblica; home iscritti, accesso e funzioni server invariati.
- Nuovo ordine: avvisi urgenti (se ci sono) → comunicazione del club (se c'è) → **«Questa settimana»** (`components/home/HomeMatchday.tsx`: gare dei prossimi 7 giorni dal Calendario SCD, raggruppate per giorno, filtri Tutte / In casa / Agonistica / Attività di base con `aria-pressed`, riga «N gare · M in casa a Colico/Dervio», stemma avversario solo se verificato nel registro, «In corso» per la gara in campo, «da confermare» in tono leggero, link «Tutto il calendario») → striscia LED compatta (`SponsorSpotsHome compact`, stesso orologio del LED wall, pausa e reduced-motion; a destra su desktop) → risultati (solo con fonte) → «La tua squadra, i tuoi orari, il tuo pulmino» → riconoscimenti → fascia partner.
- Tolti dalla home pubblica (componenti ancora esportati): Sostieni il club, azioni rapide (le copre la barra in basso), consiglio del giorno, vetrina, notizie; anche la card con il conto alla rovescia.
- Logica pura in `lib/home-matchday.ts` (classificazione con la regola di `lib/universe.ts`, conteggi, raggruppamento, riepilogo, etichette dei giorni) con 7 test vitest; test dell'ordine della home aggiornati.
- Altezza della home con i dati reali (Playwright, build locale): **390×844 da 6086 px a 3150 px**; **1440×900 da 4657 px a 2194 px**. Nessuno scroll orizzontale, nessun errore in console.
- Controlli: tsc, build, vitest (149 file, 1614 test), `test:manifest`, `test:claude-hooks` verdi.
- Aperto: nei giorni con gara in casa la fascia partner mostra ancora anche il LedwallRotator, quindi due blocchi LED nella stessa pagina; da decidere se tenerne uno solo.

## 15/10/2026 — chat PC: allenamenti per i genitori, testo di /entra, agenti per gestionale

- `/allenamenti`: riga "I tuoi ragazzi" per il genitore collegato. Il server (`getMyTrainingKids`) manda solo il nome di battesimo dei figli minori e la parola del quadro che ha davvero allenamenti (anno o categoria, `trainingKids` in `lib/training-view.ts`); nessun cognome né codice squadra. Con un solo figlio la pagina apre subito la sua settimana; se l'annata non è scritta nel quadro compare "chiedi al mister" invece di una settimana vuota.
- `/entra`, Sky e assistente: niente più "Compila la pre-iscrizione" finché il modulo pubblico è spento (`JOIN_INVITE` segue `PUBLIC_FORMS_LIVE`).
- Agenti: 40 agenti SCD (uno per gestionale + legale, CFO, commerciale, negoziazione); chi legge il database lo dichiara "solo SELECT".
- Controlli: tsc, build, vitest, `test:manifest`, `test:claude-hooks` verdi; scd-revisore BLOCK → corretto → PASS; scd-sicurezza PASS × 2.

## B3 — Prima schermata più stabile e più leggera (home, /sponsor) · 2026-10-15

Backlog cloud B3 (prestazioni e prima schermata). Motore: PERSONE (la home si apre senza salti e con meno dati sul telefono) e SOLDI (/sponsor mostra prima il ledwall ai partner). Numeri prima/dopo in `docs/LAUNCH_QUALITY.md` → B3.
- **Niente più salti mentre arrivano i caratteri**: `src/font-fallbacks.css` (generato da `scripts/derive-font-fallbacks.py` dai file ufficiali) dà a ogni famiglia e peso un carattere di riserva locale con le stesse misure; i titoli `font-uv` in maiuscolo usano facce misurate sulle maiuscole. CLS home mobile **0.120 → 0.000**; risolto anche l'aperto di L1 su /calendario (0.092 → 0.000) e /squadre (0.062 → 0.002).
- **Marchi FIGC SGS, LND, Insieme al Monza** serviti in resa 96 px senza perdita (`cut/<id>-h96.webp`, registrati): ~240 KB → ~60 KB su ogni pagina (testata).
- **Fermo immagine del ledwall** in 640/960 px per i telefoni a bassa densità; su /sponsor caricato subito con priorità alta: LCP ~9,8 s → ~6,0 s.
- Peso prima visita: home 1789 → 1483 KiB, /sponsor 1486 → 1175 KiB. Asset ufficiali invariati (hash), locandine degli spot non toccate.
- Aperto: alla prima visita l'LCP della home è ora l'avviso cookie, che compare dopo l'idratazione (~10 s nella simulazione lenta); si sposterebbe disegnandolo dal server con il cookie tecnico della scelta (area consenso: da decidere). Stemmi avversari ancora 50–73 KB per uno stemma da 20 px (prossimo passo, stesso metodo).
- Stato: DONE, commit `6e9f848` + `5412b38`, **pubblicato** 15/10 01:38 (Render `dep-db82sion74is73ditb00`, live); controllo sul sito reale 390/1440 su /, /sponsor, /calendario: HTTP 200, nessun errore in console, nessuno scroll orizzontale, CLS home 0.0005.
- Revisione: scd-revisore PASS (corretti: regola `.uppercase` limitata a `--font-uv`, testi più precisi su densità schermo e Roboto), scd-sicurezza PASS.
- Test: `font-fallbacks.test.ts` (5), resa 96 px in `club-credentials.test.tsx`, srcset e priorità in `LedwallRotator.test.tsx`.

## Home pubblica dalla tavola VR-009 · 2026-10-15
- Francesco 15/10 06:30: "tutto deve partire dallo studio di questa immagine… solo migliorare". La home pubblica riparte dalla schermata 1 della tavola a sei schermate.
- Nuovo `HomeBoard.tsx`: hero "Questa settimana" con lago e Sky (asset ufficiale), 4 riquadri (Gare con contatore delle gare rimaste, Allenamenti, Eventi, Iniziative), "Prossima gara" con linguetta, data grande e stemmi (solo registro verificato), Allenamenti + Lario Cup.
- Poi la fascia partner unica, "Mondo Colico" (vetrina del giorno, di nuovo caricata dal server), la settimana completa con il LED, risultati, iscrizione, riconoscimenti.
- Logica pura in `lib/home-board.ts` con test. Allenamenti resta dietro l'accesso: la pagina contiene staff, pulmini e figli; una vista pubblica solo squadre/orari è il prossimo blocco.
- Revisione: sicurezza PASS (la vetrina pubblica contiene solo i cinque mondi pubblici, nessun dato di soci o minori, nessuna iniziativa interna). Codice: BLOCK sul contrasto del testo bianco sulla foto, corretto (scrim più scuro; contrasto misurato ≥ 7,9:1 a 390 e 1440 px); card evento letta da `clubEventsOn` (sparisce dopo l'evento); titoli distinti ("Tutte le gare della settimana"); vetrina pubblica intitolata "Mondo Colico" come nella tavola.
- Sky grande nell'hero: la tavola VR-009 del DG mette la mascotte nella testata, quindi supera la vecchia regola UD-110 "Sky solo nel mondo bambini".
- 06:46 Francesco: no allo scoiattolo Sky in testata, "poco wow, poco vivo". Tolto Sky; hero con il lago in lento movimento, stemma ufficiale e conto alla rovescia live (secondi) alla prossima gara in casa; nuove storie "Guarda cosa succede a Colico" (Lario Cup, spot LED dei partner del giorno, il centro, il club) con visore a schermo intero come i social. Niente foto aerea del centro (UD-100).
- 06:51 Francesco: crediti dell'autore "non visibili così ma molto riservati": nel footer resta "© anno · Tutti i diritti riservati · Crediti", il testo completo si apre solo toccando "Crediti".
- 07:04 Francesco "fuori ogni logica": la home ora segue una logica sola. "Prossima gara" = la gara più importante (Prima Squadra, poi agonistica, poi base; confermata prima di "da confermare", `boardRank`) con il suo conto alla rovescia dentro la card (non più due gare diverse tra hero e card). Ogni blocco una volta: un solo LED (lo spot in onda, dentro "I nostri partner"), tolti il banner "Registrati/Entra" (c'è già Entra in alto e in basso) e la seconda fascia riconoscimenti (resta nel footer). Storie dei partner con il logo invece del campo uguale per tutti. Pagina a 390 px: da 4264 a 3843 px.


## 15/10/2026 — chat PC: pagine interne dietro l'accesso

- Direzione 15/10 ("Ok"): `/gestionale`, `/gestionale/mappa` e `/quadro` non mostrano più l'anteprima a chi non ha accesso. Come le altre aree di lavoro (`WORK_AREA_IDS` + `WORK_AREAS`), senza sessione con ruolo ammesso rispondono con la schermata d'accesso dell'area; il personale con accesso vede la pagina come prima. Tolti da `DEFERRED_PATHS`.
- Nessun pixel di marketing su `/quadro`, `/allenamenti`, `/la-mia-scd`, `/squadre` (`NO_MARKETING` in `lib/universe.ts`).
- Prima: `/direzione`, `/tesoreria`, `/segreteria` e le altre aree mostravano già solo la schermata d'accesso; restavano aperte in anteprima solo queste tre pagine.

## 2026-10-15 · Calendario live dalla tavola VR-009 schermata 2 · done (ramo `agent/calendario-board-live`, non pubblicato)

- **`/calendario` rifatto sulla schermata 2 "CALENDARIO LIVE"** della tavola a sei schermate, nello stile della nuova home (navy #0b2a5b, blu #1556c4, chiaro #eef3f9, bianco, giallo #ffd600; stesse card; niente mascotte): testata con la foto vera del lago (zoom lento), stemma ufficiale, titolo "Calendario live" e impulso live (rosso "In campo ora" con il minuto durante una gara, altrimenti conto alla rovescia al prossimo calcio d'inizio); schede IERI / OGGI / DOMANI con il numero di gare + "Calendario" (Settimana / Mese / Squadra); intestazione settimana con frecce sulla settimana reale; righe bianche con barra colorata, blocco data (giorno, numero, mese, ora o minuto live in rosso), icona tonda per tipo (pallone = partita, coppa = coppa/torneo, cono = allenamento solo soci), titolo in grassetto, luogo con segnaposto, stemmi sovrapposti; pulsante blu a tutta larghezza "Vedi tutti gli eventi"; "Prossime gare" con blocco data grande, stemmi, "ColicoDerviese <categoria> vs <avversario>", campo, freccia. Desktop a due colonne (elenco a sinistra; prossime gare, origine dati e risultati ufficiali a destra).
- **Dal benchmark**: stella per seguire una squadra ("Le mie squadre", localStorage dentro try/catch, solo su questo dispositivo), squadre seguite per prime e loro prossima gara in alto; minuto live calcolato dal calcio d'inizio in calendario (orologio, mai un punteggio); giorno vuoto con salto alla giornata vera più vicina.
- **Logica pura** `src/lib/calendario-live.ts` + 13 test vitest (`calendario-live.test.ts`); componenti `src/components/calendario/CalendarioLive.tsx` (aggiunti alla scansione della policy stemmi pubblici).
- Mantenuti: tutte le fonti (calendario pubblico, quadro allenamenti solo soci nel loader), filtri (annata, casa/trasferta, finestre 15/30/60/180, stagione, spostamento settimana/mese), copia/condividi/verifica, avviso "Entra per allenamenti e dettagli", avviso accesso base, risultati ufficiali. Nuovi valori `vista=ieri|oggi|domani`; i vecchi link funzionano.
- Regole: pagina pubblica solo gare (allenamenti solo soci, UD-100); nostro lato sempre stemma ufficiale + "ColicoDerviese <squadra>"; stemma avversario solo se `crestFor()` ha il file verificato; nessun minore nominato; nessun dato inventato.
- QA: `tsc --noEmit`, `npm run build`, vitest 153 file / 1650 test, `test:manifest` e `test:claude-hooks` verdi. Playwright 390×844 e 1440×900 su `/calendario`, `/calendario?vista=oggi` e sabato live simulato (orologio del browser 17/10 15:25): nessuno scorrimento orizzontale, nessun errore in console. `kit-texture.test.tsx` ora controlla la texture `mountains-lake` della nuova testata al posto di `PageHeader`.
## Pulmino in diretta · fase 1 (r110, fail-closed) · 2026-10-15

Chat CLOUD. Decisione Direzione 15/10: tutti gli autisti sono volontari; fase 1 = telefono dell'autista, nessuna mappa, solo testo (distanza e arrivo "stima"), un punto ogni 15 s, punti cancellati entro 24 h, registro corse 90 giorni, chiusura automatica +60 min.

- **Migrazione** `supabase/migrations/20261015_r110_transport_live.sql` (scritta, NON applicata): `scd_transport_live_drivers` (account ↔ autista del Master, collegato dall'ufficio trasporti, + presa visione del volontario), `scd_transport_live_sessions` (registro, 90 giorni), `scd_transport_live_points` (posizioni, cancellate dopo 24 h). RLS attiva, nessuna policy, nessun grant diretto. Funzioni SECURITY DEFINER `scd_transport_live_start/ping/stop/view/purge` (+ `_link_driver` per l'ufficio, `_engine` per il rilevamento): avvia solo l'account collegato all'autista assegnato, nel giorno della corsa; punti almeno 10 s distanti, precisione ≤ 500 m; vede solo chi ha un ragazzo con posto CONFERMATO su quella trasferta (senza coordinate né nomi) e l'ufficio trasporti/Direzione; `purge` solo per il job programmato (service_role). Provata su un database locale usa-e-getta (PGlite) con dati finti: accessi, rate limit, chiusura e cancellazione come previsto.
- **App**: `src/lib/transport-live.ts` (regole pure: allowlist del payload, rate limit, haversine, stima d'arrivo, scadenza, etichette) con `transport-live.test.ts`; `src/lib/transport-live.functions.ts` (risponde "non ancora attivo" finché manca `scd_transport_live_engine`, come r101); `/pulmini`: pannello autista "Inizia corsa / Termina corsa" con banner fisso "Posizione condivisa", watchPosition + Screen Wake Lock (rifiuto gestito), solo per l'autista assegnato, "Funzione in preparazione" finché r110 non è applicata; `/famiglia`: card "Dov'è il pulmino" (stato, ultimo aggiornamento, distanza, arrivo stima), aggiornata ogni 20 s, nessun nome, niente per gli anonimi.
- **Permissions-Policy**: `geolocation=(self)` solo su `/pulmini`, `geolocation=()` altrove (`permissionsPolicyFor` in `http-policy.ts`, test aggiornati). Se l'autista arriva a `/pulmini` con la navigazione interna, il pannello chiede di ricaricare la pagina.
- **Manifest 3.38.0**: fonte `PULMINI_DRIVER_DEVICE_POSITION`, gap `GAP-TRANSPORT-LIVE-R110`, nota `transport_live`.
- **Punti d'arrivo**: coordinate dei centri sportivi di Colico/Dervio lasciate vuote finché non verificate (mappe reali = chat PC): finché mancano, distanza e arrivo dicono "non disponibile".

QA: `tsc` ok, vitest completo verde, `npm run build` ok, `test:manifest` e `test:claude-hooks` verdi. Playwright 390 e 1440 px su `/pulmini` (anteprima staging con "Funzione in preparazione"; stati aperti dei componenti reali con dati d'esempio inseriti nella pagina) e sulla card famiglia; nessun overflow orizzontale, nessun errore in console; `/famiglia` anonima senza card.

Da decidere (Direzione): applicazione di r110 dopo DPIA e testo di presa visione; collegamento account-autista; job orario per `scd_transport_live_purge`; coordinate verificate dei punti d'arrivo.
- 08:51 Francesco: "sì" al Calendario live, "voglio animazione e tanta dinamicità". Strato di movimento (tutto spento con "riduci movimento"): fasci di luce da stadio e luci gialle che salgono nella testata, riquadri che entrano rimbalzando con icona che si muove (pallone che rotola), numero gare che pulsa, riflesso che passa sulla card Prossima gara, secondi del conto alla rovescia che scattano, anelli delle storie che girano, righe del calendario che salgono mentre scorri.

## 15/10/2026 09:18 · UD-134: coriandoli solo se vinciamo, via le storie, torna la barra sponsor, un solo assistente

- **Coriandoli solo sulle vittorie**: nei "Risultati del weekend" una riga ColicoDerviese vinta ha il badge giallo "Vittoria" e, quando il blocco entra nello schermo, parte una pioggia di coriandoli nei colori del club (una volta per sessione per le stesse vittorie). Pareggi, sconfitte, derby tra nostre squadre e gare non nostre: niente. Con "riduci movimento": niente coriandoli. Logica pura `isClubWin` + `confettiPieces` in `lib/home-results.ts` (test), componente `home/WinConfetti.tsx`.
- **Via le storie** dalla home ("mi sembra una cavolata"): rimossi `HomeStories.tsx`, `lib/home-stories.ts` e il test; tolta la classe `scd-ring`.
- **Torna la barra sponsor scorrevole** anche sulla home (`SponsorBand` senza eccezione per "/", spazio riservato nella shell, chat Vera posizionata sopra la barra).
- **Notizie partner e LED wall fuori dalla home**: il blocco (spot in onda, partner del mese, notizie dei partner) è ora `components/sponsor/PartnerBand.tsx` sulla pagina `/sponsor`, dopo il listino; un solo "Diventa partner" (quello dello spot).
- **Un solo assistente**: tolto il fumetto di Crovi che compariva accanto a Vera (supera la parte "saluta una volta per visita" di UD-122). Vera resta l'unica chat.
- Registrato il comando in `config/user-directives.v1.json` come UD-134 (carte giocatori/staff in lavorazione; ticker non deciso, non costruito).
## 2026-10-15 · Carte della rosa · done (ramo `agent/squadra-carte`, non pubblicato)

- Francesco (DG) 15/10 09:18: "qualcosa che si apre come carta: elenco calciatori Prima Squadra con staff, e gli staff delle varie annate".
- **Nuova pagina `/squadre/carte`** (dentro `/squadre`, quindi solo soci, `no-store`, fuori da robots/sitemap come le altre pagine squadre). Selettore squadra in alto (Prima Squadra per prima, poi le annate nell'ordine di `hallTeams`; `?squadra=u19` ecc.), mazzo di carte che si girano: fronte in stile club (navy #0b2a5b, blu #1556c4, giallo #ffd600, stemma ufficiale, lettera del ruolo P/D/C/A con tipografia da numero di maglia, nome), retro con descrizione del ruolo, squadra e "In rosa 2026/27". Carte staff (ALL, VICE, PREP, DIR, RESP) con il ruolo come scritto nell'elenco del club e "Staff 2026/27".
- **Solo fonti esistenti**: `getPublicRoster` (r94 `scd_public_roster`: adulti nome completo, minori nome + iniziale) e `getStaffRoster` (`SCD_STAFF_ROSTER_JSON`); calendario per l'elenco squadre. Nessuna nuova fonte, nessun permesso cambiato. Anonimi: schermata "Riservato ai soci" senza dati; account senza tesseramento attivo: stato "Carte riservate ai tesserati".
- **Attività di base** (2014, 2015, Pulcini, Primi Calci, Piccoli Amici): solo il numero degli iscritti e le carte dello staff, mai carte giocatori (anche se la funzione restituisse nomi). Squadre senza staff indicato: stato vuoto esplicito. Autisti esclusi (seguono i pulmini, non le squadre).
- **Accessibilità**: ogni carta è un `<button>` con `aria-pressed`, Invio/Spazio la girano, faccia nascosta `aria-hidden`, focus visibile; con "riduci movimento" la carta cambia faccia subito senza rotazione.
- Link "Carte della rosa" in `/squadre` e "Apri le carte della rosa/dello staff" nella sezione Rosa di `/squadre/<squadra>`.
- Logica pura `src/lib/squadra-carte.ts` + 15 test (`squadra-carte.test.ts`: ordine per ruolo, etichette, codici staff, visibilità, abbinamento staff-annata, selettore). Componente `src/components/squadre/SquadraCarte.tsx`; entrambi aggiunti alla scansione `public-crest-policy.test.ts` (solo stemma ufficiale).
- **Dati mancanti**: `scd_public_roster` non ha numeri di maglia (al loro posto la lettera del ruolo, nessun numero inventato); lo staff per annata dipende dalle etichette `teams` dell'elenco dirigenti (es. "Prima", "U15", "2014", "Juniores", "Pulcini").
- QA: `tsc --noEmit`, vitest 155 file / 1696 test, `npm run build`, `test:manifest`, `test:claude-hooks` verdi. Playwright 390×844 e 1440×900 (pagina temporanea con dati d'esempio, eliminata prima del commit): fronte, carte girate (clic, Invio, Spazio), riduci movimento, base, riservato, vuoto; nessuno scorrimento orizzontale, nessun errore in console; `/squadre/carte` anonima = schermata soci.
- Revisione 15/10 sulle carte (BLOCK risolto): il loader di `/squadre/carte` riduce lato server i minorenni a nome + iniziale anche quando la funzione rosa r94 restituisce il nome intero ai soci (`cardName`), non manda nomi per le squadre di base e manda solo lo staff della squadra scelta, senza avatar, aree e autisti (`minimizeDeck`, test). Resta da decidere se `/squadre/$team` debba fare lo stesso (oggi segue la regola r94: nome intero ai soci attivi).

## 15/10/2026 10:04 · UD-135: home sul template di riferimento, niente sovrapposizioni

- Francesco: "non c'è un'idea e un template corretto, soprattutto le sovrapposizioni" + home Eurobet come punto di partenza (solo impaginazione: nessuna scommessa, quota o bonus in denaro) + aranzulla.it come riferimento per guide e mondo digitale (VR-023, VR-024).
- **Banner a carosello** (`home/HomePromo.tsx`, logica `lib/home-promo.ts` + test): angoli arrotondati, card bianca con etichetta gialla, titolo, una riga e un pulsante chiaro. Slide: "Entra nel mondo ColicoDerviese" (Registrati / Accedi, foto del lago e stemma), eventi pubblicati con la locandina intera, iscrizioni 2026/27, carte della rosa. Scorre ogni 6 s, si ferma al passaggio, al focus e al tocco, pulsante pausa, fermo con "riduci movimento", swipe nativo.
- **Pulsanti rapidi** con badge (gare rimaste della settimana o LIVE, NUOVO sulle carte): Gare, Allenamenti, Carte della rosa, Eventi, Tornei, Iscrizioni, Impianti, Partner. Sostituiscono i quattro riquadri e la testata vuota.
- **In evidenza**: la vetrina diventa schede orizzontali (immagine a sinistra, titolo, una riga, pulsante), senza i filtri per mondi sulla home pubblica.
- **Gare della settimana**: sulla home solo le prime 4 con "Vedi tutte le N gare" (la home non è un calendario).
- **Seconda scheda piccola**: "Campi e come arrivare" al posto dell'evento (l'evento è già nel banner e in evidenza: niente doppioni).
- **Sovrapposizioni**: l'avviso cookie tecnici diventa una striscia sottile agganciata sopra la barra sponsor (non più una card che copre i contenuti); sul telefono il pulsante di Vera sta sulla barra sponsor, nello spazio bianco riservato a destra, e aspetta che l'avviso cookie sia chiuso.
- Revisione (BLOCK risolto): striscia cookie in fondo nelle pagine interne; "Accedi" porta a `/accedi`; finché i moduli pubblici sono in pausa (`PUBLIC_FORMS_LIVE = false`) la slide iscrizioni, il pulsante "Iscrizioni" e la scheda in evidenza portano ai contatti ufficiali e non promettono richiami; niente "in un minuto"; pulsante Vera su telefono da 44 px centrato sul cappuccio bianco della barra sponsor, nascosto durante l'avviso cookie solo se chiuso e solo nelle pagine pubbliche; badge "Nuovo" più scuro (contrasto AA).

## 15/10/2026 10:36 · "sei lontano dal lavoro chiesto": idea, sovrapposizioni, banner (UD-135, secondo passaggio)

- Francesco: le tre cose più lontane sono l'idea generale, le sovrapposizioni e il banner in alto.
- **Banner come nel riferimento, con il nostro mondo**: scena composta sul lago (pallone disegnato in SVG, grande "2026/27" su pennellata gialla, motto in corsivo "la stagione è qui", stemma ufficiale grande), card bianca a sinistra con etichetta blu, titolo in grassetto, una riga, pulsante giallo "Registrati" e link "Accedi". Pronta la versione "50 crediti di benvenuto" (`WELCOME_CREDITS_LIVE`), spenta finché il registro crediti non li assegna davvero all'iscrizione.
- **Sovrapposizioni azzerate sul telefono**: l'avviso cookie tecnici sta nel flusso della pagina sotto la testata (scorre via, non copre nulla); il pulsante "Entra" della barra in basso resta dentro la barra (niente cerchio rialzato sopra i loghi sponsor); il pulsante di Vera è da 40 px, centrato sul cappuccio bianco della barra sponsor.
- Revisione (PASS con note): avviso cookie mostrato subito all'idratazione (un solo assestamento, niente salto dopo 900 ms); colore di riserva sotto la pennellata gialla; id dei gradienti del pallone unici per ogni istanza; motto a 17 px; pulsante Vera a 40 px su telefono per scelta (UD-135).

## 15/10/2026 11:20 · Studio dei riferimenti → prime azioni (condivisione WhatsApp)

- Studio completo dei 79 riferimenti in `claude/SCD_STUDIO_RIFERIMENTI_2026-10-15.md` (progetto), con piano unico di 20 azioni.
- **Azione A4/A11 — Condividi su WhatsApp**: pulsante su ogni gara non conclusa (righe della settimana in home, card "Prossima gara", righe di `/calendario`) con il foglio di condivisione del telefono o il link `wa.me`; testo con categoria, avversario, giorno, ora, campo e link diretto al calendario della squadra; mai nomi di persone (`lib/share-match.ts` + test, `scd/ShareWhatsApp.tsx`). Gli eventi hanno già `ShareButton`.
- Guida "Come funziona l'app" (`/guida`): già con indice per ruolo e passi numerati (stile Aranzulla) → KEEP; da aggiornare il testo sull'accesso quando la chat PC chiude il login con password.
- **Azione A1/C11 — Prossimo appuntamento e LIVE**: striscia sottile sotto la testata delle pagine pubbliche (non su home e calendario, che lo mostrano già) con "tra 3g 3h · Avversario – ColicoDerviese Prima" oppure "In campo ora" in rosso durante una gara; badge LIVE sul tab Calendario della barra del telefono. Dati dal calendario pubblico già in cache (`lib/club-pulse.ts` + test, `club-pulse.functions.ts`, una sola query condivisa aggiornata ogni 2 minuti).
- Revisione striscia (PASS con note): spazio riservato mentre arriva la risposta (niente salto), orologio del telefono corretto con quello del server, "Prossima gara:" per chi usa lo screen reader, badge LIVE a 10 px.
- **Azione A2/C1 — "Le mie squadre" nella settimana in home**: stella su ogni gara (44 px) per seguire quella squadra; il chip "Le mie squadre" compare solo quando si segue almeno una squadra e mostra solo le sue gare; stessa memoria locale del calendario (`scd.calendario.seguite.v1`), quindi la scelta vale in `/calendario` e in home. Sul telefono il tag Casa/Fuori sale nella prima riga accanto alla categoria e il campo va su una riga propria, così niente testo tagliato accanto a stella e condivisione (`lib/home-matchday.ts` + test, `home/HomeMatchday.tsx`).
- Revisione "Le mie squadre" (PASS con note): tolta l'ultima stella con il filtro attivo si torna a "Tutte" (chip e lista coerenti); scrittura con updater funzionale come in `/calendario`.
- **Azione A4 / piano 3 — "Chi sei? Ecco cosa trovi"**: tabella decisionale in fondo alla home pubblica (stile "quale strumento per quale utente" delle guide): Tifoso, Famiglia, Vuoi giocare con noi?, Mister e dirigenti, Sponsor e partner; per ognuno tre cose che trova, un pulsante all'area già esistente e il link alla sezione della guida. Finché i moduli pubblici sono in pausa la riga "giocare con noi" porta ai contatti ufficiali. Nessuna nuova fonte né pagina (`lib/home-who.ts` + test, `home/HomeWho.tsx`).
- Revisione "Chi sei?" (PASS con note): la riga "Vuoi giocare con noi?" promette solo ciò che le pagine danno davvero (allenamenti pubblici, prova e iscrizione via segreteria) con link "Gli allenamenti"; destinazioni tipizzate (niente cast), link secondari con etichetta per screen reader, titoli delle schede come intestazioni.
- **Pulizia pagine pubbliche (Francesco 15/10/2026 12:40 "procedi", chat PC, ramo `feat/pc-pulizia-pubblico`)**: menu "Tutte le pagine" senza i badge ONE/CORE/GROW (id interni restano in `site-menu.ts`, con il meccanismo `publicMenu: false` per togliere una pagina dal menu); piè di pagina senza la riga "versione del …" (data e hash restano in `data-build`); chip della home senza contatori e "NUOVO" (solo LIVE); per gli ospiti tolti i chip Allenamenti e Carte della rosa e la tile Allenamenti, che aprivano la schermata di accesso (test: nessun link della home ospite verso i prefissi riservati); testo di accesso allineato a UD-117/UD-120 ("e-mail o telefono e password; password dimenticata = codice via e-mail per sceglierne una nuova") in menu Entra, guida, conoscenza di Vera; `/sostieni` è superficie pubblica per l'assistente (Vera, non Sky, anche per gli ospiti); launcher della chat a 44 px su telefono. Motore: PERSONE.

## 15/10/2026 · Storia calciatori FIGC (chat PC, ramo feat/pc-figc-storia)

- **Storia calciatori FIGC**: pagina `/segreteria/storia` riservata a Direzione/Segreteria (chi resta, chi torna, chi arriva, chi non è tornato, stagione per stagione); importazione dal file esportato dal portale FIGC/LND con il segnalibro della Segreteria (solo anno di nascita, mai codice fiscale; file con data di nascita completa rifiutato); migrazione r131 in attesa di "applica r131". Motori: PERSONE (quota rientri, lista recupero per anno) e TEMPO (minuti di segreteria per aggiornamento). Direttiva UD-150.
- **Accesso via e-mail pronto da configurare (chat PC, 15/10/2026, ramo `feat/pc-accesso-email`)**: nuovi modelli Supabase in italiano "Reset Password" (pulsante "Scegli la password", serve anche per la prima entrata di chi ha un accesso pronto) e "Confirm signup", entrambi con link a prova di antivirus verso `/accedi/conferma`; invito senza più "senza password"; guida `EMAIL_GMAIL_SMTP.md` con Site URL, prova in 4 passi e inviti a gruppi. Testi dell'app corretti: per la password dimenticata arriva una e-mail con il pulsante, non un codice (il riquadro del codice non compare mai nel percorso). Motori PERSONE e TEMPO.
- **Consensi r132 (chat PC, 15/10/2026, ramo `feat/pc-r132-consensi`)**: migrazione `20261015_r132_consents_fix.sql` PRONTA, NON applicata (attende "applica r132"): `scd_person_consents` accetta anche IMMAGINE_NOME (Top 11, r90), COMM_EMAIL (opt-out e-mail, r95), PRESA_VISIONE_INFORMATIVA e PRESA_VISIONE_AUTISTA; al posto di unique(persona, tipo, versione) un indice "una sola scelta attiva" (revoca e nuovo consenso possibili, storico conservato), con controllo preventivo che si ferma mostrando solo i conteggi; nuove colonne facoltative given_by_role, channel, revoked_by_person_id. Nessun dato cambiato, nessun accesso allargato. Provata su Postgres 16 locale (applica, riapplica, conflitto, rollback). Motori PERSONE e TEMPO; misura: righe IMMAGINE_NOME/COMM_EMAIL e nuovi consensi dopo revoca.


## 15/10/2026 13:45 · Chat cloud: punti dell'audit della chat PC (5, 8, 9)

- **Porte chiuse (punto 5)**: tolta dal banner della home dei visitatori la diapositiva "Le carte della rosa" (etichetta "Nuovo", portava alla schermata d'accesso); la scheda "Top 11 della settimana — Vota" esce dalla vetrina pubblica e resta in quella dei soci, che possono votare; su /top11 il visitatore legge "Votano i tesserati del club: entra con il tuo account" con pulsante "Entra" (prima "iscriviti con un tocco"). Guardie nei test: nessuna diapositiva del banner verso pagine riservate; la Top 11 solo nel mondo "soci".
- **Codice morto (punto 8)**: rimossi `Carousel.tsx`, `PublicToday`, `HomeNewsBlock`, `nextHomeKickoff`; la home non scarica più `getHomeNews()` per poi scartarlo (né per i visitatori né per i soci). Nessun cambiamento visibile oltre al punto 5.
- **Processo (punto 9)**: lavoro su ramo `feat/cloud-audit-cleanup`, `test:bundle` (privacy dei ragazzi nel codice del telefono) eseguito dopo la build: 11/11.
- Revisioni (scd-revisore e scd-sicurezza: PASS con note, note applicate): il server dà il mondo "soci" della vetrina solo a una sessione che conferma lui (non al solo parametro del chiamante); `getHomeNews` e i suoi aiuti rimossi; messaggio del voto "Entra con il tuo account per votare"; /community "Votano i tesserati". Da decidere a Francesco: oggi il database lascia votare la Top 11 a qualunque account registrato (membership USER_BASE), non solo ai tesserati.
- **Niente vetrine fuori dalla home (Francesco 15/10/2026 13:54, ramo `feat/pc-niente-vetrine`, motore SOLDI/PERSONE, misura: 0 elementi a rotazione o in autoplay su /sponsor, /crm e kit partner, verificato a 390 e 1440 px)**: /sponsor senza ledwall a rotazione e senza fascia "In onda ora / Partner del mese"; listino con quattro schede uguali (niente "Pacchetto principale"); /crm "Spot LED" diventa un elenco, il video parte solo premendo play e la regia è solo testo; kit partner con anteprima ledwall ferma (`LedwallPreview`) e spot solo su richiesta; striscia contatori delle aree di lavoro rinominata "Oggi". Eliminati `LedwallRotator`, `LedwallFacsimile`, `PartnerBand`, `SponsorSpotsHome`, `universe/Stories`, `universe/HomeBlocks`, `AgeGuide` ("Chi sei"). Resta la barra sponsor fissa in basso e la rotazione del player fisico `/ledwall/player`.


## B4 — Accessibilità delle pagine pubbliche (home, /sponsor, /sostieni, /tornei, /pulmini, player LED) · 2026-10-15

Backlog cloud B4. Motori: PERSONE (famiglie e tifosi leggono e toccano tutto anche da telefono) e SOLDI (/sponsor leggibile per i partner). Dettagli e numeri in `docs/LAUNCH_QUALITY.md` → B4.
- Audit axe (WCAG A/AA) + bersagli 44 px esteso alle sei pagine; prima 39 problemi, dopo 0 (restano 3 bersagli piccoli nella schermata d'accesso di /pulmini, area chat PC).
- Occhielli gialli su fondo chiaro → blu del club (il giallo resta sulle superfici blu); etichette squadra delle gare scurite quanto basta per 4,5:1; crediti del piè di pagina e date dei tornei più leggibili.
- 44 px: puntini e pausa del banner (la riga va a capo se le slide sono tante), logo della testata, "Vedi tutte", striscia "Prossima gara" (il nome del partner nello spot è uscito con la rimozione delle vetrine su /sponsor, chat PC 15/10 13:54).
- Barra sponsor: si ferma sotto il puntatore o il dito; con "riduci movimento" è ferma. Test `home-motion.test.tsx`: la home non si muove mai da sola con "riduci movimento".
- Da decidere: pulsante di pausa da tastiera per la barra sponsor (linguetta "Sponsor").
- Revisione: scd-revisore PASS (note applicate: `flex-wrap` sui puntini), scd-sicurezza PASS.
- Stato: DONE, commit `47cadb5` + `6a07dc2` + `9792f2e` (merge `bdd8b06`), **pubblicato** 15/10 14:29 (Render `dep-db8cdhivcj2c739054f0`, live). Controllo sul sito reale 390/1440 su /, /sponsor, /sostieni, /tornei, /pulmini, /ledwall/player: HTTP 200, nessun errore in console, nessuno scroll orizzontale; axe sul sito reale: 0 violazioni e 0 bersagli piccoli su /, /sponsor, /sostieni, /tornei (sul player live l'audit non arriva a "rete ferma" entro 30 s; in locale 0).
- Prima di questo lavoro: staging (`aa108d7`, chat cloud) era avanti rispetto al live; pubblicato con Render `dep-db8c128u01pc73f90bf0`.



## 15/10/2026 14:40 · Chat cloud: calendario dell'app di nuovo allineato al master (piano di partenza, punto 1)

- **Diagnosi (VERIFIED sul sito live)**: il calendario mostrava "Copia di sicurezza del 09/10/2026 ore 22:36". La copia pubblica su Drive (`1xSQ2…`) non è condivisa con "chiunque abbia il link" (solo 4 account): l'app non l'ha mai potuta leggere e usava sempre la copia inclusa nel codice. Il connettore Drive non può sostituire il contenuto di un file esistente.
- **Convertitore** `tools/sync/calendar_public_payload.py` (con `--self-test`): dal foglio "MASTER EVENTI" alla copia `scd-calendar-public-v3` con le stesse regole della copia fatta a mano il 9-10/10 (rifatte confrontando le 156 gare riga per riga): fuori U18 ritirata, righe ritirate/riposo/rifiutate e amichevoli del club non confermate; avvisi e verifiche dagli stati del master; una correzione manuale del 10/10 conservata (orario ufficiale FIGC), quella dell'11/10 tolta (vedi Revisioni). Una categoria sconosciuta o un testo con e-mail/telefono ferma il giro.
- **Copia dell'app** `src/data/calendario-snapshot.json` generata dal master del 15/10 11:47 (validata con `validateMirror`): 156 gare; differenza che conta: **Esordienti 2014 – Rovinata di sabato 17/10 sul Campo 2** (master, "da confermare"). Le due amichevoli Pulcini del 18 e 24/10 restano fuori finché il club non le conferma nel master. La copia del 10/10 resta come dato di prova dei test.
- Manifest: consumatori di MASTER_CALENDARIO_2026_27 aggiornati.
- Revisioni (scd-revisore e scd-sicurezza: PASS con note, note applicate): il convertitore ha gli stessi controlli del validatore dell'app (parole RITIRAT/ANNULLAT/CANCEL, caratteri invisibili, lunghezze, date e orari veri: se qualcosa non torna si ferma invece di tagliare o indovinare); la correzione manuale resta solo per la gara del 10/10 (orario ufficiale FIGC) e vale finché il master ha ancora il valore di allora; tolta quella dell'11/10 (Penta Piateda, gara già giocata): il master ha la riga confermata dalla società l'08/10 alle 14:30, la copia del 09/10 diceva 15:00; vale il master finché la Direzione non indica l'orario reale. Test nuovo: la vecchia copia del 09/10 su Drive è rifiutata. `__pycache__/` nel `.gitignore`.

## 15/10/2026 15:10 · Chat cloud: calendario aggiornato ogni ora (scelta di Francesco: "copia nel repository")

- L'app legge per prima la copia pubblica sul ramo dati `data/calendar-public` (`calendar-public.json`, servito da raw.githubusercontent.com), poi la copia Drive; ogni canale passa da `validateMirror` e dalla regola "mai più vecchia della copia inclusa". Nessuna condivisione Drive cambiata, nessuna ripubblicazione del sito a ogni modifica.
- Ramo dati creato con la copia del master del 15/10 11:47. L'attività programmata "SCD Calendario · copia pubblica oraria" (testo in `docs/CALENDAR_HOURLY_TASK.md`) la rigenera ogni ora con `tools/sync/calendar_public_payload.py` solo se il master cambia, e può scrivere solo quel file su quel ramo.
- Manifest: nuovo consumatore di MASTER_CALENDARIO_2026_27. Test: ordine dei canali, solo https e mai il master, copia `text/plain` accettata e pagina HTML rifiutata.
- Revisioni (PASS con note, note applicate): l'app rifiuta anche una copia con data nel futuro (oltre 10 minuti: bloccherebbe ogni aggiornamento) e una copia con meno del 70% delle gare di quella inclusa; il canale del repository non segue rimandi; prima vince il primo canale valido (Drive è il vecchio canale). Attività: stessi controlli prima di pubblicare, openpyxl fissato a 3.1.5, nel commit solo il file del calendario, rigenera anche quando cambia il convertitore. Ritardo massimo tra master e app: circa 1 ora e 10 minuti.

## 15/10/2026 15:00 · Chat cloud: testi della Top 11 (decisione di Francesco)

- Francesco 15/10: il voto della Top 11 resta aperto a ogni account registrato ("lascia votare tutti", UD-137; UD-138 registra le sue scelte sul calendario orario). /top11 e /community non dicono più "votano i tesserati" ma "serve un account del club". Nessun cambio al database.

## 15/10/2026 15:45 · Chat cloud: un solo generatore del calendario, allineato alla copia approvata

- Alle 15:10 la chat PC e Francesco hanno rigenerato e condiviso la copia su Drive (171 gare, con le amichevoli del club da confermare). Alle 15:16 la chat cloud ha messo in linea per primo il canale del repository con la sua copia da 156 gare: le amichevoli Pulcini del 18 e 24/10 sono sparite dal sito per circa mezz'ora. Corretto alle 15:35 aggiornando il ramo dati con la copia allineata (171 gare, identica gara per gara a quella approvata).
- Convertitore `tools/sync/calendar_public_payload.py` allineato: le amichevoli del club si pubblicano anche da confermare, con "Orario o sede da verificare" + "Attesa verifica"; la correzione di Penta Piateda (15:00) resta come nella copia approvata, finché il master ha 14:30. Copia inclusa nell'app = stessa copia da 171 gare; test aggiornati ai numeri veri (171 gare, 92 in casa, 46 da confermare).

## 15/10/2026 15:40 · Macchina delle richieste, primo caso: amichevole (chat PC, ramo feat/pc-richieste-amichevole, UD-154)

- Nuova pagina `/segreteria/richieste` (Segreteria, Direzione, Direttore Generale, Coordinatore attività sportiva): "Nuova da messaggio" legge il testo della squadra (lettore deterministico: nessun dato inventato, campi incerti vuoti con avviso), bozza da correggere, ricerca della società avversaria o "Nuova società", invio a chi conferma, stato di ogni richiesta, moduli da preparare. Modulo stampabile A4 `/segreteria/richieste/$id/modulo` sui campi della scheda FIGC-SGS, con riga firma del Presidente e timbro; bozza e-mail per l'Ufficio Tornei da copiare (l'app non la invia).
- Card "Richieste da confermare" in La mia SCD per chi conferma: Responsabile Attività di Base (annate 2014–2021), DS Agonistica (U16, U15), DS Generale (Prima, Juniores), Direzione per tutti. I due ruoli DS non esistono ancora: finché Francesco non li crea conferma la Direzione. "Conferma entro" = il primo tra i 15 giorni e il preavviso federale (3 o 5 giorni lavorativi SGS; LND da verificare).
- Migrazione r133 (STAGED, NON applicata, serve "applica r133"): `scd_requests` generica, `scd_request_events` solo in aggiunta (anche avvisi in app a DG e Coordinatore), `scd_clubs`. Nessun dato di persone o minori. Provata su PGlite (ruoli, scadenze, idempotenza, log non modificabile). Finché non è applicata tutto resta chiuso con "Funzione in preparazione".
- Motori: TEMPO (ore dal messaggio alla conferma, minuti per modulo) e PERSONE (amichevoli confermate in calendario). Manifest: fonte SCD_RICHIESTE.
- Revisioni (scd-sicurezza e scd-revisore: PASS con note, note applicate): il messaggio della squadra non viene mai salvato (resta nel browser, si salvano solo i dati della bozza); telefoni ed e-mail tolti dalle note; campo solo tra quelli del club (Colico Campo 1/2, Colico, Dervio) o "Trasferta" con il paese; una richiesta modificata mentre aspetta la conferma torna in bozza; un'amichevole confermata si può annullare (evento interno annullato). Un solo calendario pubblico: alla conferma nasce un evento interno (solo staff) e il compito per la Segreteria "Copia nel Master Calendario" con la riga esatta da incollare; il testo dopo la conferma è "la Segreteria la inserisce nel calendario ufficiale".

## 15/10/2026 16:30 · Macchina delle richieste: riga del Master Calendario compatibile con il convertitore (chat PC, ramo feat/pc-richieste-master-row)

- Nota MEDIUM di scd-revisore prima di "applica r133": la riga da incollare nel Master Calendario ha ora un `EVENT_ID` stabile nello stile del master (`EVT-AMI-<squadra>-<aaaammgg>-<AVVERSARIA>-<CASA|FUORI>`), `SOURCE_TYPE` `SCD_INTERNAL` e `VENUE_STATUS` `TO_VERIFY` quando il campo non è noto. Un test passa la riga a `event_of()` di `tools/sync/calendar_public_payload.py` (Python, per ogni squadra, in casa e fuori): stessa squadra, id, data, ora e fonte "SCD".
- "Esordienti" senza annata non si manda e non si conferma (serve 2014 o 2015: il convertitore non lo saprebbe pubblicare); senza "casa o fuori" la richiesta non parte. Stesse regole in r133 (ancora STAGED, non applicata).
- La prova di r133 su PGlite è ora nel repository: `supabase/tests/r133_requests_machine.pglite.mjs` (comando in testa al file; PGlite non è una dipendenza dell'app e si installa in una cartella temporanea, quindi non gira nella CI). Motori: TEMPO (riga pronta, niente correzioni a mano) e PERSONE (l'amichevole confermata arriva davvero nel calendario pubblico).

## 15/10/2026 18:40 · "Installa l'app" in un tocco e contatto di Iride (chat PC, ramo feat/pc-installa-app)

- Francesco 15/10: "non la fa nemmeno scaricare ma solo utilizzare il link"; "il numero deve essere facilmente salvato come il link dell'app".
- `/installa` ha ora il vero pulsante **Installa l'app**: su Chrome, Edge e Samsung Internet apre la finestra di installazione del browser (evento `beforeinstallprompt`, catturato in `PwaManager` all'avvio); su iPhone in Safari mostra i 3 passi illustrati; su iPhone in altri browser o dentro WhatsApp/Instagram dice di aprire con Safari; se l'app è già aperta come app installata lo dice. Logica pura in `src/lib/install-prompt.ts` con test.
- Nuova scheda **Salva il WhatsApp della segreteria**: numero, "Salva il contatto" (`/iride.vcf`, solo contatti pubblici del club) e "Scrivi su WhatsApp" (wa.me); numero in una sola costante `SEGRETERIA_WHATSAPP` (`src/lib/install-link.ts`). Nell'app niente nome né avatar di Iride: vale UD-121 (una sola assistente nell'app, Vera) finché la chat cloud non allinea (scd-revisore 15/10).

## 15/10/2026 19:05 · /installa sulla tavola "installa-v2" + Iride + regola UD-155 (chat PC)

- Francesco 18:50 «la pagina fa schifo in tutto da inizio alla fine»; tavola "installa-v2" mostrata in foto (390 e 1440) e approvata alle 18:52 «va bene procedi».
- Pagina: notte blu sul lago con lo stemma ufficiale, titolo "L'app del club sul tuo telefono", "Uniti si cresce sempre!"; una sola scheda di azione (3 tocchi su iPhone, pulsante su Android, menu altrove, "già installata"); "Cosa trovi"; scheda Iride (avatar approvato 17:37, vCard, wa.me); QR in fondo sul telefono e per primo sul computer.
- Iride nell'app: Francesco 18:40 «vera non ce piu ce iride» e 18:52 su questa pagina. UD-155 aggiornata. Francesco 19:01 «Confermo l'eccezione in AGENTS.md»: unico caso di messaggi a terzi senza persona = risposte della Segreteria AI a chi le ha scritto per primo, entro i limiti fissi di UD-155. Agenti `scd-segreteria` (segretario generale) e `scd-iride` (responsabile di Iride).
- Revisione 1 (19:05): scd-sicurezza PASS con note, scd-revisore BLOCK. Correzioni: l'avatar di Iride è tolto dal ramo (file e voce in `config/scd-assets.v1.json` sono della chat cloud, ramo `feat/cloud-no-sky-chat`, UD-139); finché non arriva su staging la scheda mostra lo stemma ufficiale al suo posto. UD-155: niente più "Vera", fonti fino alle 19:06 (eccezione AGENTS.md 19:01, avvisi allo staff 19:05-19:06 come proposta), proprietario `scd-iride`, `scd-segreteria` fonte esperta. `scd-iride` non ha più strumenti per cambiare scenari Make: ogni modifica allo scenario attivo passa dal file nel repository, dalle due revisioni e dall'OK di Francesco con il diff. Manifest 3.39.0: `communications.messaging.whatsapp.ai_segreteria` e fonti `SCD_AI_SEGRETERIA_KNOWLEDGE`, `SCD_IRIDE_CONTACTS_BOOK`, `SCD_INTAKE_LOG`. Timer di "Copiato" annullato all'uscita dalla pagina.
- Controlli: tsc, vitest, build, test:bundle, test:manifest, test:claude-hooks (esiti nel commit di pubblicazione); revisione 2 di scd-revisore e scd-sicurezza sul diff aggiornato.

## 15/10/2026 18:55 · Chat cloud: Iride e Crovi nella chat dell'app, Sky fuori (UD-139)
- Francesco 18:40: «vera non ce piu ce iride - crovi per i piu giovani»; poi «altra chat gia ha impostato tutto e sa chi è iride … confrontati e poi continui».
- Ramo `feat/cloud-no-sky-chat`: nome visibile Vera → **Iride, l'assistente AI della segreteria** (la stessa Iride di WhatsApp, chat PC UD-155), con l'immagine approvata (tailleur blu e foulard arcobaleno) in `public/media/cast/iride/`, registrata APPROVED; Sky → **Crovi** per i soci più giovani e le aree riservate prima dell'accesso (iniziale "C" finché non c'è un'immagine approvata); via l'immagine di Sky dalla testata dell'area staff. Id persona, eventi e regole di accesso invariati; file della home non toccati (chat PC).
- Controlli: tsc, vitest 1813/1813, build, test:bundle 11/11, test:manifest, test:claude-hooks. Revisione: scd-sicurezza PASS (3 note basse, corrette), scd-revisore PASS (contratto da aggiornare: manifest 3.38.1, UD-139, questa voce; testo del pannello impianti corretto).
- Pubblicazione: solo dopo l'«ok chat» di Francesco sulla foto.

## 15/10/2026 20:45 · Chat cloud: grafica presa in carico dalla chat PC (ramo feat/cloud-grafica, non online)
- Francesco 19:42 (passaggio alla cloud, `claude/SCD_PASSAGGIO_GRAFICA_2026-10-15.md`) e 20:09 «Continua a lavorare con le indicazioni che ti stanno arrivando da PC fisso e chat».
- Uniti: `feat/pc-installa-app` (VR-025/VR-026, AGENTS.md), `feat/pc-grafica-tavole` (cornice e Home sulle tavole), `feat/cloud-no-sky-chat` (Iride e Crovi). UD-151, UD-152, UD-153 registrate dai documenti del progetto (il commit 1430278 non è più sul remoto). Manifest 3.39.2.
- Correzioni del passaggio: niente "In evidenza" né "In vetrina" nelle due home (UD-152; `getVetrina` resta per il LED); testata della Home compatta (titolo 32/52 px, spazi ridotti); invito "Iscriviti al club" piccolo al posto del pulsante giallo grande; avviso cookie in fondo alla pagina (non spinge più giù il primo schermo); pulsante "Tutte le pagine" nelle testate delle pagine-tavola su telefono; testo "Trovi tutte le gare nel calendario."; commenti Vera → Iride.
- Da decidere a Francesco: allenamenti visibili a tutti (15/10) contro UD-100 (13/10, squadre e allenamenti dentro): la pagina resta riservata finché non conferma.

## 15/10/2026 22:30 · Chat cloud: Home e fondo pagina riprogettati da zero sulla struttura Eurobet (ramo feat/cloud-grafica)
- Francesco 21:35 «avevo detto che bisogna cambiare idea di grafica»; 22:02 «non va bene la home»; 22:04 «in drive c'è un catalogo pieno di immagini… impostazione e parte finale fa schifo, la devi riprogettare da zero completamente partendo dallo stile Eurobet»; 22:26 «Vai vai» dopo le foto 390/1440.
- Home (`components/home/HomeLobby.tsx`): pillole delle squadre che giocano la settimana + Calendario + Eventi e tornei; un solo riquadro fisso "La gara della settimana" (monogramma del kit, scheda bianca, un pulsante); "In programma questa settimana" con schede gara di tutte le squadre e filtri; "Dal club" (locandina Christmas Lario Cup, kit 2026/27); "Per te" (telefono); "Perché la ColicoDerviese" (riconoscimenti verificati, squadre in calendario, campi); colonna destra su computer "Entra nel club". Nessun carosello, nessuna vetrina, nessuna mascotte; dati solo dal calendario pubblico.
- Fondo pagina in tre fasce (riconoscimenti, club/contatti/app, note legali), sempre senza indice di pagine (UD-116).
- Tolti: lago disegnato, quattro riquadri grandi, pannello sponsor duplicato, "Mondo Colico", elenco gare della vecchia Home. Catalogo immagini su Drive individuato (cartella ASSET UFFICIALI: maglie, motivo C, lago, forte), da usare nei prossimi passi con l'ok di Francesco.

## B7 — Vera "come arrivo al campo?": indirizzo e link Maps di Colico e Dervio · 2026-10-16

Backlog cloud B7. Motori: PERSONE (una famiglia o un nonno che chiede la strada riceve subito indirizzo e "Portami a … con Maps") e TEMPO (meno telefonate alla segreteria per la strada; nessuna chiamata al modello per questa domanda).
- Nuovo `lib/club-directions.ts`: indirizzi dei due centri (SED-COL Via Lido SNC, Colico; SED-DER Via Guglielmo Marconi 1, Dervio) letti solo dal master `config/scd-facilities.v1.json`; senza via confermata niente link e "indirizzo in verifica", mai una via inventata. Se la domanda nomina Colico o Dervio risponde solo per quel centro, altrimenti per entrambi; trasferte e "contro …" restano all'assistente generale (la sede è nella gara del calendario).
- Vera (`assistant.server.ts`): le domande sulla strada per i nostri campi ricevono sempre la risposta fissa con via + link Maps, non una parafrasi del modello. Motore a regole (`sky.functions.ts`): la stessa risposta prima degli intenti gara (prima "dove" rispondeva solo "Siamo a Colico (LC) · Alto Lago di Como").
- Link Maps unico (`lib/maps-link.ts`, senza dati importati) per la scheda "Come arrivare" di /impianti e per il contesto di Vera: stesso URL di prima su /impianti (verificato 390/1440), nessun cambiamento visivo.
- Test `club-directions.test.ts` (16): domanda "come arrivo al campo?" con via, comune e link Maps di Colico e Dervio; riconoscimento domande; trasferte escluse; niente link senza via; stesso link nel contesto di Vera.
- Revisione 1: scd-sicurezza PASS (nota: "dove" generico non deve dare le vie); scd-revisore BLOCK (e-mail/PEC/sede legale, "come vengo iscritto", pulmino/kit, campo di un altro comune) → corretto: serve un luogo fisico nostro, esclusi contatti, iscrizioni, pulmini, kit/maglie, trasferte, partite senza "in casa" e "campo di <altro comune>"; il "dove" generico del motore a regole rimanda a Impianti e Calendario; 17 casi negativi e 3 test su `answerPublic` (niente modello né contesto per la strada; safeguarding prima; contatti al modello).
- Gate: tsc, vitest 167 file / 1854 test, build, test:bundle 11/11, test:manifest PASS, test:claude-hooks 8/8.
- Revisione 2: scd-revisore PASS (note: "campo di calcio/allenamento" letto come comune → va al modello, che ha le vie nel contesto; aggiungere un caso di disagio vero al test di precedenza), scd-sicurezza PASS (nessun ReDoS, input ≤ 400 caratteri).
- Stato: DONE, commit `c78af3f` + `ddc022e`, **pubblicato** 16/10 03:14 (Render `dep-db8nk83l550s73ehpfb0`, live). Controllo sul sito reale 390/1440 su /impianti e /: HTTP 200, nessun errore in console, nessuno scroll orizzontale, link "Portami qui con Maps" identici a prima.


## 16/10/2026 · Planning annuale 2026/27 in /gestionale/planning (chat PC, ramo feat/pc-planning-annuale)

Motore: TEMPO (Direzione e staff vedono in una pagina gare, tornei ed eventi e scadenze della stagione). Richiesta di Francesco 16/10/2026 06:23 «mancano tutti i gestionali che avevo chiesto»; UD-038 ("analizzare il calendario annuale").
- Nuovo `lib/season-planning.ts`: unisce calendario ufficiale (171 gare, Master Calendario), tornei ed eventi già nell'app, scadenze quote (Direzione Generale 08/10/2026), scadenze federali SGS (C.U. n.18) e scadenze del Cervellone (solo con ruolo d'ufficio, via `scd_kb_search`). Mesi senza calendario pubblicato mostrati "—", mai 0.
- Pagina `routes/gestionale.planning.tsx`: stesso accesso delle altre pagine /gestionale (`getWorkAreaGate`, area `planning`); telefono: mese con frecce e righe con barra colorata; computer: 12 mesi e riquadri numerici. Nessun dato di minori, nessuna vetrina.
- Il riquadro "scadenze nei prossimi 30 giorni" resta "parziale" finché una fonte di scadenze non è collegata (oggi LND/CRL). Lettura del Cervellone non riuscita → "lettura non riuscita, riprova", non "serve l'accesso".
- Revisione 1: scd-sicurezza PASS; scd-revisore BLOCK (conteggio scadenze completo con LND scollegato) → corretto con test. Revisione 2: scd-revisore PASS.
- Nessuna migrazione, nessun cambio di ruoli o permessi.

## 16/10/2026 · Infermeria e Nutrizionista: r136 approvata ("Applica r136"), senza infortuni (chat PC, ramo feat/pc-infermeria-nutrizione)

Decisione di Francesco 16/10/2026 07:04 "Applica r136", poi "Senza infortuni per ora". Stato r136: **APPLICATA su SCD PULSE il 16/10/2026** dalla sessione principale (controlli prima: funzioni ricreate identiche alle live salvo le aggiunte, catalogo = live r100 + nutrizione senza le sezioni r101; dopo: RLS su cassette e DAE senza policy, helper non eseguibili da authenticated, nessun oggetto infortuni, guardia con "nutrizionista"). Quando si applica r101 il suo catalogo deve contenere "nutrizione"; non rilanciare r136 dopo r101. Motori: TEMPO (scadenze certificati, cassette e DAE senza carta; misura: certificati scaduti/senza data e dotazioni da controllare nella striscia KPI, tempo CREATED→TAKE delle richieste) e PERSONE (consulenza nutrizionista per le famiglie; misura: richieste ricevute e chiuse al mese).
- **Registro infortuni rinviato** al disegno dei consensi (UD-043, UD-047: dati di salute dei minori solo a persona, genitore e medico del club, con consenso): tolti da r136 tabella, funzione di salvataggio e letture; tolti dall'app card, KPI, testi e test. La sezione "infermeria" delle abilitazioni torna a "mai dati di salute dei minori".
- **Richieste al nutrizionista riservate**: entrano come RISERVATO e `scd_proposal_queue` (r79) è ricreata identica tranne il filtro `area <> 'nutrizione'` (mai nella coda dell'ufficio); le vede solo la nutrizionista (e la Direzione) in /nutrizionista. Testi: è la nutrizionista che ricontatta il genitore.
- `scd_health_staff`: solo collegamenti di identità verificati (AUTO_VERIFIED, VERIFIED_BY_STAFF); Direzione = ruolo DIRECTION o incarico "direzione", come l'app. Helper `scd_health_staff` e `scd_health_short_name` non eseguibili da anon/authenticated.
- Ignoto mai zero: null dal database → "Non hai l'abilitazione"; errore generico → "Lettura non riuscita, riprova"; distinti da "serve applicare r136". Ricarica fallita dopo un salvataggio → "Salvato, ricarica la pagina". Certificati: una riga per atleta (distinct on), KPI senza doppi conteggi.
- Abilitazioni r100: la pagina resta aperta per incarico (GAP-ACCESS-R100), note di registro e manifest corrette; per l'Infermeria la pagina abilitazioni offre solo Tutto e Sua sede (`uiPerimeters`). Incarico sconosciuto al database: frase chiara (per "Nutrizionista" serve r136).
- Gate: tsc 0, vitest 168 file / 1895 test, build 0, test:bundle 11/11, test:manifest PASS, test:claude-hooks PASS, PGlite r136 89 controlli. Screenshot 390/1440 di /infermeria e /nutrizionista (staff e famiglia), nessun overflow né errore.

## /gestionale/struttura — Attività in struttura di Colico e Dervio + r135 · 2026-10-16 (chat PC, ramo feat/pc-attivita-struttura)

Francesco 15/10/2026 14:33 e 16/10/2026 06:23. Motori: TEMPO (chi apre, chi chiude, quali turni sono scoperti, visti in un posto invece che al telefono) e PERSONE (volontari e soci trovano le attività serali); SOLDI indiretto (serate Club House). Misura: turni scoperti per settimana e serate Club House contate dal registro r135 (applicata il 16/10/2026).
- Pagina di sola lettura `/gestionale/struttura` (area "struttura" del registro, stesso gate delle aree di lavoro): settimana delle due sedi con allenamenti del Quadro settimanale (solo Colico), gare in casa del Master Calendario e, quando r135 risponde, turni volontari, aperture, chiusure, attività serali ed eventi. Responsabile = ruolo, mai un nome; nessun dato di minori.
- Dervio non ha righe di allenamento nel Quadro: la sua attività non è nota e non mostra mai 0. Nel selettore di sede "—" con "dato non completo" per i lettori di schermo; con sole gare in casa il numero con "solo gare"; con righe r135 "parziale". La tessera KPI dice "attività note in settimana" con "allenamenti solo Colico".
- Errori di lettura r135: messaggio di permesso solo per il codice 42501; ogni altro errore "Lettura non riuscita, riprova più tardi" e nel log del server solo il codice. Selettore di sede con pulsanti `aria-pressed`; `aria-live` solo sull'etichetta della settimana.
- **r135 (`supabase/migrations/20261016_r135_structure_activities.sql`): APPLICATA su SCD PULSE il 16/10/2026** (VERIFIED: sessione principale, dopo «Applica r135» di Francesco delle 06:56; nome migrazione `r135_structure_activities`; mai sul progetto dfnwzwutvnwiitiffwvr).
  - Controlli prima dell'applicazione (VERIFIED sul progetto vivo): `scd_organizations` presente (r33); `scd_has_org_role` presente (r35); `scd_has_position` presente (r74) e legata a `auth.uid()` su un'iscrizione attiva; enum `scd_role` con DIRECTION e SECRETARIAT.
  - Controlli dopo l'applicazione (VERIFIED): RLS attiva su `scd_structure_activities`; 0 policy; nessun select per anon e authenticated; `scd_structure_week` SECURITY DEFINER eseguibile solo da authenticated; `scd_structure_reader_site` non eseguibile da authenticated; 0 righe.
  - Contenuto: Tabella `scd_structure_activities` con RLS senza policy né grant; lettura solo con `scd_structure_week` (SECURITY DEFINER, Direzione, Segreteria e posizioni di struttura, massimo 42 giorni); `scd_structure_reader` revocata anche ad `authenticated`; titolo e note rifiutano e-mail e numeri di telefono (separatori spazio, punto, barra, trattino). Prova PGlite: `supabase/tests/r135_structure_activities.pglite.mjs` (exit 0).
  - Pagina quando il registro non viene letto (mai "da applicare"): funzione assente sul database → "Registro non raggiungibile, riprova più tardi"; nessuna sessione o nessuna organizzazione del club → "Accesso al registro non collegato al tuo profilo club"; in entrambi i casi i KPI dei turni restano "—". Risposta del database malformata → `activities: null` (mai una settimana vuota) e "Lettura non riuscita, riprova più tardi". Un solo `role="alert"`, solo per l'errore di lettura; il riquadro turni non ripete il messaggio.
- **Dervio riservato (UD-156).** Francesco 16/10/2026 06:56 «Applica r135» e 06:57 «Dervio decido io e responsabile attività di base e coordinatore attività sportiva e presidente e segreteria sempre informata». Motori: TEMPO (le decisioni su Dervio restano a chi le prende, la Segreteria informata senza telefonate) e PERSONE (un responsabile chiaro per sede). Misura: righe Dervio visibili solo ai lettori ammessi (prova PGlite r135); con la futura scrittura, quota di modifiche Dervio con notifica alla Segreteria (obiettivo 100%).
  - r135: nuova `scd_structure_reader_site(organizzazione, sede)` (sql, stable, search_path fisso, revocata a public/anon/authenticated). COLICO: ruoli DIRECTION e SECRETARIAT + posizioni dell'area "struttura" (invariato). DERVIO: ruoli DIRECTION e SECRETARIAT + solo presidente, direttore-generale, coordinatore-attivita-sportiva, responsabile-attivita-base. `scd_structure_reader` resta il cancello "almeno una sede"; `scd_structure_week` ora risponde `{ readableSites, activities }` con le sole righe delle sedi leggibili. Specchio TS `STRUCTURE_READER_POSITIONS_BY_SITE` e `structureReadableSites` in `lib/structure-activities.ts`, uguaglianza verificata da `structure-migration.test.ts`. PGlite: responsabile-struttura-dervio, responsabile-campi e responsabile-struttura-colico non ricevono righe DERVIO; responsabile-attivita-base, Segreteria e Direzione sì.
  - Pagina: il risultato del server dice quali sedi sono leggibili (`readableSites`: dal database quando r135 risponde, altrimenti dalla stessa regola sulla sessione verificata; senza sessione nessuna). Chi non legge Dervio vede il selettore Dervio disabilitato con "riservato" (mai 0, mai "—"); nessuna voce né KPI di Dervio entra nei numeri. Colico resta aperta a chi entra nell'area.
  - **Regola per la futura scrittura (non ancora implementabile: r135 non ha scritture): "Segreteria sempre informata".** Ogni inserimento, modifica o annullamento di una riga DERVIO dovrà notificare la Segreteria nell'app (nessuna e-mail o messaggio a terzi). Va realizzata insieme alla funzione di scrittura e al suo modulo; una funzione di scrittura senza questa notifica è da respingere in revisione. Scritta anche nell'intestazione di r135.

## /gestionale/struttura — scrittura delle attività + avviso alla Segreteria + r137 STAGED · 2026-10-16 (chat PC, ramo feat/pc-struttura-scrittura)

Francesco 16/10/2026 08:53 (UD-159) «le attività le decido nel gestionale io e il presidente» e 06:57 (UD-156) «segreteria sempre informata». Motori: TEMPO (DG e Presidente decidono in un posto solo; la Segreteria sa di ogni cambio senza telefonate) e PERSONE (volontari e soci vedono la settimana aggiornata). Misura: attività scritte dal gestionale per settimana (`scd_structure_activity_events`), quota di avvisi della Segreteria chiusi entro 48 ore (`scd_proposals` macchina `G04`), modifiche fatte fuori dal gestionale (editor SQL) che scendono a zero.
- **r137 (`supabase/migrations/20261016_r137_structure_activities_write.sql`): STAGED, NON applicata. Si applica solo dopo «applica r137».** Prerequisiti: r135 (applicata), r79 coda lavori (`scd_proposals`, `scd_proposal_events`: UNVERIFIED sul progetto vivo finché non controllata al momento dell'applicazione), r35, r74. Se r135 o r79 mancano la migrazione si ferma da sola.
  - Scrivono solo ruolo DIRECTION o posizioni presidente / direttore-generale (`scd_structure_writer`, specchio `STRUCTURE_WRITER_ROLES/POSITIONS` in `lib/structure-activities.ts`, uguaglianza verificata da `structure-write-migration.test.ts`). Segreteria, responsabili di struttura, coordinatore e responsabile attività di base leggono ma non scrivono.
  - `scd_structure_activity_create / _update / _cancel`: SECURITY DEFINER, search_path fisso, 42501 per chi non scrive, controllo dei dati (sedi, aree, tipi, titolo 2–80, giorno tra 7 giorni fa e un anno, orari di Roma con fine dopo mezzanotte = giorno dopo, ruolo come id, note e motivo senza e-mail né telefoni). Una modifica che non cambia nulla non scrive nulla; un'attività annullata non si modifica più; nessuna riga viene cancellata.
  - **Segreteria sempre informata**: ogni inserimento, modifica o annullamento (Colico e Dervio) crea un avviso nella coda esistente `scd_proposals` (macchina `G04`, area `segreteria`, tipo `ALTRO`, fonte `MANUAL`), visibile in `/gestionale/coda`; nessuna tabella nuova di notifiche, nessuna e-mail o messaggio a terzi. Etichetta `G04: "Attività in struttura"` aggiunta a `MACHINE_LABEL` della coda. Revisione 1 (scd-revisore BLOCK, corretto): gli avvisi DERVIO sono generici («Struttura Dervio: nuova attività — apri Attività in struttura», senza titolo, giorno, ora, tipo né motivo) perché la coda la leggono anche posizioni d'ufficio che non leggono Dervio (es. tesoreria); prova PGlite con un utente solo tesoreria. Voce `structure_activities_write` nel manifest (STAGED). Stessa scelta dell'organizzazione con controllo del ruolo per lettura e scrittura (`structureOrganization`); sotto il titolo «Nessun nome di persone, mai di minori».
  - Registro di controllo `scd_structure_activity_events` (solo aggiunte: un trigger rifiuta update e delete; RLS senza policy né grant).
  - `scd_structure_write_access(org)` dice alla pagina se mostrare il modulo; se manca (r137 non applicata) il modulo resta chiuso.
  - Prova su PGlite: `supabase/tests/r137_structure_activities_write.pglite.mjs` (carica i file veri di r79 e r135; permessi, avvisi, validazioni, annullamento, registro non modificabile, grant).
- Pagina: scheda "Decidi le attività" (nuova attività, "Modifica" sui turni registrati, "Annulla attività" con motivo facoltativo) solo quando il database risponde canWrite. Chi è DG/Presidente/Direzione per sessione ma senza r137 legge «Scrittura non ancora attiva…»; con un controllo fallito «Scrittura non disponibile ora». Nessuno stato ottimistico: dopo il salvataggio la pagina rilegge la settimana. Errori in parole semplici; nel log del server solo il codice.

## 16/10/2026 07:00 · Chat cloud: Home come pagina social del club (ramo feat/cloud-grafica)
- Francesco 05:59 (loghi in alto con link CR Lombardia e Monza, niente partita singola grande, annate e anni di nascita, fondo pagina leggero), 06:21 (barra stile Facebook, tocchi Instagram e TikTok, calendario forte solo da venerdì), 06:35 (effetto «fammi iscrivere», 99% telefono, spazio Pixellot), 06:51 «concentriamoci su creare la home e renderla pubblica», 06:55 «andiamo a mille per pubblicare».
- Home (`components/home/HomeLobby.tsx`): profilo del club in alto come una pagina Facebook/Instagram (copertina con la foto ufficiale del lago senza campo né persone, stemma come immagine profilo, numeri veri: squadre e gare in calendario, riconoscimenti; Iscriviti / Messaggio a Iride / Accedi; i tre riconoscimenti con i link ufficiali); cerchi delle squadre con gli anni di nascita (scorciatoie al calendario, non storie); barra che scorre con le prossime gare; schede Post · Partite · Video (da venerdì a domenica si apre su Partite, dal lunedì al giovedì su Post); post del club con «Mi piace» e «Commenta» che portano all'iscrizione; riquadro «Solo per chi è dentro»; spazio dirette Pixellot con le gare in casa a Colico.
- File del prompt di Iride riportato com'è su staging (area della chat PC).


## 16/10/2026 07:30 · Chat cloud: Home semplice, barra delle gare, "In che anno sei nato?", "Stasera al campo" (UD-140)
- Francesco 07:05 «sembra una accozzaglia di cose, io non capisco nulla»; 07:07 «i 3 loghi in alto sulla barra, scontornati e piccoli, il Monza un po' più grande»; 07:10 «togli il calendario così grande, fai una barra sopra che gira con link calendario e allenamenti; renditi creativo, virale e geniale»; 07:18 «rendere viva e accattivante la parte allenamenti: club house aperta e servizio pulmino»; 07:20 risposte: orari di tutte le squadre visibili, Club House lun–ven 17:00–21:00, pulmino con zone e richiesta.
- Barra blu: i tre marchi ufficiali scontornati su una piccola targa bianca (CR Lombardia e Monza con link, Monza più grande); campanella solo su computer.
- Home in pochi blocchi: barra sottile con le prossime gare che scorrono e i pulsanti Calendario e Allenamenti (per i soci, prima l'accesso); copertina con la foto del lago, stemma, nome, un solo "Iscriviti gratis" e il conto alla rovescia alla prossima gara in casa; "Stasera al campo" (allenamenti di tutte le squadre a Colico con orario e campo, Club House aperta, servizio pulmino con le quattro zone e "Richiedi il posto"); "In che anno sei nato?" (tocchi l'anno e vedi squadra, campionato e prossima gara); "Dal club" con tre notizie diverse.
- Tolti: calendario grande, schede Post/Partite/Video, "Mi piace/Commenta", spazio dirette (Pixellot resta privato: nessuna promessa di dirette in pubblico), codice della vecchia home (HomeBoard, home-tiles, BrushStroke).
- Contratto: UD-140 in `config/user-directives.v1.json`, manifest 3.39.3 (calendario e comunicazioni: in Home solo orari, campi e squadre degli allenamenti; quadro completo per i soci). I badge dei pulmini restano interni (mai su pagine pubbliche): in Home solo i nomi delle zone.
- 07:36 Francesco «non c'è niente per i giovani e appassionati»: nuovo blocco "Gioca con la ColicoDerviese" (Fantacalcio SCD grande, Top 11 da votare, Crea il tuo campione dopo l'accesso, La casa dei tifosi), copertine stile creator con numeri grandi; quei giochi non si ripetono in "Dal club".
- Revisione 1: scd-sicurezza PASS (nota bassa sulla data corretta); scd-revisore BLOCK → corretto: numero di squadre contato per gruppo ("U15 + U12" = 2), tolti "Porte aperte" e "Vieni a vederci" (etichetta "Orari allenamenti"), "Registrati all'app, è gratis" al posto di "Iscriviti gratis" (l'iscrizione del figlio alla società è un'altra cosa), la serata pubblica la sceglie il server con l'ora di Roma (nessuna data dal browser, una sola serata), dopo l'ultimo allenamento si passa alla serata successiva, "Campo intero" per la Prima squadra a campo intero, pulsante pausa sulla barra delle gare, "in casa con / fuori casa a" e "orario da definire" al posto di simboli, pallino fisso sul conto alla rovescia, codice inutilizzato tolto, test su ora di Roma (cambio d'ora 25/10) e prossima gara in casa.

## 16/10/2026 12:20 · Chat PC: rilascio release/pc-20261016 (Francesco 11:52 «pubblica»)
- G14 Rubrica «chi fa cosa» (`lib/chi-fa-cosa.ts`, 82163ec + 103bcbe): solo logica pura e test, nessuna pagina né migrazione; decisioni di Francesco 16/10 11:58 (emergenze struttura Dervio, DG conferma come Direzione, decidono Presidente e Consiglio Direttivo su sponsor, minori, salute, impianti). Oggi la importano solo i test: agli utenti non arriva nulla.
- G03 Rotazione gare Dervio (`lib/dervio-rotation.ts`, eb680f1): solo logica pura e test; 1 gara a settimana dai più piccoli dal 24/10, luci ok, nota U16, inverno solo segnalato, pioggia ≥ 50% o ≥ 1 mm (decisa 12:04), FIGC e avversaria solo se si torna a Colico. Pagina richiesta alla chat cloud.
- Orchestra (a67b01b): agenti, PIPELINE, registro comandi e tavola gestionali (solo documenti e istruzioni agenti; permessi degli agenti solo ridotti).
- Controlli: scd-revisore PASS e scd-sicurezza PASS sul rilascio 641030b.

## B8 — Anteprime dei link: titolo, descrizione, immagine e indirizzo canonico per ogni pagina pubblica · 2026-10-16

Backlog cloud B8. Motori: PERSONE (un link girato su WhatsApp mostra il nome giusto della pagina e lo stemma, non il generico "Super App") e SOLDI (/sponsor, /card e /sostieni si presentano bene quando un partner o un genitore li inoltra). Misura: 0 pagine pubbliche con il titolo generico (test `public-meta.test.ts`).
- Prima: nessuna delle 15 pagine pubbliche senza pulsante di condivisione aveva og:image, og:url o indirizzo canonico; fantacalcio, guida e Top 11 ereditavano anche og:title e og:description generici del frame ("S.C.D. ColicoDerviese — Super App"). TanStack sostituisce i meta per nome/proprietà ma concatena i link: il canonico sta solo nelle pagine, mai nel frame.
- `lib/share.ts`: `PUBLIC_PAGES` (home, calendario, eventi, lezioni tecnico-coordinative, impianti, società, kit, tifosi, comunicazioni, Top 11, rassegna stampa, fantacalcio, guida, card, fornitori) con i testi che ogni pagina aveva già; immagine sempre lo stemma ufficiale (`CREST_SHARE_IMAGE`) o la locandina ufficiale della Christmas Lario Cup; `canonicalUrl()` (origine ufficiale, solo percorso, senza ?lang= né #) e `pageHead()` (meta + link canonico). Anche le pagine C3 (sponsor, sostieni ×4, tornei, Christmas Lario Cup, lotteria interna) e /card/<tipo> passano da `pageHead()`; og:url = indirizzo canonico.
- Fuori perimetro e non toccate (chat PC o safeguarding): /contatti, /elimina-account, /entra, /installa, /partner, /privacy, /safeguarding — elencate nel test con il motivo.
- Test `public-meta.test.ts`: ogni pagina pubblica usa la propria voce del registro, titoli e indirizzi canonici unici, mai il titolo generico, og:image esistente in public/, un solo canonico, ogni prefisso di `PUBLIC_PREFIXES` coperto o assegnato ad altri. Controllo SSR locale: un `<link rel="canonical">` per pagina, anche dopo l'idratazione.
- Nessun cambiamento visivo (solo `<head>`): controllo locale 390/1440 di /, /calendario, /kit, /card/sostenitore, /eventi/christmas-lario-cup, /sponsor: HTTP 200, nessun errore in console, nessuno scroll orizzontale.
- Gate: tsc 0, vitest 185 file / 2679 test, build 0, test:bundle 11/11, test:manifest PASS, test:claude-hooks PASS.
- Revisione 1: scd-revisore PASS, scd-sicurezza PASS (solo note basse). Note applicate: le versioni ?lang=de/en della Christmas Lario Cup sono canoniche di sé stesse (hreflang coerente); pagina lotteria non pubblicata e card inesistente senza canonico (noindex); og:description della Top 11 "votata da chi ha un account del club"; `siteUrl` documentato come origine configurata, mai un'intestazione della richiesta. Nota: in home `twitter:card` passa a "summary" (stemma quadrato).
- Revisione 2: scd-revisore PASS (residuo basso facoltativo: /eventi/lezioni-tecnico-coordinative in 404 porta ancora il canonico), scd-sicurezza PASS (nessun rilievo).
- Stato: DONE, commit `56f000c` + `bd28c9b`, **pubblicato** 16/10 14:22 (Render `dep-db91deei0phs739beon0`, live). Controllo sul sito reale 390/1440 su /, /calendario, /kit, /card/sostenitore, /eventi/christmas-lario-cup, /sponsor, /top11: HTTP 200, nessun errore in console, nessuno scroll orizzontale, un solo canonico per pagina; ?lang=en canonico di sé stesso.

## 16/10/2026 14:40 · Chat PC: catalogo ruoli r138 (STAGED, UD-161)
- Francesco 13:32 (direttori sportivi agonistica e generale, lettori di Dervio), 13:35 (tutti i ruoli FIGC/RASD pronti per inserire il tesserato e «crea ruolo nuovo»), risposte D1 «Chi lo crea» (approva chi crea, sempre in audit), D2 «Sopra il coordinatore», D3 «Sì, crea gli accessi» (responsabile tutela minori solo nel canale Safeguarding, fisioterapista avvisi di salute senza dati di salute).
- Migrazione r138 scritta e provata in PGlite, NON applicata: 85 ruoli vuoti con la qualifica del Portale Società LND (verificata in sola lettura alle 14:30, nessun nome), 24 qualifiche da allenatore come dato del tecnico, ruoli nuovi solo Presidente/DG; i quattro ruoli nuovi li assegna solo la Direzione.
- Finché r138 non è attiva l'app non offre, non avvisa e non usa i quattro ruoli nuovi (controllo sul server, una volta per richiesta): le richieste U16/U15/Prima/U19 le conferma la Direzione.
- 14:39 Francesco «queste sono tutte le cariche che si possono inserire in organigramma federale» (Anagrafe Federale FIGC, Variazione organigramma): ogni carica è nel catalogo (colonna `figc_labels`, testo esatto FIGC), 23 voci collegate a ruoli già presenti e 33 ruoli nuovi, in tutto 118 ruoli vuoti. Le voci tagliate o nascoste negli screenshot (GAP, «Medi…») sono solo annotate, non diventano ruoli.
- Revisione: scd-sicurezza PASS (r138Live tolto dallo schema dell'input di chi-fa-cosa, ora arriva solo dal server), scd-revisore PASS con note recepite (caso D1 nel test PGlite, controllo prerequisito `scd_structure_reader_site`).
- Test PGlite: comando in `supabase/tests/README.md` (`PGLITE_DIR=/tmp/scd-pglite node supabase/tests/r138_position_catalog.pglite.mjs`).
- 15:05 r138 APPLICATA su SCD PULSE dalla sessione principale dopo «applica» (sha1 70c939be…, 118 righe, probe-r138 ok): i quattro ruoli nuovi si accendono da soli.

## Dervio: niente preavviso al Comune gara per gara · 2026-10-16

Decisione di Francesco (DG) del 16/10/2026: «comune lasciamo stare per ora avvisato sul programma, importante solo figc e squadra avversaria in caso di spostamento a colico per mal tempo» (con «inverno si ma se piove no», «luci Dervio ok», «u16 anticipa ma u16 gia gioca di sabato a colico», già in `lib/dervio-rotation.ts`). Motore: TEMPO (la segreteria non insegue più un avviso al Comune a 30 giorni che non serve). Misura: 0 testi dell'app che chiedono l'avviso al Comune a 30 giorni (test `rotation`, `facility-assistant`, `bookings-register`); avvisi FIGC e avversaria chiusi entro il giorno della decisione meteo (checklist `dervio-rotation`).
- `lib/rotation.ts`: tolto `NOTICE_DAYS = 30` (Comune). Ora `TEAM_NOTICE_DAYS = 14` (avviso alla squadra, stesso valore di `DEFAULT_LEAD_DAYS.teamNotice`, che ora lo riusa), `RAIN_MOVE_NOTICE_TO` (FIGC LND/SGS e squadra avversaria) e `COMUNE_DERVIO_NOTE`. L'avviso in ritardo `dv-notice-late` riguarda la squadra ed è "warn", non più "crit".
- `lib/facility-assistant.ts` (Chiedi a Iride): le risposte su avvisi e Dervio dicono che il Comune è già informato con il programma stagionale, avviso alla squadra 14 giorni prima, con pioggia e ritorno a Colico avviso a FIGC e avversaria. Affitti e tornei a Dervio: fuori programma, decide la Direzione (nessuna scadenza inventata).
- `lib/bookings-register.ts`: la colonna del master "Avviso Comune" resta (è del foglio Drive) ma vale "Proposta, da confermare: fuori dal programma stagionale, decide la Direzione" a Dervio e "Non serve" a Colico; la scheda per la Direzione non segnala più "GIÀ IN RITARDO" e per una gara a Dervio ricorda FIGC e avversaria in caso di maltempo.
- Testi di Impianti e campi (Dervio, Simulazione, Colico, Panoramica, Iride) e Modulistica della segreteria ("Avviso cambio campo per maltempo (FIGC e squadra avversaria)" al posto della lettera di preavviso al Comune). Logica approvata di `lib/dervio-rotation.ts` invariata.
- Controllo locale 390/1440 di /gestionale/impianti/dervio e /simulazione (anteprima staging, build di produzione): nessun errore, nessuno scroll orizzontale.
- Gate: tsc 0, vitest 184 file / 2684 test (0 falliti), build 0, test:bundle 0, test:manifest 0, test:claude-hooks 0.
- Secondo commit: «luci Dervio ok» (la simulazione parte con le luci disponibili, `DERVIO_LIGHTS_OK`; nota luci di Dervio non più "da verificare con il Comune") e «inverno si ma se piove no» (scheda Dervio: si usa anche in inverno, se piove la gara torna a Colico, al posto di "Niente tornei invernali"); frasi allineate nelle tavole `Rotazione-Dervio.dc.html` e `Segreteria.dc.html`; direttiva UD-162 in `config/user-directives.v1.json` (UD-161 è riservato al ramo `feat/pc-r138-catalogo-ruoli`). La riga dell'arbitro in `lib/dervio-rotation.ts` resta in attesa di Francesco.
- Terzo commit (revisione scd-revisore BLOCK su 4afc6ef, scd-sicurezza PASS): unito `origin/staging/superapp` (UD-161 r138 prima di UD-162); la regola su affitti e tornei a Dervio non è di Francesco e compare ovunque come "Proposta, da confermare" (`DERVIO_OFF_PROGRAMME_PROPOSAL`, campo `proposed` con stato PROPOSED in UD-162); tolto "solo" dagli avvisi per pioggia finché Francesco non risponde sull'arbitro; avviso alla squadra in ritardo sempre "warn" (scheda Dervio e Iride); sottotitolo Dervio: "finché la Direzione non approva e la LND non autorizza la variazione".
- Quarto commit: Francesco 15:18, alla domanda «in caso di pioggia l'arbitro va avvisato anche lui, oppure no?», risponde «no va avvisato la figc». Con pioggia e ritorno a Colico la società avvisa solo FIGC (LND/SGS) e la squadra avversaria; l'arbitro lo avvisa la FIGC. `lib/dervio-rotation.ts`: voce `opponent-referee-notice` rinominata `opponent-notice` («avviso alla squadra avversaria»), la voce FIGC dice «che avvisa l'arbitro»; "solo" ripristinato in tutti i testi dell'avviso per pioggia (app e tavola Rotazione-Dervio); UD-162 aggiornata con la frase delle 15:18 e la domanda chiusa; nelle tavole Rotazione-Dervio e Segreteria i chip dell'avviso alla squadra passano da "crit" a "warn". Test: nessun avviso all'arbitro da parte della società.

## 16/10/2026 · Chat PC: Vetrina richieste fase F1 + r139 STAGED (UD-163)
Decisioni di Francesco 16/10/2026 15:44: «Esterni Tally, soci app» e «Li crea la Tesoreria» (prima: «DG conferma tutto», 13:31). Motori: TEMPO (un solo catalogo al posto di mail e telefonate, chi decide avvisato subito nell'app) e SOLDI (quote dei tornei e affitti dei campi seguiti dall'accettazione al riscontro). Misura: richieste al mese per tipo, ore mediane da «Ricevuta» alla decisione, quota di accettate «Riscontrato» entro 7 giorni da «Link inviato».
- Migrazione `supabase/migrations/20261017_r139_requests_intake.sql` scritta e provata in PGlite, NON applicata: il catalogo r133 `scd_requests` si apre ai tipi esterni Iscrizione torneo, Sponsor, Convenzione, Affitto campo, Visita ai centri, Altro (fasi Ricevuta → In valutazione → Accettata | Non accolta → In gestione → Chiusa); recapiti degli esterni in una tabella separata: i recapiti hanno una scadenza (proposta: 6 o 12 mesi); la cancellazione automatica si attiva con un job da creare; ingresso `scd_request_ingest` solo per il ruolo di servizio (futuro scenario Make del modulo Tally), con lista bianca dei campi, adulto e consenso privacy obbligatori, telefoni, mail e parole di salute tolti dal testo libero; pagamento registrabile solo dalla posizione Tesoreria e solo dopo «Accettata» (niente link per sponsor e convenzioni: contratto e fattura); le letture r133 delle amichevoli tornano a mostrare solo amichevoli.
- App: primo blocco di /gestionale «Vetrina richieste» (contatori per fase, pagamenti da seguire, ultimo avviso) e catalogo /gestionale/richieste (area `intake`: filtri per fase, tipo, area e sede; azioni per riga decise dal database secondo chi fa cosa; recapito mostrato a richiesta e registrato; modulo pagamento solo Tesoreria; link pubblici del modulo unico). Finché r139 non risponde (sonda `scd_intake_kinds`, `registry-live.server.ts`) non si legge e non si scrive nulla: «Funzione in preparazione». Il modulo Tally non esiste: `config/scd-requests-intake.v1.json` `intakeTallyFormUrl` = null, ogni link dice «Modulo in preparazione».
- I link sulle pagine pubbliche (/tornei, /sponsor, /partner, /fornitori, /impianti, /contatti) sono area della chat CLOUD: pronti in `lib/intake-links.ts`, da posizionare su richiesta.
- Controllo locale 390/1440 di /gestionale e /gestionale/richieste (anteprima staging, build di produzione): nessun errore in console, nessuno scroll orizzontale.
- Gate: tsc 0, vitest 190 file / 2772 test, build 0, test:bundle 0, test:manifest 0, test:claude-hooks 0, PGlite r133/r135/r136/r137/r138/r139 tutti 0.
- Secondo commit (scd-revisore BLOCK, scd-sicurezza PASS con note): la scheda della pagina separa «Deciso da Francesco» («Esterni Tally, soci app», «Li crea la Tesoreria», «DG conferma tutto») da «Proposte da confermare» (fasi, chi decide per tipo, niente link per sponsor e convenzioni, scadenza dei recapiti con job da creare, 60 richieste all'ora); le stesse voci sono marcate PROPOSED nella migrazione, in `lib/intake-kinds.ts`, nel registro aree e in UD-163. r139: riclassificazione con controllo di sede e tipo di richiedente, `too_long` prima dell'inserimento, idempotenza anche con due chiamate contemporanee (`on conflict`), nuova `scd_intake_redact` (mail mascherate «nome at dominio it», telefoni con punti, barre o parentesi) e parole di salute a inizio parola o parola intera (allargate: malato/a, frattura, operato/a, gesso, handicap, autismo, DSA, ADHD, psicologo, gravidanza, incinta, ferita), stesse stringhe in TypeScript; le tre letture r133 ricreate sono uguali alle definizioni live lette alle ~16:30, `scd_requests_to_confirm` non toccata. App: stato «Lettura non riuscita» distinto nel blocco di /gestionale, timer del pulsante «Copia» annullato all'uscita.
- Terzo commit: Francesco 16:39 «decide presidente e consiglio direttivo» per affitto campi e visite ai centri (decidono Presidente e Consiglio Direttivo, cioè la Direzione; il DG le segue e le inoltra, non le decide; nessuna soglia per il DG da solo). Scheda «Deciso da Francesco», `INTAKE_RULES`, migrazione e UD-163 aggiornati; le fasi passano tra le proposte in UD-163. Revisione sicurezza: la Tesoreria registra pagamenti solo sulle richieste che può vedere; nome dell'ente e ruolo del referente rifiutati se nascondono un telefono o una mail; proposta per il lato Tally/Make (campo trappola e filtro prima dell'ingresso). Nota di annullamento unita all'avviso per la Tesoreria; stato «Lettura non riuscita» anche nella pagina del catalogo.
- Quarto commit (solo testi): ~16:55 Francesco, alla domanda «Per l'affitto del campo e le visite al centro decidono il Presidente e il Consiglio Direttivo... Nell'app il Consiglio Direttivo corrisponde a chi ha il ruolo «Direzione». Tu, come DG, su queste due richieste cosa fai?», risponde «Preparo e inoltro»: citato in UD-163, `lib/intake-kinds.ts`, migrazione r139 e nella scheda «Deciso da Francesco». Nota: il test PGlite di r139 richiede PGlite installato a parte e la variabile `PGLITE_DIR` (`npm install --prefix /tmp/scd-pglite @electric-sql/pglite@0.5.10`, poi `PGLITE_DIR=/tmp/scd-pglite node supabase/tests/r139_requests_intake.pglite.mjs`).
- Quinto commit: ~17:00 Francesco «No, senza pagamento» (domanda: «Le visite al centro (medico, massaggi, nutrizione) si pagano con un link della Tesoreria?») → VISITA_CENTRO senza pagamento (regola `payment` false in SQL e TypeScript, `scd_intake_payment_set` risponde `no_payment`); la domanda citava visite mediche: da confermare che valga per le visite ai centri. «Tengo anche Direzione»: il DG tiene il ruolo Direzione e può decidere affitti e visite come membro del Consiglio (nessun cambio di logica).
- Sesto commit (solo testi): ~17:10 Francesco chiarisce («Tutte e due gratis»): le visite ai centri sono senza pagamento, tolto «da confermare»; anche la fase F4 (visite mediche, massaggi, nutrizione) sarà senza pagamento: annotato in UD-163 e nel manifest, nessun codice F4.
- Settimo commit (revisione): nella scheda di una visita la riga «Pagamento» dice «nessuno (gratis)» e le visite non contano tra i pagamenti da seguire; nota della pagina: «il DG decide anche lui come membro del Consiglio» («Tengo anche Direzione»).

## 16/10/2026 17:30 · Chat PC: Iride v4, amichevoli confermate dal DG su WhatsApp (UD-164, NON applicata al live)
- Francesco (DG) 16/10: «meglio che manda un sms a direttore generale e lui conferma», «sì, semplifica», canale «WhatsApp»; 16:31 «ok Iride v4»; ~16:42 «Sì, accendi la copia» (solo copie di test).
- `automations/make/segreteria-ai/system-prompt.it.md` ora contiene il prompt v4 (system + messaggio utente del modulo 7 Anthropic Claude), estratto dal blueprint e verificato byte per byte. Regola 8 riscritta (amichevole come regola a parte: solo squadra, data e avversario; Iride non conferma mai), nuove regole 15–16, riga RUBRICA con la richiesta aperta AM-…, JSON con `amichevole`. Diff v3 → v4 in `prompt-diff-v3-v4.txt`.
- Blueprint sanificati: `blueprint-v4.json` (scenario 7979437 v4) e `promemoria-dg-v4.json` (promemoria 48 ore, da creare spento). Unico dato sostituito: il phone_number_id WhatsApp del club → `<WHATSAPP_PHONE_NUMBER_ID>`. Nessun numero di persona: il numero del DG lo legge Make dalla rubrica (ruolo DIRETTORE GENERALE, scritto solo da una persona in Make).
- Test (`test-v4-risultati.md`): T1–T10 PASS sulle copie spente 8000995 / 8001010, data store di prova e numeri finti; nessun messaggio o mail reale. Scenario live 7979437 invariato (v3): v4 va applicato solo con OK esplicito di Francesco.
- PROPOSED (non dette da Francesco): conservazione 30 giorni delle richieste decise, settore informativo per categoria (U14/U17/Allievi da confermare), modelli Meta per v4.1, campo «AI:» di INTAKE_LOG.
- Secondo commit (revisione dei rilievi, giro di test «R» sulle copie spente, T1–T15 PASS): nel testo libero il prefisso «AM» è obbligatorio («Sì 2» di un genitore resta conversazione normale; numero senza AM solo dagli id dei pulsanti); nel messaggio al DG (modulo 69) i campi di chi chiede hanno gli stessi limiti del modulo 68, senza a capo, e «AM-n» diventa «AM·n»; oggetto delle mail 74/76 pulito (a capo → spazio, 60 caratteri).
- Conservazione: Francesco ~17:40, alla domanda «per quanto tempo li teniamo?», risponde «Fine stagione». Lo scenario promemoria ha ora un secondo ramo che cancella le richieste decise create prima dell'ultimo 30 giugno (costante unica `fine_stagione` = 06-30; mai il CONTATORE). CANCELLA cancella anche le richieste di chi scrive; per un contatto con ruolo verificato (es. DIRETTORE GENERALE) resta solo il ruolo (scelta PROPOSED, documentata in UD-164). Soglia di 48 ore del promemoria segnata PROPOSED.
- Verificato in Make: regex con flag `/gi` non sostituisce (usata la classe `[Aa][Mm]` con `/g`); operatore di ricerca `text:startwith` (non `startsWith`). Prompt invariato, `system-prompt.it.md` ancora identico byte per byte. Copie 8000995/8001010 spente; live 7979437 e rubrica 220276 non toccati.
- Terzo commit (prima del go-live, richiesta del coordinatore): T8c corretto. Se il Direttore Generale scrive un sì/no breve senza codice e senza citare un messaggio, risponde Make con un testo fisso (niente AI): elenco di massimo 5 richieste in attesa (codice, squadra, data, avversario, testi neutralizzati come nel modulo 69) e «Rispondi SÌ AM-… oppure NO AM-…», oppure «Non ci sono richieste di amichevole in attesa». Moduli 100–104 (rotta DG_SENZA_CODICE); formulazione PROPOSED in UD-164. Test giro «S» sulla copia spenta: T8c con e senza richieste, T4, T7, T11 e una domanda lunga del DG (resta all'AI) PASS. T2 resta nota v4.1.

## 16/10/2026 18:35 · Iride v4 applicata al live 7979437 (UD-164)
- Francesco (DG) ~18:20, alla domanda «La accendo su Iride vera? Prima faccio un salvataggio... Il promemoria al DG lo creo spento.» risponde «Sì, accendi v4»; alla domanda «A fine stagione, le richieste di amichevole a cui non hai mai risposto le cancello anche loro?» risponde «Sì, cancella tutto».
- Conservazione allargata: lo scenario promemoria (ramo 2) cancella a fine stagione tutte le richieste «AM-» create prima dell'ultimo 30 giugno, anche quelle ancora IN_ATTESA_DG; mai il CONTATORE. `promemoria-dg-v4.json` aggiornato (tolta la condizione su `stato` dal modulo 6, nome «SCD · Iride · Promemoria DG»). T13 ripetuto sulla copia spenta 8001010: PASS (accesa solo per il giro, poi spenta).
- Live: prima salvataggio completo di 7979437 (v3, attivo, «immediately»), poi aggiornamento con `blueprint-v4.json` (stesso nome, cartella, programmazione, connessioni e webhook). Verifica con scenarios_get: blueprint identico al file testato (moduli 60, 61, 68, 69, 84–104), scenario ATTIVO. In caso di problemi si torna al salvataggio v3.
- Scenario promemoria creato SPENTO: 8003125 «SCD · Iride · Promemoria DG» (ogni 6 ore quando acceso); si accende solo con OK di Francesco.
- UD-164 → `APPLIED_TO_LIVE_7979437`; manifest: Iride live v4. Nessun messaggio WhatsApp inviato e nessuna esecuzione lanciata da Claude.
- 18:45: promemoria 8003125 ACCESO dopo l'OK di Francesco («Sì, accendilo»). Il promemoria resta uno solo per richiesta; la soglia delle 48 ore è PROPOSED.

## 2026-10-16 ~22:00 — chat cloud — home "Con noi, a bordo campo" e più colori (UD-143)
- Francesco 21:43: promo a rotazione in fondo alla home (sponsor di bordo campo con «Scrivici e ti ricontattiamo» → /sponsor#proposta; Sky nella divisa gara con gli sponsor ogni due giorni; «Sostieni i nostri colori»; convenzioni solo quelle che annuncia, oggi nessuna). Regole pure in `src/lib/home-promos.ts` (giorno di Roma), fascia `src/components/home/HomeBordoCampo.tsx`; pausa, stop con mouse/focus/scheda nascosta, mai in movimento con movimento ridotto. Eccezione a UD-152 e UD-151 solo per questa fascia (UD-143).
- Francesco 21:54 «cerca di mettere anche altri colori»: fasce azzurro e sole in finitura metallo (`.scd-band-azzurro`, `.scd-band-sole`, pulsante `.scd-navy-btn`), toni in `src/components/home/tones.ts`; slide «In primo piano» a colori alterni (azzurro, blu, sole). Contrasti ≥ 4,5:1.
- Super Giornalista: ogni mattina il post social gemello della fascia con lo sponsor del giorno taggato (solo bozza; pubblicazione quando Francesco collega un account social). Attività programmata aggiornata.
- Ledwall: con movimento ridotto spento di nuovo il tabellone non resta su un vecchio fermo-immagine; registro asset: `use` dei video anteprima LED aggiornato.

## 16/10/2026 sera · Chat PC: scadenza dei recapiti decisa, job di cancellazione r140 STAGED (UD-163)
- Francesco (DG) ~19:20, alla domanda «Per quanto teniamo i recapiti di chi scrive dall'esterno?», risponde «12 mesi» (VERIFIED): 12 mesi dall'arrivo, 6 mesi dopo RIFIUTATA/ANNULLATA, 12 mesi dopo CHIUSA. Sono i periodi già scritti in r139 (`scd_request_ingest` e `scd_intake_decide`, controllati anche sul live: le due funzioni contengono gli intervalli 6 e 12 mesi): nessun cambio di codice SQL, da «proposta» a «deciso». La migrazione r139 applicata (SCD PULSE, 16/10/2026 17:53) non si tocca: la decisione è registrata qui, in UD-163, nel manifest e nella scheda «Deciso da Francesco» di /gestionale/richieste.
- Letture sul live (solo SELECT, SCD PULSE): pg_cron 1.6.4 disponibile ma NON installato, nessuno schema `cron` e quindi nessun job; `scd_request_contacts_purge()` SECURITY DEFINER, proprietario postgres, EXECUTE solo postgres e service_role; 0 recapiti in tabella; r139 non ha una riga in `supabase_migrations.schema_migrations`.
- Nuova migrazione `supabase/migrations/20261017_r140_intake_contacts_purge_job.sql`, STAGED, NON applicata (solo dopo «applica r140»): installa pg_cron e programma un solo job giornaliero `scd_intake_contacts_purge` alle 01:17 UTC (03:17 ora legale italiana, 02:17 ora solare) che esegue solo `select public.scd_request_contacts_purge();`. Idempotente (un job con lo stesso nome viene tolto prima), gira come l'utente che applica (postgres, che ha già EXECUTE), nessun permesso nuovo ad anon o authenticated. Test statico `apps/superapp/src/lib/intake-purge-migration.test.ts` (PGlite non ha pg_cron).
- Nota: dopo RIFIUTATA/ANNULLATA r139 usa `least(purge_after, now() + 6 mesi)`: se i 12 mesi dall'arrivo scadono prima, vale la data più vicina.
- Nome ufficiale: alla domanda «S.C.D. o S.D.C.?» Francesco indica «S.D.C. ColicoDerviese A.S.D.». Solo registrato (UD-163): nell'app non è stato rinominato nulla.
- 20:03: Francesco scrive «applica r140». Migrazione applicata su SCD PULSE dall'editor SQL (sha1 1e7a370687af5ccad9f45fa67f0dfa4d30597f72 verificato sul file a 2eab5e4). Verifica in sola lettura: pg_cron 1.6.4 installato, un solo job attivo `scd_intake_contacts_purge` («17 1 * * *», `select public.scd_request_contacts_purge();`).
## 2026-10-16 ~23:00 — chat cloud — pagine Partite, Eventi e Comunità, hub GROW (Francesco 21:38 «completare le piattaforme», 21:54 «altri colori»)
- /calendario (Partite): stile METAL della home con «IN CASA» sole e «TRASFERTA» azzurro, settimana con pallini casa/trasferta, colonna destra Prossima in casa · Come arrivare · Rotazione campi (riservata, lucchetto); dati del calendario invariati.
- /eventi, /eventi/christmas-lario-cup (solo testata), /community: testata compatta MetalPageHeader, un colore per tipo di evento (tornei sole, iniziative azzurro, club blu), comunità in Gioca · Segui · Partecipa; regole Top 11 e Fantacalcio dai testi esistenti; lotteria e Adotta invariate (UD-132).
- /grow: hub interno GROW dietro lo stesso accesso di /crm (tolto il rinvio demo a /sponsor), copertura spot LED calcolata da sponsors.ts e sponsor-spots.ts (7 pronti, 30 da preparare), strumenti GROW con stato; /sponsor senza promesse di misurazione («Report in arrivo»).
- Revisioni indipendenti scd-revisore + scd-sicurezza: PASS × 2 per ogni ramo (Eventi dopo correzione del testo sul Fantacalcio).

## 2026-10-16 ~23:50 — chat cloud — «pagine piene» (Francesco 23:08 «non voglio pagine vuote», 23:43 «pubblica le pagine»)
- /eventi: sezione Iniziative solo con iniziative o lotteria pubblicata; tornei della stagione sempre in testa. /eventi/christmas-lario-cup: riquadro live solo da torneo iniziato, prima una riga «Si accende l'8 dicembre».
- /sostieni: per i visitatori solo le azioni attive oggi (proposta sponsor, Fondo Solidale spiegato, materiale tramite segreteria); catalogo e campagne solo quando la Direzione apre la raccolta (r101).
- /top11: «Come funziona» in 4 passi al posto del vuoto; premi solo se esistono.
- /squadre da non collegati: variante di UD-100 — solo categoria, campionato verificato, annate e link alle gare; resta tra le pagine solo soci (no-store, noindex). /crea e /la-mia-scd da non collegati: pagina di iscrizione JoinClub (porta solo a /registrati e /accedi).
- Revisioni indipendenti scd-revisore + scd-sicurezza sull'integrazione 320b47a: PASS × 2.

## 2026-10-17 — PWA installabile: sw.js non più troncato (PR #171)

- Causa: sul sito live /sw.js arrivava troncato (23436 su 23956 byte, misurato 17/10 00:05): Nitro (node-server) registra size/etag dei file pubblici prima che vite-plugin-pwa completi sw.js e serve la Content-Length vecchia. Il browser rifiutava il service worker («ServiceWorker script evaluation failed») e non offriva «Installa app».
- Misura: `scripts/fix-public-asset-meta.mjs` dopo `vite build` (anche `build:node`) riallinea size, etag e mtime in `.output/server/index.mjs` (accetta le dimensioni esponenziali 2e3; avviso se la tabella non è riconosciuta; scrittura atomica). Test: `src/lib/public-asset-meta.test.ts`.
- Dopo il deploy: verificare che la Content-Length di /sw.js sia uguale alla dimensione reale e che Chrome offra «Installa app».

## 2026-10-17 — chat cloud — Cantiere 04 Sponsor + 05 Tornei ed eventi (PR #181; Francesco 08:22 «migliorala… renderla attrattiva»)

- /tornei: testata con il prossimo torneo e conto alla rovescia, «Iscrivi la squadra» (sezione iscrizioni esistente), una scheda per torneo pubblicato (annate in fila, 6 icone di servizio con «da confermare», squadre confermate, locandina una volta e ingrandibile), righe «In arrivo», fascia «Vivi il Lago» con fonti (`lib/tournament-hub.ts`).
- Enea guida (UD-149, PARTIAL) su /tornei, /eventi, /sponsor: un motivo e un'azione, a rotazione, chiudibile, movimento ridotto rispettato (`lib/enea-guide.ts`, `components/scd/EneaGuide.tsx`).
- /sponsor: nuova testata, «Perché conviene» con soli numeri documentati (`lib/sponsor-reach.ts`), parete dei loghi originali, LED wall, pacchetti con i 3 passi, FAQ, modulo invariato. /partner: vantaggi e area di esempio («Esempio · dati non reali») prima della schermata di accesso invariata (`lib/partner-preview.ts`).
- Motori SOLDI e PERSONE; misura: pressioni su «Iscrivi la squadra»/«Condividi» per torneo e proposte da /sponsor#proposta per mese.
- Test: `tournament-hub.test.ts`, `enea-guide.test.ts`. Revisioni scd-revisore + scd-sicurezza: PASS × 2, con 3 correzioni del revisore applicate.

## 2026-10-17 — chat cloud — Cantiere 04 Sponsor: idee da sponsorizzare, nessun prezzo pubblico (Francesco 09:42 «prezzi non esposti perché li fa al momento il Presidente; dobbiamo solo rendere appetibile il singolo sponsor o idea di sponsorizzazione»)

- Nessun prezzo, importo o sconto sulle superfici pubbliche sponsor: tolto il campo `price` e `formatPackagePrice` da `lib/sponsor-packages.ts` (non usati dal CRM), tolto il campo «Budget indicativo» con le fasce in € dal modulo pubblico (`BUDGET` rimosso da `lib/catalog.ts`; il server accetta ancora un budget vuoto). Al posto del prezzo: «Proposta su misura: la definisce il Presidente con te» (`PROPOSAL_ON_MEASURE`); FAQ «Quanto costa?», passi, Enea e contesto della chat aggiornati.
- I 4 pacchetti diventano «idee di sponsorizzazione»: immagine di dove compare il marchio (`components/IdeaScene.tsx`, scene in palette club con spazio vuoto «il tuo marchio», mai loghi inventati), luoghi come chip, una riga di racconto, cosa ottieni, chi lo vede, «Parliamone» → modulo con `?pacchetto=`.
- «Idee da sponsorizzare» (`lib/sponsor-ideas.ts`, `components/SponsorIdeas.tsx`): Christmas Lario Cup Female, Memorial Nasazzi 2027, Memorial Guattini, pulmini (4 linee), Adotta la nuova palestra, Fondo Solidale, Adotta la nuova infermeria, kit Primi Calci; solo dati del repo, pubblico ignoto = «da confermare». `?pacchetto=` accetta pacchetti e idee (`parseChoiceParam`).
- «Già con noi»: toccando un logo si apre una scheda (`components/SponsorWall.tsx`, `lib/sponsor-profiles.ts`) con nome ufficiale (solo se verificato), settore e paese «da confermare», sito ufficiale documentato e «Grazie a … per …» solo per spot LED in rotazione o fornitura kit documentata.
- Motore SOLDI; misura: proposte da /sponsor#proposta per pacchetto/idea (`interessi`, oggetto della mail ufficiale finché i moduli sono in pausa) e aperture della scheda partner.
- Test: `components/sponsor-public-no-price.test.tsx` (render SSR: nessun simbolo di valuta né cifre seguite da €), `sponsor-ideas.test.ts`, `sponsor-profiles.test.ts`, aggiornati `sponsor-packages.test.ts`, `sponsor-process.test.ts`, `enea-guide.test.ts`.

## 2026-10-17 — chat cloud — Tornei: Memorial José Nasazzi 2027 confermato, con Female Edition (Francesco 11:15 «nasazzi già è confermato e si lavora»; 11:16 «lascia così le locandine, fa niente»)

- Supersedes the 2026-10-17 «date da confermare» status above for the Nasazzi: 7ª edizione 22–23/05/2027, Colico (Centro Sportivo Comunale – Campo TGM Montecchi), annate 2016 dilettanti e 2017 professionisti, 6 squadre confermate, co-organizzatore Sport Pro Experience; Female Edition a Dervio (Pulcini 7v7, nate 2016–2017, ammesse 2018 con 8 anni compiuti), stesse iscrizioni (`lib/tournaments.ts`, `registersWith`).
- Locandine ufficiali pubblicate così come approvate dalla Direzione 17/10/2026 (la grafica riporta «S.D.C.»; i testi dell'app usano sempre «S.C.D. ColicoDerviese»). Le immagini mostrano il recapito pubblico dell'organizzatore.
- «Iscrivi la squadra» apre il sito dell'organizzatore (https, nuova scheda, `rel="noopener noreferrer"`). Nessun numero di telefono nei testi.
- Revisioni scd-revisore + scd-sicurezza: PASS × 2.

## 2026-10-17 — chat cloud — Risultati & Classifiche R1+R2: solo dati ufficiali LND, con fonte e link (UD-181; Francesco DG 12:33 «ok classifiche LND»)

- Regola cambiata in `lib/official-links.ts` (`PUBLICATION_RULE`): da «l'app non pubblica punteggi propri» a «Pubblichiamo solo i dati ufficiali LND, con fonte e link». I link dei campionati vengono dall'unico registro `LND_COMPETITIONS` (`lib/lnd-standings.ts`): Prima Squadra PR/D, Juniores RI/C, U16 Y6/A, U15 GS/A; coppe CR/11, CG/6, DL/15. Attività di base: nessuna classifica (SGS).
- **R1 dati**: migrazione `supabase/migrations/20261017_r116_lnd_standings.sql` (scritta, NON applicata; test PGlite `supabase/tests/r116_lnd_standings.pglite.mjs` verde): `scd_competitions`, `scd_standings_snapshots`, campi ufficiali LND su `scd_matches` (solo fonte, id LND, punteggio, ora di lettura), `scd_official_notices`, `scd_disciplinary_items` (solo staff). Lettura pubblica, scrittura solo service role.
- Parser puro `lib/lnd-standings.ts` (pagina gare.lnd.it e JSON classifica) con fixture reali in `lib/__fixtures__/`; script `scripts/ingest-lnd-standings.mjs` (non programmato; piano: ogni 6 ore, ogni ora nel weekend). Copia committata `src/data/classifiche-lnd-snapshot.json` letta il 17/10/2026 12:50 da gare.lnd.it: 4 classifiche complete (16, 16, 16, 13 righe) e 25 risultati ufficiali delle nostre squadre.
- **R2 UI**: nuova pagina pubblica `/classifiche` (4 campionati con tabella completa e ultimi risultati, 3 coppe con risultati e conteggio dichiarato «contate dai risultati ufficiali»), badge «Ufficiale LND», data di lettura e link alla fonte su ogni blocco. Pagina squadra: «Classifica» (posizione, punti, tabella apribile) e «Ultimi risultati». Menu, sitemap, cache offline e anteprime link aggiornati.
- Calendario da correggere nel master (non modificato qui): coppa U19 del 05/09 (LND 16:00, app 19:00) e U16 del 26/09 (LND 16:00, app 17:45).
- Motore PERSONE; misura: visite settimanali di /classifiche e del blocco Classifica delle squadre; freschezza ≤ 6 ore (≤ 1 ora nel weekend) dopo l'attivazione dello script.
