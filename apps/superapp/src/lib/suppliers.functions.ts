/**
 * M11 Fornitori on the server (r80). Read only, through scd_supplier_board (SECURITY DEFINER): Direzione and
 * Tesoreria, null for anyone else. The copy is written by the scheduled job from the master: nothing here writes.
 */
import { createServerFn } from "@tanstack/react-start";

import { sessionView } from "./auth.functions";
import { parseSupplierBoard, type SupplierBoard } from "./suppliers";
import { serverSupabase } from "./supabase.server";

export interface SupplierData {
  connected: boolean;
  /** Null when the signed-in person is not Direzione or Tesoreria. */
  board: SupplierBoard | null;
  error: string | null;
}

export const getSupplierBoard = createServerFn({ method: "GET" }).handler(async (): Promise<SupplierData> => {
  const s = await sessionView();
  const org = s.memberships[0] ?? null;
  const sb = s.configured && s.user ? serverSupabase() : null;
  if (!sb || !org) return { connected: false, board: null, error: null };
  const { data, error } = await sb.rpc("scd_supplier_board", { p_organization_id: org.organizationId, p_season: "2026/27" });
  if (error) return { connected: true, board: null, error: "Lettura dei fornitori non riuscita. Riprova tra poco." };
  return { connected: true, board: parseSupplierBoard(data), error: null };
});
