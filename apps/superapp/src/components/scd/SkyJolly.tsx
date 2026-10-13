/**
 * The floating helper of the Super App and its two faces (Direzione decisions 12/10/2026):
 * - public pages: the chat helper is CROVI ("Chiedi a Crovi"), the realistic secretariat legend;
 *   Sky, the club's lucky charm, stays in rotation as the launcher face on the home and on the
 *   kids/games pages, so the two figures alternate by context;
 * - reserved areas: the helper goes by the signed-in roles (r99, UD-104): Era for staff and adult members (15+),
 *   Sky for younger members until their own avatar (lib/assistant.ts insidePersonaFor). Crovi never appears inside.
 * The chat logic lives in SkyChat.tsx; answers come from the AI assistants (lib/assistant.functions.ts) with the
 * askSky rules engine as fallback.
 *
 * Official assets only (config/scd-assets.v1.json): Sky head /media/brand/sky-atv-head.webp,
 * Sky head + ball /media/brand/sky-scd.png, CROVI avatar /media/crovi/v3 (original fictional figure).
 */
import croviAvatar from "@/assets/crovi/crovi-avatar-256.webp.asset.json";
import { isPublicPath } from "@/lib/http-policy";

export type Persona = "sky" | "crovi" | "era";

/** Public media paths of the official Sky files (never generated, never altered). */
export const SKY_HEAD_SRC = "/media/brand/sky-atv-head.webp";
export const SKY_BALL_SRC = "/media/brand/sky-scd.png";
export const CROVI_AVATAR_SRC = croviAvatar.url;

/** Access flows: no floating helper at all (the visitor is filling a form). */
const HIDDEN_PREFIXES = ["/accedi", "/entra", "/registrati"] as const;

/** Public pages where Sky, the lucky charm, is the launcher face (home, games, kids). */
const SKY_FACE_PUBLIC = ["/", "/fantacalcio", "/top11"] as const;

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

/** Who answers in the chat by page: Crovi on public pages, Sky inside (SkyChat upgrades to Era by session roles). */
export function personaFor(pathname: string): Persona {
  return isReservedPath(pathname) ? "sky" : "crovi";
}

/**
 * Face shown on the floating launcher. Inside it is always the helper (Sky); on public pages Sky
 * and Crovi alternate by context: Sky on the home and the games/kids pages, Crovi everywhere else
 * (calendar, tickets, contacts, partner, registrations, club, events, news, default).
 */
export function launcherFaceFor(pathname: string): Persona {
  if (isReservedPath(pathname)) return "sky";
  return startsWithPrefix(pathname, SKY_FACE_PUBLIC) ? "sky" : "crovi";
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
      "Ciao, sono Sky, la mascotte portafortuna della ColicoDerviese. Dimmi cosa cerchi: prossima partita, calendario, come arrivare al campo, iscrizioni, contatti o come funziona l'app.",
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
  era: {
    name: "Era",
    title: "Chiedi a Era",
    subtitle: "l'assistente interna: cerco nel Cervellone",
    greeting:
      "Ciao, sono Era, l'assistente interna della società. Cerco per te nel Cervellone documenti, scadenze, fornitori, tornei e regole, mostrandoti solo ciò che il tuo ruolo può vedere. Se qualcosa manca o non funziona, scrivimelo in due parole: lo giro a chi se ne occupa.",
    placeholder: "Scrivi a Era…",
    thinking: "Era sta cercando…",
    quick: [
      "Scadenze in vista",
      "Documenti della federazione",
      "Omologazione campi",
      "Tornei e eventi",
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
  if (persona === "era") {
    // Neutral initial until the approved Era image (UD-091, Canva MAHX1G12gBc) is registered in
    // config/scd-assets.v1.json: no invented portrait (SCD:ASSET GENERATE_ORIGINAL, non-substitutive).
    return (
      <span
        aria-hidden="true"
        className={`inline-flex shrink-0 items-center justify-center rounded-full bg-[#0b2a5b] font-bold text-[#ffd600] ring-2 ring-[#ffd600] ${className}`}
        style={{ width: size, height: size, fontSize: Math.round(size * 0.46) }}
      >
        E
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
