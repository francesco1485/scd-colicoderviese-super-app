import { describe, expect, it } from "vitest";

import {
  agenda,
  daysTo,
  dueState,
  filterSuppliers,
  instalmentsOf,
  needsCheck,
  parseSupplierBoard,
  staleDays,
  supplierFilterCount,
  supplierTotals,
  type Instalment,
  type Supplier,
} from "./suppliers";

const TODAY = "2026-10-12";

function sup(o: Partial<Supplier> & { key: string }): Supplier {
  return {
    supplier: o.key.toUpperCase(),
    planStatus: null,
    planGroup: "PIANO_ATTIVO",
    balance: null,
    paid: null,
    residual: null,
    instalments: null,
    nextAmount: null,
    nextDue: null,
    closingExpected: null,
    nextAction: null,
    commercialPosition: null,
    strategy: null,
    mailUrl: null,
    ...o,
  };
}

function rate(o: Partial<Instalment> & { key: string; supplierKey: string }): Instalment {
  return { supplier: o.supplierKey.toUpperCase(), label: null, amount: null, due: null, planStatus: null, urgency: null, todo: null, mailUrl: null, ...o };
}

describe("parseSupplierBoard", () => {
  it("parses rows, drops invalid ones and rejects non-gmail links", () => {
    const b = parseSupplierBoard({
      season: "2026/27",
      sync: { syncedAt: "2026-10-12T10:00:00Z", alignedOn: "2026-09-30T00:00:00" },
      suppliers: [
        { key: "alfa", supplier: "Alfa Srl", planGroup: "BOH", balance: "999.67", nextDue: "2026-10-31", mailUrl: "https://evil.example/x" },
        { key: "", supplier: "x" },
        { key: "beta", supplier: "Beta", planGroup: "CHIUSO", mailUrl: "https://mail.google.com/mail/u/0/#all/1" },
      ],
      instalments: [{ key: "alfa:1", supplierKey: "alfa", supplier: "Alfa Srl", amount: 250, due: "2026-10-31" }, null],
    });
    expect(b?.sync?.alignedOn).toBe("2026-09-30");
    expect(b?.suppliers.map((s) => s.key)).toEqual(["alfa", "beta"]);
    expect(b?.suppliers[0]?.planGroup).toBe("DA_DEFINIRE");
    expect(b?.suppliers[0]?.balance).toBe(999.67);
    expect(b?.suppliers[0]?.mailUrl).toBeNull();
    expect(b?.suppliers[1]?.mailUrl).toBe("https://mail.google.com/mail/u/0/#all/1");
    expect(b?.instalments).toHaveLength(1);
    expect(parseSupplierBoard(null)).toBeNull();
  });
});

describe("needsCheck", () => {
  it("flags open plans whose proof was not found", () => {
    expect(needsCheck({ planStatus: "ACCETTATO - PROVA PAGAMENTO NON TROVATA", planGroup: "PIANO_ATTIVO" })).toBe(true);
    expect(needsCheck({ planStatus: "PROPOSTA INVIATA - RISPOSTA NON TROVATA", planGroup: "DA_DEFINIRE" })).toBe(true);
    expect(needsCheck({ planStatus: "RATA 1 DOCUMENTATA", planGroup: "PIANO_ATTIVO" })).toBe(false);
    expect(needsCheck({ planStatus: "NON TROVATA", planGroup: "CHIUSO" })).toBe(false);
  });
});

describe("dates", () => {
  it("counts days and classifies due dates like the D-5 reminder", () => {
    expect(daysTo("2026-10-17", TODAY)).toBe(5);
    expect(dueState(null, TODAY)).toBe("senza-data");
    expect(dueState("2026-10-11", TODAY)).toBe("scaduta");
    expect(dueState("2026-10-12", TODAY)).toBe("entro5");
    expect(dueState("2026-10-17", TODAY)).toBe("entro5");
    expect(dueState("2026-10-18", TODAY)).toBe("mese");
    expect(dueState("2026-11-13", TODAY)).toBe("dopo");
    expect(staleDays("2026-09-30", TODAY)).toBe(12);
    expect(staleDays(null, TODAY)).toBeNull();
  });
});

describe("totals and agenda", () => {
  const suppliers = [
    sup({ key: "alfa", balance: 0.1, paid: 0.2, residual: 999.67 }),
    sup({ key: "beta", planGroup: "CHIUSO", balance: 300, paid: 300, residual: 0 }),
    sup({ key: "gamma", planGroup: "DA_DEFINIRE", residual: 100 }),
  ];
  const rates = [
    rate({ key: "a1", supplierKey: "alfa", amount: 273.32, due: "2026-09-30" }),
    rate({ key: "a2", supplierKey: "alfa", amount: 273.32, due: "2026-10-15" }),
    rate({ key: "a3", supplierKey: "alfa", amount: 100, due: "2026-11-02" }),
    rate({ key: "b1", supplierKey: "beta", amount: 300, due: "2026-10-13" }),
    rate({ key: "g1", supplierKey: "gamma", amount: 50 }),
  ];

  it("sums in cents and ignores instalments of closed plans", () => {
    const t = supplierTotals(suppliers, rates, TODAY);
    expect(t.suppliers).toBe(3);
    expect(t.open).toBe(2);
    expect(t.balance).toBe(300.1);
    expect(t.paid).toBe(300.2);
    expect(t.groups).toEqual({ PIANO_ATTIVO: 1, DA_DEFINIRE: 1, CONTESTATO: 0, CHIUSO: 1 });
    expect([t.overdue, t.overdueAmount]).toEqual([1, 273.32]);
    expect([t.within5, t.within5Amount]).toEqual([1, 273.32]);
    expect([t.month, t.monthAmount]).toEqual([1, 100]);
  });

  it("groups the agenda by week: past due first, undated last", () => {
    const w = agenda(suppliers, rates, TODAY);
    expect(w.map((x) => x.week)).toEqual(["scadute", "2026-10-12", "2026-11-02", "senza-data"]);
    expect(w[1]?.items.map((i) => i.key)).toEqual(["a2"]);
    expect(w[1]?.amount).toBe(273.32);
  });

  it("filters and orders suppliers, and lists one supplier's instalments", () => {
    expect(filterSuppliers(suppliers, "aperti").map((s) => s.key)).toEqual(["gamma", "alfa"]);
    expect(filterSuppliers(suppliers, "CHIUSO").map((s) => s.key)).toEqual(["beta"]);
    expect(filterSuppliers(suppliers, "tutti", "gam").map((s) => s.key)).toEqual(["gamma"]);
    expect(supplierFilterCount(suppliers, "tutti")).toBe(3);
    expect(instalmentsOf(rates, "alfa").map((i) => i.key)).toEqual(["a1", "a2", "a3"]);
  });
});
