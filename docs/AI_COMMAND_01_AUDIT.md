# AI-COMMAND-01 — SCD Command Platform R22 audit

> Fotografia e audit documentale/tecnico eseguiti il 2026-10-03. Nessun deploy, merge o dato di produzione è stato eseguito o modificato. Le verifiche repository, CI e runtime sono tenute distinte: un test locale positivo non dimostra che il servizio Render live sia aggiornato o sicuro.

## Esito sintetico

R22 è `APP_ID: SCD_COMMAND_R22`, una delle tre applicazioni canoniche SCD del portfolio di quattro, classificata `TECHNICAL_WEB_APPLICATION_ORCHESTRATOR`. È l’app tecnica di orchestrazione per le operazioni SCD: distinta per responsabilità dalla SCD Universe e dalla Sponsor Platform, non è la Super App pubblica e non duplica identità, permessi o fonti canoniche. Commercial/Lia appartiene a R22 solo come comando o integrazione; la relativa esperienza commerciale per gli utenti appartiene alla Sponsor Platform. R20 resta autorevole dove richiesto dal manifest SCD fino a migrazione verificata.

R22 implementa un livello coerente sopra i comandi: plugin trusted con schema, autorizzazione applicativa, modalità inline/queue, eventi e adapter verso R20. L’`APP_AI_MANIFEST.md`, `config/ai-portfolio.v1.json` e `docs/AI_CONTINUOUS_EXECUTION_PROTOCOL.md`, letti dalla ref `ai-scd-command-r22` al commit `a0c105e3db209c28bc72ed52d707e04d32486edc`, confermano questo perimetro e vietano una seconda source of truth. Il nome del servizio Render identifica il runtime canonico atteso dell’app tecnica, non una diversa autorità dati. Il manifest dichiara `CAP-R22` `IMPLEMENTED`; questo audit conferma il codice e i test locali, ma **non** la produzione.

Sono confermati due difetti di sicurezza:

1. **HIGH — autenticazione di sviluppo utilizzabile con `NODE_ENV=production`:** se `AUTH_MODE=development` è impostato, gli header `x-user-id` e `x-user-roles` definiscono l’identità senza passare da R20. Il test locale ha dimostrato l’accettazione di un header `ADMIN` con HTTP 200 in questa configurazione. Non è stato possibile verificare le variabili effettive del servizio Render.
2. **MEDIUM — lettura non autenticata dei job:** `GET /v1/jobs/:id` restituisce risultato e motivo di errore senza autenticazione o controllo tenant/proprietario. Gli ID sono derivati deterministicamente dal tenant, comando e idempotency key; la lettura richiede quindi che un ID sia noto, prevedibile o divulgato.

Prima di dichiarare R22 pronto per la produzione, il piano prioritario è impedire sempre l’autenticazione di sviluppo in produzione, proteggere e limitare la lettura dei job, e aggiungere test di sicurezza e queue reali. Stato live del servizio R22, configurazione Render effettiva e comportamento Redis in produzione restano **UNVERIFIED**.

## SCD:STATE — fotografia prima della scrittura

