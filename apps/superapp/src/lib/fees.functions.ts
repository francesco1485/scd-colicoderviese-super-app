/**
 * Quote e Fondo on the server (r78). Reads only, through the SECURITY DEFINER functions:
 *   - scd_fee_board: office (Direzione, Segreteria, Tesoreria...) — null for anyone else;
 *   - scd_my_fees: the caller's own family circle, no internal notes.
 * The copy is written by the scheduled job (service role) from the Gestionale: nothing here writes.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { sessionView } from "./auth.functions";
import { parseFeeBoard, parseMyFees, type FeeBoard, type MyFee } from "./fees";
import { serverSupabase } from "./supabase.server";

export interface FeeData {
  connected: boolean;
  /** Null when the signed-in person is not office staff. */
  board: FeeBoard | null;
  error: string | null;
}

export interface MyFeesData {
  state: "signed-out" | "ok" | "error";
  fees: MyFee[];
}

async function context() {
  const s = await sessionView();
  const org = s.memberships[0] ?? null;
  return { org, sb: s.configured && s.user ? serverSupabase() : null };
}

const season = z.string().regex(/^\d{4}\/\d{2}$/);

export const getFeeBoard = createServerFn({ method: "GET" })
  .inputValidator((d: { season?: string }) => z.object({ season: season.optional() }).parse(d ?? {}))
  .handler(async ({ data }): Promise<FeeData> => {
    const { org, sb } = await context();
    if (!sb || !org) return { connected: false, board: null, error: null };
    const { data: out, error } = await sb.rpc("scd_fee_board", { p_organization_id: org.organizationId, p_season: data.season ?? "2026/27" });
    if (error) return { connected: true, board: null, error: "Lettura delle quote non riuscita. Riprova tra poco." };
    return { connected: true, board: parseFeeBoard(out), error: null };
  });

export const getMyFees = createServerFn({ method: "GET" }).handler(async (): Promise<MyFeesData> => {
  const { org, sb } = await context();
  if (!sb || !org) return { state: "signed-out", fees: [] };
  const { data, error } = await sb.rpc("scd_my_fees", { p_organization_id: org.organizationId, p_season: "2026/27" });
  if (error) return { state: "error", fees: [] };
  return { state: "ok", fees: parseMyFees(data) };
});
