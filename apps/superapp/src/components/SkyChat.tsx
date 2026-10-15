import { Link, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Send, X } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";

import {
  PERSONA_COPY,
  PersonaAvatar,
  SKY_BALL_SRC,
  chatAreaFor,
  chatCopyFor,
  greetingFor,
  isHelperHiddenPath,
  isReservedPath,
  launcherFaceFor,
  personaFor,
  type Persona,
} from "@/components/scd/SkyJolly";
import { AI_NOTICE, type ChatAreaId } from "@/lib/assistant";
import { askAssistant, askStaffAssistant } from "@/lib/assistant.functions";
import { ASSISTANT_OPEN_EVENT, VERA_OPEN_EVENTS, openedArea } from "@/lib/assistant-open";
import { type SkyReply } from "@/lib/sky.functions";
import { useSession } from "@/lib/use-session";

type Mood = SkyReply["mood"];
type Msg = { role: "sky" | "user"; text: string; links?: SkyReply["links"]; ai?: boolean };

/** Round avatar of a persona: Sky (official head asset) or Vera (neutral badge until an image is approved). */
export function SkyMascot({
  size = 52,
  persona = "sky",
}: {
  mood?: Mood;
  size?: number;
  persona?: Persona;
}) {
  return <PersonaAvatar persona={persona} size={size} />;
}

/** Answers that never need the server: how the app works is a fixed page, not data. */
function localReply(message: string): SkyReply | null {
  if (/come funziona|guida|a cosa serve/i.test(message)) {
    return {
      text: "L'app è il punto unico del club: calendario e risultati aperti a tutti, aree riservate per famiglie, atleti e staff dopo l'accesso. La guida spiega ogni sezione passo per passo.",
      mood: "info",
      links: [
        { label: "Come funziona l'app", to: "/guida" },
        { label: "Entra o registrati", to: "/entra" },
      ],
    };
  }
  return null;
}

function greeting(persona: Persona, area: ChatAreaId | null): Msg[] {
  const g = greetingFor(persona, area);
  return [{ role: "sky", text: g.text, ...(g.links ? { links: g.links } : {}) }];
}

/* Bottom chrome on phones (SiteChrome.BottomNav 62px, SponsorBand 34px on every public page, UD-134) */
const NAV_H = 62;
const STRIP_H = 34;
/** Launcher (40px on phones, UD-135) centred on the sponsor strip: it sits on the strip's white right cap, never on page content. */
const LAUNCHER = 40;

/** A reply link: app paths through the router (with "?query" and "#anchor"), https sources in a new tab. */
function ReplyLink({ link, onNavigate }: { link: { label: string; to: string }; onNavigate: () => void }) {
  const cls = "rounded-md bg-[#ffd600] px-2 py-1 text-[12px] font-semibold text-[#0b1e3a]";
  if (/^https:\/\//.test(link.to)) {
    return (
      <a href={link.to} target="_blank" rel="noopener noreferrer" className={cls}>
        {link.label} ↗<span className="sr-only"> (si apre in una nuova scheda)</span>
      </a>
    );
  }
  if (!link.to.startsWith("/")) return null;
  const [beforeHash = link.to, hash] = link.to.split("#");
  const [path = beforeHash, query = ""] = beforeHash.split("?");
  return (
    <Link
      to={path as never}
      search={Object.fromEntries(new URLSearchParams(query)) as never}
      {...(hash ? { hash } : {})}
      onClick={onNavigate}
      className={cls}
    >
      {link.label} →
    </Link>
  );
}

/**
 * The one chat of the app (UD-121): Vera, or Sky for younger members inside.
 * interior: work-area shells (no public chrome, no bottom bar). There is no floating launcher: the chat opens only
 * from an in-page entry point ("Chiedi a Vera", window event "vera:open" — legacy "genny:open" / "crovi:open" — or
 * "sky:open") and sits 16px from the corner. "Chiedi a Vera" on a face card sends "assistant:open" with its area: Vera
 * keeps that area while the chat stays open on the page (assistant.ts resolveChat decides, the server re-checks).
 */
