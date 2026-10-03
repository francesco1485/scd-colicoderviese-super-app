# R57.UI — Visual & Experience Reconciliation

**Stato:** inventario e piano documentale; nessuna UI, API, configurazione o produzione modificata.

**Perimetro:** SCD-01 / SCD Universe / SCD ColicoDerviese Super App.

**Rilevazione repository e GitHub:** 2026-10-03.

**Autorità:** `SCD_SYSTEM_MANIFEST.json`; il visual master e i relativi gate sono subordinati al manifest.

## SCD:STATE

| Campo | Stato | Evidenza e limite |
|---|---|---|
| `REPOSITORY` | `VERIFIED` | `francesco1485/scd-colicoderviese-super-app`. |
| `CURRENT_MAIN_SHA` | `VERIFIED` | `d16a658786b7577af498a3104dc31ebdd17f7613`, base PR #85 e SHA delle ultime run main consultate. |
| `CURRENT_WORKING_BRANCH` | `VERIFIED` | `copilot/create-audit-documentation`, HEAD pre-scrittura `f15bbe899753c4ea0451ed0d729f533bfcd4235f`. |
| `WORKING_TREE` | `VERIFIED` | Pulito prima della creazione di questo documento. |
| `OPEN_PR` | `VERIFIED` | PR #85. Issue #96 è aperta e definisce questo blocco. |
| `PR_STATUS` | `VERIFIED` | PR #85 aperta, draft, non merged; `mergeable_state=unstable`. Istruzione: mantenerla draft. |
| `CI_STATUS` | `VERIFIED` | Sul HEAD pre-scrittura, i check PR E2E, manifest e policy risultavano `action_required`; il check dinamico era `in_progress`. Non è un esito verde. |
| `PAGES_STATUS` | `VERIFIED` | Run Pages #37112220325 `success` su main SHA `d16a658…`; non attesta questo branch né la visual QA. |
| `RENDER_STATUS` | `VERIFIED` | Production Evidence #37112220326, attempt 2, `success` sullo stesso main SHA; il job ha completato la verifica Pages/Render/R20. Non equivale a QA per schermata o viewport. |
| `MANIFEST_VERSION_OR_HASH` | `VERIFIED` | v3.26.0; SHA-256 `46518c9e5aa258fd5bbc1e80ecf0d1fa7c65b12c6e32a7d721dc4b5ed3205baf`. |
| `RELEASE_DEPENDENCIES` | `VERIFIED` | R20 resta primary; Pages serve il frontend e Render il runtime API; Supabase è staged/dark e non è un cutover verificato. |
| `DATA_SOURCES_VERIFIED` | `VERIFIED` | Registry e contratti sono verificati nel repository. Disponibilità, freschezza e contenuto live dei provider restano `UNVERIFIED`. |
| `KNOWN_BLOCKERS` | `VERIFIED` | `GAP-UI-001/002`, `GAP-EVENT-001`, `GAP-R20-001`, `GAP-CORE-001`, `GAP-COMMS-001`, `GAP-DATA-001` e `GAP-INTAKE-001` sono debito esplicito del manifest. |
| `SAFE_NEXT_ACTION` | `VERIFIED` | Usare questo inventario per definire una baseline visiva verificabile; nessuna modifica UI o produzione in questo blocco. |

`UNVERIFIED` non significa assente. Questa fotografia è riferita alla verifica pre-scrittura del documento e non sostituisce una successiva verifica dello SHA, dei check e dei servizi.

## SCD:EXPERT

