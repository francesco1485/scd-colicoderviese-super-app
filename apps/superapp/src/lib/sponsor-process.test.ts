import { describe, expect, it } from "vitest";

import { hypeWordsIn } from "./sponsor-packages";
import { SPONSOR_FAQ, SPONSOR_PROCESS_STEPS, SPOT_STANDARD_TEXT } from "./sponsor-process";
import { LED_MASTER } from "./sponsor-spots";

/** Task list (B2) on top of the club's FORBIDDEN_HYPE_STEMS. */
const EXTRA_HYPE = ["straordinari", "incredibil", "epic", "unico", "unica", "rivoluzion", "imperdibil"];
const hype = (t: string) => [
  ...hypeWordsIn(t),
  ...EXTRA_HYPE.filter((w) => new RegExp(`(^|[^\\p{L}])${w}`, "u").test(t.toLowerCase())),
];
const allTexts = [
  ...SPONSOR_PROCESS_STEPS.flatMap((s) => [s.title, s.text]),
  ...SPONSOR_FAQ.flatMap((f) => [f.q, f.a]),
];

describe("sponsor process steps", () => {
  it("has the five steps of the partnership in order", () => {
    expect(SPONSOR_PROCESS_STEPS.map((s) => s.id)).toEqual(["contatto", "pacchetto", "spot", "approvazione", "in-onda"]);
  });

  it("has unique ids", () => {
    expect(new Set(SPONSOR_PROCESS_STEPS.map((s) => s.id)).size).toBe(SPONSOR_PROCESS_STEPS.length);
  });

  it("states the LED standard from sponsor-spots (20 secondi, 1920x164) only in the spot step", () => {
    expect(SPOT_STANDARD_TEXT).toBe(`${LED_MASTER.seconds}\u00a0secondi, ${LED_MASTER.width}x${LED_MASTER.height}`);
    expect(SPOT_STANDARD_TEXT).toBe("20\u00a0secondi, 1920x164");
    const spot = SPONSOR_PROCESS_STEPS.find((s) => s.id === "spot");
    expect(spot?.text).toContain(SPOT_STANDARD_TEXT);
    for (const s of SPONSOR_PROCESS_STEPS) {
      const rest = s.text.replace(SPOT_STANDARD_TEXT, "");
      expect(`${s.title} ${rest}`, s.id).not.toMatch(/[0-9€]/);
    }
  });

  it("names the four package families and the spot approval", () => {
    const pacchetto = SPONSOR_PROCESS_STEPS.find((s) => s.id === "pacchetto")?.text ?? "";
    for (const w of ["LED wall", "maglie", "tornei", "app"]) expect(pacchetto).toContain(w);
    expect(SPONSOR_PROCESS_STEPS.find((s) => s.id === "contatto")?.text).toMatch(/Presidente.*commerciale/);
    expect(SPONSOR_PROCESS_STEPS.find((s) => s.id === "approvazione")?.text).toMatch(/modifiche/);
  });
});

describe("sponsor FAQ", () => {
  it("has 5 to 7 questions with unique ids", () => {
    expect(SPONSOR_FAQ.length).toBeGreaterThanOrEqual(5);
    expect(SPONSOR_FAQ.length).toBeLessThanOrEqual(7);
    expect(new Set(SPONSOR_FAQ.map((f) => f.id)).size).toBe(SPONSOR_FAQ.length);
  });

  it("every entry has a question ending with ? and a non-empty answer", () => {
    for (const f of SPONSOR_FAQ) {
      expect(f.q.trim().endsWith("?"), f.id).toBe(true);
      expect(f.a.trim().length, f.id).toBeGreaterThan(10);
    }
  });

  it("answers contain no digits and no euro sign (no prices, no invented numbers)", () => {
    for (const f of SPONSOR_FAQ) expect(`${f.q} ${f.a}`, f.id).not.toMatch(/[0-9€]/);
  });

  it("the cost answer: no listino, the Presidente defines the proposal with you", () => {
    const a = SPONSOR_FAQ.find((f) => f.id === "costo")?.a ?? "";
    expect(a).toMatch(/la definisce il Presidente con te/);
    expect(a).toMatch(/proposta/);
  });

  it("makes no tax, legal or sales promise", () => {
    for (const t of allTexts) expect(t.toLowerCase()).not.toMatch(/detra|dedu|fiscal|garanti|vendit|fatturato|aument/);
  });
});

describe("tone", () => {
  it("uses no hype words", () => {
    for (const t of allTexts) expect(hype(t), t).toEqual([]);
  });

  it("uses sentence case in titles and questions (no ALL CAPS words, no Title Case)", () => {
    for (const t of [...SPONSOR_PROCESS_STEPS.map((s) => s.title), ...SPONSOR_FAQ.map((f) => f.q)]) {
      // First word of each sentence may be capitalised.
      const words = t.split(/(?<=[.?!])\s+/).flatMap((sentence) => sentence.split(/\s+/).slice(1));
      const capitalised = words.filter((w) => /^[A-Z][a-z]/.test(w) && !["LED", "Presidente", "Direzione"].includes(w));
      expect(capitalised, t).toEqual([]);
    }
  });
});
