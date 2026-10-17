/**
 * «Vetrina squadre» on the server (UD-168, r142). Public by decision of the Direttore Generale (17/10/2026): no session
 * needed. One database function, scd_public_team_showcase, applies the age rule (full name for adults only), so full surnames of
 * minors never leave the database; the answer is then parsed with a whitelist (team-showcase.ts) before it reaches
 * the page. Only prima, u19 and u16 are asked: any other team is refused here without a database call.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { serverSupabase } from "./supabase.server";
import { emptyShowcase, isShowcaseTeam, parseShowcase, type TeamShowcase } from "./team-showcase";

const ORG_SLUG = "scd-colicoderviese";

/** Reads the showcase of one team through any client that exposes rpc (the request-bound Supabase client in prod). */
export async function readShowcase(
  team: string,
  sb: { rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }> } | null,
): Promise<TeamShowcase> {
  if (!isShowcaseTeam(team)) return emptyShowcase(team, "not-public");
  if (!sb) return emptyShowcase(team, "pending");
  const { data, error } = await sb.rpc("scd_public_team_showcase", { p_org_slug: ORG_SLUG, p_team_code: team });
  return error ? emptyShowcase(team, "pending") : parseShowcase(team, data);
}

export const getTeamShowcase = createServerFn({ method: "GET" })
  .inputValidator((d: { team: string }) => z.object({ team: z.string().regex(/^[a-z0-9_-]{1,40}$/) }).parse(d))
  .handler(async ({ data }): Promise<TeamShowcase> => readShowcase(data.team, isShowcaseTeam(data.team) ? serverSupabase() : null));
