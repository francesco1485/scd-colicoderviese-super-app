# AI-SPONSOR-01 — SCD Sponsor Platform audit & consolidation

> Audit documentale e tecnico del 2026-10-03. Nessun deploy, merge o dato di produzione è stato eseguito o modificato. Codice/test locali, configurazione dichiarata ed evidenza runtime sono tenuti separati. I dati commerciali incorporati nel codice o negli snapshot sono trattati come non verificati, non come dati fittizi o canonici.

## Esito sintetico

Il modulo ha una superficie pubblica per presentazione/richieste e una superficie privata Partner OS con CRM, progetti, agenda, media e documenti. Il codice prevede R20/Apps Script come ponte ai dati canonici e una modalità di fallback a snapshot. La separazione è una buona base, ma due difetti di accesso sono **HIGH** e richiedono hardening prima di dichiarare sicura l’area privata:

1. Il server Node può servire file arbitrari sotto `ROOT` senza sessione; se `ROOT` contiene il repository, `GET /config/sponsor-development.snapshot.json` espone lo snapshot commerciale e dati di contatto/preventivi.
2. Il profilo `COMMERCIALE` riceve `finance: false`, ma le route CRM e l’app privata verificano soltanto una sessione sponsor autorizzata; la UI nasconde alcune viste, senza una corrispondente autorizzazione server-side. Il bundle privato contiene dati commerciali hardcoded, quindi un utente con quel profilo può ricevere più dati dei permessi dichiarati.

La revisione specialistica di sicurezza ha confermato entrambi i finding. Sono difetti nel codice/configurazione possibile; il servizio Render reale non è stato raggiungibile e non si afferma che siano sfruttabili nell’ambiente live corrente. La priorità è rendere esplicita l’allowlist dei file statici e applicare capabilities server-side per ciascuna route/campo. R20 resta identità/autorità; non va creato un secondo CRM o database.

## SCD:STATE — fotografia prima della modifica

| Campo | Stato | Evidenza |
|---|---|---|
| `REPOSITORY` | VERIFIED | `francesco1485/scd-colicoderviese-super-app`. |
| `CURRENT_MAIN_SHA` | VERIFIED | `d16a658786b7577af498a3104dc31ebdd17f7613`. |
| `CURRENT_WORKING_BRANCH` | VERIFIED | `copilot/ai-scd-command-r22`; differisce dalla branch AI Sponsor `ai-scd-sponsor-platform`. |
| `WORKING_TREE` | VERIFIED | Pulito prima di aggiungere questo audit; il diff della PR #91 conteneva solo documentazione R22. |
| `OPEN_PR` | VERIFIED | PR #91 aperta in draft (audit R22); PR #55 sponsor R45 aperta e `mergeable_state=dirty`; altre PR aperte #85, #82 e #39. |
| `PR_STATUS` | VERIFIED | Nessuna PR specifica per Issue #86 prima dell’audit; PR #91 è la branch disponibile e viene estesa con questo risultato. |
| `CI_STATUS` | UNVERIFIED | `npm run check` completo è passato localmente. PR #91 non aveva check GitHub associati. Workflow storico Command Platform non costituisce CI sponsor; nessun nuovo workflow live è stato avviato. |
| `PAGES_STATUS` | UNVERIFIED | Deploy Pages #37112220325 verde su `main` allo SHA `d16a658…`; il probe della pagina pubblica non ha risolto il dominio in questo ambiente. |
| `RENDER_STATUS` | UNVERIFIED | Il probe di `scd-sponsor-platform.onrender.com` non ha risolto il DNS. `render.yaml` dichiara il servizio principale SCD, non un contratto specifico Sponsor. Nessuna configurazione o variabile Render live verificabile. |
| `MANIFEST_VERSION_OR_HASH` | VERIFIED | Manifest 3.26.0; SHA-256 `46518c9e5aa258fd5bbc1e80ecf0d1fa7c65b12c6e32a7d721dc4b5ed3205baf`. |
| `RELEASE_DEPENDENCIES` | VERIFIED | R25 → R26 `REQUIRED_PREDECESSOR` e `SATISFIED_IN_MAIN`; nessun prerequisito Sponsor specifico registrato. |
| `DATA_SOURCES_VERIFIED` | VERIFIED | Registro fonti e riferimenti nel codice verificati a livello repository; contenuto corrente e uso nel servizio live restano non verificati. |
| `KNOWN_BLOCKERS` | VERIFIED | Static serving non allowlistato; capability finanziaria non applicata in ogni route; snapshot/fixture con provenienza e freschezza non verificabili nel runtime; stato Render, a11y visuale e performance live ignoti. |
| `SAFE_NEXT_ACTION` | VERIFIED | Revisionare questo audit; pianificare SEC-01/SEC-02 in un change set separato con test, mantenendo il servizio e i dati di produzione intatti. |

