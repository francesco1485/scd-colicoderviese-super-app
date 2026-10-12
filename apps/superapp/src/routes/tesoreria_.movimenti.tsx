import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, Link2, RefreshCw, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Dialog } from "@/components/scd/Dialog";
import { Card, Chip, type ChipTone } from "@/components/scd/interior-ui";
import { EmptyState, SourcesBox, WorkAreaGateView, WorkAreaShell, workAreaHead } from "@/components/scd/work-area-ui";
import { euro, itDateTime, itDay } from "@/lib/fees";
import {
  CATEGORY_LABEL,
  COMPARE_HELP,
  LEDGER_FILTERS,
  MATCH_LABEL,
  compareState,
  filterEntries,
  ledgerFilterCount,
  monthLabel,
  type LedgerEntry,
  type LedgerFilter,
  type MatchState,
} from "@/lib/ledger";
import { decideLedger, getLedgerBoard, type LedgerData } from "@/lib/ledger.functions";
import { getWorkAreaGate } from "@/lib/work-areas.functions";

/** T3 Movimenti del conto (r82, UD-083): register of the SumUp business account. Direzione and Tesoreria only. */
export const Route = createFileRoute("/tesoreria_/movimenti")({
  loader: async () => {
    const gate = await getWorkAreaGate({ data: { area: "movimenti" } });
    const data: LedgerData = gate.view === "page" ? await getLedgerBoard() : { connected: false, board: null, error: null };
    return { gate, interior: gate.view === "page", data };
  },
  head: ({ loaderData }) => workAreaHead("movimenti", loaderData?.gate),
  component: LedgerRoute,
});

function LedgerRoute() {
  const d = Route.useLoaderData();
  return (
    <WorkAreaGateView id="movimenti" gate={d.gate}>
      {d.interior && <LedgerPage initial={d.data} preview={d.gate.preview} />}
    </WorkAreaGateView>
  );
}

const STATE_TONE: Readonly<Record<MatchState, ChipTone>> = { DA_ABBINARE: "warn", PROPOSTO: "info", VERIFICATO: "ok", NON_APPLICABILE: "mute" };
const btnGhost = "scd-focus inline-flex h-11 items-center justify-center gap-2 rounded-[10px] border border-[var(--in-line)] bg-white px-4 text-[15px] font-semibold disabled:opacity-50";
const btnMain = "scd-focus inline-flex h-11 items-center justify-center gap-2 rounded-[10px] bg-[#F8D000] px-4 text-[15px] font-bold text-[#062a52] disabled:opacity-50";

function signed(n: number): string {
  return `${n > 0 ? "+" : n < 0 ? "−" : ""}${euro(Math.abs(n))}`;
}

