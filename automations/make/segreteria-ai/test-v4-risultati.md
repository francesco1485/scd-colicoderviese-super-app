# Iride v4 · risultati dei test (16/10/2026)

> Copia nel repo (UD-164), 16/10/2026. Sanificata: nessun numero di telefono, nessuna mail personale, nessun segreto nel testo originale (controllo automatico su numeri ≥ 9 cifre, indirizzi mail, token); gli id di esecuzione Make e gli id di scenari e data store restano. Nei blueprint del repo il phone_number_id WhatsApp del club è sostituito da `<WHATSAPP_PHONE_NUMBER_ID>`.


Esito attuale: **T1–T15 PASS dopo la revisione** (giro «R») e **T8c corretto con testo fisso di Make** (giro «S»), sezioni sotto. Prima della revisione: T1–T10 PASS (giro «G», 15:15–15:17 UTC), dopo 6 correzioni al blueprint.
Approvazioni: «ok Iride v4» (16:31) e «Sì, accendi la copia» (16:42). Le copie di test sono state attivate solo durante i test e ora sono **spente**: 8000995 isActive=false, 8001010 isActive=false (VERIFIED con scenarios_get).
Non toccati: scenario 7979437 (lastEdit 2026-10-16T11:03Z, invariato), data store 220276, altri scenari. Nessun messaggio o mail reale inviato, nessuna riga scritta in INTAKE_LOG.

## Revisione 16/10/2026 · correzioni dei rilievi e nuovo giro di test «R» (17:47–17:59 ora italiana)
Esito: **tutti i casi T1–T15 PASS** sulla versione corretta (con le note sotto). Copie attivate solo durante i test e poi **spente** (8000995 isActive=false, 8001010 isActive=false, VERIFIED con scenarios_get alla fine). Prima di ogni attivazione: scenarios_get della copia confrontato con il file locale (IDENTICO), nessun modulo WhatsApp/mail/Sheets, solo data store 221454/221455/221474 e webhook 3917667. Data store reale 221453: solo CONTATORE, mai scritto. Scenario live 7979437 e rubrica 220276 non toccati.

Correzioni al blueprint (rispetto alla versione del commit 72144f0):
1. **Moduli 60/61 (MEDIA)**: nel testo libero il prefisso «AM» è obbligatorio (`^(SI|NO)(?:\s+AM\s?-?\s?(\d{1,4}))?$`); il numero senza AM vale solo per id dei pulsanti / payload dei modelli (`60.da_pulsante`). Il modulo 60 calcola una volta sola `60.analisi`. «Sì 2» / «No 3» di un genitore → conversazione normale.
2. **Modulo 69 testo_dg (MEDIA)**: ogni campo scritto da chi chiede (squadra 60, avversario 80, data 40, ora 20, campo 80, nome 60, ruolo dichiarato 60 caratteri, come il modulo 68) passa da: a capo → spazio, poi `AM-n` → `AM·n` (regex `(^|[^A-Za-z0-9])[Aa][Mm]\s?-?\s?(\d+)` con /g). VERIFIED: la forma con flag `/gi` non sostituiva nulla in Make (T12b), quella con la classe `[Aa][Mm]` e `/g` sì (T12d).
3. **Moduli 76 e 74, oggetto mail (BASSA)**: `substring(replace(squadra; "/[\r\n]+/g"; " "); 0; 60)`.
4. **Conservazione «Fine stagione»** (Francesco 16/10 ~17:40, domanda «per quanto tempo li teniamo?» → «Fine stagione»): lo scenario promemoria ora ha un router; ramo 2 = pulizia: cerca nel data store richieste i record con codice che inizia per «AM-», `stato` ≠ IN_ATTESA_DG e `creato_il` prima dell'ultimo 30 giugno passato (00:00 Europe/Rome) e li cancella (DeleteRecord, filtro «Mai il CONTATORE»). Unica costante da cambiare: modulo 4 `fine_stagione` = «06-30»; il modulo 8 calcola la soglia. Esempio: una richiesta del 16/10/2026 viene cancellata dal 30/06/2027. VERIFIED: l'operatore Make è `text:startwith` (con `text:startsWith` la ricerca non trova nulla: T13 al primo giro FAIL, corretto).
5. **CANCELLA (modulo 14 e nuovi 97–99)**: chi scrive CANCELLA perde anche le sue richieste nel data store richieste (98 SearchRecord `richiedente_key` = mittente → 99 DeleteRecord, mai il CONTATORE). Contatto **con ruolo verificato** (es. DIRETTORE GENERALE): il record resta con **solo** `ruolo` e `ultimo_contatto` (serve per la finestra WhatsApp di 24 ore); nome, cognome, ruolo dichiarato, temi e richieste aperte vengono cancellati; la risposta aggiunge «Il ruolo … resta registrato perché lo gestisce la Segreteria: nome e altri dati li ho cancellati.». Scelta: la più semplice e sicura, perché cancellare il record del DG toglierebbe a Iride l'unico modo di riconoscere chi può confermare.
6. **Soglia 48 ore del promemoria**: PROPOSED (non detta da Francesco), segnata così in UD-164.
Il prompt (modulo 7) **non cambia**: `system-prompt.it.md` resta identico byte per byte al blueprint.

