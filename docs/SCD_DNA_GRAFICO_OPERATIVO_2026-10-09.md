# SCD COLICODERVIESE — DNA GRAFICO, ORGANIZZATIVO E OPERATIVO
**Data del comando:** 2026-10-09 | **Committente:** Direzione SCD | **Stato:** `USER_COMMAND / MANDATO PERSISTENTE`.

> Questo documento NON e' un secondo database o un nuovo manifest: e' l'appendice di recupero dei comandi espliciti della Direzione e il contratto operativo per gli agenti. Il **solo manifest normativo runtime** resta `SCD_SYSTEM_MANIFEST.json`. I comandi sono indicizzati in `config/user-directives.v1.json`, le tavole in `config/scd-visual-references.v1.json`, gli asset ufficiali in `config/scd-assets.v1.json`, la conoscenza condivisa nel catalogo Drive `SCD_INTAKE_LOG`.

## 1. Visione della Direzione: NON reinterpretare
1. **Priorita' assoluta: grafica.** Ricerca, analisi, confronto con le immagini fornite, ricostruzione del design system completo, schermate singole, mobile e desktop; SOLO DOPO la componente dinamica, codice completo, funzioni e motore AI. Non e' sufficiente cambiare CSS o generare poster.
2. **Fedelta' visiva.** Le tavole fotografiche e le immagini consegnate dalla Direzione sono il target visivo da cui costruire UI effettivamente interattiva. Ricreare la composizione sportiva/editoriale dei pannelli: blu SCD, giallo, bianco, pennellate, panorama Lario e montagne, tifo, grafica dinamica, stemma SCD e mascotte Sky ufficiali, interni di schermata chiari e leggibili, testate blu, card funzionali, navigazione persistente. Non una generica UI SaaS; non copiare poster come sfondo statico o limitarsi a modifiche di colore.
3. **Schermate madre:** HOME PUBBLICA, CALENDARIO LIVE, AREA ATLETA, AREA FAMIGLIA, AREA STAFF/DIREZIONE, COMUNICAZIONI. Ogni schermata deve essere completa negli stati vuoto, caricato, errore, mobile, desktop e nei flussi interattivi.
4. **Tre prodotti coordinati, non tre copie:** SCD ONE / UNIVERSE SOCIAL (pubblico, community, media, news, eventi), SCD CORE / GESTIONALE (atleti, famiglie, tecnici, documenti, direzione, con autentica autorizzazione), SCD GROW / SPONSOR (partner, proposte, eventi, CRM). Stesso stemma, Sky, linguaggio visuale, continuita' fra le esperienze; nessuna quarta app o secondo backend R20.
5. **Ordine futuro:** design e grafiche COMPLETE -> UI responsive costruita -> animazioni, interazioni, transizioni e 2D/3D/AR quando utili -> indicizzazione/automazione (anche domotica/IoT soltanto dopo censimento dispositivi e autorizzazione) -> memoria, conoscenza e motore cognitivo Sky basati su dati verificati e permessi reali. Le fasi devono essere progettate per interoperare sin dall'inizio.
6. **Non ricreare asset autentici.** Drive, Canva e Ufficio Stampa conservano loghi, Sky, foto, sponsor, divise e fonti storiche: cercare e riutilizzare, non inventare. Generare solo elementi originali davvero mancanti. Sponsor nel prodotto solo se `CONFIRMED` o `ACTIVE`, media minori solo con consenso e privacy; niente informazioni demo travestite da dati live.
7. **La qualita' e' verificabile nel browser.** Per ogni vertical slice: pixel/composition review rispetto alle tavole originali, visual QA desktop e smartphone, test browser su interazione reale, contrasto, accessibilita', motion reduction, screenshot e confronto; niente annunci di completamento senza prove.
8. **Esecuzione multidisciplinare precisa.** Ogni agente/skill/plugin riceve comando autonomo specifico con input, fonte, output, criteri di accettazione, test, limitazioni, rollback, un unico proprietario d'integrazione. Non promettere lavoro in background continuo senza task schedulato vero; non inventare progresso.

