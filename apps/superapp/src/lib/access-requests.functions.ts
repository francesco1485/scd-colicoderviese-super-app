/**
 * Self-registration on the server (r64).
 *   - submitAccessRequest: public; honeypot + per-IP limiter here, validation and global limit in the database;
 *   - office side (Direzione / Segreteria): list, candidate matches, approve (link or create person, login, role,
 *     optional child family), reject. Every call uses the caller's own session; the database checks the role.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequestIP } from "@tanstack/react-start/server";
import { z } from "zod";

import { asOutcome, cleanPhone, createRateLimiter, validateAccessRequest, type RequestOutcome } from "./access-requests";
import { sessionView } from "./auth.functions";
import { serverSupabase } from "./supabase.server";

const allow = createRateLimiter(5, 10 * 60 * 1000);

function todayRome(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

const SubmitInput = z.object({
  firstName: z.string().max(80),
  lastName: z.string().max(80),
  birthDate: z.string().max(10),
  email: z.string().max(120),
  phone: z.string().max(30),
  consent: z.boolean(),
  website: z.string().max(200).optional(),
});

export const submitAccessRequest = createServerFn({ method: "POST" })
  .inputValidator((d: z.input<typeof SubmitInput>) => SubmitInput.parse(d))
  .handler(async ({ data }): Promise<{ outcome: RequestOutcome }> => {
    // Honeypot: real people never fill the hidden field. Answer as if received.
    if (data.website) return { outcome: "RECEIVED" };
    const ip = getRequestIP({ xForwardedFor: true }) ?? "unknown";
    if (!allow(ip)) return { outcome: "BUSY" };
    const errors = validateAccessRequest({ ...data }, todayRome());
    if (errors.birthDate && /genitore/.test(errors.birthDate)) return { outcome: "MINOR_UNDER_14" };
    if (errors.consent) return { outcome: "CONSENT" };
    if (Object.keys(errors).length) return { outcome: "INVALID" };
    const sb = serverSupabase();
    if (!sb) return { outcome: "ERROR" };
    const { data: res, error } = await sb.rpc("scd_request_access", {
      p_first_name: data.firstName.trim(),
      p_last_name: data.lastName.trim(),
      p_birth_date: data.birthDate,
      p_email: data.email.trim().toLowerCase(),
      p_phone: cleanPhone(data.phone),
      p_consent: data.consent,
    });
    if (error) return { outcome: "ERROR" };
    return { outcome: asOutcome(res) };
  });

export interface AccessRequestRow {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  email: string;
  phone: string;
  minor: boolean;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  grantedRole: string | null;
  reviewNote: string | null;
}

export interface AccessCandidate {
  personId: string;
  displayName: string;
  birthYear: number | null;
  match: string;
  kind: string;
  teamCodes: string[];
}

async function office() {
  const s = await sessionView();
  const org = s.configured && s.user ? (s.memberships[0] ?? null) : null;
  const sb = org ? serverSupabase() : null;
  return org && sb ? { org, sb } : null;
}

export const getAccessRequests = createServerFn({ method: "GET" }).handler(async (): Promise<AccessRequestRow[]> => {
  const c = await office();
  if (!c) return [];
  const { data, error } = await c.sb
    .from("scd_access_requests")
    .select("id,first_name,last_name,birth_date,email,phone,is_minor,status,created_at,granted_role,review_note")
    .eq("organization_id", c.org.organizationId)
    .order("status", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return [];
  return ((data ?? []) as Array<{ id: string; first_name: string; last_name: string; birth_date: string; email: string; phone: string; is_minor: boolean; status: AccessRequestRow["status"]; created_at: string; granted_role: string | null; review_note: string | null }>).map((r) => ({
    id: r.id,
    firstName: r.first_name,
    lastName: r.last_name,
    birthDate: r.birth_date,
    email: r.email,
    phone: r.phone,
    minor: r.is_minor,
    status: r.status,
    createdAt: r.created_at,
    grantedRole: r.granted_role,
    reviewNote: r.review_note,
  }));
});

export const getAccessCandidates = createServerFn({ method: "GET" })
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }): Promise<AccessCandidate[]> => {
    const c = await office();
    if (!c) return [];
    const { data: rows, error } = await c.sb.rpc("scd_access_request_matches", { p_request_id: data.id });
    if (error) return [];
    return ((rows ?? []) as Array<{ person_id: string; display_name: string; birth_year: number | null; match: string; kind: string; team_codes: string[] | null }>).map((r) => ({
      personId: r.person_id,
      displayName: r.display_name,
      birthYear: r.birth_year,
      match: r.match,
      kind: r.kind,
      teamCodes: r.team_codes ?? [],
    }));
  });

const ApproveInput = z.object({
  id: z.string().uuid(),
  personId: z.string().uuid().nullable(),
  role: z.enum(["FAMILY", "ATHLETE", "MISTER", "MANAGER", "STAFF"]),
  childPersonId: z.string().uuid().nullable(),
  note: z.string().max(300),
});

export const approveAccessRequest = createServerFn({ method: "POST" })
  .inputValidator((d: z.input<typeof ApproveInput>) => ApproveInput.parse(d))
  .handler(async ({ data }): Promise<{ ok: boolean; message: string }> => {
    const c = await office();
    if (!c) return { ok: false, message: "Accesso non valido." };
    if (data.role === "FAMILY" && !data.childPersonId) return { ok: false, message: "Per un genitore scegli il figlio da collegare." };
    const { error } = await c.sb.rpc("scd_approve_access_request", {
      p_request_id: data.id,
      p_person_id: data.personId,
      p_role: data.role,
      p_child_person_id: data.childPersonId,
      p_note: data.note.trim() || null,
    });
    if (error) {
      if (error.code === "42501") return { ok: false, message: "Solo Direzione e Segreteria possono autorizzare." };
      if (error.message.includes("already reviewed")) return { ok: false, message: "Richiesta già gestita." };
      return { ok: false, message: "Autorizzazione non riuscita, riprova." };
    }
    return { ok: true, message: "Accesso attivato: la persona entra da \"Accedi\" con la sua e-mail." };
  });

export const rejectAccessRequest = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; note: string }) => z.object({ id: z.string().uuid(), note: z.string().max(300) }).parse(d))
  .handler(async ({ data }): Promise<{ ok: boolean; message: string }> => {
    const c = await office();
    if (!c) return { ok: false, message: "Accesso non valido." };
    const { error } = await c.sb.rpc("scd_reject_access_request", { p_request_id: data.id, p_note: data.note.trim() || null });
    if (error) return { ok: false, message: "Operazione non riuscita, riprova." };
    return { ok: true, message: "Richiesta rifiutata." };
  });
