/**
 * Compensi e stipendi on the server (r75, UD-075). Every read and write goes through the
 * SECURITY DEFINER functions scd_comp_*: the database decides who is Direzione or Tesoreria, what is
 * payable and what is locked, and writes the audit trail. Files go to the private bucket
 * `scd-private` under `<org>/comp/` with the signed-in user's session (storage policies apply), then
 * are registered with scd_comp_register_document. The app never executes payments and never stores
 * an IBAN: only its status.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { sessionView } from "./auth.functions";
import { compErrorMessage, ENTRY_KINDS, isPeriod, parseCompBoard, type CompBoard } from "./compensation";
import { serverSupabase } from "./supabase.server";

export interface CompData {
  connected: boolean;
  /** Null when the signed-in person is neither Direzione nor Tesoreria. */
  board: CompBoard | null;
  error: string | null;
}

export interface CompOutcome {
  ok: boolean;
  message: string;
  id?: string;
}

async function context() {
  const s = await sessionView();
  const org = s.memberships[0] ?? null;
  return { org, sb: s.configured && s.user ? serverSupabase() : null };
}

const NO_SESSION: CompOutcome = { ok: false, message: "Accesso non valido: entra con il tuo account." };

function outcome(out: unknown, okMessage: string): CompOutcome {
  const r = (out ?? {}) as { ok?: boolean; code?: string; id?: string; blockers?: string[] };
  if (!r.ok) return { ok: false, message: compErrorMessage(r.code, r.blockers) };
  return { ok: true, message: okMessage, ...(r.id ? { id: r.id } : {}) };
}

const period = z.string().refine(isPeriod, "period");
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const money = z.number().finite().min(0).max(1_000_000);

export const getCompBoard = createServerFn({ method: "GET" })
  .inputValidator((d: { period: string }) => z.object({ period }).parse(d))
  .handler(async ({ data }): Promise<CompData> => {
    const { org, sb } = await context();
    if (!sb || !org) return { connected: false, board: null, error: null };
    const { data: out, error } = await sb.rpc("scd_comp_board", { p_organization_id: org.organizationId, p_period: data.period });
    if (error) return { connected: true, board: null, error: "Lettura dei compensi non riuscita." };
    return { connected: true, board: parseCompBoard(out), error: null };
  });

const agreementSchema = z.object({
  id: z.string().uuid().nullish(),
  personCode: z.string().trim().max(40).nullish(),
  name: z.string().trim().min(1).max(120),
  area: z.string().trim().max(80).nullish(),
  role: z.string().trim().max(120).nullish(),
  contractType: z.enum(["LAVORO_SPORTIVO", "VOLONTARIATO_SPORTIVO", "COLLABORAZIONE", "DIPENDENTE", "ALTRO", "DA_VERIFICARE"]),
  monthlyFixed: money,
  goalRate: money.nullish(),
  ibanStatus: z.enum(["MANCANTE", "DA_VERIFICARE", "CONFERMATO"]),
  contractStatus: z.enum(["DA_VERIFICARE", "OK", "BLOCCATO"]),
  relationshipStatus: z.enum(["ATTIVO", "SOSPESO", "CESSATO"]),
  startDate: day.nullish(),
  endDate: day.nullish(),
  ceasedAt: day.nullish(),
  notes: z.string().trim().max(1000).nullish(),
});
export type AgreementInput = z.input<typeof agreementSchema>;

/** Creates or updates an agreement (Direzione only, checked in the database). */
export const saveCompAgreement = createServerFn({ method: "POST" })
  .inputValidator((d: AgreementInput) => agreementSchema.parse(d))
  .handler(async ({ data }): Promise<CompOutcome> => {
    const { org, sb } = await context();
    if (!sb || !org) return NO_SESSION;
    const { id, ...rest } = data;
    const { data: out, error } = await sb.rpc("scd_comp_save_agreement", { p_organization_id: org.organizationId, p_id: id ?? null, p_data: rest });
    if (error) return { ok: false, message: compErrorMessage(null) };
    return outcome(out, id ? "Accordo aggiornato." : "Persona aggiunta ai compensi.");
  });

const entrySchema = z.object({
  agreementId: z.string().uuid(),
  period,
  kind: z.enum(ENTRY_KINDS),
  quantity: z.number().finite().min(0).max(1000).nullish(),
  unitAmount: money.nullish(),
  amount: z.number().finite().gt(0).max(1_000_000),
  date: day,
  note: z.string().trim().max(500).nullish(),
  documentId: z.string().uuid().nullish(),
});
export type EntryInput = z.input<typeof entrySchema>;

/** Records an item of the month (goal, acconto, rimborso...). Direzione or Tesoreria. */
export const addCompEntry = createServerFn({ method: "POST" })
  .inputValidator((d: EntryInput) => entrySchema.parse(d))
  .handler(async ({ data }): Promise<CompOutcome> => {
    const { org, sb } = await context();
    if (!sb || !org) return NO_SESSION;
    const { data: out, error } = await sb.rpc("scd_comp_add_entry", { p_organization_id: org.organizationId, p_data: data });
    if (error) return { ok: false, message: compErrorMessage(null) };
    return outcome(out, "Voce registrata con il tuo nome.");
  });

export const cancelCompEntry = createServerFn({ method: "POST" })
  .inputValidator((d: { entryId: string; reason: string }) => z.object({ entryId: z.string().uuid(), reason: z.string().trim().min(1).max(300) }).parse(d))
  .handler(async ({ data }): Promise<CompOutcome> => {
    const { org, sb } = await context();
    if (!sb || !org) return NO_SESSION;
    const { data: out, error } = await sb.rpc("scd_comp_cancel_entry", { p_organization_id: org.organizationId, p_entry_id: data.entryId, p_reason: data.reason });
    if (error) return { ok: false, message: compErrorMessage(null) };
    return outcome(out, "Voce annullata: resta nello storico con il motivo.");
  });