## 2. Fonti e memoria canonica dal 2026 in poi
- **Drive proprietario:** sportclubcolico@gmail.com, `04_MEDIA_GRAFICA` e struttura standard `01_AMMINISTRAZIONE_FISCO`, `02_SEGRETERIA_SPORTIVA`, `03_LOGISTICA_CAMPI`, `04_MEDIA_GRAFICA`, `05_COMUNICAZIONE_SOCIAL`.
- **Drive condivisi:** cercare *Il mio Drive*, *Condivisi con me*, cartelle condivise visibili al ruolo, piu' account ufficiali Ufficio Stampa SCD e Tornei SCD. Non assumere che la sola root Home contenga tutto.
- **Fotografia:** Ufficio Stampa contiene archivi fotografici squadre, partite, attività di base, prima squadra, matchday, territorio, Sky, drone. Asset ufficiali e diritti vanno verificati prima del riuso. Anno operativo base **2026/27 e successivi**; materiale precedente consultabile come storico, NON sostituzione automatica.
- **Canva:** cartelle SCD loghi, mascotte, sponsor, tornei, social, biglietteria; verificare asset reali, scarti e sponsor non attivi; mantenere il sorgente modificabile quando disponibile.
- **Catalogo conoscenza unico:** `SCD_INTAKE_LOG` Google Sheet `1ruGLKpFYdirMV6NvOHWoCsSxy3f7Yd9VMfCykuQrmgY`, bootstrappato da Google Doc `GLOBAL KNOWLEDGE ROUTER` ID `1iV-eHQCsLrde2ubKwHZwNFgABBQxLBVCDKou2zNW6Bc`. Prima di compiti complessi: `REFERENCE_URLS`, `KNOWLEDGE_ITEMS`, `IDEA_BANK`, `GLOBAL_IMPROVEMENTS`, `REVIEW_QUEUE`; fonte, versione, stato epistemico, timestamp, deduplica. Nessun catalogo parallelo.
- **Dati riservati:** applicare il principio *least privilege* sulle ACL Drive e sull'app; non copiare documenti personali/sanitari/minori nella memoria pubblica Sky. Metadati/indici possono essere generali solo se non rivelano informazioni private; safeguarding isolato.
- **Repo ufficiale:** `francesco1485/scd-colicoderviese-super-app` con manifest, PR e CI; vecchia UI e vecchi file non definiscono il nuovo look se contraddicono le istruzioni del 2026-10-09.

## 3. Tavole fornite dalla Direzione il 2026-10-09
Riferimenti allegati nella chat originaria, indicizzati analiticamente in `config/scd-visual-references.v1.json`; la sola registrazione dell'ID del file NON ne copia i byte nel repository o su Drive:
- `SCD_TAVOLA_MADRE_SEI_APP(1).png`: tavola madre 6 schermate da riprodurre, **riferimento visuale primario**.
- `01_HOME_PUBBLICA(1).png`; `02_CALENDARIO_LIVE(1).png`; `03_AREA_ATLETA(1).png`; `04_AREA_FAMIGLIA(1).png`; `05_AREA_STAFF(1).png`; `06_COMUNICAZIONI(1).png`: sei viste verticali, composizione/UI di riferimento.
- `Poster cinematografico dell'app S.C.D. Colicoderviese(1).png`, `Ecosistema SCD ColicoDerviese_ sport, persone e territorio.png`, `Identità sportiva tra lago e montagne(1).png`: visual identity, mondo sportivo/territoriale e coerenza tre piattaforme.
- `image-gen-1(20261008-125622)(1).png`, `image-gen-2(20261008-125627)(1).png`, `image-gen-3(20261008-125632)(1).png`: tavole di area/esperienza.
**Importante:** queste tavole sono `USER_SUPPLIED_VISUAL_TARGET`, non prove di sponsor, persone, date, statistiche o di approvazione del runtime. L'asset ufficiale deve sempre provenire dal catalogo `config/scd-assets.v1.json`.

