/**
 * Content of the /partner preview shown before the login (Francesco 17/10/2026 08:22). Engine: SOLDI.
 *
 * Benefits are the features the partner area and the commercial tools already have in the repo:
 * - partner card and materials: lib/satellites.ts (sponsor satellite `inside`), lib/partner-kit.ts (UD-109 kit:
 *   LED, the four club kits with the partner logo, calendar card);
 * - LED spot flow «proposto → approvato / modifiche richieste → in onda»: lib/sponsor-spots.ts SPOT_FLOW (UD-119);
 * - tournaments partner slots: lib/events.ts partnerSlots;
 * - visibility value: not measured yet → «da misurare», never a number (lib/sponsor-packages.ts AUDIENCE_TO_MEASURE).
 * The sample is fake by construction (no real partner, date, number or price) and the page labels it «esempio».
 */
import { AUDIENCE_TO_MEASURE } from "./sponsor-packages";
import { SPOT_FLOW } from "./sponsor-spots";

export const PARTNER_BENEFITS = [
  {
    icon: "scheda",
    title: "La tua scheda partner",
    text: "La tua azienda, la stagione e quello che hai concordato con la società, in una scheda.",
  },
  {
    icon: "led",
    title: "Il tuo spot sul LED wall",
    text: "Lo prepara il club: lo vedi in anteprima, lo approvi o chiedi una modifica prima della messa in onda.",
  },
  {
    icon: "maglie",
    title: "Kit con il tuo marchio",
    text: "La società prepara le maglie del club e la card del calendario con il tuo logo, da vedere prima di decidere.",
  },
  {
    icon: "tornei",
    title: "Tornei ed eventi",
    text: "Title partner, naming di un campo, premio fair play e spazi nel villaggio dei tornei del club.",
  },
  {
    icon: "valore",
    title: "Valore della visibilità",
    text: `I numeri arrivano quando sono misurati: finché no, li trovi come «${AUDIENCE_TO_MEASURE}».`,
  },
] as const;

/** Spot steps of the sample: the real flow, the first two shown as done. */
const SAMPLE_DONE = 2;

export const PARTNER_SAMPLE = {
  company: "La tua azienda",
  season: "Partner · stagione 2026/27",
  spot: SPOT_FLOW.map((s, i) => ({
    key: s.key,
    label: s.key === "risposta" ? "Approvato da te" : s.key === "proposto" ? "Spot proposto dal club" : s.label,
    done: i < SAMPLE_DONE,
  })),
  tiles: [
    { label: "Pacchetto", value: "LED wall" },
    { label: "Evento", value: "Torneo del club" },
    { label: "Materiali", value: "Kit partner pronto" },
    { label: "Visibilità", value: AUDIENCE_TO_MEASURE },
  ],
} as const;
