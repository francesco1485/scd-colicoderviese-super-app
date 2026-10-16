import { describe, expect, it } from "vitest";

import { DERVIO_ALWAYS, DERVIO_EXCLUDED, NEVER_RECIPIENTS, SAFEGUARDING_CHANNEL_ONLY, routeChiFaCosa } from "./chi-fa-cosa";
import {
  INTAKE_ALWAYS_VIEW,
  INTAKE_DERVIO_ALWAYS,
  INTAKE_DERVIO_EXCLUDED,
  INTAKE_KINDS,
  INTAKE_RULES,
  INTAKE_STATUSES,
  INTAKE_TOURNAMENT_IDS,
  INTAKE_WATCHERS,
  HEALTH_REMOVED,
  availableActions,
  checkPayment,
  cleanIntakeText,
  kindPositions,
  parseIntakeNotices,
  redactIntake,
  contactFieldSafe,
  parseIntakeRow,
  parseIntakeRows,
  paymentsToFollow,
  payloadLines,
  phaseCounts,
  phaseOf,
  r139ProbeResult,
  rowTitle,
  statusesOf,
  type IntakeRow,
} from "./intake-kinds";
import { REQUEST_WATCHERS } from "./request-machine";
import { KNOWN_POSITIONS } from "./session";
import { TOURNAMENTS } from "./tournaments";

const row = (o: Partial<IntakeRow> = {}): IntakeRow => ({
  id: "00000000-0000-4000-8000-000000000001",
  publicCode: "V-26-0001",
  kind: "ISCRIZIONE_TORNEO",
  area: "tornei",
  site: null,
  status: "RICEVUTA",
  phase: "RICEVUTA",
  payload: { tournament: "christmas-lario-cup-maschile", category: "Under 12", teams: 2, orgKind: "SOCIETA" },
  ownerPosition: null,
  receivedAt: "2026-10-16T10:00:00Z",
  decidedAt: null,
  decisionNote: null,
  hasContact: true,
  paymentStatus: null,
  paymentAmountCents: null,
  paymentLink: null,
  can: { decide: false, prepare: false, contact: false, pay: false },
  owners: [],
  paymentLinkAllowed: true,
  events: [],
  ...o,
});

