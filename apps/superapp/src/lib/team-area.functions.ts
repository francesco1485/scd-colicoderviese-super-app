/**
 * Area squadra on the server (UD-183; r117 Area partite, r118 Area allenamenti e verifica mensile).
 * Every call runs with the caller's own Supabase session: the database functions decide who may read or write
 * (team scope scd_my_team_ids, family circle scd_my_family, office roles). Inputs are validated with zod; match
 * details come from the official calendar copy on the server, never from the browser.
 * While AREA_PARTITE_LIVE / AREA_ALLENAMENTI_LIVE are false nothing here touches the database: the screens show the
 * «serve r117 / r118» state.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { sessionView } from "./auth.functions";
import { matchTitle } from "./callups";
import { gapRequestItems, isMonth, monthStart, monthlyGaps, type MatchStatusRow, type SessionRow, type TeamGaps } from "./monthly-check";
import { teamTag } from "./quadro";
import { teamCodeForGroup } from "./roster";
import { serverSupabase } from "./supabase.server";
import {
  AREA_ALLENAMENTI_LIVE,
  AREA_PARTITE_LIVE,
  ATTENDANCE,
  DOC_KINDS,
  DRILL_AUDIENCE,
  REASON_CODES,
  REASON_NOTE_MAX,
  asReason,
  documentProblems,
  isMeetUrl,
  shortName,
  storageName,
  type AttendanceStatus,
  type DocKind,
  type DrillAudience,
  type ReasonCode,
} from "./team-area";

type Sb = NonNullable<ReturnType<typeof serverSupabase>>;
type Ctx = { orgId: string; sb: Sb };
type Outcome = { ok: boolean; message: string };

async function scope(): Promise<Ctx | null> {
  const s = await sessionView();
  const org = s.configured && s.user ? (s.memberships[0] ?? null) : null;
  const sb = org ? serverSupabase() : null;
  return org && sb ? { orgId: org.organizationId, sb } : null;
}

const NOT_LIVE: Outcome = { ok: false, message: "Funzione non ancora attiva: serve l'aggiornamento del database approvato dalla Direzione." };
const SIGNED_OUT: Outcome = { ok: false, message: "Accedi con il ruolo della squadra." };
const CODE_TEXT: Readonly<Record<string, string>> = {
  forbidden: "Puoi farlo solo per le squadre in cui hai un ruolo.",
  invalid: "Dati non validi: controlla i campi.",
  path: "Percorso del file non valido.",
  duplicate: "Questo file è già stato caricato.",
  started: "È già iniziato: non si può più modificare.",
  future: "Le presenze si segnano dal giorno dell'allenamento.",
  not_in_team: "Uno dei ragazzi non è nella rosa di questa squadra.",
  closed: "Questa richiesta è già stata chiusa o risposta: solo la Segreteria può modificarla.",
};
function codeMessage(out: unknown, fallback = "Non riuscito, riprova."): Outcome {
  const o = (out ?? {}) as { ok?: boolean; code?: string };
  if (o.ok) return { ok: true, message: "" };
  return { ok: false, message: (o.code && CODE_TEXT[o.code]) || fallback };
}

const EventId = z.string().min(3).max(120);
const Uuid = z.string().uuid();

/** Creates (or refreshes) the match row of a calendar event, like the first convocazione does (r62). */
async function ensureMatch(c: Ctx, eventId: string): Promise<string | null> {
  const { getCalendar } = await import("./calendar-bridge.server");
  const cal = await getCalendar();
  const ev = cal.events.find((e) => e.id === eventId);
  if (!ev) return null;
  const t = matchTitle(ev.opponent, ev.homeAway);
  const r = await c.sb.rpc("scd_staff_ensure_match", {
    p_organization_id: c.orgId,
    p_team_code: teamCodeForGroup(ev.group),
    p_source_record_id: ev.id,
    p_date: ev.date,
    p_time: ev.time,
    p_title: t.title,
    p_home_team: t.home,
    p_away_team: t.away,
    p_venue: ev.venue,
    p_competition: [ev.type, ev.category].filter(Boolean).join(" · "),
  });
  return !r.error && typeof r.data === "string" ? r.data : null;
}

/* ================================================================== Area partite (r117) */

export interface MatchStatus {
  eventId: string;
  callupsSent: number;
  callupsSeen: number;
  sheetStatus: string;
  tabellino: boolean;
  goalsFor: number | null;
  goalsAgainst: number | null;
  officialFor: number | null;
  officialAgainst: number | null;
  hasSummary: boolean;
  hasReferto: boolean;
  hasOpponentSheet: boolean;
}

type StatusRaw = {
  source_record_id: string; callups_sent: number; callups_seen: number; sheet_status: string; tabellino: boolean;
  goals_for: number | null; goals_against: number | null; official_goals_for: number | null; official_goals_against: number | null;
  has_summary: boolean; has_referto: boolean; has_opponent_sheet: boolean;
};
const mapStatus = (r: StatusRaw): MatchStatus => ({
  eventId: r.source_record_id,
  callupsSent: r.callups_sent,
  callupsSeen: r.callups_seen,
  sheetStatus: r.sheet_status,
  tabellino: r.tabellino,
  goalsFor: r.goals_for,
  goalsAgainst: r.goals_against,
  officialFor: r.official_goals_for,
  officialAgainst: r.official_goals_against,
  hasSummary: r.has_summary,
  hasReferto: r.has_referto,
  hasOpponentSheet: r.has_opponent_sheet,
});

