/**
 * Gestionale Fondo Solidale (UD-113): confidential applications, review and decision with reduced fee, deadlines,
 * Fund income and outgoings, report. ISEE, names and contacts are shown only here and only to people the Direzione
 * enabled («Fondo Solidale»). Fondo and sibling discount are never cumulative (checked here and in the database).
 * The fee itself stays in the Gestionale (UD-082): after a decision the page says what to copy there.
 */
import { useServerFn } from "@tanstack/react-start";
import { CalendarClock, Check, Eye, Lock, Plus, RefreshCw, X } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";

import { FundApplicationForm } from "@/components/giving/fund-apply";
import { Dialog } from "@/components/scd/Dialog";
import { Chip, type ChipTone } from "@/components/scd/interior-ui";
import {
  FUND_STATUS_LABEL,
  MANUAL_SOURCES,
  MOVEMENT_SOURCE_LABEL,
  SIBLING_LABEL,
  SIBLING_OPTIONS,
  coverRoom,
  decisionProblem,
  euro,
  fundDeadlines,
  fundTotals,
  gestionaleTodo,
  itDay,
  movementDirection,
  nextStatuses,
  type FundApplication,
  type FundBoard,
  type FundReport,
  type FundStatus,
  type MovementSource,
  type SiblingDiscount,
} from "@/lib/giving";
import { fundDecide, fundRecordMovement, fundSetPublicTotals, fundSetStatus, fundVoidMovement, getFundBoard, type ActionResult } from "@/lib/giving.functions";
import type { GivingGate } from "@/lib/giving.server";
import { EmptyRow, GivingShell, InField, Message, PrivacyNote, SectionCard, inArea, inBtn, inGhost, inInput, showsStructure } from "./backoffice";

const TONE: Readonly<Record<FundStatus, ChipTone>> = {
  INVIATA: "warn",
  IN_ESAME: "info",
  INTEGRAZIONE: "warn",
  APPROVATA: "ok",
  RESPINTA: "mute",
  RITIRATA: "mute",
  SCADUTA: "mute",
};
const OPEN: ReadonlySet<FundStatus> = new Set(["INVIATA", "IN_ESAME", "INTEGRAZIONE"]);
type Filter = "lavoro" | "approvate" | "chiuse";

function romeToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
const toNum = (s: string): number | null => (s.trim() && Number.isFinite(Number(s.replace(",", "."))) ? Number(s.replace(",", ".")) : null);

