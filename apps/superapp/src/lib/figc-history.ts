/**
 * "Storia dei calciatori" (r131): pure rules over the FIGC/LND portal data — the season tabulati
 * (Dilettanti D, Settore Giovanile S) and the per-player "Storico calciatore".
 *
 * Engines: PERSONE (who stays, who comes back, who arrives, who left and can be called back) and
 * TEMPO (the Segreteria no longer rebuilds the picture by hand from the portal pages).
 *
 * Flow: the Segreteria runs the export script (figc-export-script.ts) in its own logged-in portal
 * session and downloads a JSON file; `parseExportFile` validates it and turns it into the rows of
 * `scd_figc_roster` / `scd_figc_career`; `computeHistory` builds every view of /segreteria/storia
 * from the rows read back from the database.
 *
 * Minimisation: only the birth YEAR leaves this module (the birth date of the file is dropped),
 * fiscal codes are rejected at the schema, and every name shown is "Nome C." (first name + surname
 * initial). Unknown stays null ("—"), never 0.
 *
 * Name split: the portal writes "COGNOME NOME" without a separator, so a compound surname or a
 * double first name cannot be told apart. Rule: last_name = every token but the last, first_name =
 * the last token ("ROSSI BIANCHI MARIO" → ROSSI BIANCHI / MARIO; "ROSSI MARIO LUCA" → ROSSI MARIO /
 * LUCA). The imperfection only affects the display "Luca R." and the name match used to link a
 * person, which links only when exactly one person has the same name AND birth year.
 */
import { z } from "zod";

/** FIGC code of S.C.D. ColicoDerviese on the LND portal (given by the club, 2026-10-15). */
export const OWN_CLUB_CODE = "26020";

export const MAX_EXPORT_BYTES = 3_000_000;
export const MAX_ROSTER_ROWS = 2000;
export const MAX_CAREER_ROWS = 20000;

export type Sector = "D" | "S";
export const SECTOR_LABEL: Readonly<Record<Sector, string>> = { D: "Dilettanti", S: "Settore giovanile (SGS)" };
export const SECTOR_SHORT: Readonly<Record<Sector, string>> = { D: "Dilettanti", S: "SGS" };

/* ------------------------------------------------------------------ seasons */

const SEASON_RE = /^(\d{4})\/(\d{4})$/;

/** "2025/2026" with consecutive years. */
export function isSeason(s: string): boolean {
  const m = SEASON_RE.exec(s);
  return Boolean(m && Number(m[2]) === Number(m[1]) + 1);
}

export function prevSeason(s: string): string {
  const m = SEASON_RE.exec(s);
  if (!m) throw new Error(`invalid season ${s}`);
  return `${Number(m[1]) - 1}/${Number(m[1])}`;
}

export function nextSeason(s: string): string {
  const m = SEASON_RE.exec(s);
  if (!m) throw new Error(`invalid season ${s}`);
  return `${Number(m[2])}/${Number(m[2]) + 1}`;
}

/** Football season of an ISO date: a season starts on 1 July. */
export function seasonOf(isoDate: string): string {
  const y = Number(isoDate.slice(0, 4));
  const mo = Number(isoDate.slice(5, 7));
  return mo >= 7 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
}

export function compareSeasons(a: string, b: string): number {
  return a.localeCompare(b);
}

/** "2025/2026" → "2025/26" for compact tables. */
export function shortSeason(s: string): string {
  const m = SEASON_RE.exec(s);
  return m ? `${m[1]}/${m[2]!.slice(2)}` : s;
}

/* ------------------------------------------------------------------ export file */

const DMY_RE = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const seasonSchema = z.string().refine(isSeason, "stagione non valida (es. 2025/2026)");
const matricolaSchema = z.string().regex(/^\d{5,8}$/, "matricola FIGC non valida");
const dmyOrEmpty = z.union([z.string().regex(DMY_RE), z.literal(""), z.null()]);

