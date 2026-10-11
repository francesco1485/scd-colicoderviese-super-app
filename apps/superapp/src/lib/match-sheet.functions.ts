/**
 * Pre-distinta on the server (r70). Runs with the caller's own session; the database functions check the team scope,
 * the kick-off time and every limit. Nothing is cached.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { sessionView } from "./auth.functions";
import { asResponse, type CallupResponse } from "./callups";
import { isStaffRole, rulesFor, STAFF_ROLES, type SheetPlayer, type SheetRules, type SheetStaff } from "./match-sheet";
import { serverSupabase } from "./supabase.server";

export interface SheetCalledUp {
  athleteId: string;
  displayName: string;
  birthYear: number | null;
  response: CallupResponse;
  lastShirt: number | null;
}

export interface SheetStaffCandidate {
  personId: string;
  displayName: string;
  roleLabel: string;
}

export interface MatchSheetData {
  state: "ok" | "no-match" | "signed-out" | "error";
  matchId: string | null;
  teamCode: string;
  rules: SheetRules;
  locked: boolean;
  status: "NONE" | "DRAFT" | "READY";
  updatedAt: string | null;
  players: SheetPlayer[];
  staff: Array<SheetStaff & { displayName: string }>;
  captain: string | null;
  vice: string | null;
  note: string;
  calledUp: SheetCalledUp[];
  candidates: SheetStaffCandidate[];
}

async function scope() {
  const s = await sessionView();
  const org = s.configured && s.user ? (s.memberships[0] ?? null) : null;
  const sb = org ? serverSupabase() : null;
  return org && sb ? { org, sb } : null;
}

const empty = (state: MatchSheetData["state"]): MatchSheetData => ({
  state,
  matchId: null,
  teamCode: "",
  rules: rulesFor(""),
  locked: false,
  status: "NONE",
  updatedAt: null,
  players: [],
  staff: [],
  captain: null,
  vice: null,
  note: "",
  calledUp: [],
  candidates: [],
});

type Raw = {
  match_id: string;
  team_code: string;
  locked: boolean;
  rules: { max_listed: number; max_starters: number | null; captain_required: boolean };
  status: string;
  captain_athlete_id: string | null;
  vice_athlete_id: string | null;
  note: string | null;
  updated_at: string | null;
  players: Array<{ athlete_id: string; shirt: number; starter: boolean }>;
  staff: Array<{ person_id: string; role: string; display_name: string | null }>;
  called_up: Array<{ athlete_id: string; display_name: string | null; birth_year: number | null; response: string; last_shirt: number | null }>;
};

export const getMatchSheet = createServerFn({ method: "GET" })
  .inputValidator((d: { eventId: string }) => z.object({ eventId: z.string().min(3).max(120) }).parse(d))
  .handler(async ({ data }): Promise<MatchSheetData> => {
    const c = await scope();
    if (!c) return empty("signed-out");
    const { data: raw, error } = await c.sb.rpc("scd_staff_match_sheet", { p_organization_id: c.org.organizationId, p_source_record_id: data.eventId });
    if (error) return empty("error");
    if (!raw) return empty("no-match");
    const r = raw as Raw;
    const cand = await c.sb.rpc("scd_match_sheet_staff_candidates", { p_organization_id: c.org.organizationId, p_match_id: r.match_id });
    const calledIds = new Set(r.called_up.map((x) => x.athlete_id));
    return {
      state: "ok",
      matchId: r.match_id,
      teamCode: r.team_code,
      rules: { maxListed: r.rules.max_listed, maxStarters: r.rules.max_starters, captainRequired: r.rules.captain_required },
      locked: r.locked,
      status: r.status === "READY" || r.status === "DRAFT" ? r.status : "NONE",
      updatedAt: r.updated_at,
      // A player withdrawn after the draft was saved drops out of the list here; the next save confirms it.
      players: r.players.filter((p) => calledIds.has(p.athlete_id)).map((p) => ({ athleteId: p.athlete_id, shirt: Number(p.shirt), starter: Boolean(p.starter) })),
      staff: r.staff.filter((s) => isStaffRole(s.role)).map((s) => ({ personId: s.person_id, role: s.role as SheetStaff["role"], displayName: (s.display_name ?? "").trim() || "—" })),
      captain: r.captain_athlete_id && calledIds.has(r.captain_athlete_id) ? r.captain_athlete_id : null,
      vice: r.vice_athlete_id && calledIds.has(r.vice_athlete_id) ? r.vice_athlete_id : null,
      note: r.note ?? "",
      calledUp: r.called_up.map((x) => ({ athleteId: x.athlete_id, displayName: (x.display_name ?? "").trim() || "Nome non indicato", birthYear: x.birth_year, response: asResponse(x.response), lastShirt: x.last_shirt })),
      candidates: ((cand.data ?? []) as Array<{ person_id: string; display_name: string | null; role_label: string | null }>).map((x) => ({ personId: x.person_id, displayName: (x.display_name ?? "").trim() || "—", roleLabel: x.role_label ?? "" })),
    };
  });

const SaveInput = z.object({
  matchId: z.string().uuid(),
  players: z.array(z.object({ athleteId: z.string().uuid(), shirt: z.number().int().min(1).max(99), starter: z.boolean() })).max(40),
  staff: z.array(z.object({ personId: z.string().uuid(), role: z.enum(STAFF_ROLES) })).max(10),
  captain: z.string().uuid().nullable(),
  vice: z.string().uuid().nullable(),
  ready: z.boolean(),
  note: z.string().max(300),
});

function explain(m: string, code?: string): string {
  if (code === "42501" || m.includes("not allowed")) return "Puoi preparare la distinta solo per le tue squadre.";
  if (m.includes("already started")) return "La gara è iniziata: la distinta non si modifica più.";
  if (m.includes("too many players")) return "Troppi giocatori in lista.";
  if (m.includes("too many starters")) return "Troppi titolari.";
  if (m.includes("duplicate shirt")) return "Due giocatori hanno lo stesso numero di maglia.";
  if (m.includes("not called up")) return "In lista c'è chi non è più convocato: ricarica e controlla.";
  if (m.includes("must be starters")) return "Capitano e vice devono essere titolari.";
  if (m.includes("must differ")) return "Capitano e vice devono essere due giocatori diversi.";
  if (m.includes("captain and vice required")) return "Indica capitano e vice capitano.";
  if (m.includes("accompanying officer")) return "Indica il dirigente accompagnatore ufficiale.";
  if (m.includes("invalid staff")) return "In panchina c'è una persona non dello staff della squadra.";
  return "Salvataggio non riuscito, riprova.";
}

export const saveMatchSheet = createServerFn({ method: "POST" })
  .inputValidator((d: z.input<typeof SaveInput>) => SaveInput.parse(d))
  .handler(async ({ data }): Promise<{ ok: boolean; message: string }> => {
    const c = await scope();
    if (!c) return { ok: false, message: "Accedi per preparare la distinta." };
    const { error } = await c.sb.rpc("scd_staff_save_match_sheet", {
      p_organization_id: c.org.organizationId,
      p_match_id: data.matchId,
      p_players: data.players.map((p) => ({ athlete_id: p.athleteId, shirt: p.shirt, starter: p.starter })),
      p_staff: data.staff.map((s) => ({ person_id: s.personId, role: s.role })),
      p_captain: data.captain,
      p_vice: data.vice,
      p_status: data.ready ? "READY" : "DRAFT",
      p_note: data.note,
    });
    if (error) return { ok: false, message: explain(error.message, error.code) };
    return { ok: true, message: data.ready ? "Distinta pronta: ricopiala sul portale LND." : "Bozza salvata." };
  });
