# Issue #90 — Maglia 360 Office: audit architettura e readiness

**Esito:** `NO-GO produzione` — superfici applicative presenti nel branch sorgente, ma i confini di autorizzazione server-side, le funzioni operative, i test specifici e il preview non sono verificabili con le evidenze disponibili. Questo audit non dichiara il servizio assente e non autorizza un deploy.

## Stato ed evidenze

Fonti primarie richieste:

- `ai-maglia360-office` — commit `3c6f979a249af677b8cbd98c0ae43b87d6c93c7e`: `APP_AI_MANIFEST.md`, `.github/copilot-instructions.md`, `.github/agents/webapp-master.agent.md`.
- `maglia360-office-architecture-v2` — commit `215181e52d4ed0d81740653fdb7420ad8cde8c35`: applicazione in `cepa-maglia-os-static/`.

Il manifest identifica il progetto come ambiente operativo privato Maglia 360, nomina il servizio Render `maglia360-office-v2-preview` e `cepa-maglia-os-static` come publish path. Le istruzioni AI impongono autorizzazione server-side, nessun duplicato di CRM/auth/database, provenienza dei dati, test, accessibilità e divieto di mutazioni production senza autorizzazione (`APP_AI_MANIFEST.md:1-17`; istruzioni WebApp:3-8, 24-40).

| Elemento | Esito | Evidenza / limite |
|---|---|---|
| Branch e commit sorgente | `VERIFIED` | SHA dei due ref riportati sopra. |
| PR di correzione | `VERIFIED` | PR #95 aperta e draft al momento della verifica. |
| App Maglia 360 | `VERIFIED` nel repository | HTML, JS, CSS, visual master e prove di provenienza presenti in `cepa-maglia-os-static/`. |
| Backend, schema, policy e funzioni | `UNVERIFIED` | Non sono inclusi schema/migrazioni/policy Supabase né il codice della Edge Function `lia-workbench` nell’app esaminata. |
| Render preview | `UNVERIFIED` | Il manifest nomina il servizio. Root e `/health` non hanno risolto via DNS da questo ambiente; `render.yaml` nel ref esaminato non contiene una definizione identificabile del servizio Maglia. Ciò non prova che il servizio non esista. |
| Test funzionali Maglia / release | `UNVERIFIED` | Non risultano test specifici per l’app né un flusso di release/rollback verificabile per quel preview. |
| Produzione | `NOT MODIFIED` | Nessun deploy, login con account reale o mutazione di dati production effettuati nell’audit. |

## Applicazione e perimetro funzionale

La UI implementa viste per ecosistema/partner, prodotti, collaboratori, C.E.P.A. centrale e territoriale, documenti, Lia Workbench, Radar Rete, attività/scadenze e recovery. La struttura è coerente con lo scopo dichiarato nel manifest, non con il Partner OS SCD (`cepa-maglia-os-static/index.html:20-23, 74-89, 231-305, 613-694, 790-806, 860-880, 929-950`).

### Autenticazione, ruoli e scope

- L’app usa Supabase Auth dal browser, con `signInWithPassword`, signup, sessione persistente e logout (`app.js:1-2, 34-35, 75-76`). La chiave client pubblica non è una credenziale server; la riservatezza dipende da policy backend corrette.
- Dopo il login, `boot()` cerca una membership attiva dell’utente e ne prende una sola con `.limit(1).maybeSingle()`. Senza selezione esplicita dell’organizzazione, un account con più membership attive può entrare nello scope non deterministico rispetto alla scelta dell’utente (`app.js:415-430`).
- Le viste sono mostrate/nascoste tramite `organization_role_views`; `super_admin`, `supervisor` e `manager` vengono trattati come manager (`app.js:8, 218-236`). Assegnazioni ufficio e capability Lia sono caricate dal client. Sono controlli UI, non prova di autorizzazione.
- Le query principali aggiungono `organization_id` e diverse azioni includono lo stesso filtro o chiamano RPC con ID. Questo è un utile confine applicativo, ma non garantisce isolamento tenant: le policy RLS, permessi RPC, ruolo del proprietario/definer e verifiche server-side non sono nel materiale esaminato.
- Non è verificabile se un membro può leggere solo assegnazioni/uffici consentiti, o se ruoli client/manipolazione delle richieste possano superare i limiti UI. **Gate bloccante:** fornire e testare RLS, grants, funzioni e policy per tenant, membership, ruoli, uffici e capability.

### Partner, prodotti e collaboratori

