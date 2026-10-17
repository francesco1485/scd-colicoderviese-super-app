/**
 * «Idee da sponsorizzare» on /sponsor (Francesco 17/10/2026 09:42: «vanno creati pacchetti ma prezzi non esposti perché
 * li fa al momento il Presidente; dobbiamo solo rendere appetibile il singolo sponsor o idea di sponsorizzazione»).
 *
 * Engine: SOLDI. Measured by: proposals received from /sponsor#proposta per idea (`interessi` and `?pacchetto=` of the
 * submitPartnerLead register, or the subject of the official e-mail while public forms are paused).
 *
 * Every idea is one real asset of the club, built only from the repo's data (UNKNOWN ≠ ZERO, no reach numbers):
 * - tournaments: lib/tournaments.ts (Christmas Lario Cup Female, Memorial José Nasazzi 2027, Memorial Sandro Guattini);
 * - pulmini: lib/pulmini-vans.ts VAN_UNITS (number of vans and line names only, never a child's name or a stop);
 * - palestra and infermeria: lib/giving.ts CAMPAIGN_COPY and VISIBILITY_COPY (UD-113);
 * - Fondo Solidale: UD-113 (entrate del Fondo: donazioni, eventi, sponsor dedicati; families stay reserved);
 * - kit: lib/kit-catalog.ts (official kits 2026/27).
 * Never a price, an amount or a discount: where a price would be, PROPOSAL_ON_MEASURE. An unknown audience is null and
 * renders «da confermare». This file never says who is a sponsor (that is lib/sponsors.ts).
 *
 * Also the shared «choice» helpers: `?pacchetto=` on /sponsor accepts a package id (sponsor-packages.ts) or an idea id.
 */
import { CAMPAIGN_COPY } from "./giving";
import { KITS } from "./kit-catalog";
import { VAN_UNITS } from "./pulmini-vans";
import { PARTNER_PACKAGES, packageById, packageRequestNote } from "./sponsor-packages";
import { TOURNAMENTS } from "./tournaments";

export type IdeaScene = "led" | "maglia" | "torneo" | "digitale" | "pulmino" | "palestra" | "fondo" | "infermeria" | "kit";

export interface SponsorIdea {
  /** Stable id: sent in the form payload (`interessi`) and accepted as `?pacchetto=`. Max 40 chars, never a package id. */
  id: string;
  /** The asset, named plainly. */
  title: string;
  scene: IdeaScene;
  /** Where the brand appears, short. */
  where: string;
  /** What the idea means for the community: the story line. */
  community: string;
  /** What the sponsor gets, concrete. 2 to 3. */
  gets: readonly string[];
  /** Who sees it, in words; null = «da confermare». */
  audience: string | null;
  /** Sourced facts shown as chips (dates, lines, teams); empty when nothing is published. */
  facts: readonly string[];
  /** Where the facts come from. */
  source: string;
  /** The idea also has a public page in Sostieni (campaigns, Fondo). */
  sostieni?: { href: "/sostieni" | "/sostieni/fondo-solidale"; label: string };
}

export const IDEA_AUDIENCE_UNKNOWN = "da confermare";

const tournament = (id: string) => TOURNAMENTS.find((t) => t.id === id);

function clcFemaleIdea(): SponsorIdea | null {
  const t = tournament("christmas-lario-cup-female");
  if (!t) return null;
  const teams = t.confirmedTeams.length;
  return {
    id: "idea-clc-female",
    title: "Christmas Lario Cup Female",
    scene: "torneo",
    where: "Al torneo femminile di Dervio",
    community: "Il calcio femminile giovanile in campo a Dervio, nello stesso giorno del torneo maschile di Colico.",
    gets: [
      "Il tuo nome accanto alla Female Edition del torneo",
      "Premio fair play con il tuo marchio, consegnato in campo",
      "Presenza nella pagina del torneo nell'app",
    ],
    audience: "Squadre femminili ospiti, accompagnatori e famiglie al centro sportivo di Dervio.",
    facts: [t.when, t.place?.split(" · ")[0] ?? null, teams > 0 ? `${teams} squadre già confermate` : null].filter((x): x is string => Boolean(x)),
    source: t.source,
  };
}

