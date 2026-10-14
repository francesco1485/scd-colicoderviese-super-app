import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { draftToHtml } from "@/components/lottery/DraftDocument";

import { findArea } from "./areas";
import {
  addDays,
  buildRegolamento,
  buildVerbale,
  checkBlock,
  checkLedgerEntry,
  checkPrize,
  checkSeries,
  checkSetup,
  COMPLIANCE_ITEMS,
  complianceSchedule,
  countdown,
  daysBetween,
  dueDateOf,
  emptySetup,
  emptyState,
  formatEuro,
  fundsSummary,
  LOTTERY_TICKETS_CAP_CENTS,
  maxTicketsAt,
  parseEuroToCents,
  parseRanges,
  formatRanges,
  percentOf,
  prizeTotals,
  prizeVerdict,
  proposeDraw,
  publicWindow,
  reconcile,
  regolamentoMissing,
  remainingPrizes,
  sixteenthOfNextMonth,
  suggestSeries,
  ticketState,
  toPublic,
  TOMBOLA_PRIZES_CAP_CENTS,
  winners,
  type DrawEntry,
  type LotterySetup,
  type LotteryState,
  type Prize,
  type SeriesRange,
  type TicketBlock,
} from "./lottery";
import {
  explainLotteryError,
  lotteryEngineState,
  parsePublicLottery,
  toState,
  type LotteryRow,
} from "./lottery.server";
import { WORK_AREAS } from "./work-areas";

const SQL = readFileSync(
  fileURLToPath(
    new URL(
      "../../../../supabase/migrations/20261014_r102_lotteria.sql",
      import.meta.url,
    ),
  ),
  "utf8",
);

// Test fixtures only: neutral values, never shown in the app.
const setup = (over: Partial<LotterySetup> = {}): LotterySetup => ({
  ...emptySetup(),
  ...over,
});
const prize = (rank: number, over: Partial<Prize> = {}): Prize => ({
  id: `p${rank}`,
  rank,
  description: `Premio di prova ${rank}`,
  category: "BENE",
  origin: "DONATO",
  sponsorSlug: null,
  donorText: "",
  declaredValueCents: null,
  ...over,
});
const block = (
  over: Partial<TicketBlock> &
    Pick<TicketBlock, "id" | "series" | "from" | "to">,
): TicketBlock => ({
  seller: "Venditore Prova",
  sellerAdultConfirmed: true,
  assignedOn: "2026-11-01",
  status: "ASSEGNATO",
  unsold: [],
  collectedCents: null,
  note: "",
  ...over,
});
const SERIES: SeriesRange[] = [
  { series: "A", first: 1, last: 100 },
  { series: "B", first: 1, last: 100 },
];

describe("money and days", () => {
  it("parses Italian amounts into cents and refuses junk", () => {
    expect(parseEuroToCents("2,50")).toBe(250);
    expect(parseEuroToCents("2.50")).toBe(250);
    expect(parseEuroToCents("€ 3")).toBe(300);
    expect(parseEuroToCents("1.200,00")).toBe(120000);
    expect(parseEuroToCents("1.200")).toBe(120000);
    expect(parseEuroToCents("51645,69")).toBe(LOTTERY_TICKETS_CAP_CENTS);
    for (const bad of ["", "abc", "-2", "2,555", "1,2,3"])
      expect(parseEuroToCents(bad), bad).toBeNull();
  });

  it("formats euro in it-IT", () => {
    expect(formatEuro(LOTTERY_TICKETS_CAP_CENTS)).toBe("51.645,69 €");
    expect(formatEuro(TOMBOLA_PRIZES_CAP_CENTS)).toBe("12.911,42 €");
    expect(formatEuro(null)).toBe("");
  });

  it("computes days, the F24 day and rounding", () => {
    expect(addDays("2026-12-14", -30)).toBe("2026-11-14");
    expect(addDays("2027-03-30", -30)).toBe("2027-02-28");
    expect(daysBetween("2026-10-14", "2026-11-13")).toBe(30);
    expect(sixteenthOfNextMonth("2026-12-14")).toBe("2027-01-16");
    expect(sixteenthOfNextMonth("2027-01-31")).toBe("2027-02-16");
    expect(percentOf(12345, 10)).toBe(1235);
  });
});

