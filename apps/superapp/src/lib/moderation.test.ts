import { describe, expect, it } from "vitest";

import {
  MODERATION_RULES,
  moderationUserMessage,
  parseModerationAnswer,
  trustVerdict,
} from "./moderation";

describe("moderation", () => {
  it("reads a clean JSON answer and keeps only known categories", () => {
    const r = parseModerationAnswer(
      '{"verdict":"block","reason":"Nome di un minore","categories":["MINORE","BOH"]}',
    );
    expect(r).toEqual({
      verdict: "BLOCK",
      reason: "Nome di un minore",
      engine: "ai",
      categories: ["MINORE"],
    });
  });

  it("finds the JSON inside prose and never turns garbage into ALLOW", () => {
    expect(
      parseModerationAnswer(
        'Ecco: {"verdict":"ALLOW","reason":"","categories":[]} fine',
      ).verdict,
    ).toBe("ALLOW");
    expect(
      parseModerationAnswer('{"verdict":"ALLOW","reason":""}').reason,
    ).toBe("Nessuna regola violata.");
    expect(parseModerationAnswer("non lo so").verdict).toBe("REVIEW");
    expect(parseModerationAnswer('{"verdict":"MAYBE"}').verdict).toBe("REVIEW");
    expect(parseModerationAnswer("{bad json").verdict).toBe("REVIEW");
  });

  it("trust rule: known good authors publish, new ones get a human look", () => {
    expect(trustVerdict(true).verdict).toBe("ALLOW");
    expect(trustVerdict(false).verdict).toBe("REVIEW");
    expect(trustVerdict(false).engine).toBe("trust");
  });

  it("the rulebook names the sources and the message carries the context", () => {
    expect(MODERATION_RULES).toMatch(/SGS n\.2 2026\/27/);
    expect(MODERATION_RULES).toMatch(/39\/2021/);
    expect(MODERATION_RULES).toMatch(/2-quinquies/);
    const m = moderationUserMessage({
      channelLabel: "Pulcini",
      baseActivity: true,
      authorKind: "FAMILY",
      title: null,
      body: "Bella partita",
    });
    expect(m).toMatch(/attività di base/);
    expect(m).toMatch(/genitore/);
    expect(m).not.toMatch(/Titolo/);
  });
});
