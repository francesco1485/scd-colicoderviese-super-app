import { Ban, HandCoins, Plus } from "lucide-react";
import { useState } from "react";

import { Card, Chip } from "@/components/scd/interior-ui";
import { EmptyState } from "@/components/scd/work-area-ui";
import {
  checkLedgerEntry,
  formatEuro,
  fundsSummary,
  LEDGER_KIND_LABEL,
  prizeTotals,
  reconcile,
  shortDay,
  WITHHOLDING_RATE_PERCENT,
  type LedgerKind,
  type LotteryState,
} from "@/lib/lottery";

import type { LotteryActions } from "./store";
import {
  btnGhostDanger,
  btnPrimary,
  DateField,
  IssueList,
  MoneyField,
  ResultLine,
  SelectField,
  TextField,
  useAction,
} from "./ui";

export function FundsPanel({
  state,
  today,
  actions,
  canWrite,
}: {
  state: LotteryState;
  today: string;
  actions: LotteryActions;
  canWrite: boolean;
}) {
  const f = fundsSummary(state.ledger, state.setup.goalCents);
  const rec = reconcile(
    state.series,
    state.blocks,
    state.setup.ticketPriceCents,
  );
  const prizes = prizeTotals(state.prizes, state.setup.kind);
  const [kind, setKind] = useState<LedgerKind>("INCASSO");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState<number | null>(null);
  const [date, setDate] = useState<string | null>(today);
  const add = useAction();
  const cancel = useAction();
  const entry = {
    kind,
    label,
    amountCents: amount ?? 0,
    entryDate: date ?? "",
  };
  const issues = label || amount !== null ? checkLedgerEntry(entry) : [];
  const disabled = !canWrite || !state.id;
  const live = state.ledger.filter((e) => !e.cancelled);

  return (
    <div className="flex flex-col gap-[18px]">
      <Card
        id="lot-funds"
        title="7 · Raccolta"
        sub="Incassi e costi registrati a mano dalla tesoreria. L'app non incassa e non paga."
      >
        <dl
          className="m-0 grid grid-cols-1 gap-3 px-4 pb-3 sm:grid-cols-3 sm:px-[18px]"
          data-testid="lot-funds-summary"
        >
          <Box label="Incassi" value={formatEuro(f.proceedsCents)} />
          <Box label="Costi" value={formatEuro(f.costsCents)} />
          <Box
            label="Netto per il campo di calcetto della chiesa patronale"
            value={formatEuro(f.netCents)}
            strong
          />
        </dl>
        {f.goalPercent !== null && state.setup.goalCents !== null && (
          <div className="px-4 pb-3 sm:px-[18px]">
            <div
              className="h-3 overflow-hidden rounded-full bg-[#dfe9f5]"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={f.goalPercent}
              aria-label="Netto rispetto all'obiettivo"
            >
              <div
                className="h-full rounded-full bg-[var(--in-action)]"
                style={{ width: `${f.goalPercent}%` }}
              />
            </div>
            <p className="m-0 mt-1 text-[14px] text-[var(--in-sub)]">
              {f.goalPercent}% dell'obiettivo di{" "}
              {formatEuro(state.setup.goalCents)}
            </p>
          </div>
        )}
        <ul className="m-0 list-disc px-4 pb-4 pl-9 text-[14px] leading-snug text-[var(--in-sub)] sm:px-[18px] sm:pl-10">
          <li>
            Dal registro biglietti: attesi{" "}
            {rec.expectedCents === null
              ? "— (prezzo da definire)"
              : formatEuro(rec.expectedCents)}
            , consegnati {formatEuro(rec.collectedCents)}. Registra qui
            l'incasso quando entra in cassa o in banca.
          </li>
          <li>
            Ritenuta {WITHHOLDING_RATE_PERCENT}% sui premi (stima):{" "}
            {formatEuro(prizes.withholdingCents)}
            {prizes.complete ? "" : " — parziale, mancano valori"}. Da
            registrare come costo quando si paga l'F24.
          </li>
        </ul>
      </Card>

      <Card id="lot-ledger" title="Movimenti">
        <div className="flex flex-col gap-3 px-4 pb-4 sm:px-[18px]">
          <form
            className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 lg:grid-cols-[160px_minmax(0,1fr)_160px_180px]"
            onSubmit={async (e) => {
              e.preventDefault();
              const r = await add.run(() => actions.addLedger(entry));
              if (r.ok) {
                setLabel("");
                setAmount(null);
              }
            }}
            data-testid="lot-ledger-form"
          >
            <SelectField<LedgerKind>
              label="Tipo"
              value={kind}
              options={(["INCASSO", "COSTO"] as const).map((k) => ({
                value: k,
                label: LEDGER_KIND_LABEL[k],
              }))}
              onChange={(v) => setKind((v || "INCASSO") as LedgerKind)}
              disabled={disabled}
            />
            <TextField
              label="Descrizione"
              value={label}
              onChange={setLabel}
              maxLength={200}
              placeholder="Es. versamento biglietti blocco A 1–50"
              disabled={disabled}
              testId="lot-ledger-label"
            />
            <MoneyField
              label="Importo"
              cents={amount}
              onChange={setAmount}
              disabled={disabled}
              testId="lot-ledger-amount"
            />
            <DateField
              label="Data"
              value={date}
              onChange={setDate}
              disabled={disabled}
            />
            <div className="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-4">
              <button
                type="submit"
                className={btnPrimary}
                disabled={
                  disabled ||
                  add.busy ||
                  !label ||
                  amount === null ||
                  issues.length > 0
                }
                data-testid="lot-ledger-add"
              >
                <Plus className="size-4" aria-hidden="true" /> Registra
              </button>
              <ResultLine result={add.result} />
            </div>
          </form>
          <IssueList errors={issues} />
          {live.length === 0 ? (
            <EmptyState title="Nessun movimento">
              Incassi della vendita, eventuali offerte e costi (stampa dei
              biglietti, premi acquistati, ritenuta).
            </EmptyState>
          ) : (
            <ul className="m-0 list-none p-0" data-testid="lot-ledger-list">
              {state.ledger.map((e) => (
                <li
                  key={e.id}
                  className={`flex flex-wrap items-center gap-3 border-t border-[var(--in-line)] py-2.5 ${e.cancelled ? "opacity-60" : ""}`}
                >
                  <HandCoins
                    className="size-4 flex-none text-[var(--in-info)]"
                    aria-hidden="true"
                  />
                  <span className="w-24 text-[14px] tabular-nums text-[var(--in-sub)]">
                    {shortDay(e.entryDate)}
                  </span>
                  <Chip tone={e.kind === "INCASSO" ? "ok" : "warn"}>
                    {LEDGER_KIND_LABEL[e.kind]}
                  </Chip>
                  <span
                    className={`min-w-0 flex-1 text-[15px] ${e.cancelled ? "line-through" : ""}`}
                  >
                    {e.label}
                  </span>
                  <b className="tabular-nums">
                    {e.kind === "COSTO" ? "−" : ""}
                    {formatEuro(e.amountCents)}
                  </b>
                  {e.cancelled ? (
                    <Chip tone="mute">Annullato</Chip>
                  ) : (
                    <button
                      type="button"
                      className={btnGhostDanger}
                      disabled={disabled || cancel.busy}
                      onClick={() =>
                        void cancel.run(() =>
                          actions.cancelLedger(e.id, "Annullato dalla pagina"),
                        )
                      }
                      aria-label={`Annulla movimento ${e.label}`}
                    >
                      <Ban className="size-4" aria-hidden="true" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          <ResultLine result={cancel.result} />
        </div>
      </Card>
    </div>
  );
}

function Box({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      className={`rounded-xl px-3 py-2.5 ${strong ? "bg-[var(--in-info)] text-white" : "bg-[#f4f8fd]"}`}
    >
      <dt
        className={`text-[12.5px] font-semibold uppercase tracking-wide ${strong ? "text-white/85" : "text-[var(--in-sub)]"}`}
      >
        {label}
      </dt>
      <dd className="m-0 font-title text-[26px] font-black tabular-nums">
        {value}
      </dd>
    </div>
  );
}
