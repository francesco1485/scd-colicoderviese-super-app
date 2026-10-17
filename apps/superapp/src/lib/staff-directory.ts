/**
 * Rubrica staff (UD-167, Francesco 17/10/2026 11:11-11:13, «applica»). Pure shapes and rules shared by the server
 * functions (staff-directory.functions.ts), the pages (/gestionale/rubrica, /famiglia, /la-mia-scd) and Iride
 * (assistant.server.ts). The ONLY source is the database function scd_staff_directory (migration r141): it already
 * applies rule 1 (who sees whom) and rule 3 (a number only with the person's consent). Nothing here widens it:
 *   - no list of names lives in the code; names, roles and teams arrive from the organigram registry;
 *   - a phone is shown only when the database sent it; Iride never asks the model for a number;
 *   - minors are never in the directory (the database drops them); this module drops any row it cannot read.
 *
 * Engines: PERSONE (families and staff reach the right person) and TEMPO (the Segreteria stops being the phone
 * book). Measure: share of active staff with an answered consent (target 80% in 30 days) and share of Iride contact
 * questions closed without a Segreteria hand-off ("staff-contact" outcome in the assistant logs).
 */
import { z } from "zod";

import type { SkyReply } from "./sky.functions";

/** Club-level responsibles every mister sees. Mirror of scd_staff_club_areas() in r141 (a test keeps them equal). */
export const STAFF_CLUB_AREAS = ["pulmini", "campi", "magazzino", "palestra", "segreteria"] as const;

export const AREA_LABEL: Readonly<Record<string, string>> = {
  pulmini: "Pulmini",
  campi: "Campi e struttura",
  magazzino: "Magazzino",
  palestra: "Palestra",
  segreteria: "Segreteria",
  direzione: "Direzione",
  tesoreria: "Tesoreria",
  biglietteria: "Biglietteria",
  "club-house": "Club House",
  infermeria: "Infermeria",
  safeguarding: "Tutela minori",
  "coordinamento-sportivo": "Coordinamento sportivo",
  "attivita-base": "Attività di base",
  "area-tecnica": "Area tecnica",
  "settore-giovanile": "Settore giovanile",
  arbitri: "Arbitri",
  calendari: "Calendari e rotazione campi",
  sponsor: "Sponsor e stampa",
  tornei: "Eventi e tornei",
  acquisti: "Acquisti",
  affiliazioni: "Rapporti e affiliazioni",
  comunicazione: "Comunicazione",
  pulizie: "Pulizie e lavanderia",
};

export type StaffViewer = "OFFICE" | "STAFF" | "FAMILY";
export type PhoneState = "SHARED" | "NOT_SHARED" | "NO_NUMBER";

export interface StaffRole {
  label: string;
  kind: string;
  teamCode: string | null;
  teamName: string | null;
  area: string | null;
  needsReview: boolean;
}

export interface StaffEntry {
  personId: string;
  name: string;
  roles: StaffRole[];
  phoneState: PhoneState;
  /** Present only when the database allowed it (rule 1 + consent + adult caller). */
  phone: string | null;
}

export interface StaffMe {
  personId: string;
  /** null = not answered yet (treated as NO). */
  consent: boolean | null;
  consentAt: string | null;
  hasPhone: boolean;
}

export interface StaffDirectory {
  viewer: StaffViewer;
  callerAdult: boolean;
  people: StaffEntry[];
  me: StaffMe | null;
}

const roleSchema = z.object({
  label: z.string().min(1).max(200),
  kind: z.string().min(1).max(40),
  teamCode: z.string().max(40).nullable().optional(),
  teamName: z.string().max(120).nullable().optional(),
  area: z.string().max(60).nullable().optional(),
  needsReview: z.boolean().optional(),
});
const entrySchema = z.object({
  personId: z.string().uuid(),
  name: z.string().min(1).max(160),
  roles: z.array(roleSchema).max(30),
  phoneState: z.enum(["SHARED", "NOT_SHARED", "NO_NUMBER"]),
  phone: z.string().max(40).nullable().optional(),
});
const meSchema = z
  .object({ personId: z.string().uuid(), consent: z.boolean().nullable().optional(), consentAt: z.string().nullable().optional(), hasPhone: z.boolean().optional() })
  .nullable()
  .optional();

/** Reads the r141 RPC output; null for anything unreadable (the page then says "non disponibile"). */
export function parseStaffDirectory(raw: unknown): StaffDirectory | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const viewer = z.enum(["OFFICE", "STAFF", "FAMILY"]).safeParse(o["viewer"]);
  if (!viewer.success) return null;
  const people: StaffEntry[] = [];
  for (const p of Array.isArray(o["people"]) ? o["people"] : []) {
    const r = entrySchema.safeParse(p);
    if (!r.success) continue;
    const phone = r.data.phoneState === "SHARED" ? (r.data.phone ?? null) : null;
    people.push({
      personId: r.data.personId,
      name: r.data.name,
      roles: r.data.roles.map((x) => ({ label: x.label, kind: x.kind, teamCode: x.teamCode ?? null, teamName: x.teamName ?? null, area: x.area ?? null, needsReview: x.needsReview === true })),
      phoneState: phone ? "SHARED" : r.data.phoneState === "SHARED" ? "NO_NUMBER" : r.data.phoneState,
      phone,
    });
  }
  const me = meSchema.safeParse(o["me"]);
  return {
    viewer: viewer.data,
    callerAdult: o["callerAdult"] === true,
    people,
    me: me.success && me.data ? { personId: me.data.personId, consent: me.data.consent ?? null, consentAt: me.data.consentAt ?? null, hasPhone: me.data.hasPhone === true } : null,
  };
}

