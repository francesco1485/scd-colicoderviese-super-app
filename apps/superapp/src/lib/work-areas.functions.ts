/**
 * Server-side gate of the work areas. The staging preview switch is the shared
 * `stagingPreviewEnabled()` (src/lib/impianti-access.ts: SCD_STAGING_PREVIEW=1 AND dev server or
 * staging gateway with SCD_STAGING_PASSWORD of 20+ characters; SCD_ENV=production forces it off),
 * read from process.env on the server only. No session is created and no role is granted.
 * The session is verified on the server (Supabase cookies, src/lib/auth.functions.ts); the
 * client-side token is never trusted for this decision.
 *
 * Decision = OLD rule (positions, Direzione sees all) OR a section grant of the Direzione (r100 scd_person_grants read
 * through the caller's own session, src/lib/access-resolver.server.ts). Additive and fail-closed: a grant never closes
 * an area that the old rule opens, and any missing function or error leaves the old decision alone.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { workAreaView, type WorkAreaGate } from "./access";
import type { AccessNav } from "./access-resolver";
import { gateWithGrants, navFor, type CallerContext, type ProbeSource } from "./access-resolver.server";
import { sessionView, type SessionView } from "./auth.functions";
import { WORK_AREA_IDS } from "./areas";
import { stagingPreviewEnabled } from "./impianti-access";
import { serverSupabase } from "./supabase.server";

function callerContext(s: SessionView): CallerContext {
  const signedIn = s.configured && !!s.user;
  return {
    signedIn,
    organizationId: s.memberships[0]?.organizationId || null,
    sb: signedIn ? serverSupabase() : null,
  };
}

export const getWorkAreaGate = createServerFn({ method: "GET" })
  .inputValidator((d: { area: string }) => z.object({ area: z.string().refine((a) => WORK_AREA_IDS.includes(a)) }).parse(d))
  .handler(async ({ data }): Promise<WorkAreaGate> => {
    const s = await sessionView();
    const old = workAreaView(data.area, {
      preview: stagingPreviewEnabled(process.env, import.meta.env.PROD),
      sessionRoles: s.user ? new Set(s.roles) : null,
    });
    return gateWithGrants(data.area, old, callerContext(s));
  });

/** What the navigation adds for the signed-in caller (areas from grants, family / team from the verified identity). */
export const getAccessNav = createServerFn({ method: "GET" }).handler(async (): Promise<AccessNav & { engine: ProbeSource }> => {
  const s = await sessionView();
  return navFor(callerContext(s));
});
