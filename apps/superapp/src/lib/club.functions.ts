import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { Club, FeedItem, FeedKind, Match, PublicFeed, SubmitOutcome } from "./club.types";
import { DEFAULT_PRIORITY, rankFeed } from "./priority";

/* ---------------- normalizzazione difensiva (nessun dato inventato) ---------------- */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = any;
const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : undefined);
const num = (v: unknown) => (typeof v === "number" ? v : typeof v === "string" && v !== "" && !isNaN(+v) ? +v : null);

function faviconFor(site?: string) {
  if (!site) return null;
  try {
    return `https://www.google.com/s2/favicons?sz=128&domain=${new URL(site).hostname}`;
  } catch {
    return null;
  }
}

export function normalizeClub(r: Raw): Club | null {
  const nome = str(r.nome) ?? str(r.name) ?? str(r.club);
  if (!nome) return null;
  const sito = str(r.sito) ?? str(r.website) ?? str(r.site);
  const logoDb = str(r.logo) ?? str(r.stemma) ?? str(r.logoUrl);
  const verified = logoDb ? r.logoVerified !== false && r.logo_verificato !== false : false;
  const fav = faviconFor(sito);
  return {
    id: str(r.id) ?? nome.toLowerCase().replace(/\W+/g, "-"),
    nome,
    citta: str(r.citta) ?? str(r.city) ?? str(r.comune),
    sito,
    social: str(r.social) ?? str(r.instagram) ?? str(r.facebook),
    maps: str(r.maps) ?? str(r.mapsUrl),
    logo: logoDb
      ? { url: logoDb, verified, source: "db" }
      : fav
        ? { url: fav, verified: false, source: "favicon" }
        : { url: null, verified: false, source: "none" },
  };
}

