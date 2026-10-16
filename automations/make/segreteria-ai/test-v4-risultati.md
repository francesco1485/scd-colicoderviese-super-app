# Iride v4 · risultati dei test (16/10/2026)

> Copia nel repo (UD-164), 16/10/2026. Sanificata: nessun numero di telefono, nessuna mail personale, nessun segreto nel testo originale (controllo automatico su numeri ≥ 9 cifre, indirizzi mail, token); gli id di esecuzione Make e gli id di scenari e data store restano. Nei blueprint del repo il phone_number_id WhatsApp del club è sostituito da `<WHATSAPP_PHONE_NUMBER_ID>`.


Esito: **tutti i casi T1–T10 PASS sulla versione finale** (giro «G», 15:15–15:17 UTC), dopo 6 correzioni al blueprint.
Approvazioni: «ok Iride v4» (16:31) e «Sì, accendi la copia» (16:42). Le copie di test sono state attivate solo durante i test e ora sono **spente**: 8000995 isActive=false, 8001010 isActive=false (VERIFIED con scenarios_get).
Non toccati: scenario 7979437 (lastEdit 2026-10-16T11:03Z, invariato), data store 220276, altri scenari. Nessun messaggio o mail reale inviato, nessuna riga scritta in INTAKE_LOG.

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

## Risultati (versione finale)
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