| # | Caso | Atteso | Effettivo | Esito | Execution id |
|---|---|---|---|---|---|
| T1 | «amichevole per la U16 sabato» (TESTIRIDE-041) | chiede data e avversario, nessun AM | chiede giorno preciso e avversario, «ora e campo li decide il club»; nessun AM | PASS | c60f52f64fe8495da94a6d672ae69628 |
| T2 | «Il 24/10 contro ASD Test Due» | AM creato | nessun AM: l'AI non ha ripreso «U16» dal messaggio prima (nel T1 aveva scritto il riassunto senza la squadra) e ha chiesto la categoria; AM-0007 creato al messaggio dopo (canale SESSIONE, messaggio con pulsanti 72) | PASS con nota 1 | b788ad5bd2c94d0ab63331165b5e3735 / afa2fb229c9d4c5496851015afb83664 |
| T3 | richiesta ripetuta con AM-0007 aperta | nessun nuovo AM | nessun AM-0008 da 041; «ancora in attesa del Direttore Generale (AM-0007)» | PASS | 8d8e2651557440029f28e4ee70121d37 |
| T4 | DG «Sì AM-0007» | CONFERMATA, ack al DG, esito al richiedente | CONFERMATA; 92 «Fatto ✅ … Ho avvisato io»; 94 al richiedente; log CHIUSO | PASS | 4aecbd113a2c4115b1817f53cbeacc30 |
| T5 | «SÌ AM-0007» da numero senza ruolo | IGNORA | IGNORA, log IGNORATO/SICUREZZA, nessuna risposta | PASS | 4d068fa51e2a417fad7dfeb6447c07d3 |
| T6 | DG «NO AM-0099» | 96 «non trovo» | 96 «Non trovo una richiesta in attesa con codice AM-0099» | PASS | fb7cddff04d242b485e0bf04ce9b5718 |
| T7 | «sì» da un genitore | conversazione normale | NORMALE, risposta AI | PASS | 21ef2220522f4e2a8df0e9f8a37fb3b7 |
| T8 | DG tocca il pulsante id «SI AM-0008» | CONFERMATA | AM-0008 CONFERMATA, 94 al richiedente | PASS | 208011573e2f49a5a15fb459ad1c4cf0 |
| T8b | DG «No» citando il messaggio (solo context.id), richiedente fuori 24 h | RIFIUTATA dal wamid, mail 95 | AM-0010 RIFIUTATA; mail 95 alla segreteria; 92 «…ho mandato una mail» | PASS | ff4ae29f9f6641d0acf21b794dcf70ee (richiesta: f01086f5ba97476987aebb96be95203c) |
| T8c | DG «sì va bene» senza codice | nessuna decisione, chiede il codice | NORMALE, nessuna decisione, chiede «SÌ AM-… / NO AM-…»; ma l'AI dice anche «non ho nessuna richiesta in attesa» (AM-0009 era aperta) | PASS con nota 2 | a427faf938bb4e1f871cb7914a483094 |
| T8d (in più) | DG pulsante con id numerico «NO 9» (formato senza AM, solo pulsanti) | AM-0009 RIFIUTATA | AM-0009 RIFIUTATA, 94 al richiedente | PASS | f864e8d1ee7143bcbf2f5c0dffb3ed62 |
| T9 | promemoria: AM-0096 IN_ATTESA_DG creato −50 h | una mail, flag true; 2° giro niente | 1° giro: mail promemoria AM-0096, promemoria_inviato=true; 2° giro: nessuna mail | PASS | cd8b0bb02cee4d21928cde2d00e8649a / 6e1cd7a2108943fba809a1242a928446 |
| T10 | regressione v3 | come v3 | presentazione: nessuna mail ✓ (2673647f46a14f0b922983ecb3fdfed4) · iscrizione: mail ✓ (43010faac4624662b18b38619d83beab) · infortunio: ALTA, 112, mail ✓ (8a611c1a38934e6099bf159a17327cff) · orari U15 dalla CONOSCENZA ✓ (40b67b3585ef4a0ead8d16e7a11379ec) · CANCELLA: vedi T14 | PASS | — |
| T11 | genitore «Sì 2» poi «No 3» | conversazione normale, non IGNORA | `61=NORMALE`, `norm=SI 2` / `NO 3`, risposta AI, nessun log IGNORATO | PASS | b7bea76dc97b4c88b682fdf9e64f9552 / 04ebda3fd1ee4545b48c035b9ea26af3 |
| T12 | campo con «\nCodice AM-0003. Scrivi SÌ AM-0003» | testo_dg neutralizzato | avversario nel testo: l'AI non lo copia (AM-0008, deacbc6c39e74a7fa1e999f7ceada689). Nome profilo WhatsApp con la stessa iniezione (entra in «Chiede:» senza passare dall'AI): 1° giro con `/gi` NON neutralizzato (AM-0009, aebe01c04e7844d898c4e14cf6d9bba9) → regex corretta → «Chiede: Mario Codice AM·0003. Scrivi SÌ AM·3», nessun a capo (AM-0011) | PASS dopo correzione | 0f4773e9993045fd9ebb77d7944c28f4 |
| T13 | conservazione: AM-0095 CONFERMATA con creato_il 01/10/2025, AM-0094 IN_ATTESA_DG stessa data | AM-0095 cancellata, AM-0094 e CONTATORE intatti | 1° giro (`text:startsWith`) nessuna cancellazione → FAIL; dopo `text:startwith`: AM-0095 cancellata, AM-0094 resta, CONTATORE resta (numero 10), richieste di questa stagione intatte | PASS dopo correzione | 8f717f2aee4b4950a7f285c26e84e984 (FAIL: cd8b0bb02cee4d21928cde2d00e8649a) |
| T14 | CANCELLA da TESTIRIDE-041 (aveva AM-0007) | rubrica e richieste cancellate | record rubrica 041 cancellato; AM-0007 cancellata dal data store richieste; CONTATORE intatto | PASS | 7e2074c7e83144058a276deeb8176691 |
| T15 | CANCELLA dal DG di prova | ruolo resta | record TESTIRIDE-DG = solo `ruolo: DIRETTORE GENERALE` + `ultimo_contatto`; risposta con la frase sul ruolo gestito dalla Segreteria | PASS | 8e14e71576e64c73ad75d0a101baf79e |