describe("setup: legal cap and dates", () => {
  it("accepts exactly the cap and refuses one cent more (lotteria)", () => {
    expect(
      checkSetup(
        setup({ ticketPriceCents: 1, ticketsTotal: LOTTERY_TICKETS_CAP_CENTS }),
      ).errors,
    ).toEqual([]);
    const over = checkSetup(
      setup({
        ticketPriceCents: 1,
        ticketsTotal: LOTTERY_TICKETS_CAP_CENTS + 1,
      }),
    );
    expect(over.errors.map((e) => e.field)).toContain("ticketsTotal");
    expect(over.errors[0]!.message).toContain("51.645,69");
  });

  it("computes the total and the max quantity at a price", () => {
    const c = checkSetup(
      setup({ ticketPriceCents: 250, ticketsTotal: 20_000 }),
    );
    expect(c.totalCents).toBe(5_000_000);
    expect(c.capCents).toBe(LOTTERY_TICKETS_CAP_CENTS);
    expect(c.errors).toEqual([]);
    expect(maxTicketsAt(250, "LOTTERIA")).toBe(20_658);
    expect(
      checkSetup(setup({ ticketPriceCents: 250, ticketsTotal: 20_659 })).errors
        .length,
    ).toBe(1);
    expect(maxTicketsAt(250, "TOMBOLA")).toBeNull();
  });

  it("applies the same cap to pesca and none to tombola tickets", () => {
    expect(
      checkSetup(
        setup({ kind: "PESCA", ticketPriceCents: 100, ticketsTotal: 60_000 }),
      ).errors.length,
    ).toBe(1);
    expect(
      checkSetup(
        setup({ kind: "TOMBOLA", ticketPriceCents: 100, ticketsTotal: 60_000 }),
      ).errors,
    ).toEqual([]);
  });

  it("keeps unknown values unknown: nothing is invented", () => {
    const c = checkSetup(emptySetup());
    expect(c.totalCents).toBeNull();
    expect(c.errors).toEqual([]);
    expect(c.missing).toEqual(
      expect.arrayContaining([
        "nome dell'iniziativa",
        "data dell'estrazione",
        "prezzo del biglietto",
        "giornata dello sport",
      ]),
    );
    const e = emptySetup();
    expect([
      e.title,
      e.saleFrom,
      e.drawDate,
      e.sportDay,
      e.ticketPriceCents,
      e.ticketsTotal,
      e.goalCents,
      e.drawOrder,
    ]).toEqual(["", null, null, null, null, null, null, null]);
  });

  it("refuses dates out of order and bad numbers", () => {
    const fields = (s: Partial<LotterySetup>) =>
      checkSetup(setup(s)).errors.map((e) => e.field);
    expect(
      fields({ saleFrom: "2026-11-10", saleUntil: "2026-11-01" }),
    ).toContain("saleUntil");
    expect(
      fields({ saleUntil: "2026-12-20", drawDate: "2026-12-14" }),
    ).toContain("saleUntil");
    expect(
      fields({ drawDate: "2026-12-14", prizeDeliveryUntil: "2026-12-01" }),
    ).toContain("prizeDeliveryUntil");
    expect(fields({ drawDate: "2026-02-30" })).toContain("drawDate");
    expect(fields({ drawTime: "25:00" })).toContain("drawTime");
    expect(fields({ ticketPriceCents: 0 })).toContain("ticketPriceCents");
    expect(fields({ ticketsTotal: 0 })).toContain("ticketsTotal");
    expect(fields({ beneficiary: " " })).toContain("beneficiary");
  });
});

describe("numbering plan", () => {
  it("suggests equal series that add up to the tickets issued", () => {
    const s = suggestSeries(2_500, 1_000);
    expect(s).toEqual([
      { series: "A", first: 1, last: 1000 },
      { series: "B", first: 1, last: 1000 },
      { series: "C", first: 1, last: 500 },
    ]);
    expect(checkSeries(s, 2_500)).toEqual([]);
    expect(suggestSeries(27 * 10, 10).at(-1)!.series).toBe("AA");
  });

  it("flags wrong totals, duplicates and bad codes", () => {
    expect(checkSeries(SERIES, 150)[0]!.message).toContain("200");
    expect(
      checkSeries([...SERIES, { series: "A", first: 1, last: 1 }], null).some(
        (i) => i.message.includes("ripetuta"),
      ),
    ).toBe(true);
    expect(
      checkSeries([{ series: "a1", first: 1, last: 10 }], null).length,
    ).toBe(1);
    expect(
      checkSeries([{ series: "A", first: 10, last: 1 }], null).length,
    ).toBe(1);
  });
});

