import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, Clock, ExternalLink, Hand, HelpCircle, Lock, RefreshCw, RotateCcw, Undo2, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Dialog } from "@/components/scd/Dialog";
import { Card, Chip, type ChipTone } from "@/components/scd/interior-ui";
import { EmptyState, SourcesBox, WorkAreaGateView, WorkAreaShell, workAreaHead } from "@/components/scd/work-area-ui";
import {
  ACCEPT_HINT,
  KIND_LABEL,
  MACHINE_LABEL,
  STATUS_LABEL,
  agoLabel,
  alreadyAligned,
  filterQueue,
  needsNote,
  queueHealth,
  type Proposal,
  type ProposalAction,
  type QueueFilter,
} from "@/lib/proposals";
import { decideProposal, getProposalQueue, type QueueData } from "@/lib/proposals.functions";
import { getWorkAreaGate } from "@/lib/work-areas.functions";

/** Coda di lavoro (T5, r79): the machines propose, a person confirms. Office only. */
export const Route = createFileRoute("/gestionale/coda")({
  loader: async () => {
    const gate = await getWorkAreaGate({ data: { area: "coda" } });
    const data: QueueData = gate.view === "page" ? await getProposalQueue() : { connected: false, queue: null, error: null };
    return { gate, interior: gate.view === "page", now: new Date().toISOString(), data };
  },
  head: ({ loaderData }) => workAreaHead("coda", loaderData?.gate),
  component: CodaRoute,
});

function CodaRoute() {
  const d = Route.useLoaderData();
  return (
    <WorkAreaGateView id="coda" gate={d.gate}>
      {d.interior && <QueuePage initial={d.data} now={d.now} preview={d.gate.preview} />}
    </WorkAreaGateView>
  );
}

const STATUS_TONE: Readonly<Record<Proposal["status"], ChipTone>> = {
  NEW: "warn",
  IN_PROGRESS: "info",
  NEEDS_INFO: "warn",
  SNOOZED: "mute",
  ACCEPTED: "ok",
  REJECTED: "mute",
  DUPLICATE: "mute",
};

const FILTERS: ReadonlyArray<{ id: QueueFilter; label: string }> = [
  { id: "aperte", label: "Aperte" },
  { id: "mie", label: "Prese da me" },
  { id: "RICEVUTA_PAGAMENTO", label: "Ricevute" },
  { id: "RITIRO", label: "Ritiri" },
  { id: "RICHIESTA", label: "Richieste" },
  { id: "FONDO", label: "Fondo" },
  { id: "DOCUMENTO", label: "Documenti" },
  { id: "allineate", label: "Già allineate" },
  { id: "chiuse", label: "Decise" },
];

const btn = "scd-focus inline-flex h-11 items-center justify-center gap-2 rounded-[10px] px-4 text-[15px] font-semibold disabled:opacity-50";
const btnGhost = `${btn} border border-[var(--in-line)] bg-white`;

