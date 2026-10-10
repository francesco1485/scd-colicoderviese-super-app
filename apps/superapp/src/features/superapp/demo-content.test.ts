import { describe, expect, test } from "vitest";

import { athleteDemo, familyDemo } from "./demo-content";

describe("contenuti dimostrativi delle aree riservate", () => {
  const text = JSON.stringify({ athleteDemo, familyDemo });
  test("nessun recapito, email o documento reale", () => {
    expect(text).not.toMatch(/@|\+39|\d{3}\s?\d{6,}|[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]/);
  });
  test("nomi esplicitamente generici (mai nomi di minori)", () => {
    expect(athleteDemo.name).toMatch(/demo/i);
    expect(familyDemo.children.map((c) => c.name)).toEqual(["Figlio 1", "Figlio 2"]);
    expect(athleteDemo.initials).toBe("AD");
  });
  test("date e orari non realistici: nessuna gara reale simulata", () => {
    expect(athleteDemo.call.date.day).toBe("--");
    expect(athleteDemo.call.date.time).toBe("--:--");
    expect(familyDemo.commitments.every((c) => c.when.includes("--"))).toBe(true);
    expect(athleteDemo.call.opponent).toMatch(/demo/i);
  });
});
