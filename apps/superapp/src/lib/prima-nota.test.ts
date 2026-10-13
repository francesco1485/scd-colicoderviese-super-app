import { describe, expect, it } from "vitest";

import { type LedgerEntry } from "./ledger";
import {
  EMPTY_FILTER,
  accountOf,
  buildPrimaNota,
  cashFlag,
  cashSplitDays,
  chronological,
  closingChecklist,
  closingDeadline,
  filterRows,
  monthTotals,
  openingBalance,
  primaNotaCsv,
  proposeClassification,
  romeDay,
  seasonCommercialIn,
  volunteerIssueCount,
} from "./prima-nota";

function e(
  o: Partial<LedgerEntry> & { code: string; amount: number },
): LedgerEntry {
  return {
    bookedAt: "2026-09-10T10:00:00+02:00",
    kind: "BONIFICO_IN",
    fee: 0,
    balance: null,
    category: "QUOTA",
    months: [],
    counterparty: null,
    family: false,
    matchState: "NON_APPLICABILE",
    linkKind: null,
    linkRef: null,
    linkLabel: null,
    verifiedAt: null,
    note: null,
    ...o,
  };
}

describe("proposeClassification", () => {
  it("applies the Direzione rules with confidence and never confirms", () => {
    const q = proposeClassification(
      e({ code: "a", amount: 120, family: true }),
    );
    expect(q).toMatchObject({
      center: "quote",
      nature: "istituzionale",
      confidence: "alta",
      state: "PROPOSTO",
    });
    expect(
      proposeClassification(
        e({
          code: "b",
          amount: 500,
          category: "ENTRATA_DA_CLASSIFICARE",
          counterparty: "Ferramenta Lario sponsorizzazione 2026",
        }),
      ),
    ).toMatchObject({
      center: "sponsor",
      nature: "commerciale",
      confidence: "alta",
    });
    expect(
      proposeClassification(
        e({
          code: "c",
          amount: 180,
          category: "ENTRATA_DA_CLASSIFICARE",
          note: "incasso biglietteria Prima",
        }),
      ),
    ).toMatchObject({ center: "biglietteria", nature: "commerciale" });
    expect(
      proposeClassification(
        e({
          code: "d",
          amount: 90,
          category: "ENTRATA_DA_CLASSIFICARE",
          note: "bar club house Dervio",
        }),
      ),
    ).toMatchObject({
      center: "club-house-dervio",
      nature: "commerciale",
      confidence: "alta",
    });
    expect(
      proposeClassification(
        e({
          code: "e",
          amount: -40,
          kind: "POS",
          category: "CLUB_HOUSE_ACQUISTI",
          counterparty: "Market Bellano",
        }),
      ),
    ).toMatchObject({
      center: "club-house",
      nature: "commerciale",
      confidence: "media",
    });
    expect(
      proposeClassification(
        e({ code: "f", amount: 30, category: "PULMINO", family: true }),
      ),
    ).toMatchObject({ center: "pulmini", nature: "istituzionale" });
    expect(
      proposeClassification(
        e({ code: "g", amount: 50, category: "FONDO_SOLIDALE", family: true }),
      ),
    ).toMatchObject({ center: "fondo-solidale", nature: "istituzionale" });
    expect(
      proposeClassification(
        e({
          code: "h",
          amount: -300,
          kind: "PRELIEVO",
          category: "PRELIEVO_CONTANTI",
        }),
      ),
    ).toMatchObject({ center: "giroconto-cassa", nature: "neutro" });
    expect(
      proposeClassification(
        e({
          code: "i",
          amount: 210,
          kind: "SUMUP_ACCREDITO",
          category: "INCASSI_SUMUP",
          counterparty: "SumUp",
        }),
      ),
    ).toMatchObject({ center: "incassi-pos", confidence: "bassa" });
  });

  it("classifies suppliers by category from counterparty", () => {
    expect(
      proposeClassification(
        e({
          code: "s1",
          amount: -394,
          category: "FORNITORE",
          counterparty: "Rossi Sport Legea",
        }),
      ),
    ).toMatchObject({ center: "materiale-sportivo", nature: "istituzionale" });
    expect(
      proposeClassification(
        e({
          code: "s2",
          amount: -120,
          category: "FORNITORE",
          counterparty: "Distribuzione Bevande Colico",
        }),
      ),
    ).toMatchObject({ center: "club-house-colico", nature: "commerciale" });
    expect(
      proposeClassification(
        e({
          code: "s3",
          amount: -80,
          category: "FORNITORE",
          counterparty: "Enel Energia",
        }),
      ),
    ).toMatchObject({ center: "utenze-impianti", confidence: "bassa" });
    expect(
      proposeClassification(
        e({
          code: "s4",
          amount: -80,
          category: "FORNITORE",
          counterparty: "Studio Bianchi",
        }),
      ),
    ).toMatchObject({ center: "fornitori", confidence: "bassa" });
  });

  it("does not let a family transfer turn commercial because of its free text", () => {
    expect(
      proposeClassification(
        e({ code: "f1", amount: 100, family: true, note: "sponsor maglia" }),
      ),
    ).toMatchObject({ center: "quote", nature: "istituzionale" });
  });
});

