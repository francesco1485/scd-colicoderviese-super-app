import { describe, expect, it } from "vitest";

import { compErrorMessage, daysUntil, dueLabel, paymentListText, defaultPeriod, dueDateOf, entrySign, euro, filterLines, parseCompBoard, periodLabel, shiftPeriod, summarize } from "./compensation";

const raw = {
  actor: "DIREZIONE",
  period: "2026-09",
  dueDate: "2026-10-15",
  lines: [
    { agreementId: "a1", name: "Mario Rossi", role: "Calciatore", contractType: "LAVORO_SPORTIVO", monthlyFixed: "1000.00", ibanStatus: "CONFERMATO", contractStatus: "OK", relationshipStatus: "ATTIVO",
      fixed: 1000, plus: 100, minus: 300, net: 800, status: "BOZZA", blockers: [],
      entries: [{ id: "e1", kind: "GOAL", quantity: 2, unitAmount: 50, amount: 100, date: "2026-09-20", status: "ATTIVA" }, { id: "e2", kind: "ACCONTO", amount: "300.00", date: "2026-09-05", status: "ATTIVA" }], documents: [] },
    { agreementId: "a2", name: "Luca Bianchi", contractType: "VOLONTARIATO_SPORTIVO", fixed: 0, net: 0, status: "BOZZA", blockers: ["IBAN_NON_CONFERMATO", "NETTO_ZERO"], ibanStatus: "MANCANTE", contractStatus: "DA_VERIFICARE", entries: [], documents: [] },
    { agreementId: "a3", name: "Paolo Verdi", fixed: 500, net: 500, status: "AUTORIZZATO", authorizedNet: 500, blockers: [], ibanStatus: "CONFERMATO", contractStatus: "OK", entries: [], documents: [] },
    { agreementId: "a4", name: "Gino Neri", fixed: 400, net: 400, status: "PAGATO", paidAmount: 400, blockers: [], ibanStatus: "CONFERMATO", contractStatus: "OK", entries: [], documents: [] },
    { agreementId: "a5", name: "Ugo Blu", fixed: 500, net: 500, status: "BLOCCATO", blockers: ["CONTRATTO_RASD_DA_VERIFICARE"], ibanStatus: "DA_VERIFICARE", contractStatus: "BLOCCATO", entries: [], documents: [] },
    { name: "no id" },
  ],
};

describe("parseCompBoard", () => {
  it("returns null without an allowed actor and parses numbers given as strings", () => {
    expect(parseCompBoard(null)).toBeNull();
    expect(parseCompBoard({ actor: "FAMIGLIA", lines: [] })).toBeNull();
    const b = parseCompBoard(raw)!;
    expect(b.lines).toHaveLength(5);
    expect(b.lines[0]!.monthlyFixed).toBe(1000);
    expect(b.lines[0]!.entries[1]!.amount).toBe(300);
    expect(b.lines[0]!.entries[1]!.sign).toBe(-1);
    expect(b.dueDate).toBe("2026-10-15");
  });
});

describe("months", () => {
  it("shifts, labels and computes the due date (day 15 of the next month)", () => {
    expect(shiftPeriod("2026-12", 1)).toBe("2027-01");
    expect(shiftPeriod("2026-01", -1)).toBe("2025-12");
    expect(periodLabel("2026-09")).toBe("settembre 2026");
    expect(dueDateOf("2026-09")).toBe("2026-10-15");
    expect(dueDateOf("2026-12")).toBe("2027-01-15");
  });
  it("opens on the month whose payment is due next", () => {
    expect(defaultPeriod("2026-10-12")).toBe("2026-09");
    expect(defaultPeriod("2026-10-15")).toBe("2026-09");
    expect(defaultPeriod("2026-10-16")).toBe("2026-10");
    expect(daysUntil("2026-10-12", "2026-10-15")).toBe(3);
  });
});

describe("entrySign", () => {
  it("subtracts money already given or to recover", () => {
    expect(entrySign("GOAL")).toBe(1);
    expect(entrySign("RIMBORSO_SPESE")).toBe(1);
    expect(entrySign("ACCONTO")).toBe(-1);
    expect(entrySign("CONTRIBUTO_CASA")).toBe(-1);
  });
});

describe("summarize and filter", () => {
  const lines = parseCompBoard(raw)!.lines;
  it("counts what is ready, authorized, paid and what blocks", () => {
    const s = summarize(lines);
    expect(s.people).toBe(5);
    expect(s.readyToAuthorize).toBe(1);
    expect(s.authorized).toBe(1);
    expect(s.authorizedTotal).toBe(500);
    expect(s.paidTotal).toBe(400);
    expect(s.blocked).toBe(1);
    expect(s.missingIban).toBe(2);
    expect(s.zeroNet).toBe(1);
    expect(s.netTotal).toBe(2200);
  });
  it("filters by state and search text", () => {
    expect(filterLines(lines, "pronti").map((l) => l.agreementId)).toEqual(["a1"]);
    expect(filterLines(lines, "da-verificare").map((l) => l.agreementId)).toEqual(["a2"]);
    expect(filterLines(lines, "tutti", "verdi").map((l) => l.agreementId)).toEqual(["a3"]);
  });
});

describe("messages", () => {
  it("explains blockers in Italian", () => {
    expect(compErrorMessage("blocked", ["IBAN_NON_CONFERMATO", "CONTRATTO_RASD_DA_VERIFICARE"])).toBe("Non si può ancora: IBAN non confermato, contratto o RASD da verificare.");
    expect(compErrorMessage("period_locked")).toContain("togliere l'autorizzazione");
    expect(euro(12345.5)).toMatch(/12\.345,50/);
  });
});

describe("treasury helpers", () => {
  it("lists only authorized lines with the total and never an IBAN", () => {
    const b = parseCompBoard(raw)!;
    const t = paymentListText(b.lines, b.period);
    expect(t).toContain("Paolo Verdi");
    expect(t).not.toContain("Mario Rossi");
    expect(t).toContain("entro 15/10/2026");
    expect(t).toMatch(/Totale\t500,00\s€ \(1 persone\)/);
  });
  it("describes the days left", () => {
    expect(dueLabel(3)).toBe("mancano 3 giorni");
    expect(dueLabel(0)).toBe("scade oggi");
    expect(dueLabel(-2)).toBe("scaduto da 2 giorni");
  });
});
