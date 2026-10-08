# SCD Direction Radar

**Status:** implementation active, runtime visual adoption pending human approval  
**Product:** GESTIONALE / Direzione  
**Manifest:** 3.32.0  
**Capabilities:** `CAP-DIRECTION-OPPORTUNITY-RADAR`, `CAP-DIRECTION-TERRITORY-RADAR`

## Purpose

The Direction Radar gives SCD leadership one verified place to monitor:

1. grants, calls, incentives, contributions and institutional opportunities relevant to ASD/SSD, associations, Third Sector entities, VAT holders, companies and public bodies;
2. events and initiatives in Colico and Dervio that may create calendar conflicts, partnership opportunities, territorial presence or communication opportunities for SCD.

## Non-negotiable rules

- Never invent an opportunity, event, deadline, amount, eligibility requirement or partnership.
- Official/primary sources are preferred.
- A discovered link is **not** a verified opportunity.
- New crawler results enter as `DISCOVERED_NEEDS_REVIEW`.
- Only verified items may receive a `WEB_VERIFIED_*` state.
- SCD calendar conflicts require a real Google Calendar comparison.
- No external application, submission, payment or commitment is automated.
- The visual box in the Gestionale remains `PENDING_VISUAL_APPROVAL` until Direction approves it.
- Safeguarding and personal/minor data are outside this radar.

## Pipeline

```text
OFFICIAL SOURCES
      ↓
DAILY DISCOVERY
      ↓
DISCOVERED_NEEDS_REVIEW
      ↓
SOURCE / DEADLINE / ELIGIBILITY CHECK
      ↓
VERIFIED ITEM
      ↓
SCD RELEVANCE
      ↓
GOOGLE CALENDAR RECONCILIATION (territory)
      ↓
DIRECTION RADAR
```

## Canonical files

- `config/scd-dirigenza-radar-sources.v1.json` — monitored sources and scan hints.
- `data/scd-dirigenza-radar.snapshot.json` — verified seed, candidates, source health and calendar signals.
- `lib/scd-dirigenza-radar.js` — deterministic discovery/parsing helpers.
- `scripts/update-dirigenza-radar.mjs` — daily source scan.
- `tests/scd-dirigenza-radar-contract.mjs` — data/source/visual staging contract.
- `tests/scd-dirigenza-radar-api-contract.mjs` — authenticated API contract.
- `.github/workflows/dirigenza-radar.yml` — daily execution after approved merge.
- `docs/visual-lab/gestionale-foundation.html` — non-runtime visual proposal.

## Opportunity source families

The registry currently includes official sources for:

- Regione Lombardia sport;
- Regione Lombardia general calls;
- Regione Lombardia Third Sector / volunteering;
- Dipartimento per lo Sport;
- Sport e Salute;
- Invitalia;
- European Commission sport / Erasmus+;
- Camera di Commercio Como-Lecco;
- Fondazione Cariplo;
- Comune di Colico transparency/contributions;
- Comune di Dervio opportunities/news.

The list is extensible without changing the UI contract.

## Territory source families

- Visit Colico / Pro Loco Colico;
- Comune di Dervio official events;
- official SCD Google Calendar for coordination.

## Calendar semantics

Territory events are not automatically classified as a hard conflict.

States include:

- `NO_SCD_EVENT_FOUND_IN_CALENDAR_WINDOW`
- `SAME_DAY_SCD_ACTIVITY`
- `SAME_DAY_LOCAL_ACTIVITY`
- `SAME_DAY_LOCAL_OVERLAP_REVIEW`

The final state remains a decision-support signal, not an automatic cancellation or event move.

## Read API

`POST /api/direction/radar`

Requires a valid R20 Direction/Admin session through the existing server-side authorization path.

Response contains:

- generated/verified/reconciled timestamps;
- summary counts;
- verified items;
- review candidates;
- source health;
- Dervio/territory monitoring status.

No public endpoint exposes Direction Radar data.

## Daily execution

The GitHub workflow is scheduled for 06:15 UTC (08:15 CEST / 07:15 CET depending on daylight saving).

Important: GitHub scheduled workflows become operational only after the workflow is present on the default branch. Before merge, CI validates the contracts but the daily production cadence is not active.

## Human approval gate

The data engine and API may be technically verified independently.

The visual composition of the Direction boxes must be reviewed by SCD Direction before it is adopted into the live Gestionale.
