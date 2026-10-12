import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, ChevronDown, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { Card, Chip, type ChipTone } from "@/components/scd/interior-ui";
import { EmptyState, SourcesBox, WorkAreaGateView, WorkAreaShell, workAreaHead } from "@/components/scd/work-area-ui";
import {
  KIND_LABEL,
  TODO_LABEL,
  certCounts,
  certTodo,
  daysLeft,
  filterCerts,
  rowKey,
  teamProgress,
  validateCertDate,
  type CertFilter,
  type CertKind,
  type CertRow,
  type CertTodo,
} from "@/lib/certificates";
import { getCertificates, saveCertificate, type CertificatesData } from "@/lib/certificates.functions";
import { itDate } from "@/lib/people";
import { getWorkAreaGate } from "@/lib/work-areas.functions";

export const Route = createFileRoute("/segreteria_/certificati")({
  loader: async () => {
    const gate = await getWorkAreaGate({ data: { area: "certificati" } });
    if (gate.view !== "page") return { gate, interior: false as const };
    const data = await getCertificates();
    return { gate, interior: true as const, data };
  },
  head: ({ loaderData }) => workAreaHead("certificati", loaderData?.gate),
  component: CertificatiRoute,
});

function CertificatiRoute() {
  const d = Route.useLoaderData();
  return (
    <WorkAreaGateView id="certificati" gate={d.gate}>
      {d.interior && <CertificatiPage initial={d.data} preview={d.gate.preview} />}
    </WorkAreaGateView>
  );
}

const TODO_TONE: Record<CertTodo, ChipTone> = { manca: "mute", scaduto: "crit", "in-scadenza": "warn", "da-controllare": "info", "a-posto": "ok" };
const FILTERS: ReadonlyArray<{ id: NonNullable<CertFilter["todo"]>; label: string }> = [
  { id: "da-fare", label: "Da fare" },
  { id: "scaduto", label: "Scaduti" },
  { id: "manca", label: "Senza data" },
  { id: "in-scadenza", label: "In scadenza" },
  { id: "da-controllare", label: "Da controllare" },
  { id: "tutti", label: "Tutti" },
];

