/**
 * Public pieces of "Sostieni il club" (UD-113): catalogue cards with honest progress, units grid, the donor visibility
 * choice, the adoption pledge dialog, the goods offer form and the improvement proposal form. Same public visual system
 * as /sponsor (card-premium, eyebrow, surface-sun). No payment in the app; companies go to /sponsor#proposta.
 */
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Building2, Check, Clock, ExternalLink, HeartHandshake, Info, Package, ShieldCheck } from "lucide-react";
import { useId, useMemo, useState, type FormEvent, type ReactNode } from "react";

import { Dialog } from "@/components/scd/Dialog";
import { Field, inputCls } from "@/components/ui-kit";
import {
  CAMPAIGN_COPY,
  CATEGORY_LABEL,
  CONDITIONS,
  CONDITION_LABEL,
  CONTRIBUTIONS,
  CONTRIBUTION_LABEL,
  DEFAULT_VISIBILITY,
  HANDOVERS,
  HANDOVER_LABEL,
  ITEM_STATUS_LABEL,
  MEDICAL_KINDS,
  MEDICAL_KIND_LABEL,
  NOT_ACTIVE_TEXT,
  NOT_ACTIVE_TITLE,
  OUTCOME_TEXT,
  PROPOSAL_AREAS,
  PROPOSAL_AREA_LABEL,
  VISIBILITIES,
  VISIBILITY_COPY,
  donorErrors,
  euro,
  offerRefusal,
  priceLine,
  proposalErrors,
  receivedText,
  type Campaign,
  type Condition,
  type Contribution,
  type Handover,
  type MedicalKind,
  type OfferCampaign,
  type ProposalArea,
  type PublicItem,
  type SubmitOutcome,
  type Visibility,
} from "@/lib/giving";
import { submitOffer, submitPledge, submitProposal } from "@/lib/giving.functions";
import { ANONYMOUS_PLATE } from "@/lib/tribune-seats";

import { btnLine, btnSun } from "./buttons";

export { btnLine, btnSun };

function romeToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

/** "Da attivare" note shown on public pages until r101 is applied. */
export function NotActiveNote({ children }: { children?: ReactNode }) {
  return (
    <div role="note" data-testid="giving-not-active" className="flex items-start gap-3 rounded-xl border border-accent bg-accent/15 px-4 py-3 text-sm">
      <Clock className="mt-0.5 size-5 flex-none text-primary" aria-hidden="true" />
      <p className="m-0">
        <strong>{NOT_ACTIVE_TITLE}.</strong> {NOT_ACTIVE_TEXT}
        {children && <span className="mt-1 block text-muted-foreground">{children}</span>}
      </p>
    </div>
  );
}

function OutcomeNote({ outcome, kind }: { outcome: SubmitOutcome | null; kind: "proposal" | "offer" | "pledge" }) {
  if (!outcome) return null;
  return (
    <div role="status" aria-live="polite" className={`mt-4 rounded-xl border p-4 text-sm ${outcome.ok ? "border-primary/30 bg-primary/5" : "border-accent bg-accent/15"}`}>
      <p className="m-0 font-semibold">{outcome.ok ? "Inviato" : "Non inviato"}</p>
      <p className="m-0 mt-1 text-muted-foreground">{outcome.ok ? receivedText(kind, outcome.reference) : OUTCOME_TEXT[outcome.code]}</p>
    </div>
  );
}

function ErrorText({ id, text }: { id: string; text: string | undefined }) {
  if (!text) return null;
  return <span id={id} className="block text-xs font-semibold text-destructive">{text}</span>;
}

/** Hidden honeypot: real people never fill it. */
function Honeypot({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
      <label>
        Sito web
        <input tabIndex={-1} autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} />
      </label>
    </div>
  );
}

function PrivacyCheck({ checked, onChange, error }: { checked: boolean; onChange: (v: boolean) => void; error?: string | undefined }) {
  const id = useId();
  return (
    <div>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1 size-4" checked={checked} onChange={(e) => onChange(e.target.checked)} aria-describedby={error ? `${id}-e` : undefined} />
        <span>
          Ho letto l'<Link to="/privacy" className="font-semibold text-primary underline">informativa privacy</Link>: i miei dati servono solo a ricontattarmi e, per le donazioni, alla ricevuta della Tesoreria.
        </span>
      </label>
      <ErrorText id={`${id}-e`} text={error} />
    </div>
  );
}