- `TASK_CLASS`: reverse engineering/inventario UX e piano di riconciliazione visuale, documentazione-only.
- `DOMAINS`: design system, UX responsive, accessibilità, fonti/provenance, identità e autorizzazione, calendario e operazioni club.
- `FIXED`: SCD Universe è l’unica app di questo blocco; moduli e identità R38–R56 restano; R20 è primary; i contratti binding e il visual gate non si reinterpretano.
- `IMPROVABLE`: solo presentazione, gerarchia, navigazione e interazione delle superfici di cui baseline e visual master mostrino un gap.
- `MISSING`: screenshot/comparazione per schermata e viewport; localizzazione e confronto dei visual master approvati; prove di device e di adapter Facility reali.
- `SOURCE_PLAN`: manifest → visual master, token e gate R57 dalla ref `r57-copilot-control-plane` → UI/build/test e fonti locali.
- `TOOLCHAIN`: lettura repository/GitHub e test già presenti; nessun nuovo tool o harness introdotto.
- `RISK`: dichiarare attiva una UI o integrazione non verificata; confondere moduli Universe, companion app e superfici legacy; perdere un contratto durante una riscrittura visuale.
- `TEST`: test manifest per questo documento; per futuri blocchi, test contrattuali mirati, E2E e matrice visuale/accessibilità richiesta dal gate.
- `ROLLBACK`: revert isolato del cambiamento di presentazione; non modificare backend, dati, auth, ruoli o runtime in assenza di approvazione e piano dedicato.
- `NEXT_ACTION`: catturare la baseline e verificare i visual master prima di aprire il primo blocco UI.

## SCD:ARCHITECT

1. **VISION ANALYSIS — inventario, non verdetto visivo.** `index.html`, il selettore del builder, i CSS e gli script identificano la composizione dichiarata dal codice; in questa sessione non sono stati acquisiti screenshot né ispezionati stati browser. Il CSS contiene token base e override tema (`scd-ng.css:1–4, 1340–1364`); cascade e colori renderizzati vanno confrontati con i token canonici, non approvati sulla sola lettura del sorgente. Le classificazioni qui sotto sono decisioni di perimetro e priorità, non attestazioni di conformità visuale.
2. **ENGINE DATA — contratto da preservare.** Conservare `EVENT_ID`, ID persona/squadra/stagione, provenienza, stato e fallback; R20 e i controlli server-side di account/ruolo/scope restano autoritativi. Separare dati reali, derivati, locali, riservati, stale e non disponibili.
3. **ZERO-BUG BUILD — non autorizzato in questo blocco.** Nessun componente, schermata, dato, asset o servizio è stato ricostruito. Una successiva UI slice mantiene lo stack esistente e richiede test logici/contrattuali e QA visuale.
4. **AUTONOMOUS CONTINUOUS LOOP — confine sicuro.** Il prossimo blocco può iniziare solo dopo baseline, confronto col visual master e piano di rollback. Implementare e validare una slice per volta, correggendo regressioni prima di proseguire.

## Visual system e confini applicativi

- Prodotto: **SCD UNIVERSE / SCD COLICODERVIESE SUPER APP**, un solo prodotto adattivo. Questa PR non assorbe SCD Sponsor & Partner Platform o Command R22 nell’interfaccia Universe; Maglia 360 + C.E.P.A. è fuori dal perimetro SCD.
- Superfici interne Universe: Pulse/Home, Calendar, Teams, Matchday, Social/Community, Twin, Private Desk, Family, Athlete, Staff, Segreteria, Facility, Tornei, SCD Week e operazioni materiali.
- R38–R56 da preservare: Pulse/Universe, Twin e contesto personale, Staff & Family/Private Desk, SCD Week, Calendar/Teams/Matchday/Social, PWA, core football/private/social, contenuto verificato R55, Identity/Calendar Fusion/Club Intelligence R56 e R56.1 access/arrival QA. La presenza di test o schema non promuove una capability a `DEPLOYED` o `PRODUCTION_VERIFIED`.
- Identità visiva e palette restano `KEEP_LOCKED`: sistema canonico da `config/scd-visual-system.json` (ref `r57-copilot-control-plane`), senza palette sostitutive. Il visual master richiede sport, territorio, futuro, gerarchia editoriale, profondità, stato reale e azione successiva; vietati template SaaS/Admin/WordPress, card wall anonime, brochure hero e desktop in forma di telefono incorniciato.
- Asset registrati come ufficiali, incluso `assets/logo-scd.png`, restano `KEEP_LOCKED` secondo `config/scd-assets.v1.json`. Asset ufficiali mancanti/non verificati: `RESEARCH_REAL_ASSET`, mai ricostruirli per approssimazione. Originali sintetici non sostitutivi: `GENERATE_ORIGINAL`. `KEEP_ENHANCE` è limitato a ottimizzazione/accessibilità senza alterare contenuto o provenienza.
- Tutte le schermate devono restare viste e moduli dello stesso prodotto, non nuove app né un gestionale parallelo a R20. Uno status tecnico di repo/build non dimostra la presenza di uno stato servizio live.

