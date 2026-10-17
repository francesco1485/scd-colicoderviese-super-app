# 19 · Convenzioni

Responsabile: scd-convenzioni · Stato: In costruzione · Pagina: `/gestionale/piattaforme/convenzioni` (pagina di partenza) · verificato 17/10/2026 (mappa `apps/superapp/src/lib/piattaforme.ts`)

## Stato reale

- 17/10/2026 (Francesco 12:22): la pagina `/gestionale/piattaforme/convenzioni` ha due schede di inserimento: «Convenzioni» (partner, offerta, validità, come usarla, categoria, card che danno accesso, link https) e «Tessere e card» (vantaggi delle tre card, regole, altri tipi di tessera). Registro unico `scd_club_catalog` (migrazione r115, STAGED). Convenzioni: solo Direzione; Tessere: Direzione e Segreteria. Le tre card e i loro importi restano la policy della Direzione (`config/scd-club-cards.v1.json`), mai copiate.
- In pubblico: `/card` (tutte) e `/card/<tipo>` (solo quelle di quella card); senza dati «Convenzioni da confermare».
- Non toccato: la fascia promo della home (`lib/home-promos.ts` CONVENZIONI) resta vuota finché Francesco annuncia le convenzioni con partner sponsor.

## Benchmark mondo

## Nozioni e regole

## Visione a 3 mesi

## Dati: prende dal Cervellone / restituisce

- Prende: card del club (`config/scd-club-cards.v1.json`), ruoli e posizioni. Restituisce: righe pubblicate a `/card`. Misura: convenzioni pubblicate e attive, giorni da BOZZA a PUBBLICATA.

## Legami con le altre piattaforme

## Richieste ricevute

## Prossimo passo costruibile

- Dopo «applica r115»: la Direzione inserisce le convenzioni già dette sì dai partner; la Segreteria la scadenza delle card e gli altri vantaggi.
- Poi: la fascia promo della home legge le convenzioni pubblicate con partner tra gli sponsor confermati (invece della lista fissa).

## Storico dei cicli