| Campo | Stato | Evidenza |
|---|---|---|
| `REPOSITORY` | VERIFIED | `francesco1485/scd-colicoderviese-super-app`. |
| `CURRENT_MAIN_SHA` | VERIFIED | `d16a658786b7577af498a3104dc31ebdd17f7613`, confermato localmente e tramite GitHub. |
| `CURRENT_WORKING_BRANCH` | VERIFIED | `copilot/ai-scd-command-r22`; è diversa dalla branch iniziale indicata dall’Issue (`ai-scd-command-r22`). La branch remota attesa esiste, ma il lavoro resta sulla branch di task fornita. |
| `WORKING_TREE` | VERIFIED | Pulito prima delle modifiche documentali. Gli artefatti generati durante build/install sono stati rimossi o ripristinati. |
| `OPEN_PR` | VERIFIED | Nessuna PR aperta per Issue #87 o per la branch di lavoro prima di questa modifica. Esistono altre PR aperte, incluse #85, #82, #55 e #39. |
| `PR_STATUS` | VERIFIED | Issue #87 aperta; PR di questo audit non ancora presente al momento della fotografia. |
| `CI_STATUS` | UNVERIFIED | Nessuna CI specifica era stata eseguita sulla branch di questo audit. Come baseline, su `main` allo SHA indicato: E2E #37112220271 e manifest #37112220280 verdi; workflow Command Platform #36750546877 verde su R42 (evidenza storica, 2026-09-30). Production Evidence #37112220326 fallita perché il Render web service SCD riportava `fba68f6…` invece del commit atteso `d16a658…`; il fallimento non è una verifica del servizio R22. |
| `PAGES_STATUS` | VERIFIED | Deploy Pages #37112220325 completato con successo per `main` allo SHA `d16a658…`. |
| `RENDER_STATUS` | UNVERIFIED | La risoluzione DNS del probe pubblico R22 (`https://scd-colicoderviese-command-r22.onrender.com/health` e `/docs`) non è riuscita; non equivale a provare che il servizio sia assente. Nessuna configurazione Render specifica per R22 è presente nel repository. Il workflow Production Evidence verifica un servizio diverso, `SCD Super App`, e segnala il commit non aggiornato. |
| `MANIFEST_VERSION_OR_HASH` | VERIFIED | Manifest `3.26.0`; SHA-256 `46518c9e5aa258fd5bbc1e80ecf0d1fa7c65b12c6e32a7d721dc4b5ed3205baf`. |
| `RELEASE_DEPENDENCIES` | VERIFIED | Il manifest dichiara R25 → R26 `REQUIRED_PREDECESSOR` e `SATISFIED_IN_MAIN`; nessun prerequisito release specifico per R22 è registrato. |
| `DATA_SOURCES_VERIFIED` | VERIFIED | Il registro/contratto repository indica R20 come autorità e il plugin `sync-r20-public-feed` usa l’adapter R20. Le fonti/configurazioni effettivamente attive in Render restano non verificate; nessuna nuova source of truth viene proposta. |
| `KNOWN_BLOCKERS` | VERIFIED | Configurazione runtime R22 e commit Render effettivo non verificabili; i due finding di sicurezza richiedono hardening prima di considerare il servizio pronto; la suite non copre ancora auth-prod né queue/Redis reali. |
| `SAFE_NEXT_ACTION` | VERIFIED | Pubblicare questo audit documentale; trattare le correzioni come un successivo change set controllato, con test di sicurezza/queue e verifica della configurazione prima di qualunque deploy. |

### Baseline production evidence

Il run `SCD Production Evidence` #37112220326 ha verificato Pages e il manifest, ma è fallito sul solo `RENDER_HEALTH_COMMIT`: il servizio web SCD rispondeva con commit `fba68f62834f6f2343ddbe4b7507707ca543a83f`, mentre il commit atteso era `d16a658786b7577af498a3104dc31ebdd17f7613`. La stessa evidenza riportava Data Fabric disattivato in sicurezza e verifica R20 saltata perché il feature flag era off. Sono fatti riferiti al servizio web SCD, non al servizio Command Platform R22.

## SCD:EXPERT / SCD:ARCHITECT

