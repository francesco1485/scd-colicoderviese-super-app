/**
 * Donazioni (UD-113), treasury side: money recorded from the official channel (pledges become "ricevuta"), receipts,
 * cancellations; goods offered for the campaigns palestra / infermeria reviewed, checked, received and inventoried.
 * Completely anonymous donations carry no personal data and get no receipt. Medical items need the infermeria grant.
 */
import { useServerFn } from "@tanstack/react-start";
import { Eye, Plus, Receipt, RefreshCw } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";

import { Dialog } from "@/components/scd/Dialog";
import { Chip, type ChipTone } from "@/components/scd/interior-ui";
import {
  CAMPAIGN_COPY,
  CHANNELS,
  CHANNEL_LABEL,
  CONDITION_LABEL,
  DONATION_PURPOSES,
  DONATION_STATUS_LABEL,
  HANDOVER_LABEL,
  MEDICAL_KIND_LABEL,
  OFFER_STATUS_LABEL,
  PURPOSE_LABEL,
  VISIBILITIES,
  VISIBILITY_COPY,
  donorErrors,
  euro,
  isMedical,
  itDay,
  nextStatuses,
  receiptPossible,
  reviewProblem,
  type Channel,
  type DonationBoard,
  type DonationPurpose,
  type DonationRow,
  type OfferRow,
  type OfferStatus,
  type Visibility,
} from "@/lib/giving";
import { donationRecord, donationSetReceipt, donationVoid, getDonationBoard, offerReview, type ActionResult } from "@/lib/giving.functions";
import type { GivingGate } from "@/lib/giving.server";
import { EmptyRow, GivingShell, InField, Message, PrivacyNote, SectionCard, inArea, inBtn, inGhost, inInput, showsStructure } from "./backoffice";

const D_TONE: Readonly<Record<DonationRow["status"], ChipTone>> = { PROMESSA: "warn", RICEVUTA: "ok", ANNULLATA: "mute" };
const O_TONE: Readonly<Record<OfferStatus, ChipTone>> = { NUOVA: "warn", INFO_RICHIESTE: "warn", ACCETTATA: "info", RIFIUTATA: "mute", RICEVUTA: "ok", INVENTARIATA: "ok", ANNULLATA: "mute" };

function romeToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
const toNum = (s: string): number | null => (s.trim() && Number.isFinite(Number(s.replace(",", "."))) ? Number(s.replace(",", ".")) : null);

function donorLine(d: { visibility: Visibility; donorName: string | null; publicName: string | null }): string {
  if (d.visibility === "COMPLETAMENTE_ANONIMO") return "Completamente anonimo";
  return `${d.donorName ?? "—"}${d.visibility === "NOME_PUBBLICO" && d.publicName ? ` · in pubblico «${d.publicName}»` : " · anonimo in pubblico"}`;
}

