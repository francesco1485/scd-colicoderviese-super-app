# RITIRO SICURO DEL VISUAL LAB RENDER — 08/10/2026

**STATO: DA ESEGUIRE.** Il comando Render collegato a ChatGPT non espone Delete Service. Non scrivere mai "cancellato" senza verifica 404/servizio assente.

## Servizio visivo identificato con certezza

- Nome: `scd-ecosistema-visual-lab-anteprima`
- Service ID: `srv-db3qohgm7kps73fngd4g`
- Workspace: `Colico's workspace`, `tea-db3qm3s9v7es73e3mk0g`
- Account: `sportclubcolico@gmail.com`
- Tipo: `static_site`, branch `feat/gestionale-visual-foundation-wave-1`, autodeploy OFF.
- Link bocciato: https://scd-ecosistema-visual-lab-anteprima.onrender.com/
- Dashboard esatta: https://dashboard.render.com/static/srv-db3qohgm7kps73fngd4g
- Codice sorgente da preservare solo come storico: GitHub PR #142 e codice su GitHub. **Non eliminare file di contenuto o database.**

## Ritiro tramite dashboard, senza comandi tecnici

Aprire la Dashboard indicata, verificare il nome/ID, aprire Settings e selezionare l'azione Delete Service, confermando solo il nome esatto. **Non scegliere Delete Project, non eliminare ambienti, database, API o altri servizi.**

## Ritiro tramite Render CLI ufficiale (opzionale)

```bash
render login
render workspace set tea-db3qm3s9v7es73e3mk0g
render services delete srv-db3qohgm7kps73fngd4g
# Dopo aver verificato nome esatto, workspace e che sia la sola anteprima grafica:
render services delete srv-db3qohgm7kps73fngd4g --confirm
```

Il terzo comando è un controllo senza modifiche; il quarto è irreversibile. La CLI richiede autenticazione del gestore autorizzato. Usare solo l'account Render della società.

Documentazione ufficiale:
- https://render.com/docs/cli-reference
- https://api-docs.render.com/reference/delete-service

## Altri servizi: NON INCLUDERE NELLA CANCELLAZIONE AUTOMATICA

Render personale contiene 24 servizi SCD, CEPA, Maglia, API, prodotti e vecchie anteprime. Alcuni nomi contengono "preview", "synthetic", "nextgen", "nova", ma nome e aspetto non provano che siano esclusivamente grafici. Richiedono un inventario endpoint/consumatori/dipendenze per stabilire se siano eliminabili.

**Criterio:** eliminare esclusivamente il service frontend di una demo grafica senza API, database, ruoli, consumatori o flussi reali verificati. Non eliminare l'archivio GitHub, Drive, Gmail o il registro degli asset ufficiali.

## Stato finale richiesto

`DELETED` solo dopo verifica che la dashboard non contenga più il service ID e che l'URL non restituisca più l'anteprima. Altrimenti `PENDING_MANUAL_DELETION`.
