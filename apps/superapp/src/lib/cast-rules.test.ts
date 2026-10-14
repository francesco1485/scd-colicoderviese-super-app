import { describe, expect, it, vi } from "vitest";

import { CHAT_AREA_IDS } from "./cast-personas";
import { castRulesAnswer, castRulesRoute } from "./cast-rules";
import { distressReferral } from "./cast-safety";
import type { SkyReply } from "./sky.functions";

const GENERAL: SkyReply = { text: "risposta generale", mood: "info", links: [{ label: "Contatti", to: "/contatti" }] };

function deps() {
  const general = vi.fn(async () => GENERAL);
  return { general, day: "2026-10-14" };
}

/** Every chat the rules engine can serve since UD-118: Vera alone, Vera with an area, Sky. */
const CHATS = [
  { persona: "vera" as const, area: null },
  ...CHAT_AREA_IDS.map((area) => ({ persona: "vera" as const, area })),
  { persona: "sky" as const, area: null },
];

describe("rules engine of Vera's chat (UD-118)", () => {
  it("applies the distress referral to every chat and area before anything else, without calling the general engine", async () => {
    for (const chat of CHATS) {
      for (const message of ["mi sento giù e non ce la faccio più", "prima della partita ho l'ansia", "voglio ordinare una torta ma mi sento triste"]) {
        const d = deps();
        const r = await castRulesAnswer({ message, ...chat }, d);
        expect(r, `${chat.persona}/${chat.area}: ${message}`).toEqual(distressReferral("distress"));
        expect(d.general).not.toHaveBeenCalled();
      }
      const d = deps();
      expect(await castRulesAnswer({ message: "voglio farla finita", ...chat }, d)).toEqual(distressReferral("danger"));
      expect(castRulesRoute("voglio farla finita", chat.persona, chat.area)).toBe("distress");
    }
  });

  it("sends safeguarding to the reserved-channel rules in every chat, even mid-order", async () => {
    for (const chat of CHATS) {
      const d = deps();
      await castRulesAnswer({ message: "devo segnalare un caso di bullismo alla festa", ...chat }, d);
      expect(d.general, `${chat.persona}/${chat.area}`).toHaveBeenCalledWith({ message: "devo segnalare un caso di bullismo alla festa" });
      expect(castRulesRoute("abuso in spogliatoio", chat.persona, chat.area)).toBe("general-safety");
    }
  });

  it("collects an order in the Club House area instead of the generic requests engine", async () => {
    const d = deps();
    const r = await castRulesAnswer({ message: "ci serve un buffet per la festa di sabato", persona: "vera", area: "accoglienza-chef" }, d);
    expect(d.general).not.toHaveBeenCalled();
    expect(r.text).toMatch(/richiesta d'ordine/);
    expect(r.links?.[0]?.to).toBe("/famiglia");
  });

  it("collects a ticket purchase for a person even without an area (Vera absorbed the ticket office)", async () => {
    const d = deps();
    const r = await castRulesAnswer({ message: "posso comprare il biglietto in chat?", persona: "vera" }, d);
    expect(d.general).not.toHaveBeenCalled();
    expect(r.text).toMatch(/non si vendono/);
  });

  it("keeps plain-words problems on the requests engine, which opens a request for the secretariat (UD-045)", async () => {
    const d = deps();
    await castRulesAnswer({ message: "manca il sapone in Club House", persona: "vera", area: "accoglienza-chef" }, d);
    expect(d.general).toHaveBeenCalled();
  });

  it("answers area intents from curated copy, and general intents with the general engine", async () => {
    const d = deps();
    const r = await castRulesAnswer({ message: "come funziona il sondaggio?", persona: "vera", area: "accoglienza-chef" }, d);
    expect(r.text).toMatch(/sondaggi sui piatti/i);
    expect(d.general).not.toHaveBeenCalled();
    const d2 = deps();
    await castRulesAnswer({ message: "dove si trova il campo?", persona: "vera", area: "volto-sponsor" }, d2);
    expect(d2.general).toHaveBeenCalled();
  });

  it("answers Vera's own topics without an area: tickets, and the fixed refusals of the tip-only characters", async () => {
    const d = deps();
    expect((await castRulesAnswer({ message: "quanto costa il biglietto?", persona: "vera" }, d)).text).toMatch(/prezzi/i);
    expect((await castRulesAnswer({ message: "mi fai una dieta per mio figlio?", persona: "vera" }, d)).text).toMatch(/Non do piani/);
    expect((await castRulesAnswer({ message: "che farmaco gli do?", persona: "vera" }, d)).text).toMatch(/Non indico farmaci/);
    expect((await castRulesAnswer({ message: "mi fai una scheda personale?", persona: "vera" }, d)).text).toMatch(/non li do/);
    expect(d.general).not.toHaveBeenCalled();
  });

  it("hands over to the face of the area with its actions when nothing matches", async () => {
    for (const area of CHAT_AREA_IDS) {
      const d = deps();
      const r = await castRulesAnswer({ message: "ciao", persona: "vera", area }, d);
      expect(d.general, area).not.toHaveBeenCalled();
      expect(r.text, area).toMatch(/Il consiglio di oggi/);
      expect(r.links?.length, area).toBeGreaterThanOrEqual(2);
    }
    const chef = await castRulesAnswer({ message: "ciao", persona: "vera", area: "accoglienza-chef" }, deps());
    expect(chef.text).toMatch(/Per la Club House ti aiuta Garrison, lo Chef/);
  });

  it("leaves Vera without an area, Sky and legacy tip-only areas on the general engine", async () => {
    for (const input of [{ persona: "vera" as const }, { persona: "sky" as const, area: "accoglienza-chef" as const }, { persona: undefined }, { persona: "vera" as const, area: "era" as never }]) {
      const d = deps();
      await castRulesAnswer({ message: "ciao", ...input }, d);
      expect(d.general).toHaveBeenCalledWith({ message: "ciao" });
    }
  });
});
