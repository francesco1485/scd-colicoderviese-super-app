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
