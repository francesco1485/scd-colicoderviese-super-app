# SCD 360 — Data Source Map

## Authority order

1. official signed/direct source;
2. verified canonical Drive master;
3. verified Gmail record;
4. internal operational note;
5. inference;
6. hypothesis.

Absence of evidence must never be converted into FALSE.

| Source | ID / locator | Domain | Canonicality | Access | Sensitivity | Status / rule |
|---|---|---|---|---|---|---|
| R20 | runtime authority | identity/roles/scopes/operations | CURRENT_AUTHORITY | server-only | PRIVATE/RESTRICTED | keep until verified cutover |
| SCD PULSE | `ndevtxxijbcnskgysdit` | target domain core | STAGED_TARGET | role/RLS | PRIVATE/RESTRICTED | production migrations currently through R53 |
| SCD Operativo Pilota 2026-27 | `1jb5Jt1ZYzJA-3oQd85AmwVhAoFQpBPfcsy4HupBzDFA` | control room | VERIFY_CANONICAL | Drive scoped | PRIVATE | classify before bridge |
| Master Calendario gare | `1p78Kgla_cCjYxCPjksS8lHxmlFQxuvpd1aBXv6-1H1s` | matches/calendar | VERIFY_CANONICAL | Drive scoped | INTERNAL | map to EVENT_ID |
| Master Tesserati Operativo | `1mcOVkFRK7igxk87jGE-VqI49PHjNa6OmMu7xd0QYUl8` | people/tesseramenti | VERIFY_CANONICAL | Drive restricted | RESTRICTED | no name-only identity matching |
| Mail Operations App | `1wx3ZXwmdZuAr8AM_h08GzOvephm5o5iHMvTLQpRmbJE` | Gmail operations | ACTIVE_SOURCE | Drive/Gmail scoped | PRIVATE | preserve message/thread IDs |
| Master Tornei & Iniziative | `1fE8SdrmlOdy97kfVh9-7U0n_8NkvQl0x-qPY89RwQm8` | events/tournaments | ACTIVE_OR_ARCHIVE_VERIFY | Drive scoped | INTERNAL | tournament is one module |
| Control Room Tornei | `16K-dhcztR1E3CWT8-aERiqQcq_DXBP1hPCLWf1lG1EQ` | tournament ops | VERIFY_OVERLAP | Drive scoped | INTERNAL | dedupe with Master Tornei |
| Master Sponsor Intelligence | `1-5-MUnrrAltflJSATe6bKkjm_3SItO0gvadi_PXPoAQ` | CRM/growth | VERIFY_CANONICAL | restricted | COMMERCIAL | prospect != sponsor |
| Control Tower Contratti | `1xhVADhiRwNHVWniE-2yNLPTnps5_VrytJlMLpN7KLog` | contracts | RESTRICTED_SOURCE | restricted | HIGHLY_RESTRICTED | signed docs versioned |
| Root Contratti Riservati | `17zgZA6CKsvgYk0H4hVTSOWPL-GHASBVQ` | contracts archive | RESTRICTED_SOURCE | restricted | HIGHLY_RESTRICTED | never expose client-side |
| Centrale Pagamenti Quote | `18CDaHXYDlFUlK4lWEoz9pcJmsaAFYPLh` | fees/payments | VERIFY_CANONICAL | restricted | FINANCIAL | reconciliation required |
| Cruscotto Sviluppo SCD | `1SSkNRpDhtr3r5woz8Gdl98p8IVY6PdpXaQUhwpy7ZeY` | development | REFERENCE/ACTIVE_VERIFY | internal | INTERNAL | product intelligence only after verification |
| Gmail | message/thread IDs | intake/communications | SOURCE_ENGINE | scoped | PRIVATE | no body persistence in audit logs |
| Google Drive | file/folder IDs | documents | SOURCE_ENGINE | scoped | varies | preserve originals/provenance |
| Google Calendar | calendar/event IDs | projections | SYNC_TARGET | scoped | INTERNAL | never second event truth |
| FIGC/LND/SGS/CRL | official URLs/docs/IDs | sporting/federal | HIGHEST_SPORT_AUTHORITY | public/internal | varies | official beats secondary source |
| Tuttocampo | verified URL/ID | secondary sport | SECONDARY | public | PUBLIC | never override official conflict |
| SQUBy | external integration IDs | card/wallet/badges | DOMAIN_AUTHORITY_FOR_WALLET | authorized connector | FINANCIAL/PERSONAL | do not duplicate wallet engine |

## Drive routing compatibility

- `01_AMMINISTRAZIONE_FISCO`
- `02_SEGRETERIA_SPORTIVA`
- `03_LOGISTICA_CAMPI`
- `04_MEDIA_GRAFICA`
- `05_COMUNICAZIONE_SOCIAL`

Do not physically migrate files merely to make the data model aesthetically cleaner.

## Document corpus

The historical project corpus includes sports reform/RASD, D.Lgs. 36/2021 and 39/2021, Registro Nazionale, sports-worker guidance, SGS/base activity material, facilities guidance, club general regulation, travel/minor management regulation, safeguarding model, privacy notice, image/marketing release, Laws of the Game 2026, player lists and restricted first-team/staff economic data.

Named availability is not proof of current legal validity. Legal/federative logic must be versioned and checked against current authoritative sources before operational automation.
