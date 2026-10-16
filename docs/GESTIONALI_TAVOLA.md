# Tavola dei gestionali — SCD ColicoDerviese

Versione: 16/10/2026 · ramo `feat/pc-orchestra` · prodotta da `scd-azioni` per UD-160 (Francesco 08:53: «sono molti gestionali nel gestionale da creare secondo me e vanno ragionati bene»).

Stato del documento: **PROPOSED**. Nessun gestionale nuovo si costruisce prima di «ok tavola gestionali» (oppure delle correzioni di Francesco). Fanno eccezione solo i lavori già decisi (rotazione Dervio, scrittura di «Attività in struttura»), che restano su rami di lavoro senza pubblicazione.

## 0. Regole che valgono per tutti i gestionali

1. **Un solo sistema** (UD-010, UD-081, UD-082): ogni gestionale è una sezione della Super App sullo stesso database SCD PULSE e sullo stesso accesso; legge la sua fonte madre (foglio master, Drive, portale, database) e non tiene un secondo registro.
2. **Chi vede e chi fa lo decidono DG e Presidente nel gestionale** (UD-159), con i permessi per persona e per sezione (`scd_section_catalog`, r100) e i creatori di ruoli (r111). Il codice dà solo i valori iniziali.
3. **Agente alter ego** (UD-159): quando una responsabilità è assegnata a una persona, il suo agente `scd-*` lavora solo dentro i permessi di quella persona (stessa sezione, stesso perimetro: tutto / sue annate / sua sede / suoi figli / solo sé). Mai di più. L'agente prepara, la persona decide.
4. **Catena a cinque anelli** di `.claude/agents/PIPELINE.md` §3 (ingresso → responsabile → supporto → controllo → quadro generale).
5. **Mai in un gestionale**: dati di salute dei minori e safeguarding (sezioni `salute-minori` e `safeguarding` bloccate in r100), modifiche automatiche a pagamenti, ruoli, tesseramenti, presenze.

## 1. Fonti delle informazioni

- Route del codice: `apps/superapp/src/routes/` su `feat/pc-orchestra` (VERIFIED) e sui rami PC `feat/pc-planning-annuale`, `feat/pc-attivita-struttura`, `feat/pc-infermeria-nutrizione` (VERIFIED leggendo le loro cartelle di lavoro).
- Catalogo sezioni: `public.scd_section_catalog()` in `supabase/migrations/20261014_r100_person_grants.sql` (35 sezioni, VERIFIED; uguale a `config/scd-sections.v1.json`).
- Piattaforme e catene: `.claude/agents/PIPELINE.md` §3 (VERIFIED).
- Macchine M1–M25 (`claude/SCD_MACCHINE_v1.md`): **non disponibili** in questa sessione (niente strumento Progetti). Da incrociare.

Legenda: **Stato** ESISTE (su staging) / RAMO (solo su un ramo di lavoro) / PARZIALE / MANCA. **Motore** S = SOLDI, P = PERSONE, T = TEMPO. **Sforzo** S (≤ 1 giorno), M (2–4 giorni), L (≥ 1 settimana). **Chat** = area di competenza secondo AGENTS.md SCD:SESSIONI.

## 2. La tavola

