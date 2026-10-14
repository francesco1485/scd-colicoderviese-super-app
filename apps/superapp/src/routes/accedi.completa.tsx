import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight } from "lucide-react";
import { useEffect, useId, useState } from "react";

import { DeclarationFields } from "@/components/scd/DeclarationFields";
import { safeNext } from "@/lib/session";
import { EMPTY_DECLARATION, type Declaration } from "@/lib/signup";
import {
  completeProfile,
  getProfileGap,
  type ProfileGap,
} from "@/lib/signup.functions";

/**
 * One-time completion for Google / Apple / Facebook accounts (UD-114): phone (mandatory), birth date, consent and
 * "Chi sei nel club?". Same rules as the registration; then the person continues where they were going.
 */
export const Route = createFileRoute("/accedi/completa")({
  validateSearch: (
    s: Record<string, unknown>,
  ): { next?: string | undefined } =>
    typeof s["next"] === "string" ? { next: safeNext(s["next"]) } : {},
  head: () => ({
    meta: [
      { title: "Completa il profilo — S.C.D. ColicoDerviese" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Completa,
});

function todayRome(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function Completa() {
  const { next } = Route.useSearch();
  const navigate = useNavigate();
  const save = useServerFn(completeProfile);
  const [gap, setGap] = useState<ProfileGap | null>(null);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    birthDate: "",
    phone: "",
    consent: false,
  });
  const [declaration, setDeclaration] =
    useState<Declaration>(EMPTY_DECLARATION);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const id = useId();
  const field =
    "h-12 w-full rounded-[12px] border-2 border-[var(--scd-line)] bg-white px-3 text-[17px] text-[var(--scd-ink)] outline-none focus:border-[var(--scd-blue)]";

  useEffect(() => {
    let alive = true;
    getProfileGap()
      .then((g) => {
        if (!alive) return;
        setGap(g);
        setForm((f) => ({
          ...f,
          firstName: g.firstName,
          lastName: g.lastName,
          birthDate: g.birthDate,
          phone: g.phone,
        }));
      })
      .catch(
        () =>
          alive &&
          setGap({
            signedIn: false,
            email: null,
            firstName: "",
            lastName: "",
            birthDate: "",
            phone: "",
            incomplete: false,
          }),
      );
    return () => {
      alive = false;
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const r = await save({ data: { ...form, declaration } });
      setMessage({ ok: r.ok, text: r.message });
      if (r.ok)
        void navigate({ to: (next ?? "/aree") as never, replace: true });
    } catch {
      setMessage({ ok: false, text: "Controlla i dati e riprova." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main
      className="bg-[var(--scd-page)] px-4 py-8 sm:px-6"
      data-screen="accedi-completa"
    >
      <section
        className="scd-card mx-auto grid max-w-[560px] gap-3 p-5 lg:p-7"
        aria-labelledby={`${id}-h`}
      >
        <h1
          id={`${id}-h`}
          className="text-[24px] font-bold text-[var(--scd-ink)]"
        >
          Ancora un passo
        </h1>
        {gap === null ? (
          <p className="text-[15px] text-[var(--scd-sub)]" role="status">
            Un attimo…
          </p>
        ) : !gap.signedIn ? (
          <>
            <p className="text-[15.5px] text-[var(--scd-sub)]">
              Per completare il profilo devi prima entrare.
            </p>
            <Link
              to="/accedi"
              search={{ next: "/accedi/completa" }}
              className="scd-action h-[52px] w-full text-[17px] font-bold"
            >
              Entra
            </Link>
          </>
        ) : (
          <form
            onSubmit={submit}
            className="grid gap-3"
            data-testid="complete-form"
          >
            <p className="-mt-1 text-[15px] leading-snug text-[var(--scd-sub)]">
              Hai usato <b className="break-all">{gap.email}</b>. Ci servono il
              telefono e due dati per riconoscerti: li chiediamo solo questa
              volta.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-[14px] font-bold text-[var(--scd-sub)]">
                Nome
                <input
                  required
                  autoComplete="given-name"
                  value={form.firstName}
                  onChange={(e) =>
                    setForm({ ...form, firstName: e.target.value })
                  }
                  className={field}
                />
              </label>
              <label className="grid gap-1 text-[14px] font-bold text-[var(--scd-sub)]">
                Cognome
                <input
                  required
                  autoComplete="family-name"
                  value={form.lastName}
                  onChange={(e) =>
                    setForm({ ...form, lastName: e.target.value })
                  }
                  className={field}
                />
              </label>
            </div>
            <label className="grid gap-1 text-[14px] font-bold text-[var(--scd-sub)]">
              Data di nascita
              <input
                required
                type="date"
                autoComplete="bday"
                max={todayRome()}
                value={form.birthDate}
                onChange={(e) =>
                  setForm({ ...form, birthDate: e.target.value })
                }
                className={field}
              />
            </label>
            <label className="grid gap-1 text-[14px] font-bold text-[var(--scd-sub)]">
              Telefono cellulare
              <input
                required
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className={field}
                placeholder="333 1234567"
              />
            </label>
            <DeclarationFields
              idPrefix={`${id}-d`}
              value={declaration}
              onChange={setDeclaration}
            />
            <label className="flex items-start gap-3 rounded-[12px] bg-[#f4f8fd] p-3 text-[14.5px] leading-snug text-[var(--scd-ink)]">
              <input
                type="checkbox"
                required
                checked={form.consent}
                onChange={(e) =>
                  setForm({ ...form, consent: e.target.checked })
                }
                className="mt-0.5 size-5 flex-none accent-[var(--scd-blue)]"
              />
              <span>
                Ho letto l'
                <a
                  href="/privacy"
                  target="_blank"
                  rel="noopener"
                  className="font-semibold text-[var(--scd-blue)] underline"
                >
                  informativa privacy
                </a>{" "}
                e acconsento al trattamento dei dati per il mio accesso.
              </span>
            </label>
            <button
              type="submit"
              disabled={busy}
              className="scd-action h-[52px] w-full text-[17px] font-bold disabled:opacity-60"
              data-testid="complete-submit"
            >
              {busy ? "Salvo…" : "Continua"}
              <ArrowRight className="size-5" aria-hidden="true" />
            </button>
            {message && (
              <p
                role="status"
                className={`rounded-[12px] px-3 py-2 text-[14.5px] leading-snug ${message.ok ? "bg-[#e3f3e9] text-[#14532d]" : "bg-[#fff3c4] text-[#7a5200]"}`}
              >
                {message.text}
              </p>
            )}
          </form>
        )}
      </section>
    </main>
  );
}
