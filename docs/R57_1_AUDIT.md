# R57.1 — Audit tecnico del sistema

> Audit documentale e non funzionale. Fotografia dello stato al 2026-10-03, prima della modifica di questo file. Il manifest è la fonte normativa; le dichiarazioni del manifest sono distinte dalle verifiche runtime.

## SCD:STATE

| Campo | Stato | Evidenza alla fotografia pre-scrittura |
|---|---|---|
| `REPOSITORY` | `VERIFIED` | `francesco1485/scd-colicoderviese-super-app` (contesto repository e branch GitHub). |
| `CURRENT_MAIN_SHA` | `VERIFIED` | `d16a658786b7577af498a3104dc31ebdd17f7613` (branch `main` su GitHub; confermato anche dalle run CI `37112220325`, `37112220271`, `37112220280`). |
| `CURRENT_WORKING_BRANCH` | `VERIFIED` | `copilot/create-audit-documentation`. |
| `WORKING_TREE` | `VERIFIED` | Pulito prima della modifica (`git status --porcelain` vuoto); `HEAD` coincideva con `main`. |
| `OPEN_PR` | `VERIFIED` | Nessuna PR associata al branch corrente al controllo. Erano aperte le PR #82, #55 e #39 su altri branch. |
| `PR_STATUS` | `VERIFIED` | Per questo branch: nessuna PR esistente; la PR richiesta da questo task è da creare dopo il commit. |
| `CI_STATUS` | `VERIFIED` | Su `main`/SHA indicato: E2E #585, manifest #517 e build/deploy Pages #371 conclusi `success`. La verifica produzione #284 era ancora `in_progress`; non equivale a esito positivo. |
| `PAGES_STATUS` | `VERIFIED` | Workflow Pages #371 completato `success` sullo SHA indicato; prova del deploy workflow, non misura indipendente di ogni route pubblica. |
| `RENDER_STATUS` | `UNVERIFIED` | La run Production Evidence #284 stava ancora verificando Pages, Render e R20. Nessun esito runtime conclusivo disponibile nella fotografia. |
| `MANIFEST_VERSION_OR_HASH` | `VERIFIED` | `SCD_SYSTEM_MANIFEST.json` versione `3.26.0`; SHA-256 `46518c9e5aa258fd5bbc1e80ecf0d1fa7c65b12c6e32a7d721dc4b5ed3205baf`. |
| `RELEASE_DEPENDENCIES` | `VERIFIED` | Il contratto mantiene R20 come core operativo primario; R21/Render espone l’API; Pages serve il frontend. Supabase è transizione staged/dark, non sostituto attivo di R20. Fonti dichiarate nel manifest. |
| `DATA_SOURCES_VERIFIED` | `VERIFIED` | Verificata la presenza nel manifest del registro `source_registry` e delle sorgenti referenziate dal codice. Verifica di accessibilità, freschezza e contenuto live: `UNVERIFIED`. |
| `KNOWN_BLOCKERS` | `VERIFIED` | Il manifest dichiara gap ad alta severità per UI, Data Fabric, modello eventi, comunicazioni, runtime R20, cutover Supabase e upload Intake; dettaglio in [PRODUCTION_BLOCKERS](#production_blockers). |
| `SAFE_NEXT_ACTION` | `VERIFIED` | Completare solo questo audit documentale, validare il contratto manifest esistente e sottoporre il documento a revisione; nessuna modifica runtime o dati. |

**Limite della fotografia:** gli stati descrivono evidenze disponibili alla data/ora dell’audit. `UNVERIFIED` non significa assente o fallito. In particolare, `production-evidence.yml` era in corso e il suo esito non è stato anticipato.

## EXECUTIVE_FINDINGS

1. **Il runtime è ibrido e la fonte operativa attuale resta R20.** Pages pubblica il bundle web; il servizio Node su Render espone API same-origin e fa da bridge ad Apps Script/R20. La transizione Supabase è esplicitamente staged/dark e subordinata a verifiche e rollback.
2. **La build web principale è quella NextGen/Nova selezionata dal manifest.** `scripts/build-pages.mjs` sceglie il bundle in base a `architecture.nextgen_preview.visual_mode`; il manifest la dichiara `PRODUCTION_PRIMARY`. Esistono anche implementazioni legacy, un prototipo Vite/React e un command platform separato: non vanno confusi con il bundle Pages effettivamente assemblato.
3. **Le release R53–R56 aggiungono contratti e vertical slice, non dimostrano da sole il completamento live.** I test di contratto e gli smoke E2E sono verdi sullo SHA fotografato; il manifest conserva capability `PARTIAL`, `SCHEMA_READY_RUNTIME_GATED` o `CONTRACTED` e gap espliciti.
4. **Il manifest contiene una discrepanza di release evidence da riconciliare.** `delivery_and_quality.release_truth.current_web_release` riporta manifest `3.4.0`, release `NG-0.4.5` e uno SHA precedente (righe 2198–2209), mentre il workflow production evidence si aspetta manifest `3.26.0`, release `NG-0.7.0` e versione `40.0.0` (`.github/workflows/production-evidence.yml:24–33`); l’HTML dichiara `40.0.0`/`NG-0.7.0` (`index.html:8–9`). Il valore storico nel manifest non è prova dello stato live.
5. **L’audit non promuove capability a “live”.** R20 deployment/probe, accesso effettivo alle fonti, RLS/cutover Supabase, reconciliation eventi e upload Drive richiedono prove runtime specifiche; alcune erano pendenti o esplicitamente bloccate.
6. **La direzione di prodotto è una sola SCD Universe.** SCD UNIVERSE / SCD COLICODERVIESE SUPER APP / SCD DIGITAL CLUB OPERATING SYSTEM è un unico prodotto adattivo; Sponsor/Partner, Command Platform R22, Commercial/Lia, Private Desk, Facility, Social e gli altri scope sono moduli, capability o runtime tecnici temporanei, non prodotti SCD concorrenti.

### SCD:EXPERT — classificazione del task

- `TASK_CLASS`: audit e documentazione, sola lettura delle evidenze e creazione di un documento.
- `DOMAINS`: architettura, runtime, flussi dati, autorizzazione, release, CI e debito tecnico.
- `FIXED`: manifest binding v3.26.0; R20 primary; comportamento fail-closed e limiti di safeguarding; nessuna nuova funzionalità prodotto.
- `IMPROVABLE`: chiarezza e tracciabilità della documentazione di stato e delle dipendenze.
- `MISSING`: esito Render/R20 della run in corso e verifica live indipendente delle fonti.
- `SOURCE_PLAN`: manifest prima; poi codice/workflow, test e risultati GitHub Actions/branch/PR.
- `TOOLCHAIN`: lettura repository e GitHub Actions; `npm run test:manifest` per il controllo già previsto dal progetto.
- `RISK`: presentare intenzioni, schema o CI verde come prova di attivazione in produzione.
- `TEST`: revisione del documento e `npm run test:manifest`; nessuna prova runtime aggiunta da questo audit.
- `ROLLBACK`: rimuovere il solo documento se la revisione ne contesta contenuto o ambito.
- `NEXT_ACTION`: mantenere il perimetro documentale, poi aprire la PR richiesta.

Nessuna UI o media viene modificata. `SCD:ARCHITECT` build e l’esecuzione di QA visuale non sono applicabili a questo audit documentale; i criteri visuali vincolanti sono comunque applicati alle classificazioni e ai limiti riportati sotto.

## ARCHITECTURE_MAP

### Identità prodotto e continuità R38–R56

L’identità canonica è **SCD UNIVERSE / SCD COLICODERVIESE SUPER APP / SCD DIGITAL CLUB OPERATING SYSTEM — ONE PRODUCT**. Le superfici pubbliche, personali e operative convergono nella stessa esperienza, identità, dati e autorizzazioni; moduli e runtime separati per motivi ingegneristici non costituiscono prodotti separati. Questa direzione è coerente con `north_star.single_product: true` nel manifest (`SCD_SYSTEM_MANIFEST.json:37–54`) ed è esplicitata nei documenti di direzione letti dalla ref `r57-copilot-control-plane` (`docs/SCD_UNIVERSE_MASTER_BUILD.md`, `docs/AI_APP_REGISTRY.md`).

La linea prodotto da preservare e integrare, senza riscrittura o sostituzione generica, comprende:

- **R38–R40:** Pulse / SCD Universe, esperienza umana e SCD Week/Home settimanale.
- **R41–R52:** integrazione mobile e crescita di Teams/Matchday, Social/Community e superfici partner nel medesimo prodotto.
- **R53–R56:** football/private core, esperienza Family/Athlete/Staff, contenuti pubblici verificati, SCD Twin e contesto personale, Staff & Family / Private Desk, identità, Calendar Fusion e Club Intelligence.

Questa continuità descrive lavoro prodotto e contratti presenti, non dichiara ogni capability completata o live. Sponsor, Commercial/Lia, Command Platform, Facility e Intake rimangono capability/moduli/workbench del sistema SCD, salvo diversa approvazione esplicita della Direzione.

```text
SCD UNIVERSE — UNICO PRODOTTO
  ├── Esperienza pubblica: Pulse / SCD Week / Calendar / Teams / Matchday / Social
  ├── Contesto personale: SCD Twin / Identity / Family / Athlete / Staff
  ├── Operating Center: Private Desk / Facility / Sponsor / Commercial / Intake
  └── Intelligence & orchestration: Calendar Fusion / Club Intelligence / R22

Runtime tecnico (componenti dello stesso prodotto, non prodotti distinti):
Client Web/PWA (GitHub Pages; bundle scelto da build-pages.mjs)
        │ same-origin /api
        ▼
Node.js HTTP server (server.js; Render)
        ├── API pubbliche / sponsor / Intake / newsroom
        └── bridge R20 ──► Google Apps Script / R20 ──► fogli, Drive, Gmail, Calendar

Supabase = modulo/core di transizione dual-run staged/dark, non un prodotto distinto
R22 Command Platform (directory platform/) = runtime/modulo di orchestrazione separato dal server Render
Android (android/) e client Expo (mobile/) = canali dello stesso prodotto
```

- **Manifest/architettura normativa:** `SCD_SYSTEM_MANIFEST.json:1994–2129`; sei core experiences in `product.core_experiences`.
- **Web pubblica:** `index.html` carica `scd-ng.js` e gli asset NextGen; `scripts/build-pages.mjs:6–23` seleziona la lista di file `nova` o `legacy` dalla configurazione manifest, poi assembla `_site` (`:25–55`). Il service worker è `sw.js`.
- **API runtime:** `server.js:1–33` definisce HTTP server, upstream Apps Script, feature flag Data Fabric/Supabase e configurazione runtime. `/health`, `/api/capabilities` e `/api/scd` sono route server (`server.js:930–951`); `callAppsScript` e `proxyAppsScript` sono i bridge (`server.js:491–548`).
- **Interfaccia legacy:** `app.js`/`app-r24-router.js` implementano shell e route legacy (`app-r24-router.js:2–23`). Il builder li include nel bundle solo nel ramo `legacy`; la loro presenza nel repository non prova che siano il bundle attivo.
- **Prototipo alternativo:** `src/main.jsx` importa React/Vite e `vite.config.js` configura build `dist`, ma `package.json` non espone script Vite e `build-pages.mjs` non copia `src/` o `dist/`. Stato: candidato da verificare, non rimozione approvata.
- **Command Platform R22:** `platform/src/api/server.ts` crea un runtime distinto con registry/queue e adapter R20. È un modulo/runtime di orchestrazione destinato a integrarsi nel singolo SCD Universe; la sua relazione di deploy con l’app descritta da `render.yaml` non è dimostrata da quel file.
- **Sponsor / Partner e Commercial/Lia:** workbench o moduli commerciali, non app SCD in competizione con Universe. Gli eventuali runtime dedicati sono supporto temporaneo da riconciliare; i percorsi Pages/Render effettivi vanno valutati con i relativi confini di autorizzazione.
- **Target architetturale:** Supabase/Postgres + Auth/Storage/Realtime, web React/TypeScript e mobile Expo, transizione `STRANGLER_DUAL_RUN`; non è lo stato runtime da assumere oggi (`SCD_SYSTEM_MANIFEST.json:2085–2113`).

## VISUAL_CLASSIFICATION

Classificazione documentale, non autorizzazione o implementazione UI:

- **`REBUILD_IMPROVE` — superfici legacy indicate dai gap manifest.** Riallineare presentazione, gerarchia, navigazione e interazione al prodotto SCD Universe; preservare dati, ID, backend/runtime e servizi reali, fonti/provenance, permessi e sicurezza. Non equivale a rifare il prodotto da zero (`SCD_SYSTEM_MANIFEST.json:2897–2908`; gate visuale R57, `docs/SCD_VISUAL_EXPERIENCE_MASTER.md` sulla ref `r57-copilot-control-plane`, §12).
- **`KEEP_LOCKED` — identità SCD, asset ufficiali e palette canonica.** Non ridisegnare stemmi/loghi/wordmark né sostituire i token mineral navy/lake aqua/muted gold/warm white e accenti desaturati definiti in `config/scd-visual-system.json` (ref `r57-copilot-control-plane`). I riferimenti sono subordinati al manifest binding.
- **`KEEP_ENHANCE` — asset ufficiali esistenti, quando presenti.** Sono ammessi solo miglioramenti tecnici compatibili con policy e provenance; in questo audit non è stato toccato alcun asset.
- **`RESEARCH_REAL_ASSET` — asset ufficiale non verificato o mancante.** Ricercare una fonte ufficiale/verificabile prima dell’uso; mai inventare stemmi, sponsor, avversari o kit.
- **`GENERATE_ORIGINAL` — elementi originali non sostitutivi.** Scene sintetiche originali sono ammesse nei limiti del contratto visuale; questo audit non ne genera.
- **Smart Facility / domotica:** classificare ogni servizio solo come `CONNECTED`, `READY_FOR_ADAPTER`, `NOT_CONNECTED`, `UNVERIFIED` o `MANUAL_CHECK_REQUIRED`. Lo stato concreto di sensori, luci, serrature, allarmi o adapter non è verificato qui; non presentare controlli o stati live simulati (`config/scd-visual-experience-gate.v1.json`, ref `r57-copilot-control-plane`).

## VISUAL_QA

- `STATUS: NOT_RUN — NOT_APPLICABLE_TO_DOCUMENTATION_ONLY_CHANGE`. Non sono state modificate schermate o media: nessuno screenshot, confronto visivo, browser QA o deploy è dichiarato come eseguito.
- Per ogni successiva modifica UI, il gate R57 richiede visual comparison e responsive QA agli viewport mobile `360x800`, `390x844`, `393x852`, `430x932` e desktop `1280x800`, `1440x900`, `1920x1080`; verificare overflow/clipping, keyboard/focus, contrasto, `prefers-reduced-motion`, loading/empty/error/offline, provenienza/fallback, integrità asset ed E2E mirato.
- Il risultato deve respingere template SaaS/Admin/WordPress generici, card wall anonime, hero brochure, palette reinventate, feature pubbliche/private confuse e servizi/dati live non verificati. Desktop, tablet e mobile restano composizioni responsive dello stesso prodotto.
- Smart Facility QA deve coprire esclusivamente stati reali o espliciti sopra elencati; assenza di prova resta `UNVERIFIED`, non “connected”.
- Fonti della classificazione e del gate (lette sulla ref `r57-copilot-control-plane`, subordinate a `SCD_SYSTEM_MANIFEST.json`): `docs/SCD_VISUAL_EXPERIENCE_MASTER.md`, `config/scd-visual-system.json`, `config/scd-visual-experience-gate.v1.json`.

## RUNTIME_MAP

| Superficie | Entry point / deploy dichiarato | Stato osservato e confine |
|---|---|---|
| Web / PWA | `index.html`, `sw.js`; artifact `_site` da `scripts/build-pages.mjs`; Pages workflow `.github/workflows/pages.yml` | Pages build/deploy #371 verde sullo SHA della fotografia. Il workflow costruisce asset statici; non costituisce la prova di disponibilità dell’API Render. |
| API Node | `server.js`; `render.yaml` configura `npm run check`, `npm start`, health `/health` | Il manifest descrive Render/R21; stato live non verificato al momento dell’audit, perché production evidence era ancora in corso. |
| R20 | Endpoint Apps Script configurato tramite `SCD_APPS_SCRIPT_URL` o fallback nel codice; `backend_patch_R*.gs` contiene patch server-side | Manifest: primary operativo. Il codice bridge non sostituisce prova di deployment dei patch R20. Il controllo dedicato è `npm run verify:r20`. |
| Supabase | `supabase/migrations/`; adapter mobile in `mobile/src/lib/`; feature flag `SCD_FEATURE_SUPABASE_CORE` in `server.js` | Flag disabilitato per default; manifest dice R20 primary/Supabase dark. Schema o migrazione applicata non equivalgono a cutover Web/mobile verificato. |
| Android / Expo | `android/`, `mobile/` | Workflow Android manuale o su cambi Android; ultima run trovata verde il 2026-09-28 su SHA precedente. Non è una prova di build/device sull’attuale SHA. |
| Command Platform R22 | `platform/src/` | Runtime/modulo di orchestrazione distinto. Workflow di rilascio integrato nel percorso Pages/Render non identificato nella configurazione esaminata: deploy effettivo `UNVERIFIED`; non è un prodotto SCD distinto. |
| Sponsor / Commercial | Workbench e route di modulo; alcune superfici hanno runtime di supporto dedicati | Moduli del singolo SCD Universe, con autorizzazione e integrazione da verificare; runtime di supporto non definiscono identità prodotto separate. |

`verify:production` confronta versione, commit, manifest e capability su Pages/Render, e interroga R20 per il contratto Data Fabric quando il relativo flag è attivo (`scripts/verify-production.mjs:3–10, 44–117, 147–198`). Il suo workflow carica evidenza come artifact ma, alla fotografia, la run era ancora attiva.

## DATA_FLOW_MAP

1. **Feed/superficie pubblica — verificato nel codice:** browser → `/api/scd` (`public.feed`, calendario/altre azioni) o route newsroom → server Node → Apps Script/R20. Il client pubblico gestisce stato vuoto/in sincronizzazione; il contenuto curato è dichiarato in `content/public-club.v1.json` con autorità Direzione. Esempi: `server.js:491–548, 930–951`, `SCD_SYSTEM_MANIFEST.json:4110–4129`.
2. **Back-office — fonte dichiarata:** Drive e Gmail sono catalogazione/documenti e inbox operativa; Sheets sono registri per domini specifici; R20 mantiene auth/ruoli/scope, richieste, calendario e operatività (`SCD_SYSTEM_MANIFEST.json:681–950`). La registry è verificata nel repository, non l’accesso corrente ai dati.
3. **News e fonti esterne:** fonte ufficiale/federale prevale sulla secondaria; sito/Social sono limitati o link-only finché freshness/adapter non è autorizzato. I contenuti devono conservare fonte e stato; dati sportivi non verificati non si inventano (`source_registry`, `SCD_SYSTEM_MANIFEST.json:681–950, 4110–4129`).
4. **Calendario:** sorgenti federali, R20, Google Calendar e iniziative club sono progettate per riconciliazione su un `EVENT_ID` e viste autorizzate. Il manifest dice `R56_CONTRACTED`, conflitti `PENDING_REVIEW`, e richiede deployment/probe runtime; contratto progettuale, non prova di sincronizzazione completa (`SCD_SYSTEM_MANIFEST.json:1334–1435`, migration R56).
5. **Data Fabric Drive/Gmail:** il manifest dichiara cataloghi/archivi ma anche che manca un runtime continuo con scansione incrementale, dedup, entity linking, revisione e dashboard (`GAP-DATA-001`, `:2911–2915`). Quindi non descrivere i cataloghi come pipeline live end-to-end.
6. **Supabase:** migrazioni versionate, trigger/context e RLS in `supabase/migrations/`; flag server-side per attivazione. Il modello di transizione richiede confronto dual-read R20↔Supabase, vertical slice Web/mobile e rollback (`SCD_SYSTEM_MANIFEST.json:2039–2061, 3079–3098`).
7. **Analytics accessi:** il patch R56 scrive eventi di accesso e restituisce metriche aggregate per Direzione; il codice dipende da funzioni R20 e da persistenza Apps Script. Lo schema/validator non dimostra che il percorso sia distribuito o che l’append sia sempre riuscito (`backend_patch_R56_identity_access.gs:234–315`).

## AUTHORIZATION_MAP

- **Regola canonica:** account singolo, ruolo iniziale `USER_BASE`, nessuna auto-selezione del ruolo; più ruoli possibili sullo stesso account; scope per stagione, squadra, persona, legame famiglia, area e funzione; autorizzazione server-side. R20 è l’identity engine corrente, Supabase Auth quello target/staged (`SCD_SYSTEM_MANIFEST.json:457–511`).
- **R20/sessione:** le operazioni private arrivano al server con azione/payload/token e sono inoltrate al bridge R20; auth/ruolo e scope devono essere verificati lato server. Le funzioni R56 richiedono sessione e autorizzazione Direzione per assegnare accessi (`backend_patch_R56_identity_access.gs:7–15, 211–232, 317–345`).
- **Preflight pubblico:** risposta neutra senza rivelare account/ruolo; corrispondenze ambigue vanno a revisione. OTP/codice e PIN sono delegati al motore R20; il patch R56 è un bridge, non il motore OTP (`backend_patch_R56_identity_access.gs:92–209, 317–393`; manifest `:4131–4160`).
- **Ramo sponsor:** cookie di sessione HttpOnly/SameSite e validazione token verso R20; profili Direzione/Commerciale hanno capability diverse. È una policy specifica dell’area sponsor, non il modello universale delle altre route (`server.js:104–167`).
- **Supabase:** le migration definiscono RLS e context RPC, ma la transizione resta staged. Non assumere che le policy siano verificate in produzione; sono richiesti security review, test auth/role/scope, dual-read e rollback (`supabase/migrations/20260929_r33_club_graph_foundation.sql`, `20260929_r35_auth_context_rls_normalization.sql`; manifest `:2052–2061`).
- **Safeguarding:** canale separato e riservato; non deve transitare nei flussi ordinari, CRM, analytics o community. L’isolamento è requisito di sistema, non inferibile dalla sola presenza di una route/UI.

## R53_R56_DRIFT

| Release | Direzione e implementazione tracciata | Drift / stato non dimostrato |
|---|---|---|
| **R38–R40** | Fondazione SCD Universe/Pulse, esperienza umana e SCD Week/Home settimanale. | Base della linea prodotto da mantenere; implementazioni legacy o visual debt non autorizzano una sostituzione con un prodotto generico. |
| **R41–R52** | Evoluzione dei canali e integrazione di SCD Twin, Community/Social, Teams/Matchday e superfici partner. | I moduli e gli eventuali runtime temporanei convergono nell’unico SCD Universe; il confine d’ingegneria non è un confine di prodotto. |
| **R53** | Core football/social e prime capability private; validatore `scripts/validate-r53-core.mjs`; migration/contratti legati al core Supabase e R20. | Capability football privata dichiarata `PARTIAL`; schema/contratto e gate CI non attestano un runtime live/cutover. La superficie privata rimane dipendente da ruoli/scope R20. |
| **R54** | Vertical slice privata Family/Athlete/Staff; `scripts/validate-r54-private.mjs`; Pages workflow esegue il gate R54. | UI/vertical slice e contratto non provano coerenza completa delle schermate legacy né ogni operazione live. Il manifest mantiene gap UI e R20 come primary. |
| **R55** | Contenuto pubblico curato, provenienza/status e regole anti-invenzione; file `content/public-club.v1.json`, `scripts/validate-r55-content.mjs`; manifest `CONTENT_LAYER_ACTIVE` (`:4110–4129`). | Il layer curated è attivo come contenuto, ma non sostituisce dati sportivi canonici; fonte news del sito è stale/limitata. Newsroom e fonti devono essere aggiornati/verificati. |
| **R56** | Bridge identity/access (`backend_patch_R56_identity_access.gs`), schema auth/context, Calendar Fusion e intelligence; test `validate-r56-*` e `tests/calendar-fusion-contract.mjs`. Manifest `FOUNDATION_ACTIVE_R20_PRIMARY_SUPABASE_STAGED`, mentre Club Intelligence è `SCHEMA_READY_RUNTIME_GATED` (`:4131–4170`). | Funzioni identity e inviti dipendono da API R20; il runtime di produzione documentato non supporta i contratti Data Fabric/diagnostics (`GAP-R20-001`, `:2929–2933`). Calendar Fusion è `CONTRACTED`, conflitti `PENDING_REVIEW`; Supabase è dark e non ancora cutover. |

**Drift trasversale verificato:** codice/test di release si sono evoluti oltre i metadati di `current_web_release` nel manifest (`NG-0.4.5`, `3.4.0`, SHA storico), mentre il workflow e `index.html` si aspettano `NG-0.7.0`, manifest `3.26.0` e versione `40.0.0`. È necessario riconciliare quel record nel manifest con prove aggiornate in un cambiamento successivo; questo audit non lo modifica.

**Confine della verifica:** run Pages/E2E verdi dimostrano i gate elencati eseguiti su uno SHA, non l’attivazione di API, inviti, OTP, RLS o dati reali dei provider. Gli stati di rilascio nel manifest sono da confrontare con produzione e non vanno reinterpretati come misure live.

## CI_GAPS

- **Copertura non uniforme tra workflow.** `.github/workflows/pages.yml:29–49` esegue manifest, core operativo/social, R53 e R54 e prepara l’artefatto. `.github/workflows/e2e.yml:20–67` esegue inoltre Supabase/mobile, R55, R56 e numerosi contract/smoke test. Il deploy Pages non esegue l’intera suite `npm run check`.
- **Prova di produzione fuori dal gate PR.** `production-evidence.yml` è attivato da push su `main` o dispatch, non da `pull_request`; è quindi post-merge. Alla fotografia l’esecuzione #284 era ancora `in_progress`, senza esito Render/R20.
- **La policy PR controlla dichiarazioni testuali.** `manifest-pr-policy.yml` richiede stato, SHA, capability, sorgenti, test e release evidence nel testo PR. È una guardia utile, ma non sostituisce una prova runtime; PR recenti su altri branch hanno avuto tentativi falliti e successivi verdi, quindi l’esito va letto per SHA/tentativo.
- **Android non segue ogni commit.** Il workflow scatta su dispatch o modifiche in `android/**`/workflow/icon; ultimo successo osservato era su uno SHA precedente, non sullo SHA corrente.
- **Nessuna verifica completa visibile dei requisiti di qualità dichiarati.** Il manifest elenca responsive E2E desktop/mobile, confronto visual master, safeguarding isolation, provenance, RLS security review e dual-read (`:2131–2175`); i workflow correnti eseguono test di contratto e smoke, ma non tutti quei controlli risultano gate automatici espliciti e per ogni PR.
- **Visual QA non automatizzata uniformemente per ogni superficie.** Il master/gate R57 richiede screenshot/comparison, viewport desktop/mobile, accessibilità e stati loading/empty/error/offline; il documento non costituisce evidenza di tali prove e nessuna UI è stata verificata in questa modifica.
- **Stato di `npm run check`:** script esistente e ampio (`package.json:8–44`), ma la copertura dei workflow è selettiva. Non è stato eseguito in questo audit documentale; il controllo richiesto qui è `npm run test:manifest`.

## PRODUCTION_BLOCKERS

I seguenti blocker derivano dal manifest e, dove indicato, dal workflow attualmente pendente; non sono nuove valutazioni di stato live.

1. **R20 Data Fabric non aggiornato/provato (`HIGH`, `GAP-R20-001`).** Il runtime documentato come osservato è `2026.09.28-R20.0-PUBLIC-FIRST` e manca `public.datafabric.contract`/`direction.datafabric.status`; mantenere `FF-DATAFABRIC-OBSERVABILITY` disattivato finché patch, `npm run verify:r20` e prova production non sono verdi (`SCD_SYSTEM_MANIFEST.json:2929–2933, 3065–3077`).
2. **Cutover Supabase bloccato.** Mancano come prerequisiti comprovati review RLS, test role/scope, dual-read, slice Web/mobile e rollback. R20 deve restare primary e Supabase dark (`:2039–2061, 2936–2940`).
3. **Riconciliazione eventi incompleta.** Il contratto richiede un evento canonico multi-sorgente, ma il manifest registra `R56_CONTRACTED`/`PENDING_REVIEW` e deployment/probe agenda ancora necessari (`:1334–1435`; `GAP-EVENT-001`, `:2917–2921`).
4. **Upload Intake verso Drive non attivo.** La factory di signed link esiste, ma routing upload server-side, controlli MIME/dimensione, audit e rate limit sono richiesti prima di abilitare il flag (`GAP-INTAKE-001`, `:2943–2947`).
5. **Comunicazioni bidirezionali non live.** Chat/Confidence/AnConfidence richiedono storage, autorizzazione, protezioni minori e moderazione; non vanno dichiarate attive (`GAP-COMMS-001`, `:2923–2926`).
6. **Verifica produzione alla fotografia pendente.** La run #284 era ancora in esecuzione; Render e R20 rimangono `UNVERIFIED` finché non si acquisisce l’artifact/esito e si controlla il commit esatto.
7. **UI desktop/private non allineata.** Il manifest segnala HIGH per servizi/profilo privato, atleta, famiglia, staff e schermate legacy (`GAP-UI-001/002`, `:2897–2908`).

## TECHNICAL_DEBT

- La transizione R20 → Supabase ha più implementazioni/migrazioni e gating; il confine tra schema staged, runtime dual-run e feature live deve rimanere esplicito.
- R56 identity bridge consulta il registro utenti R20 e può ricorrere al foglio persone canonico; conflitti e fallback richiedono revisione, non una deduzione automatica. Il preflight pubblico è intenzionalmente neutro.
- Il bridge registra audit e dipende da funzioni/servizi R20 per sessione, assegnazione accessi e codice temporaneo. La disponibilità e l’atomicità di questi contratti vanno provate nel runtime; test unitari isolati non sono prova d’integrazione.
- Calendario: adapter e schema precedono una riconciliazione runtime completa; conflitti fra sorgenti non devono sovrascriversi silenziosamente.
- CI e release evidence sono frammentate tra gates Pages, E2E, policy PR, Android e production evidence. Un esito verde di un solo workflow non certifica l’intero manifesto.
- `current_web_release` nel manifest è obsoleto rispetto alle aspettative presenti in HTML/workflow (vedi drift R53–R56); mantenere unica e aggiornata la fonte della release evidence.
- Il server Node concentra molte route e bridge in `server.js`; il command platform TypeScript è una superficie separata. Ownership, deploy e confine API richiedono documentazione coerente prima di consolidare.
- Il registro `known_noncompliance` contiene debito esplicito: UI desktop/private; pipeline continua Drive/Gmail; evento unico; chat sicura; runtime R20; cutover Supabase; upload documentale.

## REMOVE_CANDIDATES

Questa è una lista di **candidati a verifica/deprecazione**, non autorizzazione alla cancellazione. Prima di rimuovere un elemento servono ricerca di riferimenti, owner decision, verifica dei canali/rollback e aggiornamento manifest se cambia un contratto.

| Candidato | Evidenza per la revisione | Salvaguardia richiesta |
|---|---|---|
| Prototipo React/Vite `src/main.jsx` + `vite.config.js` | Il builder Pages non copia `src/`/`dist/`; nessuno script Vite è esposto in `package.json`. | Confermare che non esista deploy, consumer o ramo approvato che lo utilizzi prima di archiviare/rimuovere. |
| Runtime UI legacy scelto dal ramo `legacy` del builder (`app.js`, `app-r24-router.js`, relativi CSS) | La configurazione attuale seleziona il ramo NextGen/Nova; i file legacy restano nel repo e alcuni sono sottoposti a syntax/contract checks. | Non rimuovere finché non sono confermati uso di rollback, cache/service worker, link diretti, test e compatibilità di release. |
| `platform/` come runtime autonomo | Ha entry point/API, adapter R20 e test propri, ma la relazione di deploy con `server.js`/`render.yaml` non è chiara dalle configurazioni esaminate. | Chiarire come integrarlo come modulo di orchestrazione nel singolo SCD Universe; solo poi decidere destino del runtime, senza duplicare R20 o creare un prodotto/gestionale parallelo. |
| Documentazione storica e specifiche pre-manifest | README afferma che i documenti Markdown non sono normativi; manifest dichiara le specifiche di supporto e supersede i documenti indicati come precedenti. | Non cancellare in blocco: preservare runbook/ADR e riferimenti operativi; eliminare solo con verifica di link e obsolescenza. |

## SAFE_IMPLEMENTATION_PLAN

1. **Chiudere questa PR come documentazione-only e preservare la direzione canonica.** SCD Universe/Super App resta l’unico prodotto: mantenere e integrare il lavoro R38–R56; nessuna funzionalità, modifica ai dati, flag, ruolo, deployment o contratto manifest in questa PR.
2. **Aggiornare la fotografia prima di ogni intervento successivo.** Verificare main SHA, working tree, PR, CI, Pages, Render, manifest e sorgenti; non riusare questo stato come stato corrente.
3. **Riconciliare la release evidence nel manifest** in una PR separata: confrontare manifest binding, HTML, bundle distribuito, Pages/Render, commit e artifact production; cambiare record solo con evidenza verificata.
4. **Sbloccare dipendenze in sequenza conservativa:** deployment R20 e probe diretto; poi prova end-to-end della capability dietro feature flag. Per Supabase completare RLS/auth/role-scope, dual-read, Web/mobile e rollback prima di qualsiasi cutover; R20 resta primary nel frattempo.
5. **Completare i contratti evento e upload solo con source/owner approvati.** Gestire conflitti come review pendente; per Drive richiedere adapter server-side, validazioni, audit e rate limiting prima di abilitare submission/upload.
6. **Ridurre `known_noncompliance` per capability**, applicando `VISUAL_CLASSIFICATION` e il gate `VISUAL_QA` R57, verificando master visuali, dati reali, autorizzazioni e test associati. Non dichiarare una capability completa sulla base del solo test tecnico.
7. **Uniformare i gate CI e le prove release** in un cambiamento dedicato: distinguere check PR da prova post-deploy, coprire i requisiti obbligatori del manifest e pubblicare artifact versionati per SHA.
8. **Decidere i remove candidates per ultimo.** Inventario delle dipendenze e dei rollback, approvazione del responsabile e rimozioni atomiche; aggiornare il manifest nello stesso PR se si modifica un contratto.

### Riferimenti principali

- Fonte normativa, capabilities, release truth e debito: `SCD_SYSTEM_MANIFEST.json`.
- Direzione prodotto canonica e continuità R38–R56 (lette dalla ref `r57-copilot-control-plane`): `docs/SCD_UNIVERSE_MASTER_BUILD.md`, `docs/AI_APP_REGISTRY.md`.
- Gate visuale/esperienza (letti dalla ref `r57-copilot-control-plane`; subordinati al manifest): `docs/SCD_VISUAL_EXPERIENCE_MASTER.md`, `config/scd-visual-system.json`, `config/scd-visual-experience-gate.v1.json`.
- Runtime/deploy: `index.html`, `server.js`, `render.yaml`, `scripts/build-pages.mjs`.
- Release gates: `.github/workflows/pages.yml`, `e2e.yml`, `production-evidence.yml`, `manifest-pr-policy.yml`, `android-build.yml`.
- Verificatori: `scripts/verify-production.mjs`, `scripts/verify-r20-direct.mjs`, `scripts/validate-r53-core.mjs`, `scripts/validate-r54-private.mjs`, `scripts/validate-r55-content.mjs`, `scripts/validate-r56-core.mjs`, `scripts/validate-r56-internal.mjs`, `tests/calendar-fusion-contract.mjs`.
- Identity/access: `backend_patch_R56_identity_access.gs`, migration `supabase/migrations/20261002_r56_identity_calendar_club_intelligence.sql`.