describe("compliance deadlines", () => {
  const s = setup({
    drawDate: "2026-12-14",
    saleFrom: "2026-11-15",
    prizeDeliveryUntil: "2027-01-31",
  });

  it("puts communications 30 days before the draw and the F24 on the 16th of the next month", () => {
    const due = (code: string) =>
      dueDateOf(
        COMPLIANCE_ITEMS.find((i) => i.code === code)!,
        s,
      );
    expect(due("COM_PREFETTO")).toBe("2026-11-14");
    expect(due("COM_SINDACO_SUAP")).toBe("2026-11-14");
    expect(due("COM_ADM")).toBe("2026-11-14");
    expect(due("REGOLAMENTO")).toBe("2026-11-14");
    expect(due("REGISTRI")).toBe("2026-11-14");
    expect(due("ANNUNCIO_NULLI")).toBe("2026-12-14");
    expect(due("RITENUTA_F24")).toBe("2027-01-16");
    expect(due("CONSEGNA_PREMI")).toBe("2027-01-31");
  });

  it("marks ADM and withholding as to verify, and filters by kind", () => {
    const certainty = Object.fromEntries(
      COMPLIANCE_ITEMS.map((i) => [i.code, i.certainty]),
    );
    expect(certainty["COM_ADM"]).toBe("VERIFICARE");
    expect(certainty["RITENUTA_F24"]).toBe("VERIFICARE");
    const codes = (k: LotterySetup["kind"]) =>
      complianceSchedule(setup({ kind: k }), {}, "2026-10-14").map(
        (r) => r.code,
      );
    expect(codes("TOMBOLA")).toContain("CAUZIONE_TOMBOLA");
    expect(codes("LOTTERIA")).not.toContain("CAUZIONE_TOMBOLA");
    expect(codes("LOTTERIA")).toContain("ANNUNCIO_NULLI");
  });

  it("computes the state of each item on a given day", () => {
    const rows = complianceSchedule(
      s,
      {
        COM_SINDACO_SUAP: {
          status: "FATTO",
          protocol: "n. 1",
          doneOn: "2026-11-01",
          note: "",
        },
      },
      "2026-11-10",
    );
    const st = Object.fromEntries(rows.map((r) => [r.code, r.dueState]));
    expect(st["COM_PREFETTO"]).toBe("IN_SCADENZA");
    expect(st["COM_SINDACO_SUAP"]).toBe("FATTO");
    expect(st["RITENUTA_F24"]).toBe("IN_TEMPO");
    expect(
      complianceSchedule(s, {}, "2026-11-20").find(
        (r) => r.code === "COM_PREFETTO",
      )!.dueState,
    ).toBe("SCADUTO");
    expect(
      complianceSchedule(emptySetup(), {}, "2026-11-20").every(
        (r) => r.dueState === "SENZA_DATA",
      ),
    ).toBe(true);
  });
});

describe("prizes", () => {
  it("refuses money, precious metal bars, securities, cards and bank instruments", () => {
    for (const t of [
      "Buono in denaro",
      "500 euro in contanti",
      "Lingotto d'oro da 10 g",
      "Oro in barre",
      "Titoli di Stato",
      "Azioni della società X",
      "Obbligazioni",
      "BTP",
      "Carta di credito",
      "Carta prepagata ricaricata",
      "Assegno circolare",
      "Bonifico",
      "Libretto di risparmio",
      "Buono fruttifero postale",
    ])
      expect(prizeVerdict(t)?.level, t).toBe("forbidden");
  });

  it("accepts goods and services, and flags vouchers to verify", () => {
    for (const t of [
      "Bicicletta",
      "Cena per due al ristorante",
      "Pallone ufficiale",
      "Abbonamento in palestra 3 mesi",
      "Orologio da polso",
      "Cesto di prodotti tipici",
    ])
      expect(prizeVerdict(t), t).toBeNull();
    expect(prizeVerdict("Buono acquisto in negozio")?.level).toBe("check");
    expect(prizeVerdict("Gift card")?.level).toBe("check");
    expect(
      checkPrize({ ...prize(1, { description: "Contanti" }) }).map(
        (i) => i.field,
      ),
    ).toContain("description");
    expect(checkPrize(prize(1))).toEqual([]);
  });

  it("totals declared values and computes the 10% withholding on all prizes", () => {
    const t = prizeTotals(
      [
        prize(1, { declaredValueCents: 30000, origin: "ACQUISTATO" }),
        prize(2, { declaredValueCents: 12345 }),
        prize(3),
      ],
      "LOTTERIA",
    );
    expect(t.totalCents).toBe(42345);
    expect(t.withholdingCents).toBe(4235);
    expect(t.withoutValue).toBe(1);
    expect(t.complete).toBe(false);
    expect(
      prizeTotals(
        [prize(1, { declaredValueCents: TOMBOLA_PRIZES_CAP_CENTS + 1 })],
        "TOMBOLA",
      ).overTombolaCap,
    ).toBe(true);
    expect(
      prizeTotals([prize(1), prize(1, { id: "x" })], "LOTTERIA").duplicateRanks,
    ).toEqual([1]);
  });
});

