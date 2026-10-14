import { describe, expect, it } from "vitest";

import snapshot from "@/data/calendario-snapshot-20261010.json";
import {
  REGISTRY_COLUMNS,
  bookingToProposal,
  bookingToRegistryRow,
  checkProposal,
  csvToProposals,
  directionBrief,
  type Proposal,
} from "./bookings-register";
import {
  appendHistory,
  checkRequest,
  checkSlotWithQuadro,
  decisionWithHistory,
  freeShareText,
  historyStamp,
  lightsAdvice,
  noteFreeText,
  noteLights,
  parseHistory,
  pitchDayView,
  proposalHistory,
  quadroDayOf,
  quadroTrainings,
  requestResources,
  romeStamp,
  trainingLines,
  trainingShareAt,
  type QuadroRotationLike,
} from "./impianti-planning";
import { QUADRO_SNAPSHOT } from "./quadro-data.server";
import {
  bookingToItem,
  groupByDay,
  homeMatches,
  toMinutes,
  validateBooking,
  type Booking,
  type RotationMatch,
  type SnapshotEvent,
} from "./rotation";

const REAL = homeMatches(snapshot.events as SnapshotEvent[]);
const QUADRO = QUADRO_SNAPSHOT.rotations as unknown as QuadroRotationLike[];
const m = (t: string) => toMinutes(t)!;

// Invented board for unit tests (team labels only).
const BOARD: QuadroRotationLike[] = [
  // Monday, both weeks: two thirds of campo 1 and campo 2 whole.
  {
    week: "A/B",
    days: ["LUNEDÌ"],
    start: m("17:00"),
    end: m("18:30"),
    zones: { C1_A: "Squadra X", C1_B: "Squadra X", C1_C: "—", C2_A: "Squadra Y", C2_B: "Squadra Y" },
  },
  // Monday, overlapping rotation on the same zone (must not double count).
  {
    week: "A/B",
    days: ["LUNEDÌ"],
    start: m("18:00"),
    end: m("19:00"),
    zones: { C1_A: "Squadra X fino 19:00", C1_B: "", C1_C: "" },
  },
  // Thursday, week A only: campo 1 whole.
  {
    week: "A",
    days: ["GIOVEDÌ"],
    start: m("17:00"),
    end: m("18:00"),
    zones: { C1_A: "Squadra Z", C1_B: "Squadra Z", C1_C: "Squadra Z" },
  },
];
const MON = "2026-10-19";
const THU = "2026-10-22";

const draft = (over: Partial<Booking> = {}): Omit<Booking, "id"> => ({
  kind: "allenamento",
  pitch: "C1",
  date: MON,
  start: "18:30",
  duration: 60,
  format: 5,
  title: "Squadra W",
  rooms: [],
  entrance: "",
  amount: "",
  ...over,
});

