import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, CircleCheck } from "lucide-react";
import { useId, useState } from "react";

import { ClubCrestOfficial } from "@/components/SiteChrome";
import { OUTCOME_MESSAGE, validateAccessRequest, type AccessRequestInput, type RequestOutcome } from "@/lib/access-requests";
import { submitAccessRequest } from "@/lib/access-requests.functions";

/**
 * Self-registration (r64): name, surname, birth date, e-mail, phone + privacy consent.
 * The secretariat verifies who the person is and activates the access; nothing opens automatically.
 */
export const Route = createFileRoute("/registrati")({
  head: () => ({
    meta: [
      { title: "Registrati — S.C.D. ColicoDerviese" },
      { name: "description", content: "Chiedi l'accesso alla Super App della S.C.D. ColicoDerviese: la segreteria verifica e ti attiva." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Registrati,
});

const EMPTY: AccessRequestInput = { firstName: "", lastName: "", birthDate: "", email: "", phone: "", consent: false };

function todayRome(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function Registrati() {
  const send = useServerFn(submitAccessRequest);
  const [form, setForm] = useState<AccessRequestInput>(EMPTY);
  const [website, setWebsite] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<RequestOutcome | null>(null);
  const id = useId();
  const errors = validateAccessRequest(form, todayRome());
  const show = (k: keyof AccessRequestInput) => (touched ? errors[k] : undefined);
  const set = <K extends keyof AccessRequestInput>(k: K, v: AccessRequestInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (Object.keys(errors).length || busy) return;
    setBusy(true);
    try {
      const res = await send({ data: { ...form, website } });
      setOutcome(res.outcome);
      if (res.outcome === "RECEIVED") setForm(EMPTY);
    } catch {
      setOutcome("ERROR");
    } finally {
      setBusy(false);
    }
  }

  const field = "h-12 w-full rounded-[12px] border-2 border-[var(--scd-line)] bg-white px-3 text-[17px] text-[var(--scd-ink)] outline-none focus:border-[var(--scd-blue)] aria-[invalid=true]:border-[#c2410c]";

  return (
    <main className="bg-[var(--scd-page)] pb-16" data-screen="registrati">
      <section className="relative isolate overflow-hidden bg-[var(--scd-navy)] text-white">
        <div aria-hidden="true" className="scd-kit-stripes absolute inset-0 -z-10" />
        <div className="mx-auto flex max-w-6xl items-end gap-4 px-4 pb-8 pt-8 sm:px-6 lg:pb-12 lg:pt-12">
          <ClubCrestOfficial size={64} />
          <div>
            <h1 className="font-brand text-[42px] uppercase leading-[0.92] sm:text-[60px]">Registrati</h1>
            <p className="mt-2 max-w-[38ch] text-[16px] leading-snug text-white/90 sm:text-[18px]">Un solo link per tutti: cinque dati e sei dentro. Poi la Direzione ti abilita quello che ti serve.</p>
          </div>
        </div>
      </section>

      <div className="mx-auto mt-6 grid max-w-6xl gap-5 px-4 sm:px-6 lg:grid-cols-[minmax(0,520px)_1fr]">
        <section className="scd-card p-5 lg:p-7" aria-labelledby={`${id}-h`}>
          {outcome === "RECEIVED" ? (
            <div role="status" className="grid gap-3">
              <h2 id={`${id}-h`} className="flex items-center gap-2 text-[22px] font-bold text-[var(--scd-ink)]">
                <CircleCheck className="size-6 text-[#15803d]" aria-hidden="true" />
                Iscrizione fatta
              </h2>
              <p className="text-[15.5px] leading-snug text-[var(--scd-ink)]">{OUTCOME_MESSAGE.RECEIVED}</p>
              <Link to="/accedi" search={{ next: undefined }} className="scd-action h-[52px] w-full text-[17px] font-bold">
                Vai ad Accedi
                <ArrowRight className="size-5" aria-hidden="true" />
              </Link>
              <button type="button" onClick={() => { setOutcome(null); setTouched(false); }} className="scd-focus justify-self-start text-[14.5px] font-semibold text-[var(--scd-blue)] underline-offset-2 hover:underline">
                Registra un'altra persona
              </button>
            </div>
          ) : (
            <form onSubmit={submit} noValidate className="grid gap-3" aria-labelledby={`${id}-h`}>
              <h2 id={`${id}-h`} className="text-[22px] font-bold text-[var(--scd-ink)]">I tuoi dati</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field id={`${id}-fn`} label="Nome" error={show("firstName")}>
                  <input id={`${id}-fn`} autoComplete="given-name" value={form.firstName} onChange={(e) => set("firstName", e.target.value)} aria-invalid={Boolean(show("firstName"))} aria-describedby={show("firstName") ? `${id}-fn-e` : undefined} className={field} />
                </Field>
                <Field id={`${id}-ln`} label="Cognome" error={show("lastName")}>
                  <input id={`${id}-ln`} autoComplete="family-name" value={form.lastName} onChange={(e) => set("lastName", e.target.value)} aria-invalid={Boolean(show("lastName"))} aria-describedby={show("lastName") ? `${id}-ln-e` : undefined} className={field} />
                </Field>
              </div>
              <Field id={`${id}-bd`} label="Data di nascita" error={show("birthDate")}>
                <input id={`${id}-bd`} type="date" autoComplete="bday" max={todayRome()} value={form.birthDate} onChange={(e) => set("birthDate", e.target.value)} aria-invalid={Boolean(show("birthDate"))} aria-describedby={show("birthDate") ? `${id}-bd-e` : undefined} className={field} />
              </Field>
              <Field id={`${id}-em`} label="E-mail (la userai per entrare)" error={show("email")}>
                <input id={`${id}-em`} type="email" inputMode="email" autoComplete="email" value={form.email} onChange={(e) => set("email", e.target.value)} aria-invalid={Boolean(show("email"))} aria-describedby={show("email") ? `${id}-em-e` : undefined} className={field} placeholder="nome@esempio.it" />
              </Field>
              <Field id={`${id}-ph`} label="Telefono" error={show("phone")}>
                <input id={`${id}-ph`} type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} aria-invalid={Boolean(show("phone"))} aria-describedby={show("phone") ? `${id}-ph-e` : undefined} className={field} placeholder="333 1234567" />
              </Field>
              <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                <label>Sito web<input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} /></label>
              </div>
              <label className="flex items-start gap-3 rounded-[12px] bg-[#f4f8fd] p-3 text-[14.5px] leading-snug text-[var(--scd-ink)]">
                <input type="checkbox" checked={form.consent} onChange={(e) => set("consent", e.target.checked)} aria-invalid={Boolean(show("consent"))} className="scd-focus mt-0.5 size-5 flex-none accent-[var(--scd-blue)]" />
                <span>
                  Ho letto l'<a href="/privacy" target="_blank" rel="noopener" className="font-semibold text-[var(--scd-blue)] underline">informativa privacy</a> e acconsento al trattamento dei dati da parte della S.C.D. ColicoDerviese per creare il mio accesso e verificare la mia identità.
                  {show("consent") && <b className="mt-1 block text-[#9a3412]">{show("consent")}</b>}
                </span>
              </label>
              <button type="submit" disabled={busy} className="scd-action h-[52px] w-full text-[17px] font-bold disabled:opacity-60">
                {busy ? "Invio…" : "Iscriviti"}
                <ArrowRight className="size-5" aria-hidden="true" />
              </button>
              {outcome && (
                <p role="status" className="rounded-[12px] bg-[#fff3c4] px-3 py-2 text-[14.5px] leading-snug text-[#7a5200]">{OUTCOME_MESSAGE[outcome]}</p>
              )}
              <p className="text-[13.5px] leading-snug text-[var(--scd-sub)]">
                Hai già un accesso? <Link to="/accedi" search={{ next: undefined }} className="font-semibold text-[var(--scd-blue)] underline-offset-2 hover:underline">Entra da qui</Link>.
              </p>
            </form>
          )}
        </section>

        <aside className="grid content-start gap-3 text-[14.5px] leading-snug text-[var(--scd-sub)]">
          <p className="rounded-[14px] bg-white p-4 shadow-[0_6px_18px_-12px_rgb(2_20_51/0.4)]">
            <b className="block text-[15.5px] text-[var(--scd-ink)]">Cosa succede dopo</b>
            Entri subito da "Accedi" con la tua e-mail, niente password, e vedi calendario e attività del club. La Direzione controlla i dati, ti collega alla tua scheda (e, se sei un genitore, a tuo figlio) e ti abilita le funzioni del tuo ruolo. Può anche sospendere un accesso in qualsiasi momento.
          </p>
          <p className="rounded-[14px] bg-white p-4 shadow-[0_6px_18px_-12px_rgb(2_20_51/0.4)]">
            <b className="block text-[15.5px] text-[var(--scd-ink)]">Ragazzi</b>
            Sotto i 14 anni registra un genitore o tutore, con i suoi dati. Dai 14 ai 17 anni puoi iscriverti: vedi solo calendario e attività finché la Direzione non verifica il consenso della famiglia.
          </p>
          <p className="rounded-[14px] bg-white p-4 shadow-[0_6px_18px_-12px_rgb(2_20_51/0.4)]">
            <b className="block text-[15.5px] text-[var(--scd-ink)]">Registri qualcun altro?</b>
            Dirigenti e segreteria possono compilare il modulo per conto di una persona, con la sua e-mail: le funzioni oltre al calendario le abilita comunque la Direzione.
          </p>
        </aside>
      </div>
    </main>
  );
}

function Field({ id, label, error, children }: { id: string; label: string; error: string | undefined; children: React.ReactNode }) {
  return (
    <div className="grid min-w-0 gap-1">
      <label htmlFor={id} className="text-[14px] font-bold text-[var(--scd-sub)]">{label}</label>
      {children}
      {error && <span id={`${id}-e`} className="text-[13.5px] font-semibold text-[#9a3412]">{error}</span>}
    </div>
  );
}