- `TASK_CLASS`: audit tecnico e sicurezza, verifica dei test, pianificazione hardening.
- `DOMAINS`: API Node/Fastify, identità R20, autorizzazione, plugin, queue Redis/BullMQ, eventi/audit, runtime Render e CI.
- `FIXED`: R22 (`SCD_COMMAND_R22`) è una delle tre app canoniche SCD nel portfolio di quattro, con ruolo di applicazione tecnica di orchestrazione. È distinta dalla SCD Universe pubblica e dalla Sponsor Platform, senza diventare una seconda autorità di identità/dati; R20 resta autorevole dove lo prescrive il manifest fino a migrazione verificata. Commercial/Lia qui significa solo comandi/integrazioni; la UX commerciale appartiene a Sponsor Platform.
- `IMPROVABLE`: confine auth development/production, autorizzazione lettura job, limiti e gestione errori, timeout R20, retention eventi/job, test della modalità queue.
- `MISSING`: stato/configurazione Render R22, test con Redis reale, test auth-prod e controllo ownership job, prova runtime della sessione R20.
- `SOURCE_PLAN`: `SCD_SYSTEM_MANIFEST.json`, `AGENTS.md`, `.github/copilot-instructions.md`, `platform/README.md`, codice, test, workflow GitHub, log CI e probe pubblico non mutativo; `APP_AI_MANIFEST.md`, `config/ai-portfolio.v1.json` e `docs/AI_CONTINUOUS_EXECUTION_PROTOCOL.md` letti dalla ref `ai-scd-command-r22`, commit `a0c105e3db209c28bc72ed52d707e04d32486edc`. Le istruzioni e i confini di portfolio sono stati confrontati con l’audit.
- `TOOLCHAIN`: Node/npm, TypeScript, `tsx --test`, validatore manifest e workflow GitHub già presenti. Nessun nuovo tool o pacchetto aggiunto.
- `RISK`: escalation di ruolo se la modalità development è configurata in produzione; accesso ai risultati di job tramite ID noto; effetti ripetuti/rollback non verificati con queue reale; retention indefinita dello stream eventi.
- `TEST`: `npm run test:manifest`; `npm run check --prefix platform`; smoke locale HTTP health/commands e prova della configurazione auth development con `NODE_ENV=production`.
- `ROLLBACK`: revert del solo documento. Non è stato modificato codice prodotto, manifest, configurazione, servizio o dato.
- `NEXT_ACTION`: correggere prima i finding SEC-01 e SEC-02, aggiungere i test bloccanti indicati, poi verificare contratto/configurazione R22 senza deploy automatico.
- `SCD:ARCHITECT`: applicato come audit del flusso comandi, schema, identità, dati, eventi e permessi; nessuna UI o asset visuale modificato. `SCD:ASSET`: non applicabile.

## Architettura e flussi osservati

1. `POST /v1/commands/:command` chiama `RequestAuth`, seleziona il plugin, valida il payload tramite schema Zod, autorizza i ruoli e inoltra l’esecuzione al servizio comandi.
2. I plugin sono importati dinamicamente dalla directory configurata. Il codice dei plugin è codice eseguibile trusted, non codice utente; in produzione il watcher è disabilitato salvo override esplicito.
3. `createRuntime` seleziona Redis/BullMQ quando disponibili; senza Redis usa store/event bus in memoria e modalità inline. La documentazione dichiara correttamente che questa modalità non offre durabilità della coda.
4. In queue mode la submission conserva payload e snapshot dell’attore autenticato, crea un job BullMQ e pubblica eventi. Il worker valida e autorizza nuovamente contro lo snapshot conservato, esegue retry e rollback soltanto al fallimento finale.
5. `R20BridgeClient` inoltra le chiamate all’endpoint R20 configurato e trasmette la sessione per la validazione. Il plugin feed legge il feed pubblico e lo memorizza come cache temporanea; il codice non propone R22 come fonte canonica dei dati R20.

## Findings e classificazione

