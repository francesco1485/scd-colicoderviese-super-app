import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Eye, EyeOff, LifeBuoy, MailCheck } from "lucide-react";
import { useEffect, useId, useState } from "react";

import { ClubCrestOfficial } from "@/components/SiteChrome";
import { DeclarationFields } from "@/components/scd/DeclarationFields";
import { PASSWORD_MAX, PASSWORD_MIN } from "@/lib/auth-remember";
import { EMPTY_DECLARATION, SIGNUP_MESSAGE, SOCIAL_PROVIDERS, supportMailto, validateSignup, type SignupField, type SignupInput, type SignupOutcome, type SocialProvider } from "@/lib/signup";
import { getAuthProviders, signUpWithPassword, startSocialSignIn } from "@/lib/signup.functions";

/**
 * Registration (UD-117): once, with password and phone. One confirmation e-mail, then always e-mail + password.
 * Everyone enters the open area at once; "Chi sei nel club?" decides what the club checks next (lib/signup.ts).
 */
export const Route = createFileRoute("/registrati")({
  head: () => ({
    meta: [
      { title: "Registrati — S.C.D. ColicoDerviese" },
      { name: "description", content: "Crea il tuo accesso alla Super App della S.C.D. ColicoDerviese: e-mail, telefono e password. Entri subito nell'area aperta." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Registrati,
});

const EMPTY: SignupInput = { firstName: "", lastName: "", birthDate: "", email: "", phone: "", password: "", confirm: "", consent: false, declaration: EMPTY_DECLARATION };

function todayRome(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Rome", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function Registrati() {
  const send = useServerFn(signUpWithPassword);
  const social = useServerFn(startSocialSignIn);
  const [form, setForm] = useState<SignupInput>(EMPTY);
  const [website, setWebsite] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const [outcome, setOutcome] = useState<SignupOutcome | null>(null);
  const [sentTo, setSentTo] = useState("");
  const [providers, setProviders] = useState<SocialProvider[]>([]);
  const [socialError, setSocialError] = useState<string | null>(null);
  const id = useId();
  const errors = validateSignup(form, todayRome());
  const err = (k: SignupField) => (touched ? errors[k] : undefined);
  const set = <K extends keyof SignupInput>(k: K, v: SignupInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    let alive = true;
    getAuthProviders()
      .then((p) => alive && setProviders(p.providers))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (Object.keys(errors).length || busy) {
      const first = Object.keys(errors)[0];
      if (first) document.getElementById(`${id}-${first}`)?.focus();
      return;
    }
    setBusy(true);
    try {
      const res = await send({ data: { ...form, website } });
      setOutcome(res.outcome);
      if (res.outcome === "CHECK_EMAIL") {
        setSentTo(form.email.trim().toLowerCase());
        setForm(EMPTY);
        setTouched(false);
      }
    } catch {
      setOutcome("ERROR");
    } finally {
      setBusy(false);
    }
  }

  async function goSocial(provider: SocialProvider) {
    setSocialError(null);
    try {
      const r = await social({ data: { provider, remember: true } });
      if (r.ok && r.url) window.location.assign(r.url);
      else setSocialError(r.message);
    } catch {
      setSocialError("Questo accesso non è disponibile in questo momento: registrati con e-mail e password.");
    }
  }

  const field = "h-12 w-full rounded-[12px] border-2 border-[var(--scd-line)] bg-white px-3 text-[17px] text-[var(--scd-ink)] outline-none focus:border-[var(--scd-blue)] aria-[invalid=true]:border-[#c2410c]";
  const aria = (k: SignupField) => ({ "aria-invalid": Boolean(err(k)), "aria-describedby": err(k) ? `${id}-${k}-e` : undefined });

  return (
    <main className="bg-[var(--scd-page)] pb-16" data-screen="registrati">
      <section className="relative isolate overflow-hidden bg-[var(--scd-navy)] text-white">
        <div aria-hidden="true" className="scd-kit-stripes absolute inset-0 -z-10" />
        <div className="mx-auto flex max-w-6xl items-end gap-4 px-4 pb-8 pt-8 sm:px-6 lg:pb-12 lg:pt-12">
          <ClubCrestOfficial size={64} />
          <div>
            <h1 className="font-brand text-[42px] uppercase leading-[0.92] sm:text-[60px]"><span className="scd-brush">Registrati</span></h1>
            <p className="mt-2 max-w-[40ch] text-[16px] leading-snug text-white/90 sm:text-[18px]">Una volta sola. Poi entri sempre con e-mail o telefono e password.</p>
          </div>
        </div>
      </section>

      <div className="mx-auto mt-6 grid max-w-6xl gap-5 px-4 sm:px-6 lg:grid-cols-[minmax(0,560px)_1fr]">
        <section className="scd-card p-5 lg:p-7" aria-labelledby={`${id}-h`}>
          {outcome === "CHECK_EMAIL" ? (
            <div role="status" className="grid gap-3" data-testid="signup-done">
              <h2 id={`${id}-h`} className="flex items-center gap-2 text-[22px] font-bold text-[var(--scd-ink)]">
                <MailCheck className="size-6 text-[#15803d]" aria-hidden="true" />
                Controlla la posta
              </h2>
              {sentTo && <p className="break-all text-[15.5px] font-semibold text-[var(--scd-ink)]">{sentTo}</p>}
              <p className="text-[15.5px] leading-snug text-[var(--scd-ink)]">{SIGNUP_MESSAGE.CHECK_EMAIL}</p>
              <Link to="/accedi" search={{ next: undefined }} className="scd-action h-[52px] w-full text-[17px] font-bold">
                Vai ad Accedi
                <ArrowRight className="size-5" aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <form onSubmit={submit} noValidate className="grid gap-3" aria-labelledby={`${id}-h`} data-testid="signup-form">
              <h2 id={`${id}-h`} className="text-[22px] font-bold text-[var(--scd-ink)]">Crea il tuo accesso</h2>

              {providers.length > 0 && (
                <div className="grid gap-2" data-testid="signup-social">
                  {SOCIAL_PROVIDERS.filter((p) => providers.includes(p.id)).map((p) => (
                    <button key={p.id} type="button" onClick={() => void goSocial(p.id)} className="scd-focus inline-flex h-[52px] w-full items-center justify-center rounded-[12px] border-2 border-[var(--scd-line)] bg-white text-[16px] font-semibold text-[var(--scd-ink)]">
                      {p.label}
                    </button>
                  ))}
                  {socialError && <p className="rounded-[12px] bg-[#fff3c4] px-3 py-2 text-[14px] text-[#7a5200]">{socialError}</p>}
                  <p className="my-1 flex items-center gap-3 text-[13px] font-semibold uppercase tracking-wider text-[var(--scd-sub)]" aria-hidden="true">
                    <span className="h-px flex-1 bg-[var(--scd-line)]" />
                    oppure con la tua e-mail
                    <span className="h-px flex-1 bg-[var(--scd-line)]" />
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field id={`${id}-firstName`} label="Nome" error={err("firstName")}>
                  <input id={`${id}-firstName`} autoComplete="given-name" value={form.firstName} onChange={(e) => set("firstName", e.target.value)} {...aria("firstName")} className={field} />
                </Field>
                <Field id={`${id}-lastName`} label="Cognome" error={err("lastName")}>
                  <input id={`${id}-lastName`} autoComplete="family-name" value={form.lastName} onChange={(e) => set("lastName", e.target.value)} {...aria("lastName")} className={field} />
                </Field>
              </div>
              <Field id={`${id}-birthDate`} label="Data di nascita" error={err("birthDate")}>
                <input id={`${id}-birthDate`} type="date" autoComplete="bday" max={todayRome()} value={form.birthDate} onChange={(e) => set("birthDate", e.target.value)} {...aria("birthDate")} className={field} />
              </Field>
              <Field id={`${id}-email`} label="E-mail (per entrare e per la conferma)" error={err("email")}>
                <input id={`${id}-email`} type="email" inputMode="email" autoComplete="email" autoCapitalize="none" spellCheck={false} value={form.email} onChange={(e) => set("email", e.target.value)} {...aria("email")} className={field} placeholder="nome@esempio.it" />
              </Field>
              <Field id={`${id}-phone`} label="Telefono cellulare (puoi usarlo anche per entrare)" error={err("phone")}>
                <input id={`${id}-phone`} type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} {...aria("phone")} className={field} placeholder="333 1234567" />
              </Field>
              <Field id={`${id}-password`} label={`Password (almeno ${PASSWORD_MIN} caratteri, una lettera e un numero)`} error={err("password")}>
                <div className="relative">
                  <input id={`${id}-password`} type={show ? "text" : "password"} autoComplete="new-password" maxLength={PASSWORD_MAX} value={form.password} onChange={(e) => set("password", e.target.value)} {...aria("password")} className={`${field} pr-12`} />
                  <button type="button" onClick={() => setShow((v) => !v)} className="scd-focus absolute right-1 top-1 inline-flex size-10 items-center justify-center rounded-[8px] text-[var(--scd-sub)]" aria-label={show ? "Nascondi password" : "Mostra password"} aria-pressed={show}>
                    {show ? <EyeOff className="size-5" aria-hidden="true" /> : <Eye className="size-5" aria-hidden="true" />}
                  </button>
                </div>
              </Field>
              <Field id={`${id}-confirm`} label="Ripeti la password" error={err("confirm")}>
                <input id={`${id}-confirm`} type={show ? "text" : "password"} autoComplete="new-password" maxLength={PASSWORD_MAX} value={form.confirm} onChange={(e) => set("confirm", e.target.value)} {...aria("confirm")} className={field} />
              </Field>

              <DeclarationFields idPrefix={`${id}-d`} value={form.declaration} onChange={(d) => set("declaration", d)} error={err("children")} />

              <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
                <label>Sito web<input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} /></label>
              </div>
              <label className="flex items-start gap-3 rounded-[12px] bg-[#f4f8fd] p-3 text-[14.5px] leading-snug text-[var(--scd-ink)]">
                <input id={`${id}-consent`} type="checkbox" checked={form.consent} onChange={(e) => set("consent", e.target.checked)} aria-invalid={Boolean(err("consent"))} className="scd-focus mt-0.5 size-5 flex-none accent-[var(--scd-blue)]" />
                <span>
                  Ho letto l'<a href="/privacy" target="_blank" rel="noopener" className="font-semibold text-[var(--scd-blue)] underline">informativa privacy</a> e acconsento al trattamento dei dati da parte della S.C.D. ColicoDerviese per creare il mio accesso e verificare chi sono.
                  {err("consent") && <b className="mt-1 block text-[#9a3412]">{err("consent")}</b>}
                </span>
              </label>
              <button type="submit" disabled={busy} className="scd-action h-[52px] w-full text-[17px] font-bold disabled:opacity-60" data-testid="signup-submit">
                {busy ? "Invio…" : "Crea il mio accesso"}
                <ArrowRight className="size-5" aria-hidden="true" />
              </button>
              {touched && Object.keys(errors).length > 0 && (
                <p role="alert" className="rounded-[12px] bg-[#fff3c4] px-3 py-2 text-[14.5px] leading-snug text-[#7a5200]">Manca qualcosa: controlla i campi segnati in rosso.</p>
              )}
              {outcome && (
                <p role="status" className="rounded-[12px] bg-[#fff3c4] px-3 py-2 text-[14.5px] leading-snug text-[#7a5200]" data-testid="signup-outcome">{SIGNUP_MESSAGE[outcome]}</p>
              )}
              <p className="text-[14px] leading-snug text-[var(--scd-sub)]">
                Hai già un accesso? <Link to="/accedi" search={{ next: undefined }} className="font-semibold text-[var(--scd-blue)] underline-offset-2 hover:underline">Entra da qui</Link>.
              </p>
            </form>
          )}
        </section>

        <aside className="grid content-start gap-3 text-[14.5px] leading-snug text-[var(--scd-sub)]">
          <div className="rounded-[14px] bg-white p-4 shadow-[0_6px_18px_-12px_rgb(2_20_51/0.4)]">
            <b className="block text-[15.5px] text-[var(--scd-ink)]">Cosa succede dopo</b>
            <ol className="mt-1 list-decimal space-y-1 pl-5">
              <li>Apri il link della e-mail di conferma (solo questa volta).</li>
              <li>Entri subito nell'area aperta: calendario, partite, notizie, eventi.</li>
              <li>Se la società riconosce i tuoi dati (stessa e-mail e nomi dei figli già registrati) si apre subito anche la tua area.</li>
              <li>Mister, dirigenti e staff: avvisiamo il Direttore Sportivo e il Presidente ti abilita.</li>
            </ol>
          </div>
          <p className="rounded-[14px] bg-white p-4 shadow-[0_6px_18px_-12px_rgb(2_20_51/0.4)]">
            <b className="block text-[15.5px] text-[var(--scd-ink)]">Ragazzi</b>
            Sotto i 14 anni registra un genitore o tutore, con i suoi dati, indicando il figlio. Dai 14 ai 17 anni puoi registrarti: la tua area si apre dopo il consenso della famiglia.
          </p>
          <a href={supportMailto("Pagina Registrati")} className="scd-focus flex items-center gap-3 rounded-[14px] border-2 border-[#b9d5ef] bg-white p-4 text-[var(--scd-ink)]" data-testid="signup-support">
            <LifeBuoy className="size-6 shrink-0 text-[var(--scd-blue)]" aria-hidden="true" />
            <span>
              <b className="block text-[15.5px]">Problemi a registrarti?</b>
              Scrivi all'assistenza: ti aiutiamo noi, anche al telefono.
            </span>
          </a>
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
