# 04 · Sponsor

Responsabile: vedi `.claude/agents/PIPELINE.md` §0 · Stato: primo ciclo 17/10/2026 (ramo feat/cantiere-04-05-sponsor-tornei)

## Stato reale
- VERIFIED · `/sponsor` rifatta il 17/10/2026: testata «Il tuo marchio, dove il Lario si ritrova» con l'azione unica «Diventa partner», Enea (UD-149) con una ragione e un'azione a rotazione, «Perché conviene» (`lib/sponsor-reach.ts`: numeri solo documentati, pubblico e utenti app «da confermare»), parete «Già con noi» dai loghi originali di `lib/sponsors.ts` (12 visibili, poi «Vedi tutte»), LED wall dal vivo (`SponsorLedwallLive`), 4 pacchetti di `lib/sponsor-packages.ts` in schede a colori con i 3 passi, FAQ, Volto sponsor e modulo `PartnerForm` (#proposta, `?pacchetto=`).
- VERIFIED · `/partner`: prima dell'accesso mostra cosa riceve un partner e un'anteprima dell'area etichettata «Esempio · dati non reali» (`lib/partner-preview.ts`), poi la schermata di accesso esistente (invariata, chat PC).


## Benchmark mondo
- Pagine partner dei club (AC Milan «I Nostri Partner»): partner in una parete di loghi per livello, un'azione per diventare partner. Principio copiato: parete di loghi a colori + un'azione.
- Sponsoo (marketplace sponsorizzazioni): «Die Vorteile» + «Step by Step» + portfolio. Principio: vantaggi, passi chiari, chi c'è già.
- Gothia Cup: pagina «Partners · We do it together». Principio: il partner è parte del torneo, non un banner.


## Nozioni e regole
- Mai prezzi, sconti o numeri di visibilità non documentati (UD-149, `sponsor-packages.ts`). Residenti ISTAT (Colico 8.206, Dervio 2.537 al 31/12/2024) indicati come territorio, mai come pubblico.
- Loghi solo originali e a colori (UD-110); nome solo se `nameVerified`.


## Visione a 3 mesi

## Dati: prende dal Cervellone / restituisce

## Legami con le altre piattaforme

## Richieste ricevute

## Prossimo passo costruibile
- Report mensile per sponsor dichiarato «calcolato» (I-261017-12, seconda parte) quando esiste una misura reale delle visualizzazioni.
- Misurare: proposte arrivate da #proposta al mese e pacchetto scelto (registro `submitPartnerLead`).


## Storico dei cicli
- 17/10/2026 · Cantiere 04+05 (Francesco 08:22 «fa pietà… migliorala»): /sponsor e /partner rifatte; motore SOLDI.