describe("running balance", () => {
  const items = [
    // newest first, as the board sends them
    e({
      code: "3",
      bookedAt: "2026-10-02T09:00:00+02:00",
      amount: -50,
      fee: 0,
      balance: 1069,
    }),
    e({
      code: "2",
      bookedAt: "2026-09-30T09:00:00+02:00",
      amount: 20,
      fee: 1,
      balance: 1119,
    }),
    e({
      code: "1",
      bookedAt: "2026-09-29T09:00:00+02:00",
      amount: 100,
      fee: 0,
      balance: 1100,
    }),
  ];

  it("derives the opening balance from the statement and computes each balance", () => {
    const asc = chronological(items);
    expect(asc.map((x) => x.code)).toEqual(["1", "2", "3"]);
    expect(openingBalance(asc)).toBe(1000);
    const { rows, openings } = buildPrimaNota(items);
    expect(openings.sumup).toBe(1000);
    expect(rows.map((r) => r.computedBalance)).toEqual([1100, 1119, 1069]);
    expect(rows.every((r) => !r.balanceMismatch)).toBe(true);
  });

  it("flags a printed balance that does not match the computed one", () => {
    const broken = [
      ...items.slice(0, 2),
      e({
        code: "1",
        bookedAt: "2026-09-29T09:00:00+02:00",
        amount: 100,
        balance: 1100,
      }),
      e({
        code: "0",
        bookedAt: "2026-09-28T09:00:00+02:00",
        amount: 10,
        balance: 990,
      }),
    ];
    // 990 -> +100 = 1090 but statement says 1100
    const { rows } = buildPrimaNota(broken);
    expect(rows.find((r) => r.entry.code === "1")?.balanceMismatch).toBe(true);
  });

  it("keeps the statement order for movements booked at the same instant", () => {
    const same = [
      e({ code: "b", bookedAt: "2026-09-01T10:00:00Z", amount: 5 }),
      e({ code: "a", bookedAt: "2026-09-01T10:00:00Z", amount: 5 }),
    ];
    expect(chronological(same).map((x) => x.code)).toEqual(["a", "b"]);
  });

  it("starts from zero and returns null balances when the statement has none", () => {
    const { rows, openings } = buildPrimaNota([e({ code: "x", amount: 10 })]);
    expect(openings.sumup).toBeNull();
    expect(rows[0]?.computedBalance).toBeNull();
  });
});