describe("ticket register and reconciliation", () => {
  const blocks: TicketBlock[] = [
    block({
      id: "b1",
      series: "A",
      from: 1,
      to: 50,
      status: "RESTITUITO",
      unsold: [{ from: 41, to: 50 }],
      collectedCents: 10000,
    }),
    block({
      id: "b2",
      series: "A",
      from: 51,
      to: 100,
      status: "NON_RESTITUITO",
    }),
    block({
      id: "b3",
      series: "B",
      from: 1,
      to: 20,
      status: "RESTITUITO",
      collectedCents: 4000,
    }),
  ];

  it("validates blocks against series and other blocks", () => {
    const ok = block({ id: "n", series: "B", from: 21, to: 40 });
    expect(checkBlock(ok, SERIES, blocks)).toEqual([]);
    expect(
      checkBlock(
        block({ id: "n", series: "B", from: 10, to: 30 }),
        SERIES,
        blocks,
      ).some((i) => i.message.includes("sovrappone")),
    ).toBe(true);
    expect(
      checkBlock(
        block({ id: "n", series: "B", from: 90, to: 120 }),
        SERIES,
        blocks,
      ).some((i) => i.message.includes("esce")),
    ).toBe(true);
    expect(
      checkBlock(
        block({ id: "n", series: "C", from: 1, to: 2 }),
        SERIES,
        blocks,
      ).length,
    ).toBeGreaterThan(0);
    expect(
      checkBlock(
        block({
          id: "n",
          series: "B",
          from: 21,
          to: 40,
          sellerAdultConfirmed: false,
        }),
        SERIES,
        blocks,
      ).some((i) => i.message.includes("maggiorenne")),
    ).toBe(true);
    expect(
      checkBlock(
        block({ id: "n", series: "B", from: 21, to: 40, seller: " " }),
        SERIES,
        blocks,
      ).length,
    ).toBe(1);
    expect(
      checkBlock(
        block({
          id: "n",
          series: "B",
          from: 21,
          to: 40,
          status: "RESTITUITO",
          unsold: [{ from: 50, to: 60 }],
        }),
        SERIES,
        blocks,
      ).length,
    ).toBe(1);
    expect(
      checkBlock(
        block({
          id: "n",
          series: "B",
          from: 21,
          to: 40,
          unsold: [{ from: 25, to: 26 }],
        }),
        SERIES,
        blocks,
      ).length,
    ).toBe(1);
  });

  it("parses and formats unsold ranges", () => {
    expect(parseRanges("41-50, 37 ; 12–13")).toEqual([
      { from: 12, to: 13 },
      { from: 37, to: 37 },
      { from: 41, to: 50 },
    ]);
    expect(parseRanges("5-2")).toBeNull();
    expect(parseRanges("x")).toBeNull();
    expect(parseRanges("")).toEqual([]);
    expect(
      formatRanges([
        { from: 1, to: 1 },
        { from: 3, to: 9 },
      ]),
    ).toBe("1, 3-9");
  });

  it("reconciles sold, unsold, never assigned, void and money", () => {
    const r = reconcile(SERIES, blocks, 200);
    expect(r.issued).toBe(200);
    expect(r.assigned).toBe(120);
    expect(r.notAssigned).toBe(80);
    expect(r.notAssignedRanges).toEqual([{ series: "B", from: 21, to: 100 }]);
    expect(r.sold).toBe(40 + 20);
    expect(r.returnedUnsold).toBe(10);
    expect(r.voidCount).toBe(50);
    expect(r.voidBlocks).toEqual([
      { series: "A", from: 51, to: 100, seller: "Venditore Prova", count: 50 },
    ]);
    expect(r.expectedCents).toBe(12000);
    expect(r.collectedCents).toBe(14000);
    expect(r.differenceCents).toBe(2000);
    expect(r.readyForDraw).toBe(true);
    const out = reconcile(
      SERIES,
      [...blocks, block({ id: "b4", series: "B", from: 21, to: 30 })],
      200,
    );
    expect(out.readyForDraw).toBe(false);
    expect(out.stillOutBlocks).toBe(1);
    expect(reconcile(SERIES, blocks, null).differenceCents).toBeNull();
  });

  it("decides what a drawn ticket means", () => {
    expect(ticketState(SERIES, blocks, "A", 10)).toBe("VALIDO");
    expect(ticketState(SERIES, blocks, "A", 45)).toBe("INVENDUTO");
    expect(ticketState(SERIES, blocks, "A", 60)).toBe("NULLO");
    expect(ticketState(SERIES, blocks, "B", 50)).toBe("FUORI_BLOCCO");
    expect(ticketState(SERIES, blocks, "C", 1)).toBe("NON_EMESSO");
    expect(ticketState(SERIES, blocks, "A", 101)).toBe("NON_EMESSO");
    expect(
      ticketState(
        SERIES,
        [block({ id: "o", series: "A", from: 1, to: 10 })],
        "A",
        5,
      ),
    ).toBe("DA_RICONCILIARE");
  });
});

