import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Download, FileText, RefreshCw, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";

import {
  CONTABILITA_PAGES,
  ContabilitaNav,
  Figure,
  MonthSwitch,
  contabilitaHead,
  signedEuro,
} from "@/components/scd/contabilita";
import { Card, Chip, type ChipTone } from "@/components/scd/interior-ui";
import {
  EmptyState,
  SourcesBox,
  WorkAreaGateView,
  WorkAreaShell,
} from "@/components/scd/work-area-ui";
import { euro, itDay } from "@/lib/fees";
import { MATCH_LABEL, type MatchState } from "@/lib/ledger";
import { getLedgerBoard, type LedgerData } from "@/lib/ledger.functions";
import {
  ACCOUNT_LABEL,
  CASH_LIMIT,
  CENTER_LABEL,
  COST_CENTERS,
  EMPTY_FILTER,
  NATURE_LABEL,
  buildPrimaNota,
  cashSplitDays,
  isCashMovement,
  filterRows,
  monthTotals,
  monthsOf,
  primaNotaCsv,
  type AccountId,
  type Confidence,
  type CostCenter,
  type Nature,
  type PrimaNotaFilter,
  type PrimaNotaRow,
} from "@/lib/prima-nota";
import { getWorkAreaGate } from "@/lib/work-areas.functions";

const PATH = "/tesoreria/prima-nota";
const DESCRIPTION =
  "Prima nota della società (ASD, regime 398/91): registro cronologico dei movimenti con saldo calcolato, centro di costo e natura proposti. Riservato.";

function validateSearch(raw: Record<string, unknown>): { mese?: string } {
  return typeof raw["mese"] === "string" &&
    /^\d{4}-(0[1-9]|1[0-2])$/.test(raw["mese"])
    ? { mese: raw["mese"] }
    : {};
}

/** Prima nota (Direzione 13/10): built on the ledger rows of /tesoreria/movimenti. Direzione and Tesoreria only. */
export const Route = createFileRoute("/tesoreria_/prima-nota")({
  validateSearch,
  loader: async () => {
    const gate = await getWorkAreaGate({ data: { area: "movimenti" } });
    const data: LedgerData =
      gate.view === "page"
        ? await getLedgerBoard()
        : { connected: false, board: null, error: null };
    return { gate, interior: gate.view === "page", data };
  },
  head: ({ loaderData }) =>
    contabilitaHead("Prima nota", DESCRIPTION, loaderData?.gate),
  component: PrimaNotaRoute,
});

function PrimaNotaRoute() {
  const d = Route.useLoaderData();
  const search = Route.useSearch();
  return (
    <WorkAreaGateView id="movimenti" gate={d.gate}>
      {d.interior && (
        <PrimaNotaPage
          initial={d.data}
          preview={d.gate.preview}
          month={search.mese ?? null}
        />
      )}
    </WorkAreaGateView>
  );
}

const NATURE_TONE: Readonly<Record<Nature, ChipTone>> = {
  istituzionale: "info",
  commerciale: "warn",
  neutro: "mute",
  "da-classificare": "crit",
};
const CONF_TONE: Readonly<Record<Confidence, string>> = {
  alta: "text-[var(--in-ok)]",
  media: "text-[var(--in-sub)]",
  bassa: "text-[var(--in-crit)]",
};
const STATE_TONE: Readonly<Record<MatchState, ChipTone>> = {
  DA_ABBINARE: "warn",
  PROPOSTO: "info",
  VERIFICATO: "ok",
  NON_APPLICABILE: "mute",
};
const btnGhost =
  "scd-focus inline-flex h-11 items-center justify-center gap-2 rounded-[10px] border border-[var(--in-line)] bg-white px-4 text-[15px] font-semibold disabled:opacity-50";
const btnMain =
  "scd-focus inline-flex h-11 items-center justify-center gap-2 rounded-[10px] bg-[#F8D000] px-4 text-[15px] font-bold text-[#062a52] disabled:opacity-50";
const selectCls =
  "scd-focus h-11 w-full min-w-0 rounded-[10px] border border-[var(--in-line)] bg-white px-3 text-[15px]";

