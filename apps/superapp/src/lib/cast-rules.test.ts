import { describe, expect, it, vi } from "vitest";

import { CAST_PERSONA_IDS } from "./cast-personas";
import { castRulesAnswer, castRulesRoute } from "./cast-rules";
import { distressReferral } from "./cast-safety";
import type { SkyReply } from "./sky.functions";

const GENERAL: SkyReply = { text: "risposta generale", mood: "info", links: [{ label: "Contatti", to: "/contatti" }] };

function deps() {
  const general = vi.fn(async () => GENERAL);
  return { general, day: "2026-10-14" };
}

const ALL = ["crovi", "genny", "sky", ...CAST_PERSONA_IDS] as const;

describe("rules engine of the personas (UD-114)", () => {
  it("applies the distress referral to every persona before anything else, without calling the general engine", async () => {
    for (const persona of ALL) {
      for (const message of ["mi sento giù e non ce la faccio più", "prima della partita ho l'ansia", "voglio ordinare una torta ma mi sento triste"]) {
        const d = deps();
        const r = await castRulesAnswer({ message, persona }, d);
        expect(r, `${persona}: ${message}`).toEqual(distressReferral("distress"));
        expect(d.general).not.toHaveBeenCalled();
      }
      const d = deps();
      expect(await castRulesAnswer({ message: "voglio farla finita", persona }, d)).toEqual(distressReferral("danger"));
      expect(castRulesRoute("voglio farla finita", persona)).toBe("distress");
    }
  });

  it("sends safeguarding to the reserved-channel rules for every persona, even mid-order", async () => {
    for (const persona of ALL) {
      const d = deps();
      await castRulesAnswer({ message: "devo segnalare un caso di bullismo alla festa", persona }, d);
      expect(d.general, persona).toHaveBeenCalledWith({ message: "devo segnalare un caso di bullismo alla festa" });
      expect(castRulesRoute("abuso in spogliatoio", persona)).toBe("general-safety");
    }
  });

  it("collects an order for the chef instead of the generic requests engine", async () => {
    const d = deps();
    const r = await castRulesAnswer({ message: "ci serve un buffet per la festa di sabato", persona: "accoglienza-chef" }, d);
    expect(d.general).not.toHaveBeenCalled();
    expect(r.text).toMatch(/richiesta d'ordine/);
    expect(r.links?.[0]?.to).toBe("/famiglia");
  });

  it("keeps plain-words problems on the requests engine (UD-045)", async () => {
    const d = deps();
    await castRulesAnswer({ message: "manca il sapone in Club House", persona: "accoglienza-chef" }, d);
    expect(d.general).toHaveBeenCalled();
  });

  it("answers persona intents in the persona's voice and general intents with the general engine", async () => {
    const d = deps();
    const r = await castRulesAnswer({ message: "cosa mangio prima dell'allenamento?", persona: "era" }, d);
    expect(r.text).toMatch(/leggero/);
    expect(d.general).not.toHaveBeenCalled();
    const d2 = deps();
    await castRulesAnswer({ message: "dove si trova il campo?", persona: "musica-relax" }, d2);
    expect(d2.general).toHaveBeenCalled();
  });

  it("falls back to a useful, persona-flavoured default with links when nothing matches", async () => {
    for (const persona of CAST_PERSONA_IDS) {
      const d = deps();
      const r = await castRulesAnswer({ message: "ciao", persona }, d);
      expect(d.general, persona).not.toHaveBeenCalled();
      expect(r.text, persona).toMatch(/Il consiglio di oggi/);
      expect(r.links?.length, persona).toBeGreaterThanOrEqual(2);
    }
  });

  it("leaves the three helpers on the general engine", async () => {
    for (const persona of ["crovi", "genny", "sky", undefined] as const) {
      const d = deps();
      await castRulesAnswer({ message: "ciao", persona }, d);
      expect(d.general).toHaveBeenCalledWith({ message: "ciao" });
    }
  });
});