/* ------------------------------------------------------------------ groups for the page */

export interface StaffGroup {
  id: string;
  title: string;
  rows: Array<{ entry: StaffEntry; roles: StaffRole[] }>;
}

/** Teams first (by team name), then the club areas (by label). A person appears in each group of his roles. */
export function groupStaff(people: readonly StaffEntry[]): StaffGroup[] {
  const groups = new Map<string, StaffGroup>();
  for (const e of people) {
    for (const r of e.roles) {
      const id = r.teamCode ? `team:${r.teamCode}` : `area:${r.area ?? "societa"}`;
      const title = r.teamCode ? (r.teamName ?? r.teamCode) : (AREA_LABEL[r.area ?? ""] ?? "Società");
      const g = groups.get(id) ?? { id, title, rows: [] };
      const row = g.rows.find((x) => x.entry.personId === e.personId);
      if (row) row.roles.push(r);
      else g.rows.push({ entry: e, roles: [r] });
      groups.set(id, g);
    }
  }
  return [...groups.values()].sort((a, b) => {
    const ta = a.id.startsWith("team:") ? 0 : 1;
    const tb = b.id.startsWith("team:") ? 0 : 1;
    return ta - tb || a.title.localeCompare(b.title, "it");
  });
}

/** "tel:" target with digits and a leading + only; null when nothing dialable is left. */
export function telHref(phone: string | null): string | null {
  if (!phone) return null;
  const plus = phone.trim().startsWith("+") ? "+" : "";
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 6 ? `tel:${plus}${digits}` : null;
}

export function consentLabel(me: StaffMe | null): string {
  if (!me) return "";
  if (me.consent === true) return "Il tuo numero è visibile alle famiglie e allo staff delle tue squadre.";
  if (me.consent === false) return "Il tuo numero non è condiviso: Iride inoltra i messaggi alla Segreteria.";
  return "Non hai ancora risposto: finché non scegli, il tuo numero non è condiviso.";
}

/* ------------------------------------------------------------------ Iride: who does what */

/** Short role line: "Mister · U15", "Responsabile servizio pulmini". */
export function roleLine(r: StaffRole): string {
  const where = r.teamName ?? r.teamCode;
  return `${r.label}${where ? ` · ${where}` : ""}${r.needsReview ? " (da confermare)" : ""}`;
}

/** Lines for the model CONTEXT: names, roles and teams only. Numbers NEVER go to the model. */
export function directoryContextLines(d: StaffDirectory | null, max = 60): string[] {
  if (!d) return [];
  return d.people.slice(0, max).map((e) => `${e.name}: ${e.roles.map(roleLine).join("; ")}`);
}