| ID / priorità | Classe | Evidenza e valutazione |
|---|---|---|
| `SEC-01` — HIGH | `FIX` | `/home/runner/work/scd-colicoderviese-super-app/scd-colicoderviese-super-app/platform/src/core/auth/RequestAuth.ts:23-40`: in assenza di sessione R20, basta `AUTH_MODE=development` per accettare identità e ruoli dagli header. Manca una guardia `NODE_ENV=production`. Riprodotto solo localmente: `NODE_ENV=production AUTH_MODE=development`, `x-user-roles: ADMIN` → comando privilegiato HTTP 200. La configurazione effettiva Render non è verificata; il finding è una configurazione insicura possibile e il codice la consente. |
| `SEC-02` — MEDIUM | `FIX` | `/home/runner/work/scd-colicoderviese-super-app/scd-colicoderviese-super-app/platform/src/api/server.ts:122-141`: `GET /v1/jobs/:id` non chiama `auth.authenticate` e restituisce `returnvalue` e `failedReason`. `/home/runner/work/scd-colicoderviese-super-app/scd-colicoderviese-super-app/platform/src/core/commands/CommandExecutionService.ts:91-119` deriva l’ID da tenant, comando e idempotency key. Un ID noto o divulgato può quindi esporre dati senza verifica di attore, tenant o ownership. L’output di `process-user-data` contiene `userId`. |
| `TECH-01` — P1 | `ENHANCE` | `/home/runner/work/scd-colicoderviese-super-app/scd-colicoderviese-super-app/platform/src/core/events/RedisEventBus.ts:10-29`: gli eventi sono aggiunti a uno stream senza limite o retention configurati. Il payload `user.data.processed` include il risultato con `userId` (`/home/runner/work/scd-colicoderviese-super-app/scd-colicoderviese-super-app/platform/src/plugins/process-user-data/ProcessUserDataCommand.ts:41-64`). Non è stato trovato un endpoint pubblico di lettura eventi; il gap osservato riguarda minimizzazione/retention, non prova di accesso esterno. |
| `TECH-02` — P1 | `ENHANCE` | `/home/runner/work/scd-colicoderviese-super-app/scd-colicoderviese-super-app/platform/src/adapters/R20BridgeClient.ts:16-43`: la chiamata upstream non imposta timeout/abort e l’errore upstream può risalire fino alla risposta API (`server.ts:103-117`). Aggiungere timeout, cancellazione e messaggi client sanitizzati; non effettuare retry di mutazioni R20. |
| `TECH-03` — P1 | `ENHANCE` | `/home/runner/work/scd-colicoderviese-super-app/scd-colicoderviese-super-app/platform/src/core/commands/CommandExecutionService.ts:91-128` e `/home/runner/work/scd-colicoderviese-super-app/scd-colicoderviese-super-app/platform/src/core/queue/commandQueue.ts:7-15`: idempotenza usa lookup/set separati, retention BullMQ per conteggio e mapping Redis con TTL di 24 ore. Va provata la coerenza di duplicate/race, job rimossi prima della scadenza e ritorni di stato; nessun test attuale usa Redis/BullMQ reale. |
| `TECH-04` — P1 | `ENHANCE` | `/home/runner/work/scd-colicoderviese-super-app/scd-colicoderviese-super-app/platform/src/worker/createCommandWorker.ts:23-40`: il worker usa la copia di `actor` e ruoli serializzata alla submission. Per future operazioni sensibili va definito se revoche di ruolo/sessione devono bloccare un job già accettato e testata la scelta; non si afferma che esista oggi un bypass R20 nel worker. |
| `TEST-01` — P1 | `COMPLETE` | `/home/runner/work/scd-colicoderviese-super-app/scd-colicoderviese-super-app/platform/tests/command-platform.test.ts:11-81` contiene tre test: discovery, esecuzione inline valida e rifiuto ruolo. Mancano test di route/auth/session, isolamento development-production, ownership job, queue/idempotenza, retry/rollback, Redis/event retention, startup con configurazioni invalide e shutdown. |
| `OPS-01` — P1 | `COMPLETE` | La configurazione root `/home/runner/work/scd-colicoderviese-super-app/scd-colicoderviese-super-app/render.yaml:1-14` dichiara il servizio web principale, non il servizio Command Platform. L’APP AI dichiara `scd-colicoderviese-command-r22` su Render/main, ma configurazione effettiva, commit e variabili runtime R22 non sono verificabili qui. Registrare il contratto operativo e ottenere evidenza di sola lettura prima di dichiarare `DEPLOYED` o `PRODUCTION_VERIFIED`. |
| `OPS-02` — P2 | `ENHANCE` | La versione runtime esposta da `/home/runner/work/scd-colicoderviese-super-app/scd-colicoderviese-super-app/platform/src/api/server.ts:50-69` è `22.0.0`, mentre `/home/runner/work/scd-colicoderviese-super-app/scd-colicoderviese-super-app/platform/package.json:1-4` dichiara `22.1.0`. Potrebbe essere una versione di contratto intenzionale; chiarirne la semantica e, se indica la release, allinearla alla fonte di build così l’evidenza runtime non è ambigua. |
| `ARCH-01` | `KEEP` / `INTEGRATE` | Plugin trusted separati, validazione schema, autorizzazione server-side, adapter R20 e fallback inline/queue sono una base coerente. Mantenere R20 come SoT e aggiungere funzioni AI solo come comandi autorizzati, validati, auditabili e con comportamento di errore/rollback definito. |
| `CLEANUP-01` | `REMOVE_WITH_REASON` | Nessuna rimozione è giustificata dall’evidenza disponibile. Non rimuovere plugin o directory: non sono stati identificati duplicati/stale code nel perimetro esaminato. |