async function readStatuses(c: Ctx, eventIds: readonly string[]): Promise<MatchStatus[] | null> {
  const { data, error } = await c.sb.rpc("scd_staff_match_status", { p_organization_id: c.orgId, p_source_record_ids: [...eventIds] });
  if (error) return null;
  return ((data ?? []) as StatusRaw[]).map(mapStatus);
}

export const getTeamMatchStatus = createServerFn({ method: "POST" })
  .inputValidator((d: { eventIds: string[] }) => z.object({ eventIds: z.array(EventId).max(400) }).parse(d))
  .handler(async ({ data }): Promise<{ state: "ok" | "not-live" | "signed-out" | "error"; rows: MatchStatus[] }> => {
    if (!AREA_PARTITE_LIVE) return { state: "not-live", rows: [] };
    const c = await scope();
    if (!c) return { state: "signed-out", rows: [] };
    const rows = await readStatuses(c, data.eventIds);
    return rows ? { state: "ok", rows } : { state: "error", rows: [] };
  });

export interface MatchDocument {
  id: string;
  kind: DocKind;
  fileName: string;
  mime: string;
  size: number;
  createdAt: string;
}

export interface MatchArea {
  exists: boolean;
  matchId: string | null;
  played: boolean;
  callups: { sent: number; seen: number; impediments: number; pending: number };
  /** Staff-only list (inside the team staff names stay full, as in the roster). */
  impediments: Array<{ athleteId: string; displayName: string; code: ReasonCode | null; note: string | null }>;
  sheetStatus: string;
  tabellino: { goalsFor: number; goalsAgainst: number; recordedAt: string } | null;
  summary: string;
  opponentLineup: string;
  opponentScorers: string;
  official: { goalsFor: number; goalsAgainst: number; checkedAt: string | null } | null;
  documents: MatchDocument[];
}

const EMPTY_AREA: MatchArea = {
  exists: false, matchId: null, played: false, callups: { sent: 0, seen: 0, impediments: 0, pending: 0 }, impediments: [],
  sheetStatus: "NONE", tabellino: null, summary: "", opponentLineup: "", opponentScorers: "", official: null, documents: [],
};

export const getMatchArea = createServerFn({ method: "GET" })
  .inputValidator((d: { eventId: string }) => z.object({ eventId: EventId }).parse(d))
  .handler(async ({ data }): Promise<{ state: "ok" | "not-live" | "signed-out" | "forbidden" | "error"; area: MatchArea }> => {
    if (!AREA_PARTITE_LIVE) return { state: "not-live", area: EMPTY_AREA };
    const c = await scope();
    if (!c) return { state: "signed-out", area: EMPTY_AREA };
    const { data: raw, error } = await c.sb.rpc("scd_staff_match_area", { p_organization_id: c.orgId, p_source_record_id: data.eventId });
    if (error) return { state: error.code === "42501" ? "forbidden" : "error", area: EMPTY_AREA };
    const r = (raw ?? {}) as Record<string, any>;
    if (!r["exists"]) return { state: "ok", area: EMPTY_AREA };
    const rep = (r["report"] ?? {}) as Record<string, any>;
    const tab = r["tabellino"] as Record<string, any> | null;
    return {
      state: "ok",
      area: {
        exists: true,
        matchId: String(r["match_id"]),
        played: r["played"] === true,
        callups: { sent: Number(r["callups"]?.sent ?? 0), seen: Number(r["callups"]?.seen ?? 0), impediments: Number(r["callups"]?.impediments ?? 0), pending: Number(r["callups"]?.pending ?? 0) },
        impediments: ((r["impediments"] ?? []) as Array<Record<string, any>>).map((x) => ({
          athleteId: String(x["athlete_id"]),
          displayName: String(x["display_name"] ?? "").trim() || "Nome non indicato",
          code: asReason(x["code"]),
          note: typeof x["note"] === "string" ? x["note"] : null,
        })),
        sheetStatus: String(r["sheet_status"] ?? "NONE"),
        tabellino: tab ? { goalsFor: Number(tab["goals_for"]), goalsAgainst: Number(tab["goals_against"]), recordedAt: String(tab["recorded_at"]) } : null,
        summary: String(rep["summary"] ?? ""),
        opponentLineup: String(rep["opponent_lineup"] ?? ""),
        opponentScorers: String(rep["opponent_scorers"] ?? ""),
        official: typeof rep["official_goals_for"] === "number" ? { goalsFor: rep["official_goals_for"], goalsAgainst: Number(rep["official_goals_against"]), checkedAt: rep["official_checked_at"] ?? null } : null,
        documents: ((r["documents"] ?? []) as Array<Record<string, any>>).map((d) => ({
          id: String(d["id"]), kind: (DOC_KINDS as readonly string[]).includes(d["kind"]) ? d["kind"] : "ALTRO",
          fileName: String(d["file_name"] ?? "documento"), mime: String(d["mime"] ?? ""), size: Number(d["size"] ?? 0), createdAt: String(d["created_at"] ?? ""),
        })),
      },
    };
  });

const NotesInput = z.object({
  eventId: EventId,
  summary: z.string().max(2000).optional(),
  opponentLineup: z.string().max(1500).optional(),
  opponentScorers: z.string().max(600).optional(),
});

