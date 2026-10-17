# App S.C.D. ColicoDerviese vista da un ragazzo (8-19 anni): ricerca e 12 funzioni

Data: 17/10/2026. Etichette: VERIFIED = letto/aperto da me; INFERRED = deduzione; PROPOSED = proposta.

## 0. Limiti della ricerca (onestà)
- Il sito vivo https://app.colicoderviese.it NON l'ho potuto aprire: lo strumento di lettura web è stato bloccato dal sistema di permessi (URL bloccato: https://app.colicoderviese.it). Non ho riprovato. Quindi /installa, calendario, news, squadre li descrivo dal CODICE, non dal sito pubblicato. Può differire dalla produzione (VERIFIED: ho letto il ramo staging/superapp in locale).
- Le schede docs/piattaforme/14-avatar.md e 16-giochi-interattivi.md sono vuote (solo modello, "da compilare al primo ciclo"). VERIFIED. Non ho potuto leggere i documenti di progetto SCD_BENCHMARK_SPORT_SOCIAL e SCD_PRODOTTO_SOCIAL (strumento non disponibile): le idee qui sotto vanno confrontate con quelli prima di costruire (aggiungere, non ricominciare).
- Per Instagram Reels, TikTok, BeReal, Sorare, Fantacalcio, YouTube Shorts, OneFootball non ho aperto pagine: quello che dico viene dalla conoscenza generale = INFERRED.

## 1. Cosa vede oggi un ragazzo (dal codice, VERIFIED)
Home pubblica (non iscritto), in ordine (HomeLobby.tsx):
1. Striscia blu "Partite della settimana" che scorre lenta, con pausa. Utile, ma è testo piccolo.
2. Fascia "Chi siamo": stemma, "Club Giovanile di 3° livello FIGC SGS", LND Lombardia, affiliata AC Monza, matricola FIGC, tre marchi. Registrati gratis è un link piccolo. Per un ragazzo è la prima cosa che vede ed è linguaggio da adulti/istituzione.
3. Settimana a giorni (telefono), poi "Oggi in campo": tabella orari allenamenti + orari Club House. Orari, non emozioni.
4. "In primo piano": slide ogni 7 s (avatar, Iride la segreteria, palinsesto del giorno).
5. "Servizi e club": Kit, Club House, Pulmini, Christmas Lario Cup.
6. "Bordo campo" (HomeBordoCampo).
- Il conto alla rovescia alla prossima gara in casa esiste solo nella colonna laterale desktop (classe "hidden ... lg:flex"): su telefono non si vede. VERIFIED.
- Nessun video verticale: i tag video/mp4 compaiono solo per LED wall e spot sponsor, non per i ragazzi. VERIFIED (ricerca nel codice).
- Nessun suono, nessuna vibrazione, movimento solo ticker/slide/coriandoli per vittoria (WinConfetti). VERIFIED.
- Il codice dice che nella home pubblica "No stories" e "nessun minore nominato": scelta di prudenza, ma toglie anche il linguaggio dei ragazzi (storie con anello). VERIFIED.
- Streak, livelli, badge, sfide settimanali: non ne ho trovati fra le funzioni per i ragazzi nei file che ho aperto (la ricerca per parola era rumorosa: INFERRED che non esistano).
Cose che ESISTONO ma stanno dietro login o in fondo (VERIFIED nel codice):
- Fantacalcio SCD (/fantacalcio): 11 giocatori, punti da referti veri, classifica con nome squadra scelto, gratis, minori nome+iniziale, sotto 14 anni con account famiglia.
- Top 11 della settimana (/top11): 3 voti per account, esce il lunedì; minori con consenso e solo nome+iniziale; attività di base esclusa.
- Crea il tuo campione + Le mie card (/la-mia-scd/campione): avatar e card digitali, area soci, noindex.
- Carte della rosa (/squadre/carte): solo iscritti, minori nome+iniziale.
- Comunità (/community): porte "Gioca / Segui / Partecipa", feed moderato, "Forza" (reazione), segnalazione post.
- Notifiche push (PushCard, push.ts) e installazione PWA (/installa, QR).
- "Consiglio del giorno" (dailyTip) nella home iscritti.
Giudizio onesto (INFERRED): le basi giuste ci sono, ma sono nascoste e la porta d'ingresso è da genitori/istituzioni. Mancano: ragione per tornare ogni giorno, premio per partecipare, qualcosa da mostrare agli amici, suono/movimento, la "mia" partita in grande.

