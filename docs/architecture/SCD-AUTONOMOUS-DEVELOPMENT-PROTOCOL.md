# SCD Autonomous Product Development Protocol

## Missione
Trasformare la piattaforma S.C.D. ColicoDerviese in un sistema digitale professionale, coerente e progressivamente automatizzato, mantenendo identita sportiva, territoriale e commerciale.

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