export const saveMatchNotes = createServerFn({ method: "POST" })
  .inputValidator((d: z.input<typeof NotesInput>) => NotesInput.parse(d))
  .handler(async ({ data }): Promise<Outcome> => {
    if (!AREA_PARTITE_LIVE) return NOT_LIVE;
    const c = await scope();
    if (!c) return SIGNED_OUT;
    const matchId = await ensureMatch(c, data.eventId);
    if (!matchId) return { ok: false, message: CODE_TEXT["forbidden"]! };
    const p: Record<string, string> = {};
    if (data.summary !== undefined) p["summary"] = data.summary;
    if (data.opponentLineup !== undefined) p["opponentLineup"] = data.opponentLineup;
    if (data.opponentScorers !== undefined) p["opponentScorers"] = data.opponentScorers;
    const { data: out, error } = await c.sb.rpc("scd_staff_save_match_notes", { p_organization_id: c.orgId, p_match_id: matchId, p });
    if (error) return { ok: false, message: "Salvataggio non riuscito, riprova." };
    const o = codeMessage(out);
    return o.ok ? { ok: true, message: "Salvato. Telefoni ed e-mail scritti nel testo vengono tolti." } : o;
  });

/** Multipart: file, eventId, kind. The file goes to scd-private <org>/match/<match>/, then it is registered. */
export const uploadMatchDocument = createServerFn({ method: "POST" })
  .inputValidator((d: FormData) => {
    if (!(d instanceof FormData)) throw new Error("form");
    const file = d.get("file");
    if (!(file instanceof File)) throw new Error("file");
    return { file, eventId: EventId.parse(d.get("eventId")), kind: z.enum(DOC_KINDS).parse(d.get("kind")) };
  })
  .handler(async ({ data }): Promise<Outcome> => {
    if (!AREA_PARTITE_LIVE) return NOT_LIVE;
    const c = await scope();
    if (!c) return SIGNED_OUT;
    const problems = documentProblems(data.file);
    if (problems.length) return { ok: false, message: problems.join(" ") };
    const matchId = await ensureMatch(c, data.eventId);
    if (!matchId) return { ok: false, message: CODE_TEXT["forbidden"]! };
    const path = `${c.orgId}/match/${matchId}/${storageName(data.file.name, Date.now())}`;
    const up = await c.sb.storage.from("scd-private").upload(path, data.file, { contentType: data.file.type, upsert: false });
    if (up.error) return { ok: false, message: "Caricamento non riuscito: solo lo staff della squadra, la Segreteria e la Direzione possono allegare documenti." };
    const { data: out, error } = await c.sb.rpc("scd_staff_register_match_document", {
      p_organization_id: c.orgId,
      p_match_id: matchId,
      p: { path, kind: data.kind, fileName: data.file.name.slice(0, 160), mime: data.file.type, size: data.file.size },
    });
    if (error) return { ok: false, message: "Documento caricato ma non registrato: avvisa la segreteria." };
    const o = codeMessage(out);
    return o.ok ? { ok: true, message: "Documento allegato. Lo vedono solo lo staff della squadra, la Segreteria e la Direzione." } : o;
  });

export const openMatchDocument = createServerFn({ method: "POST" })
  .inputValidator((d: { documentId: string }) => z.object({ documentId: Uuid }).parse(d))
  .handler(async ({ data }): Promise<{ url: string | null; message: string }> => {
    if (!AREA_PARTITE_LIVE) return { url: null, message: NOT_LIVE.message };
    const c = await scope();
    if (!c) return { url: null, message: SIGNED_OUT.message };
    const { data: path, error } = await c.sb.rpc("scd_staff_match_document_path", { p_organization_id: c.orgId, p_document_id: data.documentId });
    if (error || typeof path !== "string" || !path) return { url: null, message: CODE_TEXT["forbidden"]! };
    const signed = await c.sb.storage.from("scd-private").createSignedUrl(path, 120);
    if (signed.error || !signed.data?.signedUrl) return { url: null, message: "Apertura non riuscita, riprova." };
    return { url: signed.data.signedUrl, message: "" };
  });

export const removeMatchDocument = createServerFn({ method: "POST" })
  .inputValidator((d: { documentId: string }) => z.object({ documentId: Uuid }).parse(d))
  .handler(async ({ data }): Promise<Outcome> => {
    if (!AREA_PARTITE_LIVE) return NOT_LIVE;
    const c = await scope();
    if (!c) return SIGNED_OUT;
    const { data: out, error } = await c.sb.rpc("scd_staff_remove_match_document", { p_organization_id: c.orgId, p_document_id: data.documentId });
    if (error) return { ok: false, message: "Non riuscito, riprova." };
    const o = codeMessage(out);
    return o.ok ? { ok: true, message: "Documento tolto dall'elenco (resta nello storico della società)." } : o;
  });

const OfficialInput = z.object({
  eventId: EventId,
  goalsFor: z.number().int().min(0).max(30).nullable(),
  goalsAgainst: z.number().int().min(0).max(30).nullable(),
});

