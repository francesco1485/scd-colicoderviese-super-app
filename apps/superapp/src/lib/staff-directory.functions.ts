/**
 * Rubrica staff on the server (UD-167, migration r141 STAGED). Every call runs with the CALLER'S Supabase session
 * (publishable key + request cookies): scd_staff_directory applies rule 1 (who sees whom) and rule 3 (consent) in the
 * database, nothing here elevates access and no service key is used. While r141 is not applied the function is
 * missing and the pages say "Rubrica non ancora attiva"; nothing is invented in the meantime.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { StaffDirectory } from "./staff-directory";

export type DirectoryStatus = "live" | "not-applied" | "signed-out" | "unavailable";

export interface DirectoryView {
  status: DirectoryStatus;
  directory: StaffDirectory | null;
}

type DbError = { code?: string | null; message?: string | null } | null;
const MISSING = ["42P01", "42883", "PGRST202", "PGRST205"];
export const isMissingFunction = (e: DbError) => Boolean(e?.code && MISSING.includes(e.code));

export const getStaffDirectory = createServerFn({ method: "GET" }).handler(async (): Promise<DirectoryView> => {
  const { loadMyDirectory } = await import("./staff-directory.server");
  return loadMyDirectory();
});

export interface ShareOutcome {
  ok: boolean;
  message: string;
  share?: boolean;
  at?: string;
}

/** The staff member's own answer (rule 3). The database checks that the caller is an adult staff member. */
export const setMyPhoneShare = createServerFn({ method: "POST" })
  .inputValidator((d: { share: boolean }) => z.object({ share: z.boolean() }).parse(d))
  .handler(async ({ data }): Promise<ShareOutcome> => {
    const { saveMyPhoneShare } = await import("./staff-directory.server");
    const res = await saveMyPhoneShare(data.share);
    if (res === "signed-out") return { ok: false, message: "Entra con il tuo account per scegliere." };
    if (res === "unavailable") return { ok: false, message: "Servizio non disponibile, riprova più tardi." };
    const { data: out, error } = res;
    if (error) {
      if (isMissingFunction(error)) return { ok: false, message: "La scelta non è ancora attiva: la attiva la Direzione." };
      if (error.code === "42501") return { ok: false, message: "La scelta è riservata allo staff della società con l'accesso collegato alla propria scheda." };
      console.warn(`[rubrica-staff] scd_set_my_phone_share non riuscita: codice ${error.code || "unknown"}`);
      return { ok: false, message: "Salvataggio non riuscito, riprova." };
    }
    const o = (out ?? {}) as { share?: unknown; at?: unknown };
    return {
      ok: true,
      message: data.share ? "Fatto: il tuo numero è visibile alle famiglie e allo staff delle tue squadre." : "Fatto: il tuo numero non è condiviso.",
      share: o.share === true,
      ...(typeof o.at === "string" ? { at: o.at } : {}),
    };
  });
