/**
 * The floating helper of the Super App and its two faces (Direzione decisions 12/10/2026):
 * - public pages: the chat helper and the launcher face are CROVI ("Chiedi a Crovi");
 * - Sky stays away from the general app (Direzione 13/10/2026): never on public pages; inside only
 *   for young members (lib/assistant.ts rule) and on the under-14 team pages (KIDS_TEAM_IDS);
 * - reserved areas: the helper goes by the signed-in viewer (r99, UD-104, Direzione "Vai A B C" 13/10/2026):
 *   Genny, the club secretary (Direzione 14/10/2026, UD-111), for staff and adult members (15+), Sky for younger
 *   members and when nothing tells us the viewer is 15+. The rule lives in one place, lib/assistant.ts
 *   gennyEligible / insidePersonaFor, shared by the chat persona, the launcher face and the server voice. Crovi never
 *   appears inside, Genny never on public pages.
 * The chat logic lives in SkyChat.tsx; answers come from the AI assistants (lib/assistant.functions.ts) with the
 * askSky rules engine as fallback.
 *
 * Official assets only (config/scd-assets.v1.json): Sky head /media/brand/sky-atv-head.webp,
 * Sky head + ball /media/brand/sky-scd.png, CROVI avatar /media/crovi/v3 (original fictional figure),
 * Genny avatar /media/cast/genny only once the Direzione approves an image that fits the secretary role (neutral 'G'
 * until then: the held round-4 image does not match the new role).
 * Area personas of the cast (UD-114, lib/cast-personas.ts) answer when a page opens the chat with "Chiedi a …"
 * (window event "assistant:open", lib/assistant-open.ts): portrait only when approved, otherwise their initial.
 */
import croviAvatar from "@/assets/crovi/crovi-avatar-256.webp.asset.json";
import { chatPersonaFor, isCastPersona, type AssistantPersona, type HelperViewer } from "@/lib/assistant";
import { CAST, CAST_IDS, castAvatarSrc, castReady, type CastId } from "@/lib/assistant-cast";
import { CAST_PERSONAS, CAST_PERSONA_IDS, type CastPersonaId } from "@/lib/cast-personas";
import { isPublicPath } from "@/lib/http-policy";

export type Persona = AssistantPersona;

export type { HelperViewer } from "@/lib/assistant";
export { gennyEligible } from "@/lib/assistant";

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

/**
 * Who answers in the chat: Crovi on public pages; inside Genny (staff, adults 15+) or Sky (lib/assistant.ts); an area
 * persona when a page asked for it and the one rule allows it (assistant.ts chatPersonaFor, UD-114).
 */
export function personaFor(pathname: string, viewer?: HelperViewer | null, requested?: string | null): Persona {
  return chatPersonaFor(isReservedPath(pathname) ? "inside" : "public", viewer, requested);
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

export interface PersonaCopy {
  name: string;
  title: string;
  subtitle: string;
  greeting: string;
  placeholder: string;
  thinking: string;
  quick: ReadonlyArray<string>;
}

const HELPER_COPY: Record<"sky" | "genny" | "crovi", PersonaCopy> = {
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
  genny: {
    name: "Genny",
    title: "Chiedi a Genny",
    subtitle: "la segretaria del club: ho tutto sotto controllo",
    greeting:
      "Ciao, sono Genny, la segretaria della società. Ti spiego come funziona la segreteria, ti preparo una guida passo per passo e cerco nel Cervellone documenti, scadenze, fornitori, tornei e regole, mostrandoti solo ciò che il tuo ruolo può vedere. Se qualcosa manca o non funziona, scrivimelo in due parole: lo giro a chi se ne occupa.",
    placeholder: "Scrivi a Genny…",
    thinking: "Genny sta cercando…",
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

/** Chat copy of every persona: the three helpers and the area personas (cast-personas.ts). */
export const PERSONA_COPY: Readonly<Record<Persona, PersonaCopy>> = {
  ...HELPER_COPY,
  ...(Object.fromEntries(CAST_PERSONA_IDS.map((id) => [id, { name: CAST_PERSONAS[id].label, ...CAST_PERSONAS[id].chat }])) as Record<CastPersonaId, PersonaCopy>),
};

/**
 * Round avatar of the active persona. Sky's head is cropped in a light circle with a navy ring,
 * CROVI keeps his approved 256px avatar, Genny uses hers once an image fitting the role is approved (neutral 'G'
 * until then).
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
  if (isCastPersona(persona)) return <CastBadge id={persona} size={size} className={className} />;
  if (persona === "genny") {
    if (castReady("genny")) {
      return (
        <img
          src={castAvatarSrc("genny")}
          alt=""
          width={size}
          height={size}
          className={`rounded-full object-cover ring-2 ring-[#0b2a5b] ${className}`}
          style={{ width: size, height: size }}
          data-cast={CAST.genny.id}
        />
      );
    }
    // Neutral initial only while no approved Genny image fits the role (assistant-cast readiness):
    // no invented portrait (SCD:ASSET GENERATE_ORIGINAL, non-substitutive).
    return (
      <span
        aria-hidden="true"
        className={`inline-flex shrink-0 items-center justify-center rounded-full bg-[#0b2a5b] font-bold text-[#ffd600] ring-2 ring-[#ffd600] ${className}`}
        style={{ width: size, height: size, fontSize: Math.round(size * 0.46) }}
      >
        G
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

/**
 * Round badge of a cast character (UD-114): the approved 256px avatar when the character's portrait is ready
 * (assistant-cast.ts readiness), otherwise its initial in the club colours, like Genny's "G". Never a drawing that
 * stands in for a face the Direzione has not approved.
 */
export function CastBadge({
  id,
  size = 44,
  className = "",
  initial,
}: {
  id: CastPersonaId | "genny";
  size?: number;
  className?: string;
  /** Letter for characters outside cast-personas (Genny). */
  initial?: string;
}) {
  const castId = (CAST_IDS as readonly string[]).includes(id) ? (id as CastId) : null;
  if (castId && castReady(castId)) {
    return (
      <img
        src={castAvatarSrc(castId)}
        alt=""
        width={size}
        height={size}
        className={`shrink-0 rounded-full object-cover ring-2 ring-[#0b2a5b] ${className}`}
        style={{ width: size, height: size }}
        data-cast={castId}
      />
    );
  }
  const letter = initial ?? (id === "genny" ? "G" : CAST_PERSONAS[id].initial);
  return (
    <span
      aria-hidden="true"
      data-cast-initial={id}
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-[#0b2a5b] font-bold text-[#ffd600] ring-2 ring-[#ffd600] ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.46) }}
    >
      {letter}
    </span>
  );
}
