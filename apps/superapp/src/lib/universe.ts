/**
 * SCD Universe: logica pura della home pubblica (barra annate, stato della giornata, filtri, consenso cookie).
 * Nessuna rete, nessun DOM: testata in universe.test.ts.
 */
import type { PublicGroup } from "./public-snapshots";
import { romeToIso, type WeekItem } from "./home-week";

/* --------------------------------------------------------------- annate */

/** Ordine per età, dalla Prima Squadra ai Piccoli Amici (id dei gruppi del Master Calendario). */
export const AGE_ORDER = [
  "prima",
  "u19",
  "u16",
  "u15",
  "2014",
  "2015",
  "pulcini",
  "primicalci",
  "piccoli",
  "esordienti",
] as const;

/** Gruppi tecnici che non sono una squadra da scegliere. */
const NOT_A_TEAM = new Set(["other"]);

export type Team = {
  id: string;
  label: string;
  short: string;
  code: string;
  color: string;
  group: "agonistica" | "base";
};

const AGONISTICA = new Set(["prima", "u19", "u16", "u15"]);

/** Sigla breve e nome corto dell'annata, ricavati solo dall'etichetta del master (niente dati inventati). */
export function teamFromGroup(
  g: Pick<PublicGroup, "id" | "label" | "color">,
): Team {
  const label = g.label;
  let short = label.split("·")[0]!.trim();
  let code = short.slice(0, 3).toUpperCase();
  if (/prima squadra/i.test(label)) {
    short = "Prima";
    code = "1ª";
  } else if (/juniores/i.test(label)) {
    short = "U19";
    code = "U19";
  } else {
    const u = label.match(/\bU(\d{2})\b/);
    const year = label.match(/(?<!\d)20[0-2]\d(?!\d)/);
    if (u) {
      short = `U${u[1]}`;
      code = `U${u[1]}`;
    } else if (/esordienti/i.test(label) && year) {
      short = `Esordienti ${year[0]}`;
      code = `E${year[0].slice(2)}`;
    } else if (/esordienti/i.test(label)) {
      short = "Esordienti";
      code = "ES";
    } else if (/pulcini/i.test(label)) {
      short = "Pulcini";
      code = "PUL";
    } else if (/primi calci/i.test(label)) {
      short = "Primi Calci";
      code = "PC";
    } else if (/piccoli amici/i.test(label)) {
      short = "Piccoli Amici";
      code = "PA";
    }
  }
  return {
    id: g.id,
    label,
    short,
    code,
    color: g.color,
    group: AGONISTICA.has(g.id) ? "agonistica" : "base",
  };
}

/** Annate da mostrare nella barra: per età, quelle seguite per prime. */
export function orderTeams(
  groups: readonly Pick<PublicGroup, "id" | "label" | "color">[],
  follow: readonly string[] = [],
): Team[] {
  const rank = (id: string) => {
    const i = (AGE_ORDER as readonly string[]).indexOf(id);
    return i < 0 ? 99 : i;
  };
  return groups
    .filter((g) => !NOT_A_TEAM.has(g.id))
    .map(teamFromGroup)
    .sort(
      (a, b) =>
        Number(follow.includes(b.id)) - Number(follow.includes(a.id)) ||
        rank(a.id) - rank(b.id),
    );
}

/** "all" = tutte, "mine" = solo quelle seguite, altrimenti l'id di un'annata. */
export type Selection = "all" | "mine" | string;

export function inSelection(
  item: Pick<WeekItem, "group">,
  sel: Selection,
  follow: readonly string[],
): boolean {
  if (sel === "all") return true;
  if (sel === "mine") return follow.includes(item.group);
  return item.group === sel;
}

/* ------------------------------------------------------- stato della giornata */

/** Durata convenzionale di una gara per lo stato "in corso" (minuti). */
export const MATCH_MINUTES = 105;

export type ItemState = "next" | "live" | "done" | "unknown";

/** Inizio della voce in ms; null se manca l'orario (UNKNOWN non è zero). */
export function startMs(item: Pick<WeekItem, "date" | "time">): number | null {
  if (!item.time || !/^\d{2}:\d{2}$/.test(item.time)) return null;
  return Date.parse(romeToIso(item.date, item.time));
}

export function itemState(
  item: Pick<WeekItem, "date" | "time">,
  nowMs: number,
): ItemState {
  const s = startMs(item);
  if (s === null) return "unknown";
  if (nowMs < s) return "next";
  return nowMs - s < MATCH_MINUTES * 60_000 ? "live" : "done";
}

export type HomeMode = "settimana" | "vigilia" | "live" | "dopo";

/**
 * Stato della home, deciso dal calendario reale: gara in corso, appena finita (fino a 90 minuti dopo il fischio),
 * vigilia (prossimo calcio d'inizio entro 36 ore) o settimana di allenamenti.
 */
export function homeMode(
  items: readonly Pick<WeekItem, "date" | "time" | "kind">[],
  nowMs: number,
): HomeMode {
  const games = items.filter((i) => i.kind === "Gara");
  if (games.some((g) => itemState(g, nowMs) === "live")) return "live";
  const ended = games
    .map((g) => startMs(g))
    .filter(
      (s): s is number => s !== null && nowMs - s >= MATCH_MINUTES * 60_000,
    );
  if (ended.some((s) => nowMs - s < (MATCH_MINUTES + 90) * 60_000))
    return "dopo";
  const nextStarts = games
    .map((g) => startMs(g))
    .filter((s): s is number => s !== null && s > nowMs);
  if (nextStarts.some((s) => s - nowMs < 36 * 3_600_000)) return "vigilia";
  return "settimana";
}

/** Conto alla rovescia "hh:mm:ss" (ore oltre 24 comprese); null se già iniziata. */
export function countdown(targetMs: number, nowMs: number): string | null {
  const dt = targetMs - nowMs;
  if (dt <= 0) return null;
  const h = Math.floor(dt / 3_600_000),
    m = Math.floor((dt % 3_600_000) / 60_000),
    s = Math.floor((dt % 60_000) / 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(h)}:${p(m)}:${p(s)}`;
}

/* ----------------------------------------------------------- consenso cookie */

export type Consent = { v: 1; stats: boolean; mkt: boolean; ts: string };
export const CONSENT_KEY = "scd-consent";

export function parseConsent(raw: string | null): Consent | null {
  if (!raw) return null;
  try {
    const c = JSON.parse(raw);
    if (
      c &&
      c.v === 1 &&
      typeof c.stats === "boolean" &&
      typeof c.mkt === "boolean" &&
      typeof c.ts === "string"
    )
      return c as Consent;
  } catch {
    /* valore corrotto: si richiede di nuovo il consenso */
  }
  return null;
}

/** Aree dove i pixel di marketing non devono mai partire: riservate, staff, minori, safeguarding. */
const NO_MARKETING = /^\/(aree|core|safeguarding|entra|contatti)(\/|$)/;

/** I pixel Meta/TikTok si caricano solo con consenso marketing e solo nelle pagine pubbliche. */
export function marketingAllowed(c: Consent | null, pathname: string): boolean {
  return !!c?.mkt && !NO_MARKETING.test(pathname);
}
