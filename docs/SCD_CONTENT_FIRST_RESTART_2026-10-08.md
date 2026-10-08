# SCD COLICODERVIESE | ORDINE OPERATIVO: RIPARTENZA CONTENT-FIRST
Data direttiva: 8 ottobre 2026. Autorità: Direzione SCD. Stato: USER_COMMAND, progetto contenuti e codice conservati; grafiche Visual Lab respinte.

## 0. COMANDO ATTUALE E SUPERCESSIONE

La Direzione ha rifiutato le anteprime grafiche Render/Visual Lab del 8 ottobre 2026: una locandina o demo HTML con tre schede non costituisce tre web app reali.

**SUPERSEDED / REJECTED:**
- utilizzare "scd-ecosistema-visual-lab-anteprima" come prova di web app completata;
- usare le nuove tavole AI, la mascotte stampata in rettangolo o il layout "IL CLUB SI VIVE" come approvazione grafica;
- confondere tre tab o tre landing con tre prodotti autonomi;
- proclamare "live", "AI collegata", "gestionale funzionante" senza prova di interazioni reali end-to-end;
- ulteriori deploy grafici non esplicitamente approvati.

**MANTENERE:**
- asset ufficiali originali, foto/kit autentici e loro catalogo; non eliminare i loghi veri, la mascotte originale, il codice o le immagini caricate dal committente;
- repository, fonti, progetti e contenuti, PR e commit come storico recuperabile;
- motori funzionanti, login e autorizzazione R20, database/Supabase, Google Workspace, calendari, integrazioni, test, API, notifiche, automazioni, sicurezza e dati;
- decisione: prima pagina pubblica SOLO SCD Universe; Gestionale soltanto dopo autenticazione e scope autorizzato;
- aspirazione futura per **UN'UNICA identità visiva esplosiva, sportiva e grintosa**, condivisa da tre prodotti, da ridisegnare e approvare SOLO dopo un censimento funzionale.

## 1. FONTE DI VERITÀ

Repository: `francesco1485/scd-colicoderviese-super-app`.
Manifest normativo: `SCD_SYSTEM_MANIFEST.json`.
Comandi utente: `config/user-directives.v1.json`.
Asset certificati: `config/scd-assets.v1.json`.
Riferimenti visuali: `config/scd-visual-references.v1.json` (REFERENCE_BOARD non significa APPROVED).
Scopo di questo documento: handoff e inventario di recupero. Non autorizza modifiche alla produzione, né sostituisce il manifest.

**Tre web app reali, una identità e un unico set di motori:**

| Denominazione visibile | Identificativo canonico | Scopo |
|---|---|---|
| SCD Universe Social | SCD ONE | Pubblico, comunità, partite, news, calendario, media, servizi |
| SCD Sponsor | SCD GROW | Opportunità e CRM di sviluppo sponsor/partner, con aree riservate quando necessarie |
| SCD Gestionale | SCD CORE | Operatività societaria riservata: atleti, famiglie, tecnici, segreteria, amministrazione, Direzione |

Non inventare una quarta app. Desktop e mobile sono canali responsive delle stesse web app. PWA, Android e iOS sono destinazioni di distribuzione successive, non copie separate.

## 2. SCD UNIVERSE SOCIAL / SCD ONE (PUBBLICO)

**Home / ingresso**: prima schermata utile immediata e non brochure: settimana corrente (lunedì-domenica, tutte le annate), ricerca pubblica, prossima gara confermata, eventi, notizie verificate, accessi rapidi. Mostrare `DATO_IN_AGGIORNAMENTO` se manca una fonte vera.

**Calendario live**: gare, allenamenti, amichevoli, tornei, open day, camp, variazioni federali; filtri categoria, annata, squadra, data, sede; ogni evento ha `EVENT_ID` unico e proiezioni pubbliche o riservate in base al contesto. LND/FIGC/CRL con provenienza e data di verifica, Tuttocampo secondario quando affidabile.

**Squadre / settore giovanile**: Prima Squadra, Juniores, Under 18, Under 16, attività di base, altre categorie e annate solo secondo organigramma e dati 2026/27 verificati. Programmazione settimanale, luoghi, risultati e classifiche senza valori inventati. Loghi avversari solo verificati.

