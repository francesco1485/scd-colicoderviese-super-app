# SCD ONE — PRODUCT MEMORY & ACQUIRED DIRECTIVES

Status: BINDING APP MEMORY  
Date: 2026-10-03  
App: `SCD_ONE`

This document consolidates the product direction acquired across the SCD Super App work. It exists so that Copilot and future agents continue the same product instead of reopening design decisions from zero.

## 1. Origin

SCD ONE is the public/social/transactional evolution of the earlier SCD Universe / SCD ColicoDerviese Super App work.

Existing work to preserve and mine before rebuilding anything:
- Pulse / public home;
- SCD Week;
- Calendar / Calendar Fusion;
- Teams;
- Next Match / Matchday;
- Social / Community;
- Media / Newsroom;
- SCD Twin / personal context;
- Family / Athlete journeys;
- PWA / mobile contracts;
- R53 football/social/private core;
- R54 private experience contracts where shared identity/data are useful;
- R55 verified content/social layer;
- R56 Identity, Calendar Fusion & Club Intelligence;
- R56.1 Access & Arrival QA.

SCD ONE is NOT a rewrite.

## 2. Final portfolio boundary

The SCD ecosystem now has three coordinated apps:
- SCD ONE = public/social/transactional;
- SCD CORE = internal association management;
- SCD GROW = partner/sponsor development and CRM.

Shared technical engines:
- R20 = current identity/role/scope authority until verified migration;
- SCD PULSE = Supabase target for structured data/auth/realtime where enabled;
- SCD Command R22 = command/orchestration engine.

Do not move SCD CORE management screens into the public SCD ONE shell.
Do not reproduce SCD GROW CRM inside SCD ONE.

## 3. Product north star

SCD ONE must become the digital place where a very large number of people can interact with SCD every day.

It combines:
- sport;
- club life;
- social/community;
- family and athlete context;
- events;
- services;
- verified information;
- useful transactions;
- territory;
- partner visibility.

It is not a long corporate landing page.

## 4. Required personality

SCD ONE must feel:
- alive;
- fast;
- modern;
- premium;
- sport-driven;
- territorial;
- emotional;
- highly responsive;
- useful every day;
- easy for multiple generations;
- futuristic without becoming a gimmick.

Energy may borrow from sports apps and gaming interfaces, but:
- no gambling language;
- no casino aesthetics;
- no compulsive mechanics;
- no dark patterns.

## 5. Mobile-first navigation acquired during design

Canonical mobile bottom navigation:
1. HOME
2. CALENDAR
3. TEAMS
4. SOCIAL
5. PROFILE

Home remains the permanent orientation point.

A sponsor/partner rail can remain persistently visible or quickly reachable on mobile when it does not obstruct content.

Desktop and mobile are compositions of the same product. Desktop is never a framed 430px phone.

## 6. SCD Week

SCD Week is not a generic Monday-Sunday office calendar.

The sport rhythm is modeled as a rolling Friday-to-Friday experience, with the weekend visually dominant.

Goals:
- make Friday/weekend activity immediately understandable;
- avoid a dead-looking Monday-Friday strip when the real sport value is concentrated on the weekend;
- connect current week, next verified match, team schedule and club events;
- adapt projections to public, family and athlete context.

## 7. Public home rhythm

The acquired public rhythm is:
1. Pulse / current club state;
2. next verified match;
3. SCD Week / upcoming;
4. teams;
5. Matchday;
6. Club Now / Newsroom;
7. media/social;
8. events and tournaments;
9. partner/sponsor rail;
10. community/family-value services;
11. Join / profile / transaction entry.

The first viewport must answer a real question:
- what is happening now?
- what is next?
- what changed?
- what can I do?

## 8. Social/community

Social is a product capability, not a list of embedded posts.

It may include:
- official club feed;
- verified team/event stories;
- safe reactions;
- community participation;
- media highlights;
- event conversation;
- club calls to action;
- moderation/reporting.

Safeguarding rules:
- no unsafe adult-minor 1:1 product flow;
- no public ranking/profiling of minors;
- age/consent aware publication;
- reporting/moderation paths;
- private/sensitive data never becomes social content.

## 9. Transaction direction

SCD ONE must be transaction-ready.

Canonical transaction families:
- Join / registration interest;
- Open Day / trial / event registration;
- tournament entry;
- field/service requests;
- ticketing;
- SCD Card / club services;
- family/athlete document/request handoff;
- future approved payment flows through explicit provider adapters.

Every transaction needs:
- transaction/request ID;
- user/context ID where applicable;
- status;
- idempotency;
- validation;
- audit/provenance;
- human-review gate where required;
- retry/failure state;
- no duplicate submission.

A decorative button is not a transaction.

## 10. Identity

One person, one canonical identity.

Historical rule:
- every person starts as USER_BASE;
- roles/scopes are added by authorized Direction flows;
- family, athlete and staff are authorized projections, not duplicate accounts.

SCD ONE consumes identity safely. SCD CORE owns internal management workflows.

## 11. Event spine

The canonical integration spine remains:

