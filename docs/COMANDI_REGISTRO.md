# Registro comandi di Francesco (DG) — SCD ColicoDerviese

Versione: 16/10/2026 (dopo le 09:52) · ramo `feat/pc-orchestra` · prodotto da `scd-azioni` («orchestra: completare tutti i comandi chiesti»).

## 0. Come leggere questo registro

- **Fonte dei comandi**: `config/user-directives.v1.json` su `feat/pc-orchestra` @ `4ea86a6` (138 voci UD + 6 voci CMD del registro recuperato), più UD-156 letta dal ramo `feat/pc-attivita-struttura` (cartella di lavoro `wt-struttura`), più i comandi immediati della grammatica (sezione 3) e le decisioni di oggi riferite dalla sessione principale.
- **Stato**: FATTO (con prova) / IN CORSO / BLOCCATO da chi o cosa / NON INIZIATO / REGOLA ATTIVA (comando permanente: non si "chiude", si rispetta) / SUPERATO (sostituito da un comando successivo).
- **Etichette di verità**:
  - VERIFIED = controllato in questa sessione (file presente nel codice del ramo, riferimento git letto), oppure stato dichiarato dalla sessione principale il 16/10 (r135 e r136 applicate, nulla pubblicato, Tally privacy pubblicato 09:50, Iride v2 in applicazione da un altro agente, portali mappati, Ponte chat ogni 2 ore).
  - INFERRED = dedotto dallo stato scritto nel registro UD o in `RELEASE2_LOG.md`, non ricontrollato sul database o sul sito.
  - UNVERIFIED = non controllabile da qui.
- **Limiti di questa sessione (VERIFIED)**: nessuno strumento shell/git (niente `git fetch`, `git show`, commit o push), nessuno strumento Agent, Drive o Progetti. Quindi:
  - `origin/feat/cloud-agenti` (`a8253d4`) e `origin/feat/cloud-grafica`: riferimenti letti, **contenuto non leggibile**; le eventuali UD-139, UD-140, UD-142…UD-149 della chat CLOUD e UD-151, UD-152, UD-153 della chat PC **non sono nel registro di questo ramo** (UD-139 e UD-151/152/153 sono citate in `installa.tsx` e `.claude/agents/scd-tavola-esatta.md`). Da completare con `git fetch` + `git show origin/feat/cloud-agenti:config/user-directives.v1.json`.
  - Documenti di progetto `claude/` (DIVISIONE_COMPITI, RICHIESTE_CLOUD_A_PC, PC_AGGIORNAMENTO, PIANO_AVANZAMENTO, REQUISITI_MASTER, MAPPA_A_Z, MACCHINE): **non disponibili** in questa sessione.
  - Stato sul database SCD PULSE delle migrazioni diverse da r135/r136: UNVERIFIED.

## 1. Riepilogo (conteggio delle righe della sezione 4)