function PrimaNotaPage({
  initial,
  preview,
  month: askedMonth,
}: {
  initial: LedgerData;
  preview: boolean;
  month: string | null;
}) {
  const [data, setData] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] =
    useState<Omit<PrimaNotaFilter, "month">>(EMPTY_FILTER);
  const reload = useServerFn(getLedgerBoard);
  const navigate = useNavigate();
  const entries = data.board?.entries;
  const built = useMemo(() => buildPrimaNota(entries ?? []), [entries]);
  const months = useMemo(() => monthsOf(built.rows), [built.rows]);
  const month =
    askedMonth && months.includes(askedMonth)
      ? askedMonth
      : (months[months.length - 1] ?? null);
  const totals = useMemo(
    () => (month ? monthTotals(built.rows, month) : null),
    [built.rows, month],
  );
  const monthRows = useMemo(
    () => (month ? filterRows(built.rows, { ...EMPTY_FILTER, month }) : []),
    [built.rows, month],
  );
  const shown = useMemo(
    () => (month ? filterRows(built.rows, { ...filter, month }) : []),
    [built.rows, filter, month],
  );
  const accounts = useMemo(
    () => [...new Set(built.rows.map((r) => r.account))],
    [built.rows],
  );
  const splitDays = useMemo(
    () =>
      new Set(cashSplitDays(monthRows.map((r) => r.entry)).map((d) => d.day)),
    [monthRows],
  );
  const centers = useMemo(
    () =>
      COST_CENTERS.filter((c) =>
        monthRows.some((r) => r.proposal.center === c),
      ),
    [monthRows],
  );
  const filtered =
    filter.account !== "tutti" ||
    filter.direction !== "tutti" ||
    filter.nature !== "tutti" ||
    filter.center !== "tutti" ||
    filter.toReconcile;

  async function refresh() {
    setBusy(true);
    try {
      setData(await reload());
    } catch {
      /* keep */
    } finally {
      setBusy(false);
    }
  }

  function exportCsv() {
    if (!month) return;
    const blob = new Blob([primaNotaCsv(monthRows)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SCD_prima-nota_${month}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <WorkAreaShell
      id="movimenti"
      path={PATH}
      title="Prima nota"
      preview={preview}
      highlights={[
        {
          value: totals ? totals.movements : null,
          label: "movimenti del mese",
        },
        { value: totals ? totals.toReconcile : null, label: "da riconciliare" },
        {
          value: totals ? totals.cashFlags + splitDays.size : null,
          label: `contanti da ${CASH_LIMIT.toLocaleString("it-IT")} € in su`,
        },
        {
          value: totals ? totals.lowConfidence : null,
          label: "classificazioni da confermare",
        },
      ]}
      note={
        <>
          Saldo calcolato, mai scritto a mano; centro e natura <b>proposti</b>.
        </>
      }
    >
      <ContabilitaNav current="prima-nota" />
      {!data.connected ? (
        <EmptyState title="Accesso non attivo">
          Entra con il tuo account della società per vedere la prima nota.
        </EmptyState>
      ) : data.error ? (
        <EmptyState
          title="Dati non disponibili"
          action={
            <button
              type="button"
              className={btnGhost}
              onClick={() => void refresh()}
            >
              Riprova
            </button>
          }
        >
          {data.error}
        </EmptyState>
      ) : !data.board ? (
        <EmptyState title="Area riservata">
          La prima nota è visibile a Direzione e Tesoreria.
        </EmptyState>
      ) : !month || !totals ? (
        <EmptyState title="Nessun movimento">
          Il registro del conto è vuoto: i movimenti arrivano con l'estratto
          caricato da Direzione o Tesoreria.
        </EmptyState>
      ) : (
        <>
          <Card
            id="pn-quadro"
            title="Quadro del mese"
            sub={
              <>
                Saldo iniziale e finale calcolati dai movimenti.{" "}
                {totals.mismatches === 0 ? (
                  "Il saldo calcolato coincide con l'estratto."
                ) : (
                  <b className="text-[var(--in-crit)]">
                    {totals.mismatches} saldi diversi dall'estratto:
                    controllare.
                  </b>
                )}
              </>
            }
            aside={
              <>
                <MonthSwitch
                  month={month}
                  months={months}
                  onChange={(m) =>
                    void navigate({
                      to: PATH as never,
                      search: { mese: m } as never,
                      replace: true,
                    })
                  }
                />
                <button
                  type="button"
                  onClick={() => void refresh()}
                  disabled={busy}
                  className={btnGhost}
                  aria-label="Ricarica i movimenti"
                >
                  <RefreshCw
                    className={`size-4 ${busy ? "animate-spin" : ""}`}
                    aria-hidden="true"
                  />
                </button>
              </>
            }
          >
            <div
              className="grid grid-cols-2 gap-2 px-4 pb-4 sm:grid-cols-3 sm:px-[18px] xl:grid-cols-6"
              data-testid="pn-totals"
            >
              <Figure
                label="Saldo iniziale"
                value={euro(totals.opening)}
                tone="mute"
              />
              <Figure label="Entrate" value={euro(totals.incoming)} tone="ok" />
              <Figure label="Uscite" value={euro(totals.outgoing)} />
              <Figure label="Commissioni" value={euro(totals.fees)} />
              <Figure
                label="Saldo finale"
                value={euro(totals.closing)}
                tone="mute"
              />
              <Figure
                label="Entrate commerciali (proposte)"
                value={euro(totals.commercialIn)}
                tone="warn"
                hint={`istituzionali ${euro(totals.institutionalIn)}`}
              />
            </div>
          </Card>

          <div className="flex min-w-0 flex-col gap-[18px]">
            <div className="flex min-w-0 flex-col gap-[18px]">
              <Card
                id="pn-registro"
                title="Registro"
                sub={`${shown.length} movimenti mostrati su ${monthRows.length} del mese, in ordine di data.`}
                aside={
                  <button
                    type="button"
                    onClick={exportCsv}
                    className={btnMain}
                    data-testid="pn-csv"
                  >
                    <Download className="size-4" aria-hidden="true" />
                    CSV del mese
                  </button>
                }
              >
                <div
                  className="grid grid-cols-2 gap-2 px-4 pb-3 sm:grid-cols-4 sm:px-[18px]"
                  role="group"
                  aria-label="Filtri della prima nota"
                >
                  <label className="flex min-w-0 flex-col gap-1 text-[13px] text-[var(--in-sub)]">
                    Conto
                    <select
                      className={selectCls}
                      value={filter.account}
                      onChange={(ev) =>
                        setFilter({
                          ...filter,
                          account: ev.target.value as AccountId | "tutti",
                        })
                      }
                    >
                      <option value="tutti">Tutti i conti</option>
                      {(["sumup", "banca", "cassa"] as const).map((a) => (
                        <option
                          key={a}
                          value={a}
                          disabled={!accounts.includes(a)}
                        >
                          {ACCOUNT_LABEL[a]}
                          {accounts.includes(a) ? "" : " (non collegato)"}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex min-w-0 flex-col gap-1 text-[13px] text-[var(--in-sub)]">
                    Movimento
                    <select
                      className={selectCls}
                      value={filter.direction}
                      onChange={(ev) =>
                        setFilter({
                          ...filter,
                          direction: ev.target
                            .value as PrimaNotaFilter["direction"],
                        })
                      }
                    >
                      <option value="tutti">Entrate e uscite</option>
                      <option value="entrata">Solo entrate</option>
                      <option value="uscita">Solo uscite</option>
                    </select>
                  </label>
                  <label className="flex min-w-0 flex-col gap-1 text-[13px] text-[var(--in-sub)]">
                    Natura (proposta)
                    <select
                      className={selectCls}
                      value={filter.nature}
                      onChange={(ev) =>
                        setFilter({
                          ...filter,
                          nature: ev.target.value as Nature | "tutti",
                        })
                      }
                    >
                      <option value="tutti">Tutte</option>
                      {(Object.keys(NATURE_LABEL) as Nature[]).map((n) => (
                        <option key={n} value={n}>
                          {NATURE_LABEL[n]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex min-w-0 flex-col gap-1 text-[13px] text-[var(--in-sub)]">
                    Centro di costo
                    <select
                      className={selectCls}
                      value={filter.center}
                      onChange={(ev) =>
                        setFilter({
                          ...filter,
                          center: ev.target.value as CostCenter | "tutti",
                        })
                      }
                    >
                      <option value="tutti">Tutti</option>
                      {centers.map((c) => (
                        <option key={c} value={c}>
                          {CENTER_LABEL[c]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="col-span-2 flex min-h-11 items-center gap-2 text-[15px] font-semibold sm:col-span-4">
                    <input
                      type="checkbox"
                      className="size-5 accent-[var(--in-info)]"
                      checked={filter.toReconcile}
                      onChange={(ev) =>
                        setFilter({ ...filter, toReconcile: ev.target.checked })
                      }
                    />
                    Solo da abbinare o da verificare ({totals.toReconcile})
                    {filtered && (
                      <button
                        type="button"
                        className="scd-focus ml-auto rounded-md px-2 text-[14px] font-semibold text-[var(--in-info)] underline-offset-4 hover:underline"
                        onClick={() => setFilter(EMPTY_FILTER)}
                      >
                        Togli i filtri
                      </button>
                    )}
                  </label>
                </div>
                {shown.length === 0 ? (
                  <div className="px-4 pb-4 sm:px-[18px]">
                    <EmptyState title="Nessun movimento">
                      Nessun movimento del mese con questi filtri.
                    </EmptyState>
                  </div>
                ) : (
                  <>
                    <RegisterTable rows={shown} split={splitDays} />
                    <ul
                      className="m-0 list-none p-0 lg:hidden"
                      data-testid="pn-list"
                    >
                      {shown.map((r) => (
                        <RegisterItem
                          key={r.entry.code}
                          r={r}
                          split={splitDays}
                        />
                      ))}
                    </ul>
                  </>
                )}
              </Card>
            </div>
            <div className="grid min-w-0 grid-cols-1 items-start gap-[18px] lg:grid-cols-2 xl:grid-cols-4">
              <Card
                id="pn-centri"
                title="Per centro di costo"
                sub="Somme del mese per centro proposto."
              >
                <ul className="m-0 list-none p-0" data-testid="pn-centers">
                  {totals.byCenter.map((c) => (
                    <li
                      key={c.center}
                      className="border-t border-[var(--in-line)] px-4 py-2.5 sm:px-[18px]"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setFilter({ ...EMPTY_FILTER, center: c.center })
                        }
                        className="scd-focus flex w-full items-center justify-between gap-2 rounded-md text-left"
                      >
                        <span className="min-w-0">
                          <b className="block truncate text-[14.5px]">
                            {CENTER_LABEL[c.center]}
                          </b>
                          <span className="text-[12.5px] text-[var(--in-sub)]">
                            {NATURE_LABEL[c.nature]} · {c.count} mov.
                          </span>
                        </span>
                        <span className="flex-none text-right text-[14px] tabular-nums">
                          {c.incoming > 0 && (
                            <b className="block text-[var(--in-ok)]">
                              +{euro(c.incoming)}
                            </b>
                          )}
                          {c.outgoing > 0 && (
                            <b className="block">−{euro(c.outgoing)}</b>
                          )}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </Card>
              <Card id="pn-regole" title="Come si legge">
                <ul className="m-0 grid list-none gap-2 px-4 pb-4 text-[14px] leading-snug sm:px-[18px]">
                  <li>
                    <b>Istituzionale:</b> quote, Fondo Solidale, pulmini dei
                    tesserati, Federazione, materiale sportivo.
                  </li>
                  <li>
                    <b>Commerciale:</b> sponsor, biglietteria, bar e cucina
                    delle Club House di Colico e Dervio: base per IVA
                    forfettaria e registro IVA minori.
                  </li>
                  <li>
                    <b>Contanti:</b> da {CASH_LIMIT.toLocaleString("it-IT")} €
                    in su servono pagamenti tracciabili; il prelievo è un
                    giroconto verso la cassa.
                  </li>
                  <li>
                    <b>Volontari:</b> solo rimborsi di spese documentate.
                  </li>
                  <li className="rounded-lg bg-[#fff3c4] px-3 py-2 text-[#5a4500]">
                    “Proposto” vuol dire suggerito dalle regole: nessuna
                    classificazione è ancora confermata nel database.
                  </li>
                </ul>
              </Card>
              <Card id="pn-altre" title="Altre pagine">
                <ul className="m-0 list-none p-0">
                  {CONTABILITA_PAGES.filter((p) => p.id !== "prima-nota").map(
                    (p) => (
                      <li
                        key={p.id}
                        className="border-t border-[var(--in-line)] px-4 py-2.5 sm:px-[18px]"
                      >
                        <Link
                          to={p.path as never}
                          className="scd-focus rounded-sm text-[15px] font-semibold text-[var(--in-info)] underline-offset-4 hover:underline"
                        >
                          {p.label}
                        </Link>
                        <span className="block text-[13px] text-[var(--in-sub)]">
                          {p.what}
                        </span>
                      </li>
                    ),
                  )}
                </ul>
              </Card>
              <SourcesBox id="movimenti" />
            </div>
          </div>
        </>
      )}
    </WorkAreaShell>
  );
}

function ProposalChip({ r }: { r: PrimaNotaRow }) {
  return (
    <span
      className="inline-flex flex-wrap items-center gap-1"
      title={r.proposal.reason}
    >
      <Chip tone={NATURE_TONE[r.proposal.nature]}>
        {NATURE_LABEL[r.proposal.nature]}
      </Chip>
      <span className="text-[12.5px] text-[var(--in-sub)]">
        proposto ·{" "}
        <span className={CONF_TONE[r.proposal.confidence]}>
          {r.proposal.confidence}
        </span>
      </span>
    </span>
  );
}

function CashBadge({ split = false }: { split?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-[var(--in-crit-bg)] px-2 py-0.5 text-[12px] font-bold text-[var(--in-crit)]"
      data-testid="pn-cash-flag"
    >
      <TriangleAlert className="size-3.5" aria-hidden="true" />
      {split
        ? `prelievi del giorno ≥ ${CASH_LIMIT.toLocaleString("it-IT")} €`
        : `contanti ≥ ${CASH_LIMIT.toLocaleString("it-IT")} €`}
    </span>
  );
}

function DocLink({ r }: { r: PrimaNotaRow }) {
  if (r.documentUrl) {
    const external = r.documentUrl.startsWith("https://");
    return (
      <a
        href={r.documentUrl}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        className="scd-focus inline-flex items-center gap-1 rounded-sm text-[13.5px] font-semibold text-[var(--in-info)] underline-offset-4 hover:underline"
      >
        <FileText className="size-4" aria-hidden="true" />
        Documento<span className="sr-only"> del movimento {r.entry.code}</span>
      </a>
    );
  }
  return (
    <span className="text-[12.5px] text-[var(--in-sub)]">
      {r.entry.linkRef
        ? `rif. ${r.entry.linkRef}`
        : r.direction === "uscita" && r.proposal.nature !== "neutro"
          ? "documento da allegare"
          : ""}
    </span>
  );
}

function RegisterTable({
  rows,
  split,
}: {
  rows: readonly PrimaNotaRow[];
  split: ReadonlySet<string>;
}) {
  return (
    <div className="hidden overflow-x-auto px-[18px] pb-4 lg:block">
      <table
        className="w-full min-w-[860px] border-collapse text-[14px]"
        data-testid="pn-table"
      >
        <caption className="sr-only">
          Prima nota del mese: data, causale, centro di costo e natura proposti,
          entrate, uscite, saldo calcolato, abbinamento e documento
        </caption>
        <thead>
          <tr className="text-left text-[12.5px] text-[var(--in-sub)]">
            <th scope="col" className="py-2 pr-2 font-semibold">
              Data
            </th>
            <th scope="col" className="px-2 py-2 font-semibold">
              Causale
            </th>
            <th scope="col" className="px-2 py-2 font-semibold">
              Centro di costo · natura
            </th>
            <th scope="col" className="px-2 py-2 text-right font-semibold">
              Entrata
            </th>
            <th scope="col" className="px-2 py-2 text-right font-semibold">
              Uscita
            </th>
            <th scope="col" className="px-2 py-2 text-right font-semibold">
              Saldo calcolato
            </th>
            <th scope="col" className="py-2 pl-2 font-semibold">
              Abbinamento · documento
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.entry.code}
              className={`border-t border-[var(--in-line)] align-top ${r.cashFlag ? "bg-[#fff6f5]" : ""}`}
            >
              <td className="py-2.5 pr-2 tabular-nums">
                {itDay(r.day).slice(0, 5)}
                <span className="block text-[12px] text-[var(--in-sub)]">
                  {ACCOUNT_LABEL[r.account]}
                </span>
              </td>
              <td className="max-w-[300px] px-2 py-2.5">
                <span className="block break-words font-semibold">
                  {r.causale}
                </span>
                {r.cashFlag && <CashBadge />}
                {!r.cashFlag && split.has(r.day) && isCashMovement(r.entry) && (
                  <CashBadge split />
                )}
              </td>
              <td className="px-2 py-2.5">
                <b className="block text-[14px]">
                  {CENTER_LABEL[r.proposal.center]}
                </b>
                <ProposalChip r={r} />
              </td>
              <td className="px-2 py-2.5 text-right font-semibold tabular-nums text-[var(--in-ok)]">
                {r.entry.amount > 0 ? euro(r.entry.amount) : ""}
              </td>
              <td className="px-2 py-2.5 text-right font-semibold tabular-nums">
                {r.entry.amount < 0 ? euro(-r.entry.amount) : ""}
                {r.entry.fee ? (
                  <span className="block text-[12px] font-normal text-[var(--in-sub)]">
                    comm. {euro(r.entry.fee)}
                  </span>
                ) : null}
              </td>
              <td className="px-2 py-2.5 text-right tabular-nums">
                {euro(r.computedBalance)}
                {r.balanceMismatch && (
                  <span className="block text-[12px] font-bold text-[var(--in-crit)]">
                    estratto {euro(r.bankBalance)}
                  </span>
                )}
              </td>
              <td className="py-2.5 pl-2">
                {r.entry.matchState !== "NON_APPLICABILE" && (
                  <span className="mb-1 block">
                    <Chip tone={STATE_TONE[r.entry.matchState]}>
                      {MATCH_LABEL[r.entry.matchState]}
                    </Chip>
                  </span>
                )}
                <DocLink r={r} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RegisterItem({
  r,
  split,
}: {
  r: PrimaNotaRow;
  split: ReadonlySet<string>;
}) {
  const a = r.entry.amount;
  return (
    <li
      className={`border-t border-[var(--in-line)] px-4 py-3 ${r.cashFlag ? "bg-[#fff6f5]" : ""}`}
    >
      <div className="flex items-start gap-3">
        <span className="w-11 flex-none pt-0.5 text-[13.5px] font-semibold tabular-nums">
          {itDay(r.day).slice(0, 5)}
        </span>
        <span className="min-w-0 flex-1">
          <b className="block break-words text-[15px] leading-snug">
            {r.causale}
          </b>
          <span className="block text-[13px] text-[var(--in-sub)]">
            {CENTER_LABEL[r.proposal.center]}
          </span>
        </span>
        <span className="flex-none text-right">
          <b
            className={`block text-[15px] tabular-nums ${a > 0 ? "text-[var(--in-ok)]" : ""}`}
          >
            {signedEuro(a, euro)}
          </b>
          <span className="block text-[12px] text-[var(--in-sub)] tabular-nums">
            saldo {euro(r.computedBalance)}
          </span>
        </span>
      </div>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 pl-14">
        <ProposalChip r={r} />
        {r.cashFlag && <CashBadge />}
        {!r.cashFlag && split.has(r.day) && isCashMovement(r.entry) && (
          <CashBadge split />
        )}
        {r.entry.matchState !== "NON_APPLICABILE" && (
          <Chip tone={STATE_TONE[r.entry.matchState]}>
            {MATCH_LABEL[r.entry.matchState]}
          </Chip>
        )}
        {r.balanceMismatch && (
          <span className="text-[12px] font-bold text-[var(--in-crit)]">
            estratto {euro(r.bankBalance)}
          </span>
        )}
        <DocLink r={r} />
      </div>
    </li>
  );
}
