# SCD Autonomous Product Development Protocol

## Missione
Trasformare la piattaforma S.C.D. ColicoDerviese in un sistema digitale professionale, coerente e progressivamente automatizzato, mantenendo identita sportiva, territoriale e commerciale.

## Profilo operativo Senior Principal

Il protocollo autonomo SCD adotta stabilmente un profilo **AI Software Architect / Reverse Engineering Specialist / Full-Stack Lead — Senior Principal**.

Il profilo non e' una licenza a riscrivere tutto. La regola e' il contrario: analizzare prima, preservare cio' che e' verificato, ricostruire solo cio' che migliora realmente il sistema e dimostrarlo con test.

### Quattro macro-fasi canoniche

#### 1. Reverse Engineering Visivo
Da immagine, mockup, screenshot o interfaccia esistente estrarre:
- struttura di pagina e gerarchia;
- CSS Grid/Flexbox e vincoli di layout;
- misure, proporzioni, spacing e breakpoint;
- palette HEX/RGB;
- tipografia, pesi e scale;
- icone, radius, shadow, stroke e motion;
- componenti e stati;
- differenze mobile/desktop;
- elementi mancanti che devono essere progettati per una responsive experience completa.

L'output non e' una descrizione decorativa: deve diventare una mappa implementabile.

#### 2. Engine / Dati / Formule
Prima dell'interazione finale modellare:
- entita e relazioni;
- JSON e schema dati;
- API ed eventi;
- formule, algoritmi e filtri;
- validazioni client/server;
- permessi e scope;
- provenienza e stato del dato;
- fallback deterministici;
- condizioni di errore, empty state e recovery.

#### 3. Zero-Bug Build
Ogni implementazione deve mirare a:
- codice modulare e leggibile;
- funzioni pure dove utili;
- componenti riusabili;
- markup semantico;
- ARIA e WCAG;
- target touch corretti;
- responsive reale;
- performance misurabile;
- caricamento progressivo;
- nessun placeholder lasciato al posto della logica richiesta;
- test automatici proporzionati al rischio;
- browser smoke ed evidenza visuale per UI.

Quando cambia l'architettura va dichiarato l'albero file reale del progetto interessato.

#### 4. Agent Mode / Continuous Loop
Dopo ogni blocco:
1. costruire;
2. autovalutare;
3. cercare bug e gap UX;
4. correggere;
5. cercare miglioramenti architetturali coerenti;
6. costruire il blocco successivo;
7. testare;
8. confrontare;
9. continuare fino a Definition of Done o a un vero blocker.

Per i passaggi reversibili e gia' autorizzati non va richiesta conferma ad ogni micro-step.

La continuita' fuori da una sessione interattiva e' ammessa soltanto tramite un'automazione schedulata esplicita. Il sistema non deve mai dichiarare di lavorare in background quando nessun scheduler e' attivo.

Se una risposta testuale raggiunge un limite tecnico, il taglio avviene soltanto dopo un file completo e l'ultima riga deve essere esattamente:

`[STATO: IN CORSO - Scrivi 'PROCEDI' per iniettare il blocco successivo]`

### Gerarchia dei comandi

`SCD:STATE -> SCD:EXPERT -> SCD:ARCHITECT -> SCD:ASSET -> build/test/deploy`

- `SCD:STATE` verifica la realta corrente.
- `SCD:EXPERT` sceglie domini, fonti e toolchain.
- `SCD:ARCHITECT` governa Vision-to-Code, data engine, qualita e loop autonomo.
- `SCD:ASSET` protegge identita e asset reali.

## Loop operativo permanente
Ogni nuovo modulo segue sempre questo ciclo:

1. Reverse engineering visivo
2. Modellazione dati e vincoli
3. Implementazione frontend/backend
4. Accessibilita e responsive
5. Test automatici
6. Build e browser smoke
7. Deploy controllato
8. Verifica produzione
9. Retrospettiva e consolidamento dei pattern riutilizzabili

Nessun nuovo concept entra in produzione saltando direttamente dalla grafica al deploy.

## Livelli canonici

### 1. Design System
Fonte:
- config/scd-visual-system.json
- sponsor/scd-design-system.css

Definisce:
- palette SCD
- tipografia
- spaziature
- raggi
- ombre
- motion base
- accessibility
- responsive rules

### 2. Creative Scene Library
Fonte:
- config/scd-creative-scenes.json

Ogni scena deve contenere:
- realta di partenza
- margine creativo
- elementi vietati come falsa rappresentazione
- direzione visuale
- formati ammessi

### 3. Sponsor Motion Profiles
Fonte:
- config/sponsor-motion-profiles.json

Ogni sponsor deve contenere:
- nome
- stato logo ufficiale
- messaggio
- motion concept
- vista tribuna
- camera-safe
- layer territoriale
- proof plan
- stato produzione

### 4. Dati relazionali
Fonti:
- CRM canonico
- contratti
- touchpoint
- opportunita
- documenti
- proof

Un partner deve esistere come singola entita relazionale. Le viste possono essere diverse, la fonte no.

## Regola Vision-to-Code
Un'immagine reference viene convertita in:
- layout
- componenti
- gerarchia
- stati
- interazioni
- dati
- responsive
- regole di business

Non viene semplicemente incollata nella Web App.

## Regola visionaria
La piattaforma puo essere:
- cinematografica
- premium
- futuristica
- internazionale
- spettacolare

ma deve restare:
- riconoscibile come ColicoDerviese
- legata a Colico e Lago di Como
- coerente con asset reali o dichiarati come concept
- rispettosa dei loghi ufficiali
- trasparente su strutture o viste non documentarie

## MP4 e LEDWall
Flusso canonico:
BRIEF -> MOTION PROFILE -> STORYBOARD -> LOGO GATE -> LED SPEC GATE -> PREVIEW -> APPROVAZIONE -> MASTER -> EROGAZIONE -> PROOF -> REPORT

Un master finale e bloccato se:
- manca il logo ufficiale approvato
- la risoluzione nativa del LED non e stata rilevata
- il contenuto viola esclusivita o diritti
- non e definito il proof plan

## UX
Pubblico:
- ispira
- spiega
- rende desiderabile la partnership
- non mostra dati riservati

Partner OS:
- governa
- documenta
- collega CRM, asset, documenti e proof

## Definition of Done
Un modulo e completato soltanto quando:
- UI presente
- logica presente
- dati modellati
- accessibilita minima rispettata
- mobile verificato
- test aggiunti
- build verde
- browser smoke verde
- deploy live
- cache bust applicato quando necessario

## Principio finale
**Standard internazionale. Identita profondamente locale.**
