/**
 * "Numeri dell'app" on the server (UD-169, migration r143 STAGED: NOT APPLIED).
 *
 * trackPageView: +1 for a public page, called fire-and-forget by the browser tracker (components/PageViewTracker.tsx).
 * It calls recordPageView (page-views.server.ts), which applies a per-IP rate limit and uses the service-role client
 * (scd_track_page_view is executable by service_role only and validates everything again). It is off without
 * SCD_SUPABASE_SECRET_KEY, on the dev server and in the staging preview, and swallows every error: until r143 is
 * applied the call simply fails and nothing happens.
 *
 * getAppStats: the Direzione's read (scd_app_stats checks the role in the database). Until r143 answers, the page
 * says "Funzione in preparazione" and shows no number (unknown is never zero).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  PAGE_DEVICES,
  PAGE_SOURCES,
  STATS_PERIODS,
  type AppStatsDesk,
  type StatsPeriod,
} from "./page-views";
import { numeriLive, readAppStats, recordPageView } from "./page-views.server";

/* ------------------------------------------------------------------ tracker */

const trackSchema = z.object({
  path: z.string().max(2048),
  source: z.enum(PAGE_SOURCES),
  device: z.enum(PAGE_DEVICES),
});

export const trackPageView = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) => trackSchema.parse(raw))
  .handler(async ({ data }): Promise<{ ok: boolean }> => recordPageView(data));

/* ------------------------------------------------------------------ Direzione page */

export const numeriSearchSchema = z.object({
  giorni: z.coerce
    .number()
    .refine((n): n is StatsPeriod =>
      (STATS_PERIODS as readonly number[]).includes(n),
    )
    .optional(),
});
export type NumeriSearch = z.infer<typeof numeriSearchSchema>;

export const getAppStats = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) =>
    numeriSearchSchema.catch({}).parse(raw ?? {}),
  )
  .handler(async ({ data }): Promise<AppStatsDesk> =>
    readAppStats(data.giorni ?? 30),
  );

export {
  NUMERI_DENIED,
  NUMERI_NO_SESSION,
  NUMERI_OFF,
  NUMERI_READ_FAILED,
  emptyAppStatsDesk,
  type AppStatsDesk,
} from "./page-views";

/** True only when the Numeri dell'app page has real numbers to show to this session (r143 live, Direzione). */
export const getNumeriLive = createServerFn({ method: "GET" }).handler(
  async (): Promise<boolean> => numeriLive(),
);
