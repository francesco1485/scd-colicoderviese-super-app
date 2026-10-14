/**
 * Proposte di miglioramento (UD-113), staff triage: nuova → in valutazione → accettata (può diventare un oggetto da
 * adottare) / non fattibile (con motivo) / spam. Never public: staff may publish a text written by staff, without
 * contacts or personal data. Anonymous proposals carry no contact at all.
 */
import { useServerFn } from "@tanstack/react-start";
import { Eye, RefreshCw } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Dialog } from "@/components/scd/Dialog";
import { Chip, type ChipTone } from "@/components/scd/interior-ui";
import {
  CATEGORY_LABEL,
  CONTRIBUTION_LABEL,
  ITEM_CATEGORIES,
  PROPOSAL_AREA_LABEL,
  PROPOSAL_STATUS_LABEL,
  itDay,
  nextStatuses,
  publishProblem,
  type ItemCategory,
  type ProposalBoard,
  type ProposalRow,
  type ProposalStatus,
} from "@/lib/giving";
import { getProposalBoard, proposalPublish, proposalToItem, proposalTriage, type ActionResult } from "@/lib/giving.functions";
import type { GivingGate } from "@/lib/giving.server";
import { EmptyRow, GivingShell, InField, Message, PrivacyNote, SectionCard, inArea, inBtn, inGhost, inInput, showsStructure } from "./backoffice";

const TONE: Readonly<Record<ProposalStatus, ChipTone>> = { NUOVA: "warn", IN_VALUTAZIONE: "info", ACCETTATA: "ok", NON_FATTIBILE: "mute", SPAM: "mute" };

export function ProposalsPage({ initial }: { initial: { gate: GivingGate; board: ProposalBoard | null; error: string | null } }) {
  const [view, setView] = useState(initial);
  const reload = useServerFn(getProposalBoard);
  const { gate, board } = view;
  const open = gate.state === "open" && board !== null;
  const canWrite = open && board.canWrite;
  const [detail, setDetail] = useState<string | null>(null);
  const [msg, setMsg] = useState<ActionResult | null>(null);
  const list = board?.proposals ?? [];
  const current = list.find((p) => p.id === detail) ?? null;

  async function refresh(r?: ActionResult) {
    if (r) setMsg(r);
    setView(await reload());
  }
  if (!showsStructure(gate)) return <GivingShell gate={gate} canWrite={false}>{null}</GivingShell>;

  return (
    <GivingShell
      gate={gate}
      canWrite={canWrite}
      highlights={[
        { value: open ? list.filter((p) => p.status === "NUOVA").length : null, label: "nuove da leggere" },
        { value: open ? list.filter((p) => p.status === "IN_VALUTAZIONE").length : null, label: "in valutazione" },
        { value: open ? list.filter((p) => p.published).length : null, label: "pubblicate" },
      ]}
    >
      {view.error && <Message ok={false}>{view.error}</Message>}
      {msg && <Message ok={msg.ok}>{msg.message}</Message>}
      <SectionCard
        id="proposte-coda"
        title="Coda delle proposte"
        sub={`Prima le nuove. ${board?.spam ? `${board.spam} segnate come spam (nascoste).` : ""}`}
        aside={<button type="button" className={inGhost} onClick={() => refresh()} disabled={!open} aria-label="Aggiorna"><RefreshCw className="size-4" aria-hidden="true" /></button>}
      >
        {list.length === 0 ? <EmptyRow>{open ? "Nessuna proposta." : "Le proposte compariranno qui quando la raccolta sarà aperta online."}</EmptyRow> : (
          <ul className="m-0 list-none p-0" data-testid="proposals">
            {list.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-[var(--in-line)] px-4 py-3 sm:px-[18px]">
                <span className="min-w-0 flex-1">
                  <b className="block text-[15.5px]">{p.title}</b>
                  <span className="text-[13.5px] text-[var(--in-sub)]">{p.code} · {PROPOSAL_AREA_LABEL[p.area]} · {itDay(p.createdAt)} · {p.anonymous ? "anonima" : "con recapito"}{p.canContribute.length ? ` · può dare ${p.canContribute.map((c) => CONTRIBUTION_LABEL[c].toLowerCase()).join(", ")}` : ""}</span>
                </span>
                {p.published && <Chip tone="info">Pubblicata</Chip>}
                <Chip tone={TONE[p.status]}>{PROPOSAL_STATUS_LABEL[p.status]}</Chip>
                <button type="button" className={inGhost} onClick={() => setDetail(p.id)}><Eye className="size-4" aria-hidden="true" />Apri</button>
              </li>
            ))}
          </ul>
        )}
        <PrivacyNote>Il testo di chi propone non va mai in pubblico così com'è: si pubblica solo un testo scritto dallo staff, senza nomi, recapiti o dati di ragazzi.</PrivacyNote>
      </SectionCard>
      {current && board && <ProposalDialog p={current} board={board} canWrite={canWrite} onClose={() => setDetail(null)} onDone={async (r) => { setDetail(null); await refresh(r); }} />}
    </GivingShell>
  );
}

