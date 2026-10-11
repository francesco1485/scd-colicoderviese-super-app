/**
 * Tesoreria pieces (board Tesoreria-sottoaree.dc.html): sub-areas with their own link, the
 * Dirigenza purchase steps and the Club House till. No amount is shown anywhere: the tills
 * are not connected and the price lists are not loaded.
 */
import { Link } from "@tanstack/react-router";
import { Box, CircleDollarSign, FileText, TriangleAlert, type LucideIcon } from "lucide-react";

import { accessScreen, whoEnters } from "@/lib/access";
import { purchaseSteps } from "@/lib/work-areas";
import { Card, Chip } from "./interior-ui";
import { EmptyState, PendingButton } from "./work-area-ui";

export const TESORERIA_SUBAREAS: readonly { id: "club-house" | "biglietteria" | "magazzino-cassa"; label: string; what: string; icon: LucideIcon }[] = [
  { id: "club-house", label: "Club House", what: "Incassi e ordini del bar", icon: CircleDollarSign },
  { id: "biglietteria", label: "Biglietteria", what: "Incassi e abbonamenti", icon: FileText },
  { id: "magazzino-cassa", label: "Magazzino", what: "Ordini e incassi del kit", icon: Box },
];

export function SubAreaList({ current }: { current?: string }) {
  return (
    <Card id="tes-sottoaree" title="Sottoaree con link diretto" sub="Ognuna ha il suo accesso: chi lavora al bar vede solo la cassa del bar. Gli incassi compaiono quando la cassa è collegata.">
      <ul className="m-0 list-none p-0">
        {TESORERIA_SUBAREAS.map((s) => {
          const a = accessScreen(s.id);
          const Icon = s.icon;
          const here = s.id === current;
          return (
            <li key={s.id} className={`flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-[var(--in-line)] px-4 py-3 sm:px-[18px] ${here ? "bg-[#fffbe6]" : ""}`}>
              <span className="flex size-10 flex-none items-center justify-center rounded-xl bg-[var(--in-info-bg)] text-[var(--in-info)]">
                <Icon className="size-5" strokeWidth={1.8} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline gap-x-2">
                  <b className="text-[16px]">{s.label}</b>
                  <Link to={a.path as never} aria-current={here ? "page" : undefined} className="scd-focus rounded-sm text-[13.5px] font-semibold text-[var(--in-info)] underline-offset-4 hover:underline">
                    {a.path}
                  </Link>
                </span>
                <span className="block text-[14px] leading-snug text-[var(--in-sub)]">
                  {s.what} · accesso: {whoEnters(a)}
                </span>
              </span>
              <Chip tone="mute">cassa da collegare</Chip>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

export function PurchaseSteps() {
  const steps = purchaseSteps();
  return (
    <Card id="tes-acquisti" title="Acquisti e fatture della Dirigenza" sub={<>/direzione/acquisti · accesso Dirigenza. Ogni acquisto segue {steps.length} passi, con nome e data.</>}>
      <ol className="m-0 grid list-none grid-cols-5 gap-1 px-4 pb-3 sm:px-[18px]">
        {steps.map((s, i) => (
          <li key={s} className="flex min-w-0 flex-col items-center gap-1.5 text-center">
            <span className="flex size-9 items-center justify-center rounded-full border-2 border-[#b9d5ef] bg-[var(--in-info-bg)] font-title text-[17px] font-black text-[var(--in-info)]">{i + 1}</span>
            <span className="text-[13px] font-semibold leading-tight [overflow-wrap:anywhere] sm:text-[14px]">{s}</span>
          </li>
        ))}
      </ol>
      <div className="px-4 pb-4 sm:px-[18px]">
        <EmptyState title="Nessuna richiesta di acquisto">
          La prima richiesta partirà dall'area Direzione.{" "}
          <Link to={"/direzione/acquisti" as never} className="scd-focus rounded-sm font-semibold text-[var(--in-info)] underline underline-offset-4">Apri /direzione/acquisti</Link>
        </EmptyState>
      </div>
    </Card>
  );
}

export function TariffWarning() {
  return (
    <p role="note" className="m-0 flex gap-2 rounded-xl bg-[var(--in-warn-bg)] px-4 py-3 text-[14.5px] font-semibold leading-snug text-[var(--in-warn)]">
      <TriangleAlert className="mt-[1px] size-[18px] flex-none" strokeWidth={1.8} aria-hidden="true" />
      Biglietteria: fonte delle tariffe da confermare. Conferma il tariffario prima di vendere.
    </p>
  );
}

/** Till as it will look on the tablet (dark panel of the board). Disabled, total "—". */
export function TillPreview({ title, path, tabs, emptyTitle, emptyText, loadLabel }: { title: string; path: string; tabs: readonly string[]; emptyTitle: string; emptyText: string; loadLabel: string }) {
  return (
    <Card id={`till-${path.replace(/\W+/g, "-")}`} title={title} sub={<>Come apparirà sul tablet · {path}</>}>
      <div className="mx-4 mb-4 flex min-h-[340px] flex-col gap-3 rounded-2xl bg-[var(--in-ink)] p-3.5 text-white sm:mx-[18px]">
        <div className="flex flex-wrap gap-2" aria-label="Reparti della cassa (non attivi)">
          {tabs.map((t, i) => (
            <span key={t} className={`inline-flex h-10 items-center rounded-[10px] px-3.5 text-[15px] font-semibold ${i === 0 ? "bg-[var(--in-action)] text-[var(--in-ink)]" : "bg-white text-[var(--in-info)]"}`}>{t}</span>
          ))}
        </div>
        <div className="rounded-xl border border-dashed border-white/30 p-4">
          <b className="block text-[16px]">{emptyTitle}</b>
          <p className="mt-1 text-[14px] leading-snug text-[#d6ebfb]">{emptyText}</p>
          <div className="mt-3"><PendingButton reason="Il caricamento si attiva con il login">{loadLabel}</PendingButton></div>
        </div>
        <div className="mt-auto flex items-center justify-between rounded-xl bg-white/10 px-4 py-3.5 text-[16px]">
          Totale <b className="font-title text-[24px]">—<span className="sr-only"> (nessun importo)</span></b>
        </div>
        <button type="button" disabled className="h-12 cursor-not-allowed rounded-xl bg-white/15 text-[17px] font-semibold text-white/70">Incassa</button>
      </div>
    </Card>
  );
}
