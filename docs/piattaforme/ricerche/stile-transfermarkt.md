# Piattaforma 17 «stile Transfermarkt»: ricerca, schermate, personaggi, regole

Data: 17/10/2026 · richiesta di Francesco (DG) delle 08:11 · agente scd-scouting.
Etichette: VERIFIED = pagina aperta e letta · INFERRED = deduzione o conoscenza generale · PROPOSED = proposta.
È un'estensione della piattaforma 17 (`docs/piattaforme/17-ricerca-calciatori-e-iscriviti-come-calc.md`), non un'app nuova: stesso login, stesso Cervellone, stesse rose.

## 0. Limiti (onestà)
- transfermarkt.com è bloccato dal sistema (SITE_BLOCKED): l'anatomia della scheda sotto viene da articoli che lo descrivono e dalla conoscenza generale. La pagina d'aiuto LinkedIn sulle segnalazioni è chiusa ai robot: aperto solo il titolo nei risultati.
- Non ho interrogato SCD PULSE (nessuna query eseguita): le tabelle disponibili per rose e statistiche restano UNVERIFIED.
- Testo integrale NOIF sui contatti con dilettanti tesserati altrove: non trovato → «da confermare».

## 1. Cosa abbiamo imparato
### Transfermarkt
- VERIFIED (FTM): nato nel 2000 come hobby, 51% Axel Springer dal 2008, ~70 dipendenti, 14 lingue, oltre 800.000 professionisti. I dati (minuti, cartellini, contratti, procuratori, infortuni) arrivano in gran parte dagli utenti; gli osservatori dicono che i dati di base sono affidabili.
- VERIFIED (FTM): il valore di mercato non è un algoritmo: ogni campionato ha un volontario «padrino», gli utenti discutono nel forum, decide chi porta argomenti fondati. Scarto medio dal prezzo vero ~60%; tentativi di corruzione (cene, orologi) e giocatori che bloccano il sito dopo un ribasso. → Lezione: il numero «valore» crea conflitti e pressioni. Da noi NON esiste.
- VERIFIED (Wikipedia): risultati, statistiche, trasferimenti, voci di mercato (giudicate in gran parte esatte da uno studio CEP), staff e procuratori; nel 2014 un rilancio ha esposto dati privati di utenti per giorni. → Lezione: la privacy si progetta prima, non dopo.
- INFERRED (conoscenza generale) – anatomia della scheda: testata (nome, foto, ruolo, piede, nascita, nazionalità, club, scadenza contratto); carriera e trasferimenti in linea del tempo; statistiche per stagione e per competizione (presenze, minuti, gol, assist, cartellini); infortuni; trofei e successi; storico del valore; voci e forum. Pagine club: rosa, staff, arrivi e partenze, storico.
- INFERRED – perché ci si fida: ogni dato ha una fonte, chi sbaglia viene corretto da tanti occhi, moderatori riconoscibili, archivio lungo nel tempo.

### Tuttocampo (l'equivalente dilettanti)
- VERIFIED (Il Post, 08/10/2026): dal 2006, oltre 3 milioni di utenti attivi, dati su 100mila squadre e 3 milioni di calciatori, «la Wikipedia del calcio dilettantistico». Dati da volontari, società, giocatori e tifosi; redazioni provinciali; oltre 8mila highlights al mese; sezione Annunci per proporsi o cercare rinforzi; Fantacampo.
- VERIFIED (Il Post): schede minime (nome, cognome, squadra, spesso foto ufficiale), anche di minorenni; Tuttocampo «non garantisce la validità dei contenuti», si segnalano errori, qualcuno resta online. Ricavi: pubblicità, spazi sponsor per squadra, siti per società.
- VERIFIED (codice): nell'app Tuttocampo è già registrato come «Portale non ufficiale», autorità `secondary` (`apps/superapp/src/lib/official-links.ts`).
- → Lezione: da noi Tuttocampo serve solo come conferma secondaria; la verità sono C.U. e referti.

