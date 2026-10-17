/**
 * Vetta Legnone — public showcase of platform 17 «Ricerca calciatori e iscriviti come calciatore»
 * (Francesco 17/10/2026 08:20 «una vetrina che faccia iscrivere i calciatori e tutto il mondo del calcio»;
 * name chosen at 08:2x: the Monte Legnone is Colico's mountain).
 *
 * Engine: PERSONE (players, families, former players, coaches and fans enter and come back).
 * Measured by: visits to /vetta-legnone and taps on each audience CTA towards /entra, /contatti and /top11
 * (Meta platform, once the analytics consent is in place), then requests received by the Segreteria per audience.
 *
 * Content rules (study docs/piattaforme/ricerche/vetta-legnone-studio.md, AGENTS.md principles 1-2):
 * - no individual names, no phone numbers or e-mail addresses, no market values, no votes on people;
 * - the 2011 date is where the club's digital archive starts, never the founding year (which stays uncertain);
 * - every history fact carries its source; outcomes not verified are written «da verificare»;
 * - nobody's profile is public today: scd_person_consents has 0 rows (SCD PULSE SELECT, 17/10/2026).
 * The only proper nouns allowed are club, competition, event and place names, plus Ottavio. Lario (the DS, UD-174)
 * does not speak on public pages: here he is only «il DS».
 * CTAs never promise what does not work: while PUBLIC_FORMS_LIVE is false the /entra form is paused, so players and
 * parents are sent to /contatti (official channels) with wording that promises no callback and no timing.
 */
import { PUBLIC_FORMS_LIVE } from "@/lib/public-forms";
import { CREST_SHARE_IMAGE, type SharePage } from "@/lib/share";

export const VETTA_PATH = "/vetta-legnone" as const;

export type Label = "VERIFIED" | "INFERRED" | "PROPOSED";

/** Existing routes a CTA may point to (checked against routeTree.gen.ts by the tests). */
export type VettaRoute = "/entra" | "/contatti" | "/top11" | "/privacy";

export const VETTA_HERO = {
  kicker: "S.C.D. ColicoDerviese · la piattaforma dei calciatori",
  title: "Vetta Legnone",
  line: "Dal lago alla vetta, un passo alla volta. Ogni passo sarà vero.",
  sub: "Qui si scriverà la storia di chi gioca, ha giocato e farà giocare la ColicoDerviese: con presenze, referti e tappe confermate dalla società. Niente prezzi, niente voti, niente scorciatoie.",
} as const;

/** Live counters of the hero. Each value has a source; a missing value would be «da confermare», never 0. */
/**
 * Hero counters. Each value shows its source and date under the number; a missing value would be «da confermare»,
 * never 0. No team or tesserati count here: those must cite the LND portal export (UD-176), not SCD PULSE.
 */
export const VETTA_COUNTERS: ReadonlyArray<{ value: string; label: string; source: string; tag: Label }> = [
  {
    value: "16",
    label: "stagioni documentate nell'archivio del club",
    // Digital archive of the club mailbox from 13/07/2011 (album «STORIA SCD» v1, Cervellone folder 04).
    source: "Fonte: archivio digitale del club, dal 13/07/2011, al 17/10/2026",
    tag: "VERIFIED",
  },
  {
    value: "Nessuna",
    label: "scheda pubblica oggi: prima servono i consensi",
    // SCD PULSE, table scd_person_consents empty (SELECT of 17/10/2026).
    source: "Fonte: registro consensi della Super App, al 17/10/2026",
    tag: "VERIFIED",
  },
];

export type Audience = {
  id: "calciatore" | "genitore" | "leggenda" | "mister" | "tifoso";
  who: string;
  invite: string;
  gets: string;
  cta: { label: string; to: VettaRoute; hint: string };
  /** What this audience will get later: shown as «Presto», never as a link. */
  soon: string;
};