function QueuePage({ initial, now, preview }: { initial: QueueData; now: string; preview: boolean }) {
  const [data, setData] = useState(initial);
  const [filter, setFilter] = useState<QueueFilter>("aperte");
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const reload = useServerFn(getProposalQueue);
  const items = data.queue?.items ?? [];
  const h = useMemo(() => queueHealth(items, now), [items, now]);
  const shown = useMemo(() => filterQueue(items, filter), [items, filter]);
  const current = items.find((p) => p.id === open) ?? null;

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
      id="coda"
      title="Coda di lavoro"
      preview={preview}
      editable
      highlights={[
        { value: data.queue ? h.open : null, label: "voci aperte" },
        { value: data.queue ? h.overdue : null, label: "oltre la scadenza" },
        { value: data.queue ? h.mine : null, label: "prese da me" },
        { value: data.queue ? h.aligned : null, label: "già allineate al Gestionale" },
        { value: data.queue ? h.decidedLast7 : null, label: "decise negli ultimi 7 giorni" },
      ]}
      note={<>Le macchine leggono posta e file e propongono; una persona conferma. Confermare registra la decisione con il tuo nome: i dati si cambiano nella pagina della macchina o nel Gestionale, mai in automatico.</>}
    >
      {!data.connected ? (
        <EmptyState title="Accesso non attivo">Entra con il tuo account della società per vedere la coda.</EmptyState>
      ) : data.error ? (
        <EmptyState title="Coda non disponibile" action={<button type="button" className={btnGhost} onClick={() => void refresh()}>Riprova</button>}>{data.error}</EmptyState>
      ) : !data.queue ? (
        <EmptyState title="Area riservata">La coda è visibile a Direzione, Segreteria e Tesoreria.</EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[minmax(0,1fr)_360px]">
          <Card id="coda-elenco" title="Da lavorare" sub={`${shown.length} voci · prima le più urgenti; in fondo i ritiri già esclusi nel Gestionale.`}
            aside={<button type="button" onClick={() => void refresh()} disabled={busy} className={btnGhost} aria-label="Ricarica la coda"><RefreshCw className={`size-4 ${busy ? "animate-spin" : ""}`} aria-hidden="true" /></button>}>
            <div className="flex flex-wrap gap-1.5 px-4 pb-3 sm:px-[18px]" role="group" aria-label="Filtra la coda">
              {FILTERS.map((f) => {
                const n = filterQueue(items, f.id).length;
                return (
                  <button key={f.id} type="button" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}
                    className={`scd-focus inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-[14px] font-semibold ${filter === f.id ? "border-[var(--in-info)] bg-[var(--in-info)] text-white" : "border-[var(--in-line)] bg-white"}`}>
                    {f.label}<span className="tabular-nums opacity-80">{n}</span>
                  </button>
                );
              })}
            </div>
            {shown.length === 0 ? (
              <div className="px-4 pb-4 sm:px-[18px]"><EmptyState title="Niente da lavorare qui">Quando arriva una mail o un file utile, la macchina lo mette in questa coda.</EmptyState></div>
            ) : (
              <ul className="m-0 list-none p-0" data-testid="coda-list">
                {shown.map((p) => <QueueRow key={p.id} p={p} now={now} onOpen={() => setOpen(p.id)} />)}
              </ul>
            )}
          </Card>
          <div className="flex min-w-0 flex-col gap-[18px]">
            <Card id="coda-regole" title="Come si lavora la coda">
              <ol className="m-0 flex list-decimal flex-col gap-1.5 px-4 pb-4 pl-9 text-[14.5px] leading-snug sm:px-[18px] sm:pl-10">
                <li><b>Prendi in carico</b> la voce: gli altri vedono che ci stai lavorando.</li>
                <li>Apri la mail originale e controlla.</li>
                <li><b>Conferma</b> quando hai fatto l'azione, oppure <b>scarta</b> spiegando perché.</li>
                <li>Se manca qualcosa, segna <b>serve informazione</b>; se non è il momento, <b>rinvia</b>.</li>
              </ol>
              <p className="m-0 border-t border-[var(--in-line)] px-4 py-3 text-[13px] text-[var(--in-sub)] sm:px-[18px]">
                Le voci del Fondo Solidale sono visibili solo a Direzione e Tesoreria. La coda non conserva il testo delle mail, solo il riferimento.
              </p>
            </Card>
            <SourcesBox id="coda" />
          </div>
          {current && <DecideDialog p={current} items={items} now={now} onClose={() => setOpen(null)} onDone={async () => { setOpen(null); await refresh(); }} />}
        </div>
      )}
    </WorkAreaShell>
  );
}