function CertificatiPage({ initial, preview }: { initial: CertificatesData; preview: boolean }) {
  const [data, setData] = useState(initial);
  const [filter, setFilter] = useState<CertFilter>({ todo: "da-fare" });
  const [open, setOpen] = useState<string | null>(null);
  const reload = useServerFn(getCertificates);
  const counts = useMemo(() => certCounts(data.rows, data.today), [data]);
  const teams = useMemo(() => teamProgress(data.rows, data.today), [data]);
  const shown = useMemo(() => filterCerts(data.rows, filter, data.today), [data, filter]);
  const playable = counts.total - counts.manca - counts.scaduto;

  /** After a save: update that athlete everywhere (two teams = two rows) and open the next row of the list. */
  function applySaved(athleteId: string, patch: Pick<CertRow, "expiresAt" | "status" | "kind">) {
    const idx = shown.findIndex((r) => r.athleteId === athleteId);
    const next = shown.slice(idx + 1).find((r) => r.athleteId !== athleteId) ?? null;
    setData((d) => ({ ...d, rows: d.rows.map((r) => (r.athleteId === athleteId ? { ...r, ...patch, checkedAt: patch.status === "VERIFIED" ? new Date().toISOString() : null } : r)) }));
    setOpen(next ? rowKey(next) : null);
    reload()
      .then((fresh) => setData(fresh))
      .catch(() => undefined);
  }

  return (
    <WorkAreaShell
      id="certificati"
      preview={preview}
      editable
      highlights={[
        { value: data.connected ? playable : null, label: `atleti su ${data.connected ? counts.total : "—"} con certificato valido` },
        { value: data.connected ? counts.scaduto : null, label: "scaduti" },
        { value: data.connected ? counts.manca : null, label: "senza data" },
        { value: data.connected ? counts["da-controllare"] : null, label: "da controllare sul cartaceo" },
      ]}
      note={<>Senza certificato valido il giorno della gara la convocazione non parte. Una data presa dal modulo d'iscrizione resta "dichiarata" finché non la controllate.</>}
    >
      <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-[18px]">
          <Card id="cert-elenco" title="Atleti" sub={data.connected ? `${shown.length} in elenco · tocca un nome per inserire la data` : "Scadenze dei certificati medici."}>
            <div className="px-4 pb-4 sm:px-[18px]">
              {!data.connected ? (
                <EmptyState title="Collegamento al database non attivo">{data.error ?? "Serve un accesso Direzione o Segreteria."}</EmptyState>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="flex min-w-[200px] flex-1 items-center gap-2 rounded-[10px] border border-[var(--in-line)] bg-white px-3">
                      <Search className="size-4 text-[var(--in-sub)]" aria-hidden="true" />
                      <input type="search" placeholder="Cerca nome o anno" value={filter.q ?? ""} onChange={(e) => setFilter({ ...filter, q: e.target.value })} className="h-11 w-full bg-transparent text-[15px] outline-none" aria-label="Cerca atleta" />
                    </label>
                    <select value={filter.team ?? ""} onChange={(e) => setFilter({ ...filter, team: e.target.value || undefined })} className="scd-focus h-11 rounded-[10px] border border-[var(--in-line)] bg-white px-2 text-[14.5px]" aria-label="Squadra">
                      <option value="">Tutte le squadre</option>
                      {teams.map((t) => (
                        <option key={t.code} value={t.code}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1" role="group" aria-label="Cosa mostrare">
                    {FILTERS.map((f) => {
                      const n = f.id === "da-fare" ? counts.total - counts["a-posto"] : f.id === "tutti" ? counts.total : counts[f.id];
                      const on = (filter.todo ?? "da-fare") === f.id;
                      return (
                        <button key={f.id} type="button" aria-pressed={on} onClick={() => setFilter({ ...filter, todo: f.id })} className={`scd-focus h-11 shrink-0 rounded-full px-3.5 text-[14px] font-semibold ${on ? "bg-[var(--in-info)] text-white" : "bg-[#eef3f9] text-[var(--in-ink)]"}`}>
                          {f.label} <span className="tabular-nums opacity-80">{n}</span>
                        </button>
                      );
                    })}
                  </div>
                  {shown.length === 0 ? (
                    <div className="mt-3">
                      <EmptyState title={filter.todo === "da-fare" ? "Niente da fare qui" : "Nessun risultato"}>
                        {filter.todo === "da-fare" ? "Tutti i certificati di questa selezione sono validi e controllati." : "Prova a cambiare squadra o filtro."}
                      </EmptyState>
                    </div>
                  ) : (
                    <ul className="m-0 mt-2 list-none divide-y divide-[var(--in-line)] p-0" data-testid="cert-list">
                      {shown.map((r) => (
                        <CertItem
                          key={rowKey(r)}
                          row={r}
                          today={data.today}
                          canWrite={data.canWrite}
                          open={open === rowKey(r)}
                          onToggle={() => setOpen(open === rowKey(r) ? null : rowKey(r))}
                          onSaved={(patch) => applySaved(r.athleteId, patch)}
                        />
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-[18px]">
          {data.connected && teams.length > 0 && (
            <Card id="cert-squadre" title="Per squadra" sub="Atleti che oggi possono giocare.">
              <ul className="m-0 list-none px-4 pb-4 sm:px-[18px]">
                {teams.map((t) => {
                  const pct = t.total ? Math.round((t.ok / t.total) * 100) : 0;
                  return (
                    <li key={t.code}>
                      <button type="button" onClick={() => setFilter({ ...filter, team: filter.team === t.code ? undefined : t.code })} aria-pressed={filter.team === t.code} className={`scd-focus grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 rounded-lg px-2 py-2 text-left ${filter.team === t.code ? "bg-[var(--in-info-bg)]" : "hover:bg-[#f7fbff]"}`}>
                        <span className="truncate text-[15px] font-semibold">{t.name}</span>
                        <span className="tabular-nums text-[14px] text-[var(--in-sub)]">{t.ok}/{t.total}</span>
                        <span className="col-span-2 mt-1 h-1.5 overflow-hidden rounded-full bg-[#eef3f9]" aria-hidden="true">
                          <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: pct === 100 ? "var(--in-ok)" : "var(--in-info)" }} />
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Card>
          )}
          <Card title="Come si fa">
            <ol className="m-0 grid list-decimal gap-1.5 px-4 pb-4 pl-9 text-[14.5px] leading-snug sm:px-[18px] sm:pl-10">
              <li>Scegli la squadra e tieni davanti i certificati.</li>
              <li>Tocca il nome, scrivi la data di scadenza e il tipo.</li>
              <li>Se hai il certificato in mano, lascia la spunta "Ho visto il certificato".</li>
              <li>Salva: si apre da solo l'atleta successivo.</li>
            </ol>
          </Card>
          <SourcesBox id="certificati" />
        </div>
      </div>
    </WorkAreaShell>
  );
}

function CertItem({
  row,
  today,
  canWrite,
  open,
  onToggle,
  onSaved,
}: {
  row: CertRow;
  today: string;
  canWrite: boolean;
  open: boolean;
  onToggle: () => void;
  onSaved: (patch: Pick<CertRow, "expiresAt" | "status" | "kind">) => void;
}) {
  const todo = certTodo(row, today);
  const left = daysLeft(row.expiresAt, today);
  const panelId = `cert-${rowKey(row)}`;
  return (
    <li>
      <button type="button" onClick={onToggle} aria-expanded={open} aria-controls={panelId} className={`scd-focus grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-2 py-2.5 text-left ${open ? "bg-[var(--in-info-bg)]" : "hover:bg-[#f7fbff]"}`}>
        <span className="min-w-0">
          <b className="block truncate text-[15.5px] leading-tight">{row.name}</b>
          <small className="mt-0.5 block truncate text-[13px] text-[var(--in-sub)]">
            {row.teamName ?? "Senza squadra"}
            {row.birthYear ? ` · ${row.birthYear}` : ""}
            {row.expiresAt ? ` · scade il ${itDate(row.expiresAt)}` : ""}
            {row.kind ? ` · ${KIND_LABEL[row.kind].toLowerCase()}` : ""}
          </small>
        </span>
        <span className="flex items-center gap-1.5">
          <Chip tone={TODO_TONE[todo]}>
            {todo === "in-scadenza" && left !== null ? `tra ${left} gg` : TODO_LABEL[todo]}
          </Chip>
          <ChevronDown className={`size-4 text-[var(--in-sub)] transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
        </span>
      </button>
      {open && (
        <div id={panelId} className="px-2 pb-3">
          {canWrite ? <CertEditor row={row} today={today} onSaved={onSaved} /> : <p className="m-0 text-[14px] text-[var(--in-sub)]">Puoi vedere le scadenze; solo Direzione e Segreteria le modificano.</p>}
        </div>
      )}
    </li>
  );
}

function CertEditor({ row, today, onSaved }: { row: CertRow; today: string; onSaved: (patch: Pick<CertRow, "expiresAt" | "status" | "kind">) => void }) {
  const save = useServerFn(saveCertificate);
  const [date, setDate] = useState(row.expiresAt ?? "");
  const [kind, setKind] = useState<CertKind | null>(row.kind);
  const [seen, setSeen] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const dateRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    dateRef.current?.focus();
    dateRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, []);
  const invalid = validateCertDate(date, today);
  const unchanged = date === (row.expiresAt ?? "") && kind === row.kind && (date === "" || (seen ? row.status === "VERIFIED" : row.status === "DECLARED"));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (invalid || busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await save({ data: { athleteId: row.athleteId, expiresAt: date, kind: date ? kind : null, verified: seen, note: "" } });
      if (r.ok) onSaved({ expiresAt: date || null, status: date ? (seen ? "VERIFIED" : "DECLARED") : null, kind: date ? kind : null });
      else setMsg({ ok: false, text: r.message });
    } catch {
      setMsg({ ok: false, text: "Salvataggio non riuscito, riprova." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-[12px] border border-[var(--in-line)] bg-white p-3" data-testid="cert-editor">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <label className="grid gap-1 text-[14px] font-semibold">
          Scade il
          <input ref={dateRef} type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11 w-full rounded-[10px] border border-[var(--in-line)] bg-white px-3 text-[16px] font-normal text-[var(--in-ink)] outline-none focus:border-[var(--in-info)]" aria-invalid={Boolean(invalid)} aria-describedby={invalid ? `${row.athleteId}-err` : undefined} />
        </label>
        <fieldset className="m-0 grid gap-1 border-0 p-0">
          <legend className="mb-1 text-[14px] font-semibold">Tipo</legend>
          <div className="flex gap-1.5">
            {(["AGONISTICO", "NON_AGONISTICO"] as const).map((k) => (
              <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(kind === k ? null : k)} className={`scd-focus h-11 flex-1 rounded-[10px] border px-2 text-[14px] font-semibold ${kind === k ? "border-[var(--in-info)] bg-[var(--in-info-bg)] text-[var(--in-info)]" : "border-[var(--in-line)] bg-white"}`}>
                {KIND_LABEL[k]}
              </button>
            ))}
          </div>
        </fieldset>
      </div>
      {invalid && <p id={`${row.athleteId}-err`} className="m-0 text-[14px] font-semibold text-[var(--in-crit)]" role="alert">{invalid}</p>}
      <label className="flex items-center gap-2 text-[14.5px]">
        <input type="checkbox" checked={seen} onChange={(e) => setSeen(e.target.checked)} className="size-5 accent-[var(--in-info)]" />
        Ho visto il certificato
      </label>
      {!seen && date && <p className="m-0 text-[13.5px] text-[var(--in-sub)]">La data resta "dichiarata": vale per le convocazioni, ma comparirà tra quelle da controllare.</p>}
      {row.status === "DECLARED" && row.expiresAt && <p className="m-0 text-[13.5px] text-[var(--in-sub)]">Data attuale presa dal modulo d'iscrizione.</p>}
      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" disabled={Boolean(invalid) || busy || unchanged} className="scd-focus inline-flex h-11 items-center gap-2 rounded-[10px] bg-[var(--in-info)] px-4 text-[15px] font-bold text-white disabled:opacity-50" data-testid="cert-save">
          <Check className="size-4" aria-hidden="true" />
          {busy ? "Salvo…" : "Salva"}
        </button>
        {row.expiresAt && date !== "" && (
          <button type="button" onClick={() => setDate("")} className="scd-focus h-11 rounded-[10px] px-3 text-[14px] font-semibold text-[var(--in-sub)] underline">
            Togli la data
          </button>
        )}
        {msg && <span className={`text-[14px] font-semibold ${msg.ok ? "text-[var(--in-ok)]" : "text-[var(--in-crit)]"}`} role="status">{msg.text}</span>}
      </div>
    </form>
  );
}

