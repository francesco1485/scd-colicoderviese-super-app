/**
 * T3 Soldi on the server (r82). Reads through scd_ledger_board (Direzione/Tesoreria, null otherwise);
 * reconciliation through scd_ledger_decide (logged). Movements are written only by the intake job.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { sessionView } from "./auth.functions";
import { ledgerError, parseLedgerBoard, type LedgerBoard, type MatchState } from "./ledger";
import { serverSupabase } from "./supabase.server";

export interface LedgerData {
  connected: boolean;
  board: LedgerBoard | null;
  error: string | null;
}

async function context() {
  const s = await sessionView();
  const org = s.memberships[0] ?? null;
  return { org, sb: s.configured && s.user ? serverSupabase() : null };
}

export const getLedgerBoard = createServerFn({ method: "GET" }).handler(async (): Promise<LedgerData> => {
  const { org, sb } = await context();
  if (!sb || !org) return { connected: false, board: null, error: null };
  const { data, error } = await sb.rpc("scd_ledger_board", { p_organization_id: org.organizationId });
  if (error) return { connected: true, board: null, error: "Lettura dei movimenti non riuscita. Riprova tra poco." };
  return { connected: true, board: parseLedgerBoard(data), error: null };
});

const decideSchema = z.object({
  code: z.string().min(4).max(40),
  action: z.enum(["verify", "reopen", "link", "unlink", "not_applicable"]),
  feeRef: z.string().max(40).nullish(),
  note: z.string().trim().max(300).nullish(),
});

export interface LedgerOutcome {
  ok: boolean;
  message: string;
  state?: MatchState;
  linkRef?: string | null;
}

const DONE: Readonly<Record<string, string>> = {
  verify: "Verificato con il tuo nome.",
  reopen: "Riaperto.",
  link: "Abbinato e verificato.",
  unlink: "Abbinamento tolto.",
  not_applicable: "Segnato senza abbinamento.",
};

export const decideLedger = createServerFn({ method: "POST" })
  .inputValidator((d: z.input<typeof decideSchema>) => decideSchema.parse(d))
  .handler(async ({ data }): Promise<LedgerOutcome> => {
    const { org, sb } = await context();
    if (!sb || !org) return { ok: false, message: "Accesso non valido: entra con il tuo account." };
    const { data: out, error } = await sb.rpc("scd_ledger_decide", {
      p_organization_id: org.organizationId,
      p_code: data.code,
      p_action: data.action,
      p_fee_ref: data.feeRef ?? null,
      p_note: data.note ?? null,
    });
    if (error) return { ok: false, message: ledgerError(null) };
    const r = (out ?? {}) as { ok?: boolean; code?: string; state?: MatchState; linkRef?: string | null };
    if (!r.ok) return { ok: false, message: ledgerError(r.code) };
    return { ok: true, message: DONE[data.action] ?? "Fatto.", ...(r.state ? { state: r.state } : {}), linkRef: r.linkRef ?? null };
  });
