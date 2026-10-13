/**
 * The floating helper of the Super App and its faces (Direzione decisions 12/10 and 13/10/2026):
 * - public pages: the chat helper is CROVI ("Chiedi a Crovi"), the realistic secretariat legend;
 * - Sky, the club's lucky charm, stays away from the general app: it appears only in the
 *   under-14 world (team pages of Esordienti, Pulcini, Primi Calci, Piccoli Amici, annate
 *   2014/2015), always as the official cut-out PNG/WebP;
 * - other reserved areas: the club assistant with the official crest, standing in for "Era"
 *   (15+, not built yet). Crovi never appears inside.
 * The chat logic lives in SkyChat.tsx and the answer engine (askSky) is unchanged.
 *
 * Official assets only (config/scd-assets.v1.json): Sky head /media/brand/sky-atv-head.webp,
 * Sky head + ball /media/brand/sky-scd.png, CROVI avatar /media/crovi/v3 (original fictional figure).
 */
import crest from "@/assets/brand/logo-scd.png.asset.json";
import croviAvatar from "@/assets/crovi/crovi-avatar-256.webp.asset.json";
import { isPublicPath } from "@/lib/http-policy";

export type Persona = "sky" | "crovi" | "club";

/** Public media paths of the official Sky files (never generated, never altered). */
export const SKY_HEAD_SRC = "/media/brand/sky-atv-head.webp";
export const SKY_BALL_SRC = "/media/brand/sky-scd.png";
export const CROVI_AVATAR_SRC = croviAvatar.url;
export const CLUB_CREST_SRC = crest.url;

/** Access flows: no floating helper at all (the visitor is filling a form). */
const HIDDEN_PREFIXES = ["/accedi", "/entra", "/registrati"] as const;

/**
 * Under-14 teams (club-profile ORDER ids): the only place where Sky appears (Direzione 13/10/2026).
 * U15 is left out on purpose: it already includes 14-year-olds.
 */
export const KIDS_TEAM_IDS = ["2014", "2015", "esordienti", "pulcini", "primicalci", "piccoli"] as const;

/** True for a team page of an under-14 group, e.g. /squadre/pulcini. */
export function isKidsPath(pathname: string): boolean {
  const m = /^\/squadre\/([^/]+)\/?$/.exec(pathname);
  return !!m && (KIDS_TEAM_IDS as ReadonlyArray<string>).includes(decodeURIComponent(m[1] ?? "").toLowerCase());
}

function startsWithPrefix(
  pathname: string,
  prefixes: ReadonlyArray<string>,
): boolean {
  return prefixes.some((p) =>
    p === "/" ? pathname === "/" || pathname === "" : pathname === p || pathname.startsWith(`${p}/`),
  );
}

/**
 * Reserved = everything that is not a public page (src/lib/http-policy.ts PUBLIC_PREFIXES is the
 * single list of what anyone may see without signing in).
 */
export function isReservedPath(pathname: string): boolean {
  return !isPublicPath(pathname);
}

export function isHelperHiddenPath(pathname: string): boolean {
  return startsWithPrefix(pathname, HIDDEN_PREFIXES);
}

/** Who answers in the chat: Sky only for the under-14 pages, Crovi outside, the club assistant inside. */
export function personaFor(pathname: string): Persona {
  if (isKidsPath(pathname)) return "sky";
  return isReservedPath(pathname) ? "club" : "crovi";
}

/** Face shown on the floating launcher: always the same figure that answers. */
export function launcherFaceFor(pathname: string): Persona {
  return personaFor(pathname);
}

/** Greeting of the chat; when Sky's face opened it on a public page, Crovi says Sky called him. */
export function greetingFor(persona: Persona, face: Persona = persona): string {
  const base = PERSONA_COPY[persona].greeting;
  if (persona === "crovi" && face === "sky") return `${SKY_HANDOFF} ${base}`;
  return base;
}

export const SKY_HANDOFF = "Sky, il nostro portafortuna, mi ha passato la palla.";

export const PERSONA_COPY: Record<
  Persona,
  {
    name: string;
    title: string;
    subtitle: string;
    greeting: string;
    placeholder: string;
    thinking: string;
    quick: ReadonlyArray<string>;
  }
> = {
  sky: {
    name: "Sky",
    title: "Sky, la mascotte del club",
    subtitle: "ti porto dove ti serve, in un tocco",
    greeting:
      "Ciao, sono Sky, la mascotte portafortuna della ColicoDerviese! Chiedimi la prossima partita, gli allenamenti o come arrivare al campo: ti accompagno io.",
    placeholder: "Scrivi a Sky…",
    thinking: "Sky sta cercando…",
    quick: [
      "Prossima partita",
      "Calendario",
      "Come arrivare",
      "Iscriviti",
      "Contatti",
      "Come funziona l'app",
    ],
  },
  club: {
    name: "Assistente SCD",
    title: "Assistente del club",
    subtitle: "ti porto dove ti serve, in un tocco",
    greeting:
      "Ciao, sono l'assistente della ColicoDerviese. Dimmi cosa cerchi: prossima partita, calendario, come arrivare al campo, iscrizioni, contatti o come funziona l'app.",
    placeholder: "Scrivi all'assistente…",
    thinking: "Sto cercando…",
    quick: [
      "Prossima partita",
      "Calendario",
      "Come arrivare",
      "Iscriviti",
      "Contatti",
      "Come funziona l'app",
    ],
  },
  crovi: {
    name: "Crovi",
    title: "Chiedi a Crovi",
    subtitle: "il tuttologo del calcio dilettanti",
    greeting:
      "Ciao, sono Crovi, la leggenda della segreteria e della biglietteria. Di calcio dilettanti so quasi tutto e quello che non so lo trovo: prossima partita, calendario, come arrivare al campo, iscrizioni, sponsor o contatti. Se qualcosa manca o non funziona, scrivimelo in due parole: lo giro a chi se ne occupa.",
    placeholder: "Scrivi a Crovi…",
    thinking: "Crovi sta cercando…",
    quick: [
      "Prossima partita",
      "Calendario",
      "Come arrivare",
      "Iscrizioni",
      "Contatti",
      "Diventare sponsor",
    ],
  },
};

/**
 * Round avatar of the active persona. Sky's head is cropped in a light circle with a navy ring,
 * CROVI keeps his approved 256px avatar.
 */
export function PersonaAvatar({
  persona = "sky",
  size = 52,
  className = "",
}: {
  persona?: Persona;
  size?: number;
  className?: string;
}) {
  if (persona === "club") {
    return (
      <span
        aria-hidden="true"
        className={`inline-flex shrink-0 items-center justify-center rounded-full bg-white ring-2 ring-[#0b2a5b] ${className}`}
        style={{ width: size, height: size }}
      >
        <img src={CLUB_CREST_SRC} alt="" width={size} height={size} className="h-[78%] w-[78%] object-contain" />
      </span>
    );
  }
  if (persona === "crovi") {
    return (
      <img
        src={CROVI_AVATAR_SRC}
        alt=""
        width={size}
        height={size}
        className={`rounded-full object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`inline-block shrink-0 overflow-hidden rounded-full bg-[#eef3f9] ring-2 ring-[#0b2a5b] ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src={SKY_HEAD_SRC}
        alt=""
        width={size}
        height={size}
        className="size-full object-cover object-top"
        style={{ transform: "scale(1.12)", transformOrigin: "50% 20%" }}
      />
    </span>
  );
}