La revisione specialistica di sicurezza ha confermato `SEC-01` e `SEC-02`. Non ha rilevato ulteriori problemi confermati nel mapping R20, nella discovery dei plugin trusted, nel worker/rollback, nella configurazione queue o nell’assenza di una route di lettura eventi. Ciò non sostituisce una verifica delle variabili Render o una prova con Redis di produzione.

## Verifiche eseguite

| Verifica | Esito | Dettaglio |
|---|---|---|
| `npm run test:manifest` | PASS | Manifest 3.26.0, 6 core experience, 37 fonti, 64 capability e 8 gap. |
| `npm run check --prefix platform` | PASS | Build TypeScript e 3 test `node:test` tutti verdi. |
| Smoke locale API | PASS | `/health` ha riportato servizio v22.0.0, 3 plugin, modalità inline e Redis non disponibile; `/v1/commands` ha esposto i tre plugin attesi. |
| Prova locale SEC-01 | FAIL-SAFE MANCANTE | Con `NODE_ENV=production AUTH_MODE=development` e header `ADMIN`, endpoint comando ha risposto HTTP 200. Eseguito solo su server locale con comando deterministico senza side effect esterni; nessuna chiamata a Render. |
| Probe pubblico Render R22 | UNVERIFIED | Il fetch del dominio `/health` e `/docs` non ha risolto il nome host nell’ambiente. Non inferire che il servizio non esista o sia down. |
| Test Redis/BullMQ | NOT RUN | Nessun Redis configurato localmente; la suite disponibile è in-memory/inline. |

Il primo tentativo di build locale non disponeva dei pacchetti installati. Sono state installate solo le dipendenze già dichiarate in `/home/runner/work/scd-colicoderviese-super-app/scd-colicoderviese-super-app/platform/package.json` senza aggiornare lockfile o aggiungere dipendenze; la suite è poi passata. `platform/node_modules` e gli artefatti build generati sono stati rimossi/ripristinati.

## Piano operativo di hardening

### P0 — chiudere i due finding di sicurezza

1. Rendere impossibile l’autenticazione header-based con `NODE_ENV=production`, indipendentemente da `AUTH_MODE`; fallire l’avvio se la configurazione è incoerente. In produzione ammettere soltanto sessioni validate da R20.
2. Proteggere `GET /v1/jobs/:id` con sessione R20 e controllo server-side di tenant/attore autorizzato sul job. Restituire solo campi necessari; evitare di esporre payload, risultato sensibile o errori interni. Usare risposta non rivelatrice per job inesistente/non autorizzato.
3. Aggiungere test che riproducono entrambi i casi: auth development respinta in produzione e job accessibile solo all’attore/scope autorizzato.

