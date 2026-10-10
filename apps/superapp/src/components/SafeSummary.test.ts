import { describe, expect, test } from "vitest";

import { summaryFields } from "./SafeSummary";

// Ported from feat/super-app-unificata (bun:test -> vitest).
describe("summaryFields", () => {
  test("never exposes credentials or personal identifiers", () => {
    const fields = summaryFields({
      ok: true,
      data: { sessionToken: "x", email: "a@b.it", iban: "IT00", pin: "1234", nomeAtleta: "X", squadre: 9, ruolo: "STAFF" },
    });
    expect(fields.map((f) => f.key)).toEqual(["squadre", "ruolo"]);
  });

  test("summarises nested structures by size instead of dumping them", () => {
    const fields = summaryFields({ atleti: [{ nome: "x" }, { nome: "y" }], quote: { a: 1, b: 2, c: 3 } });
    expect(fields.find((f) => f.key === "atleti")?.value).toBe("2 elementi");
    expect(fields.find((f) => f.key === "quote")?.value).toBe("3 voci");
  });

  test("unknown values are marked NON VERIFICATO, never zero", () => {
    const fields = summaryFields({ incassi: null, ordini: "" });
    expect(fields.length).toBe(2);
    expect(fields.every((f) => f.value === "NON VERIFICATO")).toBe(true);
  });

  test("non-object input yields no fields", () => {
    expect(summaryFields(null)).toEqual([]);
    expect(summaryFields([1, 2])).toEqual([]);
    expect(summaryFields("testo")).toEqual([]);
  });
});
