/**
 * Pulmini · richieste delle famiglie on the server (r84). Families read and write only through the database
 * functions that check the family circle (scd_my_family); the office reads and decides through functions that check
 * Direzione / Segreteria / responsabile trasporti. Nothing here trusts the browser for permissions.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { sessionView } from "./auth.functions";
import { serverSupabase } from "./supabase.server";
import { DIRECTIONS, parseMyRequests, parseOfficeRequests, parseStops, requestError, type MyRequest, type OfficeRequest, type StopOption } from "./transport-requests";

async function context() {
  const s = await sessionView();
  const org = s.memberships[0] ?? null;
  return { org, sb: s.configured && s.user ? serverSupabase() : null };
}

function romeDate(offsetDays: number): string {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

export interface FamilyTransport { requests: MyRequest[]; stops: StopOption[] }

export const getFamilyTransport = createServerFn({ method: "GET" }).handler(async (): Promise<FamilyTransport> => {
  const { org, sb } = await context();
  if (!sb || !org) return { requests: [], stops: [] };
  const [mine, stops] = await Promise.all([
    sb.rpc("scd_my_transport_requests", { p_organization_id: org.organizationId }),
    sb.rpc("scd_transport_stop_options", { p_organization_id: org.organizationId }),
  ]);
  return { requests: mine.error ? [] : parseMyRequests(mine.data), stops: stops.error ? [] : parseStops(stops.data) };
});

const requestSchema = z.object({
  personId: z.string().uuid(),
  eventId: z.string().min(3).max(120),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  teamCode: z.string().min(2).max(30),
  event: z.string().max(160).optional(),
  direction: z.enum(DIRECTIONS),
  stopId: z.string().uuid().nullable(),
  note: z.string().trim().max(200).optional(),
});

export interface RequestOutcome { ok: boolean; message: string; id?: string }

export const requestTransport = createServerFn({ method: "POST" })
  .inputValidator((d: z.input<typeof requestSchema>) => requestSchema.parse(d))
  .handler(async ({ data }): Promise<RequestOutcome> => {
    const { org, sb } = await context();
    if (!sb || !org) return { ok: false, message: "Entra con il tuo account per chiedere il pulmino." };
    const { data: out, error } = await sb.rpc("scd_request_transport", { p_organization_id: org.organizationId, p_payload: data });
    if (error) return { ok: false, message: requestError(null) };
    const r = (out ?? {}) as { ok?: boolean; code?: string; id?: string };
    if (!r.ok) return { ok: false, message: requestError(r.code) };
    return { ok: true, message: "Richiesta inviata al responsabile trasporti: qui vedi la risposta.", ...(r.id ? { id: r.id } : {}) };
  });

export const cancelTransportRequest = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }): Promise<RequestOutcome> => {
    const { org, sb } = await context();
    if (!sb || !org) return { ok: false, message: "Accesso non valido." };
    const { data: out, error } = await sb.rpc("scd_cancel_transport_request", { p_organization_id: org.organizationId, p_request_id: data.id });
    if (error) return { ok: false, message: requestError(null) };
    const r = (out ?? {}) as { ok?: boolean; code?: string };
    return r.ok ? { ok: true, message: "Richiesta annullata." } : { ok: false, message: requestError(r.code) };
  });

export const getTransportRequests = createServerFn({ method: "GET" }).handler(async (): Promise<OfficeRequest[] | null> => {
  const { org, sb } = await context();
  if (!sb || !org) return null;
  const { data, error } = await sb.rpc("scd_transport_requests_board", { p_organization_id: org.organizationId, p_from: romeDate(-1), p_to: romeDate(45) });
  if (error) return null;
  return parseOfficeRequests(data);
});

const decideSchema = z.object({
  id: z.string().uuid(),
  decision: z.enum(["CONFERMATA", "NON_POSSIBILE"]),
  note: z.string().trim().max(200).optional(),
});

export const decideTransportRequest = createServerFn({ method: "POST" })
  .inputValidator((d: z.input<typeof decideSchema>) => decideSchema.parse(d))
  .handler(async ({ data }): Promise<RequestOutcome> => {
    const { org, sb } = await context();
    if (!sb || !org) return { ok: false, message: "Accesso non valido." };
    const { data: out, error } = await sb.rpc("scd_decide_transport_request", {
      p_organization_id: org.organizationId, p_request_id: data.id, p_decision: data.decision, p_note: data.note ?? null,
    });
    if (error) return { ok: false, message: requestError(null) };
    const r = (out ?? {}) as { ok?: boolean; code?: string };
    if (!r.ok) return { ok: false, message: requestError(r.code) };
    return { ok: true, message: data.decision === "CONFERMATA" ? "Posto confermato: la famiglia lo vede nella sua area." : "Risposta inviata alla famiglia." };
  });
