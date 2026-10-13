import { Link, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Send, X } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";

import { CroviActor } from "@/components/CroviActor";
import {
  PERSONA_COPY,
  PersonaAvatar,
  SKY_BALL_SRC,
  isHelperHiddenPath,
  personaFor,
  type Persona,
} from "@/components/scd/SkyJolly";
import {
  CAMEO_SEEN_KEY,
  CAMEO_VISIBLE_MS,
  FORCED_CAMEO_DELAY_MS,
  cameoDelayMs,
  cameoLine,
  forceCameo,
  type CameoLine,
} from "@/lib/crovi-cameo";
import { askSky, type SkyReply } from "@/lib/sky.functions";

type Mood = SkyReply["mood"];
type Msg = { role: "sky" | "user"; text: string; links?: SkyReply["links"] };

/** Round mascot avatar: Sky by default (official head asset), CROVI inside reserved areas. */
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

function greeting(persona: Persona): Msg[] {
  return [{ role: "sky", text: PERSONA_COPY[persona].greeting }];
}

/* Bottom chrome on phones (SiteChrome.BottomNav 62px, SponsorBand 34px except on the home) */
const NAV_H = 62;
const STRIP_H = 34;
const GAP = 12;

export function SkyChat() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const persona = personaFor(pathname);
  const copy = PERSONA_COPY[persona];
  const hidden = isHelperHiddenPath(pathname);
  const onCalendario = pathname === "/calendario";
  const sponsorStrip = pathname !== "/";
  const [cameo, setCameo] = useState<CameoLine | null>(null);
  const pathRef = useRef(pathname);
  pathRef.current = pathname;
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [mood, setMood] = useState<Mood>("info");
  const [notify, setNotify] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>(() => greeting(persona));
  const ask = useServerFn(askSky);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  // A new persona (public <-> reserved) starts a fresh conversation with its own greeting.
  const personaRef = useRef(persona);
  useEffect(() => {
    if (personaRef.current === persona) return;
    personaRef.current = persona;
    setMsgs(greeting(persona));
    setMood("info");
  }, [persona]);

  // Apertura dal bottone in pagina (es. "Chiedi a CROVI" su /calendario da smartphone).
  useEffect(() => {
    const onOpen = () => {
      setOpen(true);
      setNotify(false);
    };
    window.addEventListener("crovi:open", onOpen);
    window.addEventListener("sky:open", onOpen);
    return () => {
      window.removeEventListener("crovi:open", onOpen);
      window.removeEventListener("sky:open", onOpen);
    };
  }, []);
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

  // Crovi cameo (UD-026): only where CROVI is the helper (reserved areas), once per visit.
  useEffect(() => {
    if (persona !== "crovi") return;
    const forced = forceCameo(window.location.search);
    let seen = false;
    try {
      seen = sessionStorage.getItem(CAMEO_SEEN_KEY) === "1";
    } catch {
      /* storage off: show once per page load */
    }
    if (seen && !forced) return;
    const t = setTimeout(
      () => {
        const line = cameoLine(pathRef.current);
        if (!line) return;
        setCameo(line);
        try {
          sessionStorage.setItem(CAMEO_SEEN_KEY, "1");
        } catch {
          /* ignore */
        }
      },
      forced ? FORCED_CAMEO_DELAY_MS : cameoDelayMs(Math.random()),
    );
    return () => clearTimeout(t);
  }, [persona]);
  useEffect(() => {
    if (!cameo) return;
    const t = setTimeout(() => setCameo(null), CAMEO_VISIBLE_MS);
    return () => clearTimeout(t);
  }, [cameo]);
  useEffect(() => {
    if (open || persona !== "crovi") setCameo(null);
  }, [open, persona]);
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
      const r = await ask({ data: { message } });
      setMood(r.mood);
      setMsgs((m) => [...m, { role: "sky", text: r.text, links: r.links }]);
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

  if (hidden) return null;

  const phoneBottom = `calc(${NAV_H + (sponsorStrip ? STRIP_H : 0) + GAP}px + env(safe-area-inset-bottom))`;
  const isSky = persona === "sky";

  // Super App: su smartphone il widget resta sopra la barra di navigazione inferiore e la striscia sponsor.
  return (
    <div
      data-sky-widget
      data-persona={persona}
      style={{ "--sky-bottom": phoneBottom } as CSSProperties}
      className={`fixed bottom-[var(--sky-bottom)] right-4 z-50 flex max-w-[calc(100vw-2rem)] flex-col items-end gap-3 lg:bottom-[62px] ${onCalendario && !open ? "max-[640px]:hidden" : ""}`}
    >
      {open && (
        <div
          role="dialog"
          aria-label={`Chat con ${copy.name}`}
          className="sky-panel flex max-h-[calc(100dvh-11rem)] w-[min(21rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-[20px] border border-[#dbe3ee] bg-white shadow-[0_18px_40px_-12px_rgb(11_42_91/0.35)] lg:max-h-[calc(100dvh-6rem)]"
        >
          <div className="flex items-center gap-3 bg-[#0b2a5b] px-4 py-3 text-white">
            {isSky ? (
              <img
                src={SKY_BALL_SRC}
                alt=""
                width={40}
                height={38}
                className="h-[38px] w-[40px] shrink-0 object-contain"
              />
            ) : (
              <PersonaAvatar persona="crovi" size={32} />
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
                {m.links && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {m.links.map((l) => (
                      <Link
                        key={l.to}
                        to={l.to.split("?")[0] ?? l.to}
                        search={
                          Object.fromEntries(
                            new URLSearchParams(l.to.split("?")[1] ?? ""),
                          ) as never
                        }
                        onClick={() => setOpen(false)}
                        className="rounded-md bg-[#ffd600] px-2 py-1 text-[12px] font-semibold text-[#0b1e3a]"
                      >
                        {l.label} →
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {busy && (
              <p className="m-0 text-[12px] text-[#5a6b85]">{copy.thinking}</p>
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
      {cameo && !open && persona === "crovi" && (
        <div
          role="status"
          aria-live="polite"
          className="crovi-cameo flex items-end gap-1"
          data-testid="crovi-cameo"
        >
          <div className="mb-12 min-w-0 max-w-[min(13.5rem,calc(100vw-12.5rem))] rounded-2xl rounded-br-sm border border-[#dbe3ee] bg-white px-3 py-2.5 text-[0.8rem] leading-snug text-[#0b1e3a] shadow-[0_18px_40px_-12px_rgb(11_42_91/0.35)]">
            <p className="m-0">{cameo.text}</p>
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={() => {
                  const q = cameo.ask;
                  setCameo(null);
                  setOpen(true);
                  setNotify(false);
                  void send(q);
                }}
                className="rounded-full bg-[#ffd600] px-3 py-1 text-[0.75rem] font-semibold text-[#0b1e3a]"
              >
                Chiedi a Crovi
              </button>
              <button
                onClick={() => setCameo(null)}
                aria-label="Chiudi il messaggio di Crovi"
                className="flex size-8 items-center justify-center rounded-full text-[#5a6b85]"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>
          <CroviActor
            className="h-[clamp(150px,24svh,190px)] shrink-0 drop-shadow-[0_10px_14px_rgb(0_10_40/0.35)] lg:h-[210px]"
            label="Crovi saluta e indica la chat"
          />
        </div>
      )}
      <button
        ref={toggleRef}
        aria-expanded={open}
        onClick={() => {
          setOpen((o) => !o);
          setNotify(false);
        }}
        aria-label={
          open ? `Chiudi ${copy.name}` : `Apri ${copy.name}, aiuto rapido`
        }
        className={`relative flex size-14 items-center justify-center rounded-full bg-white shadow-[0_8px_22px_-6px_rgb(11_42_91/0.45)] ${notify && !open ? "sky-bounce" : "sky-idle"}`}
      >
        <SkyMascot mood={mood} size={52} persona={persona} />
        <span
          aria-hidden="true"
          className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded-full bg-[#0b2a5b] px-2 py-px text-[10px] font-bold leading-[14px] tracking-wide text-white"
        >
          {copy.name}
        </span>
        {notify && !open && (
          <span className="absolute -right-0.5 -top-0.5 size-3 rounded-full border-2 border-white bg-[#ffd600]" />
        )}
      </button>
    </div>
  );
}
