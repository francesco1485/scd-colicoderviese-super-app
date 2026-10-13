import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Mail, ShieldCheck, Trash2, Archive } from "lucide-react";
import { useState } from "react";

import { CLUB_PROFILE } from "@/lib/club-profile";
import {
  DELETED_ITEMS,
  DELETION_DAYS,
  DELETION_EMAIL,
  DELETION_MESSAGE,
  DELETION_SUBJECT,
  KEPT_ITEMS,
  deletionMailto,
  isDelivered,
  validatePublicDeletion,
  type DeletionOutcome,
  type PublicDeletionInput,
} from "@/lib/account-deletion";
import { requestAccountDeletionPublic } from "@/lib/account-deletion.functions";

/**
 * Public account deletion page (Google Play account-deletion policy, Apple 5.1.1(v)) — 2026-10-13.
 * Reachable without login and without the app. The form files a request in the Secretariat queue (r96); the e-mail
 * address stays visible as plain text for anyone who prefers writing.
 */
export const Route = createFileRoute("/elimina-account")({
  head: () => ({
    meta: [
      { title: "Elimina il tuo account | App S.C.D. ColicoDerviese" },
      {
        name: "description",
        content:
          "Come chiedere l'eliminazione dell'account dell'app S.C.D. ColicoDerviese: cosa viene cancellato, cosa la società deve conservare per legge e in quanto tempo.",
      },
    ],
  }),
  component: DeleteAccountPage,
});

const empty: PublicDeletionInput = {
  name: "",
  email: "",
  note: "",
  confirm: false,
};

function H2({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="mt-8 text-[21px] font-bold leading-tight">
      {children}
    </h2>
  );
}