| Stato | Numero | Note |
| --- | --- | --- |
| FATTO | 49 | prova indicata riga per riga (VERIFIED dove c'è un file controllato, altrimenti INFERRED dal registro) |
| IN CORSO | 38 | |
| BLOCCATO | 11 | tutte e 11 aspettano Francesco (una frase «applica …», un'azione su GitHub o una scelta) |
| NON INIZIATO | 18 | soprattutto le "RECORDED_DESIGN_PENDING" dell'11/10 |
| REGOLA ATTIVA | 34 | comandi permanenti (28 UD + 6 CMD) |
| SUPERATO | 2 | UD-091, UD-026 |
| **Righe del registro** | **152** | 139 UD lette + 6 CMD + 7 decisioni/lavori del 15-16/10 senza numero UD |
| Non leggibili da qui | fino a 13 | UD-139, 140, 142…149, 151, 152, 153 |

## 2. Le frasi che servono a Francesco (in ordine di impatto)

| # | Frase da scrivere | Cosa sblocca | Comandi |
| --- | --- | --- | --- |
| 1 | «applica r111» | creatori di ruoli: DG e Presidente decidono chi vede e fa cosa nel gestionale; base dell'agente alter ego | UD-159, UD-156 (lettori Colico), UD-112 |
| 2 | «applica r133» | macchina delle richieste (amichevoli) attiva; serve anche creare i ruoli DS Agonistica e DS Generale nell'organigramma | UD-154, UD-155 (avvisi staff), UD-141 |
| 3 | «pubblica planning, struttura, infermeria» (quando vuole: oggi ha detto «non pubblicare ancora») | rami PC `feat/pc-planning-annuale`, `feat/pc-attivita-struttura`, `feat/pc-infermeria-nutrizione`, `feat/pc-orchestra` | UD-160, UD-156, UD-157 |
| 4 | «applica r131» e «applica r132» | storia calciatori FIGC sempre disponibile; consensi (Top 11 nome, opt-out e-mail, prese visione) | UD-150, UD-137 |
| 5 | «ok tavola gestionali» (oppure le correzioni) dopo aver letto `docs/GESTIONALI_TAVOLA.md` | autorizza la costruzione dei gestionali nell'ordine proposto | UD-160, UD-159 |
| 6 | «ok avvisi staff di Iride» dopo aver visto il disegno | Iride avvisa chi può rispondere o autorizzare | UD-155, UD-158 |
| 7 | azione su GitHub: creare il ruleset su `main`, `staging/superapp`, `data/calendar-public`, poi scrivere «ruleset fatto» | parte il calendario pubblico ogni ora | UD-138 |
| 8 | «applica r100» (se non già applicata: UNVERIFIED) | permessi per persona e per sezione | UD-112, UD-064 |
| 9 | «applica r101» / «applica r102» / «applica r103» / «applica r106» (area CLOUD) | Fondo e Adotta, lotteria interna, avatar del cast, stati degli spot | UD-113, UD-115, UD-114, UD-119 |
| 10 | scelte: «approvo l'immagine di …», «il Volto sponsor si chiama …», «le carte tifoso sono …» | immagini del cast, nome del volto sponsor, carte tifoso | UD-121, UD-122, UD-050 |

## 3. Comandi immediati (grammatica) — VERIFIED nei file del ramo

| Comando | Fonte | Effetto | Stato |
| --- | --- | --- | --- |
| «orchestra: <obiettivo>» | UD-157, `.claude/agents/PIPELINE.md` §4, `.claude/agents/scd-azioni.md` | stato reale, lavoro delle due chat, percorso, squadre, controlli, resoconto | FATTO su ramo `feat/pc-orchestra` (non su staging) |
| «applica rNNN» | AGENTS.md, divieti assoluti | unica via per applicare una migrazione | REGOLA ATTIVA |
| «pubblica» / «Pubblica sempre» | AGENTS.md SCD:SESSIONI §2 (14/10 19:53) | approvazione permanente per il lavoro con controlli verdi e doppio PASS; sospesa per i rami PC da UD-160 («non pubblicare ancora») | REGOLA ATTIVA, oggi sospesa per i rami PC |
| «PROCEDI» | AGENTS.md SCD:ARCHITECT | riprende un output interrotto al limite | REGOLA ATTIVA |
| `/credits` `/freefirst` `/nonprofit` `/trialgate` `/toolscore` `/skillreuse` `/creditbudget` `/sourcecheck` | AGENTS.md SCD:FREE-FIRST (UD-017) | controllo dei costi in locale, nessuna spesa | REGOLA ATTIVA |
| SCD:STATE / SCD:EXPERT / SCD:ARCHITECT / SCD:ASSET / SCD:MEMORY-RECOVER | AGENTS.md | passi obbligatori prima di scrivere | REGOLA ATTIVA |

## 4. Registro completo (dal più recente)

### 4.1 16/10/2026

| Id | Parole (brevi) | Chat | Stato | Prova | Prossima azione | Frase |
| --- | --- | --- | --- | --- | --- | --- |
| ORCH-0952 | «ora continuiamo a lavorare sui comandi chiesti con orchestratore» | PC | IN CORSO | questo file e `docs/GESTIONALI_TAVOLA.md` scritti (non ancora committati) | sessione principale: commit + push di `feat/pc-orchestra`; lancio squadre | — |
| UD-160 | «dervio 1 al momento - non pubblicare ancora - api verifica tu - sono molti gestionali … vanno ragionati bene» | PC | IN CORSO | tavola gestionali in `docs/GESTIONALI_TAVOLA.md` (VERIFIED, file nuovo); «API»: non identificata da qui (UNVERIFIED) | Francesco legge la tavola; la chat verifica di quale API si tratta | «ok tavola gestionali» |
| UD-159 | «le attività le decido nel gestionale io e il presidente … l'agente … diventa alter ego di quel responsabile» | PC | BLOCCATO da r111 | registro: RECORDED_DESIGN_PENDING | dopo r111: incarichi assegnati nel gestionale; agenti `scd-*` limitati ai permessi della persona | «applica r111» |
| UD-158 | «ok Iride - orari allenamenti pubblici» | PC | IN CORSO | Iride v2 in applicazione da altro agente (VERIFIED dalla sessione principale); orari pubblici decisi | agente Iride chiude v2; orari allenamenti pubblici nell'app (solo squadra, giorni, ora, campo) | — |
| UD-157 | «porta il lavoro dell'altra chat qui … rendiamo a tutti come comando immediato» | PC | FATTO su ramo | `.claude/agents/PIPELINE.md` §4 su `feat/pc-orchestra` @ 4ea86a6 (VERIFIED) | unire a staging quando Francesco dice di pubblicare | «pubblica orchestra» |
| UD-156 | «Applica r135» · «Dervio decido io e responsabile attività di base e coordinatore … segreteria sempre informata» | PC | IN CORSO | r135 APPLICATA (VERIFIED); pagina su `feat/pc-attivita-struttura`; nessuna funzione di scrittura | funzione di scrittura con avviso in app alla Segreteria (nuova migrazione STAGED nella serie r137-r149) | poi «applica r1xx» |
| UD-141 | «chi gestisce il Google calendar … avvisare chi deve saperlo … sempre il direttore generale» | CLOUD (Google) + PC (Iride) | IN CORSO | `.claude/agents/scd-google.md`, PIPELINE §5 (VERIFIED) | primo giro con invitati rivisto da scd-revisore; rubrica «chi fa cosa» | conferma in chat per ogni invito |
| — (09:50) | modifiche privacy Tally | PC | FATTO | pubblicato 09:50 (VERIFIED dalla sessione principale) | — | — |
| — (Dervio) | rotazione gare Dervio dal 24/10, dalla più giovane, 1 gara a settimana | PC/CLOUD | IN CORSO | regola in PIPELINE §3 (VERIFIED); nessuna pagina dedicata trovata nel codice | costruire il pianificatore (tavola gestionali, n. 1) | — |
| — (portali) | mappare i portali | PC | FATTO | manuali in Drive `SCD_AGENTI_LAVORO/01_MANUALI_AGENTI` (VERIFIED dalla sessione principale) | — | — |
| — (Ponte) | ponte tra le chat ogni 2 ore | PC | FATTO | attività programmata (VERIFIED dalla sessione principale) | — | — |
| — (r136) | infermeria, kit, DAE, nutrizionista | PC | IN CORSO | r136 APPLICATA (VERIFIED); pagine su `feat/pc-infermeria-nutrizione` | pubblicare quando Francesco lo dice | «pubblica infermeria» |

### 4.2 15/10/2026

| Id | Parole (brevi) | Chat | Stato | Prova | Prossima azione | Frase |
| --- | --- | --- | --- | --- | --- | --- |
| UD-155 | «segreteria chatbot a tutti gli effetti … h24» · Iride · eccezione AGENTS.md | PC | IN CORSO | `automations/make/segreteria-ai/system-prompt.it.md` (VERIFIED); WhatsApp attivo; mail, telefono, rubrica e avvisi staff in attesa | disegno avvisi staff da mostrare; rubrica «da verificare» | «ok avvisi staff di Iride» |
| UD-154 | amichevole: messaggio → bozza → conferma entro 15 gg → modulo FIGC | PC | BLOCCATO da r133 + ruoli DS | `apps/superapp/src/lib/request-machine.ts` (VERIFIED); r133 STAGED | dopo «applica r133»: creare i ruoli DS Agonistica/Generale | «applica r133» |
| UD-150 | «storia dei calciatori … rendilo disponibile sempre in super app» | PC | BLOCCATO da r131 | `apps/superapp/src/lib/figc-history.ts`, route `/segreteria/storia` (VERIFIED) | — | «applica r131» |
| — (r132) | consensi | PC | BLOCCATO da r132 | `supabase/migrations/20261015_r132_consents_fix.sql` (VERIFIED) | — | «applica r132» |
| UD-138 | «Sì, subito e ogni ora» · «Copia nel repository» | CLOUD | BLOCCATO da ruleset GitHub | `apps/superapp/src/lib/calendar-mirror.ts` (VERIFIED) | Francesco crea il ruleset | «ruleset fatto» |
| UD-137 | «Lascia votare tutti» | CLOUD | FATTO (in attesa di pubblicazione) | registro: DONE_PENDING_PUBLISH | — | — |
| UD-136 | link di riferimento = ricerca e sviluppo | CLOUD | IN CORSO | `share-match.ts`, `club-pulse.ts` (VERIFIED) | azioni del piano in 20 punti | — |
| UD-135 | template home di riferimento, niente sovrapposizioni | CLOUD | FATTO (ramo integ) | registro | — | — |
| UD-134 | coriandoli se si vince, no storie, un solo assistente | CLOUD | FATTO | `components/home/WinConfetti.tsx` (VERIFIED); carte rosa solo soci | — | — |
| UD-133 | «manca il fattore wau … iscrizione veloce … chiedi accesso dedicato» | CLOUD (home) + PC (accesso) | IN CORSO | registro senza stato; parti di accesso nei rami PC `feat/accesso-semplice`, `feat/pc-accesso-email` | pagina «wow» dopo l'ingresso; richiesta di accesso dedicato | — |
| UD-132 | «Adotta un seggiolino e lotteria … interni» | CLOUD | FATTO | `apps/superapp/src/lib/internal-initiatives.ts` (VERIFIED) | — | — |
| UD-122 | «lo chef si chiama Garrison - il mentore Enea» | CLOUD | FATTO (in parte superata da UD-134) | registro | nome del Volto sponsor | «il Volto sponsor si chiama …» |
| UD-121 | una sola assistente (poi Iride, 15/10 18:40) | CLOUD | IN CORSO | `apps/superapp/src/lib/cast-personas.ts` (VERIFIED); passaggio Vera → Iride nell'app di competenza CLOUD (UD-139) | immagine e voce | «approvo l'immagine di Iride nell'app» |

### 4.3 14/10/2026

| Id | Parole (brevi) | Chat | Stato | Prova | Prossima azione | Frase |
| --- | --- | --- | --- | --- | --- | --- |
| UD-131 | «No nessun messaggio … quei video e spot devono girare» | CLOUD | FATTO | `apps/superapp/src/lib/spot-schedule.ts` (VERIFIED) | — | — |
| UD-130 | pianta 2D dei pulmini sotto gli allenamenti | CLOUD | FATTO | `apps/superapp/src/lib/van-plan.ts` (VERIFIED); posti DA CONFERMARE nel Master Flotta | Segreteria conferma targhe e posti | — |
| UD-120 | «registrazione classica … tel o mail e pass e basta» | PC | IN CORSO | `apps/superapp/src/lib/signup.ts` (VERIFIED); r105 sul database UNVERIFIED | verificare r104/r105 sul database | «applica r105» se non applicata |
| UD-119 | spot LED in app, non via mail | CLOUD | FATTO (registro stati r106 STAGED) | `apps/superapp/src/lib/sponsor-spots.ts` (VERIFIED) | registro stati spot dopo r106 | «applica r106» |
| UD-117 | «un solo modo di ingresso … ricordami … assistenza» | PC | IN CORSO | `apps/superapp/src/lib/signup.ts` (VERIFIED); r104 UNVERIFIED | — | «applica r104» se non applicata |
| UD-116 | home: ciò che conta, piè di pagina ridotto | CLOUD | FATTO | `apps/superapp/src/lib/home-today.ts` (VERIFIED) | — | — |
| UD-115 | lotteria per il campetto della parrocchia | CLOUD | BLOCCATO da r102 | registro | resta interna (UD-132) | «applica r102» |
| UD-114 | avatar del cast, guide d'area | CLOUD | BLOCCATO da r103 | registro | — | «applica r103» |
| UD-113 | Fondo solidale, Adotta, donazioni, proposte | CLOUD | BLOCCATO da r101 | registro | — | «applica r101» |
| UD-112 | permessi per persona, il ruolo è solo descrizione | PC/Direzione | BLOCCATO da r100 (UNVERIFIED se già applicata) | `apps/superapp/src/lib/person-grants.ts` (VERIFIED) | verificare se r100 è applicata | «applica r100» |
| UD-111 | ruoli del cast corretti e nuovi ruoli | CLOUD | FATTO su ramo (in parte superato da UD-121) | registro | — | — |

### 4.4 13/10/2026

| Id | Parole (brevi) | Chat | Stato | Prova | Prossima azione |
| --- | --- | --- | --- | --- | --- |
| UD-110 | vetrina e palinsesto della home | CLOUD | FATTO su ramo (ridotto da UD-134 e «niente vetrine») | registro | — |
| UD-109 | kit partner nel gestionale sponsor | CLOUD | FATTO su ramo | registro | — |
| UD-108 | nomi dei passeggeri sotto gli allenamenti | CLOUD | FATTO su ramo | registro | — |
| UD-107 | LED wall con tutti i partner a rotazione | CLOUD | FATTO su ramo | registro | — |
| UD-106 | badge interni e facsimile LED | CLOUD | FATTO su ramo (facsimile tolto il 15/10) | RELEASE2_LOG | — |
| UD-105 | sala di controllo «Excelsior» | CLOUD | FATTO su ramo | registro | — |
| UD-104 | assistenti AI reali Crovi/Era | CLOUD | IN CORSO (flag spento) | registro | decisione Direzione |
| UD-103 | Cervellone completo e veloce | PC | IN CORSO | registro | catalogo Drive/posta |
| UD-102 | avatar da foto o testo, carte socio | CLOUD | IN CORSO | registro | — |
| UD-101 | hub comunicazioni del club | CLOUD | IN CORSO | route `/comunicazioni` presente | — |
| UD-100 | pubblico creativo e commerciale, squadre dentro | tutte | REGOLA ATTIVA | — | — |
| UD-099 | la convocazione è obbligatoria, non RSVP | tutte | REGOLA ATTIVA | registro DELIVERED | — |
| UD-098 | stemma del club in pubblico, avversari veri, sempre online | tutte | IN CORSO | registro | — |
| UD-097 | agenti di ruolo e skill | tutte | FATTO | `.claude/agents/` (VERIFIED) | — |
| UD-096 | postura esperta multidisciplinare | tutte | REGOLA ATTIVA | — | — |
| UD-095 | la home è la tavola madre | CLOUD | FATTO | registro DELIVERED | — |
| UD-094 | Top 11, premi, giochi, media | CLOUD | IN CORSO | route `/top11` presente | — |

### 4.5 12/10/2026

| Id | Parole (brevi) | Chat | Stato | Prova | Prossima azione |
| --- | --- | --- | --- | --- | --- |
| UD-093 | moderazione automatica, non manuale | CLOUD | FATTO (INFERRED: migrazione r87 presente) | file migrazione | — |
| UD-092 | assistenti 3D e voce più avanti | CLOUD | NON INIZIATO (rinviato) | — | — |
| UD-091 | cast Era/Genny/Acanfora | CLOUD | SUPERATO da UD-121/UD-155 | — | — |
| UD-090 | niente concorsi a premi, coupon partner, live amatoriali gratis | tutte | REGOLA ATTIVA | — | — |
| UD-089 | social feed dell'app, prima SCD | CLOUD | IN CORSO (INFERRED: r86/r88) | file migrazione | — |
| UD-088 | la tavola madre a sei app è l'aspetto | tutte | REGOLA ATTIVA | — | — |
| UD-087 | un link di iscrizione con accesso base | PC | FATTO (INFERRED: r85) | file migrazione | — |
| UD-086 | torre delle decisioni organizzative | PC | IN CORSO | — | — |
| UD-085 | documenti per pubblico, CRM dedicati, WhatsApp | PC/CLOUD | IN CORSO (INFERRED: r81) | — | — |
| UD-084 | trenta web app integrate e base macchine | tutte | IN CORSO | tavola gestionali | — |
| UD-083 | motore vivo con scrittura tra le fonti | PC | IN CORSO | — | — |
| UD-082 | un master per dominio, Pilota in archivio | tutte | REGOLA ATTIVA | — | — |
| UD-081 | una sola identità Supabase–R20 | tutte | REGOLA ATTIVA | — | — |
| UD-080 | tutto nella super app, link dedicati | tutte | REGOLA ATTIVA | — | — |
| UD-079 | ingresso gratis per tesserati e famiglia | CLOUD | FATTO (INFERRED) | route `/tesoreria/biglietteria` presente | — |
| UD-078 | quattro porte: lavoro, associazione, tifosi | tutte | REGOLA ATTIVA | — | — |
| UD-077 | catalogo completo Drive e posta (Cervellone) | PC | IN CORSO | route `/direzione/cervellone` presente | — |
| UD-076 | operazioni, ruoli, documenti, quote, kit, fisco | PC | IN CORSO | route tesoreria presenti | — |
| UD-075 | ciclo mensile dei compensi | PC | IN CORSO (INFERRED: r75) | route `/tesoreria/compensi` presente | — |
| UD-074 | recuperare il lavoro esistente, non riscrivere | tutte | REGOLA ATTIVA | — | — |
| UD-073 | aspetto «universo», niente mascotte eroe | CLOUD | FATTO (staging) | registro | — |
| UD-072 | crediti d'autore | tutte | FATTO | registro DONE | — |
| UD-071 | app negli store e indirizzo fisso | PC | IN CORSO | `docs/play-store/` presente | percorso Play Store v1 |

### 4.6 11/10/2026

| Id | Parole (brevi) | Stato | Prova / prossima azione |
| --- | --- | --- | --- |
| UD-070 | preparazione lancio ufficiale | IN CORSO | — |
| UD-069 | distinta in bozza nell'app | FATTO (staging) | r70 |
| UD-068 | convocazione diversa dalla distinta | FATTO in parte; distinta: decisione aperta | Francesco decide sulla distinta |
| UD-067 | ritiro convocazione dallo staff | FATTO (staging) | r68 |
| UD-066 | notifiche telefono per convocazioni | FATTO (staging) | r67 |
| UD-065 | registro certificati della segreteria | FATTO (staging) | route `/segreteria/certificati` presente |
| UD-064 | amministrazione accessi personalizzati | FATTO (staging) | route `/direzione/accessi` presente |
| UD-063 | auto-iscrizione con approvazione ufficio | FATTO (staging) | r64 |
| UD-062 | convocazioni con «Ci sarò» | FATTO (staging) | r62 |
| UD-061 | modulo iscrizione atleta = fonte famiglia | FATTO in parte | — |
| UD-060 | coordinatore sportivo Tuttorosa | FATTO | r61_1 |
| UD-059 | transizione presenza web e Golee | NON INIZIATO (registrato) | — |
| UD-058 | canale ufficiale e contributi per ruolo | NON INIZIATO (registrato in Torre v8) | — |
| UD-057 | proporzioni mobile-first | IN CORSO (home ok, altre pagine da rivedere) | — |
| UD-056 | libreria prompt CRM e smistamento | IN CORSO | — |
| UD-055 | meteo, mappa, biglietteria della gara in casa | FATTO (staging) | — |
| UD-054 | gestionale persone, profilo del direttore | BLOCCATO da r59 (UNVERIFIED se già applicata) | verificare sul database |
| UD-053 | documenti del club in sola lettura | FATTO (staging) | route `/documenti` presente |
| UD-052 | catalogo kit 2026/27 | FATTO (staging) | route `/kit` presente |
| UD-051 | regole servizio pulmini 05/10 | FATTO (staging) | — |
| UD-050 | carte tifoso a tre livelli | BLOCCATO da una scelta di Francesco (WAITING_FOR_INPUT) | «le carte tifoso sono …» |
| UD-049 | barra iniziative per i soci | FATTO (staging) | — |
| UD-048 | lavanderia kit allenamento | FATTO (staging) | — |
| UD-047 | rubrica dottoressa e prezzi infermeria | FATTO in parte | infermeria r136 |
| UD-046 | omini staff presenti, tocco sulla rosa | FATTO in parte | contatti dopo l'«ascensore identità» |
| UD-045 | tutti chiedono via modulo o chat | IN CORSO (motore su staging) | macchina richieste r133 |
| UD-044 | pulizie e lavanderia | IN CORSO (motore) | — |
| UD-043 | infermeria, salute, nutrizione, prenotazioni | IN CORSO | r136 applicata; nessun registro infortuni senza il disegno dei consensi |
| UD-042 | convocazioni e distinta | NON INIZIATO (parte coperta da UD-062/069) | — |
| UD-041 | richieste di variazione alla segreteria | NON INIZIATO, poi coperto da UD-154 | — |
| UD-040 | ruoli, presenze, disciplina | NON INIZIATO (tocca le presenze: serve disegno + ok) | tavola gestionali |
| UD-039 | pulmini: giri feriali e modifiche del responsabile | FATTO in parte | — |
| UD-038 | pianificazione annuale delle iniziative | IN CORSO | `/gestionale/planning` su ramo PC |
| UD-037 | benvenuto e inviti sponsor | NON INIZIATO | CLOUD |
| UD-036 | formazioni a distanza in diretta | NON INIZIATO | — |
| UD-035 | reazioni live di Sky | NON INIZIATO (Sky fuori dall'app: UD-151/153) | — |
| UD-034 | prima logica e criteri | REGOLA ATTIVA | — |
| UD-033 | promemoria scadenze documenti | NON INIZIATO | tavola gestionali (scadenzario) |
| UD-032 | richieste locandine Club House e segreteria | NON INIZIATO | — |
| UD-031 | ritmo editoriale settimanale | NON INIZIATO | — |
| UD-030 | podcast del mercoledì | NON INIZIATO | — |
| UD-029 | resoconto gara di Sky, digest settimanale | NON INIZIATO | — |
| UD-028 | avatar da sé e foto gara | NON INIZIATO | — |
| UD-027 | home prima l'identità | FATTO (staging) | — |
| UD-026 | Crovi idolo realistico in chat | SUPERATO (UD-121/134/155) | — |
| UD-025 | home più gare e stemmi avversari | FATTO (INFERRED) | `config/scd-opponent-crests.v1.json` |
| UD-024 | organigramma sportivo, terzo livello SGS | IN CORSO | route `/gestionale/organigramma` presente |
| UD-023 | amichevole o torneo → moduli obbligatori | IN CORSO (via UD-154) | r133 |
| UD-022 | CRM società dei tornei, moduli evento | NON INIZIATO | CLOUD |
| UD-021 | partner oltre il LED | IN CORSO | CLOUD |
| UD-020 | anagrafe territoriale aziende ed enti | NON INIZIATO | CLOUD |
| UD-019 | demo LED e portfolio nel gestionale | FATTO | CLOUD |
| UD-018 | passato e presente prima del futuro | REGOLA ATTIVA | — |

### 4.7 01–10/10/2026 (comandi fondativi)

| Id | Parole (brevi) | Stato |
| --- | --- | --- |
| UD-017 | prima gratis: crediti, prove, non profit | REGOLA ATTIVA |
| UD-016 | fonte di verità operativa e controllo continuo dal 01/07/2026 | REGOLA ATTIVA |
| UD-015 | identità grafica e territorio su tutte le pagine | REGOLA ATTIVA |
| UD-014 | agenti precisi con continuità verificata | REGOLA ATTIVA |
| UD-013 | 3D, automazioni, Sky dopo la base visiva | NON INIZIATO (in coda) |
| UD-012 | Drive e Canva memoria permanente | REGOLA ATTIVA |
| UD-011 | prima la grafica | REGOLA ATTIVA |
| UD-010 | niente doppioni, niente realtà finta | REGOLA ATTIVA |
| UD-009 | continuazione autonoma sicura | REGOLA ATTIVA |
| UD-008 | un codice: web, PWA, nativo | REGOLA ATTIVA |
| UD-007 | prove, non dichiarazioni | REGOLA ATTIVA |
| UD-006 | recupero asset della libreria interna | REGOLA ATTIVA |
| UD-005 | evoluzione visiva e funzionale di tutte le app | REGOLA ATTIVA |
| UD-004 | confronto con prodotti internazionali | REGOLA ATTIVA |
| UD-003 | intelligenza multidisciplinare | REGOLA ATTIVA |
| UD-002 | ciclo di realizzazione completo | REGOLA ATTIVA |
| UD-001 | vision-to-code senior principal | REGOLA ATTIVA |
| CMD-20260928-0717, CMD-20260928-0719, CMD-20260928-1708, CMD-20260930-0832, CMD-20261001-2022, CMD-20261009-VISUAL-DNA | prompt fondativi recuperati | REGOLA ATTIVA (incorporati in AGENTS.md) |

### 4.8 Voci non leggibili da questa sessione

| Id | Dove si trovano (INFERRED) | Cosa serve |
| --- | --- | --- |
| UD-139 | rami CLOUD (`feat/cloud-no-sky-chat`, `feat/cloud-agenti`): Iride nell'app, avatar | `git show origin/feat/cloud-agenti:config/user-directives.v1.json` |
| UD-140, UD-142…UD-149 | rami CLOUD (se esistono) | idem |
| UD-151, UD-152, UD-153 | rami PC: Sky fuori dall'app, niente vetrine, Crovi di benvenuto (citate in `.claude/agents/scd-tavola-esatta.md`) | unire nel registro di `feat/pc-orchestra` |

## 5. Prossimo passo per la sessione principale

1. `git fetch` e lettura delle UD mancanti dai rami CLOUD; aggiornare la sezione 4.8 e il riepilogo.
2. `git add docs/COMANDI_REGISTRO.md docs/GESTIONALI_TAVOLA.md`, commit e `git push origin feat/pc-orchestra` (questa sessione non ha shell).
3. Creare i documenti Google «REGISTRO COMANDI SCD» e «TAVOLA GESTIONALI SCD» in `00_STATO_SISTEMA` (id 1HQgxWPWfbjnIO2vN6QiOI1rQrMKmlhgt), controllando prima i titoli (questa sessione non ha Drive).
