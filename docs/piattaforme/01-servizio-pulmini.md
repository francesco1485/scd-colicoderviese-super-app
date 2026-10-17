# 01 · Servizio pulmini

Responsabile: scd-pulmini · Stato: Attiva · Pagina: `/pulmini` (anche `/gestionale/pulmini`, che rimanda lì) · verificato 17/10/2026 (mappa `apps/superapp/src/lib/piattaforme.ts`)

Motore: TEMPO. Misura: trasferte del weekend con pulmino deciso 48 ore prima; posti confermati con presa visione della famiglia 24 ore prima della partenza.

## Stato reale

- VERIFIED (Direzione 15–17/10/2026): 3 Fiat Ducato 9 posti della S.C.D. ColicoDerviese + 1 dell'ASD Volley Colico usato all'occorrenza; tutti gli autisti sono volontari; Responsabile servizio pulmini (anche autista) + 3 dirigenti autisti. 9 squadre attive, U18 ritirata.
- VERIFIED (codice): richieste delle famiglie (r84) → decide il Responsabile servizio pulmini (posizione `responsabile-trasporti`; Direzione e Segreteria in sua assenza) → corsa con pulmino e autista (r74) → presa visione (r114, STAGED).
- Persone del servizio dall'elenco ruoli del club (`SCD_STAFF_ROSTER_JSON`, lo stesso degli "omini"); flotta, autisti e fermate dal Master `05_PULMINI` (copia automatica). Se le due liste non coincidono la pagina lo dice: si corregge la fonte, non si crea un terzo elenco.
- Nessun telefono arriva al browser (tolto sul server). Nomi dei ragazzi: nome e iniziale, solo per ufficio pulmini e autisti.
- Pulmino in diretta (r110): STAGED, fuori da questo avvio.

## Benchmark mondo

## Nozioni e regole

- Regole del servizio dalla comunicazione del 5/10/2026 (`config/scd-member-services.v1.json`).

## Visione a 3 mesi

## Dati: prende dal Cervellone / restituisce

- Prende: calendario ufficiale (trasferte), quadro allenamenti, Master 05_PULMINI, elenco ruoli, famiglie (scd_my_family).
- Restituisce: richieste e decisioni (scd_transport_requests + storico), corse (scd_transport_runs), presa visione (r114).

## Legami con le altre piattaforme

- Calendario, Quadro allenamenti, Organigramma (elenco ruoli), Area famiglia (`/famiglia`), Direzione accessi (posizioni `responsabile-trasporti` e `autista`).

## Richieste ricevute

- Francesco (DG) 17/10/2026 11:36: «importante anche la piattaforma servizio pulmini che deve partire».

## Prossimo passo costruibile

- Dopo «applica r114»: accendere `TRANSPORT_ACK_LIVE`. Poi notifica push alla famiglia sulla decisione (stessa coda di r67).

## Storico dei cicli

- 17/10/2026 avvio 2026/27: weekend in corso visibile il sabato e la domenica (prima mostrava quello dopo), squadre 2026/27 al posto delle sigle del Master, U18 segnalata da ricollocare, Responsabile servizio pulmini come titolare delle conferme, scheda «Chi fa il servizio», telefoni tolti, nomi ridotti nell'elenco richieste, migrazione r114 scritta e provata.
