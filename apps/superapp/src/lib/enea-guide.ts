/**
 * Enea, master guide of sponsorship, tournaments and events (UD-149, Francesco 17/10/2026 07:49: «Enea deve essere
 * bravo a spingere per trovare sponsor, fare tornei e eventi… va formato e indirizzato con ragionamento e qualità»).
 *
 * Engine: SOLDI (partners) and PERSONE (teams and families). Measured by: presses on the one action of each line,
 * per line id (Meta platform 22, once analytics consent exists).
 *
 * Every line = one concrete reason + one action, built only from the repo's published data:
 * - sponsors: lib/sponsors.ts (count of the Direzione's 2026/27 board); packages: lib/sponsor-packages.ts;
 * - tournaments: lib/tournaments.ts and lib/events.ts (official posters);
 * - LED: lib/sponsor-spots.ts LED_MASTER.
 * Never a price, a discount, an audience number or a promise of registration (UD-149). Pure and SSR safe: the start
 * line comes from the Rome day, so server and client render the same line.
 */
import { confirmedCount } from "./events";
import { PARTNER_PACKAGES } from "./sponsor-packages";
import { LED_MASTER } from "./sponsor-spots";
import { SPONSORS } from "./sponsors";
import { sameDayEditions, tournamentBoard } from "./tournament-hub";
import type { TournamentEdition } from "./tournaments";

export type EneaContext = "tornei" | "sponsor" | "eventi";

export interface EneaAction {
  label: string;
  to: "/tornei" | "/sponsor" | "/eventi/christmas-lario-cup" | "/contatti" | "/sostieni";
  hash?: string;
  /** Only `pacchetto` on /sponsor (a known package id). */
  search?: { pacchetto: string };
}

export interface EneaLine {
  id: string;
  reason: string;
  action: EneaAction;
}

/** Milliseconds a line stays before the next one (auto rotation only without reduced motion). */
export const ENEA_ROTATE_MS = 9000;

const lowerFirst = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);

const isClc = (t: TournamentEdition | null) => Boolean(t?.id.startsWith("christmas-lario-cup"));

function tournamentLines(today: string, list?: readonly TournamentEdition[]): EneaLine[] {
  const { hero, published, coming } = tournamentBoard(today, list);
  const lines: EneaLine[] = [];
  if (hero?.link) {
    const editions = sameDayEditions(hero, published);
    const places = [...new Set(editions.map((t) => (t.place ?? "").split(" · ")[0]!.replace(" (LC)", "")).filter(Boolean))].join(" e ");
    const cta: EneaAction = { label: "Iscrivi la squadra", to: hero.link.to as EneaAction["to"], ...(hero.link.hash ? { hash: hero.link.hash } : {}) };
    const open = hero.status === "ISCRIZIONI_APERTE";
    lines.push({
      id: "torneo-prossimo",
      reason: `${hero.name}, ${lowerFirst(hero.when ?? "")}: ${editions.length > 1 ? `${editions.map((e) => e.section.toLowerCase()).join(" e ")} nello stesso giorno` : "una giornata di calcio giovanile"}${places ? ` a ${places}` : ""}.${open ? " Le iscrizioni sono aperte." : ""}`,
      action: cta,
    });
    const confirmed = isClc(hero) ? confirmedCount() : 0;
    if (confirmed > 0)
      lines.push({
        id: "torneo-confermate",
        reason: `Sulle locandine ufficiali ci sono già ${confirmed} squadre confermate, con vivai professionistici e club del territorio. La tua società c'è?`,
        action: cta,
      });
    if (isClc(hero))
      lines.push({
        id: "torneo-arrivare",
        reason: "Venite da fuori? L'8 dicembre è festivo sul Lago di Como: sulla pagina del torneo trovate i campi di Colico e Dervio e come arrivarci.",
        action: { label: "Come arrivare", to: "/eventi/christmas-lario-cup", hash: "arrivare" },
      });
  }
  const next = coming[0];
  if (next)
    lines.push({
      id: "torneo-in-arrivo",
      reason: `${next.name}: ${next.when ? `${next.when}, ` : ""}programma e categorie in arrivo. Se la tua società vuole esserci, scrivilo già adesso.`,
      action: { label: "Scrivi alla società", to: "/contatti" },
    });
  return lines;
}