describe("draw", () => {
  const blocks: TicketBlock[] = [
    block({
      id: "b1",
      series: "A",
      from: 1,
      to: 100,
      status: "RESTITUITO",
      unsold: [{ from: 90, to: 100 }],
    }),
  ];
  const prizes = [prize(1), prize(2), prize(3)];

  it("assigns valid tickets to prizes in the regolamento order, never twice", () => {
    expect(
      remainingPrizes(prizes, [], "DALL_ULTIMO").map((p) => p.rank),
    ).toEqual([3, 2, 1]);
    expect(remainingPrizes(prizes, [], "DAL_PRIMO").map((p) => p.rank)).toEqual(
      [1, 2, 3],
    );
    const first = proposeDraw(
      SERIES,
      blocks,
      prizes,
      [],
      "DALL_ULTIMO",
      "A",
      7,
    );
    expect(first).toEqual({
      state: "VALIDO",
      prize: prizes[2],
      duplicate: false,
    });
    const draws: DrawEntry[] = [
      {
        id: "d1",
        order: 1,
        series: "A",
        number: 7,
        state: "VALIDO",
        prizeId: "p3",
        at: null,
      },
    ];
    expect(
      proposeDraw(SERIES, blocks, prizes, draws, "DALL_ULTIMO", "A", 7)
        .duplicate,
    ).toBe(true);
    expect(
      proposeDraw(SERIES, blocks, prizes, draws, "DALL_ULTIMO", "A", 95),
    ).toEqual({ state: "INVENDUTO", prize: null, duplicate: false });
    expect(
      proposeDraw(SERIES, blocks, prizes, draws, "DALL_ULTIMO", "A", 8).prize
        ?.rank,
    ).toBe(2);
  });

  it("lists winners by prize rank", () => {
    const draws: DrawEntry[] = [
      {
        id: "d1",
        order: 1,
        series: "A",
        number: 7,
        state: "VALIDO",
        prizeId: "p3",
        at: null,
      },
      {
        id: "d2",
        order: 2,
        series: "A",
        number: 95,
        state: "INVENDUTO",
        prizeId: null,
        at: null,
      },
      {
        id: "d3",
        order: 3,
        series: "A",
        number: 12,
        state: "VALIDO",
        prizeId: "p1",
        at: null,
      },
    ];
    expect(
      winners(prizes, draws).map((w) => [w.rank, w.series, w.number]),
    ).toEqual([
      [1, "A", 12],
      [3, "A", 7],
    ]);
  });
});

describe("drafts", () => {
  const full: LotteryState = {
    ...emptyState(),
    id: "x",
    setup: setup({
      title: "Iniziativa di prova",
      ticketPriceCents: 200,
      ticketsTotal: 200,
      saleFrom: "2026-11-15",
      saleUntil: "2026-12-13",
      drawDate: "2026-12-14",
      drawTime: "18:00",
      drawPlace: "Luogo di prova",
      drawComune: "Comune di prova",
      drawOrder: "DALL_ULTIMO",
      prizeDeliveryPlace: "Sede di prova",
      prizeDeliveryUntil: "2027-01-31",
    }),
    series: SERIES,
    prizes: [prize(1, { declaredValueCents: 5000 }), prize(2)],
    blocks: [
      block({
        id: "b1",
        series: "A",
        from: 1,
        to: 50,
        status: "RESTITUITO",
        unsold: [{ from: 41, to: 50 }],
      }),
      block({
        id: "b2",
        series: "A",
        from: 51,
        to: 100,
        status: "NON_RESTITUITO",
      }),
    ],
    draws: [
      {
        id: "d1",
        order: 1,
        series: "A",
        number: 60,
        state: "NULLO",
        prizeId: null,
        at: null,
      },
      {
        id: "d2",
        order: 2,
        series: "A",
        number: 3,
        state: "VALIDO",
        prizeId: "p2",
        at: null,
      },
    ],
  };

  it("fills the art. 14 contents of the regolamento and marks the gaps", () => {
    const md = buildRegolamento(
      full.setup,
      full.series,
      full.prizes,
      "2026-10-14",
    );
    expect(md).toContain("200 biglietti al prezzo di 2,00 €");
    expect(md).toContain("valore complessivo di 400,00 €");
    expect(md).toContain("serie A dal n. 1 al n. 100");
    expect(md).toContain("provincia di Lecco");
    expect(md).toContain("1. Premio di prova 1 — valore dichiarato 50,00 €");
    expect(md).toContain("2. Premio di prova 2 — [da completare: valore]");
    expect(md).toContain("lunedì 14 dicembre 2026 alle ore 18:00");
    expect(md).toContain("dall'ultimo premio al 1°");
    expect(md).toContain("[da completare: luogo di esposizione dei premi]");
    expect(md).toContain("[da completare: sede legale]");
    expect(md).toContain("Generata dall'app il 14/10/2026");
    expect(regolamentoMissing(full.setup, full.series, full.prizes)).toContain(
      "dove sono esposti i premi",
    );
  });

  it("builds the verbale with closing numbers, void tickets, the draw table and signature lines", () => {
    const md = buildVerbale(full);
    expect(md).toContain("Biglietti emessi: 200");
    expect(md).toContain("Biglietti venduti: 40");
    expect(md).toContain("Biglietti invenduti restituiti: 10");
    expect(md).toContain("Biglietti nulli (registri non restituiti): 50");
    expect(md).toContain("serie A, dal n. 51 al n. 100 (50 biglietti)");
    expect(md).toContain("| 1 | A | 60 | nullo, si ripete | — |");
    expect(md).toContain("| 2 | A | 3 | vincente | 2° — Premio di prova 2 |");
    expect(md).toContain("Premi ancora da estrarre: 1°.");
    expect(md).toContain(
      "L'incaricato del Sindaco ______________________________",
    );
    expect(md).toContain(
      "Il legale rappresentante del promotore ______________________________",
    );
    expect(md).not.toContain("Venditore Prova");
  });

  it("renders the draft HTML escaping user text", () => {
    const html = draftToHtml(
      "# Titolo <b>\n\n- <script>alert(1)</script>\n\n| a | b |\n|---|---|\n| <i> | **x** |\n\n[da completare: data]",
    );
    expect(html).toContain("<h2>Titolo &lt;b&gt;</h2>");
    expect(html).toContain("<li>&lt;script&gt;alert(1)&lt;/script&gt;</li>");
    expect(html).toContain("<td>&lt;i&gt;</td><td><strong>x</strong></td>");
    expect(html).toContain(
      '<mark class="lot-gap">[da completare: data]</mark>',
    );
    expect(html).not.toContain("<script>");
  });
});

