# 17 · Ricerca calciatori e iscriviti come calciatore

Responsabile: vedi `.claude/agents/PIPELINE.md` §0 · Stato: da compilare al primo ciclo

## Stato reale

## Benchmark mondo

## Nozioni e regole

## Visione a 3 mesi
**Vetta Legnone** (nome scelto da Francesco il 17/10/2026, 08:2x: il Legnone è la montagna di Colico). Studio completo: `ricerche/vetta-legnone-studio.md`. Motore: PERSONE.
- VERIFIED (codice, 17/10): vetrina pubblica `/vetta-legnone` (`apps/superapp/src/routes/vetta-legnone.tsx`, contenuti in `src/lib/vetta-legnone.ts` con test). Hero con stemma ufficiale e lago/monte in SVG; un invito per pubblico (calciatore adulto e genitore → `/entra`, ex giocatore e mister → `/contatti`, tifoso → `/top11`); «Chi cerchiamo» onesto (ruoli da indicare dal mister, annata 2010 da confermare dal DS); la salita Riva → Molo → Largo → Rifugio → Vetta solo con dati verificati; storia in 6 epoche con fonte; Lario (solo iniziale «L», UD-174) presenta, Ottavio invita e per i minori parla con i genitori; fascia regole (niente valori di mercato, minori mai pubblici, segnalazioni moderate tra adulti, art. 95 bis NOIF, consenso GDPR). Link di una riga da `/entra`.
- VERIFIED (SCD PULSE, 17/10): `scd_person_consents` vuota → oggi nessuna scheda è pubblica; la scheda resta «in arrivo».
- PROPOSED a 3 mesi: 1) DS e mister confermano «Chi cerchiamo» per squadra; 2) consensi e scheda in sola lettura per gli adulti (migrazione da «applica»); 3) «Hanno giocato con noi» per epoca con proposte dei tifosi decise dalla Direzione; 4) «Garantiscono per lui» moderato in `/gestionale/coda`.
- Misura: visite a `/vetta-legnone` e tocchi su ogni invito (piattaforma Meta, dopo il consenso analitico), poi richieste ricevute dalla Segreteria per pubblico. Da aggiungere (altro file condiviso, non in questo ramo): `/vetta-legnone` in `PUBLIC_PREFIXES` di `src/lib/http-policy.ts` per cache pubblica e sitemap.

## Visione stile Transfermarkt (17/10)
Richiesta di Francesco 17/10/2026 08:11; ricerca completa in `ricerche/stile-transfermarkt.md` (agente scd-scouting). PROPOSED, dentro questa piattaforma, nessuna app nuova.
- Si copia da Transfermarkt e Tuttocampo il principio: scheda calciatore con fonte e data per ogni numero, «Storia nel club» come linea del tempo, statistiche per stagione solo da C.U. e referti (Tuttocampo come fonte secondaria), «segnala un errore» verso la coda.
- Schermate: Scheda calciatore, Rosa con schede, Chi cerchiamo, Vuoi giocare con noi, Garantisce per me (3 qualità da adulti verificati, moderate e accettate dal calciatore), La mia scheda da mostrare, Hanno giocato con noi, Bacheca del DS (solo interna).
- Personaggi nuovi proposti: Ottavio l'osservatore (invita a farsi conoscere, ai minori solo tramite genitore) e Nora la voce della rosa (nuovi arrivi e tappe). Schede a scd-avatar.
- Regole fisse: nessun valore di mercato o prezzo; minori mai pubblici (nome + iniziale, consenso dei genitori, sotto 14 gestisce il genitore, nessuna segnalazione o voto); niente volti senza consenso; GDPR con cancellazione e revisione a 12 mesi; contatti con tesserati altrui solo dal DS (art. 95 bis NOIF per i contratti, dilettanti «da confermare»).
- Primo passo: «Chi cerchiamo» (S), poi scheda in sola lettura degli adulti (S); modulo candidatura e segnalazioni richiedono migrazione con «applica» e informativa approvata.

## Dati: prende dal Cervellone / restituisce

## Legami con le altre piattaforme

## Richieste ricevute

## Prossimo passo costruibile

## Storico dei cicli
