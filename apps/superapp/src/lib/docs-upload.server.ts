/**
 * Upload path of «I miei documenti» (r142), server only.
 *
 * Chosen path: Make webhook. The server has no Google credential with a Drive scope (VERIFIED 17/10/2026: the only
 * Google OAuth credential is the Posta del club one, scopes gmail.send + gmail.readonly, lib/comm/gmail.server.ts;
 * SCD_VERTEX_SA_JSON is a Vertex AI service account without access to the club Drive). The Make scenarios «Atleti» and
 * «Staff» already own the tesseramenti Drive and its folders `Cognome_Nome_Ruolo`, so one more Make scenario receives
 * the file and saves it in the person's folder; the app keeps only the index (scd_documents).
 *
 * Config (Render environment, set by the Direzione; never in the repository, never logged):
 *   SCD_DOCS_UPLOAD_WEBHOOK_URL  https://hook.<region>.make.com/<id> of the Make scenario «Documenti dall'app»
 *   SCD_DOCS_UPLOAD_SECRET       shared secret, at least 32 characters, also stored in the Make scenario
 * Missing or malformed -> the feature is OFF and the page says «Caricamento in preparazione».
 *
 * Request (multipart/form-data): field `meta` (JSON, see UploadMeta) and field `file`. Headers:
 *   X-SCD-Timestamp: unix seconds;  X-SCD-Signature: sha256=<hex HMAC-SHA256(secret, `${ts}.${sha256(file)}.${meta}`)>
 * The scenario must recompute the signature, refuse timestamps older than 5 minutes, save the file in the folder found
 * by `folderHint` (prefix match `Cognome_Nome_`), and answer JSON {"ok": true, "driveFileId": "<id>"}.
 */
import { createHash, createHmac } from "node:crypto";

export interface UploadConfig {
  url: string;
  secret: string;
}

const HOOK = /^https:\/\/hook\.[a-z0-9]+\.make\.com\/[A-Za-z0-9_-]{8,}$/;
const DRIVE_ID = /^[A-Za-z0-9_-]{10,200}$/;
const TIMEOUT_MS = 30_000;

export function uploadConfig(
  env: Readonly<Record<string, string | undefined>> = process.env,
): UploadConfig | null {
  const url = (env["SCD_DOCS_UPLOAD_WEBHOOK_URL"] ?? "").trim();
  const secret = (env["SCD_DOCS_UPLOAD_SECRET"] ?? "").trim();
  if (!HOOK.test(url) || secret.length < 32) return null;
  return { url, secret };
}

export interface UploadMeta {
  v: 1;
  kind: string;
  /** scd_people.id: the scenario may log it, it is not personal data by itself. */
  personRef: string;
  /** Cognome_Nome of the person (from scd_doc_upload_target), only to find the Drive folder. */
  folderHint: string;
  fileName: string;
  mime: string;
  size: number;
  sha256: string;
  requestRef: string | null;
}

export function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function signUpload(
  secret: string,
  timestamp: number,
  sha256: string,
  metaJson: string,
): string {
  return createHmac("sha256", secret)
    .update(`${timestamp}.${sha256}.${metaJson}`)
    .digest("hex");
}

export type FetchLike = (
  input: string,
  init?: RequestInit,
) => Promise<Response>;
export type UploadResult =
  { ok: true; driveFileId: string } | { ok: false; code: "ARCHIVE_FAILED" };

/** Posts the file to the Make scenario. Only the outcome is returned: response bodies are never echoed or logged. */
export async function postToArchive(
  cfg: UploadConfig,
  meta: UploadMeta,
  bytes: Uint8Array,
  fetchImpl: FetchLike = fetch,
  now: () => number = Date.now,
): Promise<UploadResult> {
  const metaJson = JSON.stringify(meta);
  const ts = Math.floor(now() / 1000);
  const form = new FormData();
  form.set("meta", metaJson);
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  form.set("file", new Blob([buffer], { type: meta.mime }), meta.fileName);
  let res: Response;
  try {
    res = await fetchImpl(cfg.url, {
      method: "POST",
      headers: {
        "X-SCD-Timestamp": String(ts),
        "X-SCD-Signature": `sha256=${signUpload(cfg.secret, ts, meta.sha256, metaJson)}`,
      },
      body: form,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    return { ok: false, code: "ARCHIVE_FAILED" };
  }
  if (!res.ok) return { ok: false, code: "ARCHIVE_FAILED" };
  const json = (await res.json().catch(() => null)) as {
    ok?: unknown;
    driveFileId?: unknown;
  } | null;
  if (
    !json ||
    json.ok !== true ||
    typeof json.driveFileId !== "string" ||
    !DRIVE_ID.test(json.driveFileId)
  ) {
    return { ok: false, code: "ARCHIVE_FAILED" };
  }
  return { ok: true, driveFileId: json.driveFileId };
}
