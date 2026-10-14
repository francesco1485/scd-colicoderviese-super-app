/**
 * Adotta un oggetto (UD-113), catalogue management: what the club needs, with category, supplier, product code and
 * link, club photo (never supplier catalogue images), total price or "da preventivo", status, partial adoption and
 * numbered units with plates. An expired quote shows as "da preventivo aggiornato" until reconfirmed. Donor data stay in
 * the treasury: here only progress and the public names donors chose.
 */
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, Pencil, Plus, RefreshCw } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";

import { Dialog } from "@/components/scd/Dialog";
import { Chip, type ChipTone } from "@/components/scd/interior-ui";
import {
  CAMPAIGNS,
  CAMPAIGN_COPY,
  CATEGORY_LABEL,
  ITEM_CATEGORIES,
  ITEM_STATUS_LABEL,
  PRICE_MODES,
  PRICE_MODE_LABEL,
  euro,
  itDay,
  itemErrors,
  nextStatuses,
  priceLine,
  unitPriceOf,
  type AdoptBoard,
  type AdoptItemRow,
  type ItemDraft,
  type ItemStatus,
  type PriceMode,
} from "@/lib/giving";
import { adoptSave, adoptSetStatus, getAdoptBoard, type ActionResult } from "@/lib/giving.functions";
import type { GivingGate } from "@/lib/giving.server";
import { EmptyRow, GivingShell, InField, Message, PrivacyNote, SectionCard, inArea, inBtn, inGhost, inInput, showsStructure } from "./backoffice";

const TONE: Readonly<Record<ItemStatus, ChipTone>> = { BOZZA: "mute", DA_ADOTTARE: "warn", IN_RACCOLTA: "info", ADOTTATO: "ok", CONSEGNATO: "ok", RITIRATO: "mute" };

function romeToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

const EMPTY: ItemDraft = {
  title: "", category: "", description: "", supplier: "", supplierCode: "", productUrl: "", photoPath: "", priceMode: "DA_PREVENTIVO",
  priceTotal: "", priceNote: "", quoteRef: "", quoteValidUntil: "", unitLabel: "", unitsTotal: "", unitPrice: "", campaign: "", published: false,
};

function draftOf(i: AdoptItemRow): ItemDraft {
  return {
    title: i.title, category: i.category, description: i.description, supplier: i.supplier ?? "", supplierCode: i.supplierCode ?? "",
    productUrl: i.productUrl ?? "", photoPath: i.photoPath ?? "", priceMode: i.priceMode, priceTotal: i.priceTotal?.toString() ?? "",
    priceNote: i.priceNote ?? "", quoteRef: i.quoteRef ?? "", quoteValidUntil: i.quoteValidUntil ?? "", unitLabel: i.unitLabel ?? "",
    unitsTotal: i.unitsTotal?.toString() ?? "", unitPrice: i.unitPrice?.toString() ?? "", campaign: i.campaign ?? "", published: i.published,
  };
}
const toNum = (s: string): number | null => (s.trim() && Number.isFinite(Number(s.replace(",", "."))) ? Number(s.replace(",", ".")) : null);