## RUNTIME_MAP — evidenza d’interfaccia

- `index.html` contiene i view `pulse`, `calendar`, `teams`, `social`, `twin` e `desk`; `scd-ng.js` gestisce calendario pubblico, squadre, feed, Matchday, Twin e Desk.
- `architecture.nextgen_preview.visual_mode` nel manifest vale `SYNTHETIC_NO_REAL_PHOTOGRAPHY`; `scripts/build-pages.mjs` seleziona quindi la lista `nova`, inclusi `scd-ng.js`, `scd-ng.css`, `scd-synth.css`, `ui-r52-social.css`, Twin e l’engine operativo. Il file di build distingue esplicitamente il ramo `legacy`; la presenza di `app-r24-router.js` nel repository non prova che sia caricato nell’artifact Nova.
- Family/Athlete/Staff appaiono come proiezioni/moduli privati nel Desk (`scd-ng.js`); non si assume che le route del router R24 siano nell’artifact Nova. L’effettiva schermata servita e i suoi visual master vanno verificati prima del design.
- Segreteria, Facility, Tornei e materiali sono identificati come moduli/domini nel manifest e nel Desk, ma il codice esaminato non dimostra un’interfaccia autonoma attiva per ciascun dominio. Stato UI puntuale: `UNVERIFIED`; non creare pagine finte per colmare questa evidenza.

Riferimenti locali principali: `index.html:18–48, 357–562`; `scripts/build-pages.mjs:6–23, 39–55`; `scd-ng.js:205–277, 428–455, 481–523, 638–772, 833–867, 916–944`; `app-r24-router.js:2–23, 411–490`.

## Surface inventory e VISUAL_CLASSIFICATION

Classi `KEEP_ENHANCE` e `REBUILD_IMPROVE` indicano la direzione da verificare sulla baseline, non un’approvazione di design. `REBUILD_IMPROVE` significa rifare presentazione/interazione quando un difetto visuale è osservato, preservando sistema e dati. Le superfici con evidenza `MODULO/CONTRATTO` non sono dichiarate implementate o disponibili solo perché menzionate dal manifest.

