/**
 * «I miei documenti» on the server (r142). The database decides who sees what (scd_my_documents, scd_doc_lamp,
 * scd_doc_office_board); files go to the club Drive through the Make webhook (docs-upload.server.ts) and only the index
 * is written (scd_doc_register_upload). Never logs file contents, names or personal data.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { sessionView } from "./auth.functions";
import { postToArchive, sha256Hex, uploadConfig } from "./docs-upload.server";
import {
  MAX_UPLOAD_BYTES,
  UPLOAD_KINDS,
  docErrorMessage,
  driveFileName,
  parseDrawer,
  parseLamp,
  sniffMime,
  type Drawer,
  type Lamp,
} from "./my-documents";
import { serverSupabase } from "./supabase.server";

async function context() {
  const s = await sessionView();
  const org = s.memberships[0] ?? null;
  return { org, sb: s.configured && s.user ? serverSupabase() : null };
}

function romeToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export interface MyDocumentsData {
  connected: boolean;
  /** False until r142 answers (migration staged, not applied): the page says so instead of showing empty drawers. */
  live: boolean;
  drawer: Drawer | null;
  lamp: Lamp | null;
  uploadEnabled: boolean;
  error: string | null;
}

export const getMyDocuments = createServerFn({ method: "GET" }).handler(
  async (): Promise<MyDocumentsData> => {
    const uploadEnabled = uploadConfig() !== null;
    const { org, sb } = await context();
    if (!sb || !org)
      return {
        connected: false,
        live: false,
        drawer: null,
        lamp: null,
        uploadEnabled,
        error: null,
      };
    const [d, l] = await Promise.all([
      sb.rpc("scd_my_documents", { p_organization_id: org.organizationId }),
      sb.rpc("scd_doc_lamp", { p_organization_id: org.organizationId }),
    ]);
    if (d.error) {
      // PGRST202 / 42883: function not found = r142 not applied yet.
      const missing = d.error.code === "PGRST202" || d.error.code === "42883";
      return {
        connected: true,
        live: !missing,
        drawer: null,
        lamp: null,
        uploadEnabled,
        error: missing
          ? null
          : "Lettura dei documenti non riuscita. Riprova tra poco.",
      };
    }
    return {
      connected: true,
      live: true,
      drawer: parseDrawer(d.data),
      lamp: l.error ? null : parseLamp(l.data),
      uploadEnabled,
      error: null,
    };
  },
);

/** Count for the «lampadina» on La mia SCD; null when unknown (signed out, r142 not live). */
export const getDocLamp = createServerFn({ method: "GET" }).handler(
  async (): Promise<Lamp | null> => {
    const { org, sb } = await context();
    if (!sb || !org) return null;
    const { data, error } = await sb.rpc("scd_doc_lamp", {
      p_organization_id: org.organizationId,
    });
    return error || data === null ? null : parseLamp(data);
  },
);

export interface DocOutcome {
  ok: boolean;
  message: string;
}

const uploadFields = z.object({
  personId: z.string().uuid(),
  kind: z.enum(UPLOAD_KINDS as [string, ...string[]]),
  requestId: z.string().uuid().nullable(),
});

/** Multipart: file, personId, kind, requestId (optional). */
export const uploadMyDocument = createServerFn({ method: "POST" })
  .inputValidator((d: FormData) => {
    if (!(d instanceof FormData)) throw new Error("form");
    const file = d.get("file");
    if (!(file instanceof File)) throw new Error("file");
    const requestId = d.get("requestId");
    return {
      file,
      ...uploadFields.parse({
        personId: d.get("personId"),
        kind: d.get("kind"),
        requestId:
          typeof requestId === "string" && requestId ? requestId : null,
      }),
    };
  })
  .handler(async ({ data }): Promise<DocOutcome> => {
    const cfg = uploadConfig();
    if (!cfg) return { ok: false, message: docErrorMessage("UPLOAD_OFF") };
    const { org, sb } = await context();
    if (!sb || !org)
      return {
        ok: false,
        message: "Entra con il tuo account per caricare un documento.",
      };
    if (data.file.size <= 0 || data.file.size > MAX_UPLOAD_BYTES)
      return { ok: false, message: docErrorMessage("TOO_LARGE") };
    const bytes = new Uint8Array(await data.file.arrayBuffer());
    const mime = sniffMime(bytes);
    if (!mime) return { ok: false, message: docErrorMessage("BAD_FILE") };

    const target = await sb.rpc("scd_doc_upload_target", {
      p_organization_id: org.organizationId,
      p_person_id: data.personId,
      p_kind: data.kind,
      p_request_id: data.requestId,
    });
    const t = (target.data ?? {}) as {
      ok?: boolean;
      code?: string;
      folderHint?: string;
      personRef?: string;
    };
    if (target.error || !t.ok || !t.folderHint || !t.personRef)
      return { ok: false, message: docErrorMessage(t.code ?? null) };

    const sha256 = sha256Hex(bytes);
    const fileName = driveFileName(data.kind, mime, romeToday());
    const stored = await postToArchive(
      cfg,
      {
        v: 1,
        kind: data.kind,
        personRef: t.personRef,
        folderHint: t.folderHint,
        fileName,
        mime,
        size: bytes.byteLength,
        sha256,
        requestRef: data.requestId,
      },
      bytes,
    );
    if (!stored.ok) return { ok: false, message: docErrorMessage(stored.code) };

    const { data: out, error } = await sb.rpc("scd_doc_register_upload", {
      p_organization_id: org.organizationId,
      p_person_id: data.personId,
      p_kind: data.kind,
      p_request_id: data.requestId,
      p_drive_file_id: stored.driveFileId,
      p_file_name: fileName,
      p_mime: mime,
      p_size: bytes.byteLength,
      p_sha256: sha256,
    });
    const r = (out ?? {}) as { ok?: boolean; code?: string };
    if (error || !r.ok)
      return { ok: false, message: docErrorMessage(r.code ?? null) };
    return {
      ok: true,
      message:
        "Caricato nell'archivio del club: la Segreteria lo verifica e ti avvisa qui.",
    };
  });

