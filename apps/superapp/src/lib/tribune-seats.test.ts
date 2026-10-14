import { describe, expect, it } from "vitest";

import { parsePublic, type PublicItem, type PublicUnit } from "./giving";
import {
  ANONYMOUS_PLATE,
  ANONYMOUS_PLATE_MANY,
  AMOUNT_PENDING,
  CO_ADOPTION_LIVE,
  MAX_CO_ADOPTERS,
  TRIBUNE_LAYOUT,
  TRIBUNE_SEATS_TOTAL,
  TRIBUNE_SEAT_AMOUNT,
  addHolder,
  coAdoptionCheck,
  findTribuneItem,
  layoutTotal,
  plateLabel,
  plateLines,
  seatAmountText,
  seatAriaLabel,
  seatLayout,
  seatPlace,
  seatRoom,
  seatSelectable,
  seatState,
  seatsFromUnits,
  tribuneDraftItem,
  tribuneProgress,
  type Seat,
  type SeatHolder,
} from "./tribune-seats";

const received = (o: Partial<SeatHolder> = {}): SeatHolder => ({ status: "RICEVUTA", visibility: "ANONIMO_PUBBLICO", plateText: null, plateConsent: false, ...o });
const pledge = (o: Partial<SeatHolder> = {}): SeatHolder => ({ status: "PROMESSA", visibility: "ANONIMO_PUBBLICO", plateText: null, plateConsent: false, ...o });
const unit = (o: Partial<PublicUnit> & { n: number }): PublicUnit => ({ adopted: false, plate: null, pledges: 0, adopters: 0, plates: [], ...o });

describe("tribune layout", () => {
  it("is a 60-seat indicative grid numbered sector by sector", () => {
    expect(TRIBUNE_SEATS_TOTAL).toBe(60);
    expect(layoutTotal()).toBe(TRIBUNE_SEATS_TOTAL);
    expect(TRIBUNE_LAYOUT.indicative).toBe(true);
    const rows = seatLayout();
    expect(rows).toHaveLength(6);
    expect(rows.flatMap((r) => r.seats)).toEqual(Array.from({ length: 60 }, (_, k) => k + 1));
    expect(seatPlace(1)).toEqual({ sectorLabel: "Settore A", row: 1 });
    expect(seatPlace(31)).toEqual({ sectorLabel: "Settore B", row: 1 });
    expect(seatPlace(60)).toEqual({ sectorLabel: "Settore B", row: 3 });
    expect(seatPlace(61)).toBeNull();
  });
});

describe("seat state derivation", () => {
  it("libero / promesso / adottato from real holders only", () => {
    expect(seatState([])).toBe("LIBERO");
    expect(seatState([pledge({ status: "ANNULLATA" })])).toBe("LIBERO");
    expect(seatState([pledge()])).toBe("PROMESSO");
    expect(seatState([pledge(), received()])).toBe("ADOTTATO");
  });

  it("with no data every seat is free and progress says 0 di 60", () => {
    for (const seats of [seatsFromUnits(null), seatsFromUnits([])]) {
      expect(seats).toHaveLength(60);
      expect(seats.every((s) => seatState(s.holders) === "LIBERO")).toBe(true);
      const p = tribuneProgress(seats);
      expect(p).toMatchObject({ total: 60, adopted: 0, promised: 0, free: 60, pct: 0 });
      expect(p.label).toBe("0 di 60 posti adottati");
    }
  });

  it("maps the r101 public units (adopted + plate) and future pledge counts", () => {
    const seats = seatsFromUnits([
      unit({ n: 3, adopted: true, plate: "Famiglia Rossi", adopters: 1, plates: ["Famiglia Rossi"] }),
      unit({ n: 4, adopted: true, adopters: 1 }),
      unit({ n: 5, pledges: 2 }),
    ]);
    expect(seatState(seats[2]!.holders)).toBe("ADOTTATO");
    expect(plateLabel(seats[2]!.holders)).toBe("Famiglia Rossi");
    expect(plateLabel(seats[3]!.holders)).toBe(ANONYMOUS_PLATE);
    expect(seatState(seats[4]!.holders)).toBe("PROMESSO");
    expect(plateLabel(seats[4]!.holders)).toBeNull();
    const p = tribuneProgress(seats);
    expect(p).toMatchObject({ adopted: 2, promised: 1, free: 57, pct: 3 });
    expect(p.label).toBe("2 di 60 posti adottati · 1 promesso");
  });

  it("parsePublic keeps today's r101 unit shape working (no pledges field = 0, adopted = 1 adopter)", () => {
    const d = parsePublic({ items: [{ id: "t", category: "TRIBUNA_IMPIANTO", unitLabel: "posto", unitsTotal: 60, units: [{ n: 1, status: "ADOTTATO", plate: "Nonno Gino" }, { n: 2, status: "LIBERO" }] }] });
    expect(d.items[0]!.units[0]).toEqual({ n: 1, adopted: true, plate: "Nonno Gino", pledges: 0, adopters: 1, plates: ["Nonno Gino"] });
    expect(d.items[0]!.units[1]).toEqual({ n: 2, adopted: false, plate: null, pledges: 0, adopters: 0, plates: [] });
  });

  it("finds the tribune only in the existing catalogue (category, 60 numbered units)", () => {
    const base = tribuneDraftItem();
    const real: PublicItem = { ...base, id: "uuid-1" };
    expect(findTribuneItem([])).toBeNull();
    expect(findTribuneItem([{ ...real, unitsTotal: 80 }])).toBeNull();
    expect(findTribuneItem([{ ...real, category: "ALTRO" }])).toBeNull();
    expect(findTribuneItem([{ ...real, category: "ATTREZZATURA_CAMPO" }, real])).toBe(real);
  });

  it("the draft item never carries an id, a price or adopters", () => {
    const d = tribuneDraftItem();
    expect(d.id).toBe("");
    expect(d.priceTotal).toBeNull();
    expect(d.unitPrice).toBeNull();
    expect(d.priceMode).toBe("DA_PREVENTIVO_AGGIORNATO");
    expect(d.units).toHaveLength(60);
    expect(d.units.some((u) => u.adopted || u.pledges > 0)).toBe(false);
    expect(d.adopters).toEqual([]);
  });
});