function sponsorLines(today: string, list?: readonly TournamentEdition[]): EneaLine[] {
  const hasTornei = PARTNER_PACKAGES.some((p) => p.id === "tornei");
  const clcAhead = isClc(tournamentBoard(today, list).hero);
  const lines: EneaLine[] = [
    {
      id: "sponsor-con-noi",
      reason: `Nella stagione 2026/27 sono già ${SPONSORS.length} le aziende partner della S.C.D. ColicoDerviese: il tuo marchio accanto al loro, a Colico e Dervio.`,
      action: { label: "Diventa partner", to: "/sponsor", hash: "proposta" },
    },
    {
      id: "sponsor-led",
      reason: `Con il pacchetto LED wall il tuo spot di ${LED_MASTER.seconds} secondi va in rotazione a bordo campo a Colico: lo prepara il club e lo approvi tu.`,
      action: { label: "Guarda il LED wall", to: "/sponsor", hash: "ledwall" },
    },
  ];
  if (hasTornei && clcAhead)
    lines.push({
      id: "sponsor-tornei",
      reason: `L'8 dicembre la Christmas Lario Cup porta a Colico e Dervio ${confirmedCount()} squadre già confermate: c'è spazio per title partner, naming di un campo e premio fair play.`,
      action: { label: "Chiedi il pacchetto Tornei", to: "/sponsor", hash: "proposta", search: { pacchetto: "tornei" } },
    });
  lines.push(
    {
      id: "sponsor-proposta",
      reason: "I prezzi li approva la Direzione: scrivi cosa ti interessa, la società ti richiama e prepara una proposta su misura.",
      action: { label: "Diventa partner", to: "/sponsor", hash: "proposta" },
    },
    {
      id: "sponsor-sostieni",
      reason: "Vuoi aiutare in un altro modo? La tua azienda può adottare un'attrezzatura o sostenere il Fondo Solidale del club.",
      action: { label: "Vedi cosa serve", to: "/sostieni" },
    },
  );
  return lines;
}

const TORNEI_PARTNER: EneaLine = {
  id: "tornei-partner",
  reason: "Un torneo è anche una vetrina per le aziende del territorio: title partner, naming di un campo, premio fair play e uno spazio nel villaggio.",
  action: { label: "Chiedi il pacchetto Tornei", to: "/sponsor", hash: "proposta", search: { pacchetto: "tornei" } },
};

/** Lines of Enea for a page, in order; the component rotates through them. */
export function eneaLines(ctx: EneaContext, today: string, list?: readonly TournamentEdition[]): EneaLine[] {
  if (ctx === "sponsor") return sponsorLines(today, list);
  const t = tournamentLines(today, list);
  const partner = PARTNER_PACKAGES.some((p) => p.id === "tornei") ? [TORNEI_PARTNER] : [];
  // eventi: the next tournament and its guest teams first, then the partner line.
  return ctx === "tornei" ? [...t, ...partner] : [...t.slice(0, 2), ...partner];
}

/** Day number of a Rome day (YYYY-MM-DD), for a stable start line; 0 for a malformed day. */
function dayNumber(day: string): number {
  const t = Date.parse(`${day}T12:00:00Z`);
  return Number.isNaN(t) ? 0 : Math.floor(t / 86_400_000);
}

/** First line shown on a Rome day: changes every day, identical on server and client. */
export function eneaStartIndex(day: string, count: number): number {
  if (count <= 0) return 0;
  return ((dayNumber(day) % count) + count) % count;
}

/** Next line index (wraps). */
export function nextEneaIndex(i: number, count: number): number {
  return count <= 0 ? 0 : (i + 1) % count;
}

/** sessionStorage key of a dismissed guide (per page context, back after the browser session). */
export const eneaDismissKey = (ctx: EneaContext) => `scd-enea-closed:${ctx}`;
