# SCD PULSE Mobile — R36

Prima vertical slice mobile nativa del nuovo Domain Core.

## Stack
- Expo / React Native
- Supabase Auth
- Supabase PostgreSQL / RLS
- RPC `scd_my_context()`

## Stato
`FF-SUPABASE-CORE` resta OFF. Questa app non sostituisce ancora R20.

## Env
Copia `.env.example` in `.env` e valorizza esclusivamente chiavi pubblicabili:
- `EXPO_PUBLIC_SCD_SUPABASE_URL`
- `EXPO_PUBLIC_SCD_SUPABASE_PUBLISHABLE_KEY`

Non usare mai la service role key nel client mobile.

## Vertical slice
login Supabase → sessione → `scd_my_context()` → ruolo/scope → UI.

## Gate prima del cutover
signup USER_BASE, role/scope test, dual-read R20, rollback, QA Android/iOS.
