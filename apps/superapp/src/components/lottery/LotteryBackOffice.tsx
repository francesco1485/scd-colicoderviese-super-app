/**
 * Back office of the Lotteria dello sport (UD-115): eight steps in tabs, one shared state. Live when r102 is applied
 * (writes through the server, decided again by the database), otherwise a local simulation that saves nothing.
 */
import { FlaskConical } from "lucide-react";
import { useState, type KeyboardEvent } from "react";

import { Chip } from "@/components/scd/interior-ui";
import { WorkAreaShell } from "@/components/scd/work-area-ui";
import {
  complianceSchedule,
  emptyState,
  fundsSummary,
  reconcile,
  type LotteryState,
} from "@/lib/lottery";
import type { LotteryBoard } from "@/lib/lottery.functions";

import { CompliancePanel } from "./CompliancePanel";
import { DrawPanel } from "./DrawPanel";
import { FundsPanel } from "./FundsPanel";
import { PrizesPanel } from "./PrizesPanel";
import { PublishPanel } from "./PublishPanel";
import { RegolamentoPanel } from "./RegolamentoPanel";
import { SetupPanel } from "./SetupPanel";
import { useLotteryStore, type Mode } from "./store";
import { TicketsPanel } from "./TicketsPanel";

export const R102_PENDING =
  "Da attivare: serve l'OK della Direzione per applicare r102";

const TABS = [
  { id: "impostazione", label: "Impostazione" },
  { id: "adempimenti", label: "Adempimenti" },
  { id: "regolamento", label: "Regolamento" },
  { id: "premi", label: "Premi" },
  { id: "biglietti", label: "Biglietti" },
  { id: "estrazione", label: "Estrazione" },
  { id: "raccolta", label: "Raccolta" },
  { id: "pubblica", label: "Pagina pubblica" },
] as const;
type TabId = (typeof TABS)[number]["id"];

export function LotteryBackOffice({ board }: { board: LotteryBoard }) {
  const mode: Mode =
    board.engine === "applied" && board.actor ? "live" : "simulation";
  const initial: LotteryState = board.state ?? emptyState();
  const { state, actions } = useLotteryStore(mode, initial);
  const [tab, setTab] = useState<TabId>("impostazione");
  const canWrite = mode === "simulation" || board.actor !== null;
  const isDirezione = mode === "simulation" || board.actor === "DIREZIONE";
  const today = board.today;
  const locked = state.draws.length > 0;
  const rec = reconcile(
    state.series,
    state.blocks,
    state.setup.ticketPriceCents,
  );
  const funds = fundsSummary(state.ledger, state.setup.goalCents);
  const late = complianceSchedule(state.setup, state.compliance, today).filter(
    (r) => r.dueState === "SCADUTO",
  ).length;

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = TABS.findIndex((t) => t.id === tab);
    const next =
      e.key === "ArrowRight"
        ? (i + 1) % TABS.length
        : e.key === "ArrowLeft"
          ? (i - 1 + TABS.length) % TABS.length
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? TABS.length - 1
              : -1;
    if (next < 0) return;
    e.preventDefault();
    setTab(TABS[next]!.id);
    document.getElementById(`lot-tab-${TABS[next]!.id}`)?.focus();
  };

  return (
    <WorkAreaShell
      id="lotteria"
      preview={board.gate.preview}
      editable={mode === "live"}
      status={
        mode === "live" ? (
          <Chip tone="ok">Modifiche salvate nel database del club</Chip>
        ) : (
          <Chip tone="warn">Simulazione: niente viene salvato</Chip>
        )
      }
      highlights={[
        { value: state.setup.ticketsTotal, label: "biglietti emessi" },
        { value: rec.sold, label: "biglietti venduti (registri rientrati)" },
        { value: state.prizes.length, label: "premi" },
        {
          value: Math.round(funds.netCents / 100),
          label: "€ netti per il campo di calcetto",
        },
      ]}
      note="Iniziativa benefica: tutto il ricavato per i lavori sul campo di calcetto della chiesa patronale."
    >
      {mode === "simulation" && (
        <div
          className="flex gap-3 rounded-xl border border-[#f1dca6] bg-[var(--in-warn-bg)] px-4 py-3"
          role="note"
          data-testid="lot-r102-pending"
        >
          <FlaskConical
            className="mt-0.5 size-5 flex-none text-[var(--in-warn)]"
            aria-hidden="true"
          />
          <p className="m-0 text-[15px] leading-snug">
            <b>{R102_PENDING}.</b> Intanto lo strumento funziona in simulazione
            su questo dispositivo: puoi provare tutti i passaggi, ma niente
            viene salvato né pubblicato e ricaricando la pagina si riparte da
            zero.
            {board.engine === "applied" &&
              !board.actor &&
              " Il tuo accesso non comprende le sezioni Direzione o Tesoreria."}
          </p>
        </div>
      )}
      <div
        role="tablist"
        aria-label="Passaggi della lotteria"
        className="flex max-w-full gap-1 overflow-x-auto rounded-xl bg-[#e2edf8] p-1"
        onKeyDown={onKey}
      >
        {TABS.map((t, i) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`lot-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`lot-panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => setTab(t.id)}
            className={`scd-focus inline-flex h-11 flex-none items-center gap-1.5 whitespace-nowrap rounded-[10px] px-3.5 text-[15px] font-semibold ${tab === t.id ? "bg-white text-[var(--in-ink)] shadow-[var(--in-card-shadow)]" : "text-[var(--in-sub)] hover:text-[var(--in-ink)]"}`}
            data-testid={`lot-tab-${t.id}`}
          >
            <span
              className="text-[12px] font-bold text-[var(--in-info)]"
              aria-hidden="true"
            >
              {i + 1}
            </span>
            {t.label}
            {t.id === "adempimenti" && late > 0 && (
              <span
                className="rounded-full bg-[var(--in-crit)] px-1.5 text-[12px] font-bold text-white"
                aria-label={`${late} scaduti`}
              >
                {late}
              </span>
            )}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`lot-panel-${tab}`}
        aria-labelledby={`lot-tab-${tab}`}
        tabIndex={0}
        className="focus:outline-none"
      >
        {tab === "impostazione" && (
          <SetupPanel
            setup={state.setup}
            series={state.series}
            locked={locked}
            seriesLocked={state.blocks.length > 0}
            actions={actions}
            canWrite={canWrite}
          />
        )}
        {tab === "adempimenti" && (
          <CompliancePanel
            state={state}
            today={today}
            actions={actions}
            canWrite={canWrite}
          />
        )}
        {tab === "regolamento" && (
          <RegolamentoPanel state={state} today={today} />
        )}
        {tab === "premi" && (
          <PrizesPanel
            prizes={state.prizes}
            kind={state.setup.kind}
            locked={locked}
            actions={actions}
            canWrite={canWrite}
            hasLottery={!!state.id}
          />
        )}
        {tab === "biglietti" && (
          <TicketsPanel
            state={state}
            today={today}
            locked={locked}
            actions={actions}
            canWrite={canWrite}
          />
        )}
        {tab === "estrazione" && (
          <DrawPanel
            state={state}
            today={today}
            actions={actions}
            canWrite={canWrite}
            isDirezione={isDirezione}
          />
        )}
        {tab === "raccolta" && (
          <FundsPanel
            state={state}
            today={today}
            actions={actions}
            canWrite={canWrite}
          />
        )}
        {tab === "pubblica" && (
          <PublishPanel
            state={state}
            today={today}
            actions={actions}
            isDirezione={isDirezione}
            mode={mode}
          />
        )}
      </div>
    </WorkAreaShell>
  );
}