| Superficie | Evidenza UI corrente | Classe | Da mantenere / decisione |
|---|---|---|---|
| **Pulse / Home** | View `pulse` nel documento root; bundle Nova selezionato dal builder. | `KEEP_ENHANCE` | Conservare gerarchia Pulse/club e azione primaria; riallineare solo i problemi desktop/responsive effettivamente rilevati. Il “live” in copy non autorizza dati live senza fonte verificata. |
| **SCD Week** | Settimana e rail attività incorporati nella Home; nessuna app separata. | `KEEP_ENHANCE` | Mantenere settimana, filtri e proiezione calendario esistente; non creare un secondo calendario né eventi sintetici. |
| **Calendar** | View pubblica NextGen e filtri per periodo, squadra, categoria e tipo. | `KEEP_ENHANCE` | Preservare gli ID e il modello `EVENT_ID`, priorità delle fonti, deduplica e revisione umana dei conflitti; mostrare stato/fallback, non inventare eventi. R56 è `CONTRACTED`, conflitti `PENDING_REVIEW`. |
| **Teams** | View pubblica derivata dai dati del calendario; la preferenza “squadra seguita” è locale (`scd:follow-team:v1`). | `KEEP_ENHANCE` | Preservare categorie, link ai relativi eventi e chiave di preferenza locale; non esporre roster o contatti privati nella directory pubblica. |
| **Matchday / Next Match** | Pannello generato da una partita disponibile nel modello calendario. | `KEEP_ENHANCE` | Conservare provenienza partita e link a Team Hub/Calendar; punteggi, avversari, venue e statistiche restano solo da fonti verificate. Placeholder espliciti non sono fatti. |
| **Social / Community** | View/feed NextGen e superficie interattiva R53; contenuti pubblici e feature hanno stati di aggiornamento/disponibilità. Il poll settimanale è salvato solo sul dispositivo (`scd:poll:weekly-ux:v1`) e non mostra percentuali live. | `KEEP_ENHANCE` | Preservare feed pubblico verificato, privacy/minori, consenso e moderazione; il poll locale deve restare dichiarato locale. MVP/punti/premi/chat restano gated e non si dichiarano live (`CAP-SOCIAL-ENGAGEMENT` parziale; `GAP-COMMS-001`). |
| **SCD Twin / Mirror context** | View Twin, avatar sintetico e preferenze locali (`scd:twin:v1`, `scd:avatar:v1`); le capability intelligenti hanno dipendenze distinte. | `KEEP_ENHANCE` | Preservare chiavi/località, separazione fra identità sintetica e dato sportivo/personale reale, facoltatività, progressione non competitiva e limiti minori. Non trasformare XP in valutazione atletica. |
| **Private Desk / Services & Profile** | View Desk nel bundle; sessione, dati e moduli vengono caricati tramite API privata. `GAP-UI-001` segnala riallineamento progressivo delle schermate riservate. | `REBUILD_IMPROVE` — ordine 2 | Ricostruire gerarchia/azioni della superficie desktop dopo il baseline; mantenere accesso fail-closed, moduli e scope dal backend, stati di errore, logout e audit. Nessuna selezione ruolo client-side. |
| **Family** | Pannello dinamico alimentato da `privateData.personal`; famiglia/figli solo per profili autorizzati. | `REBUILD_IMPROVE` — ordine 3 | Preservare legame familiare/persona, documenti, richieste, convocazioni, trasporto e quote solo se restituiti dal gestionale. Non mostrare dati di altri nuclei o importi/scadenze dedotti. |
| **Athlete** | Proiezione privata del profilo persona e azioni convocation/status; dati mancanti presentati come aggiornamento. | `REBUILD_IMPROVE` — ordine 4 | Preservare ID atleta, ruolo/scope, azioni autorizzate, stato tesseramento/documenti e confini sanitari. Nessun dato FIGC, salute o performance inventato. |
| **Staff / Direction** | Moduli privati per presenze, convocazioni, comunicazioni, accessi/metriche; capability protette per ruolo. | `REBUILD_IMPROVE` — ordine 5 | Mantenere autorizzazione server-side R20, perimetro squadra/funzione, audit e consenso analytics. UI non amplia permessi; accessi/metriche Direzione restano riservati. |
| **Segreteria** | Modulo indicato dal portfolio/Desk; non è provata una schermata dedicata completa nell’artifact corrente. | `REBUILD_IMPROVE` — ordine 6, se legacy/UI verificata | Mantenere processi e dati canonici R20, ID e provenance; nessun nuovo gestionale parallelo. Prima verificare schermata, owner, azioni autorizzate e contratti. |
| **Facility / Smart Facility** | Dominio del Private Desk e del modello evento; un adapter/dispositivo connesso non è verificato da questa ricognizione. | `REBUILD_IMPROVE` — ordine 8, dopo prova servizio | Ricostruire solo presentazione supportata da capability e fonti reali; facility/event IDs, autorizzazioni e checklist manuali restano. Mai visualizzare sensori/serrature/allarmi finti. |
| **Tornei** | Evento `TOURNAMENT` e voce `TORNEI_EVENTI`; UI operativa dedicata non dimostrata. | `KEEP_ENHANCE` per la proiezione Calendar; ordine 7 per eventuale legacy | Preservare evento, stagione, squadra, stato, documenti/visibilità e scope. Il contratto calendario multi-view evita una seconda agenda. Iscrizione, biglietteria o Drive non diventano attivi per effetto del restyling. |
| **Materials: kit** | Modulo `KIT`/inventario nel dominio; interfaccia end-to-end corrente non verificata. | `REBUILD_IMPROVE` — ordine 9, se legacy/UI verificata | Preservare ID, inventario e consegna reali; kit ufficiali solo da reference approvata (`KEEP_LOCKED`/`RESEARCH_REAL_ASSET`). |
| **Materials: warehouse** | Dominio dichiarato; schermata e adapter live non verificati. | `REBUILD_IMPROVE` — ordine 10, se legacy/UI verificata | Preservare catalogo, quantità, movimenti e audit esistenti; non generare scorte o disponibilità. |
| **Materials: laundry** | Dominio dichiarato; schermata/servizio live non verificati. | `REBUILD_IMPROVE` — ordine 11, se legacy/UI verificata | Preservare assegnazione e stato solo da fonte reale; nessuna sincronizzazione implicita. |
| **Materials: keys/access** | Accessi sono capability private R56; le chiavi/controlli fisici richiedono source e scope espliciti. | `REBUILD_IMPROVE` — ordine 12, se legacy/UI verificata | Non esporre codici chiave, PIN, segreti o log nel client; permessi/server R20 e audit non si modificano. |
| **Materials: maintenance** | Dominio/servizio specifico non verificato nella UI attiva. | `REBUILD_IMPROVE` — ordine 13, se legacy/UI verificata | Preservare ticket, owner, priorità e stato da fonte approvata; non creare segnalazioni o scadenze fittizie. |