Il client legge entità partner (`ecosystem_nodes`, contatti, timeline, documenti e requisiti), prodotti (`agency_products`, conoscenza e confronti) e collaboratori (termini, snapshot e valutazioni) filtrando `organization_id` (`app.js:441-467`). La UI distingue stato dei requisiti, termini economici verificati e confronti con fonte, e dichiara di non inventare punteggi/dati non documentati (`app.js:1768-1771`).

`product-evidence.js` registra tre URL ufficiali HDI — Auto, Globale Casa, Globale PMI — con data fonte `2026-09-30` (righe 1-15). Questo dimostra provenance codificata per quelle schede, non accuratezza o aggiornamento di tutti i record Supabase, condizioni commerciali, prezzi o prodotti in produzione. Non sono stati letti record reali. Prima dell’uso operativo verificare per ogni dato materiale fonte, data, ambito di validità, stato di verifica e responsabile.

### C.E.P.A.

C.E.P.A. è una superficie operativa dell’app: materie, iniziative, contenuti, Academy, relatori, readiness e attività territoriali sono caricate da tabelle Supabase distinte (`app.js:455-459, 473-474, 491`; `index.html:231-305`). Il client separa attività per sede e carica assegnazioni ufficio. Non emerge dal materiale una specifica integrazione con un sistema C.E.P.A. esterno: contratto, qualità, provenance e confini di accesso restano dipendenti dal backend non disponibile. Non considerare le voci UI prova di dati o iniziative live.

### Lia e automazioni

- La Workbench invia comandi e allegati alla funzione Supabase `lia-workbench`; la stessa funzione riceve anche richieste di esecuzione automazioni Radar (`app.js:388-409, 1774-1787, 1948-1960`). Nel branch esaminato non c’è il codice della funzione, perciò autenticazione, verifica membership/scope, policy delle azioni, approvazioni effettive, prompt injection, audit log, idempotenza e chiamate a servizi esterni non sono verificabili.
- Il client carica capability, catalogo azioni, approvazioni e automazioni per organizzazione/ruolo (`app.js:475-485`). La protezione delle decisioni è almeno in parte presentazionale: il controllo manager in `decideLiaApproval()` è client-side (`app.js:1789-1795`). L’autorizzazione definitiva e il gate di approvazione devono essere applicati lato server.
- La chat combina Workbench per comandi riconosciuti e risposte locali deterministiche basate sui dati già caricati; non va presentata come prova di un motore LLM generale attivo (`app.js:1948-2008`). Le conversazioni sono scritte in `ai_assistant_messages` con `organization_id`, `user_id` e contesto (`app.js:1942-1946`): verificare accesso, retention, cancellazione e minimizzazione.

### Documenti e allegati

Il Document Studio espone archivio e blueprint, ma il client carica `ecosystem_documents` come metadati; l’upload file osservabile è nella bucket `lia-workspace` per gli allegati di Lia (`app.js:452-454, 359-386`; `index.html:790-806`). Per i file Lia il client limita a 12 selezioni e 25 MB per file e crea URL firmati validi 120 secondi. `accept` HTML e `file.type` non equivalgono a validazione MIME/contenuto affidabile. Bucket policy/RLS, scansione, retention, cifratura, download cross-tenant e autorizzazioni ai signed URL non sono ispezionabili. Il cleanup in caso di errore è tentato, ma non dimostra cancellazione completa.

Prima di usare documenti reali verificare policy Storage per tenant/utente, controlli server-side su tipo e dimensione, autorizzazione del destinatario, retention/cancellazione e log di accesso. Non caricare documenti personali o riservati per validare il preview.

### Radar Rete

La UI descrive RUI IVASS Sezioni B/E, Registro Imprese/CCIAA e fonti pubbliche, con verifica prima del contatto (`index.html:860-880`). Il client legge watchlist, candidati, evidenze, fonti e insight e può invocare una run automatizzata tramite Lia (`app.js:468-470, 480-485, 1774-1787`). Non è presente una fonte di ingestione client-side che provi accesso live ai registri, né la funzione/worker che dovrebbe alimentare queste tabelle. Etichette e schede fonte non provano ingestione, licenza, accuratezza, freschezza o completamento delle ricerche. Verificare con record campione non personali, URL/data/osservazione/provenance e review umana; nessun contatto automatico va considerato autorizzato sulla sola base della UI.

### Attività, scadenze e Recovery

Le attività sono associate a partner/progetti/territori e hanno stato, priorità, scadenza, esito e prossima azione; il client salva modifiche con filtro organizzazione (`app.js:447, 2129-2133`). Recovery interroga le pratiche aperte `pipeline='recovery'` e legge campi dei clienti inclusi email, telefono, città e data di uscita (`app.js:2135-2145`). La query è filtrata per organizzazione, non per assegnatario; quindi la visibilità effettiva dei dati personali dipende da RLS e dai permessi di vista, non dal filtro visuale dei pulsanti.

