import { Link, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import croviAvatar from "@/assets/crovi/crovi-avatar-256.webp.asset.json";
import { askSky, type SkyReply } from "@/lib/sky.functions";

type Mood = SkyReply["mood"];
type Msg = { role: "sky" | "user"; text: string; links?: SkyReply["links"] };

/** Avatar approvato CROVI (asset ufficiale SCD, 256x256 webp). */
export function SkyMascot({ size = 52 }: { mood?: Mood; size?: number }) {
  return <img src={croviAvatar.url} alt="" width={size} height={size} className="rounded-full object-cover" style={{ width: size, height: size }} />;
}

const QUICK = ["Prossima partita", "Calendario", "Come mi iscrivo?", "Diventare sponsor", "Dove siete?"];

export function SkyChat() {
  const onCalendario = useRouterState({ select: (s) => s.location.pathname }) === "/calendario";
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [mood, setMood] = useState<Mood>("info");
  const [notify, setNotify] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "sky", text: "Ciao, sono CROVI, l'assistente della SCD. Ti indirizzo su calendario, iscrizioni, sponsor, eventi o contatti." },
  ]);
  const ask = useServerFn(askSky);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  // Apertura dal bottone in pagina (es. "Chiedi a CROVI" su /calendario da smartphone).
  useEffect(() => {
    const onOpen = () => { setOpen(true); setNotify(false); };
    window.addEventListener("crovi:open", onOpen);
    return () => window.removeEventListener("crovi:open", onOpen);
  }, []);
  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); toggleRef.current?.focus(); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    const t = setTimeout(() => setNotify(true), 4000); // saluto iniziale = una notifica
    return () => clearTimeout(t);
  }, []);
  useEffect(() => endRef.current?.scrollIntoView({ block: "end" }), [msgs, open]);

  async function send(text?: string) {
    const message = (text ?? input).trim();
    if (!message || busy) return;
    setMsgs((m) => [...m, { role: "user", text: message }]);
    setInput("");
    setBusy(true);
    try {
      const r = await ask({ data: { message } });
      setMood(r.mood);
      setMsgs((m) => [...m, { role: "sky", text: r.text, links: r.links }]);
    } catch {
      setMood("alert");
      setMsgs((m) => [...m, { role: "sky", text: "Ops, non riesco a rispondere ora. Riprova tra poco." }]);
    } finally {
      setBusy(false);
    }
  }

  // Super App: su smartphone il widget resta sopra la barra di navigazione inferiore.
  return (
    <div data-sky-widget className={`fixed bottom-[calc(4.75rem+46px+env(safe-area-inset-bottom))] right-4 z-50 flex max-w-[calc(100vw-2rem)] flex-col items-end gap-3 lg:bottom-[62px] ${onCalendario && !open ? "max-[640px]:hidden" : ""}`}>
      {open && (
        <div role="dialog" aria-label="Chat con CROVI" className="sky-panel flex max-h-[calc(100dvh-11rem)] w-[min(21rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-premium lg:max-h-[calc(100dvh-6rem)]">
          <div className="surface-deep flex items-center gap-3 px-4 py-3">
            <SkyMascot mood={mood} size={32} />
            <div className="flex-1">
              <p className="font-display text-sm font-bold uppercase">CROVI</p>
              <p className="text-[0.7rem] opacity-80">assistente SCD · risposte guidate</p>
            </div>
            <button aria-label="Chiudi CROVI" onClick={() => { setOpen(false); toggleRef.current?.focus(); }} className="flex size-11 items-center justify-center rounded-md">
              <X className="size-4" />
            </button>
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-background p-3 sm:max-h-72">
            {msgs.map((m, i) => (
              <div key={i} className={m.role === "user" ? "ml-auto w-fit max-w-[85%] rounded-xl bg-primary px-3 py-2 text-xs text-primary-foreground" : "w-fit max-w-[92%] rounded-xl bg-muted px-3 py-2 text-xs text-foreground"}>
                {m.text}
                {m.links && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {m.links.map((l) => (
                      <Link key={l.to} to={l.to.split("?")[0] ?? l.to} search={Object.fromEntries(new URLSearchParams(l.to.split("?")[1] ?? "")) as never} onClick={() => setOpen(false)} className="rounded-md bg-accent px-2 py-1 font-semibold text-accent-foreground">
                        {l.label} →
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {busy && <p className="text-xs text-muted-foreground">CROVI sta cercando…</p>}
            {msgs.length === 1 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {QUICK.map((q) => (
                  <button key={q} onClick={() => send(q)} className="rounded-full border border-border px-2.5 py-1 text-[0.7rem]">
                    {q}
                  </button>
                ))}
              </div>
            )}
            <div ref={endRef} />
          </div>
          <div className="flex items-center gap-2 border-t border-border bg-card p-2">
            <input ref={inputRef} aria-label="Scrivi a CROVI" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Scrivi a CROVI…" maxLength={400} className="min-w-0 flex-1 rounded-lg bg-muted px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-ring" />
            <button onClick={() => send()} aria-label="Invia" className="rounded-lg bg-accent p-2 text-accent-foreground">
              <Send className="size-4" />
            </button>
          </div>
        </div>
      )}
      <button
        ref={toggleRef}
        aria-expanded={open}
        onClick={() => {
          setOpen((o) => !o);
          setNotify(false);
        }}
        aria-label={open ? "Chiudi assistente CROVI" : "Apri assistente CROVI"}
        className={`relative rounded-full shadow-premium ${notify && !open ? "sky-bounce" : "sky-idle"}`}
      >
        <SkyMascot mood={mood} size={52} />
        {notify && !open && <span className="absolute -right-0.5 -top-0.5 size-3 rounded-full border-2 border-background bg-destructive" />}
      </button>
    </div>
  );
}