export const exportRosterSchema = z
  .object({
    matricola: matricolaSchema,
    name: z.string().trim().min(2).max(120),
    birth_date: dmyOrEmpty,
    sector: z.enum(["D", "S"]),
    season: seasonSchema,
  })
  .strict();

export const exportCareerSchema = z
  .object({
    matricola: matricolaSchema,
    season: seasonSchema,
    movement: z.string().trim().min(2).max(140),
    club: z.string().trim().min(1).max(180),
    status: z.union([z.string().max(80), z.null()]),
    date: dmyOrEmpty,
    note: z.union([z.string().max(300), z.null()]),
  })
  .strict();

/** The JSON file produced by the portal export script (version 1). Unknown keys are refused (no fiscal code can slip in). */
export const exportFileSchema = z
  .object({
    kind: z.literal("scd-figc-export"),
    version: z.literal(1),
    club_code: z.string().regex(/^\d{1,10}$/),
    season: seasonSchema,
    read_at: z.string().datetime({ offset: true }),
    roster: z.array(exportRosterSchema).max(MAX_ROSTER_ROWS),
    career: z.array(exportCareerSchema).max(MAX_CAREER_ROWS),
  })
  .strict();

export type ExportFile = z.infer<typeof exportFileSchema>;

/** Row of public.scd_figc_roster as sent to scd_figc_history_import. */
export interface RosterRow {
  season: string;
  matricola: string;
  sector: Sector;
  last_name: string;
  first_name: string;
  birth_year: number | null;
}

/** Row of public.scd_figc_career as sent to scd_figc_history_import. */
export interface CareerRow {
  matricola: string;
  season: string;
  movement_code: string;
  movement_label: string;
  club_code: string;
  club_name: string;
  is_own_club: boolean;
  status_code: string | null;
  event_date: string | null;
  release_code: string | null;
  release_date: string | null;
}

export interface ParsedImport {
  readAt: string;
  season: string;
  roster: RosterRow[];
  career: CareerRow[];
  /** Rows skipped because a field could not be read (counted, never guessed). */
  skipped: number;
  players: number;
}

export type ParseResult = { ok: true; data: ParsedImport } | { ok: false; error: string };

const clean = (s: string) => s.replace(/\s+/g, " ").trim();