**Come usare l’inventario:** per i moduli con sola evidenza di contratto o directory, prima di iniziare un redesign verificare se esistono davvero una schermata attiva, una capability operativa, una fonte, un owner e un ruolo autorizzato. Se non esiste tale prova, registrare il blocker e non simulare la superficie.

## Decisioni REBUILD_IMPROVE e ordine esatto

La sequenza è subordinata alla cattura della baseline; non autorizza l’implementazione automatica né modifica l’ordine evolutivo approvato R57–R65.

0. **Baseline e gate condivisi (precondizione, nessun rebuild):** recuperare le board approvate, catturare la UI attiva su viewport richiesti, associare ogni screenshot a route/view, commit, build, dati fittizi di test autorizzati o stato anonimo e fonte. Verificare test e rollback.
1. **Shell e navigazione cross-surface — `REBUILD_IMPROVE` solo per difetti osservati.** Prima le varianti legacy/Desktop, breakpoint, safe area, focus e navigazione condivisa; nessun rebrand o cambio route/ID. Questa fondazione serve tutte le superfici e affronta `GAP-UI-002`.
2. **Private Desk / Services / Profile — `REBUILD_IMPROVE`.** Prima dell’azione, autenticazione, scope e moduli server devono rimanere fail-closed. Nessuna variazione a sessione, ruoli o backend. Affronta il perimetro riservato di `GAP-UI-001`.
3. **Family — `REBUILD_IMPROVE`.** Solo proiezione di profili già autorizzati, rispettando i legami verificati e senza esporre dati personali a un altro profilo.
4. **Athlete — `REBUILD_IMPROVE`.** Solo dopo i controlli di scope e persona; non promuovere documenti/pagamenti/tesseramenti a verificati se la sorgente non li conferma.
5. **Staff/Direction — `REBUILD_IMPROVE`.** Azioni per squad/ruolo con conferma, errori e audit; nessun cambiamento autonomo alle autorizzazioni. Le operazioni riservate richiedono review umana.
6. **Segreteria — `REBUILD_IMPROVE` soltanto su UI legacy trovata e misurata.** Preservare i flussi R20 e assegnazioni esistenti; se l’interfaccia dedicata non è verificata, non creare una nuova shell operativa.
7. **Tornei — `REBUILD_IMPROVE` soltanto sulla superficie operativa esistente.** Agganciarsi allo stesso `EVENT_ID`/Calendar; non duplicare agenda o inventare iscrizioni/stati.
8. **Facility Week / Smart Facility — `REBUILD_IMPROVE` dopo Calendar/Facility ID e prova di fonte/adapter.** Fino ad allora solo stati non connessi/non verificati o checklist manuale esplicita, mai controlli device finti.
9. **Kit → warehouse → laundry → keys/access → maintenance — `REBUILD_IMPROVE` una superficie alla volta, in quest’ordine.** Ogni passaggio richiede dataset/capability, scope, fallback e audit esistenti verificati; chiavi/accessi non mostrano segreti al client.

