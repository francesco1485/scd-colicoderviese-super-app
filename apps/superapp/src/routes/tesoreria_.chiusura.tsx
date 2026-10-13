import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  CircleAlert,
  CircleCheck,
  CircleDashed,
  CircleMinus,
  Printer,
} from "lucide-react";
import { useMemo } from "react";

import {
  ContabilitaNav,
  Figure,
  MonthSwitch,
  contabilitaHead,
} from "@/components/scd/contabilita";
import { Card } from "@/components/scd/interior-ui";
import {
  EmptyState,
  SourcesBox,
  WorkAreaGateView,
  WorkAreaShell,
} from "@/components/scd/work-area-ui";
import { defaultPeriod, summarize } from "@/lib/compensation";
import { getCompBoard, type CompData } from "@/lib/compensation.functions";
import { euro } from "@/lib/fees";
import { monthLabel } from "@/lib/ledger";
import { getLedgerBoard, type LedgerData } from "@/lib/ledger.functions";
import {
  CENTER_LABEL,
  COMMERCIAL_CEILING_398,
  NATURE_LABEL,
  buildPrimaNota,
  cashSplitDays,
  closingChecklist,
  closingDeadline,
  monthTotals,
  plural,
  romeDay,
  seasonCommercialIn,
  volunteerIssueCount,
  type CheckState,
  type CompClosing,
  type SupplierClosing,
} from "@/lib/prima-nota";
import { getSupplierBoard, type SupplierData } from "@/lib/suppliers.functions";
import { getWorkAreaGate } from "@/lib/work-areas.functions";

const PATH = "/tesoreria/chiusura";
const DESCRIPTION =
  "Chiusura del mese della tesoreria: movimenti da riconciliare, contanti, entrate commerciali, compensi e fornitori, riepilogo per il commercialista entro il 15. Riservato.";

function validateSearch(raw: Record<string, unknown>): { mese?: string } {
  return typeof raw["mese"] === "string" &&
    /^\d{4}-(0[1-9]|1[0-2])$/.test(raw["mese"])
    ? { mese: raw["mese"] }
    : {};
}

/** Chiusura del mese (Direzione 13/10). Reads only: ledger, compensation of the month, supplier agenda. */
export const Route = createFileRoute("/tesoreria_/chiusura")({
  validateSearch,
  loaderDeps: ({ search }) => ({ mese: search.mese }),
  loader: async ({ deps }) => {
    const gate = await getWorkAreaGate({ data: { area: "movimenti" } });
    const today = romeDay(new Date().toISOString());
    const month = deps.mese ?? defaultPeriod(today);
    const none = { connected: false, board: null, error: null };
    if (gate.view !== "page")
      return {
        gate,
        interior: false,
        today,
        month,
        ledger: none as LedgerData,
        comp: none as CompData,
        suppliers: none as SupplierData,
      };
    const [ledger, comp, suppliers] = await Promise.all([
      getLedgerBoard(),
      getCompBoard({ data: { period: month } }).catch((): CompData => ({
        connected: true,
        board: null,
        error: "Lettura dei compensi non riuscita.",
      })),
      getSupplierBoard().catch((): SupplierData => ({
        connected: true,
        board: null,
        error: "Lettura dei fornitori non riuscita.",
      })),
    ]);
    return { gate, interior: true, today, month, ledger, comp, suppliers };
  },
  head: ({ loaderData }) =>
    contabilitaHead("Chiusura del mese", DESCRIPTION, loaderData?.gate),
  component: ChiusuraRoute,
});

function ChiusuraRoute() {
  const d = Route.useLoaderData();
  return (
    <WorkAreaGateView id="movimenti" gate={d.gate}>
      {d.interior && (
        <ChiusuraPage key={d.month} {...d} preview={d.gate.preview} />
      )}
    </WorkAreaGateView>
  );
}

const STATE_UI: Readonly<
  Record<CheckState, { icon: typeof CircleCheck; cls: string; label: string }>
