# ADR-0005 — Safe Live Feature Gate per Data Fabric

- **Stato:** ACCEPTED
- **Data:** 2026-09-29
- **Release:** R31
- **Ambito:** rollout produzione, R20, Data Fabric observability

## Problema

Il core SCD PULSE è verificato su GitHub Pages e Render, ma il runtime Apps Script R20 in produzione espone ancora la release `2026.09.28-R20.0-PUBLIC-FIRST` e restituisce `Azione API non supportata.` per:
- `public.datafabric.contract`;
- `direction.datafabric.status`;
- `direction.diagnostics`.

Bloccare l'intero prodotto per una capability non ancora attivabile confonderebbe lo stato del core con quello di una funzione opzionale. Dichiarare invece Data Fabric LIVE sarebbe falso.

## Decisione

R31 rende `FF-DATAFABRIC-OBSERVABILITY` **disattivato per default**.

Il core può essere dichiarato LIVE quando:
- Pages espone la versione attesa;
- Render health espone la versione attesa;
- Render capabilities espone il feature flag in modo esplicito;
- la UI nasconde la superficie Data Fabric quando il flag è false.

Il contratto R20 Data Fabric diventa obbligatorio nel Production Evidence **solo quando il feature flag è true**.

## Regola di verità

`CORE LIVE` non equivale a `DATA FABRIC LIVE`.

Quando il flag è false:
- stato core: verificabile LIVE;
- stato Data Fabric: `GATED_OFF_NOT_LIVE`;
- nessuna chiamata privata Data Fabric viene presentata come disponibile;
- la limitazione resta nel Manifest e nella release evidence.

## Condizioni di attivazione Data Fabric

Prima di impostare il flag a true devono essere verificate tutte le condizioni:
1. R20 supporta `public.datafabric.contract`;
2. R20 supporta `direction.datafabric.status`;
3. Production Evidence è verde con flag true;
4. smoke autorizzato Direzione è verde.

## Sicurezza

Il gate non riduce controlli server-side e non sostituisce R20. Safeguarding resta isolato. Nessun dato Gmail o Drive viene reso pubblico.

## Rollback

Impostare o mantenere:
`SCD_FEATURE_DATA_FABRIC_OBSERVABILITY=false`.

Il rollback nasconde soltanto la capability non pronta e non modifica dati, sessioni, account o contenuti del Club.
