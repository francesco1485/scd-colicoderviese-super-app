import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, LogOut, Mail, ShieldCheck } from "lucide-react";
import { useEffect, useId, useState } from "react";

import { ClubCrestOfficial } from "@/components/SiteChrome";
import { getSession, requestMagicLink, signOut, type MagicLinkOutcome, type SessionView } from "@/lib/auth.functions";
import { safeNext } from "@/lib/session";

export const Route = createFileRoute("/accedi/")({
  validateSearch: (s: Record<string, unknown>) => ({ next: typeof s["next"] === "string" ? safeNext(s["next"]) : undefined }),
  head: () => ({
    meta: [
      { title: "Accedi — S.C.D. ColicoDerviese" },
      { name: "description", content: "Entra nella Super App con la tua e-mail: ricevi un link, nessuna password da ricordare." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Accedi,
});

function Accedi() {
  const { next } = Route.useSearch();
  const navigate = useNavigate();
  const send = useServerFn(requestMagicLink);
  const logout = useServerFn(signOut);
  const [session, setSession] = useState<SessionView | null>(null);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<MagicLinkOutcome | null>(null);
  const id = useId();

  useEffect(() => {
    let alive = true;
    getSession()
      .then((s) => alive && setSession(s))
      .catch(() => alive && setSession({ configured: false, user: null, roles: [], landing: "/aree", badge: null, memberships: [] }));
    return () => {
      alive = false;
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setOutcome(null);
    try {
      setOutcome(await send({ data: { email, next } }));
    } catch {
      setOutcome({ sent: false, message: "Controlla l'indirizzo e riprova." });
    } finally {
      setBusy(false);
    }
  }

  async function leave() {
    setBusy(true);
    try {
      await logout();
      setSession((s) => (s ? { ...s, user: null, roles: [], landing: "/aree", badge: null, memberships: [] } : s));
      setOutcome(null);
    } finally {
      setBusy(false);
    }
  }

  const target = next ?? session?.landing ?? "/aree";

  return (
    <main className="bg-[var(--scd-page)] pb-16" data-screen="accedi">
      <section className="relative isolate overflow-hidden bg-[var(--scd-navy)] text-white">
        <div aria-hidden="true" className="scd-kit-stripes absolute inset-0 -z-10" />
        <div className="mx-auto flex max-w-6xl items-end gap-4 px-4 pb-8 pt-8 sm:px-6 lg:pb-12 lg:pt-12">
          <ClubCrestOfficial size={64} />
          <div>
            <h1 className="font-brand text-[42px] uppercase leading-[0.92] sm:text-[60px]">Accedi</h1>
            <p className="mt-2 max-w-[36ch] text-[16px] leading-snug text-white/90 sm:text-[18px]">Un solo accesso per tutte le aree. Ti mandiamo un link via e-mail: niente password.</p>
          </div>
        </div>
      </section>

      <div className="mx-auto mt-6 grid max-w-6xl gap-5 px-4 sm:px-6 lg:grid-cols-[minmax(0,480px)_1fr]">
        <section className="scd-card p-5 lg:p-7" aria-labelledby={`${id}-h`}>
          {session === null ? (
            <p className="text-[15px] text-[var(--scd-sub)]" role="status">Controllo l'accesso…</p>
          ) : session.user ? (
            <>
              <h2 id={`${id}-h`} className="text-[22px] font-bold text-[var(--scd-ink)]">Sei dentro</h2>
              <p className="mt-1 text-[15.5px] leading-snug text-[var(--scd-ink)]" data-testid="session-email">{session.user.email}</p>
              <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-[#e3f3e9] px-3 py-1 text-[14px] font-bold text-[#14532d]" data-testid="session-badge">
                <ShieldCheck className="size-4" aria-hidden="true" />
                {session.badge}
              </p>
              {session.roles.length === 0 && (
                <p className="mt-3 rounded-[12px] bg-[#fff3c4] px-3 py-2 text-[14px] leading-snug text-[#7a5200]">
                  Il tuo indirizzo è riconosciuto ma la società non ti ha ancora assegnato un ruolo: le aree riservate restano chiuse finché la Direzione non lo inserisce.
                </p>
              )}
              <div className="mt-5 grid gap-2">
                <Link to={target as never} className="scd-action h-[52px] w-full text-[17px] font-bold">
                  Vai all'area
                  <ArrowRight className="size-5" aria-hidden="true" />
                </Link>
                <button type="button" onClick={leave} disabled={busy} className="scd-focus inline-flex h-11 w-full items-center justify-center gap-2 rounded-[10px] border border-[#b9d5ef] bg-white text-[15px] font-semibold text-[var(--scd-blue)]">
                  <LogOut className="size-4" aria-hidden="true" />
                  Esci
                </button>
              </div>
            </>
          ) : !session.configured ? (
            <>
              <h2 id={`${id}-h`} className="text-[22px] font-bold text-[var(--scd-ink)]">Accesso in attivazione</h2>
              <p className="mt-2 text-[15px] leading-snug text-[var(--scd-sub)]" data-testid="login-unconfigured">
                Il collegamento al database del club non è ancora acceso su questo server. Appena la Direzione lo attiva, da qui si entra con la propria e-mail.
              </p>
              <Link to="/aree" className="scd-action mt-5 h-[48px] w-full text-[16px] font-bold">Guarda le aree</Link>
            </>
          ) : (
            <form onSubmit={submit} className="grid gap-3" aria-labelledby={`${id}-h`}>
              <h2 id={`${id}-h`} className="text-[22px] font-bold text-[var(--scd-ink)]">Entra con la tua e-mail</h2>
              <label htmlFor={`${id}-e`} className="text-[14px] font-bold text-[var(--scd-sub)]">E-mail registrata in società</label>
              <div className="flex items-center gap-2 rounded-[12px] border-2 border-[var(--scd-line)] bg-white px-3 focus-within:border-[var(--scd-blue)]">
                <Mail className="size-5 shrink-0 text-[var(--scd-sub)]" aria-hidden="true" />
                <input
                  id={`${id}-e`}
                  type="email"
                  required
                  autoComplete="email"
                  inputMode="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 w-full bg-transparent text-[17px] text-[var(--scd-ink)] outline-none"
                  placeholder="nome@esempio.it"
                />
              </div>
              <button type="submit" disabled={busy || !email} className="scd-action h-[52px] w-full text-[17px] font-bold disabled:opacity-60" data-testid="login-send">
                {busy ? "Invio…" : "Mandami il link"}
                <ArrowRight className="size-5" aria-hidden="true" />
              </button>
              {outcome && (
                <p role="status" className={`rounded-[12px] px-3 py-2 text-[14.5px] leading-snug ${outcome.sent ? "bg-[#e3f3e9] text-[#14532d]" : "bg-[#fff3c4] text-[#7a5200]"}`} data-testid="login-outcome">
                  {outcome.message}
                </p>
              )}
              <p className="text-[13.5px] leading-snug text-[var(--scd-sub)]">
                Il link vale pochi minuti e si usa una volta sola. Entra solo chi la società ha registrato: se la tua e-mail non è tra quelle, scrivi alla segreteria.
              </p>
            </form>
          )}
        </section>

        <aside className="grid content-start gap-3 text-[14.5px] leading-snug text-[var(--scd-sub)]">
          <p className="rounded-[14px] bg-white p-4 shadow-[0_6px_18px_-12px_rgb(2_20_51/0.4)]">
            <b className="block text-[15.5px] text-[var(--scd-ink)]">Un accesso, tante stanze</b>
            Direzione, segreteria, dirigenti, mister, autisti, famiglie: lo stesso account apre solo le aree del tuo ruolo. I ruoli li assegna la società nel gestionale, non si scelgono da soli.
          </p>
          <p className="rounded-[14px] bg-white p-4 shadow-[0_6px_18px_-12px_rgb(2_20_51/0.4)]">
            <b className="block text-[15.5px] text-[var(--scd-ink)]">Minori</b>
            I ragazzi sotto i 14 anni entrano tramite l'account del genitore o tutore; dai 14 anni possono avere il proprio accesso con il consenso della famiglia.
          </p>
          {next && <p className="px-1 text-[13px]">Dopo l'accesso torni a <code className="rounded bg-[#eaf2fc] px-1">{next}</code>.</p>}
          <button type="button" onClick={() => void navigate({ to: "/aree" })} className="scd-focus justify-self-start text-[14px] font-semibold text-[var(--scd-blue)] underline-offset-2 hover:underline">
            Torna alle aree
          </button>
        </aside>
      </div>
    </main>
  );
}
