/**
 * Self-registration on the server (r64).
 *   - submitAccessRequest: public; honeypot + per-IP limiter here, validation and global limit in the database;
 *   - office side (Direzione / Segreteria): list, candidate matches, approve (link or create person, login, role,
 *     optional child family), reject. Every call uses the caller's own session; the database checks the role.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { asOutcome, cleanPhone, createRateLimiter, validateAccessRequest, type RequestOutcome } from "./access-requests";
import { sessionView } from "./auth.functions";
import { clientIp } from "./request-ip.server";
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
    const ip = clientIp();
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

/* ------------------------------------------------------------- one person, many hats (UD-189, r121) */

const MultiInput = z.object({
  id: z.string().uuid(),
  personId: z.string().uuid().nullable(),
  mergeIds: z.array(z.string().uuid()).max(4),
  role: z.enum(["FAMILY", "ATHLETE", "MISTER", "MANAGER", "STAFF"]),
  positions: z
    .array(z.object({ code: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(80), teamCode: z.string().trim().max(40).nullable() }))
    .max(12),
  childIds: z.array(z.string().uuid()).max(8),
  note: z.string().max(300),
});
export type ApproveMultiInput = z.input<typeof MultiInput>;

/** A request the r64 approval alone can record: no merge, at most one child, no organigram position. */
export function simpleRequest(d: { mergeIds: readonly string[]; childIds: readonly string[]; positions: readonly unknown[] }): boolean {
  return d.mergeIds.length === 0 && d.childIds.length <= 1 && d.positions.length === 0;
}

/** Plain-words outcome of scd_approve_access_request_multi. */
export function multiOutcome(error: { code?: string | null; message?: string | null } | null): { ok: boolean; message: string } {
  if (!error) return { ok: true, message: "Accesso attivato con tutti i ruoli: la persona entra da \"Accedi\" con la sua e-mail." };
  const m = error.message ?? "";
  if (error.code === "PGRST202" || error.code === "42883") return { ok: false, message: "Più ruoli e unione schede non ancora attivi: serve «applica r121»." };
  if (/only Presidente or Direttore Generale/.test(m)) return { ok: false, message: "Le schede o i ruoli di Presidente e Direttore generale li gestiscono solo loro due." };
  if (/card is not the requester/.test(m)) return { ok: false, message: "Una scheda scelta è di un'altra persona (data di nascita diversa o atleta): forse è il figlio. Toglila e collegala come figlio." };
  if (/two different accounts/.test(m)) return { ok: false, message: "Le schede sono collegate a due account diversi: sono due persone, non si uniscono." };
  if (/minor card with an adult card/.test(m)) return { ok: false, message: "Una scheda è di un minorenne e l'altra può essere di un adulto: sono genitore e figlio, non si uniscono. Aggiungi prima la data di nascita." };
  if (/no birth date on either card/.test(m)) return { ok: false, message: "Nessuna delle due schede ha la data di nascita: aggiungila prima di unire." };
  if (/minor card with an account/.test(m)) return { ok: false, message: "Una scheda è di un minorenne: non si unisce alla scheda di un adulto con account." };
  if (/own card/.test(m)) return { ok: false, message: "Non puoi unire la tua stessa scheda: chiedi a un'altra persona della Direzione." };
  if (/only the Direzione moves/.test(m)) return { ok: false, message: "La scheda da unire ha sezioni dell'app aperte: l'unione la fa la Direzione." };
  if (/duplicate data/.test(m)) return { ok: false, message: "Le due schede hanno dati doppi: unione fermata, nulla è cambiato." };
  if (error.code === "42501") return { ok: false, message: "Solo Direzione e Segreteria possono autorizzare." };
  if (/already reviewed/.test(m)) return { ok: false, message: "Richiesta già gestita." };
  if (/different birth dates/.test(m)) return { ok: false, message: "Le schede da unire hanno date di nascita diverse: non sono la stessa persona, controlla." };
  if (/both cards are athletes/.test(m)) return { ok: false, message: "Tutte e due le schede sono atleti: unirle va fatto dalla Segreteria con i tesseramenti davanti." };
  if (/same section|same active consent|same tesseramento|same transport/.test(m)) return { ok: false, message: "Le due schede hanno dati doppi (permessi, consensi, tesseramenti o pulmini): unione fermata, nulla è cambiato." };
  if (/minor holds no organigram position/.test(m)) return { ok: false, message: "Un minorenne non ha cariche nell'organigramma." };
  if (/unknown position/.test(m)) return { ok: false, message: "Un ruolo scelto non è attivo nel catalogo: toglilo o fallo approvare." };
  if (/team not found/.test(m)) return { ok: false, message: "Squadra non trovata: scegli di nuovo." };
  if (/child not found|card not found|person not found/.test(m)) return { ok: false, message: "Una scheda scelta non esiste più: ricarica la pagina." };
  return { ok: false, message: "Autorizzazione non riuscita, riprova." };
}