function QueueRow({ p, now, onOpen }: { p: Proposal; now: string; onOpen: () => void }) {
  const late = p.open && p.dueAt !== null && p.dueAt < now;
  return (
    <li className="border-t border-[var(--in-line)]">
      <button type="button" onClick={onOpen} className="scd-focus flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-[#f7fbff] sm:px-[18px]">
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5">
            <Chip tone="info">{KIND_LABEL[p.kind]}</Chip>
            {p.reserved && <Chip tone="mute"><Lock className="mr-1 inline size-3" aria-hidden="true" />Riservato</Chip>}
            {alreadyAligned(p) && <Chip tone="ok">Già escluso nel Gestionale</Chip>}
          </span>
          <b className="mt-1 block text-[15.5px] leading-snug">{p.title}</b>
          <span className="block text-[13px] text-[var(--in-sub)]">
            {[MACHINE_LABEL[p.machine] ?? p.machine, p.targetRef ? `posizione ${p.targetRef}` : p.machine === "M3" ? "posizione da collegare" : null, `arrivata ${agoLabel(p.sourceAt, now)}`].filter(Boolean).join(" · ")}
          </span>
        </span>
        <span className="flex flex-none flex-col items-end gap-1">
          <Chip tone={late ? "crit" : STATUS_TONE[p.status]}>{late ? "In ritardo" : STATUS_LABEL[p.status]}</Chip>
          {p.mine && <span className="text-[12.5px] font-semibold text-[var(--in-info)]">tua</span>}
        </span>
      </button>
    </li>
  );
}

const SNOOZE: ReadonlyArray<{ label: string; days: number }> = [
  { label: "Domani", days: 1 },
  { label: "Tra 3 giorni", days: 3 },
  { label: "Tra una settimana", days: 7 },
];