describe("co-adoption (max 3 per seat)", () => {
  it("accepts up to three active holders and refuses the fourth", () => {
    expect(MAX_CO_ADOPTERS).toBe(3);
    let seat: Seat = { n: 7, holders: [] };
    for (let k = 0; k < 3; k++) {
      const r = addHolder(seat, received());
      expect(r.ok).toBe(true);
      if (r.ok) seat = r.seat;
    }
    expect(seatRoom(seat.holders)).toBe(0);
    expect(addHolder(seat, pledge())).toEqual({ ok: false, reason: "SEAT_FULL" });
    expect(coAdoptionCheck(undefined)).toEqual({ ok: false, reason: "UNKNOWN_SEAT" });
  });

  it("cancelled pledges free their place", () => {
    const seat: Seat = { n: 8, holders: [received(), pledge({ status: "ANNULLATA" }), pledge()] };
    expect(seatRoom(seat.holders)).toBe(1);
    expect(coAdoptionCheck(seat)).toEqual({ ok: true });
  });

  it("caps what the read path reports at three holders", () => {
    const s = seatsFromUnits([unit({ n: 1, adopted: true, adopters: 5, plates: ["Anna", "Bruno", "Carla", "Dario"], pledges: 2 })], 1)[0]!;
    expect(s.holders).toHaveLength(3);
    expect(plateLines(s.holders)).toEqual(["Anna", "Bruno", "Carla"]);
  });

  it("only free seats are selectable until co-adoption is live", () => {
    expect(CO_ADOPTION_LIVE).toBe(false);
    const shared: Seat = { n: 9, holders: [received()] };
    expect(seatSelectable({ n: 1, holders: [] })).toBe(true);
    expect(seatSelectable(shared)).toBe(false);
    expect(seatSelectable(shared, true)).toBe(true);
    expect(seatSelectable({ n: 9, holders: [received(), received(), received()] }, true)).toBe(false);
  });
});

describe("nameplate: consent and anonymity", () => {
  it("prints a donor's text only with a public name AND explicit consent", () => {
    expect(plateLines([received({ visibility: "NOME_PUBBLICO", plateText: "Famiglia Bianchi", plateConsent: true })])).toEqual(["Famiglia Bianchi"]);
    expect(plateLines([received({ visibility: "NOME_PUBBLICO", plateText: "Famiglia Bianchi", plateConsent: false })])).toEqual([ANONYMOUS_PLATE]);
    expect(plateLines([received({ visibility: "ANONIMO_PUBBLICO", plateText: "Famiglia Bianchi", plateConsent: true })])).toEqual([ANONYMOUS_PLATE]);
    expect(plateLines([received({ visibility: "COMPLETAMENTE_ANONIMO" })])).toEqual([ANONYMOUS_PLATE]);
    expect(ANONYMOUS_PLATE).toBe("Un amico della ColicoDerviese");
  });

  it("pledges never reach the plate; anonymous co-adopters share one line", () => {
    expect(plateLabel([pledge({ visibility: "NOME_PUBBLICO", plateText: "Bar Sport", plateConsent: true })])).toBeNull();
    expect(plateLines([received(), received()])).toEqual([ANONYMOUS_PLATE_MANY]);
    expect(plateLabel([received({ visibility: "NOME_PUBBLICO", plateText: "  Bar   Sport ", plateConsent: true }), received()])).toBe(`Bar Sport · ${ANONYMOUS_PLATE}`);
  });

  it("aria labels read number and state", () => {
    expect(seatAriaLabel({ n: 12, holders: [] })).toBe("Posto 12, libero");
    expect(seatAriaLabel({ n: 12, holders: [pledge()] })).toBe("Posto 12, promesso");
    expect(seatAriaLabel({ n: 12, holders: [received({ visibility: "NOME_PUBBLICO", plateText: "Famiglia Rossi", plateConsent: true })] })).toBe("Posto 12, adottato: Famiglia Rossi");
  });
});

describe("amount per seat", () => {
  it("is null while the offer is expired, and the text shows no number", () => {
    expect(TRIBUNE_SEAT_AMOUNT).toBeNull();
    expect(seatAmountText()).toBe(AMOUNT_PENDING);
    expect(seatAmountText(null)).toBe("Importo in aggiornamento");
    expect(seatAmountText(0)).toBe(AMOUNT_PENDING);
    expect(seatAmountText()).not.toMatch(/\d|€/);
  });

  it("formats a confirmed amount only when one is set", () => {
    expect(seatAmountText(1108.17)).toMatch(/^1\.?108,17\s€$/);
  });
});
