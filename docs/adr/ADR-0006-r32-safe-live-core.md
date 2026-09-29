# ADR-0006 — R32 Safe Live Core con Data Fabric gated

- **Stato:** ACCEPTED
- **Data:** 2026-09-29
- **Release:** R32

## Contesto

La produzione reale è stata verificata su tre livelli:
- GitHub Pages espone il build applicativo corretto;
- Render espone il bridge SCD aggiornato;
- il Web App Apps Script R20 canonico risponde ancora come `2026.09.28-R20.0-PUBLIC-FIRST`.

Il runtime R20 non supporta ancora `public.datafabric.contract`, `direction.datafabric.status` e `direction.diagnostics`.

## Problema

La capability Data Fabric observability dipende da R20. Mantenere il feature flag attivo mentre il contratto R20 è assente produce una superficie apparentemente disponibile ma non realmente funzionante.

Bloccare tutto il core SCD PULSE per una capability opzionale non pronta confonde invece lo stato della piattaforma con quello di una singola integrazione.

## Decisione

R32 separa esplicitamente:

`CORE LIVE`

da:

`DATA FABRIC OBSERVABILITY LIVE`.

Il feature flag `FF-DATAFABRIC-OBSERVABILITY` passa a default **false** e viene attivato solo dopo verifica R20.

Quando il flag è false:
- la superficie Data Fabric Direzione non viene mostrata;
- il core pubblico continua a funzionare;
- Production Evidence verifica Pages, Render e dichiarazione del flag;
- il controllo R20 Data Fabric viene marcato `GATED_OFF_NOT_LIVE`, non simulato come successo.

Quando il flag è true:
- `public.datafabric.contract` torna obbligatorio;
- Production Evidence fallisce se R20 non soddisfa il contratto.

## Condizioni per attivare il flag

Devono essere tutte vere:
1. `public.datafabric.contract` supportato da R20;
2. `direction.datafabric.status` supportato da R20;
3. `npm run verify:r20` verde;
4. Production Evidence verde con flag true;
5. smoke autorizzato Direzione verde.

## Conseguenze

- il core può essere messo online senza dichiarazioni false;
- Data Fabric resta chiaramente non-live;
- il blocker R20 rimane visibile nel Manifest;
- l'attivazione futura è una modifica di configurazione reversibile.

## Rollback

Impostare:
`SCD_FEATURE_DATA_FABRIC_OBSERVABILITY=false`.

Nessun dato viene eliminato o migrato.
