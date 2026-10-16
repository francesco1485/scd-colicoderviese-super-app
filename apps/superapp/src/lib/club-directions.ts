/**
 * "Come arrivo al campo?" (backlog B7): addresses and Google Maps links of the club's two sites, Colico and Dervio,
 * from the facilities master only (config/scd-facilities.v1.json). A site without a confirmed address gets no link
 * and no invented street. Shared by Vera / the rules engine and the /impianti "Come arrivare" card so the link is
 * the same everywhere.
 */
import { FACILITIES, type FacilitiesContract } from "./facilities";
import { siteMapsUrl } from "./maps-link";
import type { SkyReply } from "./sky.functions";

/** The club's own sites, in the order families know them. */
export const CLUB_SITE_IDS = ["SED-COL", "SED-DER"] as const;

export interface SiteDirections {
  id: string;
  name: string;
  short: string;
  municipality: string;
  /** Street from the master; null = not confirmed (no link shown). */
  address: string | null;
  /** Google Maps search link; null when the address is not confirmed. */
  mapsUrl: string | null;
}

/** Directions of the club's sites (Colico, Dervio) from the facilities master. */
export function clubDirections(c: FacilitiesContract = FACILITIES): SiteDirections[] {
  const out: SiteDirections[] = [];
  for (const id of CLUB_SITE_IDS) {
    const s = c.sites.find((x) => x.id === id);
    if (!s) continue;
    const address = s.address?.trim() ? s.address.trim() : null;
    out.push({ id: s.id, name: s.name, short: s.short, municipality: s.municipality, address, mapsUrl: siteMapsUrl(s) });
  }
  return out;
}

function norm(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

const ASKS_WAY_RE = /\bcome (si |ci |posso |faccio a |devo )?(arriv|raggiung)|\bindicazion|\bindirizz|\bdove (si trova|e|sono)\b|\bstrada per\b|\bnavigator|\bmappa\b|\bmaps\b|\bportami\b/;
/** A physical place of ours: "indirizzo" alone (e-mail, PEC, sede legale) is never enough. */
const CLUB_PLACE_RE = /\bcamp[oi]\b|\bcentro sportivo\b|\bimpiant|\bstadio\b|\bspogliato|\bcolico\b|\bdervio\b/;
/** Contacts, paperwork, registrations, buses: other answers, never our streets. */
const OTHER_TOPIC_RE = /\be-?mail\b|\bmail\b|\bpec\b|\bposta\b|\btelefon|\blegale\b|\bsped|\bfattur|\biban\b|\biscri|\btessera|\bprova\b|\bprovino|\bpulmin|\bkit\b|\bmaglie?\b/;
/** Away games: the model reads the venue from the fixtures, never our addresses. */
const AWAY_RE = /\btrasfert|\bfuori casa\b|\bavversari|\bcontro\b|\bospiti\b/;
/** A match without "in casa" may be away: left to the assistant, which has the fixtures. */
const MATCH_RE = /\bpartit|\bgara\b|\bgare\b/;
/** "campo di X" / "a X" naming a town that is not ours. */
const OTHER_TOWN_RE = /\b(?:camp[oi]|centro sportivo|stadio) (?:di|a) (\p{L}+)/u;

/**
 * True for a question about reaching the club's own pitches ("come arrivo al campo?", "indirizzo del centro sportivo
 * di Dervio"). Away games, other towns, contacts, registrations and questions without a place of ours stay with the
 * general assistant.
 */
export function isClubDirectionsQuestion(message: string): boolean {
  const m = norm(message);
  if (OTHER_TOPIC_RE.test(m) || AWAY_RE.test(m)) return false;
  if (MATCH_RE.test(m) && !/\bin casa\b/.test(m)) return false;
  const town = OTHER_TOWN_RE.exec(m)?.[1];
  if (town && town !== "colico" && town !== "dervio") return false;
  if (/\bdove (siete|vi trovo|vi trovate)\b/.test(m)) return true;
  return ASKS_WAY_RE.test(m) && CLUB_PLACE_RE.test(m);
}

/** Sites the message is about: only Colico, only Dervio, or both when it names neither (or both). */
export function sitesForMessage(message: string, all: readonly SiteDirections[] = clubDirections()): SiteDirections[] {
  const m = norm(message);
  const colico = /\bcolico\b/.test(m);
  const dervio = /\bdervio\b/.test(m);
  if (colico === dervio) return [...all];
  return all.filter((s) => (colico ? s.id === "SED-COL" : s.id === "SED-DER"));
}

/** Deterministic reply with street, town and a Maps link per site, plus the /impianti page. */
export function directionsReply(message: string, all: readonly SiteDirections[] = clubDirections()): SkyReply {
  const sites = sitesForMessage(message, all);
  if (sites.length === 0) {
    return { text: "Indirizzi e percorsi dei nostri campi sono nella pagina Impianti.", mood: "info", links: [{ label: "Impianti e come arrivare", to: "/impianti" }] };
  }
  const lines = sites.map((s) => (s.address ? `• ${s.name}: ${s.address}, ${s.municipality}` : `• ${s.name}: ${s.municipality} (indirizzo in verifica)`));
  const intro = sites.length > 1 ? "Giochiamo in due centri sportivi:" : "Ecco dove trovarci:";
  const links: { label: string; to: string }[] = [];
  for (const s of sites) if (s.mapsUrl) links.push({ label: `Portami a ${s.short} con Maps`, to: s.mapsUrl });
  links.push({ label: "Ingressi e percorsi", to: "/impianti" });
  return {
    text: `${intro}\n${lines.join("\n")}\nTocca il link per aprire la strada sul telefono. Per le trasferte la sede è scritta nella gara del calendario.`,
    mood: "info",
    links,
  };
}
