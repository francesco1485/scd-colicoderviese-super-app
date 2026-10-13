import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Eye, EyeOff, KeyRound, Lock, LogOut, Mail, ShieldCheck } from "lucide-react";
import { useEffect, useId, useState } from "react";

import { ClubCrestOfficial } from "@/components/SiteChrome";
import { PASSWORD_MAX, PASSWORD_PAGE } from "@/lib/auth-remember";
import { getSession, requestMagicLink, signInWithPassword, signOut, type MagicLinkOutcome, type SessionView } from "@/lib/auth.functions";
import { safeNext } from "@/lib/session";

export const Route = createFileRoute("/accedi/")({
  validateSearch: (s: Record<string, unknown>): { next?: string | undefined; modo?: "link" | undefined } => ({
    ...(typeof s["next"] === "string" ? { next: safeNext(s["next"]) } : {}),
    ...(s["modo"] === "link" ? { modo: "link" as const } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Accedi — S.C.D. ColicoDerviese" },
      { name: "description", content: "Entra nella Super App con e-mail e password, oppure con un link via e-mail." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Accedi,
});

const SIGNED_OUT: Omit<SessionView, "configured"> = { user: null, roles: [], landing: "/aree", badge: null, hasPassword: false, memberships: [] };

/** After sign-out nothing of the session may stay on the device (audit 2026-10-12). */
async function clearOfflineCopies() {
  try {
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k === "scd-pages" || k.startsWith("workbox-runtime")).map((k) => caches.delete(k)));
    }
  } catch {
    /* Cache API unavailable: nothing stored */
  }
}

type Mode = "password" | "link";
type Notice = { ok: boolean; message: string };

function Accedi() {
  const { next, modo } = Route.useSearch();
  const navigate = useNavigate();
  const sendLink = useServerFn(requestMagicLink);
  const login = useServerFn(signInWithPassword);
  const logout = useServerFn(signOut);
  const [session, setSession] = useState<SessionView | null>(null);
  const [mode, setMode] = useState<Mode>(modo ?? "password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const id = useId();

  useEffect(() => {
    let alive = true;
    getSession()
      .then((s) => alive && setSession(s))
      .catch(() => alive && setSession({ configured: false, ...SIGNED_OUT }));
    return () => {
      alive = false;
    };
  }, []);

  function switchMode(m: Mode) {
    setMode(m);
    setNotice(null);
  }

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setNotice(null);
    try {
      const r = await login({ data: { email, password, remember, next } });
      if (r.ok) {
        setPassword("");
        void navigate({ to: r.next as never, replace: true });
        return;
      }
      setNotice({ ok: false, message: r.message });
    } catch {
      setNotice({ ok: false, message: "Controlla e-mail e password e riprova." });
    } finally {
      setBusy(false);
    }
  }

  async function submitLink(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setNotice(null);
    try {
      const r: MagicLinkOutcome = await sendLink({ data: { email, next, remember } });
      setNotice({ ok: r.sent, message: r.message });
    } catch {
      setNotice({ ok: false, message: "Controlla l'indirizzo e riprova." });
    } finally {
      setBusy(false);
    }
  }

  async function leave() {
    setBusy(true);
    try {
      await logout();
      await clearOfflineCopies();
      setSession((s) => (s ? { ...s, ...SIGNED_OUT } : s));
      setNotice(null);
    } finally {
      setBusy(false);
    }
  }

  const target = next ?? session?.landing ?? "/aree";
  const field = "flex items-center gap-2 rounded-[12px] border-2 border-[var(--scd-line)] bg-white px-3 focus-within:border-[var(--scd-blue)]";
  const input = "h-12 w-full min-w-0 bg-transparent text-[17px] text-[var(--scd-ink)] outline-none";

  return (
    <main className="bg-[var(--scd-page)] pb-28" data-screen="accedi">
      <section className="relative isolate overflow-hidden bg-[var(--scd-navy)] text-white">
        <div aria-hidden="true" className="scd-kit-stripes absolute inset-0 -z-10" />
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4 sm:px-6 sm:py-6 lg:py-10">
          {/* The header already shows the crest on phones: repeat it only on wider screens. */}
          <span className="hidden sm:block">
            <ClubCrestOfficial size={56} />
          </span>
          <div className="min-w-0 pr-16 sm:pr-0">
            <h1 className="font-brand text-[32px] uppercase leading-none sm:text-[48px]"><span className="scd-brush">Accedi</span></h1>
            <p className="mt-1 text-[14.5px] leading-snug text-white/90 sm:text-[17px]">Un solo accesso per tutte le aree del club.</p>
          </div>
        </div>
      </section>

      <div className="mx-auto mt-4 grid max-w-6xl gap-5 px-4 sm:mt-6 sm:px-6 lg:grid-cols-[minmax(0,480px)_1fr]">
        <section className="scd-card p-5 lg:p-7" aria-labelledby={`${id}-h`}>
          {session === null ? (
            <p className="text-[15px] text-[var(--scd-sub)]" role="status">Controllo l'accesso…</p>
          ) : session.user ? (
            <>
              <h2 id={`${id}-h`} className="text-[22px] font-bold text-[var(--scd-ink)]">Sei dentro</h2>
              <p className="mt-1 break-all text-[15.5px] leading-snug text-[var(--scd-ink)]" data-testid="session-email">{session.user.email}</p>
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
                <Link
                  to={PASSWORD_PAGE as never}
                  className="scd-focus inline-flex h-11 w-full items-center justify-center gap-2 rounded-[10px] border border-[#b9d5ef] bg-white text-[15px] font-semibold text-[var(--scd-blue)]"
                  data-testid="session-password"
                >
                  <KeyRound className="size-4" aria-hidden="true" />
                  {session.hasPassword ? "Cambia password" : "Crea la tua password"}
                </Link>
                <button type="button" onClick={leave} disabled={busy} className="scd-focus inline-flex h-11 w-full items-center justify-center gap-2 rounded-[10px] text-[15px] font-semibold text-[var(--scd-sub)]">
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
            <form onSubmit={mode === "password" ? submitPassword : submitLink} className="grid gap-3" aria-labelledby={`${id}-h`} data-mode={mode}>
              <div role="tablist" aria-label="Modo di accesso" className="grid grid-cols-2 gap-1 rounded-[12px] bg-[#eaf2fc] p-1">
                {(["password", "link"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    role="tab"
                    aria-selected={mode === m}
                    onClick={() => switchMode(m)}
                    className={`scd-focus h-10 rounded-[9px] text-[14.5px] font-bold ${mode === m ? "bg-white text-[var(--scd-navy)] shadow-[0_2px_8px_-4px_rgb(2_20_51/0.45)]" : "text-[var(--scd-sub)]"}`}
                    data-testid={`login-tab-${m}`}
                  >
                    {m === "password" ? "Con password" : "Con link via e-mail"}
                  </button>
                ))}
              </div>

              <h2 id={`${id}-h`} className="sr-only">{mode === "password" ? "Entra con e-mail e password" : "Ricevi un link di accesso"}</h2>

              <label htmlFor={`${id}-e`} className="text-[14px] font-bold text-[var(--scd-sub)]">E-mail registrata in società</label>
              <div className={field}>
                <Mail className="size-5 shrink-0 text-[var(--scd-sub)]" aria-hidden="true" />
                <input
                  id={`${id}-e`}
                  name="email"
                  type="email"
                  required
                  autoComplete={mode === "password" ? "username" : "email"}
                  inputMode="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={input}
                  placeholder="nome@esempio.it"
                />
              </div>

              {mode === "password" && (
                <>
                  <label htmlFor={`${id}-p`} className="text-[14px] font-bold text-[var(--scd-sub)]">Password</label>
                  <div className={field}>
                    <Lock className="size-5 shrink-0 text-[var(--scd-sub)]" aria-hidden="true" />
                    <input
                      id={`${id}-p`}
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="current-password"
                      maxLength={PASSWORD_MAX}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={input}
                      data-testid="login-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="scd-focus -mr-1 inline-flex size-10 shrink-0 items-center justify-center rounded-[8px] text-[var(--scd-sub)]"
                      aria-label={showPassword ? "Nascondi password" : "Mostra password"}
                      aria-pressed={showPassword}
                    >
                      {showPassword ? <EyeOff className="size-5" aria-hidden="true" /> : <Eye className="size-5" aria-hidden="true" />}
                    </button>
                  </div>
                </>
              )}

              <label className="flex min-h-11 cursor-pointer items-center gap-3 text-[15px] text-[var(--scd-ink)]" data-testid="login-remember">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="size-5 shrink-0 accent-[var(--scd-blue)]" />
                <span>
                  <b>Ricordami</b> su questo dispositivo
                  <span className="block text-[13px] text-[var(--scd-sub)]">Toglilo se il telefono o il computer non è solo tuo.</span>
                </span>
              </label>

              {mode === "password" ? (
                <button type="submit" disabled={busy || !email || !password} className="scd-action h-[52px] w-full text-[17px] font-bold disabled:opacity-60" data-testid="login-submit">
                  {busy ? "Accesso…" : "Entra"}
                  <ArrowRight className="size-5" aria-hidden="true" />
                </button>
              ) : (
                <button type="submit" disabled={busy || !email} className="scd-action h-[52px] w-full text-[17px] font-bold disabled:opacity-60" data-testid="login-send">
                  {busy ? "Invio…" : "Mandami il link"}
                  <ArrowRight className="size-5" aria-hidden="true" />
                </button>
              )}

              {notice && (
                <p role="status" className={`rounded-[12px] px-3 py-2 text-[14.5px] leading-snug ${notice.ok ? "bg-[#e3f3e9] text-[#14532d]" : "bg-[#fff3c4] text-[#7a5200]"}`} data-testid="login-outcome">
                  {notice.message}
                </p>
              )}

              {mode === "password" ? (
                <button type="button" onClick={() => switchMode("link")} className="scd-focus min-h-11 text-center text-[14.5px] font-semibold text-[var(--scd-blue)] underline" data-testid="login-forgot">
                  Primo accesso o password dimenticata? Ricevi un link
                </button>
              ) : (
                <p className="text-[13.5px] leading-snug text-[var(--scd-sub)]">
                  Il link vale pochi minuti e si usa una volta sola: aprilo da questo stesso dispositivo. Dopo il primo accesso scegli una password e non ti servirà più.
                </p>
              )}

              <Link to="/registrati" className="scd-focus inline-flex h-11 items-center justify-center rounded-[10px] border border-[#b9d5ef] bg-white text-[15px] font-semibold text-[var(--scd-blue)]" data-testid="login-register">
                Non hai ancora l'accesso? Registrati
              </Link>
              <Link to="/guida" className="text-center text-[14px] font-semibold text-[var(--scd-blue)] underline" data-testid="login-guide">
                Come funziona l'app
              </Link>
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
          <button type="button" onClick={() => void navigate({ to: "/aree" })} className="scd-focus inline-flex min-h-11 items-center justify-self-start text-[14px] font-semibold text-[var(--scd-blue)] underline-offset-2 hover:underline">
            Torna alle aree
          </button>
        </aside>
      </div>
    </main>
  );
}