function ProposalDialog({ p, board, canWrite, onClose, onDone }: { p: ProposalRow; board: ProposalBoard; canWrite: boolean; onClose: () => void; onDone: (r: ActionResult) => Promise<void> }) {
  const triage = useServerFn(proposalTriage);
  const publish = useServerFn(proposalPublish);
  const toItem = useServerFn(proposalToItem);
  const steps = nextStatuses("PROPOSAL", p.status) as ProposalStatus[];
  const [to, setTo] = useState<ProposalStatus | "">(steps[0] ?? "");
  const [reason, setReason] = useState("");
  const [pub, setPub] = useState({ title: p.publicTitle ?? "", text: p.publicText ?? "" });
  const [item, setItem] = useState({ title: p.title, category: "ALTRO" as ItemCategory });
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pubProblem = publishProblem(p, pub.title, pub.text);

  async function run(x: Promise<ActionResult>) {
    setBusy(true);
    setErr(null);
    try {
      const r = await x;
      if (!r.ok) setErr(r.message);
      else await onDone(r);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog title={`Proposta ${p.code}`} onClose={onClose} testId="proposal-detail">
      <div className="mt-3 max-h-[72vh] space-y-3 overflow-y-auto pr-1 text-[15px]">
        <p className="m-0"><b>{p.title}</b> · {PROPOSAL_AREA_LABEL[p.area]}</p>
        <p className="m-0 whitespace-pre-wrap rounded-[10px] bg-[#f3f6fa] px-3 py-2">{p.body}</p>
        <p className="m-0 text-[14px] text-[var(--in-sub)]">{p.anonymous ? "Anonima: nessun recapito." : `Recapito: ${p.contact ?? "dall'account di chi ha scritto"}`}{p.reason ? ` · Motivo: ${p.reason}` : ""}</p>
        {steps.length > 0 && (
          <form className="space-y-3 rounded-xl border border-[var(--in-line)] p-3" onSubmit={(e: FormEvent) => { e.preventDefault(); if (to) void run(triage({ data: { id: p.id, status: to, reason } })); }}>
            <InField label="Passa a">
              <select className={inInput} value={to} onChange={(e) => setTo(e.target.value as ProposalStatus)} disabled={!canWrite}>
                {steps.map((s) => <option key={s} value={s}>{PROPOSAL_STATUS_LABEL[s]}</option>)}
              </select>
            </InField>
            {to === "NON_FATTIBILE" && <InField label="Motivo"><textarea className={inArea} rows={2} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} disabled={!canWrite} /></InField>}
            <button type="submit" className={inBtn} disabled={!canWrite || busy || !to || (to === "NON_FATTIBILE" && reason.trim().length < 3)}>Salva</button>
          </form>
        )}
        {(p.status === "IN_VALUTAZIONE" || p.status === "ACCETTATA") && (
          <form className="space-y-3 rounded-xl border border-[var(--in-line)] p-3" onSubmit={(e: FormEvent) => { e.preventDefault(); if (!pubProblem) void run(publish({ data: { id: p.id, publish: true, title: pub.title, text: pub.text } })); }}>
            <b className="block">Pubblica con un testo dello staff {board.canApprove ? "" : "(serve il livello «Approva»)"}</b>
            <InField label="Titolo pubblico"><input className={inInput} maxLength={80} value={pub.title} onChange={(e) => setPub({ ...pub, title: e.target.value })} disabled={!board.canApprove} /></InField>
            <InField label="Testo pubblico"><textarea className={inArea} rows={3} maxLength={600} value={pub.text} onChange={(e) => setPub({ ...pub, text: e.target.value })} disabled={!board.canApprove} /></InField>
            {pubProblem && (pub.title || pub.text) && <p role="alert" className="m-0 text-[14px] font-semibold text-[var(--in-crit)]">{pubProblem}</p>}
            <div className="flex flex-wrap gap-2">
              <button type="submit" className={inBtn} disabled={!board.canApprove || busy || pubProblem !== null}>{p.published ? "Aggiorna" : "Pubblica"}</button>
              {p.published && <button type="button" className={inGhost} disabled={!board.canApprove || busy} onClick={() => run(publish({ data: { id: p.id, publish: false, title: pub.title, text: pub.text } }))}>Togli dalla pagina</button>}
            </div>
          </form>
        )}
        {p.status === "ACCETTATA" && !p.itemId && (
          <form className="space-y-3 rounded-xl border border-[var(--in-line)] p-3" onSubmit={(e: FormEvent) => { e.preventDefault(); void run(toItem({ data: { id: p.id, title: item.title, category: item.category } })); }}>
            <b className="block">Diventa un oggetto da adottare {board.canAdopt ? "" : "(serve anche «Adotta un oggetto · Modifica»)"}</b>
            <div className="grid gap-3 sm:grid-cols-2">
              <InField label="Titolo"><input className={inInput} maxLength={120} value={item.title} onChange={(e) => setItem({ ...item, title: e.target.value })} disabled={!board.canAdopt} /></InField>
              <InField label="Categoria">
                <select className={inInput} value={item.category} onChange={(e) => setItem({ ...item, category: e.target.value as ItemCategory })} disabled={!board.canAdopt}>
                  {ITEM_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
                </select>
              </InField>
            </div>
            <button type="submit" className={inGhost} disabled={!canWrite || !board.canAdopt || busy || item.title.trim().length < 3}>Crea in bozza</button>
          </form>
        )}
        {err && <Message ok={false}>{err}</Message>}
      </div>
    </Dialog>
  );
}
