import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Eye, EyeOff, KeyRound } from "lucide-react";
import { useEffect, useId, useState } from "react";

import {
  PASSWORD_MAX,
  PASSWORD_MIN,
  passwordProblem,
} from "@/lib/auth-remember";
import {
  getSession,
  setMyPassword,
  type SessionView,
} from "@/lib/auth.functions";
import { safeNext } from "@/lib/session";

export const Route = createFileRoute("/accedi/password")({
  validateSearch: (
    s: Record<string, unknown>,
  ): { next?: string | undefined; benvenuto?: "1" | undefined } => ({
    ...(typeof s["next"] === "string" ? { next: safeNext(s["next"]) } : {}),
    ...(s["benvenuto"] === "1" || s["benvenuto"] === 1
      ? { benvenuto: "1" as const }
      : {}),
  }),
  head: () => ({
    meta: [
      { title: "La tua password — S.C.D. ColicoDerviese" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PasswordPage,
});

/** Create or change the password of the signed-in person (first access by link, or later from "Sei dentro"). */
function PasswordPage() {
  const { next, benvenuto } = Route.useSearch();
  const navigate = useNavigate();
  const save = useServerFn(setMyPassword);
  const [session, setSession] = useState<SessionView | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(
    null,
  );
  const id = useId();

  useEffect(() => {
    let alive = true;
    getSession()
      .then((s) => alive && setSession(s))
      .catch(() => alive && setSession(null));
    return () => {
      alive = false;
    };
  }, []);

  const target = next ?? session?.landing ?? "/aree";
  const hint = password
    ? passwordProblem(password, confirm || undefined)
    : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const problem = passwordProblem(password, confirm);
    if (problem) {
      setNotice({ ok: false, message: problem });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      const r = await save({ data: { password, confirm } });
      setNotice(r);
      if (r.ok) {
        setPassword("");
        setConfirm("");
        window.setTimeout(
          () => void navigate({ to: target as never, replace: true }),
          1200,
        );
      }
    } catch {
      setNotice({
        ok: false,
        message: "Salvataggio non riuscito, riprova tra un minuto.",
      });
    } finally {
      setBusy(false);
    }
  }

  const field =
    "flex items-center gap-2 rounded-[12px] border-2 border-[var(--scd-line)] bg-white px-3 focus-within:border-[var(--scd-blue)]";
  const input =
    "h-12 w-full min-w-0 bg-transparent text-[17px] text-[var(--scd-ink)] outline-none";

  return (
    <main
      className="bg-[var(--scd-page)] px-4 pb-28 pt-6 sm:px-6"
      data-screen="accedi-password"
    >
      <section
        className="scd-card mx-auto max-w-[480px] p-5 sm:p-6"
        aria-labelledby={`${id}-h`}
      >
        {session === null ? (
          <p className="text-[15px] text-[var(--scd-sub)]" role="status">
            Controllo l'accesso…
          </p>
        ) : !session.user ? (
          <>
            <h1
              id={`${id}-h`}
              className="text-[22px] font-bold text-[var(--scd-ink)]"
            >
              Prima entra
            </h1>
            <p className="mt-2 text-[15px] leading-snug text-[var(--scd-sub)]">
              Per creare o cambiare la password devi essere dentro: entra con il
              codice che ricevi via e-mail e torni qui.
            </p>
            <Link
              to="/accedi"
              search={{ next: "/accedi/password", modo: "link" }}
              className="scd-action mt-5 h-[48px] w-full text-[16px] font-bold"
            >
              Ricevi un link
            </Link>
          </>
        ) : (
          <form
            onSubmit={submit}
            className="grid gap-3"
            aria-labelledby={`${id}-h`}
          >
            <span
              className="inline-flex size-11 items-center justify-center rounded-full bg-[#eaf2fc] text-[var(--scd-blue)]"
              aria-hidden="true"
            >
              <KeyRound className="size-5" />
            </span>
            <h1
              id={`${id}-h`}
              className="text-[22px] font-bold leading-tight text-[var(--scd-ink)]"
            >
              {benvenuto
                ? "Benvenuto! Scegli la tua password"
                : session.hasPassword
                  ? "Cambia password"
                  : "Crea la tua password"}
            </h1>
            <p className="text-[15px] leading-snug text-[var(--scd-sub)]">
              {benvenuto
                ? "Così la prossima volta entri subito con e-mail e password, senza aspettare il link."
                : "La userai per entrare con "}
              {!benvenuto && (
                <b className="break-all text-[var(--scd-ink)]">
                  {session.user.email}
                </b>
              )}
              {!benvenuto && "."}
            </p>

            <input
              type="email"
              name="email"
              autoComplete="username"
              value={session.user.email}
              readOnly
              hidden
            />

            <label
              htmlFor={`${id}-p`}
              className="text-[14px] font-bold text-[var(--scd-sub)]"
            >
              Nuova password
            </label>
            <div className={field}>
              <input
                id={`${id}-p`}
                type={show ? "text" : "password"}
                autoComplete="new-password"
                required
                minLength={PASSWORD_MIN}
                maxLength={PASSWORD_MAX}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={input}
                aria-describedby={`${id}-rule`}
                data-testid="new-password"
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                className="scd-focus -mr-1 inline-flex size-10 shrink-0 items-center justify-center rounded-[8px] text-[var(--scd-sub)]"
                aria-label={show ? "Nascondi password" : "Mostra password"}
                aria-pressed={show}
              >
                {show ? (
                  <EyeOff className="size-5" aria-hidden="true" />
                ) : (
                  <Eye className="size-5" aria-hidden="true" />
                )}
              </button>
            </div>
            <p
              id={`${id}-rule`}
              className="-mt-1 text-[13px] text-[var(--scd-sub)]"
            >
              Almeno {PASSWORD_MIN} caratteri, con almeno una lettera e un
              numero.
            </p>

            <label
              htmlFor={`${id}-c`}
              className="text-[14px] font-bold text-[var(--scd-sub)]"
            >
              Ripeti la password
            </label>
            <div className={field}>
              <input
                id={`${id}-c`}
                type={show ? "text" : "password"}
                autoComplete="new-password"
                required
                maxLength={PASSWORD_MAX}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className={input}
                data-testid="confirm-password"
              />
            </div>

            {hint && !notice && (
              <p className="text-[13.5px] text-[#7a5200]">{hint}</p>
            )}

            <button
              type="submit"
              disabled={busy || !password || !confirm}
              className="scd-action h-[52px] w-full text-[17px] font-bold disabled:opacity-60"
              data-testid="password-save"
            >
              {busy ? "Salvo…" : "Salva password"}
              <ArrowRight className="size-5" aria-hidden="true" />
            </button>

            {notice && (
              <p
                role="status"
                className={`rounded-[12px] px-3 py-2 text-[14.5px] leading-snug ${notice.ok ? "bg-[#e3f3e9] text-[#14532d]" : "bg-[#fff3c4] text-[#7a5200]"}`}
                data-testid="password-outcome"
              >
                {notice.message}
              </p>
            )}

            <Link
              to={target as never}
              className="scd-focus inline-flex min-h-11 items-center justify-center text-[14.5px] font-semibold text-[var(--scd-blue)] underline"
              data-testid="password-later"
            >
              {benvenuto ? "Più tardi" : "Annulla"}
            </Link>
          </form>
        )}
      </section>
    </main>
  );
}