/** "dd/mm/yyyy" → "yyyy-mm-dd" (calendar-checked), else null. */
export function dmyToIso(s: string | null | undefined): string | null {
  const m = s ? DMY_RE.exec(s.trim()) : null;
  if (!m) return null;
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

/** Birth year from "dd/mm/yyyy" (the only part kept). */
export function birthYearOf(dmy: string | null | undefined): number | null {
  const iso = dmyToIso(dmy);
  if (!iso) return null;
  const y = Number(iso.slice(0, 4));
  return y >= 1900 && y <= 2100 ? y : null;
}

/** "COGNOME NOME" → surname = all tokens but the last, first name = last token (see the header). */
export function splitName(full: string): { lastName: string; firstName: string } {
  const tokens = clean(full).split(" ").filter(Boolean);
  if (tokens.length <= 1) return { lastName: tokens[0] ?? "", firstName: "" };
  return { lastName: tokens.slice(0, -1).join(" "), firstName: tokens[tokens.length - 1]! };
}

/** "AG AGGIORNAMENTO DI POSIZIONE" → { code: "AG", label: "AGGIORNAMENTO DI POSIZIONE" }. */
export function parseMovement(s: string): { code: string; label: string } | null {
  const m = /^([A-Z0-9]{2})(?:\s+(.*))?$/.exec(clean(s));
  return m ? { code: m[1]!, label: clean(m[2] ?? "") } : null;
}

/** "26020 S.D.C. COLICODERVIESE ASD" → { code: "26020", name: "S.D.C. COLICODERVIESE ASD" }. */
export function parseClub(s: string): { code: string; name: string } | null {
  const m = /^(\d{1,10})(?:\s+(.*))?$/.exec(clean(s));
  return m ? { code: m[1]!, name: clean(m[2] ?? "") } : null;
}

/** "Svincolo : *X TERMINE AUTOMATICO tess. giov. del: 01/07/2026" → { code: "*X", date: "2026-07-01" }. */
export function parseReleaseNote(note: string | null | undefined): { code: string | null; date: string | null } {
  if (!note) return { code: null, date: null };
  const n = clean(note);
  const code = /svincolo\s*:\s*(\S{1,8})/i.exec(n)?.[1] ?? null;
  const dates = [...n.matchAll(/\d{2}\/\d{2}\/\d{4}/g)].map((m) => m[0]);
  return { code, date: dmyToIso(dates[dates.length - 1] ?? null) };
}

const RELEASE_LABEL: Readonly<Record<string, string>> = {
  "*X": "Termine automatico tesseramento giovanile",
  "*Y": "Svincolo di dicembre SGS",
  "*T": "Svincolo per inattività",
  "*8": "Svincolo calciatore straniero",
  RC: "Risoluzione contratto",
  $: "Svincolo da parte della società",
  "*7": "Scadenza contratto/vincolo",
};

/** Plain Italian label of a release code; unknown codes are shown as they are. */
export function releaseLabel(code: string | null): string | null {
  if (!code) return null;
  return RELEASE_LABEL[code] ?? code;
}

const MOVEMENT_LABEL: Readonly<Record<string, string>> = {
  AG: "Aggiornamento di posizione",
  SV: "Svincolo",
  TD: "Trasferimento definitivo",
  NU: "Nuova immissione",
  RZ: "Risoluzione contratto",
  TP: "Prestito",
};

/** Italian label of a movement: the portal's own label, else the known code, else the code. */
export function movementLabel(code: string, portalLabel: string): string {
  if (portalLabel) return portalLabel.charAt(0) + portalLabel.slice(1).toLowerCase();
  return MOVEMENT_LABEL[code] ?? code;
}

const careerKey = (c: Pick<CareerRow, "matricola" | "season" | "club_code" | "movement_code" | "event_date">) =>
  `${c.matricola}|${c.season}|${c.club_code}|${c.movement_code}|${c.event_date ?? ""}`;

/**
 * Validate the export file (JSON text) and turn it into database rows. The file must be the
 * club's own export (club code 26020). Rows of the same player and season are merged; a career
 * row whose movement or club cannot be read is skipped and counted.
 */
export function parseExportFile(text: string, ownClubCode: string = OWN_CLUB_CODE): ParseResult {
  if (text.length > MAX_EXPORT_BYTES) return { ok: false, error: "File troppo grande (massimo 3 MB)." };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "Il file non è un JSON valido." };
  }
  const parsed = exportFileSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue ? issue.path.join(".") : "";
    return { ok: false, error: `Il file non è un'esportazione FIGC valida${where ? ` (campo ${where})` : ""}.` };
  }
  const f = parsed.data;
  if (f.club_code !== ownClubCode) return { ok: false, error: "Il file è di un'altra società: serve l'esportazione fatta con l'utente della S.C.D. ColicoDerviese." };

  let skipped = 0;
  const roster = new Map<string, RosterRow>();
  for (const r of f.roster) {
    const { lastName, firstName } = splitName(r.name);
    if (!lastName) {
      skipped += 1;
      continue;
    }
    roster.set(`${r.season}|${r.matricola}`, {
      season: r.season,
      matricola: r.matricola,
      sector: r.sector,
      last_name: lastName.slice(0, 80),
      first_name: firstName.slice(0, 80),
      birth_year: birthYearOf(r.birth_date),
    });
  }

  const career = new Map<string, CareerRow>();
  for (const c of f.career) {
    const mv = parseMovement(c.movement);
    const club = parseClub(c.club);
    if (!mv || !club) {
      skipped += 1;
      continue;
    }
    const rel = parseReleaseNote(c.note);
    const row: CareerRow = {
      matricola: c.matricola,
      season: c.season,
      movement_code: mv.code,
      movement_label: mv.label.slice(0, 120),
      club_code: club.code,
      club_name: club.name.slice(0, 160),
      is_own_club: club.code === ownClubCode,
      status_code: c.status ? clean(c.status).slice(0, 60) || null : null,
      event_date: dmyToIso(c.date),
      release_code: rel.code,
      release_date: rel.date,
    };
    const k = careerKey(row);
    const prev = career.get(k);
    // Same movement read twice: keep what either copy says (release and status filled).
    career.set(k, {
      ...row,
      status_code: row.status_code ?? prev?.status_code ?? null,
      release_code: row.release_code ?? prev?.release_code ?? null,
      release_date: row.release_date ?? prev?.release_date ?? null,
    });
  }

  const rosterRows = [...roster.values()];
  return {
    ok: true,
    data: {
      readAt: f.read_at,
      season: f.season,
      roster: rosterRows,
      career: [...career.values()],
      skipped,
      players: new Set([...rosterRows.map((r) => r.matricola), ...f.career.map((c) => c.matricola)]).size,
    },
  };
}