describe("rules follow chi-fa-cosa (G14) and never route families, athletes, partners or safeguarding", () => {
  it("every position is a registry position, never a forbidden recipient", () => {
    for (const k of INTAKE_KINDS) {
      const r = INTAKE_RULES[k];
      for (const p of [...r.deciders, ...r.preparers, ...r.informed, ...r.owners]) {
        expect(KNOWN_POSITIONS, `${k}: ${p}`).toContain(p);
        expect(NEVER_RECIPIENTS, `${k}: ${p}`).not.toContain(p);
        expect(SAFEGUARDING_CHANNEL_ONLY, `${k}: ${p}`).not.toContain(p);
      }
      for (const o of r.owners) expect([...r.deciders, ...r.preparers, ...r.informed, ...INTAKE_ALWAYS_VIEW], `${k} owner ${o}`).toContain(o);
    }
  });

  it("deciders are the deciders of the chi-fa-cosa topic, plus the DG who confirms everything", () => {
    for (const k of INTAKE_KINDS) {
      const r = INTAKE_RULES[k];
      const route = routeChiFaCosa({ topic: r.topic, site: r.siteRequired ? "COLICO" : "COLICO" }, true);
      for (const d of r.deciders) expect([...route.approvers, "direttore-generale", "presidente"], `${k}: ${d}`).toContain(d);
      if (k === "AFFITTO_CAMPO" || k === "VISITA_CENTRO") {
        // Francesco 16/10/2026 16:39 «decide presidente e consiglio direttivo»: the DG handles, does not decide.
        expect(kindPositions(k, "COLICO", "deciders"), k).toEqual(["direzione", "presidente"]);
        expect(kindPositions(k, "COLICO", "preparers"), k).toContain("direttore-generale");
      } else expect(kindPositions(k, null, "deciders"), k).toContain("direttore-generale");
    }
  });

  it("uses the same watchers and Dervio sets as chi-fa-cosa (UD-141, UD-154, UD-156)", () => {
    expect(INTAKE_WATCHERS).toEqual(REQUEST_WATCHERS);
    expect(INTAKE_DERVIO_ALWAYS).toEqual(DERVIO_ALWAYS);
    expect(INTAKE_DERVIO_EXCLUDED).toEqual(DERVIO_EXCLUDED);
  });

  it("applies the Dervio rule: responsabile campi never sees Dervio, the Dervio set always does", () => {
    expect(kindPositions("AFFITTO_CAMPO", "COLICO", "viewers")).toContain("responsabile-campi");
    expect(kindPositions("AFFITTO_CAMPO", "DERVIO", "viewers")).not.toContain("responsabile-campi");
    expect(kindPositions("AFFITTO_CAMPO", "DERVIO", "preparers")).toEqual(["direttore-generale"]);
    expect(kindPositions("AFFITTO_CAMPO", "DERVIO", "viewers")).toEqual(expect.arrayContaining(DERVIO_ALWAYS as string[]));
    expect(kindPositions("SPONSOR", null, "viewers")).not.toContain("segreteria");
  });

  it("knows only the tournaments of lib/tournaments.ts", () => {
    expect([...INTAKE_TOURNAMENT_IDS].sort()).toEqual(TOURNAMENTS.map((t) => t.id).sort());
  });

  it("sponsors and convenzioni are invoiced, never paid by link", () => {
    expect(INTAKE_RULES.SPONSOR.paymentLink).toBe(false);
    expect(INTAKE_RULES.CONVENZIONE.paymentLink).toBe(false);
    expect(INTAKE_RULES.ISCRIZIONE_TORNEO.paymentLink).toBe(true);
    // Francesco ~17:00 «No, senza pagamento»
    expect(INTAKE_RULES.VISITA_CENTRO.payment).toBe(false);
    expect(INTAKE_RULES.VISITA_CENTRO.paymentLink).toBe(false);
    expect(INTAKE_KINDS.filter((k) => !INTAKE_RULES[k].payment)).toEqual(["VISITA_CENTRO"]);
  });
});

describe("phases", () => {
  it("maps every intake and friendly state to one phase", () => {
    for (const s of INTAKE_STATUSES) expect(phaseOf(s), s).not.toBeNull();
    expect(phaseOf("BOZZA")).toBe("RICEVUTA");
    expect(phaseOf("DA_CONFERMARE")).toBe("IN_VALUTAZIONE");
    expect(phaseOf("CONFERMATA")).toBe("ACCETTATA");
    expect(phaseOf("SCADUTA")).toBe("NON_ACCOLTA");
    expect(phaseOf("??")).toBeNull();
    expect(statusesOf("NON_ACCOLTA")).toEqual(["RIFIUTATA", "ANNULLATA"]);
  });

  it("counts per phase, unknown stays unknown", () => {
    expect(phaseCounts(null)).toBeNull();
    expect(paymentsToFollow(null)).toBeNull();
    const c = phaseCounts([row(), row({ status: "IN_GESTIONE", phase: "IN_GESTIONE", paymentStatus: "LINK_INVIATO" })])!;
    expect(c.RICEVUTA).toBe(1);
    expect(c.IN_GESTIONE).toBe(1);
    expect(c.CHIUSA).toBe(0);
    expect(paymentsToFollow([row({ status: "ACCETTATA", phase: "ACCETTATA" }), row({ status: "CHIUSA", phase: "CHIUSA", paymentStatus: "RISCONTRATO" })])).toBe(1);
    expect(paymentsToFollow([row({ kind: "VISITA_CENTRO", status: "ACCETTATA", phase: "ACCETTATA" })]), "visits are free").toBe(0);
  });
});

