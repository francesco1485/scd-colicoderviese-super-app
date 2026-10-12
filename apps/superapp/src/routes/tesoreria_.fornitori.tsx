import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, RefreshCw, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Dialog } from "@/components/scd/Dialog";
import { Card, Chip, type ChipTone } from "@/components/scd/interior-ui";
import { EmptyState, SourcesBox, WorkAreaGateView, WorkAreaShell, workAreaHead } from "@/components/scd/work-area-ui";
import { euro, itDateTime, itDay } from "@/lib/fees";
import {
  DUE_LABEL,
  PLAN_LABEL,
  SUPPLIER_FILTERS,
  agenda,
  daysTo,
  dueState,
  filterSuppliers,
  instalmentsOf,
  staleDays,
  supplierFilterCount,
  supplierTotals,
  type DueState,
  type Instalment,
  type PlanGroup,
  type Supplier,
  type SupplierFilter,
} from "@/lib/suppliers";
import { getSupplierBoard, type SupplierData } from "@/lib/suppliers.functions";
import { getWorkAreaGate } from "@/lib/work-areas.functions";

function romeToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

/** M11 Fornitori e scadenze (r80, decision N2): copy of TESORERIA FORNITORI. Direzione and Tesoreria; read-only. */
export const Route = createFileRoute("/tesoreria_/fornitori")({
  loader: async () => {
    const gate = await getWorkAreaGate({ data: { area: "scadenzario" } });
    const data: SupplierData = gate.view === "page" ? await getSupplierBoard() : { connected: false, board: null, error: null };
    return { gate, interior: gate.view === "page", today: romeToday(), data };
  },
  head: ({ loaderData }) => workAreaHead("scadenzario", loaderData?.gate),
  component: SuppliersRoute,
});

function SuppliersRoute() {
  const d = Route.useLoaderData();
  return (
    <WorkAreaGateView id="scadenzario" gate={d.gate}>
      {d.interior && <SuppliersPage initial={d.data} today={d.today} preview={d.gate.preview} />}
    </WorkAreaGateView>
  );
}

const PLAN_TONE: Readonly<Record<PlanGroup, ChipTone>> = { CONTESTATO: "crit", DA_DEFINIRE: "warn", PIANO_ATTIVO: "info", CHIUSO: "ok" };
const DUE_TONE: Readonly<Record<DueState, ChipTone>> = { scaduta: "crit", entro5: "warn", mese: "info", dopo: "mute", "senza-data": "mute" };
const btnGhost = "scd-focus inline-flex h-11 items-center justify-center gap-2 rounded-[10px] border border-[var(--in-line)] bg-white px-4 text-[15px] font-semibold disabled:opacity-50";

function weekLabel(week: string): string {
  if (week === "scadute") return "Già scadute";
  if (week === "senza-data") return "Senza data";
  const end = new Date(`${week}T00:00:00Z`);
  end.setUTCDate(end.getUTCDate() + 6);
  return `Settimana ${itDay(week).slice(0, 5)} – ${itDay(end.toISOString().slice(0, 10)).slice(0, 5)}`;
}

