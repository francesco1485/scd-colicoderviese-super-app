/**
 * T5 Proposte e conferme on the server (r79). Reads and decisions go through SECURITY DEFINER functions:
 * scd_proposal_queue (office only, RISERVATO items only for Direzione/Tesoreria) and scd_proposal_decide
 * (every action logged). Intake is service-only (scheduled jobs), never from the browser.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { sessionView } from "./auth.functions";
import { parseQueue, proposalError, type ProposalQueue } from "./proposals";
import { serverSupabase } from "./supabase.server";

export interface QueueData {
  connected: boolean;
  queue: ProposalQueue | null;
  error: string | null;
}

export interface DecideOutcome {
  ok: boolean;
  message: string;
}

async function context() {
  const s = await sessionView();
  const org = s.memberships[0] ?? null;
  return { org, sb: s.configured && s.user ? serverSupabase() : null };
}

export const getProposalQueue = createServerFn({ method: "GET" }).handler(async (): Promise<QueueData> => {
  const { org, sb } = await context();
  if (!sb || !org) return { connected: false, queue: null, error: null };
  const { data, error } = await sb.rpc("scd_proposal_queue", { p_organization_id: org.organizationId });
  if (error) return { connected: true, queue: null, error: "Lettura della coda non riuscita. Riprova tra poco." };
  return { connected: true, queue: parseQueue(data), error: null };
});

const DONE: Readonly<Record<string, string>> = {
  take: "Presa in carico da te.",
  release: "Rimessa in coda.",
  accept: "Confermata e registrata con il tuo nome.",
  reject: "Scartata con il motivo.",
  duplicate: "Segnata come doppione.",
  snooze: "Rinviata.",
  needs_info: "In attesa di informazioni.",
  reopen: "Riaperta.",
};

const decideSchema = z.object({
  id: z.string().uuid(),
  action: z.enum(["take", "release", "accept", "reject", "duplicate", "snooze", "needs_info", "reopen"]),
  note: z.string().trim().max(500).nullish(),
  duplicateOf: z.string().uuid().nullish(),
  snoozeUntil: z.string().datetime({ offset: true }).nullish(),
});
export type DecideInput = z.input<typeof decideSchema>;

export const decideProposal = createServerFn({ method: "POST" })
  .inputValidator((d: DecideInput) => decideSchema.parse(d))
  .handler(async ({ data }): Promise<DecideOutcome> => {
    const { org, sb } = await context();
    if (!sb || !org) return { ok: false, message: "Accesso non valido: entra con il tuo account." };
    const { data: out, error } = await sb.rpc("scd_proposal_decide", {
      p_organization_id: org.organizationId,
      p_id: data.id,
      p_action: data.action,
      p_note: data.note ?? null,
      p_duplicate_of: data.duplicateOf ?? null,
      p_snooze_until: data.snoozeUntil ?? null,
    });
    if (error) return { ok: false, message: proposalError(null) };
    const r = (out ?? {}) as { ok?: boolean; code?: string };
    return r.ok ? { ok: true, message: DONE[data.action] ?? "Fatto." } : { ok: false, message: proposalError(r.code) };
  });
