import { Calculator, Plus, Save, Trash2, Wand2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Card, Chip } from "@/components/scd/interior-ui";
import {
  ALTERNATIVES,
  checkSeries,
  checkSetup,
  DRAW_ORDER_LABEL,
  formatEuro,
  KIND_LABEL,
  LOTTERY_KINDS,
  maxTicketsAt,
  seriesCount,
  suggestSeries,
  type DrawOrder,
  type LotteryKind,
  type LotterySetup,
  type SeriesRange,
} from "@/lib/lottery";

import type { LotteryActions } from "./store";
import {
  btnPrimary,
  btnSecondary,
  btnGhostDanger,
  DateField,
  IntField,
  IssueList,
  MoneyField,
  ResultLine,
  SelectField,
  TextField,
  inputCls,
  useAction,
} from "./ui";

export function SetupPanel({
  setup,
  series,
  locked,
  seriesLocked,
  actions,
  canWrite,
}: {
  setup: LotterySetup;
  series: SeriesRange[];
  /** The draw started: setup is read-only. */
  locked: boolean;
  /** Blocks assigned: numbering is read-only. */
  seriesLocked: boolean;
  actions: LotteryActions;
  canWrite: boolean;
}) {
  const [draft, setDraft] = useState<LotterySetup>(setup);
  useEffect(() => setDraft(setup), [setup]);
  const check = useMemo(() => checkSetup(draft, []), [draft]);
  const save = useAction();
  const set = <K extends keyof LotterySetup>(k: K, v: LotterySetup[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));
  const err = (f: string) => check.errors.find((e) => e.field === f)?.message;
  const disabled = locked || !canWrite;
  const pct =
    check.totalCents !== null && check.capCents
      ? Math.min(100, Math.round((check.totalCents * 100) / check.capCents))
      : null;
  const over =
    check.totalCents !== null &&
    check.capCents !== null &&
    check.totalCents > check.capCents;
  const maxAtPrice = draft.ticketPriceCents
    ? maxTicketsAt(draft.ticketPriceCents, draft.kind)
    : null;

  return (
    <div className="flex flex-col gap-[18px]">
      <Card
        id="lot-setup"
        title="1 · Impostazione"
        sub="Tipo, finalità, date, prezzo e quantità. I campi vuoti restano «da definire»: nulla è precompilato."
      >
        <form
          className="flex flex-col gap-4 px-4 pb-4 sm:px-[18px]"
          onSubmit={(e) => {
            e.preventDefault();
            void save.run(() => actions.saveSetup(draft));
          }}
        >
          <fieldset
            className="m-0 flex flex-col gap-2 border-0 p-0"
            disabled={disabled}
          >
            <legend className="mb-1 text-[14px] font-semibold text-[var(--in-ink)]">
              Tipo di manifestazione
            </legend>
            <div
              className="grid grid-cols-1 gap-2 sm:grid-cols-3"
              role="radiogroup"
            >
              {LOTTERY_KINDS.map((k) => (
                <label
                  key={k}
                  className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-[10px] border px-3 text-[15px] font-semibold ${draft.kind === k ? "border-[var(--in-info)] bg-[var(--in-info-bg)] text-[var(--in-info)]" : "border-[var(--in-line)] bg-white"}`}
                >
                  <input
                    type="radio"
                    name="lot-kind"
                    value={k}
                    checked={draft.kind === k}
                    onChange={() => set("kind", k as LotteryKind)}
                    className="size-4 accent-[var(--in-info)]"
                  />
                  {KIND_LABEL[k]}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <TextField
              label="Nome dell'iniziativa"
              value={draft.title}
              onChange={(v) => set("title", v)}
              maxLength={120}
              placeholder="Da definire"
              hint="Lo decide la Direzione."
              disabled={disabled}
              testId="lot-title"
            />
            <TextField
              label="A chi va il ricavato"
              value={draft.beneficiary}
              onChange={(v) => set("beneficiary", v)}
              maxLength={400}
              multiline
              error={err("beneficiary")}
              hint="Decisione della Direzione del 14/10/2026."
              disabled={disabled}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <DateField
              label="Inizio vendita"
              value={draft.saleFrom}
              onChange={(v) => set("saleFrom", v)}
              error={err("saleFrom")}
              disabled={disabled}
            />
            <DateField
              label="Fine vendita"
              value={draft.saleUntil}
              onChange={(v) => set("saleUntil", v)}
              error={err("saleUntil")}
              disabled={disabled}
            />
            <DateField
              label="Estrazione"
              value={draft.drawDate}
              onChange={(v) => set("drawDate", v)}
              error={err("drawDate")}
              hint="Le scadenze degli adempimenti si calcolano da qui."
              disabled={disabled}
              testId="lot-draw-date"
            />
            <TextField
              label="Ora dell'estrazione"
              value={draft.drawTime ?? ""}
              onChange={(v) => set("drawTime", v.trim() ? v.trim() : null)}
              placeholder="HH:MM"
              maxLength={5}
              error={err("drawTime")}
              disabled={disabled}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <TextField
              label="Luogo dell'estrazione"
              value={draft.drawPlace}
              onChange={(v) => set("drawPlace", v)}
              maxLength={200}
              disabled={disabled}
            />
            <TextField
              label="Comune dell'estrazione"
              value={draft.drawComune}
              onChange={(v) => set("drawComune", v)}
              maxLength={80}
              hint="Il suo Sindaco riceve la comunicazione tramite SUAP."
              disabled={disabled}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,240px)_minmax(0,1fr)]">
            <DateField
              label="Giornata dello sport"
              value={draft.sportDay}
              onChange={(v) => set("sportDay", v)}
              error={err("sportDay")}
              hint="Giornata dedicata a tutti gli sport che chiude l'iniziativa."
              disabled={disabled}
            />
            <TextField
              label="Luogo della giornata dello sport"
              value={draft.sportDayPlace}
              onChange={(v) => set("sportDayPlace", v)}
              maxLength={200}
              disabled={disabled}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <MoneyField
              label="Prezzo del biglietto"
              cents={draft.ticketPriceCents}
              onChange={(v) => set("ticketPriceCents", v)}
              error={err("ticketPriceCents")}
              disabled={disabled}
              testId="lot-price"
            />
            <IntField
              label="Biglietti emessi"
              value={draft.ticketsTotal}
              onChange={(v) => set("ticketsTotal", v)}
              error={err("ticketsTotal")}
              hint={
                maxAtPrice !== null
                  ? `A questo prezzo al massimo ${maxAtPrice.toLocaleString("it-IT")}.`
                  : undefined
              }
              disabled={disabled}
              testId="lot-quantity"
            />
            <MoneyField
              label="Obiettivo di raccolta (facoltativo)"
              cents={draft.goalCents}
              onChange={(v) => set("goalCents", v)}
              error={err("goalCents")}
              hint="Se vuoto, la pagina pubblica mostra solo il raccolto."
              disabled={disabled}
            />
          </div>

          <div
            className="rounded-xl border border-[var(--in-line)] bg-[#f7fbff] px-4 py-3"
            data-testid="lot-cap"
          >
            <p className="m-0 flex flex-wrap items-center gap-2 text-[15px] font-semibold">
              <Calculator
                className="size-4 text-[var(--in-info)]"
                aria-hidden="true"
              />
              Totale biglietti:{" "}
              {check.totalCents === null ? (
                <span className="text-[var(--in-sub)]">
                  da calcolare (servono prezzo e quantità)
                </span>
              ) : (
                <b>{formatEuro(check.totalCents)}</b>
              )}
              {check.capCents !== null && (
                <span className="text-[var(--in-sub)]">
                  · limite di legge {formatEuro(check.capCents)}
                </span>
              )}
              {over ? (
                <Chip tone="crit">Oltre il limite</Chip>
              ) : check.totalCents !== null && check.capCents !== null ? (
                <Chip tone="ok">Entro il limite</Chip>
              ) : null}
            </p>
            {pct !== null && (
              <div
                className="mt-2 h-2.5 overflow-hidden rounded-full bg-[#dfe9f5]"
                role="meter"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={pct}
                aria-label="Totale rispetto al limite di legge"
              >
                <div
                  className={`h-full rounded-full ${over ? "bg-[var(--in-crit)]" : "bg-[var(--in-info)]"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            )}
            {check.capCents === null && (
              <p className="m-0 mt-1 text-[13.5px] text-[var(--in-sub)]">
                Tombola: il limite è sul valore dei premi (scheda Premi).
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <TextField
              label="Dove si comprano i biglietti"
              value={draft.salePoints}
              onChange={(v) => set("salePoints", v)}
              maxLength={600}
              multiline
              hint="Solo vendita di persona: compare sulla pagina pubblica. Niente vendita online."
              disabled={disabled}
            />
            <TextField
              label="Dove sono esposti i premi"
              value={draft.prizesDisplayPlace}
              onChange={(v) => set("prizesDisplayPlace", v)}
              maxLength={200}
              multiline
              disabled={disabled}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <TextField
              label="Dove si ritirano i premi"
              value={draft.prizeDeliveryPlace}
              onChange={(v) => set("prizeDeliveryPlace", v)}
              maxLength={200}
              disabled={disabled}
            />
            <DateField
              label="Ritiro premi entro"
              value={draft.prizeDeliveryUntil}
              onChange={(v) => set("prizeDeliveryUntil", v)}
              error={err("prizeDeliveryUntil")}
              disabled={disabled}
            />
            <SelectField<DrawOrder>
              label="Ordine di estrazione"
              value={draft.drawOrder ?? ""}
              options={[
                { value: "", label: "Da definire" },
                ...(Object.keys(DRAW_ORDER_LABEL) as DrawOrder[]).map((o) => ({
                  value: o,
                  label: DRAW_ORDER_LABEL[o],
                })),
              ]}
              onChange={(v) => set("drawOrder", v === "" ? null : v)}
              disabled={disabled}
            />
          </div>

          <IssueList
            errors={check.errors}
            warnings={check.warnings}
            testId="lot-setup-issues"
          />
          {check.missing.length > 0 && (
            <p className="m-0 text-[14px] leading-snug text-[var(--in-sub)]">
              <b className="text-[var(--in-ink)]">Da definire:</b>{" "}
              {check.missing.join(", ")}.
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className={btnPrimary}
              disabled={disabled || save.busy || check.errors.length > 0}
              data-testid="lot-setup-save"
            >
              <Save className="size-4" aria-hidden="true" /> Salva impostazione
            </button>
            {locked && (
              <Chip tone="mute">Estrazione iniziata: sola lettura</Chip>
            )}
            <ResultLine result={save.result} />
          </div>
        </form>
      </Card>

      <SeriesCard
        series={series}
        ticketsTotal={setup.ticketsTotal}
        locked={seriesLocked || !canWrite}
        actions={actions}
      />

      <Card
        id="lot-alternatives"
        title="Lotteria, tombola o pesca?"
        sub="Per scegliere con la Direzione. Limiti da D.P.R. 430/2001: verificare con SUAP e commercialista."
      >
        <ul
          className="m-0 grid list-none grid-cols-1 gap-3 px-4 pb-4 sm:px-[18px] md:grid-cols-3"
          data-testid="lot-alternatives"
        >
          {ALTERNATIVES.map((a) => (
            <li
              key={a.kind}
              className={`rounded-xl border px-4 py-3 ${a.kind === draft.kind ? "border-[var(--in-info)] bg-[var(--in-info-bg)]" : "border-[var(--in-line)] bg-white"}`}
            >
              <p className="m-0 flex items-center justify-between gap-2 text-[16px] font-bold">
                {a.title}
                {a.kind === draft.kind && (
                  <Chip tone="info">Scelta attuale</Chip>
                )}
              </p>
              <ul className="m-0 mt-1.5 list-disc pl-5 text-[14px] leading-snug text-[var(--in-sub)]">
                {a.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function SeriesCard({
  series,
  ticketsTotal,
  locked,
  actions,
}: {
  series: SeriesRange[];
  ticketsTotal: number | null;
  locked: boolean;
  actions: LotteryActions;
}) {
  const [rows, setRows] = useState<SeriesRange[]>(series);
  const [perSeries, setPerSeries] = useState<number | null>(null);
  useEffect(() => setRows(series), [series]);
  const issues = checkSeries(rows, ticketsTotal);
  const sum = rows.reduce((a, s) => a + Math.max(0, seriesCount(s)), 0);
  const save = useAction();
  const upd = (i: number, patch: Partial<SeriesRange>) =>
    setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  return (
    <Card
      id="lot-series"
      title="Piano di numerazione"
      sub="Registri a matrice: ogni biglietto ha serie e numero progressivo. Si blocca quando il primo blocco viene assegnato."
    >
      <div className="flex flex-col gap-3 px-4 pb-4 sm:px-[18px]">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-full max-w-[220px]">
            <IntField
              label="Biglietti per serie"
              value={perSeries}
              onChange={setPerSeries}
              disabled={locked || ticketsTotal === null}
              hint={
                ticketsTotal === null
                  ? "Prima indica i biglietti emessi."
                  : undefined
              }
            />
          </div>
          <button
            type="button"
            className={btnSecondary}
            disabled={locked || ticketsTotal === null || !perSeries}
            onClick={() =>
              ticketsTotal &&
              perSeries &&
              setRows(suggestSeries(ticketsTotal, perSeries))
            }
            data-testid="lot-series-suggest"
          >
            <Wand2 className="size-4" aria-hidden="true" /> Proponi le serie
          </button>
        </div>
        {rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse text-[15px]">
              <caption className="sr-only">
                Serie e numeri dei biglietti
              </caption>
              <thead>
                <tr className="text-left text-[13px] uppercase tracking-wide text-[var(--in-sub)]">
                  <th scope="col" className="py-2 pr-2 font-semibold">
                    Serie
                  </th>
                  <th scope="col" className="py-2 pr-2 font-semibold">
                    Dal n.
                  </th>
                  <th scope="col" className="py-2 pr-2 font-semibold">
                    Al n.
                  </th>
                  <th scope="col" className="py-2 pr-2 font-semibold">
                    Biglietti
                  </th>
                  <th scope="col" className="py-2">
                    <span className="sr-only">Azioni</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="border-t border-[var(--in-line)]">
                    <td className="py-1.5 pr-2">
                      <input
                        aria-label={`Serie riga ${i + 1}`}
                        className={`${inputCls} w-20 uppercase`}
                        value={r.series}
                        maxLength={3}
                        onChange={(e) =>
                          upd(i, { series: e.target.value.toUpperCase() })
                        }
                        disabled={locked}
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input
                        aria-label={`Primo numero serie ${r.series}`}
                        type="number"
                        min={1}
                        className={`${inputCls} w-28`}
                        value={r.first}
                        onChange={(e) =>
                          upd(i, { first: Math.trunc(Number(e.target.value)) })
                        }
                        disabled={locked}
                      />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input
                        aria-label={`Ultimo numero serie ${r.series}`}
                        type="number"
                        min={1}
                        className={`${inputCls} w-28`}
                        value={r.last}
                        onChange={(e) =>
                          upd(i, { last: Math.trunc(Number(e.target.value)) })
                        }
                        disabled={locked}
                      />
                    </td>
                    <td className="py-1.5 pr-2 tabular-nums">
                      {Math.max(0, seriesCount(r)).toLocaleString("it-IT")}
                    </td>
                    <td className="py-1.5 text-right">
                      <button
                        type="button"
                        className={btnGhostDanger}
                        onClick={() =>
                          setRows((x) => x.filter((_, j) => j !== i))
                        }
                        disabled={locked}
                        aria-label={`Togli serie ${r.series}`}
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
        <p className="m-0 text-[14px] text-[var(--in-sub)]">
          Totale serie:{" "}
          <b className="text-[var(--in-ink)]">{sum.toLocaleString("it-IT")}</b>
          {ticketsTotal !== null
            ? ` su ${ticketsTotal.toLocaleString("it-IT")} biglietti emessi`
            : " (biglietti emessi da definire)"}
        </p>
        <IssueList errors={issues} />
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className={btnSecondary}
            disabled={locked}
            onClick={() =>
              setRows((r) => [...r, { series: "", first: 1, last: 1 }])
            }
          >
            <Plus className="size-4" aria-hidden="true" /> Aggiungi serie
          </button>
          <button
            type="button"
            className={btnPrimary}
            disabled={
              locked || save.busy || issues.length > 0 || rows.length === 0
            }
            onClick={() => void save.run(() => actions.saveSeries(rows))}
            data-testid="lot-series-save"
          >
            <Save className="size-4" aria-hidden="true" /> Salva numerazione
          </button>
          <ResultLine result={save.result} />
        </div>
      </div>
    </Card>
  );
}