function nasazziIdea(): SponsorIdea | null {
  const t = tournament("memorial-jose-nasazzi");
  if (!t) return null;
  return {
    id: "idea-memorial-nasazzi",
    title: t.name,
    scene: "torneo",
    where: "Al torneo storico della società",
    community: "Lo storico torneo della società torna a maggio 2027: categorie, campi e iscrizioni in arrivo.",
    gets: [
      "Il tuo nome legato all'edizione 2027 del torneo",
      "Premi e materiali del torneo con il tuo marchio, da definire insieme",
      "Presenza nella pagina del torneo nell'app",
    ],
    audience: null,
    facts: [t.when ? `${t.when} · date da confermare` : "Date da confermare"],
    source: t.source,
  };
}

function guattiniIdea(): SponsorIdea | null {
  const t = tournament("memorial-sandro-guattini");
  if (!t) return null;
  return {
    id: "idea-memorial-guattini",
    title: t.name,
    scene: "torneo",
    where: "Al torneo giovanile in ricordo di Sandro Guattini",
    community: "Il torneo giovanile in ricordo di Sandro Guattini: dopo l'edizione 2026 la società prepara la prossima.",
    gets: ["Partner della prossima edizione", "Premio con il tuo marchio, da definire insieme"],
    audience: null,
    facts: ["Date in arrivo"],
    source: t.source,
  };
}

function pulminiIdea(): SponsorIdea | null {
  if (VAN_UNITS.length === 0) return null;
  const lines = VAN_UNITS.map((v) => v.line);
  const list = lines.length > 1 ? `${lines.slice(0, -1).join(", ")} e ${lines[lines.length - 1]}` : lines[0]!;
  return {
    id: "idea-pulmini",
    title: "I pulmini del club",
    scene: "pulmino",
    where: "Sul pulmino di una linea",
    community: "I pulmini portano i ragazzi da casa agli allenamenti: una mano concreta alle famiglie che abitano lontano dal campo.",
    gets: [
      "Il tuo marchio legato al pulmino della linea che scegli: dove e come lo decidete con il Presidente",
      "Il racconto del servizio pulmini nelle notizie del club, con il tuo nome",
    ],
    audience: `Chi vive lungo le linee ${list} e le famiglie dei ragazzi che viaggiano con il club.`,
    facts: [`${VAN_UNITS.length} pulmini`, ...lines.map((l) => `Linea ${l}`)],
    source: "Servizio pulmini del club",
  };
}

function campaignIdea(c: "PALESTRA" | "INFERMERIA"): SponsorIdea {
  const copy = CAMPAIGN_COPY[c];
  const palestra = c === "PALESTRA";
  return {
    id: palestra ? "idea-palestra" : "idea-infermeria",
    title: copy.title,
    scene: palestra ? "palestra" : "infermeria",
    where: palestra ? "Nella nuova palestra del club" : "Nella nuova infermeria del club",
    community: palestra
      ? "Una palestra nuova dove i ragazzi si allenano meglio, con attrezzi sicuri e controllati dallo staff."
      : "Un'infermeria nuova e attrezzata per i ragazzi del club, con materiale controllato.",
    gets: [
      "Il nome della tua azienda sull'attrezzatura adottata, e sulla targhetta se c'è, solo se lo vuoi in pubblico",
      palestra ? "Puoi donare attrezzi o sostenere la campagna: lo staff controlla tutto prima di accettarlo" : "Puoi donare materiale o arredi: decide il responsabile dell'infermeria",
    ],
    audience: palestra ? "I ragazzi e lo staff che si allenano nella palestra del club." : "I ragazzi e lo staff del club.",
    facts: ["Campagna della Direzione in Sostieni"],
    source: "Campagne Sostieni della Direzione",
    sostieni: { href: "/sostieni", label: "Vedi la campagna" },
  };
}