/** Audience invitations; player and parent depend on whether the public registration form is live. */
export function vettaAudiences(formsLive: boolean = PUBLIC_FORMS_LIVE): readonly Audience[] {
  return [
    {
      id: "calciatore",
      who: "Calciatore adulto",
      invite: "Fatti conoscere con i numeri veri, non con le chiacchiere.",
      gets: "Il primo contatto con la società e, quando ci saranno i consensi, la tua scheda con fonte e data per ogni numero.",
      cta: formsLive
        ? { label: "Chiedi una prova", to: "/entra", hint: "Modulo di prova e iscrizione" }
        : { label: "Scrivi alla società", to: "/contatti", hint: "Dai canali ufficiali del club" },
      soon: "La tua scheda calciatore con QR",
    },
    {
      id: "genitore",
      who: "Genitore di un under 18",
      invite: "Suo figlio vuole provare? Il primo passo lo fa lei.",
      gets: "Una prova nella squadra della sua annata, se la società la conferma; la crescita del ragazzo resterà privata, solo in famiglia.",
      cta: formsLive
        ? { label: "Prenota una prova", to: "/entra", hint: "Per i minori la richiesta la fa sempre il genitore" }
        : { label: "Scriva alla società", to: "/contatti", hint: "Per i minori scrive sempre il genitore" },
      soon: "La salita di suo figlio, visibile solo alla famiglia",
    },
    {
      id: "leggenda",
      who: "Ex giocatore · Leggenda",
      invite: "Hai giocato con noi? Riporta a casa la tua storia.",
      gets: "Un posto nell'albo per epoca, quando la Direzione lo avrà verificato, e l'invito agli eventi del club.",
      cta: { label: "Racconta la tua storia", to: "/contatti", hint: "Dai canali ufficiali del club" },
      soon: "L'albo «Hanno giocato con noi»",
    },
    {
      id: "mister",
      who: "Mister o osservatore",
      invite: "Ci conosci? Dicci chi hai visto crescere.",
      gets: "Un canale con il DS: segnalazioni solo su adulti, moderate dalla società.",
      cta: { label: "Scrivi al club", to: "/contatti", hint: "I contatti con i calciatori li decide solo il DS" },
      soon: "«Garantiscono per lui»: segnalazioni tra adulti verificati",
    },
    {
      id: "tifoso",
      who: "Tifoso",
      invite: "Chi merita la Top 11? Dillo tu.",
      gets: "La Top 11 della settimana da votare e, presto, le proposte per le Leggende del club.",
      cta: { label: "Vota la Top 11", to: "/top11", hint: "Nome e iniziale solo con il consenso della famiglia, mai volti" },
      soon: "Proponi una Leggenda",
    },
  ];
}

export const VETTA_AUDIENCES: readonly Audience[] = vettaAudiences();

export const VETTA_AUDIENCES_INTRO = "Cinque modi per salire con noi. Quello che non c'è ancora è segnato «Presto».";

export type Epoch = {
  id: string;
  years: string;
  title: string;
  facts: readonly string[];
  /** Where the facts come from (Drive Cervellone, folder 04 · STORIA SCD). */
  source: string;
};

const ALBUM_V1 = "Album «STORIA SCD · stagione per stagione (v1)», Cervellone cartella 04";
const ALBUM_2526 = "«STORIA · 2025/26 · integrazione 2026-10-13», Cervellone cartella 04";

/**
 * Six epochs, VERIFIED from the club's history album (study §2.1). The 2011 date is where the digital archive
 * begins: the founding year is uncertain and is never stated here.
 */
export const VETTA_EPOCHS: readonly Epoch[] = [
  {
    id: "scuola-calcio",
    years: "2011–2015",
    title: "Gli anni della scuola calcio",
    facts: ["L'archivio digitale del club parte il 13/07/2011", "Liste del Settore Giovanile e Scolastico", "Fair Play 2014", "Piccoli Amici 2015"],
    source: ALBUM_V1,
  },
  {
    id: "tornei",
    years: "2015–2019",
    title: "I tornei",
    facts: ["Olginatese Cup e Vis Nova Cup", "Tornei per annata", "Torneo di Primavera ColicoDerviese"],
    source: ALBUM_V1,
  },
  {
    id: "elite-ripartenza",
    years: "2019–2022",
    title: "Élite e ripartenza",
    facts: [
      "Richieste di Scuola Calcio Élite",
      "Le stagioni del Covid, giocate con i protocolli",
      "Finale di Coppa Italia di Promozione, 14/05/2022 a Meda (esito da verificare)",
      "1° Memorial José Nasazzi, 2022",
      "Amichevole con la Sampdoria approvata dalla FIGC (31/05/2022)",
    ],
    source: ALBUM_V1,
  },
  {
    id: "crescita",
    years: "2022–2025",
    title: "Crescita",
    facts: [
      "I Torneo Città di Colico",
      "V Memorial José Nasazzi con club professionistici",
      "Atalanta Football Camp a Colico (2024)",
      "Ripescaggi nei campionati regionali giovanili",
    ],
    source: ALBUM_V1,
  },
  {
    id: "nuovo-campo",
    years: "2025/26",
    title: "Il nuovo campo",
    facts: [
      "Inaugurato il sintetico di via Lido (30/11/2025)",
      "Prima Squadra ai play-off di Promozione, girone B",
      "Play-off regionali per Under 17 e Under 15",
      "1° Memorial Sandro Guattini e 6° Memorial José Nasazzi",
    ],
    source: ALBUM_2526,
  },
  {
    id: "oggi",
    years: "2026/27",
    title: "Oggi",
    facts: [
      "Affiliazione con l'AC Monza",
      "Prima Squadra in Promozione",
      "Christmas Lario Cup, 8 dicembre 2026",
      "7° Memorial José Nasazzi, 22–23 maggio 2027",
    ],
    source: `${ALBUM_2526}; calendario eventi del club`,
  },
];

