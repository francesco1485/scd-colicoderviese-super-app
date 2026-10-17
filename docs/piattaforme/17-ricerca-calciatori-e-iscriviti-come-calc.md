# 17 · Ricerca calciatori e iscriviti come calciatore

Responsabile: scd-scouting · Stato: Attiva · Pagina: `/vetta-legnone` (vetrina pubblica su /vetta-legnone; profili in arrivo) · verificato 17/10/2026 (mappa `apps/superapp/src/lib/piattaforme.ts`)

## Stato reale

## Benchmark mondo

## Nozioni e regole

## Visione a 3 mesi
**Vetta Legnone** (nome scelto da Francesco il 17/10/2026, 08:2x: il Legnone è la montagna di Colico). Studio completo: `ricerche/vetta-legnone-studio.md`. Motore: PERSONE.
- VERIFIED (codice, 17/10): vetrina pubblica `/vetta-legnone` (`apps/superapp/src/routes/vetta-legnone.tsx`, contenuti in `src/lib/vetta-legnone.ts` con test). Hero con stemma ufficiale e lago/monte in SVG, al futuro (nessuna scheda esiste ancora); contatori con fonte e data visibili sotto il numero, nessun conteggio di squadre o tesserati (UD-176: quelli citano l'export del portale LND). Un invito per pubblico legato a `PUBLIC_FORMS_LIVE`: con i moduli in pausa calciatore e genitore vanno a `/contatti` (canali ufficiali), senza promesse di tempi o richiamate; ex giocatore e mister → `/contatti`, tifoso → `/top11`. «Chi cerchiamo» onesto (ruoli da indicare dal mister, «Annata 2010: da confermare dal DS»); salita Riva → Molo → Largo → Rifugio → Vetta solo con dati verificati; 6 epoche con fonte, approvate dalla Direzione il 17/10/2026 (vedi «Storia approvata»). Sulla pagina pubblica parla solo Ottavio (agli adulti; per i minori ai genitori); Lario (UD-174) resta nelle aree riservate ed è citato solo come «il DS». Fascia regole: niente valori di mercato, nome e iniziale solo con il consenso della famiglia e mai volti, segnalazioni moderate tra adulti, norme federali sui contatti (senza numero d'articolo finché manca il documento federale), consenso GDPR. Link di una riga da `/entra`.
- VERIFIED (SCD PULSE, 17/10): `scd_person_consents` vuota → oggi nessuna scheda è pubblica; la scheda resta «in arrivo».
- PROPOSED a 3 mesi: 1) DS e mister confermano «Chi cerchiamo» per squadra; 2) consensi e scheda in sola lettura per gli adulti (migrazione da «applica»); 3) «Hanno giocato con noi» per epoca con proposte dei tifosi decise dalla Direzione; 4) «Garantiscono per lui» moderato in `/gestionale/coda`.
- Misura: visite a `/vetta-legnone` e tocchi su ogni invito (piattaforma Meta, dopo il consenso analitico), poi richieste ricevute dalla Segreteria per pubblico. `/vetta-legnone` è in `PUBLIC_PREFIXES` (`src/lib/http-policy.ts`) e nella lista offline di `vite.config.ts`: cache pubblica, sitemap e robots.

## Visione stile Transfermarkt (17/10)
Richiesta di Francesco 17/10/2026 08:11; ricerca completa in `ricerche/stile-transfermarkt.md` (agente scd-scouting). PROPOSED, dentro questa piattaforma, nessuna app nuova.
- Si copia da Transfermarkt e Tuttocampo il principio: scheda calciatore con fonte e data per ogni numero, «Storia nel club» come linea del tempo, statistiche per stagione solo da C.U. e referti (Tuttocampo come fonte secondaria), «segnala un errore» verso la coda.
- Schermate: Scheda calciatore, Rosa con schede, Chi cerchiamo, Vuoi giocare con noi, Garantisce per me (3 qualità da adulti verificati, moderate e accettate dal calciatore), La mia scheda da mostrare, Hanno giocato con noi, Bacheca del DS (solo interna).
- Personaggi nuovi proposti: Ottavio l'osservatore (invita a farsi conoscere, ai minori solo tramite genitore) e Nora la voce della rosa (nuovi arrivi e tappe). Schede a scd-avatar.
- Regole fisse: nessun valore di mercato o prezzo; minori mai pubblici (nome + iniziale, consenso dei genitori, sotto 14 gestisce il genitore, nessuna segnalazione o voto); niente volti senza consenso; GDPR con cancellazione e revisione a 12 mesi; contatti con tesserati altrui solo dal DS (art. 95 bis NOIF per i contratti, dilettanti «da confermare»).
- Primo passo: «Chi cerchiamo» (S), poi scheda in sola lettura degli adulti (S); modulo candidatura e segnalazioni richiedono migrazione con «applica» e informativa approvata.

## Storia approvata (17/10/2026)
- VERIFIED (approvazione): Francesco (DG), 17/10/2026 09:42, sulla storia in 6 epoche della pagina `/vetta-legnone` (PR #180): «la approvo ma voglio che si migliora». L'etichetta pubblica diventa «Storia approvata dalla Direzione · 17/10/2026».
- VERIFIED (codice, PR cantiere-17-storia-epoche): ogni epoca ha un titolo forte, 1-2 righe di racconto e 1-3 tappe (quando, squadra o categoria, risultato) con la propria fonte (album «STORIA SCD» v1 e integrazione 2025/26 nel Cervellone, cartella 04; calendario eventi del club). Linea del tempo interattiva: su telefono le 6 epoche scorrono in orizzontale con scroll-snap, un tocco apre l'epoca; frecce, Home e Fine da tastiera; movimento solo se l'utente non chiede movimento ridotto. Striscia «Le nostre tappe»: finale di Coppa Italia di Promozione (14/05/2022, Meda, esito da verificare), Memorial José Nasazzi (1° 2022, 6° 2025/26, 7° 22-23/05/2027), play-off di Promozione 2025/26 (girone B), 1° Memorial Sandro Guattini. Chiusura «La prossima tappa la scrivi tu.» con la stessa logica `PUBLIC_FORMS_LIVE` degli inviti (in pausa → `/contatti`).
- Regole tenute: nessun anno di fondazione (il 2011/12 è la «prima stagione documentata»); nessun nome di persona, solo squadre, categorie, stagioni, eventi e luoghi; esiti non verificati restano «da verificare». Test in `apps/superapp/src/lib/vetta-legnone.test.ts`.
- Misura (PERSONE): aperture delle epoche e tocchi su «La prossima tappa» verso `/contatti` o `/entra` (piattaforma Meta, dopo il consenso analitico); poi messaggi «Racconta la tua storia» ricevuti dalla Segreteria.
- PROPOSED: completare le epoche con l'esito della finale 2022, la finale di Coppa Lombardia al Football Finals Event (categoria ed esito da verificare) e il terzo livello SGS quando sarà ufficiale; collegare la pagina pubblica «Storia e territorio» quando la sua rotta esisterà.

## Dati: prende dal Cervellone / restituisce

## Legami con le altre piattaforme

## Richieste ricevute

## Prossimo passo costruibile

## Storico dei cicli