### P1 — affidabilità, confini dei dati e osservabilità

1. Impostare timeout/cancellazione per R20; validare endpoint consentiti e HTTPS in configurazione production; sanificare gli errori restituiti senza perdere correlation ID nei log.
2. Definire limiti per correlation/idempotency metadata e rate/concurrency per endpoint/worker; mantenere CORS come difesa aggiuntiva, mai come controllo di autorizzazione.
3. Definire retention/limiti dello stream Redis, minimizzare o pseudonimizzare i payload con dati personali e conservare la correlazione necessaria senza usare gli eventi come seconda fonte canonica.
4. Specificare la semantica di job già accettati dopo revoca sessione/ruolo; per comandi con effetti sensibili validare il contesto al momento dell’esecuzione.
5. Allineare atomicità, TTL idempotency e retention BullMQ; definire outcome deterministico in caso di duplicato concorrente o stato mapping/job non più presente.
6. Verificare che errori nella pubblicazione eventi o nel rollback non causino side effect ripetuti; rendere idempotenti i comandi che producono side effect e testare rollback solo quando è sicuro e compensabile.

### P2 — prove runtime e integrazione SCD

1. Aggiungere test d’integrazione con Redis/BullMQ controllato: dedup concorrente, retry, stato job, rollback finale, eventi e drain SIGTERM; mantenere separata la suite da qualsiasi dato/servizio di produzione.
2. Aggiungere smoke CI che dimostri l’avvio sicuro in production mode, rifiuti header dev, verifichi sessione R20 stub/mock, limiti accesso job e validi output sanitizzati.
3. Documentare servizio Render R22, commit atteso, build/start/health, modalità inline/queue e variabili richieste; valori segreti restano fuori dal repository. Confrontare runtime e commit con evidenze read-only prima di ogni futura proposta di release.
4. Integrare R22 progressivamente nel ciclo R57/SCD usando R20 come identità e fonte canonica. Nessun nuovo ruolo, archivio, calendario, CRM o fonte di verità.

### Definition of Done per l’hardening futuro

- `AUTH_MODE=development` non può avviare o autenticare in produzione.
- Accesso job autenticato e autorizzato da tenant/owner; test anonimo, cross-tenant e success owner.
- Test CI per R20, schema, inline, queue reale, dedup, retry, rollback e shutdown.
- Timeout e politica errori upstream; retention/limiti documentati per job ed eventi.
- Manifest aggiornato nello stesso change set solo se cambia contratto, ruolo, fonte o capability.
- Verifica live R22 read-only con commit/configuration evidence; lo stato resta `TESTED` finché produzione non è provata e approvata.

## Impatto SCD, rollback e next action

- **Capability:** `CAP-R22`, `CAP-IDENTITY-ACCESS`, `CAP-R20-RUNTIME-ACTIVATION` (per la dipendenza d’identità/bridge; nessuna nuova capacità introdotta).
- **Fonti:** R20; nessuna nuova fonte dati.
- **Manifest:** nessuna modifica contrattuale introdotta da questo audit documentale.
- **Privacy/sicurezza:** nessun dato personale reale letto o scritto; la prova auth usa identità fittizia locale. Eventi di esempio esaminati nel codice contengono un identificatore utente e sono inclusi nel piano di minimizzazione.
- **Rollback:** revert del solo `docs/AI_COMMAND_01_AUDIT.md`; non sono cambiati codice, configurazione, dati, permessi o deployment.
- **Safe next action:** revisionare questo audit e pianificare P0 in un change set separato con test; effettuare soltanto verifiche read-only del servizio Render finché l’ambiente non è verificabile. Nessun deploy è autorizzato da questo issue.