describe("actions offered (the database decides again)", () => {
  it("offers take to preparers, accept/reject only to deciders, only from the right state", () => {
    expect(availableActions(row({ can: { decide: false, prepare: true, contact: true, pay: false } }))).toEqual(["take"]);
    expect(availableActions(row({ can: { decide: false, prepare: false, contact: false, pay: false } }))).toEqual([]);
    expect(availableActions(row({ status: "IN_VALUTAZIONE", phase: "IN_VALUTAZIONE", can: { decide: true, prepare: true, contact: true, pay: false } }))).toEqual([
      "accept",
      "reject",
      "cancel",
      "assign",
    ]);
    expect(availableActions(row({ status: "IN_VALUTAZIONE", kind: "ALTRO", can: { decide: true, prepare: true, contact: true, pay: false } }))).toContain("reclassify");
    expect(availableActions(row({ status: "CHIUSA", phase: "CHIUSA", can: { decide: true, prepare: true, contact: true, pay: true } }))).toEqual([]);
  });
});

describe("payment form (Tesoreria)", () => {
  const opts = { linkAllowed: true, hasStoredLink: false, hasStoredAmount: false };
  it("accepts a link with an amount", () => {
    expect(checkPayment({ status: "LINK_INVIATO", amountEuro: "25,50", link: "https://pay.example.org/x" }, opts)).toEqual({
      ok: true,
      value: { status: "LINK_INVIATO", amountCents: 2550, link: "https://pay.example.org/x" },
    });
  });
  it("refuses what the database refuses", () => {
    expect(checkPayment({ status: "", amountEuro: "", link: "" }, opts).ok).toBe(false);
    expect(checkPayment({ status: "LINK_INVIATO", amountEuro: "10", link: "" }, opts).ok).toBe(false);
    expect(checkPayment({ status: "LINK_INVIATO", amountEuro: "", link: "https://pay.example.org/x" }, opts).ok).toBe(false);
    expect(checkPayment({ status: "DA_PAGARE", amountEuro: "10", link: "http://pay.example.org/x" }, opts).ok).toBe(false);
    expect(checkPayment({ status: "DA_PAGARE", amountEuro: "10", link: "javascript:alert(1)" }, opts).ok).toBe(false);
    expect(checkPayment({ status: "DA_PAGARE", amountEuro: "dieci", link: "" }, opts).ok).toBe(false);
    expect(checkPayment({ status: "DA_PAGARE", amountEuro: "10", link: "https://pay.example.org/x" }, { ...opts, linkAllowed: false }).ok).toBe(false);
  });
  it("keeps a stored link or amount", () => {
    expect(checkPayment({ status: "LINK_INVIATO", amountEuro: "", link: "" }, { linkAllowed: true, hasStoredLink: true, hasStoredAmount: true }).ok).toBe(true);
    expect(checkPayment({ status: "RISCONTRATO", amountEuro: "", link: "" }, opts).ok).toBe(true);
  });
});

describe("free text (same rule as the database)", () => {
  it("redacts contacts and removes health text as a whole", () => {
    expect(cleanIntakeText("chiamate 333 000 0000 o scrivete a info@example.org")).toBe("chiamate [telefono] o scrivete a [email]");
    expect(cleanIntakeText("ha una allergia")).toBe(HEALTH_REMOVED);
    expect(cleanIntakeText("   ")).toBeNull();
    expect(cleanIntakeText("x".repeat(900))!.length).toBe(500);
  });
});