### Segnalazioni stile LinkedIn
- INFERRED (titolo della pagina d'aiuto «Accept or dismiss recommendations» VERIFIED, contenuto no): chi riceve una segnalazione la accetta o la scarta prima che sia visibile. → Principio da copiare: il calciatore decide cosa compare sulla sua scheda.

### Regole federali utili
- VERIFIED (calciomercato.com su NOIF): art. 95 bis NOIF vieta «contatti e/o trattative, dirette o tramite terzi» con calciatori sotto contratto pluriennale di altra società senza «preventiva autorizzazione scritta»; il dirigente rischia almeno un anno di inibizione (art. 14 CGS). Riguarda i contratti: per i dilettanti senza contratto la regola esatta è «da confermare» con la segreteria/CRL.
- VERIFIED (sintesi CRER 2025 adeguamenti NOIF al D.Lgs. 36/2021, art. 32 NOIF): dal 18° anno il «non professionista» ha tesseramento di al massimo una stagione (salvo biennale volontario fino ai 20 anni); il «giovane dilettante» (16-17 anni) al massimo due stagioni; premio di tesseramento art. 96 fino ai 20 anni. → Un calciatore tesserato altrove resta legato per tutta la stagione: fino a conferma, nessun contatto senza la sua società, e lo decide sempre il DS.

## 2. Cosa copiamo (il principio, mai gli asset)
1. Scheda chiara con fonte e data per ogni numero (Transfermarkt + regola «non noto ≠ zero»).
2. Linea del tempo «Storia nel club» al posto della storia dei trasferimenti.
3. Statistiche per stagione solo da C.U., referti e distinte; Tuttocampo come «secondaria», con etichetta.
4. «Fatti notare / Vuoi giocare con noi»: l'Annuncio di Tuttocampo, ma riservato e guidato.
5. «Garantiscono per lui»: 3 qualità scelte da un elenco + una frase breve, da adulti verificati, moderate, accettate dal calciatore.
6. Correzioni: pulsante «segnala un errore» che apre una proposta in coda (`/gestionale/coda`), mai una modifica diretta.
Non copiamo: valori di mercato e prezzi, voci di mercato, forum pubblico, commenti liberi, infortuni, voti ai giocatori.

## 3. Schermate proposte (PROPOSED)
1. **Scheda calciatore** (iscritti; pubblica solo per adulti con consenso firmato): testata con avatar o figurina (UD-144/145), nome, ruolo, squadra, anno di nascita se lui lo consente; «Storia nel club» (stagioni, squadre, tappe: esordio, 50 presenze, capitano); statistiche per stagione con fonte; traguardi di squadra; «Garantiscono per lui» (solo adulti).
2. **Rosa con schede**: da `/squadre/carte` (già con minimizzazione dei minori, VERIFIED nel codice) un tocco porta alla scheda.
3. **Chi cerchiamo**: annate e ruoli che il DS vuole rinforzare, senza nomi; pulsante «Vuoi giocare con noi?».
4. **Vuoi giocare con noi** (adulti; per i minori lo compila il genitore): ruolo, annata, comune (non indirizzo), squadra attuale e se è tesserato, disponibilità, link facoltativo a un video, consenso e data di revisione. Nessun dato sanitario al primo passo.
5. **Garantisce per me**: il calciatore adulto manda un link a chi lo conosce (ex mister, compagno adulto); chi scrive si identifica, sceglie 3 qualità e scrive max 140 caratteri; moderazione del club; il calciatore accetta; cancellabile sempre.
6. **La mia scheda da mostrare**: immagine condivisibile della scheda (adulti), con stemma ColicoDerviese e solo numeri verificati.
7. **Hanno giocato con noi**: archivio storico di ex calciatori adulti, partendo dal documento di progetto `claude/SCD_STORICO_CALCIATORI_E_RASD_2026-10-15.md` (contenuto da verificare).
8. **Bacheca del DS** (solo DS e Direzione, mai pubblica): candidature consensuali separate dall'osservatorio adulti da fonti pubbliche; criteri del DS, punteggio spiegato, data di revisione, proposta di cancellazione a 12 mesi.

## 4. Fonti dei dati
| Dato | Fonte | Etichetta |
|---|---|---|
| Rosa e ruoli | rosa pubblica e staff (`getPublicRoster`, `getStaffRoster`), R20 | VERIFIED nel codice |
| Presenze, gol, cartellini | referti/distinte via segreteria, LND Portale Servizi | INFERRED (da collegare) |
| Squalifiche, risultati | C.U. CRL Lombardia e Delegazione di Lecco | VERIFIED come fonte |
| Conferma secondaria | Tuttocampo (`official-links.ts`, «non ufficiale») | VERIFIED |
| Punti dai referti | già usati da `/fantacalcio` | VERIFIED nel codice |
| Storia nel club | archivio storico, fogli master, Drive | da verificare |
| Candidature, segnalazioni | nuove tabelle SCD PULSE (migrazione da approvare) | PROPOSED |
Ogni numero porta fonte e data; se manca: «da confermare».

## 5. Personaggi (PROPOSED, originali, coerenti con il cast)
Il cast resta: Crovi accoglie nella parte pubblica, Iride nel gestionale, Enea per sponsor ed eventi, Sky solo nei momenti sorpresa (UD-165). Due figure nuove, adulte, che non somigliano a persone reali, con piedistallo 3D come il resto (UD-144):
- **Ottavio, l'osservatore** (55-60 anni, figura disegnata): berretto azzurro, taccuino giallo, binocolo al collo; tre parole: curioso, gentile, onesto. Compare in «Chi cerchiamo» e «Vuoi giocare con noi»: «Cerchiamo un portiere per la Juniores. Ti va di farti conoscere?». Ai minori non parla mai direttamente: si rivolge al genitore («Suo figlio vuole provare? Lo iscrive lei in 2 minuti»). Non promette provini, posti in squadra o contatti: raccoglie, il DS decide.
- **Nora, la voce della rosa** (30-35 anni, stile conduttrice sportiva disegnata): giacca blu, microfono con fascia gialla. Presenta «Chi arriva» (nuovi tesserati adulti con consenso), le tappe («50 presenze in maglia ColicoDerviese») e le schede aggiornate. Mai cifre di mercato, mai voci, mai nomi di minori.
Schede personaggio complete: a scd-avatar (area chat CLOUD).

## 6. Come entrare in sintonia (PROPOSED)
- **Tono**: «tu» con gli adulti, «lei/voi» con i genitori; frasi corte; si parla di calcio, non di moduli. Prima il perché («qui conta come giochi e come stai in squadra»), poi la domanda.
- **Cosa ottiene chi si iscrive**: la sua scheda da calciatore con fonti vere, la figurina, la «Storia nel club» che cresce, i video della gara quando il club li ha, una scheda da mostrare (adulti), notifiche solo su ciò che lo riguarda.
- **Ganci**: «Chi cerchiamo» aggiornato dal DS; tappe festeggiate da Nora; «Garantiscono per te» (il riconoscimento di chi ti ha allenato vale più di un numero); «Hanno giocato con noi» per gli ex.
- **Porta un amico**: link personale da girare (adulti; per i minori lo gira il genitore); premio solo simbolico (badge «Ha portato un amico»), mai denaro o sconti; il club non contatta nessuno dal link: è l'amico che compila.
- **Notifiche (con consenso)**: «la tua scheda è aggiornata dopo il referto», «qualcuno ha garantito per te: vuoi pubblicarlo?», «la tua annata cerca il tuo ruolo». Sotto i 14 anni arrivano al genitore.
- **Famiglie**: il genitore vede la crescita del figlio in privato; per i più piccoli si invita alla prova («Provaci con noi»), non al mercato.
- **Fiducia**: «cosa facciamo con i tuoi dati» in 3 righe, cancellazione con un tocco, data di revisione visibile.

## 7. Regole fisse
1. Nessun valore di mercato, prezzo, ingaggio o «quotazione» per nessuno.
2. Minori (sotto 18): nessuna scheda pubblica; solo area riservata (atleta, famiglia, staff), nome + iniziale del cognome, consenso dei genitori; sotto i 14 anni gestisce il genitore. Nessuna segnalazione, voto o punteggio su minori.
3. Niente volti senza consenso (foto figurina solo secondo UD-145, in aree riservate).
4. GDPR: consenso specifico e revocabile, informativa (`claude/SCD_INFORMATIVA_PRIVACY_v2_BOZZA.md`), diritto di cancellazione (art. 17), minimizzazione, revisione a 12 mesi; età del consenso digitale in Italia 14 anni (art. 2-quinquies Codice privacy, INFERRED da ricontrollare); DPIA prima del lancio.
5. Contatti con calciatori tesserati altrove: art. 95 bis NOIF per chi ha contratto; per i dilettanti «da confermare»; li decide e fa solo il DS. Gli agenti non contattano nessuno.
6. Nessuna chat 1:1 adulto-minore; i messaggi ai minori passano dal genitore.
7. Segnalazioni: solo da adulti identificati, solo su adulti, 3 qualità da elenco chiuso + frase breve, moderate, accettate dal calciatore; niente commenti pubblici, niente voti, niente negativi.
8. Osservatorio (market watch): solo adulti, solo fonti sportive pubbliche con link e data; nessun profilo social, nessun contatto privato, nessun dato sanitario; mai visibile fuori da DS e Direzione.

## 8. Cinque passi costruibili (in ordine)
| # | Passo | Sforzo | Serve ok |
|---|---|---|---|
| 1 | «Chi cerchiamo»: pagina con annate e ruoli da un file di configurazione, Ottavio come figura statica, pulsante verso l'iscrizione esistente | S | DS conferma l'elenco; il collegamento all'iscrizione/Tally è area chat PC |
| 2 | Scheda calciatore in sola lettura per Prima Squadra e Juniores adulti, da rosa e calendario esistenti, numeri con fonte o «da confermare», nessuna tabella nuova | S | verifica dei consensi nome/immagine degli adulti; minori esclusi |
| 3 | Modulo «Vuoi giocare con noi» con consenso, data di revisione, cancellazione | M | migrazione (numerazione r110-r129) con «applica», informativa v2 approvata, DS |
| 4 | «Garantisce per me»: richiesta via link, moderazione in `/gestionale/coda`, accettazione del calciatore | M | migrazione con «applica», regole di moderazione della Direzione |
| 5 | Bacheca del DS con punteggio spiegato, osservatorio adulti e proposta di cancellazione a 12 mesi; poi «Storia nel club» dall'archivio | L | DPIA, ruolo DS assegnato da Francesco o dal Presidente, verifica fonti storiche |

## Fonti aperte (17/10/2026)
- Follow the Money, volontari Transfermarkt: https://www.ftm.eu/articles/transfermarkt-volunteers-european-football
- Wikipedia, Transfermarkt: https://en.wikipedia.org/wiki/Transfermarkt
- Il Post, Tuttocampo: https://www.ilpost.it/2026/10/08/tuttocampo-app-calcio-dilettanti-cos-e-come-funziona/
- Calciomercato.com, art. 95 bis NOIF: https://www.calciomercato.com/notizie/perche-la-juve-non-puo-offrire-un-contratto-a-barella-cosa-dicon/1231817
- FIGC CRER, sintesi adeguamenti NOIF 2025: https://www.figccrer.it/files/contents/2025/2053/Sintes_NUOVE_NORME_TESSERAMENTOi_Adeguamenti_NOIF_a_D._Lgs_36_2021%20CRER%20Versione%202025.pdf
- LinkedIn Help (solo titolo, pagina chiusa ai robot): https://www.linkedin.com/help/linkedin/answer/102
