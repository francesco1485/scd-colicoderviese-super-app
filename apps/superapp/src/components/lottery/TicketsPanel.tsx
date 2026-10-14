import { Pencil, Plus, Save, Ticket, Trash2, X } from "lucide-react";
import { useState } from "react";

import { Card, Chip, type ChipTone } from "@/components/scd/interior-ui";
import { EmptyState } from "@/components/scd/work-area-ui";
import {
  BLOCK_STATUS_LABEL,
  checkBlock,
  formatEuro,
  formatRanges,
  parseRanges,
  rangeCount,
  reconcile,
  type BlockStatus,
  type LotteryState,
  type TicketBlock,
} from "@/lib/lottery";

import type { LotteryActions } from "./store";
import {
  btnGhostDanger,
  btnPrimary,
  btnSecondary,
  DateField,
  IntField,
  IssueList,
  MoneyField,
  ResultLine,
  SelectField,
  TextField,
  useAction,
} from "./ui";

const STATUS_TONE: Record<BlockStatus, ChipTone> = {
  ASSEGNATO: "warn",
  RESTITUITO: "ok",
  NON_RESTITUITO: "crit",
};

export function TicketsPanel({
  state,
  today,
  locked,
  actions,
  canWrite,
}: {
  state: LotteryState;
  today: string;
  locked: boolean;
  actions: LotteryActions;
  canWrite: boolean;
}) {
  const [editing, setEditing] = useState<{
    block: TicketBlock;
    isNew: boolean;
  } | null>(null);
  const rec = reconcile(
    state.series,
    state.blocks,
    state.setup.ticketPriceCents,
  );
  const remove = useAction();
  const disabled = locked || !canWrite || !state.id;
  const first = state.series[0];
  const blank = (): TicketBlock => ({
    id: "",
    series: first?.series ?? "",
    from: first?.first ?? 1,
    to: first?.first ?? 1,
    seller: "",
    sellerAdultConfirmed: false,
    assignedOn: today,
    status: "ASSEGNATO",
    unsold: [],
    collectedCents: null,
    note: "",
  });

  return (
    <div className="flex flex-col gap-[18px]">
      <Card
        id="lot-tickets"
        title="5 · Registro biglietti"
        sub="Blocchi di biglietti affidati allo staff (solo adulti). Al rientro: venduti, invenduti e soldi consegnati. Nessun dato di minori."
        aside={
          <button
            type="button"
            className={btnPrimary}
            disabled={disabled || state.series.length === 0}
            onClick={() => setEditing({ block: blank(), isNew: true })}
            data-testid="lot-block-add"
          >
            <Plus className="size-4" aria-hidden="true" /> Assegna un blocco
          </button>
        }
      >
        <div className="flex flex-col gap-3 px-4 pb-4 sm:px-[18px]">
          {state.series.length === 0 && (
            <EmptyState title="Manca il piano di numerazione">
              Salva serie e numeri nella scheda Impostazione: i blocchi si
              assegnano dentro le serie.
            </EmptyState>
          )}
          {editing && (
            <BlockForm
              key={editing.block.id || "new"}
              initial={editing.block}
              isNew={editing.isNew}
              state={state}
              actions={actions}
              onClose={() => setEditing(null)}
            />
          )}
          {state.blocks.length === 0 && state.series.length > 0 && !editing && (
            <EmptyState title="Nessun blocco assegnato">
              Quando un blocco esce dalla sede, registralo qui con il nome di
              chi lo vende.
            </EmptyState>
          )}
          {state.blocks.length > 0 && (
            <div className="overflow-x-auto">
              <table
                className="w-full min-w-[640px] border-collapse text-[15px]"
                data-testid="lot-block-table"
              >
                <caption className="sr-only">
                  Blocchi di biglietti assegnati
                </caption>
                <thead>
                  <tr className="text-left text-[13px] uppercase tracking-wide text-[var(--in-sub)]">
                    <th scope="col" className="py-2 pr-3 font-semibold">
                      Blocco
                    </th>
                    <th scope="col" className="py-2 pr-3 font-semibold">
                      Venditore
                    </th>
                    <th scope="col" className="py-2 pr-3 font-semibold">
                      Stato
                    </th>
                    <th scope="col" className="py-2 pr-3 font-semibold">
                      Invenduti
                    </th>
                    <th scope="col" className="py-2 pr-3 font-semibold">
                      Consegnato
                    </th>
                    <th scope="col" className="py-2">
                      <span className="sr-only">Azioni</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[...state.blocks]
                    .sort(
                      (a, b) =>
                        a.series.localeCompare(b.series) || a.from - b.from,
                    )
                    .map((b) => (
                      <tr
                        key={b.id}
                        className="border-t border-[var(--in-line)] align-top"
                      >
                        <td className="py-2 pr-3 font-semibold tabular-nums">
                          {b.series} {b.from}–{b.to}{" "}
                          <span className="block text-[13px] font-normal text-[var(--in-sub)]">
                            {rangeCount(b)} biglietti
                          </span>
                        </td>
                        <td className="py-2 pr-3">{b.seller}</td>
                        <td className="py-2 pr-3">
                          <Chip tone={STATUS_TONE[b.status]}>
                            {BLOCK_STATUS_LABEL[b.status]}
                          </Chip>
                        </td>
                        <td className="py-2 pr-3 tabular-nums">
                          {b.unsold.length ? formatRanges(b.unsold) : "—"}
                        </td>
                        <td className="py-2 pr-3 tabular-nums">
                          {b.collectedCents === null
                            ? "—"
                            : formatEuro(b.collectedCents)}
                        </td>
                        <td className="py-2 text-right whitespace-nowrap">
                          <button
                            type="button"
                            className={btnSecondary}
                            disabled={disabled}
                            onClick={() =>
                              setEditing({ block: b, isNew: false })
                            }
                            aria-label={`Aggiorna blocco ${b.series} ${b.from}-${b.to}`}
                          >
                            <Pencil className="size-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className={btnGhostDanger}
                            disabled={disabled || remove.busy}
                            onClick={() =>
                              void remove.run(() => actions.removeBlock(b.id))
                            }
                            aria-label={`Togli blocco ${b.series} ${b.from}-${b.to}`}
                          >
                            <Trash2 className="size-4" aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
          <ResultLine result={remove.result} />
        </div>
      </Card>

      <Card
        id="lot-reconcile"
        title="Riconciliazione prima dell'estrazione"
        sub="Tutti i registri tornano in sede prima di estrarre. I biglietti dei blocchi non restituiti sono nulli e si annunciano prima dell'estrazione."
        aside={
          rec.readyForDraw ? (
            <Chip tone="ok">Pronti per l'estrazione</Chip>
          ) : (
            <Chip tone="warn">
              {rec.stillOutBlocks
                ? `${rec.stillOutBlocks} blocchi ancora fuori`
                : "Nessun blocco registrato"}
            </Chip>
          )
        }
      >
        <dl
          className="m-0 grid grid-cols-2 gap-3 px-4 pb-3 sm:grid-cols-3 lg:grid-cols-6 sm:px-[18px]"
          data-testid="lot-reconcile"
        >
          <Num label="Emessi" value={rec.issued} />
          <Num label="Venduti" value={rec.sold} />
          <Num label="Invenduti resi" value={rec.returnedUnsold} />
          <Num label="Mai consegnati" value={rec.notAssigned} />
          <Num label="Ancora fuori" value={rec.stillOut} />
          <Num
            label="Nulli"
            value={rec.voidCount}
            tone={rec.voidCount ? "crit" : undefined}
          />
        </dl>
        <p className="m-0 px-4 pb-3 text-[14.5px] leading-snug sm:px-[18px]">
          Atteso dai venduti:{" "}
          <b>
            {rec.expectedCents === null
              ? "prezzo da definire"
              : formatEuro(rec.expectedCents)}
          </b>{" "}
          · consegnato: <b>{formatEuro(rec.collectedCents)}</b>
          {rec.differenceCents !== null && rec.differenceCents !== 0 && (
            <Chip
              tone={rec.differenceCents < 0 ? "crit" : "warn"}
              className="ml-2"
            >
              {rec.differenceCents < 0
                ? `Mancano ${formatEuro(-rec.differenceCents)}`
                : `In più ${formatEuro(rec.differenceCents)}`}
            </Chip>
          )}
        </p>
        <div className="border-t border-[var(--in-line)] px-4 py-3 sm:px-[18px]">
          <p className="m-0 text-[15px] font-bold">
            Biglietti nulli da annunciare
          </p>
          {rec.voidBlocks.length === 0 ? (
            <p className="m-0 mt-1 text-[14.5px] text-[var(--in-sub)]">
              Nessuno: segna «Non restituito» i blocchi che non rientrano entro
              l'estrazione.
            </p>
          ) : (
            <ul
              className="m-0 mt-1 list-disc pl-6 text-[14.5px] tabular-nums"
              data-testid="lot-void-list"
            >
              {rec.voidBlocks.map((v) => (
                <li key={`${v.series}-${v.from}`}>
                  Serie {v.series}, dal n. {v.from} al n. {v.to} ({v.count}{" "}
                  biglietti)
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
}

function Num({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "crit" | undefined;
}) {
  return (
    <div className="rounded-xl bg-[#f4f8fd] px-3 py-2.5">
      <dt className="text-[12.5px] font-semibold uppercase tracking-wide text-[var(--in-sub)]">
        {label}
      </dt>
      <dd
        className={`m-0 font-title text-[24px] font-black tabular-nums ${tone === "crit" ? "text-[var(--in-crit)]" : "text-[var(--in-ink)]"}`}
      >
        {value.toLocaleString("it-IT")}
      </dd>
    </div>
  );
}

function BlockForm({
  initial,
  isNew,
  state,
  actions,
  onClose,
}: {
  initial: TicketBlock;
  isNew: boolean;
  state: LotteryState;
  actions: LotteryActions;
  onClose: () => void;
}) {
  const [b, setB] = useState<TicketBlock>(initial);
  const [unsoldText, setUnsoldText] = useState(formatRanges(initial.unsold));
  const save = useAction();
  const parsed = parseRanges(unsoldText);
  const candidate: TicketBlock = {
    ...b,
    unsold: b.status === "RESTITUITO" ? (parsed ?? []) : [],
  };
  const issues = checkBlock(
    isNew ? { ...candidate, id: "__new__" } : candidate,
    state.series,
    state.blocks,
  );
  const errors =
    parsed === null
      ? [
          ...issues,
          {
            field: "unsold",
            message:
              "Invenduti: scrivi numeri o intervalli separati da virgola (es. 12-15, 20).",
          },
        ]
      : issues;
  return (
    <form
      className="flex flex-col gap-3 rounded-xl border border-[var(--in-info)] bg-[#f7fbff] p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await save.run(() => actions.saveBlock(candidate, isNew));
        if (r.ok) onClose();
      }}
      data-testid="lot-block-form"
    >
      <p className="m-0 flex items-center gap-2 text-[16px] font-bold">
        <Ticket className="size-4 text-[var(--in-info)]" aria-hidden="true" />{" "}
        {isNew
          ? "Assegna un blocco"
          : `Blocco ${initial.series} ${initial.from}–${initial.to}`}
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SelectField<string>
          label="Serie"
          value={b.series}
          options={state.series.map((s) => ({
            value: s.series,
            label: `${s.series} (${s.first}–${s.last})`,
          }))}
          onChange={(v) => setB({ ...b, series: v })}
        />
        <IntField
          label="Dal n."
          value={b.from}
          onChange={(v) => setB({ ...b, from: v ?? 0 })}
        />
        <IntField
          label="Al n."
          value={b.to}
          onChange={(v) => setB({ ...b, to: v ?? 0 })}
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_200px]">
        <TextField
          label="Affidato a (staff maggiorenne)"
          value={b.seller}
          onChange={(v) => setB({ ...b, seller: v })}
          maxLength={80}
          hint="Nome e cognome di un adulto dello staff. Mai minori."
          testId="lot-block-seller"
        />
        <DateField
          label="Consegnato il"
          value={b.assignedOn}
          onChange={(v) => setB({ ...b, assignedOn: v })}
        />
      </div>
      <label className="flex min-h-11 items-center gap-2 text-[15px] font-semibold">
        <input
          type="checkbox"
          className="size-5 accent-[var(--in-info)]"
          checked={b.sellerAdultConfirmed}
          onChange={(e) =>
            setB({ ...b, sellerAdultConfirmed: e.target.checked })
          }
          data-testid="lot-block-adult"
        />
        Confermo che chi vende è maggiorenne e fa parte dello staff della
        società
      </label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SelectField<BlockStatus>
          label="Stato"
          value={b.status}
          options={(Object.keys(BLOCK_STATUS_LABEL) as BlockStatus[]).map(
            (s) => ({ value: s, label: BLOCK_STATUS_LABEL[s] }),
          )}
          onChange={(v) =>
            setB({ ...b, status: (v || "ASSEGNATO") as BlockStatus })
          }
        />
        <TextField
          label="Invenduti restituiti"
          value={unsoldText}
          onChange={setUnsoldText}
          placeholder="es. 41-50, 37"
          disabled={b.status !== "RESTITUITO"}
          hint={
            b.status === "RESTITUITO"
              ? "Numeri del blocco tornati non venduti."
              : "Solo per blocchi restituiti."
          }
        />
        <MoneyField
          label="Soldi consegnati"
          cents={b.collectedCents}
          onChange={(v) => setB({ ...b, collectedCents: v })}
          hint="Registrazione manuale: l'app non incassa."
        />
      </div>
      <TextField
        label="Nota"
        value={b.note}
        onChange={(v) => setB({ ...b, note: v })}
        maxLength={300}
      />
      <IssueList errors={errors} />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          className={btnPrimary}
          disabled={save.busy || errors.length > 0}
          data-testid="lot-block-save"
        >
          <Save className="size-4" aria-hidden="true" /> Salva blocco
        </button>
        <button type="button" className={btnSecondary} onClick={onClose}>
          <X className="size-4" aria-hidden="true" /> Annulla
        </button>
        <ResultLine result={save.result} />
      </div>
    </form>
  );
}
