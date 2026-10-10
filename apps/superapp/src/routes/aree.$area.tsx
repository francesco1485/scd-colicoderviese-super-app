import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Lock, LogOut } from "lucide-react";
import { useEffect, useState } from "react";

import { DirectionPanel } from "@/components/DirectionPanel";
import { ImpiantiCalendari } from "@/features/impianti/ImpiantiCalendari";
import { DOORS, areaAllowed, type DoorId } from "@/lib/doors";
import { getDashboard } from "@/lib/private.functions";
import { clearSession, useSession } from "@/lib/session";

const AREE = {
  famiglia: { nome: "Famiglie", door: "famiglie", claim: "Tutto quello che serve ai genitori biancoblù, solo per la tua famiglia." },
  atleta: { nome: "Atleta", door: "famiglie", claim: "Il tuo percorso, partita dopo partita." },
  staff: { nome: "Direzione e staff", door: "direzione", claim: "Campi, calendari e organizzazione della stagione." },
  direzione: { nome: "Direzione", door: "direzione", claim: "La società in un colpo d'occhio." },
  commerciale: { nome: "Commerciale", door: "commerciale", claim: "Sponsor e partner: contratti, rinnovi, listino e proposte." },
} as const satisfies Record<string, { nome: string; door: DoorId; claim: string }>;

type AreaKey = keyof typeof AREE;

export const Route = createFileRoute("/aree/$area")({
  loader: ({ params }) => {
    if (!(params.area in AREE)) throw notFound();
    return { area: params.area as AreaKey };
  },
  head: ({ params }) => {
    const nome = AREE[params.area as AreaKey]?.nome ?? "Area riservata";
    return {
      meta: [
        { title: `${nome} — Super App S.D.C. ColicoDerviese` },
        { name: "description", content: `${nome}: area riservata della Super App S.D.C. ColicoDerviese.` },
        { name: "robots", content: "noindex" },
      ],
    };
  },
  component: AreaPage,
});

function AreaPage() {
  const { area } = Route.useLoaderData();
  const info = AREE[area];
  const session = useSession();
  const door = DOORS.find((d) => d.id === info.door);

  if (session === undefined) {
    return <main className="mx-auto max-w-5xl px-4 py-16 text-sm text-muted-foreground">Verifico la sessione…</main>;
  }

  if (session === null) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        <Back />
        <p className="eyebrow mt-6 text-primary">Porta chiusa</p>
        <h1 className="mt-2 text-4xl font-bold uppercase">{info.nome}</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Per aprire questa porta entra una volta sola dall'ingresso della Super App: il gestionale riconosce il tuo
          ruolo e ti apre le porte giuste.
        </p>
        <Link to="/aree" hash="accedi" className="mt-6 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-2.5 text-sm font-bold text-accent-foreground">
          <Lock className="size-4" /> Vai all'ingresso
        </Link>
      </main>
    );
  }

  if (!areaAllowed(area, session.profile)) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16">
        <Back />
        <p className="eyebrow mt-6 text-primary">Non nel tuo profilo</p>
        <h1 className="mt-2 text-4xl font-bold uppercase">{info.nome}</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Il gestionale non ti abilita a questa porta. Se pensi sia un errore, chiedi l'abilitazione alla segreteria.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Back />
        <button type="button" onClick={() => clearSession()} className="inline-flex items-center gap-2 text-sm font-semibold underline">
          <LogOut className="size-4" /> Esci
        </button>
      </div>
      <p className="eyebrow mt-6 text-primary">{door?.era ?? "Area riservata"}</p>
      <h1 className="mt-2 text-4xl font-bold uppercase md:text-5xl">{info.nome}</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{info.claim}</p>

      {(area === "famiglia" || area === "atleta") && <FamilySummary token={session.token} />}

      {(area === "staff" || area === "direzione") && (
        <section className="mt-8" aria-label="Impianti e calendari">
          <ImpiantiCalendari />
        </section>
      )}

      {(area === "direzione" || area === "commerciale") && <DirectionPanel token={session.token} />}

      {door && (
        <section className="mt-10 border-t border-border pt-6" aria-labelledby="moduli-porta">
          <h2 id="moduli-porta" className="font-display text-xl font-bold uppercase">Cosa arriva in questa porta</h2>
          <ul className="mt-3 grid gap-x-8 gap-y-2 text-sm md:grid-cols-2">
            {door.moduli
              .filter((m) => m.status !== "attivo")
              .map((m) => (
                <li key={m.id} className="flex items-baseline justify-between gap-3 border-b border-border py-2">
                  <span>
                    <strong>{m.nome}</strong> <span className="text-muted-foreground">· {m.origine}</span>
                  </span>
                  <span className="shrink-0 text-[0.65rem] font-bold uppercase text-muted-foreground">
                    {m.status === "bloccato" ? "Bloccato" : "In arrivo"}
                  </span>
                </li>
              ))}
          </ul>
        </section>
      )}
    </main>
  );
}

function Back() {
  return (
    <Link to="/aree" className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
      <ArrowLeft className="size-4" /> Ingresso Super App
    </Link>
  );
}

function FamilySummary({ token }: { token: string }) {
  const dash = useServerFn(getDashboard);
  const [summary, setSummary] = useState<unknown>(undefined);
  useEffect(() => {
    dash({ data: { token } })
      .then((r) => {
        try {
          setSummary(r.summary ? (JSON.parse(r.summary) as unknown) : null);
        } catch {
          setSummary(null);
        }
      })
      .catch(() => setSummary(null));
  }, [token, dash]);
  return (
    <section className="mt-8" aria-label="Il mio riepilogo">
      <h2 className="font-display text-xl font-bold uppercase">Il mio riepilogo</h2>
      <SafeSummary summary={summary} />
    </section>
  );
}

/**
 * Privacy guard: il riepilogo di R20 non ha ancora un elenco di campi ammessi e può
 * contenere dati personali, anche di minori. Si mostrano solo numeri, sì/no e conteggi:
 * il testo libero non viene mai stampato.
 */
function SafeSummary({ summary }: { summary: unknown }) {
  if (summary === undefined) {
    return <p className="mt-4 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">Carico i dati dal gestionale…</p>;
  }
  const body =
    summary && typeof summary === "object" && !Array.isArray(summary)
      ? ((summary as Record<string, unknown>)["data"] && typeof (summary as Record<string, unknown>)["data"] === "object"
          ? ((summary as Record<string, unknown>)["data"] as Record<string, unknown>)
          : (summary as Record<string, unknown>))
      : null;
  const rows = body
    ? Object.entries(body).flatMap(([k, v]) => {
        if (k === "ok" || /token|pin|password|email|telefono|phone|iban|fiscal|isee/i.test(k)) return [];
        if (typeof v === "number" || typeof v === "boolean") return [[k, typeof v === "boolean" ? (v ? "Sì" : "No") : v.toLocaleString("it-IT")] as const];
        if (Array.isArray(v)) return [[k, `${v.length} elementi`] as const];
        return [];
      })
    : [];
  if (rows.length === 0) {
    return (
      <p className="mt-4 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
        DA SINCRONIZZARE: il gestionale non ha ancora restituito indicatori per questo profilo.
      </p>
    );
  }
  return (
    <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map(([k, v]) => (
        <div key={k} className="rounded-xl border border-border bg-card p-4">
          <dt className="text-xs uppercase tracking-wider text-muted-foreground">{k.replace(/[_-]+/g, " ")}</dt>
          <dd className="mt-1 text-lg font-semibold">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
