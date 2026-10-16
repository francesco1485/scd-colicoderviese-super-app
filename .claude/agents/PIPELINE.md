# Percorso degli agenti SCD (orchestra)

Decisione di Francesco del 16/10/2026: agenti in sequenza dall'inizio alla fine, con i passi obbligatori e quelli che migliorano; squadre in parallelo; un agente orchestrale. Il direttore d'orchestra è `scd-azioni`.

## 1. Sequenza (dall'idea al sito vero)

| Passo | Agente | Obbligatorio? | Perché |
| --- | --- | --- | --- |
| 1. Stato reale | scd-azioni (SCD:STATE) | **Sì** | Senza lo stato si rompe il lavoro degli altri |
| 2. Strategia | scd-stratega | Sì per lavori grandi, no per correzioni | Motore (soldi, persone, tempo), priorità, rischi |
| 3. Fonti e dati | scd-google, scd-documenti, scd-figc-lnd | **Sì** quando servono dati veri | Mai dati inventati |
| 4. Idee e crescita | scd-crescita, scd-community | No, migliora | Rende il risultato virale e piacevole |
| 5. Grafica | scd-grafica (+ skill scd-occhio-grafico) | **Sì** per tutto ciò che si vede | Foto a Francesco prima di pubblicare |
| 6. Costruzione | scd-sviluppo (+ ecc-planner, ecc-architect) | **Sì** per il codice | Codice completo e test |
| 7. Testi | skill scd-tono | Sì per testi pubblici | Italiano semplice, regole minori |
| 8. Sicurezza | scd-sicurezza | **Sì** | Segreti, dati personali, minori |
| 9. Revisione | scd-revisore | **Sì** | Verità dei testi, regole, test |
| 10. Pubblicazione | skill scd-pubblica | **Sì** | Con l'ok di Francesco quando lo chiede, controllo del sito a 390 e 1440 px |
| 11. Controllo dopo | scd-regista | No, migliora | Cosa è cambiato, cosa resta |

## 2. Squadre in parallelo

| Squadra | Agenti | Quando |
| --- | --- | --- |
| App e web | scd-sviluppo, scd-grafica, ecc-react-reviewer, ecc-a11y-architect, ecc-performance-optimizer | Pagine e funzioni nuove |
| Multimedia | scd-avatar, scd-social, scd-ledwall, scd-comunicazione | Video, personaggi, LED, contenuti |
| Crescita | scd-crescita, scd-community, scd-territorio, scd-sociale | Idee virali, eventi, coinvolgimento |
| Mondo Google | scd-google, scd-mail, scd-documenti, scd-segreteria | Posta, calendari, Drive, fogli |
| Soldi | scd-commerciale, scd-sponsor, scd-tesoreria, scd-cfo, scd-bandi | Sponsor, cassa, bandi |
| Campo | scd-squadre, scd-atleti, scd-impianti, scd-pulmini, scd-tornei | Calendari, allenamenti, mezzi, tornei |
| Skill | scd-skill | Ogni settimana: nuove skill o migliorie dalle richieste ripetute |

## 3. Regole

- Un agente lavora solo dentro una chat o un'attività programmata: nessuno gira da solo 24 ore su 24.
- Nessun agente invia, pubblica, paga o cambia ruoli, permessi, tesseramenti, presenze, documenti sensibili o tutela dei minori: prepara, decide la Direzione.
- Divisione dei compiti tra chat (AGENTS.md, SCD:SESSIONI): accesso, registrazione, posta con Make, WhatsApp e centralino restano alla chat PC.
