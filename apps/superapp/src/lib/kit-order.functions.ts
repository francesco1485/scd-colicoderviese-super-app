/**
 * Magazzino · ordine kit on the server (r83). Reads through scd_kit_board (warehouse office, null otherwise);
 * deliveries through scd_kit_set_delivered (bounded by the ordered quantity, logged). Sizes are written only by the
 * copy job from the SCD_ORDINE_KIT sheet.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { sessionView } from "./auth.functions";
import { KIT_SIZES, kitError, parseKitBoard, type KitOrder } from "./kit-order";
import { serverSupabase } from "./supabase.server";

export interface KitData {
  connected: boolean;
  orders: KitOrder[] | null;
  error: string | null;
}

async function context() {
  const s = await sessionView();
  const org = s.memberships[0] ?? null;
  return { org, sb: s.configured && s.user ? serverSupabase() : null };
}

export const getKitBoard = createServerFn({ method: "GET" }).handler(async (): Promise<KitData> => {
  const { org, sb } = await context();
  if (!sb || !org) return { connected: false, orders: null, error: null };
  const { data, error } = await sb.rpc("scd_kit_board", { p_organization_id: org.organizationId });
  if (error) return { connected: true, orders: null, error: "Lettura dell'ordine kit non riuscita. Riprova tra poco." };
  return { connected: true, orders: parseKitBoard(data), error: null };
});

const deliverySchema = z.object({
  order: z.string().min(3).max(60),
  group: z.string().min(2).max(60),
  size: z.enum(KIT_SIZES),
  delivered: z.number().int().min(0).max(500),
});

export interface KitOutcome {
  ok: boolean;
  message: string;
  delivered?: number;
}

export const setKitDelivered = createServerFn({ method: "POST" })
  .inputValidator((d: z.input<typeof deliverySchema>) => deliverySchema.parse(d))
  .handler(async ({ data }): Promise<KitOutcome> => {
    const { org, sb } = await context();
    if (!sb || !org) return { ok: false, message: "Accesso non valido: entra con il tuo account." };
    const { data: out, error } = await sb.rpc("scd_kit_set_delivered", {
      p_organization_id: org.organizationId,
      p_order_key: data.order,
      p_group_key: data.group,
      p_size: data.size,
      p_delivered: data.delivered,
    });
    if (error) return { ok: false, message: kitError(null) };
    const r = (out ?? {}) as { ok?: boolean; code?: string; delivered?: number };
    if (!r.ok) return { ok: false, message: kitError(r.code) };
    return { ok: true, message: "Consegna registrata con il tuo nome.", delivered: r.delivered ?? data.delivered };
  });
