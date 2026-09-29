# R20 Runtime Deploy — R31

## Obiettivo

Portare il Web App Apps Script R20 dal runtime verificato **2026.09.28-R20.0-PUBLIC-FIRST** al contratto richiesto da R29/R30, preservando l'URL canonico già usato da Manifest e Render.

## Stato verificato al 29/09/2026

- GitHub Pages: R30 / 30.0.0 online.
- Render canonico: R30 / 30.0.0 online.
- Apps Script R20: raggiungibile e `public.feed` operativo.
- Apps Script R20: `public.datafabric.contract` restituisce `Azione API non supportata.`.

Quindi il blocco è **nel codice/deployment Apps Script**, non in Pages.

## File sorgente da allineare

Usare come fonte repository:
- `backend_patch_R21_6_http_api.gs`
- `backend_patch_R25_data_fabric.gs`

Non creare un secondo gestionale e non creare un nuovo Web App se è possibile aggiornare il deployment canonico esistente.

## Procedura

1. Aprire il progetto Apps Script che serve l'URL indicato in `architecture.current.r20_apps_script` del Manifest.
2. Salvare una copia/versione del codice corrente.
3. Allineare il bridge HTTP con `backend_patch_R21_6_http_api.gs`.
4. Allineare il modulo Data Fabric con `backend_patch_R25_data_fabric.gs`.
5. Verificare che `public.datafabric.contract` sia presente nel routing `doPost`.
6. Verificare che siano presenti `r25DataFabricStatus_`, `r25ScanGmail_`, `r25ScanDrive_` e `r29DataFabricContract_`.
7. Eseguire **Deploy → Manage deployments → Edit** sul deployment Web App canonico.
8. Creare una nuova versione del deployment senza cambiare l'URL canonico.
9. Mantenere esecuzione e accesso coerenti con il deployment R20 attuale. Non ampliare i permessi durante questo intervento.
10. Verificare con:
   ```
   npm run verify:r20
   ```
11. Solo dopo esito verde, rilanciare `SCD Production Evidence`.

## Acceptance criteria

Il probe `public.datafabric.contract` deve restituire:
- `ok: true`;
- `data.release: R29`;
- `data.contractVersion: 1.0.0`;
- campi observability;
- campi provenance;
- `destructiveAutoWrite: false`;
- `safeguarding: ISOLATED`.

## Rollback

Dal pannello Apps Script ripristinare la precedente versione del deployment canonico. L'URL Web App deve restare invariato.
