/**
 * The floating helper of the Super App (one chat since UD-121, Direzione 14/10/2026: "una sola assistente chat in
 * tutta l'app, di nome VERA"):
 * - public pages: the chat and the launcher face are Vera, the club reception ("Chiedi a Vera");
 * - Sky stays away from the general app (Direzione 13/10/2026): never on public pages; inside only for young members
 *   (lib/assistant.ts rule) and on the under-14 team pages (KIDS_TEAM_IDS);
 * - reserved areas: the helper goes by the signed-in viewer (r99, UD-104): Vera for staff and adult members (15+),
 *   Sky for younger members and when nothing tells us the viewer is 15+. The rule lives in one place, lib/assistant.ts
 *   veraEligible / resolveChat, shared by the chat persona, the launcher face and the server voice.
 * A face card of the cast (lib/cast-personas.ts CAST_FACES) opens Vera's chat with its area ("Chiedi a Vera", window
 * event "assistant:open", lib/assistant-open.ts): Vera hands over to the face and shows its action buttons.
 * The chat logic lives in SkyChat.tsx; answers come from the AI assistants (lib/assistant.functions.ts) with the
 * rules engine as fallback.
 *
 * Official assets only (config/scd-assets.v1.json): Sky head /media/brand/sky-atv-head.webp, Sky head + ball
 * /media/brand/sky-scd.png. Vera has no approved image yet: neutral 'V' initial until the Direzione approves one.
 */
import { resolveChat, type AssistantPersona, type ChatAreaId, type HelperViewer } from "@/lib/assistant";
import { CAST_IDS, castAvatarSrc, castReady, type CastId } from "@/lib/assistant-cast";
import { CAST_PERSONAS, VERA_PRESENCE, castLinkTo, type CastPersonaId } from "@/lib/cast-personas";
import { isPublicPath } from "@/lib/http-policy";
import type { SkyReply } from "@/lib/sky.functions";

export type Persona = AssistantPersona;

export type { HelperViewer } from "@/lib/assistant";
export { veraEligible } from "@/lib/assistant";

/** Public media paths of the official Sky files (never generated, never altered). */
export const SKY_HEAD_SRC = "/media/brand/sky-atv-head.webp";
export const SKY_BALL_SRC = "/media/brand/sky-scd.png";

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

/** Who answers in the chat: Vera everywhere, Sky inside for younger members (lib/assistant.ts resolveChat, UD-121). */
export function personaFor(pathname: string, viewer?: HelperViewer | null, requested?: string | null): Persona {
  return resolveChat(isReservedPath(pathname) ? "inside" : "public", viewer, requested).persona;
}

/** Area of Vera's chat on this page for this viewer (null: her general chat, or Sky). */
export function chatAreaFor(pathname: string, viewer?: HelperViewer | null, requested?: string | null): ChatAreaId | null {
  return resolveChat(isReservedPath(pathname) ? "inside" : "public", viewer, requested).area;
}

/** Face shown on the floating launcher: always the figure that answers (Vera outside, Direzione 13/10 + UD-121). */
export function launcherFaceFor(pathname: string, viewer?: HelperViewer | null): Persona {
  return personaFor(pathname, viewer);
}

export interface PersonaCopy {
  name: string;
  title: string;
  subtitle: string;
  greeting: string;
  placeholder: string;
  thinking: string;
  quick: ReadonlyArray<string>;
}

/** Chat copy of the two personas (Vera, Sky). */
export const PERSONA_COPY: Readonly<Record<Persona, PersonaCopy>> = {
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
  vera: {
    name: "Vera",
    title: "Chiedi a Vera",
    subtitle: "la reception del club: dati veri, con la fonte",
    greeting:
      "Ciao, sono Vera, la reception della ColicoDerviese. Ti rispondo con i dati veri del club e ti dico da dove vengono: partite, campi, iscrizioni, biglietti, card, sponsor e tornei. Se serve una persona, apro una richiesta alla segreteria: scrivimi in due parole cosa ti serve.",
    placeholder: "Scrivi a Vera…",
    thinking: "Vera sta cercando…",
    quick: [
      "Prossima partita",
      "Biglietti e card",
      "Come arrivare",
      "Iscrizioni",
      "Diventare sponsor",
      "Contatti",
    ],
  },
};

/** Header line of Vera's chat opened with an area. */
const AREA_SUBTITLE: Readonly<Record<ChatAreaId, string>> = {
  "accoglienza-chef": "la reception · area Club House con Garrison",
  "volto-sponsor": "la reception · area sponsor con il Volto sponsor",
  "mentore-tornei": "la reception · area tornei con Enea",
  biglietteria: "la reception · biglietti, gratuità e card",
};

/** Chat copy for a persona and an area: Vera opened from a face card keeps her name and takes the area's questions. */
export function chatCopyFor(persona: Persona, area: ChatAreaId | null = null): PersonaCopy {
  const base = PERSONA_COPY[persona];
  if (persona !== "vera" || !area) return base;
  return { ...base, subtitle: AREA_SUBTITLE[area], quick: CAST_PERSONAS[area].chatQuick };
}

/**
 * First message of the chat. With an area Vera hands over to its face ("Per la Club House ti aiuta lo Chef: …") and
 * shows the area's action buttons as links.
 */
export function greetingFor(persona: Persona, area: ChatAreaId | null = null): { text: string; links?: SkyReply["links"] } {
  if (persona !== "vera" || !area) return { text: PERSONA_COPY[persona].greeting };
  const def = CAST_PERSONAS[area];
  return {
    text: `Ciao, sono Vera, la reception del club. ${def.handoff ?? ""} Scegli qui sotto o scrivimi.`.replace(/\s+/g, " ").trim(),
    links: def.quick.map((l) => ({ label: l.label, to: castLinkTo(l) })),
  };
}

/**
 * Round avatar of the active persona. Sky's head is cropped in a light circle with a navy ring; Vera uses her picture
 * once an image is approved (neutral 'V' until then).
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
  if (persona === "vera") return <CastBadge id="vera" size={size} className={className} />;
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
 * Round badge of a cast character: the approved 256px avatar when the character's portrait is ready (assistant-cast.ts
 * readiness), otherwise its initial in the club colours (Vera "V"). Never a drawing that stands in for a face the
 * Direzione has not approved.
 */
export function CastBadge({
  id,
  size = 44,
  className = "",
  initial,
}: {
  id: CastPersonaId | "vera";
  size?: number;
  className?: string;
  /** Letter override (defaults to the character's own initial). */
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
  const letter = initial ?? (id === "vera" ? VERA_PRESENCE.initial : CAST_PERSONAS[id].initial);
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