### AI instructions e confini normativi

- Letti `/home/runner/work/scd-colicoderviese-super-app/scd-colicoderviese-super-app/APP_AI_MANIFEST.md` e `/home/runner/work/scd-colicoderviese-super-app/scd-colicoderviese-super-app/.github/copilot-instructions.md` dalla branch remota `ai-scd-sponsor-platform`, oltre a `/home/runner/work/scd-colicoderviese-super-app/scd-colicoderviese-super-app/SCD_SYSTEM_MANIFEST.json`, `/home/runner/work/scd-colicoderviese-super-app/scd-colicoderviese-super-app/AGENTS.md`, `/home/runner/work/scd-colicoderviese-super-app/scd-colicoderviese-super-app/SCD_PERMANENT_COMMANDS.md` e `/home/runner/work/scd-colicoderviese-super-app/scd-colicoderviese-super-app/docs/architecture/SCD-AUTONOMOUS-DEVELOPMENT-PROTOCOL.md`.
- APP AI dichiara `scd-sponsor-platform` su Render/main, sorgente primaria `sponsor/`, niente deploy dalla AI branch, niente seconda source of truth e nessun dato sponsor/contratto/commitment inventato.
- La documentazione locale `/home/runner/work/scd-colicoderviese-super-app/scd-colicoderviese-super-app/sponsor/README.md` indica GitHub Pages e descrive scritture esterne disabilitate, mentre il codice Node espone già API pubbliche di lead/accesso e API private di agenda/comunicazioni. Questa documentazione è da riallineare al contratto verificato, non da assumere come stato runtime.

## SCD:EXPERT / SCD:ARCHITECT

- `TASK_CLASS`: audit tecnico, sicurezza/privacy, data lineage, UX/a11y/performance e piano di consolidamento.
- `DOMAINS`: superfici web pubblica/privata, R20/Apps Script, CRM commerciale, agenda, documenti/media, CI/Pages/Render.
- `FIXED`: R20 e i master registrati rimangono canonici; dati non verificati restano indisponibili/in attesa; niente CRM o database parallelo.
- `IMPROVABLE`: applicazione server-side delle capabilities, static file allowlist, freschezza/provenance, test role-aware, documentazione Render, validazione a11y/performance.
- `MISSING`: prove live Pages/Render, configurazione/commit del servizio Sponsor, verifica upstream corrente, matrice autorizzazioni effettiva per ruolo e visual QA live.
- `SOURCE_PLAN`: manifest e `source_registry`, APP AI/Copilot instructions, server/API, UI e fixture, test esistenti, workflow Pages, PR/branch GitHub, probe pubblico non mutativo.
- `TOOLCHAIN`: Node/npm e script `test:*` del progetto; non aggiunti strumenti o dipendenze.
- `RISK`: esposizione di preventivi/contatti tramite static serving; accesso a valori finanziari da un ruolo con `finance:false`; UI/fixture che possono essere interpretate come dati live.
- `TEST`: `npm run check` e test sponsor static/runtime/LED/community/design-system; probe Pages/Render non riusciti per DNS.
- `ROLLBACK`: revert del solo documento; nessun codice, dato, permesso o runtime modificato.
- `NEXT_ACTION`: SEC-01 e SEC-02 prima di ogni release; poi allineare fonti, UX e prove di produzione.
- `SCD:ARCHITECT`: applicato a flussi pubblici/privati, ruoli, dati e provenienza. Nessuna UI o asset modificato; `SCD:ASSET` non applicabile.

## Superfici e flussi osservati

