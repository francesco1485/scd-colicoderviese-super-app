import { describe, expect, it } from "vitest";

import { areaPath, classifyRequest, requestMessage } from "./requests";

describe("requests engine", () => {
  it("routes cleaning and laundry needs to the Club House manager", () => {
    const r = classifyRequest("è finito il detersivo in lavanderia, servono 4 flaconi entro sabato");
    expect(r).toMatchObject({ area: "club-house", kind: "materiali", urgency: "normale", missing: [] });
    expect(r.handler).toMatch(/Club House/);
    expect(r.summary).toBe("È finito il detersivo in lavanderia, servono 4 flaconi entro sabato");
  });

  it("recognises faults with urgency and asks where", () => {
    const r = classifyRequest("non funziona l'acqua calda, urgente!");
    expect(r).toMatchObject({ area: "impianti", kind: "guasto", urgency: "alta" });
    expect(r.missing).toEqual(["dove esattamente (campo, spogliatoio, locale)"]);
    const located = classifyRequest("spogliatoio 2 senza acqua calda");
    expect(located.missing).toEqual([]);
  });

  it("recognises transport variations and asks for the team", () => {
    const r = classifyRequest("serve un altro pulmino sabato alle 13:30");
    expect(r).toMatchObject({ area: "pulmini", kind: "variazione" });
    expect(r.missing).toEqual(["quale squadra"]);
    expect(classifyRequest("aggiungere un pulmino sabato per i Pulcini").missing).toEqual([]);
  });

  it("asks for quantities and dates on material requests", () => {
    const r = classifyRequest("mancano i palloni");
    expect(r).toMatchObject({ area: "magazzino", kind: "materiali" });
    expect(r.missing).toEqual(["quanti pezzi o confezioni", "per quando"]);
  });

  it("falls back to the board when it cannot route, and flags vague text", () => {
    expect(classifyRequest("ciao")).toMatchObject({ area: "direzione", unclear: true });
    expect(classifyRequest("vorrei proporre una festa di fine anno per i piccoli")).toMatchObject({ area: "eventi", kind: "proposta", unclear: false });
  });

  it("writes a complete message for the handler", () => {
    const r = classifyRequest("spogliatoio 1: luce rotta, oggi");
    expect(requestMessage(r, "Responsabile pulizie")).toBe(
      ["Guasto o disservizio per Responsabile impianti", "Da: Responsabile pulizie", "Urgenza: alta", "Richiesta: Spogliatoio 1: luce rotta, oggi"].join("\n"),
    );
  });

  it("maps areas to app paths", () => {
    expect(areaPath("club-house")).toBe("/tesoreria/club-house");
    expect(areaPath("impianti")).toBe("/gestionale/impianti");
    expect(areaPath("pulmini")).toBe("/pulmini");
    expect(areaPath("eventi")).toBe("/eventi");
  });
});
