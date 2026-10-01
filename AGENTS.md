# AGENTS.md — SCD ColicoDerviese

## Regola 0
Prima di modificare codice, dati, UI, workflow, API, ruoli, fonti o infrastruttura leggere:

`SCD_SYSTEM_MANIFEST.json`

È l'unica fonte normativa machine-readable del progetto.

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

## SCD:ASSET — KEEP / ENHANCE / REBUILD / RESEARCH / GENERATE
Prima di qualunque modifica visuale o media classificare ogni elemento:
- `KEEP_LOCKED`: logo, stemma, kit, wordmark, asset ufficiale, dato certificato. Non alterare identita, proporzioni, colori o scritte.
- `KEEP_ENHANCE`: mantenere contenuto reale migliorando solo resa tecnica, scontorno, alpha, trim, peso, accessibilita e responsive.
- `REBUILD_IMPROVE`: ricostruire UX/layout/logica preservando dati, provenance e funzioni valide.
- `RESEARCH_REAL_ASSET`: cercare il file reale da fonte ufficiale o verificata. Mai inventare uno stemma, uno sponsor o un kit esistente.
- `GENERATE_ORIGINAL`: creare solo elementi originali non sostitutivi di asset ufficiali o fatti reali.

Registro canonico asset: `config/scd-assets.v1.json`.

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
