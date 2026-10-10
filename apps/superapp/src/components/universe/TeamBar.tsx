import { ChevronDown, Star } from "lucide-react";
import { useEffect, useRef } from "react";

import type { Selection, Team } from "@/lib/universe";

/** Sigla colorata dell'annata (colore ufficiale del Master Calendario). Sostituisce gli stemmi annata non verificati. */
export function TeamCode({
  team,
  size = "md",
}: {
  team: Pick<Team, "code" | "color">;
  size?: "sm" | "md" | "lg";
}) {
  const dim =
    size === "lg"
      ? "h-[46px] w-[46px] text-[18px]"
      : size === "sm"
        ? "h-[30px] w-[44px] text-[15px]"
        : "h-[38px] w-[38px] text-[15px]";
  return (
    <span
      aria-hidden="true"
      className={`uv-code inline-grid shrink-0 place-items-center rounded-[8px] font-uv text-white ${dim}`}
      style={{ background: team.color }}
    >
      {team.code}
    </span>
  );
}

type Props = {
  teams: readonly Team[];
  follow: readonly string[];
  selection: Selection;
  live: ReadonlySet<string>;
  onSelect: (s: Selection) => void;
  onOpenPicker: () => void;
};

/** Barra annate fissa sotto la testata: "Tutte", "Le mie", poi le annate per età; il resto nel foglio "Tutte le annate". */
export function TeamBar({
  teams,
  follow,
  selection,
  live,
  onSelect,
  onOpenPicker,
}: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const active = scroller.current?.querySelector<HTMLElement>(
      '[aria-pressed="true"]',
    );
    active?.scrollIntoView({ inline: "nearest", block: "nearest" });
  }, [selection]);
  const chip =
    "relative flex h-10 shrink-0 items-center gap-[6px] rounded-full border-2 px-[13px] text-[14.5px] font-bold whitespace-nowrap transition-colors";
  const on =
    "border-[var(--uv-gold)] bg-[var(--uv-gold)] text-[var(--uv-night)]";
  const off = "border-white/25 bg-white/5 text-white";
  return (
    <nav
      aria-label="Scegli la squadra"
      data-testid="team-bar"
      className="sticky top-0 z-30 h-14 border-b-[3px] border-[var(--uv-gold)] bg-[rgb(2_31_79/0.86)] shadow-[0_8px_18px_rgb(0_8_30/0.35)] backdrop-blur-md lg:top-[57px]"
    >
      <div className="relative mx-auto flex h-full max-w-[1200px] items-center">
        <div
          ref={scroller}
          className="scd-scroll-x flex h-full flex-1 items-center gap-[6px] overflow-x-auto pl-3 pr-14 lg:pl-6"
        >
          <button
            type="button"
            aria-pressed={selection === "all"}
            onClick={() => onSelect("all")}
            className={`${chip} ${selection === "all" ? on : off}`}
          >
            Tutte
          </button>
          {follow.length > 0 && (
            <button
              type="button"
              aria-pressed={selection === "mine"}
              onClick={() => onSelect("mine")}
              className={`${chip} ${selection === "mine" ? on : off}`}
            >
              <Star
                className="size-[14px]"
                fill="currentColor"
                aria-hidden="true"
              />
              Le mie
            </button>
          )}
          {teams.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={selection === t.id}
              onClick={() => onSelect(t.id)}
              aria-label={`${t.label}${live.has(t.id) ? ", in campo ora" : ""}`}
              className={`${chip} ${selection === t.id ? on : off}`}
            >
              <span
                aria-hidden="true"
                className="h-6 w-3 -skew-x-[14deg] rounded-[4px] shadow-[inset_0_0_0_2px_rgb(255_255_255/0.35)]"
                style={{ background: t.color }}
              />
              {follow.includes(t.id) && (
                <Star
                  className={`size-[13px] ${selection === t.id ? "text-[var(--uv-night)]" : "text-[var(--uv-gold)]"}`}
                  fill="currentColor"
                  aria-hidden="true"
                />
              )}
              {t.short}
              {live.has(t.id) && (
                <span
                  aria-hidden="true"
                  className="uv-blink absolute right-1 top-[2px] size-[9px] rounded-full bg-[var(--scd-red)] shadow-[0_0_0_2px_var(--uv-night)]"
                />
              )}
            </button>
          ))}
        </div>
        <div className="absolute inset-y-0 right-0 flex items-center bg-gradient-to-r from-transparent to-[var(--uv-night)] to-40% pl-[26px] pr-2">
          <button
            type="button"
            onClick={onOpenPicker}
            aria-haspopup="dialog"
            className="flex h-10 min-w-11 items-center gap-[6px] rounded-full border-2 border-[var(--uv-gold)] bg-[var(--uv-night)] px-[10px] text-[14px] font-extrabold text-[var(--uv-gold)]"
          >
            <span className="hidden md:inline">Tutte le annate</span>
            <ChevronDown
              className="size-[18px]"
              strokeWidth={2.6}
              aria-hidden="true"
            />
            <span className="sr-only md:hidden">Tutte le annate</span>
          </button>
        </div>
      </div>
    </nav>
  );
}

