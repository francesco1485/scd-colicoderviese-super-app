/**
 * Dottor Acanfora's corner in the Infermeria. He is the club doctor character (Direzione 14/10/2026: Medico, daily
 * tips, first-aid and prevention initiatives): general first-aid information for common sports knocks, in plain
 * words, when to call 112 and a prevention "consiglio del giorno". Fixed copy, never a diagnosis, never a medicine.
 * The only number in this copy is the single European emergency number 112.
 * Where the infermeria room is comes from config/scd-facilities.v1.json (spaces of type
 * "first_aid"); first-aid kit and defibrillator locations are not in the facility data yet, so
 * they are not shown (nothing is guessed).
 */
import { FACILITIES, type FacilitiesContract } from "./facilities";

export interface FirstAidStep {
  key: string;
  title: string;
  text: string;
}

/** Knocks and sprains: the RICE steps in plain Italian. */
export const KNOCK_STEPS: readonly FirstAidStep[] = [
  {
    key: "riposo",
    title: "Riposo",
    text: "Fermati: se fa male non si continua a giocare. Chi ha preso il colpo esce dal campo e si siede.",
  },
  {
    key: "ghiaccio",
    title: "Ghiaccio",
    text: "Ghiaccio o borsa del freddo avvolti in un panno, mai direttamente sulla pelle, per pochi minuti alla volta.",
  },
  {
    key: "compressione",
    title: "Compressione",
    text: "Una fascia elastica aiuta a contenere il gonfiore: ben appoggiata, mai stretta.",
  },
  {
    key: "elevazione",
    title: "Elevazione",
    text: "Tieni la parte che fa male sollevata, per esempio la caviglia su un cuscino o una borsa.",
  },
];

/** When to call 112 straight away. */
export const CALL_112_WHEN: readonly string[] = [
  "perde i sensi, anche solo per un attimo",
  "dopo un colpo alla testa è confuso, vomita o il mal di testa peggiora",
  "fa fatica a respirare o ha dolore al petto",
  "c'è una deformità evidente o non riesce a muovere la parte colpita",
  "sanguina e il sangue non si ferma premendo",
];

export const HEAD_KNOCK_RULE =
  "Colpo alla testa: nel dubbio fuori. Chi ha preso un colpo alla testa non rientra in campo quel giorno e lo valuta un medico.";

/** Prevention tips, one shown per day (era-nutrition-tips.ts dailyPick). General, for everybody, no numbers. */
export const ACANFORA_DAILY_TIPS: readonly FirstAidStep[] = [
  {
    key: "riscaldamento",
    title: "Scaldati sempre prima di correre forte",
    text: "Corsa leggera e movimenti di gambe e braccia preparano muscoli e articolazioni: si parte piano e si aumenta.",
  },
  {
    key: "parastinchi",
    title: "Parastinchi sempre, anche in allenamento",
    text: "Proteggono da colpi e tacchetti: vanno messi in partita e in allenamento, sotto i calzettoni.",
  },
  {
    key: "scarpe",
    title: "Scarpe giuste per il campo",
    text: "Tacchetti adatti al terreno, erba o sintetico, e scarpe della misura giusta aiutano a evitare distorsioni e vesciche.",
  },
  {
    key: "dolore",
    title: "Il dolore è un segnale, non una sfida",
    text: "Se senti dolore che non passa fermati e avvisa il mister: giocare con il dolore peggiora le cose.",
  },
  {
    key: "certificato",
    title: "Certificato medico sportivo in regola",
    text: "Per allenarsi e giocare serve il certificato valido: controlla la scadenza con la segreteria prima che scada.",
  },
  {
    key: "meteo",
    title: "Caldo e freddo si preparano",
    text: "Con il caldo cappellino, crema solare e pause all'ombra; con il freddo strati di vestiti e una maglia asciutta per dopo.",
  },
];

export const ACANFORA_DISCLAIMER =
  "Il Dottor Acanfora, il medico del club, dà consigli generali di prevenzione e primo soccorso e non fa diagnosi: per ogni dubbio rivolgiti al medico o chiama il 112.";

export interface FirstAidRoom {
  site: string;
  name: string;
}

/** Infermeria rooms recorded in the facility data (verified provenance only). */
export function firstAidRooms(c: FacilitiesContract = FACILITIES): FirstAidRoom[] {
  return c.spaces
    .filter((s) => s.type === "first_aid" && s.provenance?.verified === true)
    .map((s) => ({
      site: c.sites.find((x) => x.id === s.site)?.name ?? s.site,
      name: s.name,
    }));
}

/** Problems of one copy text: digits other than 112 and diagnostic or drug wording are not allowed. */
export function firstAidProblems(text: string): string[] {
  const out: string[] = [];
  if (/\d/.test(text.replace(/\b112\b/g, ""))) out.push("contains digits other than 112");
  const hit = /\b(diagnosi è|hai una|è una frattura|è una distorsione|farmac\w*|antidolorific\w*|ibuprofene|paracetamolo|pomata)\b/i.exec(text);
  if (hit) out.push(`forbidden wording: ${hit[0]}`);
  return out;
}