In parallelo, applicare solo `KEEP_ENHANCE` alle superfici già riconciliate: **Calendar/Event spine → SCD Week → Pulse/Home → Teams → Matchday → Social/Community → Twin**. Ogni fase consuma ID e fonti canoniche della fase precedente; social non replica contenuto privato e Twin non diventa un profilo sportivo. Il QA completo incrociato conclude il blocco.

## Contratti che non si devono perdere

- **Capability esistenti coinvolte:** `CAP-RUNTIME-EVIDENCE`, `CAP-PUBLIC-CONTENT-LAYER`, `CAP-SOCIAL-ENGAGEMENT`, `CAP-FOOTBALL-PRIVATE-CORE`, `CAP-IDENTITY-ACCESS`, `CAP-CALENDAR-FUSION` e `CAP-CLUB-INTELLIGENCE`. Il blocco non aggiunge capability, ruoli o fonti al manifest; le capability parziali restano tali.
- **Eventi:** un solo `EVENT_ID`, proiezioni CLUB/TEAM/YEAR/ATHLETE/FAMILY/STAFF/FACILITY/TRANSPORT/TOURNAMENT/PUBLIC; source-priority federale e revisione umana dei conflitti (`SCD_SYSTEM_MANIFEST.json:1334–1414`). Non introdurre calendari duplicati.
- **Calendar Fusion:** R56 `CONTRACTED`; agenda `SOURCE_IMPLEMENTED_RUNTIME_DEPLOY_REQUIRED`, conflitti `PENDING_REVIEW`; il restyling non equivale a sincronizzazione live.
- **Public data/content:** `CAP-PUBLIC-CONTENT-LAYER` e `CAP-SOCIAL-ENGAGEMENT` rimangono parziali; pubblicare solo contenuto autorizzato/verificato con label fonte/stato/fallback.
- **Preferenze locali:** non migrare implicitamente `scd:follow-team:v1`, `scd:poll:weekly-ux:v1`, `scd:twin:v1` o `scd:avatar:v1` a un account/server, né confonderle con dato canonico o consenso analytics.
- **Identity and private data:** `CAP-IDENTITY-ACCESS` parziale, R20 runtime corrente, Supabase staged. Un account per persona, ruolo non selezionabile nel client, ruolo/scope lato server, match ambiguo a revisione, codice temporaneo e audit (`SCD_SYSTEM_MANIFEST.json:4131–4159`). Safeguarding resta separato.
- **Football private:** `CAP-FOOTBALL-PRIVATE-CORE` parziale; proteggere convocazioni, presenze, dati personali/sanitari, statistiche e documenti per ruolo/scope. Nessun passaggio in feed pubblico.
- **Operazioni e facility:** nessun fake-live. Per ogni tile/azione documentare internamente capability, source, state, role/scope, runtime dependency, fallback e next action prima di mostrarlo.
- **Provenance/fallback:** conservare source, `updated_at`, stagione/validità, confidence e status disponibili. Righe stale/errore/offline non vanno presentate come correnti.
- **Asset:** file, hash, crop accessibile e provenienza restano invariati; i loghi ufficiali o marchi non si ridisegnano. Nessuno sponsor/avversario/kit inventato.

## Responsive rules

- Una sola esperienza e feature set: composizione mobile, tablet, desktop e ultrawide adattata alla larghezza/contenuto, non un telefono dentro il desktop né card mobile stirate sul wide.
- Usare i token canonici, gerarchia editoriale/operativa, azioni primarie visibili e densità contestuale; il dato verificato precede decorazione. Regole container/feature detection solo dopo QA della composizione concreta.
- Verificare safe-area, orientamento, DPR alto, zoom/font scaling, tastiera virtuale, touch/pointer, rete lenta, contrast preference, clipping e scroll orizzontale; preservare percorsi equivalenti per le azioni desktop su mobile.
- Separare goal pubblici, contesto personale e strumenti per ruolo. Navigazione e contenuti privati non devono finire in superfici pubbliche o notifiche non autorizzate.