Assegnazione e registrazione esito passano da `assign_recovery_case` e `record_recovery_outcome` (`app.js:2147-2149`). Non si possono verificare sul solo client autorizzazioni per assegnatario/ruolo, idempotenza, audit o limitazione dati. Verificare inoltre base, interpretabilità e correttezza di `score` prima di usarlo per priorità o contatti; il client ordina per score e mostra la soglia 90, ma non implementa il calcolo.

## UX, accessibilità e sicurezza

- **Responsive:** sono presenti sidebar mobile, chiusura con Escape, focus mode e breakpoint multipli in CSS; il codice non costituisce una prova visual QA su dispositivi reali o confrontata con un visual master. Eseguire smoke manuale desktop e mobile sulle viste principali, inclusi tabelle, modal, file picker e stati errore/loading.
- **Accessibilità:** login con label, vari controlli con `aria-label`, dock Lia con ruolo dialog; non risultano selettori CSS `:focus`/`:focus-visible` né `prefers-reduced-motion` negli stylesheet esaminati. Il modal generico non dichiara `role="dialog"`/`aria-modal`. Non sono stati eseguiti test tastiera, screen reader, contrasto o WCAG; questi sono gap da colmare prima del rilascio, non una certificazione di non conformità completa.
- **Dati non caricati / errori:** `loadAll()` interrompe il rendering se una delle query fallisce; verificare che gli utenti distinguano dati assenti, dati vuoti e errore di autorizzazione. Il fallback Dashboard (`dashboard-component.js`) usa valori zero/strutture vuote, quindi non confondere una schermata iniziale o non connessa con dati live.
- **Boundary browser:** il codice client deve essere considerato ispezionabile e manipolabile. Nessuna segretezza o regola di ruolo può basarsi su elementi nascosti, `window.orgId`, campi del payload, mime fornito dal browser o chiave publishable.

## Test e readiness di rilascio

**Evidenza test:** il controllo `node --check --input-type=module` sull’`app.js` del branch sorgente è passato. L’inventario non mostra test, schema Supabase o test di integrazione specifici per `cepa-maglia-os-static/`; gli script root presenti coprono app SCD, smoke/contract/Pages, non provano le regole runtime Maglia. Testare almeno:

1. accesso anonimo, signup, conferma, logout e utente senza membership;
2. utente con più membership, ruolo e assegnazione ufficio, accesso diretto a viste e richieste API;
3. isolamento tra due organizzazioni per ogni tabella, RPC, bucket e signed URL (test negativi inclusi);
4. policy Lia per ruoli/capability, approvazione lato server, retry e failure/partial state;
5. permessi e minimizzazione PII Recovery, audit di assegnazione/esiti e `do_not_contact`;
6. provenienza/freschezza Radar e controlli manuali prima del contatto;
7. upload di file limite/inattesi, accesso cross-tenant e pulizia; tastiera, screen reader e layout responsive.

**Gate NO-GO** finché non sono disponibili prove versionate/verificabili di schema, RLS/grants, Edge Function, policy Storage, test autorizzativi cross-tenant, test UX/accessibilità e contratto release/rollback del servizio. Il manifest nomina il preview, ma al momento dell’audit non è raggiungibile dall’ambiente di verifica: registrarne separatamente URL, commit servito e health check quando il DNS/runtime è verificabile, senza dedurre assenza dal fallimento DNS.

## Piano di readiness, senza deploy

1. Recuperare nel ref di progetto le migrazioni/policy backend e il codice/versione della Edge Function; verificare ruoli e tenancy con test negativi.
2. Formalizzare fonti/provenance e validazione dei prodotti, C.E.P.A. e Radar; approvare policy di accesso e retention per documenti, conversazioni e Recovery.
3. Aggiungere test Maglia specifici e smoke/accessibilità responsive; definire gestione errori e fallback distinguendo chiaramente dati live da assenti.
4. Verificare il contratto Render del servizio nominato, commit deployato, health check e rollback; mantenere l’ambiente isolato e non usare dati reali durante i test.
5. Soltanto dopo evidenze e autorizzazione esplicita, valutare un rilascio. Questo audit non effettua né richiede deploy o mutazioni production.

**Conclusione:** l’app Maglia 360 e le sue superfici sono presenti nel ref corretto; il codice browser mostra filtri organizzativi e flussi UI ma non prova enforcement backend o readiness operativa. Stato complessivo: `DESIGNED / IMPLEMENTED IN REPOSITORY`, non `TESTED / DEPLOYED / PRODUCTION_VERIFIED`.