/** Segreteria / Direzione: official score read on the LND portal (null + null clears it). */
export const setOfficialResult = createServerFn({ method: "POST" })
  .inputValidator((d: z.input<typeof OfficialInput>) => OfficialInput.parse(d))
  .handler(async ({ data }): Promise<Outcome> => {
    if (!AREA_PARTITE_LIVE) return NOT_LIVE;
    const c = await scope();
    if (!c) return SIGNED_OUT;
    const area = await c.sb.rpc("scd_staff_match_area", { p_organization_id: c.orgId, p_source_record_id: data.eventId });
    const matchId = (area.data as { match_id?: string } | null)?.match_id;
    if (area.error || !matchId) return { ok: false, message: "Gara non ancora registrata dallo staff." };
    const { data: out, error } = await c.sb.rpc("scd_office_set_official_result", {
      p_organization_id: c.orgId, p_match_id: matchId, p_goals_for: data.goalsFor, p_goals_against: data.goalsAgainst,
    });
    if (error) return { ok: false, message: "Non riuscito, riprova." };
    const o = codeMessage(out, "Solo Segreteria e Direzione registrano il risultato ufficiale.");
    return o.ok ? { ok: true, message: "Risultato ufficiale registrato." } : { ok: false, message: o.message === CODE_TEXT["forbidden"] ? "Solo Segreteria e Direzione registrano il risultato ufficiale." : o.message };
  });

const ImpedimentInput = z.object({ callupId: Uuid, code: z.enum(REASON_CODES), note: z.string().max(REASON_NOTE_MAX) });

/** Family / athlete: impediment with a reason category. The call-up stays valid: the mister decides. */
export const reportImpediment = createServerFn({ method: "POST" })
  .inputValidator((d: z.input<typeof ImpedimentInput>) => ImpedimentInput.parse(d))
  .handler(async ({ data }): Promise<Outcome> => {
    if (!AREA_PARTITE_LIVE) return NOT_LIVE;
    const c = await scope();
    if (!c) return { ok: false, message: "Accedi per segnalare." };
    const { data: out, error } = await c.sb.rpc("scd_report_callup_impediment", {
      p_organization_id: c.orgId, p_callup_id: data.callupId, p_code: data.code, p_note: data.note.trim() || null,
    });
    if (error) return { ok: false, message: "Non salvato, riprova." };
    const o = codeMessage(out);
    return o.ok ? { ok: true, message: "Impedimento segnalato al mister: la convocazione resta valida, decide lui." } : o;
  });

/* ================================================================== Area allenamenti (r118) */

export interface TrainingSession {
  id: string;
  startsAt: string;
  duration: number;
  field: string;
  theme: string;
  coachNotes: string;
  sharedNote: string;
  meetingUrl: string;
  liveNote: string;
  status: "PLANNED" | "DONE" | "CANCELLED";
  recorded: number;
  present: number;
  absent: number;
  justified: number;
  notices: number;
}

const asSessionStatus = (v: unknown): TrainingSession["status"] => (v === "DONE" || v === "CANCELLED" ? v : "PLANNED");
const str = (v: unknown) => (typeof v === "string" ? v : "");

