/**
 * Christmas Lario Cup page in Italian, German and English (strategy 14/10/2026: guest clubs from abroad and lake
 * tourists; Hibernians F.C. Paola comes from Malta). Facts (teams, dates, venues, goals) stay in events.ts and are
 * never translated: only words change. Team and venue names stay as on the official posters.
 */
import { CHRISTMAS_LARIO_CUP } from "./events";

export type LarioLang = "it" | "de" | "en";
export const LARIO_LANGS: readonly LarioLang[] = ["it", "de", "en"];
export const LARIO_LANG_LABEL: Record<LarioLang, string> = {
  it: "Italiano",
  de: "Deutsch",
  en: "English",
};

export function parseLarioLang(value: unknown): LarioLang {
  return value === "de" || value === "en" ? value : "it";
}

type CupText = {
  badge: string;
  categories: { title: string; note: string }[];
  note?: string;
  arrive: string;
};

export type LarioText = {
  coWith: string;
  edition: string;
  tagline: string;
  claim: string;
  dateTitle: string;
  dateSub: string;
  placeSub: string;
  state: { pre: string; live: string; post: string };
  countdownLabel: string;
  units: [string, string, string, string];
  enter: string;
  cupsKicker: string;
  cupsTitle: string;
  confirmedTitle: string;
  cups: [CupText, CupText];
  signKicker: string;
  signTitle: string;
  goalWord: string;
  progressLabel: string;
  confirmedNote: (n: number) => string;
  writeOrg: string;
  liveKicker: string;
  liveTitle: string;
  liveHead: { pre: string; live: string; post: string };
  liveBadge: { pre: string; live: string; post: string };
  liveText: string;
  villageKicker: string;
  villageTitle: string;
  village: { title: string; text: string }[];
  partnerKicker: string;
  partnerTitle: string;
  partners: { title: string; text: string }[];
  available: string;
  becomePartner: string;
  postersKicker: string;
  postersTitle: string;
  posters: { alt: string; caption: string }[];
  arriveKicker: string;
  arriveTitle: string;
  openMaps: string;
  arriveNote: string;
  orgTitle: string;
  orgText: string;
  orgInfo: string;
  privacy: string;
  sourceLabel: string;
  langLabel: string;
};

const E = CHRISTMAS_LARIO_CUP;

