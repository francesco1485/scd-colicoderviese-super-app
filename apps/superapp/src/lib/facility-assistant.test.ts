import { describe, expect, it } from "vitest";

import snapshot from "@/data/calendario-snapshot-20261010.json";
import {
  answerQuestion,
  detectIntent,
  parseDate,
  parsePitch,
  parseQuestion,
  parseTime,
  type AssistantContext,
} from "./facility-assistant";
import {
  DEFAULT_OPTIONS,
  PRESETS,
  analyse,
  homeMatches,
  simulate,
  withBookings,
  type Booking,
  type ScenarioOptions,
  type SnapshotEvent,
} from "./rotation";

const TODAY = "2026-10-11"; // Sunday
const REAL = homeMatches(snapshot.events as SnapshotEvent[]);

function ctxFor(
  o: Partial<ScenarioOptions> = {},
  bookings: Booking[] = [],
): AssistantContext {
  const opts = { ...DEFAULT_OPTIONS, ...o };
  const items = simulate(withBookings(REAL, bookings), opts);
  const analysis = analyse(items, {
    today: TODAY,
    startDate: opts.startDate,
    buffer: opts.buffer,
    maxDervioPerDay: opts.maxDervioPerDay,
    lightsVerified: false,
  });
  return {
    items,
    analysis,
    today: TODAY,
    buffer: opts.buffer,
    lightsVerified: false,
  };
}
const CTX = ctxFor();

describe("parsing Italian questions", () => {
  it("reads dates in several forms, in the 2026/27 season", () => {
    expect(parseDate("sabato 17 ottobre", TODAY)).toBe("2026-10-17");
    expect(parseDate("il 17/10", TODAY)).toBe("2026-10-17");
    expect(parseDate("13 dicembre", TODAY)).toBe("2026-12-13");
    expect(parseDate("il 10 gennaio", TODAY)).toBe("2027-01-10");
    expect(parseDate("sabato 17", TODAY)).toBe("2026-10-17");
    expect(parseDate("domenica", TODAY)).toBe("2026-10-11");
    expect(parseDate("sabato", TODAY)).toBe("2026-10-17");
    expect(parseDate("domani", TODAY)).toBe("2026-10-12");
    expect(parseDate("31/02", TODAY)).toBeNull();
    expect(parseDate("quando?", TODAY)).toBeNull();
  });

  it("reads times and pitches", () => {
    expect(parseTime("alle 15")).toBe(900);
    expect(parseTime("ore 18:30")).toBe(1110);
    expect(parseTime("verso le 10.30")).toBe(630);
    expect(parseTime("17/10")).toBeNull();
    expect(parsePitch("il campo 2")).toBe("C2");
    expect(parsePitch("a Dervio")).toBe("DV");
    expect(parsePitch("campo 1")).toBe("C1");
    expect(parsePitch("un campo")).toBeNull();
  });

  it("recognises intents from different phrasings", () => {
    const cases: [string, string][] = [
      ["Il campo 1 è libero sabato 17 ottobre alle 15?", "availability"],
      ["c'è qualcuno sul campo 2 domenica alle 10?", "availability"],
      ["chi gioca sabato alle 15 sul campo 1?", "availability"],
      ["Posso affittare il campo 2 domenica alle 18?", "rental"],
      ["noleggio campo 1 il 25/10 alle 20", "rental"],
      ["Dove metto un torneo il 13 dicembre?", "place-event"],
      ["dove posso mettere un evento il 20 dicembre?", "place-event"],
      ["Quali giorni hanno conflitti?", "conflicts"],
      ["ci sono sovrapposti?", "conflicts"],
      ["Quando devo avvisare il Comune per le gare a Dervio?", "notice"],
      ["preavviso Dervio", "notice"],
      ["Come gestisco un affitto a terzi?", "rental-procedure"],
      ["che tempo fa?", "help"],
    ];
    for (const [q, intent] of cases) expect(detectIntent(q), q).toBe(intent);
    expect(
      parseQuestion("Il campo 1 è libero sabato 17 ottobre alle 15?", TODAY),
    ).toEqual({
      intent: "availability",
      date: "2026-10-17",
      time: 900,
      pitch: "C1",
    });
  });
});