function normalizeMatch(r: Raw, clubs: Map<string, Club>): Match | null {
  const casa = str(r.casa) ?? str(r.home) ?? str(r.homeTeam);
  const ospite = str(r.ospite) ?? str(r.away) ?? str(r.awayTeam);
  if (!casa || !ospite) return null;
  const startAt = str(r.startAt) ?? str(r.dataOra) ?? str(r.date) ?? null;
  const avvName = /colico/i.test(casa) ? ospite : casa;
  return {
    id: str(r.id) ?? `${casa}-${ospite}-${startAt}`,
    competizione: str(r.competizione) ?? str(r.competition) ?? "",
    squadra: str(r.squadra) ?? str(r.team) ?? "Prima Squadra",
    casa,
    ospite,
    avversario: clubs.get(avvName.toLowerCase()) ?? undefined,
    startAt,
    dataLabel:
      str(r.dataLabel) ??
      (startAt && !isNaN(Date.parse(startAt))
        ? new Date(startAt).toLocaleString("it-IT", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Rome" })
        : (str(r.data) ?? "")),
    campo: str(r.campo) ?? str(r.venue),
    golCasa: num(r.golCasa ?? r.homeGoals),
    golOspite: num(r.golOspite ?? r.awayGoals),
    stats: {
      classifica: str(r.classifica) ?? str(r.standings),
      forma: str(r.forma) ?? str(r.form),
      precedenti: str(r.precedenti) ?? str(r.headToHead),
      live: r.live === true,
      ingressoUrl: str(r.ingressoUrl) ?? str(r.ticketsUrl),
    },
  };
}

const KINDS: FeedKind[] = ["alert", "match", "result", "event", "news", "sponsor", "community"];

function normalizeFeedItem(r: Raw, i: number): FeedItem | null {
  const title = str(r.title) ?? str(r.titolo);
  if (!title) return null;
  const kind = (KINDS.includes(r.kind as FeedKind) ? r.kind : KINDS.includes(r.tipo as FeedKind) ? r.tipo : "news") as FeedKind;
  const p = num(r.priority);
  const aud = Array.isArray(r.audience) ? (r.audience as FeedItem["audience"]) : ["public" as const];
  return {
    id: str(r.id) ?? `feed-${i}`,
    kind,
    title,
    body: str(r.body) ?? str(r.testo),
    image: str(r.image) ?? str(r.immagine),
    link: str(r.link) ?? str(r.url),
    source: str(r.source) ?? str(r.fonte),
    venue: str(r.venue) ?? str(r.luogo) ?? str(r.campo),
    category: str(r.category) ?? str(r.categoria),
    priority: (p && p >= 1 && p <= 7 ? p : DEFAULT_PRIORITY[kind]) as FeedItem["priority"],
    priorityScore: num(r.priorityScore) ?? 0,
    startAt: str(r.startAt) ?? null,
    endAt: str(r.endAt) ?? null,
    pinned: r.pinned === true || r.pinned === "TRUE",
    audience: aud,
  };
}

const asList = (v: unknown): Raw[] =>
  Array.isArray(v) ? (v as Raw[]) : v && typeof v === "object" && Array.isArray((v as Raw).items) ? ((v as Raw).items as Raw[]) : [];

/* ---------------- letture pubbliche ---------------- */

export const getPublicFeed = createServerFn({ method: "GET" }).handler(async (): Promise<PublicFeed> => {
  const { r20 } = await import("./appsscript.server");
  const [feed, match, club] = await Promise.all([
    r20.call<unknown>("public.feed"),
    r20.call<unknown>("public.match"),
    r20.call<unknown>("public.club"),
  ]);
  const clubs = new Map<string, Club>();
  if (club.ok) for (const c of asList(club.data).map(normalizeClub)) if (c) clubs.set(c.nome.toLowerCase(), c);

  const items = feed.ok ? asList(feed.data).map(normalizeFeedItem).filter((x): x is FeedItem => !!x) : [];
  let nextMatch: Match | null = null;
  let lastResult: Match | null = null;
  if (match.ok && match.data && typeof match.data === "object") {
    const m = match.data as Raw;
    nextMatch = m.next ? normalizeMatch(m.next as Raw, clubs) : m.prossima ? normalizeMatch(m.prossima as Raw, clubs) : null;
    lastResult = m.last ? normalizeMatch(m.last as Raw, clubs) : m.ultimo ? normalizeMatch(m.ultimo as Raw, clubs) : null;
  }
  const live = feed.ok || match.ok;
  return {
    state: live ? "live" : "syncing",
    items: rankFeed(items),
    nextMatch,
    lastResult,
    syncedAt: new Date().toISOString(),
    note: live ? null : "Gestionale R20 non raggiungibile in formato JSON: dati in sincronizzazione.",
  };
});

export const getClubDirectory = createServerFn({ method: "GET" }).handler(async () => {
  const { r20 } = await import("./appsscript.server");
  const res = await r20.call<unknown>("public.club");
  const clubs = res.ok ? asList(res.data).map(normalizeClub).filter((c): c is Club => !!c) : [];
  return { state: res.ok ? ("live" as const) : ("syncing" as const), clubs };
});

/** Calendario e iniziative sono azioni R20 pianificate: nessun contenuto inventato in assenza di JSON. */
export const getPublicSchedule = createServerFn({ method: "GET" }).handler(async () => {
  const { r20 } = await import("./appsscript.server");
  const [calendar, initiatives] = await Promise.all([
    r20.planned<unknown>("public.calendar"),
    r20.planned<unknown>("public.initiatives"),
  ]);
  const matches = calendar.ok ? asList(calendar.data).map((r) => normalizeMatch(r, new Map())).filter((m): m is Match => !!m) : [];
  const items = initiatives.ok ? asList(initiatives.data).map(normalizeFeedItem).filter((i): i is FeedItem => !!i && i.audience.includes("public")) : [];
  return { matches, items, calendarLive: calendar.ok, initiativesLive: initiatives.ok };
});

/* ---------------- invii (lead, ticket, community) ---------------- */

async function submitPlanned(
  action: "public.registration" | "public.partnerLead" | "public.communitySubmit" | "public.ticketSubmit",
  payload: Record<string, unknown>,
  initialStatus: string,
): Promise<SubmitOutcome> {
  const { r20 } = await import("./appsscript.server");
  const res = await r20.planned<{ id?: string; reference?: string; status?: string }>(action, payload);
  if (res.ok) {
    return {
      ok: true,
      delivered: true,
      reference: res.data?.reference ?? res.data?.id ?? null,
      status: res.data?.status ?? initialStatus,
      message: "Richiesta ricevuta dalla società. Ti ricontatteremo.",
    };
  }
  return {
    ok: false,
    delivered: false,
    reference: null,
    status: "non_inviata",
    message:
      "Il modulo è pronto ma il canale verso la segreteria non è ancora attivo sul gestionale. La richiesta NON è stata salvata: per ora scrivici via email.",
  };
}

const phone = z.string().trim().min(6, "Telefono non valido").max(30);
const privacy = z.literal(true, { errorMap: () => ({ message: "Consenso privacy obbligatorio" }) });

export const registrationSchema = z
  .object({
    interesse: z.string().min(2),
    annata: z.string().trim().max(10).optional().default(""),
    nome: z.string().trim().min(2).max(60),
    cognome: z.string().trim().min(2).max(60),
    dataNascita: z.string().min(8, "Data di nascita richiesta"),
    comune: z.string().trim().min(2).max(80),
    genitore: z.string().trim().max(120).optional().default(""),
    email: z.string().trim().email().max(160),
    telefono: phone,
    esperienza: z.string().trim().max(600).optional().default(""),
    prova: z.boolean().default(false),
    privacy,
  })
  .refine(
    (d) => {
      const age = (Date.now() - Date.parse(d.dataNascita)) / 31_557_600_000;
      return age >= 18 || d.genitore.length >= 3;
    },
    { message: "Per i minori serve il contatto del genitore", path: ["genitore"] },
  );

export const submitRegistration = createServerFn({ method: "POST" })
  .inputValidator((d: z.input<typeof registrationSchema>) => registrationSchema.parse(d))
  .handler(({ data }) => submitPlanned("public.registration", { ...data, status: "ricevuta" }, "ricevuta"));

export const partnerLeadSchema = z.object({
  tipo: z.enum(["sponsor", "fornitore"]),
  azienda: z.string().trim().min(2).max(120),
  referente: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(160),
  telefono: phone,
  settore: z.string().max(80),
  budget: z.string().max(40).optional().default(""),
  interessi: z.array(z.string().max(40)).max(20).default([]),
  messaggio: z.string().trim().max(1500).optional().default(""),
  privacy,
});

export const submitPartnerLead = createServerFn({ method: "POST" })
  .inputValidator((d: z.input<typeof partnerLeadSchema>) => partnerLeadSchema.parse(d))
  .handler(({ data }) => submitPlanned("public.partnerLead", { ...data, stage: "NUOVO_LEAD" }, "NUOVO_LEAD"));

export const ticketSchema = z.object({
  categoria: z.enum(["notizia", "media", "correzione", "evento", "collaborazione", "tecnico", "reclamo"]),
  nome: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(160),
  oggetto: z.string().trim().min(3).max(160),
  messaggio: z.string().trim().min(10).max(3000),
  link: z.string().trim().url().max(500).optional().or(z.literal("")),
  privacy,
});

export const submitTicket = createServerFn({ method: "POST" })
  .inputValidator((d: z.input<typeof ticketSchema>) => ticketSchema.parse(d))
  .handler(({ data }) => submitPlanned("public.ticketSubmit", { ...data, status: "aperto" }, "aperto"));

export const communitySchema = z.object({
  tipo: z.enum(["messaggio", "foto", "storia", "voto", "pronostico"]),
  nome: z.string().trim().min(2).max(80),
  testo: z.string().trim().max(1000).optional().default(""),
  link: z.string().trim().max(500).optional().default(""),
  riferimento: z.string().trim().max(120).optional().default(""),
});

export const submitCommunity = createServerFn({ method: "POST" })
  .inputValidator((d: z.input<typeof communitySchema>) => communitySchema.parse(d))
  .handler(({ data }) =>
    submitPlanned("public.communitySubmit", { ...data, moderation: "in_attesa" }, "in_moderazione"),
  );