describe("(d) quadro trainings in the pitch capacity check", () => {
  it("maps calendar dates to the board's weekdays", () => {
    expect(quadroDayOf(MON)).toBe("LUNEDÌ");
    expect(quadroDayOf(THU)).toBe("GIOVEDÌ");
    expect(quadroDayOf("2026-02-30")).toBeNull();
  });

  it("merges overlapping rotations zone by zone (no double counting)", () => {
    const uses = quadroTrainings(BOARD, MON, "C1", "A");
    expect(uses.map((u) => [u.start, u.end, u.zones.length])).toEqual([
      [m("17:00"), m("18:30"), 2],
      [m("18:30"), m("19:00"), 1],
    ]);
    expect(uses[0]!.groups).toEqual(["Squadra X", "Squadra X fino 19:00"]);
    expect(trainingShareAt(uses, m("18:15"), 0).share).toBeCloseTo(2 / 3);
    expect(quadroTrainings(BOARD, MON, "C2", "B")[0]!.share).toBe(1);
    expect(quadroTrainings(BOARD, MON, "DV", "A")).toEqual([]);
  });

  it("checks week A and week B separately and needs both", () => {
    // Thursday 17:00: week A has campo 1 whole, week B is free.
    const c = checkSlotWithQuadro([], BOARD, THU, "C1", m("17:00"), 45, 7, 15);
    expect(c.byWeek.A.fits).toBe(false);
    expect(c.byWeek.B.fits).toBe(true);
    expect(c.fits).toBe(false);
    expect(trainingLines(c)[0]).toMatch(/Quadro settimanale \(settimana A\): Squadra Z 17:00–18:00, campo intero/);
  });

  it("lets a third fit beside two thirds of training, and blocks a half", () => {
    const third = checkSlotWithQuadro([], BOARD, MON, "C1", m("17:15"), 30, 5, 0);
    expect(third.fits).toBe(true);
    expect(third.peak).toBeCloseTo(1);
    const half = checkSlotWithQuadro([], BOARD, MON, "C1", m("17:15"), 30, 7, 0);
    expect(half.fits).toBe(false);
  });

  it("applies the changeover buffer after a training", () => {
    // Campo 2 is whole until 18:30: 18:35 is inside the 15-minute buffer.
    expect(checkSlotWithQuadro([], BOARD, MON, "C2", m("18:35"), 60, 7, 15).fits).toBe(false);
    expect(checkSlotWithQuadro([], BOARD, MON, "C2", m("18:45"), 60, 7, 15).fits).toBe(true);
  });

  it("adds matches of the day to the trainings", () => {
    const match: RotationMatch = {
      ...bookingToItem({ ...draft({ start: "19:00", format: 7 }), id: "x" }),
      kind: "match",
    };
    const c = checkSlotWithQuadro([match], BOARD, MON, "C1", m("18:40"), 30, 7, 15);
    // 19:00: the half of the match arrives while one third of training is still in its changeover.
    expect(c.byWeek.A.peak).toBeCloseTo(1 / 3 + 1 / 2 + 1 / 2);
    expect(c.fits).toBe(false);
  });

  it("reports an unknown quadro instead of a free pitch", () => {
    const c = checkSlotWithQuadro([], null, THU, "C1", m("17:00"), 45, 7, 15);
    expect(c.quadroKnown).toBe(false);
    expect(c.fits).toBe(true);
    expect(trainingLines(c)[0]).toMatch(/non disponibile/);
  });

  it("reads the real training board: Tuesday campo 1 is full from 17:20", () => {
    const tue = quadroTrainings(QUADRO, "2026-10-20", "C1", "A");
    expect(tue.length).toBeGreaterThan(0);
    expect(Math.max(...tue.map((u) => u.share))).toBe(1);
    expect(
      checkSlotWithQuadro([], QUADRO, "2026-10-20", "C1", m("18:00"), 60, 7, 15).fits,
    ).toBe(false);
  });
});

