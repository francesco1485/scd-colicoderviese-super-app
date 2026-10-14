import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Hash, KeyRound, LifeBuoy, Lock, LogOut, Mail, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { ClubCrestOfficial } from "@/components/SiteChrome";
import { PASSWORD_MAX, PASSWORD_PAGE } from "@/lib/auth-remember";
import { OTP_LENGTH, cooldownUntil, normalizeOtpInput, secondsLeft, sendButtonLabel, type AuthErrorKind } from "@/lib/auth-otp";
import { getSession, requestMagicLink, signInWithPassword, signOut, verifyEmailCode, type MagicLinkOutcome, type SessionView } from "@/lib/auth.functions";
import { safeNext } from "@/lib/session";
import { SOCIAL_PROVIDERS, supportMailto, type SocialProvider } from "@/lib/signup";
import { getAuthProviders, resendSignupEmail, startSocialSignIn } from "@/lib/signup.functions";

/**
 * Sign-in (UD-117, Direzione 14/10/2026): one way in, like the big apps. E-mail + password with "Ricordami", or
 * Google / Apple / Facebook when the club switches them on. The e-mail code is ONLY for a forgotten password
 * (or an old account that never chose one): it leads straight to "choose a new password".
 */
export const Route = createFileRoute("/accedi/")({
  validateSearch: (s: Record<string, unknown>): { next?: string | undefined; modo?: "link" | "password" | "codice" | undefined } => ({
    ...(typeof s["next"] === "string" ? { next: safeNext(s["next"]) } : {}),
    ...(s["modo"] === "link" || s["modo"] === "password" || s["modo"] === "codice" ? { modo: s["modo"] } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Accedi — S.C.D. ColicoDerviese" },
      { name: "description", content: "Entra nella Super App con e-mail o telefono e password. Password dimenticata? Ti mandiamo un codice." },
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

type Notice = { ok: boolean; message: string; kind?: AuthErrorKind | undefined };

/** Survives a reload of the page, so refreshing does not reset the send cooldown (per-tab convenience only). */
const COOLDOWN_KEY = "scd-accedi-cooldown";
function readStoredCooldown(): number | null {
  try {
    const v = Number(window.sessionStorage.getItem(COOLDOWN_KEY));
    return Number.isFinite(v) && v > Date.now() ? v : null;
  } catch {
    return null;
  }
}
function storeCooldown(until: number | null) {
  try {
    if (until) window.sessionStorage.setItem(COOLDOWN_KEY, String(until));
    else window.sessionStorage.removeItem(COOLDOWN_KEY);
  } catch {
    /* storage blocked: the cooldown still works for this page view */
  }
}

/** Brand marks drawn as simple shapes (no third-party logo files): letter in a neutral badge. */
function ProviderMark({ id }: { id: SocialProvider }) {
  const letter = id === "google" ? "G" : id === "apple" ? "A" : "f";
  const cls = id === "apple" ? "bg-black text-white" : id === "facebook" ? "bg-[#1877f2] text-white" : "border border-[#dadce0] bg-white text-[#3c4043]";
  return (
    <span aria-hidden="true" className={`inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[15px] font-bold ${cls}`}>
      {letter}
    </span>
  );
}

function Accedi() {
  const { next, modo } = Route.useSearch();
  const navigate = useNavigate();
  const sendCode = useServerFn(requestMagicLink);
  const verifyCode = useServerFn(verifyEmailCode);
  const login = useServerFn(signInWithPassword);
  const logout = useServerFn(signOut);
  const social = useServerFn(startSocialSignIn);
  const resend = useServerFn(resendSignupEmail);
  const [session, setSession] = useState<SessionView | null>(null);
  const [providers, setProviders] = useState<SocialProvider[]>([]);
  const [forgot, setForgot] = useState(modo === "link" || modo === "codice");
  const [codeStep, setCodeStep] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [codeNotice, setCodeNotice] = useState<Notice | null>(null);
  const [until, setUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const codeRef = useRef<HTMLInputElement>(null);
  const lastTried = useRef<string>("");
  const id = useId();
  const left = secondsLeft(until, now);

  useEffect(() => {
    let alive = true;
    getSession()
      .then((s) => alive && setSession(s))
      .catch(() => alive && setSession({ configured: false, ...SIGNED_OUT }));
    getAuthProviders()
      .then((p) => alive && setProviders(p.providers))
      .catch(() => undefined);
    const stored = readStoredCooldown();
    if (stored) setUntil(stored);
    return () => {
      alive = false;
    };
  }, []);

  // One tick per second only while a countdown runs.
  useEffect(() => {
    if (!until) return;
    setNow(Date.now());
    const t = window.setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n >= until) {
        window.clearInterval(t);
        setUntil(null);
        storeCooldown(null);
      }
    }, 1000);
    return () => window.clearInterval(t);
  }, [until]);

  useEffect(() => {
    if (codeStep) codeRef.current?.focus();
  }, [codeStep]);

  function startCooldown(retryAfter: number | null) {
    const u = cooldownUntil(Date.now(), retryAfter);
    setUntil(u);
    setNow(Date.now());
    storeCooldown(u);
  }

  function openForgot(open: boolean) {
    setForgot(open);
    setNotice(null);
    setCodeNotice(null);
    setCodeStep(false);
    setCode("");
    window.setTimeout(() => document.getElementById(`${id}-e`)?.focus(), 0);
  }

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setNotice(null);
    try {
      const r = await login({ data: { identifier: email, password, remember, next } });
      if (r.ok) {
        setPassword("");
        void navigate({ to: r.next as never, replace: true });
        return;
      }
      setNotice({ ok: false, message: r.kind === "not_confirmed" ? "Devi ancora confermare l'indirizzo: apri il link della e-mail di registrazione (una volta sola)." : r.message, kind: r.kind });
    } catch {
      setNotice({ ok: false, message: "Controlla e-mail (o telefono) e password e riprova." });
    } finally {
      setBusy(false);
    }
  }

  async function resendConfirmation() {
    if (busy || !email) return;
    setBusy(true);
    try {
      const r = await resend({ data: { email } });
      setNotice({ ok: r.ok, message: r.message });
    } catch {
      setNotice({ ok: false, message: "Controlla l'indirizzo e riprova." });
    } finally {
      setBusy(false);
    }
  }

  async function goSocial(provider: SocialProvider) {
    if (busy) return;
    setBusy(true);
    setNotice(null);
    try {
      const r = await social({ data: { provider, next, remember } });
      if (r.ok && r.url) {
        window.location.assign(r.url);
        return;
      }
      setNotice({ ok: false, message: r.message });
    } catch {
      setNotice({ ok: false, message: "Questo accesso non è disponibile in questo momento: entra con e-mail e password." });
    }
    setBusy(false);
  }

  /** Forgotten password: a 6-digit code (and a link) by e-mail, then straight to "choose a new password". */
  async function submitForgot(e: React.FormEvent) {
    e.preventDefault();
    if (busy || left > 0 || !email) return;
    setBusy(true);
    setNotice(null);
    try {
      const r: MagicLinkOutcome = await sendCode({ data: { email, next: PASSWORD_PAGE, remember } });
      setNotice({ ok: r.sent, message: r.message, kind: r.rateLimited ? "rate_limit" : undefined });
      startCooldown(r.retryAfter);
      if (r.sent) {
        setCode("");
        setCodeNotice(null);
        lastTried.current = "";
        setCodeStep(true);
      }
    } catch {
      setNotice({ ok: false, message: "Controlla l'indirizzo e riprova." });
    } finally {
      setBusy(false);
    }
  }

  const tryCode = useCallback(
    async (value: string) => {
      if (busy || value.length !== OTP_LENGTH || !email) return;
      lastTried.current = value;
      setBusy(true);
      setCodeNotice(null);
      try {
        const r = await verifyCode({ data: { email, token: value, next: PASSWORD_PAGE, remember } });
        if (r.ok) {
          setCodeNotice({ ok: true, message: "Codice giusto: ora scegli la nuova password." });
          void navigate({ to: r.next as never, replace: true });
          return;
        }
        setCodeNotice({ ok: false, message: r.message, kind: r.kind });
        if (r.kind === "rate_limit") startCooldown(r.retryAfter ?? null);
        setCode("");
        codeRef.current?.focus();
      } catch {
        setCodeNotice({ ok: false, message: "Il codice è di 6 cifre: controllalo e riprova." });
      } finally {
        setBusy(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [busy, email, remember],
  );

  function changeCode(raw: string) {
    const v = normalizeOtpInput(raw);
    setCode(v);
    if (v.length === OTP_LENGTH && v !== lastTried.current) void tryCode(v);
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
  const linkBtn = "scd-focus min-h-11 text-[15px] font-semibold text-[var(--scd-blue)] underline underline-offset-2";

  const emailField = (
    <>
      <label htmlFor={`${id}-e`} className="text-[14px] font-bold text-[var(--scd-sub)]">{forgot ? "E-mail" : "E-mail o telefono"}</label>
      <div className={field}>
        <Mail className="size-5 shrink-0 text-[var(--scd-sub)]" aria-hidden="true" />
        <input
          id={`${id}-e`}
          name="email"
          type={forgot ? "email" : "text"}
          required
          autoComplete={forgot ? "email" : "username"}
          inputMode={forgot ? "email" : "text"}
          autoCapitalize="none"
          spellCheck={false}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (codeStep) setCodeStep(false);
          }}
          className={input}
          placeholder={forgot ? "nome@esempio.it" : "e-mail oppure 333 1234567"}
          data-testid="login-email"
        />
      </div>
    </>
  );

  const rememberBox = (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 text-[15px] text-[var(--scd-ink)]" data-testid="login-remember">
      <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="size-5 shrink-0 accent-[var(--scd-blue)]" />
      <span>
        <b>Ricordami</b> su questo dispositivo
        <span className="block text-[13px] text-[var(--scd-sub)]">Toglilo se il telefono o il computer non è solo tuo.</span>
      </span>
    </label>
  );

  return (
    <main className="bg-[var(--scd-page)] pb-28" data-screen="accedi">
      <section className="relative isolate overflow-hidden bg-[var(--scd-navy)] text-white">
        <div aria-hidden="true" className="scd-kit-stripes absolute inset-0 -z-10" />
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4 sm:px-6 sm:py-6 lg:py-10">
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
                {session.badge ?? "Area aperta"}
              </p>
              {session.roles.length === 0 && (
                <p className="mt-3 rounded-[12px] bg-[#eaf2fc] px-3 py-2 text-[14px] leading-snug text-[var(--scd-navy)]">
                  Sei nell'area aperta: calendario, partite, notizie ed eventi. La tua area (famiglia, squadra o incarico) si apre appena la società verifica i tuoi dati.
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
          ) : !forgot ? (
            <div className="grid gap-3" data-mode="password">
              <h2 id={`${id}-h`} className="text-[20px] font-bold leading-tight text-[var(--scd-ink)]">Entra</h2>

              {providers.length > 0 && (
                <div className="grid gap-2" data-testid="login-social">
                  {SOCIAL_PROVIDERS.filter((p) => providers.includes(p.id)).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => void goSocial(p.id)}
                      disabled={busy}
                      className="scd-focus inline-flex h-[52px] w-full items-center justify-center gap-3 rounded-[12px] border-2 border-[var(--scd-line)] bg-white text-[16px] font-semibold text-[var(--scd-ink)] disabled:opacity-60"
                      data-testid={`login-${p.id}`}
                    >
                      <ProviderMark id={p.id} />
                      {p.label}
                    </button>
                  ))}
                  <p className="my-1 flex items-center gap-3 text-[13px] font-semibold uppercase tracking-wider text-[var(--scd-sub)]" aria-hidden="true">
                    <span className="h-px flex-1 bg-[var(--scd-line)]" />
                    oppure
                    <span className="h-px flex-1 bg-[var(--scd-line)]" />
                  </p>
                </div>
              )}

              <form onSubmit={submitPassword} className="grid gap-3" data-testid="login-password-form">
                {emailField}
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
                {rememberBox}
                <button type="submit" disabled={busy || !email || !password} className="scd-action h-[52px] w-full text-[17px] font-bold disabled:opacity-60" data-testid="login-submit">
                  {busy ? "Accesso…" : "Entra"}
                  <ArrowRight className="size-5" aria-hidden="true" />
                </button>
              </form>

              {notice && (
                <div role="alert" className={`grid gap-2 rounded-[12px] px-3 py-2 text-[14.5px] leading-snug ${notice.ok ? "bg-[#e3f3e9] text-[#14532d]" : "bg-[#fff3c4] text-[#7a5200]"}`} data-testid="login-password-outcome">
                  <p>{notice.message}</p>
                  {notice.kind === "invalid_credentials" && (
                    <button type="button" onClick={() => openForgot(true)} className={`${linkBtn} justify-self-start`} data-testid="login-use-email">
                      Non ricordi la password? Te ne facciamo scegliere una nuova
                    </button>
                  )}
                  {notice.kind === "not_confirmed" && (
                    <button type="button" onClick={() => void resendConfirmation()} disabled={busy} className={`${linkBtn} justify-self-start`} data-testid="login-resend">
                      Rimandami la e-mail di conferma
                    </button>
                  )}
                </div>
              )}

              <button type="button" onClick={() => openForgot(true)} className={`${linkBtn} justify-self-start`} data-testid="login-forgot">
                Password dimenticata?
              </button>

              <Link to="/registrati" className="scd-focus inline-flex h-12 items-center justify-center rounded-[12px] border-2 border-[#b9d5ef] bg-white text-[16px] font-bold text-[var(--scd-blue)]" data-testid="login-register">
                Prima volta? Registrati
              </Link>
            </div>
          ) : (
            <div className="grid gap-3" data-mode="forgot" data-step={codeStep ? "code" : "email"}>
              <button type="button" onClick={() => openForgot(false)} className="scd-focus inline-flex min-h-11 items-center gap-1 justify-self-start text-[15px] font-semibold text-[var(--scd-blue)]" data-testid="login-back">
                <ArrowLeft className="size-4" aria-hidden="true" />
                Torna a Entra
              </button>
              <h2 id={`${id}-h`} className="text-[20px] font-bold leading-tight text-[var(--scd-ink)]">Scegli una nuova password</h2>
              <p className="-mt-1 text-[14.5px] leading-snug text-[var(--scd-sub)]">
                Scrivi la tua e-mail: ti mandiamo un codice di 6 cifre. Lo scrivi qui e scegli la nuova password. Vale anche se non avevi mai creato una password.
              </p>
              <form onSubmit={submitForgot} className="grid gap-3" data-testid="login-link-form">
                {emailField}
                <button
                  type="submit"
                  disabled={busy || !email || left > 0}
                  className={`h-[52px] w-full text-[17px] font-bold disabled:opacity-60 ${codeStep ? "scd-focus inline-flex items-center justify-center gap-2 rounded-[12px] border-2 border-[#b9d5ef] bg-white text-[var(--scd-blue)]" : "scd-action"}`}
                  data-testid="login-send"
                >
                  {busy && !codeStep ? "Invio…" : sendButtonLabel(left, false, codeStep ? "Mandami un nuovo codice" : "Mandami il codice")}
                </button>
                {left > 0 && (
                  <p className="-mt-1 text-center text-[13.5px] text-[var(--scd-sub)]" data-testid="login-cooldown">
                    Puoi chiedere un altro codice tra <b className="tabular-nums">{left}</b> secondi.
                  </p>
                )}
              </form>
              {notice && (
                <p role="status" className={`rounded-[12px] px-3 py-2 text-[14.5px] leading-snug ${notice.ok ? "bg-[#e3f3e9] text-[#14532d]" : "bg-[#fff3c4] text-[#7a5200]"}`} data-testid="login-outcome">
                  {notice.message}
                </p>
              )}
              {codeStep && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void tryCode(code);
                  }}
                  className="grid gap-2 rounded-[14px] border-2 border-[var(--scd-blue)] bg-[#f3f8fe] p-4"
                  data-testid="login-code-form"
                >
                  <label htmlFor={`${id}-c`} className="flex items-center gap-2 text-[16.5px] font-bold leading-snug text-[var(--scd-navy)]">
                    <Hash className="size-5 shrink-0" aria-hidden="true" />
                    Scrivi il codice di 6 cifre
                  </label>
                  <input
                    id={`${id}-c`}
                    ref={codeRef}
                    name="code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]*"
                    enterKeyHint="go"
                    value={code}
                    onChange={(e) => changeCode(e.target.value)}
                    onPaste={(e) => {
                      const v = normalizeOtpInput(e.clipboardData.getData("text"));
                      if (!v) return;
                      e.preventDefault();
                      changeCode(v);
                    }}
                    className="h-14 w-full rounded-[12px] border-2 border-[var(--scd-line)] bg-white text-center font-mono text-[28px] font-bold tracking-[0.45em] text-[var(--scd-ink)] outline-none focus:border-[var(--scd-blue)]"
                    placeholder="••••••"
                    data-testid="login-code"
                  />
                  <button type="submit" disabled={busy || code.length !== OTP_LENGTH} className="scd-action h-[52px] w-full text-[17px] font-bold disabled:opacity-60" data-testid="login-code-submit">
                    {busy ? "Verifico…" : "Continua"}
                    <ArrowRight className="size-5" aria-hidden="true" />
                  </button>
                  {codeNotice && (
                    <p role="alert" className={`rounded-[12px] px-3 py-2 text-[14.5px] leading-snug ${codeNotice.ok ? "bg-[#e3f3e9] text-[#14532d]" : "bg-[#fff3c4] text-[#7a5200]"}`} data-testid="login-code-outcome">
                      {codeNotice.message}
                    </p>
                  )}
                </form>
              )}
            </div>
          )}
        </section>

        <aside className="grid content-start gap-3 text-[14.5px] leading-snug text-[var(--scd-sub)]">
          <div className="rounded-[14px] bg-white p-4 shadow-[0_6px_18px_-12px_rgb(2_20_51/0.4)]">
            <b className="block text-[15.5px] text-[var(--scd-ink)]">Come si entra</b>
            <ol className="mt-1 list-decimal space-y-1 pl-5">
              <li>Ti registri una volta con e-mail, telefono e password.</li>
              <li>Apri il link della e-mail di conferma, solo la prima volta.</li>
              <li>Poi entri sempre con e-mail o telefono e password. Con "Ricordami" resti dentro su quel dispositivo.</li>
            </ol>
          </div>
          <p className="rounded-[14px] bg-white p-4 shadow-[0_6px_18px_-12px_rgb(2_20_51/0.4)]">
            <b className="block text-[15.5px] text-[var(--scd-ink)]">Minori</b>
            Sotto i 14 anni si entra con l'account del genitore o tutore; dai 14 anni si può avere il proprio accesso con il consenso della famiglia.
          </p>
          <a href={supportMailto("Pagina Accedi")} className="scd-focus flex items-center gap-3 rounded-[14px] border-2 border-[#b9d5ef] bg-white p-4 text-[var(--scd-ink)]" data-testid="login-support">
            <LifeBuoy className="size-6 shrink-0 text-[var(--scd-blue)]" aria-hidden="true" />
            <span>
              <b className="block text-[15.5px]">Hai bisogno di aiuto?</b>
              Scrivi all'assistenza: ti rispondiamo e, se serve, ti richiamiamo.
            </span>
          </a>
          {next && <p className="px-1 text-[13px]">Dopo l'accesso torni a <code className="rounded bg-[#eaf2fc] px-1">{next}</code>.</p>}
          <Link to="/guida" className="px-1 text-[14px] font-semibold text-[var(--scd-blue)] underline" data-testid="login-guide">
            Come funziona l'app
          </Link>
        </aside>
      </div>
    </main>
  );
}