const IT: LarioText = {
  coWith: "con",
  edition: E.edition,
  tagline: E.tagline,
  claim: E.claim,
  dateTitle: "Martedì 8 dicembre",
  dateSub: "2026 · tutto il giorno",
  placeSub: "Lago di Como",
  state: {
    pre: "Iscrizioni aperte",
    live: "Si gioca adesso a Colico e Dervio",
    post: "Grazie a tutte le squadre: appuntamento alla 2ª edizione",
  },
  countdownLabel: "Conto alla rovescia",
  units: ["Giorni", "Ore", "Min", "Sec"],
  enter: "Iscrivi la tua squadra",
  cupsKicker: "Due tornei, un solo Natale",
  cupsTitle: "I tornei",
  confirmedTitle: "Squadre confermate",
  cups: [
    {
      badge: "Maschile",
      categories: [
        { title: "Annata 2015", note: "Squadre dilettanti" },
        { title: "Annata 2016", note: "Squadre professionistiche" },
      ],
      arrive: "Torneo maschile.",
    },
    {
      badge: "Female edition",
      categories: [{ title: "Esordienti, nate 2014–2015", note: "Ammesse le 2016 con 10 anni compiuti" }],
      note: "In contemporanea al torneo maschile: stessa organizzazione, stesse iscrizioni.",
      arrive: "Female Edition.",
    },
  ],
  signKicker: "Porta la tua squadra sul lago",
  signTitle: "Iscrizioni aperte",
  goalWord: "squadre: l'obiettivo",
  progressLabel: "Squadre confermate pubblicamente rispetto all'obiettivo minimo",
  confirmedNote: (n) =>
    `${n} squadre confermate pubblicamente dalle locandine ufficiali. Il contatore si aggiornerà con il registro iscrizioni dell'organizzazione.`,
  writeOrg: "Scrivi all'organizzazione",
  liveKicker: "Ogni gol, in tempo reale",
  liveTitle: "Il torneo live",
  liveHead: { pre: "Si accende l'8 dicembre", live: "In campo ora", post: "Risultati finali" },
  liveBadge: { pre: "In arrivo", live: "Live", post: "Concluso" },
  liveText:
    "Calendario, gironi, classifiche e tabellone compaiono qui quando l'organizzazione li pubblica. I risultati li inserisce lo staff a bordo campo; per le annate giovanili niente statistiche individuali e nessuna classifica dove il regolamento SGS non la prevede.",
  villageKicker: "Non solo partite",
  villageTitle: "Il villaggio di Natale",
  village: E.village.map((v) => ({ title: v.title, text: v.text })),
  partnerKicker: "Il tuo marchio sotto le luci",
  partnerTitle: "Partner dell'evento",
  partners: E.partnerSlots.map((p) => ({ title: p.title, text: p.text })),
  available: "Disponibile",
  becomePartner: "Diventa partner",
  postersKicker: "Da condividere",
  postersTitle: "Locandine ufficiali",
  posters: E.posters.map((p) => ({ alt: p.alt, caption: p.caption })),
  arriveKicker: "Un giorno di festa sul lago",
  arriveTitle: "Come arrivare",
  openMaps: "Apri in Maps",
  arriveNote:
    "L'8 dicembre è festivo: ponte dell'Immacolata sul Lago di Como. Parcheggi e navette verranno indicati qui prima del torneo.",
  orgTitle: "Organizzazione",
  orgText: `Organizza la S.C.D. ColicoDerviese con ${E.coOrganizer}, co-organizzatore.`,
  orgInfo: "Informazioni e adesioni:",
  privacy:
    "Foto e video solo con il consenso delle famiglie, area media dedicata. Nessun nome o statistica individuale di atleti minorenni viene pubblicato.",
  sourceLabel: "Dati dalle locandine ufficiali del torneo maschile e della Female Edition.",
  langLabel: "Lingua",
};