export const VETTA_HISTORY_STATUS = "Storia in ricostruzione · da confermare dalla Direzione";

export const VETTA_HISTORY_NOTE =
  "Sedici stagioni documentate, dal 2011/12 a oggi: è da lì che parte l'archivio digitale. La data di fondazione resta da ricostruire e la cerchiamo insieme a chi c'era.";

export type Need = { team: string; status: string; state: "da-indicare" | "da-confermare" | "aperto" };

/**
 * «Chi cerchiamo»: honest state on 17/10/2026. Roles are not known (no role column in the rosters) and are indicated
 * by each mister; nothing here is an invented need.
 */
export const VETTA_NEEDS: readonly Need[] = [
  { team: "Prima Squadra · Promozione", status: "Ruoli da indicare dal mister", state: "da-indicare" },
  { team: "Juniores Under 19 Élite", status: "Ruoli da indicare dal mister", state: "da-indicare" },
  { team: "Annata 2010", status: "Da confermare dal DS", state: "da-confermare" },
  { team: "Under 16 e più piccoli", status: "Porte aperte per una prova: la richiesta la fa il genitore", state: "aperto" },
];

export const VETTA_NEEDS_STATE_LABEL: Readonly<Record<Need["state"], string>> = {
  "da-indicare": "Da indicare",
  "da-confermare": "Da confermare dal DS",
  aperto: "Aperto",
};

export type Level = { id: string; name: string; meaning: string; how: string };

/** The climb from the lake to the summit: a profile grows only with verified data. */
export const VETTA_LEVELS: readonly Level[] = [
  { id: "riva", name: "Riva", meaning: "Sei arrivato", how: "Account e consenso firmato (per i minori quello dei genitori)" },
  { id: "molo", name: "Molo", meaning: "Hai un posto", how: "Ruolo, squadra e annata confermati dalla segreteria" },
  { id: "largo", name: "Largo", meaning: "Hai una storia", how: "Le tue stagioni nel club confermate dalla segreteria" },
  { id: "rifugio", name: "Rifugio", meaning: "Hai i numeri", how: "La prima statistica da un referto ufficiale" },
  { id: "vetta", name: "Vetta", meaning: "Sei dei nostri", how: "50 presenze ufficiali, o una segnalazione accettata tra adulti verificati" },
];

export const VETTA_LEVELS_NOTE =
  "Si sale solo con dati verificati dalla Segreteria: chi inventa non sale. Per i minori la salita resta privata e la vede solo la famiglia.";

export const VETTA_PROFILE_STATUS = {
  title: "La tua scheda è in arrivo",
  text: "Le schede si accenderanno quando ci saranno i consensi firmati: oggi nessuna è pubblica. Intanto puoi scrivere alla società.",
} as const;

export const VETTA_STEPS: readonly { title: string; text: string }[] = [
  { title: "Ti fai avanti", text: "Scrivi alla società. Per un minore lo fa il genitore." },
  { title: "La società verifica", text: "La segreteria controlla i dati sulle fonti ufficiali: referti, comunicati, tesseramenti." },
  { title: "La tua storia sale", text: "Dopo ogni referto la scheda guadagna un passo, con fonte e data." },
];

/** What we do better than the market-value sites (the principle, never their assets). */
export const VETTA_BETTER: readonly { elsewhere: string; here: string }[] = [
  { elsewhere: "Valori di mercato discussi nei forum", here: "Nessun prezzo: contano presenze e tappe vere" },
  { elsewhere: "Dati scritti da chiunque, senza garanzia", here: "Ogni numero ha fonte e data, confermato dalla società" },
  { elsewhere: "Schede pubbliche anche di ragazzini", here: "Nessuna scheda pubblica di minori: crescono in famiglia" },
  { elsewhere: "Commenti e voti alle persone", here: "Solo segnalazioni positive tra adulti verificati, moderate" },
];