const ListInput = z.object({
  teamCode: z.string().regex(/^[a-z0-9-]{1,32}$/),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const getTrainings = createServerFn({ method: "GET" })
  .inputValidator((d: z.input<typeof ListInput>) => ListInput.parse(d))
  .handler(async ({ data }): Promise<{ state: "ok" | "not-live" | "signed-out" | "forbidden" | "error"; sessions: TrainingSession[] }> => {
    if (!AREA_ALLENAMENTI_LIVE) return { state: "not-live", sessions: [] };
    const c = await scope();
    if (!c) return { state: "signed-out", sessions: [] };
    const { data: raw, error } = await c.sb.rpc("scd_staff_training_list", { p_organization_id: c.orgId, p_team_code: data.teamCode, p_from: data.from, p_to: data.to });
    if (error) return { state: "error", sessions: [] };
    const r = (raw ?? {}) as { ok?: boolean; sessions?: Array<Record<string, unknown>> };
    if (!r.ok) return { state: "forbidden", sessions: [] };
    return {
      state: "ok",
      sessions: (r.sessions ?? []).map((s) => ({
        id: String(s["id"]), startsAt: String(s["starts_at"]), duration: Number(s["duration"] ?? 90), field: str(s["field"]), theme: str(s["theme"]),
        coachNotes: str(s["coach_notes"]), sharedNote: str(s["shared_note"]), meetingUrl: str(s["meeting_url"]), liveNote: str(s["live_note"]),
        status: asSessionStatus(s["status"]), recorded: Number(s["recorded"] ?? 0), present: Number(s["present"] ?? 0),
        absent: Number(s["absent"] ?? 0), justified: Number(s["justified"] ?? 0), notices: Number(s["notices"] ?? 0),
      })),
    };
  });

const SaveSessionInput = z.object({
  id: Uuid.optional(),
  teamCode: z.string().regex(/^[a-z0-9-]{1,32}$/),
  startsAt: z.string().datetime(),
  duration: z.number().int().min(15).max(240),
  field: z.string().max(80),
  theme: z.string().max(200),
  coachNotes: z.string().max(2000),
  sharedNote: z.string().max(1000),
  meetingUrl: z.string().max(80).refine((v) => v.trim() === "" || isMeetUrl(v), "meet"),
  liveNote: z.string().max(300),
  status: z.enum(["PLANNED", "DONE", "CANCELLED"]),
});

export const saveTraining = createServerFn({ method: "POST" })
  .inputValidator((d: z.input<typeof SaveSessionInput>) => SaveSessionInput.parse(d))
  .handler(async ({ data }): Promise<Outcome & { id?: string }> => {
    if (!AREA_ALLENAMENTI_LIVE) return NOT_LIVE;
    const c = await scope();
    if (!c) return SIGNED_OUT;
    const { id, meetingUrl, ...rest } = data;
    const p = { ...rest, meetingUrl: meetingUrl.trim(), ...(id ? { id } : {}) };
    const { data: out, error } = await c.sb.rpc("scd_staff_training_save", { p_organization_id: c.orgId, p });
    if (error) return { ok: false, message: "Salvataggio non riuscito, riprova." };
    const o = codeMessage(out);
    return o.ok ? { ok: true, message: "Allenamento salvato.", id: String((out as { id?: string }).id ?? "") } : o;
  });

export interface AttendanceRow {
  athleteId: string;
  displayName: string;
  birthYear: number | null;
  status: AttendanceStatus | null;
  reason: string;
  noticeCode: ReasonCode | null;
  noticeNote: string;
}

export const getAttendance = createServerFn({ method: "GET" })
  .inputValidator((d: { sessionId: string }) => z.object({ sessionId: Uuid }).parse(d))
  .handler(async ({ data }): Promise<{ state: "ok" | "not-live" | "signed-out" | "forbidden" | "error"; rows: AttendanceRow[] }> => {
    if (!AREA_ALLENAMENTI_LIVE) return { state: "not-live", rows: [] };
    const c = await scope();
    if (!c) return { state: "signed-out", rows: [] };
    const { data: raw, error } = await c.sb.rpc("scd_staff_training_attendance", { p_organization_id: c.orgId, p_session_id: data.sessionId });
    if (error) return { state: "error", rows: [] };
    const r = (raw ?? {}) as { ok?: boolean; rows?: Array<Record<string, unknown>> };
    if (!r.ok) return { state: "forbidden", rows: [] };
    return {
      state: "ok",
      rows: (r.rows ?? []).map((x) => ({
        athleteId: String(x["athlete_id"]),
        displayName: str(x["display_name"]).trim() || "Nome non indicato",
        birthYear: typeof x["birth_year"] === "number" ? x["birth_year"] : null,
        status: (ATTENDANCE as readonly unknown[]).includes(x["status"]) ? (x["status"] as AttendanceStatus) : null,
        reason: str(x["reason"]),
        noticeCode: asReason(x["notice_code"]),
        noticeNote: str(x["notice_note"]),
      })),
    };
  });

const RecordInput = z.object({
  sessionId: Uuid,
  rows: z.array(z.object({ athleteId: Uuid, status: z.enum(ATTENDANCE), reason: z.string().max(REASON_NOTE_MAX) })).min(1).max(60),
});

export const recordAttendance = createServerFn({ method: "POST" })
  .inputValidator((d: z.input<typeof RecordInput>) => RecordInput.parse(d))
  .handler(async ({ data }): Promise<Outcome> => {
    if (!AREA_ALLENAMENTI_LIVE) return NOT_LIVE;
    const c = await scope();
    if (!c) return SIGNED_OUT;
    const { data: out, error } = await c.sb.rpc("scd_staff_training_record", {
      p_organization_id: c.orgId, p_session_id: data.sessionId,
      p_rows: data.rows.map((r) => ({ athlete_id: r.athleteId, status: r.status, reason: r.reason.trim() || null })),
    });
    if (error) return { ok: false, message: "Presenze non salvate, riprova." };
    const o = codeMessage(out);
    return o.ok ? { ok: true, message: `Presenze salvate (${data.rows.length}).` } : o;
  });

export interface Drill {
  id: string;
  title: string;
  description: string;
  audience: DrillAudience;
  teamCode: string | null;
  hasImage: boolean;
  mine: boolean;
}

export const getDrills = createServerFn({ method: "GET" })
  .inputValidator((d: { teamCode: string }) => z.object({ teamCode: z.string().regex(/^[a-z0-9-]{1,32}$/) }).parse(d))
  .handler(async ({ data }): Promise<{ state: "ok" | "not-live" | "signed-out" | "forbidden" | "error"; drills: Drill[] }> => {
    if (!AREA_ALLENAMENTI_LIVE) return { state: "not-live", drills: [] };
    const c = await scope();
    if (!c) return { state: "signed-out", drills: [] };
    const { data: raw, error } = await c.sb.rpc("scd_staff_drills", { p_organization_id: c.orgId, p_team_code: data.teamCode });
    if (error) return { state: "error", drills: [] };
    const r = (raw ?? {}) as { ok?: boolean; drills?: Array<Record<string, unknown>> };
    if (!r.ok) return { state: "forbidden", drills: [] };
    return {
      state: "ok",
      drills: (r.drills ?? []).map((d) => ({
        id: String(d["id"]), title: str(d["title"]), description: str(d["description"]),
        audience: (DRILL_AUDIENCE as readonly unknown[]).includes(d["audience"]) ? (d["audience"] as DrillAudience) : "STAFF_SQUADRA",
        teamCode: typeof d["team_code"] === "string" ? d["team_code"] : null, hasImage: d["has_image"] === true, mine: d["mine"] === true,
      })),
    };
  });

/** Multipart: teamCode, title, description, audience, optional id, optional image file (staff-only). */
export const saveDrill = createServerFn({ method: "POST" })
  .inputValidator((d: FormData) => {
    if (!(d instanceof FormData)) throw new Error("form");
    const file = d.get("image");
    const id = d.get("id");
    return {
      id: typeof id === "string" && id ? Uuid.parse(id) : undefined,
      teamCode: z.string().regex(/^[a-z0-9-]{1,32}$/).parse(d.get("teamCode")),
      title: z.string().trim().min(3).max(120).parse(d.get("title")),
      description: z.string().max(3000).parse(d.get("description") ?? ""),
      audience: z.enum(DRILL_AUDIENCE).parse(d.get("audience")),
      image: file instanceof File && file.size > 0 ? file : null,
    };
  })
  .handler(async ({ data }): Promise<Outcome> => {
    if (!AREA_ALLENAMENTI_LIVE) return NOT_LIVE;
    const c = await scope();
    if (!c) return SIGNED_OUT;
    let imagePath: string | undefined;
    if (data.image) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(data.image.type) || data.image.size > 8 * 1024 * 1024) {
        return { ok: false, message: "Immagine: JPG, PNG o WEBP fino a 8 MB." };
      }
      const teamId = await teamIdOf(c, data.teamCode);
      if (!teamId) return { ok: false, message: CODE_TEXT["forbidden"]! };
      imagePath = `${c.orgId}/drill/${teamId}/${storageName(data.image.name, Date.now())}`;
      const up = await c.sb.storage.from("scd-private").upload(imagePath, data.image, { contentType: data.image.type, upsert: false });
      if (up.error) return { ok: false, message: "Immagine non caricata: riprova." };
    }
    const p = {
      ...(data.id ? { id: data.id } : {}),
      teamCode: data.teamCode, title: data.title, description: data.description, audience: data.audience,
      ...(imagePath ? { imagePath } : {}),
    };
    const { data: out, error } = await c.sb.rpc("scd_staff_drill_save", { p_organization_id: c.orgId, p });
    if (error) return { ok: false, message: "Salvataggio non riuscito, riprova." };
    const o = codeMessage(out);
    return o.ok ? { ok: true, message: data.audience === "SQUADRA" ? "Dinamica salvata e condivisa con la squadra (solo testo)." : "Dinamica salvata." } : o;
  });