export function DonationsPage({ initial }: { initial: { gate: GivingGate; board: DonationBoard | null; error: string | null } }) {
  const [view, setView] = useState(initial);
  const reload = useServerFn(getDonationBoard);
  const today = useMemo(romeToday, []);
  const { gate, board } = view;
  const open = gate.state === "open" && board !== null;
  const canWrite = open && board.canWrite;
  const [msg, setMsg] = useState<ActionResult | null>(null);
  const [record, setRecord] = useState<DonationRow | "new" | null>(null);
  const [offer, setOffer] = useState<string | null>(null);
  const donations = board?.donations ?? [];
  const offers = board?.offers ?? [];
  const pledges = donations.filter((d) => d.status === "PROMESSA");
  const currentOffer = offers.find((o) => o.id === offer) ?? null;

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
        { value: open ? pledges.length : null, label: "promesse da ricevere" },
        { value: open ? donations.filter((d) => d.status === "RICEVUTA" && receiptPossible(d.visibility) && !d.receiptNumber).length : null, label: "ricevute da fare" },
        { value: open ? offers.filter((o) => o.status === "NUOVA" || o.status === "INFO_RICHIESTE").length : null, label: "offerte di materiale da valutare" },
      ]}
    >
      {view.error && <Message ok={false}>{view.error}</Message>}
      {msg && <Message ok={msg.ok}>{msg.message}</Message>}
      <div className="grid grid-cols-1 gap-[18px] xl:grid-cols-2">
        <SectionCard
          id="don-denaro"
          title="Donazioni in denaro"
          sub="Si registra solo ciò che è arrivato sul canale ufficiale. Le promesse dal sito restano «da ricevere» finché la Tesoreria non conferma."
          aside={
            <>
              <button type="button" className={inGhost} onClick={() => refresh()} disabled={!open} aria-label="Aggiorna"><RefreshCw className="size-4" aria-hidden="true" /></button>
              <button type="button" className={inBtn} onClick={() => setRecord("new")} disabled={!canWrite}><Plus className="size-4" aria-hidden="true" />Registra donazione</button>
            </>
          }
        >
          {donations.length === 0 ? <EmptyRow>{open ? "Nessuna donazione registrata." : "Le donazioni compariranno qui quando r101 sarà attivo."}</EmptyRow> : (
            <ul className="m-0 list-none p-0" data-testid="donations">
              {donations.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-[var(--in-line)] px-4 py-3 sm:px-[18px]">
                  <span className="min-w-0 flex-1">
                    <b className="block text-[15px]">{PURPOSE_LABEL[d.purpose]}{d.itemTitle ? ` · ${d.itemTitle}` : ""}{d.unitNumber ? ` · n. ${d.unitNumber}` : ""}</b>
                    <span className="text-[13.5px] text-[var(--in-sub)]">{d.code} · {donorLine(d)}{d.amount !== null ? ` · ${euro(d.amount)}` : d.pledgedAmount !== null ? ` · indicati ${euro(d.pledgedAmount)}` : ""}{d.receiptNumber ? ` · ricevuta ${d.receiptNumber}` : ""}</span>
                  </span>
                  <Chip tone={D_TONE[d.status]}>{DONATION_STATUS_LABEL[d.status]}</Chip>
                  {d.status === "PROMESSA" && <button type="button" className={inGhost} disabled={!canWrite} onClick={() => setRecord(d)}>Ricevuta</button>}
                  {d.status === "RICEVUTA" && receiptPossible(d.visibility) && !d.receiptNumber && <ReceiptButton id={d.id} disabled={!canWrite} today={today} onDone={refresh} />}
                  {d.status !== "ANNULLATA" && <VoidButton id={d.id} disabled={!canWrite || (d.status === "RICEVUTA" && !board?.canApprove)} onDone={refresh} />}
                </li>
              ))}
            </ul>
          )}
          <PrivacyNote>Nome, recapito e codice fiscale li vede solo la Tesoreria. In pubblico: il nome scelto solo con «nome pubblico», mai l'importo senza consenso.</PrivacyNote>
        </SectionCard>

        <SectionCard id="don-materiale" title="Materiale offerto" sub="Campagne «Adotta la nuova palestra SCD» e «Adotta la nuova infermeria»: valuta, controlla, ricevi, inventaria.">
          {offers.length === 0 ? <EmptyRow>{open ? "Nessuna offerta di materiale." : "Le offerte compariranno qui."}</EmptyRow> : (
            <ul className="m-0 list-none p-0" data-testid="offers">
              {offers.map((o) => (
                <li key={o.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-[var(--in-line)] px-4 py-3 sm:px-[18px]">
                  <span className="min-w-0 flex-1">
                    <b className="block text-[15px]">{o.quantity} × {o.what}</b>
                    <span className="text-[13.5px] text-[var(--in-sub)]">{o.code} · {o.campaign === "ALTRO" ? "Altro" : CAMPAIGN_COPY[o.campaign].title} · {CONDITION_LABEL[o.condition]}{isMedical(o) ? " · sanitario" : ""}</span>
                  </span>
                  <Chip tone={O_TONE[o.status]}>{OFFER_STATUS_LABEL[o.status]}</Chip>
                  <button type="button" className={inGhost} onClick={() => setOffer(o.id)}><Eye className="size-4" aria-hidden="true" />Apri</button>
                </li>
              ))}
            </ul>
          )}
          <PrivacyNote>Farmaci aperti o scaduti non si accettano mai. Il materiale sanitario lo accetta solo chi ha anche l'abilitazione «Infermeria».</PrivacyNote>
        </SectionCard>
      </div>

      {record && <RecordDialog pledge={record === "new" ? null : record} today={today} onClose={() => setRecord(null)} onDone={async (r) => { setRecord(null); await refresh(r); }} />}
      {currentOffer && board && <OfferDialog offer={currentOffer} canWrite={canWrite} canInfermeria={board.canInfermeria} today={today} onClose={() => setOffer(null)} onDone={async (r) => { setOffer(null); await refresh(r); }} />}
    </GivingShell>
  );
}

