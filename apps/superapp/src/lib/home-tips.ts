/**
 * "Il consiglio del giorno" on the home (UD-116, Direzione 14/10/2026), in rotation between the characters that since
 * UD-118 (Direzione 14/10/2026 ~18:05, "Personaggi semplificati") are ONLY a short tip — Era (nutrizionista), Dottor
 * Acanfora (medico, prevention), the Preparatore atletico, the Mental coach, Musica e relax — and Vera, the club
 * reception, with practical secretariat reminders.
 *
 * Era's and Acanfora's tips are their existing content modules (era-nutrition-tips.ts, first-aid-info.ts); the
 * Preparatore, the Mental coach and Musica e relax use their curated copy in cast-personas.ts (guarded by
 * castCopyProblems: no digits, no plans, no therapy wording, never a distress pattern); Vera's are the reminders below,
 * each pointing to an existing page. The character changes every day (same for everybody on that Rome day). No chat
 * starts from a tip and no portrait is shown here: the card uses the neutral initial.
 */
import { CAST_PERSONAS, VERA_PRESENCE } from "./cast-personas";
import { ACANFORA_DAILY_TIPS, ACANFORA_DISCLAIMER } from "./first-aid-info";
import { ERA_DISCLAIMER, ERA_TIPS, dailyPick } from "./era-nutrition-tips";
import { isPublicPath } from "./http-policy";

export type TipPersona = "era" | "acanfora" | "preparatore-atletico" | "mental-coach" | "musica-relax" | "vera";

export interface VeraTip {
  id: string;
  title: string;
  text: string;
  /** Existing route the tip points to. */
  to: string;
  hash?: string;
  /** True when the page is for signed-in members (anonymous visitors see the tip without the link). */
  members?: boolean;
}

/** Vera's practical secretariat reminders (no numbers, no personal data, only features that exist). */
export const VERA_TIPS: readonly VeraTip[] = [
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

export const VERA_DISCLAIMER =
  "Vera è la reception del club: per pratiche, pagamenti e documenti fa sempre fede la segreteria.";

export const TIP_ORDER: readonly TipPersona[] = ["era", "acanfora", "preparatore-atletico", "mental-coach", "musica-relax", "vera"];

export const TIP_PERSONA: Readonly<Record<TipPersona, { name: string; role: string; initial: string }>> = {
  era: { name: "Era", role: "la nutrizionista del club", initial: CAST_PERSONAS.era.initial },
  acanfora: { name: "Dottor Acanfora", role: "il medico del club", initial: CAST_PERSONAS.acanfora.initial },
  "preparatore-atletico": { name: "Il Preparatore atletico", role: "riscaldamento e prevenzione", initial: CAST_PERSONAS["preparatore-atletico"].initial },
  "mental-coach": { name: "Il Mental coach", role: "la testa giusta in campo", initial: CAST_PERSONAS["mental-coach"].initial },
  "musica-relax": { name: "Musica e relax", role: "calma e respiro", initial: CAST_PERSONAS["musica-relax"].initial },
  vera: { name: "Vera", role: "la reception del club", initial: VERA_PRESENCE.initial },
};

export interface DailyTip {
  persona: TipPersona;
  title: string;
  text: string;
  disclaimer: string;
  link: { to: string; hash?: string; label: string; members: boolean } | null;
}

/** Character of a Rome day: the six alternate day by day. */
export function tipPersonaOn(day: string): TipPersona {
  return dailyPick(TIP_ORDER, day);
}

/** The tip of the day (same character and tip for everybody on that Rome day). */
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
  if (persona === "vera") {
    const t = dailyPick(VERA_TIPS, day);
    return {
      persona,
      title: t.title,
      text: t.text,
      disclaimer: VERA_DISCLAIMER,
      link: {
        to: t.to,
        ...(t.hash ? { hash: t.hash } : {}),
        label: "Apri",
        members: t.members === true,
      },
    };
  }
  const def = CAST_PERSONAS[persona];
  const t = dailyPick(def.tips, day);
  const q = def.quick[0];
  return {
    persona,
    title: t.title,
    text: t.text,
    disclaimer: def.disclaimer,
    link: q ? { to: q.to, ...(q.hash ? { hash: q.hash } : {}), label: q.label, members: !isPublicPath(q.to) } : null,
  };
}
