import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";

import { confirmMagicLink } from "@/lib/auth.functions";
import { safeNext } from "@/lib/session";

export const Route = createFileRoute("/accedi/conferma")({
  validateSearch: (s: Record<string, unknown>) => ({
    code: typeof s["code"] === "string" ? s["code"] : undefined,
    next: typeof s["next"] === "string" ? safeNext(s["next"]) : undefined,
    r: s["r"] === "0" || s["r"] === 0 ? ("0" as const) : undefined,
    error_description: typeof s["error_description"] === "string" ? s["error_description"] : undefined,
  }),
  head: () => ({ meta: [{ title: "Conferma accesso — S.C.D. ColicoDerviese" }, { name: "robots", content: "noindex" }] }),
  component: Conferma,
});

/** The magic link lands here with `?code=`: the server exchanges it for the session cookies, then we move on. */
function Conferma() {
  const { code, next, r, error_description } = Route.useSearch();
  const navigate = useNavigate();
  const confirm = useServerFn(confirmMagicLink);
  const [state, setState] = useState<{ phase: "working" | "ok" | "error"; message: string }>({ phase: "working", message: "Sto confermando il tuo accesso…" });

  useEffect(() => {
    let alive = true;
    if (error_description) {
      setState({ phase: "error", message: "Link scaduto o già usato: richiedine uno nuovo." });
      return;
    }
    if (!code) {
      setState({ phase: "error", message: "Questo link non contiene un codice di accesso." });
      return;
    }
    confirm({ data: { code, next, remember: r !== "0" } })
      .then((r) => {
        if (!alive) return;
        if (r.ok) {
          setState({ phase: "ok", message: r.message });
          void navigate({ to: r.next as never, replace: true });
        } else setState({ phase: "error", message: r.message });
      })
      .catch(() => alive && setState({ phase: "error", message: "Conferma non riuscita, richiedi un nuovo link." }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, next, r, error_description]);

  return (
    <main className="bg-[var(--scd-page)] px-4 py-14 sm:px-6">
      <section className="scd-card mx-auto max-w-[480px] p-6 text-center" aria-live="polite" data-testid="confirm-state" data-phase={state.phase}>
        <h1 className="text-[24px] font-bold text-[var(--scd-ink)]">{state.phase === "error" ? "Accesso non confermato" : state.phase === "ok" ? "Sei dentro" : "Un attimo"}</h1>
        <p className="mt-2 text-[15.5px] leading-snug text-[var(--scd-sub)]">{state.message}</p>
        {state.phase === "error" && (
          <Link to="/accedi" search={{ next }} className="scd-action mt-5 h-[48px] w-full text-[16px] font-bold">
            Richiedi un nuovo link
          </Link>
        )}
      </section>
    </main>
  );
}
