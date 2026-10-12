import { describe, expect, it } from "vitest";

import { compareState, familyTotals, filterEntries, ledgerError, monthLabel, parseEntry, parseLedgerBoard, type LedgerEntry } from "./ledger";

function e(o: Partial<LedgerEntry> & { code: string; amount: number }): LedgerEntry {
  return { bookedAt: "2026-10-12T07:17:00+02:00", kind: "BONIFICO_IN", fee: 0, balance: null, category: "QUOTA", months: [], counterparty: null, family: false, matchState: "NON_APPLICABILE", linkKind: null, linkRef: null, linkLabel: null, verifiedAt: null, note: null, ...o };
}

describe("parseLedgerBoard", () => {
  it("parses summary, months, entries and comparisons, dropping invalid rows", () => {
    const b = parseLedgerBoard({
      summary: { movements: 202, incoming: "21876.67", outgoing: 7360.78, fees: 32, balance: "14483.89", brokenBalances: 0, toMatch: 65, proposed: 48, verified: 0 },
      months: [{ month: "2026-10", incoming: 100, outgoing: 50, fees: 0 }, { month: "" }],
      categories: [{ category: "QUOTA", count: 52, total: 12769.67 }],
      entries: [
        { code: "C1", bookedAt: "2026-10-12T07:17:00+02:00", amount: "120.00", category: "QUOTA", matchState: "PROPOSTO", linkKind: "FEE_POSITION", linkRef: "SCD-1", family: true },
        { code: "C2", amount: 5 },
        { code: "C3", bookedAt: "2026-10-01T00:00:00Z", amount: -9.28, matchState: "WHAT", linkKind: "X" },
      ],
      feeCompare: [{ ref: "SCD-1", bank: 240, gestionale: 120, difference: 120, movements: 2 }, { bank: 1 }],
    });
    expect(b?.summary.incoming).toBe(21876.67);
    expect(b?.summary.balance).toBe(14483.89);
    expect(b?.months).toHaveLength(1);
    expect(b?.entries.map((x) => x.code)).toEqual(["C1", "C3"]);
    expect(b?.entries[0]?.amount).toBe(120);
    expect(b?.entries[1]?.matchState).toBe("NON_APPLICABILE");
    expect(b?.entries[1]?.linkKind).toBeNull();
    expect(b?.entries[1]?.category).toBe("USCITA_DA_CLASSIFICARE");
    expect(b?.feeCompare).toHaveLength(1);
    expect(parseLedgerBoard({})).toBeNull();
    expect(parseEntry(null)).toBeNull();
  });
});

describe("filters and totals", () => {
  const items = [
    e({ code: "a", amount: 120, family: true, matchState: "PROPOSTO", linkLabel: "Mario Rossi · Esordienti" }),
    e({ code: "b", amount: 15, family: true, matchState: "DA_ABBINARE", category: "ADESIONE_PULMINO" }),
    e({ code: "c", amount: -394.91, kind: "BONIFICO_OUT", category: "FORNITORE", counterparty: "iGrest S.r.l.", matchState: "DA_ABBINARE" }),
    e({ code: "d", amount: 78, kind: "SUMUP_ACCREDITO", category: "INCASSI_SUMUP" }),
    e({ code: "f", amount: 40, family: true, category: "PULMINO", matchState: "VERIFICATO", months: ["ottobre"] }),
  ];

  it("filters to-do, families, outgoing, verified and by text", () => {
    expect(filterEntries(items, "da-fare").map((x) => x.code)).toEqual(["a", "b", "c"]);
    expect(filterEntries(items, "famiglie").map((x) => x.code)).toEqual(["a", "b", "f"]);
    expect(filterEntries(items, "uscite").map((x) => x.code)).toEqual(["c"]);
    expect(filterEntries(items, "VERIFICATO").map((x) => x.code)).toEqual(["f"]);
    expect(filterEntries(items, "tutti", "igrest").map((x) => x.code)).toEqual(["c"]);
    expect(filterEntries(items, "tutti", "ottobre").map((x) => x.code)).toEqual(["f"]);
    expect(filterEntries(items, "tutti", "rossi").map((x) => x.code)).toEqual(["a"]);
  });

  it("sums family payments by category in cents", () => {
    const t = familyTotals([...items, e({ code: "g", amount: 0.1, family: true }), e({ code: "h", amount: 0.2, family: true })]);
    expect(t["QUOTA"]).toBe(120.3);
    expect(t["PULMINO"]).toBe(40);
    expect(t["INCASSI_SUMUP"]).toBeUndefined();
  });

  it("explains bank vs Gestionale and labels months", () => {
    expect(compareState({ difference: 0, gestionale: 100 })).toBe("allineato");
    expect(compareState({ difference: 120, gestionale: 120 })).toBe("banca-in-piu");
    expect(compareState({ difference: -50, gestionale: 200 })).toBe("gestionale-in-piu");
    expect(monthLabel("2026-10")).toBe("ottobre 2026");
    expect(ledgerError("fee_not_found")).toMatch(/Codice/);
    expect(ledgerError(null)).toMatch(/Riprova/);
  });
});