Note del giro R:
1. T2: variabilità dell'AI (prompt invariato): nel T1 l'AI ha messo `motivo` NESSUNO e un riassunto senza la forma «Amichevole · squadra …», così al messaggio dopo non ha ritrovato la squadra. La richiesta parte comunque appena i tre dati ci sono; nessuna richiesta parte con dati mancanti. PROPOSED v4.1: tenere la squadra in Make (non solo nel riassunto dell'AI).
2. T8c (CORRETTO nel giro S, vedi sezione sopra): la regola 16 vieta di dire se ci sono richieste in attesa, ma l'AI ha detto «non ho nessuna richiesta in attesa» leggendo la riga RUBRICA del DG («nessuna amichevole in attesa», che riguarda solo le richieste fatte dal DG). Nessuna decisione registrata. PROPOSED v4.1: per il numero con ruolo DIRETTORE GENERALE, testo fisso di Make quando il messaggio è sì/no senza codice, oppure togliere «richiesta aperta» dalla riga RUBRICA del DG.
3. Durante la correzione la copia 8000995 è stata accesa per errore 3 secondi prima dell'aggiornamento (15:55:52–15:55:55 UTC) e subito spenta: nessuna esecuzione in quell'intervallo (VERIFIED con executions_list).
4. Dati di prova rimasti nei data store di test 221454/221455/221474 (solo numeri finti TESTIRIDE-*): non toccano il live.

## Correzione T8c (16/10/2026 sera, richiesta del coordinatore prima del go-live) · giro «S»
Problema (giro R, T8c): al «sì va bene» del DG senza codice l'AI aveva scritto «non ho nessuna richiesta in attesa» mentre AM-0009 era aperta (informazione falsa al DG).
Correzione: quando il mittente ha `ruolo` = DIRETTORE GENERALE, non c'è `context.id`, non c'è codice e il testo è un sì/no breve (`60.si_no_breve`: inizia con SÌ/NO/OK, solo lettere, al massimo 30 caratteri, non da pulsante), il modulo 61 dà la rotta **DG_SENZA_CODICE** e Make risponde con un **testo fisso, senza AI** (router 62, ramo 4, moduli 100–104): 100 cerca nel data store richieste fino a 5 record IN_ATTESA_DG; 101 compone «• AM-… · squadra · data · contro avversario» con gli stessi limiti e la stessa neutralizzazione del modulo 69; 102 aggiorna `ultimo_contatto` del DG; 103 invia «Richieste di amichevole in attesa: … Rispondi SÌ AM-… oppure NO AM-… con il codice della richiesta, oppure tocca il pulsante nel messaggio di Iride.» oppure «Non ci sono richieste di amichevole in attesa. Iride (assistente AI)»; 104 riga INTAKE_LOG (CHIUSO, nessuna decisione). Un messaggio più lungo del DG (es. una domanda) resta conversazione normale con l'AI. Il testo è PROPOSED (formulazione non di Francesco). Prompt invariato.
Nota di prova: il data store debug 221474 (struttura 641331) non aveva i campi m103/m104; aggiunti alla struttura di test, poi T8c ripetuto (il primo invio b8050f5716cf4e6388a904b7e2777c58 è andato sulla rotta giusta ma il debug era vuoto).

| # | Caso | Effettivo | Esito | Execution id |
|---|---|---|---|---|
| T8c (con richieste in attesa) | DG «sì va bene» | rotta DG_SENZA_CODICE; testo fisso con 4 richieste in attesa (AM-0098, AM-0097, AM-0094, AM-0096) e «Rispondi SÌ AM-… oppure NO AM-…»; nessuna decisione | PASS | 363e813fb8b8441ea0f1082d884f2e19 |
| T8c (nessuna richiesta in attesa) | DG «No» (richieste di prova messe RIFIUTATA prima) | «Non ci sono richieste di amichevole in attesa.»; nessuna decisione | PASS | 66305563840246568c5be9ac2d4f2029 |
| T8e (in più) | DG «sì, ma a che ora gioca la U15 sabato prossimo?» | rotta NORMALE, risponde l'AI con l'AGENDA | PASS | b53a7f219bdb446aa4b0b0dc551a5b4b |
| T4 (regressione) | DG «Sì AM-0011» | CONFERMATA, 92 al DG, 94 al richiedente | PASS | 865d8644f9984433b6c14edf7e34de66 |
| T7 (regressione) | genitore «sì» | NORMALE, risposta AI | PASS | 5811234b00a04c679bee02b628324dad |
| T11 (regressione) | genitore «Sì 2» | NORMALE, nessun IGNORA | PASS | b6c5999d29b04df9929442cc65266113 |

Copie spente dopo i test (8000995 isActive=false, 8001010 isActive=false, VERIFIED con scenarios_get). T2 resta com'è: nota per v4.1.

## Oggetti in Make (team 2129271)
| Oggetto | ID | Note |
|---|---|---|
| Data structure «SCD · Richieste in attesa DG» | 641295 | 18 campi come §3 |
| Data store **reale** «SCD · Richieste in attesa DG» | **221453** | solo record CONTATORE (numero 0, template_attivo false); mai scritto dai test |
| Data store «TEST · Richieste in attesa DG» | 221454 | record di prova AM-0001…0006, AM-0097/0098 |
| Data store «TEST · Iride rubrica contatti (copia prova)» | 221455 | struttura 639295 riusata; solo numeri finti TESTIRIDE-* |
| Data store «TEST · Iride v4 debug» (struttura 641331) | 221474 | qui la copia scrive cosa *avrebbe* inviato |
| Webhook di test | 3917667 | solo payload finti |
| Scenario «TEST Iride v4 (copia spenta)» | 8000995 | SPENTO |
| Scenario «TEST Iride · Promemoria DG (copia spenta)» | 8001010 | SPENTO |

Copia di test: i moduli che inviano (WhatsApp 9/72/92/94/96, mail 15/74/76/95, Sheets 10/83/91) sono sostituiti da una scrittura nel data store debug 221474. Unica differenza di prova: il modulo 73 salva un wamid finto. Verificato con scenarios_get prima di ogni attivazione: nessun modulo di invio presente, solo data store 221454/221455/221474 e webhook 3917667.

## Risultati giro G (versione prima della revisione)
| # | Caso | Atteso | Effettivo | Esito | Execution id |
|---|---|---|---|---|---|
| T1 | «amichevole U16 sabato» | chiede data e avversario, nessun AM, nessuna mail | chiede data precisa e avversario, «ora e campo li decide il club»; completa=false; log «raccolta dati» | PASS | 50240785da71461ca68c1ef997cedec4 |
| T2 | seguito «Il 24/10 contro ASD Test Due» | AM creato, canale MAIL, mail 76 | AM-0004, canale MAIL, mail 76 corretta (settore DS settore agonistico, nessun numero); risposta fissa «Ho passato la richiesta… al Direttore Generale» | PASS | 93d7029e1380474fae6a8fca2f067b18 |
| T3 | richiesta ripetuta | nessun nuovo AM | nessun AM-0005 (guardia richiesta_aperta); risposta «già in attesa (AM-0004)» | PASS | 1d53a85c78d44dbb85772f3c1b8fb62a |
| T4 | «Sì AM-0004» dal DG di prova | CONFERMATA, log CHIUSO, ack al DG, esito al richiedente | CONFERMATA, deciso_il; log CHIUSO «segue WA-…»; 92 «Fatto ✅ … Ho avvisato io»; 94 WhatsApp al richiedente; rubrica richiedente richiesta_aperta «-» | PASS | d436b31e2b4a450aa65678966e38b155 |
| T5 | «SÌ AM-0004» da numero senza ruolo | IGNORA, nessuna risposta, record invariato | rotta IGNORA, log IGNORATO/SICUREZZA, nessuna risposta, AM-0004 non toccato | PASS | bee2aa75bb6944d1b4a41f14dd5725f9 |
| T6 | «NO AM-0099» dal DG | 96 «non trovo» | 96 «Non trovo una richiesta in attesa con codice AM-0099» | PASS | c5f0c807a239415d973efe4b3a48d9a6 |
| T7 | «sì» da un genitore | conversazione normale | rotta NORMALE, risposta AI, nessuna mail | PASS | 2c7d75f08e4c4b56b0ffc4f96e016be5 |
| T8 | pulsante id «SI AM-0005» | rotta DG da button_reply.id | AM-0005 (canale SESSIONE, messaggio con pulsanti 72) → CONFERMATA | PASS | e30aeba23ab7433181861d410dea083c (richiesta: ef107cc168c34f428f04ba326a105b3d) |
| T8b (in più) | DG risponde «No» citando il messaggio (solo context.id) | trova la richiesta dal wamid | AM-0006 RIFIUTATA; richiedente fuori 24 h → mail 95 alla segreteria; 92 «…ho mandato una mail» | PASS | 619be29efbe842dbbb5c8b460e743dfd |
| T8c (in più) | DG scrive «sì va bene» senza codice | nessuna decisione, chiede il codice | «serve il codice: scrivi SÌ AM-… o NO AM-…» | PASS | c1c8bcbcb83642c8ad7481700a4ac608 |
| T9 | promemoria, creato_il −49 h | una sola mail, promemoria_inviato=true | 1° giro: 3 operazioni, mail promemoria AM-0097, flag true; 2° giro: 1 operazione, nessuna mail | PASS | c7bdd16a41cb4de69217741714c11a45 / 7ceb521e8475494aa374b1abf21b1882 |
| T10 | regressione v3 | come v3 | presentazione: nessuna mail ✓ (ca36acacf92e43169b297cd23071935d) · iscrizione: mail ✓ (c46782df4e3941feacf92a9cd47bad56) · infortunio: ALTA, 112, mail anche entro 24 h ✓ (e82415b9ef5d42d2be46fbd0f81c3738) · CANCELLA: record cancellato ✓ (45d480b2cfec4bb4942e2e03e88ea0e5) · orari U15: vedi nota 1 (1cda310ecd734593a0b7b2b0b70b78c8) | PASS (con nota) | — |

Parsing SÌ/NO (giro 1, 8 casi): «Sì AM-0001», «si am 1», «Sí AM 0007.», «NO AM0003!» → codice corretto; «sì, confermo», «si am-12345», «Ciao Iride», «sì» → conversazione normale. Tutti PASS.

## Punti INFERRED → ora VERIFIED
- `replace` con `$1`/`$2` funziona **solo se la regex è scritta tra virgolette** (`"/^…$/"`); le regex senza virgolette (`/…/g`) fanno fallire la validazione dello scenario.
- `split` + `get` mantengono gli elementi vuoti («OK|SI||» → 3° elemento vuoto).
- L'uscita di SearchRecord è `key` + `data.{campi}`. Con `continueWhenNoRes` e nessun risultato esce un bundle vuoto, quindi `84.key` «non esiste» → modulo 96.
- UpdateRecord aggiorna solo i campi indicati e lascia gli altri (verificato su CONTATORE, rubrica, AM-xxxx).

## Correzioni fatte al blueprint (rispetto a iride-v4-proposed.json)
1. Regex (moduli 60, 61, 30): scritte tra virgolette. Prima lo scenario non partiva.
2. Modulo 10, ROUTING_RULE: c'era una parentesi «)» in più. Prima lo scenario non partiva.
3. Moduli 84 e 96: `61.codice != ""` era vero anche a codice vuoto, quindi la risposta al messaggio citato (solo context.id) non trovava la richiesta. Ora si usa `ifempty(61.codice; "-") != "-"`.
4. Prompt, regola 8: l'amichevole è ora una **regola a parte**: servono solo squadra, data e avversario, e ora e campo non vanno mai chiesti. Prima Haiku chiedeva sempre ora e campo e la richiesta non partiva mai (T2 FAIL al giro 1, 04e2497a8f5648afbfda27996ec90942). Il testo della regola 8 è quindi **modificato**, non solo esteso: la parola «amichevole» esce dalla prima frase. Iride continua a non confermare nulla.
5. Modulo 30, `amichevole_dg`: non dipende più da `completa`/`serve_persona` scritti dall'AI. Decide Make: tipo AMICHEVOLE + motivo RICHIESTA + squadra, data e avversario presenti (con sentinella «-») + nessuna AM aperta.
6. Modulo 9: quando la richiesta va al DG, la risposta al richiedente è un **testo fisso** di Make («Grazie X! Ho passato la richiesta di amichevole … al Direttore Generale…»), non il testo dell'AI. Al giro 3 l'AI aveva scritto una frase confusa: il testo fisso l'ha sostituita.
7. Prompt, regole 15–16: «non proporre mai tu una data»; il DG senza codice riceve sempre l'istruzione SÌ/NO AM-…, senza dire che una decisione è registrata o che non ci sono richieste.

Giri precedenti (falliti e corretti), per traccia: avvio dello scenario non riuscito 8e0f7a28e76c4f689e8cb6cbdac40b5d, b6363fcea4a944c6b03ba206a6b87fdf, 20089303934047b4843f675416503ed0 (correzioni 1 e 2); T8b non riuscito 48ee367b0d384712a501df037dcc1bfd (correzione 3).

## Note
1. T10 orari U15: al giro 1 l'AI ha risposto che il giovedì gli U15 «non risultano», al giro finale «18:00–19:30 campo 1». Entrambe le risposte vengono dalla CONOSCENZA su Drive. Questa parte non è cambiata in v4, ma va verificata sul documento di conoscenza.
2. INTAKE_LOG (modulo 10): il campo «AI:» registra il testo dell'AI anche quando il modulo 9 invia il testo fisso. PROPOSED: allineare in v4.1.
3. Non provati per scelta: l'invio WhatsApp reale (72 interattivo, 92, 94, 96), le mail reali (74/76/95) e il ramo di errore 74/75. Il payload del webhook di test imita watchEvents2 (INFERRED).

## File
Nel repo (`automations/make/segreteria-ai/`):
- `blueprint-v4.json`: blueprint finale dello scenario 7979437 v4 (data store richieste 221453, rubrica 220276, trigger watchEvents2 hook 3910801, confidential true), sanificato. **Da applicare al 7979437 solo con OK esplicito di Francesco.**
- `promemoria-dg-v4.json`: scenario promemoria 48 ore (data store 221453), da creare inattivo.
- `system-prompt.it.md`: prompt v4 (system + messaggio utente), identico byte per byte al modulo 7 di `blueprint-v4.json`.
- `prompt-diff-v3-v4.txt`: diff del prompt v3 (live) → v4.

Fuori dal repo (cartella di lavoro della chat PC, non versionati): `build_v4_final.py` (genera i due blueprint dal backup live v3), `make_test.py`, `send.py`, le copie di test 8000995 / 8001010 e i backup del live.