**News / Media / Social**: Newsroom AI con redazione e revisione, fonti strutturate, SCD Facebook/Instagram/TikTok/YouTube/sito, video Pixellot solo con accesso autorizzato; citare testate esterne senza pubblicare materiali non autorizzati. Privacy immagini minori e consensi specifici. Feed club, community, sondaggi, eventi e condivisioni soltanto con backend reale, moderazione e tutele minori.

**Coinvolgimento**: tesseramento/interesse al Club, fan e sostenitori, card e benefici verificati, sponsor ufficiali e territorio Colico/Dervio/Alto Lario, shop e servizi solo se effettivamente disponibili. Mascotte Sky come assistente contestuale, non un grande poster promozionale.

**Prova minima**: pubblico apre la Home; seleziona squadra; vede gara/evento dal record autorizzato con timestamp; filtra calendario; apre articolo validato; ogni comando restituisce un esito reale o errore spiegato.

## 3. SCD SPONSOR / SCD GROW (COMMERCIALE)

**Pubblico**: identità partnership, proposta di valore per imprese, contatti, aree pubblicitarie realmente disponibili, club house/tendostruttura, LED bordo campo, banner, divise, eventi e tornei, area giochi/fitness, progetti di inclusione, sponsorizzazioni social, valorizzazione del territorio e del turismo.

**Proposte da conservare nello storico, MA NON rappresentare come contratti firmati**:
- BCC 2026/27: proposta €7.000 e fondo solidale/borsa €2.500; torneo intitolato alla banca, previsto 9 maggio 2027, annata 2019, 16 squadre, ospitalità, musica e territorio; branding dehor/club house e mascotte;
- Noratech: scenari triennali proposti (1.500/1.000/1.000 euro, con variante 1.500/1.500/1.000); U16 Élite, divisa e successiva presenza LED/social, con vincoli su rinnovo e uso delle mute;
- tornei del Lago e turismo di due giornate, LED, sponsor kit, branding tribuna/area stampa/palestra e migliorie sportive, proposte a banche e imprese.
Sono **requisiti/proposte commerciali**, importi e disponibilità da ricontrollare prima di qualsiasi offerta esterna.

**Area operativa commerciale**: CRM unificato, azienda/contatti/leads consentiti, pipeline e fasi, pacchetti/asset, disponibilità spazi, proposte personalizzate, contratti e scadenze, rinnovi, campagne, sopralluoghi, eventi, materiali ufficiali, deliverable, fatture e pagamenti con permessi, reporting realmente misurato, storico interazioni, dossier sponsor, gestione loghi ufficiali e consensi. Un unico contatto/azienda fra Gmail, CRM e Gestionale, non duplicazioni.

**Prova minima**: richiesta di contatto -> scheda CRM tracciabile -> proposta in bozza -> revisione umana -> approvazione/invio autorizzato -> calendario scadenza -> registrazione risultato. Nessun invio automatico commerciale senza approvazione, nessuna metrica fittizia.

## 4. SCD GESTIONALE / SCD CORE (RISERVATO)

**Accesso**: un account, ruoli multipli e scope; registrazione come `USER_BASE`; elevazione ruoli solo Direzione, R20 resta primario salvo migrazione verificata. Vietato esporre anagrafiche, contabilità, tesserati o profili di minori nella Home pubblica.

**Atleta**: area personale, squadra/stagione, calendario, convocazioni, presenze ammesse, certificato medico e scadenze, documenti, quote, kit, trasporto autorizzato, comunicazioni. **Famiglia**: figli collegati per relazione autorizzata, quote, documenti, tesseramenti, certificati, attività, convocazioni, logistica, comunicazioni, consenso privacy; multi-figlio senza accesso ai figli altrui.

**Staff e tecnici**: ruoli per squadra/stagione, sedute, convocazioni, presenze, distinte e amichevoli/tornei, report, messaggi autorizzati, logistica campi e pulmini, strumenti sportivi. Coordinamento 2026/27 secondo organigramma reale; niente assegnazioni di permessi da file grezzi.

**Segreteria sportiva**: tesseramenti FIGC/LND/SGS, attestazioni/NOIF, distinte, svincoli, certificati, scadenze documentali, archivi consensi; import da fonti ufficiali con controllo umano e audit. **Amministrazione**: bilanci, RASD, riforma sport, contratti, collaboratori/volontari, preventivi, pagamenti, fornitori, sponsor, fatture e scadenze secondo ruolo.