const ACTION_DONE: Readonly<Record<string, string>> = {
  set_fixed: "Fisso del mese aggiornato.",
  authorize: "Autorizzato: la Tesoreria lo vede da pagare.",
  unauthorize: "Autorizzazione tolta: il mese torna modificabile.",
  block: "Pagamento bloccato.",
  unblock: "Blocco tolto.",
  mark_paid: "Segnato come pagato.",
  unmark_paid: "Pagamento annullato: torna autorizzato.",
};

const actionSchema = z.object({
  agreementId: z.string().uuid(),
  period,
  action: z.enum(["set_fixed", "authorize", "unauthorize", "block", "unblock", "mark_paid", "unmark_paid"]),
  fixed: money.nullish(),
  note: z.string().trim().max(500).nullish(),
  amount: money.nullish(),
  paidAt: day.nullish(),
  method: z.string().trim().max(40).nullish(),
  ref: z.string().trim().max(120).nullish(),
  documentId: z.string().uuid().nullish(),
});
export type PeriodActionInput = z.input<typeof actionSchema>;

/** Month actions: authorize / block (Direzione), mark paid (Tesoreria or Direzione). */
export const compPeriodAction = createServerFn({ method: "POST" })
  .inputValidator((d: PeriodActionInput) => actionSchema.parse(d))
  .handler(async ({ data }): Promise<CompOutcome> => {
    const { org, sb } = await context();
    if (!sb || !org) return NO_SESSION;
    const { agreementId, period: p, action, ...rest } = data;
    const { data: out, error } = await sb.rpc("scd_comp_period_action", {
      p_organization_id: org.organizationId,
      p_agreement_id: agreementId,
      p_period: p,
      p_action: action,
      p_data: rest,
    });
    if (error) return { ok: false, message: compErrorMessage(null) };
    return outcome(out, ACTION_DONE[action] ?? "Fatto.");
  });

const DOC_KINDS = ["CONTRATTO", "RASD", "RICEVUTA", "GIUSTIFICATIVO", "DELIBERA", "BONIFICO", "ALTRO"] as const;
const MIME = ["application/pdf", "image/jpeg", "image/png", "image/heic", "image/webp"] as const;
const MAX_BYTES = 15 * 1024 * 1024;

/** Safe storage name: ascii, no path separators, keeps the extension. */
export function storageFileName(name: string): string {
  const base = name.normalize("NFKD").replace(/[^\w.\-]+/g, "_").replace(/_+/g, "_").replace(/^[._]+/, "");
  return (base || "documento").slice(-80);
}

/**
 * Uploads a document (contract, RASD, receipt, bank transfer...) for one person and registers it.
 * Accepts multipart form data: file, agreementId, kind.
 */
export const uploadCompDocument = createServerFn({ method: "POST" })
  .inputValidator((d: FormData) => {
    if (!(d instanceof FormData)) throw new Error("form");
    const file = d.get("file");
    if (!(file instanceof File)) throw new Error("file");
    return {
      file,
      agreementId: z.string().uuid().parse(d.get("agreementId")),
      kind: z.enum(DOC_KINDS).parse(d.get("kind")),
    };
  })
  .handler(async ({ data }): Promise<CompOutcome> => {
    const { org, sb } = await context();
    if (!sb || !org) return NO_SESSION;
    const { file } = data;
    if (!(MIME as readonly string[]).includes(file.type)) return { ok: false, message: "Formato non accettato: carica un PDF o una foto (JPG, PNG, HEIC, WEBP)." };
    if (file.size <= 0 || file.size > MAX_BYTES) return { ok: false, message: "Il file deve pesare meno di 15 MB." };
    const path = `${org.organizationId}/comp/${data.agreementId}/${Date.now()}-${storageFileName(file.name)}`;
    const up = await sb.storage.from("scd-private").upload(path, file, { contentType: file.type, upsert: false });
    if (up.error) return { ok: false, message: "Caricamento non riuscito: solo Direzione e Tesoreria possono allegare documenti ai compensi." };
    const { data: out, error } = await sb.rpc("scd_comp_register_document", {
      p_organization_id: org.organizationId,
      p_data: { path, agreementId: data.agreementId, fileName: file.name.slice(0, 160), mime: file.type, size: file.size, kind: data.kind },
    });
    if (error) return { ok: false, message: compErrorMessage(null) };
    return outcome(out, "Documento allegato e archiviato.");
  });

/** Short-lived link (2 minutes) to open a document; null when the caller may not see it. */
export const openCompDocument = createServerFn({ method: "POST" })
  .inputValidator((d: { documentId: string }) => z.object({ documentId: z.string().uuid() }).parse(d))
  .handler(async ({ data }): Promise<{ url: string | null; message: string }> => {
    const { org, sb } = await context();
    if (!sb || !org) return { url: null, message: NO_SESSION.message };
    const { data: path, error } = await sb.rpc("scd_comp_document_path", { p_organization_id: org.organizationId, p_document_id: data.documentId });
    if (error || typeof path !== "string" || !path) return { url: null, message: compErrorMessage("document") };
    const signed = await sb.storage.from("scd-private").createSignedUrl(path, 120);
    if (signed.error || !signed.data?.signedUrl) return { url: null, message: "Apertura non riuscita. Riprova tra poco." };
    return { url: signed.data.signedUrl, message: "" };
  });