function DecideDialog({ p, items, now, onClose, onDone }: { p: Proposal; items: readonly Proposal[]; now: string; onClose: () => void; onDone: () => Promise<void> }) {
  const decide = useServerFn(decideProposal);
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [dupOf, setDupOf] = useState("");
  const candidates = items.filter((x) => x.id !== p.id && (x.targetRef ? x.targetRef === p.targetRef : x.kind === p.kind) && x.status !== "DUPLICATE");

  async function run(action: ProposalAction, extra: { snoozeDays?: number } = {}) {
    if (needsNote(action) && note.trim() === "") {
      setMsg({ ok: false, text: "Scrivi il motivo: serve a chi lavora la voce dopo di te." });
      return;
    }
    if (action === "duplicate" && !dupOf) {
      setMsg({ ok: false, text: "Scegli la voce originale." });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const snoozeUntil = extra.snoozeDays ? new Date(new Date(now).getTime() + extra.snoozeDays * 86_400_000).toISOString() : null;
      const out = await decide({ data: { id: p.id, action, note: note.trim() || null, duplicateOf: action === "duplicate" ? dupOf : null, snoozeUntil } });
      setMsg({ ok: out.ok, text: out.message });
      if (out.ok) await onDone();
    } catch {
      setMsg({ ok: false, text: "Operazione non riuscita. Riprova tra poco." });
    } finally {
      setBusy(false);
    }
  }

  const closed = !p.open && (p.status === "ACCEPTED" || p.status === "REJECTED" || p.status === "DUPLICATE");
  return (
    <Dialog title={p.title} onClose={onClose} testId="coda-decide">
      <div className="mt-3 flex flex-col gap-3 text-[14.5px]">
        <div className="flex flex-wrap items-center gap-1.5">
          <Chip tone="info">{KIND_LABEL[p.kind]}</Chip>
          <Chip tone={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status]}</Chip>
          {p.reserved && <Chip tone="mute">Riservato</Chip>}
        </div>
        {p.reason && <p className="m-0 rounded-[10px] bg-[var(--in-info-bg)] px-3 py-2"><b>Perché la propongo:</b> {p.reason}</p>}
        <dl className="m-0 grid grid-cols-[minmax(0,120px)_minmax(0,1fr)] gap-x-3 gap-y-1">
          <dt className="text-[var(--in-sub)]">Macchina</dt><dd className="m-0">{MACHINE_LABEL[p.machine] ?? p.machine}</dd>
          <dt className="text-[var(--in-sub)]">Collegata a</dt><dd className="m-0">{p.targetRef ? `${p.targetLabel ?? ""} · posizione ${p.targetRef}` : "nessuna posizione trovata"}</dd>
          {p.targetState && <><dt className="text-[var(--in-sub)]">Stato attuale</dt><dd className="m-0">{p.targetState.replace("_", " ").toLowerCase()} nel Gestionale</dd></>}
          <dt className="text-[var(--in-sub)]">Arrivata</dt><dd className="m-0">{agoLabel(p.sourceAt, now)} · casella {p.mailbox ?? "—"}</dd>
          {p.decisionNote && <><dt className="text-[var(--in-sub)]">Nota</dt><dd className="m-0">{p.decisionNote}</dd></>}
        </dl>
        {p.sourceUrl && (
          <a href={p.sourceUrl} target="_blank" rel="noreferrer" className={`${btnGhost} self-start`}>
            <ExternalLink className="size-4" aria-hidden="true" /> Apri la mail originale
          </a>
        )}
        {!closed && <p className="m-0 text-[13.5px] text-[var(--in-sub)]">{alreadyAligned(p) ? "La posizione risulta già esclusa nel Gestionale: confermare serve solo ad archiviare la voce." : ACCEPT_HINT[p.kind]}</p>}
        <label className="grid gap-1">
          <span className="font-bold">Nota (obbligatoria per scartare o chiedere informazioni)</span>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={500}
            className="w-full rounded-[10px] border border-[var(--in-line)] bg-white px-3 py-2 text-[15px] outline-none focus:border-[var(--in-info)]" />
        </label>
        {msg && <p role="status" className={`m-0 rounded-[10px] px-3 py-2 ${msg.ok ? "bg-[var(--in-ok-bg)] text-[var(--in-ok)]" : "bg-[var(--in-warn-bg)] text-[var(--in-warn)]"}`}>{msg.text}</p>}
        {closed ? (
          <button type="button" disabled={busy} onClick={() => void run("reopen")} className={`${btnGhost} self-start`}><RotateCcw className="size-4" aria-hidden="true" />Riapri</button>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" disabled={busy} onClick={() => void run("accept")} className={`${btn} bg-[#128a2e] text-white`} data-testid="coda-accept"><Check className="size-4" aria-hidden="true" />Conferma</button>
              <button type="button" disabled={busy} onClick={() => void run("reject")} className={`${btn} border border-[#b42318] bg-white text-[#9a1d14]`}><X className="size-4" aria-hidden="true" />Scarta</button>
              {p.mine ? (
                <button type="button" disabled={busy} onClick={() => void run("release")} className={btnGhost}><Undo2 className="size-4" aria-hidden="true" />Rimetti in coda</button>
              ) : (
                <button type="button" disabled={busy} onClick={() => void run("take")} className={btnGhost}><Hand className="size-4" aria-hidden="true" />Prendo io</button>
              )}
              <button type="button" disabled={busy} onClick={() => void run("needs_info")} className={btnGhost}><HelpCircle className="size-4" aria-hidden="true" />Serve info</button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[13.5px] text-[var(--in-sub)]"><Clock className="size-4" aria-hidden="true" />Rinvia:</span>
              {SNOOZE.map((s) => (
                <button key={s.days} type="button" disabled={busy} onClick={() => void run("snooze", { snoozeDays: s.days })} className="scd-focus h-9 rounded-full border border-[var(--in-line)] bg-white px-3 text-[13.5px] font-semibold">{s.label}</button>
              ))}
            </div>
            {candidates.length > 0 && (
              <div className="flex flex-wrap items-end gap-2 border-t border-[var(--in-line)] pt-3">
                <label className="grid min-w-0 flex-1 gap-1">
                  <span className="text-[13.5px] font-semibold">È un doppione di…</span>
                  <select value={dupOf} onChange={(e) => setDupOf(e.target.value)} className="h-11 w-full rounded-[10px] border border-[var(--in-line)] bg-white px-2 text-[14.5px]">
                    <option value="">Scegli la voce originale</option>
                    {candidates.map((c) => <option key={c.id} value={c.id}>{c.title} ({agoLabel(c.sourceAt, now)})</option>)}
                  </select>
                </label>
                <button type="button" disabled={busy || !dupOf} onClick={() => void run("duplicate")} className={btnGhost}>Segna doppione</button>
              </div>
            )}
          </>
        )}
      </div>
    </Dialog>
  );
}
