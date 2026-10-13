# GOOGLE PLAY — SCD COLICODERVIESE

Aggiornato: 13/10/2026. La web app è già online; l'app Play Store è la stessa web app in una "Trusted Web Activity"
(TWA): stesse pagine, stesso account, nessun secondo sistema da mantenere.

## Prima di iniziare (decisioni della Direzione)
1. **Dominio definitivo.** L'app Play Store resta legata all'indirizzo con cui viene creata. Oggi l'indirizzo è
   provvisorio (`scd-superapp-staging.onrender.com`). Conviene collegare prima il dominio del club; cambiarlo dopo
   vuol dire aggiornare l'app e ripassare la revisione.
2. **Account sviluppatore Google Play intestato alla società** (quota una tantum di 25 $). Con un account
   *organizzazione* (serve il numero D-U-N-S) di norma non c'è l'obbligo del test chiuso; con un account *personale*
   nuovo Google chiede un test chiuso con almeno 12 tester per 14 giorni prima della produzione. Da verificare in
   Play Console al momento della registrazione.
3. **Chiave di firma.** La gestisce Play App Signing; la società conserva la chiave di caricamento. Nessuna chiave va
   messa nel repository o in chat.

## Identità applicazione
- Nome: **S.C.D. ColicoDerviese**
- Package ID: **it.colicoderviese.app**
- Versione iniziale: **1.0.0** · version code **1**
- Categoria: **Sport**
- Lingua predefinita: **Italiano (Italia)**
- Supporto: **sportclubcolico@gmail.com**
- Sito: **https://www.colicoderviese.it/**
- Privacy: pagina `/privacy` della web app (sul dominio definitivo)

## Descrizione breve (max 80 caratteri)
L'app della ColicoDerviese: partite, allenamenti, convocazioni e vita del club.

## Descrizione completa
L'app ufficiale della S.C.D. ColicoDerviese, la società di calcio di Colico e Dervio sull'Alto Lago di Como.

Nata per organizzare il club e unire famiglie, atleti e tifosi in un solo posto:
- prossima gara, calendario e allenamenti di tutte le squadre, dalla Prima Squadra ai Piccoli Amici;
- convocazioni con conferma, per atleti e famiglie;
- pagina di ogni squadra da seguire, con notizie e foto approvate;
- Fantacalcio SCD e Top 11 della settimana, gratuiti e senza premi in denaro;
- rassegna stampa "Dicono di noi";
- area famiglia, area atleta e area staff, abilitate dalla società sullo stesso account;
- sponsor e partner del territorio.

Tutela dei ragazzi prima di tutto: i minorenni compaiono solo con nome e iniziale, le foto vengono ripulite dai dati
di posizione, per l'attività di base non ci sono classifiche individuali, le aree riservate si aprono solo con
l'accesso abilitato dalla segreteria.

## Classificazione contenuti e pubblico
- Contenuti adatti a tutti, **dai 6 anni** (decisione della Direzione, 12/10/2026). Nel questionario IARC: nessuna
  violenza, nessun linguaggio volgare, nessun gioco d'azzardo, nessun acquisto; interazione tra utenti con
  moderazione automatica (post e foto).
- Se nel "Pubblico di destinazione" si includono fasce sotto i 13 anni, valgono le regole Google Play per le
  Famiglie: nessuna pubblicità, nessun SDK di tracciamento, dati minimi. La web app oggi non ha pubblicità né
  statistiche di terze parti; da confermare in Play Console all'invio.
- Sotto i 14 anni l'accesso passa dall'account della famiglia (età del consenso digitale in Italia: 14 anni).

## Sicurezza dei dati (Data Safety) — bozza da ricontrollare in Play Console
- **Raccolti:** nome, cognome, data di nascita, e-mail, telefono (registrazione, verificata dalla segreteria);
  foto e testi solo se l'utente pubblica un post.
- **Uso:** funzionamento dell'account e dei servizi del club. Nessuna pubblicità, nessuna vendita di dati.
- **Condivisione:** nessuna con terze parti a fini commerciali.
- **Sicurezza:** connessioni HTTPS; foto ripulite dai metadati EXIF; accesso con link via e-mail, niente password.
- **Cancellazione account:** su richiesta alla segreteria. Google chiede anche una pagina web per la richiesta di
  cancellazione: da pubblicare sul dominio definitivo prima dell'invio.

## Materiale grafico
- Icona 512×512: `apps/superapp/public/icon-512.png` (stemma ufficiale)
- Icona adattiva: `apps/superapp/public/icon-maskable-512.png`
- Feature graphic 1024×500: da ricavare dalla copertina della presentazione (stemma, COLICODERVIESE, Lario, Sky).
- Screenshot telefono: home, calendario, squadra, Fantacalcio, Top 11 (dalla web app pubblicata).

## Costruzione del pacchetto (quando ci sono account e dominio)
1. Sul dominio definitivo impostare in Render `SCD_SITE_URL` e, dopo la firma, `SCD_ANDROID_PACKAGE=it.colicoderviese.app`
   e `SCD_ANDROID_SHA256=<impronta della chiave di firma>`: la web app pubblica da sola `/.well-known/assetlinks.json`.
2. Generare l'AAB TWA dal manifest della web app (Bubblewrap o PWABuilder) con package `it.colicoderviese.app`.
3. Caricare l'AAB in test interno e controllare che l'app si apra senza barra del browser (segno che assetlinks è ok).
4. Compilare scheda, classificazione, pubblico, Data Safety; inviare in revisione.

## Checklist Play Console
- [ ] Dominio definitivo collegato alla web app
- [ ] Account sviluppatore Google Play della società verificato
- [ ] App creata con package `it.colicoderviese.app`
- [ ] Play App Signing attivo, impronta SHA-256 impostata su Render
- [ ] AAB TWA caricato in test interno e verificato
- [ ] Scheda Store completata (testi sopra)
- [ ] Feature graphic e screenshot
- [ ] Privacy policy e pagina cancellazione account sul dominio definitivo
- [ ] Data Safety
- [ ] Classificazione contenuti (IARC)
- [ ] Pubblico di destinazione e regole Famiglie
- [ ] Dichiarazione pubblicità: nessuna
- [ ] Test chiuso, se richiesto dal tipo di account
- [ ] Richiesta accesso Produzione