/* ------------------------------------------------------------------ Segreteria / Direzione / Tesoreria */

export interface OfficeRow {
  id: string;
  personId: string;
  label: string;
  kind: string;
  uploadedAt?: string | null;
  fileName?: string | null;
  driveFileId?: string | null;
  requestId?: string | null;
  isAthlete?: boolean;
  note?: string | null;
  due?: string | null;
  status?: string;
  createdAt?: string | null;
}
export interface OfficeBoard {
  classes: string[];
  expiryMail: {
    enabled: boolean;
    enabledAt: string | null;
    importDone: boolean;
  } | null;
  canSwitchMail: boolean;
  toVerify: OfficeRow[];
  requests: OfficeRow[];
  due: { expired: number; expiring: number };
  people: { id: string; label: string; isAthlete: boolean }[];
}
export interface OfficeData {
  connected: boolean;
  live: boolean;
  board: OfficeBoard | null;
  uploadEnabled: boolean;
  error: string | null;
}

const DRIVE_ID = /^[A-Za-z0-9_-]{10,200}$/;

export function parseOfficeBoard(raw: unknown): OfficeBoard | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const rows = (v: unknown): OfficeRow[] =>
    (Array.isArray(v) ? v : [])
      .filter(
        (x): x is Record<string, unknown> =>
          !!x &&
          typeof x === "object" &&
          typeof (x as Record<string, unknown>)["id"] === "string",
      )
      .map((x) => ({
        id: String(x["id"]),
        personId: String(x["personId"] ?? ""),
        label: typeof x["label"] === "string" ? x["label"] : "Persona",
        kind: String(x["kind"] ?? ""),
        uploadedAt:
          typeof x["uploadedAt"] === "string" ? x["uploadedAt"] : null,
        fileName: typeof x["fileName"] === "string" ? x["fileName"] : null,
        driveFileId:
          typeof x["driveFileId"] === "string" &&
          DRIVE_ID.test(x["driveFileId"])
            ? x["driveFileId"]
            : null,
        requestId: typeof x["requestId"] === "string" ? x["requestId"] : null,
        isAthlete: x["isAthlete"] === true,
        note: typeof x["note"] === "string" ? x["note"] : null,
        due: typeof x["due"] === "string" ? x["due"] : null,
        ...(typeof x["status"] === "string" ? { status: x["status"] } : {}),
        createdAt: typeof x["createdAt"] === "string" ? x["createdAt"] : null,
      }));
  const em =
    r["expiryMail"] && typeof r["expiryMail"] === "object"
      ? (r["expiryMail"] as Record<string, unknown>)
      : null;
  const due =
    r["due"] && typeof r["due"] === "object"
      ? (r["due"] as Record<string, unknown>)
      : {};
  return {
    classes: Array.isArray(r["classes"])
      ? r["classes"].filter((c): c is string => typeof c === "string")
      : [],
    expiryMail: em
      ? {
          enabled: em["enabled"] === true,
          enabledAt:
            typeof em["enabledAt"] === "string" ? em["enabledAt"] : null,
          importDone: em["importDone"] === true,
        }
      : null,
    canSwitchMail: r["canSwitchMail"] === true,
    toVerify: rows(r["toVerify"]),
    requests: rows(r["requests"]),
    due: {
      expired: Number(due["expired"] ?? 0) || 0,
      expiring: Number(due["expiring"] ?? 0) || 0,
    },
    people: (Array.isArray(r["people"]) ? r["people"] : [])
      .filter(
        (x): x is Record<string, unknown> =>
          !!x &&
          typeof x === "object" &&
          typeof (x as Record<string, unknown>)["id"] === "string",
      )
      .map((x) => ({
        id: String(x["id"]),
        label: typeof x["label"] === "string" ? x["label"] : "Persona",
        isAthlete: x["isAthlete"] === true,
      })),
  };
}