| # | Gestionale | Scopo (una riga) | Fonte madre | Chi lo usa (sezione r100) | Agente alter ego | Dipende da | Stato | Motore | Sforzo | Chat |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| G01 | Quadro del gestionale (`/gestionale`, `/quadro`) | la giornata della Direzione: cosa c'è oggi, cosa aspetta | tutte le sezioni (sola lettura) | `quadro`, `direzione` | scd-regista | tutte | ESISTE | T | — | PC/CLOUD |
| G02 | Impianti e rotazione campi (`/gestionale/impianti*`, simulazione, approvazioni, `/quadro/rotazione-campi`) | chi usa quale campo e spogliatoio, richieste e approvazioni | Master Calendario, `config/scd-facilities.v1.json`, Comuni | `impianti-campi`, `mappa` | scd-impianti | G03 | ESISTE | T, P | — | CLOUD |
| G03 | **Rotazione gare Dervio** | dal 24/10 una gara giovanile in casa a settimana a Dervio, dalla più giovane; avviso alla squadra 14 giorni prima, a tutti 3 giorni prima; meteo 3 giorni prima; avviso al Comune; cambio campo a LND/SGS | Master Calendario + meteo + C.U. | `impianti-campi` (scrive), `segreteria` (legge) | scd-impianti (+ scd-figc-lnd, scd-segreteria) | G02, G08, G15 | **MANCA** (regola scritta in PIPELINE §3, nessuna pagina) | P, T | M | PC decide (UD-160), pagina impianti = CLOUD: serve accordo (sezione 5 di DIVISIONE_COMPITI) |
| G04 | Attività in struttura (`/gestionale/struttura`) | turni e attività nei centri di Colico e Dervio | r135 (APPLICATA) | `quadro` per sede; Dervio solo Direzione, Segreteria, Presidente, DG, Coordinatore, Resp. attività di base (UD-156) | scd-impianti | r111 per i lettori di Colico | RAMO, **senza scrittura** | T | M (scrittura + avviso Segreteria) | PC |
| G05 | Planning annuale (`/gestionale/planning`) | anno sportivo: gare, tornei, iniziative, scadenze SGS | Master Calendario, Cervellone, quote, SGS | `quadro` | scd-squadre | — | RAMO | T | — | PC |
| G06 | Infermeria (`/infermeria`) | certificati (sola lettura), kit, DAE; nessun registro infortuni | r136 (APPLICATA), registro certificati | `infermeria`, `certificati` | scd-infermeria | disegno consensi (UD-043/047) | RAMO | P | — | PC |
| G07 | Nutrizionista (`/nutrizionista`) | richieste RISERVATE alla nutrizionista e alla Direzione | r136 | `infermeria` | scd-infermeria | — | RAMO | P | — | PC |
| G08 | Segreteria e persone (`/segreteria`, `/segreteria/persone`, `/segreteria/certificati`) | anagrafica, iscrizioni, certificati, consensi | R20 / anagrafica, Tally, portale FIGC | `segreteria`, `persone`, `certificati` | scd-segreteria (+ scd-tesserati) | r132 | ESISTE | T, P | — | PC |
| G09 | Macchina delle richieste (`/segreteria/richieste`) | amichevoli oggi; poi tornei, pulmino, campo, visite con lo stesso schema | `scd_requests` (r133 STAGED), Master Calendario | `segreteria` + chi conferma per annata | scd-segreteria | «applica r133», ruoli DS | RAMO/STAGED | T, P | S per ogni nuovo tipo | PC |
| G10 | Storia calciatori FIGC (`/segreteria/storia`) | chi resta, torna, arriva, non torna | file esportato dal portale FIGC (r131 STAGED) | `segreteria`, `direzione` | scd-figc-lnd | «applica r131» | RAMO/STAGED | P | — | PC |
| G11 | Accessi e incarichi (`/direzione/accessi`, `/direzione/accessi/$personId`) | DG e Presidente danno a ogni persona sezioni, livello e perimetro; creano i ruoli | r100 + r111 | `accessi` (Direzione) | scd-azioni (nessun alter ego: è il motore degli alter ego) | «applica r111», r100 UNVERIFIED | PARZIALE | T | M | PC |
| G12 | Mister (`/gestionale/mister`, distinta, convocazioni) | convocazioni obbligatorie, presa visione / impedimento, distinta in bozza | calendario, rosa (R20) | `mister` (sue annate) | scd-squadre (+ scd-atleti) | — | ESISTE | T, P | — | PC/CLOUD |
| G13 | Organigramma (`/gestionale/organigramma`) | chi fa cosa: Dirigenza, Responsabili, Staff, struttura | foglio ORGANIGRAMMA SCD 2026/27 | `organigramma` | scd-segreteria | — | ESISTE | T | — | PC |
| G14 | **Rubrica «chi fa cosa»** per avvisi | da un argomento ai destinatari giusti (Iride, Calendar, richieste) | organigramma + registro del gestionale (mai indirizzi trovati nelle mail) | `organigramma` (lettura) | scd-google, scd-iride | G13, G11 | **MANCA** | T | S–M | PC |
| G15 | Comunicazioni (`/comunicazioni`) | avvisi del club, notifiche in app | r95 | `crea`, `coda` | scd-comunicazione | — | ESISTE | P | — | CLOUD |
| G16 | Coda lavori (`/gestionale/coda`) | proposte degli agenti da approvare | coda del gestionale | `coda` | scd-regista | — | ESISTE | T | — | CLOUD |
| G17 | Posta (`/gestionale/posta`, `/direzione/posta/collega`) | posta del club smistata, SCD_INTAKE_LOG | Gmail + Make | `posta` | scd-mail | — | ESISTE | T | — | PC |
| G18 | Tesoreria (`/tesoreria/*`: quote, movimenti, prima nota, compensi, fornitori, chiusura, calendario incassi) | soldi in entrata e in uscita, compensi mensili | banca, gestionale quote, fornitori | `tesoreria`, `quote`, `movimenti`, `compensi` | scd-tesoreria (+ scd-cfo, scd-rendicontazione) | — | ESISTE (fonti in parte da collegare) | S | — | PC |
| G19 | Magazzino e kit (`/magazzino`, `/kit`, `/tesoreria/magazzino`, `/shop`) | ordini kit, consegne, scorte | ordine kit, catalogo fornitore | `magazzino`, `magazzino-cassa` | scd-magazzino | — | PARZIALE | S | M | PC |
| G20 | Club House e biglietteria (`/tesoreria/club-house`, `/tesoreria/biglietteria`) | incassi bar e ingressi, ingresso gratis per tesserati e famiglia | cassa | `club-house`, `biglietteria` | scd-tesoreria | — | ESISTE | S | — | PC |
| G21 | Pulmini (`/pulmini`) | mezzi, autisti, giri, posti | Master Flotta | `pulmini` | scd-pulmini | — | ESISTE | T, P | — | CLOUD |
| G22 | Sponsor, CRM, LED (`/crm`, `/grow`, `/partner`, `/ledwall/player`) | partner, contratti, spot | CRM, contratti, spot | `crm`, `partner` | scd-commerciale (+ scd-sponsor, scd-ledwall) | — | ESISTE | S | — | CLOUD |
| G23 | Sostieni (Fondo, Adotta, donazioni, lotteria) | raccolte solidali | r101/r102 (STAGED) | `tesoreria`, `direzione` | scd-sociale | «applica r101/r102» | PARZIALE | S | — | CLOUD |
| G24 | Direzione (`/direzione`, acquisti, proposte, contenuti, Cervellone) | decisioni, acquisti, archivio del sapere | Cervellone, proposte | `direzione`, `acquisti`, `cervellone` | scd-azioni / scd-stratega | — | ESISTE | T | — | PC |
| G25 | **Scadenzario** | scadenze di documenti, certificati, patenti, mezzi, adempimenti federali e fiscali | registro certificati, Master Flotta, SGS/LND, Scadenzario Direzione ott-dic 2026 | `scadenzario` (sezione già nel catalogo) | scd-segreteria (+ scd-documenti) | G08, G21 | **MANCA** (sezione nel catalogo, nessuna pagina) | T | M | PC |
| G26 | **Presenze allenamenti** | presenze e assenze per annata (UD-040) | registro presenze (da decidere) | `mister` | scd-squadre | disegno + ok Direzione: tocca le presenze | **MANCA** | T, P | L | PC |
| G27 | Tornei ed eventi | iscrizioni, ospitalità, squadre ospiti | MASTER TORNEI 2026-2028 | da creare (oggi `crm`/`direzione`) | scd-tornei | G09 (stesso schema delle richieste) | PARZIALE (pagine pubbliche) | S, P | M | CLOUD (pubblico) / PC (iscrizioni) |
| G28 | **Bandi** | bandi aperti, scadenze, documenti, rendiconti | portali dei bandi, Drive | da creare (proposta: `direzione`) | scd-bandi (+ scd-rendicontazione) | G25 | **MANCA** | S | M | da assegnare |
| G29 | **Affitto campi** | richieste di terzi per usare i campi, prezzi, incassi | richieste in app, Comuni | `impianti-campi` + `tesoreria` | scd-impianti (+ scd-tesoreria) | G02, G09 | **MANCA** | S | M | CLOUD (impianti) |
| G30 | **Live e dirette** | gare riprese (Pixellot), YouTube, palinsesto | Pixellot, YouTube | da creare (`crea`) | scd-comunicazione | — | **MANCA** | P, S | L | CLOUD |
| G31 | **Attività serali** | uso serale dei centri (calcetto, eventi, corsi) | G04 | `quadro` per sede | scd-impianti | G04 | **MANCA** | S, P | M | PC |

