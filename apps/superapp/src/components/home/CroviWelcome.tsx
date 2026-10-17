/**
 * Crovi's card on the member home for tesserati, convocati and families (UD-186, 17/10/2026 16:23: on the public home
 * Crovi is only the floating chatbot). First placed at the top of the public home (UD-184, Francesco DG 17/10/2026 14:08: «Io voglio vedere in prima pagina app
 * super web il crovi»; 15/10: «Crovi è avatar + chatbot in cima alla home; divertente da parlarci; si possono chiedere
 * cose o segnalare risultati velocemente; internamente passa la palla agli altri personaggi come un centralinista»).
 *
 * A compact card, not a hero banner (≈220px on phones): the approved Crovi v3 cut-out (config/scd-assets.v1.json) that
 * breathes and greets (.crovi-actor, .crovi-enter; prefers-reduced-motion keeps him still), the pose of the day and a
 * line of the moment (lib/crovi-welcome.ts, Europe/Rome), a «Chiedi a Crovi…» input and four quick questions. Every
 * question opens the one app chat (SkyChat, "assistant:open" with the text) and is sent there; the public chat is Crovi.
 * A match is named only from the public calendar (next home game with a confirmed time). No minors, no invented facts.
 * Engine PERSONE; measured as chat opens from this card per home visit.
 */
import { Send } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";

import { openAssistant } from "@/lib/assistant-open";
import { CROVI_CHIPS, croviLine, croviPose, croviPoseSrc, type CroviMatch } from "@/lib/crovi-welcome";

export function CroviWelcome({ nowMs, match = null }: { nowMs: number; match?: CroviMatch | null }) {
  const pose = croviPose(nowMs);
  const line = useMemo(() => croviLine(nowMs, match), [nowMs, match]);
  const [text, setText] = useState("");

  function ask(q: string) {
    const t = q.trim();
    if (!t) return;
    openAssistant(null, t);
    setText("");
  }
  function onSubmit(e: FormEvent) {
    e.preventDefault();
    ask(text);
  }

  return (
    <section aria-label="Chiedi a Crovi" data-crovi-welcome className="mx-auto w-full max-w-[1240px] px-4 pt-3 lg:px-8 lg:pt-5">
      <div className="relative overflow-hidden rounded-[20px] bg-[linear-gradient(135deg,#0b2a5b_0%,#123f8a_58%,#1556c4_100%)] text-white shadow-[0_14px_30px_-16px_rgb(11_42_91/0.55)]">
        {/* soft pitch lines, decoration only */}
        <span aria-hidden="true" className="pointer-events-none absolute -right-10 -top-16 size-48 rounded-full border-[10px] border-white/[0.06] lg:size-72" />
        <span aria-hidden="true" className="pointer-events-none absolute bottom-0 left-0 h-1 w-full bg-[#ffd600]" />
        <div className="relative grid grid-cols-[88px_minmax(0,1fr)] items-end gap-x-2 px-3 pt-2 lg:grid-cols-[140px_minmax(0,1fr)] lg:gap-x-5 lg:px-6 lg:pt-4">
          <div className="crovi-enter relative h-[106px] self-end overflow-hidden lg:h-[156px]">
            <img
              src={croviPoseSrc(pose, 440)}
              srcSet={`${croviPoseSrc(pose, 440)} 440w, ${croviPoseSrc(pose, 900)} 900w`}
              sizes="(min-width: 1024px) 140px, 88px"
              alt="Crovi, il personaggio della ColicoDerviese, ti saluta"
              width={300}
              height={440}
              data-crovi-pose={pose}
              className="crovi-actor absolute left-1/2 top-0 w-[88px] max-w-none -translate-x-1/2 drop-shadow-[0_6px_10px_rgb(0_0_0/0.35)] lg:w-[150px]"
              decoding="async"
              fetchPriority="high"
            />
          </div>
          <div className="min-w-0 self-center py-2 lg:py-4">
            <p className="m-0 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.12em] text-[#ffd600] lg:text-[12px]">
              Crovi
              <span className="rounded-full bg-white/12 px-2 py-px text-[10px] font-bold normal-case tracking-normal text-[#cfdcf0] lg:text-[11px]">
                il centralinista del club
              </span>
            </p>
            <div className="crovi-bubble relative mt-1 rounded-[14px] rounded-bl-[4px] bg-white px-3 py-1.5 text-[13px] font-semibold leading-snug text-[#0b1e3a] shadow-[0_6px_14px_-8px_rgb(0_0_0/0.5)] lg:max-w-[640px] lg:px-4 lg:py-3 lg:text-[16px]">
              <span aria-hidden="true" className="absolute -left-1.5 bottom-2 size-3 rotate-45 bg-white" />
              <span className="relative" aria-live="polite">{line}</span>
            </div>
          </div>
        </div>
        <div className="relative grid gap-2 border-t border-white/10 bg-[#0b2a5b]/40 px-3 pb-3 pt-2 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:items-center lg:gap-4 lg:px-6 lg:pb-4">
          <form onSubmit={onSubmit} className="flex items-center gap-1.5 rounded-full bg-white p-1 pl-4 shadow-[0_2px_6px_rgb(0_0_0/0.18)]" role="search">
            <input
              aria-label="Chiedi a Crovi"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Chiedi a Crovi…"
              maxLength={400}
              enterKeyHint="send"
              className="min-w-0 flex-1 bg-transparent text-[14px] text-[#0b1e3a] outline-none placeholder:text-[#5a6b85]"
            />
            <button
              type="submit"
              aria-label="Chiedi"
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#ffd600] text-[#0b1e3a] transition-transform active:scale-95"
            >
              <Send className="size-4" />
            </button>
          </form>
          <div className="-mx-3 flex gap-1.5 overflow-x-auto px-3 [mask-image:linear-gradient(90deg,#000_88%,transparent)] [scrollbar-width:none] lg:mx-0 lg:flex-wrap lg:px-0 lg:[mask-image:none]">
            {CROVI_CHIPS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => ask(q)}
                className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-[12px] font-bold transition-transform active:scale-95 lg:text-[13px] ${
                  q === "Segnala un risultato"
                    ? "bg-[#ffd600] text-[#0b1e3a]"
                    : "border border-white/35 bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