/* ------------------------------------------------------------------ views */

export type PlayerClass = "CONFERMATO" | "RIENTRO" | "NUOVO" | "PRIMO";

export const CLASS_LABEL: Readonly<Record<PlayerClass, string>> = {
  CONFERMATO: "Confermati",
  RIENTRO: "Rientri",
  NUOVO: "Nuovi da altre società",
  PRIMO: "Primo tesseramento",
};

export const CLASS_HINT: Readonly<Record<PlayerClass, string>> = {
  CONFERMATO: "con noi anche la stagione scorsa",
  RIENTRO: "erano stati da noi, poi altrove o fermi",
  NUOVO: "arrivano da un'altra società",
  PRIMO: "nessuna storia FIGC precedente",
};

/** Roster row as read back from the database (camelCase). */
export interface HistoryRoster {
  season: string;
  matricola: string;
  sector: Sector;
  lastName: string;
  firstName: string;
  birthYear: number | null;
}

/** Career row as read back from the database (camelCase). */
export interface HistoryCareer {
  matricola: string;
  season: string;
  movementCode: string;
  movementLabel: string;
  clubCode: string;
  clubName: string;
  own: boolean;
  statusCode: string | null;
  eventDate: string | null;
  releaseCode: string | null;
  releaseDate: string | null;
}

export interface PlayerRef {
  matricola: string;
  /** "Nome C.": first name + surname initial, never the full surname. */
  name: string;
  birthYear: number | null;
  sector: Sector | null;
  /** Lower-case "cognome nome matricola anno" used only to search; never rendered. */
  search: string;
}

export interface SeasonStats {
  season: string;
  rosa: number;
  bySector: Record<Sector, number>;
  /** null when the previous season is not known at all (no roster and no FIGC history for it). */
  confermati: number | null;
  entrati: number | null;
  /** null when the previous season's roster was not loaded. */
  usciti: number | null;
}

export interface CurrentPlayer extends PlayerRef {
  cls: PlayerClass;
  /** NUOVO: the last other club in the FIGC history. */
  originClub: string | null;
  /** RIENTRO: the last earlier season with us. */
  lastOwnSeason: string | null;
}

export interface Departure extends PlayerRef {
  lastOwnSeason: string | null;
  releaseCode: string | null;
  releaseLabel: string | null;
  releaseDate: string | null;
  /** Club found in the FIGC history after leaving us, when the portal already shows it. */
  nowAt: string | null;
}

export interface TimelineRow {
  season: string;
  club: string;
  own: boolean;
  movement: string;
  date: string | null;
  status: string | null;
  release: string | null;
}

export interface HistoryView {
  seasons: string[];
  current: string | null;
  previous: string | null;
  table: SeasonStats[];
  currentPlayers: CurrentPlayer[];
  breakdown: Record<Sector, Record<PlayerClass, number>>;
  arrivals: Array<{ club: string; count: number }>;
  departures: Departure[];
  lossesByYear: Array<{ birthYear: number | null; D: number; S: number; total: number }>;
  players: PlayerRef[];
  timelines: Record<string, TimelineRow[]>;
}

