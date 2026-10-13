/**
 * The floating helper of the Super App and its two faces (Direzione decisions 12/10/2026):
 * - public pages: the chat helper is CROVI ("Chiedi a Crovi"), the realistic secretariat legend;
 *   Sky, the club's lucky charm, stays in rotation as the launcher face on the home and on the
 *   kids/games pages, so the two figures alternate by context;
 * - reserved areas: the helper is Era for staff and for members aged 15+ when the age is known
 *   (Direzione "Vai A B C" 13/10/2026), Sky for minors and whenever the age is unknown. Era only
 *   appears once her approved picture is in the app (src/lib/assistant-cast.ts readiness check):
 *   until then Sky stands in. Crovi never appears inside, Era never appears on public pages.
 * The chat logic lives in SkyChat.tsx and the answer engine (askSky) is unchanged.
 *
 * Official assets only (config/scd-assets.v1.json): Sky head /media/brand/sky-atv-head.webp,
 * Sky head + ball /media/brand/sky-scd.png, CROVI avatar /media/crovi/v3 (original fictional figure),
 * Era avatar /media/cast/era (original fictional figure, GENERATE_ORIGINAL).
 */
import croviAvatar from "@/assets/crovi/crovi-avatar-256.webp.asset.json";
import { CAST, castAvatarSrc, castReady } from "@/lib/assistant-cast";
import { isPublicPath } from "@/lib/http-policy";
import { isStaffSession } from "@/lib/session";

export type Persona = "sky" | "crovi" | "era";

/**
 * Who is looking, as far as the helper needs to know. `age15plus` is null when the age is not
 * known: the session never carries a birth date to the browser, so today only staff get Era;
 * members 15+ get her once the server exposes an age band.
 */
export interface HelperViewer {
  roles: readonly string[];
  age15plus?: boolean | null;
}

/** Options of the persona routing (tests inject readiness; the app reads the cast registry). */
export interface PersonaOptions {
  eraReady?: boolean;
}

/** Era is for staff and for members known to be 15+; a viewer known to be under 15 never gets her. */
export function eraEligible(viewer: HelperViewer | null | undefined): boolean {
  if (!viewer) return false;
  if (viewer.age15plus === false) return false;
  if (viewer.age15plus === true) return true;
  return isStaffSession(new Set(viewer.roles));
}

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

/** Helper of the reserved areas: Era when eligible and her picture is in, otherwise Sky. */
function insidePersona(viewer: HelperViewer | null | undefined, opts: PersonaOptions): Persona {
  const ready = opts.eraReady ?? castReady("era");
  return ready && eraEligible(viewer) ? "era" : "sky";
}

/** Who answers in the chat: Crovi on public pages; inside Era (staff, 15+) or Sky (minors, unknown). */
export function personaFor(
  pathname: string,
  viewer?: HelperViewer | null,
  opts: PersonaOptions = {},
): Persona {
  return isReservedPath(pathname) ? insidePersona(viewer, opts) : "crovi";
}

/**
 * Face shown on the floating launcher. Inside it is always the helper (Era or Sky); on public pages Sky
 * and Crovi alternate by context: Sky on the home and the games/kids pages, Crovi everywhere else
 * (calendar, tickets, contacts, partner, registrations, club, events, news, default).
 */
export function launcherFaceFor(
  pathname: string,
  viewer?: HelperViewer | null,
  opts: PersonaOptions = {},
): Persona {
  if (isReservedPath(pathname)) return insidePersona(viewer, opts);
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
  era: {
    name: "Era",
    title: "Era, l'assistente del club",
    subtitle: "per lo staff e i tesserati dai 15 anni",
    greeting:
      "Ciao, sono Era, l'assistente delle aree riservate della ColicoDerviese. Ti aiuto a trovare in fretta convocazioni, calendario, documenti, impianti e contatti dello staff. Se qualcosa non torna, scrivimelo: lo segnalo a chi se ne occupa.",
    placeholder: "Scrivi a Era…",
    thinking: "Era sta cercando…",
    quick: [
      "Prossima partita",
      "Calendario",
      "Convocazioni",
      "Documenti",
      "Contatti",
      "Come funziona l'app",
    ],
  },
};

/**
 * Round avatar of the active persona. Sky's head is cropped in a light circle with a navy ring,
 * CROVI keeps his approved 256px avatar, Era uses hers once it is in (otherwise Sky's face).
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
  if (persona === "era" && castReady("era")) {
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
