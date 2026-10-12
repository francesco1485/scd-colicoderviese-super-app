import { describe, expect, it } from "vitest";

import { areaLabel, dueIn, dueText, dueTone, parseKb, safeLink, seasonsUntil } from "./knowledge";

describe("parseKb", () => {
  it("returns null without an office level and keeps only valid items", () => {
    expect(parseKb(null)).toBeNull();
    expect(parseKb({ level: "FAMIGLIA", items: [] })).toBeNull();
    const r = parseKb({
      level: "INTERNO",
      items: [
        { id: "1", kind: "DOCUMENTO", area: "IMPIANTI_COMUNI", stagione: "2024/25", titolo: "Omologazione 0865", scadenza: "2028-09-28", importo: "12.50", link: "https://drive.google.com/open?id=abc", tags: ["omologazione", 3] },
        { id: "2", titolo: "Link non sicuro", link: "javascript:alert(1)" },
        { titolo: "senza id" },
      ],
      counts: { IMPIANTI_COMUNI: 4, BAD: "x" },
    })!;
    expect(r.items).toHaveLength(2);
    expect(r.items[0]).toMatchObject({ kind: "DOCUMENTO", season: "2024/25", due: "2028-09-28", amount: 12.5, tags: ["omologazione"] });
    expect(r.items[1]!.link).toBeNull();
    expect(r.counts).toEqual({ IMPIANTI_COMUNI: 4 });
  });
});

describe("helpers", () => {
  it("labels areas, accepts only https links and builds the season list back to the mailbox opening", () => {
    expect(areaLabel("TESSERAMENTI_ISCRIZIONI")).toBe("Tesseramenti iscrizioni");
    expect(safeLink("http://x.it")).toBeNull();
    expect(safeLink("https://mail.google.com/mail/u/0/#search/abc")).not.toBeNull();
    const s = seasonsUntil("2026-10-12");
    expect(s[0]).toBe("2026/27");
    expect(s.at(-1)).toBe("2011/12");
    expect(seasonsUntil("2026-06-30")[0]).toBe("2025/26");
  });
  it("describes deadlines", () => {
    expect(dueIn("2026-10-12", "2026-10-29")).toBe(17);
    expect(dueTone(-3)).toBe("crit");
    expect(dueTone(10)).toBe("crit");
    expect(dueTone(40)).toBe("warn");
    expect(dueTone(400)).toBe("info");
    expect(dueText(0)).toBe("scade oggi");
    expect(dueText(-5)).toBe("scaduto da 5 giorni");
    expect(dueText(17)).toBe("tra 17 giorni");
  });
});
