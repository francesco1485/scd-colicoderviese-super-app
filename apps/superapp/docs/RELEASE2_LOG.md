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
- Nuova scheda **Salva Iride, la segreteria 24/7**: avatar di Iride (registrato in `config/scd-assets.v1.json`, approvato da Francesco 15/10 17:37), numero, pulsante "Salva il contatto" (`/iride.vcf`, solo contatti pubblici del club) e "Scrivi su WhatsApp" (wa.me).