export const approveAccessRequestMulti = createServerFn({ method: "POST" })
  .inputValidator((d: ApproveMultiInput) => MultiInput.parse(d))
  .handler(async ({ data }): Promise<{ ok: boolean; message: string }> => {
    const c = await office();
    if (!c) return { ok: false, message: "Accesso non valido." };
    if (data.role === "FAMILY" && data.childIds.length === 0) return { ok: false, message: "Per un genitore scegli almeno un figlio da collegare." };
    if (data.mergeIds.length && !data.personId) return { ok: false, message: "Scegli la scheda che resta." };
    // Team codes -> ids of this club (unknown code = refused, never guessed).
    const codes = [...new Set(data.positions.map((p) => p.teamCode).filter((x): x is string => !!x))];
    const teamId = new Map<string, string>();
    if (codes.length) {
      const { data: teams, error } = await c.sb.from("scd_teams").select("id,code").eq("organization_id", c.org.organizationId).in("code", codes);
      if (error) return { ok: false, message: "Squadre non lette, riprova." };
      for (const t of (teams ?? []) as Array<{ id: string; code: string }>) teamId.set(t.code, t.id);
      if (codes.some((x) => !teamId.has(x))) return { ok: false, message: "Squadra non trovata: scegli di nuovo." };
    }
    const { error } = await c.sb.rpc("scd_approve_access_request_multi", {
      p_request_id: data.id,
      p_person_id: data.personId,
      p_merge_ids: data.mergeIds,
      p_role: data.role,
      p_positions: data.positions.map((p) => (p.teamCode ? { code: p.code, teamId: teamId.get(p.teamCode) } : { code: p.code })),
      p_child_ids: data.childIds,
      p_note: data.note.trim() || null,
    });
    // Before "applica r121": a request with one card, at most one child and no organigram role still goes through
    // the r64 approval, so the office is never blocked; anything more waits for r121 and says so.
    if (error && (error.code === "PGRST202" || error.code === "42883") && simpleRequest(data)) {
      const v1 = await c.sb.rpc("scd_approve_access_request", {
        p_request_id: data.id,
        p_person_id: data.personId,
        p_role: data.role,
        p_child_person_id: data.childIds[0] ?? null,
        p_note: data.note.trim() || null,
      });
      return multiOutcome(v1.error);
    }
    return multiOutcome(error);
  });

/* ------------------------------------------- merge two cards of the same human outside a request (UD-189) */

export const mergePeopleCards = createServerFn({ method: "POST" })
  .inputValidator((d: { keepId: string; dropId: string; note: string }) =>
    z.object({ keepId: z.string().uuid(), dropId: z.string().uuid(), note: z.string().max(300) }).parse(d),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; message: string }> => {
    const c = await office();
    if (!c) return { ok: false, message: "Accesso non valido." };
    if (data.keepId === data.dropId) return { ok: false, message: "Scegli due schede diverse." };
    const { error } = await c.sb.rpc("scd_merge_people", { p_keep: data.keepId, p_drop: data.dropId, p_note: data.note.trim() || null });
    if (!error) return { ok: true, message: "Schede unite: ruoli, figli e documenti ora sono su una sola scheda." };
    if (/different birth dates/.test(error.message ?? "")) return { ok: false, message: "Date di nascita diverse: non sono la stessa persona." };
    if (/both cards are athletes/.test(error.message ?? "")) return { ok: false, message: "Tutte e due le schede sono atleti: unirle va fatto con i tesseramenti davanti." };
    return multiOutcome(error);
  });
