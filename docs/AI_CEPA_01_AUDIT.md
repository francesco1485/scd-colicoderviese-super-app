# AI-CEPA-01 — Audit prodotto e piano di attivazione

**Issue:** [#89](https://github.com/francesco1485/scd-colicoderviese-super-app/issues/89)  
**Data fotografia:** 2026-10-03  
**Esito:** audit preliminare con perimetro CEPA non verificabile dal repository SCD disponibile. Nessun deploy o cambiamento di produzione eseguito.

## Sintesi esecutiva

Il repository esaminato contiene SCD Super App e una superficie distinta chiamata **SCD Partner OS** (`sponsor/`), non il codice o il contratto identificabile come **C.E.P.A. Maglia OS**. Non sono disponibili `APP_AI_MANIFEST.md` né le istruzioni WebApp AI richieste dall’Issue. Il manifest SCD e l’ADR-0007 confermano che CEPA è un sistema separato e che il suo progetto Supabase non deve essere riutilizzato da SCD.

Di conseguenza, le schermate, fonti, ruoli, dati, media, deployment e controlli runtime specifici di CEPA restano **UNVERIFIED**. Le sezioni seguenti distinguono i fatti verificabili sul repository SCD dai gap e dalle proposte: non certificano né sostituiscono un audit del prodotto CEPA.

## SCD:STATE — fotografia pre-scrittura

| Campo | Stato | Evidenza |
|---|---|---|
| `REPOSITORY` | VERIFIED | `francesco1485/scd-colicoderviese-super-app` |
| `CURRENT_MAIN_SHA` | VERIFIED | `d16a658786b7577af498a3104dc31ebdd17f7613` |
| `CURRENT_WORKING_BRANCH` | VERIFIED | `copilot/ai-cepa-maglia-os` |
| `WORKING_TREE` | VERIFIED | Pulito prima della modifica documentale |
| `OPEN_PR` | VERIFIED | Nessuna PR aperta per il branch di lavoro alla ricerca per head branch |
| `PR_STATUS` | VERIFIED | PR per questo branch non ancora aperta; richiesta dall’Issue |
| `CI_STATUS` | UNVERIFIED | Nessuna CI di PR per questo branch. E2E main verde; Production Evidence main fallita per drift Render (run [37112220326](https://github.com/francesco1485/scd-colicoderviese-super-app/actions/runs/37112220326)). |
| `PAGES_STATUS` | VERIFIED | Workflow Pages sullo SHA main corrente completato con successo (run [37112220325](https://github.com/francesco1485/scd-colicoderviese-super-app/actions/runs/37112220325)); verifica browser live non disponibile da questo ambiente. |
| `RENDER_STATUS` | VERIFIED | Il controllo produzione ha ricevuto HTTP 200, ma Render riportava commit `fba68f62834f6f2343ddbe4b7507707ca543a83f` invece del main atteso `d16a658786b7577af498a3104dc31ebdd17f7613`; `RENDER_HEALTH_COMMIT` è fallito. |
| `MANIFEST_VERSION_OR_HASH` | VERIFIED | Manifest SCD `3.26.0`; SHA-256 `46518c9e5aa258fd5bbc1e80ecf0d1fa7c65b12c6e32a7d721dc4b5ed3205baf`. |
| `RELEASE_DEPENDENCIES` | VERIFIED | Nel manifest SCD R25 è il predecessore obbligatorio di R26 ed è marcato soddisfatto in main. R20 resta primario; Supabase SCD è staged/dark. Dipendenze CEPA non presenti/verificabili qui. |
| `DATA_SOURCES_VERIFIED` | UNVERIFIED | Sono verificabili nel codice i riferimenti a R20/Apps Script, Google Sheets e ai master SCD; non sono state verificate le fonti CEPA né la freschezza live dei dati. |
| `KNOWN_BLOCKERS` | VERIFIED | Contratto e istruzioni AI richiesti mancanti; sorgente/deployment CEPA non identificati; evidenza Render SCD non allineata allo SHA main. |
| `SAFE_NEXT_ACTION` | VERIFIED | Sottoporre questa audit preliminare a revisione; ottenere il contratto, le istruzioni e l’accesso in sola lettura alla sorgente/runtime CEPA prima di dichiarare readiness o pianificare un’attivazione specifica. Nessun deploy. |

La raggiungibilità diretta di Pages e Render non è stata verificata dal browser di questa sessione; il dato Render sopra proviene dal workflow Production Evidence e non costituisce prova di salute del servizio CEPA.

## SCD:EXPERT + SCD:ARCHITECT

- **TASK_CLASS:** audit tecnico-documentale e piano di attivazione, non implementazione del prodotto.
- **DOMAINS:** identità del prodotto, architettura, dati/provenance, autorizzazione, documenti/media, UX responsive, accessibilità/performance, qualità e release.
- **FIXED:** SCD e CEPA sono separati; R20 resta primario per SCD; il progetto Supabase SCD è dedicato e non riutilizza quello CEPA; nessun dato o partner è stato inventato.
- **IMPROVABLE:** tracciabilità per-record dei dati commerciali SCD, evidenza live, QA visuale/accessibile e inventory runtime/call-site.
- **MISSING:** i due documenti AI richiesti, sorgente/configurazione/runtime CEPA, definizione di “Center C.E.P.A.” e “SAP”, visual master CEPA e prova dei suoi ruoli, fonti e deployment.
- **SOURCE_PLAN:** manifest SCD vincolante, codice e test presenti, configurazione Render e workflow GitHub; per CEPA serve in seguito la sua fonte canonica e un accesso live read-only autorizzato.
- **TOOLCHAIN:** ispezione repository e GitHub Actions; test Node già presenti. Nessun nuovo strumento o dipendenza.
- **RISK:** confondere Partner OS SCD con CEPA, considerare demo/test come prova di dati o feature live, oppure attivare su Render uno SHA non allineato.
- **TEST:** `npm run test:manifest`, `npm run test:sponsor-vision`, `npm run test:sponsor-runtime`; nessun test visuale live disponibile.
- **ROLLBACK:** questa PR modifica solo documentazione ed è annullabile con revert. Un’eventuale futura attivazione deve mantenere flag/cutover reversibili e dati preesistenti intatti.
- **NEXT_ACTION:** completare il dossier CEPA con documenti e accesso canonico; poi validare separatamente staging, autorizzazioni, provenienza dati, QA multi-device e rollback.

### Vision analysis — superficie SCD disponibile, non CEPA

**FATTO:** la pagina pubblica `sponsor/index.html` presenta navigazione, hero, moduli e CTA; `sponsor/app.html` definisce una control room con sidebar, dashboard, Partner Hub, CRM, agenda e documenti. Sono presenti landmarks/skip-link, etichette ARIA selezionate e breakpoint CSS; le regole includono anche `prefers-reduced-motion` (`sponsor/sponsor.css`, `sponsor/app.css`, `sponsor/scd-design-system.css`).

**LIMITE:** i test `sponsor-vision` e `sponsor-runtime` sono contratti/smoke test, non una prova WCAG, visual regression o usabilità CEPA. Non sono stati prodotti screenshot o misure a 360/390/430 e 1280/1440/1920; non è stata misurata la performance reale. Il visual master SCD/CEPA non è stato confrontato.

**ANALISI:** esiste una separazione di prodotto pubblico e superficie riservata in Partner OS, ma non è possibile concludere che corrisponda al portale CEPA o alle sue esperienze mobile, tablet e desktop.

### Engine data — superfici e provenienza

**FATTO:** `sponsor/app.js` contiene array statici di sponsor, proposte, fornitori, pubblico, asset ed eventi; alcune viste caricano dati via `/api/sponsor/community`, `/api/sponsor/agenda` e `/api/sponsor/development`. Il manifest e `config/scd-data-fabric.v1.json` registrano master SCD e flussi Drive/Gmail; la capability `CAP-SPONSOR-OPERATIONAL-FOCUS` è `PARTIAL`.

**ANALISI:** i test di contratto verificano contenuti e comportamento atteso, non la correttezza corrente di ogni valore statico rispetto ai master. Occorre riconciliare i record con ID stabile, fonte, timestamp, stato di verifica e owner prima di usarli come dati commerciali live. `sponsor/README.md` dichiara scritture esterne disabilitate fino al collegamento del backend, mentre `server.js` espone handler API per lead e sessione: la differenza tra documentazione e runtime va verificata; questo audit non invia dati né prova scritture.

**CEPA:** nessuno schema, catalogo, evento, API o record CEPA è stato verificato. “Center C.E.P.A.” e “SAP” non risultano definiti nel manifest o nel codice ispezionato. La loro distinzione, ownership, confini dati e flussi non può essere dedotta dal workspace SCD.

### Identità, ruoli e confini di accesso

**FATTO SCD Partner OS:** `server.js` valida sessioni tramite `auth.validate`, deriva profili Direzione/Commerciale, imposta cookie `HttpOnly` e protegge le rotte riservate `/sponsor/app`, `/sponsor/app.html` e `/sponsor/app.js`. `scripts/build-pages.mjs` include nell’artefatto Pages solo gli asset pubblici Partner OS; l’area riservata è servita dal runtime server. Lo smoke test verifica redirect anonimo e rifiuto dell’endpoint Development senza sessione.

**LIMITE:** i controlli descrivono il codice SCD disponibile e i test locali; non verificano policy di CEPA, RLS, ruoli partner/operatore, amministratori, sessioni o deployment attuale. Il manifest e l’ADR-0007 vietano esplicitamente di riusare il progetto Supabase CEPA nel core SCD.

### Documenti, media e partner

**FATTO SCD:** l’interfaccia Partner OS prevede Document Hub, asset/media, attività e rapporti partner; parte dei contenuti pubblici è esplicitamente presentata come concept o soggetta a verifica. Il codice riferisce sessioni R20 e API con sessione server-side.

**UNVERIFIED CEPA:** repository/ACL documentali, originali e derivati media, retention, link condivisi, consenso, diritti d’uso, audit di download, workflow partner e autorizzazioni di collaborazione non sono disponibili. Nessun documento, media o partner reale CEPA è stato ispezionato.

### Qualità, accessibilità e performance

**FATTO:** esistono `test:sponsor-vision`, `test:sponsor-runtime` e `test:design-system`. La pagina pubblica e quella riservata hanno stylesheet e breakpoint multipli; `scripts/build-pages.mjs` usa una allowlist per distinguere file pubblici e privati.

**LIMITE:** non è stata eseguita una scansione accessibilità completa, una verifica manuale da tastiera/screen reader, un test cross-browser, una misura Core Web Vitals/Lighthouse o una code coverage. Non si dichiara codice morto: senza tracciamento delle rotte e coverage runtime, la rimozione sarebbe speculativa. Il volume e la sovrapposizione dei fogli di stile SCD sono candidati a inventory, non prova di dead code.

## Rilievi prioritizzati

| Priorità | Rilievo | Stato / impatto | Gate di chiusura |
|---|---|---|---|
| P0 | Sorgente CEPA e documenti AI richiesti non disponibili nel repository analizzato. | Bloccante: il prodotto oggetto dell’Issue non è identificabile in modo verificabile. | Ricevere manifest/istruzioni, repository canonico, URL e confini di proprietà; ripetere l’audit su CEPA. |
| P0 | Evidenza produzione SCD segnala Render su commit precedente a main. | Run 37112220326: HTTP 200, ma `RENDER_HEALTH_COMMIT` fallisce; non prova né blocca direttamente CEPA. Non promuovere alcuna conclusione di readiness SCD basata sul solo HTTP 200. | Riconciliare il commit e verificare nuovamente health/capabilities; fuori dallo scope di questa PR e senza deploy automatico. |
| P1 | “Center C.E.P.A.” e “SAP” non hanno definizione o boundary verificabile. | Rischio di unificare entità, dati o permessi che potrebbero essere distinti. | Approvare glossario, owner, sistema di record, ID e contratti/API per entrambe le superfici. |
| P1 | Dataset statici e master dinamici coesistono nella Partner OS SCD; documentazione e runtime non chiariscono completamente il percorso di scrittura. | Valori e lead possono essere scambiati per dati canonici senza provenance aggiornata. | Riconciliare ogni record ai master, chiarire read/write, audit, fallback e stato “non verificato”; eseguire test soltanto in staging. |
| P1 | Evidenza di autorizzazione CEPA, documenti/media e collaboration workflows assente. | Nessuna certificazione su access control, privacy, retention o segregazione ruoli per CEPA. | Mappare ruoli/scope server-side e RLS/ACL; testare accesso anonimo e cross-role con account sintetici non produttivi. |
| P2 | QA visuale, accessibilità e performance non sono misurati per CEPA; neppure le prove SCD equivalgono a una certificazione. | Rischi UX responsive e accessibilità non quantificati. | Visual QA ai breakpoint previsti, tastiera/screen reader, reduced motion, browser matrix e budget performance con report allegati. |
| P2 | Dead code CEPA non determinabile; superficie SCD candidata a inventory. | Rimozioni non supportate potrebbero rompere percorsi non coperti. | Mappare rotte/import/call-site e raccogliere coverage runtime prima di ogni rimozione. |

## Piano di attivazione — gate, non autorizzazione al deploy

1. **Sblocco perimetro e fonti (P0).** Ottenere `APP_AI_MANIFEST.md`, istruzioni WebApp AI, repository e URL canonici, nominare owner, distinguere CEPA da SCD e definire “Center” e “SAP”. Inventariare versioni, ambienti, domini e dipendenze senza leggere o copiare segreti.
2. **Audit CEPA evidence-first (P0/P1).** In sola lettura mappare portale pubblico e area riservata, schermate e stati UX, stack/API/schema, fonti per evento/contenuto/catalogo, provenienza e freschezza, ruoli/scope, storage documenti/media e flussi partner. Separare fatti, derivati, demo, fallback e non-disponibili.
3. **Security & data gate (P1).** Verificare enforcement server-side, policy database/RLS, sessione/logout, accesso anonimo e cross-role, rate limiting, validazione upload, retention, audit log e protezione dei minori/dati sensibili. Nessuna modifica autonoma a permessi, dati personali, documenti o safeguarding; nessun record sportivo o commerciale inventato.
4. **UX e qualità (P2).** Verificare le stesse funzioni su mobile, tablet e desktop, con confronti al visual master approvato; testare tastiera, focus, contrasto, semantica ARIA, reduced motion, error/loading/empty states, prestazioni e rotte non coperte. Registrare difetti e prove riproducibili.
5. **Readiness senza attivazione (P1/P2).** Preparare staging non produttivo, account sintetici, test di contratto e integrazione, artefatti immutabili, monitoraggio/health check, owner e piano di supporto. Confermare commit/branch dei deployment Pages/Render e dipendenze reali del servizio target.
6. **Decisione e release separata.** Richiedere approvazione umana e un PR dedicato alla soluzione scelta, con contratto/manifest aggiornato se cambiano dati, ruoli, API, fonti o UX. Solo dopo approvazione esplicita, check verdi e rollback provato si potrà valutare un’attivazione; questa Issue non autorizza un deploy.

### Rollback proposto per una futura attivazione

- Tenere le nuove capability disabilitate per default e usare un flag/cutover reversibile.
- Conservare CEPA e i suoi dati correnti intatti; evitare migrazioni distruttive o sostituzioni di sistema senza approvazione.
- Documentare il commit precedente, il proprietario della decisione di rollback, il segnale che lo attiva e la verifica post-rollback.
- Provare il rollback in staging prima della release; non spostare dati o ruoli in produzione come parte di questa audit.

## Fonti repository esaminate

- `SCD_SYSTEM_MANIFEST.json` (v3.26.0): invarianti, fonti, capability, non-compliance, gate release e separazione SCD/CEPA.
- `docs/adr/ADR-0007-supabase-domain-core.md`: progetti Supabase separati e R20 primario fino a migrazione verificata.
- `sponsor/README.md`, `sponsor/index.html`, `sponsor/app.html`, `sponsor/app.js`, `sponsor/sponsor.js` e relativi CSS: superficie Partner OS SCD, non prova dell’app CEPA.
- `server.js`, `render.yaml`, `scripts/build-pages.mjs`, `tests/sponsor-runtime-smoke.mjs`, `tests/sponsor-vision-contract.mjs`.
- GitHub Actions: E2E main run 37112220271, Pages run 37112220325, Production Evidence run 37112220326.

**Modifica di questa PR:** solo questo documento. Manifest, codice, dati, ruoli, configurazioni e runtime non sono stati modificati; nessun deploy è stato eseguito.