`EVENT_ID -> Calendar Fusion -> SCD Week -> Next Match / Matchday -> Team / Family / Athlete projections -> Communications -> Social/Public projection -> Audit/Provenance`

One event exists once and is projected into authorized views.

No duplicate public calendar.

## 12. Data provenance

Never invent:
- opponents;
- dates;
- times;
- locations;
- scores;
- standings;
- call-ups;
- sponsor status;
- event status;
- ticket availability;
- field availability.

Missing verified data uses explicit states such as:
- DATO_IN_AGGIORNAMENTO;
- DA_VERIFICARE;
- NON_DISPONIBILE;
- STALE;
- OFFLINE.

Historical source authority model:
- official federation / LND: 100;
- Direction verified data: 90;
- R20 manager/authorized club source: 85;
- Google Calendar verified club event: 75;
- Club Event registry: 70;
- Tuttocampo verified: 60.

When official federation data conflicts with lower-authority sport data, federation data wins after source matching.

## 13. Connected sources

SCD ONE may consume, through adapters and provenance:
- R20;
- SCD PULSE;
- Google Calendar;
- Google Drive;
- Gmail back-office outputs where publicly authorized;
- LND/FIGC/CRL;
- Tuttocampo verified data;
- Maps/location links;
- official social/media;
- SCD GROW public partner projection;
- SCD Command R22 actions.

Every new source must enter through Source Registry / Source Adapter logic.

## 14. Visual memory

Canonical palette:
- Mineral Navy #031A35
- Deep Navy #052E59
- SCD Blue #0870CF
- Lake #0B98DD
- Cyan #20B7E6
- Yellow #FFD500
- Muted Gold #F0B900
- Warm White #FFFFFF
- Paper #EEF5FB
- Ink #123657
- Muted #627E98
- Success #179765
- Warning #E49B2F
- Danger #CA5656

Visual target:
`SPATIAL_SPORT_EDITORIAL_HIGH_IMPACT`

Reject:
- generic SaaS;
- generic Bootstrap admin;
- WordPress-theme look;
- anonymous grey dashboards;
- endless white-card walls;
- giant static brochure hero;
- framed-phone desktop;
- fake live/smart service indicators;
- obsolete portal navigation.

Use:
- compact shell;
- live strip;
- event rails;
- match cards;
- story/orbit modules;
- sponsor marquee;
- contextual overlays;
- synthetic/original spatial hero;
- purposeful motion;
- real next actions.

## 15. Motion

Motion must explain state.

Reference:
- micro-interaction ~180ms;
- panel transition ~260ms;
- reduced-motion equivalent required.

No pointless bouncing, casino motion or animation that hides latency.

## 16. Responsive baseline

Must be verified at minimum:
- 360x800
- 390x844
- 393x852
- 430x932
- 1280x800
- 1440x900
- 1920x1080

Also:
- safe areas;
- virtual keyboard;
- orientation;
- font scaling;
- high DPR;
- touch/pointer;
- reduced motion;
- contrast preference;
- slow network;
- offline/fallback.

## 17. Official assets

Classify visual assets:
- KEEP_LOCKED
- KEEP_ENHANCE
- REBUILD_IMPROVE
- RESEARCH_REAL_ASSET
- GENERATE_ORIGINAL

Never redraw a verified official logo, crest, kit or sponsor wordmark.

## 18. Performance and scale direction

SCD ONE must be designed for large public traffic:
- cacheable public APIs;
- CDN/static asset optimization;
- image/media lazy loading;
- route/component lazy loading where useful;
- ETag/cache-control discipline;
- resilient upstream fallbacks;
- rate limiting for write endpoints;
- idempotent transactional writes;
- PWA shell/offline-safe states;
- privacy-first telemetry;
- background/queue work through shared orchestration rather than request blocking where justified.

Performance is a product feature.

## 19. Quality gates

A capability moves only through:
DESIGNED -> IMPLEMENTED -> TESTED -> DEPLOYED -> PRODUCTION_VERIFIED.

Release candidate requires:
- functional tests;
- regression tests;
- visual QA;
- mobile/desktop coverage;
- accessibility;
- keyboard/focus;
- reduced motion;
- loading/empty/error/offline/stale states;
- source/fallback evidence;
- security review;
- rollback plan.

## 20. Historical master commands translated to SCD ONE

The older SCD master command set is retained as SCD ONE app commands:
- STATE
- EXPERT
- ARCHITECT
- VISUAL / VISION-TO-CODE
- DATA
- SOURCE
- LIVE
- CALENDAR
- WEEK
- COMMUNICATION
- AUTOMATE
- BUILD
- TEST
- SECURITY
- PERFORMANCE
- ACCESSIBILITY
- RELEASE
- RECOVER
- NO-DUPLICATE
- PUBLIC
- SOCIAL
- AI

SCD ONE adds explicit app commands for Matchday, Teams, Family, Athlete, Events, Tournaments, Fields, Card and Transactions.

This product memory is cumulative. Future agents must add verified decisions instead of silently replacing them.