**Direzione**: un centro operativo con dati reali verificati (squadre, personale, staff, strutture, eventi, richieste, comunicazioni, rischi/alert, CRM, sponsor e finanza); Radar bandi e territorio Colico/Dervio, RASD e aggiornamenti FIGC/LND, classifiche e dati incrociati solo con fonti e date tracciate. Conservare i lavori recuperabili nelle PR #144 (Radar) e #145 (Direzione) come codice in revisione, non come funzioni pubblicate.

**Operazioni trasversali**: unica agenda degli eventi e assegnazioni, campi, bus, spogliatoi, magazzino, kit; un documento con ID, hash, provenienza, ruoli, scadenza, versioni. Gmail come sensore comunicazioni; Drive come archivio ufficiale; Google Calendar proiezione sincronizzata; modalità richiesta e autorizzazione prima di qualsiasi mutazione critica.

**Safeguarding**: area e flussi completamente isolati da messaggistica ordinaria, CRM, analytics, community e chatbot; tutela minori, accessi auditabili, consensi.

**Prova minima**: accesso R20 con account test autorizzato -> ruolo/scopo verificato server-side -> operazione limitata al record autorizzato -> audit -> aggiornamento visibile dal medesimo record; tentativo non autorizzato negato.

## 5. UN SOLO SKY, MA UTILE E SICURO

Un solo assistente SCD condiviso tra le 3 app (stessa identità/logica e motore, contestualizzato per dominio e ruolo), con navigazione, FAQ ufficiali, stato eventi, informazioni iscrizioni, contatti e sponsor. Lato privato può leggere soltanto informazioni autorizzate e giustificate dal ruolo/scopo e dal consenso. Richieste di safeguarding soltanto instradate verso il canale separato.

Non chiamare chatbot AI una sequenza di frasi preprogrammate; non esporre dati personali nel client o nel prompt; nessuna risposta inventata sui risultati o pagamenti. Log, opt-in e metriche rispettano privacy.

## 6. FONTI, INTEGRAZIONI E ARCHIVIO

Back office: `sportclubcolico@gmail.com` e Google Workspace. Struttura cartelle obbligatoria:

```
01_AMMINISTRAZIONE_FISCO
02_SEGRETERIA_SPORTIVA
03_LOGISTICA_CAMPI
04_MEDIA_GRAFICA
05_COMUNICAZIONE_SOCIAL
```

Relazioni canoniche: Gmail -> classificazione -> proposte azione -> revisione -> Drive catalogato -> evento/CRM/ruolo -> Calendar -> vista pertinente; niente automazioni che elevano privilegi. Distinguere `SOURCE`, `SOURCE_UPDATED_AT`, `SYNC_AT`, `TRUST`, `STATUS`, `REVIEW`. LND e SGS istituzionali primari; fonti secondarie esplicitamente marcate; non fare scraping non autorizzato. Nessuna foto di minore pubblicata senza autorizzazione.

## 7. ASSET DA CONSERVARE, NON DA USARE COME FALSA WEB APP

Stemmi SCD, FIGC/LND/SGS, AC Monza (dove pertinente e legittimo), Sky originale, maglie ufficiali 2026/27 (home bianco/blu, away blu, portiere giallo, alternativa arancio), motivi Lario montagne/lago e monogramma C, file e documenti approvati. Conservarli nell'archivio `04_MEDIA_GRAFICA` e nel registro repository dove già presenti. Non dedurre approvazione delle ultime tavole AI; nessun asset inventato sostituisce un originale.

La Direzione ha espresso desiderio di identità unica **grintosa, esplosiva, riconoscibile** per tutte le tre piattaforme, ma ha *respinto la specifica resa attuale*. La futura UI dovrà essere progettata su interazioni reali e approvata prima di qualsiasi esposizione pubblica.

## 8. INVENTARIO DI IMPLEMENTAZIONE (EVIDENZA, NON PROMESSE)