function VoidButton({ id, disabled, onDone }: { id: string; disabled: boolean; onDone: (r: ActionResult) => Promise<void> }) {
  const run = useServerFn(donationVoid);
  return (
    <button type="button" className={inGhost} disabled={disabled} onClick={async () => { const reason = window.prompt("Motivo dell'annullamento"); if (reason) await onDone(await run({ data: { id, reason } })); }}>
      Annulla
    </button>
  );
}

function ReceiptButton({ id, disabled, today, onDone }: { id: string; disabled: boolean; today: string; onDone: (r: ActionResult) => Promise<void> }) {
  const run = useServerFn(donationSetReceipt);
  return (
    <button type="button" className={inGhost} disabled={disabled} onClick={async () => { const n = window.prompt("Numero della ricevuta"); if (n) await onDone(await run({ data: { id, number: n, issuedOn: today } })); }}>
      <Receipt className="size-4" aria-hidden="true" />Ricevuta
    </button>
  );
}

function RecordDialog({ pledge, today, onClose, onDone }: { pledge: DonationRow | null; today: string; onClose: () => void; onDone: (r: ActionResult) => Promise<void> }) {
  const run = useServerFn(donationRecord);
  const [purpose, setPurpose] = useState<DonationPurpose>(pledge?.purpose ?? "FONDO_SOLIDALE");
  const [vis, setVis] = useState<Visibility>(pledge?.visibility ?? "ANONIMO_PUBBLICO");
  const [f, setF] = useState({ name: pledge?.donorName ?? "", contact: pledge?.donorContact ?? "", cf: "", publicName: pledge?.publicName ?? "", amount: pledge?.pledgedAmount?.toString() ?? "", on: today });
  const [channel, setChannel] = useState<Channel>("BONIFICO");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const errs = pledge ? {} : donorErrors({ visibility: vis, name: f.name, contact: f.contact || "—", publicName: f.publicName });
  const amount = toNum(f.amount);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!amount || amount <= 0) return setErr("Importo maggiore di zero.");
    if (Object.keys(errs).length) return setErr(Object.values(errs)[0] ?? "Controlla i dati del donatore.");
    if (!pledge && purpose === "ADOTTA_OGGETTO") return setErr("Le adozioni si registrano dalla promessa arrivata dal sito (oppure inseriscila dal sito per conto del donatore).");
    setBusy(true);
    setErr(null);
    try {
      const r = await run({ data: {
        donationId: pledge?.id ?? null, purpose, itemId: null, unitNumber: null, visibility: vis,
        donorName: f.name, donorContact: f.contact, donorFiscalCode: f.cf.toUpperCase().replace(/\s/g, ""), publicName: f.publicName, plateText: "", showAmount: false,
        amount, channel, receivedOn: f.on, season: "2026/27",
      } });
      if (!r.ok) setErr(r.message);
      else await onDone(r);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog title={pledge ? `Ricevuta la promessa ${pledge.code}` : "Registra una donazione"} onClose={onClose} testId="donation-record">
      <form onSubmit={submit} className="mt-3 max-h-[70vh] space-y-3 overflow-y-auto pr-1">
        {pledge ? (
          <p className="m-0 text-[14.5px]">{PURPOSE_LABEL[pledge.purpose]}{pledge.itemTitle ? ` · ${pledge.itemTitle}` : ""}{pledge.unitNumber ? ` · n. ${pledge.unitNumber}` : ""} · {donorLine(pledge)}</p>
        ) : (
          <>
            <InField label="Per">
              <select className={inInput} value={purpose} onChange={(e) => setPurpose(e.target.value as DonationPurpose)}>
                {DONATION_PURPOSES.filter((p) => p !== "ADOTTA_OGGETTO").map((p) => <option key={p} value={p}>{PURPOSE_LABEL[p]}</option>)}
              </select>
            </InField>
            <InField label="Visibilità scelta dal donatore">
              <select className={inInput} value={vis} onChange={(e) => setVis(e.target.value as Visibility)}>
                {VISIBILITIES.map((v) => <option key={v} value={v}>{VISIBILITY_COPY[v].label}</option>)}
              </select>
            </InField>
            {vis !== "COMPLETAMENTE_ANONIMO" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <InField label="Nome e cognome / ragione sociale"><input className={inInput} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></InField>
                <InField label="Recapito"><input className={inInput} value={f.contact} onChange={(e) => setF({ ...f, contact: e.target.value })} /></InField>
                <InField label="Codice fiscale (solo se serve alla ricevuta)"><input className={inInput} maxLength={16} value={f.cf} onChange={(e) => setF({ ...f, cf: e.target.value })} /></InField>
                {vis === "NOME_PUBBLICO" && <InField label="Nome pubblico"><input className={inInput} maxLength={60} value={f.publicName} onChange={(e) => setF({ ...f, publicName: e.target.value })} /></InField>}
              </div>
            ) : (
              <p className="m-0 text-[14px] text-[var(--in-sub)]">Nessun dato personale: niente ricevuta.</p>
            )}
          </>
        )}
        <div className="grid gap-3 sm:grid-cols-3">
          <InField label="Importo (€)"><input className={inInput} inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></InField>
          <InField label="Canale">
            <select className={inInput} value={channel} onChange={(e) => setChannel(e.target.value as Channel)}>
              {CHANNELS.map((c) => <option key={c} value={c}>{CHANNEL_LABEL[c]}</option>)}
            </select>
          </InField>
          <InField label="Arrivata il"><input type="date" className={inInput} value={f.on} max={today} onChange={(e) => setF({ ...f, on: e.target.value })} /></InField>
        </div>
        {err && <Message ok={false}>{err}</Message>}
        <button type="submit" className={inBtn} disabled={busy}>Registra come ricevuta</button>
      </form>
    </Dialog>
  );
}

