# ADR-0012 — R40 Weekly Sport & Grounded AI Newsroom

- **Stato:** ACCEPTED
- **Data:** 2026-09-30
- **Release:** R40

## Decisione
Il calendario Pulse diventa un calendario settimanale societario completo per tutte le annate e attività.

La sezione news non usa più il sito ufficiale datato o Google News come riempitivo. La fonte editoriale diventa un processo a due livelli:
- sintesi runtime da dati strutturati;
- editoriale AI settimanale da fonti reali con evidenze.

## Source policy
`SCD_OFFICIAL_SITE` resta navigabile ma perde autorità `PUBLIC_NEWS` finché non è verificata la freschezza editoriale.

## AI policy
L'AI può scrivere stile e sintesi, ma non può creare risultati, classifiche, iniziative o dichiarazioni non supportate da fonti.

## Rollback
R40 può essere revertita senza toccare R20, Supabase, Drive o Gmail.