describe("(a) one request: pitch zone + changing rooms + lights", () => {
  it("advises lights after 17:00 and computes the lights window", () => {
    expect(lightsAdvice(draft({ start: "15:00", duration: 90 })).recommended).toBe(false);
    const l = lightsAdvice(draft({ start: "16:30", duration: 90, lights: true }));
    expect(l.recommended).toBe(true);
    expect(l.window).toEqual([m("17:00"), m("18:00")]);
    expect(lightsAdvice(draft({ start: "19:00", lights: true })).window).toEqual([m("19:00"), m("20:00")]);
  });

  it("lists every resource of the request in order", () => {
    const r = requestResources(
      draft({ pitch: "C2", rooms: ["SP2", "ARB"], lights: true, start: "19:00", format: "full" }),
    );
    expect(r.map((x) => [x.kind, x.spaceId])).toEqual([
      ["campo", "SPA-COL-C2"],
      ["spogliatoio", "SPA-COL-SP2"],
      ["spogliatoio", "SPA-COL-ARB"],
      ["luci", "SPA-COL-C2"],
    ]);
    expect(requestResources(draft({ pitch: "DV", rooms: ["SP1"] })).map((x) => x.kind)).toEqual(["campo"]);
  });

  it("is ok only when pitch, rooms and lights work together", () => {
    const ctx = { dayItems: [], others: [], quadroRooms: [], rotations: BOARD, buffer: 15 };
    const ok = checkRequest(draft({ date: THU, start: "19:00", lights: true, rooms: ["SP1"] }), ctx);
    expect(ok.ok).toBe(true);
    expect(ok.warnings).toEqual([]);

    const noLights = checkRequest(draft({ date: THU, start: "19:00" }), ctx);
    expect(noLights.ok).toBe(true);
    expect(noLights.warnings[0]).toMatch(/chiedi anche le luci/);

    const weekA = checkRequest(draft({ date: THU, start: "17:00", format: 7 }), ctx);
    expect(weekA.ok).toBe(false);
    expect(weekA.problems[0]).toMatch(/settimana A/);

    const roomTaken = checkRequest(draft({ date: THU, start: "19:00", rooms: ["SP1"] }), {
      ...ctx,
      quadroRooms: [{ week: "A", day: "GIOVEDÌ", id: "SP1", start: m("19:00"), end: m("20:00"), group: "Squadra Z" }],
    });
    expect(roomTaken.ok).toBe(false);
    expect(roomTaken.problems.join(" ")).toMatch(/Spogliatoi già assegnati: SP1/);
  });

  it("validates the new booking fields", () => {
    expect(validateBooking(draft({ lights: true, createdAt: "2026-10-14T18:30:00.000Z" }))).toEqual([]);
    expect(validateBooking({ ...draft(), lights: "si" as unknown as boolean })).toContain("Luci: valore non valido.");
    expect(validateBooking(draft({ createdAt: "ieri" }))).toContain("Data di creazione non valida.");
  });

  it("writes the lights and the first history entry in the Note column only", () => {
    const at = new Date("2026-10-14T16:30:00Z"); // 18:30 in Rome (CEST)
    const b: Booking = { ...draft({ start: "18:00", duration: 90, lights: true }), id: "q1" };
    const cells = bookingToRegistryRow(b, "Responsabile attività di base", at).split("\t");
    expect(cells).toHaveLength(REGISTRY_COLUMNS.length);
    const note = cells[REGISTRY_COLUMNS.indexOf("Note")]!;
    expect(note).toBe(
      "Luci: 18:00–19:30 | Storico: 14/10/2026 18:30 PROPOSTA (Responsabile attività di base)",
    );
    // Without a time and without lights the Note stays empty, as before.
    expect(
      bookingToRegistryRow({ ...b, lights: false }).split("\t")[REGISTRY_COLUMNS.indexOf("Note")],
    ).toBe("");
  });

  it("puts lights and quadro trainings in the Direzione summary", () => {
    const b: Booking = { ...draft({ date: THU, start: "17:00", format: 7, lights: true }), id: "q2" };
    const text = directionBrief(b, {
      items: [],
      others: [],
      quadroRooms: [],
      buffer: 15,
      today: "2026-10-14",
      requestedBy: "",
      rotations: BOARD,
    });
    expect(text).toMatch(/Luci: sì, 17:00–18:00/);
    expect(text).toMatch(/Allenamento dal Quadro settimanale \(settimana A\): Squadra Z/);
    expect(text).toMatch(/il campo non basta con gli allenamenti del Quadro settimanale/);
  });
});

