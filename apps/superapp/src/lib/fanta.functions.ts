/**
 * Fantacalcio SCD on the server (r92). Standings are public (team display names only); the member's own game and
 * the tabellino run with the caller's session, and every limit is checked again by the database functions.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { sessionView } from "./auth.functions";
import {
  fantaError,
  parseFantaMe,
  parseReport,
  parseStandings,
  type FantaMe,
  type FantaStandings,
  type MatchReport,
} from "./fanta";
import { serverSupabase } from "./supabase.server";

const ORG_SLUG = "scd-colicoderviese";

async function scope() {
  const s = await sessionView();
  const org = s.configured && s.user ? (s.memberships[0] ?? null) : null;
  const sb = org ? serverSupabase() : null;
  return org && sb ? { org, sb } : null;
}

export interface FantaPage {
  signedIn: boolean;
  me: FantaMe | null;
  standings: FantaStandings;
}

export const getFanta = createServerFn({ method: "GET" }).handler(
  async (): Promise<FantaPage> => {
    const sb = serverSupabase();
    const empty = parseStandings(null);
    if (!sb) return { signedIn: false, me: null, standings: empty };
    const s = await sessionView();
    const org = s.user ? (s.memberships[0] ?? null) : null;
    const [st, me] = await Promise.all([
      sb.rpc("scd_fanta_standings", { p_org_slug: ORG_SLUG }),
      org
        ? sb.rpc("scd_fanta_me", { p_organization_id: org.organizationId })
        : Promise.resolve({ data: null, error: null }),
    ]);
    return {
      signedIn: !!s.user,
      me: me.error ? null : parseFantaMe(me.data),
      standings: st.error ? empty : parseStandings(st.data),
    };
  },
);

const RosterInput = z.object({
  displayName: z.string().min(1).max(40),
  athleteIds: z.array(z.string().uuid()).max(11),
});

export const saveFantaRoster = createServerFn({ method: "POST" })
  .inputValidator((d: z.input<typeof RosterInput>) => RosterInput.parse(d))
  .handler(async ({ data }): Promise<{ ok: boolean; message: string }> => {
    const c = await scope();
    if (!c) return { ok: false, message: fantaError("forbidden") };
    const { data: r, error } = await c.sb.rpc("scd_fanta_set_roster", {
      p_organization_id: c.org.organizationId,
      p_display_name: data.displayName,
      p_athlete_ids: data.athleteIds,
    });
    if (error) return { ok: false, message: fantaError("") };
    const out = (r ?? {}) as { ok?: boolean; code?: string; count?: number };
    if (!out.ok) return { ok: false, message: fantaError(out.code ?? "") };
    return {
      ok: true,
      message: `Squadra salvata: ${out.count ?? data.athleteIds.length} giocatori.`,
    };
  });

export const getMatchReport = createServerFn({ method: "GET" })
  .inputValidator((d: { eventId: string }) =>
    z.object({ eventId: z.string().min(3).max(120) }).parse(d),
  )
  .handler(
    async ({
      data,
    }): Promise<{
      state: "ok" | "no-match" | "signed-out" | "error";
      report: MatchReport | null;
    }> => {
      const c = await scope();
      if (!c) return { state: "signed-out", report: null };
      // The match row exists once the call-up was sent (r62); the staff function resolves it with the team scope.
      const sheet = await c.sb.rpc("scd_staff_match_sheet", {
        p_organization_id: c.org.organizationId,
        p_source_record_id: data.eventId,
      });
      if (sheet.error)
        return {
          state: sheet.error.code === "42501" ? "signed-out" : "error",
          report: null,
        };
      const matchId =
        (sheet.data as { match_id?: string } | null)?.match_id ?? null;
      if (!matchId) return { state: "no-match", report: null };
      const { data: raw, error } = await c.sb.rpc("scd_staff_match_report", {
        p_organization_id: c.org.organizationId,
        p_match_id: matchId,
      });
      if (error) return { state: "error", report: null };
      return { state: "ok", report: parseReport(raw) };
    },
  );

const ReportInput = z.object({
  matchId: z.string().uuid(),
  goalsFor: z.number().int().min(0).max(30),
  goalsAgainst: z.number().int().min(0).max(30),
  rows: z
    .array(
      z.object({
        athleteId: z.string().uuid(),
        minutes: z.number().int().min(0).max(130),
        goals: z.number().int().min(0).max(30),
        assists: z.number().int().min(0).max(30),
        yellow: z.number().int().min(0).max(2),
        red: z.boolean(),
        role: z.enum(["P", "D", "C", "A"]).nullable(),
      }),
    )
    .max(40),
});

function explain(m: string, code?: string): string {
  if (code === "42501" || m.includes("not allowed"))
    return "Puoi compilare il tabellino solo per le tue squadre.";
  if (m.includes("not played yet"))
    return "Il tabellino si compila dopo il fischio d'inizio.";
  if (m.includes("more scorers"))
    return "I gol dei giocatori sono più dei gol segnati.";
  if (m.includes("not in team"))
    return "In lista c'è un giocatore che non è della squadra.";
  if (m.includes("invalid score")) return "Indica il risultato finale.";
  return "Salvataggio non riuscito, riprova.";
}

export const saveMatchReport = createServerFn({ method: "POST" })
  .inputValidator((d: z.input<typeof ReportInput>) => ReportInput.parse(d))
  .handler(async ({ data }): Promise<{ ok: boolean; message: string }> => {
    const c = await scope();
    if (!c) return { ok: false, message: "Accedi per compilare il tabellino." };
    const { error } = await c.sb.rpc("scd_staff_save_match_report", {
      p_organization_id: c.org.organizationId,
      p_match_id: data.matchId,
      p_goals_for: data.goalsFor,
      p_goals_against: data.goalsAgainst,
      p_rows: data.rows.map((r) => ({
        athlete_id: r.athleteId,
        minutes: r.minutes,
        goals: r.goals,
        assists: r.assists,
        yellow: r.yellow,
        red: r.red,
        role: r.role,
      })),
    });
    if (error)
      return { ok: false, message: explain(error.message, error.code) };
    return {
      ok: true,
      message: "Tabellino salvato: i punti del fantacalcio sono aggiornati.",
    };
  });