Conteggio (su questa tavola): 31 gestionali — 17 ESISTE o PARZIALE, 6 solo su RAMO o STAGED (G04, G05, G06, G07, G09, G10), 8 MANCA (G03, G14, G25, G26, G28, G29, G30, G31).

## 3. Ordine di costruzione proposto per le prossime 2 settimane (16/10 – 30/10)

Criterio: prima ciò che ha una data vera (24/10), poi ciò che toglie ore a Segreteria e Direzione (TEMPO), poi ciò che apre gli alter ego, e solo dopo i gestionali nuovi da disegnare con Francesco.

| Ordine | Gestionale | Perché adesso | Si può partire senza nuova approvazione? | Ramo proposto | Proprietario | Scadenza |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | G03 Rotazione gare Dervio | prima gara il 24/10; avviso a tutti 3 giorni prima (21/10) e controllo meteo | **Sì** per logica pura + test + pagina interna in sola lettura (regole già decise da Francesco); avvisi solo come bozze; la pagina impianti è area CLOUD: scrivere la richiesta nella sezione 5 di DIVISIONE_COMPITI | `feat/pc-rotazione-dervio` | scd-impianti / scd-sviluppo | 21/10 |
| 2 | G04 Struttura: scrittura con avviso alla Segreteria | UD-156: ogni cambio a Dervio deve avvisare la Segreteria; oggi la pagina non scrive | **Sì** come codice + migrazione STAGED (serie r137-r149), senza applicarla | `feat/pc-struttura-scrittura` | scd-impianti / scd-sviluppo | 23/10 |
| 3 | G14 Rubrica «chi fa cosa» | serve a Iride (UD-155), al Calendar (UD-141) e alle richieste (UD-154) per avvisare le persone giuste | **Sì** per la logica pura (argomento → posizioni) e i test; destinatari reali solo dal registro, nessun invio | `feat/pc-chi-fa-cosa` | scd-google / scd-sviluppo | 24/10 |
| 4 | G11 Accessi e incarichi + alter ego | UD-159; apre la gestione dei lettori di Colico e degli agenti alter ego | **No**: serve «applica r111» (e verificare r100) | `feat/pc-alter-ego` | scd-azioni | 28/10 |
| 5 | G09 Richieste: tornei, pulmino, campo, visite | stesso schema delle amichevoli (UD-154) | **No**: serve «applica r133» | `feat/pc-richieste-tipi` | scd-segreteria | 30/10 |
| 6 | G25 Scadenzario | sezione già nel catalogo; certificati e mezzi scadono | disegno con Francesco (UD-160) | — | scd-segreteria | disegno entro 30/10 |
| 7 | G26 Presenze | tocca le presenze: solo disegno | disegno + ok Direzione | — | scd-squadre | disegno entro 30/10 |

