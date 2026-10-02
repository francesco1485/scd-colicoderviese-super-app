# R20 Runtime Deploy — R40.2

## Obiettivo

Portare il Web App Apps Script R20 al contratto corrente R40.2, preservando l'URL canonico già usato da Manifest e Render e abilitando CRM relazionale e Communication Engine senza creare un secondo gestionale.

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
6. Verificare che siano presenti `private.crm.summary`, `private.crm.detail`, `private.communication.templates`, `private.communication.preview` e `private.communication.send`.
7. Verificare che siano presenti `r25DataFabricStatus_`, `r25ScanGmail_`, `r25ScanDrive_` e `r29DataFabricContract_`.
8. Eseguire **Deploy → Manage deployments → Edit** sul deployment Web App canonico.
9. Creare una nuova versione del deployment senza cambiare l'URL canonico.
10. Mantenere esecuzione e accesso coerenti con il deployment R20 attuale. Non ampliare i permessi durante questo intervento.
11. Verificare con:
   ```
   npm run verify:r20
   ```
12. Accedere con un account autorizzato e verificare in Sponsor Platform: CRM, apertura profilo, caricamento template email e sola **anteprima** di una comunicazione istituzionale.
13. Verificare che un profilo con `CONTACT_POLICY=SOSPESO_NON_INVIARE` non mostri/consenta l'invio.
14. Verificare che la firma risolta corrisponda all'account/ruolo autenticato e che il mittente indicato sia `sportclubcolico@gmail.com`.
15. Solo dopo esito verde, rilanciare `SCD Production Evidence`.

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


### Acceptance CRM e comunicazioni

- `private.crm.summary` e `private.crm.detail` rispondono solo con sessione valida;
- `private.communication.templates` restituisce esclusivamente template ammessi al ruolo;
- l'anteprima usa dati da `SOCIETA_PROFILE`, `FIRME_RUOLI` ed `EMAIL_TEMPLATE`;
- nessuna email parte senza `confirm=true`;
- il runtime verifica che l'utente effettivo sia `sportclubcolico@gmail.com` prima dell'invio;
- i contatti con policy `SOSPESO_NON_INVIARE` o `NO_CONTACT` sono bloccati;
- ogni invio viene registrato in `MAIL_ARCHIVIO` e, se collegato a stakeholder, in `TOUCHPOINTS_MASTER`;
- la ragione sociale e i dati fiscali sono letti da `SOCIETA_PROFILE`, non hardcoded nel frontend.