export const getDocOfficeBoard = createServerFn({ method: "GET" })
  .inputValidator((d: { q?: string } | undefined) =>
    z.object({ q: z.string().max(60).optional() }).parse(d ?? {}),
  )
  .handler(async ({ data }): Promise<OfficeData> => {
    const uploadEnabled = uploadConfig() !== null;
    const { org, sb } = await context();
    if (!sb || !org)
      return {
        connected: false,
        live: false,
        board: null,
        uploadEnabled,
        error: null,
      };
    const { data: out, error } = await sb.rpc("scd_doc_office_board", {
      p_organization_id: org.organizationId,
      p_q: data.q ?? "",
    });
    if (error) {
      const missing = error.code === "PGRST202" || error.code === "42883";
      return {
        connected: true,
        live: !missing,
        board: null,
        uploadEnabled,
        error: missing ? null : "Lettura non riuscita. Riprova tra poco.",
      };
    }
    return {
      connected: true,
      live: true,
      board: parseOfficeBoard(out),
      uploadEnabled,
      error: null,
    };
  });

const reviewSchema = z.object({
  documentId: z.string().uuid(),
  decision: z.enum(["APPROVA", "RIFIUTA"]),
  expiresAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  certKind: z.enum(["AGONISTICO", "NON_AGONISTICO"]).nullable(),
  note: z.string().max(300).nullable(),
});

export const reviewDocument = createServerFn({ method: "POST" })
  .inputValidator((d: z.input<typeof reviewSchema>) => reviewSchema.parse(d))
  .handler(async ({ data }): Promise<DocOutcome> => {
    const { org, sb } = await context();
    if (!sb || !org)
      return { ok: false, message: docErrorMessage("NOT_ALLOWED") };
    const { data: out, error } = await sb.rpc("scd_doc_review", {
      p_organization_id: org.organizationId,
      p_document_id: data.documentId,
      p_decision: data.decision,
      p_expires_at: data.expiresAt,
      p_cert_kind: data.certKind,
      p_note: data.note,
    });
    const r = (out ?? {}) as { ok?: boolean; code?: string };
    if (error || !r.ok)
      return { ok: false, message: docErrorMessage(r.code ?? null) };
    return {
      ok: true,
      message:
        data.decision === "APPROVA"
          ? "Approvato: la famiglia lo vede in regola."
          : "Rifiutato: la famiglia legge il motivo e ricarica.",
    };
  });

const requestSchema = z.object({
  personId: z.string().uuid(),
  kind: z.enum(UPLOAD_KINDS as [string, ...string[]]),
  note: z.string().max(300).nullable(),
  due: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
});

export const createDocRequest = createServerFn({ method: "POST" })
  .inputValidator((d: z.input<typeof requestSchema>) => requestSchema.parse(d))
  .handler(async ({ data }): Promise<DocOutcome> => {
    const { org, sb } = await context();
    if (!sb || !org)
      return { ok: false, message: docErrorMessage("NOT_ALLOWED") };
    const { data: out, error } = await sb.rpc("scd_doc_request_create", {
      p_organization_id: org.organizationId,
      p_person_id: data.personId,
      p_kind: data.kind,
      p_note: data.note,
      p_due: data.due,
    });
    const r = (out ?? {}) as {
      ok?: boolean;
      code?: string;
      existing?: boolean;
    };
    if (error || !r.ok)
      return { ok: false, message: docErrorMessage(r.code ?? null) };
    return {
      ok: true,
      message: r.existing
        ? "C'era già una richiesta aperta per questo documento."
        : "Richiesta creata: la famiglia la vede in «I miei documenti».",
    };
  });

export const setExpiryMail = createServerFn({ method: "POST" })
  .inputValidator((d: { enabled: boolean }) =>
    z.object({ enabled: z.boolean() }).parse(d),
  )
  .handler(async ({ data }): Promise<DocOutcome> => {
    const { org, sb } = await context();
    if (!sb || !org)
      return { ok: false, message: docErrorMessage("NOT_ALLOWED") };
    const { data: out, error } = await sb.rpc("scd_doc_set_expiry_mail", {
      p_organization_id: org.organizationId,
      p_enabled: data.enabled,
    });
    const r = (out ?? {}) as { ok?: boolean; code?: string };
    if (error || !r.ok)
      return { ok: false, message: docErrorMessage(r.code ?? null) };
    return {
      ok: true,
      message: data.enabled
        ? "Avvisi di scadenza accesi: partono solo se anche l'invio della Posta del club è attivo."
        : "Avvisi di scadenza spenti.",
    };
  });