function SuppliersPage({ initial, today, preview }: { initial: SupplierData; today: string; preview: boolean }) {
  const [data, setData] = useState(initial);
  const [filter, setFilter] = useState<SupplierFilter>("aperti");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const reload = useServerFn(getSupplierBoard);

  const board = data.board;
  const suppliers = board?.suppliers ?? [];
  const instalments = board?.instalments ?? [];
  const t = useMemo(() => supplierTotals(suppliers, instalments, today), [suppliers, instalments, today]);
  const weeks = useMemo(() => agenda(suppliers, instalments, today), [suppliers, instalments, today]);
  const shown = useMemo(() => filterSuppliers(suppliers, filter, q), [suppliers, filter, q]);
  const current = suppliers.find((s) => s.key === open) ?? null;
  const stale = staleDays(board?.sync?.alignedOn, today);

  async function refresh() {
    setBusy(true);
    try {
      setData(await reload());
    } catch {
      /* keep what we have */
    } finally {
      setBusy(false);
    }
  }

  return (
    <WorkAreaShell
      id="scadenzario"
      title="Fornitori e scadenze"
      preview={preview}
      highlights={[
        { value: board ? t.open : null, label: "fornitori aperti" },
        { value: board ? t.overdue : null, label: "rate scadute" },
        { value: board ? t.within5 : null, label: "rate entro 5 giorni" },
        { value: board ? t.month : null, label: "rate entro 30 giorni" },
        { value: board ? t.groups.DA_DEFINIRE + t.groups.CONTESTATO : null, label: "piani da definire o contestati" },
      ]}
      note={<>Copia di sola lettura di TESORERIA FORNITORI: le correzioni si fanno nel foglio. L'app non paga e non conserva IBAN né contatti personali.</>}
    >
      {!data.connected ? (
        <EmptyState title="Accesso non attivo">Entra con il tuo account della società per vedere i fornitori.</EmptyState>
      ) : data.error ? (
        <EmptyState title="Dati non disponibili" action={<button type="button" className={btnGhost} onClick={() => void refresh()}>Riprova</button>}>{data.error}</EmptyState>
      ) : !board ? (
        <EmptyState title="Area riservata">Fornitori e scadenze sono visibili a Direzione e Tesoreria. Se ti serve l'accesso chiedilo alla Direzione.</EmptyState>
      ) : suppliers.length === 0 && instalments.length === 0 ? (
        <EmptyState title="Copia non ancora caricata">La prima copia del foglio TESORERIA FORNITORI arriva con la prossima sincronizzazione automatica.</EmptyState>
      ) : (
        <>
          <Card id="fornitori-quadro" title="Quadro fornitori"
            sub={<>Foglio aggiornato al <b>{board.sync?.alignedOn ? itDay(board.sync.alignedOn) : "—"}</b>{stale !== null && stale > 7 ? <> · <b className="text-[#9a1d14]">{stale} giorni fa: chiedi alla Tesoreria di allinearlo</b></> : null} · copia del {itDateTime(board.sync?.syncedAt)}</>}
            aside={<button type="button" onClick={() => void refresh()} disabled={busy} className={btnGhost} aria-label="Ricarica i dati"><RefreshCw className={`size-4 ${busy ? "animate-spin" : ""}`} aria-hidden="true" /></button>}>
            <div className="grid grid-cols-2 gap-2 px-4 pb-4 sm:grid-cols-4 sm:px-[18px]" data-testid="fornitori-totals">
              <Total label={`Debito concordato · ${t.suppliers} fornitori`} value={euro(t.balance)} />
              <Total label="Pagato" value={euro(t.paid)} tone="ok" />
              <Total label="Residuo da pagare" value={euro(t.residual)} />
              <Total label={`Scaduto · ${t.overdue} rate`} value={euro(t.overdueAmount)} tone={t.overdue > 0 ? "crit" : undefined} />
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[minmax(0,1fr)_420px]">
            <div className="flex min-w-0 flex-col gap-[18px]">
              <Card id="fornitori-elenco" title="Fornitori" sub={`${shown.length} mostrati su ${suppliers.length}. Prima contestati e da definire, poi per prossima scadenza.`}>
                <div className="flex flex-col gap-3 px-4 pb-3 sm:px-[18px]">
                  <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtra per stato del piano">
                    {SUPPLIER_FILTERS.map((f) => (
                      <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}
                        className={`scd-focus inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-[14px] font-semibold ${filter === f.id ? "border-[var(--in-info)] bg-[var(--in-info)] text-white" : "border-[var(--in-line)] bg-white"}`}>
                        {f.label}<span className="tabular-nums opacity-80">{supplierFilterCount(suppliers, f.id)}</span>
                      </button>
                    ))}
                  </div>
                  <label className="relative block">
                    <span className="sr-only">Cerca fornitore, stato o strategia</span>
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--in-sub)]" aria-hidden="true" />
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca fornitore, stato, strategia"
                      className="h-11 w-full rounded-[10px] border border-[var(--in-line)] bg-white pl-9 pr-3 text-[15px] outline-none focus:border-[var(--in-info)]" />
                  </label>
                </div>
                {shown.length === 0 ? (
                  <div className="px-4 pb-4 sm:px-[18px]"><EmptyState title="Nessun fornitore">Niente da mostrare con questo filtro.</EmptyState></div>
                ) : (
                  <ul className="m-0 list-none p-0" data-testid="fornitori-list">
                    {shown.map((s) => <SupplierRow key={s.key} s={s} today={today} onOpen={() => setOpen(s.key)} />)}
                  </ul>
                )}
              </Card>
            </div>

            <div className="flex min-w-0 flex-col gap-[18px]">
              <Card id="fornitori-agenda" title="Agenda pagamenti" sub="Solo piani accettati. Il promemoria del foglio scatta 5 giorni prima.">
                {weeks.length === 0 ? (
                  <div className="px-4 pb-4 sm:px-[18px]"><EmptyState title="Nessuna rata aperta">Tutti i piani sono chiusi o senza rate.</EmptyState></div>
                ) : (
                  <ol className="m-0 list-none p-0" data-testid="fornitori-agenda">
                    {weeks.map((w) => (
                      <li key={w.week} className="border-t border-[var(--in-line)]">
                        <div className={`flex items-center justify-between gap-2 px-4 pt-3 sm:px-[18px] ${w.week === "scadute" ? "text-[#9a1d14]" : ""}`}>
                          <b className="text-[14.5px]">{weekLabel(w.week)}</b>
                          <span className="text-[13.5px] font-semibold tabular-nums">{euro(w.amount)}</span>
                        </div>
                        <ul className="m-0 list-none px-4 pb-3 pt-1 sm:px-[18px]">
                          {w.items.map((i) => <AgendaItem key={i.key} i={i} today={today} onOpen={() => setOpen(i.supplierKey)} />)}
                        </ul>
                      </li>
                    ))}
                  </ol>
                )}
              </Card>
              <Card id="fornitori-regole" title="Come si lavora">
                <ul className="m-0 flex list-disc flex-col gap-1.5 px-4 pb-4 pl-9 text-[14.5px] leading-snug sm:px-[18px] sm:pl-10">
                  <li>La Tesoreria aggiorna il foglio TESORERIA FORNITORI dopo ogni pagamento: la copia segue da sola.</li>
                  <li>Ogni pagamento parte solo con il piano accettato dal fornitore e il via libera della Direzione.</li>
                  <li>La ricevuta del bonifico va inviata al fornitore nella stessa conversazione della mail del piano.</li>
                  <li>Un fornitore contestato non si paga finché la Direzione non ha chiuso la verifica.</li>
                </ul>
              </Card>
              <SourcesBox id="scadenzario" />
            </div>
          </div>
          {current && <SupplierDialog s={current} rates={instalmentsOf(instalments, current.key)} today={today} onClose={() => setOpen(null)} />}
        </>
      )}
    </WorkAreaShell>
  );
}

