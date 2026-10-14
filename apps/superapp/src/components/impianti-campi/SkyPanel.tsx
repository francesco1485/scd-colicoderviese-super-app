/**
 * "Chiedi a Genny" side panel: deterministic answers from the rotation engine
 * (src/lib/facility-assistant.ts). No LLM, no network: questions never leave
 * the browser. Sky's face is the existing official avatar (SkyMascot).
 */
import { Send, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { SkyMascot } from "@/components/SkyChat";
import {
  ASSISTANT_EXAMPLES,
  answerQuestion,
  type AssistantAction,
  type AssistantAnswer,
} from "@/lib/facility-assistant";
import type { ImpiantiModel } from "./model";

type Msg = {
  id: number;
  role: "user" | "sky";
  text: string;
  answer?: AssistantAnswer;
};

const TONE: Record<AssistantAnswer["tone"], string> = {
  ok: "border-l-[var(--in-ok)]",
  warn: "border-l-[var(--in-warn)]",
  crit: "border-l-[var(--in-crit)]",
  info: "border-l-[var(--in-info)]",
};

export function SkyPanel({
  model,
  open,
  onClose,
  onAction,
}: {
  model: ImpiantiModel;
  open: boolean;
  onClose: () => void;
  onAction: (a: AssistantAction) => void;
}) {
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      id: 0,
      role: "sky",
      text: "Ciao, sono Genny, la segretaria. Ti dico se un campo è libero, dove mettere un torneo e quando avvisare il Comune, usando il calendario reale e le tue ipotesi. Sono simulazioni: non prenoto e non sposto niente.",
    },
  ]);
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const seq = useRef(1);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [msgs]);

  const ask = (text: string) => {
    const t = text.trim();
    if (!t) return;
    const answer = answerQuestion(t, {
      items: model.items,
      analysis: model.analysis,
      today: model.today,
      buffer: model.options.buffer,
      lightsVerified: model.lightsVerified,
    });
    setMsgs((m) => [
      ...m,
      { id: seq.current++, role: "user", text: t },
      { id: seq.current++, role: "sky", text: answer.text, answer },
    ]);
    setQ("");
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    ask(q);
  };

  if (!open) return null;
  return (
    <aside
      aria-label="Chiedi a Genny"
      className="fixed inset-x-0 bottom-0 z-40 flex max-h-[85dvh] flex-col rounded-t-2xl border border-[var(--in-line)] bg-white shadow-[0_-16px_40px_rgb(6_42_82/0.25)] lg:inset-x-auto lg:bottom-4 lg:right-4 lg:top-[88px] lg:max-h-none lg:w-[400px] lg:rounded-2xl"
    >
      <header className="flex items-center gap-3 border-b border-[var(--in-line)] px-4 py-3">
        <SkyMascot size={44} persona="genny" />
        <div className="min-w-0 flex-1">
          <h2 className="m-0 text-[18px] font-bold">Chiedi a Genny</h2>
          <p className="m-0 text-[13px] text-[var(--in-sub)]">
            Risposte dal calendario e dalle tue ipotesi, senza intelligenza
            artificiale.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Chiudi Chiedi a Genny"
          className="scd-focus flex size-11 flex-none items-center justify-center rounded-lg hover:bg-[var(--in-info-bg)]"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </header>
      <div
        ref={listRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3"
        role="log"
        aria-live="polite"
        aria-label="Conversazione con Genny"
      >
        {msgs.map((m) =>
          m.role === "user" ? (
            <p
              key={m.id}
              className="m-0 ml-8 rounded-xl rounded-br-sm bg-[var(--in-info-bg)] px-3 py-2 text-[15px]"
            >
              {m.text}
            </p>
          ) : (
            <div
              key={m.id}
              className={`mr-4 rounded-xl border border-l-4 border-[var(--in-line)] bg-white px-3 py-2 text-[15px] ${m.answer ? TONE[m.answer.tone] : "border-l-[var(--in-info)]"}`}
            >
              <p className="m-0">{m.text}</p>
              {m.answer && m.answer.details.length > 0 && (
                <ul className="m-0 mt-1.5 grid gap-1 pl-4 text-[14px] text-[var(--in-sub)]">
                  {m.answer.details.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              )}
              {m.answer && m.answer.intent === "help" && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {m.answer.details.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => ask(d)}
                      className="scd-focus min-h-9 rounded-full border border-[var(--in-line)] px-3 text-left text-[13px] font-semibold text-[var(--in-info)] hover:bg-[var(--in-info-bg)]"
                    >
                      {d}
                    </button>
                  ))}
                </div>
              )}
              {m.answer && m.answer.actions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {m.answer.actions.map((a) => (
                    <button
                      key={a.label}
                      type="button"
                      onClick={() => onAction(a)}
                      className={`scd-focus min-h-9 rounded-[10px] px-3 text-[13.5px] font-semibold ${a.type === "add-booking" ? "bg-[var(--in-action)] text-[var(--in-ink)]" : "border border-[#b9d5ef] bg-white text-[var(--in-info)] hover:bg-[var(--in-info-bg)]"}`}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ),
        )}
      </div>
      {msgs.length === 1 && (
        <div
          className="flex gap-1.5 overflow-x-auto px-4 pb-2"
          role="group"
          aria-label="Domande di esempio"
        >
          {ASSISTANT_EXAMPLES.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => ask(e)}
              className="scd-focus min-h-9 flex-none rounded-full border border-[var(--in-line)] px-3 text-[13px] font-semibold text-[var(--in-info)] hover:bg-[var(--in-info-bg)]"
            >
              {e}
            </button>
          ))}
        </div>
      )}
      <form
        onSubmit={submit}
        className="flex items-center gap-2 border-t border-[var(--in-line)] px-3 py-3"
      >
        <label className="sr-only" htmlFor="sky-q">
          Fai una domanda a Genny
        </label>
        <input
          id="sky-q"
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Es. il campo 2 è libero sabato alle 15?"
          maxLength={200}
          autoComplete="off"
          className="scd-focus min-h-11 min-w-0 flex-1 rounded-[10px] border border-[var(--in-line)] bg-[var(--in-ground)] px-3 text-[15px]"
        />
        <button
          type="submit"
          aria-label="Invia la domanda"
          className="scd-focus flex size-11 flex-none items-center justify-center rounded-[10px] bg-[var(--in-action)] text-[var(--in-ink)] active:scale-[0.97]"
        >
          <Send className="size-5" aria-hidden="true" />
        </button>
      </form>
    </aside>
  );
}