Dopo le 2 settimane, da disegnare con Francesco: G28 Bandi, G29 Affitto campi, G31 Attività serali, G30 Live e dirette, G27 Tornei (iscrizioni).

## 4. Domande per Francesco (una riga ciascuna)

1. La rotazione gare Dervio (G03) la costruisce la chat PC (che ha la decisione) o la chat CLOUD (che ha gli impianti nell'app)? Proposta: logica e avvisi PC, pagina CLOUD.
2. Le squadre della rotazione a Dervio dal 24/10 sono «dalla 2021 alla Juniores» (PIPELINE §3) o solo quelle del piano precedente (Juniores U19 Élite, U16 Élite, Giovanissimi U15)? Da confermare sul Master Calendario.
3. Bandi (G28): chi è il responsabile umano su cui si modella l'agente `scd-bandi`?
4. Affitto campi (G29) e attività serali (G31): un solo gestionale o due?

## 5. Squadre (passo 3 dell'orchestra)

Questa sessione non aveva lo strumento per lanciare altri agenti né la shell per i controlli (tsc, vitest, build): **nessuna squadra è partita**. La sessione principale può lanciare subito, in parallelo, i lavori 1, 2 e 3 della sezione 3 con `scd-sviluppo` su rami `feat/pc-*` (codice + test, controlli verdi, poi `scd-revisore` e `scd-sicurezza`), senza pubblicare, senza applicare migrazioni, senza toccare Make, Tally o WhatsApp e senza messaggi a terzi.