function fondoIdea(): SponsorIdea {
  return {
    id: "idea-fondo-solidale",
    title: "Fondo Solidale",
    scene: "fondo",
    where: "Accanto al Fondo Solidale del club",
    community: "Il Fondo aiuta le famiglie in difficoltà con la quota, così nessun ragazzo resta fuori dal campo.",
    gets: [
      "Una sponsorizzazione dedicata al Fondo Solidale",
      "Il tuo nome tra chi sostiene il Fondo, oppure anonimo: scegli tu",
      "Le famiglie aiutate restano riservate: nessun nome in pubblico",
    ],
    audience: null,
    facts: ["Sponsor dedicati tra le entrate del Fondo"],
    source: "Fondo Solidale della Direzione",
    sostieni: { href: "/sostieni/fondo-solidale", label: "Cos'è il Fondo" },
  };
}

function kitIdea(): SponsorIdea | null {
  const primiCalci = KITS.find((k) => k.id.startsWith("primi-calci"));
  if (!primiCalci) return null;
  return {
    id: "idea-kit-primi-calci",
    title: "Il kit dei Primi Calci",
    scene: "kit",
    where: "Sul materiale del kit dei più piccoli",
    community: "Il primo kit da calciatore dei bambini dei Primi Calci: lo indossano agli allenamenti e se lo portano a casa.",
    gets: [
      "Il tuo marchio sul materiale del kit, da definire con il Presidente e il fornitore",
      "Il tuo nome nella presentazione del kit alle famiglie",
    ],
    audience: "Bambini dei Primi Calci e le loro famiglie, al campo e a casa.",
    facts: ["Kit ufficiale 2026/27"],
    source: "Catalogo dei kit ufficiali 2026/27",
  };
}

/** The ideas in display order. Pure: the same list on server and client. */
export function sponsorIdeas(): SponsorIdea[] {
  return [clcFemaleIdea(), nasazziIdea(), guattiniIdea(), pulminiIdea(), campaignIdea("PALESTRA"), fondoIdea(), campaignIdea("INFERMERIA"), kitIdea()].filter(
    (x): x is SponsorIdea => x !== null,
  );
}

export const SPONSOR_IDEAS: readonly SponsorIdea[] = sponsorIdeas();

export const ideaById = (id: string | null | undefined): SponsorIdea | undefined => (id ? SPONSOR_IDEAS.find((i) => i.id === id) : undefined);

export const ideaAudience = (i: Pick<SponsorIdea, "audience">) => i.audience ?? IDEA_AUDIENCE_UNKNOWN;

/* ------------------------------------------------------------------ choice: package or idea */

export interface SponsorChoice {
  id: string;
  title: string;
  kind: "pacchetto" | "idea";
}

/** A package (requestable) or an idea, by id. */
export function choiceById(id: string | null | undefined): SponsorChoice | undefined {
  const p = packageById(id);
  if (p && !p.link) return { id: p.id, title: p.title, kind: "pacchetto" };
  const i = ideaById(id);
  return i ? { id: i.id, title: i.title, kind: "idea" } : undefined;
}

/** `?pacchetto=` value accepted by /sponsor: a known requestable package or idea id, otherwise undefined. */
export function parseChoiceParam(v: unknown): string | undefined {
  return typeof v === "string" ? choiceById(v)?.id : undefined;
}

/** Text prefilled in the form message, so the choice travels with the request. */
export function choiceRequestNote(id: string | null | undefined): string {
  const c = choiceById(id);
  if (!c) return "";
  return c.kind === "pacchetto" ? packageRequestNote(c.id) : `Mi interessa l'idea «${c.title}».`;
}

/** Subject suffix of the official e-mail while public forms are paused. */
export function choiceTopic(c: SponsorChoice): string {
  return `${c.kind === "pacchetto" ? "Pacchetto" : "Idea"} ${c.title}`;
}

/** Idea ids never collide with package ids (both travel in the same `?pacchetto=` and `interessi`). */
export const choiceIdsUnique = (): boolean => {
  const ids = [...PARTNER_PACKAGES.map((p) => p.id), ...SPONSOR_IDEAS.map((i) => i.id)];
  return new Set(ids).size === ids.length;
};