const titleCase = (s: string) =>
  s
    .toLowerCase()
    .split(/([\s'-])/)
    .map((p) => (p.length > 0 && !/[\s'-]/.test(p) ? p.charAt(0).toUpperCase() + p.slice(1) : p))
    .join("");

/** "Nome C." — first name + surname initial (minors rule, applied to everyone on this page). */
export function publicName(firstName: string, lastName: string): string {
  const initial = clean(lastName).charAt(0).toUpperCase();
  const first = titleCase(clean(firstName));
  if (!first) return initial ? `${initial}.` : "—";
  return initial ? `${first} ${initial}.` : first;
}

const emptyBreakdown = (): Record<PlayerClass, number> => ({ CONFERMATO: 0, RIENTRO: 0, NUOVO: 0, PRIMO: 0 });

const byEvent = (a: HistoryCareer, b: HistoryCareer) =>
  compareSeasons(a.season, b.season) || (a.eventDate ?? "").localeCompare(b.eventDate ?? "");

/**
 * Every view of /segreteria/storia from the stored rows. `season` defaults to the latest roster
 * season. Classification of a player of season N (first match wins):
 *  CONFERMATO — in the roster of N-1 or with a club row in N-1;
 *  RIENTRO    — with us (roster or club row) in a season before N-1;
 *  NUOVO      — a row of another club in the FIGC history up to N (origin = the latest one);
 *  PRIMO      — no earlier history at all.
 */
export function computeHistory(rosterIn: readonly HistoryRoster[], careerIn: readonly HistoryCareer[], season?: string): HistoryView {
  const seasons = [...new Set(rosterIn.map((r) => r.season))].sort(compareSeasons);
  const current = season && seasons.includes(season) ? season : (seasons[seasons.length - 1] ?? null);
  const previous = current ? prevSeason(current) : null;

  const rosterBySeason = new Map<string, Map<string, HistoryRoster>>();
  for (const r of rosterIn) {
    const m = rosterBySeason.get(r.season) ?? new Map<string, HistoryRoster>();
    m.set(r.matricola, r);
    rosterBySeason.set(r.season, m);
  }
  const careerBy = new Map<string, HistoryCareer[]>();
  for (const c of [...careerIn].sort(byEvent)) {
    const list = careerBy.get(c.matricola) ?? [];
    list.push(c);
    careerBy.set(c.matricola, list);
  }
  /** Seasons with us of a player: rosters + own-club career rows. */
  const ownSeasons = new Map<string, Set<string>>();
  const addOwn = (mat: string, s: string) => {
    const set = ownSeasons.get(mat) ?? new Set<string>();
    set.add(s);
    ownSeasons.set(mat, set);
  };
  for (const r of rosterIn) addOwn(r.matricola, r.season);
  for (const c of careerIn) if (c.own) addOwn(c.matricola, c.season);
  /** Seasons covered by any data at all (to tell "nobody" from "unknown"). */
  const careerSeasons = new Set(careerIn.map((c) => c.season));

  // Identity of each player: the latest roster row (names, sector, birth year).
  const latest = new Map<string, HistoryRoster>();
  for (const r of [...rosterIn].sort((a, b) => compareSeasons(a.season, b.season))) latest.set(r.matricola, r);
  const ref = (mat: string): PlayerRef => {
    const r = latest.get(mat);
    if (!r) return { matricola: mat, name: "—", birthYear: null, sector: null, search: mat };
    return {
      matricola: mat,
      name: publicName(r.firstName, r.lastName),
      birthYear: r.birthYear,
      sector: r.sector,
      search: `${r.lastName} ${r.firstName} ${r.firstName} ${r.lastName} ${mat} ${r.birthYear ?? ""}`.toLowerCase(),
    };
  };

  const withUsIn = (mat: string, s: string) => ownSeasons.get(mat)?.has(s) ?? false;

  const table: SeasonStats[] = seasons.map((s) => {
    const now = rosterBySeason.get(s) ?? new Map<string, HistoryRoster>();
    const p = prevSeason(s);
    const prevRoster = rosterBySeason.get(p);
    // The storico is read for the players of the season being exported (the latest one): for that
    // season the FIGC history alone tells who was with us the year before; for older seasons only
    // the previous tabulato does (otherwise "confermati" would undercount): unknown, not zero.
    const prevKnown = Boolean(prevRoster) || (s === current && careerSeasons.has(p));
    let conf = 0;
    const bySector: Record<Sector, number> = { D: 0, S: 0 };
    for (const [mat, r] of now) {
      bySector[r.sector] += 1;
      if (withUsIn(mat, p)) conf += 1;
    }
    const usciti = prevRoster ? [...prevRoster.keys()].filter((m) => !now.has(m)).length : null;
    return {
      season: s,
      rosa: now.size,
      bySector,
      confermati: prevKnown ? conf : null,
      entrati: prevKnown ? now.size - conf : null,
      usciti,
    };
  });

  const breakdown: Record<Sector, Record<PlayerClass, number>> = { D: emptyBreakdown(), S: emptyBreakdown() };
  const currentPlayers: CurrentPlayer[] = [];
  const arrivals = new Map<string, number>();
  const nowRoster = current ? (rosterBySeason.get(current) ?? new Map<string, HistoryRoster>()) : new Map<string, HistoryRoster>();
  if (current && previous) {
    for (const [mat, r] of nowRoster) {
      const own = [...(ownSeasons.get(mat) ?? [])].filter((s) => compareSeasons(s, current) < 0).sort(compareSeasons);
      const others = (careerBy.get(mat) ?? []).filter((c) => !c.own && compareSeasons(c.season, current) <= 0);
      let cls: PlayerClass;
      let originClub: string | null = null;
      let lastOwnSeason: string | null = null;
      if (withUsIn(mat, previous)) cls = "CONFERMATO";
      else if (own.length > 0) {
        cls = "RIENTRO";
        lastOwnSeason = own[own.length - 1]!;
      } else if (others.length > 0) {
        cls = "NUOVO";
        originClub = others[others.length - 1]!.clubName || others[others.length - 1]!.clubCode;
        arrivals.set(originClub, (arrivals.get(originClub) ?? 0) + 1);
      } else cls = "PRIMO";
      breakdown[r.sector][cls] += 1;
      currentPlayers.push({ ...ref(mat), sector: r.sector, cls, originClub, lastOwnSeason });
    }
  }

  // Who did not come back: with us last season (roster or club row), not in the current roster.
  const departures: Departure[] = [];
  const losses = new Map<string, { birthYear: number | null; D: number; S: number; total: number }>();
  if (current && previous) {
    const candidates = new Set<string>();
    for (const m of rosterBySeason.get(previous)?.keys() ?? []) candidates.add(m);
    for (const c of careerIn) if (c.own && c.season === previous) candidates.add(c.matricola);
    for (const mat of candidates) {
      if (nowRoster.has(mat)) continue;
      const rows = careerBy.get(mat) ?? [];
      const ownRows = rows.filter((c) => c.own);
      const lastRelease = [...ownRows].reverse().find((c) => c.releaseCode) ?? null;
      const own = [...(ownSeasons.get(mat) ?? [])].sort(compareSeasons);
      const lastOwnSeason = own[own.length - 1] ?? null;
      const lastOwnRow = ownRows[ownRows.length - 1] ?? null;
      const after = rows.filter((c) => !c.own && lastOwnSeason !== null && (compareSeasons(c.season, lastOwnSeason) > 0 || (c.season === lastOwnSeason && lastOwnRow !== null && (c.eventDate ?? "") > (lastOwnRow.eventDate ?? ""))));
      const nowAtRow = after[after.length - 1] ?? null;
      const pr = ref(mat);
      departures.push({
        ...pr,
        lastOwnSeason,
        releaseCode: lastRelease?.releaseCode ?? null,
        releaseLabel: releaseLabel(lastRelease?.releaseCode ?? null),
        releaseDate: lastRelease?.releaseDate ?? null,
        nowAt: nowAtRow ? nowAtRow.clubName || nowAtRow.clubCode : null,
      });
      const key = String(pr.birthYear ?? "—");
      const l = losses.get(key) ?? { birthYear: pr.birthYear, D: 0, S: 0, total: 0 };
      if (pr.sector) l[pr.sector] += 1;
      l.total += 1;
      losses.set(key, l);
    }
  }
  departures.sort((a, b) => (b.birthYear ?? 0) - (a.birthYear ?? 0) || a.name.localeCompare(b.name, "it"));

  const allMats = new Set<string>([...latest.keys(), ...careerBy.keys()]);
  const players = [...allMats].map(ref).sort((a, b) => a.name.localeCompare(b.name, "it") || a.matricola.localeCompare(b.matricola));

  const timelines: Record<string, TimelineRow[]> = {};
  for (const mat of allMats) timelines[mat] = timeline(mat, rosterIn, careerBy.get(mat) ?? []);

  return {
    seasons,
    current,
    previous,
    table,
    currentPlayers: currentPlayers.sort((a, b) => a.name.localeCompare(b.name, "it")),
    breakdown,
    arrivals: [...arrivals].map(([club, count]) => ({ club, count })).sort((a, b) => b.count - a.count || a.club.localeCompare(b.club, "it")),
    departures,
    lossesByYear: [...losses.values()].sort((a, b) => (b.birthYear ?? 0) - (a.birthYear ?? 0)),
    players,
    timelines,
  };
}

/** Season-by-season path of one player: FIGC history rows plus our tabulati not yet in the history. */
export function timeline(matricola: string, roster: readonly HistoryRoster[], career: readonly HistoryCareer[]): TimelineRow[] {
  const rows: TimelineRow[] = career
    .filter((c) => c.matricola === matricola)
    .sort(byEvent)
    .map((c) => ({
      season: c.season,
      club: c.clubName || c.clubCode,
      own: c.own,
      movement: movementLabel(c.movementCode, c.movementLabel),
      date: c.eventDate,
      status: c.statusCode,
      release: releaseLabel(c.releaseCode),
    }));
  const ownCareerSeasons = new Set(career.filter((c) => c.matricola === matricola && c.own).map((c) => c.season));
  for (const r of roster) {
    if (r.matricola !== matricola || ownCareerSeasons.has(r.season)) continue;
    rows.push({ season: r.season, club: "S.C.D. ColicoDerviese", own: true, movement: `Tabulato ${SECTOR_SHORT[r.sector]}`, date: null, status: null, release: null });
  }
  return rows.sort((a, b) => compareSeasons(a.season, b.season) || (a.date ?? "9").localeCompare(b.date ?? "9"));
}

/** Departures filtered by sector and text (name, matricola, year). */
export function filterDepartures(list: readonly Departure[], sector: Sector | "tutti", q: string): Departure[] {
  const needle = q.trim().toLowerCase();
  return list.filter((d) => (sector === "tutti" || d.sector === sector) && (!needle || d.search.includes(needle) || d.name.toLowerCase().includes(needle)));
}

/** Departures grouped by birth year, newest first; unknown year last. */
export function groupByBirthYear<T extends { birthYear: number | null }>(list: readonly T[]): Array<{ birthYear: number | null; items: T[] }> {
  const m = new Map<number | null, T[]>();
  for (const d of list) m.set(d.birthYear, [...(m.get(d.birthYear) ?? []), d]);
  return [...m]
    .map(([birthYear, items]) => ({ birthYear, items }))
    .sort((a, b) => (a.birthYear === null ? 1 : b.birthYear === null ? -1 : b.birthYear - a.birthYear));
}

/** Players matching a search (at most `limit`). */
export function searchPlayers(list: readonly PlayerRef[], q: string, limit = 20): PlayerRef[] {
  const needle = q.trim().toLowerCase();
  if (needle.length < 2) return [];
  return list.filter((p) => p.search.includes(needle) || p.name.toLowerCase().includes(needle)).slice(0, limit);
}