## Motion plan

- Motion esclusivamente per feedback, transizione di pannello e orientamento: riferimento token circa `180 ms` micro-interazione e `260 ms` transizione pannello.
- Rispettare `prefers-reduced-motion`: rimuovere/sostituire movimento non essenziale conservando stato, focus e feedback; nessun autoplay/parallax/bounce che copra dati.
- Non animare uno stato in modo che sembri più “live” o sincronizzato di quanto provi la fonte. Motion non maschera latenza, errori o assenza di adapter.

## Smart Facility: stati e regole

Usare soltanto gli stati ammessi dal gate R57:

| Stato | Regola di presentazione |
|---|---|
| `CONNECTED` | Solo con adapter identificato, ultimo esito controllabile, source e scope autorizzato. Indicare freschezza e azione/fallback. |
| `READY_FOR_ADAPTER` | Dominio pronto, ma integrazione non collegata; non presentare controllo o dato sensore. |
| `NOT_CONNECTED` | Nessuna connessione dichiarata per quel servizio; offrire solo azione manuale autorizzata, se esistente. |
| `UNVERIFIED` | Default quando manca prova di runtime/fonte/freschezza. Nessun badge “live”, “connected”, “automatico” o equivalente. |
| `MANUAL_CHECK_REQUIRED` | Ispezione/checklist effettuata o richiesta da una persona autorizzata; mostrare esito reale, timestamp e responsabile solo se forniti dal servizio. |

Nessun interruttore, allarme, serratura, luce, energia, occupazione campo o sensore simulato. Codici chiave, PIN, credenziali e dettagli sensibili non appaiono in UI pubblica o log client. Adapter e stati live non verificati in questo blocco: `UNVERIFIED`, non `NOT_CONNECTED`.

## Screenshot e VISUAL_QA

**`VISUAL_QA: NOT_RUN`** — documento di pianificazione; nessuna schermata è stata modificata e non sono stati eseguiti screenshot, visual comparison, browser QA o test su device. La tabella seguente è la matrice richiesta per il successivo blocco UI, non prova completata.

| Viewport gate | Superfici da acquisire per ogni UI esistente nel blocco | Controlli aggiuntivi |
|---|---|---|
| Mobile `360x800` | Shell/Pulse/SCD Week, Calendar, Teams/Matchday, Social, Twin, Desk e le proiezioni Family/Athlete/Staff effettivamente raggiungibili. | Safe area, tastiera virtuale su form, CTA e target touch, nessun overflow/clipping. |
| Mobile `390x844` | Stessa matrice e stesso stato dati usato per il baseline comparabile. | Focus/keyboard, scroll e gerarchia; fallback rete lenta/offline. |
| Mobile `393x852` | Stessa matrice, su percorso pubblico e sessione autorizzata di test. | Font scale/zoom, contrasto e stato denied senza dati privati esposti. |
| Mobile `430x932` | Stessa matrice; controllare composizione ampia mobile, non scalare semplicemente i componenti. | Touch/pointer, safe area, pannelli e navigazione persistente. |
| Desktop `1280x800` | Tutte le superfici esistenti incluse quelle desk/operational autorizzate. | Layout desktop vero, gerarchia, tabelle secondarie, no phone frame. |
| Desktop `1440x900` | Stessa matrice e stessi dati/stati del baseline. | Larghezza di lettura, densità operativa, focus e clipping. |
| Desktop `1920x1080` | Stessa matrice senza stretching; includere moduli operativi esistenti. | Spazio negativo controllato, colonne, no hero/bar gigante o card wall. |

Per ciascuna superficie effettivamente implementata: salvare screenshot baseline e candidate, confrontare con master approvato e annotare route, build/commit, sessione/ruolo usato e source/status esibito. Non produrre screenshot di schermate inesistenti per far risultare completa la matrice.