/* ------------------------------------------------------------------ visibility */

export function VisibilityChoice({ value, onChange, name }: { value: Visibility; onChange: (v: Visibility) => void; name: string }) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Come vuoi comparire</legend>
      {VISIBILITIES.map((v) => (
        <label key={v} className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 text-sm ${value === v ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
          <input type="radio" name={name} value={v} checked={value === v} onChange={() => onChange(v)} className="mt-1 size-4" />
          <span>
            <strong className="block">{VISIBILITY_COPY[v].label}</strong>
            <span className="text-muted-foreground">{VISIBILITY_COPY[v].text}</span>
          </span>
        </label>
      ))}
    </fieldset>
  );
}

/* ------------------------------------------------------------------ catalogue */

export function ProgressBar({ pct, label }: { pct: number; label: string }) {
  const v = Math.max(0, Math.min(100, Math.round(pct)));
  return (
    <div>
      <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={v} aria-label={label} className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${v}%` }} />
      </div>
      <p className="m-0 mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

const STATUS_TONE: Record<string, string> = {
  DA_ADOTTARE: "bg-accent/25 text-foreground",
  IN_RACCOLTA: "bg-primary/10 text-primary",
  ADOTTATO: "bg-emerald-100 text-emerald-900",
  CONSEGNATO: "bg-emerald-600 text-white",
};

export function ItemCard({ item, onAdopt }: { item: PublicItem; onAdopt?: (item: PublicItem) => void }) {
  const adopted = item.units.filter((u) => u.adopted).length;
  const pct = item.priceMode === "PREZZO" && item.priceTotal && item.collected !== null ? (item.collected * 100) / item.priceTotal : null;
  const open = item.status === "DA_ADOTTARE" || item.status === "IN_RACCOLTA";
  return (
    <article className="card-premium flex min-w-0 flex-col p-5" data-testid="adopt-item">
      {item.photoPath ? (
        <img src={item.photoPath} alt={`Foto del club: ${item.title}`} className="-mx-5 -mt-5 mb-4 aspect-[16/9] w-[calc(100%+2.5rem)] max-w-none rounded-t-2xl object-cover" loading="lazy" />
      ) : (
        <div className="-mx-5 -mt-5 mb-4 grid aspect-[16/9] w-[calc(100%+2.5rem)] max-w-none place-items-center rounded-t-2xl bg-muted text-muted-foreground" aria-hidden="true">
          <Package className="size-10" />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <span className="eyebrow">{CATEGORY_LABEL[item.category]}</span>
        <span className={`rounded-full px-2 py-0.5 text-[0.7rem] font-bold uppercase ${STATUS_TONE[item.status] ?? "bg-muted"}`}>{ITEM_STATUS_LABEL[item.status]}</span>
      </div>
      <h3 className="mt-1 text-xl font-bold leading-tight">{item.title}</h3>
      {item.description && <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>}
      <dl className="mt-3 space-y-1 text-sm">
        {item.supplier && (
          <div className="flex flex-wrap gap-x-2"><dt className="font-semibold">Fornitore</dt><dd className="m-0">{item.supplier}{item.supplierCode ? ` · codice ${item.supplierCode}` : ""}</dd></div>
        )}
        <div className="flex flex-wrap gap-x-2"><dt className="font-semibold">Prezzo</dt><dd className="m-0">{priceLine(item)}</dd></div>
      </dl>
      {item.productUrl && (
        <a href={item.productUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary underline">
          Scheda del prodotto <ExternalLink className="size-3.5" aria-hidden="true" /><span className="sr-only"> (sito del fornitore, nuova scheda)</span>
        </a>
      )}
      <div className="mt-4 space-y-3">
        {pct !== null && <ProgressBar pct={pct} label={`Raccolti ${euro(item.collected)} su ${euro(item.priceTotal)}`} />}
        {pct === null && item.contributions > 0 && (
          <p className="m-0 text-xs text-muted-foreground">{item.contributions === 1 ? "1 contributo ricevuto" : `${item.contributions} contributi ricevuti`}: l'importo resta riservato.</p>
        )}
        {item.unitsTotal !== null && (
          <ProgressBar pct={(adopted * 100) / item.unitsTotal} label={`Adottati ${adopted} su ${item.unitsTotal} (unità: ${item.unitLabel ?? "unità"})${item.unitPrice !== null ? ` · ${euro(item.unitPrice)} ciascuno` : ""}`} />
        )}
        {item.adopters.length > 0 && (
          <p className="m-0 text-sm"><strong>Grazie a</strong> {item.adopters.map((a) => (a.amount !== null ? `${a.name} (${euro(a.amount)})` : a.name)).join(", ")}{item.anonymousAdopters > 0 ? ` e ${item.anonymousAdopters} anonimi` : ""}.</p>
        )}
      </div>
      {onAdopt && open && (
        <button type="button" className={`${btnSun} mt-4`} onClick={() => onAdopt(item)} data-testid="adopt-open">
          <HeartHandshake className="size-4" aria-hidden="true" /> Adotta{item.unitsTotal !== null ? ` un ${item.unitLabel ?? "posto"}` : ""}
        </button>
      )}
    </article>
  );
}

/** Numbered units (e.g. tribune seats): free / adopted with the plate text the donor chose. */
export function UnitsGrid({ item, picked, onPick }: { item: PublicItem; picked: number | null; onPick: (n: number) => void }) {
  return (
    <fieldset>
      <legend className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Scegli il {item.unitLabel ?? "posto"}</legend>
      <ul className="m-0 mt-2 grid max-h-56 list-none grid-cols-6 gap-1.5 overflow-y-auto p-0 sm:grid-cols-10">
        {item.units.map((u) => (
          <li key={u.n}>
            <button
              type="button"
              disabled={u.adopted}
              aria-pressed={picked === u.n}
              aria-label={`${item.unitLabel === "posto" || !item.unitLabel ? "Posto" : item.unitLabel} ${u.n}, ${u.adopted ? `adottato${u.plate ? `: ${u.plate}` : ""}` : "libero"}`}
              title={u.adopted ? (u.plate ? `Adottato: ${u.plate}` : "Adottato") : `Libero: ${item.unitLabel ?? "posto"} ${u.n}`}
              onClick={() => onPick(u.n)}
              className={`scd-focus h-11 w-full rounded-md text-sm font-bold ${u.adopted ? "cursor-not-allowed bg-muted text-muted-foreground line-through" : picked === u.n ? "bg-primary text-primary-foreground" : "border border-border bg-card"}`}
            >
              {u.n}
            </button>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}

/* ------------------------------------------------------------------ pledge */

export function PledgeDialog({ item, onClose, active, initialUnit = null }: {
  item: PublicItem;
  onClose: () => void;
  active: boolean;
  /** Seat already chosen on the tribune map (C2 "Adotta un seggiolino"). */
  initialUnit?: number | null;
}) {
  const send = useServerFn(submitPledge);
  const [company, setCompany] = useState(false);
  const [unit, setUnit] = useState<number | null>(initialUnit);
  const [plateConsent, setPlateConsent] = useState(false);
  const [vis, setVis] = useState<Visibility>(DEFAULT_VISIBILITY);
  const [f, setF] = useState({ name: "", contact: "", publicName: "", plateText: "", amount: "" });
  const [showAmount, setShowAmount] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [website, setWebsite] = useState("");
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<SubmitOutcome | null>(null);
  const errs = donorErrors({ visibility: vis, name: f.name, contact: f.contact, publicName: f.publicName, plateText: f.plateText, showAmount, unit: unit !== null });
  const needsUnit = item.unitsTotal !== null && unit === null;
  const needsPrivacy = vis !== "COMPLETAMENTE_ANONIMO" && !privacy;
  // The plate text is printed only with explicit consent (C2): without it the plate says "Un amico della ColicoDerviese".
  const needsPlateConsent = vis === "NOME_PUBBLICO" && f.plateText.trim() !== "" && !plateConsent;
  const amount = f.amount.trim() ? Number(f.amount.replace(",", ".")) : null;
  const amountBad = amount !== null && !(Number.isFinite(amount) && amount > 0 && amount <= 100000);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setTried(true);
    if (!active) return setOutcome({ ok: false, code: "NOT_ACTIVE" });
    if (Object.keys(errs).length || needsUnit || needsPrivacy || needsPlateConsent || amountBad) return;
    setBusy(true);
    try {
      const plateText = vis === "NOME_PUBBLICO" && plateConsent ? f.plateText : "";
      setOutcome(await send({ data: { itemId: item.id, unitNumber: unit, visibility: vis, donorName: f.name, donorContact: f.contact, publicName: f.publicName, plateText, showAmount, pledgedAmount: amount, privacy, website } }));
    } catch {
      setOutcome({ ok: false, code: "ERROR" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog title={`Adotta: ${item.title}`} onClose={onClose} testId="pledge-dialog">
      <div className="mt-3 max-h-[70vh] overflow-y-auto pr-1">
        {!active && <NotActiveNote />}
        <p className={`m-0 text-sm text-muted-foreground ${!active ? "mt-3" : ""}`}>L'app non incassa nulla: registri la tua adozione e la Tesoreria ti spiega come versare dai canali ufficiali del club. Il versamento vale solo quando la Tesoreria lo conferma.</p>
        {item.unitsTotal !== null && (
          <p className="m-0 mt-2 text-sm text-muted-foreground">Per privati e famiglie è una donazione (erogazione liberale): la Tesoreria rilascia la ricevuta. Un'azienda che vuole visibilità con fattura fa una sponsorizzazione.</p>
        )}
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Chi adotta">
          <button type="button" aria-pressed={!company} onClick={() => setCompany(false)} className={`${btnLine} ${!company ? "border-primary bg-primary/5" : ""}`}>Privato o famiglia</button>
          <button type="button" aria-pressed={company} onClick={() => setCompany(true)} className={`${btnLine} ${company ? "border-primary bg-primary/5" : ""}`}><Building2 className="size-4" aria-hidden="true" />Azienda</button>
        </div>
        {company ? (
          <div className="mt-4 rounded-xl border border-border bg-card p-4 text-sm">
            <p className="m-0">Le aziende passano dall'area sponsor: ti proponiamo visibilità e accordo su misura.</p>
            <Link to="/sponsor" hash="proposta" className={`${btnSun} mt-3`}>Vai alla richiesta sponsor</Link>
          </div>
        ) : outcome?.ok ? (
          <OutcomeNote outcome={outcome} kind="pledge" />
        ) : (
          <form onSubmit={submit} noValidate className="relative mt-4 space-y-4">
            <Honeypot value={website} onChange={setWebsite} />
            {item.unitsTotal !== null && (
              <div>
                <UnitsGrid item={item} picked={unit} onPick={setUnit} />
                {tried && needsUnit && <span className="block text-xs font-semibold text-destructive">Scegli un {item.unitLabel ?? "posto"} libero.</span>}
              </div>
            )}
            <VisibilityChoice value={vis} onChange={setVis} name={`vis-${item.id}`} />
            {vis !== "COMPLETAMENTE_ANONIMO" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nome e cognome (riservato)"><input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoComplete="name" aria-invalid={tried && !!errs.name} /></Field>
                <Field label="E-mail o telefono (riservato)"><input className={inputCls} value={f.contact} onChange={(e) => setF({ ...f, contact: e.target.value })} autoComplete="email" aria-invalid={tried && !!errs.contact} /></Field>
                {tried && <ErrorText id="pl-name" text={errs.name ?? errs.contact} />}
              </div>
            )}
            {vis === "COMPLETAMENTE_ANONIMO" && tried && <ErrorText id="pl-anon" text={errs.name} />}
            {vis === "NOME_PUBBLICO" && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Nome da mostrare" hint="Es. «Famiglia Rossi», «Bar Sport». Niente recapiti."><input className={inputCls} value={f.publicName} onChange={(e) => setF({ ...f, publicName: e.target.value })} aria-invalid={tried && !!errs.publicName} /></Field>
                {item.unitsTotal !== null && (
                  <Field label="Testo della targhetta (facoltativo)" hint="Compare sulla targhetta numerata del posto. Niente nomi di ragazzi minorenni, niente recapiti."><input className={inputCls} value={f.plateText} maxLength={60} onChange={(e) => setF({ ...f, plateText: e.target.value })} /></Field>
                )}
                {item.unitsTotal !== null && f.plateText.trim() !== "" && (
                  <label className="flex items-start gap-2 text-sm sm:col-span-2">
                    <input type="checkbox" className="mt-1 size-4" checked={plateConsent} onChange={(e) => setPlateConsent(e.target.checked)} aria-invalid={tried && needsPlateConsent} />
                    <span>Autorizzo il club a scrivere questo testo sulla targhetta del posto. Senza il mio consenso la targhetta dice «{ANONYMOUS_PLATE}».</span>
                  </label>
                )}
                <label className="flex items-start gap-2 text-sm sm:col-span-2">
                  <input type="checkbox" className="mt-1 size-4" checked={showAmount} onChange={(e) => setShowAmount(e.target.checked)} />
                  <span>Mostra anche l'importo accanto al mio nome (di solito resta riservato).</span>
                </label>
                {tried && <ErrorText id="pl-pub" text={errs.publicName ?? errs.plateText ?? (needsPlateConsent ? "Per la targhetta serve il tuo consenso (oppure lascia vuoto il testo)." : undefined)} />}
              </div>
            )}
            <Field label="Quanto pensi di dare (facoltativo, riservato)" hint="Serve solo alla Tesoreria per prepararsi: non è un pagamento.">
              <input className={inputCls} inputMode="decimal" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} aria-invalid={tried && amountBad} />
            </Field>
            {vis !== "COMPLETAMENTE_ANONIMO" && <PrivacyCheck checked={privacy} onChange={setPrivacy} error={tried && needsPrivacy ? "Serve la presa visione dell'informativa." : undefined} />}
            <button type="submit" className={btnSun} disabled={busy}>{busy ? "Invio…" : "Registra l'adozione"}</button>
            <OutcomeNote outcome={outcome} kind="pledge" />
          </form>
        )}
      </div>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ goods offer */

export function OfferForm({ campaign: initialCampaign, active }: { campaign: OfferCampaign; active: boolean }) {
  const send = useServerFn(submitOffer);
  const today = useMemo(romeToday, []);
  const [campaign, setCampaign] = useState<OfferCampaign>(initialCampaign);
  const [f, setF] = useState({ what: "", quantity: "1", town: "", note: "", expiresOn: "", name: "", contact: "", publicName: "" });
  const [condition, setCondition] = useState<Condition>("BUONO");
  const [medicalKind, setMedicalKind] = useState<MedicalKind>(initialCampaign === "INFERMERIA" ? "MATERIALE_CONSUMO" : "NON_MEDICO");
  const [sealed, setSealed] = useState(false);
  const [professionalCheck, setProfessionalCheck] = useState(false);
  const [hasPhotos, setHasPhotos] = useState(false);
  const [handover, setHandover] = useState<Handover>("CONSEGNA");
  const [vis, setVis] = useState<Visibility>(DEFAULT_VISIBILITY);
  const [privacy, setPrivacy] = useState(false);
  const [website, setWebsite] = useState("");
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<SubmitOutcome | null>(null);

  const quantity = Number(f.quantity);
  const refusal = offerRefusal(
    { campaign, what: f.what, quantity, condition, medicalKind, sealed, expiresOn: f.expiresOn || null, professionalCheck, handover, note: f.note, visibility: vis },
    today,
  );
  const dErrs = donorErrors({ visibility: vis, name: f.name, contact: f.contact, publicName: f.publicName });
  const needsPrivacy = vis !== "COMPLETAMENTE_ANONIMO" && !privacy;
  const medical = campaign === "INFERMERIA" || medicalKind !== "NON_MEDICO";

  async function submit(e: FormEvent) {
    e.preventDefault();
    setTried(true);
    if (!active) return setOutcome({ ok: false, code: "NOT_ACTIVE" });
    if (refusal || Object.keys(dErrs).length || needsPrivacy) return;
    setBusy(true);
    try {
      setOutcome(await send({ data: {
        campaign, itemId: null, what: f.what, quantity, condition, medicalKind, sealed, expiresOn: f.expiresOn || null, professionalCheck, hasPhotos, handover,
        town: f.town, note: f.note, visibility: vis, donorName: f.name, donorContact: f.contact, publicName: f.publicName, privacy, website,
      } }));
    } catch {
      setOutcome({ ok: false, code: "ERROR" });
    } finally {
      setBusy(false);
    }
  }

  if (outcome?.ok) return <OutcomeNote outcome={outcome} kind="offer" />;

  return (
    <form onSubmit={submit} noValidate className="relative space-y-5" data-testid="offer-form">
      <Honeypot value={website} onChange={setWebsite} />
      <fieldset className="flex flex-wrap gap-2">
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Per quale campagna</legend>
        {(["PALESTRA", "INFERMERIA", "ALTRO"] as const).map((c) => (
          <label key={c} className={`${btnLine} cursor-pointer ${campaign === c ? "border-primary bg-primary/5" : ""}`}>
            <input type="radio" name="campaign" className="sr-only" checked={campaign === c} onChange={() => { setCampaign(c); if (c === "INFERMERIA" && medicalKind === "NON_MEDICO") setMedicalKind("MATERIALE_CONSUMO"); }} />
            {c === "ALTRO" ? "Altro per il club" : CAMPAIGN_COPY[c].title}
          </label>
        ))}
      </fieldset>
      {campaign !== "ALTRO" && (
        <p className="m-0 flex items-start gap-2 rounded-xl bg-muted px-3 py-2 text-sm"><ShieldCheck className="mt-0.5 size-4 flex-none text-primary" aria-hidden="true" />{CAMPAIGN_COPY[campaign].rule}</p>
      )}
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_120px]">
        <Field label="Cosa vuoi donare"><input className={inputCls} value={f.what} maxLength={200} onChange={(e) => setF({ ...f, what: e.target.value })} aria-invalid={tried && refusal === "INVALID"} /></Field>
        <Field label="Quantità"><input className={inputCls} inputMode="numeric" value={f.quantity} onChange={(e) => setF({ ...f, quantity: e.target.value })} /></Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Che tipo di oggetto">
          <select className={inputCls} value={medicalKind} onChange={(e) => setMedicalKind(e.target.value as MedicalKind)}>
            {MEDICAL_KINDS.map((k) => <option key={k} value={k}>{MEDICAL_KIND_LABEL[k]}</option>)}
          </select>
        </Field>
        <Field label="Condizioni">
          <select className={inputCls} value={condition} onChange={(e) => setCondition(e.target.value as Condition)}>
            {CONDITIONS.map((c) => <option key={c} value={c}>{CONDITION_LABEL[c]}</option>)}
          </select>
        </Field>
      </div>
      {medicalKind === "FARMACO" && (
        <div className="grid gap-3 rounded-xl border border-accent bg-accent/10 p-3 sm:grid-cols-2">
          <p className="m-0 text-sm sm:col-span-2"><strong>Farmaci:</strong> solo confezioni sigillate e non scadute. Farmaci aperti o scaduti non si accettano mai.</p>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4" checked={sealed} onChange={(e) => setSealed(e.target.checked)} />La confezione è sigillata</label>
          <Field label="Scadenza"><input type="date" className={inputCls} value={f.expiresOn} min={today} onChange={(e) => setF({ ...f, expiresOn: e.target.value })} /></Field>
        </div>
      )}
      {(medicalKind === "DISPOSITIVO" || medicalKind === "MATERIALE_CONSUMO") && (
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1 size-4" checked={professionalCheck} onChange={(e) => setProfessionalCheck(e.target.checked)} />
          <span>Non è nuovo e sigillato, ma ha documenti o marcature che un professionista può verificare.</span>
        </label>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <fieldset className="space-y-2">
          <legend className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Consegna</legend>
          {HANDOVERS.map((h) => (
            <label key={h} className="flex items-center gap-2 text-sm"><input type="radio" name="handover" className="size-4" checked={handover === h} onChange={() => setHandover(h)} />{HANDOVER_LABEL[h]}</label>
          ))}
        </fieldset>
        <Field label="Comune (facoltativo)"><input className={inputCls} value={f.town} maxLength={60} onChange={(e) => setF({ ...f, town: e.target.value })} /></Field>
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1 size-4" checked={hasPhotos} onChange={(e) => setHasPhotos(e.target.checked)} />
        <span>Ho delle foto: lo staff me le chiede dopo il primo contatto (qui non si caricano file).</span>
      </label>
      <Field label="Note (facoltative)" hint="Misure, marca, anni di utilizzo. Niente dati di salute.">
        <textarea className={inputCls} rows={3} maxLength={500} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
      </Field>
      <VisibilityChoice value={vis} onChange={setVis} name="offer-vis" />
      {vis !== "COMPLETAMENTE_ANONIMO" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nome e cognome (riservato)"><input className={inputCls} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoComplete="name" /></Field>
          <Field label="E-mail o telefono (riservato)"><input className={inputCls} value={f.contact} onChange={(e) => setF({ ...f, contact: e.target.value })} autoComplete="email" /></Field>
          {vis === "NOME_PUBBLICO" && <Field label="Nome da mostrare"><input className={inputCls} value={f.publicName} onChange={(e) => setF({ ...f, publicName: e.target.value })} /></Field>}
          {tried && <ErrorText id="of-donor" text={dErrs.name ?? dErrs.contact ?? dErrs.publicName} />}
        </div>
      )}
      {medical && <p className="m-0 flex items-start gap-2 text-sm text-muted-foreground"><Info className="mt-0.5 size-4 flex-none" aria-hidden="true" />Il materiale sanitario lo approva il responsabile dell'infermeria del club.</p>}
      {tried && refusal && <p role="alert" className="m-0 rounded-lg bg-accent/20 px-3 py-2 text-sm font-semibold">{OUTCOME_TEXT[refusal]}</p>}
      {vis !== "COMPLETAMENTE_ANONIMO" && <PrivacyCheck checked={privacy} onChange={setPrivacy} error={tried && needsPrivacy ? "Serve la presa visione dell'informativa." : undefined} />}
      <button type="submit" className={btnSun} disabled={busy}>{busy ? "Invio…" : "Invia l'offerta"}</button>
      <OutcomeNote outcome={outcome} kind="offer" />
    </form>
  );
}

/* ------------------------------------------------------------------ proposal */

export function ProposalForm({ active, signedIn }: { active: boolean; signedIn: boolean }) {
  const send = useServerFn(submitProposal);
  const [area, setArea] = useState<ProposalArea | "">("");
  const [f, setF] = useState({ title: "", body: "", contact: "" });
  const [anonymous, setAnonymous] = useState(true);
  const [contrib, setContrib] = useState<Contribution[]>([]);
  const [privacy, setPrivacy] = useState(false);
  const [website, setWebsite] = useState("");
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<SubmitOutcome | null>(null);
  const errs = proposalErrors({ area, title: f.title, body: f.body, anonymous, contact: f.contact, canContribute: contrib, signedIn });
  const needsPrivacy = !anonymous && !privacy;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setTried(true);
    if (!active) return setOutcome({ ok: false, code: "NOT_ACTIVE" });
    if (Object.keys(errs).length || needsPrivacy || !area) return;
    setBusy(true);
    try {
      setOutcome(await send({ data: { area, title: f.title, body: f.body, anonymous, contact: f.contact, canContribute: contrib, privacy, website } }));
    } catch {
      setOutcome({ ok: false, code: "ERROR" });
    } finally {
      setBusy(false);
    }
  }

  if (outcome?.ok) return <OutcomeNote outcome={outcome} kind="proposal" />;

  return (
    <form onSubmit={submit} noValidate className="relative space-y-5" data-testid="proposal-form">
      <Honeypot value={website} onChange={setWebsite} />
      <Field label="Dove serve">
        <select className={inputCls} value={area} onChange={(e) => setArea(e.target.value as ProposalArea | "")} aria-invalid={tried && !!errs.area}>
          <option value="">Scegli…</option>
          {PROPOSAL_AREAS.map((a) => <option key={a} value={a}>{PROPOSAL_AREA_LABEL[a]}</option>)}
        </select>
      </Field>
      {tried && <ErrorText id="pr-area" text={errs.area} />}
      <Field label="In breve"><input className={inputCls} maxLength={80} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} aria-invalid={tried && !!errs.title} /></Field>
      {tried && <ErrorText id="pr-title" text={errs.title} />}
      <Field label="Racconta cosa serve e perché" hint="Non scrivere nomi di ragazzi o dati di salute.">
        <textarea className={inputCls} rows={5} maxLength={1000} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} aria-invalid={tried && !!errs.body} />
      </Field>
      {tried && <ErrorText id="pr-body" text={errs.body} />}
      <fieldset className="flex flex-wrap gap-3">
        <legend className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Posso contribuire con (facoltativo)</legend>
        {CONTRIBUTIONS.map((c) => (
          <label key={c} className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="size-4" checked={contrib.includes(c)} onChange={() => setContrib((x) => (x.includes(c) ? x.filter((y) => y !== c) : [...x, c]))} />
            {CONTRIBUTION_LABEL[c]}
          </label>
        ))}
      </fieldset>
      <fieldset className="space-y-2">
        <legend className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vuoi una risposta?</legend>
        <label className="flex items-start gap-2 text-sm"><input type="radio" name="anon" className="mt-1 size-4" checked={anonymous} onChange={() => setAnonymous(true)} /><span><strong>Resto anonimo</strong> · nessun dato, nessuna risposta personale.</span></label>
        <label className="flex items-start gap-2 text-sm"><input type="radio" name="anon" className="mt-1 size-4" checked={!anonymous} onChange={() => setAnonymous(false)} /><span><strong>Ricontattatemi</strong> · il recapito lo vede solo lo staff che valuta.</span></label>
      </fieldset>
      {!anonymous && (
        <Field label={signedIn ? "Recapito (facoltativo: altrimenti ti rispondiamo dal tuo account)" : "E-mail o telefono"}>
          <input className={inputCls} value={f.contact} maxLength={120} onChange={(e) => setF({ ...f, contact: e.target.value })} aria-invalid={tried && !!errs.contact} />
        </Field>
      )}
      {tried && <ErrorText id="pr-contact" text={errs.contact} />}
      {!anonymous && <PrivacyCheck checked={privacy} onChange={setPrivacy} error={tried && needsPrivacy ? "Serve la presa visione dell'informativa." : undefined} />}
      <p className="m-0 text-sm text-muted-foreground">Le proposte non sono pubbliche: lo staff le valuta e, se le pubblica, lo fa con un testo suo, senza dati personali.</p>
      <button type="submit" className={btnSun} disabled={busy}>{busy ? "Invio…" : "Invia la proposta"}</button>
      <OutcomeNote outcome={outcome} kind="proposal" />
    </form>
  );
}

/** Campaign card for the public hub. */
export function CampaignCard({ campaign, received, active }: { campaign: Campaign; received: number | null; active: boolean }) {
  const c = CAMPAIGN_COPY[campaign];
  return (
    <article className="card-premium flex min-w-0 flex-col p-5" data-testid={`campaign-${campaign.toLowerCase()}`}>
      <p className="eyebrow">Donazioni di materiale</p>
      <h3 className="mt-1 text-2xl font-bold">{c.title}</h3>
      <p className="mt-2 text-sm">{c.lead}</p>
      <p className="mt-2 text-sm text-muted-foreground">{c.what}</p>
      <p className="mt-3 flex items-start gap-2 text-sm"><Check className="mt-0.5 size-4 flex-none text-accent" aria-hidden="true" />{c.rule}</p>
      {active && received !== null && received > 0 && <p className="mt-2 text-sm font-semibold">{received} donazioni già ricevute e controllate.</p>}
      <Link to="/sostieni/dona-materiale" search={{ campagna: campaign === "PALESTRA" ? "palestra" : "infermeria" }} className={`${btnSun} mt-4`}>Offri materiale</Link>
    </article>
  );
}