- `main` verificato all'8/10/2026: `b30669d85051d880ecac99e92199a3bb73e20c33`; manifest `3.27.0`; `index.html` per Universe e `sponsor/index.html` per Sponsor, oltre a server/API, test e file di governance; non implica tutte le funzioni live.
- PR #142: Visual Lab, **GRAFICA RESPINTA** dall'utente. Non fare merge grafico. Da conservare solo per la storia e per l'eventuale recupero verificato di funzioni/test, dopo confronto.
- PR #144: Radar Dirigenza, Draft, dipende dalla branch PR #142: isolare e valutare la logica/connettori dati senza trascinare la grafica respinta.
- PR #145: Home Direzione / read model, Draft, dipende da #144: stesso criterio.
- Render account società: unico servizio `scd-ecosistema-visual-lab-anteprima`, ID `srv-db3qohgm7kps73fngd4g`, statico, solo grafica/demo, **DA ELIMINARE**.
- Render personale: 24 servizi censiti, inclusi front-end, API, anteprime e servizi di altri progetti. **NON CANCELLARE IN MASSA**: il loro codice, ruolo e uso attuale vanno classificati prima per non danneggiare dati e servizi esistenti.
- Render plugin attuale non include il comando Delete Service. Stato cancellazione: **NON ESEGUITA / AZIONE DASHBOARD O CLI NECESSARIA**.

## 9. ORDINE ESECUTIVO, SENZA ULTERIORI LOCANDINE

**P0 - Stop pubblicazioni grafiche**: registrare bocciatura e chiudere il percorso verso il runtime da PR #142. Ritirare Render Visual Lab senza cancellare codice.
**P1 - Inventario recupero**: documentare i servizi effettivi, endpoint, provider, database, flussi, proprietari dei dati, permessi, test e feature flags per ciascuna delle 3 app; classificare `LIVE_VERIFIED`, `STAGED`, `CONTRACT_ONLY`, `MISSING` o `BLOCKED`.
**P2 - One critical slice per app**: ONE settimana/calendario live da fonte attendibile; GROW richiesta lead -> CRM -> bozza proposta; CORE login R20 -> ruolo -> una attività realistica con audit. Lavorare prima su dati/backend e poi sulle viste di servizio.
**P3 - Sky con funzionamento reale**: una shell contestuale, integrazione dati/permessi certificata, fallback e audit. Niente fake AI.
**P4 - Collaudo**: test funzionali end-to-end, source trust, RLS/R20, tutela minori, accessibilità, responsive 360/390/393/430/820/1280/1440/1920, performance e rollback.
**P5 - UX da approvare**: nuove componenti solo a funzionalità collaudata; identità unica, contenuti e azioni reali, feedback da utenti SCD; nessun merge/deploy prima dei gate espliciti.
**P6 - Rilascio per fasi**: ambienti distinti produzione/staging, snapshot e versioni leggibili, nessuna modifica critica automatica.

Ogni avanzamento deve riportare: `COMMIT`, `PR`, `CI`, `ENDPOINT_VERIFICATO`, `RUOLO/SCOPE`, `DATO_FONTE`, `EVIDENZA_FUNZIONALE`, `BLOCCO`, `PROSSIMO_PASSO`. **Mai attribuire a una pagina statica il completamento di un workflow.**

## 10. COMANDO PER RIPRENDERE IN QUALSIASI CONVERSAZIONE

> Riprendi SCD ColicoDerviese in modalità CONTENT-FIRST usando `docs/SCD_CONTENT_FIRST_RESTART_2026-10-08.md`, `AGENTS.md`, `SCD_SYSTEM_MANIFEST.json`, `config/user-directives.v1.json` e tutti i contratti esistenti. La Direzione ha RESPINTO le grafiche Visual Lab / Render del 08-10-2026: nessuna è approvata. Recupera i requisiti e le funzioni vere delle tre web app SCD ONE/Universe Social, SCD GROW/Sponsor, SCD CORE/Gestionale; preserva R20, Supabase, Drive, Gmail, Calendar, staff, dati, tesseramenti, safeguarding e Sky condiviso. Inizia con SCD:STATE verificato, inventario tecnico e tre vertical slice end-to-end (una per app). Committa solo lavoro sicuro in PR separate, esegui test, non inventare contenuti o dati, non generare locandine/mockup, non effettuare merge/deploy senza mia approvazione. Fornisci solo link funzionanti a software verificato e un report sintetico fatto/non fatto con prove.
