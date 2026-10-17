# 07 · Club House Colico e Dervio

Responsabile: scd-clubhouse · Stato: In parte · Pagina: `/tesoreria/club-house` · verificato 17/10/2026 (mappa `apps/superapp/src/lib/piattaforme.ts`)

## Stato reale

- VERIFIED 17/10/2026: `/tesoreria/club-house` ospita cassa (listino non caricato), desk card SQUBY, richieste d'ordine (r103), presenza dello chef.
- 17/10/2026 (Francesco 12:22 «iniziare a inserire tutto»): scheda «Inserisci: Club House» nella stessa pagina per orari di Colico e Dervio, listino (Bar/Cucina/Merchandising) e menu per gruppi. Scrive il registro `scd_club_catalog` (migrazione r115, STAGED: si attiva con «applica r115»). Scrivono Direzione (ruolo DIRECTION, presidente, direttore-generale) e la posizione `responsabile-club-house`. Le serate restano in Attività in struttura (r135/r137).
- In pubblico: blocco «Club House» su `/impianti`; senza dati «da confermare», mai prezzi inventati.

## Benchmark mondo

## Nozioni e regole

## Visione a 3 mesi

## Dati: prende dal Cervellone / restituisce

- Prende: ruoli e posizioni (r35/r74), sedi (Colico, Dervio). Restituisce: righe pubblicate a `/impianti` e conteggio del listino nella testata di `/tesoreria/club-house`. Misura: righe pubblicate per tipo, giorni da BOZZA a PUBBLICATA (`scd_club_catalog_events`).

## Legami con le altre piattaforme

## Richieste ricevute

## Prossimo passo costruibile

- Dopo «applica r115»: la Responsabile Club House inserisce orari Colico e Dervio, poi il listino del bar con i prezzi veri, poi i menu per gruppi.
- Poi: i tasti della cassa (TillPreview) letti dalle voci LISTINO pubblicate; la home legge gli orari dal registro invece di `CLUB_HOUSE_HOURS`.

## Storico dei cicli
