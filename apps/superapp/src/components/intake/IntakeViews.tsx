/**
 * Vetrina richieste (UD-163) — screens. Block at the top of /gestionale (IntakeEntry), catalogue cards
 * (IntakeRowCard), filters and the public links (IntakeLinksCard). VR-025/VR-026 style: white rounded cards on the
 * light-blue interior, pills, rows with a coloured bar on the left, red count badges.
 *
 * Nothing here decides: buttons are hints from the database answer (row.can) and every click goes back to the
 * database (r139 scd_intake_decide / scd_intake_payment_set / scd_intake_contact), which checks again. No contact is
 * kept in the page data: it is read on demand, shown once, and the database logs the read.
 */
import { Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check, ChevronRight, ClipboardList, Copy, Inbox, Lock, Trophy, Handshake, MapPinned, Building2, HelpCircle, Megaphone } from "lucide-react";
import { useState, type ReactNode } from "react";

import { Card, Chip, type ChipTone } from "@/components/scd/interior-ui";
import { positionLabel } from "@/lib/access-admin";
import {
  EVENT_LABEL,
  INTAKE_AREA_LABEL,
  INTAKE_KIND_LABEL,
  INTAKE_PHASE_LABEL,
  INTAKE_SITE_LABEL,
  PAYMENT_LABEL,
  PAYMENT_STATUSES,
  REASON_REQUIRED,
  INTAKE_ACTION_LABEL,
  availableActions,
  checkPayment,
  formatEuro,
  payloadLines,
  rowTitle,
  type IntakeAction,
  type IntakeKind,
  type IntakeNotice,
  type IntakePhase,
  type IntakeRow,
} from "@/lib/intake-kinds";
import { INTAKE_FORM_PENDING, type IntakeLink } from "@/lib/intake-links";
import { decideIntake, readIntakeContact, setIntakePayment, type IntakeContactOutcome, type IntakeSummary } from "@/lib/intake.functions";

export const INTAKE_PATH = "/gestionale/richieste";

const KIND_ICON: Readonly<Record<IntakeKind, typeof Trophy>> = {
  ISCRIZIONE_TORNEO: Trophy,
  SPONSOR: Megaphone,
  CONVENZIONE: Handshake,
  AFFITTO_CAMPO: MapPinned,
  VISITA_CENTRO: Building2,
  ALTRO: HelpCircle,
};

/** Bar colour per phase (palette blu/azzurro/giallo). */
const PHASE_BAR: Readonly<Record<IntakePhase, string>> = {
  RICEVUTA: "#f2c200",
  IN_VALUTAZIONE: "#5bb8f5",
  ACCETTATA: "#1f6fd1",
  IN_GESTIONE: "#0b2f6b",
  CHIUSA: "#9fb3c8",
  NON_ACCOLTA: "#c9d4e0",
};
const PHASE_TONE: Readonly<Record<IntakePhase, ChipTone>> = {
  RICEVUTA: "warn",
  IN_VALUTAZIONE: "info",
  ACCETTATA: "ok",
  IN_GESTIONE: "info",
  CHIUSA: "mute",
  NON_ACCOLTA: "mute",
};