describe("funds, public projection and window", () => {
  it("nets proceeds minus costs, ignoring cancelled entries", () => {
    const f = fundsSummary(
      [
        {
          id: "1",
          kind: "INCASSO",
          label: "a",
          amountCents: 50000,
          entryDate: "2026-12-01",
          cancelled: false,
        },
        {
          id: "2",
          kind: "COSTO",
          label: "b",
          amountCents: 8000,
          entryDate: "2026-12-01",
          cancelled: false,
        },
        {
          id: "3",
          kind: "INCASSO",
          label: "c",
          amountCents: 99999,
          entryDate: "2026-12-01",
          cancelled: true,
        },
      ],
      100000,
    );
    expect(f).toEqual({
      proceedsCents: 50000,
      costsCents: 8000,
      netCents: 42000,
      entries: 2,
      goalPercent: 42,
    });
    expect(fundsSummary([], null).goalPercent).toBeNull();
    expect(
      checkLedgerEntry({
        kind: "INCASSO",
        label: "",
        amountCents: 0,
        entryDate: "x",
      }).length,
    ).toBe(3);
  });

  it("shows nothing before publication and winners only once confirmed; no seller names, no values", () => {
    const s: LotteryState = {
      ...emptyState(),
      prizes: [prize(1, { declaredValueCents: 1000, sponsorSlug: "atv" })],
      blocks: [
        block({ id: "b", series: "A", from: 1, to: 10, status: "RESTITUITO" }),
      ],
      draws: [
        {
          id: "d",
          order: 1,
          series: "A",
          number: 3,
          state: "VALIDO",
          prizeId: "p1",
          at: null,
        },
      ],
    };
    expect(toPublic(s)).toBeNull();
    const pub = toPublic({ ...s, publishedOn: "2026-11-01" })!;
    expect(pub.winners).toBeNull();
    expect(JSON.stringify(pub)).not.toContain("Venditore");
    expect(JSON.stringify(pub)).not.toContain("1000");
    expect(pub.prizes).toEqual([
      { rank: 1, description: "Premio di prova 1", sponsorSlug: "atv" },
    ]);
    expect(
      toPublic({
        ...s,
        publishedOn: "2026-11-01",
        winnersConfirmedOn: "2026-12-14",
      })!.winners,
    ).toEqual([
      { rank: 1, prize: "Premio di prova 1", series: "A", number: 3 },
    ]);
  });

  it("keeps the page public from publication to the end of prize delivery", () => {
    expect(
      publicWindow(
        setup({
          drawDate: "2026-12-14",
          sportDay: "2026-12-14",
          prizeDeliveryUntil: "2027-01-31",
        }),
        "2026-11-01",
      ),
    ).toEqual({ showFrom: "2026-11-01", showUntil: "2027-01-31" });
    expect(publicWindow(setup(), "2026-11-01")).toEqual({
      showFrom: "2026-11-01",
      showUntil: "2026-11-01",
    });
    expect(publicWindow(setup(), null)).toBeNull();
    expect(countdown("2026-12-01", "2026-12-14")).toEqual({
      days: 13,
      label: "Mancano 13 giorni",
    });
    expect(countdown("2026-12-14", "2026-12-14")!.label).toBe("È oggi");
    expect(countdown("2026-12-15", "2026-12-14")).toBeNull();
  });
});