const DE: LarioText = {
  coWith: "mit",
  edition: "1. Ausgabe",
  tagline: "Fußball, der verbindet – auch an Weihnachten",
  claim: "Colico, wo der Sport Spuren hinterlässt",
  dateTitle: "Dienstag, 8. Dezember",
  dateSub: "2026 · ganztägig",
  placeSub: "Comer See",
  state: {
    pre: "Anmeldung offen",
    live: "Jetzt wird in Colico und Dervio gespielt",
    post: "Danke an alle Mannschaften – bis zur 2. Ausgabe",
  },
  countdownLabel: "Countdown",
  units: ["Tage", "Std", "Min", "Sek"],
  enter: "Mannschaft anmelden",
  cupsKicker: "Zwei Turniere, ein Weihnachten",
  cupsTitle: "Die Turniere",
  confirmedTitle: "Bestätigte Mannschaften",
  cups: [
    {
      badge: "Jungen",
      categories: [
        { title: "Jahrgang 2015", note: "Amateurvereine" },
        { title: "Jahrgang 2016", note: "Profivereine" },
      ],
      arrive: "Turnier der Jungen.",
    },
    {
      badge: "Female edition",
      categories: [
        { title: "Esordienti, Jahrgänge 2014–2015", note: "Jahrgang 2016 ab vollendetem 10. Lebensjahr zugelassen" },
      ],
      note: "Zeitgleich mit dem Turnier der Jungen: gleiche Organisation, gleiche Anmeldung.",
      arrive: "Female Edition.",
    },
  ],
  signKicker: "Bring deine Mannschaft an den See",
  signTitle: "Anmeldung offen",
  goalWord: "Mannschaften: das Ziel",
  progressLabel: "Öffentlich bestätigte Mannschaften im Verhältnis zum Mindestziel",
  confirmedNote: (n) =>
    `${n} Mannschaften laut den offiziellen Plakaten öffentlich bestätigt. Der Zähler wird mit dem Anmeldeverzeichnis der Organisation aktualisiert.`,
  writeOrg: "Organisation kontaktieren",
  liveKicker: "Jedes Tor in Echtzeit",
  liveTitle: "Das Turnier live",
  liveHead: { pre: "Start am 8. Dezember", live: "Jetzt auf dem Platz", post: "Endergebnisse" },
  liveBadge: { pre: "Demnächst", live: "Live", post: "Beendet" },
  liveText:
    "Spielplan, Gruppen, Tabellen und Turnierbaum erscheinen hier, sobald die Organisation sie veröffentlicht. Die Ergebnisse trägt das Personal am Spielfeldrand ein; bei Jugendmannschaften gibt es keine Einzelstatistiken und keine Tabellen, wo das SGS-Reglement sie nicht vorsieht.",
  villageKicker: "Nicht nur Spiele",
  villageTitle: "Das Weihnachtsdorf",
  village: [
    { title: "Renommierte Mannschaften", text: "Profi-Nachwuchs und Vereine aus der Region" },
    { title: "Verpflegung", text: "Den ganzen Tag" },
    { title: "Verkostungshütten", text: "Aromen vom See und von Weihnachten" },
    { title: "Weihnachtsdorf", text: "Für Familien und Kinder" },
  ],
  partnerKicker: "Deine Marke im Rampenlicht",
  partnerTitle: "Event-Partner",
  partners: [
    { title: "Title partner", text: "„Christmas Lario Cup präsentiert von“: Plakate, Seite, geteilte Karten und Siegerehrung" },
    { title: "Platz-Naming", text: "Der Platz trägt den ganzen Tag deinen Namen, im Programm und im Live-Bereich" },
    { title: "Fair-Play-Preis", text: "Ein Mannschaftspreis, nie ein Einzelpreis, überreicht vom Partner" },
    { title: "Dorf und Hütten", text: "Eine Hütte oder ein Platz im Weihnachtsdorf" },
  ],
  available: "Verfügbar",
  becomePartner: "Partner werden",
  postersKicker: "Zum Teilen",
  postersTitle: "Offizielle Plakate",
  posters: [
    { alt: "Offizielles Plakat Christmas Lario Cup 2026, Turnier der Jungen", caption: "Turnier der Jungen, Colico" },
    { alt: "Offizielles Plakat Christmas Lario Cup 2026, Female Edition", caption: "Female Edition, Dervio" },
  ],
  arriveKicker: "Ein Festtag am See",
  arriveTitle: "Anreise",
  openMaps: "In Maps öffnen",
  arriveNote:
    "Der 8. Dezember ist in Italien ein Feiertag (Mariä Empfängnis). Parkplätze und Shuttles werden hier vor dem Turnier angegeben.",
  orgTitle: "Organisation",
  orgText: `Veranstalter ist die S.C.D. ColicoDerviese mit ${E.coOrganizer} als Mitveranstalter.`,
  orgInfo: "Informationen und Anmeldung:",
  privacy:
    "Fotos und Videos nur mit Zustimmung der Familien, eigener Medienbereich. Es werden keine Namen oder Einzelstatistiken minderjähriger Spielerinnen und Spieler veröffentlicht.",
  sourceLabel: "Angaben laut den offiziellen Turnierplakaten.",
  langLabel: "Sprache",
};

