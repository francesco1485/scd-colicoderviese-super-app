/**
 * «Ruoli della rosa» in the mister desk (UD-168, r142). The mister of a team (or the Direzione) sets P/D/C/A for the
 * athletes of that team; the value lives in scd_athletes.fanta_role, the column the tabellino already writes (r92),
 * and feeds the public showcase. Every call runs with the caller's own session: the database checks who may read
 * (scd_my_team_ids) and who may write (MISTER of that team or DIRECTION) and keeps an audit row with counts only.
 * Engine: TEMPO (one list kept by the mister). Measure: share of athletes with a role; ROSTER_ROLES_SET audit rows.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { sessionView } from "./auth.functions";
import { isRosterRole, type RosterRole } from "./public-roster";
import { serverSupabase } from "./supabase.server";

export interface TeamRoles {
  state: "ok" | "signed-out" | "unconfigured" | "error";
  roles: Record<string, RosterRole | null>;
}

export interface TeamRolesSave {
  ok: boolean;
  changed: number;
  message: string;
}

const UUID = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
const ROLE = z.enum(["P", "D", "C", "A"]).nullable();

async function scoped() {
  const s = await sessionView();
  if (!s.configured) return { state: "unconfigured" as const };
  if (!s.user) return { state: "signed-out" as const };
  const org = s.memberships[0] ?? null;
  const sb = serverSupabase();
  if (!org || !sb) return { state: "unconfigured" as const };
  return { state: "ok" as const, org, sb };
}

/** Parses scd_staff_team_roles: [{athleteId, role}] → map athleteId → role. */
export function parseTeamRoles(raw: unknown): Record<string, RosterRole | null> {
  const out: Record<string, RosterRole | null> = {};
  if (!Array.isArray(raw)) return out;
  for (const r of raw) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    const id = o["athleteId"];
    if (typeof id !== "string" || !UUID.safeParse(id).success) continue;
    out[id] = isRosterRole(o["role"]) ? o["role"] : null;
  }
  return out;
}

export const getMyTeamRoles = createServerFn({ method: "GET" })
  .inputValidator((d: { teamId: string }) => z.object({ teamId: UUID }).parse(d))
  .handler(async ({ data }): Promise<TeamRoles> => {
    const c = await scoped();
    if (c.state !== "ok") return { state: c.state, roles: {} };
    const { data: raw, error } = await c.sb.rpc("scd_staff_team_roles", {
      p_organization_id: c.org.organizationId,
      p_team_id: data.teamId,
    });
    return error ? { state: "error", roles: {} } : { state: "ok", roles: parseTeamRoles(raw) };
  });

/** Human message for a refused save; the technical reason stays in the server log. */
export function saveMessage(error: { message?: string } | null): string {
  const m = error?.message ?? "";
  if (/not allowed/.test(m)) return "Solo il mister della squadra o la Direzione può salvare i ruoli.";
  if (/not in team/.test(m)) return "Un atleta non risulta più in rosa: ricarica la pagina.";
  if (/function .* does not exist|Could not find the function/i.test(m))
    return "Salvataggio non ancora attivo: serve l'aggiornamento r142 del database (approvazione della Direzione).";
  return "Ruoli non salvati. Riprova tra poco.";
}

export const saveMyTeamRoles = createServerFn({ method: "POST" })
  .inputValidator((d: { teamId: string; rows: { athleteId: string; role: RosterRole | null }[] }) =>
    z
      .object({
        teamId: UUID,
        rows: z.array(z.object({ athleteId: UUID, role: ROLE })).min(1).max(60),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<TeamRolesSave> => {
    const c = await scoped();
    if (c.state !== "ok") return { ok: false, changed: 0, message: "Accedi per salvare i ruoli." };
    const { data: n, error } = await c.sb.rpc("scd_staff_set_team_roles", {
      p_organization_id: c.org.organizationId,
      p_team_id: data.teamId,
      p_rows: data.rows.map((r) => ({ athlete_id: r.athleteId, role: r.role })),
    });
    if (error) {
      console.warn(`[ruoli-rosa] ${error.message}`);
      return { ok: false, changed: 0, message: saveMessage(error) };
    }
    const changed = typeof n === "number" ? n : 0;
    return { ok: true, changed, message: changed === 0 ? "Nessuna modifica." : `Ruoli salvati: ${changed}.` };
  });