Release checklist futura: `VISUAL_COMPARISON`, `NO_OVERFLOW`, `KEYBOARD_FOCUS`, `CONTRAST`, `REDUCED_MOTION`, `LOADING_EMPTY_ERROR_OFFLINE`, `SOURCE_FALLBACK`, `ASSET_INTEGRITY`, `TARGETED_E2E`; aggiungere denied/stale e verifica autenticazione dove la superficie è privata. Verificare in particolare che label/indicatori come “LIVE” o il pallino animato non dichiarino uno stato di servizio senza prova. Runbook e risultati collegati allo SHA esatto.

## Blocker

1. Nessuna visual baseline per schermata/viewport in questo blocco; prima decisione di layout-specific rebuild richiede screenshot e confronto con i master approvati (`HOME_PUBBLICA_APPROVED_BOARD`, `CALENDARIO_LIVE_APPROVED_BOARD`, `AREA_ATLETA_APPROVED_BOARD`, `AREA_FAMIGLIA_APPROVED_BOARD`, `AREA_STAFF_DIREZIONE_APPROVED_BOARD`).
2. `GAP-UI-001` e `GAP-UI-002` sono debito alto; la presenza del problema non stabilisce quali singoli componenti siano già stati risolti nella build Nova corrente.
3. Calendar Fusion è contrattato ma la riconciliazione eventi è `PENDING_REVIEW`; R20 Data Fabric/diagnostics non è provato nel runtime attuale (`GAP-R20-001`).
4. Supabase non può sostituire R20 prima di test auth/RLS/role-scope, dual-read, mobile/web e rollback (`GAP-CORE-001`).
5. Communications bidirezionali e upload Drive non sono da dichiarare live (`GAP-COMMS-001`, `GAP-INTAKE-001`); gli accessi sensibili richiedono review e backend invariato.
6. Non è stata trovata evidenza di adapter Smart Facility verificati in questa ricognizione; stato servizio `UNVERIFIED`. Anche la presenza di schermate autonome per Segreteria, Tornei e ogni submodulo materiali richiede conferma.
7. I check PR sullo SHA di partenza richiedevano azione/in approvazione e il controllo dinamico era in corso; main verde non equivale a CI PR verde.

## Rollback e confine implementativo

- Questo deliverable non cambia comportamento, endpoint, ruoli, dati, manifest, asset o deploy; rollback = revert del solo documento.
- Ogni futuro slice visuale va separato per schermata o gruppo di dipendenze, con screenshot pre/post, test mirati e gate del manifest; il revert ripristina markup/CSS/interazioni della slice senza migrazioni o scritture di produzione.
- Nessuna modifica autonoma a ruoli, permessi, pagamenti, tesseramenti, presenze, documenti sensibili o safeguarding. Nessun merge/deploy/produzione per Issue #96.

## Fonti consultate

- Normativa: `SCD_SYSTEM_MANIFEST.json` v3.26.0 (`north_star`, `product.core_experiences`, calendario/eventi, CAP R53–R56, `known_noncompliance`, `identity_access_r56`).
- Direzione visuale (ref `r57-copilot-control-plane`): `docs/SCD_VISUAL_EXPERIENCE_MASTER.md`, `config/scd-visual-system.json`, `config/scd-visual-experience-gate.v1.json`.
- Portfolio e superfici Universe (ref `r57-copilot-control-plane`): `config/ai-portfolio.v1.json`, `docs/SCD_UNIVERSE_MASTER_BUILD.md`; questa ricognizione è limitata a SCD Universe.
- Asset: `config/scd-assets.v1.json`.
- UI e selezione build locali: `index.html`, `scd-ng.js`, `scd-ng.css`, `scd-synth.css`, `ui-r52-social.css`, `scd-twin.js`, `app-r24-router.js`, `scripts/build-pages.mjs`.
- Test esistenti: `npm run test:manifest`, `npm run test:nextgen-contract`, `npm run test:r54-private`, `npm run test:r55-content`, `npm run test:r56-core`, `npm run test:r56-internal`, `npm run test:r56-calendar`, `npm run test:smoke`; le prove visuali future non sono sostituite da questi contract test.