/** Team id from the training list function (team scope checked by the database). */
async function teamIdOf(c: Ctx, teamCode: string): Promise<string | null> {
  const today = new Date().toISOString().slice(0, 10);
  const r = await c.sb.rpc("scd_staff_training_list", { p_organization_id: c.orgId, p_team_code: teamCode, p_from: today, p_to: today });
  const out = r.data as { ok?: boolean; team_id?: string } | null;
  return !r.error && out?.ok && typeof out.team_id === "string" ? out.team_id : null;
}

export const archiveDrill = createServerFn({ method: "POST" })
  .inputValidator((d: { drillId: string }) => z.object({ drillId: Uuid }).parse(d))
  .handler(async ({ data }): Promise<Outcome> => {
    if (!AREA_ALLENAMENTI_LIVE) return NOT_LIVE;
    const c = await scope();
    if (!c) return SIGNED_OUT;
    const { data: out, error } = await c.sb.rpc("scd_staff_drill_archive", { p_organization_id: c.orgId, p_drill_id: data.drillId });
    if (error) return { ok: false, message: "Non riuscito, riprova." };
    const o = codeMessage(out, "Può archiviarla solo chi l'ha scritta, la Segreteria o la Direzione.");
    return o.ok ? { ok: true, message: "Dinamica archiviata." } : o;
  });

export const openDrillImage = createServerFn({ method: "POST" })
  .inputValidator((d: { drillId: string }) => z.object({ drillId: Uuid }).parse(d))
  .handler(async ({ data }): Promise<{ url: string | null; message: string }> => {
    if (!AREA_ALLENAMENTI_LIVE) return { url: null, message: NOT_LIVE.message };
    const c = await scope();
    if (!c) return { url: null, message: SIGNED_OUT.message };
    const { data: path, error } = await c.sb.rpc("scd_staff_drill_image_path", { p_organization_id: c.orgId, p_drill_id: data.drillId });
    if (error || typeof path !== "string" || !path) return { url: null, message: CODE_TEXT["forbidden"]! };
    const signed = await c.sb.storage.from("scd-private").createSignedUrl(path, 120);
    return signed.error || !signed.data?.signedUrl ? { url: null, message: "Apertura non riuscita, riprova." } : { url: signed.data.signedUrl, message: "" };
  });

/* ------------------------------------------------------------------ athletes and families */

export interface MyTrainingPerson {
  personId: string;
  /** First name + surname initial, also on the family page (the page may be shown to others). */
  displayName: string;
  teamCode: string;
  sessions: Array<{
    id: string; startsAt: string; duration: number; field: string; theme: string; sharedNote: string;
    meetingUrl: string; liveNote: string; status: TrainingSession["status"]; myStatus: AttendanceStatus | null; myNotice: ReasonCode | null;
  }>;
  season: { recorded: number; present: number; absent: number; justified: number };
}

