/**
 * Person grants on the server (r100, UD-112). Area gate "accessi" + Direzione-only writes, enforced again by the
 * database (scd_person_grants_guard). Nothing is cached.
 *
 * Fail-closed: while r100 is not applied the page reads the person and the catalogue (existing tables only) to show
 * "Vedrà" and the role suggestions, but saving and copying answer "Da attivare" and nothing is written anywhere.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { workAreaView, type WorkAreaGate } from "./access";
import { sessionView } from "./auth.functions";
import { stagingPreviewEnabled } from "./impianti-access";
import {
  CLUB_ACCOUNT_EMAIL,
  LEVELS,
  PERIMETERS,
  SITES,
  grantAuditSummary,
  isLevel,
  isPerimeter,
  isSite,
  suggestGrants,
  type GrantRow,
  type RoleFacts,
  type Suggestion,
} from "./person-grants";
import { grantsEngineState, isMissingObjectError, type GrantsClient, type GrantsEngine } from "./person-grants.server";
import { isMinor } from "./people";
import { KNOWN_POSITIONS, ROLE_POSITIONS, isDbRole } from "./session";
import { serverSupabase } from "./supabase.server";

export interface PersonGrantsAudit {
  id: number;
  createdAt: string;
  action: string;
  actorEmail: string | null;
  summary: string;
  note: string;
}

export interface PersonGrantsData {
  gate: WorkAreaGate;
  /** False without a database session (staging preview, signed out). */
  connected: boolean;
  /** r100 applied on the database? Writes only when "applied". */
  engine: GrantsEngine;
  actor: { isDirection: boolean; email: string | null; personIds: string[] };
  person: { id: string; name: string; minor: boolean | null; status: string } | null;
  accounts: Array<{ email: string; role: string; active: boolean }>;
  isSelf: boolean;
  isClubAccount: boolean;
  roleFacts: RoleFacts;
  teams: Array<{ id: string; code: string; name: string; status: string }>;
  grants: GrantRow[];
  audit: PersonGrantsAudit[];
  /** Other people of the club, names only, for "Copia da…". */
  people: Array<{ id: string; name: string }>;
  /** Proposals from the roles: from the database when r100 is applied, otherwise from the same mapping in TS. */
  suggestions: Suggestion[];
  suggestionsFrom: "database" | "catalogue";
}

const EMPTY_FACTS: RoleFacts = { positions: [], structureRoles: [], isGuardian: false, isAthlete: false };

