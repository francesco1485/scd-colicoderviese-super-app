/**
 * Eventi e tornei protetti della S.C.D. ColicoDerviese.
 * Fonte: locandine ufficiali su Drive (CHRISTMAS_LARIO_CUP_2026_MASCHILE_LOCANDINA_UFFICIALE_R02,
 * CHRISTMAS_LARIO_CUP_2026_FEMALE_LOCANDINA_UFFICIALE_R03) e Master Tornei (evento protetto 08/12/2026).
 * Squadre ospiti: solo nomi (gli stemmi richiedono fonte verificata e consenso). Nessun risultato inventato.
 */

export type Phase = "pre" | "live" | "post";

export type Cup = {
  badge: string;
  title: string;
  city: string;
  venue: string;
  mapsQuery: string;
  categories: { big: string; title: string; note: string }[];
  confirmed: { name: string; country?: string }[];
  note?: string;
};

export const CHRISTMAS_LARIO_CUP = {
  slug: "christmas-lario-cup",
  name: "Christmas Lario Cup",
  edition: "1ª edizione",
  dateLabel: "Martedì 8 dicembre 2026",
  start: "2026-12-08T10:30:00+01:00",
  end: "2026-12-08T19:00:00+01:00",
  tagline: "Il calcio che unisce, anche a Natale",
  claim: "Colico, dove lo sport lascia il segno",
  coOrganizer: "Sport Pro Experience",
  infoUrl: "https://www.sportproexperience.com",
  infoMail: "info@sportproexperience.com",
  goal: { min: 32, max: 48 },
  source: "Locandine ufficiali R02 (maschile) e R03 (Female Edition)",
  posters: [
    {
      src: "/media/eventi/christmas-lario-cup-2026-maschile.webp",
      alt: "Locandina ufficiale Christmas Lario Cup 2026, torneo maschile",
      caption: "Torneo maschile, Colico",
    },
    {
      src: "/media/eventi/christmas-lario-cup-2026-female.webp",
      alt: "Locandina ufficiale Christmas Lario Cup 2026, Female Edition",
      caption: "Female Edition, Dervio",
    },
  ],
  cups: [
    {
      badge: "Maschile",
      title: "Christmas Lario Cup",
      city: "Colico (LC)",
      venue: "Centro Sportivo Via Lido, Campo Sportivo dei Montecchi",
      mapsQuery: "Centro Sportivo Via Lido Colico",
      categories: [
        { big: "2015", title: "Annata 2015", note: "Squadre dilettanti" },
        {
          big: "2016",
          title: "Annata 2016",
          note: "Squadre professionistiche",
        },
      ],
      confirmed: [
        { name: "A.C. Renate" },
        { name: "Sampdoria" },
        { name: "AlbinoLeffe" },
        { name: "Calcio Lecco" },
        { name: "Folgore Caratese" },
        { name: "Spezia" },
      ],
    },
    {
      badge: "Female edition",
      title: "Christmas Lario Cup Female",
      city: "Dervio (LC)",
      venue: "Centro Sportivo Comunale",
      mapsQuery: "Centro Sportivo Comunale Dervio",
      categories: [
        {
          big: "9v9",
          title: "Esordienti, nate 2014–2015",
          note: "Ammesse le 2016 con 10 anni compiuti",
        },
      ],
      confirmed: [
        { name: "Calcio Lecco" },
        { name: "Pro Sesto Women" },
        { name: "Hibernians F.C. Paola", country: "Malta" },
      ],
      note: "In contemporanea al torneo maschile: stessa organizzazione, stesse iscrizioni.",
    },
  ] satisfies Cup[],
  village: [
    {
      title: "Squadre di prestigio",
      text: "Vivai professionistici e club del territorio",
    },
    { title: "Area ristoro", text: "Per tutta la giornata" },
    { title: "Casette di degustazione", text: "Sapori del lago e del Natale" },
    { title: "Villaggio di Natale", text: "Per famiglie e bambini" },
  ],
  partnerSlots: [
    {
      mark: "1",
      title: "Title partner",
      text: '"Christmas Lario Cup presentata da": locandine, pagina, card condivise e premiazioni',
    },
    {
      mark: "C",
      title: "Naming di un campo",
      text: "Il campo prende il tuo nome per tutta la giornata, nel programma e nel live",
    },
    {
      mark: "★",
      title: "Premio fair play",
      text: "Un premio di squadra, mai individuale, consegnato dal partner",
    },
    {
      mark: "V",
      title: "Villaggio e casette",
      text: "Una casetta o uno spazio nel villaggio di Natale",
    },
  ],
} as const;

/** Fase dell'evento rispetto all'orario ufficiale (10:30–19:00). */
export function eventPhase(
  nowMs: number,
  start = CHRISTMAS_LARIO_CUP.start,
  end = CHRISTMAS_LARIO_CUP.end,
): Phase {
  if (nowMs < Date.parse(start)) return "pre";
  return nowMs < Date.parse(end) ? "live" : "post";
}

/** Giorni, ore, minuti, secondi al via (null se iniziato). */
export function eventCountdown(
  nowMs: number,
  start = CHRISTMAS_LARIO_CUP.start,
): { d: number; h: number; m: number; s: number } | null {
  const dt = Date.parse(start) - nowMs;
  if (dt <= 0) return null;
  return {
    d: Math.floor(dt / 86_400_000),
    h: Math.floor((dt % 86_400_000) / 3_600_000),
    m: Math.floor((dt % 3_600_000) / 60_000),
    s: Math.floor((dt % 60_000) / 1000),
  };
}

/** Squadre confermate pubblicamente (somma dei due tornei). */
export const confirmedCount = () =>
  CHRISTMAS_LARIO_CUP.cups.reduce((n, c) => n + c.confirmed.length, 0);
