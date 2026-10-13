/**
 * Sky, the club mascot, is the "jolly" of the Super App: the one floating helper on public pages.
 * Inside reserved areas the same floating helper wears CROVI, the secretary of Biglietteria and
 * Segreteria. This module holds the persona switch and the two avatars; the chat logic lives in
 * SkyChat.tsx and the answer engine (askSky) is unchanged.
 *
 * Official assets only (config/scd-assets.v1.json): Sky head /media/brand/sky-atv-head.webp,
 * Sky head + ball /media/brand/sky-scd.png, CROVI avatar from src/assets/crovi.
 */
import croviAvatar from "@/assets/crovi/crovi-avatar-256.webp.asset.json";

export type Persona = "sky" | "crovi";

/** Public media paths of the official Sky files (never generated, never altered). */
export const SKY_HEAD_SRC = "/media/brand/sky-atv-head.webp";
export const SKY_BALL_SRC = "/media/brand/sky-scd.png";
export const CROVI_AVATAR_SRC = croviAvatar.url;

/** Reserved areas where the floating helper is CROVI (the secretary) instead of Sky. */
const RESERVED_PREFIXES = [
  "/direzione",
  "/segreteria",
  "/tesoreria",
  "/gestionale",
  "/famiglia",
  "/la-mia-scd",
] as const;

/** Access flows: no floating helper at all (the visitor is filling a form). */
const HIDDEN_PREFIXES = ["/accedi", "/entra", "/registrati"] as const;

function startsWithPrefix(
  pathname: string,
  prefixes: ReadonlyArray<string>,
): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function isReservedPath(pathname: string): boolean {
  return startsWithPrefix(pathname, RESERVED_PREFIXES);
}

export function isHelperHiddenPath(pathname: string): boolean {
  return startsWithPrefix(pathname, HIDDEN_PREFIXES);
}

export function personaFor(pathname: string): Persona {
  return isReservedPath(pathname) ? "crovi" : "sky";
}

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
      "Ciao, sono Sky, la mascotte della ColicoDerviese. Dimmi cosa cerchi: prossima partita, calendario, come arrivare al campo, iscrizioni, contatti o come funziona l'app.",
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
  crovi: {
    name: "CROVI",
    title: "CROVI, la segreteria del club",
    subtitle: "biglietteria e segreteria",
    greeting:
      "Ciao, sono Crovi, quello della biglietteria e della segreteria. Ti indirizzo su calendario, iscrizioni, documenti, sponsor o contatti. Se qualcosa manca o non funziona, scrivimelo in due parole: lo giro a chi se ne occupa.",
    placeholder: "Scrivi a CROVI…",
    thinking: "CROVI sta cercando…",
    quick: [
      "Prossima partita",
      "Calendario",
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
