---
name: scd-guida-interattiva
description: Build interactive role guides (first-access tour, always-available guide, contextual tips) and FAQ, including FIGC/LND/SGS FAQ with sources, for the S.C.D. ColicoDerviese Super App. Use when writing or coding guides, onboarding, help or FAQ.
---

# Guide interattive e FAQ — S.C.D. ColicoDerviese

Permanent commands UD-172 (guides) and UD-173 (FAQ). Owner agent: scd-guide.

## 1. Roles and what each must learn first
| Ruolo | Le prime 3–5 schede |
|---|---|
| Famiglie | dove trovo allenamenti e gare · presa visione delle convocazioni · pulmino · documenti e certificato · chi contatto |
| Calciatori | la mia squadra e la prossima gara · presa visione o impedimento · la mia card · sfide e quiz · regole di comportamento |
| Mister | scrivania di squadra · convocazioni · presenze · richiesta campo e pulmino · messaggi ai genitori (genitore sempre in copia) |
| Dirigenti e responsabili | richieste da approvare · calendario e rotazione campi · scadenze · organigramma · cruscotto |
| Tifosi e soci | prossime gare · news · biglietteria · diventa socio o volontario · installa l'app |

## 2. Card model (one typed module, reused by tour, `/guida`, tips and assistant)
```ts
interface GuideCard {
  id: string;            // "famiglie-presa-visione"
  role: "famiglie" | "calciatori" | "mister" | "dirigenti" | "tifosi";
  title: string;         // max 6 words
  body: string;          // max 35 words, plain Italian
  action?: { label: string; to: string }; // route must exist (tested)
  status: "live" | "in-arrivo";
}
interface FaqEntry {
  id: string;
  topic: "app" | "squadre" | "pulmini" | "documenti" | "figc" | "lnd" | "sgs" | "tutela-minori";
  roles: GuideCard["role"][];
  q: string; a: string;  // a: max 60 words
  action?: { label: string; to: string };
  source?: { label: string; url: string; checkedAt: string }; // required for figc/lnd/sgs/tutela-minori
  status: "verificato" | "da-confermare";
}
```
Tests must check: every `action.to` exists in the route tree; every FIGC/LND/SGS entry has `source` or `status: "da-confermare"`; no entry contains phone numbers, emails of people, IBAN, CF or a minor's surname; lengths respected.

## 3. Behaviour
- First access: tour opens once per device and role (localStorage flag in try/catch; works without it), «Salta» always visible, dots for progress, «Avanti / Indietro», last card «Fatto · Rivedi quando vuoi da Guida».
- Never blocks content: a bottom sheet on phone, a side card on desktop; Esc and outside tap close it.
- `/guida` (existing route, extend it, never duplicate) shows the same cards per role and the FAQ with search; deep link `/guida?ruolo=mister#convocazioni`.
- Reduced motion: no slide animations, instant swaps.

## 4. Writing
Second person, sentences under 20 words, one idea and one action per card, no jargon (say «presa visione», explain once what it is). Unknown → «chiedi alla Segreteria». Club name always «S.C.D. ColicoDerviese»; never a founding year as fact.

## 5. Done means
Code complete (no pseudocode), tsc, vitest, build, test:bundle, test:manifest, test:claude-hooks green; screenshots at 390 and 1440; scd-revisore + scd-sicurezza PASS.