function todayRome(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

async function context() {
  const s = await sessionView();
  const roles = s.user ? new Set(s.roles) : null;
  const gate = workAreaView("accessi", { preview: stagingPreviewEnabled(process.env, import.meta.env.PROD), sessionRoles: roles });
  const org = s.memberships[0] ?? null;
  const isDirection = org?.role === "DIRECTION";
  const sb = s.configured && s.user ? serverSupabase() : null;
  return { gate, org, isDirection, actorEmail: s.user?.email?.toLowerCase() ?? null, sb };
}

type AccountRow = { user_id: string; email: string; role: string; positions: string[] | null; active: boolean; persons: Array<{ id: string }> | null };
type PersonDb = {
  id: string;
  first_name: string;
  last_name: string;
  display_name: string | null;
  birth_date: string | null;
  status: string;
  scd_structure_roles: Array<{ role_label: string; role_kind: string; team_id: string | null; active: boolean; valid_to: string | null }> | null;
  scd_athletes: Array<{ id: string }> | null;
};
type GrantDb = { id: string; section_code: string; level: string; perimeter: string; team_ids: string[] | null; site: string | null; granted_by: string | null; granted_at: string; revoked_at: string | null; note: string | null };
type AuditDb = { id: number; created_at: string; action: string; actor_email: string | null; detail: Record<string, unknown> | null };

export function toGrantRow(r: GrantDb): GrantRow | null {
  if (!isLevel(r.level) || !isPerimeter(r.perimeter)) return null;
  return {
    id: r.id,
    sectionCode: r.section_code,
    level: r.level,
    perimeter: r.perimeter,
    teamIds: r.team_ids ?? [],
    site: isSite(r.site) ? r.site : null,
    grantedBy: r.granted_by,
    grantedAt: r.granted_at,
    revokedAt: r.revoked_at,
    note: r.note,
  };
}

function positionsOf(a: Pick<AccountRow, "role" | "positions" | "active">): string[] {
  if (!a.active) return [];
  const base = isDbRole(a.role) ? [...ROLE_POSITIONS[a.role]] : [];
  return [...new Set([...base, ...(a.positions ?? []).filter((p) => KNOWN_POSITIONS.includes(p))])];
}

async function readGrants(sb: NonNullable<ReturnType<typeof serverSupabase>>, organizationId: string, personId: string): Promise<GrantRow[]> {
  const { data, error } = await sb
    .from("scd_person_grants")
    .select("id,section_code,level,perimeter,team_ids,site,granted_by,granted_at,revoked_at,note")
    .eq("organization_id", organizationId)
    .eq("person_id", personId)
    .is("revoked_at", null)
    .order("section_code");
  if (error) return [];
  return ((data ?? []) as GrantDb[]).map(toGrantRow).filter((g): g is GrantRow => g !== null);
}

const uuid = z.string().uuid();

export const getPersonGrants = createServerFn({ method: "GET" })
  .inputValidator((d: { personId: string }) => z.object({ personId: z.string().max(64) }).parse(d))
  .handler(async ({ data }): Promise<PersonGrantsData> => {
    const { gate, org, isDirection, actorEmail, sb } = await context();
    const base: PersonGrantsData = {
      gate,
      connected: false,
      engine: "unknown",
      actor: { isDirection, email: actorEmail, personIds: [] },
      person: null,
      accounts: [],
      isSelf: false,
      isClubAccount: false,
      roleFacts: EMPTY_FACTS,
      teams: [],
      grants: [],
      audit: [],
      people: [],
      suggestions: [],
      suggestionsFrom: "catalogue",
    };
    if (gate.view !== "page" || !sb || !org) return base;
    const engine = await grantsEngineState(sb as unknown as GrantsClient);
    const personId = uuid.safeParse(data.personId).success ? data.personId : null;
    const today = todayRome();

    const [personRes, accountsRes, teamsRes, peopleRes, guardianRes] = await Promise.all([
      personId
        ? sb
            .from("scd_people")
            .select("id,first_name,last_name,display_name,birth_date,status,scd_structure_roles(role_label,role_kind,team_id,active,valid_to),scd_athletes(id)")
            .eq("organization_id", org.organizationId)
            .eq("id", personId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      sb.rpc("scd_admin_accounts", { p_organization_id: org.organizationId }),
      sb.from("scd_teams").select("id,code,name,status").eq("organization_id", org.organizationId).order("code"),
      sb.from("scd_people").select("id,display_name,first_name,last_name,status").eq("organization_id", org.organizationId).neq("status", "LEFT").order("last_name").order("first_name").limit(2000),
      personId ? sb.from("scd_family_members").select("person_id").eq("person_id", personId).eq("is_guardian", true).limit(1) : Promise.resolve({ data: [], error: null }),
    ]);

    const accounts = ((accountsRes.data ?? []) as AccountRow[]);
    const actorPersonIds = accounts.filter((a) => actorEmail && a.email.toLowerCase() === actorEmail).flatMap((a) => (a.persons ?? []).map((p) => p.id));
    const out: PersonGrantsData = {
      ...base,
      connected: true,
      engine,
      actor: { isDirection, email: actorEmail, personIds: actorPersonIds },
      teams: ((teamsRes.data ?? []) as PersonGrantsData["teams"]),
      people: ((peopleRes.data ?? []) as Array<{ id: string; display_name: string | null; first_name: string; last_name: string }>)
        .filter((p) => p.id !== personId)
        .map((p) => ({ id: p.id, name: p.display_name ?? `${p.first_name} ${p.last_name}`.trim() })),
    };
    const p = personRes.data as PersonDb | null;
    if (!p) return out;

    const own = accounts.filter((a) => (a.persons ?? []).some((x) => x.id === p.id));
    const structureRoles = (p.scd_structure_roles ?? [])
      .filter((r) => r.active && (!r.valid_to || r.valid_to >= today))
      .map((r) => ({ kind: r.role_kind, teamId: r.team_id, label: r.role_label }));
    const roleFacts: RoleFacts = {
      positions: [...new Set(own.flatMap(positionsOf))],
      structureRoles,
      isGuardian: ((guardianRes.data ?? []) as unknown[]).length > 0,
      isAthlete: (p.scd_athletes ?? []).length > 0,
    };
    const filled: PersonGrantsData = {
      ...out,
      person: { id: p.id, name: p.display_name ?? `${p.first_name} ${p.last_name}`.trim(), minor: isMinor(p.birth_date, today), status: p.status },
      accounts: own.map((a) => ({ email: a.email, role: a.role, active: a.active })),
      isSelf: actorPersonIds.includes(p.id),
      isClubAccount: own.some((a) => a.email.toLowerCase() === CLUB_ACCOUNT_EMAIL),
      roleFacts,
      suggestions: suggestGrants(roleFacts),
    };
    if (engine !== "applied") return filled;

    const [grants, audit, sugg] = await Promise.all([
      readGrants(sb, org.organizationId, p.id),
      sb.rpc("scd_person_grant_audit", { p_organization_id: org.organizationId, p_person_id: p.id, p_limit: 60 }),
      sb.rpc("scd_suggest_grants", { p_organization_id: org.organizationId, p_person_id: p.id }),
    ]);
    const teamName = (id: string) => filled.teams.find((t) => t.id === id)?.name ?? "squadra";
    const dbSuggestions = !sugg.error
      ? ((sugg.data ?? []) as Array<{ section_code: string; level: string; perimeter: string; team_ids: string[] | null; site: string | null; reason: string }>)
          .filter((s) => isLevel(s.level) && isPerimeter(s.perimeter))
          .map((s) => ({ sectionCode: s.section_code, level: s.level as Suggestion["level"], perimeter: s.perimeter as Suggestion["perimeter"], teamIds: s.team_ids ?? [], site: isSite(s.site) ? s.site : null, reason: s.reason }))
      : null;
    return {
      ...filled,
      grants,
      audit: ((audit.data ?? []) as AuditDb[]).map((r) => ({
        id: r.id,
        createdAt: r.created_at,
        action: r.action,
        actorEmail: r.actor_email,
        summary: grantAuditSummary(r.action, r.detail ?? {}, teamName),
        note: typeof r.detail?.["note"] === "string" ? (r.detail["note"] as string) : "",
      })),
      ...(dbSuggestions ? { suggestions: dbSuggestions, suggestionsFrom: "database" as const } : {}),
    };
  });

/** Active grants of another person, for "Copia da…" (Direzione only; empty while r100 is not applied). */
export const getGrantsOf = createServerFn({ method: "GET" })
  .inputValidator((d: { personId: string }) => z.object({ personId: uuid }).parse(d))
  .handler(async ({ data }): Promise<{ engine: GrantsEngine; grants: GrantRow[] }> => {
    const { gate, org, isDirection, sb } = await context();
    if (gate.view !== "page" || !sb || !org || !isDirection) return { engine: "unknown", grants: [] };
    const engine = await grantsEngineState(sb as unknown as GrantsClient);
    if (engine !== "applied") return { engine, grants: [] };
    return { engine, grants: await readGrants(sb, org.organizationId, data.personId) };
  });

export const NOT_APPLIED_MESSAGE = "Da attivare: serve l'OK della Direzione per applicare r100. Nessuna abilitazione è stata salvata.";

export function explainGrantError(error: { code?: string; message: string }): string {
  const m = error.message;
  if (isMissingObjectError(error)) return NOT_APPLIED_MESSAGE;
  if (m.includes("base access missing")) return "Questa persona non ha un accesso attivo al club: prima riattiva l'accesso base. Togliere o ridurre le abilitazioni si può sempre.";
  if (m.includes("cannot edit own access")) return "Sono le tue abilitazioni: le può cambiare solo un'altra persona della Direzione.";
  if (m.includes("club account is protected")) return "Account del club: è protetto e non si modifica da qui.";
  if (m.includes("Direzione only")) return "Solo la Direzione abilita le sezioni.";
  if (m.includes("minor: SELF only")) return "A un minorenne si abilita solo \"Solo sé\".";
  if (m.includes("needs a reason")) return "Per i dati riservati scrivi il motivo.";
  if (m.includes("needs teams")) return "Scegli almeno una squadra per \"Sue annate\".";
  if (m.includes("needs a site")) return "Scegli la sede per \"Sua sede\".";
  if (m.includes("unknown team")) return "Squadra non riconosciuta.";
  if (m.includes("not grantable")) return "Questa sezione non si abilita da qui (parte protetta o non prevista).";
  if (m.includes("same person")) return "Scegli un'altra persona da cui copiare.";
  if (error.code === "42501") return "Non hai i permessi per questa modifica.";
  return "Modifica non riuscita, riprova.";
}

const GrantInput = z.object({
  sectionCode: z.string().regex(/^[a-z0-9-]{2,40}$/),
  level: z.enum(LEVELS),
  perimeter: z.enum(PERIMETERS),
  teamIds: z.array(uuid).max(40),
  site: z.enum(SITES).nullable(),
});

export const savePersonGrants = createServerFn({ method: "POST" })
  .inputValidator((d: { personId: string; grants: Array<z.infer<typeof GrantInput>>; note: string }) =>
    z.object({ personId: uuid, grants: z.array(GrantInput).max(60), note: z.string().max(300) }).parse(d))
  .handler(async ({ data }): Promise<{ ok: boolean; message: string }> => {
    const { gate, org, isDirection, sb } = await context();
    if (gate.view !== "page" || !sb || !org) return { ok: false, message: "Accesso non valido." };
    if (!isDirection) return { ok: false, message: "Solo la Direzione abilita le sezioni." };
    if ((await grantsEngineState(sb as unknown as GrantsClient)) !== "applied") return { ok: false, message: NOT_APPLIED_MESSAGE };
    const { data: n, error } = await sb.rpc("scd_set_person_grants", {
      p_organization_id: org.organizationId,
      p_person_id: data.personId,
      p_grants: data.grants.map((g) => ({ section: g.sectionCode, level: g.level, perimeter: g.perimeter, team_ids: g.teamIds, site: g.site })),
      p_note: data.note.trim() || null,
    });
    if (error) return { ok: false, message: explainGrantError(error) };
    const changes = typeof n === "number" ? n : 0;
    return { ok: true, message: changes ? `Salvato: ${changes} ${changes === 1 ? "modifica" : "modifiche"}, valgono dal prossimo caricamento della pagina.` : "Nessuna modifica da salvare." };
  });

export const copyPersonGrants = createServerFn({ method: "POST" })
  .inputValidator((d: { fromPersonId: string; toPersonId: string; note: string }) =>
    z.object({ fromPersonId: uuid, toPersonId: uuid, note: z.string().max(300) }).parse(d))
  .handler(async ({ data }): Promise<{ ok: boolean; message: string }> => {
    const { gate, org, isDirection, sb } = await context();
    if (gate.view !== "page" || !sb || !org) return { ok: false, message: "Accesso non valido." };
    if (!isDirection) return { ok: false, message: "Solo la Direzione abilita le sezioni." };
    if ((await grantsEngineState(sb as unknown as GrantsClient)) !== "applied") return { ok: false, message: NOT_APPLIED_MESSAGE };
    const { data: n, error } = await sb.rpc("scd_copy_person_grants", {
      p_organization_id: org.organizationId,
      p_from_person_id: data.fromPersonId,
      p_to_person_id: data.toPersonId,
      p_note: data.note.trim() || null,
    });
    if (error) return { ok: false, message: explainGrantError(error) };
    const changes = typeof n === "number" ? n : 0;
    return { ok: true, message: changes ? `Copiate: ${changes} ${changes === 1 ? "modifica" : "modifiche"}.` : "Niente da copiare: le abilitazioni sono già uguali." };
  });
