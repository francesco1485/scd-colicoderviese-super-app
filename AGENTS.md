# AGENTS.md — SCD ColicoDerviese

## Regola 0
Prima di modificare codice, dati, UI, workflow, API, ruoli, fonti o infrastruttura leggere:

`SCD_SYSTEM_MANIFEST.json`

È l'unica fonte normativa machine-readable del progetto.

Prima di qualunque lavoro sostanziale leggere anche:
- `config/user-directives.v1.json` — registro dei comandi espliciti dell'utente recuperati dalle chat;
- per UI, grafica, media e product design: `config/scd-visual-references.v1.json` — registro delle tavole, immagini, documenti e riferimenti recuperati dalla Libreria interna.

I comandi espliciti dell'utente sono requisiti di origine. Non possono essere sostituiti, abbreviati fino a perderne il significato o ignorati in favore di un riassunto dell'assistente. Se un comando nuovo modifica un contratto o l'architettura, il contratto/manifest va aggiornato nel normale change process invece di scartare il comando.

## SCD:STATE — HARD GATE
Prima di qualsiasi operazione di scrittura sul progetto deve essere completata una fotografia verificata dello stato reale.

Operazioni coperte dal gate:
- modifica file;
- commit;
- push;
- creazione branch;
- merge;
- deploy;
- scrittura o modifica dati;
- modifica configurazione.

Output minimo obbligatorio:
- `REPOSITORY`;
- `CURRENT_MAIN_SHA`;
- `CURRENT_WORKING_BRANCH`;
- `WORKING_TREE`;
- `OPEN_PR`;
- `PR_STATUS`;
- `CI_STATUS`;
- `PAGES_STATUS`;
- `RENDER_STATUS`;
- `MANIFEST_VERSION_OR_HASH`;
- `RELEASE_DEPENDENCIES`;
- `DATA_SOURCES_VERIFIED`;
- `KNOWN_BLOCKERS`;
- `SAFE_NEXT_ACTION`.

Ogni voce deve essere classificata come `VERIFIED`, `UNVERIFIED`, `NOT_AVAILABLE` o `NOT_APPLICABLE`.

Regola vincolante: **NO STATE → NO WRITE**.

`UNVERIFIED` non equivale a falso, assente o non esistente. Se lo stato necessario non può essere verificato, sono consentite solo lettura, ispezione, diagnostica e proposta del passo successivo.



## SCD:MEMORY-RECOVER — USER COMMAND + LIBRARY GATE
Prima di `SCD:EXPERT` per ogni lavoro sostanziale, continuativo o visuale:

1. recuperare i comandi utente rilevanti da `config/user-directives.v1.json`;
2. recuperare il master/contratto specifico dell'app e l'ultimo handoff;
3. per UI/media, leggere `config/scd-visual-references.v1.json` e cercare le tavole/immagini/documenti interni pertinenti;
4. verificare l'implementazione reale corrente prima di progettare una sostituzione;
5. distinguere sempre:
   - `USER_COMMAND`;
   - `CANONICAL_RUNTIME_CONTRACT`;
   - `LIBRARY_REFERENCE`;
   - `EXTERNAL_VERIFIED_SOURCE`;
   - `INFERENCE_OR_PROPOSAL`.

Output minimo:
- `USER_COMMANDS_RECOVERED`
- `LIBRARY_REFERENCES_RECOVERED`
- `CANONICAL_CONTRACTS`
- `DRIFT_OR_CONFLICTS`
- `INCORPORATION_PLAN`

Regole:
- non affidarsi solo a riepiloghi dell'assistente quando esistono comandi originali recuperabili;
- non dichiarare una tavola `APPROVED` senza una prova di approvazione esplicita: in assenza di prova resta `REFERENCE_BOARD`;
- una tavola recuperata non autorizza a copiare dati di esempio nel runtime;
- se una UI attuale ignora una tavola ad alta rilevanza, confrontarla e motivare `KEEP / ENHANCE / REBUILD_IMPROVE / REMOVE_WITH_REASON`;
- un task di implementazione non è concluso con sola documentazione quando il codice può essere modificato in sicurezza.

