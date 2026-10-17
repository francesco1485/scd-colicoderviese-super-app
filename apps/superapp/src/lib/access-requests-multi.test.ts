import { describe, expect, it } from "vitest";

import { baseRoleFor, cardToKeep, isSeatPosition } from "./access-requests";
import { multiOutcome, simpleRequest } from "./access-requests.functions";

describe("one person, many hats (UD-189, r121)", () => {
  it("gives the account the highest base level among the hats", () => {
    expect(baseRoleFor({ parent: false, athlete: false, positionKinds: [] })).toBeNull();
    expect(baseRoleFor({ parent: true, athlete: false, positionKinds: [] })).toBe("FAMILY");
    expect(baseRoleFor({ parent: true, athlete: true, positionKinds: [] })).toBe("FAMILY");
    expect(baseRoleFor({ parent: true, athlete: false, positionKinds: ["ORGANO_SOCIETARIO"] })).toBe("MANAGER");
    expect(baseRoleFor({ parent: true, athlete: false, positionKinds: ["DIRIGENTE", "MISTER"] })).toBe("MISTER");
    expect(baseRoleFor({ parent: false, athlete: false, positionKinds: ["AUTISTA"] })).toBe("STAFF");
    expect(baseRoleFor({ parent: false, athlete: false, positionKinds: ["SCONOSCIUTO"] })).toBeNull();
  });

  it("keeps the card that already holds roles, then the one with a birth date", () => {
    expect(cardToKeep([])).toBeNull();
    const parentCard = { personId: "p", roleCount: 0, birthYear: null };
    const presCard = { personId: "q", roleCount: 1, birthYear: 1969 };
    expect(cardToKeep([parentCard, presCard])?.personId).toBe("q");
    expect(cardToKeep([parentCard, { personId: "r", roleCount: 0, birthYear: 1970 }])?.personId).toBe("r");
    expect(cardToKeep([parentCard])?.personId).toBe("p");
  });

  it("offers organigram seats, not tesseramento types or work relationships", () => {
    expect(isSeatPosition("presidente")).toBe(true);
    expect(isSeatPosition("dirigente-accompagnatore")).toBe(true);
    expect(isSeatPosition("rasd-tessera-dirigente")).toBe(false);
    expect(isSeatPosition("ls-direttore-sportivo")).toBe(false);
  });

  it("falls back to the r64 approval only for a simple request", () => {
    expect(simpleRequest({ mergeIds: [], childIds: ["a"], positions: [] })).toBe(true);
    expect(simpleRequest({ mergeIds: ["x"], childIds: [], positions: [] })).toBe(false);
    expect(simpleRequest({ mergeIds: [], childIds: ["a", "b"], positions: [] })).toBe(false);
    expect(simpleRequest({ mergeIds: [], childIds: [], positions: [{ code: "consigliere" }] })).toBe(false);
  });

  it("explains every database refusal in plain words", () => {
    expect(multiOutcome(null).ok).toBe(true);
    expect(multiOutcome({ code: "PGRST202" }).message).toMatch(/applica r121/);
    expect(multiOutcome({ code: "42501", message: "merge: only Presidente or Direttore Generale merge these cards" }).message).toMatch(/Presidente e Direttore generale/);
    expect(multiOutcome({ code: "42501", message: "not allowed" }).message).toMatch(/Direzione e Segreteria/);
    expect(multiOutcome({ code: "22023", message: "merge: different birth dates" }).message).toMatch(/date di nascita diverse/);
    expect(multiOutcome({ code: "22023", message: "merge: both cards are athletes" }).message).toMatch(/atleti/);
    expect(multiOutcome({ code: "22023", message: "merge: both cards have the same active consent" }).message).toMatch(/nulla è cambiato/);
    expect(multiOutcome({ code: "22023", message: "a minor holds no organigram position" }).message).toMatch(/minorenne/);
    expect(multiOutcome({ code: "22023", message: "request already reviewed" }).message).toMatch(/già gestita/);
    expect(multiOutcome({ code: "XX000", message: "boom" }).ok).toBe(false);
  });
});

describe("merge messages (review 17/10)", () => {
  it("names the reason a merge was refused", () => {
    expect(multiOutcome({ code: "22023", message: "card is not the requester" }).message).toMatch(/forse è il figlio/);
    expect(multiOutcome({ code: "22023", message: "merge: cards of two different accounts" }).message).toMatch(/due persone/);
    expect(multiOutcome({ code: "22023", message: "merge: a minor card with an account" }).message).toMatch(/minorenne/);
    expect(multiOutcome({ code: "42501", message: "merge: own card" }).message).toMatch(/tua stessa scheda/);
    expect(multiOutcome({ code: "42501", message: "merge: sections only the Direzione moves" }).message).toMatch(/Direzione/);
    expect(multiOutcome({ code: "42501", message: "only Presidente or Direttore Generale give these roles" }).message).toMatch(/Presidente e Direttore generale/);
    expect(multiOutcome({ code: "22023", message: "merge: duplicate data in scd_x" }).message).toMatch(/dati doppi/);
  });
});

describe("duplicate cards by name", () => {
  it("pairs same names, never two different known birth years or people who left", async () => {
    const { duplicateNamePairs } = await import("./access-requests");
    const p = (id: string, displayName: string, birthYear: number | null, status = "ACTIVE") => ({ id, displayName, birthYear, status });
    const pairs = duplicateNamePairs([p("a", "Ernesto Maglia", 1969), p("b", "ernesto  maglia", null), p("c", "Luca Neri", 1980), p("d", "Luca Neri", 2012), p("e", "Ernesto Maglia", null, "LEFT")]);
    expect(pairs.map(([x, y]) => `${x.id}${y.id}`)).toEqual(["ab"]);
  });
});
