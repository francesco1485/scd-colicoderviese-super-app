# SCD COLICODERVIESE DIGITAL ECOSYSTEM — COSTITUZIONE DI PROGETTO

## Perché è nata questa App
La Super App S.D.C. ColicoDerviese non nasce come semplice sito, vetrina o agenda. Nasce per unire in un unico ecosistema digitale:
1. gestione operativa della società;
2. servizi per famiglie, atleti, staff e direzione;
3. comunicazione pubblica e territoriale;
4. raccolta automatica e verificata delle informazioni sulla ColicoDerviese;
5. acquisizione nuovi tesserati e famiglie;
6. community/tifosi;
7. valorizzazione sponsor, partner, impianti, tornei e iniziative;
8. sviluppo di future fonti di ricavo;
9. tutela, segnalazioni e safeguarding;
10. evoluzione continua senza ricostruire il core.

## Architettura vincolante
- Google Drive/Sheets = fonte dati e archivio ufficiale.
- Apps Script R20 = backend operativo, ruoli, PIN, audit, permessi, calendari, staff, dati privati.
- GitHub = sorgente frontend.
- Render = frontend/PWA di produzione.
- Nessun provider a pagamento obbligatorio.
- Smartphone first.
- Dati interni modificabili solo da utenti autorizzati.
- Fonti esterne possono alimentare esclusivamente contenuti pubblici/aggregati e non possono cambiare pagamenti, ruoli, presenze, documenti, tesseramenti o safeguarding.

## Accesso
- Registrazione aperta: Nome, Cognome, Email, Telefono, privacy.
- Ogni nuovo profilo nasce UTENTE BASE.
- Solo DG/Direzione assegna successivamente ruolo e perimetro.
- Ruoli: Famiglia, Atleta, Mister, Staff, Dirigente, Segreteria, Tesseramenti, Tornei, Direzione e ulteriori ruoli configurabili.

## Pubblico
Priorità:
- prossima gara;
- ultimo risultato;
- variazioni ufficiali;
- news ufficiali;
- eventi/tornei con immagini e CTA;
- squadre/categorie;
- territorio;
- sponsor/partner;
- SCD Radar;
- iscrizioni;
- area tifosi;
- shop;
- card;
- biglietti;
- campi;
- proposte/idee.
Gli allenamenti NON sono contenuto prioritario pubblico e sono riservati ai profili interessati.

## Fonti
Fonte primaria: https://www.colicoderviese.it/
Fonti e canali verificati:
- Facebook: https://www.facebook.com/ColicoDerviese?locale=it_IT
- Instagram: https://www.instagram.com/s.c.d.colicoderviese/
- Tuttocampo: https://www.tuttocampo.it/
- CR Lombardia: https://www.crlombardia.it/
- FIGC / LND / SGS
- AC Monza / Insieme al Monza
- fonti web/news verificabili.
Squby (https://www.squby.it/funzionalita/) è benchmark funzionale, non fonte dati SCD.

## SCD Radar
Il Radar deve:
- cercare e raccogliere contenuti sulla ColicoDerviese;
- conservare fonte, URL originale, data, timestamp e stato verifica;
- deduplicare;
- assegnare trust score;
- non inventare dati;
- proporre priorità alla Home.

## Calendari e club graph
- Analizzare preventivamente calendari già pubblicati.
- DB CLUBS contiene società, alias, siti, social, città e loghi/fallback.
- Ogni match deve mostrare stemma avversario verificato quando disponibile.
- Fonte federale prevale sulle fonti secondarie nelle variazioni.
- Storico delle modifiche.

## Community
Area SCD Community:
- muro moderato;
- foto/storie dal territorio con approvazione;
- sondaggi;
- MVP se abilitato;
- quiz e badge;
- preferiti;
- pronostici NON monetari;
- Fantacalcio interno SCD + esterno/community, senza denaro/scommesse.

## Acquisition
CTA permanenti:
- Gioca con noi / pre-iscrizione / prova / Open Day;
- Diventa sponsor;
- Proponi prodotti o servizi;
- Iscrivi la tua squadra a un torneo;
- Affitta un campo;
- Richiedi biglietti;
- Richiedi Card SCD;
- Proponi idea/progetto;
- Invia notizia/foto;
- Contatti;
- Segnalazioni;
- Safeguarding.

## Commercial Engine
Predisporre:
- sponsor inventory;
- Main Partner / Team Partner / Digital Partner / Event Partner / Local Partner / Sponsor Tecnico;
- banner app;
- ticker sponsor;
- hero sponsorship;
- eventi/naming;
- LED;
- club house;
- divise;
- mascotte;
- aree giochi/fitness;
- shop;
- convenzioni/coupon;
- card;
- ticketing;
- tornei/camp;
- affitto impianti;
- statistiche impression/click/lead;
- CRM: NUOVO LEAD > CONTATTATO > INTERESSATO > PROPOSTA > NEGOZIAZIONE > CHIUSO/PERSO.
Nessun pagamento/provider va attivato senza decisione esplicita.

## Safeguarding
Separato da CRM, community e ticket ordinari.
Canale riservato.
PEC: calciocolicoderviese@pec.it
Oggetto: RISERVATO - SAFEGUARDING.
In emergenza/pericolo immediato: 112 / autorità competenti.

## Sky
Sky non è un elemento grafico dominante.
È un micro-assistente flottante:
- animazione idle discreta;
- alert contestuali;
- chatbot;
- FAQ;
- navigazione;
- eventi/iscrizioni;
- partite/risultati;
- contatti;
- sponsor;
- safeguarding solo come instradamento.
Rispetto di prefers-reduced-motion.

## Identità visiva
- logo SCD reale;
- blu profondo / royal blue / giallo SCD / bianco;
- fotografia Colico, lago, montagne, centro sportivo;
- affiliazioni LND, SGS 3° livello, Insieme al Monza;
- impatto da club/media platform, non template SaaS e non grafica infantile;
- le tavole approvate in conversazione sono il riferimento visivo.

## Regola di evoluzione
Nessuna nuova modifica deve tradire questa costituzione.
Ogni funzione deve dichiarare:
- pubblico/privato;
- audience;
- fonte dati;
- permessi;
- priorità;
- tracking;
- fallback;
- costo infrastrutturale.
