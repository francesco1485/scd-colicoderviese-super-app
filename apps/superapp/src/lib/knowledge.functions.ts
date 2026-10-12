/**
 * Cervellone search on the server (r77). scd_kb_search checks the caller's role in the database;
 * nothing here grants access.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { sessionView } from "./auth.functions";
import { KB_AREAS, KB_KINDS, parseKb, type KbResult } from "./knowledge";
import { serverSupabase } from "./supabase.server";

export interface KbData {
  connected: boolean;
  result: KbResult | null;
  error: string | null;
}

const input = z.object({
  q: z.string().trim().max(200).optional(),
  area: z.enum(KB_AREAS).optional(),
  season: z.string().regex(/^\d{4}\/\d{2}$/).optional(),
  kind: z.enum(KB_KINDS).optional(),
  onlyDue: z.boolean().optional(),
  limit: z.number().int().min(1).max(200).optional(),
});
export type KbQuery = z.input<typeof input>;

export const searchKnowledge = createServerFn({ method: "GET" })
  .inputValidator((d: KbQuery) => input.parse(d))
  .handler(async ({ data }): Promise<KbData> => {
    const s = await sessionView();
    const org = s.memberships[0] ?? null;
    if (!s.configured || !s.user || !org) return { connected: false, result: null, error: null };
    const sb = serverSupabase();
    if (!sb) return { connected: false, result: null, error: null };
    const { data: out, error } = await sb.rpc("scd_kb_search", {
      p_organization_id: org.organizationId,
      p_query: data.q || null,
      p_area: data.area ?? null,
      p_stagione: data.season ?? null,
      p_kind: data.kind ?? null,
      p_only_due: data.onlyDue ?? false,
      p_limit: data.limit ?? 40,
    });
    if (error) return { connected: true, result: null, error: "Ricerca non riuscita. Riprova tra poco." };
    return { connected: true, result: parseKb(out), error: null };
  });
