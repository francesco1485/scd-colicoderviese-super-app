---
applyTo: "**/*.html,**/*.css,**/*.js,**/*.jsx,**/*.ts,**/*.tsx"
---

# SCD frontend instructions

Follow:
1. `SCD_SYSTEM_MANIFEST.json`
2. `AGENTS.md`
3. `docs/SCD_ONE_VISUAL_EXPERIENCE_MASTER.md`
4. `config/scd-visual-system.json`
5. `config/scd-visual-experience-gate.v1.json`

## SCD:VISUAL-GATE — BLOCKING

Before any meaningful UI write classify the existing surface:
`KEEP_LOCKED / KEEP_ENHANCE / REBUILD_IMPROVE / RESEARCH_REAL_ASSET / GENERATE_ORIGINAL`.

A UI that fails the visual gate must not be declared complete.

Reject:
- generic SaaS/Bootstrap/admin template appearance;
- WordPress-theme appearance;
- anonymous grey dashboards;
- generic white-card walls;
- brochure heroes;
- giant blue navigation bars;
- desktop rendered as a framed phone;
- fake services or fake live/device states;
- static pages with no real primary action;
- visual drift from the SCD palette and identity.

## Canonical visual identity

Do not invent a new palette. Use `config/scd-visual-system.json`.

Core visual principle:
`SPATIAL_SPORT_EDITORIAL_HIGH_IMPACT`.

NextGen uses:
- synthetic/original spatial scenes rather than photo-dependent UI;
- sport + Colico/Alto Lario/lake/mountain identity;
- mineral navy / lake aqua / muted gold / warm white;
- compact shell, live strips, rails, Matchday/event cards, sponsor marquee, quick actions and contextual overlays;
- purposeful motion and responsive feedback.

Official logos, kits, partner/sponsor wordmarks and opponent crests follow asset-integrity rules and are never regenerated when a verified real asset exists.

## Product composition

Preserve SCD ONE as one responsive public/social/transactional product across mobile, tablet, desktop, wide and ultrawide.

Public experience:
emotion + sport + territory + discovery + media + community + useful services.

Internal association-management density belongs to SCD CORE. SCD ONE may expose only authorized personal/family/athlete projections and transactional service entry points.

## Cross-app boundary

Do not implement internal Smart Facility controls, warehouse operations, laundry operations, staff dashboards or internal association administration inside SCD ONE.
Those belong to SCD CORE.

SCD ONE may expose only safe public/request projections such as verified field/service availability or request status through an explicit API contract.

## Responsive + accessibility

Required baseline verification:
- 360x800
- 390x844
- 393x852
- 430x932
- 1280x800
- 1440x900
- 1920x1080

Also verify:
- feature/container responsive reflow;
- safe areas and virtual keyboard;
- keyboard navigation;
- visible focus;
- sufficient contrast;
- text scaling;
- touch targets;
- reduced motion;
- loading / empty / error / offline / denied / stale states;
- overflow and clipping.

## Data + authorization

- do not invent sports, sponsor, event, identity, facility or operational data;
- represent missing/unverified data explicitly and fail closed;
- preserve semantic HTML and provenance;
- never implement authorization only in the client;
- preserve canonical EVENT_ID / PERSON_ID / TEAM_ID relationships;
- use real service states, never decorative claims such as “live”, “synced” or “automatic” without evidence.

## Required evidence

For release-candidate UI work report:
- visual classification;
- screenshots/visual comparison evidence;
- mobile and desktop verification;
- accessibility/reduced-motion checks;
- runtime source/fallback states;
- tests changed/run;
- remaining noncompliance.

No evidence = not ready.
