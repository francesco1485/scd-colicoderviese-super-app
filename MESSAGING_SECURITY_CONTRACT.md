# SCD MESSAGING SECURITY CONTRACT

Versione di progetto: R21.13
Stato: architettura approvabile; la chat bidirezionale non deve essere dichiarata live finché il bridge Apps Script e i relativi store non sono distribuiti e testati.

## Obiettivo
Integrare una messaggistica interna gratuita e coerente con l'account unico SCD, evitando un secondo gestionale e mantenendo R20 come motore di identità, ruoli e scope.

## Regole non negoziabili
1. Nessun messaggio senza sessione R20 valida.
2. Ogni accesso è autorizzato server-side in base a ruolo, squadra, relazione famiglia-atleta e scope.
3. Safeguarding resta completamente separato e non entra mai nella messaggistica ordinaria.
4. Il contenuto dei messaggi non entra nella telemetria.
5. Password, PIN, certificati medici, documenti sanitari e documenti di identità non devono essere inviati in chat.
6. Le conversazioni che coinvolgono minorenni non devono diventare chat private non supervisionate. Il modello predefinito è canale squadra/famiglia con staff o tutore autorizzato presente.
7. La dicitura RISERVATO significa accesso ristretto e auditabile, non crittografia end-to-end.
8. Termini d'uso della messaggistica devono essere accettati prima del primo invio.
9. Devono esistere funzioni in-app di segnalazione e blocco prima di abilitare messaggistica 1:1.
10. I contenuti segnalati devono poter essere sospesi dalla Direzione senza cancellare l'audit tecnico.

## Livelli messaggio
- STANDARD: comunicazioni ordinarie di squadra o club.
- OPERATIVO: messaggi relativi a convocazioni, logistica, trasporti, riunioni e attività.
- RISERVATO: thread accessibile soltanto ai partecipanti autorizzati e alla funzione di moderazione prevista.
- SAFEGUARDING: NON è un livello della chat. Usa il canale separato già definito.

## Tipi di conversazione
- CLUB_BROADCAST: Direzione/Segreteria -> utenti autorizzati. Nessuna risposta obbligatoria.
- TEAM_CHANNEL: Staff + utenti autorizzati della squadra.
- FAMILY_THREAD: famiglia/tutore + staff/Segreteria per un atleta collegato.
- STAFF_CHANNEL: solo staff autorizzato.
- DIRECT_OPERATIONAL: 1:1 solo tra utenti adulti/autorizzati dopo attivazione di report e blocco.

## Comandi API previsti
Questi comandi devono essere aggiunti al contratto ufficiale solo quando il bridge R20 corrispondente è effettivamente distribuito:
- private.chat.threads
- private.chat.messages
- private.chat.send
- private.chat.read
- private.chat.report
- private.chat.block
- private.chat.unblock
- direction.chat.moderation

## Schema minimo thread
THREAD_ID
TYPE
TEAM_KEY
PLAYER_CODE
TITLE
SENSITIVITY
CREATED_AT
CREATED_BY
STATUS
PARTICIPANTS
LAST_MESSAGE_AT

## Schema minimo messaggio
MESSAGE_ID
THREAD_ID
SENDER_EMAIL
SENDER_ROLE
BODY
SENSITIVITY
CREATED_AT
EDITED_AT
STATUS
CLIENT_ID

## Schema minimo report/blocco
REPORT_ID / BLOCK_ID
THREAD_ID
MESSAGE_ID
REPORTER_EMAIL
TARGET_EMAIL
REASON
CREATED_AT
STATUS
RESOLVED_BY
RESOLVED_AT

## Gate di attivazione
La chat bidirezionale può diventare visibile agli utenti solo quando sono verdi:
- autenticazione R20;
- autorizzazione per scope;
- lettura thread;
- invio;
- ricevute di lettura;
- blocco;
- segnalazione;
- moderazione;
- test minor safety;
- test safeguarding isolation;
- test Play Console UGC;
- test Data Safety;
- E2E mobile 360/390/393/430.

## Strategia costo
Prima implementazione: Apps Script + Google Sheets/Drive già esistenti, con polling controllato e nessun nuovo servizio a pagamento.
Non viene promesso "tempo reale assoluto": per il canale gratuito si userà aggiornamento periodico e refresh immediato dopo l'invio.