describe("(b) state history per proposal", () => {
  const CSV_HEAD = REGISTRY_COLUMNS.join(",");
  const row = (stato: string, approvato: string, note: string) =>
    `IPO-9,22/10/2026,19:00,20:00,SED-COL,SPA-COL-C2,,Gara o amichevole,Squadra W,7 contro 7,,,${stato},Responsabile attività di base,${approvato},,,Non serve,"${note}",Super App`;

  it("formats stamps in Rome time and parses them back", () => {
    expect(romeStamp(new Date("2026-12-01T08:05:00Z"))).toBe("01/12/2026 09:05");
    const note = appendHistory(
      appendHistory("", historyStamp("PROPOSTA", "Responsabile attività di base", new Date("2026-10-14T16:30:00Z"))),
      historyStamp("CONFERMATA", "Presidente", new Date("2026-10-15T07:10:00Z")),
    );
    expect(note).toBe(
      "Storico: 14/10/2026 18:30 PROPOSTA (Responsabile attività di base); 15/10/2026 09:10 CONFERMATA (Presidente)",
    );
    expect(parseHistory(note).map((e) => [e.status, e.who, e.when])).toEqual([
      ["PROPOSTA", "Responsabile attività di base", "2026-10-14T18:30"],
      ["CONFERMATA", "Presidente", "2026-10-15T09:10"],
    ]);
  });

  it("reads the history of a register row and completes it from the row", () => {
    const [p] = csvToProposals(
      [CSV_HEAD, row("CONFERMATA", "Presidente", "Luci: 19:00–20:00 | Storico: 14/10/2026 18:30 PROPOSTA (Responsabile attività di base)")].join("\n"),
    );
    const h = proposalHistory(p!);
    expect(h.map((e) => [e.status, e.who, e.when, e.basis])).toEqual([
      ["PROPOSTA", "Responsabile attività di base", "2026-10-14T18:30", "registro"],
      ["CONFERMATA", "Presidente", null, "dedotto"],
    ]);
    expect(noteLights(p!.note)).toBe("19:00–20:00");
  });

  it("never invents dates for rows without a history", () => {
    const [p] = csvToProposals([CSV_HEAD, row("RESPINTA", "Direttore generale", "Respinta: campo occupato")].join("\n"));
    const h = proposalHistory(p!);
    expect(h).toEqual([
      { status: "PROPOSTA", who: "Responsabile attività di base", when: null, basis: "dedotto" },
      { status: "RESPINTA", who: "Direttore generale", when: null, basis: "dedotto", reason: "campo occupato" },
    ]);
  });

  it("builds the decision with the whole new Note (segments kept)", () => {
    const at = new Date("2026-10-15T07:10:00Z");
    const d = decisionWithHistory("RESPINTA", {
      note: "Luci: 19:00–20:00 | Storico: 14/10/2026 18:30 PROPOSTA (Responsabile attività di base) | accordo verbale",
      who: "Presidente",
      at,
      reason: "campo\toccupato; dalla U19",
    });
    expect(d.stato).toBe("RESPINTA");
    expect(d.note).toBe(
      "Respinta: campo occupato dalla U19 | Luci: 19:00–20:00 | Storico: 14/10/2026 18:30 PROPOSTA (Responsabile attività di base); 15/10/2026 09:10 RESPINTA (Presidente) | accordo verbale",
    );
    expect(noteFreeText(d.note)).toBe("accordo verbale");
    expect(parseHistory(d.note)).toHaveLength(2);
    const ok = decisionWithHistory("CONFERMATA", { note: "", who: "", at });
    expect(ok.note).toBe("Storico: 15/10/2026 09:10 CONFERMATA (—)");
  });

  it("gives a local ipotesi its creation entry", () => {
    const b: Booking = { ...draft(), id: "loc", createdAt: "2026-10-14T16:30:00.000Z" };
    const h = proposalHistory(bookingToProposal(b, "Responsabile attività di base"));
    expect(h).toEqual([
      { status: "PROPOSTA", who: "Responsabile attività di base", when: "2026-10-14T18:30", basis: "registro" },
    ]);
  });

  it("includes the quadro when checking a proposal, keeps the old shape otherwise", () => {
    const [p] = csvToProposals([CSV_HEAD, row("PROPOSTA", "", "")].join("\n"));
    const withQ = checkProposal({ ...p!, pitch: "C1", start: m("17:00"), end: m("17:45") }, REAL, 15, BOARD);
    expect(withQ.fits).toBe(false);
    expect(withQ.quadro?.byWeek.B.fits).toBe(true);
    expect("quadro" in checkProposal(p!, REAL, 15)).toBe(false);
  });
});

