// @ts-expect-error bun runtime types not installed
import { describe, expect, test } from "bun:test";

import { summaryFields } from "./SafeSummary";

describe("summaryFields", () => {
  test("never exposes credentials or personal identifiers", () => {
    const fields = summaryFields({
      ok: true,
      data: { sessionToken: "x", email: "a@b.it", iban: "IT00", pin: "1234", squadre: 9, ruolo: "STAFF" },
    });
    const keys = fields.map((f) => f.key);
    expect(keys).toEqual(["squadre", "ruolo"]);
  });

  test("summarises nested structures by size instead of dumping them", () => {
    const fields = summaryFields({ atleti: [{ nome: "x" }, { nome: "y" }], quote: { a: 1, b: 2, c: 3 } });
    expect(fields.find((f) => f.key === "atleti")?.value).toBe("2 elementi");
    expect(fields.find((f) => f.key === "quote")?.value).toBe("3 voci");
  });

  test("unknown values are marked NON VERIFICATO, never zero", () => {
    const fields = summaryFields({ incassi: null, ordini: "" });
    expect(fields.every((f) => f.value === "NON VERIFICATO")).toBe(true);
  });

  test("non-object input yields no fields", () => {
    expect(summaryFields(null)).toEqual([]);
    expect(summaryFields([1, 2])).toEqual([]);
    expect(summaryFields("testo")).toEqual([]);
  });
});
