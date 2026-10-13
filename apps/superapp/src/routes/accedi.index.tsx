import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, ChevronDown, Eye, EyeOff, Hash, KeyRound, Lock, LogOut, Mail, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { ClubCrestOfficial } from "@/components/SiteChrome";
import { PASSWORD_MAX, PASSWORD_PAGE } from "@/lib/auth-remember";
import { OTP_LENGTH, cooldownUntil, normalizeOtpInput, secondsLeft, sendButtonLabel, type AuthErrorKind } from "@/lib/auth-otp";
import { getSession, requestMagicLink, signInWithPassword, signOut, verifyEmailCode, type MagicLinkOutcome, type SessionView } from "@/lib/auth.functions";
import { safeNext } from "@/lib/session";

export const Route = createFileRoute("/accedi/")({
  validateSearch: (s: Record<string, unknown>): { next?: string | undefined; modo?: "link" | "password" | "codice" | undefined } => ({
    ...(typeof s["next"] === "string" ? { next: safeNext(s["next"]) } : {}),
    ...(s["modo"] === "link" || s["modo"] === "password" || s["modo"] === "codice" ? { modo: s["modo"] } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Accedi — S.C.D. ColicoDerviese" },
      { name: "description", content: "Entra nella Super App con un link o un codice via e-mail, oppure con la tua password." },
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

function Accedi() {
  const { next, modo } = Route.useSearch();
  const navigate = useNavigate();
  const sendLink = useServerFn(requestMagicLink);
  const verifyCode = useServerFn(verifyEmailCode);
  const login = useServerFn(signInWithPassword);
  const logout = useServerFn(signOut);
  const [session, setSession] = useState<SessionView | null>(null);
  const [passwordOpen, setPasswordOpen] = useState(modo === "password");
  const [codeStep, setCodeStep] = useState(modo === "codice");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [linkNotice, setLinkNotice] = useState<Notice | null>(null);
  const [codeNotice, setCodeNotice] = useState<Notice | null>(null);
  const [passwordNotice, setPasswordNotice] = useState<Notice | null>(null);
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

  function changeEmail(v: string) {
    setEmail(v);
    if (codeStep) {
      setCodeStep(false);
      setCode("");
      setCodeNotice(null);
    }
  }

  function togglePassword(open?: boolean) {
    setPasswordOpen((v) => open ?? !v);
    setPasswordNotice(null);
  }

  function resetToEmail() {
    setCodeStep(false);
    setCode("");
    setCodeNotice(null);
    setLinkNotice(null);
    window.setTimeout(() => document.getElementById(`${id}-e`)?.focus(), 0);
  }

  function preferEmail() {
    togglePassword(false);
    setPassword("");
    window.setTimeout(() => document.getElementById(`${id}-e`)?.focus(), 0);
  }

  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setPasswordNotice(null);
    try {
      const r = await login({ data: { email, password, remember, next } });
      if (r.ok) {
        setPassword("");
        void navigate({ to: r.next as never, replace: true });
        return;
      }
      setPasswordNotice({ ok: false, message: r.message, kind: r.kind });
    } catch {
      setPasswordNotice({ ok: false, message: "Controlla e-mail e password e riprova." });
    } finally {
      setBusy(false);
    }
  }

  async function submitLink(e: React.FormEvent) {
    e.preventDefault();
    if (busy || left > 0 || !email) return;
    setBusy(true);
    setSending(true);
    setLinkNotice(null);
    try {
      const r: MagicLinkOutcome = await sendLink({ data: { email, next, remember } });
      setLinkNotice({ ok: r.sent, message: r.message, kind: r.rateLimited ? "rate_limit" : undefined });
      // Every request locks the button for at least 60 s (longer when the provider asks), even a failed one.
      startCooldown(r.retryAfter);
      if (r.sent) {
        setCode("");
        setCodeNotice(null);
        lastTried.current = "";
        setCodeStep(true);
      }
    } catch {
      // Thrown = input refused before any e-mail left (validation): no cooldown.
      setLinkNotice({ ok: false, message: "Controlla l'indirizzo e riprova." });
    } finally {
      setBusy(false);
      setSending(false);
    }
  }

  const tryCode = useCallback(
    async (value: string) => {
      if (busy || value.length !== OTP_LENGTH || !email) return;
      lastTried.current = value;
      setBusy(true);
      setCodeNotice(null);
      try {
        const r = await verifyCode({ data: { email, token: value, next, remember } });
        if (r.ok) {
          setCodeNotice({ ok: true, message: r.message });
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
    [busy, email, next, remember],
  );

  function changeCode(raw: string) {
    const v = normalizeOtpInput(raw);
    setCode(v);
    // Autofill from the SMS/e-mail keyboard suggestion or a full paste: try once, without waiting for a tap.
    if (v.length === OTP_LENGTH && v !== lastTried.current) void tryCode(v);
  }

  function pasteCode(e: React.ClipboardEvent<HTMLInputElement>) {
    const v = normalizeOtpInput(e.clipboardData.getData("text"));
    if (!v) return;
    e.preventDefault();
    changeCode(v);
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    await tryCode(code);
  }

  async function leave() {
    setBusy(true);
    try {
      await logout();
      await clearOfflineCopies();
      setSession((s) => (s ? { ...s, ...SIGNED_OUT } : s));
      setLinkNotice(null);
      setPasswordNotice(null);
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
            <div className="grid gap-3" data-mode={passwordOpen ? "password" : "link"} data-step={codeStep ? "code" : "email"}>
              <h2 id={`${id}-h`} className="text-[20px] font-bold leading-tight text-[var(--scd-ink)]">Entra con la tua e-mail</h2>
              <p className="-mt-1 text-[14.5px] leading-snug text-[var(--scd-sub)]">Ti mandiamo un messaggio con un link e un codice di 6 cifre: usa quello che preferisci.</p>

              <form onSubmit={submitLink} className="grid gap-3" data-testid="login-link-form">
                <label htmlFor={`${id}-e`} className="text-[14px] font-bold text-[var(--scd-sub)]">E-mail registrata in società</label>
                <div className={field}>
                  <Mail className="size-5 shrink-0 text-[var(--scd-sub)]" aria-hidden="true" />
                  <input
                    id={`${id}-e`}
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    inputMode="email"
                    autoCapitalize="none"
                    spellCheck={false}
                    value={email}
                    onChange={(e) => changeEmail(e.target.value)}
                    className={input}
                    placeholder="nome@esempio.it"
                    data-testid="login-email"
                  />
                </div>

                <label className="flex min-h-11 cursor-pointer items-center gap-3 text-[15px] text-[var(--scd-ink)]" data-testid="login-remember">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="size-5 shrink-0 accent-[var(--scd-blue)]" />
                  <span>
                    <b>Ricordami</b> su questo dispositivo
                    <span className="block text-[13px] text-[var(--scd-sub)]">Toglilo se il telefono o il computer non è solo tuo.</span>
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={busy || !email || left > 0}
                  aria-describedby={left > 0 ? `${id}-cd` : undefined}
                  className={`h-[52px] w-full text-[17px] font-bold disabled:opacity-60 ${codeStep ? "scd-focus inline-flex items-center justify-center gap-2 rounded-[12px] border-2 border-[#b9d5ef] bg-white text-[var(--scd-blue)]" : "scd-action"}`}
                  data-testid="login-send"
                >
                  {busy && sending ? "Invio…" : sendButtonLabel(left, false, codeStep ? "Mandami un nuovo codice" : "Invia link e codice")}
                  {left === 0 && !busy && <ArrowRight className="size-5" aria-hidden="true" />}
                </button>
                {left > 0 && (
                  <p id={`${id}-cd`} className="-mt-1 text-center text-[13.5px] text-[var(--scd-sub)]" aria-live="off" data-testid="login-cooldown">
                    Per non bloccare gli invii puoi chiedere un altro messaggio tra <b className="tabular-nums">{left}</b> secondi.
                  </p>
                )}
              </form>

              {linkNotice && (
                <p role="status" className={`rounded-[12px] px-3 py-2 text-[14.5px] leading-snug ${linkNotice.ok ? "bg-[#e3f3e9] text-[#14532d]" : "bg-[#fff3c4] text-[#7a5200]"}`} data-testid="login-outcome">
                  {linkNotice.message}
                </p>
              )}

              {codeStep && (
                <form onSubmit={submitCode} className="grid gap-2 rounded-[14px] border-2 border-[var(--scd-blue)] bg-[#f3f8fe] p-4" data-testid="login-code-form" aria-labelledby={`${id}-ch`}>
                  <h3 id={`${id}-ch`} className="flex items-center gap-2 text-[16.5px] font-bold leading-snug text-[var(--scd-navy)]">
                    <Hash className="size-5 shrink-0" aria-hidden="true" />
                    Hai ricevuto un codice di 6 cifre? Scrivilo qui
                  </h3>
                  <label htmlFor={`${id}-c`} className="sr-only">Codice di 6 cifre ricevuto via e-mail</label>
                  <input
                    id={`${id}-c`}
                    ref={codeRef}
                    name="code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]*"
                    enterKeyHint="go"
                    aria-invalid={codeNotice !== null && !codeNotice.ok}
                    aria-describedby={codeNotice ? `${id}-cn` : `${id}-chint`}
                    value={code}
                    onChange={(e) => changeCode(e.target.value)}
                    onPaste={pasteCode}
                    className="h-14 w-full rounded-[12px] border-2 border-[var(--scd-line)] bg-white text-center font-mono text-[28px] font-bold tracking-[0.45em] text-[var(--scd-ink)] outline-none focus:border-[var(--scd-blue)]"
                    placeholder="••••••"
                    data-testid="login-code"
                  />
                  <p id={`${id}-chint`} className="text-[13px] leading-snug text-[var(--scd-sub)]">
                    Il codice vale anche se il link non funziona o lo apri da un altro dispositivo.
                  </p>
                  <button type="submit" disabled={busy || code.length !== OTP_LENGTH} className="scd-action h-[52px] w-full text-[17px] font-bold disabled:opacity-60" data-testid="login-code-submit">
                    {busy && !sending ? "Verifico…" : "Entra con il codice"}
                    <ArrowRight className="size-5" aria-hidden="true" />
                  </button>
                  {codeNotice && (
                    <p id={`${id}-cn`} role="alert" className={`rounded-[12px] px-3 py-2 text-[14.5px] leading-snug ${codeNotice.ok ? "bg-[#e3f3e9] text-[#14532d]" : "bg-[#fff3c4] text-[#7a5200]"}`} data-testid="login-code-outcome">
                      {codeNotice.message}
                    </p>
                  )}
                  <button type="button" onClick={resetToEmail} className="scd-focus min-h-11 text-center text-[14px] font-semibold text-[var(--scd-blue)] underline" data-testid="login-change-email">
                    Ho sbagliato e-mail
                  </button>
                </form>
              )}

              <div className="rounded-[14px] border border-[var(--scd-line)] bg-white">
                <button
                  type="button"
                  aria-expanded={passwordOpen}
                  aria-controls={`${id}-pw`}
                  onClick={() => togglePassword()}
                  className="scd-focus flex min-h-12 w-full items-center justify-between gap-2 rounded-[14px] px-4 text-left text-[15px] font-semibold text-[var(--scd-ink)]"
                  data-testid="login-password-toggle"
                >
                  <span className="inline-flex items-center gap-2">
                    <KeyRound className="size-4 text-[var(--scd-sub)]" aria-hidden="true" />
                    Ho già impostato una password
                  </span>
                  <ChevronDown className={`size-5 text-[var(--scd-sub)] transition-transform ${passwordOpen ? "rotate-180" : ""}`} aria-hidden="true" />
                </button>
                {passwordOpen && (
                  <form id={`${id}-pw`} onSubmit={submitPassword} className="grid gap-3 border-t border-[var(--scd-line)] p-4" data-testid="login-password-form">
                    {/* Password managers pair the password with the e-mail typed above. */}
                    <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />
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
                    <button type="submit" disabled={busy || !email || !password} className="scd-focus inline-flex h-[48px] w-full items-center justify-center gap-2 rounded-[12px] bg-[var(--scd-navy)] text-[16px] font-bold text-white disabled:opacity-60" data-testid="login-submit">
                      {busy && !sending ? "Accesso…" : "Entra con la password"}
                    </button>
                    {!email && <p className="text-[13px] text-[var(--scd-sub)]">Scrivi prima l'e-mail qui sopra.</p>}
                    {passwordNotice && (
                      <div role="alert" className="grid gap-2 rounded-[12px] bg-[#fff3c4] px-3 py-2 text-[14.5px] leading-snug text-[#7a5200]" data-testid="login-password-outcome">
                        <p>{passwordNotice.message}</p>
                        {passwordNotice.kind === "invalid_credentials" && (
                          <button type="button" onClick={preferEmail} className="scd-focus min-h-11 justify-self-start text-[14.5px] font-bold text-[var(--scd-blue)] underline" data-testid="login-use-email">
                            Usa il link o il codice via email
                          </button>
                        )}
                      </div>
                    )}
                    <button type="button" onClick={preferEmail} className="scd-focus min-h-11 justify-self-start text-left text-[13.5px] font-semibold text-[var(--scd-blue)] underline" data-testid="login-forgot">
                      Password dimenticata? Entra con il codice, poi scegline una nuova
                    </button>
                  </form>
                )}
              </div>

              <Link to="/registrati" className="scd-focus inline-flex h-11 items-center justify-center rounded-[10px] border border-[#b9d5ef] bg-white text-[15px] font-semibold text-[var(--scd-blue)]" data-testid="login-register">
                Non hai ancora l'accesso? Registrati
              </Link>
              <Link to="/guida" className="text-center text-[14px] font-semibold text-[var(--scd-blue)] underline" data-testid="login-guide">
                Come funziona l'app
              </Link>
            </div>
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
