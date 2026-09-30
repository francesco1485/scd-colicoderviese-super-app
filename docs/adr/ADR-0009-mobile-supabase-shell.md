# ADR-0009 — Prima vertical slice mobile nativa SCD PULSE

- **Stato:** ACCEPTED
- **Data:** 2026-09-30
- **Release:** R36

## Decisione

SCD PULSE introduce una shell mobile nativa con Expo / React Native che usa lo stesso Domain Core Supabase del Web.

La prima vertical slice è:

`login Supabase → sessione → scd_my_context() → ruolo/scope → UI mobile`

## Vincoli

- `FF-SUPABASE-CORE` resta OFF;
- R20 resta primary;
- nessuna service role key entra nel client;
- il client usa soltanto URL e publishable key;
- il ruolo iniziale resta `USER_BASE`;
- i ruoli qualificati vengono assegnati server-side;
- nessun cutover avviene in R36.

## Android / iOS

Il codice vive in `mobile/` e condivide lo stesso progetto Expo per Android e iOS. Bundle identifier e package Android sono `it.colicoderviese.scdpulse`.

## Rollback

Nessun rollout utenti finali. Rimuovere la shell mobile o mantenerla non distribuita; il sistema operativo resta R20 con `SCD_FEATURE_SUPABASE_CORE=false`.