function Total({ label, value, tone }: { label: string; value: string; tone?: "ok" | "crit" | undefined }) {
  const bg = tone === "crit" ? "bg-[#fdecea]" : tone === "ok" ? "bg-[var(--in-ok-bg)]" : "bg-[var(--in-info-bg)]";
  return (
    <div className={`min-w-0 rounded-xl px-3 py-2.5 ${bg}`}>
      <span className="block font-title text-[21px] font-black leading-none tabular-nums">{value}</span>
      <span className="mt-1 block text-[13px] leading-tight text-[var(--in-sub)]">{label}</span>
    </div>
  );
}

function dueText(due: string | null, today: string): string {
  if (!due) return "data da definire";
  const d = daysTo(due, today);
  if (d === 0) return "oggi";
  if (d < 0) return `scaduta da ${-d} ${d === -1 ? "giorno" : "giorni"}`;
  return `entro ${itDay(due).slice(0, 5)} · tra ${d} ${d === 1 ? "giorno" : "giorni"}`;
}

function SupplierRow({ s, today, onOpen }: { s: Supplier; today: string; onOpen: () => void }) {
  const st = dueState(s.nextDue, today);
  return (
    <li className="border-t border-[var(--in-line)]">
      <button type="button" onClick={onOpen} className="scd-focus flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[#f7fbff] sm:px-[18px]">
        <span className="min-w-0 flex-1">
          <b className="block truncate text-[15.5px]">{s.supplier}</b>
          <span className="block truncate text-[13px] text-[var(--in-sub)]">
            {s.planGroup === "CHIUSO" ? (s.planStatus ?? "Piano chiuso") : s.nextAmount !== null || s.nextDue ? `prossima rata ${euro(s.nextAmount)} · ${dueText(s.nextDue, today)}` : (s.planStatus ?? "piano da definire")}
          </span>
        </span>
        <span className="flex flex-none flex-col items-end gap-1 text-right">
          <Chip tone={s.planGroup !== "CHIUSO" && st === "scaduta" ? "crit" : PLAN_TONE[s.planGroup]}>{s.planGroup !== "CHIUSO" && st === "scaduta" ? "Rata scaduta" : PLAN_LABEL[s.planGroup]}</Chip>
          <span className="text-[13px] tabular-nums text-[var(--in-sub)]">residuo {euro(s.residual)}</span>
        </span>
      </button>
    </li>
  );
}

