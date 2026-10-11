/**
 * Call-ups on the server (UD-062, r62). Every call runs with the caller's own Supabase session;
 * the database functions decide who may send (team staff) and who may answer (athlete or guardian).
 * The match details come from the official calendar on the server, never from the browser.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { sessionView } from "./auth.functions";
import { asOutcome, asResponse, matchTitle, meetingAtLiteral, validateCallupInput, type CallupResponse, type SendOutcome } from "./callups";
import { deliveryNote } from "./push";
import { notifyCallups } from "./push.server";
import { teamCodeForGroup } from "./roster";
import { serverSupabase } from "./supabase.server";

export interface TeamCallup {
  callupId: string;
  athleteId: string;
  displayName: string;
  response: CallupResponse;
  meetingAt: string | null;
  meetingPlace: string | null;
  kitNote: string | null;
}

export interface MyCallup {
  callupId: string;
  personId: string;
  displayName: string;
  relationship: string;
  teamCode: string | null;
  title: string;
  startsAt: string;
  timeKnown: boolean;
  venue: string | null;
  meetingAt: string | null;
  meetingPlace: string | null;
  kitNote: string | null;
  response: CallupResponse;
}

export interface SendResult {
  ok: boolean;
  message: string;
  outcomes: Array<{ athleteId: string; outcome: SendOutcome }>;
}

async function scope() {
  const s = await sessionView();
  const org = s.configured && s.user ? (s.memberships[0] ?? null) : null;
  const sb = org ? serverSupabase() : null;
  return org && sb ? { org, sb } : null;
}

export const getEventCallups = createServerFn({ method: "GET" })
  .inputValidator((d: { eventId: string }) => z.object({ eventId: z.string().min(3).max(120) }).parse(d))
  .handler(async ({ data }): Promise<TeamCallup[]> => {
    const c = await scope();
    if (!c) return [];
    const { data: rows, error } = await c.sb.rpc("scd_team_event_callups", { p_organization_id: c.org.organizationId, p_source_record_id: data.eventId });
    if (error) return [];
    return ((rows ?? []) as Array<{ callup_id: string; athlete_id: string; display_name: string; response_status: string; meeting_at: string | null; meeting_place: string | null; kit_note: string | null }>).map((r) => ({
      callupId: r.callup_id,
      athleteId: r.athlete_id,
      displayName: r.display_name.trim() || "Nome non indicato",
      response: asResponse(r.response_status),
      meetingAt: r.meeting_at,
      meetingPlace: r.meeting_place,
      kitNote: r.kit_note,
    }));
  });

const SendInput = z.object({
  eventId: z.string().min(3).max(120),
  athleteIds: z.array(z.string().uuid()).min(1).max(40),
  meetingTime: z.string().max(5),
  meetingPlace: z.string().max(160),
  kitNote: z.string().max(300),
});

export const sendCallups = createServerFn({ method: "POST" })
  .inputValidator((d: z.input<typeof SendInput>) => SendInput.parse(d))
  .handler(async ({ data }): Promise<SendResult> => {
    const c = await scope();
    if (!c) return { ok: false, message: "Accedi per convocare.", outcomes: [] };
    const { getCalendar } = await import("./calendar-bridge.server");
    const cal = await getCalendar();
    const ev = cal.events.find((e) => e.id === data.eventId);
    if (!ev) return { ok: false, message: "Gara non trovata nel calendario ufficiale.", outcomes: [] };
    const errors = validateCallupInput({ date: ev.date, meetingTime: data.meetingTime, meetingPlace: data.meetingPlace, kitNote: data.kitNote, athleteIds: data.athleteIds });
    if (errors.length) return { ok: false, message: errors.join(" "), outcomes: [] };

    const t = matchTitle(ev.opponent, ev.homeAway);
    const ensured = await c.sb.rpc("scd_staff_ensure_match", {
      p_organization_id: c.org.organizationId,
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
    if (ensured.error || typeof ensured.data !== "string") {
      return { ok: false, message: ensured.error?.code === "42501" ? "Puoi convocare solo per le tue squadre." : "Gara non registrata, riprova.", outcomes: [] };
    }
    const sent = await c.sb.rpc("scd_staff_send_callups", {
      p_organization_id: c.org.organizationId,
      p_match_id: ensured.data,
      p_athlete_ids: data.athleteIds,
      p_meeting_at: meetingAtLiteral(ev.date, data.meetingTime),
      p_meeting_place: data.meetingPlace.trim() || null,
      p_kit_note: data.kitNote.trim() || null,
    });
    if (sent.error) return { ok: false, message: sent.error.message.includes("already played") ? "La gara è già stata giocata." : "Convocazione non inviata, riprova.", outcomes: [] };
    const outcomes = ((sent.data ?? []) as Array<{ athlete_id: string; outcome: string }>).map((r) => ({ athleteId: r.athlete_id, outcome: asOutcome(r.outcome) }));
    const n = outcomes.filter((o) => o.outcome === "SENT").length;
    if (n === 0) return { ok: false, message: "Nessun convocato: controlla certificati e tesseramenti.", outcomes };
    const delivery = await notifyCallups(c.sb, ensured.data);
    return { ok: true, message: `${n} convocati.${deliveryNote(delivery)}`, outcomes };
  });

const WithdrawInput = z.object({ callupIds: z.array(z.string().uuid()).min(1).max(40) });

/** The mister takes athletes out of a call-up already sent (r68): marked withdrawn, never removed. */
export const withdrawCallups = createServerFn({ method: "POST" })
  .inputValidator((d: z.input<typeof WithdrawInput>) => WithdrawInput.parse(d))
  .handler(async ({ data }): Promise<{ ok: boolean; message: string; count: number }> => {
    const c = await scope();
    if (!c) return { ok: false, message: "Accedi per modificare la convocazione.", count: 0 };
    const { data: n, error } = await c.sb.rpc("scd_staff_withdraw_callups", { p_organization_id: c.org.organizationId, p_callup_ids: data.callupIds });
    if (error) return { ok: false, message: error.code === "42501" ? "Puoi togliere solo convocati delle tue squadre, prima dell'inizio della gara." : "Modifica non riuscita, riprova.", count: 0 };
    const count = typeof n === "number" ? n : 0;
    return { ok: true, message: count === 1 ? "1 tolto dalla convocazione." : `${count} tolti dalla convocazione.`, count };
  });

