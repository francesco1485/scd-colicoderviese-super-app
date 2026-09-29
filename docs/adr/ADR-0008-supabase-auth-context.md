# ADR-0008 — Supabase Auth Context e fail-closed role onboarding

- **Stato:** ACCEPTED
- **Data:** 2026-09-29
- **Release:** R35
- **Ambito:** Supabase Auth, membership, RLS, Web/PWA/Mobile

## Problema

Il Domain Core Supabase è stato provisionato in R34, ma non deve consentire all'utente di auto-assegnarsi un ruolo sportivo o amministrativo. Inoltre le policy R34 usano policy write `FOR ALL`, che funzionano ma generano policy SELECT permissive duplicate e quindi lavoro superfluo per Postgres.

## Decisione

R35 introduce onboarding fail-closed:

1. ogni nuovo account Supabase Auth riceve automaticamente:
   - profilo base;
   - membership nell'organizzazione `scd-colicoderviese`;
   - ruolo `USER_BASE`;
   - scope vuoto;
2. nessun ruolo qualificato viene letto dai metadata forniti dal client;
3. l'assegnazione successiva di ruoli/scope resta server-side;
4. `scd_my_context()` espone al client autenticato solo il proprio contesto membership;
5. le policy write vengono separate in INSERT / UPDATE / DELETE e non aggiungono più un secondo percorso SELECT.

## Sicurezza

Il trigger Auth è `SECURITY DEFINER` con `search_path=public` fissato, non è eseguibile direttamente da anon/authenticated e usa unicamente `new.id` e metadata anagrafici non autorizzativi.

Il ruolo inserito è sempre `USER_BASE`.

## Attivazione

R35 non attiva `FF-SUPABASE-CORE`. Il nuovo Auth rimane dark finché non esiste una vertical slice Web e mobile verificata.

## Rollback

Il rollback applicativo mantiene `SCD_FEATURE_SUPABASE_CORE=false` e R20 primary. La migration R35 non elimina record esistenti.