export function FundPage({ initial }: { initial: { gate: GivingGate; board: FundBoard | null; report: FundReport | null; error: string | null } }) {
  const [view, setView] = useState(initial);
  const reload = useServerFn(getFundBoard);
  const today = useMemo(romeToday, []);
  const { gate, board, report } = view;
  const open = gate.state === "open" && board !== null;
  const canWrite = open && board.canWrite;
  const canApprove = open && board.canApprove;
  const apps = board?.applications ?? [];
  const [filter, setFilter] = useState<Filter>("lavoro");
  const [detail, setDetail] = useState<string | null>(null);
  const [newApp, setNewApp] = useState(false);
  const [msg, setMsg] = useState<ActionResult | null>(null);
  const totals = fundTotals(board?.movements ?? []);
  const shown = apps.filter((a) => (filter === "lavoro" ? OPEN.has(a.status) : filter === "approvate" ? a.status === "APPROVATA" : !OPEN.has(a.status) && a.status !== "APPROVATA"));
  const deadlines = fundDeadlines(apps, today);
  const todos = apps.flatMap((a) => {
    const t = gestionaleTodo(a);
    return t ? [{ code: a.code, label: a.beneficiaryLabel, todo: t }] : [];
  });
  const current = apps.find((a) => a.id === detail) ?? null;

  async function refresh(r?: ActionResult) {
    if (r) setMsg(r);
    setView(await reload({ data: {} }));
  }

  if (!showsStructure(gate)) return <GivingShell gate={gate} canWrite={false}>{null}</GivingShell>;

  return (
    <GivingShell
      gate={gate}
      canWrite={canWrite}
      highlights={[
        { value: open ? apps.filter((a) => OPEN.has(a.status)).length : null, label: "domande da lavorare" },
        { value: open ? deadlines.filter((d) => d.late).length : null, label: "scadenze superate" },
        { value: open ? apps.filter((a) => a.status === "APPROVATA").length : null, label: "domande approvate" },
      ]}
    >
      {view.error && <Message ok={false}>{view.error}</Message>}
      {msg && <Message ok={msg.ok}>{msg.message}{msg.todo ? ` Da fare nel Gestionale: ${msg.todo}.` : ""}</Message>}
      <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex min-w-0 flex-col gap-[18px]">
          <SectionCard
            id="fondo-domande"
            title="Domande"
            sub="Riservate: nomi, recapiti e ISEE li vede solo chi è abilitato al Fondo Solidale."
            aside={
              <>
                <button type="button" className={inGhost} onClick={() => refresh()} disabled={!open} aria-label="Aggiorna"><RefreshCw className="size-4" aria-hidden="true" /></button>
                <button type="button" className={inBtn} onClick={() => setNewApp(true)} disabled={!canWrite}><Plus className="size-4" aria-hidden="true" />Registra domanda</button>
              </>
            }
          >
            <div role="tablist" aria-label="Filtro domande" className="flex flex-wrap gap-2 px-4 pb-3 sm:px-[18px]">
              {([["lavoro", "Da lavorare"], ["approvate", "Approvate"], ["chiuse", "Chiuse"]] as const).map(([id, label]) => (
                <button key={id} role="tab" aria-selected={filter === id} type="button" onClick={() => setFilter(id)} className={`scd-focus h-10 rounded-full px-3.5 text-[14px] font-semibold ${filter === id ? "bg-[var(--in-info)] text-white" : "bg-[#eef3f9] text-[var(--in-ink)]"}`}>
                  {label}
                </button>
              ))}
            </div>
            {shown.length === 0 ? (
              <EmptyRow>{open ? "Nessuna domanda in questo elenco." : "Le domande compariranno qui quando il Fondo sarà aperto online."}</EmptyRow>
            ) : (
              <ul className="m-0 list-none p-0" data-testid="fund-apps">
                {shown.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-[var(--in-line)] px-4 py-3 sm:px-[18px]">
                    <span className="min-w-0 flex-1">
                      <b className="block text-[15.5px] leading-snug">{a.beneficiaryLabel || "Beneficiario da indicare"}</b>
                      <span className="text-[13.5px] text-[var(--in-sub)]">{a.code} · domanda di {a.applicantName} · {itDay(a.submittedAt)}</span>
                    </span>
                    <Chip tone={TONE[a.status]}>{FUND_STATUS_LABEL[a.status]}</Chip>
                    <button type="button" className={inGhost} onClick={() => setDetail(a.id)}><Eye className="size-4" aria-hidden="true" />Apri</button>
                  </li>
                ))}
              </ul>
            )}
            <PrivacyNote>Non condividere schermate di questa pagina. Le modifiche restano registrate (chi, quando, cosa) senza ISEE né nomi nello storico.</PrivacyNote>
          </SectionCard>

          <MovementsCard board={board} open={open} canWrite={canWrite} canApprove={canApprove} today={today} onDone={refresh} />
        </div>

        <div className="flex min-w-0 flex-col gap-[18px]">
          <SectionCard id="fondo-scadenze" title="Scadenze" sub="Esame delle domande e documenti da integrare.">
            {deadlines.length === 0 ? (
              <EmptyRow>{open ? "Nessuna scadenza aperta." : "—"}</EmptyRow>
            ) : (
              <ul className="m-0 list-none p-0">
                {deadlines.map((d) => (
                  <li key={`${d.code}-${d.kind}`} className="flex items-center gap-3 border-t border-[var(--in-line)] px-4 py-2.5 text-[14.5px] sm:px-[18px]">
                    <CalendarClock className="size-4 flex-none text-[var(--in-sub)]" aria-hidden="true" />
                    <span className="min-w-0 flex-1">{d.code} · {d.kind === "esame" ? "decisione entro" : "documenti entro"} {itDay(d.due)}</span>
                    {d.late && <Chip tone="crit">Superata</Chip>}
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard id="fondo-gestionale" title="Da riportare nel Gestionale" sub="La quota vive nel Gestionale: dopo ogni decisione va aggiornato lì.">
            {todos.length === 0 ? <EmptyRow>{open ? "Niente da riportare." : "—"}</EmptyRow> : (
              <ul className="m-0 list-none p-0">
                {todos.map((t) => <li key={t.code} className="border-t border-[var(--in-line)] px-4 py-2.5 text-[14.5px] sm:px-[18px]"><b>{t.code}</b> · {t.label}: {t.todo}</li>)}
              </ul>
            )}
          </SectionCard>

          <ReportCard report={report} totals={totals} open={open} canApprove={canApprove} publicTotals={board?.publicTotals ?? false} onDone={refresh} />
        </div>
      </div>

      {newApp && (
        <Dialog title="Registra una domanda" onClose={() => setNewApp(false)} testId="fund-new">
          <div className="mt-3 max-h-[70vh] overflow-y-auto pr-1">
            <FundApplicationForm mode="office" children={[]} active={canWrite} inputCls={inInput} buttonCls={inBtn} labelCls="text-[13px] font-semibold text-[var(--in-sub)]" onDone={(r) => { if (r.ok) { setNewApp(false); void refresh(r); } }} />
          </div>
        </Dialog>
      )}
      {current && <ApplicationDialog app={current} canWrite={canWrite} canApprove={canApprove} today={today} onClose={() => setDetail(null)} onDone={refresh} />}
    </GivingShell>
  );
}

function ApplicationDialog({ app, canWrite, canApprove, today, onClose, onDone }: { app: FundApplication; canWrite: boolean; canApprove: boolean; today: string; onClose: () => void; onDone: (r: ActionResult) => Promise<void> }) {
  const setStatus = useServerFn(fundSetStatus);
  const decide = useServerFn(fundDecide);
  const record = useServerFn(fundRecordMovement);
  const [st, setSt] = useState({ status: "", reviewDue: app.reviewDue ?? "", documentsDue: app.documentsDue ?? "", note: "" });
  const [dec, setDec] = useState({ decision: "APPROVATA" as "APPROVATA" | "RESPINTA", base: app.baseFee?.toString() ?? "", reduced: app.reducedFee?.toString() ?? "", sib: app.siblingDiscount as SiblingDiscount, until: app.validUntil ?? "", reason: "" });
  const [cover, setCover] = useState({ amount: "", on: today });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const problem = decisionProblem({ decision: dec.decision, baseFee: toNum(dec.base), reducedFee: toNum(dec.reduced), siblingDiscount: dec.sib, feeFamilyRule: app.feeFamilyRule, reason: dec.reason });
  const room = coverRoom(app);
  const steps = nextStatuses("FUND_APPLICATION", app.status).filter((s) => s !== "APPROVATA" && s !== "RESPINTA") as FundStatus[];
  const canDecide = nextStatuses("FUND_APPLICATION", app.status).includes("APPROVATA");

  async function run(p: Promise<ActionResult>) {
    setBusy(true);
    setErr(null);
    try {
      const r = await p;
      if (!r.ok) setErr(r.message);
      else { await onDone(r); onClose(); }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog title={`Domanda ${app.code}`} onClose={onClose} testId="fund-detail">
      <div className="mt-3 max-h-[72vh] space-y-4 overflow-y-auto pr-1 text-[15px]">
        <p className="m-0 flex items-center gap-2 text-[13.5px] text-[var(--in-sub)]"><Lock className="size-4" aria-hidden="true" />Dati riservati al Fondo Solidale.</p>
        <dl className="m-0 grid grid-cols-[minmax(0,140px)_minmax(0,1fr)] gap-x-3 gap-y-1.5">
          <dt className="font-semibold">Stato</dt><dd className="m-0"><Chip tone={TONE[app.status]}>{FUND_STATUS_LABEL[app.status]}</Chip></dd>
          <dt className="font-semibold">Per</dt><dd className="m-0">{app.beneficiaryLabel || "—"}</dd>
          <dt className="font-semibold">Chi chiede</dt><dd className="m-0">{app.applicantName}</dd>
          <dt className="font-semibold">Recapiti</dt><dd className="m-0 break-words">{[app.contactEmail, app.contactPhone].filter(Boolean).join(" · ") || "—"}</dd>
          <dt className="font-semibold">ISEE</dt><dd className="m-0">{app.iseeValue !== null ? euro(app.iseeValue) : "—"}{app.iseeExpiresOn ? ` · scade ${itDay(app.iseeExpiresOn)}` : ""}</dd>
          <dt className="font-semibold">Documenti</dt><dd className="m-0 break-words">{app.documentsRef ?? "—"}</dd>
          <dt className="font-semibold">Quota Gestionale</dt><dd className="m-0">{app.feeSourceRecordId ?? "—"}{app.feeFamilyRule ? ` · regola: ${app.feeFamilyRule}` : ""}</dd>
          <dt className="font-semibold">Sconto fratelli</dt><dd className="m-0">{SIBLING_LABEL[app.siblingDiscount]}</dd>
          {app.householdNote && (<><dt className="font-semibold">Note</dt><dd className="m-0 whitespace-pre-wrap">{app.householdNote}</dd></>)}
          {app.status === "APPROVATA" && (<><dt className="font-semibold">Decisione</dt><dd className="m-0">paga {euro(app.reducedFee)} invece di {euro(app.baseFee)} · coperti {euro(app.covered)}{app.validUntil ? ` · fino al ${itDay(app.validUntil)}` : ""}</dd></>)}
          {app.decisionReason && (<><dt className="font-semibold">Motivazione</dt><dd className="m-0">{app.decisionReason}</dd></>)}
        </dl>

        {steps.length > 0 && (
          <form className="space-y-3 rounded-xl border border-[var(--in-line)] p-3" onSubmit={(e: FormEvent) => { e.preventDefault(); void run(setStatus({ data: { id: app.id, status: (st.status || null) as FundStatus | null, reviewDue: st.reviewDue || null, documentsDue: st.documentsDue || null, note: st.note } })); }}>
            <b className="block">Esame</b>
            <div className="grid gap-3 sm:grid-cols-2">
              <InField label="Passa a">
                <select className={inInput} value={st.status} onChange={(e) => setSt({ ...st, status: e.target.value })} disabled={!canWrite}>
                  <option value="">Lascia «{FUND_STATUS_LABEL[app.status]}»</option>
                  {steps.map((s) => <option key={s} value={s}>{FUND_STATUS_LABEL[s]}</option>)}
                </select>
              </InField>
              <InField label="Decidere entro"><input type="date" className={inInput} value={st.reviewDue} onChange={(e) => setSt({ ...st, reviewDue: e.target.value })} disabled={!canWrite} /></InField>
              {st.status === "INTEGRAZIONE" && <InField label="Documenti entro"><input type="date" className={inInput} value={st.documentsDue} onChange={(e) => setSt({ ...st, documentsDue: e.target.value })} disabled={!canWrite} /></InField>}
              <InField label="Nota per lo storico (senza dati personali)" className="sm:col-span-2"><input className={inInput} maxLength={200} value={st.note} onChange={(e) => setSt({ ...st, note: e.target.value })} disabled={!canWrite} /></InField>
            </div>
            <button type="submit" className={inGhost} disabled={!canWrite || busy || (st.status === "INTEGRAZIONE" && !st.documentsDue)}>Salva esame</button>
          </form>
        )}

        {canDecide && (
          <form className="space-y-3 rounded-xl border border-[var(--in-line)] p-3" onSubmit={(e: FormEvent) => { e.preventDefault(); if (!problem) void run(decide({ data: { id: app.id, decision: dec.decision, baseFee: toNum(dec.base), reducedFee: toNum(dec.reduced), siblingDiscount: dec.sib, validUntil: dec.until || null, reason: dec.reason } })); }}>
            <b className="block">Decisione {canApprove ? "" : "(serve il livello «Approva»)"}</b>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Decisione">
              {(["APPROVATA", "RESPINTA"] as const).map((d) => (
                <label key={d} className={`${inGhost} cursor-pointer ${dec.decision === d ? "border-[var(--in-info)] bg-[var(--in-info-bg)]" : ""}`}>
                  <input type="radio" className="sr-only" checked={dec.decision === d} onChange={() => setDec({ ...dec, decision: d })} disabled={!canApprove} />
                  {d === "APPROVATA" ? <Check className="size-4" aria-hidden="true" /> : <X className="size-4" aria-hidden="true" />}{FUND_STATUS_LABEL[d]}
                </label>
              ))}
            </div>
            {dec.decision === "APPROVATA" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <InField label="Quota piena (€)"><input className={inInput} inputMode="decimal" value={dec.base} onChange={(e) => setDec({ ...dec, base: e.target.value })} disabled={!canApprove} /></InField>
                <InField label="Quota ridotta che paga la famiglia (€)"><input className={inInput} inputMode="decimal" value={dec.reduced} onChange={(e) => setDec({ ...dec, reduced: e.target.value })} disabled={!canApprove} /></InField>
                <InField label="Sconto fratelli" hint="Fondo e sconto fratelli non sono cumulabili." className="sm:col-span-2">
                  <select className={inInput} value={dec.sib} onChange={(e) => setDec({ ...dec, sib: e.target.value as SiblingDiscount })} disabled={!canApprove}>
                    {SIBLING_OPTIONS.map((s) => <option key={s} value={s}>{SIBLING_LABEL[s]}</option>)}
                  </select>
                </InField>
                <InField label="Valida fino al"><input type="date" className={inInput} value={dec.until} onChange={(e) => setDec({ ...dec, until: e.target.value })} disabled={!canApprove} /></InField>
              </div>
            )}
            <InField label="Motivazione"><textarea className={inArea} rows={2} maxLength={500} value={dec.reason} onChange={(e) => setDec({ ...dec, reason: e.target.value })} disabled={!canApprove} /></InField>
            {problem && dec.reason.trim().length >= 3 && <p role="alert" className="m-0 text-[14px] font-semibold text-[var(--in-crit)]">{problem}</p>}
            <button type="submit" className={inBtn} disabled={!canApprove || busy || problem !== null}>Registra decisione</button>
          </form>
        )}

        {app.status === "APPROVATA" && (
          <form className="space-y-3 rounded-xl border border-[var(--in-line)] p-3" onSubmit={(e: FormEvent) => { e.preventDefault(); const a = toNum(cover.amount); if (a && a <= room) void run(record({ data: { season: "2026/27", source: "QUOTA_COPERTA", amount: a, occurredOn: cover.on, description: `Quota coperta ${app.code}`, applicationId: app.id, ledgerRef: "" } })); }}>
            <b className="block">Quota coperta dal Fondo</b>
            <p className="m-0 text-[14px] text-[var(--in-sub)]">Ancora copribile: {euro(room)}.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <InField label="Importo (€)"><input className={inInput} inputMode="decimal" value={cover.amount} onChange={(e) => setCover({ ...cover, amount: e.target.value })} disabled={!canWrite || room <= 0} /></InField>
              <InField label="Data"><input type="date" className={inInput} value={cover.on} max={today} onChange={(e) => setCover({ ...cover, on: e.target.value })} disabled={!canWrite || room <= 0} /></InField>
            </div>
            <button type="submit" className={inGhost} disabled={!canWrite || busy || room <= 0 || !(toNum(cover.amount) && (toNum(cover.amount) as number) <= room)}>Registra uscita</button>
          </form>
        )}
        {err && <Message ok={false}>{err}</Message>}
      </div>
    </Dialog>
  );
}

function MovementsCard({ board, open, canWrite, canApprove, today, onDone }: { board: FundBoard | null; open: boolean; canWrite: boolean; canApprove: boolean; today: string; onDone: (r: ActionResult) => Promise<void> }) {
  const record = useServerFn(fundRecordMovement);
  const voidMv = useServerFn(fundVoidMovement);
  const [f, setF] = useState({ source: "EVENTO" as MovementSource, amount: "", on: today, description: "", ledger: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const movements = board?.movements ?? [];
  const totals = fundTotals(movements);
  const manual = MANUAL_SOURCES.filter((s) => s !== "QUOTA_COPERTA");

  async function submit(e: FormEvent) {
    e.preventDefault();
    const a = toNum(f.amount);
    if (!a || a <= 0) return setErr("Importo maggiore di zero.");
    setBusy(true);
    setErr(null);
    try {
      const r = await record({ data: { season: "2026/27", source: f.source, amount: a, occurredOn: f.on, description: f.description, applicationId: null, ledgerRef: f.ledger } });
      if (!r.ok) setErr(r.message);
      else { setF({ ...f, amount: "", description: "", ledger: "" }); await onDone(r); }
    } finally {
      setBusy(false);
    }
  }

  async function voidOne(id: string) {
    const reason = window.prompt("Motivo dell'annullamento");
    if (!reason) return;
    const r = await voidMv({ data: { id, reason } });
    if (!r.ok) setErr(r.message);
    else await onDone(r);
  }

  return (
    <SectionCard id="fondo-movimenti" title="Entrate e uscite del Fondo" sub="Donazioni al Fondo entrano da sole quando la Tesoreria le registra; qui eventi, sponsor dedicati e altre voci.">
      <dl className="m-0 grid grid-cols-3 gap-2 px-4 pb-3 sm:px-[18px]">
        {[["Entrate", totals.income], ["Uscite", totals.outgoings], ["Saldo", totals.balance]].map(([l, v]) => (
          <div key={l as string} className="rounded-xl bg-[var(--in-info-bg)] px-3 py-2.5">
            <dt className="text-[13px] text-[var(--in-sub)]">{l as string}</dt>
            <dd className="m-0 font-title text-[22px] font-extrabold">{open ? euro(v as number) : "—"}</dd>
          </div>
        ))}
      </dl>
      {movements.length === 0 ? <EmptyRow>{open ? "Nessun movimento registrato." : "I movimenti compariranno qui."}</EmptyRow> : (
        <ul className="m-0 list-none p-0">
          {movements.map((m) => (
            <li key={m.id} className={`flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-[var(--in-line)] px-4 py-2.5 sm:px-[18px] ${m.voided ? "opacity-60" : ""}`}>
              <span className="min-w-0 flex-1 text-[14.5px]">
                <b>{MOVEMENT_SOURCE_LABEL[m.source]}</b> · {itDay(m.occurredOn)}{m.description ? ` · ${m.description}` : ""}{m.donationCode ? ` · ${m.donationCode}` : ""}{m.applicationCode ? ` · ${m.applicationCode}` : ""}
                {m.voided && <span className="block text-[13px]">Annullato: {m.voidReason}</span>}
              </span>
              <span className={`font-semibold ${m.direction === "ENTRATA" ? "text-[var(--in-ok)]" : "text-[var(--in-crit)]"}`}>{m.direction === "ENTRATA" ? "+" : "−"}{euro(m.amount)}</span>
              {!m.voided && !m.donationCode && canApprove && <button type="button" className={inGhost} onClick={() => voidOne(m.id)}>Annulla</button>}
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={submit} className="grid gap-3 border-t border-[var(--in-line)] px-4 py-4 sm:grid-cols-2 sm:px-[18px]">
        <InField label="Voce">
          <select className={inInput} value={f.source} onChange={(e) => setF({ ...f, source: e.target.value as MovementSource })} disabled={!canWrite}>
            {manual.map((s) => <option key={s} value={s}>{movementDirection(s) === "ENTRATA" ? "Entrata" : "Uscita"} · {MOVEMENT_SOURCE_LABEL[s]}</option>)}
          </select>
        </InField>
        <InField label="Importo (€)"><input className={inInput} inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} disabled={!canWrite} /></InField>
        <InField label="Data"><input type="date" className={inInput} value={f.on} max={today} onChange={(e) => setF({ ...f, on: e.target.value })} disabled={!canWrite} /></InField>
        <InField label="Riferimento prima nota (facoltativo)"><input className={inInput} maxLength={80} value={f.ledger} onChange={(e) => setF({ ...f, ledger: e.target.value })} disabled={!canWrite} /></InField>
        <InField label="Descrizione (es. «Cena di Natale»)" className="sm:col-span-2"><input className={inInput} maxLength={200} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} disabled={!canWrite} /></InField>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <button type="submit" className={inBtn} disabled={!canWrite || busy}>Registra movimento</button>
          {err && <span role="alert" className="text-[14px] font-semibold text-[var(--in-crit)]">{err}</span>}
        </div>
      </form>
    </SectionCard>
  );
}

function ReportCard({ report, totals, open, canApprove, publicTotals, onDone }: { report: FundReport | null; totals: ReturnType<typeof fundTotals>; open: boolean; canApprove: boolean; publicTotals: boolean; onDone: (r: ActionResult) => Promise<void> }) {
  const toggle = useServerFn(fundSetPublicTotals);
  const [busy, setBusy] = useState(false);
  const counts = report?.applications ?? {};
  return (
    <SectionCard id="fondo-rendiconto" title="Rendiconto della stagione" sub="Solo numeri aggregati, senza nomi né ISEE: si può condividere con il Consiglio.">
      <dl className="m-0 space-y-1.5 px-4 pb-3 text-[14.5px] sm:px-[18px]">
        <div className="flex justify-between gap-3"><dt>Domande arrivate</dt><dd className="m-0 font-semibold">{open ? Object.values(counts).reduce((s, n) => s + (n ?? 0), 0) : "—"}</dd></div>
        <div className="flex justify-between gap-3"><dt>Approvate</dt><dd className="m-0 font-semibold">{open ? counts.APPROVATA ?? 0 : "—"}</dd></div>
        <div className="flex justify-between gap-3"><dt>Riduzioni decise</dt><dd className="m-0 font-semibold">{open ? euro(report?.reductionDecided ?? 0) : "—"}</dd></div>
        <div className="flex justify-between gap-3"><dt>Entrate</dt><dd className="m-0 font-semibold">{open ? euro(totals.income) : "—"}</dd></div>
        <div className="flex justify-between gap-3"><dt>Uscite (quote coperte e altro)</dt><dd className="m-0 font-semibold">{open ? euro(totals.outgoings) : "—"}</dd></div>
      </dl>
      <div className="flex flex-wrap items-center gap-3 border-t border-[var(--in-line)] px-4 py-3 sm:px-[18px]">
        <span className="min-w-0 flex-1 text-[14px]">Totali in pagina pubblica: <b>{publicTotals ? "visibili" : "nascosti"}</b></span>
        <button type="button" className={inGhost} disabled={!canApprove || busy} onClick={async () => { setBusy(true); try { await onDone(await toggle({ data: { on: !publicTotals } })); } finally { setBusy(false); } }}>
          {publicTotals ? "Nascondi" : "Mostra"}
        </button>
      </div>
    </SectionCard>
  );
}
