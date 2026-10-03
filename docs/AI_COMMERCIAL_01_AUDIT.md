# AI-COMMERCIAL-01 — Audit Commercial / Lia

**Data di verifica:** 2026-10-03  
**Issue:** [#88](https://github.com/francesco1485/scd-colicoderviese-super-app/issues/88)  
**Esito:** integrare selettivamente i contratti utili in superfici e servizi SCD già esistenti; non promuovere il prodotto/UI R42 come seconda piattaforma.

## 1. Stato e perimetro verificato

| Voce | Stato | Evidenza |
| --- | --- | --- |
| Repository | VERIFIED | `francesco1485/scd-colicoderviese-super-app` |
| Main SHA | VERIFIED | `d16a658786b7577af498a3104dc31ebdd17f7613` |
| Branch di lavoro | VERIFIED | `copilot/ai-scd-commercial-lia`, inizialmente allineato a main |
| Working tree pre-audit | VERIFIED | Pulito |
| PR su questa branch | VERIFIED | Nessuna PR aperta al momento dell'audit |
| CI di questa branch | UNVERIFIED | Nessuna esecuzione CI di validazione; automazione Copilot ancora in corso |
| GitHub Pages | VERIFIED | Workflow `pages.yml` riuscito sullo SHA main corrente |
| Render / staging R42 | NOT_AVAILABLE | Le richieste GET a entrambi gli endpoint `/health` non hanno risolto il DNS. Ciò non prova che i servizi siano assenti o spenti. |
| Manifest corrente | VERIFIED | Versione `3.26.0`; SHA-256 `46518c9e5aa258fd5bbc1e80ecf0d1fa7c65b12c6e32a7d721dc4b5ed3205baf` |
| Dati e deployment live | UNVERIFIED | Sono state verificate le dichiarazioni e gli snapshot nel repository, non sono state interrogate le fonti operative né i deployment |

`APP_AI_MANIFEST.md` e `.github/copilot-instructions.md` non sono presenti nel working tree iniziale; entrambi sono stati letti dalla ref GitHub `ai-scd-commercial-lia`. Il manifest di progetto e `AGENTS.md` locali restano le fonti vincolanti. In particolare, il manifest corrente mantiene R20 come autorità per identità, ruoli e funzioni gestionali (`SCD_SYSTEM_MANIFEST.json:73-80`).

### Classificazione SCD:EXPERT

- **TASK_CLASS:** audit architetturale e riconciliazione, senza modifica di runtime o contratto.
- **DOMAINS:** commerciale/CRM, sponsor, Lia, autenticazione e scope, provenienza dati, hosting e test.
- **FIXED:** R20 autorevole; un solo prodotto e nessun CRM/database parallelo; provenienza verificabile; nessun dato commerciale inventato; nessun deploy o mutazione di produzione.
- **IMPROVABLE:** riuso di workflow e adapter R42 compatibili, una volta verificati in runtime e ricondotti al contratto attuale.
- **MISSING:** health evidence degli staging, prova dei comandi R20 commerciali live, autorizzazione per eventuali nuove fonti/capability.
- **SOURCE_PLAN:** Issue #88 e AI manifest; manifest e codice main; branch e PR R42; test/configurazione del repository; nessuna fonte commerciale live.
- **TOOLCHAIN:** ispezione read-only di repository/GitHub, test manifesto e validazione documentale.
- **RISK:** CRM parallelo, dati snapshot obsoleti, autorizzazione basata sul solo ruolo e handoff contenente dati personali/segreti.
- **TEST:** `npm run test:manifest`; nessuna prova di deploy.
- **ROLLBACK:** rimozione del solo documento di audit.
- **NEXT_ACTION:** usare le decisioni sotto come gate per ogni successiva integrazione software.

### SCD:ARCHITECT / SCD:ASSET

Audit documentale: nessuna schermata, UI, media o asset ufficiale è stato modificato. La UI commerciale R42 è classificata `SUPERSEDED` e non va trasferita; gli asset ufficiali restano `KEEP_LOCKED`, mentre i dati commerciali devono mantenere provenienza e stato di verifica.

## 2. Evidenze di storia e decisioni già prese

- PR [#40 — R42 Commercial Development OS staging](https://github.com/francesco1485/scd-colicoderviese-super-app/pull/40) è stata chiusa senza merge. La motivazione registrata è che il concept R42 non rappresentava il prodotto desiderato, doveva restare storico e non doveva essere promosso; il nuovo sviluppo sarebbe ripartito da main senza riusare la UI R42.
- PR [#41](https://github.com/francesco1485/scd-colicoderviese-super-app/pull/41), [#42](https://github.com/francesco1485/scd-colicoderviese-super-app/pull/42) e [#43](https://github.com/francesco1485/scd-colicoderviese-super-app/pull/43) sono state unite alla branch `r42-commercial-development-os`, non a `main`. Le funzionalità e i dati di quelle PR non sono quindi prova di una capability R42 attiva nell'architettura corrente.
- Il manifest e il codice R42 dichiaravano tre capability assenti dal `capability_map` del manifest corrente: `CAP-COMMERCIAL-DEVELOPMENT-OS`, `CAP-LIA-OPERATOR` e `CAP-LIA-TERRITORY-MAPPING`. Nel manifest corrente `CAP-GROWTH-LOOP` è `DESIGN_ONLY`, `CAP-VALUE-ENGINE` e `CAP-SPONSOR-OPERATIONAL-FOCUS` sono `PARTIAL` (`SCD_SYSTEM_MANIFEST.json:2587-2594,2644-2654,2835-2846`). Non si reintroducono ID o ruoli R42 in questo audit.

## 3. Superfici correnti e sovrapposizioni

| Superficie/funzione | Classificazione standard | Classificazione R42 | Decisione |
| --- | --- | --- | --- |
| Sponsor pubblico SCD (`/sponsor/`) | KEEP | INTEGRATE | Conservare la superficie pubblica esistente; non farla diventare una porta d'accesso al CRM privato. |
| Sponsor app privata (`/sponsor/app`) e API sponsor | KEEP / ENHANCE | INTEGRATE | È già un'area privata con sessione; lo smoke contract verifica il redirect anonimo e il rifiuto `401` dell'endpoint development senza sessione (`tests/sponsor-runtime-smoke.mjs:80-93`). La disponibilità live non è stata verificata. |
| Dashboard e iniziative commerciali private | KEEP / ENHANCE | INTEGRATE | È la sede esistente per la vista Partner OS/initiatives, le iniziative canoniche e il focus operativo (`SCD_SYSTEM_MANIFEST.json:3875-3940,4049-4082`). Riusare questi dati e endpoint, non creare un secondo Commercial OS. |
| R42 Commercial Development OS e relative route/tab/UI | REMOVE_WITH_REASON | SUPERSEDED | Non portare nella main la route `/app/commercial`, il layout R42 o la sua navigazione: PR #40 documenta esplicitamente la decisione di non promuovere il concept. Conservare la branch come storico; non cancellare dati o cronologia. |
| R42 Lia separata (`#/lia`) | REMOVE_WITH_REASON | SUPERSEDED | Non creare una nuova core experience o un secondo desk. Un eventuale collaboratore Lia va integrato come funzione autorizzata nella superficie SCD già approvata, previo aggiornamento del manifest. |
| Lia Sponsor attuale | FIX / ENHANCE | SUPERSEDED come motore operativo | `sponsor/app.js:1115-1128` implementa risposte locali a stringhe e regole, non un agente collegato a R20/R22. Non presentarlo come AI con accesso o capacità operative; le risposte con stati e importi statici richiedono fonte aggiornata. Riutilizzabile solo l'affordance/help locale, etichettata correttamente. |
| Bozza sponsor salvata in `localStorage` | REMOVE_WITH_REASON per uso CRM; KEEP come bozza locale solo se dichiarata | SUPERSEDED | `sponsor/app.js:1130-1134` salva bozze solo nel browser: non è CRM, persistenza condivisa o invio. Non convertirla implicitamente in dato canonico né usarla per comunicazioni commerciali. |
| Control Room LED e catalogo asset R42 | ENHANCE nel sistema sponsor esistente | INTEGRATE selettivamente | Riutilizzare come requisiti/controlli solo quelli ancora validi (asset, approvazione, stato materiali, stagione, provenance). Non copiare roster/valori/logo da branch R42 né duplicare le viste e i record correnti. |

Il dashboard corrente distingue esplicitamente snapshot da master e fallisce in modo visibile quando la fonte non è disponibile (`sponsor/app.js:793-845`). Il contratto del focus operativo vieta scadenze/costi inventati e richiede sorgente visibile e conferma umana per creare eventi (`SCD_SYSTEM_MANIFEST.json:4049-4082`). `tests/sponsor-runtime-smoke.mjs` copre inoltre route pubblica e accesso anonimo all'area privata; è un test locale, non prova di sessione o deployment live.

## 4. Lia e Command Platform

Il ramo R42 ha aggiunto plugin R22 per:

- mapping territoriale via OpenStreetMap/Overpass;
- creazione di cartelle Drive e salvataggio di mapping in Drive/Sheets;
- handoff Lia strutturato su Drive verso supporto remoto.

Il repository corrente contiene già il pattern Command Platform come livello di orchestrazione, con plugin trusted e bridge a R20; R20 resta il core di identità e dati (`platform/README.md:5-23,57-90`). La modalità inline non offre durabilità della coda senza Redis (`platform/README.md:40-49,92-100`). I plugin R42, invece, non sono presenti nel working tree main e non risultano raggiungibili tramite le action allowlist correnti di `server.js:67-78`.

| Elemento R42 | Classificazione standard | Classificazione R42 | Condizioni per un eventuale recupero |
| --- | --- | --- | --- |
| Plugin/contract di mapping | INTEGRATE | RECOVER | Mantenere un comando R22 read-only e deterministico; registrare prima OpenStreetMap/Overpass nel `source_registry`; mostrare generazione, attribuzione ODbL e copertura parziale; non inferire interesse commerciale, partnership o consenso dal fatto che un'impresa compaia nei dati. |
| Scrittura mapping/cartelle Drive | FIX / COMPLETE | INTEGRATE | Riutilizzare solo tramite R20 server-side, destinazione canonica e audit verificabile. L'attuale gap `GAP-R20-001` dice che il deployment Apps Script non supporta ancora alcune action R21/R25 (`SCD_SYSTEM_MANIFEST.json:2929-2933`); nessuna scrittura può essere considerata pronta finché il contratto non è distribuito e verificato. |
| Lista statica di aziende, sponsor o contatti R42 | REMOVE_WITH_REASON | SUPERSEDED | Non importare roster, recapiti, stati, importi o contatti PR #41-43. Riconciliare ogni record solo contro il master corrente e la relativa evidenza/autorizzazione; non confondere fornitori, prospect e sponsor attivi. |
| Handoff Lia `SCD_LIA_HANDOFF_V1` | ENHANCE / FIX | RECOVER selettivamente | Conservare il formato come proposta di handoff umano, non come invio automatico a ChatGPT. Prima di qualsiasi persistenza servono minimizzazione/redazione effettive di token, dati personali e riferimenti riservati, policy applicate server-side, audit e separazione safeguarding. Il fatto che un packet contenga regole testuali non dimostra che i contenuti siano stati filtrati. |
| Lia come motore che pianifica/esegue azioni | INTEGRATE | RECOVER selettivamente | Ogni azione deve essere un plugin trusted con schema, autorizzazione server-side R20, scope concreto, audit, approvazione esplicita per side effect e fallimento chiuso. L'LLM non riceve privilegi autonomi. |

### Ruoli, scope e autenticazione

R42 passa la sessione `x-scd-session` al bridge R20 e prevede gate Direzione/Admin per alcune scritture; il handoff usa una lista più ampia di ruoli interni. I plugin dichiarano `allowedRoles`, ma la lista di ruoli non è una verifica di scope su squadra, stagione, iniziativa o cartella. Lo scope deve essere risolto e validato server-side da R20 per ogni risorsa e azione. Non accettare ruoli dichiarati dal browser, né riusare un token in handoff, prompt o log. La presenza del codice di autorizzazione sul ramo non prova che l'action sia installata o che la policy live sia corretta.

Il packet handoff R42 persiste comando, contesto, riferimenti e dati dell'attore in Drive; i divieti su segreti e safeguarding sono presenti come regole testuali del packet, ma nel codice ispezionato non è dimostrato un filtro che li applichi ai valori prima della scrittura. È un prerequisito di hardening, non una capability pronta.

I ruoli e la superficie privata restano quelli già definiti dal manifest corrente (`CAP-IDENTITY-ACCESS`); non aggiungere `COMMERCIALE` o un nuovo ruolo R42 senza decisione Direzione e aggiornamento del manifest. Safeguarding deve restare fuori dai flussi ordinari, anche dai packet di supporto.

## 5. Fonti, provenance e dipendenze

| Fonte/dipendenza | Stato nel sistema corrente | Trattamento nell'integrazione |
| --- | --- | --- |
| `SPONSOR_MASTER_SHEET` | Registrata come fonte interna per sponsor/partner e asset (`SCD_SYSTEM_MANIFEST.json:991-1002`) | Master sponsor; non sostituirla con il roster statico R42. Verificare adapter e accesso effettivo prima di dichiarare dati live. |
| `SCD_OPERATIVO_PILOTA` | Fonte canonica dichiarata per `INIZIATIVE_COMMERCIALI`, stakeholder, fornitori e lineage (`SCD_SYSTEM_MANIFEST.json:3875-3886`) | La snapshot locale `config/sponsor-development.snapshot.json` è verificata ma statica, generata il 2026-10-02 e non va presentata come live (`config/sponsor-development.snapshot.json:1-13`). Il master live prevale. |
| `R20` | Autorità per identità, ruoli e funzioni gestionali (`SCD_SYSTEM_MANIFEST.json:73-80`) | Unico punto per identità/autorizzazione e scritture canoniche finché non esiste migrazione verificata. Le action commerciali R42 non risultano abilitate/verificate nel runtime attuale. |
| Drive / Sheets | Back-office e destinazione proposti dal patch R42 | Scritture solo dopo conferma del contratto, scope, permessi e cartelle canoniche; audit e rollback devono essere verificabili. |
| Gmail / Calendar | Fonti back-office o calendario nominate dal contratto corrente | Accesso limitato al purpose e allo scope autorizzati; nessuna raccolta generale o trasformazione automatica in lead. Creazione eventi sempre con conferma umana. |
| Supabase | Nuovo core non in cutover; il manifest mantiene comportamento dark finché non sono soddisfatti i gate | Non creare tabelle commerciali/Lia duplicate o introdurre dual-write. |
| OpenStreetMap / Overpass | Usata dal mapper R42; non registrata come fonte canonica nel manifest corrente | Fonte open-data secondaria e incompleta; registrazione e verifica attribuzione/licenza sono prerequisiti. Non è fonte di interesse, relazione o stato sponsor. |
| R22 Command Platform / Redis | Orchestrazione già documentata nel repository; Redis è opzionale | Può ospitare plugin trusted, non identità, CRM o stato canonico duplicati. Non dichiarare job durevoli in modalità senza coda persistente. |
| Render staging R42 | Nominato in `APP_AI_MANIFEST.md` come `scd-commercial-r42-staging` e `scd-lia-r42-staging`; non verificabile via health GET e non dichiarato nel `render.yaml` corrente | Stato `NOT_AVAILABLE`; nessuna conclusione sull'esistenza o sullo stato dei servizi. Richiedere evidence dal proprietario del progetto Render prima di qualunque cutover. |

**Dipendenze di release prima di ogni integrazione runtime:** action R20 approvata e installata; test diretto R20 verde; adapter e ruoli/scope server-side; Drive/Sheets autorizzati; fonte OSM registrata se resta il mapper; test del plugin e prova end-to-end in staging. La presenza di una URL o di un nome servizio non è prova di deployment.

## 6. Codice duplicato, obsoleto e test

- Il modello R42 di pipeline commerciale si sovrappone alla vista Partner OS e alla capability corrente `CAP-SPONSOR-OPERATIONAL-FOCUS`; usare un unico record/progetto e una sola pipeline canonica.
- Il pannello Lia R42 è una route/esperienza distinta; la Lia corrente in `sponsor/app.js` è invece una funzione locale non operativa. Nessuna delle due va scambiata per un agente con accesso live.
- Dati sponsor, stagioni, LED e contatti presenti solo nei PR confluiti nel ramo R42 non costituiscono una fonte corrente. La UI corrente include anche dati statici di esempio/locali: non usarli per confermare rapporti, stato o valori senza riconciliazione con i master.
- Il test R42 `scripts/validate-lia-contract.mjs` è un controllo statico di presenza di ID, stringhe e file (`npm run test:lia-contract` sulla branch R42); non verifica autenticazione live, scope, privacy del packet, idempotenza, disponibilità dei servizi, persistenza reale o rollback.
- La main dispone già di gate manifest, CRM/communication e sponsor (`package.json:8-44`, `tests/sponsor-runtime-smoke.mjs`, `tests/sponsor-vision-contract.mjs`). Questi test non sostituiscono l'integrazione R20/R22 mancante.
- Il blocco tecnico principale è `GAP-R20-001`: runtime R20 dichiarato non ancora aggiornato per le action Data Fabric/R25 (`SCD_SYSTEM_MANIFEST.json:2929-2933`). Sono inoltre non verificati lo stato Render e il comportamento live dei plugin R42.

## 7. Matrice finale di decisione

| Capacità/artefatto R42 | KEEP | ENHANCE | FIX | INTEGRATE | COMPLETE | REMOVE_WITH_REASON | Recupero |
| --- | --- | --- | --- | --- | --- | --- | --- |
| UI/route Commercial OS R42 |  |  |  |  |  | Sì: PR #40 chiusa non merged su decisione Direzione; evita seconda esperienza e duplicazione | SUPERSEDED |
| UI/route Lia R42 indipendente |  |  |  |  |  | Sì: non creare nuova core experience o desk parallelo | SUPERSEDED |
| Concetti di lifecycle, evidenze e asset sponsor |  | Sì, rispettando manifest e master correnti |  | Sì, nel Partner OS esistente | No: capability resta parziale | No | INTEGRATE |
| Mapping open-data territoriale |  |  | Sì: source, attribuzione, copertura e privacy | Sì, come plugin R22 read-only | No: runtime non verificato | No, salvo codice non più mantenibile | RECOVER condizionato |
| Scritture Drive/Sheets tramite R20 |  |  | Sì: R20/action/scope/audit gate | Sì solo dopo il gate | No | No | INTEGRATE dopo prova |
| Lia handoff remoto |  | Sì: minimizzazione e redazione | Sì: enforcement, safeguarding e audit | Sì solo come handoff umano autorizzato | No | No: mantenibile solo se privacy-safe | RECOVER condizionato |
| Snapshot/roster/contatti esclusivi R42 |  |  | Riconciliare, non copiare | No | No | Sì: evitare dato duplicato o stale | SUPERSEDED |

## 8. Percorso d'integrazione sicuro

1. Mantenere sponsor/iniziative/Partner OS correnti come superfici e fonti canoniche; nessun nuovo CRM, dashboard privata, route Lia o database.
2. Prima di implementare nuove capacità, ottenere approvazione sulla capability e sulle fonti e aggiornare `SCD_SYSTEM_MANIFEST.json` nello stesso PR. Nessun nuovo ruolo senza revisione Direzione.
3. Se approvato, trasferire il mapper e gli handoff compatibili come plugin R22 trusted, registrare tutte le fonti, e fare risolvere autorizzazione e scope a R20.
4. Tenere il mapping in sola lettura finché il master R20/Drive, l'audit e la prova diretta non sono verificati. Ogni dato commerciale derivato deve mantenere fonte, timestamp, attribuzione, copertura e stato non verificato.
5. Per qualunque handoff, applicare server-side minimizzazione e filtri verificabili prima della persistenza; escludere sempre segreti e safeguarding e richiedere conferma umana. Nessun invio remoto implicito.
6. Aggiungere test di contratto, autorizzazione negativa/positiva, scope, provenance, privacy, idempotenza/side effect e percorso R20 end-to-end; registrare health/staging evidence, piano di rollback e limiti prima di dichiarare lo stato `TESTED`.

## Riferimenti R42 esaminati

Il codice storico è stato letto dalla branch `r42-commercial-development-os` (head `06da59aedfe331a617718571c789d902655251e9`); le istruzioni di task sono state lette dalla branch `ai-scd-commercial-lia`. Questi riferimenti sono evidenza storica, non prova del runtime attuale:

- [APP_AI_MANIFEST.md](https://github.com/francesco1485/scd-colicoderviese-super-app/blob/ai-scd-commercial-lia/APP_AI_MANIFEST.md)
- [Copilot instructions](https://github.com/francesco1485/scd-colicoderviese-super-app/blob/ai-scd-commercial-lia/.github/copilot-instructions.md)
- [R42 Lia/Commercial Apps Script patch](https://github.com/francesco1485/scd-colicoderviese-super-app/blob/r42-commercial-development-os/backend_patch_R42_lia_commercial.gs)
- [R42 OpenStreetMap business mapper](https://github.com/francesco1485/scd-colicoderviese-super-app/blob/r42-commercial-development-os/platform/src/adapters/OpenStreetMapBusinessMapper.ts)
- [R42 mapping command](https://github.com/francesco1485/scd-colicoderviese-super-app/blob/r42-commercial-development-os/platform/src/plugins/build-municipality-commercial-map/BuildMunicipalityCommercialMapCommand.ts)
- [R42 handoff command](https://github.com/francesco1485/scd-colicoderviese-super-app/blob/r42-commercial-development-os/platform/src/plugins/save-lia-handoff/SaveLiaHandoffCommand.ts)
- [R42 static contract test](https://github.com/francesco1485/scd-colicoderviese-super-app/blob/r42-commercial-development-os/scripts/validate-lia-contract.mjs)

## 9. Decisione

**Recuperare i contratti, non il prodotto R42.** Sono potenzialmente riusabili il pattern di comando R22, il mapping territoriale con provenienza e copertura esplicite, e il packet di handoff umano solo dopo hardening privacy/sicurezza. Il Commercial Development OS, le sue route/UI, i record e i contatti branch-specific sono superseduti o richiedono nuova riconciliazione; PR #40 non va riaperta né promossa. Nessun deploy, scrittura live o cambio di ruolo è stato effettuato da questo audit.
