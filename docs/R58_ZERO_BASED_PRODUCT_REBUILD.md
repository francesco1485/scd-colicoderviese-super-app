# R58 Zero-Based Product Rebuild

Status: ACTIVE
Branch: r58-zero-based-product-rebuild
Source backend baseline: 705e300d224975fe1a5640ae93a54a9c2745352c

## Non-negotiable reset rule
Current R57 user interfaces are superseded as product structures. Reuse only verified backend/data/auth/contracts and proven functional logic. No visual or navigation element is inherited by default.

## Portfolio
1. SCD Manager — daily operations for Direzione, Segreteria, Staff
2. SCD Social — families, athletes, supporters, community
3. SCD Sponsor — commercial, CRM, partners, activations, reporting
4. CEPA HDI — CEPA/SAP/education/territory, separate product

## 1. SCD Manager
Primary question: "What do I need to do now?"

Top-level IA:
- Home
- Persone / Fornitori
- Rapporti / Incarichi
- Piano mensile
- Movimenti / Tesoreria
- Contabilita
- Scadenze / Documenti

Operational domains remain available behind this structure:
- Segreteria
- Squadre
- Calendario
- Richieste
- Comunicazioni
- Tesseramenti / certificati
- Trasporti / logistica
- Impianti
- Tornei
- Audit / provenance

Home must surface:
- urgent actions
- deadlines
- money in/out and anomalies
- missing documents
- requests awaiting decision
- upcoming matches/events
- communications requiring action

Rules:
- process/function/responsibility/financial-flow first, names second
- one person once, multiple assignments
- no decorative dashboard clutter
- no ONE/CORE/GROW terminology in primary user navigation
- desktop efficient, mobile usable

## 2. SCD Social
Primary question: "What is happening in my Club?"

Canonical bottom navigation:
HOME -> CALENDAR -> TEAMS -> SOCIAL -> PROFILE

Core experiences:
- Pulse / today
- week view Friday-to-Friday
- Matchday / Match Center
- teams
- calendar
- verified social/news feed
- media
- community
- events / tournaments
- Fan Zone
- profile / family / athlete / Twin
- PWA installability
- verified partner/community benefits

Visual direction:
- modern sports product
- mobile-first
- high-impact editorial/spatial visual language
- real approved assets only
- never look like an admin dashboard
- no fake sports data

## 3. SCD Sponsor
Primary question: "Which commercial relationship needs action and what value are we delivering?"

Top-level IA:
- Dashboard
- CRM
- Opportunita
- Progetti / Asset
- Comunicazioni
- Contratti
- Report

Core domains:
- Partner Hub
- prospect pipeline
- banks / strategic partners
- LED / sponsor wall
- kit / signage / structures
- tendostruttura / dehor / club house
- Fondo Solidale
- tournaments / hospitality
- mascot activations
- Pixellot / Match Content
- Card / benefits / conventions
- merchandising
- sponsorship proof / delivery evidence
- renewals / follow-up

Visual direction:
- premium commercial
- readable, spacious, presentation-grade
- not a dense admin system
- typography must remain readable on phone
- sponsor value before logo catalog

## 4. CEPA HDI
Primary question: "How does CEPA educate, coordinate and activate the territory?"

Top-level IA:
- Home
- CEPA
- Sportelli SAP
- Formazione
- Eventi
- Territorio
- Area riservata

Core model:
- virtual Centro CEPA madre
- Sportelli SAP as public/front-office points
- governance, quality standards, official speakers
- online university / asynchronous learning
- target: people/families, PMI, structured companies, schools/entities
- topics: pension education, TFR, RC, welfare, legal protection, supplementary health
- territorial launch: Colico -> Mandello -> Lecco
- selective SAP entry: 1 company meeting + 1 meeting in school/municipality/entity/public structure
- agency as cultural centre, not price-driven selling
- reputation, education and trust before commercial proposal

Visual direction:
- institutional, modern, sober
- foundation/university quality
- HDI visually central
- Maglia Assicurazioni clearly present
- CEPA -> SAP architecture immediately understandable
- no aggressive insurance sales aesthetic
- no antiquated brochure aesthetic

## Acceptance gates for every product
1. IDEA PASS
2. INFORMATION ARCHITECTURE PASS
3. BRAND PASS
4. VISUAL PASS
5. UX PASS
6. FUNCTIONAL PASS
7. MOBILE/DESKTOP PASS
8. SOURCE/PROVENANCE PASS
9. PRODUCT PASS
10. DEMO READY

No product is called ready until a first-time user can answer within seconds:
- where am I?
- what is this product for?
- what should I do next?
- where do I find the main functions?