describe("cash traceability", () => {
  it("flags cash movements of 1.000 € or more only", () => {
    expect(
      cashFlag(
        e({
          code: "p",
          amount: -1000,
          kind: "PRELIEVO",
          category: "PRELIEVO_CONTANTI",
        }),
      ),
    ).toBe(true);
    expect(
      cashFlag(
        e({
          code: "p",
          amount: -999.99,
          kind: "PRELIEVO",
          category: "PRELIEVO_CONTANTI",
        }),
      ),
    ).toBe(false);
    expect(cashFlag(e({ code: "b", amount: 5000, kind: "BONIFICO_IN" }))).toBe(
      false,
    );
    expect(
      cashFlag(e({ code: "c", amount: 1200, account: "CASSA_SEDE" })),
    ).toBe(true);
    expect(accountOf({ kind: "BONIFICO_IN" })).toBe("sumup");
    expect(accountOf({ kind: "BONIFICO_IN", account: "BPS_123" })).toBe(
      "banca",
    );
  });

  it("finds days where smaller cash withdrawals add up to 1.000 €", () => {
    const days = cashSplitDays([
      e({
        code: "1",
        bookedAt: "2026-08-11T09:00:00+02:00",
        amount: -500,
        kind: "PRELIEVO",
        category: "PRELIEVO_CONTANTI",
      }),
      e({
        code: "2",
        bookedAt: "2026-08-11T18:00:00+02:00",
        amount: -500,
        kind: "PRELIEVO",
        category: "PRELIEVO_CONTANTI",
      }),
      e({
        code: "3",
        bookedAt: "2026-08-12T09:00:00+02:00",
        amount: -400,
        kind: "PRELIEVO",
        category: "PRELIEVO_CONTANTI",
      }),
    ]);
    expect(days).toEqual([{ day: "2026-08-11", total: 1000, count: 2 }]);
  });

  it("uses the Rome calendar day", () => {
    expect(romeDay("2026-09-30T23:30:00Z")).toBe("2026-10-01");
  });
});