function DeleteAccountPage() {
  return (
    <main
      className="mx-auto max-w-3xl px-4 py-10 text-[16px] leading-relaxed"
      data-testid="delete-account-page"
    >
      <p className="flex items-center gap-2 text-[14px] font-bold text-primary">
        <ShieldCheck className="size-4" aria-hidden="true" /> App{" "}
        {CLUB_PROFILE.name}
      </p>
      <h1 className="mt-2 text-[32px] font-bold leading-tight sm:text-[34px]">
        Elimina il tuo account
      </h1>
      <p className="mt-3">
        Puoi chiedere in ogni momento di eliminare il tuo account dell'app{" "}
        <b>{CLUB_PROFILE.name}</b> e i dati collegati. Non serve avere l'app
        installata. La segreteria controlla che l'account sia tuo, lo elimina
        entro {DELETION_DAYS} giorni e ti scrive quando ha finito.
      </p>

      <H2>Come fare</H2>
      <ol className="mt-2 list-decimal space-y-1 pl-6">
        <li>
          <b>Dall'app</b>: apri{" "}
          <Link
            to="/la-mia-scd"
            className="font-semibold text-primary underline"
          >
            La mia SCD
          </Link>
          , scorri in fondo e tocca <b>Elimina account</b>.
        </li>
        <li>
          <b>Da questa pagina</b>: compila il modulo qui sotto con il nome e
          l'e-mail con cui entri.
        </li>
        <li>
          <b>Per e-mail</b>: scrivi a{" "}
          <b className="select-all">{DELETION_EMAIL}</b> con oggetto "
          {DELETION_SUBJECT}".
        </li>
      </ol>

      <H2>Cosa eliminiamo</H2>
      <ul className="mt-3 grid list-none gap-2 p-0">
        {DELETED_ITEMS.map((i) => (
          <li
            key={i.title}
            className="flex items-start gap-3 rounded-xl bg-[var(--scd-page)] p-3"
          >
            <Trash2
              className="mt-1 size-5 shrink-0 text-[var(--scd-blue)]"
              aria-hidden="true"
            />
            <span>
              <b>{i.title}</b>: {i.text}
            </span>
          </li>
        ))}
      </ul>

      <H2>Cosa la società deve conservare</H2>
      <p className="mt-2">
        Alcuni dati non possiamo cancellarli perché la legge o le norme sportive
        ci chiedono di tenerli. Li conserviamo solo per il tempo previsto, non
        compaiono più nell'app e nessuno li usa per altro.
      </p>
      <ul className="mt-3 grid list-none gap-2 p-0">
        {KEPT_ITEMS.map((i) => (
          <li
            key={i.title}
            className="flex items-start gap-3 rounded-xl border border-[var(--scd-line)] p-3"
          >
            <Archive
              className="mt-1 size-5 shrink-0 text-[var(--scd-sub)]"
              aria-hidden="true"
            />
            <span>
              <b>{i.title}</b>: {i.text}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[15px]">
        Se sei genitore e l'account riguarda tuo figlio o tua figlia, scrivi tu
        la richiesta: la segreteria la collega al profilo della famiglia.
        Dettagli nella{" "}
        <a href="/privacy" className="font-semibold text-primary underline">
          informativa privacy
        </a>
        .
      </p>

      <H2 id="modulo-t">Chiedi l'eliminazione</H2>
      <DeletionForm />

      <section
        aria-labelledby="mail-t"
        className="mt-6 flex items-start gap-3 rounded-xl bg-[var(--scd-page)] p-4"
        data-testid="deletion-email"
      >
        <Mail
          className="mt-1 size-5 shrink-0 text-[var(--scd-blue)]"
          aria-hidden="true"
        />
        <span className="min-w-0">
          <span
            id="mail-t"
            className="block text-[12px] font-bold uppercase tracking-[0.08em] text-[var(--scd-sub)]"
          >
            Preferisci scrivere?
          </span>
          <span className="block select-all break-all text-[17px] font-semibold">
            {DELETION_EMAIL}
          </span>
          <span className="block text-[14px] text-[var(--scd-sub)]">
            Oggetto: {DELETION_SUBJECT}
          </span>
        </span>
      </section>
    </main>
  );
}

function DeletionForm() {
  const send = useServerFn(requestAccountDeletionPublic);
  const [f, setF] = useState<PublicDeletionInput>(empty);
  const [website, setWebsite] = useState("");
  const [errors, setErrors] = useState<
    Partial<Record<keyof PublicDeletionInput, string>>
  >({});
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<DeletionOutcome | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = validatePublicDeletion(f);
    setErrors(v);
    if (Object.keys(v).length) return;
    setBusy(true);
    try {
      const r = await send({ data: { ...f, website } });
      setOutcome(r.outcome);
    } catch {
      setOutcome("ERROR");
    } finally {
      setBusy(false);
    }
  }

  if (outcome && isDelivered(outcome)) {
    return (
      <div
        role="status"
        className="mt-3 flex items-start gap-3 rounded-xl border border-[#b9e3c9] bg-[#ecf8f0] p-4 text-[#145a32]"
        data-testid="deletion-done"
      >
        <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <p className="m-0">{DELETION_MESSAGE[outcome]}</p>
      </div>
    );
  }

  const input =
    "mt-1 block h-12 w-full rounded-[10px] border border-[var(--scd-line)] bg-white px-3 text-[16px] text-[var(--scd-ink)] focus:outline-none focus:ring-2 focus:ring-[var(--scd-blue)]";
  const label = "block text-[14px] font-semibold";
  const err = "mt-1 block text-[14px] text-destructive";
  return (
    <form
      onSubmit={submit}
      noValidate
      aria-labelledby="modulo-t"
      className="mt-3 grid gap-4 rounded-2xl border border-[var(--scd-line)] p-4 sm:p-5"
      data-testid="deletion-form"
    >
      <label className={label}>
        Nome e cognome
        <input
          className={input}
          autoComplete="name"
          value={f.name}
          onChange={(e) => setF({ ...f, name: e.target.value })}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? "del-name-err" : undefined}
        />
        {errors.name && (
          <span id="del-name-err" className={err}>
            {errors.name}
          </span>
        )}
      </label>
      <label className={label}>
        E-mail con cui entri nell'app
        <input
          type="email"
          inputMode="email"
          className={input}
          autoComplete="email"
          value={f.email}
          onChange={(e) => setF({ ...f, email: e.target.value })}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? "del-email-err" : undefined}
        />
        {errors.email && (
          <span id="del-email-err" className={err}>
            {errors.email}
          </span>
        )}
      </label>
      <label className={label}>
        Note (facoltative)
        <textarea
          rows={3}
          maxLength={300}
          className={`${input} h-auto py-2`}
          value={f.note}
          onChange={(e) => setF({ ...f, note: e.target.value })}
          placeholder="Per esempio: account del genitore di un atleta. Non scrivere documenti o dati sanitari."
        />
      </label>
      {/* Honeypot for bots: hidden from people and from assistive technology. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
      />
      <label className="flex items-start gap-3 text-[15px]">
        <input
          type="checkbox"
          className="mt-1 size-5 shrink-0"
          checked={f.confirm}
          onChange={(e) => setF({ ...f, confirm: e.target.checked })}
          aria-invalid={!!errors.confirm}
        />
        <span>
          Voglio eliminare il mio account. So che la società conserva solo i
          dati che la legge le chiede di tenere.
          {errors.confirm && <span className={err}>{errors.confirm}</span>}
        </span>
      </label>
      <button
        type="submit"
        disabled={busy}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-[12px] bg-[#b42318] px-5 text-[16px] font-bold text-white disabled:opacity-60"
      >
        <Trash2 className="size-5" aria-hidden="true" />
        {busy ? "Invio…" : "Invia la richiesta"}
      </button>
      {outcome && (
        <div
          role="alert"
          className="rounded-xl border border-[#f1d3a5] bg-[#fff8ec] p-3 text-[15px]"
          data-testid="deletion-error"
        >
          <p className="m-0">{DELETION_MESSAGE[outcome]}</p>
          {(outcome === "ERROR" || outcome === "BUSY") && (
            <a
              href={deletionMailto({
                name: f.name.trim(),
                email: f.email.trim(),
              })}
              className="mt-2 inline-flex min-h-11 items-center font-semibold text-primary underline"
            >
              Scrivi l'e-mail già pronta
            </a>
          )}
        </div>
      )}
    </form>
  );
}
