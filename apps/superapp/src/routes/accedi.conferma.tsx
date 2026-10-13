import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Hash, MailCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { LINK_USED_MESSAGE } from "@/lib/auth-otp";
import { confirmMagicLink, confirmTokenHash } from "@/lib/auth.functions";
import { safeNext } from "@/lib/session";

export const Route = createFileRoute("/accedi/conferma")({
  validateSearch: (s: Record<string, unknown>) => ({
    code: typeof s["code"] === "string" ? s["code"] : undefined,
    token_hash: typeof s["token_hash"] === "string" ? s["token_hash"] : undefined,
    type: s["type"] === "magiclink" ? ("magiclink" as const) : s["type"] === "email" ? ("email" as const) : undefined,
    next: typeof s["next"] === "string" ? safeNext(s["next"]) : undefined,
    r: s["r"] === "0" || s["r"] === 0 ? ("0" as const) : undefined,
    error_description: typeof s["error_description"] === "string" ? s["error_description"] : undefined,
    error_code: typeof s["error_code"] === "string" ? s["error_code"] : undefined,
  }),
  head: () => ({ meta: [{ title: "Conferma accesso — S.C.D. ColicoDerviese" }, { name: "robots", content: "noindex" }] }),
  component: Conferma,
});

type Phase = "ready" | "working" | "ok" | "error";

/**
 * The e-mail link lands here. Nothing is verified on page load: mail scanners (Google, antivirus) open links by
 * themselves and would consume the one-time token (auth logs 13/10/2026, "One-time token not found"). The person taps
 * "Entra" and only then the server exchanges `?code=` (PKCE link) or verifies `?token_hash=` (scanner-safe template).
 * An already used or expired link gets a friendly message and a way to ask for a new code.
 */
function Conferma() {
  const { code, token_hash, type, next, r, error_description, error_code } = Route.useSearch();
  const navigate = useNavigate();
  const confirmCode = useServerFn(confirmMagicLink);
  const confirmHash = useServerFn(confirmTokenHash);
  const [state, setState] = useState<{ phase: Phase; message: string }>({ phase: "ready", message: "" });

  // Supabase reports a failed link in the query (PKCE) or in the URL fragment (#error_code=otp_expired).
  useEffect(() => {
    const hash = typeof window !== "undefined" ? new URLSearchParams(window.location.hash.replace(/^#/, "")) : new URLSearchParams();
    if (error_description || error_code || hash.get("error_code") || hash.get("error")) {
      setState({ phase: "error", message: LINK_USED_MESSAGE });
    } else if (!code && !token_hash) {
      setState({ phase: "error", message: "Questo link non contiene un codice di accesso valido. Chiedi un nuovo codice: arriva in un minuto." });
    }
  }, [code, token_hash, error_description, error_code]);

  async function enter() {
    if (state.phase === "working") return;
    setState({ phase: "working", message: "Sto confermando il tuo accesso…" });
    const remember = r !== "0";
    try {
      const out = token_hash
        ? await confirmHash({ data: { tokenHash: token_hash, type: type ?? "email", next, remember } })
        : await confirmCode({ data: { code: code ?? "", next, remember } });
      if (out.ok) {
        setState({ phase: "ok", message: out.message });
        void navigate({ to: out.next as never, replace: true });
        return;
      }
      setState({ phase: "error", message: out.kind === "rate_limit" ? out.message : LINK_USED_MESSAGE });
    } catch {
      setState({ phase: "error", message: LINK_USED_MESSAGE });
    }
  }

  const title = state.phase === "error" ? "Link non più valido" : state.phase === "ok" ? "Sei dentro" : "Conferma il tuo accesso";

  return (
    <main className="bg-[var(--scd-page)] px-4 py-14 sm:px-6">
      <section className="scd-card mx-auto max-w-[480px] p-6 text-center" aria-live="polite" data-testid="confirm-state" data-phase={state.phase}>
        <span className="mx-auto inline-flex size-12 items-center justify-center rounded-full bg-[#eaf2fc] text-[var(--scd-blue)]" aria-hidden="true">
          <MailCheck className="size-6" />
        </span>
        <h1 className="mt-3 text-[24px] font-bold text-[var(--scd-ink)]">{title}</h1>
        {state.phase === "ready" && (
          <>
            <p className="mt-2 text-[15.5px] leading-snug text-[var(--scd-sub)]">Tocca il pulsante per entrare nella Super App del club con questo dispositivo.</p>
            <button type="button" onClick={() => void enter()} className="scd-action mt-5 h-[52px] w-full text-[17px] font-bold" data-testid="confirm-enter">
              Entra
              <ArrowRight className="size-5" aria-hidden="true" />
            </button>
          </>
        )}
        {state.phase !== "ready" && <p className="mt-2 text-[15.5px] leading-snug text-[var(--scd-sub)]">{state.message}</p>}
        {state.phase === "error" && (
          <div className="mt-5 grid gap-2">
            <Link to="/accedi" search={{ next, modo: "link" }} className="scd-action h-[52px] w-full text-[17px] font-bold" data-testid="confirm-new-code">
              <Hash className="size-5" aria-hidden="true" />
              Chiedi un nuovo codice
            </Link>
            <p className="text-[13.5px] leading-snug text-[var(--scd-sub)]">Nel nuovo messaggio trovi un codice di 6 cifre: puoi scriverlo nella pagina Accedi anche da un altro dispositivo.</p>
          </div>
        )}
      </section>
    </main>
  );
}