const itDateTime = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("it-IT", { timeZone: "Europe/Rome", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(d);
};

/* ------------------------------------------------------------------ block on /gestionale */

const COUNTERS: ReadonlyArray<{ phase: IntakePhase; label: string }> = [
  { phase: "RICEVUTA", label: "Ricevute" },
  { phase: "IN_VALUTAZIONE", label: "In valutazione" },
  { phase: "IN_GESTIONE", label: "In gestione" },
];

/** First block of the gestionale wall: what arrives from outside, in one place. */
export function IntakeEntry({ summary }: { summary: IntakeSummary }) {
  const ok = summary.state === "ok" ? summary : null;
  return (
    <section
      aria-labelledby="intake-entry-title"
      className="overflow-hidden rounded-2xl bg-[var(--in-rail)] shadow-[var(--in-card-shadow)]"
      data-testid="intake-entry"
    >
      <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:gap-4 sm:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <span className="flex size-12 flex-none items-center justify-center rounded-xl bg-[var(--in-action)] text-[var(--in-ink)]">
            <Inbox className="size-6" strokeWidth={1.8} aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <h2 id="intake-entry-title" className="m-0 font-title text-[24px] font-extrabold leading-none text-white sm:text-[26px]">
              Vetrina richieste
            </h2>
            <span className="mt-1.5 block text-[15px] leading-snug text-[#d6ebfb]">
              Tornei, sponsor, convenzioni, affitto campi, visite e altro: tutto in un solo catalogo
            </span>
          </span>
        </div>
        <Link
          to={INTAKE_PATH as never}
          className="scd-focus inline-flex h-11 flex-none items-center justify-center gap-2 rounded-[10px] bg-[var(--in-action)] px-4 text-[15px] font-semibold text-[var(--in-ink)]"
        >
          Apri il catalogo
          <ChevronRight className="size-4" strokeWidth={2.2} aria-hidden="true" />
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-px bg-white/15 sm:grid-cols-4">
        {COUNTERS.map((c) => (
          <Counter key={c.phase} label={c.label} value={ok ? ok.counts[c.phase] : null} />
        ))}
        <Counter label="Pagamenti da seguire" value={ok ? ok.payments : null} />
      </div>
      <p className="m-0 flex flex-wrap items-center gap-x-3 gap-y-1 bg-[#0b2f6b] px-4 py-2.5 text-[13.5px] leading-snug text-[#d6ebfb] sm:px-6">
        {summary.state === "off" && <span>Funzione in preparazione: si attiva quando la Direzione applica r139.</span>}
        {summary.state === "none" && <span>I numeri compaiono a chi decide o prepara almeno un tipo di richiesta.</span>}
        {ok && ok.notices.length > 0 && (
          <span>
            Ultimo avviso: {EVENT_LABEL[ok.notices[0]!.action] ?? ok.notices[0]!.action} · {INTAKE_KIND_LABEL[ok.notices[0]!.kind]}
            {ok.notices[0]!.publicCode ? ` · ${ok.notices[0]!.publicCode}` : ""}
          </span>
        )}
        <span>Modulo pubblico: {summary.formReady ? "attivo" : "in preparazione"}</span>
      </p>
    </section>
  );
}

function Counter({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="bg-[var(--in-rail)] px-4 py-3 sm:px-6">
      <div className="text-[13px] font-semibold text-[#d6ebfb]">{label}</div>
      <div className="mt-0.5 flex items-center gap-2 text-[24px] font-extrabold leading-none text-white">
        {value === null ? "—" : value}
        {value !== null && value > 0 && <span className="size-2.5 rounded-full bg-[#e5484d]" aria-hidden="true" />}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ public links */

export function IntakeLinksCard({ links }: { links: readonly IntakeLink[] }) {
  return (
    <Card
      id="intake-links"
      title="Link pubblici del modulo «Richieste alla SCD»"
      sub="Un solo modulo Tally per società, aziende, scuole e privati adulti; ogni link apre il ramo del suo tipo. Soci e famiglie chiedono dall'app."
    >
      <ul className="m-0 list-none p-0">
        {links.map((l) => (
          <li key={l.kind} className="flex flex-wrap items-center gap-3 border-t border-[var(--in-line)] px-4 py-3 sm:px-[18px]">
            <KindIcon kind={l.kind} />
            <span className="min-w-0 flex-1 text-[15px] font-semibold">{l.label}</span>
            {l.href ? <CopyHref href={l.href} label={l.label} /> : <Chip tone="mute">{INTAKE_FORM_PENDING}</Chip>}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function CopyHref({ href, label }: { href: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <span className="inline-flex items-center gap-2">
      <a href={href} target="_blank" rel="noopener noreferrer" className="scd-focus text-[14px] font-semibold text-[var(--in-info)] underline">
        Apri
      </a>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard?.writeText(href).then(() => {
            setDone(true);
            window.setTimeout(() => setDone(false), 2000);
          });
        }}
        aria-label={`Copia il link: ${label}`}
        className="scd-focus inline-flex h-10 items-center gap-1.5 rounded-full border border-[var(--in-line)] bg-white px-3 text-[14px] font-semibold"
      >
        {done ? <Check className="size-4 text-[var(--in-ok)]" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
        {done ? "Copiato" : "Copia"}
      </button>
    </span>
  );
}

function KindIcon({ kind }: { kind: IntakeKind }) {
  const Icon = KIND_ICON[kind];
  return (
    <span className="flex size-9 flex-none items-center justify-center rounded-lg bg-[var(--in-info-bg)] text-[var(--in-info)]">
      <Icon className="size-5" strokeWidth={1.8} aria-hidden="true" />
    </span>
  );
}

/* ------------------------------------------------------------------ filters */

export function FilterPills<T extends string>({
  label,
  options,
  current,
  hrefFor,
}: {
  label: string;
  options: ReadonlyArray<{ value: T | null; text: string }>;
  current: T | null;
  hrefFor: (v: T | null) => Record<string, string | undefined>;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-[13px] font-semibold text-[var(--in-sub)]">{label}</span>
      {options.map((o) => {
        const active = o.value === current;
        return (
          <Link
            key={o.value ?? "all"}
            to={INTAKE_PATH as never}
            search={hrefFor(o.value) as never}
            aria-current={active ? "true" : undefined}
            className={`scd-focus inline-flex h-9 items-center rounded-full px-3 text-[14px] font-semibold ${
              active ? "bg-[var(--in-info)] text-white" : "border border-[#b9d5ef] bg-white text-[var(--in-info)]"
            }`}
          >
            {o.text}
          </Link>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ one request */

export function IntakeRowCard({ row, canPay }: { row: IntakeRow; canPay: boolean }) {
  const router = useRouter();
  const decide = useServerFn(decideIntake);
  const contactFn = useServerFn(readIntakeContact);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, setPending] = useState<IntakeAction | null>(null);
  const [note, setNote] = useState("");
  const [value, setValue] = useState("");
  const [contact, setContact] = useState<IntakeContactOutcome | null>(null);
  const actions = availableActions(row);
  const lines = payloadLines(row.kind, row.payload);

  async function run(action: IntakeAction) {
    if (REASON_REQUIRED.includes(action) && note.trim().length < 3) {
      setMsg({ ok: false, text: "Scrivi il motivo: resta nel registro." });
      return;
    }
    if ((action === "assign" || action === "reclassify") && !value) {
      setMsg({ ok: false, text: action === "assign" ? "Scegli chi la gestisce." : "Scegli il nuovo tipo." });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const out = await decide({ data: { id: row.id, action, note: note.trim() || null, value: value || null } });
      setMsg({ ok: out.ok, text: out.message });
      if (out.ok) {
        setPending(null);
        setNote("");
        setValue("");
        await router.invalidate();
      }
    } catch {
      setMsg({ ok: false, text: "Operazione non riuscita, riprova più tardi." });
    } finally {
      setBusy(false);
    }
  }

  async function showContact() {
    setBusy(true);
    try {
      setContact(await contactFn({ data: { id: row.id } }));
    } catch {
      setContact({ ok: false, message: "Lettura non riuscita, riprova più tardi." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="relative overflow-hidden rounded-2xl border border-[var(--in-line)] bg-white shadow-[var(--in-card-shadow)]" data-testid="intake-row">
      <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: PHASE_BAR[row.phase] }} aria-hidden="true" />
      <div className="flex flex-wrap items-start gap-3 py-3 pl-5 pr-4 sm:pr-[18px]">
        <KindIcon kind={row.kind} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <b className="text-[16px] leading-snug">{rowTitle(row.kind, row.payload)}</b>
            <Chip tone={PHASE_TONE[row.phase]}>{INTAKE_PHASE_LABEL[row.phase]}</Chip>
          </div>
          <p className="m-0 mt-0.5 text-[13.5px] text-[var(--in-sub)]">
            {INTAKE_KIND_LABEL[row.kind]}
            {row.publicCode && <> · {row.publicCode}</>}
            {row.site && <> · {INTAKE_SITE_LABEL[row.site]}</>}
            {row.area && <> · {INTAKE_AREA_LABEL[row.area]}</>}
            {" · arrivata "}
            {itDateTime(row.receivedAt)}
          </p>
        </div>
      </div>

      {lines.length > 0 && (
        <dl className="m-0 grid grid-cols-1 gap-x-6 gap-y-1 px-5 pb-3 text-[14px] sm:grid-cols-2 sm:pr-[18px]">
          {lines.map((l) => (
            <div key={l.label} className="flex min-w-0 gap-2">
              <dt className="flex-none font-semibold text-[var(--in-sub)]">{l.label}</dt>
              <dd className="m-0 min-w-0 break-words">{l.value}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-[var(--in-line)] px-5 py-2.5 text-[13.5px] sm:pr-[18px]">
        <span className="text-[var(--in-sub)]">Gestisce:</span>
        <b>{row.ownerPosition ? positionLabel(row.ownerPosition) : "da assegnare"}</b>
        <span className="text-[var(--in-sub)]">· Pagamento:</span>
        <b>{row.paymentStatus ? PAYMENT_LABEL[row.paymentStatus] : row.phase === "ACCETTATA" || row.phase === "IN_GESTIONE" ? "da definire (Tesoreria)" : "dopo l'accettazione"}</b>
        {row.paymentAmountCents !== null && <span>· {formatEuro(row.paymentAmountCents)}</span>}
        {row.decisionNote && <span className="basis-full text-[var(--in-sub)]">Nota della decisione: {row.decisionNote}</span>}
      </div>

      {(actions.length > 0 || row.can.contact) && (
        <div className="flex flex-col gap-2 border-t border-[var(--in-line)] bg-[#f7fbff] px-5 py-3 sm:pr-[18px]">
          <div className="flex flex-wrap gap-2">
            {actions.map((a) => (
              <button
                key={a}
                type="button"
                disabled={busy}
                onClick={() => {
                  setMsg(null);
                  if (REASON_REQUIRED.includes(a) || a === "assign" || a === "reclassify") setPending(pending === a ? null : a);
                  else void run(a);
                }}
                className={`scd-focus inline-flex h-10 items-center rounded-[10px] px-3.5 text-[14.5px] font-semibold disabled:opacity-60 ${
                  a === "accept" ? "bg-[var(--in-action)] text-[var(--in-ink)]" : "border border-[#b9d5ef] bg-white text-[var(--in-info)]"
                }`}
              >
                {INTAKE_ACTION_LABEL[a]}
              </button>
            ))}
            {row.can.contact && row.hasContact && !contact && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void showContact()}
                className="scd-focus inline-flex h-10 items-center gap-1.5 rounded-[10px] border border-[#b9d5ef] bg-white px-3.5 text-[14.5px] font-semibold text-[var(--in-info)] disabled:opacity-60"
              >
                <Lock className="size-4" aria-hidden="true" /> Mostra il recapito
              </button>
            )}
            {row.can.contact && !row.hasContact && <Chip tone="mute">Recapito cancellato alla scadenza</Chip>}
          </div>

          {pending && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              {pending === "assign" && (
                <Labeled label="Chi la gestisce">
                  <select value={value} onChange={(e) => setValue(e.target.value)} className="h-11 rounded-[10px] border border-[var(--in-line)] bg-white px-2 text-[15px]">
                    <option value="">Scegli…</option>
                    {row.owners.map((o) => (
                      <option key={o} value={o}>
                        {positionLabel(o)}
                      </option>
                    ))}
                  </select>
                </Labeled>
              )}
              {pending === "reclassify" && (
                <Labeled label="Nuovo tipo">
                  <select value={value} onChange={(e) => setValue(e.target.value)} className="h-11 rounded-[10px] border border-[var(--in-line)] bg-white px-2 text-[15px]">
                    <option value="">Scegli…</option>
                    {(Object.keys(INTAKE_KIND_LABEL) as IntakeKind[])
                      .filter((k) => k !== "ALTRO")
                      .map((k) => (
                        <option key={k} value={k}>
                          {INTAKE_KIND_LABEL[k]}
                        </option>
                      ))}
                  </select>
                </Labeled>
              )}
              <Labeled label={REASON_REQUIRED.includes(pending) ? "Motivo (resta nel registro, niente dati di salute)" : "Nota (facoltativa)"}>
                <input
                  value={note}
                  maxLength={300}
                  onChange={(e) => setNote(e.target.value)}
                  className="h-11 w-full rounded-[10px] border border-[var(--in-line)] bg-white px-3 text-[15px]"
                />
              </Labeled>
              <button
                type="button"
                disabled={busy}
                onClick={() => void run(pending)}
                className="scd-focus h-11 flex-none rounded-[10px] bg-[var(--in-info)] px-4 text-[15px] font-semibold text-white disabled:opacity-60"
              >
                Conferma: {INTAKE_ACTION_LABEL[pending].toLowerCase()}
              </button>
            </div>
          )}

          {contact && <ContactBox outcome={contact} />}
          {msg && (
            <p role={msg.ok ? "status" : "alert"} className={`m-0 text-[14px] font-semibold ${msg.ok ? "text-[var(--in-ok)]" : "text-[var(--in-crit)]"}`}>
              {msg.text}
            </p>
          )}
        </div>
      )}

      {canPay && row.can.pay && <PaymentForm row={row} />}

      {row.events.length > 0 && (
        <details className="border-t border-[var(--in-line)] px-5 py-2.5 text-[13.5px] sm:pr-[18px]">
          <summary className="scd-focus cursor-pointer font-semibold text-[var(--in-info)]">Registro ({row.events.length})</summary>
          <ol className="m-0 mt-2 list-none p-0">
            {row.events.map((e, i) => (
              <li key={`${e.at}-${i}`} className="py-0.5">
                <span className="text-[var(--in-sub)]">{itDateTime(e.at)}</span> · {EVENT_LABEL[e.action] ?? e.action}
                {e.note && <span className="text-[var(--in-sub)]"> · {e.note}</span>}
              </li>
            ))}
          </ol>
        </details>
      )}
    </li>
  );
}

function Labeled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1 text-[13px] font-semibold text-[var(--in-sub)]">
      {label}
      {children}
    </label>
  );
}

function ContactBox({ outcome }: { outcome: IntakeContactOutcome }) {
  if (!outcome.ok) return <p role="alert" className="m-0 text-[14px] font-semibold text-[var(--in-crit)]">{outcome.message}</p>;
  if (outcome.purged) return <p className="m-0 text-[14px] text-[var(--in-sub)]">Recapito già cancellato alla scadenza.</p>;
  const c = outcome.contact;
  return (
    <div className="rounded-xl border border-[#b9d5ef] bg-white px-3 py-2 text-[14px]">
      <b className="block">{c.orgName ?? "Privato"}</b>
      <span className="block">
        {c.name}
        {c.role ? ` · ${c.role}` : ""}
      </span>
      {c.email && <span className="block">{c.email}</span>}
      {c.phone && <span className="block">{c.phone}</span>}
      <span className="mt-1 block text-[12.5px] text-[var(--in-sub)]">
        Lettura registrata. La risposta la scrive una persona: l'app non manda nulla.
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ payment (Tesoreria only) */

function PaymentForm({ row }: { row: IntakeRow }) {
  const router = useRouter();
  const save = useServerFn(setIntakePayment);
  const [status, setStatus] = useState<string>(row.paymentStatus ?? "");
  const [amount, setAmount] = useState(row.paymentAmountCents !== null ? (row.paymentAmountCents / 100).toFixed(2).replace(".", ",") : "");
  const [link, setLink] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const c = checkPayment(
      { status, amountEuro: amount, link },
      { linkAllowed: row.paymentLinkAllowed, hasStoredLink: row.paymentLink !== null, hasStoredAmount: row.paymentAmountCents !== null },
    );
    if (!c.ok) {
      setMsg({ ok: false, text: c.error });
      return;
    }
    setBusy(true);
    try {
      const out = await save({ data: { id: row.id, ...c.value } });
      setMsg({ ok: out.ok, text: out.message });
      if (out.ok) {
        setLink("");
        await router.invalidate();
      }
    } catch {
      setMsg({ ok: false, text: "Operazione non riuscita, riprova più tardi." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-t border-[var(--in-line)] bg-[var(--in-info-bg)] px-5 py-3 sm:pr-[18px]" data-testid="intake-payment">
      <b className="block text-[14.5px]">Pagamento · solo Tesoreria</b>
      <p className="m-0 mt-0.5 text-[13px] text-[var(--in-sub)]">
        Il link lo crea una persona della Tesoreria (SumUp o altro) e lo manda lei; qui si registra. Il riscontro con i movimenti del conto si fa dopo.
        {!row.paymentLinkAllowed && " Sponsor e convenzioni: contratto e fattura, niente link."}
      </p>
      {row.paymentLink && (
        <p className="m-0 mt-1 break-all text-[13px]">
          Link registrato: <span className="font-semibold">{row.paymentLink}</span>
        </p>
      )}
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
        <Labeled label="Stato">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-11 rounded-[10px] border border-[var(--in-line)] bg-white px-2 text-[15px]">
            <option value="">Scegli…</option>
            {PAYMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {PAYMENT_LABEL[s]}
              </option>
            ))}
          </select>
        </Labeled>
        <Labeled label="Importo (€)">
          <input value={amount} inputMode="decimal" onChange={(e) => setAmount(e.target.value)} className="h-11 rounded-[10px] border border-[var(--in-line)] bg-white px-3 text-[15px]" />
        </Labeled>
        {row.paymentLinkAllowed && (
          <Labeled label="Link di pagamento (https://…)">
            <input value={link} onChange={(e) => setLink(e.target.value)} className="h-11 rounded-[10px] border border-[var(--in-line)] bg-white px-3 text-[15px]" />
          </Labeled>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => void submit()}
          className="scd-focus h-11 flex-none rounded-[10px] bg-[var(--in-info)] px-4 text-[15px] font-semibold text-white disabled:opacity-60"
        >
          Registra
        </button>
      </div>
      {msg && (
        <p role={msg.ok ? "status" : "alert"} className={`m-0 mt-2 text-[14px] font-semibold ${msg.ok ? "text-[var(--in-ok)]" : "text-[var(--in-crit)]"}`}>
          {msg.text}
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ notices */

export function IntakeNoticesCard({ notices }: { notices: readonly IntakeNotice[] }) {
  return (
    <Card id="intake-avvisi" title="Avvisi" sub="Solo nell'app, per il tuo ruolo. Nessuna mail automatica.">
      {notices.length === 0 ? (
        <p className="m-0 border-t border-[var(--in-line)] px-4 py-3 text-[14px] text-[var(--in-sub)] sm:px-[18px]">Nessun avviso negli ultimi 30 giorni.</p>
      ) : (
        <ul className="m-0 list-none p-0">
          {notices.map((n, i) => (
            <li key={`${n.requestId}-${n.at}-${i}`} className="flex items-start gap-2 border-t border-[var(--in-line)] px-4 py-2.5 text-[14px] sm:px-[18px]">
              <ClipboardList className="mt-0.5 size-4 flex-none text-[var(--in-info)]" aria-hidden="true" />
              <span className="min-w-0">
                <b>{EVENT_LABEL[n.action] ?? n.action}</b> · {INTAKE_KIND_LABEL[n.kind]}
                {n.publicCode ? ` · ${n.publicCode}` : ""}
                {n.site ? ` · ${INTAKE_SITE_LABEL[n.site]}` : ""}
                <span className="block text-[12.5px] text-[var(--in-sub)]">{itDateTime(n.at)}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