function OfferDialog({ offer: o, canWrite, canInfermeria, today, onClose, onDone }: { offer: OfferRow; canWrite: boolean; canInfermeria: boolean; today: string; onClose: () => void; onDone: (r: ActionResult) => Promise<void> }) {
  const run = useServerFn(offerReview);
  const steps = nextStatuses("INKIND_OFFER", o.status) as OfferStatus[];
  const [to, setTo] = useState<OfferStatus | "">(steps[0] ?? "");
  const [f, setF] = useState({ text: "", conditionOk: false, receivedOn: today, inventoryRef: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const problem = to ? reviewProblem(o, to, { canInfermeria, text: f.text, conditionOk: f.conditionOk, receivedOn: f.receivedOn || null, inventoryRef: f.inventoryRef }, today) : null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!to || problem) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await run({ data: { id: o.id, status: to, text: f.text, conditionOk: f.conditionOk, receivedOn: to === "RICEVUTA" ? f.receivedOn : null, inventoryRef: f.inventoryRef } });
      if (!r.ok) setErr(r.message);
      else await onDone(r);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog title={`Offerta ${o.code}`} onClose={onClose} testId="offer-detail">
      <div className="mt-3 max-h-[72vh] space-y-3 overflow-y-auto pr-1 text-[15px]">
        <dl className="m-0 grid grid-cols-[minmax(0,130px)_minmax(0,1fr)] gap-x-3 gap-y-1.5">
          <dt className="font-semibold">Cosa</dt><dd className="m-0">{o.quantity} × {o.what}</dd>
          <dt className="font-semibold">Tipo</dt><dd className="m-0">{MEDICAL_KIND_LABEL[o.medicalKind]}</dd>
          <dt className="font-semibold">Condizioni</dt><dd className="m-0">{CONDITION_LABEL[o.condition]}{o.medicalKind === "FARMACO" ? ` · ${o.sealed ? "sigillato" : "non sigillato"} · scade ${itDay(o.expiresOn)}` : ""}{o.professionalCheck ? " · verificabile da un professionista" : ""}</dd>
          <dt className="font-semibold">Consegna</dt><dd className="m-0">{HANDOVER_LABEL[o.handover]}{o.town ? ` · ${o.town}` : ""}{o.hasPhotos ? " · ha foto" : ""}</dd>
          <dt className="font-semibold">Chi offre</dt><dd className="m-0 break-words">{donorLine(o)}{o.donorContact ? ` · ${o.donorContact}` : ""}</dd>
          {o.note && (<><dt className="font-semibold">Note</dt><dd className="m-0 whitespace-pre-wrap">{o.note}</dd></>)}
          {o.infoRequest && (<><dt className="font-semibold">Chiesto</dt><dd className="m-0">{o.infoRequest}</dd></>)}
          {o.declineReason && (<><dt className="font-semibold">Motivo</dt><dd className="m-0">{o.declineReason}</dd></>)}
          {o.inventoryRef && (<><dt className="font-semibold">Magazzino</dt><dd className="m-0">{o.inventoryRef}</dd></>)}
        </dl>
        {steps.length > 0 && (
          <form onSubmit={submit} className="space-y-3 rounded-xl border border-[var(--in-line)] p-3">
            <InField label="Passa a">
              <select className={inInput} value={to} onChange={(e) => setTo(e.target.value as OfferStatus)} disabled={!canWrite}>
                {steps.map((s) => <option key={s} value={s}>{OFFER_STATUS_LABEL[s]}</option>)}
              </select>
            </InField>
            {(to === "RIFIUTATA" || to === "INFO_RICHIESTE" || to === "RICEVUTA") && (
              <InField label={to === "RIFIUTATA" ? "Motivo (lo leggerà chi ha offerto)" : to === "INFO_RICHIESTE" ? "Cosa serve sapere" : "Nota sul controllo (facoltativa)"}>
                <textarea className={inArea} rows={2} maxLength={300} value={f.text} onChange={(e) => setF({ ...f, text: e.target.value })} disabled={!canWrite} />
              </InField>
            )}
            {to === "RICEVUTA" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex items-center gap-2 text-[14.5px]"><input type="checkbox" className="size-4" checked={f.conditionOk} onChange={(e) => setF({ ...f, conditionOk: e.target.checked })} disabled={!canWrite} />Controllato: in buone condizioni e sicuro</label>
                <InField label="Arrivato il"><input type="date" className={inInput} value={f.receivedOn} max={today} onChange={(e) => setF({ ...f, receivedOn: e.target.value })} disabled={!canWrite} /></InField>
              </div>
            )}
            {to === "INVENTARIATA" && <InField label="Riferimento di magazzino"><input className={inInput} maxLength={80} value={f.inventoryRef} onChange={(e) => setF({ ...f, inventoryRef: e.target.value })} disabled={!canWrite} /></InField>}
            {problem && (to === "ACCETTATA" || f.text || f.conditionOk || f.inventoryRef) && <p role="alert" className="m-0 text-[14px] font-semibold text-[var(--in-crit)]">{problem}</p>}
            {err && <Message ok={false}>{err}</Message>}
            <button type="submit" className={inBtn} disabled={!canWrite || busy || !to || problem !== null}>Salva</button>
          </form>
        )}
      </div>
    </Dialog>
  );
}
