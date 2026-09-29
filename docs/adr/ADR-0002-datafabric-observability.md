# ADR-0002 — Data Fabric Observability, Provenance and Feature Flag

- **Stato:** ACCEPTED
- **Data:** 2026-09-29
- **Release:** R28
- **Ambito:** SCD Pulse OS, Direzione, R25 Data Fabric

## Problema

R25 ha introdotto le azioni Data Fabric per Gmail e Drive e R26 ha reso visibile in Pulse uno stato sintetico. Lo stato sintetico non è sufficiente a distinguere salute della rete, salute delle sorgenti, ultimo successo, ultimo errore e provenienza dei dati. Inoltre una nuova superficie operativa non deve essere resa obbligatoria senza possibilità di disattivazione rapida.

## Decisione

R28 introduce una vertical slice Direzione:

SORGENTE REALE → R25 API → STATO/OSSERVABILITÀ → UI DIREZIONE → TEST → SCREENSHOT

La slice usa:
- feature flag `FF-DATAFABRIC-OBSERVABILITY`;
- variabile runtime `SCD_FEATURE_DATA_FABRIC_OBSERVABILITY`;
- endpoint esistente `direction.datafabric.status`;
- azioni esistenti `direction.datafabric.scan.gmail` e `direction.datafabric.scan.drive`;
- persistenza di metadati tecnici `lastSync`, `lastSuccess`, `lastError`;
- provenance obbligatoria `SOURCE / TABLE / FIELD / API / FALLBACK / REFRESH`.

## Sicurezza

La superficie dettagliata è disponibile esclusivamente a Direzione e usa la sessione R20 esistente. Nessun ruolo viene assegnato dal browser. Safeguarding resta escluso dal Data Fabric ordinario.

## Feature flag

Se `SCD_FEATURE_DATA_FABRIC_OBSERVABILITY=false`:
- la superficie Direzione Data Fabric viene nascosta;
- il health status generico resta disponibile;
- nessun codice viene eliminato;
- non vengono alterate le sorgenti.

## Performance budget

La UI pubblica non esegue chiamate Data Fabric private. Lo status dettagliato viene richiesto solo quando un utente Direzione apre la superficie dedicata, con cache client breve di 30 secondi.

## Conseguenze

- lo stato `ONLINE` della rete non viene confuso con lo stato delle sorgenti;
- errori e successi delle scansioni diventano osservabili;
- la provenienza è esplicita;
- il rollout può essere disattivato senza rimuovere codice;
- il runtime Apps Script R20 deve essere aggiornato con la versione R28 del patch file per ottenere i nuovi campi di osservabilità. In assenza di tale aggiornamento la UI deve degradare senza inventare dati.

## Rollback

1. impostare `SCD_FEATURE_DATA_FABRIC_OBSERVABILITY=false`;
2. se necessario, revert della PR R28;
3. il backend R25 continua a funzionare con le azioni già esistenti;
4. nessun record Gmail, Drive, R20 o Sheets viene eliminato dal rollback.