describe("server mapping and engine", () => {
  it("detects r102 from the probe error", async () => {
    const client = (error: { code?: string; message: string } | null) => ({
      from: () => ({
        select: () =>
          Object.assign(Promise.resolve({ error }), {
            limit: () => Promise.resolve({ error }),
          }),
      }),
    });
    expect(await lotteryEngineState(client(null))).toBe("applied");
    expect(
      await lotteryEngineState(
        client({
          code: "42P01",
          message: 'relation "scd_lotteries" does not exist',
        }),
      ),
    ).toBe("not-applied");
    expect(
      await lotteryEngineState(client({ code: "XX", message: "boom" })),
    ).toBe("unknown");
    expect(await lotteryEngineState(null)).toBe("unknown");
  });

  it("maps database refusals to plain Italian", () => {
    expect(
      explainLotteryError({ code: "42P01", message: "does not exist" }),
    ).toContain("r102");
    expect(
      explainLotteryError({
        code: "23514",
        message: 'violates check constraint "scd_lotteries_ticket_cap"',
      }),
    ).toContain("51.645,69");
    expect(
      explainLotteryError({ code: "22023", message: "prize forbidden" }),
    ).toContain("beni e servizi");
    expect(
      explainLotteryError({ code: "42501", message: "lottery: not allowed" }),
    ).toContain("permessi");
  });

  it("maps rows to state and parses the public JSON defensively", () => {
    const row: LotteryRow = {
      id: "l1",
      kind: "LOTTERIA",
      title: "",
      beneficiary: "Per il campo",
      sale_from: null,
      sale_until: null,
      draw_date: "2026-12-14",
      draw_time: "18:00:00",
      draw_place: "",
      draw_comune: "",
      sport_day: null,
      sport_day_place: "",
      ticket_price_cents: 200,
      tickets_total: 100,
      prizes_display_place: "",
      prize_delivery_place: "",
      prize_delivery_until: null,
      sale_points: "",
      draw_order: "DAL_PRIMO",
      goal_cents: null,
      published_on: null,
      winners_confirmed_on: null,
    };
    const st = toState(row, {
      series: [{ series: "A", first_number: 1, last_number: 100 }],
      compliance: [
        {
          item_code: "COM_PREFETTO",
          status: "FATTO",
          protocol: "123",
          done_on: "2026-11-01",
          note: null,
        },
      ],
      prizes: [],
      blocks: [
        {
          id: "b",
          series: "A",
          from_number: 1,
          to_number: 10,
          seller: "X",
          seller_adult_confirmed: true,
          assigned_on: null,
          status: "RESTITUITO",
          unsold: [{ from: 9, to: 10 }, { bad: 1 }],
          collected_cents: null,
          note: null,
        },
      ],
      draws: [],
      ledger: [],
    });
    expect(st.setup.drawTime).toBe("18:00");
    expect(st.setup.drawOrder).toBe("DAL_PRIMO");
    expect(st.compliance["COM_PREFETTO"]!.protocol).toBe("123");
    expect(st.blocks[0]!.unsold).toEqual([{ from: 9, to: 10 }]);
    expect(parsePublicLottery(null)).toBeNull();
    expect(parsePublicLottery({ kind: "LOTTERIA" })).toBeNull();
    const p = parsePublicLottery({
      kind: "LOTTERIA",
      title: "T",
      beneficiary: "B",
      publishedOn: "2026-11-01",
      prizes: [{ rank: 1, description: "P", sponsorSlug: null }, { rank: "x" }],
      winners: null,
      netCents: -5,
      goalCents: 1000,
    })!;
    expect(p.prizes.length).toBe(1);
    expect(p.funds).toEqual({ netCents: 0, goalCents: 1000, goalPercent: 0 });
  });
});