function AgendaItem({ i, today, onOpen }: { i: Instalment; today: string; onOpen: () => void }) {
  const st = dueState(i.due, today);
  return (
    <li className="flex items-center gap-3 py-1.5">
      <span className="w-12 flex-none text-[13.5px] font-semibold tabular-nums">{i.due ? itDay(i.due).slice(0, 5) : "—"}</span>
      <button type="button" onClick={onOpen} className="scd-focus min-w-0 flex-1 rounded-sm text-left text-[14px] leading-snug">
        <b className="block truncate">{i.supplier}</b>
        <span className="block truncate text-[12.5px] text-[var(--in-sub)]">{[i.label ? `rata ${i.label}` : null, i.todo].filter(Boolean).join(" · ") || DUE_LABEL[st]}</span>
      </button>
      <span className="flex flex-none flex-col items-end gap-0.5">
        <b className="text-[14px] tabular-nums">{euro(i.amount)}</b>
        {(st === "scaduta" || st === "entro5") && <Chip tone={DUE_TONE[st]}>{DUE_LABEL[st]}</Chip>}
      </span>
    </li>
  );
}

function SupplierDialog({ s, rates, today, onClose }: { s: Supplier; rates: Instalment[]; today: string; onClose: () => void }) {
  const rows: Array<[string, string | null]> = [
    ["Stato nel foglio", s.planStatus],
    ["Rate del piano", s.instalments !== null ? String(s.instalments) : null],
    ["Chiusura prevista", s.closingExpected ? itDay(s.closingExpected) : null],
    ["Prossima azione", s.nextAction],
    ["Posizione commerciale", s.commercialPosition],
    ["Strategia", s.strategy],
  ];
  return (
    <Dialog title={s.supplier} onClose={onClose} testId="fornitori-dettaglio">
      <div className="mt-3 flex flex-col gap-3 text-[14.5px]">
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone={PLAN_TONE[s.planGroup]}>{PLAN_LABEL[s.planGroup]}</Chip>
          {s.nextDue && s.planGroup !== "CHIUSO" && <span className="text-[var(--in-sub)]">Prossima rata {euro(s.nextAmount)} · {dueText(s.nextDue, today)}</span>}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Total label="Debito concordato" value={euro(s.balance)} />
          <Total label="Pagato" value={euro(s.paid)} tone="ok" />
          <Total label="Residuo" value={euro(s.residual)} />
        </div>
        <section aria-label="Rate in agenda">
          <h3 className="m-0 text-[15px] font-bold">Rate in agenda</h3>
          {rates.length === 0 ? (
            <p className="m-0 text-[var(--in-sub)]">Nessuna rata nell'agenda pagamenti del foglio.</p>
          ) : (
            <ol className="m-0 mt-1 list-none p-0">
              {rates.map((r) => {
                const st = dueState(r.due, today);
                return (
                  <li key={r.key} className="flex items-center gap-3 border-t border-[var(--in-line)] py-2 tabular-nums">
                    <span className="w-16 flex-none font-semibold">{r.label ? `Rata ${r.label}` : "Rata"}</span>
                    <span className="flex-1">{dueText(r.due, today)}</span>
                    <b>{euro(r.amount)}</b>
                    <Chip tone={DUE_TONE[st]}>{DUE_LABEL[st]}</Chip>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
        <dl className="m-0 grid grid-cols-[minmax(0,150px)_minmax(0,1fr)] gap-x-3 gap-y-1.5">
          {rows.filter(([, v]) => v).map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-[var(--in-sub)]">{k}</dt>
              <dd className="m-0 break-words">{v}</dd>
            </div>
          ))}
        </dl>
        {s.mailUrl && (
          <a href={s.mailUrl} target="_blank" rel="noopener noreferrer" className={`${btnGhost} self-start`}>
            <ExternalLink className="size-4" aria-hidden="true" />Apri la conversazione con il fornitore
          </a>
        )}
        <p className="m-0 rounded-[10px] bg-[var(--in-info-bg)] px-3 py-2 text-[13.5px]">
          Per correggere importi, rate o stato modifica TESORERIA FORNITORI: la copia si aggiorna alla prossima sincronizzazione. I pagamenti si fanno in banca, mai dall'app.
        </p>
      </div>
    </Dialog>
  );
}
