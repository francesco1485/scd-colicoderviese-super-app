# AGENTS.md — SCD ColicoDerviese

## Regola 0
Prima di modificare codice, dati, UI, workflow, API, ruoli, fonti o infrastruttura leggere:

`SCD_SYSTEM_MANIFEST.json`

È l'unica fonte normativa machine-readable del progetto.

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
