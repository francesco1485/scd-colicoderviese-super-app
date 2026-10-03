# AI-CEPA-01 — Audit C.E.P.A. Maglia OS e piano di attivazione

**Issue:** [#89](https://github.com/francesco1485/scd-colicoderviese-super-app/issues/89)  
**Fotografia:** 2026-10-03
**Esito:** audit evidence-first della WebApp C.E.P.A.; readiness di produzione **NON dimostrata**. Nessun deploy, accesso a dati live o mutazione di produzione eseguiti.

## Sintesi esecutiva

**FATTO:** i ref canonici indicati da `APP_AI_MANIFEST.md` sono `ai-cepa-maglia-os` (istruzioni) e `cepa-maglia-os-hosting` (prodotto). Quest’ultimo contiene la WebApp in `cepa-maglia-os-static/`: una vetrina pubblica e l’ambiente operativo riservato MAGLIA 360, con il Centro C.E.P.A. e la rete SAP come funzioni distinte.

**ANALISI:** il codice offre un modello prodotto coerente — Centro per metodo, contenuti e governance; SAP per i presidi territoriali — e non inventa gli eventi pubblici mancanti. Tuttavia il codice client non certifica le policy Supabase né la protezione dei dati e il contratto Render versionato non corrisponde al servizio/percorso di pubblicazione dichiarati dal manifest AI. Il servizio Render remoto, i feed live e le policy backend non sono verificabili da questa sessione.

**DECISIONE:** non attivare né dichiarare production-ready. Prima servono il contratto Render effettivo, test del client CEPA e prove autorizzate delle policy, dei dati e dei flussi server-side. Questo documento non sostituisce l’app CEPA con SCD Partner OS e non autorizza modifiche o deploy.

Nel documento: **FATTO** = osservato nel ref e nei file citati; **ANALISI** = implicazione del codice; **UNVERIFIED** = manca la prova o l’accesso necessario; **PROPOSTA** = gate futuro, non modifica eseguita.

## WEBAPP:STATE / SCD:STATE — prima della modifica

| Campo | Stato | Evidenza |
|---|---|---|
| `REPOSITORY` | VERIFIED | `francesco1485/scd-colicoderviese-super-app` |
| `CURRENT_MAIN_SHA` | VERIFIED | `d16a658786b7577af498a3104dc31ebdd17f7613` (base della PR #94) |
| `CURRENT_WORKING_BRANCH` | VERIFIED | `copilot/ai-cepa-maglia-os`; ref istruzioni AI `795640b7444ff107a86042d9727ed1b70419276b`, ref prodotto `14f731d4bc24b3e1c5af7fa8f014e0126b01f5ab` |
| `WORKING_TREE` | VERIFIED | Pulito prima dell’aggiornamento documentale |
| `OPEN_PR` | VERIFIED | PR #94 |
| `PR_STATUS` | VERIFIED | Aperta e draft; mantenuta draft |
| `CI_STATUS` | UNVERIFIED per CEPA | Nessun workflow sui due ref canonici. Check PR `action_required` senza job disponibili; workflow dinamico della sessione in corso. I check main verificano SCD, non CEPA. |
| `PAGES_STATUS` | VERIFIED solo per SCD | Run Pages [37112220325](https://github.com/francesco1485/scd-colicoderviese-super-app/actions/runs/37112220325) riuscito sul main `d16a658`; non prova la pubblicazione CEPA. |
| `RENDER_STATUS` | UNVERIFIED live | Non è disponibile la configurazione Render remota. Nel ref sorgente `render.yaml` dichiara il servizio SCD e `server.js` serve per default la root del repository, non `cepa-maglia-os-static/`. |
| `MANIFEST_VERSION_OR_HASH` | VERIFIED | Manifest SCD `3.26.0`, SHA-256 `46518c9e5aa258fd5bbc1e80ecf0d1fa7c65b12c6e32a7d721dc4b5ed3205baf` |
| `RELEASE_DEPENDENCIES` | UNVERIFIED | Il manifest AI dichiara Render `cepa-maglia-os` e publish path `cepa-maglia-os-static`; collegamento effettivo, policy Supabase e staging non sono verificati. |
| `DATA_SOURCES_VERIFIED` | UNVERIFIED | Il client fa riferimento a tabelle, Edge Functions e Storage Supabase; schema, RLS, record, freschezza e comportamento live non sono verificati. |
| `KNOWN_BLOCKERS` | VERIFIED | Mismatch tra servizio/percorso CEPA dichiarati e contratto Render versionato; `npm run check` del ref prodotto cerca un `app.js` root assente; suite di test non specifica CEPA; backend e runtime non verificabili. |
| `SAFE_NEXT_ACTION` | VERIFIED | Concludere questo audit e richiedere prove in sola lettura e autorizzate su Render e Supabase; mantenere l’attivazione bloccata e non fare deploy. |

## WEBAPP:EXPERT

- **TASK_CLASS:** audit prodotto, architettura e readiness; non implementazione o attivazione.
- **DOMAINS:** prodotto pubblico/riservato, dati e provenance, autenticazione/autorizzazione, privacy, sicurezza, UX responsive/accessibilità, performance, CI e hosting.
- **FIXED:** preservare il prodotto CEPA esistente, la distinzione Center/SAP, i dati reali e i confini di privacy; non introdurre un secondo sistema né inventare contenuti.
- **IMPROVABLE:** contratto Render verificabile, test autonomi per CEPA, prova server-side di accessi e fonti, QA multi-device e accessibilità.
- **MISSING:** configurazione remota Render, schema/migrazioni e policy Supabase, sorgente delle Edge Functions, dataset effettivi, account di test e prove visuali/runtime autorizzate.
- **SOURCE_PLAN:** manifest e istruzioni dal ref AI; implementazione, test e `render.yaml` dal ref di hosting; GitHub Actions per stato CI. Runtime e dati solo con evidenza read-only autorizzata.
- **TOOLCHAIN:** ispezione GitHub e sorgente; `npm run check` e test esistenti; Node per parsing statico. Nessuna nuova dipendenza.
- **RISK:** pubblicare la root errata; scambiare un controllo UI per autorizzazione; esporre dati commerciali/documenti; trattare stati vuoti o contenuti di esempio come dati reali.
- **TEST:** parsing statico dei moduli CEPA superato; `npm run check` del ref prodotto fallisce sul file root mancante. Nessun test UI/browser CEPA presente o eseguito.
- **ROLLBACK:** per questo PR basta revertire il documento. Per una release futura rollback di codice/hosting reversibile, senza migrazioni distruttive o modifiche ai dati.
- **NEXT_ACTION:** correggere l’audit sulla sorgente CEPA verificata; chiedere le prove mancanti prima di proporre modifiche di prodotto.

## WEBAPP:ARCHITECT

### 1. Vision analysis — pubblico, riservato e responsive

**FATTO:** la vetrina è composta da header/nav, hero con metodo CEPA, temi, eventi futuri e passati, territorio, rete, opportunità di collaborazione e CTA di accesso. Il markup dichiara un unico `<main>` e il footer identifica il progetto. L’area riservata vive nella stessa SPA: login/reset e workspace MAGLIA 360 comprendono CRM e operatività dell’agenzia oltre alle viste Centro CEPA, SAP e territori. Non è una seconda app autonoma. Vedi [`index.html`](https://github.com/francesco1485/scd-colicoderviese-super-app/blob/14f731d4bc24b3e1c5af7fa8f014e0126b01f5ab/cepa-maglia-os-static/index.html#L17-L175) e le viste definite in [`app.js`](https://github.com/francesco1485/scd-colicoderviese-super-app/blob/14f731d4bc24b3e1c5af7fa8f014e0126b01f5ab/cepa-maglia-os-static/app.js#L15-L34).

**Center C.E.P.A. / SAP — FATTO:** la vetrina assegna al Centro metodo, contenuti e qualità; i territori e gli Sportelli SAP portano il progetto alle persone. Nell’area interna esistono viste separate per “Centro CEPA” e “SAP & Territori”. SAP non è presentato come un secondo Centro o come un nuovo gestionale.

**Responsive — FATTO:** layout a griglia, sidebar mobile/desktop e adattamenti sono presenti; le media query includono breakpoint 1280/900/560 px, oltre a regole più granulari nei fogli estesi. Sono presenti `:focus-visible` e `prefers-reduced-motion`; il menu mobile gestisce Escape. **UNVERIFIED:** nessuna sessione browser CEPA, prova visuale ai viewport, verifica screen reader/contrasto, regressione cross-browser o confronto con un master approvato è stata eseguita. I test del repository non esercitano questa SPA.

**Rilievi UX da decidere/verificare:**
- `noindex,nofollow,noarchive` è impostato sulla pagina che si definisce pubblica. È un fatto del markup, non prova che sia un errore: il proprietario deve decidere indicizzazione e canonical prima di attivare la comunicazione pubblica.
- La nav pubblica non espone un `aria-label`; il footer ispezionato non mostra un collegamento a un’informativa privacy. Verificare anche percorso tastiera, gestione focus e annunci/chiusura dei dialog, stati di errore e compatibilità ridotta. Non è una certificazione di non conformità WCAG.
- Il codice definisce palette blu/navy, carta chiara, accenti verdi/oro, titoli serif, hero e griglie. Sono fatti sullo stile sorgente, non una convalida della resa visuale: non sono stati osservati screenshot/browser e non esiste in questa audit un confronto approvato con un visual master.

### Modern Experience Gate — classificazione e criteri di accettazione

**Classificazione WEBAPP:ARCHITECT**

| Elemento | Classe | Trattamento |
|---|---|---|
| Identità C.E.P.A./Maglia Assicurazioni e asset ufficiali | `KEEP_LOCKED` | Preservare marchi, proporzioni, colori, scritte e asset verificati. Il simbolo/wordmark visibile non va ridisegnato o sostituito; confermarne la provenienza prima di trattarlo come master ufficiale. |
| Record, provenance, contratti API, auth, ruoli/scope e policy | `KEEP` | Nessuna riscrittura o spostamento nel client. I controlli server-side restano autoritativi; fonte, stato e fallback devono rimanere verificabili. |
| Composizione della vetrina pubblica | `REBUILD_IMPROVE` | Il markup attuale organizza una lunga sequenza di sezioni editoriali e griglie (audience, territorio, temi/eventi e collaborazione). Questo giustifica una revisione della gerarchia e della composizione per evitare un effetto brochure/card-wall; non prova da solo che la resa a schermo sia datata. Ricomporre la presentazione, non ricreare prodotto, contenuti o backend da zero. |
| Shell e workspace riservato MAGLIA 360 | `REBUILD_IMPROVE` | Modernizzare la gerarchia e le composizioni per i task reali, mantenendo moduli, flussi, densità operativa utile, dati e confini di ruolo. Non introdurre un admin template generico né un sistema parallelo. |
| Stati del servizio e motion | `ENHANCE` | Rendere espliciti stati e provenienza per ciascun servizio e aggiungere motion solo quando comunica un feedback/una transizione utile; rispettare `prefers-reduced-motion`. La presenza della regola reduced-motion nel CSS non dimostra che tutte le animazioni siano utili o accessibili. |

**Gate vincolante per ogni futura UI — FATTO DEL FEEDBACK / criterio di release:** mobile, tablet e desktop devono essere composizioni proprie e non una cornice telefonica; gerarchia forte e azione primaria riconoscibile; esperienza pubblica più editoriale, workspace operativo denso ma scansionabile; componenti coerenti con brand e asset verificati. Ogni servizio deve identificare fonte e stato e prevedere `loading`, `empty`, `error`, `offline`, `denied` e `stale`, con fallback esplicito e senza dichiarare “live”, “automatico” o “sincronizzato” senza prova.

**Visual QA obbligatorio prima di dichiarare `READY`:** screenshot riproducibili e revisione ai viewport 360×800, 390×844, 393×852, 430×932, 1280×800, 1440×900 e 1920×1080; verifiche di overflow, gerarchia/CTA, stati servizio, tastiera/focus, reduced motion e confronto con asset/visual master approvati. Per ora questi screenshot non esistono: lo stato visuale è **UNVERIFIED** e questa audit non dichiara alcuna UI pronta. La futura implementazione deve preservare contenuti e contratti esistenti e passare questi gate prima di ogni release; nessun deploy è autorizzato.

### 2. ENGINE DATA — fonti, eventi, provenance e confini di accesso

| Flusso osservato nel client | Fonte/interazione | Limite dell’evidenza |
|---|---|---|
| Temi e iniziative pubbliche | Edge Function `public-cepa-feed`; dati mappati su temi ed eventi futuri/passati | Codice della Function, query, filtri di pubblicazione e provenance non presenti nel ref |
| Opportunità pubbliche | `public_showcase_items`, filtrate dal client per organizzazione e `published` | Schema, policy anonime, owner e contenuti live non verificati |
| Gestione interna CEPA | `cepa_subjects`, `cepa_initiatives`, `cepa_content_assets`, `cepa_academy_modules`, `cepa_speakers` | Definizioni DB, relazioni, vincoli, audit e regole di lifecycle non inclusi |
| Attività e agenda | `office_cepa_activities`, `crm_agenda_events`, `crm_agenda_attendees` | Nessuna prova di sincronizzazione, deduplica o coerenza del calendario |
| Richieste pubbliche | Edge Function `public-portal-request` per accesso/contatto | Validazione server-side, rate limit, retention e notifica downstream non verificati |
| Area Lia / allegati | Supabase Storage `lia-workspace` e Edge Function `lia-workbench` | Bucket policy, scansione, cifratura, retention, access log e subprocessori non verificati |

Il client interroga molte entità operative e commerciali (inclusi clienti e polizze) con filtri `organization_id`; alcune richieste aggiungono `user_id`. Questi filtri sono **FATTI del client**, non una prova d’isolamento. DDL, RLS, ruoli database, viste, Edge Functions e Storage ACL sono assenti: senza tali elementi non si può certificare tenant isolation né accesso minimo.

L’avvio cerca un’unica membership attiva con `.limit(1).maybeSingle()` senza selezione esplicita dell’organizzazione. **ANALISI:** se l’account può avere più membership attive, il contesto scelto può essere ambiguo. Prima del rilascio verificare vincolo DB di unicità oppure selezione deterministica/consapevole dell’organizzazione, e relative RLS.

**Eventi/contenuti — FATTO:** il codice distingue `completed_at` tra eventi futuri e conclusi e mostra stati vuoti espliciti quando feed/catalogo mancano; se il feed non è disponibile svuota gli array CEPA. Non sono state trovate prove di dati live o di eventi effettivamente pubblicati. Non aggiungere contenuti per riempire la UI: ogni evento, materiale e claim pubblico richiede record, owner, stato di verifica e provenienza.

#### Sicurezza e privacy — identità, dati personali e file

- **Auth osservata:** Supabase Auth password, OTP condizionale al feed pubblico, recovery/reset e `getUser()`. Senza utente è mostrata la vetrina; membership assente o query in errore porta al blocco; il logout chiama `signOut()`. La UI dichiara che la richiesta non crea account; il client non invoca una signup standard e richiede `shouldCreateUser:false` per OTP. Il backend della richiesta non è disponibile, quindi il comportamento complessivo resta da verificare.
- **Autorizzazione — rischio P1:** ID/email dell’approvatore e controlli `isManager`/`isAccessApprover` sono nel JavaScript pubblico e condizionano visibilità/azioni UI. Il codice invoca `manage-access-request` per alcune azioni, ma la sua implementazione non è disponibile. UI e query filtrate non sono enforcement: verificare che ogni Function, tabella e bucket ricalcoli server-side l’identità, membership, ruolo, organizzazione e azione consentita. Non affidarsi al valore ruolo o all’ID inviato dal browser.
- **Dati personali — rischio P1:** il modulo richiesta accesso raccoglie nome, email, telefono, organizzazione e motivo, con consenso al contatto. Verificare informativa, titolare/finalità, minimizzazione, retention/cancellazione, rate limiting, anti-abuso e accesso ai record; il checkbox non prova da solo un’informativa adeguata.
- **Documenti — rischio P1:** upload Lia ammette fino a 12 file da 25 MB e genera percorsi con organization/user; MIME deriva dal browser, i link di download sono firmati per 120 secondi. **UNVERIFIED:** limite lato server, allowlist MIME/estensioni, malware scanning, autorizzazione cross-user/org, retention e audit. Non caricare documenti sensibili in test o produzione per questa audit.
- **Perimetro web — UNVERIFIED:** l’app importa una versione fissata di Supabase JS via CDN. Nel `server.js` del ref non si vedono CSP e header hardening; un proxy esterno potrebbe aggiungerli, ma il runtime non è accessibile. Verificare CSP compatibile con CDN/Supabase, `frame-ancestors`, `nosniff`, HTTPS/HSTS, cache e log prima del rilascio. Nessuna service-role key è necessaria nel client; nessun segreto runtime è stato verificato.
- **AI/automazioni — UNVERIFIED:** l’interfaccia Lia invia comandi e allegati a una Edge Function. Prima di un uso con dati cliente servono policy, approvazioni per azioni, minimizzazione dei prompt, retention, logging e confini di subprocessori verificati.

### 3. ZERO-BUG BUILD / TEST — qualità, performance e dead-code candidates

**FATTO:** al ref `cepa-maglia-os-hosting`, le dimensioni sorgente sono circa 336 KB per `app.js`, 201 KB per `styles.css`, 94.7 KB per `index.html` e 39.3 KB per `visual-master-shell.css` (non misure di trasferimento). `dashboard-component.js` importa `dashboard-master.css`; quest’ultimo non è dead code. `product-evidence.js` non risulta referenziato dai file del ref: è un **candidato** a inventory, non da rimuovere senza controllare entrypoint o caricamenti runtime esterni.

**Verifiche svolte:**
- `node --check cepa-maglia-os-static/app.js` e `dashboard-component.js`: PASS.
- `npm run check` dal ref prodotto: FAIL prima del controllo CEPA; il comando lancia `node --check server.js && node --check app.js`, ma il ref non contiene `app.js` nella root. Poiché `render.yaml` usa questo comando come build command, non è prova di un build CEPA funzionante e blocca la verifica del contratto dichiarato.
- `tests/api-contract.mjs` verifica il contratto API SCD e il test smoke usa selettori/route SCD; non sono test CEPA. Non è presente una suite di contratto, integrazione, visual o accessibilità per `cepa-maglia-os-static/`.
- Nessuna prova Lighthouse/Core Web Vitals, dimensioni compresse, CSP live, screenshot o navigazione real-browser CEPA. I test viewport eventualmente presenti nel repo coprono l’app SCD, non CEPA.

**PROPOSTA QA:** aggiungere test non-prod per vetrina/feed/empty/error, auth e recovery, più membership/ruoli, RLS cross-tenant, file e function negative cases; test visuali a 360×800, 390×844, 393×852, 430×932 e desktop 1280×800, 1440×900, 1920×1080; tastiera/screen reader, contrasto, reduced motion e budget di performance. Nessun test richiede dati personali reali.

### 4. Autonomous continuous loop

**FATTO:** il blocco audit è stato completato sulla sorgente canonica e il documento è stato autocontrollato per coerenza tra evidenze, limiti e rilievi. **LIMITE:** la verifica del backend e del servizio remoto richiede accesso autorizzato non disponibile; proseguire senza tale evidenza significherebbe affermare sicurezza o readiness non dimostrate. Il confine verificabile di questa Issue è quindi il piano di attivazione, non una modifica applicativa o un deploy. Il prossimo blocco sicuro è il controllo read-only di Render, schema/RLS, Storage e Edge Functions da parte dell’owner.

## Rilievi prioritizzati

| Priorità | Rilievo | Evidenza / rischio | Gate di chiusura |
|---|---|---|---|
| P0 | Contratto Render non corrispondente al prodotto dichiarato | Manifest AI dichiara servizio `cepa-maglia-os` e path `cepa-maglia-os-static`; `render.yaml` dichiara solo servizio SCD, `npm run check`, `npm start`, `/health`, `autoDeploy: true`. `server.js` defaulta alla root e dichiara health service SCD. La config remota resta UNVERIFIED. | Confermare servizio e root effettivi con owner Render; un solo target CEPA, entrypoint/build/health verificabili e deploy controllato; prova in staging prima di qualsiasi decisione produzione. |
| P0 | Build dichiarato fallisce nel ref prodotto | `npm run check` referenzia `app.js` root assente; non controlla la SPA in `cepa-maglia-os-static/`. | Build riproducibile che controlli esplicitamente gli asset CEPA e health route corretta; pipeline verde sul ref esatto. |
| P1 | Enforcement server-side e isolamento non verificabili | App client applica ruoli/filtri e invoca funzioni non incluse; schema, RLS e policy bucket mancanti. | Ispezione autorizzata del backend; test anonimo, cross-role, cross-org, sessione scaduta e chiamate dirette API/Storage in staging. |
| P1 | Dataset, pubblicazione e privacy non verificabili | Tabelle/feed e raccolta richieste visibili nel client; nessuna prova su fonti, approvazione contenuti, retention o policy. | Catalogo dati con owner/provenance/freschezza; consenso/informativa e retention approvati; test feed solo con record sintetici. |
| P1 | Selezione membership potenzialmente ambigua | `.limit(1)` non ordina né consente scelta dell’organizzazione. | Dimostrare vincolo di membership singola o specificare scelta e controllo tenant server-side. |
| P2 | Responsive/accessibilità e prestazioni senza evidenza runtime | Breakpoint e alcuni accorgimenti accessibili esistono, ma nessun QA CEPA browser, contrasto, tastiera, screen reader o misure prestazionali. | Eseguire e allegare matrice viewport/accessibilità/performance sui contenuti non-prod e confrontare con visual master approvato. |
| P2 | Indicizzazione pubblica ambigua | Pagina promozionale ha `noindex,nofollow,noarchive`. | Decisione esplicita del proprietario su SEO/canonical prima del lancio pubblico; non cambiare metadati automaticamente. |
| P2 | Possibile file non usato | `product-evidence.js` non è referenziato nel ref; possibili loader esterni non esclusi. | Mappare entrypoint/import/uso in runtime; eventuale rimozione separata con prova. |

## Piano di attivazione — gate, non autorizzazione al deploy

1. **Perimetro e ownership (P0):** mantenere `ai-cepa-maglia-os` come istruzioni e `cepa-maglia-os-hosting` come sorgente prodotto; confermare owner, ambiente, dominio e servizio CEPA senza copiare segreti o usare dati di produzione.
2. **Hosting riproducibile (P0):** risolvere con l’owner la divergenza `cepa-maglia-os-static/` / root Render / `render.yaml`; scegliere un solo percorso e una sola configurazione approvata. Verificare health/build su staging e impedire un deploy automatico non approvato. Non modificare la config live in questa PR.
3. **Data/security gate (P1):** ottenere in sola lettura schema, RLS, bucket e sorgenti Edge Functions; documentare fonti, provenance, retention e permessi; testare auth, membership, anonimo, ruoli e isolamento con account/dati sintetici.
4. **Funzionalità CEPA (P1):** aggiungere test dedicati a vetrina, temi, eventi futuri/passati, form, workflow Center/SAP, errore/empty state e upload in ambiente non-prod. Nessuna pubblicazione o record inventato.
5. **QA prodotto (P2):** allegare screenshot e completare la matrice visuale mobile/tablet/desktop e gli stati `loading/empty/error/offline/denied/stale`; verificare gerarchia/azione primaria, asset master, tastiera/screen reader, contrasto, reduced motion, browser support e prestazioni. Non dichiarare `READY` senza evidenza e senza risolvere prima i difetti bloccanti.
6. **Decisione release separata:** ottenere approvazione umana, commit immutabile, workflow verdi, monitoraggio, owner e rollback provato in staging. Qualsiasi modifica successiva a contratto, ruolo, fonte o dato richiede PR e aggiornamento del manifest pertinente. Nessun deploy è compreso nell’Issue corrente.

### Rollback per una futura release

- Conservare commit e configurazione precedenti; preparare il ripristino del servizio e il segnale di rollback prima della release.
- Preferire flag/cutover reversibili; non cancellare o migrare dati reali senza approvazione esplicita e piano di restore.
- Provare rollback e health check in staging. Registrare owner e impatto dati.
- Nessun rollback di produzione è stato necessario o eseguito per questa audit documentale.

## Fonti e limiti

- Manifest AI e istruzioni WebApp al ref `ai-cepa-maglia-os` (`795640b7444ff107a86042d9727ed1b70419276b`): [`APP_AI_MANIFEST.md`](https://github.com/francesco1485/scd-colicoderviese-super-app/blob/795640b7444ff107a86042d9727ed1b70419276b/APP_AI_MANIFEST.md), [istruzioni WebApp](https://github.com/francesco1485/scd-colicoderviese-super-app/blob/795640b7444ff107a86042d9727ed1b70419276b/.github/agents/webapp-master.agent.md), [istruzioni repository](https://github.com/francesco1485/scd-colicoderviese-super-app/blob/795640b7444ff107a86042d9727ed1b70419276b/.github/copilot-instructions.md).
- Prodotto al ref `cepa-maglia-os-hosting` (`14f731d4bc24b3e1c5af7fa8f014e0126b01f5ab`): [`index.html`](https://github.com/francesco1485/scd-colicoderviese-super-app/blob/14f731d4bc24b3e1c5af7fa8f014e0126b01f5ab/cepa-maglia-os-static/index.html), [`app.js`](https://github.com/francesco1485/scd-colicoderviese-super-app/blob/14f731d4bc24b3e1c5af7fa8f014e0126b01f5ab/cepa-maglia-os-static/app.js), [`styles.css`](https://github.com/francesco1485/scd-colicoderviese-super-app/blob/14f731d4bc24b3e1c5af7fa8f014e0126b01f5ab/cepa-maglia-os-static/styles.css), [`visual-master-shell.css`](https://github.com/francesco1485/scd-colicoderviese-super-app/blob/14f731d4bc24b3e1c5af7fa8f014e0126b01f5ab/cepa-maglia-os-static/visual-master-shell.css), [`Render`](https://github.com/francesco1485/scd-colicoderviese-super-app/blob/14f731d4bc24b3e1c5af7fa8f014e0126b01f5ab/render.yaml), [`server.js`](https://github.com/francesco1485/scd-colicoderviese-super-app/blob/14f731d4bc24b3e1c5af7fa8f014e0126b01f5ab/server.js), [`package.json`](https://github.com/francesco1485/scd-colicoderviese-super-app/blob/14f731d4bc24b3e1c5af7fa8f014e0126b01f5ab/package.json), [`test smoke`](https://github.com/francesco1485/scd-colicoderviese-super-app/blob/14f731d4bc24b3e1c5af7fa8f014e0126b01f5ab/tests/smoke.mjs), [`test contract`](https://github.com/francesco1485/scd-colicoderviese-super-app/blob/14f731d4bc24b3e1c5af7fa8f014e0126b01f5ab/tests/api-contract.mjs).
- CI PR #94: i check Manifest PR Policy risultano `action_required` senza job; nessun risultato CI CEPA è disponibile. Pages/E2E/Production Evidence main appartengono a SCD e non attestano CEPA.
- Limite produzione: le richieste live/browser a Render non hanno prodotto evidenza utilizzabile in questa sessione; stato live classificato **UNVERIFIED**, non “down”.

**Modifica della PR:** solo questo audit. Nessuna modifica a codice applicativo, manifest, dati, ruoli, segreti, configurazione o runtime; nessun deploy eseguito. La PR #94 resta draft.
