/**
 * Google Vertex AI Imagen 4 Fast, EU region, server only ("Crea il tuo campione", path B).
 * Called exclusively by generateAvatarFromText after: session, age band from the database, moderation, caps.
 * Credentials: SCD_VERTEX_SA_JSON (service-account JSON, raw or base64) → short-lived OAuth token (JWT bearer grant).
 * Nothing is stored here: the image comes back as a data URL for the preview; the prompt is never logged.
 */
import { createSign } from "node:crypto";

import { vertexImagenRequest } from "./avatar-studio";

interface ServiceAccount {
  client_email: string;
  private_key: string;
  token_uri?: string | undefined;
}

function parseServiceAccount(raw: string): ServiceAccount | null {
  const text = raw.trim().startsWith("{") ? raw.trim() : Buffer.from(raw.trim(), "base64").toString("utf8");
  try {
    const o = JSON.parse(text) as Partial<ServiceAccount>;
    if (typeof o.client_email !== "string" || typeof o.private_key !== "string") return null;
    return { client_email: o.client_email, private_key: o.private_key, token_uri: o.token_uri };
  } catch {
    return null;
  }
}

const b64url = (b: Buffer | string) => Buffer.from(b).toString("base64url");

let cached: { token: string; exp: number } | null = null;

async function accessToken(sa: ServiceAccount): Promise<string | null> {
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.exp - 60 > now) return cached.token;
  const tokenUri = sa.token_uri && /^https:\/\/oauth2\.googleapis\.com\//.test(sa.token_uri) ? sa.token_uri : "https://oauth2.googleapis.com/token";
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/cloud-platform",
      aud: tokenUri,
      iat: now,
      exp: now + 3600,
    }),
  );
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  const jwt = `${header}.${claims}.${b64url(signer.sign(sa.private_key))}`;
  const res = await fetch(tokenUri, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!json.access_token) return null;
  cached = { token: json.access_token, exp: now + (json.expires_in ?? 3600) };
  return json.access_token;
}

export type ImagenOutcome =
  | { ok: true; dataUrl: string }
  | { ok: false; blocked: boolean; message: string };

export async function generateImagen(
  cfg: { projectId: string; location: string; model: string },
  prompt: string,
  env: Readonly<Record<string, string | undefined>> = process.env,
): Promise<ImagenOutcome> {
  const sa = parseServiceAccount(env["SCD_VERTEX_SA_JSON"] ?? "");
  if (!sa) return { ok: false, blocked: false, message: "Credenziali del servizio non valide." };
  const token = await accessToken(sa);
  if (!token) return { ok: false, blocked: false, message: "Servizio di generazione non raggiungibile, riprova più tardi." };
  const req = vertexImagenRequest(cfg, prompt);
  const res = await fetch(req.url, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(req.body),
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) return { ok: false, blocked: false, message: "Generazione non riuscita, riprova più tardi." };
  const json = (await res.json()) as {
    predictions?: Array<{ bytesBase64Encoded?: string; mimeType?: string; raiFilteredReason?: string }>;
  };
  const p = json.predictions?.find((x) => typeof x.bytesBase64Encoded === "string");
  if (!p?.bytesBase64Encoded) {
    return { ok: false, blocked: true, message: "Il controllo contenuti del servizio ha fermato l'immagine: prova a cambiare la descrizione." };
  }
  const mime = p.mimeType === "image/jpeg" ? "image/jpeg" : "image/png";
  return { ok: true, dataUrl: `data:${mime};base64,${p.bytesBase64Encoded}` };
}