export const getMyTrainings = createServerFn({ method: "GET" })
  .inputValidator((d: { from: string; to: string }) => z.object({ from: ListInput.shape.from, to: ListInput.shape.to }).parse(d))
  .handler(async ({ data }): Promise<{ state: "ok" | "not-live" | "signed-out" | "error"; people: MyTrainingPerson[]; drills: Array<{ id: string; title: string; description: string; teamCode: string }> }> => {
    if (!AREA_ALLENAMENTI_LIVE) return { state: "not-live", people: [], drills: [] };
    const c = await scope();
    if (!c) return { state: "signed-out", people: [], drills: [] };
    const [t, d] = await Promise.all([
      c.sb.rpc("scd_my_trainings", { p_organization_id: c.orgId, p_from: data.from, p_to: data.to }),
      c.sb.rpc("scd_my_team_drills", { p_organization_id: c.orgId }),
    ]);
    if (t.error) return { state: "error", people: [], drills: [] };
    const people = ((t.data ?? []) as Array<Record<string, any>>).map((p) => ({
      personId: String(p["person_id"]),
      displayName: shortName(str(p["display_name"])) || "Nome non indicato",
      teamCode: str(p["team_code"]),
      sessions: ((p["sessions"] ?? []) as Array<Record<string, unknown>>).map((s) => ({
        id: String(s["id"]), startsAt: String(s["starts_at"]), duration: Number(s["duration"] ?? 90), field: str(s["field"]), theme: str(s["theme"]),
        sharedNote: str(s["shared_note"]), meetingUrl: str(s["meeting_url"]), liveNote: str(s["live_note"]), status: asSessionStatus(s["status"]),
        myStatus: (ATTENDANCE as readonly unknown[]).includes(s["my_status"]) ? (s["my_status"] as AttendanceStatus) : null,
        myNotice: asReason(s["my_notice"]),
      })),
      season: {
        recorded: Number(p["season"]?.recorded ?? 0), present: Number(p["season"]?.present ?? 0),
        absent: Number(p["season"]?.absent ?? 0), justified: Number(p["season"]?.justified ?? 0),
      },
    }));
    const drills = d.error ? [] : ((d.data ?? []) as Array<Record<string, unknown>>).map((x) => ({ id: String(x["id"]), title: str(x["title"]), description: str(x["description"]), teamCode: str(x["team_code"]) }));
    return { state: "ok", people, drills };
  });

const NoticeInput = z.object({ sessionId: Uuid, personId: Uuid, code: z.enum(REASON_CODES).nullable(), note: z.string().max(REASON_NOTE_MAX) });

export const sendTrainingNotice = createServerFn({ method: "POST" })
  .inputValidator((d: z.input<typeof NoticeInput>) => NoticeInput.parse(d))
  .handler(async ({ data }): Promise<Outcome> => {
    if (!AREA_ALLENAMENTI_LIVE) return NOT_LIVE;
    const c = await scope();
    if (!c) return { ok: false, message: "Accedi per avvisare." };
    const { data: out, error } = await c.sb.rpc("scd_my_training_notice", {
      p_organization_id: c.orgId, p_session_id: data.sessionId, p_person_id: data.personId, p_code: data.code, p_note: data.note.trim() || null,
    });
    if (error) return { ok: false, message: "Non salvato, riprova." };
    const o = codeMessage(out);
    return o.ok ? { ok: true, message: data.code ? "Assenza avvisata: il mister la vede." : "Avviso tolto." } : o;
  });

/* ------------------------------------------------------------------ monthly requests */

export interface GapRequest {
  id: string;
  teamCode: string;
  month: string;
  kind: string;
  ref: string;
  label: string;
  status: "OPEN" | "INTEGRATED" | "JUSTIFIED" | "CLOSED";
  answerNote: string;
}

const asGapStatus = (v: unknown): GapRequest["status"] => (v === "INTEGRATED" || v === "JUSTIFIED" || v === "CLOSED" ? v : "OPEN");
const mapGap = (g: Record<string, unknown>): GapRequest => ({
  id: String(g["id"]), teamCode: str(g["team_code"]), month: str(g["month"]), kind: str(g["kind"]), ref: str(g["ref"]),
  label: str(g["label"]), status: asGapStatus(g["status"]), answerNote: str(g["answer_note"]),
});

/** Team staff: open requests of their teams. */
export const getMyGapRequests = createServerFn({ method: "GET" }).handler(async (): Promise<{ state: "ok" | "not-live" | "signed-out" | "error"; rows: GapRequest[] }> => {
  if (!AREA_ALLENAMENTI_LIVE || !AREA_PARTITE_LIVE) return { state: "not-live", rows: [] };
  const c = await scope();
  if (!c) return { state: "signed-out", rows: [] };
  const { data, error } = await c.sb.rpc("scd_staff_gap_requests", { p_organization_id: c.orgId });
  if (error) return { state: "error", rows: [] };
  return { state: "ok", rows: ((data ?? []) as Array<Record<string, unknown>>).map(mapGap) };
});

const AnswerInput = z.object({ requestId: Uuid, status: z.enum(["INTEGRATED", "JUSTIFIED", "CLOSED"]), note: z.string().max(300) });

