# ADR-0007 — Supabase Domain Core e Club Graph per SCD PULSE

- **Stato:** ACCEPTED
- **Data:** 2026-09-29
- **Release:** R33
- **Ambito:** Domain Core, Web/PWA, Android/iOS, migrazione R20

## Contesto

CEPA Maglia OS ha già dimostrato, nello stesso ecosistema operativo, un modello composto da GitHub + Render + Supabase/PostgreSQL/Auth/RLS. SCD PULSE possiede invece un runtime storico centrato su R20 Apps Script, Google Sheets, Drive e Gmail, con R22 come livello di orchestrazione.

Il Manifest SCD richiede già un'esperienza `CLUB_GRAPH_DRIVEN`, ID stabili, un unico EVENT_ID e separazione tra dati e UI. Il limite attuale è che il Domain Core non è ancora un database relazionale dedicato.

## Decisione

SCD PULSE introduce un **Domain Core dedicato su Supabase/PostgreSQL**.

Non viene riutilizzato il progetto Supabase di CEPA Maglia OS. SCD deve avere un progetto isolato, credenziali proprie, RLS proprie, audit proprio e ciclo di rilascio autonomo.

La migrazione avviene con pattern **Strangler / Dual Run**:

`R20 + Sheets + Drive + Gmail → adapter → Supabase Club Graph → Web/PWA/Android/iOS`

R20 resta operativo e primario finché i confronti dual-read non dimostrano equivalenza e il rollback non è provato.

## Primo vertical slice R33

R33 prepara:
- contratto infrastrutturale `config/scd-supabase.v1.json`;
- migration SQL non distruttiva;
- Organizations / Memberships / Profiles;
- People / Families / Athletes;
- Seasons / Categories / Teams;
- unico Event model con scope multipli;
- Documents;
- External References per collegare R20/Drive/Gmail/Sheets;
- Audit events;
- RLS obbligatoria;
- feature flag `FF-SUPABASE-CORE` default OFF.

## Web e App

Il backend è unico.

Canali previsti:
- Web React/TypeScript;
- PWA dello stesso prodotto;
- Android/iOS con React Native + Expo;
- R22/Edge Functions per orchestrazione, job e automazioni.

Non vengono creati database separati per Web e mobile.

## Sicurezza

- ruoli assegnati server-side;
- RLS su tutte le tabelle del Domain Core;
- nessuna service role key nel client;
- safeguarding non entra nel Club Graph ordinario;
- nessun dato legacy viene cancellato durante il dual-run;
- CEPA e SCD restano progetti Supabase separati.

## Attivazione

`FF-SUPABASE-CORE` resta false finché non sono verdi:
1. progetto Supabase dedicato;
2. migration applicata;
3. security advisor review;
4. test Auth/RLS/roles/scopes;
5. confronto dual-read R20 → Supabase;
6. vertical slice Web;
7. vertical slice mobile;
8. rollback.

## Rollback

Impostare `SCD_FEATURE_SUPABASE_CORE=false`.

R20 resta fonte primaria e nessun record legacy viene rimosso. Il rollback non richiede migrazione inversa dei dati.