## 4. Sequenza da assegnare agli agenti
**DESIGN_RESEARCH (READ ONLY):** inventario Drive + Condivisi con me + Ufficio Stampa + Canva; verifica asset e foto autorizzate; analisi dello stile delle tavole senza sostituirlo; output registro `KEEP_LOCKED / KEEP_ENHANCE / REBUILD_IMPROVE / RESEARCH_REAL_ASSET / GENERATE_ORIGINAL`; zero scritture, zero pubblicazioni.
**FRONTEND_VISION_TO_CODE:** implementare prima sei viste reali + nav mobile + layout desktop coerente. Riutilizzare componenti/endpoint validi senza pareti di card generiche. Dati demo sempre marcati `DEMO_NOT_RUNTIME`; screenshot di confronto responsive. Output: commit su branch isolato, test, URL staging, stato chiaro.
**QA_VISUAL:** controllare vista originale vs implementata a 390x844, 1440x900, 1920x1080; ispezionare navigazione, stati, overlay, Keyboard/Escape, leggibilità, overflow, loghi ufficiali. Non rilasciare con build o test failing.
**DATA_SECURITY (READ ONLY):** verificare integrazione R20/Drive/Supabase, ACL, pubblicazione foto, media minori, sponsor approvati, audit. Non modificare dati/permessi.
**INTEGRATION_OWNER:** confrontare outputs contro manifest, aggiornare indici/versioni/rollback, mantenere 3 app coordinate, mai produzione senza gate.
**SKY_ENGINE (PHASE SUCCESSIVA):** fonte-per-fonte, per ruolo, citazioni, provenance e status; niente finta AI collegata.

## 5. Stato verificato e ostacoli al checkpoint
- Repo `francesco1485/scd-colicoderviese-super-app`; MAIN_SHA `b30669d85051d880ecac99e92199a3bb73e20c33` (VERIFIED).
- PR di collaudo `#150`, branch `feat/content-first-three-app-integration-20261008`, draft NON merged; head `42f7ae8651521bee5ca5bdf42d18f29dad684554` prima di questo checkpoint (VERIFIED).
- CI sull'head pre-checkpoint: 3 GitHub workflow `SUCCESS` (VERIFIED); non prova l'adeguatezza grafica.
- Render staging `scd-content-first-stage-20261008`: servizio online, deploy `dep-db402tks728c73fesq7g` `LIVE` sul vecchio SHA `8aa4c12f25965d39e34b254d435c77a0d0bb6431` (VERIFIED), non allineato all'head GitHub. Auto deploy off.
- GitHub Pages runtime: UNVERIFIED (accesso API di Pages bloccato da tool); working tree locale GitHub: NOT_AVAILABLE (solo connector).
- Manifest `3.27.3` prima di checkpoint. R20 privato operativo + permessi reali non verificati in questa sessione. Nessun merge o deploy produzione autorizzato.
- Lovable visual lab `SCD Command Center` progetto `5c6eac53-092e-4a6d-a7fe-54d82d6369ad`, route `/vision-2026` creata dall'agente al commit `f5032e93e558f71d829403d80cc9f905b7386172` ma **BUILD FAIL** (piu' errori TS in UI condivisa e tests); il comando di correzione e' stato respinto per **workspace credits exhausted** il 2026-10-09. NON dichiarare preview pronta o test passati. Sviluppo alternativo GitHub/branch + CI possibile senza dipendenza Lovable.
- Fonti Drive/Canva gia' parzialmente censite, catalogo Google Sheet raggiungibile; inventario globale foto e assensi NON concluso.

## 6. Dati di collaudo/di esempio e sicurezza
Niente nome di atleta, punteggio, gara, pagamento, cartella minori, sponsor o foto inventati; non divulgare credenziali o segreti. Separare design preview e applicazione con autorizzazione reale. Mai modificare produzione, permission, safeguarding o dati sensibili in autonomia.

## 7. Checkpoint e ripresa
Nuova chat o nuovo agente deve iniziare da: `AGENTS.md` -> `SCD_SYSTEM_MANIFEST.json` -> `config/user-directives.v1.json` -> `config/scd-visual-references.v1.json` -> `config/scd-assets.v1.json` -> questo documento -> `SCD_INTAKE_LOG` -> stato PR/CI/deploy. Prima safe action: correggere BUILD del prototipo Lovable o portare su GitHub un equivalente verificabile senza duplicate runtime; poi revisionare le sei schermate rispetto alle immagini, non altre locandine.