describe("redaction and health words (security review)", () => {
  it("catches obfuscated e-mails and split phone numbers, keeps dates", () => {
    expect(redactIntake("scrivete a mario.rossi at example it per i dettagli")).toBe("scrivete a [email] per i dettagli");
    expect(redactIntake("nome [at] dominio [dot] it")).toBe("[email]");
    expect(redactIntake("info(at)example.org grazie")).toBe("[email] grazie");
    expect(redactIntake("nome chiocciola dominio punto com")).toBe("[email]");
    expect(redactIntake("tel (0341) 123.456, cell 333.000.0000 o 333/000/0000")).toBe("tel [telefono], cell [telefono] o [telefono]");
    expect(redactIntake("il 24/10/2026 alle 10:30")).toBe("il 24/10/2026 alle 10:30");
  });
  it("removes health text, not words that only contain a health stem", () => {
    for (const t of ["ha l'asma", "è stato operato", "ferita al ginocchio", "ha il gesso", "certificato DSA", "ADHD", "è malato", "è malata", "una frattura",
      "visita psicologica", "in gravidanza", "è incinta", "handicap", "autismo", "bambino autistico", "farmaci", "allergia"])
      expect(cleanIntakeText(t), t).toBe(HEALTH_REMOVED);
    for (const t of ["il pubblico si entusiasma", "festa a tema fantasma", "serve un autista", "operatore economico", "gessetti colorati", "una feritoia nel muro"])
      expect(cleanIntakeText(t), t).not.toBe(HEALTH_REMOVED);
  });
});

describe("contact fields", () => {
  it("refuse organisation names or roles that hide a phone or an e-mail", () => {
    expect(contactFieldSafe("Societa Esempio")).toBe(true);
    expect(contactFieldSafe("Dirigente 2015")).toBe(true);
    expect(contactFieldSafe(null)).toBe(true);
    expect(contactFieldSafe("Esempio 333 123 4567")).toBe(false);
    expect(contactFieldSafe("Esempio info at example it")).toBe(false);
  });
});

describe("rows from the database", () => {
  it("drops malformed rows and unknown kinds, keeps only scalar payload values", () => {
    expect(parseIntakeRow(null)).toBeNull();
    expect(parseIntakeRow({ id: "a", kind: "AMICHEVOLE", status: "BOZZA" })).toBeNull();
    expect(parseIntakeRow({ id: "a", kind: "SPONSOR", status: "BOZZA" })).toBeNull();
    const r = parseIntakeRow({ id: "a", kind: "SPONSOR", status: "RICEVUTA", payload: { sector: "Edilizia", packages: ["ledwall", 3], x: { y: 1 } }, can: { decide: true } })!;
    expect(r.phase).toBe("RICEVUTA");
    expect(r.payload).toEqual({ sector: "Edilizia", packages: ["ledwall"] });
    expect(r.can).toEqual({ decide: true, prepare: false, contact: false, pay: false });
    expect(r.paymentAmountCents).toBeNull();
    expect(parseIntakeRows([{ id: "b", kind: "ALTRO", status: "CHIUSA" }, 5])).toHaveLength(1);
    expect(parseIntakeNotices([{ at: "2026-10-16T10:00:00Z", action: "RICEVUTA", requestId: "a", kind: "ALTRO" }, { kind: "X" }])).toHaveLength(1);
  });

  it("describes a row without organisation names", () => {
    expect(rowTitle("ISCRIZIONE_TORNEO", { tournament: "christmas-lario-cup-maschile", category: "Under 12" })).toBe("Christmas Lario Cup · Under 12");
    expect(rowTitle("AFFITTO_CAMPO", { date: "2026-11-20", slot: "SERA" })).toBe("Affitto campo · 20/11/2026 · sera");
    expect(payloadLines("ISCRIZIONE_TORNEO", { orgKind: "SOCIETA", teams: 2, province: "LC", unknown: "x" })).toEqual([
      { label: "Chi chiede", value: "Società sportiva" },
      { label: "Squadre", value: "2" },
      { label: "Provincia", value: "LC" },
    ]);
  });
});

describe("r139 probe", () => {
  it("is live only on the exact answer", () => {
    expect(r139ProbeResult([...INTAKE_KINDS], null)).toBe(true);
    expect(r139ProbeResult([...INTAKE_KINDS], { code: "x" })).toBe(false);
    expect(r139ProbeResult(null, null)).toBe(false);
    expect(r139ProbeResult(["ALTRO"], null)).toBe(false);
  });
});
