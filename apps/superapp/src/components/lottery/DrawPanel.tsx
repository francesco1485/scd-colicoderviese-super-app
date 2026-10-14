import { BadgeCheck, CircleSlash, Dices, Undo2 } from "lucide-react";
import { useState } from "react";

import { Card, Chip } from "@/components/scd/interior-ui";
import { EmptyState } from "@/components/scd/work-area-ui";
import {
  buildVerbale,
  drawComplete,
  proposeDraw,
  reconcile,
  remainingPrizes,
  shortDay,
  TICKET_STATE_LABEL,
  winners,
  type LotteryState,
} from "@/lib/lottery";

import { DraftDocument } from "./DraftDocument";
import type { LotteryActions } from "./store";
import {
  btnAction,
  btnPrimary,
  btnSecondary,
  IntField,
  ResultLine,
  SelectField,
  useAction,
} from "./ui";

export function DrawPanel({
  state,
  today,
  actions,
  canWrite,
  isDirezione,
}: {
  state: LotteryState;
  today: string;
  actions: LotteryActions;
  canWrite: boolean;
  isDirezione: boolean;
}) {
  const [series, setSeries] = useState(state.series[0]?.series ?? "");
  const [number, setNumber] = useState<number | null>(null);
  const rec = reconcile(
    state.series,
    state.blocks,
    state.setup.ticketPriceCents,
  );
  const run = useAction();
  const confirm = useAction();
  const closed = !!state.winnersConfirmedOn;
  const proposal =
    series && number
      ? proposeDraw(
          state.series,
          state.blocks,
          state.prizes,
          state.draws,
          state.setup.drawOrder,
          series,
          number,
        )
      : null;
  const left = remainingPrizes(
    state.prizes,
    state.draws,
    state.setup.drawOrder,
  );
  const complete = drawComplete(state.prizes, state.draws);
  const list = winners(state.prizes, state.draws);
  const canDraw =
    canWrite &&
    !!state.id &&
    rec.readyForDraw &&
    state.prizes.length > 0 &&
    !closed;

  return (
    <div className="flex flex-col gap-[18px]">
      <Card
        id="lot-draw"
        title="6 · Estrazione"
        sub="Si registra in ordine ciò che viene estratto, alla presenza dell'incaricato del Sindaco. Un biglietto nullo o invenduto non vince: si ripete."
        aside={
          closed ? (
            <Chip tone="ok">
              Vincitori confermati il {shortDay(state.winnersConfirmedOn)}
            </Chip>
          ) : complete ? (
            <Chip tone="info">Tutti i premi estratti</Chip>
          ) : (
            <Chip tone="mute">{left.length} premi da estrarre</Chip>
          )
        }
      >
        <div className="flex flex-col gap-3 px-4 pb-4 sm:px-[18px]">
          {!rec.readyForDraw && (
            <EmptyState title="Prima la riconciliazione">
              {rec.stillOutBlocks > 0
                ? `${rec.stillOutBlocks} blocchi risultano ancora fuori: segnali come restituiti o non restituiti nella scheda Biglietti.`
                : "Registra i blocchi assegnati nella scheda Biglietti."}
            </EmptyState>
          )}
          {state.prizes.length === 0 && (
            <EmptyState title="Nessun premio">
              Inserisci i premi prima di estrarre.
            </EmptyState>
          )}
          {canDraw && (
            <form
              className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[160px_200px_auto]"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!series || !number) return;
                const r = await run.run(() =>
                  actions.recordDraw(series, number),
                );
                if (r.ok) setNumber(null);
              }}
              data-testid="lot-draw-form"
            >
              <SelectField<string>
                label="Serie estratta"
                value={series}
                options={state.series.map((s) => ({
                  value: s.series,
                  label: s.series,
                }))}
                onChange={(v) => setSeries(v)}
              />
              <IntField
                label="Numero estratto"
                value={number}
                onChange={setNumber}
                testId="lot-draw-number"
              />
              <button
                type="submit"
                className={btnPrimary}
                disabled={!series || !number || run.busy}
                data-testid="lot-draw-record"
              >
                <Dices className="size-4" aria-hidden="true" /> Registra
              </button>
            </form>
          )}
          {canDraw && proposal && (
            <p
              className={`m-0 rounded-xl px-4 py-3 text-[15px] font-semibold ${proposal.state === "VALIDO" && !proposal.duplicate ? "bg-[var(--in-ok-bg)] text-[var(--in-ok)]" : "bg-[var(--in-warn-bg)] text-[var(--in-warn)]"}`}
              data-testid="lot-draw-proposal"
            >
              {proposal.duplicate
                ? "Biglietto già estratto."
                : TICKET_STATE_LABEL[proposal.state]}
              {proposal.prize &&
                ` → ${proposal.prize.rank}° premio: ${proposal.prize.description}`}
            </p>
          )}
          <ResultLine result={run.result} />

          {state.draws.length > 0 && (
            <div className="overflow-x-auto">
              <table
                className="w-full min-w-[520px] border-collapse text-[15px]"
                data-testid="lot-draw-table"
              >
                <caption className="sr-only">
                  Biglietti estratti in ordine
                </caption>
                <thead>
                  <tr className="text-left text-[13px] uppercase tracking-wide text-[var(--in-sub)]">
                    <th scope="col" className="py-2 pr-3 font-semibold">
                      #
                    </th>
                    <th scope="col" className="py-2 pr-3 font-semibold">
                      Biglietto
                    </th>
                    <th scope="col" className="py-2 pr-3 font-semibold">
                      Esito
                    </th>
                    <th scope="col" className="py-2 font-semibold">
                      Premio
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {state.draws.map((d) => {
                    const p = state.prizes.find((x) => x.id === d.prizeId);
                    return (
                      <tr
                        key={d.id}
                        className="border-t border-[var(--in-line)]"
                      >
                        <td className="py-2 pr-3 tabular-nums">{d.order}</td>
                        <td className="py-2 pr-3 font-semibold tabular-nums">
                          {d.series} {d.number}
                        </td>
                        <td className="py-2 pr-3">
                          {d.state === "VALIDO" ? (
                            <Chip tone="ok">
                              <BadgeCheck
                                className="size-3.5"
                                aria-hidden="true"
                              />
                              Vince
                            </Chip>
                          ) : (
                            <Chip tone="warn">
                              <CircleSlash
                                className="size-3.5"
                                aria-hidden="true"
                              />
                              {d.state === "NULLO"
                                ? "Nullo"
                                : d.state === "INVENDUTO"
                                  ? "Invenduto"
                                  : "Non valido"}
                            </Chip>
                          )}
                        </td>
                        <td className="py-2">
                          {p ? `${p.rank}° · ${p.description}` : "si ripete"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {state.draws.length > 0 && !closed && canWrite && (
            <div>
              <button
                type="button"
                className={btnSecondary}
                disabled={run.busy}
                onClick={() => void run.run(() => actions.undoDraw())}
                data-testid="lot-draw-undo"
              >
                <Undo2 className="size-4" aria-hidden="true" /> Annulla l'ultima
                registrazione
              </button>
            </div>
          )}
        </div>
      </Card>

      <Card
        id="lot-winners"
        title="Numeri vincenti"
        sub="Diventano pubblici solo quando la Direzione li conferma, dopo il controllo del verbale."
        aside={
          closed ? (
            <Chip tone="ok">Pubblici</Chip>
          ) : (
            <Chip tone="mute">Non pubblici</Chip>
          )
        }
      >
        <div className="flex flex-col gap-3 px-4 pb-4 sm:px-[18px]">
          {list.length === 0 ? (
            <p className="m-0 text-[14.5px] text-[var(--in-sub)]">
              Nessun numero vincente registrato.
            </p>
          ) : (
            <ol className="m-0 list-none p-0" data-testid="lot-winners-list">
              {list.map((w) => (
                <li
                  key={`${w.series}-${w.number}`}
                  className="flex flex-wrap items-baseline gap-x-3 border-t border-[var(--in-line)] py-2 first:border-t-0"
                >
                  <b className="w-12 font-title text-[18px]">{w.rank}°</b>
                  <span className="font-title text-[20px] font-black tabular-nums">
                    {w.series} {w.number}
                  </span>
                  <span className="text-[14.5px] text-[var(--in-sub)]">
                    {w.prize}
                  </span>
                </li>
              ))}
            </ol>
          )}
          {!closed && (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className={btnAction}
                disabled={!isDirezione || !complete || confirm.busy}
                onClick={() =>
                  void confirm.run(() => actions.confirmWinners(today))
                }
                data-testid="lot-confirm-winners"
              >
                <BadgeCheck className="size-4" aria-hidden="true" /> Conferma e
                pubblica i numeri vincenti
              </button>
              {!isDirezione && (
                <span className="text-[14px] text-[var(--in-sub)]">
                  Solo la Direzione conferma.
                </span>
              )}
              <ResultLine result={confirm.result} />
            </div>
          )}
        </div>
      </Card>

      <Card
        id="lot-verbale"
        title="Verbale di estrazione e chiusura (bozza)"
        sub="Con gli spazi per la firma dell'incaricato del Sindaco. Va controllato, firmato e inviato a Prefetto e SUAP: l'app non invia nulla."
      >
        <div className="px-4 pb-4 sm:px-[18px]">
          <DraftDocument
            markdown={buildVerbale(state)}
            fileName="verbale-estrazione-bozza.md"
            title="Verbale di estrazione — bozza"
            testId="lot-verbale-doc"
          />
        </div>
      </Card>
    </div>
  );
}