## SCD:EXPERT — ROUTER OPERATIVO OBBLIGATORIO
Prima di costruire, modificare o ricercare una soluzione complessa, classificare il lavoro con `SCD:EXPERT`.

Output minimo:
- `TASK_CLASS`
- `DOMAINS`
- `FIXED`
- `IMPROVABLE`
- `MISSING`
- `SOURCE_PLAN`
- `TOOLCHAIN`
- `RISK`
- `TEST`
- `ROLLBACK`
- `NEXT_ACTION`

Regola: usare competenze multidisciplinari reali, non fingere onniscienza. Nei domini ad alta criticita o attualita usare fonti correnti e distinguere FATTO, ANALISI, IPOTESI e PROPOSTA.

## SCD:ARCHITECT — SENIOR PRINCIPAL VISION-TO-CODE

Dopo `SCD:EXPERT`, per ogni lavoro software, UI, reverse engineering o Vision-to-Code applicare `SCD:ARCHITECT`.

Il protocollo ha quattro fasi obbligatorie:

1. **VISION ANALYSIS**
   - scomporre layout, griglie, proporzioni, padding/margin, breakpoint;
   - rilevare palette, tipografia, icone, ombre, bordi e gerarchie;
   - mappare componenti, form, pulsanti, input, hover/focus/disabled/loading/error/success;
   - progettare autonomamente le varianti responsive mancanti senza trasformare desktop in un telefono gigante o mobile in una pagina amputata.

2. **ENGINE DATA**
   - modellare formule, algoritmi, validazioni e fallback;
   - definire JSON/schema/database, API, eventi, permessi e provenance;
   - separare dato reale, calcolato, derivato, locale, riservato e non disponibile;
   - nessun dato sportivo, commerciale o amministrativo viene inventato per riempire la UI.

3. **ZERO-BUG BUILD**
   - codice completo, modulare, semantico, accessibile WCAG/ARIA e performante;
   - preservare lo stack esistente quando una riscrittura aumenterebbe rischio o duplicazione;
   - dichiarare l'albero file quando cambia l'architettura;
   - niente placeholder di codice, file troncati o "TODO" usati come sostituti dell'implementazione richiesta;
   - aggiungere test per la logica e visual QA per l'interfaccia.

4. **AUTONOMOUS CONTINUOUS LOOP**
   - costruire il blocco iniziale;
   - autovalutarlo;
   - correggere immediatamente bug e incoerenze UX;
   - proporre e implementare miglioramenti architetturali sicuri quando giustificati;
   - continuare al blocco successivo senza chiedere permesso per ogni step reversibile;
   - fermarsi solo quando il blocco è completato, esiste un ostacolo reale o serve una decisione umana critica.

Regola di continuità:
- non fermarsi dopo un singolo file se il task richiede frontend, dati, backend, test o deploy;
- lavorare fino a un confine verificabile;
- fuori dalla sessione, la continuità è consentita solo tramite automazione schedulata esplicita;
- nessun agente deve fingere di lavorare in background se non esiste un task schedulato attivo;
- se un output testuale raggiunge un limite, interrompere solo alla fine di un file completo e usare esattamente:
  `[STATO: IN CORSO - Scrivi 'PROCEDI' per iniettare il blocco successivo]`.

`SCD:ARCHITECT` non sostituisce `SCD:STATE`, `SCD:EXPERT` o `SCD:ASSET`; li completa. Restano vietati cambiamenti autonomi critici su ruoli, permessi, pagamenti, tesseramenti, dati personali, documenti sensibili e safeguarding.

