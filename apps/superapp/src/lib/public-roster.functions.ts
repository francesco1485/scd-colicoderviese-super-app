/**
 * Public roster on the server (r94). One database function, scd_public_roster, applies the age rule and decides
 * whether the caller (anonymous or a signed-in active member, read from the request cookies) may see full names.
 * Nothing here trusts the browser.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  EMPTY_ROSTER,
  parsePublicRoster,
  type PublicRoster,
} from "./public-roster";
import { serverSupabase } from "./supabase.server";

const ORG_SLUG = "scd-colicoderviese";

/** Roster of one team by calendar id (prima, u19, u16, u15, 2014, …). Works signed out. */
export const getPublicRoster = createServerFn({ method: "GET" })
  .inputValidator((d: { team: string }) =>
    z.object({ team: z.string().regex(/^[a-z0-9_-]{1,40}$/) }).parse(d),
  )
  .handler(async ({ data }): Promise<PublicRoster> => {
    const sb = serverSupabase();
    if (!sb) return EMPTY_ROSTER;
    const { data: out, error } = await sb.rpc("scd_public_roster", {
      p_org_slug: ORG_SLUG,
      p_team_code: data.team,
    });
    return error ? EMPTY_ROSTER : parsePublicRoster(out);
  });
