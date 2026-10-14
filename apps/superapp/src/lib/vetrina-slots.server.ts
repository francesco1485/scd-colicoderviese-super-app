/**
 * Slot catalogue of the public-home vetrina and its palinsesto (UD-110). Server only: imported inside the handler of
 * getVetrina (vetrina.functions.ts), so time-limited slots never reach the browser bundle before their window.
 *
 * TO CHANGE THE VETRINA: edit this list (and the weekly rhythm VETRINA_RHYTHM in vetrina.ts). Each slot points to an
 * EXISTING page (checked by vetrina.test.ts against the generated route tree). Fields: theme (which palinsesto day
 * it belongs to), audiences (worlds), weight 1..5, commercial (never shown to the kids' world), kidFriendly,
 * evergreen (used to keep at least 3 slots), weekdays (extra JS weekdays, 0 = Sunday), monthFrom/monthTo, season
 * peak (peakFrom/peakUntil or peakMonthFrom/peakMonthTo), showFrom/showUntil (Rome days, inclusive), requires (data
 * condition computed on the server). Copy states only facts already published by the club (sources noted per slot).
 *
 * Deliberately NOT in the vetrina: "Diventa partner" and partner logos (they live once, in the sponsor zone), the
 * affiliations (credential strip and footer), team lists (teams are inside, UD-100). Not available yet (no real page
 * or data, reported): fondo solidale, end-of-season events, standings, polls, podcast "Parliamo di noi".
 */
import { CAST, castAvatarSrc, castReady } from "./assistant-cast";
import { CHRISTMAS_LARIO_CUP as CLC } from "./events";
import { INITIATIVES } from "./initiatives.server";
import { dayMonth, type Initiative } from "./initiatives";
import { TOURNAMENTS } from "./tournaments";
import type { VetrinaSlot } from "./vetrina";

const addDays = (day: string, n: number): string =>
  new Date(Date.parse(`${day}T12:00:00Z`) + n * 86_400_000)
    .toISOString()
    .slice(0, 10);

/** A time-limited initiative (initiatives.server.ts) as a vetrina slot: same window, same page; Tuesday = formazione. */
export function initiativeSlot(i: Initiative): VetrinaSlot {
  return {
    id: `initiative-${i.id}`,
    kind: "initiative",
    theme: "formazione",
    kicker: `Formazione · fino al ${dayMonth(i.showUntil)}`,
    title: i.title,
    text: i.subtitle,
    href: i.href,
    cta: "Scopri l'iniziativa",
    visual: {
      kind: "image",
      src: i.flyer.src,
      alt: i.flyer.alt,
      position: "center 6%",
    },
    audience: "public",
    audiences: ["ragazzi", "bambini", "famiglie"],
    weight: 4,
    showFrom: i.showFrom,
    showUntil: i.showUntil,
  };
}

/**
 * Club agreements ("convenzioni", Monday) and partner initiatives — reserved by the Direzione (19:03: "poi troveremo
 * accordi e daremo spazio anche alle nostre convenzioni e altre iniziative"). Add items here only when an agreement
 * is signed: kind "convenzione" | "partner-initiative", theme "convenzioni", commercial: true (never in the kids'
 * world), audiences e.g. ["tifosi", "famiglie", "soci"], href to an existing page (e.g. /card or /sponsor).
 */
export const CONVENZIONI: readonly VetrinaSlot[] = [];

/**
 * Visual of a cast slot: the character's round portrait only when its approved picture fits the current role
 * (assistant-cast readiness), otherwise an original typographic panel. Era and Vera have no portrait until the
 * Direzione approves new images (roles inverted 14/10/2026, UD-111).
 */
export function castSlotVisual(id: "era" | "acanfora", alt: string, fallback: { big: string; small: string }): VetrinaSlot["visual"] {
  return castReady(id) ? { kind: "portrait", src: castAvatarSrc(id), alt } : { kind: "type", ...fallback };
}