type PickerProps = {
  teams: readonly Team[];
  follow: readonly string[];
  nextLabel: (teamId: string) => string | null;
  onToggle: (teamId: string) => void;
  onDone: () => void;
  onClose: () => void;
};

/** Foglio "Quale squadra segui?": Agonistica e Attività di base; si usa senza account. */
export function TeamPicker({
  teams,
  follow,
  nextLabel,
  onToggle,
  onDone,
  onClose,
}: PickerProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const group = (g: Team["group"], title: string) => {
    const list = teams.filter((t) => t.group === g);
    if (!list.length) return null;
    return (
      <>
        <p className="mb-2 mt-4 font-uv text-[16px] uppercase tracking-[0.1em] text-[var(--scd-sub)]">
          {title}
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {list.map((t) => {
            const on = follow.includes(t.id);
            const nx = nextLabel(t.id);
            return (
              <button
                key={t.id}
                type="button"
                aria-pressed={on}
                onClick={() => onToggle(t.id)}
                className={`grid min-h-16 grid-cols-[46px_1fr_auto] items-center gap-[10px] rounded-[14px] border-2 px-[10px] py-2 text-left ${on ? "border-[var(--uv-gold)] bg-[rgb(255_210_31/0.12)]" : "border-[var(--scd-line)]"}`}
              >
                <TeamCode team={t} size="lg" />
                <span>
                  <b className="block text-[15px] leading-tight">
                    {t.label.replace(/\s·\s/g, " ")}
                  </b>
                  <small className="mt-[2px] block text-[13px] text-[var(--scd-sub)]">
                    {nx ?? "Nessuna gara in calendario"}
                  </small>
                </span>
                <Star
                  className={`size-6 ${on ? "text-[#e0a800]" : "text-[var(--scd-line)]"}`}
                  fill="currentColor"
                  aria-hidden="true"
                />
              </button>
            );
          })}
        </div>
      </>
    );
  };
  return (
    <>
      <button
        type="button"
        aria-label="Chiudi"
        onClick={onClose}
        className="fixed inset-0 z-[60] cursor-default bg-[#00081e]/60"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pick-t"
        data-testid="team-picker"
        className="fixed inset-x-0 bottom-0 z-[61] mx-auto max-h-[88dvh] max-w-[600px] overflow-y-auto rounded-t-[22px] border-t-[5px] border-[var(--uv-gold)] bg-white px-4 pb-[calc(20px+env(safe-area-inset-bottom))] pt-4 text-[var(--scd-ink)]"
      >
        <div className="flex items-center justify-between gap-3">
          <h2
            id="pick-t"
            className="font-uv text-[28px] uppercase leading-none"
          >
            Quale squadra segui?
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="min-h-11 rounded-full bg-[#eef4ff] px-4 font-extrabold"
          >
            Chiudi
          </button>
        </div>
        <p className="mb-1 mt-2 text-[15px] text-[var(--scd-sub)]">
          Scegline una o più: la home si apre sulle tue annate. Puoi cambiare
          quando vuoi, senza account.
        </p>
        {group("agonistica", "Agonistica")}
        {group("base", "Attività di base")}
        <button
          type="button"
          onClick={onDone}
          className="mt-4 min-h-[50px] w-full rounded-[14px] bg-[var(--uv-night)] font-uv text-[20px] uppercase tracking-[0.06em] text-[var(--uv-gold)] shadow-[0_4px_0_#000c2a]"
        >
          Fatto
        </button>
        <button
          type="button"
          onClick={onClose}
          className="mx-auto mt-2 block min-h-11 px-3 font-bold text-[var(--scd-sub)]"
        >
          Guardo tutte le squadre
        </button>
      </div>
    </>
  );
}