describe("(c) day view per pitch", () => {
  const prop = (over: Partial<Proposal>): Proposal => ({
    id: "IPO-1",
    date: "2026-10-17",
    start: m("12:00"),
    end: m("13:00"),
    pitch: "C1",
    format: "full",
    kind: "affitto",
    kindLabel: "Affitto a terzi",
    subject: "Ente Esempio",
    rooms: "",
    entrance: "",
    status: "CONFERMATA",
    requestedBy: "",
    approvedBy: "",
    amount: "",
    notice: "",
    note: "",
    source: "registro",
    ...over,
  });

  it("marks matches and confirmed rows as prenotato, cancelled rows as rilasciato", () => {
    const v = pitchDayView({
      date: "2026-10-17",
      pitch: "C1",
      items: REAL,
      proposals: [
        prop({}),
        prop({ id: "IPO-2", start: m("09:00"), end: m("10:30"), status: "ANNULLATA" }),
        prop({ id: "IPO-3", start: m("20:00"), end: m("21:00"), status: "PROPOSTA" }),
        prop({ id: "IPO-4", start: m("11:00"), end: m("11:30"), status: "RESPINTA" }),
      ],
      rotations: null,
      week: "A",
    });
    const at = (t: string) => v.blocks.find((b) => b.start <= m(t) && m(t) < b.end)!;
    expect(at("09:30").state).toBe("rilasciato");
    expect(at("11:15").state).toBe("disponibile");
    expect(at("12:30").state).toBe("prenotato");
    // 15:00 Esordienti 2014 (9v9, half) and U19 (11v11) together: over capacity.
    expect(at("15:30").state).toBe("prenotato");
    expect(at("15:30").used).toBeCloseTo(1.5);
    expect(freeShareText(at("15:30").used)).toBe("oltre la capienza");
    // A pending request never reserves.
    expect(at("20:30").state).toBe("disponibile");
    expect(at("20:30").pending[0]!.label).toMatch(/IPO-3/);
    expect(v.totals.prenotato + v.totals.disponibile + v.totals.rilasciato).toBe(15 * 60);
    expect(v.registryKnown).toBe(true);
    expect(v.quadroKnown).toBe(false);
  });

  it("adds the quadro of the chosen week with its share", () => {
    const a = pitchDayView({ date: MON, pitch: "C1", items: [], proposals: null, rotations: BOARD, week: "A" });
    const blk = a.blocks.find((b) => b.start === m("17:00"))!;
    expect(blk.state).toBe("prenotato");
    expect(freeShareText(blk.used)).toBe("resta un terzo");
    expect(blk.uses[0]!.source).toBe("quadro");
    const thuA = pitchDayView({ date: THU, pitch: "C1", items: [], proposals: null, rotations: BOARD, week: "A" });
    const thuB = pitchDayView({ date: THU, pitch: "C1", items: [], proposals: null, rotations: BOARD, week: "B" });
    expect(thuA.totals.prenotato).toBe(60);
    expect(thuB.totals.prenotato).toBe(0);
  });

  it("lists local ipotesi as pending, never as booked", () => {
    const ip = bookingToItem({ ...draft({ date: MON, start: "10:00" }), id: "z" });
    const day = groupByDay([ip]).get(MON)!;
    const v = pitchDayView({ date: MON, pitch: "C1", items: day, proposals: null, rotations: null, week: "A" });
    const b = v.blocks.find((x) => x.start === m("10:00"))!;
    expect(b.state).toBe("disponibile");
    expect(b.pending).toHaveLength(1);
  });
});