export const getMyCallups = createServerFn({ method: "GET" }).handler(async (): Promise<MyCallup[]> => {
  const c = await scope();
  if (!c) return [];
  const { data, error } = await c.sb.rpc("scd_my_callups", { p_organization_id: c.org.organizationId });
  if (error) return [];
  return ((data ?? []) as Array<{
    callup_id: string; person_id: string; display_name: string; relationship: string; team_code: string | null; title: string;
    starts_at: string; time_known: boolean; venue: string | null; meeting_at: string | null; meeting_place: string | null; kit_note: string | null; response_status: string;
  }>).map((r) => ({
    callupId: r.callup_id,
    personId: r.person_id,
    displayName: r.display_name.trim() || "Nome non indicato",
    relationship: r.relationship,
    teamCode: r.team_code,
    title: r.title,
    startsAt: r.starts_at,
    timeKnown: r.time_known,
    venue: r.venue,
    meetingAt: r.meeting_at,
    meetingPlace: r.meeting_place,
    kitNote: r.kit_note,
    response: asResponse(r.response_status),
  }));
});

export const respondCallup = createServerFn({ method: "POST" })
  .inputValidator((d: { callupId: string; response: "CONFIRMED" | "DECLINED" }) =>
    z.object({ callupId: z.string().uuid(), response: z.enum(["CONFIRMED", "DECLINED"]) }).parse(d))
  .handler(async ({ data }): Promise<{ ok: boolean; message: string }> => {
    const c = await scope();
    if (!c) return { ok: false, message: "Accedi per rispondere." };
    const { error } = await c.sb.rpc("scd_respond_callup", { p_organization_id: c.org.organizationId, p_callup_id: data.callupId, p_response: data.response });
    if (error) return { ok: false, message: error.message.includes("already started") ? "La gara è già iniziata." : "Risposta non salvata, riprova." };
    return { ok: true, message: data.response === "CONFIRMED" ? "Risposta inviata: ci sarò." : "Risposta inviata: non ci sarò." };
  });
