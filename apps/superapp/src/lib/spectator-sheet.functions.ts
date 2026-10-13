/**
 * Distinta spettatori on the server. Same access as the pre-distinta: it reads the staff's saved draft through
 * getMatchSheet (caller's own session, team scope checked by scd_staff_match_sheet), then keeps only what may be
 * printed for the stands (spectator-sheet.ts). Full names of minors, birth years and ids never leave the server.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getMatchSheet } from "./match-sheet.functions";
import { loadCalendar } from "./public-snapshots";
import {
  buildSpectatorSheet,
  emptySpectatorSheet,
  type SpectatorSheet,
} from "./spectator-sheet";

export const getSpectatorSheet = createServerFn({ method: "GET" })
  .inputValidator((d: { eventId: string }) =>
    z.object({ eventId: z.string().min(3).max(120) }).parse(d),
  )
  .handler(async ({ data }): Promise<SpectatorSheet> => {
    const cal = loadCalendar();
    const event = cal.events.find((e) => e.id === data.eventId) ?? null;
    if (!event) return emptySpectatorSheet("no-event", data.eventId);
    const groupLabel =
      cal.groups.find((g) => g.id === event.group)?.label ?? "";
    if (event.homeAway !== "CASA")
      return buildSpectatorSheet(event, groupLabel, null);
    try {
      const sheet = await getMatchSheet({ data: { eventId: data.eventId } });
      return buildSpectatorSheet(event, groupLabel, sheet);
    } catch {
      return {
        ...buildSpectatorSheet(event, groupLabel, null),
        state: "error",
      };
    }
  });