export function AdoptPage({ initial }: { initial: { gate: GivingGate; board: AdoptBoard | null; error: string | null } }) {
  const [view, setView] = useState(initial);
  const reload = useServerFn(getAdoptBoard);
  const setStatus = useServerFn(adoptSetStatus);
  const today = useMemo(romeToday, []);
  const { gate, board } = view;
  const open = gate.state === "open" && board !== null;
  const canWrite = open && board.canWrite;
  const [edit, setEdit] = useState<AdoptItemRow | "new" | null>(null);
  const [msg, setMsg] = useState<ActionResult | null>(null);
  const items = board?.items ?? [];

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
        { value: open ? items.filter((i) => i.published).length : null, label: "oggetti pubblicati" },
        { value: open ? items.filter((i) => i.status === "IN_RACCOLTA").length : null, label: "in raccolta" },
        { value: open ? items.reduce((s, i) => s + i.pledges, 0) : null, label: "promesse da ricevere (Tesoreria)" },
      ]}
    >
      {view.error && <Message ok={false}>{view.error}</Message>}
      {msg && <Message ok={msg.ok}>{msg.message}</Message>}
      <SectionCard
        id="adotta-catalogo"
        title="Catalogo"
        sub="Pubblicare richiede il livello «Approva». Un preventivo scaduto si mostra «da preventivo aggiornato» finché non lo riconfermi."
        aside={
          <>
            <button type="button" className={inGhost} onClick={() => refresh()} disabled={!open} aria-label="Aggiorna"><RefreshCw className="size-4" aria-hidden="true" /></button>
            <button type="button" className={inBtn} onClick={() => setEdit("new")} disabled={!canWrite}><Plus className="size-4" aria-hidden="true" />Nuovo oggetto</button>
          </>
        }
      >
        {items.length === 0 ? <EmptyRow>{open ? "Catalogo vuoto: aggiungi il primo oggetto." : "Gli oggetti compariranno qui quando le adozioni saranno aperte online. Nessun oggetto viene inserito in automatico."}</EmptyRow> : (
          <ul className="m-0 list-none p-0" data-testid="adopt-items">
            {items.map((i) => {
              const target = i.effectivePriceMode === "PREZZO" ? i.priceTotal : null;
              return (
                <li key={i.id} className="border-t border-[var(--in-line)] px-4 py-3 sm:px-[18px]">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    <span className="min-w-0 flex-1">
                      <b className="block text-[15.5px]">{i.title}</b>
                      <span className="text-[13.5px] text-[var(--in-sub)]">{i.code} · {CATEGORY_LABEL[i.category]}{i.supplier ? ` · ${i.supplier}${i.supplierCode ? ` ${i.supplierCode}` : ""}` : ""} · {priceLine({ priceMode: i.effectivePriceMode, priceTotal: i.priceTotal, priceNote: i.priceNote })}</span>
                    </span>
                    {i.effectivePriceMode !== i.priceMode && <Chip tone="crit">Preventivo scaduto {itDay(i.quoteValidUntil)}</Chip>}
                    <Chip tone={i.published ? "info" : "mute"}>{i.published ? "Pubblicato" : "Non pubblicato"}</Chip>
                    <Chip tone={TONE[i.status]}>{ITEM_STATUS_LABEL[i.status]}</Chip>
                    <button type="button" className={inGhost} onClick={() => setEdit(i)} disabled={!canWrite}><Pencil className="size-4" aria-hidden="true" />Modifica</button>
                  </div>
                  <p className="m-0 mt-1.5 text-[14px]">
                    Ricevuti {euro(i.received)} da {i.contributions} contributi{target ? ` su ${euro(target)} (${Math.min(100, Math.floor((i.received * 100) / target))}%)` : ""}
                    {i.unitsTotal !== null ? ` · adottati ${i.unitsAdopted}/${i.unitsTotal} (unità: ${i.unitLabel ?? "unità"})${unitPriceOf(i) !== null ? ` (${euro(unitPriceOf(i))} l'uno)` : ""}` : ""}
                    {i.pledges > 0 ? ` · ${i.pledges} promesse da ricevere` : ""}
                  </p>
                  {i.productUrl && <a href={i.productUrl} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-[14px] font-semibold text-[var(--in-info)] underline">Scheda del fornitore<ExternalLink className="size-3.5" aria-hidden="true" /><span className="sr-only"> (nuova scheda)</span></a>}
                  {nextStatuses("ADOPT_ITEM", i.status).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(nextStatuses("ADOPT_ITEM", i.status) as ItemStatus[]).map((s) => (
                        <button key={s} type="button" className={inGhost} disabled={!canWrite} onClick={async () => refresh(await setStatus({ data: { id: i.id, status: s } }))}>
                          {s === "DA_ADOTTARE" && i.status === "BOZZA" ? "Pronto da adottare" : `Segna «${ITEM_STATUS_LABEL[s]}»`}
                        </button>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <PrivacyNote>Foto: solo immagini scattate o fornite dal club. Non copiare le foto dei cataloghi dei fornitori: metti il link alla scheda.</PrivacyNote>
      </SectionCard>
      {edit && <ItemDialog item={edit === "new" ? null : edit} canApprove={board?.canApprove ?? false} onClose={() => setEdit(null)} onDone={async (r) => { setEdit(null); await refresh(r); }} />}
    </GivingShell>
  );
}

function ItemDialog({ item, canApprove, onClose, onDone }: { item: AdoptItemRow | null; canApprove: boolean; onClose: () => void; onDone: (r: ActionResult) => Promise<void> }) {
  const save = useServerFn(adoptSave);
  const [d, setD] = useState<ItemDraft>(item ? draftOf(item) : EMPTY);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const errs = itemErrors(d);
  const set = <K extends keyof ItemDraft>(k: K, v: ItemDraft[K]) => setD({ ...d, [k]: v });
  const unitsLocked = (item?.unitsAdopted ?? 0) > 0;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setTried(true);
    if (Object.keys(errs).length || !d.category) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await save({ data: {
        id: item?.id ?? null, title: d.title.trim(), category: d.category, description: d.description, supplier: d.supplier, supplierCode: d.supplierCode,
        productUrl: d.productUrl.trim(), photoPath: d.photoPath.trim(), priceMode: d.priceMode, priceTotal: d.priceMode === "PREZZO" ? toNum(d.priceTotal) : null,
        priceNote: d.priceNote, quoteRef: d.quoteRef, quoteValidUntil: d.quoteValidUntil || null, unitLabel: d.unitLabel, unitsTotal: d.unitsTotal.trim() ? Number(d.unitsTotal) : null,
        unitPrice: toNum(d.unitPrice), campaign: d.campaign || null, published: d.published,
      } });
      if (!r.ok) setErr(r.message);
      else await onDone(r);
    } finally {
      setBusy(false);
    }
  }
  const E = ({ k }: { k: keyof ItemDraft }) => (tried && errs[k] ? <span className="block text-[13px] font-semibold text-[var(--in-crit)]">{errs[k]}</span> : null);

  return (
    <Dialog title={item ? `Modifica ${item.code}` : "Nuovo oggetto da adottare"} onClose={onClose} testId="adopt-edit">
      <form onSubmit={submit} noValidate className="mt-3 max-h-[72vh] space-y-3 overflow-y-auto pr-1">
        <InField label="Titolo"><input className={inInput} maxLength={120} value={d.title} onChange={(e) => set("title", e.target.value)} /></InField>
        <E k="title" />
        <div className="grid gap-3 sm:grid-cols-2">
          <InField label="Categoria">
            <select className={inInput} value={d.category} onChange={(e) => set("category", e.target.value as ItemDraft["category"])}>
              <option value="">Scegli…</option>
              {ITEM_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
            </select>
          </InField>
          <InField label="Campagna (facoltativa)">
            <select className={inInput} value={d.campaign} onChange={(e) => set("campaign", e.target.value as ItemDraft["campaign"])}>
              <option value="">Nessuna</option>
              {CAMPAIGNS.map((c) => <option key={c} value={c}>{CAMPAIGN_COPY[c].title}</option>)}
            </select>
          </InField>
        </div>
        <E k="category" />
        <InField label="Descrizione"><textarea className={inArea} rows={3} maxLength={1500} value={d.description} onChange={(e) => set("description", e.target.value)} /></InField>
        <div className="grid gap-3 sm:grid-cols-2">
          <InField label="Fornitore"><input className={inInput} maxLength={120} value={d.supplier} onChange={(e) => set("supplier", e.target.value)} /></InField>
          <InField label="Codice prodotto del fornitore"><input className={inInput} maxLength={60} value={d.supplierCode} onChange={(e) => set("supplierCode", e.target.value)} /></InField>
          <InField label="Link alla scheda del prodotto" className="sm:col-span-2"><input className={inInput} maxLength={500} placeholder="https://" value={d.productUrl} onChange={(e) => set("productUrl", e.target.value)} /></InField>
          <InField label="Foto del club (percorso nell'app, facoltativa)" hint="Solo foto del club. Mai immagini del catalogo del fornitore." className="sm:col-span-2"><input className={inInput} maxLength={200} placeholder="/foto/club/…" value={d.photoPath} onChange={(e) => set("photoPath", e.target.value)} /></InField>
        </div>
        <E k="productUrl" /><E k="photoPath" />
        <fieldset className="space-y-2 rounded-xl border border-[var(--in-line)] p-3">
          <legend className="px-1 text-[13px] font-semibold text-[var(--in-sub)]">Prezzo</legend>
          <div className="flex flex-wrap gap-2">
            {PRICE_MODES.map((m) => (
              <label key={m} className={`${inGhost} cursor-pointer ${d.priceMode === m ? "border-[var(--in-info)] bg-[var(--in-info-bg)]" : ""}`}>
                <input type="radio" className="sr-only" checked={d.priceMode === m} onChange={() => setD({ ...d, priceMode: m as PriceMode, priceTotal: m === "PREZZO" ? d.priceTotal : "" })} />{PRICE_MODE_LABEL[m]}
              </label>
            ))}
          </div>
          {d.priceMode === "PREZZO" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <InField label="Totale (€)"><input className={inInput} inputMode="decimal" value={d.priceTotal} onChange={(e) => set("priceTotal", e.target.value)} /></InField>
              <InField label="Nota sul prezzo" hint="Es. «54.500 € + IVA 22%»."><input className={inInput} maxLength={200} value={d.priceNote} onChange={(e) => set("priceNote", e.target.value)} /></InField>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <InField label="Preventivo / offerta (riferimento)"><input className={inInput} maxLength={200} value={d.quoteRef} onChange={(e) => set("quoteRef", e.target.value)} /></InField>
            <InField label="Offerta valida fino al"><input type="date" className={inInput} value={d.quoteValidUntil} onChange={(e) => set("quoteValidUntil", e.target.value)} /></InField>
          </div>
          <E k="priceTotal" />
        </fieldset>
        <fieldset className="space-y-2 rounded-xl border border-[var(--in-line)] p-3">
          <legend className="px-1 text-[13px] font-semibold text-[var(--in-sub)]">Unità adottabili (facoltative)</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            <InField label="Nome dell'unità" hint="Es. «posto»."><input className={inInput} maxLength={30} value={d.unitLabel} onChange={(e) => set("unitLabel", e.target.value)} disabled={unitsLocked} /></InField>
            <InField label="Quante"><input className={inInput} inputMode="numeric" value={d.unitsTotal} onChange={(e) => set("unitsTotal", e.target.value)} disabled={unitsLocked} /></InField>
            <InField label="Prezzo per unità (€)" hint="Vuoto = totale diviso per le unità."><input className={inInput} inputMode="decimal" value={d.unitPrice} onChange={(e) => set("unitPrice", e.target.value)} /></InField>
          </div>
          {unitsLocked && <p className="m-0 text-[13px] text-[var(--in-sub)]">Alcune unità sono già adottate: il numero non si cambia.</p>}
          <E k="unitLabel" /><E k="unitsTotal" /><E k="unitPrice" />
        </fieldset>
        <label className="flex items-start gap-2 text-[14.5px]">
          <input type="checkbox" className="mt-1 size-4" checked={d.published} onChange={(e) => set("published", e.target.checked)} disabled={!canApprove} />
          <span>Pubblicato nella pagina «Sostieni il club» {canApprove ? "" : "(serve il livello «Approva»)"}</span>
        </label>
        {err && <Message ok={false}>{err}</Message>}
        <button type="submit" className={inBtn} disabled={busy}>Salva</button>
      </form>
    </Dialog>
  );
}
