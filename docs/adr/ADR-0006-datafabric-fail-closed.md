# ADR-0006 — Data Fabric observability fail-closed

- **Stato:** ACCEPTED
- **Data:** 2026-09-29
- **Release:** R32

## Problema

R28 aveva introdotto `FF-DATAFABRIC-OBSERVABILITY` con default attivo. La verifica reale R29/R31 ha però dimostrato che il runtime Apps Script R20 è ancora `2026.09.28-R20.0-PUBLIC-FIRST` e non espone il contratto `public.datafabric.contract`.

Lasciare il flag attivo in assenza del backend verificato produce una superficie Direzione apparentemente disponibile ma non realmente supportata.

## Decisione

Il flag Data Fabric diventa **fail-closed**:

- default runtime: OFF;
- viene attivato soltanto con `SCD_FEATURE_DATA_FABRIC_OBSERVABILITY=true`;
- l'attivazione richiede prima prova diretta R20 e condizioni di Production Evidence;
- il rollback consiste nel riportare il flag a false e ridistribuire Render.

## Sequenza di attivazione

1. `npm run verify:r20`;
2. verificare il contratto R20 richiesto;
3. verificare Pages/Render;
4. impostare `SCD_FEATURE_DATA_FABRIC_OBSERVABILITY=true`;
5. ridistribuire Render;
6. verificare `/api/capabilities`;
7. rilanciare Production Evidence.

## Conseguenze

- nessuna UI operativa Data Fabric viene mostrata prima del backend reale;
- una variabile ambiente mancante non abilita funzioni sensibili per accidente;
- il sistema degrada in modo esplicito invece di simulare integrazione;
- l'attivazione diventa un atto verificabile, non una supposizione.

## Rollback

Impostare `SCD_FEATURE_DATA_FABRIC_OBSERVABILITY=false` e ridistribuire Render.
