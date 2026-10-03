# SCD UNIVERSE MASTER BUILD — SINGLE SUPER APP

Status: BINDING DEVELOPMENT DIRECTION
Date: 2026-10-03

## Product identity

The product being built is:

**SCD UNIVERSE / SCD COLICODERVIESE SUPER APP / SCD DIGITAL CLUB OPERATING SYSTEM**

It is ONE adaptive product, not a collection of disconnected websites.

The current repository already contains this identity:
- page title: `SCD Universe · Next Generation`
- manifest north star: SCD Universe
- manifest invariant: `single_product = true`
- Web/PWA + desktop/mobile responsive composition
- public and private worlds in one product

## Four product layers

### A. SCD EXPERIENCE — PUBLIC
For supporters, families, athletes, community, territory and discovery.

Core:
- HOME / PULSE
- SCD WEEK
- Calendar
- Teams
- Next Match / Matchday
- News / Media
- Social / Community
- Sponsor / Partner visibility
- Club Now
- Join / Registration entry points

### B. SCD LIFE — PERSONAL
The everyday club layer for authenticated people.

Core:
- one PERSON_ID
- Family / Athlete / Staff contexts
- SCD Twin / profile
- relevant week/events
- invitations / communications
- documents and requests
- personal/team context
- consent-aware intelligence

### C. SCD OPERATING CENTER — PRIVATE DESK
Operational control for authorized staff.

Core:
- OGGI
- PRIORITÀ
- DA FARE
- DA VERIFICARE
- DA APPROVARE
- IN SCADENZA
- CAMBIAMENTI
- EVENTI
- COMUNICAZIONI
- ALERT
- SCD Week / Facility Week
- training, facilities, spaces, assets
- materials, kit, warehouse, laundry, keys/access, maintenance, closure
- registrations / secretariat / tournaments / direction scopes
- sponsor/commercial operations where authorized

### D. SCD INTELLIGENCE
Cross-system intelligence built only on verified operational data.

Core:
- source registry
- provenance / authority / freshness
- Gmail / Drive / Calendar adapters
- LND / Tuttocampo adapters
- communications and follow-up
- automation
- AI only after process/data/automation are reliable

## Canonical vertical slice

EVENT is the first integration spine:

EVENT_ID
→ Calendar Fusion
→ SCD Week
→ Next Match / Matchday
→ Team/Family/Staff projections
→ Private Desk
→ Facility/Training occupancy
→ Communication
→ Social/Public projection
→ Audit / provenance

One event model, many authorized projections. No duplicate calendars.

## Current repository evidence

The current main line already contains implementation/contract evidence for:
- SCD Universe
- Pulse
- SCD Twin
- Staff & Family / Private Desk
- weekly SCD home
- Calendar
- Teams
- Social
- Matchday
- PWA
- R53 football/social/private core
- R54 private experience
- R55 verified content/social layer
- R56 Identity, Calendar Fusion & Club Intelligence
- R56.1 Access & Arrival QA

This does NOT mean every capability is production-complete. R57 exists to reconcile runtime, database, auth, CI and production evidence without losing the product direction.

## Release path

R57 FOUNDATION
- runtime/database/CI/production reconciliation
- preserve all R38-R56 product work
- establish evidence and rollback

R58 OPERATING CORE
- EVENT / TRAINING / FACILITY / SPACE / ASSET / PERSON / TEAM

R59 SCD WEEK
- team week + facility week
- fields / locker rooms / conflicts / closure

R60 PRIVATE DESK
- action-first operational desk

R61 PUBLIC EXPERIENCE
- hero / SCD Week / Next Match / Matchday / Club Now / Teams / Social / Sponsor rail

R62 MATERIAL OPERATIONS
- warehouse / kit / laundry / keys / assets / maintenance

R63 CONNECTED CLUB
- Gmail / Drive / Calendar / Maps / LND / Tuttocampo / Chat / WhatsApp official

R64 AUTOMATION
- workflows / alerts / tasks / approvals / follow-up

R65+ INTELLIGENCE / AI / refinement
- only on verified operational foundations

## Non-negotiable integration rule

Sponsor, Command Platform, Commercial/Lia, Private Desk, Facility, Social and other SCD work are NOT allowed to become separate competing user products.

They may have dedicated engineering branches and temporary runtimes for safe development, but their destination is the single SCD Universe architecture unless the Direction explicitly approves separation.

## Completion definition

A capability is not finished because code exists.

Allowed states:
DESIGNED
IMPLEMENTED
TESTED
DEPLOYED
PRODUCTION_VERIFIED

The final target is a coherent, beautiful, responsive and operational SCD Universe with real data, correct permissions, one identity, one event system and evidence-backed production behavior.
