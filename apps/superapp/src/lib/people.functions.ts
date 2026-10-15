/**
 * People of the club on the server (UD-054). Every call runs with the caller's own Supabase
 * session, so the database's row-level security applies on top of the area gate here
 * (positions "direzione" / "segreteria", registry area `persone`). Writes go through the
 * r59 function `scd_person_mark_left` (history + audit) or plain inserts allowed to
 * DIRECTION / SECRETARIAT by the r35 policies. Nothing is cached: the list is the database.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { workAreaView, type WorkAreaGate } from "./access";
import { sessionView } from "./auth.functions";
import { stagingPreviewEnabled } from "./impianti-access";
import { birthYear, isMinor, personKind, type PersonDetail, type PersonRole, type PersonRow, type PersonTeam, type RoleKind } from "./people";
import { parseDeskCounts, type DeskCounts } from "./secretariat-desk";
import { serverSupabase } from "./supabase.server";

export interface PeopleData {
  gate: WorkAreaGate;
  /** Active teams of the club, for the "assign team" action (code + name, no counts). */
  teams: PersonTeam[];
  /** False when the server has no Supabase keys or the caller has no organization. */
  connected: boolean;
  organization: string | null;
  canWrite: boolean;
  today: string;
  people: PersonRow[];
  error: string | null;
}

function todayRome(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

type RoleRow = { id: string; role_label: string; role_kind: RoleKind; area_id: string | null; active: boolean; valid_to: string | null; scd_teams: { code: string; name: string } | null };
type MembershipRow = { valid_to: string | null; scd_teams: { code: string; name: string; status: string } | null };
type AthleteRow = { registration_status: string; medical_certificate_expires_at: string | null; scd_team_memberships: MembershipRow[] | null };
type PersonDbRow = {
  id: string;
  first_name: string;
  last_name: string;
  display_name: string | null;
  birth_date: string | null;
  email: string | null;
  phone: string | null;
  status: PersonRow["status"];
  left_at: string | null;
  left_reason: string | null;
  source_id: string;
  scd_structure_roles: RoleRow[] | null;
  scd_athletes: AthleteRow[] | null;
};

const PERSON_SELECT = "id,first_name,last_name,display_name,birth_date,email,phone,status,left_at,left_reason,source_id,scd_structure_roles(id,role_label,role_kind,area_id,active,valid_to,scd_teams(code,name)),scd_athletes(registration_status,medical_certificate_expires_at,scd_team_memberships(valid_to,scd_teams(code,name,status)))";

function toRoles(rows: RoleRow[] | null, today: string): PersonRole[] {
  return (rows ?? [])
    .filter((r) => r.active && (!r.valid_to || r.valid_to >= today))
    .map((r) => ({ id: r.id, label: r.role_label, kind: r.role_kind, teamCode: r.scd_teams?.code ?? null, teamName: r.scd_teams?.name ?? null, areaId: r.area_id, validTo: r.valid_to }));
}

function toTeams(rows: MembershipRow[] | null, today: string): PersonTeam[] {
  const m = new Map<string, string>();
  for (const r of rows ?? []) {
    if (!r.scd_teams || (r.valid_to && r.valid_to < today)) continue;
    m.set(r.scd_teams.code, r.scd_teams.name);
  }
  return [...m].map(([code, name]) => ({ code, name })).sort((a, b) => a.code.localeCompare(b.code, "it"));
}

function toRow(p: PersonDbRow, today: string): PersonRow {
  const roles = toRoles(p.scd_structure_roles, today);
  const ath = p.scd_athletes?.[0] ?? null;
  return {
    id: p.id,
    displayName: p.display_name ?? `${p.first_name} ${p.last_name}`.trim(),
    firstName: p.first_name,
    lastName: p.last_name,
    birthYear: birthYear(p.birth_date),
    minor: isMinor(p.birth_date, today),
    status: p.status,
    leftAt: p.left_at,
    leftReason: p.left_reason,
    kind: personKind(Boolean(ath), roles),
    roles,
    athlete: ath ? { registrationStatus: ath.registration_status, certificateExpiresAt: ath.medical_certificate_expires_at } : null,
    teams: ath ? toTeams(ath.scd_team_memberships, today) : [],
    sourceId: p.source_id,
  };
}

/** Gate + organization of the caller; shared by every function below. */
async function context() {
  const s = await sessionView();
  const roles = s.user ? new Set(s.roles) : null;
  const gate = workAreaView("persone", { preview: stagingPreviewEnabled(process.env, import.meta.env.PROD), sessionRoles: roles });
  const org = s.memberships[0] ?? null;
  const canWrite = Boolean(roles && (roles.has("direzione") || roles.has("segreteria")) && org && ["DIRECTION", "SECRETARIAT"].includes(org.role));
  return { s, gate, org, canWrite, sb: s.configured && s.user ? serverSupabase() : null };
}

export const getPeople = createServerFn({ method: "GET" }).handler(async (): Promise<PeopleData> => {
  const today = todayRome();
  const { gate, org, canWrite, sb } = await context();
  const base: PeopleData = { gate, teams: [], connected: false, organization: null, canWrite: false, today, people: [], error: null };
  if (gate.view !== "page") return base;
  if (!sb || !org) return base;
  const [{ data, error }, teams] = await Promise.all([
    sb.from("scd_people").select(PERSON_SELECT).eq("organization_id", org.organizationId).order("last_name").order("first_name").limit(2000),
    sb.from("scd_teams").select("code,name").eq("organization_id", org.organizationId).eq("status", "ACTIVE").order("code"),
  ]);
  if (error) return { ...base, connected: true, organization: org.organization, error: "Lettura non riuscita dal database." };
  return {
    ...base,
    connected: true,
    organization: org.organization,
    canWrite,
    teams: ((teams.data ?? []) as PersonTeam[]).map((t) => ({ code: t.code, name: t.name })),
    people: ((data ?? []) as unknown as PersonDbRow[]).map((p) => toRow(p, today)),
  };
});

export const getPerson = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }): Promise<PersonDetail | null> => {
    const today = todayRome();
    const { gate, org, sb } = await context();
    if (gate.view !== "page" || !sb || !org) return null;
    const { data: p, error } = await sb.from("scd_people").select(PERSON_SELECT).eq("id", data.id).eq("organization_id", org.organizationId).maybeSingle();
    if (error || !p) return null;
    const [events, consents] = await Promise.all([
      sb.from("scd_person_events").select("id,event_type,event_date,reason,other_club,note").eq("person_id", data.id).order("event_date", { ascending: false }).order("id", { ascending: false }).limit(100),
      sb.from("scd_person_consents").select("consent_type,granted,given_at,revoked_at").eq("person_id", data.id).order("given_at", { ascending: false }).limit(50),
    ]);
    const row = toRow(p as unknown as PersonDbRow, today);
    const pr = p as unknown as PersonDbRow;
    return {
      ...row,
      birthDate: pr.birth_date,
      email: pr.email,
      phone: pr.phone,
      events: ((events.data ?? []) as Array<{ id: number; event_type: string; event_date: string; reason: string | null; other_club: string | null; note: string | null }>).map((e) => ({ id: e.id, type: e.event_type, date: e.event_date, reason: e.reason, otherClub: e.other_club, note: e.note })),
      consents: ((consents.data ?? []) as Array<{ consent_type: string; granted: boolean; given_at: string; revoked_at: string | null }>).map((c) => ({ type: c.consent_type, granted: c.granted, givenAt: c.given_at, revokedAt: c.revoked_at })),
    };
  });

