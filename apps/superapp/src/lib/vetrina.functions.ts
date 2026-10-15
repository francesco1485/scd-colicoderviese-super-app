/**
 * Server function of the vetrina and its palinsesto (UD-110). The day is the SERVER's Rome day (serverRomeDay: SCD_QA_TODAY
 * only for QA, never in production) and the catalogue is imported inside the handler, so the browser only receives the
 * slots picked for that day.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { sessionView } from "./auth.functions";
import { stagingPreviewEnabled } from "./impianti-access";
import { PARTNER_NEWS, partnerNewsOn } from "./partner-news";
import { serverRomeDay } from "./public-window";
import {
  PUBLIC_WORLDS,
  pickAllWorlds,
  type VetrinaSlot,
  type VetrinaWorld,
} from "./vetrina";

export interface VetrinaDay {
  /** Server Rome day the vetrina was picked for. */
  today: string;
  /** Pick of the day for every world ("soci" filled only for a signed-in member's home). */
  worlds: Record<VetrinaWorld, VetrinaSlot[]>;
}

export const getVetrina = createServerFn({ method: "GET" })
  .inputValidator(
    (d: { pressRecent?: boolean; members?: boolean } | undefined) =>
      z
        .object({
          pressRecent: z.boolean().optional(),
          members: z.boolean().optional(),
        })
        .parse(d ?? {}),
  )
  .handler(async ({ data }): Promise<VetrinaDay> => {
    const { vetrinaCatalogue } = await import("./vetrina-slots.server");
    const today = serverRomeDay(process.env, Date.now());
    const facts = {
      pressRecent: data.pressRecent === true,
      partnerNews: partnerNewsOn(today, PARTNER_NEWS).length > 0,
    };
    // The "soci" world only for a session the server confirms (or the staging preview of the member home): the caller's
    // `members` flag alone is not trusted (security review 15/10/2026). Anyone else gets the public worlds.
    const members =
      data.members === true &&
      (stagingPreviewEnabled(process.env, import.meta.env.PROD) ||
        !!(await sessionView()).user);
    const worlds: readonly VetrinaWorld[] = members ? ["soci"] : PUBLIC_WORLDS;
    return {
      today,
      worlds: pickAllWorlds(vetrinaCatalogue(), today, facts, worlds),
    };
  });