const EN: LarioText = {
  coWith: "with",
  edition: "1st edition",
  tagline: "Football that brings people together, at Christmas too",
  claim: "Colico, where sport leaves its mark",
  dateTitle: "Tuesday 8 December",
  dateSub: "2026 · all day",
  placeSub: "Lake Como",
  state: {
    pre: "Registration open",
    live: "Matches under way in Colico and Dervio",
    post: "Thank you to every team: see you at the 2nd edition",
  },
  countdownLabel: "Countdown",
  units: ["Days", "Hrs", "Min", "Sec"],
  enter: "Register your team",
  cupsKicker: "Two tournaments, one Christmas",
  cupsTitle: "The tournaments",
  confirmedTitle: "Confirmed teams",
  cups: [
    {
      badge: "Boys",
      categories: [
        { title: "Born 2015", note: "Amateur clubs" },
        { title: "Born 2016", note: "Professional clubs" },
      ],
      arrive: "Boys' tournament.",
    },
    {
      badge: "Female edition",
      categories: [{ title: "Esordienti, born 2014–2015", note: "Girls born 2016 admitted once they turn 10" }],
      note: "Played at the same time as the boys' tournament: same organisers, same registration.",
      arrive: "Female Edition.",
    },
  ],
  signKicker: "Bring your team to the lake",
  signTitle: "Registration open",
  goalWord: "teams: the goal",
  progressLabel: "Publicly confirmed teams against the minimum goal",
  confirmedNote: (n) =>
    `${n} teams publicly confirmed on the official posters. The counter will follow the organisers' registration list.`,
  writeOrg: "Write to the organisers",
  liveKicker: "Every goal, in real time",
  liveTitle: "The tournament live",
  liveHead: { pre: "Kick-off on 8 December", live: "On the pitch now", post: "Final results" },
  liveBadge: { pre: "Coming soon", live: "Live", post: "Finished" },
  liveText:
    "Schedule, groups, tables and bracket appear here when the organisers publish them. Pitch-side staff enter the results; youth age groups get no individual statistics and no tables where SGS rules do not allow them.",
  villageKicker: "More than matches",
  villageTitle: "The Christmas village",
  village: [
    { title: "Leading teams", text: "Professional academies and local clubs" },
    { title: "Food area", text: "Open all day" },
    { title: "Tasting huts", text: "Flavours of the lake and of Christmas" },
    { title: "Christmas village", text: "For families and children" },
  ],
  partnerKicker: "Your brand under the lights",
  partnerTitle: "Event partners",
  partners: [
    { title: "Title partner", text: '"Christmas Lario Cup presented by": posters, page, shared cards and award ceremony' },
    { title: "Pitch naming", text: "The pitch carries your name all day, in the programme and in the live area" },
    { title: "Fair play award", text: "A team award, never an individual one, presented by the partner" },
    { title: "Village and huts", text: "A hut or a space in the Christmas village" },
  ],
  available: "Available",
  becomePartner: "Become a partner",
  postersKicker: "To share",
  postersTitle: "Official posters",
  posters: [
    { alt: "Official poster of the Christmas Lario Cup 2026, boys' tournament", caption: "Boys' tournament, Colico" },
    { alt: "Official poster of the Christmas Lario Cup 2026, Female Edition", caption: "Female Edition, Dervio" },
  ],
  arriveKicker: "A day of celebration on the lake",
  arriveTitle: "Getting there",
  openMaps: "Open in Maps",
  arriveNote:
    "8 December is a public holiday in Italy (Feast of the Immaculate Conception). Parking and shuttles will be listed here before the tournament.",
  orgTitle: "Organisers",
  orgText: `Organised by S.C.D. ColicoDerviese with ${E.coOrganizer} as co-organiser.`,
  orgInfo: "Information and registration:",
  privacy:
    "Photos and videos only with families' consent, in a dedicated media area. No names or individual statistics of underage players are published.",
  sourceLabel: "Details from the official tournament posters.",
  langLabel: "Language",
};

export const LARIO_TEXT: Record<LarioLang, LarioText> = { it: IT, de: DE, en: EN };