const CLC_DAY = CLC.start.slice(0, 10);
/** Season arc from the event date: the Christmas Lario Cup is on air every day from 1 November to the event day. */
const CLC_PEAK_FROM = `${CLC_DAY.slice(0, 4)}-11-01`;

const nasazzi = TOURNAMENTS.find((t) => t.id === "memorial-jose-nasazzi");

export const VETRINA_SLOTS: readonly VetrinaSlot[] = [
  {
    // lib/events.ts: official poster R02 (maschile).
    id: "clc-maschile",
    kind: "event",
    theme: "eventi",
    kicker: "Torneo · 8 dicembre 2026",
    title: "Christmas Lario Cup",
    text: "Torneo maschile a Colico, annate 2015 e 2016: vivai professionistici e club del territorio.",
    href: "/eventi/christmas-lario-cup",
    hash: "iscrizioni",
    cta: "Programma e iscrizioni",
    visual: {
      kind: "image",
      src: CLC.posters[0].src,
      alt: CLC.posters[0].alt,
      position: "center 18%",
    },
    audience: "public",
    audiences: ["bambini", "ragazzi", "famiglie", "tifosi"],
    weight: 5,
    evergreen: true,
    kidFriendly: true,
    weekdays: [0, 4, 5, 6],
    peakFrom: CLC_PEAK_FROM,
    peakUntil: CLC_DAY,
    badge: "Maschile",
    showUntil: CLC_DAY,
  },
  {
    // lib/events.ts: official poster R03 (Female Edition).
    id: "clc-female",
    kind: "event",
    theme: "eventi",
    kicker: "Torneo · 8 dicembre 2026",
    title: "Christmas Lario Cup Female",
    text: "Female Edition a Dervio, Esordienti 9v9 nate 2014–2015: in contemporanea al torneo maschile.",
    href: "/eventi/christmas-lario-cup",
    hash: "tornei",
    cta: "Scopri la Female Edition",
    visual: {
      kind: "image",
      src: CLC.posters[1].src,
      alt: CLC.posters[1].alt,
      position: "center 18%",
    },
    audience: "public",
    audiences: ["bambini", "ragazzi", "famiglie", "tifosi"],
    weight: 5,
    evergreen: true,
    kidFriendly: true,
    weekdays: [0, 4, 5, 6],
    peakFrom: CLC_PEAK_FROM,
    peakUntil: CLC_DAY,
    badge: "Femminile",
    showUntil: CLC_DAY,
  },
  {
    // lib/tournaments.ts.
    id: "tornei",
    kind: "tournament",
    theme: "eventi",
    kicker: "Tornei del club",
    title: "Tutti i nostri tornei",
    text: "Christmas Lario Cup maschile e femminile, Memorial José Nasazzi 2027, Memorial Sandro Guattini.",
    href: "/tornei",
    cta: "Vai ai tornei",
    visual: { kind: "type", big: "CUP", small: "Tornei SCD" },
    audience: "public",
    audiences: ["ragazzi", "famiglie", "tifosi"],
    weight: 4,
    evergreen: true,
    weekdays: [4, 5],
  },
  ...(nasazzi?.date
    ? [
        {
          // lib/tournaments.ts (Master Tornei: 22–23 May 2027, to be confirmed). Peak: the 7 weeks before the event.
          id: "nasazzi",
          kind: "tournament",
          theme: "eventi",
          kicker: `Torneo · ${nasazzi.when ?? "date in arrivo"}`,
          title: "Memorial José Nasazzi",
          text: "Lo storico torneo della società torna a maggio 2027 (date da confermare).",
          href: "/tornei",
          hash: nasazzi.id,
          cta: "Dettagli in arrivo",
          visual: {
            kind: "type",
            big: nasazzi.date.slice(0, 4),
            small: "Memorial Nasazzi",
          },
          audience: "public",
          audiences: ["ragazzi", "famiglie", "tifosi"],
          weight: 2,
          weekdays: [5],
          peakFrom: addDays(nasazzi.date, -49),
          peakUntil: addDays(nasazzi.date, 1),
          showUntil: addDays(nasazzi.date, 1),
        } satisfies VetrinaSlot,
      ]
    : []),
  {
    // /entra (pre-registration). Season arc: peak in September–October.
    id: "iscrizioni",
    kind: "join",
    theme: "iscrizioni",
    kicker: "Stagione 2026/27",
    title: "Iscrizioni e prova",
    text: "Vuoi giocare con noi? Scegli categoria e annata: la segreteria ti ricontatta.",
    href: "/entra",
    cta: "Chiedi una prova",
    visual: { kind: "type", big: "26/27", small: "Iscrizioni aperte" },
    audience: "public",
    audiences: ["bambini", "ragazzi", "famiglie"],
    weight: 4,
    evergreen: true,
    weekdays: [3],
    peakMonthFrom: 9,
    peakMonthTo: 10,
  },
  {
    // Sky only in the kids' world, never a big hero (UD-110): small official portrait (LOCKED asset).
    id: "sky-scuola-calcio",
    kind: "kids",
    theme: "kids",
    kicker: "Per i più piccoli",
    title: "La Scuola Calcio con Sky",
    text: "Sky, la mascotte portafortuna, accompagna i più piccoli: richiedi una prova per la Scuola Calcio.",
    href: "/entra",
    cta: "Prova la Scuola Calcio",
    visual: {
      kind: "portrait",
      src: "/media/brand/sky-atv-head.webp",
      alt: "Sky, mascotte ufficiale della ColicoDerviese",
    },
    audience: "public",
    audiences: ["bambini"],
    weight: 3,
    kidFriendly: true,
    evergreen: true,
  },
  {
    // UD-102: /la-mia-scd/campione (members; minors through the family account, back-view bases only).
    id: "crea-campione",
    kind: "kids",
    theme: "giochi",
    kicker: "Il tuo avatar",
    title: "Crea il tuo campione",
    text: "Scegli la base, il soprannome e il numero di maglia: il tuo campione con lo stemma del club.",
    href: "/la-mia-scd/campione",
    cta: "Crea il campione",
    visual: { kind: "type", big: "10", small: "Crea il tuo campione" },
    audience: "members",
    audiences: ["bambini", "ragazzi", "soci"],
    weight: 3,
    kidFriendly: true,
    evergreen: true,
  },
  {
    // config/scd-member-services.v1.json: massaggi-tecar (ACTIVE, infermeria). Cast: Dottor Acanfora, medico (UD-091, UD-111).
    id: "servizio-infermeria",
    kind: "service",
    theme: "servizi",
    kicker: "Servizi ai tesserati",
    title: "Infermeria del club",
    text: "Massaggi e tecar riservati ai tesserati, e i consigli di prevenzione e primo soccorso del Dottor Acanfora, il medico del club.",
    href: "/infermeria",
    cta: "Vai all'infermeria",
    visual: castSlotVisual("acanfora", `${CAST.acanfora.name}, il medico del club`, { big: "112", small: "Infermeria" }),
    audience: "members",
    audiences: ["famiglie", "ragazzi", "soci"],
    weight: 3,
  },
  {
    // /documenti: club documents by audience; the secretariat is the contact for registrations and fees.
    id: "servizio-segreteria",
    kind: "service",
    theme: "servizi",
    kicker: "Segreteria",
    title: "Moduli e documenti",
    text: "Regolamenti, moduli e documenti della società, ognuno per chi deve leggerlo.",
    href: "/documenti",
    cta: "Apri i documenti",
    visual: { kind: "type", big: "DOC", small: "Segreteria" },
    audience: "public",
    audiences: ["famiglie", "soci"],
    weight: 3,
    evergreen: true,
  },
  {
    // lib/era-nutrition-tips.ts (EraNutritionCard on /famiglia). Cast: Era, nutrizionista (UD-111): general habits only.
    id: "servizio-nutrizione",
    kind: "service",
    theme: "servizi",
    kicker: "Alimentazione e sport",
    title: "I consigli di Era",
    text: "La nutrizionista del club: il consiglio del giorno, acqua, merenda prima e dopo l'allenamento, colazione e sonno.",
    href: "/famiglia",
    cta: "Leggi i consigli",
    visual: castSlotVisual("era", `${CAST.era.name}, la nutrizionista del club`, { big: "ERA", small: "Nutrizione" }),
    audience: "members",
    audiences: ["famiglie", "ragazzi", "soci"],
    weight: 3,
    // Tuesday is also "formazione e tecnica … consigli".
    weekdays: [2],
  },
  {
    // config/scd-club-cards.v1.json (/card).
    id: "promo-card",
    kind: "promo",
    theme: "card",
    kicker: "Promozioni per i tesserati",
    title: "Le card 2026/27",
    text: "Tesserato, Sostenitore e Partner: credito alla Club House, listino dedicato e attività convenzionate.",
    href: "/card",
    cta: "Scopri le card",
    visual: { kind: "type", big: "CARD", small: "Club House" },
    audience: "public",
    audiences: ["tifosi", "famiglie", "soci"],
    weight: 3,
    commercial: true,
  },
  {
    // config/scd-kit-catalog.v1.json (/kit).
    id: "kit-2026-27",
    kind: "kit",
    theme: "card",
    kicker: "Kit ufficiale 2026/27",
    title: "Compra il tuo kit",
    text: "Kit atleti e Primi Calci: cosa contiene, quanto costa e come si ordina.",
    href: "/kit",
    cta: "Vedi i kit",
    visual: {
      kind: "image",
      src: "/media/kit/kit-legea-atleti.webp",
      alt: "Tavola del kit atleti 2026/27 Legea",
      fit: "contain",
    },
    audience: "public",
    audiences: ["famiglie", "ragazzi", "soci"],
    weight: 3,
    commercial: true,
    evergreen: true,
  },
  ...CONVENZIONI,
  {
    // Public fixtures of every team (anonymous calendar = fixtures only, UD-100). Thursday "squadre e annate",
    // Friday "si gioca nel weekend".
    id: "calendario-annate",
    kind: "fixtures",
    theme: "squadre",
    kicker: "Tutte le annate",
    title: "Le gare della settimana",
    text: "Dalla Prima Squadra ai più piccoli: giorno, ora e campo di ogni gara.",
    href: "/calendario",
    cta: "Apri il calendario",
    visual: { kind: "type", big: "GARE", small: "Calendario" },
    audience: "public",
    audiences: ["ragazzi", "famiglie", "tifosi", "soci"],
    weight: 3,
    evergreen: true,
    weekdays: [5],
  },
  {
    // /impianti: public entrance and ticket office (TicketRules).
    id: "biglietteria",
    kind: "promo",
    theme: "weekend",
    kicker: "Si gioca nel weekend",
    title: "Ingresso e biglietteria",
    text: "Come arrivare ai campi di Colico e Dervio, ingresso del pubblico e regole della biglietteria.",
    href: "/impianti",
    cta: "Ingresso e biglietti",
    visual: {
      kind: "image",
      src: "/media/scd/pianta-colico-2026.webp",
      alt: "Pianta del centro sportivo di Colico",
      fit: "contain",
    },
    audience: "public",
    audiences: ["tifosi", "famiglie"],
    weight: 3,
    commercial: true,
  },
  {
    // /comunicazioni?tab=social: official channels (UD-090: only free amateur streams of our own matches).
    id: "dirette-video",
    kind: "media",
    theme: "dirette",
    kicker: "Dirette e video",
    title: "Le partite sui nostri canali",
    text: "Video e dirette gratuite delle nostre gare sui canali ufficiali del club.",
    href: "/comunicazioni",
    search: { tab: "social" },
    cta: "Guarda i video",
    visual: { kind: "type", big: "LIVE", small: "Video SCD" },
    audience: "public",
    audiences: ["bambini", "ragazzi", "famiglie", "tifosi"],
    weight: 3,
  },
  {
    // UD-094: Monday press review; Sunday "risultati, rassegna". Only when the server found recent headlines.
    id: "dicono-di-noi",
    kind: "press",
    theme: "racconti",
    kicker: "Rassegna stampa",
    title: "Dicono di noi",
    text: "I titoli delle testate su società, Colico e Dervio, con il link all'articolo originale.",
    href: "/rassegna-stampa",
    cta: "Leggi la rassegna",
    visual: {
      kind: "image",
      src: "/media/scd/lario-header.webp",
      alt: "L'Alto Lago di Como visto da Colico",
      position: "30% center",
    },
    audience: "public",
    audiences: ["ragazzi", "famiglie", "tifosi"],
    weight: 3,
    weekdays: [1],
    requires: "pressRecent",
  },
  {
    // /comunicazioni: club communications.
    id: "notizie-club",
    kind: "press",
    theme: "racconti",
    kicker: "Dal club",
    title: "Comunicazioni del club",
    text: "Avvisi e novità della società, aggiornati dalla segreteria.",
    href: "/comunicazioni",
    cta: "Leggi le novità",
    visual: { kind: "type", big: "NEWS", small: "Dal club" },
    audience: "public",
    audiences: ["ragazzi", "famiglie", "tifosi", "soci"],
    weight: 2,
    evergreen: true,
  },
  {
    id: "fantacalcio",
    kind: "game",
    theme: "giochi",
    kicker: "Giochi del club",
    title: "Fantacalcio SCD",
    text: "Scegli i tuoi 11 tra i giocatori del club e sfida gli altri tifosi, gratis.",
    href: "/fantacalcio",
    cta: "Gioca",
    visual: { kind: "type", big: "11", small: "Fantacalcio SCD" },
    audience: "public",
    audiences: ["bambini", "ragazzi", "tifosi", "soci"],
    weight: 2,
    kidFriendly: true,
    evergreen: true,
    weekdays: [5, 6],
  },
  {
    id: "top11",
    kind: "game",
    theme: "squadre",
    kicker: "Giochi del club",
    title: "Top 11 della settimana",
    text: "Vota i migliori in campo: si premia ogni mese in club house.",
    href: "/top11",
    cta: "Vota",
    visual: { kind: "type", big: "TOP", small: "Top 11" },
    audience: "public",
    audiences: ["ragazzi", "famiglie", "tifosi", "soci"],
    weight: 2,
    weekdays: [0],
  },
  {
    id: "installa-app",
    kind: "media",
    theme: "racconti",
    kicker: "L'app del club",
    title: "Installa l'app",
    text: "Avvisi, calendario, giochi e aree riservate sul telefono, gratis.",
    href: "/installa",
    cta: "Installa",
    visual: { kind: "type", big: "APP", small: "S.C.D. ColicoDerviese" },
    audience: "public",
    audiences: ["famiglie", "tifosi", "ragazzi"],
    weight: 2,
    evergreen: true,
    weekdays: [1, 4],
  },
  {
    id: "tifosi",
    kind: "media",
    theme: "weekend",
    kicker: "Tifosi",
    title: "La casa dei tifosi",
    text: "Giochi, notizie e foto della tua squadra: segui il club da vicino.",
    href: "/community",
    cta: "Entra tra i tifosi",
    visual: { kind: "type", big: "FAN", small: "Tifosi SCD" },
    audience: "public",
    audiences: ["tifosi"],
    weight: 2,
    weekdays: [6],
  },
];

/** Full catalogue: static slots plus every initiative (their windows decide visibility). */
export function vetrinaCatalogue(): VetrinaSlot[] {
  return [...VETRINA_SLOTS, ...INITIATIVES.map(initiativeSlot)];
}
