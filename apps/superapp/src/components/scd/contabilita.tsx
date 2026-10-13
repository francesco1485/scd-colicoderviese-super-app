/**
 * Shared pieces of the Tesoreria "contabilità ordinaria" pages (prima nota, calendario incassi, chiusura):
 * head, sibling navigation, month switcher and small figures. Access is the Movimenti gate (Direzione and
 * Tesoreria); the database functions decide again on every read.
 */
import { Link } from "@tanstack/react-router";
import {
  BookOpenText,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Wallet,
} from "lucide-react";
import type { ReactNode } from "react";

import { type WorkAreaGate } from "@/lib/access";
import { accessHead } from "./AccessScreen";
import { monthLabel } from "@/lib/ledger";

export type ContabilitaPage = "prima-nota" | "calendario-incassi" | "chiusura";

export const CONTABILITA_PAGES: ReadonlyArray<{
  id: ContabilitaPage | "movimenti";
  path: string;
  label: string;
  what: string;
  icon: typeof Wallet;
}> = [
  {
    id: "prima-nota",
    path: "/tesoreria/prima-nota",
    label: "Prima nota",
    what: "Registro cronologico di ogni movimento con saldo calcolato, centro di costo e natura proposti.",
    icon: BookOpenText,
  },
  {
    id: "calendario-incassi",
    path: "/tesoreria/calendario-incassi",
    label: "Calendario incassi",
    what: "Partite in casa e giorni Club House: incassi registrati o da registrare.",
    icon: CalendarDays,
  },
  {
    id: "chiusura",
    path: "/tesoreria/chiusura",
    label: "Chiusura del mese",
    what: "Controlli del mese e riepilogo per il commercialista entro il 15.",
    icon: ClipboardCheck,
  },
  {
    id: "movimenti",
    path: "/tesoreria/movimenti",
    label: "Movimenti e abbinamenti",
    what: "Riscontro dei bonifici con quote e fornitori.",
    icon: Wallet,
  },
];

export function contabilitaHead(
  title: string,
  description: string,
  gate: WorkAreaGate | undefined,
) {
  if (!gate || gate.view !== "page") return accessHead("movimenti");
  return {
    meta: [
      { title: `Tesoreria · ${title} — SCD Dentro · S.C.D. ColicoDerviese` },
      { name: "description", content: description },
      { name: "robots", content: "noindex" },
    ],
  };
}

export function ContabilitaNav({ current }: { current: ContabilitaPage }) {
  return (
    <nav
      aria-label="Contabilità della tesoreria"
      className="flex gap-1.5 overflow-x-auto pb-0.5"
      data-testid="contabilita-nav"
    >
      {CONTABILITA_PAGES.map((p) => {
        const Icon = p.icon;
        const here = p.id === current;
        return (
          <Link
            key={p.id}
            to={p.path as never}
            aria-current={here ? "page" : undefined}
            className={`scd-focus inline-flex h-10 flex-none items-center gap-1.5 rounded-full border px-3.5 text-[14px] font-semibold ${here ? "border-[var(--in-info)] bg-[var(--in-info)] text-white" : "border-[var(--in-line)] bg-white text-[var(--in-ink)] hover:bg-[var(--in-info-bg)]"}`}
          >
            <Icon className="size-4" aria-hidden="true" />
            {p.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function MonthSwitch({
  month,
  months,
  onChange,
  label = "Mese",
}: {
  month: string;
  months?: readonly string[];
  onChange: (m: string) => void;
  label?: string;
}) {
  const shift = (d: number) => {
    const [y, m] = month.split("-").map(Number) as [number, number];
    const idx = y * 12 + (m - 1) + d;
    return `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, "0")}`;
  };
  const prev = shift(-1);
  const next = shift(1);
  const can = (m: string) =>
    !months || months.length === 0 || months.includes(m);
  const btn =
    "scd-focus inline-flex size-11 items-center justify-center rounded-[10px] border border-[var(--in-line)] bg-white disabled:opacity-40";
  return (
    <div className="flex items-center gap-2" role="group" aria-label={label}>
      <button
        type="button"
        className={btn}
        onClick={() => onChange(prev)}
        disabled={!can(prev)}
        aria-label={`Mese precedente: ${monthLabel(prev)}`}
      >
        <ChevronLeft className="size-5" aria-hidden="true" />
      </button>
      <b
        className="min-w-[150px] text-center text-[17px] capitalize"
        aria-live="polite"
        data-testid="month-label"
      >
        {monthLabel(month)}
      </b>
      <button
        type="button"
        className={btn}
        onClick={() => onChange(next)}
        disabled={!can(next)}
        aria-label={`Mese successivo: ${monthLabel(next)}`}
      >
        <ChevronRight className="size-5" aria-hidden="true" />
      </button>
    </div>
  );
}

export function Figure({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: ReactNode;
  tone?: "ok" | "warn" | "info" | "mute" | undefined;
  hint?: ReactNode;
}) {
  const bg =
    tone === "ok"
      ? "bg-[var(--in-ok-bg)]"
      : tone === "warn"
        ? "bg-[var(--in-warn-bg)]"
        : tone === "mute"
          ? "bg-[#eef3f9]"
          : "bg-[var(--in-info-bg)]";
  return (
    <div className={`min-w-0 rounded-xl px-3 py-2.5 ${bg}`}>
      <span className="block font-title text-[21px] font-black leading-none tabular-nums">
        {value}
      </span>
      <span className="mt-1 block text-[13px] leading-tight text-[var(--in-sub)]">
        {label}
      </span>
      {hint && (
        <span className="mt-0.5 block text-[12px] leading-tight text-[var(--in-sub)]">
          {hint}
        </span>
      )}
    </div>
  );
}

export function signedEuro(n: number, euro: (n: number) => string): string {
  return `${n > 0 ? "+" : n < 0 ? "−" : ""}${euro(Math.abs(n))}`;
}
