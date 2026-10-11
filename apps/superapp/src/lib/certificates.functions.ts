/**
 * Medical certificate register on the server (r66). Area gate "certificati" (Direzione, Segreteria)
 * plus the database checks in scd_certificate_register / scd_set_certificate. Nothing is cached.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { workAreaView, type WorkAreaGate } from "./access";
import { sessionView } from "./auth.functions";
import { toCertRow, validateCertDate, type CertDbRow, type CertRow } from "./certificates";
import { stagingPreviewEnabled } from "./impianti-access";
import { serverSupabase } from "./supabase.server";

export interface CertificatesData {
  gate: WorkAreaGate;
  connected: boolean;
  canWrite: boolean;
  today: string;
  rows: CertRow[];
  error: string | null;
}

function todayRome(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

async function context() {
  const s = await sessionView();
  const roles = s.user ? new Set(s.roles) : null;
  const gate = workAreaView("certificati", { preview: stagingPreviewEnabled(process.env, import.meta.env.PROD), sessionRoles: roles });
  const org = s.memberships[0] ?? null;
  const canWrite = Boolean(org && ["DIRECTION", "SECRETARIAT"].includes(org.role));
  return { gate, org, canWrite, sb: s.configured && s.user ? serverSupabase() : null };
}

export const getCertificates = createServerFn({ method: "GET" }).handler(async (): Promise<CertificatesData> => {
  const today = todayRome();
  const { gate, org, canWrite, sb } = await context();
  const base: CertificatesData = { gate, connected: false, canWrite: false, today, rows: [], error: null };
  if (gate.view !== "page" || !sb || !org) return base;
  const { data, error } = await sb.rpc("scd_certificate_register", { p_organization_id: org.organizationId });
  if (error) return { ...base, connected: true, error: "Lettura non riuscita dal database." };
  return { ...base, connected: true, canWrite, rows: ((data ?? []) as CertDbRow[]).map(toCertRow) };
});

function explain(error: { code?: string; message: string }): string {
  const m = error.message;
  if (m.includes("Direzione or Segreteria only") || error.code === "42501") return "Solo Direzione e Segreteria possono inserire i certificati.";
  if (m.includes("out of range")) return "Data fuori intervallo: controlla l'anno.";
  if (m.includes("athlete not found")) return "Atleta non trovato: ricarica la pagina.";
  return "Salvataggio non riuscito, riprova.";
}

export const saveCertificate = createServerFn({ method: "POST" })
  .inputValidator((d: { athleteId: string; expiresAt: string; kind: "AGONISTICO" | "NON_AGONISTICO" | null; verified: boolean; note: string }) =>
    z
      .object({
        athleteId: z.string().uuid(),
        expiresAt: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/),
        kind: z.enum(["AGONISTICO", "NON_AGONISTICO"]).nullable(),
        verified: z.boolean(),
        note: z.string().max(300),
      })
      .parse(d))
  .handler(async ({ data }): Promise<{ ok: boolean; message: string }> => {
    const { gate, org, canWrite, sb } = await context();
    if (gate.view !== "page" || !sb || !org || !canWrite) return { ok: false, message: "Solo Direzione e Segreteria possono inserire i certificati." };
    const invalid = validateCertDate(data.expiresAt, todayRome());
    if (invalid) return { ok: false, message: invalid };
    const { error } = await sb.rpc("scd_set_certificate", {
      p_organization_id: org.organizationId,
      p_athlete_id: data.athleteId,
      p_expires_at: data.expiresAt || null,
      p_kind: data.kind,
      p_verified: data.verified,
      p_note: data.note.trim() || null,
    });
    if (error) return { ok: false, message: explain(error) };
    return { ok: true, message: data.expiresAt ? "Salvato." : "Data tolta." };
  });
