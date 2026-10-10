# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- Families and athletes of S.C.D. ColicoDerviese (Colico and Dervio, Lake Como, season 2026/27), mostly on phones, checking match days, training times and club news.
- Supporters and the local community, who reach the public face (Universe, events, sponsor showcase).
- Club staff, each with one job: coaches and team managers, the weekly training board owners, the secretariat, the treasury, the minibus coordinator, the kit store, the first-aid service, and the board (Direzione).
- Partner companies and prospects, who reach the sponsor showcase and, once partners, their own partner sheet.

## Product Purpose

One web app ("app madre") with one login and many faces. The public side has to make people say "wow": live match days, events and the sponsor showcase. Each internal area is a quiet, precise work tool with its own strength. Success means every family finds today's information in seconds and every staff role works from the club's real master sources without parallel registers.

## Positioning

The only place where the club's real master calendar, training board, events and partner network meet under the official crest. Nothing is invented: data comes from R20, the Master Calendario, the training board and the existing master sheets, with the source visible.

## Operating Context

- Each area has its own direct web link, like the regional federation site (crlombardia.it) "Accesso ai portali" pattern: the visitor taps the link or the top-bar menu and lands on that area's own access screen. Behind every access screen there is one shared identity (R20 until a verified migration), never a separate login per area.
- Areas with a direct link: Pulmini (minibus service), Calendario annuale, Quadro settimanale allenamenti, Segreteria, Magazzino, Infermeria, Sponsor, Tesoreria, Tornei ed eventi, Gestionale sportivo e attività, CRM (shared by Sponsor, Tornei and Segreteria), plus Direzione, Staff, Famiglia and Atleta.
- Two sites (Colico and Dervio); municipal pitches with notice deadlines; LND/FIGC/SGS calendars.

## Capabilities and Constraints

- Stack in place: TanStack Start, React 19, Tailwind 4, vitest, in `apps/superapp`; staging on Render; production only with explicit approval.
- Infermeria: list of services offered and appointment booking. It does not store diagnoses or clinical notes. Any injury log needs separate approval and a privacy review.
- CRM is one shared register used by Sponsor, Tornei and Segreteria, built on the existing MASTER CONTATTI sheet, not a second CRM.
- Magazzino covers kits, sizes and equipment; Tesoreria covers fees, instalments, the solidarity fund, kits, minibuses and the Club House.
- Open decisions: the final URL scheme (paths on one domain are the working default) and the login method.

## Brand Commitments

- Official crest, kit, wordmark and partner logos only: never generated, altered or redrawn.
- Palette derived from the crest: yellow #F8D000, blue #0860A8, light blue #1898D8, white.
- Characters are realistic 3D avatars, never cartoons. Sky always wears the official kit.
- Italian copy for people; English for code.

## Evidence on Hand

- Real calendar snapshot (156 events) and training board snapshot (16 slots) in `apps/superapp/src/data/`.
- Official assets in `config/scd-assets.v1.json`. Partners on hand: HDI, Saglio, Legea, LND, FIGC SGS, AC Monza.
- Missing and not to be invented: minibus routes and drivers, kit stock, fee amounts, sponsor package prices, first-aid service schedule.

## Product Principles

1. Outside is explosive, inside is a precision instrument.
2. One login, one database, many faces: every area is a door into the same app.
3. Real data with its source, or an honest empty state. Unknown is never zero.
4. Minors are protected first: no children's faces, no individual rankings of minors, health data kept to the minimum.
5. Nothing reaches production without the club's approval.

## Accessibility & Inclusion

WCAG 2.2 AA. Parents and volunteers of every age use it outdoors on phones, so it needs large tap targets, high contrast and plain Italian.