## 2. Cosa usano i giovani e perché funziona (meccaniche)
Pagine aperte (VERIFIED):
- Kings League (sportcal.com): formato con sorprese (carta d'oro con vantaggio segreto, dado gigante, cambi illimitati), "qualcosa succede ogni due minuti", presidenti streamer, draft e mercato, trasmissioni gratis su YouTube/Twitch/TikTok; 85-90% del pubblico sotto i 30 anni; partner "dentro" i contenuti. Principio: ritmo + sorpresa + persone riconoscibili + clip brevi.
- Duolingo (uxdesign.cc, articolo parziale): obiettivo giornaliero scelto da te, feedback immediato, sfida con altri, bentornato caloroso. Streak e leghe: dalla conoscenza generale (INFERRED).
- Strava (runrepublic.com): kudos (un tocco di apprezzamento), segmenti/classifiche, club, sfide mensili con badge, riepiloghi settimanali, "Year in Sport" condivisibile a dicembre. Principio: riconoscimento tra pari + progresso visibile + riepilogo da condividere.
- EA FC (goal.com): carta con voto complessivo e 6 attributi (ritmo, tiro, passaggio, dribbling, difesa, fisico). Principio: ti vedi come una figurina con numeri. Il voto reale dei ragazzi NON va mai inventato.
- FotMob (perfectiongeeks.com): notifiche precise (gol, formazioni, fischio d'inizio), voti ai giocatori, seguire squadre e giocatori, widget. Principio: ti avviso io, non devi cercare.
- Snapchat streaks (mobicip.com): le serie agganciano (tappe tipo 100 giorni, farle con gli amici) ma causano ansia, obbligo, conflitti se si rompono. Principio da copiare con cautela: serie settimanali, mai punitive.
- Spond (spond.com): genitori come "guardiani" con accesso a inviti e notifiche, messaggi registrati e non cancellabili visibili agli amministratori, consensi digitali per presenze/foto/dati medici. Non dice nulla su divieti di messaggi 1:1 adulto-minore (non coperto dalla pagina).
Non aperti (INFERRED, conoscenza generale): Instagram Reels/Storie (anello colorato = c'è qualcosa di nuovo, verticale, sonoro), TikTok (sfide con un suono, video brevissimi), BeReal (un momento al giorno uguale per tutti, nessun filtro), Snapchat (storie), Sorare (carte da collezione - ha componente di scambio a pagamento: NON copiare), Fantacalcio (squadra tua + punti dalla realtà), YouTube Shorts, OneFootball, Heja.

## 3. Filtro sicurezza under 18 (vale per tutto)
Mai: volti o cognomi di minori in pubblico senza consenso; chat pubblica o 1:1 adulto-minore; posizione; premi in denaro, pacchetti a pagamento, casuali (loot box), scommesse o pronostici con premio; serie punitive; classifiche individuali dell'attività di base; messaggi in blocco senza consenso. Sotto i 14 anni: account della famiglia. Convocazioni: i ragazzi non scelgono, prendono visione o segnalano impedimento. Sempre: nome + iniziale del cognome, stemma ColicoDerviese, dato mancante = "da confermare" (non zero).

## 4. Le 12 funzioni, in ordine di impatto/sforzo (PROPOSED)
Legenda: S = pochi giorni, M = 1-2 settimane, L = oltre.

1. **Giorno gara: tocca a noi** (S) - Il ragazzo vede in alto un grande conto alla rovescia "Domenica ore 15, ColicoDerviese - [avversario]", con stemma dell'avversario solo dal file config/scd-opponent-crests.v1.json. Copia: FotMob/OneFootball, perché ti dice subito la cosa che ti interessa. Piattaforme: 11 rotazione campi, 10 quadro allenamenti, calendario. Dati: calendario pubblico (già c'è: nextHome, countdownLabel). Sicurezza: solo date/orari pubblici, nessun luogo di persone, nessun nome.
2. **Avvisi che contano** (S-M) - Il telefono vibra: "Stasera allenamento alle 18:30" o "Fischio d'inizio". Copia: FotMob (le notifiche precise sono il motivo per cui la tengono). Piattaforme: 18 news, 10 quadro, push esistente. Dati: squadre seguite + consenso notifiche (PushCard c'è). Sicurezza: invio solo con consenso del genitore sotto i 14; testi dal club, mai messaggi 1:1; canale da collegare e approvare da Francesco.
3. **Bravo! (un tocco)** (S) - Sotto risultati e notizie, un bottone "Bravo!" con 4 reazioni fisse, niente testo libero. Copia: kudos di Strava (un tocco = riconoscimento, fa sentire visti). Piattaforme: 13 social e video, 18 news. Dati: toggleForza esiste. Sicurezza: niente commenti liberi (niente insulti, niente adulto-minore), reazioni a contenuti del club, non a persone.
4. **La mia card** (M) - Il ragazzo vede la propria figurina tipo FC con avatar, ruolo, squadra e tappe (presenze, gare giocate) che si riempiono col tempo. Copia: EA FC (carta con numeri: ti senti calciatore). Piattaforme: 14 avatar, 15 fantacalcio, 17 ricerca calciatori. Dati: avatar già in /la-mia-scd/campione; numeri solo da referti/presenze ufficiali, altrimenti "da confermare"; MAI voti inventati. Sicurezza: visibile solo a lui e alla famiglia, niente classifica tra bambini, avatar disegnato al posto della foto, nessun premio casuale o a pagamento.
5. **Badge e costanza** (S-M) - Badge tipo "Primo allenamento", "Un mese con noi", "Tifoso in trasferta", e una serie in settimane ("3 settimane di fila al campo"). Copia: Duolingo/Strava (obiettivo piccolo, progresso visibile). Piattaforme: 16 giochi, 10 quadro. Dati: presenze lette (sola lettura, non le modifica l'app), azioni nell'app. Sicurezza: serie settimanale con "scudo" (una settimana saltata per malattia/scuola non la rompe), nessun avviso di colpa, niente confronto pubblico (lezione Snapchat: ansia); le presenze restano del mister.
6. **Sfida della settimana** (S) - Ogni lunedì una sfida di abilità o di squadra ("30 palleggi", "porta un amico a vedere la gara"), il ragazzo segna "fatta" e prende un badge. Copia: sfide TikTok e sfide mensili Strava. Piattaforme: 16 giochi, 10 quadro. Dati: elenco sfide curato dai mister (rotazione come dailyTip). Sicurezza: autodichiarazione, nessun video caricato, nessun luogo, niente premi in denaro; sfide fisiche adatte all'età approvate dal mister.
7. **Quiz del giorno** (S) - 3 domande veloci sul club e sul calcio con risultato subito. Copia: Duolingo (sessione breve, feedback immediato). Piattaforme: 16 giochi, 18 news. Dati: domande vere dalla storia del club e dal regolamento (fonti verificate; storia fondazione ancora incerta: evitarla). Sicurezza: nessun dato personale, punteggio solo suo.
8. **Migliore in campo / Squadra del weekend** (M) - Dopo la gara un voto veloce "chi ti ha colpito?" con risultato di squadra del lunedì. Copia: FotMob (voti ai giocatori) + Top 11 già nostra. Piattaforme: 15 fantacalcio, 13 social. Dati: referti ufficiali, consenso registrato (Top 11 esiste). Sicurezza: minori nome + iniziale, solo con consenso, attività di base esclusa (niente graduatorie individuali); per i piccoli solo "Squadra" intera, non singoli.
9. **La mia stagione** (M) - A dicembre e a giugno un riepilogo animato da condividere ("12 allenamenti, 5 gare viste, 3 badge"). Copia: Year in Sport di Strava / Spotify Wrapped (si condivide da solo). Piattaforme: 13 social e video, 14 avatar. Dati: presenze lette e azioni nell'app, con "da confermare" dove manca. Sicurezza: figura con avatar, nome+iniziale, niente foto, condivisione scelta dal ragazzo o dal genitore.
10. **Tabellone torneo in diretta** (M) - Per la Christmas Lario Cup (8 dicembre) tabellone, orari e risultati che si aggiornano durante la giornata. Copia: Kings League/OneFootball (ritmo, qualcosa succede sempre). Piattaforme: 05 tornei ed eventi, 18 news. Dati: calendario del torneo ufficiale inserito dalla segreteria. Sicurezza: solo squadre e punteggi, nessun nome di minore, risultati attività di base solo se la regola lo consente.
11. **Stasera al campo, con anello** (M) - Un cerchio colorato in cima alla home, "Stasera si gioca", che si apre a schermo intero con 3-4 schede animate (orario, campo, chi viene, sponsor). Copia: Storie Instagram/Snapchat (anello = c'è qualcosa di nuovo, 24 ore). Piattaforme: 13 social e video, 10 quadro. Dati: contenuti del club già pronti. Sicurezza: solo grafica e testo ufficiali del club, niente volti, niente nomi; richiede decisione (oggi la home dice "No stories").
12. **Weekend in 30 secondi** (L) - Un video verticale che parte da solo (senza audio forzato) con risultati, gol e classifica, a schede animate. Copia: Reels / Shorts / TikTok (verticale, breve, sonoro opzionale). Piattaforme: 13 social e video, 18 news. Dati: referti ufficiali; uso di video solo con strumenti gratuiti già in uso (CapCut/Canva). Sicurezza: grafica senza volti di minori (solo Prima Squadra adulta con consenso firmato), musica con licenza, nessuna voce famosa senza accordo; pubblicazione solo dopo canali collegati e approvazione di Francesco.

## 5. Home "per un ragazzo" (PROPOSED, 7 punti)
1. In alto, il grande conto alla rovescia della MIA prossima partita (anche in trasferta), con stemma del club e avversario; se c'è la gara in corso: "In corso adesso" con il punteggio.
2. Subito sotto, "Stasera" in una riga sola: allenamento della mia squadra, orario, campo, pulmino (zone, senza nomi).
3. Anello "Stasera al campo" / ultime novità in stile storie (uno scorrimento, 3-4 schede), solo grafica del club.
4. "La mia card" piccola con avatar, badge nuovi e la serie settimanale; se non iscritto: "Crea il tuo campione" in primo piano.
5. "Sfida della settimana" + "Quiz del giorno" in due pulsanti grandi, risultato immediato.
6. "Il weekend": risultati e Squadra del weekend / Bravo! (un tocco), tabellone torneo quando c'è.
7. Più in basso, per chi lo vuole: calendario, Fantacalcio, Top 11, Comunità, Iride.
8. In fondo, spostata: la fascia "Chi siamo / FIGC / LND / matricola" (adulti, genitori, sponsor) - oggi occupa il secondo posto.
Toni: frasi corte, verbi al "tu", poca burocrazia, movimento e vibrazione leggeri (rispetto di "riduci movimento"), palette blu/azzurro/giallo/bianco, stemma ufficiale ColicoDerviese.

## 6. Tre cose costruibili questa settimana, senza servizi a pagamento (PROPOSED)
1. **Conto alla rovescia anche su telefono**: portare in alto nella home (oggi solo desktop) la card "Prossima gara" con countdown, usando le funzioni già presenti (nextHome, countdownLabel, calendario pubblico). Sforzo S. Plugin: calendario/10-11.
2. **Sfida della settimana + Quiz del giorno**: dati statici curati dal mister/segreteria, rotazione come dailyTip, risultato e badge salvati solo sul telefono (localStorage), niente server nuovo, niente dati personali. Sforzo S. Piattaforma 16.
3. **Un tocco di vita**: vibrazione breve e animazione (rispettando "riduci movimento") quando si vota in Top 11, si salva la squadra Fantacalcio o si completa una sfida; testi più diretti ("Hai fatto il tuo voto!"). Sforzo S. Piattaforme 15/16.

## 7. Decisioni da prendere (Francesco)
- Riaprire o no le "storie" sulla home pubblica (oggi scelta esplicita di no).
- Spostare la fascia istituzionale sotto la prima schermata.
- Collegare i canali social e approvare le automazioni (nessuna è attiva).
- Passare i punti app a scd-sviluppo e scd-grafica; la home pubblica è dell'area grafica (chat CLOUD).

## Fonti aperte
- https://www.sportcal.com/features/kings-league-why-is-it-so-popular-and-where-does-it-go-next/
- https://www.sportcal.com/features/kings-league-galvanizing-gen-z-to-global-expansion/
- https://uxdesign.cc/duolingo-analyzing-all-engagement-and-retention-techniques-3e73b79120cf
- https://runrepublic.com/latest/blogs/the-church-of-kudos-how-strava-conquered-the-world
- https://www.goal.com/en/news/fifa-player-ratings-explained-how-are-the-card-number--stats-decided/1hszd2fgr7wgf1n2b2yjdpgynu
- https://www.perfectiongeeks.com/blogs/fotmob-app-review
- https://app.mobicip.com/blog/snapchat-streaks-benefits-risks
- https://www.spond.com/news-and-blog/safeguarding-in-spond/