describe("month totals, filters, CSV and closing", () => {
  const items = [
    e({
      code: "q1",
      bookedAt: "2026-09-05T10:00:00+02:00",
      amount: 200,
      family: true,
      matchState: "PROPOSTO",
      balance: 1200,
      linkLabel: "Mario Rossi · U15",
      linkKind: "FEE_POSITION",
      linkRef: "SCD-1",
    }),
    e({
      code: "s1",
      bookedAt: "2026-09-06T10:00:00+02:00",
      amount: 300,
      category: "ENTRATA_DA_CLASSIFICARE",
      counterparty: "Bar Centrale; sponsor",
      balance: 1500,
    }),
    e({
      code: "p1",
      bookedAt: "2026-09-07T10:00:00+02:00",
      amount: -1000,
      kind: "PRELIEVO",
      category: "PRELIEVO_CONTANTI",
      balance: 500,
    }),
    e({
      code: "f1",
      bookedAt: "2026-09-08T10:00:00+02:00",
      amount: -100,
      fee: 0.5,
      kind: "BONIFICO_OUT",
      category: "FORNITORE",
      counterparty: "Sport Lario",
      matchState: "DA_ABBINARE",
      balance: 399.5,
    }),
    e({
      code: "q2",
      bookedAt: "2026-10-01T10:00:00+02:00",
      amount: 50,
      family: true,
      matchState: "DA_ABBINARE",
      balance: 449.5,
    }),
  ];
  const { rows } = buildPrimaNota(items);

  it("computes month totals by nature with opening and closing", () => {
    const t = monthTotals(rows, "2026-09");
    expect(t).toMatchObject({
      movements: 4,
      incoming: 500,
      outgoing: 1100,
      fees: 0.5,
      net: -600.5,
      institutionalIn: 200,
      commercialIn: 300,
      toReconcile: 2,
      toMatch: 1,
      proposed: 1,
      cashFlags: 1,
      mismatches: 0,
      opening: 1000,
      closing: 399.5,
    });
    const o = monthTotals(rows, "2026-10");
    expect(o).toMatchObject({ opening: 399.5, closing: 449.5, movements: 1 });
    expect(seasonCommercialIn(rows, "2026-10")).toBe(300);
  });

  it("filters by month, direction, nature and reconciliation", () => {
    expect(
      filterRows(rows, {
        ...EMPTY_FILTER,
        month: "2026-09",
        direction: "uscita",
      }).map((r) => r.entry.code),
    ).toEqual(["p1", "f1"]);
    expect(
      filterRows(rows, { ...EMPTY_FILTER, nature: "commerciale" }).map(
        (r) => r.entry.code,
      ),
    ).toEqual(["s1"]);
    expect(
      filterRows(rows, { ...EMPTY_FILTER, toReconcile: true }).map(
        (r) => r.entry.code,
      ),
    ).toEqual(["q1", "f1", "q2"]);
    expect(
      filterRows(rows, { ...EMPTY_FILTER, center: "giroconto-cassa" }),
    ).toHaveLength(1);
  });

  it("exports the month as CSV without athlete names, quoting separators", () => {
    const csv = primaNotaCsv(
      filterRows(rows, { ...EMPTY_FILTER, month: "2026-09" }),
    );
    const lines = csv.trim().split("\r\n");
    expect(lines).toHaveLength(5);
    expect(lines[0]).toContain("Centro di costo (proposto)");
    expect(csv).not.toContain("Mario Rossi");
    expect(csv).toContain('"Entrata da classificare · Bar Centrale; sponsor"');
    expect(lines[3]).toContain("1000,00");
    expect(lines[3]).toContain(";SI;");
  });

  it("builds the closing checklist with the 15th deadline", () => {
    expect(closingDeadline("2026-09")).toBe("2026-10-15");
    expect(closingDeadline("2026-12")).toBe("2027-01-15");
    const t = monthTotals(rows, "2026-09");
    const list = closingChecklist(
      t,
      0,
      {
        available: true,
        people: 3,
        netTotal: 900,
        paid: 1,
        paidTotal: 300,
        toPay: 2,
        missingIban: 1,
        volunteerIssues: 0,
      },
      {
        available: false,
        overdue: 0,
        overdueTotal: 0,
        dueNext: 0,
        dueNextTotal: 0,
      },
      "2026-10-13",
    );
    const by = Object.fromEntries(list.map((c) => [c.id, c]));
    expect(by["riconciliazione"]?.state).toBe("da-fare");
    expect(by["contanti"]?.state).toBe("attenzione");
    expect(by["compensi"]?.state).toBe("attenzione");
    expect(by["compensi"]?.detail).toContain("IBAN da confermare: 1");
    expect(by["fornitori"]?.state).toBe("non-disponibile");
    expect(by["scadenza"]?.value).toBe("15/10/2026");
    expect(
      closingChecklist(
        t,
        0,
        {
          available: false,
          people: 0,
          netTotal: 0,
          paid: 0,
          paidTotal: 0,
          toPay: 0,
          missingIban: 0,
          volunteerIssues: 0,
        },
        {
          available: true,
          overdue: 0,
          overdueTotal: 0,
          dueNext: 0,
          dueNextTotal: 0,
        },
        "2026-10-16",
      ).find((c) => c.id === "scadenza")?.state,
    ).toBe("attenzione");
  });

  it("counts volunteers with anything but documented reimbursements", () => {
    const n = volunteerIssueCount([
      {
        contractType: "VOLONTARIATO_SPORTIVO",
        fixed: 0,
        entries: [
          {
            kind: "RIMBORSO_SPESE",
            status: "ATTIVA",
            documentId: "d1",
            sign: 1,
          },
        ],
      },
      {
        contractType: "VOLONTARIATO_SPORTIVO",
        fixed: 0,
        entries: [
          {
            kind: "RIMBORSO_SPESE",
            status: "ATTIVA",
            documentId: null,
            sign: 1,
          },
        ],
      },
      { contractType: "VOLONTARIATO_SPORTIVO", fixed: 100, entries: [] },
      {
        contractType: "VOLONTARIATO_SPORTIVO",
        fixed: 0,
        entries: [
          { kind: "PREMIO", status: "ANNULLATA", documentId: null, sign: 1 },
        ],
      },
      { contractType: "LAVORO_SPORTIVO", fixed: 500, entries: [] },
    ]);
    expect(n).toBe(2);
  });
});
