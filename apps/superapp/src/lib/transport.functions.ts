/**
 * Pulmini on the server (r74). Reads go through scd_transport_board (role and position checked in
 * the database, phones only for managers); trips are saved through scd_transport_plan_run, which
 * refuses double bookings and writes the audit trail. Nothing here trusts the browser for permissions.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { sessionView } from "./auth.functions";
import { serverSupabase } from "./supabase.server";
import { parseBoard, planErrorMessage, type TransportBoard } from "./transport";

export interface TransportData {
  /** False when this server has no database or nobody is signed in. */
  connected: boolean;
  /** Null when the signed-in person may not see the Pulmini board. */
  board: TransportBoard | null;
  error: string | null;
}

function romeDate(offsetDays: number): string {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

async function context() {
  const s = await sessionView();
  const org = s.memberships[0] ?? null;
  return { org, sb: s.configured && s.user ? serverSupabase() : null };
}

/** The board from a week ago to two months ahead: enough for the weekend and the planning horizon. */
export const getTransportBoard = createServerFn({ method: "GET" }).handler(async (): Promise<TransportData> => {
  const { org, sb } = await context();
  if (!sb || !org) return { connected: false, board: null, error: null };
  const { data, error } = await sb.rpc("scd_transport_board", { p_organization_id: org.organizationId, p_from: romeDate(-7), p_to: romeDate(60) });
  if (error) return { connected: true, board: null, error: "Lettura dei pulmini non riuscita." };
  return { connected: true, board: parseBoard(data), error: null };
});

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export interface PlanOutcome {
  ok: boolean;
  message: string;
  id?: string;
}

export const planTransportRun = createServerFn({ method: "POST" })
  .inputValidator((d: {
    id?: string | null | undefined;
    date: string;
    departure: string;
    returnEstimate?: string | null | undefined;
    kind: "TRASFERTA" | "ALLENAMENTO" | "EXTRA";
    eventId?: string | null | undefined;
    title: string;
    destination?: string | null | undefined;
    meetingPoint?: string | null | undefined;
    vehicleId?: string | null | undefined;
    driverId?: string | null | undefined;
    passengers?: number | null | undefined;
    status: "PIANIFICATA" | "CONFERMATA" | "ANNULLATA";
    note?: string | null | undefined;
  }) =>
    z
      .object({
        id: z.string().uuid().nullish(),
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        departure: z.string().regex(HHMM),
        returnEstimate: z.string().regex(HHMM).nullish(),
        kind: z.enum(["TRASFERTA", "ALLENAMENTO", "EXTRA"]),
        eventId: z.string().trim().max(120).nullish(),
        title: z.string().trim().min(1).max(160),
        destination: z.string().trim().max(200).nullish(),
        meetingPoint: z.string().trim().max(160).nullish(),
        vehicleId: z.string().uuid().nullish(),
        driverId: z.string().uuid().nullish(),
        passengers: z.number().int().min(0).max(60).nullish(),
        status: z.enum(["PIANIFICATA", "CONFERMATA", "ANNULLATA"]),
        note: z.string().trim().max(500).nullish(),
      })
      .parse(d),
  )
  .handler(async ({ data }): Promise<PlanOutcome> => {
    const { org, sb } = await context();
    if (!sb || !org) return { ok: false, message: "Accesso non valido: entra con il tuo account." };
    const { id, ...run } = data;
    const { data: out, error } = await sb.rpc("scd_transport_plan_run", { p_organization_id: org.organizationId, p_run_id: id ?? null, p_run: run });
    if (error) return { ok: false, message: planErrorMessage(null) };
    const r = (out ?? {}) as { ok?: boolean; code?: string; id?: string };
    if (!r.ok) return { ok: false, message: planErrorMessage(r.code) };
    const what = data.status === "ANNULLATA" ? "Corsa annullata" : data.status === "CONFERMATA" ? "Corsa confermata" : "Corsa salvata";
    return { ok: true, message: `${what}. Resta nello storico con il tuo nome.`, ...(r.id ? { id: r.id } : {}) };
  });