| Area | Evidenza nel repository | Stato dell’audit |
|---|---|---|
| Pubblica | `/home/runner/work/scd-colicoderviese-super-app/scd-colicoderviese-super-app/sponsor/index.html` e `/home/runner/work/scd-colicoderviese-super-app/scd-colicoderviese-super-app/sponsor/sponsor.js`: presentazione, lead/access request, OTP/login, donazioni e partecipazione ai progetti. | Contratto statico e test locali verificati; runtime pubblico non raggiungibile. |
| Privata | `/home/runner/work/scd-colicoderviese-super-app/scd-colicoderviese-super-app/sponsor/app.html` e `/home/runner/work/scd-colicoderviese-super-app/scd-colicoderviese-super-app/sponsor/app.js`: Partner Hub, CRM, iniziative, agenda, catalogo, media, documenti, report e impostazioni. `/home/runner/work/scd-colicoderviese-super-app/scd-colicoderviese-super-app/server.js` valida la sessione sulle route private. | Il controllo di sessione esiste; il controllo delle singole capability finanziarie non è applicato server-side a tutte le route. |
| Ponte dati | `/home/runner/work/scd-colicoderviese-super-app/scd-colicoderviese-super-app/server.js` inoltra azioni private/pubbliche a Apps Script; `SCD_APPS_SCRIPT_URL` è un’impostazione di runtime. Le letture di sviluppo e community possono usare snapshot di fallback. | Endpoint e variabili effettive non verificabili; fallback deve restare chiaramente marcato e non diventare master. |
| CRM/stakeholder | `private.crm.summary/detail`; il Partner Hub in `/home/runner/work/scd-colicoderviese-super-app/scd-colicoderviese-super-app/sponsor/app.js` fonde righe locali con CRM. Motion profile e fornitori di progetto possono collegarsi per `crmStakeholderId`/`stakeholderId`. | Relazioni presenti nel codice; il match per nome e la completezza degli ID stabili richiedono test di dedup/correlazione. |
| Progetti/follow-up | `private.development.summary` fornisce iniziative e stati; l’Operational Focus in `/home/runner/work/scd-colicoderviese-super-app/scd-colicoderviese-super-app/sponsor/app.js` ordina azioni derivate, collega fornitori e propone eventi su `private.agenda`. | Stati e priorità UI sono viste derivate, non nuova fonte. Agenda e comunicazioni possono scrivere; nessuna write è stata eseguita in questo audit. |
| Documenti/media | Vista documenti e CRM agreements/touchpoints; `/home/runner/work/scd-colicoderviese-super-app/scd-colicoderviese-super-app/config/sponsor-motion-profiles.json` registra sorgente, stato logo, storyboard e proof plan. `/home/runner/work/scd-colicoderviese-super-app/scd-colicoderviese-super-app/assets/sponsors/README.md` limita i loghi a file ufficiali/approvati. | Presenza dei collegamenti UI verificata; access control dei singoli file, archivio/versione e proof consegnati non dimostrati dal solo codice locale. |

## Fonti, provenance e stati commerciali

Il manifest registra, fra le altre:

- `SPONSOR_MASTER_SHEET` per sponsor, partner, commerciale, asset, follow-up e sponsor intelligence.
- `SCD_OPERATIVO_PILOTA` per stakeholder, fornitori, iniziative commerciali, relazioni e data lineage.
- `SCD_GOOGLE_CALENDAR` per agenda/eventi autorizzati.
- `R20`, `SCD_DRIVE` e `SCD_GMAIL` per identità, back-office e documenti secondo gli scope del manifest.

Il codice mostra inoltre:

- snapshot `/home/runner/work/scd-colicoderviese-super-app/scd-colicoderviese-super-app/config/sponsor-development.snapshot.json` con source/schema marker e dati di iniziativa/preventivo;
- profili LED locali in `/home/runner/work/scd-colicoderviese-super-app/scd-colicoderviese-super-app/config/sponsor-motion-profiles.json` con `sourceEvidence`, `logoAssetStatus`, `productionStatus`, `crmStakeholderId` e proof plan;
- array commerciali hardcoded in `/home/runner/work/scd-colicoderviese-super-app/scd-colicoderviese-super-app/sponsor/app.js`, inclusi valori, contatti e prossime azioni, accanto a caricamenti CRM/live.

La presenza di una fixture o snapshot non dimostra che il suo contenuto sia fresco, approvato o quello effettivamente usato da Render. Evitare di mostrarne valori a ruoli non autorizzati; mostrare stato, fonte e data di generazione per ogni fallback; non promuovere prospect o concept a sponsor confermato.

Gli stati UI — ad esempio preventivo ricevuto/da riconciliare, verifica tecnica/operativa, definizione e follow-up — sono prioritizzazioni derivate da `status`/`quoteStatus`. Il dato canonico di progetto, accordo, owner, scadenza e task deve continuare a provenire dal master autorizzato; l’algoritmo UI non deve inventare deadline o commitment.