> = {
  ok: { icon: CircleCheck, cls: "text-[var(--in-ok)]", label: "a posto" },
  "da-fare": {
    icon: CircleDashed,
    cls: "text-[var(--in-info)]",
    label: "da fare",
  },
  attenzione: {
    icon: CircleAlert,
    cls: "text-[var(--in-crit)]",
    label: "attenzione",
  },
  "non-disponibile": {
    icon: CircleMinus,
    cls: "text-[var(--in-sub)]",
    label: "non disponibile",
  },
};
const CHECK_LINK: Readonly<Record<string, string>> = {
  riconciliazione: "/tesoreria/movimenti",
  classificazione: "/tesoreria/prima-nota",
  contanti: "/tesoreria/prima-nota",
  compensi: "/tesoreria/compensi",
  fornitori: "/tesoreria/fornitori",
};
const btnMain =
  "scd-focus inline-flex h-11 items-center justify-center gap-2 rounded-[10px] bg-[#F8D000] px-4 text-[15px] font-bold text-[#062a52] disabled:opacity-50";
const capFirst = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
const dmy = (iso: string) => iso.split("-").reverse().join("/");

function ChiusuraPage({
  today,
  month,
  ledger,
  comp,
  suppliers,
  preview,
}: {
  today: string;
  month: string;
  ledger: LedgerData;
  comp: CompData;
  suppliers: SupplierData;
  preview: boolean;
}) {
  const navigate = useNavigate();
  const rows = useMemo(
    () => buildPrimaNota(ledger.board?.entries ?? []).rows,
    [ledger.board],
  );
  const totals = useMemo(() => monthTotals(rows, month), [rows, month]);
  const split = useMemo(
    () =>
      cashSplitDays(rows.filter((r) => r.month === month).map((r) => r.entry))
        .length,
    [rows, month],
  );
  const season = useMemo(() => seasonCommercialIn(rows, month), [rows, month]);
  const deadline = closingDeadline(month);

  const compClosing: CompClosing = useMemo(() => {
    const lines = comp.board?.lines ?? [];
    if (!comp.board)
      return {
        available: false,
        people: 0,
        netTotal: 0,
        paid: 0,
        paidTotal: 0,
        toPay: 0,
        missingIban: 0,
        volunteerIssues: 0,
      };
    const s = summarize(lines);
    return {
      available: true,
      people: s.people,
      netTotal: s.netTotal,
      paid: s.paid,
      paidTotal: s.paidTotal,
      toPay: lines.filter((l) => l.status !== "PAGATO" && l.net > 0).length,
      missingIban: s.missingIban,
      volunteerIssues: volunteerIssueCount(lines),
    };
  }, [comp.board]);

  const supClosing: SupplierClosing = useMemo(() => {
    const b = suppliers.board;
    if (!b)
      return {
        available: false,
        overdue: 0,
        overdueTotal: 0,
        dueNext: 0,
        dueNextTotal: 0,
      };
    const closed = new Set(
      b.suppliers.filter((s) => s.planGroup === "CHIUSO").map((s) => s.key),
    );
    const open = b.instalments.filter(
      (i) => !closed.has(i.supplierKey) && i.due,
    );
    const overdue = open.filter((i) => (i.due as string) < today);
    const next = open.filter(
      (i) => (i.due as string) >= today && (i.due as string) <= deadline,
    );
    const sum = (xs: typeof open) =>
      Math.round(xs.reduce((s, i) => s + (i.amount ?? 0), 0) * 100) / 100;
    return {
      available: true,
      overdue: overdue.length,
      overdueTotal: sum(overdue),
      dueNext: next.length,
      dueNextTotal: sum(next),
    };
  }, [suppliers.board, today, deadline]);

  const checks = useMemo(
    () => closingChecklist(totals, split, compClosing, supClosing, today),
    [totals, split, compClosing, supClosing, today],
  );
  const open = checks.filter(
    (c) => c.state === "da-fare" || c.state === "attenzione",
  ).length;
  const ledgerOk = ledger.connected && !ledger.error && !!ledger.board;

  return (
    <WorkAreaShell
      id="movimenti"
      path={PATH}
      title="Chiusura del mese"
      preview={preview}
      highlights={[
        { value: ledgerOk ? open : null, label: "controlli aperti" },
        {
          value: ledgerOk ? totals.toReconcile : null,
          label: "movimenti da riconciliare",
        },
        {
          value: ledgerOk ? totals.cashFlags + split : null,
          label: "segnalazioni contanti",
        },
        {
          value: Math.max(
            0,
            Math.round(
              (Date.parse(`${deadline}T12:00:00Z`) -
                Date.parse(`${today}T12:00:00Z`)) /
                86_400_000,
            ),
          ),
          label: `giorni al ${dmy(deadline)} (riepilogo)`,
        },
      ]}
      note={<>Legge e riassume: non paga, non invia, non conferma.</>}
    >
      <style>{`@media print { body * { visibility: hidden !important; } [data-print-root], [data-print-root] * { visibility: visible !important; } [data-print-root] { position: absolute; inset: 0 auto auto 0; width: 100%; box-shadow: none !important; border: 0 !important; } .no-print { display: none !important; } }`}</style>
      <ContabilitaNav current="chiusura" />
      {!ledger.connected ? (
        <EmptyState title="Accesso non attivo">
          Entra con il tuo account della società per vedere la chiusura del
          mese.
        </EmptyState>
      ) : !ledgerOk ? (
        <EmptyState
          title={ledger.error ? "Dati non disponibili" : "Area riservata"}
        >
          {ledger.error ??
            "La chiusura del mese è visibile a Direzione e Tesoreria."}
        </EmptyState>
      ) : (
        <>
          <Card
            id="ch-controlli"
            title={`Controlli di ${monthLabel(month)}`}
            sub={`Riepilogo al commercialista entro il ${dmy(deadline)}: corrispettivi e registro IVA minori del mese, compensi pagati entro il 15.`}
            aside={
              <MonthSwitch
                month={month}
                onChange={(m) =>
                  void navigate({
                    to: PATH as never,
                    search: { mese: m } as never,
                    replace: true,
                  })
                }
              />
            }
          >
            <ul className="m-0 list-none p-0" data-testid="ch-checks">
              {checks.map((c) => {
                const ui = STATE_UI[c.state];
                const Icon = ui.icon;
                const link = CHECK_LINK[c.id];
                return (
                  <li
                    key={c.id}
                    className="flex items-start gap-3 border-t border-[var(--in-line)] px-4 py-3 sm:px-[18px]"
                    data-check={c.id}
                    data-state={c.state}
                  >
                    <Icon
                      className={`mt-0.5 size-5 flex-none ${ui.cls}`}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline gap-x-2">
                        <b className="text-[15.5px]">{c.label}</b>
                        <span className={`text-[13px] font-semibold ${ui.cls}`}>
                          {ui.label}
                        </span>
                      </span>
                      <span className="block text-[14px] leading-snug text-[var(--in-sub)]">
                        {c.detail}
                      </span>
                      {link &&
                        c.state !== "ok" &&
                        c.state !== "non-disponibile" && (
                          <Link
                            to={link as never}
                            search={
                              (link === "/tesoreria/compensi" ||
                              link === "/tesoreria/prima-nota"
                                ? { mese: month }
                                : {}) as never
                            }
                            className="scd-focus mt-1 inline-block rounded-sm text-[14px] font-semibold text-[var(--in-info)] underline-offset-4 hover:underline"
                          >
                            Apri
                          </Link>
                        )}
                    </span>
                    {c.value && (
                      <b className="flex-none text-right text-[15px] tabular-nums">
                        {c.value}
                      </b>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>

          <div className="grid grid-cols-1 gap-[18px] xl:grid-cols-[minmax(0,1fr)_360px]">
            <Card
              id="ch-riepilogo"
              title="Riepilogo per il commercialista"
              sub="Pagina da stampare o salvare in PDF. Solo importi e conteggi: nessun nome, nessun IBAN."
              aside={
                <button
                  type="button"
                  className={`${btnMain} no-print`}
                  onClick={() => window.print()}
                  data-testid="ch-print"
                >
                  <Printer className="size-4" aria-hidden="true" />
                  Stampa
                </button>
              }
            >
              <div
                data-print-root
                className="bg-white px-4 pb-5 text-[14px] sm:px-[18px]"
                data-testid="ch-summary"
              >
                <header className="border-b-2 border-[#062a52] pb-2">
                  <b className="block text-[18px]">
                    S.C.D. ColicoDerviese · Riepilogo prima nota
                  </b>
                  <span className="block text-[var(--in-sub)]">
                    {capFirst(monthLabel(month))} · ASD in regime 398/91 ·
                    preparato il {dmy(today)} · da consegnare entro il{" "}
                    {dmy(deadline)}
                  </span>
                </header>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Figure
                    label="Saldo iniziale"
                    value={euro(totals.opening)}
                    tone="mute"
                  />
                  <Figure
                    label="Entrate"
                    value={euro(totals.incoming)}
                    tone="ok"
                  />
                  <Figure
                    label="Uscite e commissioni"
                    value={euro(totals.outgoing + totals.fees)}
                  />
                  <Figure
                    label="Saldo finale"
                    value={euro(totals.closing)}
                    tone="mute"
                  />
                </div>
                <h3 className="mb-1 mt-4 text-[15px] font-bold">
                  Natura delle entrate (proposta)
                </h3>
                <table className="w-full border-collapse tabular-nums">
                  <tbody>
                    <tr className="border-t border-[var(--in-line)]">
                      <th
                        scope="row"
                        className="py-1.5 text-left font-semibold"
                      >
                        Istituzionali
                      </th>
                      <td className="py-1.5 text-right">
                        {euro(totals.institutionalIn)}
                      </td>
                    </tr>
                    <tr className="border-t border-[var(--in-line)]">
                      <th
                        scope="row"
                        className="py-1.5 text-left font-semibold"
                      >
                        Commerciali (base IVA forfettaria e registro IVA minori)
                      </th>
                      <td className="py-1.5 text-right font-bold">
                        {euro(totals.commercialIn)}
                      </td>
                    </tr>
                    <tr className="border-t border-[var(--in-line)]">
                      <th
                        scope="row"
                        className="py-1.5 text-left font-semibold"
                      >
                        Da classificare
                      </th>
                      <td className="py-1.5 text-right">
                        {euro(totals.unclassifiedIn)}
                      </td>
                    </tr>
                    <tr className="border-t border-[var(--in-line)]">
                      <th
                        scope="row"
                        className="py-1.5 text-left font-semibold"
                      >
                        Costi commerciali (Club House e simili)
                      </th>
                      <td className="py-1.5 text-right">
                        {euro(totals.commercialOut)}
                      </td>
                    </tr>
                    <tr className="border-t border-[var(--in-line)]">
                      <th
                        scope="row"
                        className="py-1.5 text-left font-semibold"
                      >
                        Commerciale progressivo da luglio (limite 398/91:{" "}
                        {euro(COMMERCIAL_CEILING_398)})
                      </th>
                      <td className="py-1.5 text-right">{euro(season)}</td>
                    </tr>
                  </tbody>
                </table>
                <h3 className="mb-1 mt-4 text-[15px] font-bold">
                  Per centro di costo (proposto)
                </h3>
                <div className="overflow-x-auto">
                  <table
                    className="w-full min-w-[420px] border-collapse tabular-nums"
                    data-testid="ch-centers"
                  >
                    <thead>
                      <tr className="text-left text-[12.5px] text-[var(--in-sub)]">
                        <th scope="col" className="py-1.5 font-semibold">
                          Centro
                        </th>
                        <th scope="col" className="py-1.5 font-semibold">
                          Natura
                        </th>
                        <th
                          scope="col"
                          className="py-1.5 text-right font-semibold"
                        >
                          Mov.
                        </th>
                        <th
                          scope="col"
                          className="py-1.5 text-right font-semibold"
                        >
                          Entrate
                        </th>
                        <th
                          scope="col"
                          className="py-1.5 text-right font-semibold"
                        >
                          Uscite
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {totals.byCenter.map((c) => (
                        <tr
                          key={c.center}
                          className="border-t border-[var(--in-line)]"
                        >
                          <td className="py-1.5">{CENTER_LABEL[c.center]}</td>
                          <td className="py-1.5">{NATURE_LABEL[c.nature]}</td>
                          <td className="py-1.5 text-right">{c.count}</td>
                          <td className="py-1.5 text-right">
                            {c.incoming ? euro(c.incoming) : ""}
                          </td>
                          <td className="py-1.5 text-right">
                            {c.outgoing ? euro(c.outgoing) : ""}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <h3 className="mb-1 mt-4 text-[15px] font-bold">Controlli</h3>
                <ul className="m-0 grid list-none gap-1 p-0">
                  {checks
                    .filter((c) => c.id !== "scadenza")
                    .map((c) => (
                      <li key={c.id}>
                        <b>{c.label}:</b> {STATE_UI[c.state].label}. {c.detail}
                      </li>
                    ))}
                </ul>
                <p className="mt-4 rounded-lg bg-[#fff3c4] px-3 py-2 text-[13px] text-[#5a4500]">
                  Centri di costo e natura sono proposti da regole sui movimenti
                  del conto e vanno confermati dalla Tesoreria. Movimenti da
                  riconciliare: {totals.toReconcile}. Fonte: registro dei
                  movimenti del conto SumUp della società; cassa contanti non
                  ancora collegata.
                </p>
              </div>
            </Card>
            <div className="flex min-w-0 flex-col gap-[18px]">
              <Card
                id="ch-compensi"
                title="Compensi del mese"
                sub="Conteggi dal modulo compensi: nessun IBAN, solo il suo stato."
              >
                {compClosing.available ? (
                  <div
                    className="grid grid-cols-2 gap-2 px-4 pb-4 sm:px-[18px]"
                    data-testid="ch-comp"
                  >
                    <Figure
                      label="Persone"
                      value={compClosing.people}
                      tone="mute"
                    />
                    <Figure
                      label="Netto del mese"
                      value={euro(compClosing.netTotal)}
                    />
                    <Figure
                      label="Pagati"
                      value={euro(compClosing.paidTotal)}
                      hint={plural(compClosing.paid, "persona", "persone")}
                      tone="ok"
                    />
                    <Figure
                      label="IBAN da confermare"
                      value={compClosing.missingIban}
                      tone={compClosing.missingIban ? "warn" : "mute"}
                    />
                  </div>
                ) : (
                  <div className="px-4 pb-4 sm:px-[18px]">
                    <EmptyState title="Compensi non disponibili">
                      {comp.error ??
                        "I compensi sono visibili a Direzione e Tesoreria."}
                    </EmptyState>
                  </div>
                )}
              </Card>
              <Card
                id="ch-fornitori"
                title="Fornitori"
                sub={`Rate scadute e in scadenza entro il ${dmy(deadline)}.`}
              >
                {supClosing.available ? (
                  <div
                    className="grid grid-cols-2 gap-2 px-4 pb-4 sm:px-[18px]"
                    data-testid="ch-sup"
                  >
                    <Figure
                      label="Rate scadute"
                      value={euro(supClosing.overdueTotal)}
                      hint={plural(supClosing.overdue, "rata", "rate")}
                      tone={supClosing.overdue ? "warn" : "mute"}
                    />
                    <Figure
                      label="In scadenza"
                      value={euro(supClosing.dueNextTotal)}
                      hint={plural(supClosing.dueNext, "rata", "rate")}
                    />
                  </div>
                ) : (
                  <div className="px-4 pb-4 sm:px-[18px]">
                    <EmptyState title="Fornitori non disponibili">
                      {suppliers.error ??
                        "L'agenda fornitori è visibile a Direzione e Tesoreria."}
                    </EmptyState>
                  </div>
                )}
              </Card>
              <SourcesBox id="movimenti" />
            </div>
          </div>
        </>
      )}
    </WorkAreaShell>
  );
}