describe("answers from the engine", () => {
  it("campo 1 on Saturday 17 October at 15:00 is over capacity (U19 + Esordienti 2014)", () => {
    const a = answerQuestion(
      "il campo 1 è libero sabato 17 ottobre alle 15?",
      CTX,
    );
    expect(a.tone).toBe("crit");
    expect(a.text).toMatch(/^No/);
    expect(a.text).toMatch(/conflitto/);
    expect(a.details.join(" ")).toMatch(/Juniores U19/);
    expect(a.details.join(" ")).toMatch(/Esordienti 2014/);
    expect(a.actions[0]).toMatchObject({
      type: "open-day",
      date: "2026-10-17",
    });
  });

  it("a morning slot with no matches is free", () => {
    const a = answerQuestion(
      "Il campo 1 è libero sabato 17 ottobre alle 9?",
      CTX,
    );
    expect(a.tone).toBe("ok");
    expect(a.text).toMatch(/^Sì/);
  });

  it("rental on campo 2: answers from the calendar and offers to add the ipotesi", () => {
    const a = answerQuestion(
      "Posso affittare il campo 2 domenica 18 ottobre alle 18?",
      CTX,
    );
    expect(a.intent).toBe("rental");
    expect(a.text).toMatch(/^Sì/);
    const add = a.actions.find((x) => x.type === "add-booking");
    expect(add && add.type === "add-booking" && add.draft).toMatchObject({
      kind: "affitto",
      pitch: "C2",
      date: "2026-10-18",
      start: "18:00",
      format: "full",
    });
  });

  it("rental conflicts with a hypothetical booking already there", () => {
    const b: Booking = {
      id: "m",
      kind: "manutenzione",
      pitch: "C2",
      date: "2026-10-18",
      start: "17:00",
      duration: 240,
      format: "full",
      title: "",
    };
    const a = answerQuestion(
      "posso affittare il campo 2 il 18/10 alle 18?",
      ctxFor({}, [b]),
    );
    expect(a.text).toMatch(/^No/);
    expect(a.details.join(" ")).toMatch(/ipotesi/);
  });

  it("suggests tournament windows on 13 December for each pitch", () => {
    const a = answerQuestion("Dove metto un torneo il 13 dicembre?", CTX);
    expect(a.intent).toBe("place-event");
    expect(a.details).toHaveLength(3);
    expect(a.details[0]).toMatch(/^Colico campo 1/);
    expect(a.details[2]).toMatch(/^Dervio campo 1/);
    expect(a.details[2]).toMatch(/erba in inverno/);
    expect(a.details[2]).toMatch(/fuori dal programma stagionale/);
    expect(a.details[2]).not.toMatch(/entro il/);
  });

  it("lists conflict days from today", () => {
    const a = answerQuestion("Quali giorni hanno conflitti?", CTX);
    expect(a.tone).toBe("crit");
    expect(a.details[0]).toMatch(/sabato 17 ottobre/);
    expect(a.details.join(" ")).toMatch(/sabato 31 ottobre/);
    expect(a.actions[0]).toMatchObject({
      type: "open-day",
      date: "2026-10-17",
    });
  });

  it("notice: none when nothing is at Dervio, dates when the scenario moves matches", () => {
    const none = answerQuestion("Quando devo avvisare il Comune?", CTX);
    expect(none.text).toMatch(/nessuna gara è a Dervio/);
    expect(none.text).toMatch(/già informato con il programma stagionale/);
    expect(none.details.join(" ")).toMatch(
      /Se piove e la gara torna a Colico: avviso solo a FIGC \(LND\/SGS\) e squadra avversaria/,
    );
    expect(none.details.join(" ")).not.toMatch(/30 giorni|un mese/);
    const auto = PRESETS.find((p) => p.id === "auto")!;
    const a = answerQuestion(
      "quando devo avvisare il Comune per le gare a Dervio?",
      ctxFor({ auto: true, modes: auto.modes }),
    );
    expect(a.text).toMatch(/Primo avviso alla squadra entro il \d{2}\/\d{2}/);
    expect(a.text).not.toMatch(/avviso al Comune/);
    expect(a.text).toMatch(/nessuna gara è spostata davvero/);
    expect(a.details.length).toBeGreaterThan(0);
  });

  it("explains the rental procedure without legal advice", () => {
    const a = answerQuestion("come gestisco un affitto a terzi?", CTX);
    expect(a.details).toHaveLength(5);
    expect(a.details.join(" ")).toMatch(/Direzione/);
    expect(a.details.join(" ")).toMatch(/assicurazione/);
    expect(a.details.join(" ")).toMatch(/non è una consulenza legale/);
  });

  it("asks for what is missing and explains what it can do", () => {
    expect(answerQuestion("il campo 1 è libero?", CTX).text).toMatch(
      /il giorno e l'orario/,
    );
    expect(answerQuestion("il campo 1 è libero sabato?", CTX).text).toMatch(
      /l'orario/,
    );
    expect(answerQuestion("dove metto un torneo?", CTX).text).toMatch(
      /il giorno/,
    );
    const help = answerQuestion("chi vince il campionato?", CTX);
    expect(help.intent).toBe("help");
    expect(help.details.length).toBeGreaterThanOrEqual(6);
  });

  it("mentions weekday training when asked about a weekday", () => {
    const a = answerQuestion(
      "il campo 1 è libero martedì 13 ottobre alle 18?",
      CTX,
    );
    expect(a.details.join(" ")).toMatch(/Quadro settimanale/);
  });
});