## Finding e classificazione

| ID / priorità | Classificazione | Evidenza e valutazione |
|---|---|---|
| `SEC-01` — HIGH | `FIX` | Revisione specialistica: il fallback statico di `/home/runner/work/scd-colicoderviese-super-app/scd-colicoderviese-super-app/server.js:910-922,958` serve risorse sotto `ROOT` senza autenticazione. Con `ROOT` sul repository, una richiesta anonima al file `/home/runner/work/scd-colicoderviese-super-app/scd-colicoderviese-super-app/config/sponsor-development.snapshot.json` può restituire lo snapshot con dati commerciali/contatti. `/home/runner/work/scd-colicoderviese-super-app/scd-colicoderviese-super-app/scripts/build-pages.mjs:9-23` usa invece un’allowlist che esclude snapshot e app privata; il rischio documentato è sul server Node e resta condizionato dalla configurazione Render effettiva, non verificata. |
| `SEC-02` — HIGH | `FIX` | Revisione specialistica: `/home/runner/work/scd-colicoderviese-super-app/scd-colicoderviese-super-app/server.js:134-166,344-355,475-480` assegna `finance:false` al profilo `COMMERCIALE`, ma CRM e pagina privata applicano solo la validazione della sessione sponsor. La UI nasconde impostazioni in `/home/runner/work/scd-colicoderviese-super-app/scd-colicoderviese-super-app/sponsor/app.js:72-80`; il bundle consegnato include dati commerciali hardcoded (`/home/runner/work/scd-colicoderviese-super-app/scd-colicoderviese-super-app/sponsor/app.js:192-228`). Un account valido `COMMERCIALE` può quindi ricevere valori/contatti oltre la capability dichiarata. Il reviewer specialistico non ha potuto verificare utenti o configurazione live. |
| `DATA-01` — P1 | `ENHANCE` / `INTEGRATE` | Snapshot, fixture e master convivono. Mantenere i master registrati e un solo record canonico per partner/progetto; aggiungere lineage, timestamp, freshness e fallback esplicito. Rimuovere dati finanziari/contatti dal bundle client solo dopo aver collegato una sorgente canonica role-filtered, senza cancellare il dato master. |
| `CRM-01` — P1 | `ENHANCE` | Link CRM presenti tramite stakeholder ID; verificare join stabili, dedup e permessi al dettaglio. Non usare match di nome come identity key o creare un secondo CRM. |
| `MEDIA-01` — P1 | `COMPLETE` / `KEEP` | UI e motion profiles descrivono concept e proof; asset ufficiali vanno mantenuti bloccati, temp asset e loghi non approvati non vanno usati in produzione. Completare il legame protetto a documenti, versioni, diritti e proof, senza esporre contenuti riservati in static root. |
| `UX-01` — P2 | `ENHANCE` | Skip link, landmark, label/live region e breakpoints sono presenti in HTML/CSS; non esiste nel set esaminato un’a11y audit automatizzato, contrasto verificato o prova assistive-tech. Verificare focus trap, ordine tastiera, error state (`aria-invalid`) e reflow sui viewport stabiliti. |
| `PERF-01` — P2 | `ENHANCE` | Misure raw locali: `/home/runner/work/scd-colicoderviese-super-app/scd-colicoderviese-super-app/sponsor/sponsor.js` 17.147 B; `/home/runner/work/scd-colicoderviese-super-app/scd-colicoderviese-super-app/sponsor/app.js` 121.480 B; `/home/runner/work/scd-colicoderviese-super-app/scd-colicoderviese-super-app/sponsor/sponsor.css` 54.336 B; `/home/runner/work/scd-colicoderviese-super-app/scd-colicoderviese-super-app/sponsor/app.css` 136.686 B. Nessuna misura gzip, LCP/INP, bundle budget o prova rete lenta è stata eseguita; il payload privato include ampie fixture inline. Misurare prima di ottimizzare e rimuovere fixture soltanto dopo l’integrazione canonica. |
| `OPS-01` — P1 | `COMPLETE` | APP AI dichiara Render `scd-sponsor-platform`/main; `/home/runner/work/scd-colicoderviese-super-app/scd-colicoderviese-super-app/sponsor/README.md` dichiara GitHub Pages; `/home/runner/work/scd-colicoderviese-super-app/scd-colicoderviese-super-app/render.yaml` descrive il servizio web SCD principale. Il client riconosce host statici e inoltra l’area privata al servizio R21. Documentare quale servizio ospita asset/API, `ROOT`, build/start/health e variabili senza includere segreti; provarlo read-only prima di dichiarare `DEPLOYED`. |
| `BRANCH-01` | `KEEP` / `REMOVE_WITH_REASON` | PR #55 `r45-sponsor-operations-radar` è aperta, usa base `main` a `96427131…` (non l’attuale `d16a658…`) ed è `dirty`. Esistono anche branch storiche R42/R45/R47/R50/R51/R53 di sponsor. Non è prova sufficiente per cancellare branch o codice; confrontare contenuto e PR prima di qualunque pulizia. |
| `TEST-01` — P1 | `COMPLETE` | I test esistenti verificano contratto visivo, smoke locale, LED, community benefit e design tokens. Non coprono esposizione anonima del file snapshot, capability `COMMERCIALE` vs finance, CRM cross-scope, documento riservato, freschezza fallback, a11y runtime o budget performance. |

