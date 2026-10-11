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
import { birthYear, isMinor, personKind, type PersonDetail, type PersonRole, type PersonRow, type RoleKind } from "./people";
import { serverSupabase } from "./supabase.server";

export interface PeopleData {
  gate: WorkAreaGate;
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
type AthleteRow = { registration_status: string; medical_certificate_expires_at: string | null };
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

const PERSON_SELECT = "id,first_name,last_name,display_name,birth_date,email,phone,status,left_at,left_reason,source_id,scd_structure_roles(id,role_label,role_kind,area_id,active,valid_to,scd_teams(code,name)),scd_athletes(registration_status,medical_certificate_expires_at)";

function toRoles(rows: RoleRow[] | null, today: string): PersonRole[] {
  return (rows ?? [])
    .filter((r) => r.active && (!r.valid_to || r.valid_to >= today))
    .map((r) => ({ id: r.id, label: r.role_label, kind: r.role_kind, teamCode: r.scd_teams?.code ?? null, teamName: r.scd_teams?.name ?? null, areaId: r.area_id, validTo: r.valid_to }));
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
  const base: PeopleData = { gate, connected: false, organization: null, canWrite: false, today, people: [], error: null };
  if (gate.view !== "page") return base;
  if (!sb || !org) return base;
  const { data, error } = await sb.from("scd_people").select(PERSON_SELECT).eq("organization_id", org.organizationId).order("last_name").order("first_name").limit(2000);
  if (error) return { ...base, connected: true, organization: org.organization, error: "Lettura non riuscita dal database." };
  return { ...base, connected: true, organization: org.organization, canWrite, people: ((data ?? []) as unknown as PersonDbRow[]).map((p) => toRow(p, today)) };
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
      await sb.from("scd_structure_roles").insert({ organization_id: org.organizationId, person_id: id, role_label: data.roleLabel, role_kind: data.roleKind, contact_email: data.email ?? null, contact_phone: data.phone ?? null, source_id: "SUPERAPP_DIREZIONE" });
    } else {
      await sb.from("scd_athletes").insert({ organization_id: org.organizationId, person_id: id, registration_status: "UNVERIFIED" });
    }
    return { ok: true, message: "Persona inserita e registrata nello storico.", id };
  });
