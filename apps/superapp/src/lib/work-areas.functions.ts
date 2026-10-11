/**
 * Server-side gate of the work areas. The staging preview switch is the shared
 * `stagingPreviewEnabled()` (src/lib/impianti-access.ts: SCD_STAGING_PREVIEW=1 AND dev server or
 * staging gateway with SCD_STAGING_PASSWORD of 20+ characters; SCD_ENV=production forces it off),
 * read from process.env on the server only. No session is created and no role is granted.
 * The session is verified on the server (Supabase cookies, src/lib/auth.functions.ts); the
 * client-side token is never trusted for this decision.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { workAreaView, type WorkAreaGate } from "./access";
import { sessionRoles } from "./auth.functions";
import { WORK_AREA_IDS } from "./areas";
import { stagingPreviewEnabled } from "./impianti-access";

export const getWorkAreaGate = createServerFn({ method: "GET" })
  .inputValidator((d: { area: string }) => z.object({ area: z.string().refine((a) => WORK_AREA_IDS.includes(a)) }).parse(d))
  .handler(
    async ({ data }): Promise<WorkAreaGate> =>
      workAreaView(data.area, { preview: stagingPreviewEnabled(process.env, import.meta.env.PROD), sessionRoles: await sessionRoles() }),
  );