### Matrice sintetica KEEP / ENHANCE / FIX / INTEGRATE / COMPLETE / REMOVE_WITH_REASON

- **KEEP:** doppia superficie pubblico/privato; validazione sessione R20; master registrati e loro provenance; asset ufficiali solo se verificati; integrazione CRM/agenda esistente.
- **FIX:** static serving di file interni; autorizzazione server-side per ruolo/capability su route e campi finanziari; contenuti sensibili hardcoded inviati a ruoli senza finance.
- **ENHANCE:** freschezza/provenance dei fallback, stabilità degli stakeholder ID, responsive/a11y, budget e misure performance, test negative auth/data.
- **INTEGRATE:** portare viste e draft verso master/API SCD già esistenti con autorizzazione, senza copia manuale né database parallelo.
- **COMPLETE:** contratto Render, document/media access e proof verificabili, audit a11y/performance, test role-aware.
- **REMOVE_WITH_REASON:** rimuovere dalla distribuzione client solo fixture sensibili o stale dopo aver verificato la sorgente sostitutiva e preservato la provenienza; nessuna branch o record master va eliminato in questo audit.

## Verifiche eseguite e limiti

| Verifica | Esito | Evidenza/limite |
|---|---|---|
| `npm run check` | PASS | Intera suite contrattuale del repository, inclusi sponsor vision/runtime, manifest, CRM communication, LED, design system e community benefit; controlli sintassi eseguiti. |
| `npm run test:sponsor-vision` | PASS | Contratti testuali di superficie/contenuti e interazioni attese; non è visual regression. |
| `npm run test:sponsor-runtime` | PASS | Server locale: pagina pubblica 200; route privata anonima reindirizza alla richiesta accesso; API donation e guardie smoke verificate. |
| `npm run test:led-production` | PASS | Contratto locale LED. |
| `npm run test:community-benefit` | PASS | Contratto locale community. |
| `npm run test:design-system` | PASS | Schema design system locale valido. |
| Probe Pages / Render | UNVERIFIED | Lookup DNS fallito per URL Pages e `scd-sponsor-platform.onrender.com`; non implica che siano down/inesistenti. |
| Visual/accessibility/performance live | NOT RUN | Browser-based audit non disponibile per errore OAuth/trasporto; nessuna misura Lighthouse, assistive-tech, viewport live o bundle gzip. |
| Dati reali / account commerciali | NOT RUN | Nessun accesso a sessioni, CRM, Drive, dati o utenti di produzione; nessuna scrittura/API mutativa eseguita. |

Il test smoke che verifica un redirect privato anonimo non copre l’accesso cross-role né la route statica allo snapshot; i test passati non annullano `SEC-01` e `SEC-02`.

## Piano di consolidamento e hardening

### P0 — protezione commerciale e verifica servizio

1. Sostituire il fallback statico generico con un’allowlist pubblica; spostare snapshot/configurazioni non pubbliche fuori dal document root. Aggiungere test anonimi per `/config/sponsor-development.snapshot.json` e risorse private che richiedano 404/403 senza restituire contenuto.
2. Definire una policy server-side unica di ruolo/capability e applicarla a pagina privata, CRM summary/detail, agenda, comunicazioni, documenti e ogni campo finanziario. `finance:false` deve essere un vincolo server-side, non un nascondimento UI.
3. Togliere dai bundle/client tutte le righe commerciali che non sono autorizzate per quel ruolo. Servire esclusivamente dati minimi filtrati dal backend canonico; non assumere che un array hardcoded sia demo o pubblico.
4. Verificare in sola lettura quale servizio Render ospita `server.js`, valore di `ROOT`, branch/commit e impostazioni di pubblicazione. Non cambiare configurazione o dati live durante l’audit.

