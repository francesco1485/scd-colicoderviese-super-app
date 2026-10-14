/**
 * Club House requests and dish polls on the server (UD-114). Families and adult members read and write only through
 * the database functions of the staged migration r103 (supabase/migrations/20261014_r103_area_requests.sql, NOT
 * APPLIED), called with the caller's own session (publishable key + cookies): the database checks membership and
 * office roles, nothing here trusts the browser for permissions. Until r103 is applied every call answers "off" and
 * the UI fails closed (no fake "sent", no votes).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { gennyEligible } from "./assistant";
import {
  CONTACT_PREFS,
  OCCASIONS,
  areaRequestError,
  orderRequestMessage,
  parseAreaPolls,
  parseBoardAreaRequests,
  parseMyAreaRequests,
  validateOrderRequest,
  type AreaPoll,
  type BoardAreaRequest,
  type MyAreaRequest,
} from "./area-requests";
import { sessionView } from "./auth.functions";
import { romeDay } from "./era-nutrition-tips";
import { serverSupabase } from "./supabase.server";

async function context() {
  const s = await sessionView();
  const org = s.memberships[0] ?? null;
  return { s, org, sb: s.configured && s.user ? serverSupabase() : null };
}

export type ClubHouseDesk =
  | { state: "signed-out" }
  /** Viewer known not to be an adult member or a family account: orders are not offered. */
  | { state: "not-allowed" }
  /** r103 not applied (or the database refused): fail closed. */
  | { state: "off" }
  | { state: "ok"; requests: MyAreaRequest[]; polls: AreaPoll[] };

export const getClubHouseDesk = createServerFn({ method: "GET" }).handler(async (): Promise<ClubHouseDesk> => {
  const { s, org, sb } = await context();
  if (!s.user) return { state: "signed-out" };
  if (!gennyEligible({ roles: s.roles, age15plus: null })) return { state: "not-allowed" };
  if (!sb || !org) return { state: "off" };
  const [mine, polls] = await Promise.all([
    sb.rpc("scd_my_area_requests", { p_organization_id: org.organizationId, p_area: "club-house" }),
    sb.rpc("scd_area_open_polls", { p_organization_id: org.organizationId, p_area: "club-house" }),
  ]);
  if (mine.error || polls.error) return { state: "off" };
  return { state: "ok", requests: parseMyAreaRequests(mine.data), polls: parseAreaPolls(polls.data) };
});

const orderSchema = z.object({
  what: z.string().max(400),
  when: z.string().max(10),
  time: z.string().max(5).optional(),
  people: z.union([z.number(), z.string().max(6)]),
  contact: z.enum(CONTACT_PREFS),
  occasion: z.enum(OCCASIONS),
});

export interface OrderOutcome {
  ok: boolean;
  message: string;
  /** True when the requests store is not active: the UI shows `copyText` to send to the secretariat. */
  off?: boolean;
  copyText?: string;
  errors?: Partial<Record<string, string>>;
}

export const submitClubHouseOrder = createServerFn({ method: "POST" })
  .inputValidator((d: z.input<typeof orderSchema>) => orderSchema.parse(d))
  .handler(async ({ data }): Promise<OrderOutcome> => {
    const v = validateOrderRequest(data, romeDay());
    if (!v.ok) return { ok: false, message: "Controlla i campi evidenziati.", errors: v.errors };
    const { s, org, sb } = await context();
    if (!s.user) return { ok: false, message: "Entra con il tuo account per mandare la richiesta." };
    if (!gennyEligible({ roles: s.roles, age15plus: null })) return { ok: false, message: areaRequestError("forbidden") };
    const copyText = orderRequestMessage(v.value);
    if (!sb || !org) return { ok: false, off: true, copyText, message: "Le richieste in app non sono ancora attive: copia il messaggio e mandalo alla segreteria." };
    const { data: out, error } = await sb.rpc("scd_area_request_create", {
      p_organization_id: org.organizationId,
      p_area: "club-house",
      p_kind: "ORDINE_FESTA",
      p_payload: v.value,
    });
    if (error) return { ok: false, off: true, copyText, message: "Le richieste in app non sono ancora attive: copia il messaggio e mandalo alla segreteria." };
    const r = (out ?? {}) as { ok?: boolean; code?: string };
    if (!r.ok) return { ok: false, message: areaRequestError(r.code) };
    return { ok: true, message: "Richiesta inviata alla Club House: una persona la conferma e qui vedi la risposta. Si paga alla cassa, mai in app." };
  });

export interface VoteOutcome {
  ok: boolean;
  message: string;
}

export const voteAreaPoll = createServerFn({ method: "POST" })
  .inputValidator((d: { pollId: string; option: string }) => z.object({ pollId: z.string().uuid(), option: z.string().min(1).max(40) }).parse(d))
  .handler(async ({ data }): Promise<VoteOutcome> => {
    const { s, org, sb } = await context();
    if (!s.user || !sb || !org) return { ok: false, message: "Entra con il tuo account per votare." };
    const { data: out, error } = await sb.rpc("scd_area_poll_vote", { p_organization_id: org.organizationId, p_poll_id: data.pollId, p_option: data.option });
    if (error) return { ok: false, message: areaRequestError(null) };
    const r = (out ?? {}) as { ok?: boolean; code?: string };
    return r.ok ? { ok: true, message: "Voto salvato, grazie!" } : { ok: false, message: areaRequestError(r.code) };
  });

/** Office board of the Club House requests; null when r103 is off or the caller is not office. */
export const getClubHouseBoard = createServerFn({ method: "GET" }).handler(async (): Promise<BoardAreaRequest[] | null> => {
  const { org, sb } = await context();
  if (!sb || !org) return null;
  const { data, error } = await sb.rpc("scd_area_requests_board", { p_organization_id: org.organizationId, p_area: "club-house" });
  return error ? null : parseBoardAreaRequests(data);
});

const decideSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["IN_CARICO", "CONFERMATA", "NON_POSSIBILE"]),
  answer: z.string().trim().max(300).optional(),
});

/** Office decision on a request (the database checks the Club House office). CONFERMATA: payment at the till. */
export const decideAreaRequest = createServerFn({ method: "POST" })
  .inputValidator((d: z.input<typeof decideSchema>) => decideSchema.parse(d))
  .handler(async ({ data }): Promise<VoteOutcome> => {
    const { org, sb } = await context();
    if (!sb || !org) return { ok: false, message: "Accesso non valido." };
    const { data: out, error } = await sb.rpc("scd_area_request_decide", {
      p_organization_id: org.organizationId,
      p_request_id: data.id,
      p_status: data.status,
      p_answer: data.answer ?? null,
    });
    if (error) return { ok: false, message: areaRequestError(null) };
    const r = (out ?? {}) as { ok?: boolean; code?: string };
    return r.ok ? { ok: true, message: "Risposta salvata: la famiglia la vede nella sua area." } : { ok: false, message: areaRequestError(r.code) };
  });
