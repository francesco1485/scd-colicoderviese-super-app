import { describe, expect, it } from "vitest";

import { openedText } from "./assistant-open";

const ev = (detail: unknown) => new CustomEvent("assistant:open", { detail });

describe("openedText (UD-184: Crovi's home card sends its question to the chat)", () => {
  it("reads the first message of an open event, trimmed and capped", () => {
    expect(openedText(ev({ area: null, text: "  Quando si gioca?  " }))).toBe("Quando si gioca?");
    expect(openedText(ev({ area: null, text: "x".repeat(500) }))?.length).toBe(400);
  });

  it("gives null without a usable text", () => {
    for (const d of [null, {}, { area: null }, { text: "   " }, { text: 42 }, "text"]) expect(openedText(ev(d))).toBeNull();
  });
});
