import { describe, expect, it } from "vitest";

import { buildPublicContext, type PublicContextInput } from "./assistant";
import { clubDirections, directionsReply, isClubDirectionsQuestion, sitesForMessage } from "./club-directions";
import { FACILITIES } from "./facilities";
import { siteMapsUrl } from "./maps-link";
import { skyRulesAnswer } from "./sky.functions";

const MAPS = /^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=/;

describe("club directions (B7)", () => {
  it("reads Colico and Dervio from the facilities master, with a Maps link only for a confirmed street", () => {
    const dirs = clubDirections();
    expect(dirs.map((d) => d.id)).toEqual(["SED-COL", "SED-DER"]);
    for (const d of dirs) {
      const site = FACILITIES.sites.find((s) => s.id === d.id)!;
      expect(d.address).toBe(site.address);
      if (d.address) expect(d.mapsUrl).toMatch(MAPS);
      else expect(d.mapsUrl).toBeNull();
    }
  });

  it("never builds a link without a street", () => {
    expect(siteMapsUrl({ name: "X", address: null, municipality: "Colico (LC)" })).toBeNull();
    expect(siteMapsUrl({ name: "X", address: "  ", municipality: "Colico (LC)" })).toBeNull();
    expect(siteMapsUrl({ name: "Centro Sportivo Colico", address: "Via Lido SNC", municipality: "Colico (LC)" })).toBe(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("Centro Sportivo Colico, Via Lido SNC, Colico (LC)")}`,
    );
  });

  it.each([
    "come arrivo al campo?",
    "Come arrivo al campo?",
    "come si arriva al centro sportivo di Dervio",
    "indirizzo del campo di Colico",
    "dove siete?",
    "mi date le indicazioni per il campo?",
  ])("recognises %j as a question about our pitches", (q) => {
    expect(isClubDirectionsQuestion(q)).toBe(true);
  });

  it.each(["come arrivo al campo in trasferta?", "dove giochiamo contro il Lecco?", "quando gioca la U15?", "come mi iscrivo?"])(
    "leaves %j to the general assistant",
    (q) => {
      expect(isClubDirectionsQuestion(q)).toBe(false);
    },
  );

  it("picks the town the family names, both otherwise", () => {
    expect(sitesForMessage("come arrivo a Dervio?").map((s) => s.id)).toEqual(["SED-DER"]);
    expect(sitesForMessage("campo di colico").map((s) => s.id)).toEqual(["SED-COL"]);
    expect(sitesForMessage("come arrivo al campo?").map((s) => s.id)).toEqual(["SED-COL", "SED-DER"]);
  });

  it("answers \"come arrivo al campo?\" with street and Maps link of Colico and Dervio", async () => {
    const reply = await skyRulesAnswer({ message: "come arrivo al campo?" });
    for (const d of clubDirections()) {
      if (!d.address) continue;
      expect(reply.text).toContain(d.address);
      expect(reply.text).toContain(d.municipality);
      expect(reply.links?.some((l) => l.to === d.mapsUrl)).toBe(true);
    }
    expect(reply.links?.some((l) => l.to === "/impianti")).toBe(true);
  });

  it("does not invent a street when the master has none", () => {
    const reply = directionsReply("come arrivo al campo?", [
      { id: "SED-COL", name: "Centro Sportivo Colico", short: "Colico", municipality: "Colico (LC)", address: null, mapsUrl: null },
    ]);
    expect(reply.text).toContain("indirizzo in verifica");
    expect(reply.links?.every((l) => !l.to.startsWith("https://"))).toBe(true);
  });

  it("keeps the same Maps link in Vera's context", () => {
    const input = {
      today: "2026-10-16",
      contacts: { address: "x", email: "a@b.it", pec: "p@pec.it", site: "https://example.it" },
      calendar: null,
      ticketing: null,
      sites: FACILITIES.sites.map((s) => ({ name: s.name, address: s.address, municipality: s.municipality, status: s.status })),
      clubEvents: [],
      registration: { interests: [], affiliations: [] },
      sponsorPackages: [],
      sponsorNames: [],
      resultLinks: [],
      safeguardingSubject: "x",
    } as unknown as PublicContextInput;
    const ctx = buildPublicContext(input);
    for (const d of clubDirections()) if (d.mapsUrl) {
      expect(ctx.text).toContain(d.mapsUrl);
      expect(ctx.links.has(d.mapsUrl)).toBe(true);
    }
  });
});