## SCD:ASSET — KEEP / ENHANCE / REBUILD / RESEARCH / GENERATE
Prima di qualunque modifica visuale o media classificare ogni elemento:
- `KEEP_LOCKED`: logo, stemma, kit, wordmark, asset ufficiale, dato certificato. Non alterare identita, proporzioni, colori o scritte.
- `KEEP_ENHANCE`: mantenere contenuto reale migliorando solo resa tecnica, scontorno, alpha, trim, peso, accessibilita e responsive.
- `REBUILD_IMPROVE`: ricostruire UX/layout/logica preservando dati, provenance e funzioni valide.
- `RESEARCH_REAL_ASSET`: cercare il file reale da fonte ufficiale o verificata. Mai inventare uno stemma, uno sponsor o un kit esistente.
- `GENERATE_ORIGINAL`: creare solo elementi originali non sostitutivi di asset ufficiali o fatti reali.

Registro canonico asset runtime: `config/scd-assets.v1.json`.
Registro riferimenti visuali/documentali recuperati: `config/scd-visual-references.v1.json`.

## Obblighi
1. Identificare le capability `CAP-*` coinvolte.
2. Verificare fonte dati, ruolo/scope, schermata e visual master.
3. Non introdurre una nuova fonte senza registrarla in `source_registry.sources`.
4. Non introdurre un nuovo ruolo senza aggiornare `identity_and_access.roles`.
5. Non introdurre una nuova core experience fuori dalle sei definite senza approvazione Direzione e incremento versione manifest.
6. Non creare un secondo gestionale parallelo a R20.
7. Non inventare dati sportivi.
8. Non far transitare safeguarding nei flussi ordinari.
9. Se il cambiamento modifica il contratto, aggiornare il manifest nello stesso PR.
10. Eseguire `npm run test:manifest` prima di considerare il lavoro completato.

## Grafica
Le tavole SCD approvate sono la Source of Truth visiva. Desktop e mobile sono lo stesso prodotto responsive. Vietato trasformare il desktop in una semplice cornice smartphone oppure in un sito SaaS generico.

## Stato reale
Le voci `known_noncompliance` del manifest sono debito esplicito da ridurre. Non dichiarare una capability completata finché il relativo gap non è risolto e verificato.

## Produzione
Nessun agente o automazione può auto-modificare in produzione ruoli, permessi, pagamenti, tesseramenti, presenze, documenti sensibili o safeguarding.

## SCD:FREE-FIRST — COSTO ZERO PRIMA DI ACQUISTI (UD-017)

Prima di suggerire, installare, sostituire o collegare agenti, servizi AI, skill, plugin, piani, editor grafici, CRM o hosting:
1. leggere `SCD_SYSTEM_MANIFEST.json.development_contract.scd_free_first` e `config/scd-free-first.v1.json`;
2. eseguire inventario delle capacità già operative/incluse e delle skill disponibili; scegliere prima riuso e strumenti realmente gratuiti se adeguati;
3. verificare prezzi, crediti, limiti, prove gratuite, rinnovi e agevolazioni **su fonti ufficiali attuali** prima di qualunque raccomandazione a pagamento;
4. segnare saldi e condizioni non leggibili come `UNKNOWN_UNTIL_CHECKED`, mai dedurli dal nome del piano o da offerte social;
5. confrontare beneficio, rischio e costo e respingere duplicati funzionali;
6. fermarsi **prima di ogni azione esterna con effetto**, installazione, connessione, avvio trial, modifica abbonamento, pagamento o invio domanda: `HUMAN_APPROVAL`.

Comandi interni: `/credits`, `/freefirst`, `/nonprofit`, `/trialgate`, `/toolscore`, `/skillreuse`, `/creditbudget`, `/sourcecheck`. Audit locale reversibile: `npm run scd:freefirst -- /freefirst`. Il comando CLI NON effettua verifiche live delle fatture del provider e non abilita in alcun modo spese. È una disciplina del sistema interno SCD, **non un comando da esporre alla Sky pubblica o ai dati dei minori**.