/** Public cast: Ottavio only. The DS (Lario, UD-174) works in the reserved areas and is only mentioned as «il DS». */
export const VETTA_CAST = {
  ottavio: {
    initials: "O",
    name: "Ottavio",
    role: "L'osservatore",
    lines: [
      "Sei maggiorenne e ti ho visto giocare? Fatti conoscere: scrivi alla società, il resto lo vediamo in campo.",
      "Per i minori parliamo con i genitori: è sempre il genitore a fare il primo passo.",
    ],
  },
} as const;

export const VETTA_CAST_NOTE = "Le scelte le fa il DS con la società, sempre con te o con la tua famiglia.";

export const VETTA_RULES: readonly { title: string; text: string }[] = [
  { title: "Nessun valore di mercato", text: "Niente prezzi, ingaggi, quotazioni o voti pubblici per nessuno." },
  { title: "Minori protetti", text: "Nome e iniziale solo con il consenso della famiglia, mai volti, nessuna segnalazione su un minore." },
  { title: "Segnalazioni moderate", text: "Solo tra adulti verificati, scelte da un elenco chiuso, moderate dalla società e accettate dall'interessato." },
  { title: "Regole federali", text: "Rispettiamo le norme federali: nessun contatto con calciatori sotto contratto con altre società senza la loro autorizzazione scritta. I contatti li decide solo il DS." },
  { title: "Consenso GDPR", text: "Consenso specifico e revocabile, cancellazione quando vuoi, revisione della scheda ogni 12 mesi." },
];

export const VETTA_SHARE: SharePage = {
  path: VETTA_PATH,
  title: "Vetta Legnone — la piattaforma dei calciatori | SCD ColicoDerviese",
  description:
    "Calciatori, genitori, ex giocatori, mister e tifosi: la storia vera della S.C.D. ColicoDerviese, da scrivere con presenze e referti verificati. Niente prezzi, minori sempre protetti.",
  ogTitle: "Vetta Legnone · S.C.D. ColicoDerviese",
  ogDescription: "Dal lago alla vetta, un passo alla volta: la piattaforma dei calciatori della ColicoDerviese.",
  shareText: "Vetta Legnone: la piattaforma dei calciatori della ColicoDerviese. Fatti conoscere, racconta la tua storia, vota la Top 11.",
  image: CREST_SHARE_IMAGE,
};

/** Every string shown by the page, for the content tests. */
export function vettaAllText(): string[] {
  return [
    ...Object.values(VETTA_HERO),
    ...VETTA_COUNTERS.flatMap((c) => [c.value, c.label, c.source]),
    ...[...vettaAudiences(false), ...vettaAudiences(true)].flatMap((a) => [a.who, a.invite, a.gets, a.cta.label, a.cta.hint, a.soon]),
    VETTA_AUDIENCES_INTRO,
    ...VETTA_EPOCHS.flatMap((e) => [e.years, e.title, e.source, ...e.facts]),
    VETTA_HISTORY_STATUS,
    VETTA_HISTORY_NOTE,
    ...VETTA_NEEDS.flatMap((n) => [n.team, n.status]),
    ...Object.values(VETTA_NEEDS_STATE_LABEL),
    ...VETTA_LEVELS.flatMap((l) => [l.name, l.meaning, l.how]),
    VETTA_LEVELS_NOTE,
    ...Object.values(VETTA_PROFILE_STATUS),
    ...VETTA_STEPS.flatMap((s) => [s.title, s.text]),
    ...VETTA_BETTER.flatMap((b) => [b.elsewhere, b.here]),
    ...Object.values(VETTA_CAST).flatMap((c) => [c.initials, c.name, c.role, ...c.lines]),
    VETTA_CAST_NOTE,
    ...VETTA_RULES.flatMap((r) => [r.title, r.text]),
    VETTA_SHARE.title,
    VETTA_SHARE.description,
    VETTA_SHARE.ogTitle ?? "",
    VETTA_SHARE.ogDescription ?? "",
    VETTA_SHARE.shareText,
  ];
}

/** All CTA destinations of the page. */
export function vettaRoutes(): VettaRoute[] {
  const all = [...vettaAudiences(false), ...vettaAudiences(true)].map((a) => a.cta.to);
  return [...new Set<VettaRoute>([...all, "/privacy"])];
}
