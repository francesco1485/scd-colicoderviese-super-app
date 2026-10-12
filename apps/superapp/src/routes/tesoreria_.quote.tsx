import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { RefreshCw, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Dialog } from "@/components/scd/Dialog";
import { Card, Chip, type ChipTone } from "@/components/scd/interior-ui";
import { EmptyState, SourcesBox, WorkAreaGateView, WorkAreaShell, workAreaHead } from "@/components/scd/work-area-ui";
import {
  FEE_FILTERS,
  FEE_GROUPS,
  FEE_RULES,
  GROUP_HELP,
  GROUP_LABEL,
  byCategory,
  deadlineCalendar,
  euro,
  feeTotals,
  filterCount,
  filterPositions,
  itDateTime,
  itDay,
  planLabel,
  schedule,
  type FeeFilter,
  type FeeGroup,
  type FeePosition,
} from "@/lib/fees";
import { getFeeBoard, type FeeData } from "@/lib/fees.functions";
import { getWorkAreaGate } from "@/lib/work-areas.functions";

function romeToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

/** Quote e Fondo (r78, UD-076/UD-082): the season's fees copied from the Gestionale. Office only; read-only. */
export const Route = createFileRoute("/tesoreria_/quote")({
  loader: async () => {
    const gate = await getWorkAreaGate({ data: { area: "quote" } });
    const data: FeeData = gate.view === "page" ? await getFeeBoard({ data: {} }) : { connected: false, board: null, error: null };
    return { gate, interior: gate.view === "page", today: romeToday(), data };
  },
  head: ({ loaderData }) => workAreaHead("quote", loaderData?.gate),
  component: QuoteRoute,
});

function QuoteRoute() {
  const d = Route.useLoaderData();
  return (
    <WorkAreaGateView id="quote" gate={d.gate}>
      {d.interior && <FeesPage initial={d.data} today={d.today} preview={d.gate.preview} />}
    </WorkAreaGateView>
  );
}

const GROUP_TONE: Readonly<Record<FeeGroup, ChipTone>> = {
  IN_RITARDO: "crit",
  DA_COMUNICARE: "warn",
  DA_VERIFICARE: "warn",
  REGOLARE: "info",
  SALDATO: "ok",
  ESCLUSO: "mute",
};
const BAR: Readonly<Record<FeeGroup, string>> = {
  IN_RITARDO: "bg-[#b42318]",
  DA_COMUNICARE: "bg-[#f2b705]",
  DA_VERIFICARE: "bg-[#f7d774]",
  REGOLARE: "bg-[#2a7fd4]",
  SALDATO: "bg-[#128a2e]",
  ESCLUSO: "bg-[#c7d3e0]",
};
const btnGhost = "scd-focus inline-flex h-11 items-center justify-center gap-2 rounded-[10px] border border-[var(--in-line)] bg-white px-4 text-[15px] font-semibold disabled:opacity-50";

