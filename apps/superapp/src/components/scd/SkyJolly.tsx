/**
 * The floating helper of the Super App and its two faces (Direzione decisions 12/10/2026):
 * - public pages: the chat helper and the launcher face are CROVI ("Chiedi a Crovi");
 * - Sky stays away from the general app (Direzione 13/10/2026): never on public pages; inside only
 *   for young members (lib/assistant.ts rule) and on the under-14 team pages (KIDS_TEAM_IDS);
 * - reserved areas: the helper goes by the signed-in viewer (r99, UD-104, Direzione "Vai A B C" 13/10/2026):
 *   Era for staff and adult members (15+), Sky for younger members and when nothing tells us the viewer is 15+.
 *   The rule lives in one place, lib/assistant.ts eraEligible / insidePersonaFor, shared by the chat persona,
 *   the launcher face and the server voice. Crovi never appears inside, Era never on public pages.
 * The chat logic lives in SkyChat.tsx; answers come from the AI assistants (lib/assistant.functions.ts) with the
 * askSky rules engine as fallback.
 *
 * Official assets only (config/scd-assets.v1.json): Sky head /media/brand/sky-atv-head.webp,
 * Sky head + ball /media/brand/sky-scd.png, CROVI avatar /media/crovi/v3 (original fictional figure),
 * Era avatar /media/cast/era (original fictional figure, GENERATE_ORIGINAL).
 */
import croviAvatar from "@/assets/crovi/crovi-avatar-256.webp.asset.json";
import { insidePersonaFor, type HelperViewer } from "@/lib/assistant";
import { CAST, castAvatarSrc, castReady } from "@/lib/assistant-cast";
import { isPublicPath } from "@/lib/http-policy";

export type Persona = "sky" | "crovi" | "era";

export type { HelperViewer } from "@/lib/assistant";
export { eraEligible } from "@/lib/assistant";

/** Public media paths of the official Sky files (never generated, never altered). */
export const SKY_HEAD_SRC = "/media/brand/sky-atv-head.webp";
export const SKY_BALL_SRC = "/media/brand/sky-scd.png";
export const CROVI_AVATAR_SRC = croviAvatar.url;

/** Access flows: no floating helper at all (the visitor is filling a form). */
const HIDDEN_PREFIXES = ["/accedi", "/entra", "/registrati"] as const;

/**
 * Under-14 teams (club-profile ORDER ids): the only pages where Sky always appears (Direzione 13/10/2026).
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

/** Who answers in the chat: Crovi on public pages; inside Era (staff, adults 15+) or Sky (lib/assistant.ts). */
export function personaFor(pathname: string, viewer?: HelperViewer | null): Persona {
  return isReservedPath(pathname) ? insidePersonaFor(viewer?.roles, viewer?.age15plus ?? null) : "crovi";
}

/**
 * Face shown on the floating launcher: always the figure that answers. Sky no longer fronts the
 * public pages (home, games): outside it is Crovi (Direzione 13/10/2026).
 */
export function launcherFaceFor(pathname: string, viewer?: HelperViewer | null): Persona {
  return personaFor(pathname, viewer);
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
 * CROVI keeps his approved 256px avatar, Era uses hers once it is in (neutral 'E' until then).
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
    if (castReady("era")) {
      return (
        <img
          src={castAvatarSrc("era")}
          alt=""
          width={size}
          height={size}
          className={`rounded-full object-cover ring-2 ring-[#0b2a5b] ${className}`}
          style={{ width: size, height: size }}
          data-cast={CAST.era.id}
        />
      );
    }
    // Neutral initial only while the approved Era image is not in the app (assistant-cast readiness):
    // no invented portrait (SCD:ASSET GENERATE_ORIGINAL, non-substitutive).
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
