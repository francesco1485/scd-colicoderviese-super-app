import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, ClipboardCopy, Info, Vote } from "lucide-react";
import { useId, useState, type FormEvent } from "react";

import { CastAskButton } from "@/components/scd/CastPresence";
import { Chip, type ChipTone } from "@/components/scd/interior-ui";
import { CastBadge } from "@/components/scd/SkyJolly";
import { EmptyState } from "@/components/scd/work-area-ui";
import {
  AREA_REQUEST_STATUS_LABEL,
  CONTACT_PREFS,
  CONTACT_PREF_LABEL,
  OCCASIONS,
  ORDER_LIMITS,
  validateOrderRequest,
  type AreaPoll,
  type AreaRequestStatus,
  type MyAreaRequest,
  type OrderField,
} from "@/lib/area-requests";
import { submitClubHouseOrder, voteAreaPoll, type ClubHouseDesk } from "@/lib/area-requests.functions";
import { romeDay } from "@/lib/era-nutrition-tips";

const STATUS_TONE: Readonly<Record<AreaRequestStatus, ChipTone>> = { NUOVA: "info", IN_CARICO: "info", CONFERMATA: "ok", NON_POSSIBILE: "warn", ANNULLATA: "mute" };

function itDay(iso: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : iso;
}

const FIELD = "scd-focus mt-1 block min-h-11 w-full rounded-[10px] border border-[var(--in-line,#dbe3ee)] bg-white px-3 text-[15px] text-[#0b1e3a]";
const LABEL = "block text-[14px] font-semibold text-[#0b2a5b]";

/**
 * Club House of "Lo chef" in the family area (UD-114): the "richiesta d'ordine per feste e iniziative" and the dish
 * polls. Request -> a person of the Club House confirms -> payment at the club till (SQUBY/SumUp), never in the app.
 * Fails closed while the staged migration r103 is not applied: the form prepares the message for the secretariat and
 * says so, no request is shown as sent and no poll is invented.
 */