function LedgerPage({ initial, preview }: { initial: LedgerData; preview: boolean }) {
  const [data, setData] = useState(initial);
  const [filter, setFilter] = useState<LedgerFilter>("da-fare");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const reload = useServerFn(getLedgerBoard);
  const board = data.board;
  const entries = board?.entries ?? [];
  const shown = useMemo(() => filterEntries(entries, filter, q), [entries, filter, q]);
  const diffs = (board?.feeCompare ?? []).filter((r) => compareState(r) !== "allineato");
  const current = entries.find((e) => e.code === open) ?? null;
  const s = board?.summary;

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

  return (
    <WorkAreaShell
      id="movimenti"
      title="Movimenti del conto"
      preview={preview}
      highlights={[
        { value: s ? s.movements : null, label: "movimenti registrati" },
        { value: s ? s.toMatch : null, label: "da abbinare" },
        { value: s ? s.proposed : null, label: "abbinati da verificare" },
        { value: board ? diffs.length : null, label: "quote: banca ≠ Gestionale" },
        { value: s ? s.brokenBalances : null, label: "saldi che non tornano" },
      ]}
      note={<>Registro del conto SumUp della società: ogni movimento entra una volta e non si modifica. Niente IBAN e niente nomi delle famiglie nel registro. L'app non fa pagamenti.</>}
    >
      {!data.connected ? (
        <EmptyState title="Accesso non attivo">Entra con il tuo account della società per vedere i movimenti.</EmptyState>
      ) : data.error ? (
        <EmptyState title="Dati non disponibili" action={<button type="button" className={btnGhost} onClick={() => void refresh()}>Riprova</button>}>{data.error}</EmptyState>
      ) : !board || !s ? (
        <EmptyState title="Area riservata">I movimenti del conto sono visibili a Direzione e Tesoreria.</EmptyState>
      ) : (
        <>
          <Card id="mov-quadro" title="Conto SumUp della società"
            sub={<>Dal {itDay(s.firstAt?.slice(0, 10) ?? null)} al {itDateTime(s.lastAt)} · {s.brokenBalances === 0 ? "saldi progressivi verificati: tornano tutti" : <b className="text-[#9a1d14]">{s.brokenBalances} saldi non tornano: controllare l'estratto</b>}</>}
            aside={<button type="button" onClick={() => void refresh()} disabled={busy} className={btnGhost} aria-label="Ricarica i dati"><RefreshCw className={`size-4 ${busy ? "animate-spin" : ""}`} aria-hidden="true" /></button>}>
            <div className="grid grid-cols-2 gap-2 px-4 pb-4 sm:grid-cols-4 sm:px-[18px]" data-testid="mov-totals">
              <Total label="Saldo" value={euro(s.balance)} />
              <Total label="Entrate" value={euro(s.incoming)} tone="ok" />
              <Total label="Uscite" value={euro(s.outgoing)} />
              <Total label="Commissioni" value={euro(s.fees)} />
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[minmax(0,1fr)_420px]">
            <div className="flex min-w-0 flex-col gap-[18px]">
              <Card id="mov-lista" title="Movimenti" sub={`${shown.length} mostrati su ${entries.length}. I bonifici delle famiglie si abbinano alla posizione quote; la Tesoreria verifica.`}>
                <div className="flex flex-col gap-3 px-4 pb-3 sm:px-[18px]">
                  <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtra i movimenti">
                    {LEDGER_FILTERS.map((f) => (
                      <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}
                        className={`scd-focus inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-[14px] font-semibold ${filter === f.id ? "border-[var(--in-info)] bg-[var(--in-info)] text-white" : "border-[var(--in-line)] bg-white"}`}>
                        {f.label}<span className="tabular-nums opacity-80">{ledgerFilterCount(entries, f.id)}</span>
                      </button>
                    ))}
                  </div>
                  <label className="relative block">
                    <span className="sr-only">Cerca per atleta, fornitore, categoria o mese</span>
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--in-sub)]" aria-hidden="true" />
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca atleta, fornitore, categoria, mese"
                      className="h-11 w-full rounded-[10px] border border-[var(--in-line)] bg-white pl-9 pr-3 text-[15px] outline-none focus:border-[var(--in-info)]" />
                  </label>
                </div>
                {shown.length === 0 ? (
                  <div className="px-4 pb-4 sm:px-[18px]"><EmptyState title="Niente da fare">Nessun movimento con questo filtro.</EmptyState></div>
                ) : (
                  <ul className="m-0 list-none p-0" data-testid="mov-list">
                    {shown.slice(0, 200).map((e) => <EntryRow key={e.code} e={e} onOpen={() => setOpen(e.code)} />)}
                  </ul>
                )}
              </Card>
            </div>

            <div className="flex min-w-0 flex-col gap-[18px]">
              <Card id="mov-confronto" title="Quote: banca e Gestionale" sub="Per le posizioni abbinate: quanto è arrivato in banca e quanto segna il Gestionale.">
                {diffs.length === 0 ? (
                  <div className="px-4 pb-4 sm:px-[18px]"><EmptyState title="Tutto allineato">Le posizioni abbinate coincidono con il Gestionale.</EmptyState></div>
                ) : (
                  <ul className="m-0 list-none p-0" data-testid="mov-compare">
                    {diffs.slice(0, 30).map((r) => {
                      const st = compareState(r);
                      return (
                        <li key={r.ref} className="border-t border-[var(--in-line)] px-4 py-2.5 sm:px-[18px]">
                          <div className="flex items-center justify-between gap-2">
                            <b className="min-w-0 truncate text-[14.5px]">{r.label || `Posizione ${r.ref}`}</b>
                            <Chip tone={st === "banca-in-piu" ? "warn" : "info"}>{signed(r.difference)}</Chip>
                          </div>
                          <p className="m-0 text-[13px] text-[var(--in-sub)] tabular-nums">banca {euro(r.bank)} ({r.movements}) · Gestionale {euro(r.gestionale)} · {r.category ?? "categoria da verificare"}</p>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <p className="m-0 px-4 pb-4 pt-2 text-[13px] text-[var(--in-sub)] sm:px-[18px]">{COMPARE_HELP["banca-in-piu"]} {COMPARE_HELP["gestionale-in-piu"]}</p>
              </Card>
              <Card id="mov-mesi" title="Per mese">
                <div className="overflow-x-auto px-4 pb-4 sm:px-[18px]">
                  <table className="w-full min-w-[300px] border-collapse text-[14px] tabular-nums" data-testid="mov-months">
                    <thead><tr className="text-left text-[12.5px] text-[var(--in-sub)]"><th scope="col" className="py-2 pr-2 font-semibold">Mese</th><th scope="col" className="px-2 py-2 text-right font-semibold">Entrate</th><th scope="col" className="py-2 pl-2 text-right font-semibold">Uscite</th></tr></thead>
                    <tbody>
                      {board.months.map((m) => (
                        <tr key={m.month} className="border-t border-[var(--in-line)]">
                          <th scope="row" className="py-2 pr-2 text-left font-semibold capitalize">{monthLabel(m.month)}</th>
                          <td className="px-2 py-2 text-right">{euro(m.incoming)}</td>
                          <td className="py-2 pl-2 text-right">{euro(m.outgoing + m.fees)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
              <Card id="mov-categorie" title="Per categoria">
                <ul className="m-0 list-none p-0" data-testid="mov-categories">
                  {board.categories.map((c) => (
                    <li key={c.category} className="flex items-center justify-between gap-2 border-t border-[var(--in-line)] px-4 py-2 text-[14px] sm:px-[18px]">
                      <span>{CATEGORY_LABEL[c.category] ?? c.category} <span className="text-[var(--in-sub)]">· {c.count}</span></span>
                      <b className={`tabular-nums ${c.total < 0 ? "" : "text-[#0e6b25]"}`}>{signed(c.total)}</b>
                    </li>
                  ))}
                </ul>
              </Card>
              <SourcesBox id="movimenti" />
            </div>
          </div>
          {current && (
            <EntryDialog e={current} onClose={() => setOpen(null)}
              onSaved={(code, state, linkRef) => setData((prev) => prev.board ? { ...prev, board: { ...prev.board, entries: prev.board.entries.map((x) => (x.code === code ? { ...x, matchState: state, linkRef: linkRef ?? x.linkRef } : x)) } } : prev)} />
          )}
        </>
      )}
    </WorkAreaShell>
  );
}

function Total({ label, value, tone }: { label: string; value: string; tone?: "ok" | undefined }) {
  return (
    <div className={`min-w-0 rounded-xl px-3 py-2.5 ${tone === "ok" ? "bg-[var(--in-ok-bg)]" : "bg-[var(--in-info-bg)]"}`}>
      <span className="block font-title text-[21px] font-black leading-none tabular-nums">{value}</span>
      <span className="mt-1 block text-[13px] leading-tight text-[var(--in-sub)]">{label}</span>
    </div>
  );
}

function entryTitle(e: LedgerEntry): string {
  if (e.linkLabel) return e.linkLabel;
  if (e.counterparty) return e.counterparty;
  if (e.family) return "Bonifico da famiglia non abbinato";
  return CATEGORY_LABEL[e.category] ?? e.category;
}

function EntryRow({ e, onOpen }: { e: LedgerEntry; onOpen: () => void }) {
  return (
    <li className="border-t border-[var(--in-line)]">
      <button type="button" onClick={onOpen} className="scd-focus flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[#f7fbff] sm:px-[18px]">
        <span className="w-12 flex-none text-[13.5px] font-semibold tabular-nums">{itDay(e.bookedAt.slice(0, 10)).slice(0, 5)}</span>
        <span className="min-w-0 flex-1">
          <b className="block truncate text-[15px]">{entryTitle(e)}</b>
          <span className="block truncate text-[13px] text-[var(--in-sub)]">{[CATEGORY_LABEL[e.category] ?? e.category, e.months.length ? e.months.join(" e ") : null].filter(Boolean).join(" · ")}</span>
        </span>
        <span className="flex flex-none flex-col items-end gap-1 text-right">
          <b className={`text-[15px] tabular-nums ${e.amount > 0 ? "text-[#0e6b25]" : ""}`}>{signed(e.amount)}</b>
          {e.matchState !== "NON_APPLICABILE" && <Chip tone={STATE_TONE[e.matchState]}>{MATCH_LABEL[e.matchState]}</Chip>}
        </span>
      </button>
    </li>
  );
}

function EntryDialog({ e, onClose, onSaved }: { e: LedgerEntry; onClose: () => void; onSaved: (code: string, s: MatchState, linkRef: string | null) => void }) {
  const [feeRef, setFeeRef] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const decide = useServerFn(decideLedger);

  async function run(action: "verify" | "reopen" | "link" | "unlink" | "not_applicable") {
    setBusy(true);
    setMsg(null);
    try {
      const out = await decide({ data: { code: e.code, action, feeRef: feeRef.trim() || null, note: note.trim() || null } });
      setMsg({ ok: out.ok, text: out.message });
      if (out.ok && out.state) onSaved(e.code, out.state, out.linkRef ?? null);
    } catch {
      setMsg({ ok: false, text: "Operazione non riuscita. Riprova tra poco." });
    } finally {
      setBusy(false);
    }
  }

  const rows: Array<[string, string | null]> = [
    ["Data", itDateTime(e.bookedAt)],
    ["Categoria", CATEGORY_LABEL[e.category] ?? e.category],
    ["Mesi indicati", e.months.length ? e.months.join(", ") : null],
    ["Controparte", e.counterparty],
    ["Abbinato a", e.linkLabel ? `${e.linkLabel}${e.linkRef ? ` · ${e.linkRef}` : ""}` : null],
    ["Commissione", e.fee ? euro(e.fee) : null],
    ["Saldo dopo", euro(e.balance)],
    ["Codice movimento", e.code],
    ["Nota", e.note],
  ];
  return (
    <Dialog title={signed(e.amount)} onClose={onClose} testId="mov-dettaglio">
      <div className="mt-3 flex flex-col gap-3 text-[14.5px]">
        <div className="flex flex-wrap items-center gap-2">
          <b>{entryTitle(e)}</b>
          <Chip tone={STATE_TONE[e.matchState]}>{MATCH_LABEL[e.matchState]}</Chip>
        </div>
        <dl className="m-0 grid grid-cols-[minmax(0,140px)_minmax(0,1fr)] gap-x-3 gap-y-1.5">
          {rows.filter(([, v]) => v).map(([k, v]) => (
            <div key={k} className="contents"><dt className="text-[var(--in-sub)]">{k}</dt><dd className="m-0 break-words">{v}</dd></div>
          ))}
        </dl>
        {e.family && (
          <label className="flex flex-col gap-1">
            <span className="text-[13.5px] text-[var(--in-sub)]">Codice posizione del Gestionale (per abbinare a mano)</span>
            <input value={feeRef} onChange={(ev) => setFeeRef(ev.target.value)} placeholder="es. SCD-2627-001" className="h-11 rounded-[10px] border border-[var(--in-line)] px-3 text-[15px]" />
          </label>
        )}
        <label className="flex flex-col gap-1">
          <span className="text-[13.5px] text-[var(--in-sub)]">Nota (obbligatoria per "nessun abbinamento")</span>
          <input value={note} onChange={(ev) => setNote(ev.target.value)} maxLength={300} className="h-11 rounded-[10px] border border-[var(--in-line)] px-3 text-[15px]" />
        </label>
        {msg && <p role="status" className={`m-0 rounded-[10px] px-3 py-2 text-[14px] ${msg.ok ? "bg-[var(--in-ok-bg)]" : "bg-[#fdecea]"}`}>{msg.text}</p>}
        <div className="flex flex-wrap gap-2">
          {e.matchState === "PROPOSTO" && <button type="button" disabled={busy} onClick={() => void run("verify")} className={btnMain} data-testid="mov-verifica"><Check className="size-4" aria-hidden="true" />Confermo l'abbinamento</button>}
          {e.family && <button type="button" disabled={busy || feeRef.trim() === ""} onClick={() => void run("link")} className={btnGhost}><Link2 className="size-4" aria-hidden="true" />Abbina a questa posizione</button>}
          {e.linkRef && <button type="button" disabled={busy} onClick={() => void run("unlink")} className={btnGhost}>Togli abbinamento</button>}
          {e.matchState !== "NON_APPLICABILE" && <button type="button" disabled={busy || note.trim() === ""} onClick={() => void run("not_applicable")} className={btnGhost}>Nessun abbinamento</button>}
          {(e.matchState === "VERIFICATO" || e.matchState === "NON_APPLICABILE") && <button type="button" disabled={busy} onClick={() => void run("reopen")} className={btnGhost}>Riapri</button>}
        </div>
        <p className="m-0 rounded-[10px] bg-[var(--in-info-bg)] px-3 py-2 text-[13.5px]">Verificare un bonifico non cambia il Gestionale: la quota pagata si aggiorna nel foglio, poi la copia segue da sola.</p>
      </div>
    </Dialog>
  );
}
