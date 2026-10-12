/**
 * T4 Documenti per pubblico on the server (r81). The database decides what the caller sees
 * (scd_doc_library) and who may change audiences (scd_doc_set_audiences: Direzione only, logged).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { sessionView } from "./auth.functions";
import { AUDIENCES, audienceError, parseLibrary, type Audience, type Library } from "./documents";
import { serverSupabase } from "./supabase.server";

export interface LibraryData {
  connected: boolean;
  library: Library | null;
  error: string | null;
}

async function context() {
  const s = await sessionView();
  const org = s.memberships[0] ?? null;
  return { org, sb: s.configured && s.user ? serverSupabase() : null };
}

export const getDocLibrary = createServerFn({ method: "GET" }).handler(async (): Promise<LibraryData> => {
  const { org, sb } = await context();
  if (!sb || !org) return { connected: false, library: null, error: null };
  const { data, error } = await sb.rpc("scd_doc_library", { p_organization_id: org.organizationId });
  if (error) return { connected: true, library: null, error: "Lettura dei documenti non riuscita. Riprova tra poco." };
  return { connected: true, library: parseLibrary(data), error: null };
});

const setSchema = z.object({
  ref: z.string().min(1).max(200),
  audiences: z.array(z.enum(AUDIENCES)).max(5),
  makePublic: z.boolean().optional(),
});

export interface SetOutcome {
  ok: boolean;
  message: string;
  audiences?: Audience[];
  sensitivity?: string;
}

export const setDocAudiences = createServerFn({ method: "POST" })
  .inputValidator((d: z.input<typeof setSchema>) => setSchema.parse(d))
  .handler(async ({ data }): Promise<SetOutcome> => {
    const { org, sb } = await context();
    if (!sb || !org) return { ok: false, message: "Accesso non valido: entra con il tuo account." };
    const { data: out, error } = await sb.rpc("scd_doc_set_audiences", {
      p_organization_id: org.organizationId,
      p_ref: data.ref,
      p_audiences: data.audiences,
      p_make_public: data.makePublic ?? false,
    });
    if (error) return { ok: false, message: audienceError(null) };
    const r = (out ?? {}) as { ok?: boolean; code?: string; audiences?: string[]; sensitivity?: string };
    if (!r.ok) return { ok: false, message: audienceError(r.code) };
    return {
      ok: true,
      message: "Salvato: la modifica è registrata con il tuo nome.",
      audiences: AUDIENCES.filter((a) => (r.audiences ?? []).includes(a)),
      ...(r.sensitivity ? { sensitivity: r.sensitivity } : {}),
    };
  });