export function ClubHouseOrderCard({ desk, today }: { desk: Extract<ClubHouseDesk, { state: "off" | "ok" }>; today?: string }) {
  const day = today ?? romeDay();
  const submit = useServerFn(submitClubHouseOrder);
  const ids = useId().replace(/:/g, "");
  const live = desk.state === "ok";
  const [form, setForm] = useState({ what: "", when: "", time: "", people: "", contact: (live ? "app" : "email") as string, occasion: "Festa di squadra" as string });
  const [errors, setErrors] = useState<Partial<Record<OrderField, string>>>({});
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [copyText, setCopyText] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [sent, setSent] = useState<MyAreaRequest[]>(live ? desk.requests : []);

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setNote(null);
    setCopied(false);
    const v = validateOrderRequest(form, day);
    if (!v.ok) {
      setErrors(v.errors);
      setNote("Controlla i campi evidenziati.");
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const res = await submit({ data: { ...v.value, time: v.value.time ?? undefined, contact: v.value.contact, occasion: v.value.occasion } });
      setNote(res.message);
      if (res.errors) setErrors(res.errors as Partial<Record<OrderField, string>>);
      if (res.off && res.copyText) setCopyText(res.copyText);
      if (res.ok) {
        setCopyText(null);
        setSent((prev) => [{ id: `tmp-${Date.now()}`, createdAt: new Date().toISOString(), status: "NUOVA", occasion: v.value.occasion, when: v.value.when, time: v.value.time, people: v.value.people, what: v.value.what, answer: null }, ...prev]);
        setForm((f) => ({ ...f, what: "", when: "", time: "", people: "" }));
      }
    } catch {
      setNote("Non salvato: riprova tra poco o scrivi alla segreteria.");
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!copyText) return;
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const err = (k: OrderField) =>
    errors[k] ? (
      <span id={`${ids}-${k}-err`} className="mt-1 block text-[13.5px] font-semibold text-[var(--in-crit,#9a1d14)]">
        {errors[k]}
      </span>
    ) : null;
  const aria = (k: OrderField) => (errors[k] ? { "aria-invalid": true as const, "aria-describedby": `${ids}-${k}-err` } : {});

  return (
    <section
      id="richiesta-ordine"
      aria-labelledby={`${ids}-t`}
      className="min-w-0 scroll-mt-24 overflow-hidden rounded-[var(--in-radius,16px)] border border-[var(--in-line,#dbe3ee)] bg-white shadow-[var(--in-card-shadow,0_8px_24px_-12px_rgb(11_42_91/0.25))]"
      data-testid="clubhouse-order"
      data-requests-state={desk.state}
    >
      <header className="flex items-start gap-3 px-4 pb-2 pt-4 sm:px-[18px]">
        <CastBadge id="accoglienza-chef" size={44} />
        <div className="min-w-0 flex-1">
          <h2 id={`${ids}-t`} className="m-0 text-[19px] font-bold leading-tight">
            Club House: richiesta d'ordine per feste e iniziative
          </h2>
          <p className="m-0 mt-1 text-[14px] leading-snug text-[var(--in-sub,#4a5d7a)]">
            Lo chef raccoglie la richiesta, una persona della Club House la conferma e si paga alla cassa del club. Mai pagamenti in app.
          </p>
        </div>
      </header>

      {!live && (
        <p role="note" className="mx-4 mb-1 mt-1 flex gap-2 rounded-xl bg-[var(--in-info-bg,#e7f0fb)] px-3.5 py-3 text-[14px] leading-snug text-[var(--in-info,#0b4a8f)] sm:mx-[18px]" data-testid="clubhouse-off">
          <Info className="mt-[1px] size-[18px] flex-none" strokeWidth={1.8} aria-hidden="true" />
          Le richieste in app non sono ancora attive: compilando il modulo prepari il messaggio da mandare alla segreteria.
        </p>
      )}

      <form noValidate onSubmit={onSubmit} className="grid grid-cols-1 gap-3 px-4 pb-4 pt-2 sm:grid-cols-2 sm:px-[18px]" aria-describedby={`${ids}-rules`}>
        <label className={`${LABEL} sm:col-span-2`}>
          Cosa ti serve
          <textarea
            value={form.what}
            onChange={set("what")}
            maxLength={ORDER_LIMITS.whatMax}
            rows={3}
            placeholder="Per esempio: torta, pizzette e bibite per la merenda dopo la partita"
            className={`${FIELD} py-2`}
            {...aria("what")}
          />
          {err("what")}
        </label>
        <label className={LABEL}>
          Occasione
          <select value={form.occasion} onChange={set("occasion")} className={FIELD} {...aria("occasion")}>
            {OCCASIONS.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          {err("occasion")}
        </label>
        <label className={LABEL}>
          Per quante persone
          <input type="number" inputMode="numeric" min={ORDER_LIMITS.peopleMin} max={ORDER_LIMITS.peopleMax} value={form.people} onChange={set("people")} className={FIELD} {...aria("people")} />
          {err("people")}
        </label>
        <label className={LABEL}>
          Giorno
          <input type="date" min={day} value={form.when} onChange={set("when")} className={FIELD} {...aria("when")} />
          {err("when")}
        </label>
        <label className={LABEL}>
          Orario <span className="font-normal text-[var(--in-sub,#4a5d7a)]">(facoltativo)</span>
          <input type="time" value={form.time} onChange={set("time")} className={FIELD} {...aria("time")} />
          {err("time")}
        </label>
        <fieldset className="m-0 border-0 p-0 sm:col-span-2" {...(errors.contact ? { "aria-describedby": `${ids}-contact-err` } : {})}>
          <legend className={LABEL}>Come preferisci essere ricontattato</legend>
          <div className="mt-1 flex flex-wrap gap-2">
            {CONTACT_PREFS.filter((c) => live || c !== "app").map((c) => (
              <label key={c} className={`inline-flex focus-within:ring-2 focus-within:ring-[#1556c4] min-h-11 cursor-pointer items-center gap-2 rounded-[10px] border px-3 text-[14.5px] ${form.contact === c ? "border-[#0b2a5b] bg-[#eef5fc] font-semibold" : "border-[var(--in-line,#dbe3ee)] bg-white"}`}>
                <input type="radio" name={`${ids}-contact`} value={c} checked={form.contact === c} onChange={set("contact")} className="size-4 accent-[#0b2a5b]" />
                {CONTACT_PREF_LABEL[c]}
              </label>
            ))}
          </div>
          {err("contact")}
        </fieldset>
        <p id={`${ids}-rules`} className="m-0 rounded-xl bg-[#fff8ec] px-3.5 py-3 text-[14px] leading-snug text-[#5c3b00] sm:col-span-2">
          Allergie e intolleranze non si scrivono qui: dille di persona al personale della Club House. Nessun dato di pagamento: si paga alla cassa dopo la conferma.
        </p>
        <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
          <button type="submit" disabled={busy} className="scd-focus inline-flex h-12 items-center justify-center rounded-[10px] bg-[#0b2a5b] px-5 text-[16px] font-semibold text-white disabled:opacity-60" data-testid="clubhouse-submit">
            {live ? "Invia la richiesta" : "Prepara il messaggio"}
          </button>
          <CastAskButton id="accoglienza-chef" tone="quiet" />
        </div>
        <p role="status" aria-live="polite" className="m-0 min-h-[1.2em] text-[14px] text-[var(--in-sub,#4a5d7a)] sm:col-span-2">
          {note}
        </p>
      </form>

      {copyText && (
        <div className="mx-4 mb-4 rounded-xl border border-[var(--in-line,#dbe3ee)] bg-[#f7f9fc] p-3 sm:mx-[18px]" data-testid="clubhouse-copy">
          <pre className="m-0 whitespace-pre-wrap font-text text-[14px] leading-snug text-[#0b1e3a]">{copyText}</pre>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" onClick={() => void copy()} className="scd-focus inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-[#ffd600] px-4 text-[15px] font-bold text-[#0b1e3a]">
              {copied ? <Check className="size-4" aria-hidden="true" /> : <ClipboardCopy className="size-4" aria-hidden="true" />}
              {copied ? "Copiato" : "Copia il messaggio"}
            </button>
            <Link to="/contatti" className="scd-focus inline-flex min-h-11 items-center rounded-[10px] border border-[var(--in-line,#dbe3ee)] bg-white px-4 text-[15px] font-semibold text-[#0b2a5b]">
              Scrivi alla segreteria
            </Link>
          </div>
        </div>
      )}

      {live && sent.length > 0 && (
        <div className="border-t border-[var(--in-line,#dbe3ee)] px-4 py-3 sm:px-[18px]">
          <h3 className="m-0 text-[16px] font-bold">Le mie richieste</h3>
          <ul className="m-0 mt-2 flex list-none flex-col gap-2 p-0" data-testid="clubhouse-mine">
            {sent.map((r) => (
              <li key={r.id} className="flex flex-wrap items-start justify-between gap-2 rounded-xl bg-[#f7f9fc] px-3 py-2.5 text-[14.5px]">
                <span className="min-w-0">
                  <b className="block">
                    {r.occasion} · {itDay(r.when)}
                    {r.time ? ` ore ${r.time}` : ""} · {r.people} persone
                  </b>
                  <span className="block text-[13.5px] text-[var(--in-sub,#4a5d7a)]">{r.what}</span>
                  {r.answer && <span className="mt-0.5 block text-[13.5px]">Risposta: {r.answer}</span>}
                </span>
                <Chip tone={STATUS_TONE[r.status]}>{AREA_REQUEST_STATUS_LABEL[r.status]}</Chip>
              </li>
            ))}
          </ul>
        </div>
      )}

      <DishPolls polls={live ? desk.polls : null} />
    </section>
  );
}

/** Dish polls of the Club House: only polls the database returns; nothing is shown as a poll before r103. */
function DishPolls({ polls }: { polls: AreaPoll[] | null }) {
  const vote = useServerFn(voteAreaPoll);
  const [items, setItems] = useState(polls ?? []);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function cast(poll: AreaPoll, option: string) {
    setBusy(true);
    setNote(null);
    try {
      const res = await vote({ data: { pollId: poll.id, option } });
      setNote(res.message);
      if (res.ok) setItems((prev) => prev.map((p) => (p.id === poll.id ? { ...p, myVote: option } : p)));
    } catch {
      setNote("Voto non salvato, riprova.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="border-t border-[var(--in-line,#dbe3ee)] px-4 py-3 sm:px-[18px]" data-testid="clubhouse-polls">
      <h3 className="m-0 flex items-center gap-2 text-[16px] font-bold">
        <Vote className="size-[18px] text-[#0860A8]" strokeWidth={2} aria-hidden="true" />
        Sondaggi sui piatti
      </h3>
      {polls === null ? (
        <p className="m-0 mt-1 text-[14px] text-[var(--in-sub,#4a5d7a)]">In arrivo: quando la Club House attiva i sondaggi, voti qui il piatto che preferisci.</p>
      ) : items.length === 0 ? (
        <div className="mt-2">
          <EmptyState title="Nessun sondaggio aperto">Quando la Club House ne apre uno lo trovi qui.</EmptyState>
        </div>
      ) : (
        <ul className="m-0 mt-2 flex list-none flex-col gap-3 p-0">
          {items.map((p) => (
            <li key={p.id} className="rounded-xl bg-[#f7f9fc] p-3">
              <p className="m-0 text-[15px] font-semibold">{p.question}</p>
              <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label={p.question}>
                {p.options.map((o) => {
                  const mine = p.myVote === o.key;
                  return (
                    <button
                      key={o.key}
                      type="button"
                      disabled={busy || p.closed}
                      aria-pressed={mine}
                      onClick={() => void cast(p, o.key)}
                      className={`scd-focus inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-[14.5px] font-semibold disabled:opacity-70 ${mine ? "bg-[#0b2a5b] text-white" : "border border-[var(--in-line,#dbe3ee)] bg-white text-[#0b2a5b]"}`}
                    >
                      {mine && <Check className="size-4" aria-hidden="true" />}
                      {o.label}
                      {o.votes !== null && <span className="tabular-nums opacity-80">· {o.votes}</span>}
                    </button>
                  );
                })}
              </div>
              {p.closed && <p className="m-0 mt-1 text-[13px] text-[var(--in-sub,#4a5d7a)]">Sondaggio chiuso.</p>}
            </li>
          ))}
        </ul>
      )}
      <p role="status" aria-live="polite" className="m-0 mt-1 min-h-[1.2em] text-[13.5px] text-[var(--in-sub,#4a5d7a)]">
        {note}
      </p>
    </div>
  );
}