const CONTACT_RE = /\b(numer[oi]|telefon\w*|cellulare|cell|chiamar\w*|contatt\w*|whatsapp|recapit\w*)\b/i;
const WHO_RE = /\b(chi\s+(?:è|e'|e|sono|fa|segue|allena|guida|si occupa)|come\s+(?:si chiama|contatto|raggiungo))(?=[\s?.,!]|$)/i;
const ROLE_WORDS = /\b(mister|allenator\w*|vice|secondo|dirigent\w*|accompagnator\w*|preparator\w*|team manager|responsabil\w*|segreteri\w*|pulmin\w*|autist\w*|magazzin\w*|palestr\w*|camp[oi]|tesoreri\w*|direttor\w*|president\w*|massaggiator\w*|coordinator\w*)\b/i;

/** "qual è il numero del mister dell'U15?", "chi è il responsabile dei pulmini?" */
export function isStaffContactQuestion(message: string): boolean {
  const m = message.toLowerCase();
  return (CONTACT_RE.test(m) && (ROLE_WORDS.test(m) || /\b(staff|squadra|u\d{2}|pulcini|esordienti|primi calci|piccoli amici|juniores|prima squadra)\b/.test(m))) || (WHO_RE.test(m) && ROLE_WORDS.test(m));
}

export function wantsNumber(message: string): boolean {
  return /\b(numer[oi]|telefon\w*|cellulare|cell|chiamar\w*|whatsapp)\b/i.test(message);
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Team words people use -> team codes of the registry. */
const TEAM_ALIASES: ReadonlyArray<{ re: RegExp; codes: readonly string[] }> = [
  { re: /\bprima squadra\b/, codes: ["prima"] },
  { re: /\bjuniores\b|\bu ?19\b/, codes: ["u19"] },
  { re: /\bu ?16\b|\ballievi\b/, codes: ["u16"] },
  { re: /\bu ?15\b|\bgiovanissimi\b/, codes: ["u15"] },
  { re: /\b2014\b|\bu ?13\b/, codes: ["2014"] },
  { re: /\b2015\b|\bu ?12\b/, codes: ["2015"] },
  { re: /\bpulcini\b|\bu ?1[01]\b/, codes: ["pulcini"] },
  { re: /\bprimi calci\b/, codes: ["primicalci"] },
  { re: /\bpiccoli amici\b/, codes: ["piccoliamici"] },
];

const AREA_ALIASES: ReadonlyArray<{ re: RegExp; area: string }> = [
  { re: /\bpulmin|\bautist|\btrasport/, area: "pulmini" },
  { re: /\bcamp[oi]\b|\bmanutenzion|\bstruttura\b/, area: "campi" },
  { re: /\bmagazzin|\bkit\b|\bdivis/, area: "magazzino" },
  { re: /\bpalestr/, area: "palestra" },
  { re: /\bsegreteri/, area: "segreteria" },
  { re: /\btesoreri|\bquot[ae]\b/, area: "tesoreria" },
  { re: /\bdirezion|\bpresident|\bdirettore generale\b/, area: "direzione" },
];

const KIND_ALIASES: ReadonlyArray<{ re: RegExp; test: (r: StaffRole) => boolean }> = [
  { re: /\b(vice|secondo)\b/, test: (r) => /secondo|vice/i.test(r.label) },
  { re: /\b(mister|allenator\w*)\b/, test: (r) => r.kind === "MISTER" && !/secondo|vice/i.test(r.label) },
  { re: /\b(dirigent\w*|accompagnator\w*|team manager)\b/, test: (r) => r.kind === "DIRIGENTE" },
  { re: /\bpreparator\w*\b/, test: (r) => /preparator/i.test(r.label) },
];

/** People of the directory the message is about: by name first, then team + role kind, then club area. */
export function findStaff(message: string, d: StaffDirectory): StaffEntry[] {
  const m = ` ${norm(message)} `;
  const byName = d.people.filter((e) =>
    norm(e.name)
      .split(" ")
      .filter((w) => w.length >= 4)
      .some((w) => m.includes(` ${w} `)),
  );
  if (byName.length) return byName.slice(0, 3);
  const codes = new Set(TEAM_ALIASES.filter((a) => a.re.test(m)).flatMap((a) => a.codes));
  const kinds = KIND_ALIASES.filter((k) => k.re.test(m));
  if (codes.size) {
    const hits = d.people.filter((e) => e.roles.some((r) => r.teamCode && codes.has(r.teamCode) && (kinds.length === 0 || kinds.some((k) => k.test(r)))));
    if (hits.length) return hits.slice(0, 4);
  }
  const areas = new Set(AREA_ALIASES.filter((a) => a.re.test(m)).map((a) => a.area));
  if (areas.size) {
    const hits = d.people.filter((e) => e.roles.some((r) => !r.teamCode && r.area && areas.has(r.area) && (kinds.length === 0 || kinds.some((k) => k.test(r)) || /responsabil/.test(m))));
    if (hits.length) return hits.slice(0, 4);
  }
  return [];
}

const HANDOFF_LINK = { label: "Scrivi alla Segreteria", to: "/contatti" } as const;

/**
 * Iride's answer to "who / number of ..." questions: deterministic, from the directory only. A number appears only if
 * the database sent it; otherwise Iride hands the message over to the Segreteria (UD-167 rule 2). Never invents.
 */
export function staffContactReply(message: string, d: StaffDirectory | null): SkyReply {
  if (!d) {
    return {
      text: "I contatti dello staff li vedo solo con un accesso verificato della società. Intanto posso passare il tuo messaggio alla Segreteria.",
      mood: "info",
      links: [HANDOFF_LINK],
    };
  }
  const hits = findStaff(message, d);
  const number = wantsNumber(message);
  if (hits.length === 0) {
    return {
      text: "Non trovo questa persona tra i contatti che puoi vedere. Scrivi alla Segreteria: inoltra il messaggio alla persona giusta.",
      mood: "info",
      links: [HANDOFF_LINK],
    };
  }
  const lines = hits.map((e) => {
    const roles = e.roles.map(roleLine).join("; ");
    if (!number) return `${e.name}: ${roles}.`;
    if (e.phone) return `${e.name} (${roles}): ${e.phone}.`;
    return `${e.name} (${roles}): il numero non è condiviso.`;
  });
  const missing = number && hits.some((e) => !e.phone);
  const tail = missing ? " Per chi non ha condiviso il numero scrivi alla Segreteria: inoltra il messaggio." : "";
  return {
    text: `${lines.join(" ")}${tail}`,
    mood: "info",
    ...(missing ? { links: [HANDOFF_LINK] } : {}),
  };
}