export function SkyChat({ interior = false }: { interior?: boolean } = {}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // Inside, Vera needs a verified session; until the session answers, the reserved helper is Sky, so nobody sees Vera
  // inside before the server confirms. One rule for persona, area and face: lib/assistant.ts resolveChat (UD-121).
  const { session } = useSession();
  const signedIn = !!session?.user;
  const viewer = signedIn ? { roles: session?.roles ?? [], age15plus: null } : null;
  // Area asked by a face card ("Chiedi a Vera"); forgotten when the chat closes or the page changes.
  const [requested, setRequested] = useState<ChatAreaId | null>(null);
  const persona = personaFor(pathname, viewer, requested);
  const area = chatAreaFor(pathname, viewer, requested);
  const face = launcherFaceFor(pathname, viewer);
  const copy = chatCopyFor(persona, area);
  const hidden = isHelperHiddenPath(pathname);
  const onCalendario = pathname === "/calendario";
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [mood, setMood] = useState<Mood>("info");
  const [notify, setNotify] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>(() => greeting(persona, area));
  const askPublic = useServerFn(askAssistant);
  const askInside = useServerFn(askStaffAssistant);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  // One assistant only (UD-134, Francesco 15/10/2026 09:18: "ci sono due chatbot e non si capisce nulla"): the Crovi
  // greeting bubble is gone; Vera is the only chat on public pages.

  // A new persona (public <-> reserved) or a new area starts a fresh conversation with its own greeting.
  const chatKey = `${persona}|${area ?? ""}`;
  const chatKeyRef = useRef(chatKey);
  useEffect(() => {
    if (chatKeyRef.current !== chatKey) {
      chatKeyRef.current = chatKey;
      setMsgs(greeting(persona, area));
      setMood("info");
    }
  }, [chatKey, persona, area]);

  // Opening from an in-page button ("Chiedi a Vera", legacy "Chiedi a Genny / Crovi", Sky on kids' pages).
  useEffect(() => {
    const onOpen = () => {
      setRequested(null);
      setOpen(true);
      setNotify(false);
    };
    const onAssistant = (e: Event) => {
      setRequested(openedArea(e));
      setOpen(true);
      setNotify(false);
    };
    const names = [...VERA_OPEN_EVENTS, "sky:open"];
    for (const n of names) window.addEventListener(n, onOpen);
    window.addEventListener(ASSISTANT_OPEN_EVENT, onAssistant);
    return () => {
      for (const n of names) window.removeEventListener(n, onOpen);
      window.removeEventListener(ASSISTANT_OPEN_EVENT, onAssistant);
    };
  }, []);
  useEffect(() => {
    if (!open) setRequested(null);
  }, [open]);
  useEffect(() => {
    setRequested(null);
  }, [pathname]);
  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    const t = setTimeout(() => setNotify(true), 4000); // saluto iniziale = una notifica
    return () => clearTimeout(t);
  }, []);

  useEffect(
    () => endRef.current?.scrollIntoView({ block: "end" }),
    [msgs, open],
  );

  async function send(text?: string) {
    const message = (text ?? input).trim();
    if (!message || busy) return;
    setMsgs((m) => [...m, { role: "user", text: message }]);
    setInput("");
    const local = localReply(message);
    if (local) {
      setMood(local.mood);
      setMsgs((m) => [
        ...m,
        { role: "sky", text: local.text, links: local.links },
      ]);
      return;
    }
    setBusy(true);
    try {
      // Inside with a verified session: Vera reads the Cervellone with the caller's own permissions, or the area the
      // face card asked for. Everywhere else: Vera with public data only (or Sky on a reserved page before the
      // session); both fall back to the rules engine and the server re-checks persona and area.
      const inside = isReservedPath(pathname) && signedIn;
      const r = inside
        ? await askInside({ data: area ? { message, area } : { message } })
        : await askPublic({ data: { message, persona, ...(area ? { area } : {}) } });
      setMood(r.mood);
      setMsgs((m) => [...m, { role: "sky", text: r.text, links: r.links, ai: r.ai === true }]);
    } catch {
      setMood("alert");
      setMsgs((m) => [
        ...m,
        {
          role: "sky",
          text: "Ops, non riesco a rispondere ora. Riprova tra poco.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  }

  if (hidden || (interior && !open)) return null;

  const phoneBottom = interior
    ? "calc(16px + env(safe-area-inset-bottom))"
    : `calc(${NAV_H + STRIP_H / 2 - LAUNCHER / 2}px + env(safe-area-inset-bottom))`;
  const isSky = persona === "sky";

  // Super App: su smartphone il widget resta sopra la barra di navigazione inferiore e la striscia sponsor.
  return (
    <div
      data-sky-widget
      data-interior={interior || undefined}
      data-persona={persona}
      data-face={face}
      style={{ "--sky-bottom": phoneBottom } as CSSProperties}
      className={`fixed bottom-[var(--sky-bottom)] right-4 z-50 flex max-w-[calc(100vw-2rem)] flex-col items-end gap-3 ${interior ? "lg:bottom-4" : "lg:bottom-[62px]"} ${onCalendario && !open ? "max-[640px]:hidden" : ""}`}
    >
      {open && (
        <div
          role="dialog"
          aria-label={`Chat con ${copy.name}`}
          data-chat-area={area ?? ""}
          className="sky-panel flex max-h-[calc(100dvh-11rem)] w-[min(21rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-[20px] border border-[#dbe3ee] bg-white shadow-[0_18px_40px_-12px_rgb(11_42_91/0.35)] lg:max-h-[calc(100dvh-6rem)]"
        >
          <div className="flex items-center gap-3 bg-[#0b2a5b] px-4 py-3 text-white" data-chat-persona={persona}>
            {isSky ? (
              <img
                src={SKY_BALL_SRC}
                alt=""
                width={40}
                height={38}
                className="h-[38px] w-[40px] shrink-0 object-contain"
              />
            ) : (
              <PersonaAvatar persona={persona} size={32} />
            )}
            <div className="min-w-0 flex-1">
              <p className="m-0 text-[15px] font-bold leading-tight">
                {copy.title}
              </p>
              <p className="m-0 text-[12px] leading-tight text-[#cfdcf0]">
                {copy.subtitle}
              </p>
            </div>
            <button
              aria-label={`Chiudi ${copy.name}`}
              onClick={() => {
                setOpen(false);
                toggleRef.current?.focus();
              }}
              className="flex size-11 shrink-0 items-center justify-center rounded-md text-white"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-[#eef3f9] p-3 sm:max-h-72">
            {msgs.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === "user"
                    ? "ml-auto w-fit max-w-[85%] rounded-xl bg-[#1556c4] px-3 py-2 text-[13px] text-white"
                    : "w-fit max-w-[92%] whitespace-pre-line rounded-xl bg-white px-3 py-2 text-[13px] leading-snug text-[#0b1e3a] shadow-[0_1px_2px_rgb(11_42_91/0.08)]"
                }
              >
                {m.text}
                {m.links && m.links.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {m.links.map((l) => (
                      <ReplyLink key={l.to} link={l} onNavigate={() => setOpen(false)} />
                    ))}
                  </div>
                )}
                {m.ai && (
                  <p className="m-0 mt-1.5 text-[11px] leading-tight text-[#5a6b85]">{AI_NOTICE}</p>
                )}
              </div>
            ))}
            {busy && (
              <div role="status" aria-live="polite" className="flex w-fit items-center gap-2 rounded-xl bg-white px-3 py-2 text-[12px] text-[#5a6b85] shadow-[0_1px_2px_rgb(11_42_91/0.08)]">
                <span aria-hidden="true" className="flex gap-1">
                  <span className="sky-typing-dot size-1.5 rounded-full bg-[#1556c4]" />
                  <span className="sky-typing-dot size-1.5 rounded-full bg-[#1556c4] [animation-delay:150ms]" />
                  <span className="sky-typing-dot size-1.5 rounded-full bg-[#1556c4] [animation-delay:300ms]" />
                </span>
                {copy.thinking}
              </div>
            )}
            {msgs.length === 1 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {copy.quick.map((q) => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    className="rounded-full border border-[#c9d5e6] bg-white px-3 py-1.5 text-[12.5px] font-semibold text-[#0b2a5b]"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
            <div ref={endRef} />
          </div>
          <div className="flex items-center gap-2 border-t border-[#dbe3ee] bg-white p-2">
            <input
              ref={inputRef}
              aria-label={copy.placeholder.replace("…", "")}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder={copy.placeholder}
              maxLength={400}
              className="min-w-0 flex-1 rounded-lg bg-[#eef3f9] px-3 py-2 text-[13px] text-[#0b1e3a] outline-none focus:ring-2 focus:ring-[#1556c4]"
            />
            <button
              onClick={() => send()}
              aria-label="Invia"
              className="rounded-lg bg-[#ffd600] p-2 text-[#0b1e3a]"
            >
              <Send className="size-4" />
            </button>
          </div>
        </div>
      )}
      {!interior && (
        <button
          ref={toggleRef}
          aria-expanded={open}
          onClick={() => {
            setOpen((o) => !o);
            setNotify(false);
          }}
          aria-label={
            open ? `Chiudi ${copy.name}` : `Apri ${copy.title}, aiuto rapido`
          }
          className={`relative flex size-10 items-center justify-center rounded-full lg:size-14 bg-white shadow-[0_8px_22px_-6px_rgb(11_42_91/0.45)] ${notify && !open ? "sky-bounce" : "sky-idle"}`}
        >
          <span className="flex origin-center scale-[0.72] lg:scale-100">
            <SkyMascot mood={mood} size={52} persona={face} />
          </span>
          <span
            aria-hidden="true"
            className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded-full bg-[#0b2a5b] px-2 py-px text-[10px] font-bold leading-[14px] tracking-wide text-white"
          >
            {PERSONA_COPY[face].name}
          </span>
          {notify && !open && (
            <span className="absolute -right-0.5 -top-0.5 size-3 rounded-full border-2 border-white bg-[#ffd600]" />
          )}
        </button>
      )}
    </div>
  );
}