describe("migration r102 (staged, not applied)", () => {
  it("is staged, depends on r100 and keeps the cap equal to the code", () => {
    expect(SQL.split("\n")[0]).toContain("STAGED: written, NOT applied");
    expect(SQL).toContain("r102 needs r100 (scd_can)");
    expect(SQL).toContain(`<= ${LOTTERY_TICKETS_CAP_CENTS})`);
    expect(SQL.match(/> 1291142/g)?.length).toBe(2);
    expect(TOMBOLA_PRIZES_CAP_CENTS).toBe(1291142);
    expect(SQL).toContain(
      "scd_can('direzione', 'READ', p_organization_id) or public.scd_can('tesoreria', 'READ', p_organization_id)",
    );
    expect(SQL).not.toMatch(
      /insert into public\.scd_lotteries \(organization_id[^)]*\)\s*values\s*\(\s*'/i,
    );
  });

  it("enables RLS on every table, grants no direct writes and keeps every write function SECURITY DEFINER", () => {
    const tables = [
      ...SQL.matchAll(/create table if not exists public\.(\w+)/g),
    ].map((m) => m[1]!);
    expect(tables.length).toBe(8);
    for (const t of tables)
      expect(SQL, t).toContain(
        `alter table public.${t} enable row level security;`,
      );
    expect(SQL).not.toMatch(/grant (insert|update|delete)/i);
    expect(SQL).not.toMatch(/for (insert|update|delete|all) to/i);
    const fns = [
      ...SQL.matchAll(
        /create or replace function public\.(scd_lottery_\w+)\(([\s\S]*?)\$\$;/g,
      ),
    ];
    expect(fns.length).toBe(20);
    for (const [, name, body] of fns) {
      if (name === "scd_lottery_prize_forbidden") continue;
      expect(body, name).toContain("security definer");
      expect(body, name).toContain("set search_path to 'public'");
    }
    const writes = fns
      .map((f) => f[1]!)
      .filter((n) =>
        /save|set_|remove|record|undo|add_|cancel|confirm/.test(n),
      );
    for (const n of writes)
      expect(SQL, n).toMatch(
        new RegExp(
          `revoke all on function public\\.${n}\\([^)]*\\) from public, anon;`,
        ),
      );
    expect(SQL).toContain(
      "grant execute on function public.scd_lottery_public(text) to anon, authenticated;",
    );
  });

  it("audits every write action", () => {
    for (const a of [
      "SAVE_SETUP",
      "SET_SERIES",
      "SET_COMPLIANCE",
      "SAVE_PRIZE",
      "REMOVE_PRIZE",
      "SAVE_BLOCK",
      "REMOVE_BLOCK",
      "RECORD_DRAW",
      "UNDO_DRAW",
      "ADD_LEDGER",
      "CANCEL_LEDGER",
      "PUBLISH",
      "UNPUBLISH",
      "CONFIRM_WINNERS",
    ])
      expect(SQL, a).toContain(`'${a}'`);
  });

  it("refuses the same forbidden prizes as the code (SQL patterns tested as JS regex)", () => {
    const block = SQL.slice(
      SQL.indexOf("function public.scd_lottery_prize_forbidden"),
      SQL.indexOf("-- 3. Setup"),
    );
    const res = [...block.matchAll(/\$re\$([\s\S]*?)\$re\$/g)].map(
      (m) => new RegExp(m[1]!.replace(/\\m/g, "\\b").replace(/\\M/g, "\\b")),
    );
    expect(res.length).toBe(5);
    const sqlForbidden = (t: string) =>
      res.some((r) => r.test(t.toLowerCase()));
    for (const t of [
      "Buono in denaro",
      "Lingotto d'oro",
      "Oro in barre",
      "Titoli di Stato",
      "Obbligazioni",
      "Carta di credito",
      "Carta prepagata",
      "Assegno circolare",
      "Bonifico",
      "Libretto di risparmio",
      "Bicicletta",
      "Cena per due",
      "Buono acquisto",
      "Pallone",
    ])
      expect(sqlForbidden(t), t).toBe(prizeVerdict(t)?.level === "forbidden");
  });

  it("records the same ticket rule as the code", () => {
    for (const s of [
      "'NON_EMESSO'",
      "'FUORI_BLOCCO'",
      "'DA_RICONCILIARE'",
      "'NULLO'",
      "'INVENDUTO'",
      "'VALIDO'",
    ])
      expect(SQL).toContain(`return ${s};`);
  });
});

describe("registry", () => {
  it("registers the back office as a Direzione/Tesoreria work area and the public page under Eventi", () => {
    const a = findArea("lotteria")!;
    expect(a.path).toBe("/direzione/lotteria");
    expect(a.roles).toEqual([
      "direzione",
      "presidente",
      "direttore-generale",
      "tesoreria",
    ]);
    expect(WORK_AREAS.lotteria.path).toBe("/direzione/lotteria");
    expect(findArea("lotteria-dello-sport")!.path).toBe(
      "/eventi/lotteria-dello-sport",
    );
  });
});