export const answerGapRequest = createServerFn({ method: "POST" })
  .inputValidator((d: z.input<typeof AnswerInput>) => AnswerInput.parse(d))
  .handler(async ({ data }): Promise<Outcome> => {
    if (!AREA_ALLENAMENTI_LIVE || !AREA_PARTITE_LIVE) return NOT_LIVE;
    const c = await scope();
    if (!c) return SIGNED_OUT;
    const { data: out, error } = await c.sb.rpc("scd_staff_answer_gap_request", { p_organization_id: c.orgId, p_request_id: data.requestId, p_status: data.status, p_note: data.note.trim() || null });
    if (error) return { ok: false, message: "Non riuscito, riprova." };
    const o = codeMessage(out, "Per giustificare scrivi il motivo (almeno 3 caratteri).");
    return o.ok ? { ok: true, message: data.status === "JUSTIFIED" ? "Giustificazione inviata alla Segreteria." : data.status === "CLOSED" ? "Richiesta chiusa." : "Segnato come integrato." } : o;
  });

export interface MonthlyCheck {
  state: "ok" | "not-live" | "signed-out" | "forbidden" | "error";
  month: string;
  gaps: TeamGaps[];
  requests: GapRequest[];
  calendarCopy: string;
}

/** Segreteria: compute what is missing for one month. Reads only; writes nothing. */
async function computeMonth(c: Ctx, month: string): Promise<Omit<MonthlyCheck, "requests"> | null> {
  const { getCalendar } = await import("./calendar-bridge.server");
  const cal = await getCalendar();
  const inMonth = cal.events.filter((e) => e.date.startsWith(`${month}-`));
  const [statuses, sessions] = await Promise.all([
    readStatuses(c, inMonth.map((e) => e.id).slice(0, 400)),
    c.sb.rpc("scd_office_training_month", { p_organization_id: c.orgId, p_month: monthStart(month) }),
  ]);
  const s = sessions.data as { ok?: boolean; sessions?: Array<Record<string, unknown>> } | null;
  if (!statuses || sessions.error) return null;
  if (!s?.ok) return { state: "forbidden", month, gaps: [], calendarCopy: cal.sourceModifiedAt };
  const labelOf = new Map(cal.groups.map((g) => [teamCodeForGroup(g.id), teamTag(g)]));
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const statusRows: MatchStatusRow[] = statuses.map((x) => ({ sourceRecordId: x.eventId, callupsSent: x.callupsSent, sheetStatus: x.sheetStatus, tabellino: x.tabellino, hasSummary: x.hasSummary, hasReferto: x.hasReferto }));
  const sessionRows: SessionRow[] = (s.sessions ?? []).map((x) => ({ id: String(x["id"]), teamCode: str(x["team_code"]), startsAt: String(x["starts_at"]), status: str(x["status"]), recorded: Number(x["recorded"] ?? 0) }));
  const gaps = monthlyGaps({ month, today, matches: inMonth, statuses: statusRows, sessions: sessionRows, teamCodeOf: teamCodeForGroup, teamLabel: (code) => labelOf.get(code) ?? code.toUpperCase() });
  return { state: "ok", month, gaps, calendarCopy: cal.sourceModifiedAt };
}

const MonthInput = z.object({ month: z.string().refine(isMonth, "month") });

export const getMonthlyCheck = createServerFn({ method: "GET" })
  .inputValidator((d: z.input<typeof MonthInput>) => MonthInput.parse(d))
  .handler(async ({ data }): Promise<MonthlyCheck> => {
    const empty: MonthlyCheck = { state: "not-live", month: data.month, gaps: [], requests: [], calendarCopy: "" };
    if (!AREA_ALLENAMENTI_LIVE || !AREA_PARTITE_LIVE) return empty;
    const c = await scope();
    if (!c) return { ...empty, state: "signed-out" };
    const m = await computeMonth(c, data.month);
    if (!m) return { ...empty, state: "error" };
    if (m.state !== "ok") return { ...empty, ...m };
    const r = await c.sb.rpc("scd_office_gap_requests", { p_organization_id: c.orgId, p_month: monthStart(data.month) });
    return { ...m, requests: r.error || !Array.isArray(r.data) ? [] : (r.data as Array<Record<string, unknown>>).map(mapGap) };
  });

/** Segreteria presses «Crea le richieste»: the server recomputes the month (the browser sends only the month). */
export const createMonthlyRequests = createServerFn({ method: "POST" })
  .inputValidator((d: z.input<typeof MonthInput>) => MonthInput.parse(d))
  .handler(async ({ data }): Promise<Outcome & { created?: number }> => {
    if (!AREA_ALLENAMENTI_LIVE || !AREA_PARTITE_LIVE) return NOT_LIVE;
    const c = await scope();
    if (!c) return SIGNED_OUT;
    const m = await computeMonth(c, data.month);
    if (!m || m.state !== "ok") return { ok: false, message: "Solo Segreteria e Direzione creano le richieste mensili." };
    const items = gapRequestItems(m.gaps).slice(0, 500);
    if (!items.length) return { ok: true, message: "Niente da chiedere: il mese è completo.", created: 0 };
    const { data: out, error } = await c.sb.rpc("scd_office_create_gap_requests", { p_organization_id: c.orgId, p_month: monthStart(data.month), p_items: items });
    if (error) return { ok: false, message: "Richieste non create, riprova." };
    const o = codeMessage(out);
    if (!o.ok) return o;
    const n = Number((out as { created?: number }).created ?? 0);
    return { ok: true, created: n, message: n === 0 ? "Le richieste di questo mese c'erano già." : `${n} richieste create: le squadre le vedono nella loro area e la Segreteria nel riepilogo.` };
  });
