# ADR-0010 — R38 SCD Universe full experience reboot

- **Stato:** ACCEPTED
- **Data:** 2026-09-30
- **Release:** R38

## Contesto
La precedente esperienza Pulse era tecnicamente ordinata ma non raggiungeva l'obiettivo emotivo e d'uso: troppo spazio blu, pochi contenuti immediatamente utili, sponsor non abbastanza visibili, interazione limitata e nessun vero legame tra Avatar, Sky, community e servizi.

## Decisione
R38 ricostruisce da zero **l'esperienza frontend**, preservando backend, Supabase, R20, fonti, autorizzazioni e safeguarding.

La nuova esperienza si chiama **SCD Universe** e introduce:
- hero fotografica compatta e spaziale;
- sponsor rail sempre visibile;
- informazioni "oggi/prossima gara" immediatamente leggibili;
- mondi dinamici per ruolo;
- SCD Twin con crescita Tamagotchi-like basata solo su segnali sicuri;
- SCD Mirror, collaboratore virtuale che riusa Sky;
- Fan Lab;
- event rail;
- SCD Moments;
- layout coerente anche per servizi interni.

## Sicurezza e minori
L'evoluzione del Twin non misura talento, salute, stato mentale o competenza. Non usa hidden scoring. È un meccanismo di appartenenza e partecipazione.

## Rollback
R38 è un layer frontend. R20 e Supabase non vengono modificati dal redesign. Il rollback è il revert della release frontend.