export interface WriteOutcome {
  ok: boolean;
  message: string;
  id?: string;
}

/** "Chi è andato via lo comunico e lo mettiamo scritto": r59 function, history + audit, roles closed. */
export const markPersonLeft = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; leftAt: string; reason: string; eventType: string; otherClub?: string | undefined; note?: string | undefined }) =>
    z
      .object({
        id: z.string().uuid(),
        leftAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        reason: z.string().trim().min(2).max(120),
        eventType: z.enum(["USCITA", "TRASFERIMENTO_OUT", "PRESTITO_OUT"]),
        otherClub: z.string().trim().max(120).optional(),
        note: z.string().trim().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<WriteOutcome> => {
    const { gate, canWrite, sb } = await context();
    if (gate.view !== "page" || !sb) return { ok: false, message: "Accesso non valido." };
    if (!canWrite) return { ok: false, message: "Solo Direzione e Segreteria possono registrare un'uscita." };
    if (data.eventType !== "USCITA" && !data.otherClub) return { ok: false, message: "Per trasferimenti e prestiti serve il club di destinazione." };
    const { error } = await sb.rpc("scd_person_mark_left", {
      p_person_id: data.id,
      p_left_at: data.leftAt,
      p_reason: data.reason,
      p_event_type: data.eventType,
      p_other_club: data.otherClub ?? null,
      p_note: data.note ?? null,
    });
    if (error) return { ok: false, message: /already|double|LEFT/i.test(error.message) ? "Questa persona risulta già uscita." : "Registrazione non riuscita." };
    return { ok: true, message: "Uscita registrata: resta nello storico, sparisce dalle viste." };
  });

/** New person typed by the Direction: scd_people + ENTRATA event (+ structure role for staff). */
export const insertPerson = createServerFn({ method: "POST" })
  .inputValidator((d: { firstName: string; lastName: string; birthDate?: string | undefined; email?: string | undefined; phone?: string | undefined; kind: "atleta" | "staff"; roleLabel?: string | undefined; roleKind?: string | undefined; note?: string | undefined }) =>
    z
      .object({
        firstName: z.string().trim().min(2).max(80),
        lastName: z.string().trim().min(2).max(80),
        birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        email: z.string().trim().toLowerCase().email().max(120).optional(),
        phone: z.string().trim().max(40).optional(),
        kind: z.enum(["atleta", "staff"]),
        roleLabel: z.string().trim().min(3).max(120).optional(),
        roleKind: z.enum(["DIRIGENTE", "MISTER", "AUTISTA", "RESPONSABILE", "STAFF", "ORGANO_SOCIETARIO"]).optional(),
        note: z.string().trim().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<WriteOutcome> => {
    const { gate, org, canWrite, sb } = await context();
    if (gate.view !== "page" || !sb || !org) return { ok: false, message: "Accesso non valido." };
    if (!canWrite) return { ok: false, message: "Solo Direzione e Segreteria possono inserire persone." };
    if (data.kind === "staff" && (!data.roleLabel || !data.roleKind)) return { ok: false, message: "Per lo staff servono ruolo e tipo di ruolo." };
    const { data: person, error } = await sb
      .from("scd_people")
      .insert({
        organization_id: org.organizationId,
        first_name: data.firstName,
        last_name: data.lastName,
        birth_date: data.birthDate ?? null,
        email: data.email ?? null,
        phone: data.phone ?? null,
        status: "ACTIVE",
        source_id: "SUPERAPP_DIREZIONE",
      })
      .select("id")
      .single();
    if (error || !person) return { ok: false, message: "Inserimento non riuscito." };
    const id = (person as { id: string }).id;
    await sb.from("scd_person_events").insert({ organization_id: org.organizationId, person_id: id, event_type: "ENTRATA", reason: data.kind === "staff" ? "Nuovo incarico" : "Nuovo tesserato", note: data.note ?? null });
    if (data.kind === "staff") {
      const { error: roleError } = await sb.from("scd_structure_roles").insert({ organization_id: org.organizationId, person_id: id, role_label: data.roleLabel, role_kind: data.roleKind, contact_email: data.email ?? null, contact_phone: data.phone ?? null, source_id: "SUPERAPP_DIREZIONE" });
      if (roleError)
        return {
          ok: false,
          id,
          message: /change these roles/.test(roleError.message)
            ? "Persona inserita senza incarico: Presidente e Direttore Generale li assegnano solo il Presidente o il Direttore Generale."
            : "Persona inserita, ma l'incarico non è stato salvato: riprova dalla sua scheda.",
        };
    } else {
      await sb.from("scd_athletes").insert({ organization_id: org.organizationId, person_id: id, registration_status: "UNVERIFIED" });
    }
    return { ok: true, message: "Persona inserita e registrata nello storico.", id };
  });

/** Confirm a pending athlete and put them in a team, or add / move an active one (r72, audited). */
export const assignTeam = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; teamCode: string; mode: "ADD" | "MOVE"; registrationSeen: boolean; note?: string | undefined }) =>
    z
      .object({
        id: z.string().uuid(),
        teamCode: z.string().trim().min(1).max(40),
        mode: z.enum(["ADD", "MOVE"]),
        registrationSeen: z.boolean(),
        note: z.string().trim().max(300).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<WriteOutcome> => {
    const { gate, org, canWrite, sb } = await context();
    if (gate.view !== "page" || !sb || !org) return { ok: false, message: "Accesso non valido." };
    if (!canWrite) return { ok: false, message: "Solo Direzione e Segreteria possono assegnare le squadre." };
    const { data: out, error } = await sb.rpc("scd_staff_assign_team", {
      p_organization_id: org.organizationId,
      p_person_id: data.id,
      p_team_code: data.teamCode,
      p_mode: data.mode,
      p_registration_seen: data.registrationSeen,
      p_note: data.note ?? null,
    });
    if (error) {
      if (/not an athlete/i.test(error.message)) return { ok: false, message: "Questa persona non è un atleta." };
      if (/team not found/i.test(error.message)) return { ok: false, message: "Squadra non trovata o non attiva." };
      if (/not active/i.test(error.message)) return { ok: false, message: "La persona non è attiva né in attesa." };
      return { ok: false, message: "Assegnazione non riuscita." };
    }
    const r = (out ?? {}) as { added?: boolean; closed?: number; activated?: boolean; verified?: boolean; team?: string };
    const parts: string[] = [];
    if (r.activated) parts.push("tesseramento confermato");
    if (r.added) parts.push(`in ${r.team ?? data.teamCode}`);
    else parts.push(`già in ${r.team ?? data.teamCode}`);
    if (r.closed) parts.push(`${r.closed === 1 ? "squadra precedente chiusa" : `${r.closed} squadre precedenti chiuse`}`);
    if (r.verified) parts.push("tesseramento FIGC segnato come visto");
    return { ok: true, message: `Fatto: ${parts.join(", ")}. Resta nello storico.` };
  });


export type DeskData = { connected: boolean; counts: DeskCounts | null; error: string | null };

/** r73: the secretariat's day as counts only (scd_secretariat_desk). Direzione/Segreteria; null counts when not allowed. */
export const getSecretariatDesk = createServerFn({ method: "GET" }).handler(async (): Promise<DeskData> => {
  const { org, canWrite, sb } = await context();
  if (!sb || !org) return { connected: false, counts: null, error: null };
  if (!canWrite) return { connected: true, counts: null, error: null };
  const { data, error } = await sb.rpc("scd_secretariat_desk", { p_organization_id: org.organizationId });
  if (error) return { connected: true, counts: null, error: "Scrivania non disponibile: lettura non riuscita." };
  return { connected: true, counts: parseDeskCounts(data), error: null };
});