function FeesPage({ initial, today, preview }: { initial: FeeData; today: string; preview: boolean }) {
  const [data, setData] = useState(initial);
  const [filter, setFilter] = useState<FeeFilter>("lavoro");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const reload = useServerFn(getFeeBoard);

  const board = data.board;
  const positions = board?.positions ?? [];
  const season = board?.season ?? "2026/27";
  const t = useMemo(() => feeTotals(positions), [positions]);
  const cats = useMemo(() => byCategory(positions), [positions]);
  const cal = useMemo(() => deadlineCalendar(positions, season, today), [positions, season, today]);
  const shown = useMemo(() => filterPositions(positions, filter, q), [positions, filter, q]);
  const current = positions.find((p) => p.code === open) ?? null;
  const pct = t.feeTotal > 0 ? Math.round((t.paid / t.feeTotal) * 100) : null;

  async function refresh() {
    setBusy(true);
    try {
      setData(await reload({ data: { season } }));
    } catch {
      /* keep what we have */
    } finally {
      setBusy(false);
    }
  }

  return (
    <WorkAreaShell
      id="quote"
      title="Quote e Fondo"
      preview={preview}
      highlights={[
        { value: board ? t.counted : null, label: "posizioni della stagione" },
        { value: board ? t.late : null, label: "in ritardo" },
        { value: board ? t.groups.DA_COMUNICARE : null, label: "da comunicare" },
        { value: board ? t.groups.DA_VERIFICARE : null, label: "da verificare" },
        { value: board ? t.groups.SALDATO : null, label: pct === null ? "saldate" : `saldate · incassato ${pct}%` },
      ]}
      note={<>Copia di sola lettura del Gestionale: le correzioni si fanno nel foglio, l'app si aggiorna da sola. L'app non incassa e non conserva IBAN né ISEE.</>}
    >
      {!data.connected ? (
        <EmptyState title="Accesso non attivo">Entra con il tuo account della società per vedere le quote.</EmptyState>
      ) : data.error ? (
        <EmptyState title="Dati non disponibili" action={<button type="button" className={btnGhost} onClick={() => void refresh()}>Riprova</button>}>{data.error}</EmptyState>
      ) : !board ? (
        <EmptyState title="Area riservata">Le quote sono visibili a Direzione, Segreteria e Tesoreria. Se ti serve l'accesso chiedilo alla Direzione.</EmptyState>
      ) : (
        <>
          <Card id="quote-stagione" title={`Stagione ${season}`}
            sub={<>Copia del Gestionale del <b>{itDateTime(board.sync?.syncedAt)}</b>{board.sync?.sourceModifiedAt ? <> · foglio modificato il {itDateTime(board.sync.sourceModifiedAt)}</> : null}</>}
            aside={<button type="button" onClick={() => void refresh()} disabled={busy} className={btnGhost} aria-label="Ricarica i dati"><RefreshCw className={`size-4 ${busy ? "animate-spin" : ""}`} aria-hidden="true" /></button>}>
            <div className="grid grid-cols-2 gap-2 px-4 sm:grid-cols-4 sm:px-[18px]" data-testid="quote-totals">
              <Total label={`Dovuto · ${t.counted} posizioni`} value={euro(t.feeTotal)} />
              <Total label="Pagato" value={euro(t.paid)} tone="ok" />
              <Total label="Residuo da incassare" value={euro(t.residual)} />
              <Total label="Scaduto oggi" value={euro(t.overdue)} tone={t.overdue > 0 ? "crit" : undefined} />
            </div>
            <GroupBar groups={t.groups} total={positions.length} onPick={(g) => setFilter(g)} />
            <p className="m-0 px-4 pb-4 text-[13.5px] text-[var(--in-sub)] sm:px-[18px]">
              {t.linked} posizioni su {t.counted} collegate a una persona del club · {t.fund} con Fondo Solidale · {t.excluded} fuori conteggio.
            </p>
          </Card>

          <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[minmax(0,1fr)_400px]">
            <div className="flex min-w-0 flex-col gap-[18px]">
              <Card id="quote-elenco" title="Lista di lavoro" sub={`${shown.length} mostrate su ${positions.length}. Prima chi è in ritardo, poi da comunicare e da verificare.`}>
                <div className="flex flex-col gap-3 px-4 pb-3 sm:px-[18px]">
                  <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtra per stato">
                    {FEE_FILTERS.map((f) => (
                      <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}
                        className={`scd-focus inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-[14px] font-semibold ${filter === f.id ? "border-[var(--in-info)] bg-[var(--in-info)] text-white" : "border-[var(--in-line)] bg-white"}`}>
                        {f.label}<span className="tabular-nums opacity-80">{filterCount(positions, f.id)}</span>
                      </button>
                    ))}
                  </div>
                  {filter !== "lavoro" && filter !== "tutti" && <p className="m-0 text-[13.5px] text-[var(--in-sub)]">{GROUP_HELP[filter]}</p>}
                  <label className="relative block">
                    <span className="sr-only">Cerca per nome, codice, categoria o annata</span>
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--in-sub)]" aria-hidden="true" />
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca nome, codice, categoria, annata"
                      className="h-11 w-full rounded-[10px] border border-[var(--in-line)] bg-white pl-9 pr-3 text-[15px] outline-none focus:border-[var(--in-info)]" />
                  </label>
                </div>
                {shown.length === 0 ? (
                  <div className="px-4 pb-4 sm:px-[18px]"><EmptyState title="Nessuna posizione">Niente da mostrare con questo filtro.</EmptyState></div>
                ) : (
                  <ul className="m-0 list-none p-0" data-testid="quote-list">
                    {shown.map((p) => <PositionRow key={p.code} p={p} onOpen={() => setOpen(p.code)} />)}
                  </ul>
                )}
              </Card>

              <Card id="quote-categorie" title="Per categoria" sub="Posizioni conteggiate (esclusi fuori)." >
                <div className="overflow-x-auto px-4 pb-4 sm:px-[18px]">
                  <table className="w-full min-w-[560px] border-collapse text-[14px] tabular-nums" data-testid="quote-categories">
                    <thead>
                      <tr className="text-left text-[12.5px] text-[var(--in-sub)]">
                        <th scope="col" className="py-2 pr-2 font-semibold">Categoria</th>
                        <th scope="col" className="px-2 py-2 text-right font-semibold">Pers.</th>
                        <th scope="col" className="px-2 py-2 text-right font-semibold">Dovuto</th>
                        <th scope="col" className="px-2 py-2 text-right font-semibold">Pagato</th>
                        <th scope="col" className="px-2 py-2 text-right font-semibold">Residuo</th>
                        <th scope="col" className="py-2 pl-2 text-right font-semibold">Scaduto</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cats.map((c) => (
                        <tr key={c.category} className="border-t border-[var(--in-line)]">
                          <th scope="row" className="py-2 pr-2 text-left font-semibold">
                            {c.category}
                            {(c.late > 0 || c.toCheck > 0) && (
                              <span className="ml-1.5 text-[12.5px] font-medium text-[var(--in-sub)]">
                                {[c.late ? `${c.late} in ritardo` : null, c.toCheck ? `${c.toCheck} da sistemare` : null].filter(Boolean).join(" · ")}
                              </span>
                            )}
                          </th>
                          <td className="px-2 py-2 text-right">{c.people}</td>
                          <td className="px-2 py-2 text-right">{euro(c.feeTotal)}</td>
                          <td className="px-2 py-2 text-right">{euro(c.paid)}</td>
                          <td className="px-2 py-2 text-right">{euro(c.residual)}</td>
                          <td className={`py-2 pl-2 text-right ${c.overdue > 0 ? "font-bold text-[#9a1d14]" : ""}`}>{euro(c.overdue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>

            <div className="flex min-w-0 flex-col gap-[18px]">
              <Card id="quote-rate" title="Calendario rate" sub="Scadenze decise dalla Direzione Generale l'08/10. Le date comunicate non si spostano.">
                <ol className="m-0 list-none p-0" data-testid="quote-calendar">
                  {cal.map((r) => (
                    <li key={r.due} className={`flex items-center gap-3 border-t border-[var(--in-line)] px-4 py-3 sm:px-[18px] ${r.due < today ? "" : "bg-[#fffbe6]/40"}`}>
                      <span className="w-14 flex-none font-title text-[17px] font-black tabular-nums">{itDay(r.due).slice(0, 5)}</span>
                      <span className="min-w-0 flex-1 text-[14px] leading-snug">
                        <b className="block">{r.plans.map(planLabel).join(", ")}</b>
                        <span className="text-[var(--in-sub)]">{r.people} rate · {euro(r.amount)}</span>
                      </span>
                      {r.open > 0 ? <Chip tone={r.due < today ? "crit" : "warn"}>{r.due < today ? "aperto" : "da incassare"} {euro(r.open)}</Chip> : r.people > 0 ? <Chip tone="ok">coperto</Chip> : null}
                    </li>
                  ))}
                </ol>
              </Card>
              <Card id="quote-regole" title="Regole della stagione">
                <ul className="m-0 flex list-disc flex-col gap-1.5 px-4 pb-4 pl-9 text-[14.5px] leading-snug sm:px-[18px] sm:pl-10">
                  {FEE_RULES.map((r) => <li key={r}>{r}</li>)}
                </ul>
              </Card>
              <SourcesBox id="quote" />
            </div>
          </div>
          {current && <PositionDialog p={current} season={season} today={today} onClose={() => setOpen(null)} />}
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

function GroupBar({ groups, total, onPick }: { groups: Record<FeeGroup, number>; total: number; onPick: (g: FeeGroup) => void }) {
  if (total === 0) return null;
  return (
    <div className="px-4 py-3 sm:px-[18px]">
      <div className="flex h-3 overflow-hidden rounded-full bg-[var(--in-line)]" aria-hidden="true">
        {FEE_GROUPS.map((g) => (groups[g] ? <span key={g} className={BAR[g]} style={{ width: `${(groups[g] / total) * 100}%` }} /> : null))}
      </div>
      <ul className="m-0 mt-2 flex list-none flex-wrap gap-x-3 gap-y-1 p-0 text-[13.5px]" data-testid="quote-groups">
        {FEE_GROUPS.map((g) => (
          <li key={g}>
            <button type="button" onClick={() => onPick(g)} className="scd-focus inline-flex items-center gap-1.5 rounded-sm">
              <span className={`size-2.5 rounded-full ${BAR[g]}`} aria-hidden="true" />
              {GROUP_LABEL[g]} <b className="tabular-nums">{groups[g]}</b>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PositionRow({ p, onOpen }: { p: FeePosition; onOpen: () => void }) {
  return (
    <li className="border-t border-[var(--in-line)]">
      <button type="button" onClick={onOpen} className="scd-focus flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[#f7fbff] sm:px-[18px]">
        <span className="min-w-0 flex-1">
          <b className="block truncate text-[15.5px]">{p.name ?? `Posizione ${p.code}`}</b>
          <span className="block truncate text-[13px] text-[var(--in-sub)]">
            {[p.category ?? "categoria da verificare", p.birthYear, planLabel(p.plan), p.fund ? "Fondo Solidale" : null, p.name ? null : "non collegata"].filter(Boolean).join(" · ")}
          </span>
        </span>
        <span className="flex flex-none flex-col items-end gap-1 text-right">
          <Chip tone={GROUP_TONE[p.group]}>{GROUP_LABEL[p.group]}</Chip>
          <span className="text-[13px] tabular-nums text-[var(--in-sub)]">
            {(p.overdue ?? 0) > 0 ? <b className="text-[#9a1d14]">scaduto {euro(p.overdue)}</b> : `residuo ${euro(p.residual)}`}
          </span>
        </span>
      </button>
    </li>
  );
}

function PositionDialog({ p, season, today, onClose }: { p: FeePosition; season: string; today: string; onClose: () => void }) {
  const rates = schedule(p, season, today);
  const rows: Array<[string, string | null]> = [
    ["Codice Gestionale", p.code],
    ["Categoria", [p.category ?? "da verificare", p.birthYear].filter(Boolean).join(" · ")],
    ["Stato nel foglio", p.status],
    ["Nota stato", p.override],
    ["Regola famiglia", p.familyRule],
    ["Fondo Solidale", p.fund ? "Accolto" : null],
    ["Mail quota", p.noticeSent === true ? `Inviata${p.noticeDate ? ` (${p.noticeDate})` : ""}` : p.noticeSent === false ? "Non ancora inviata" : null],
    ["Prossima azione", p.action],
  ];
  return (
    <Dialog title={p.name ?? `Posizione ${p.code}`} onClose={onClose} testId="quote-position">
      <div className="mt-3 flex flex-col gap-3 text-[14.5px]">
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone={GROUP_TONE[p.group]}>{GROUP_LABEL[p.group]}</Chip>
          <span className="text-[var(--in-sub)]">{GROUP_HELP[p.group]}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Total label="Quota" value={euro(p.feeTotal)} />
          <Total label="Pagato" value={euro(p.paid)} tone="ok" />
          <Total label="Residuo" value={euro(p.residual)} />
          <Total label="Scaduto" value={euro(p.overdue)} tone={(p.overdue ?? 0) > 0 ? "crit" : undefined} />
        </div>
        <section aria-label="Rate">
          <h3 className="m-0 text-[15px] font-bold">{planLabel(p.plan)}</h3>
          {rates.length === 0 ? (
            <p className="m-0 text-[var(--in-sub)]">Nessun piano rate nel Gestionale.</p>
          ) : (
            <ol className="m-0 mt-1 list-none p-0">
              {rates.map((r) => (
                <li key={r.n} className="flex items-center gap-3 border-t border-[var(--in-line)] py-2 tabular-nums">
                  <span className="w-16 flex-none font-semibold">Rata {r.n}</span>
                  <span className="flex-1">{r.due ? `entro ${itDay(r.due).slice(0, 5)}` : "data da definire"}</span>
                  <b>{euro(r.amount)}</b>
                  <Chip tone={r.covered ? "ok" : r.late ? "crit" : "mute"}>{r.covered ? "pagata" : r.late ? "scaduta" : "da pagare"}</Chip>
                </li>
              ))}
            </ol>
          )}
        </section>
        <dl className="m-0 grid grid-cols-[minmax(0,140px)_minmax(0,1fr)] gap-x-3 gap-y-1.5">
          {rows.filter(([, v]) => v).map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-[var(--in-sub)]">{k}</dt>
              <dd className="m-0 break-words">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="m-0 rounded-[10px] bg-[var(--in-info-bg)] px-3 py-2 text-[13.5px]">
          Per correggere importi, pagamenti o stato modifica il Gestionale: la copia si aggiorna alla prossima sincronizzazione. Solleciti e comunicazioni partono solo dopo l'ok della Direzione.
        </p>
      </div>
    </Dialog>
  );
}
