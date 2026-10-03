# AI-MAGLIA360-01 — Audit e readiness produzione

**Issue:** [#90](https://github.com/francesco1485/scd-colicoderviese-super-app/issues/90)
**Data dell’audit:** 2026-10-03
**Commit esaminato:** `d16a658786b7577af498a3104dc31ebdd17f7613`
**Esito:** **NO-GO per la produzione di Maglia360.** Questo audit non effettua deploy, non modifica dati e non certifica l’ufficio SCD Partner OS come prodotto Maglia360.

## Sintesi esecutiva

Nel repository sono presenti il sito pubblico Sponsor e l’area privata **SCD Partner OS**, con CRM relazionale, Agenda SCD, pipeline sponsor e una Lia locale. Non è invece verificabile un’applicazione dedicata **Maglia360 Office**, né un’integrazione C.E.P.A., né il preview Render `maglia360-office-v2-preview`. La sola occorrenza di Maglia Assicurazioni individuata è nel contenuto statico del sito Sponsor: non prova l’esistenza di una control room assicurativa.

Perciò l’audit valuta ciò che il codice e le prove disponibili dimostrano, e segnala come non verificato tutto ciò che richiede artefatti, servizi o autorizzazioni non presenti. Non attribuisce a Maglia360 dati, integrazioni o controlli ereditati per supposizione dall’area Sponsor.

## Perimetro e limiti delle fonti

- La Issue richiede `APP_AI_MANIFEST.md`, `.github/copilot-instructions.md` e `.github/agents/webapp-master.agent.md`. I primi due file non sono presenti nel checkout né risultano nel riferimento `main` esaminato; il terzo non è stato verificabile in questo contesto. Le istruzioni specifiche WebApp AI non possono quindi essere usate come evidenza.
- La fonte normativa SCD consultata è `SCD_SYSTEM_MANIFEST.json` (versione `3.26.0`). Il manifest registra `SPONSOR_MASTER_SHEET` per sponsor, partner, commerciale, asset e follow-up (riga 991) e la capability `CAP-SPONSOR-OPERATIONAL-FOCUS` come `PARTIAL`, basata su SCD Operativo Pilota, Google Calendar e R20 (righe 2835–2845). Queste fonti non documentano una fonte Maglia360 o C.E.P.A.
- L’audit è basato sul codice/versione in repository e sui run GitHub Actions disponibili alla data indicata. Non sono state ispezionate credenziali, contenuti di clienti, dati di polizza o fogli di produzione.
- Il patch Apps Script R21.6 nel repository documenta il comportamento del bridge, ma non prova che quel codice sia distribuito o coincida con il runtime live.

## Risultati per dominio

### 1. Applicazione, autenticazione e ruoli

**FATTO.** `server.js` gestisce OTP e login tramite `auth.request`/`auth.login` Apps Script, rifiuta utenti non ammessi e imposta il cookie `scd_sponsor_session` con `HttpOnly`, `SameSite=Lax`, durata di sei ore e `Secure` in produzione (`server.js:104–166, 300–343`). La pagina e il relativo script dell’area privata vengono serviti solo dopo validazione della sessione (`server.js:475–486`).

**FATTO.** La mappatura locale riconosce profili Direzione e Commerciale tramite email/ruolo/tipo; le capacità includono, tra l’altro, `finance`, `settings` e `admin` (`server.js:134–158`). Nel client è nascosta in base alle capacità solo la vista Impostazioni (`sponsor/app.js:66–81`). Questo è SCD Partner OS, non un modello di identità Maglia360.

**RISCHIO ALTO — scope CRM non dimostrato.** Le route Node del CRM validano la sessione e inoltrano summary/detail a Apps Script (`server.js:344–356`). Nel patch R21.6, `r216CrmActor_` controlla token e presenza dell’email ma non un ruolo o scope (`backend_patch_R21_6_http_api.gs:287–291`); summary e detail leggono gli stakeholder e le relative attività, opportunità e convenzioni senza filtro tenant/cliente esplicito (`:302–354, :544–579`). È quindi necessaria una verifica o una restrizione server-side prima di riusare quel CRM per dati assicurativi. Il controllo di sessione non dimostra isolamento per cliente né autorizzazione granulare.

**DA VERIFICARE.** Non esistono prove di una matrice ruoli Maglia360, di assegnazione collaboratore→cliente o dei test di accesso diretto agli endpoint. Le capacità esposte al client non sostituiscono i controlli server-side.

### 2. Dati, fonti e provenance

**FATTO.** Il Partner Hub combina record locali etichettati `DOSSIER` con record CRM etichettati `CRM`; il merge mantiene valori del dossier quando i dati CRM non li sostituiscono (`sponsor/app.js:192–229, 353–380`). Il CRM espone dati anagrafici e di relazione quali email, telefono, referente, valore relazionale, prossima azione e scadenza (`backend_patch_R21_6_http_api.gs:328–354`).

**FATTO.** Una parte delle informazioni dell’ufficio Sponsor è codificata in array client-side; non va considerata automaticamente aggiornata o canonica. Per i progetti, il backend distingue master live da snapshot verificato e dichiara il fallback (`server.js:452–472`). Tale fallback non costituisce una fonte dati Maglia360.

**NON VERIFICATO.** Non è documentato un modello dati Maglia360 per clienti, polizze, rinnovi assicurativi, sinistri, commissioni o collaboratori, né la provenienza e la freschezza di dati C.E.P.A. Non sono stati inventati esempi o importi per colmare questa lacuna.

**Prerequisito.** Registrare nel manifest le fonti effettivamente autorizzate prima di collegarle; definire identificatori stabili, proprietario, trust, data di aggiornamento, retention e comportamento per dato stale/non disponibile.

### 3. C.E.P.A.

Nessun riferimento, client API, configurazione, contratto o test C.E.P.A. è stato trovato nel codice e nel manifest consultati. Non è possibile stabilire da questa evidenza cosa significhi l’acronimo, quale servizio sia previsto o se esista un rapporto tecnico attivo.

**Bloccante.** Prima dell’integrazione servono identificazione e documentazione ufficiali del servizio, referente autorizzante, ambiente di test, autenticazione, scope, schema e regole di trattamento. Fino ad allora nessun dato C.E.P.A. va simulato o mostrato come connesso.

### 4. Lia

**FATTO.** La Lia visibile in SCD Partner OS è etichettata “Assistente AI locale” (`sponsor/app.html:249–260`), ma `liaAnswer()` seleziona risposte predefinite tramite parole chiave e le mostra nel browser con `textContent`; non effettua chiamate a un modello, a C.E.P.A. o a una fonte assicurativa (`sponsor/app.js:1115–1128`).

**ESITO.** Non è dimostrata la Lia Workbench richiesta per Maglia360. La Lia SCD attuale non può essere presentata come assistente generativa, come interprete di polizze o come fonte di consulenza assicurativa. Se riutilizzata, deve restare esplicita la distinzione tra risposta locale, contenuto documentato e dato non disponibile; ogni azione esterna richiede autorizzazione e conferma umana.

### 5. Documenti, contratti e confidenzialità

**FATTO.** L’interfaccia Sponsor contiene una sezione Document Hub, ma `renderFolders()` costruisce categorie statiche e invita a collegare i file ufficiali: non prova navigazione, permessi o archiviazione Drive (`sponsor/app.html:430–433`; `sponsor/app.js:291, 855–857`). Il CRM può restituire accordi associati a uno stakeholder (`backend_patch_R21_6_http_api.gs:560–579`), ma ciò non certifica un archivio contratti Maglia360.

**RISCHIO ALTO — preview HTML.** La preview email restituita dal bridge viene inserita nel DOM usando `innerHTML` (`sponsor/app.js:1360–1369`). Il bridge codifica le variabili del template, ma compone anche la firma HTML configurata (`backend_patch_R21_6_http_api.gs:589–593, 683–704`). Prima di riutilizzare questa superficie per contenuti riservati occorre definire una allowlist/sanificazione dell’HTML attendibile o un rendering isolato e verificare chi può modificare template e firme.

**PRIVACY — log OTP.** Il server scrive l’indirizzo email richiesto per l’OTP nei log applicativi, sia su accettazione sia su errore (`server.js:309, 312`). Per il perimetro Maglia va stabilito se ciò è necessario, chi può leggere i log e per quanto sono conservati; preferire la minimizzazione o redazione dell’identificativo.

**DA VERIFICARE.** Mancano evidenze di autorizzazioni per file, link privati, audit accessi/download, retention, revoca, versioning e segregazione per cliente. Documenti di identità, polizze, sinistri e dati di terzi devono rimanere fuori da superfici pubbliche, analytics generici e log applicativi.

### 6. Network radar, attività, scadenze e recupero cliente

**FATTO.** Esiste un radar fornitori/partner SCD e una pipeline commerciale nel Partner OS; la capability SCD `CAP-SPONSOR-OPERATIONAL-FOCUS` è dichiarata `PARTIAL`, con contratto che vieta scadenze sintetiche (`SCD_SYSTEM_MANIFEST.json:2835–2845`). Il CRM gestisce task, opportunità, contatti e prossime azioni; Agenda SCD prevede riepilogo e creazione evento via bridge.

**NON VERIFICATO per Maglia360.** Non sono provati un network radar assicurativo, assegnazione dei clienti a collaboratori Maglia, workflow di recupero, SLA, reminder o riconciliazione con C.E.P.A. Le attività SCD esistenti non dimostrano tali funzioni.

### 7. UX, accessibilità e prestazioni

**FATTO.** SCD Partner OS ha navigazione desktop/mobile, stati di caricamento/errore in alcune viste e pattern accessibili presenti nel CSS: focus visibile, target minimi da 44 px e riduzione di alcune animazioni (`sponsor/app.css:226–246, 1165–1167`). Le viste includono CRM, Partner Hub, Document Hub e Agenda (`sponsor/app.html:26–43`).

**DA VERIFICARE.** Non risultano un visual master Maglia360, schermate specifiche, QA visuale sulle viewport richieste, audit completo WCAG/ARIA, test tastiera end-to-end o misure prestazionali del prodotto Maglia360. I controlli CSS presenti non equivalgono a una conformità accessibilità.

### 8. Test e prove di rilascio

- `tests/sponsor-runtime-smoke.mjs` prova le superfici Sponsor e i dinieghi senza sessione, ma non un login positivo, matrice ruoli Maglia360, isolamento cliente o C.E.P.A.
- `tests/sponsor-vision-contract.mjs` verifica la presenza di stringhe e moduli UI, non screenshot né comportamento accessibile reale.
- `tests/crm-communication-contract.mjs` verifica contratti statici per CRM, invii con conferma e Agenda; non prova autorizzazione di produzione per ruolo o cliente.
- Il run E2E main **37112220271** è riuscito e il deploy Pages **37112220325** è riuscito sul commit esaminato.
- Il run Production Evidence **37112220326** è fallito: Pages e manifest rispondono correttamente, ma la verifica Render ha osservato il commit `fba68f62834f6f2343ddbe4b7507707ca543a83f` invece del commit atteso `d16a658786b7577af498a3104dc31ebdd17f7613` (`RENDER_HEALTH_COMMIT`). Questo è un blocco di readiness SCD corrente e non è stato corretto o aggirato in questo task.

### 9. Preview e readiness di produzione

`render.yaml` dichiara un servizio web `scd-colicoderviese-super-app`, health check `/health` e `autoDeploy: true` (righe 1–14). Non dichiara `maglia360-office-v2-preview`; la presenza e lo stato di tale servizio non sono verificabili dai file o dalle prove consultate.

**NO-GO:** non esiste evidenza verificabile che Maglia360 sia installata, segregata, collegata a fonti autorizzate, testata o pronta al rilascio. Il servizio SCD live non ha superato la prova di commit esatto. Nessun deploy è stato eseguito in questa attività.

## Finding prioritari

| Priorità | Finding | Evidenza / condizione di chiusura |
|---|---|---|
| **P0 — Bloccante** | Applicazione, manifest AI e preview Maglia360 non verificabili; integrazione C.E.P.A. assente dall’evidenza repository. | Ottenere artefatti/spec ufficiali, owner e ambiente di test; registrare la capability e le fonti autorizzate prima di implementare. |
| **P1 — Alto** | Il CRM R21.6 controlla la sessione, ma summary/detail non mostrano filtro Maglia o per-cliente nel codice esaminato. | Definire ACL server-side fail-closed per ogni risorsa e provare accesso diretto, IDOR e isolamento con ruoli diversi. |
| **P1 — Alto** | Preview di email renderizza HTML restituito dal backend nel DOM; la firma configurata entra nel documento HTML. | Limitare e verificare template/firme; sanificare o isolare il rendering; aggiungere test XSS su contenuti e configurazione. |
| **P1 — Alto** | Le categorie Document Hub sono statiche e non dimostrano autorizzazioni o storage documentale. | Implementare/validare storage autorizzato, audit, retention, revoca e segregazione prima di usare documenti cliente. |
| **P2 — Medio** | Il flusso OTP registra l’indirizzo email in chiaro nei log applicativi. | Valutare redazione/minimizzazione e verificare accesso e retention dei log. |
| **P2 — Medio** | Lia è locale e deterministica; nessun fondamento C.E.P.A. o assurance assicurativa verificabile. | Definire scopo, fonti citate, confini di risposta, fallback e approvazione umana; non usare per consulenza non autorizzata. |
| **P1 — Alto** | Readiness Render SCD fallisce il controllo sul commit esatto; il servizio preview Maglia non è dimostrato. | Risolvere/verificare separatamente lo stato Render e dimostrare il preview dedicato, senza usare il deploy SCD come prova Maglia. |

## Sequenza necessaria prima di una decisione di produzione

1. **Chiudere i prerequisiti documentali:** fornire `APP_AI_MANIFEST.md` e le istruzioni WebApp AI consultabili; nominare owner di prodotto, sicurezza e dati; chiarire formalmente C.E.P.A. e la relazione con Maglia Assicurazioni.
2. **Approvare il contratto di sistema:** definire schermate, ruoli e scope, categorie di dato, fonti, retention e operazioni consentite; aggiornare `SCD_SYSTEM_MANIFEST.json` nello stesso PR se si introducono capability, fonti, ruoli, routing o contratti nuovi.
3. **Definire il modello dati reale:** mappare solo entità e campi autorizzati a fonti ufficiali; includere provenance, identificatore, timestamp, freshness e stati “non disponibile/stale”; nessun fixture con dati cliente reali.
4. **Implementare identità e autorizzazione server-side:** ruoli nominativi approvati, scope minimo per cliente/collaboratore, controlli su ogni endpoint e file; rifiuto predefinito per identità, scope o fonte mancanti.
5. **Integrare C.E.P.A. prima in sandbox read-only:** verificare contratto/versione, autenticazione, rate limit e mapping; aggiungere timeout, errori visibili, audit e fixture sintetici. Le scritture e gli invii restano disabilitati fino ad approvazione.
6. **Definire Lia come assistente circoscritto:** risposte ancorate a fonti visibili, citazioni/provenance, nessun bypass autorizzativo o inferenza non supportata; conferma umana per azioni e messaggi; percorso di escalation per richieste assicurative fuori perimetro.
7. **Chiudere documenti e privacy:** storage con ACL per cliente, accessi/download auditabili, retention e revoca definite; sanificazione/isolation della preview HTML; minimizzazione dei log (inclusi identificatori email) e revisione privacy/sicurezza.
8. **Completare UX e QA:** visual master Maglia approvato; test keyboard/screen reader e viewport mobile/desktop; stati loading, vuoto, offline, stale, denied ed errore; verifiche di performance e regressione visuale.
9. **Aggiungere test bloccanti Maglia360:** login valido/non valido, ruolo e scope, IDOR e cross-client, endpoint/files diretti, sandbox C.E.P.A. (errori inclusi), Lia grounding/fallback, XSS, audit log, dati stale e assenza di dati reali nei fixture.
10. **Verificare il preview senza dati reali:** dimostrare che `maglia360-office-v2-preview` esiste ed è separato da produzione, con segreti e fonti di test isolati; verificare health, versione e commit esatti, feature flag e report CI. Il blueprint SCD segnala `autoDeploy: true`: chiarire il collegamento/trigger Render prima di qualunque merge o release.
11. **Raccogliere approvazioni e piano di rollback:** sign-off di owner, sicurezza/privacy e responsabile delle fonti; artefatti di test, limiti noti, commit e PR; procedura di disabilitazione e ripristino. Un deploy futuro richiede un’autorizzazione separata e non è incluso nell’Issue svolta qui.

**Criterio di uscita:** nessuna dichiarazione “live” o “production-ready” finché i finding P0/P1 non sono chiusi, i test Maglia360 non sono verdi e le prove runtime/commit del servizio dedicato non sono verificabili.
