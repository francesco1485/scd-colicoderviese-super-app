/**
 * Team roster on the server (r94). One database function, scd_public_roster, applies the age rule and decides
 * whether the caller may see full names. Teams are inside (UD-100, Direzione 13/10/2026): only a signed-in member
 * (verified on the server from the request cookies) gets a roster; anonymous callers get an explicit
 * not-authorized result and the database is not even asked. Nothing here trusts the browser.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { sessionView } from "./auth.functions";
import { forMembers, type NotAuthorized } from "./public-access";
import { EMPTY_ROSTER, parsePublicRoster, type PublicRoster } from "./public-roster";
import { serverSupabase } from "./supabase.server";

const ORG_SLUG = "scd-colicoderviese";

export type RosterResult = (PublicRoster & { authorized: true }) | (NotAuthorized & PublicRoster);

/** Roster of one team by calendar id (prima, u19, u16, u15, 2014, …). Signed-in members only. */
export const getPublicRoster = createServerFn({ method: "GET" })
  .inputValidator((d: { team: string }) =>
    z.object({ team: z.string().regex(/^[a-z0-9_-]{1,40}$/) }).parse(d),
  )
  .handler(async ({ data }): Promise<RosterResult> => {
    const out = await forMembers(await sessionView(), async (): Promise<PublicRoster> => {
      const sb = serverSupabase();
      if (!sb) return EMPTY_ROSTER;
      const { data: raw, error } = await sb.rpc("scd_public_roster", {
        p_org_slug: ORG_SLUG,
        p_team_code: data.team,
      });
      return error ? EMPTY_ROSTER : parsePublicRoster(raw);
    });
    // Same shape for the page (count 0, no players) plus the explicit refusal.
    return out.authorized ? out : { ...EMPTY_ROSTER, team: data.team, ...out };
  });