### P1 — data contract, CRM, documenti e operatività

1. Consolidare per ciascun tipo dato `source_registry`/authority, ID canonico, provenance, timestamp/freshness, stato `LIVE_MASTER`/`SNAPSHOT_VERIFIED`/`UNVERIFIED` e fallback fail-closed.
2. Mantenere un solo partner/stakeholder e progetto; validare link tramite ID stabili, non join fuzzy per nome. Usare `SCD_OPERATIVO_PILOTA`, Sponsor master, R20 e Calendar secondo il rispettivo authority domain.
3. Per documenti e media, verificare scope del file, owner, versione, diritti, approvazione logo e proof. Non servire documenti da root pubblico; tenere safeguarding e documenti personali fuori dai flussi commerciali ordinari.
4. Riconciliare ruoli/capabilities sponsor con R20 e il manifest. Non introdurre `COMMERCIALE` come nuovo ruolo canonico senza approvazione/aggiornamento contrattuale.
5. Aggiornare README/AI instructions operative e contratto del servizio Render; distinguere design, implemented, tested, deployed e production-verified.

### P2 — UX, qualità e performance

1. Verificare HTML/keyboard/modal/focus/errors/contrast e screen reader sulle superfici consentite; aggiungere test di accessibilità coerenti con tool già approvati dal progetto.
2. Fare visual QA SCD a 360×800, 390×844, 393×852, 430×932 e desktop 1280×800, 1440×900, 1920×1080, solo dopo aver ottenuto un runtime pubblico verificabile.
3. Misurare JS/CSS compressi, immagini, cache e Core Web Vitals; definire un budget verificabile prima di ridurre codice o aggiungere un bundler.
4. Aggiungere test negativi per login/ruolo, data minimization, file statici, fallback stale, errori upstream e output CRM; tenere i test in memoria/mock e non dipendere da account o master di produzione.

### Definition of Done

- Snapshot e file privati non ottenibili anonimamente da alcuna route Node/Pages.
- Profilo `COMMERCIALE` non può leggere dati finanziari non autorizzati; i controlli sono verificati dal server con test per ruolo e route.
- Ogni dato progetto/accordo/contatto mostra fonte e freshness, oppure è esplicitamente `UNVERIFIED`/`PENDING`.
- Le relazioni CRM usano ID canonici e restano single-record; nessun database/CRM parallelo.
- Link di documenti/media rispettano scope e diritti; loghi ufficiali sono mantenuti integri e in stato approvato.
- Test sponsor e manifest verdi; visual/a11y/performance hanno evidenze documentate.
- Servizio, branch/commit e contratto Render provati read-only prima di uno stato `PRODUCTION_VERIFIED`.

## Impatto SCD, rollback e next action

- **Capability:** `CAP-VALUE-ENGINE`, `CAP-GROWTH-LOOP`, `CAP-ASSET-INTEGRITY`, `CAP-SPONSOR-OPERATIONAL-FOCUS`, `CAP-IDENTITY-ACCESS`; le prime tre capability commerciali hanno stato parziale/design-only nel manifest e non sono dichiarate completate.
- **Fonti:** `SPONSOR_MASTER_SHEET`, `SCD_OPERATIVO_PILOTA`, `SCD_GOOGLE_CALENDAR`, R20, `SCD_DRIVE`, `SCD_GMAIL`.
- **Manifest:** nessuna nuova fonte, ruolo o contratto introdotto da questo audit. Aggiornare il manifest nello stesso PR soltanto se il successivo hardening cambia capability, role/scope, fonte o contratto.
- **Privacy/sicurezza:** nessun dato personale reale letto o scritto; i valori di codice/snapshot non sono riprodotti nel rapporto.
- **Rollback:** revert di `docs/AI_SPONSOR_01_AUDIT.md`; nessun rollback di codice o dati necessario.
- **Safe next action:** revisione congiunta dei finding SEC-01/SEC-02, poi change set P0 isolato con test e verifica Render read-only. Nessun deploy, merge a main o mutazione di produzione da Issue #86.
