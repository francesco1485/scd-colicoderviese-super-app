/**
 * Account deletion requests on the server (r96). Both entry points call scd_account_deletion_request, which files an
 * item in the existing Secretariat queue (scd_proposals, /gestionale/coda). No row is deleted here: the Secretariat
 * verifies the person and executes the deletion.
 *   - requestMyAccountDeletion: signed in; the database ties the request to auth.uid() (e-mail from auth.users);
 *   - requestAccountDeletionPublic: public page /elimina-account; honeypot + per-IP limiter here, validation, global
 *     hourly limit and de-duplication in the database.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  asDeletionOutcome,
  validatePublicDeletion,
  type DeletionOutcome,
} from "./account-deletion";
import { createRateLimiter } from "./access-requests";
import { clientIp } from "./request-ip.server";
import { serverSupabase } from "./supabase.server";

const allow = createRateLimiter(3, 10 * 60 * 1000);

const MineInput = z.object({ note: z.string().max(300).optional() });

export const requestMyAccountDeletion = createServerFn({ method: "POST" })
  .inputValidator((d: z.input<typeof MineInput>) => MineInput.parse(d))
  .handler(async ({ data }): Promise<{ outcome: DeletionOutcome }> => {
    const sb = serverSupabase();
    if (!sb) return { outcome: "ERROR" };
    const { data: auth, error: authError } = await sb.auth.getUser();
    if (authError || !auth.user) return { outcome: "NOT_SIGNED_IN" };
    const { data: res, error } = await sb.rpc("scd_account_deletion_request", {
      p_name: null,
      p_email: null,
      p_note: data.note?.trim() || null,
    });
    if (error) return { outcome: "ERROR" };
    return { outcome: asDeletionOutcome(res) };
  });

const PublicInput = z.object({
  name: z.string().max(120),
  email: z.string().max(160),
  note: z.string().max(300).default(""),
  confirm: z.boolean(),
  website: z.string().max(200).optional(),
});

export const requestAccountDeletionPublic = createServerFn({ method: "POST" })
  .inputValidator((d: z.input<typeof PublicInput>) => PublicInput.parse(d))
  .handler(async ({ data }): Promise<{ outcome: DeletionOutcome }> => {
    // Honeypot: real people never fill the hidden field. Answer as if received.
    if (data.website) return { outcome: "RECEIVED" };
    if (Object.keys(validatePublicDeletion(data)).length)
      return { outcome: "INVALID" };
    if (!allow(clientIp())) return { outcome: "BUSY" };
    const sb = serverSupabase();
    if (!sb) return { outcome: "ERROR" };
    const { data: res, error } = await sb.rpc("scd_account_deletion_request", {
      p_name: data.name.trim().replace(/\s+/g, " "),
      p_email: data.email.trim().toLowerCase(),
      p_note: data.note.trim() || null,
    });
    if (error) return { outcome: "ERROR" };
    return { outcome: asDeletionOutcome(res) };
  });
