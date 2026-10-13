/**
 * Data of the time-limited public initiatives (server only: read by initiatives.functions.ts inside its handlers).
 *
 * TO CHANGE THE DATES of an initiative, edit only its `showFrom` / `showUntil` below (Rome days, both inclusive).
 */
import type { Initiative } from "./initiatives";

export const INITIATIVES: readonly Initiative[] = [
  {
    // Direzione 13/10/2026 15:57: "iniziativa a parte da pubblicizzare a tempo per nostro mister, da tenere in futuro
    // fra 5 gg e pubblicizzare". Default window: 6 weeks from the start.
    id: "lezioni-tecnico-coordinative-perico",
    href: "/eventi/lezioni-tecnico-coordinative",
    title: "Lezioni tecnico-coordinative",
    subtitle: "con il mister Alessandro Perico (UEFA C, laurea in Scienze motorie)",
    organizer: {
      name: "Alessandro Perico",
      // As stated on his flyer.
      credentials: ["Laurea in Scienza, Tecnica e didattica dello Sport", "Tecnico UEFA C"],
    },
    text: "In collaborazione con la ColicoDerviese: lezioni per migliorare tecnica e coordinazione. Per giorni, orari e costi contatta il mister.",
    contact: {
      label: "Info e iscrizioni: mister Perico",
      // Published by the coach himself on the flyer.
      display: "348 520 0579",
      tel: "+393485200579",
    },
    flyer: {
      src: "/media/iniziative/lezioni-tecnico-coordinative-perico.webp",
      alt: "Volantino delle lezioni tecnico-coordinative del mister Alessandro Perico in collaborazione con la ColicoDerviese",
      note: "Foto di repertorio, non atleti SCD.",
    },
    showFrom: "2026-10-18",
    showUntil: "2026-11-30",
  },
];
