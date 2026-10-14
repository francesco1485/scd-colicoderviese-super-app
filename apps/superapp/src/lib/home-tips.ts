/**
 * "Il consiglio del giorno" on the home (UD-116, Direzione 14/10/2026), in rotation between the three roles of the
 * cast (UD-111): Era, nutrizionista; Dottor Acanfora, medico (prevention); Genny, segretaria.
 *
 * Era's and Acanfora's tips are their existing content modules (era-nutrition-tips.ts, first-aid-info.ts) with the
 * same daily pick; Genny's are the practical secretariat reminders below, each pointing to an existing page. The
 * persona changes every day (same for everybody on that Rome day). No portrait is shown here: Era and Genny are on
 * hold until new official images are approved, so the card uses the neutral initial for all three.
 */
import { ACANFORA_DAILY_TIPS, ACANFORA_DISCLAIMER } from "./first-aid-info";
import { ERA_DISCLAIMER, ERA_TIPS, dailyPick } from "./era-nutrition-tips";

export type TipPersona = "era" | "acanfora" | "genny";

export interface GennyTip {
  id: string;
  title: string;
  text: string;
  /** Existing route the tip points to. */
  to: string;
  hash?: string;
  /** True when the page is for signed-in members (anonymous visitors see the tip without the link). */
  members?: boolean;
}

/** Practical secretariat reminders (no numbers, no personal data, only features that exist). */
export const GENNY_TIPS: readonly GennyTip[] = [
  {
    id: "certificato",
    title: "Certificato medico: guarda la scadenza",
    text: "Senza certificato valido non si gioca. Nell'area famiglia trovi la scadenza di ogni ragazzo: rinnovalo prima che scada.",
    to: "/famiglia",
    hash: "fam-ragazzi",
    members: true,
  },
  {
    id: "convocazioni",
    title: "Convocazione arrivata? Un tocco e fatto",
    text: "Apri l'area famiglia e premi Presa visione. Se c'è un impedimento scrivilo lì: decide il mister.",
    to: "/famiglia",
    hash: "fam-convocazioni",
    members: true,
  },
  {
    id: "documenti",
    title: "Moduli e regolamenti in un posto solo",
    text: "Regolamento, moduli e documenti della società sono raccolti in una pagina, ognuno per chi deve leggerlo.",
    to: "/documenti",
  },
  {
    id: "prova",
    title: "Vuoi provare? Scrivilo alla segreteria",
    text: "Scegli categoria e annata nel modulo di iscrizione: la segreteria ti ricontatta per la prova.",
    to: "/entra",
  },
  {
    id: "app",
    title: "Gli avvisi arrivano sul telefono",
    text: "Installa l'app dalla pagina dedicata: calendario, convocazioni e comunicazioni sempre a portata di mano.",
    to: "/installa",
  },
  {
    id: "contatti",
    title: "Un dubbio? Scrivici",
    text: "Mail, PEC e sede della società sono nella pagina contatti: ogni richiesta arriva alla segreteria.",
    to: "/contatti",
  },
];

export const GENNY_DISCLAIMER =
  "Genny è la segretaria del club: per pratiche, pagamenti e documenti fa sempre fede la segreteria.";

export const TIP_ORDER: readonly TipPersona[] = ["era", "acanfora", "genny"];

export const TIP_PERSONA: Readonly<
  Record<TipPersona, { name: string; role: string; initial: string }>
> = {
  era: { name: "Era", role: "la nutrizionista del club", initial: "E" },
  acanfora: {
    name: "Dottor Acanfora",
    role: "il medico del club",
    initial: "A",
  },
  genny: { name: "Genny", role: "la segretaria del club", initial: "G" },
};

export interface DailyTip {
  persona: TipPersona;
  title: string;
  text: string;
  disclaimer: string;
  link: { to: string; hash?: string; label: string; members: boolean } | null;
}

/** Persona of a Rome day: the three alternate day by day. */
export function tipPersonaOn(day: string): TipPersona {
  return dailyPick(TIP_ORDER, day);
}

/** The tip of the day (same persona and tip for everybody on that Rome day). */
export function dailyTip(day: string): DailyTip {
  const persona = tipPersonaOn(day);
  if (persona === "era") {
    const t = dailyPick(ERA_TIPS, day);
    return {
      persona,
      title: t.title,
      text: t.text,
      disclaimer: ERA_DISCLAIMER,
      link: {
        to: "/famiglia",
        label: "Tutti i consigli di Era",
        members: true,
      },
    };
  }
  if (persona === "acanfora") {
    const t = dailyPick(ACANFORA_DAILY_TIPS, day);
    return {
      persona,
      title: t.title,
      text: t.text,
      disclaimer: ACANFORA_DISCLAIMER,
      link: {
        to: "/infermeria",
        label: "Infermeria e primo soccorso",
        members: true,
      },
    };
  }
  const t = dailyPick(GENNY_TIPS, day);
  return {
    persona,
    title: t.title,
    text: t.text,
    disclaimer: GENNY_DISCLAIMER,
    link: {
      to: t.to,
      ...(t.hash ? { hash: t.hash } : {}),
      label: "Apri",
      members: t.members === true,
    },
  };
}
