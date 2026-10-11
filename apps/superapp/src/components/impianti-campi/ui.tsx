/** Small building blocks of the inside palette (boards Rotazione-campi / Rotazione-Dervio). */
import type { ReactNode } from "react";

export type Tone = "ok" | "warn" | "crit" | "info" | "mute";

const CHIP: Record<Tone, string> = {
  ok: "bg-[var(--in-ok-bg)] text-[var(--in-ok)]",
  warn: "bg-[var(--in-warn-bg)] text-[var(--in-warn)]",
  crit: "bg-[var(--in-crit-bg)] text-[var(--in-crit)]",
  info: "bg-[var(--in-info-bg)] text-[var(--in-info)]",
  mute: "bg-[#eef3f9] text-[var(--in-sub)]",
};

export function Chip({
  tone,
  children,
  className = "",
}: {
  tone: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex min-h-[26px] items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[13px] font-semibold leading-tight ${CHIP[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function Card({
  title,
  subtitle,
  actions,
  children,
  className = "",
  id,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      aria-labelledby={id}
      className={`min-w-0 overflow-hidden rounded-2xl border border-[var(--in-line)] bg-white shadow-[var(--in-card-shadow)] ${className}`}
    >
      <header className="flex flex-wrap items-start justify-between gap-3 px-4 pb-2.5 pt-4 sm:px-[18px]">
        <div className="min-w-0">
          <h2 id={id} className="m-0 text-[19px] font-bold">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-0.5 text-[14px] leading-snug text-[var(--in-sub)]">
              {subtitle}
            </p>
          )}
        </div>
        {actions}
      </header>
      {children}
    </section>
  );
}

export const btnPrimary =
  "scd-focus inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] bg-[var(--in-action)] px-4 text-[15px] font-semibold text-[var(--in-ink)] transition-transform duration-150 hover:bg-[#ffdc2e] active:scale-[0.97] motion-reduce:transition-none";
export const btnSecondary =
  "scd-focus inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] border border-[#b9d5ef] bg-white px-4 text-[15px] font-semibold text-[var(--in-info)] transition-transform duration-150 hover:bg-[var(--in-info-bg)] active:scale-[0.97] motion-reduce:transition-none";
export const inputCls =
  "scd-focus min-h-11 w-full rounded-lg border border-[var(--in-line)] bg-[var(--in-ground)] px-2.5 text-[15px] text-[var(--in-ink)]";
export const labelCls = "text-[13px] font-semibold text-[var(--in-sub)]";

/** Source line with a small icon slot (board `.src`). */
export function Src({ children }: { children: ReactNode }) {
  return (
    <p className="m-0 flex items-start gap-1.5 px-4 pb-3.5 text-[13px] leading-snug text-[var(--in-sub)] sm:px-[18px]">
      {children}
    </p>
  );
}

/** "Simulazione" disclaimer used on every tab. */
export function SimulationNote({ children }: { children?: ReactNode }) {
  return (
    <p
      role="note"
      className="m-0 rounded-xl border border-[#f1dc7a] bg-[var(--in-warn-bg)] px-3.5 py-2.5 text-[14px] leading-snug text-[var(--in-ink)]"
    >
      <b>Simulazione.</b> Nessuna gara è spostata davvero. {children}
    </p>
  );
}
