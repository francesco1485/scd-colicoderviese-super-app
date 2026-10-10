import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ArrowRight, Check, Database, Lock, Timer } from "lucide-react";
import { useEffect, useState } from "react";

import { DirectionPanel } from "@/components/DirectionPanel";
import { SafeSummary } from "@/components/SafeSummary";
import { SATELLITE_TONE } from "@/components/scd/satellite-tone";
import { getDashboard, validateAccess } from "@/lib/private.functions";
import { STATUS_LABEL, canEnter, findSatellite, type Satellite } from "@/lib/satellites";

export const Route = createFileRoute("/aree/$area")({
  loader: ({ params }) => {
    const s = findSatellite(params.area);
    if (!s) throw notFound();
    return { slug: s.slug };
  },
  head: ({ params }) => {
    const s = findSatellite(params.area);
    const nome = s ? `Area ${s.name}` : "Area riservata";
    return {
      meta: [
        { title: `${nome} — S.C.D. ColicoDerviese` },
        { name: "description", content: s ? `${s.promise} ${nome} della Super App S.C.D. ColicoDerviese.` : "Area riservata della Super App S.C.D. ColicoDerviese." },
        { property: "og:title", content: `${nome} — S.C.D. ColicoDerviese` },
        { property: "og:description", content: s?.promise ?? "Accesso riservato." },
        { name: "robots", content: "noindex" },
      ],
    };
  },
  component: AreaPage,
});

function AreaPage() {
  const { slug } = Route.useLoaderData();
  const s = findSatellite(slug) as Satellite;
  const tone = SATELLITE_TONE[s.tone];
  const open = canEnter(s);

  return (
    <main data-screen="area" data-area={s.slug} className="bg-[var(--scd-page)] pb-12">
      <header className="relative isolate overflow-hidden bg-[var(--scd-navy)] text-white">
        <div aria-hidden="true" className="scd-kit-stripes absolute inset-0 -z-10" />
        <div className="mx-auto max-w-5xl px-4 pb-9 pt-5 sm:px-6 lg:pb-12">
          <Link to="/aree" className="inline-flex h-10 items-center gap-1 rounded-full pr-3 text-[15px] font-semibold text-white/90 hover:text-white"><ArrowLeft className="size-5" aria-hidden="true" />Tutte le aree</Link>
          <p className="mt-6 inline-flex items-center gap-2 text-[14px] font-semibold text-white/85">
            <span aria-hidden="true" className="h-[10px] w-[28px] rounded-full ring-2 ring-white/80" style={{ background: tone.bar }} />
            {s.who}
          </p>
          <h1 className="font-brand mt-2 text-[44px] uppercase leading-[0.95] sm:text-[60px]">Area {s.name}</h1>
          <p className="mt-2 max-w-[40ch] text-[18px] leading-snug text-white/90">{s.promise}</p>
        </div>
      </header>

      <div className="mx-auto grid max-w-5xl gap-4 px-4 pt-5 sm:px-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <section aria-labelledby="dentro" className="scd-card p-5">
          <h2 id="dentro" className="text-[19px] font-bold text-[var(--scd-ink)]">Cosa trovi dentro</h2>
          <ul className="mt-3 space-y-[10px]">
            {s.inside.map((v) => (
              <li key={v} className="flex gap-3 text-[15.5px] leading-snug text-[#26324a]">
                <Check className="mt-[2px] size-5 shrink-0 text-[var(--scd-green)]" aria-hidden="true" />{v}
              </li>
            ))}
          </ul>
          <p className="mt-4 flex gap-2 border-t border-[var(--scd-line)] pt-3 text-[13px] text-[var(--scd-sub)]">
            <Database className="mt-[1px] size-4 shrink-0" aria-hidden="true" />
            <span>I dati arrivano da: {s.source}. Nessun registro parallelo.</span>
          </p>
        </section>

        {open ? <LoginBox satellite={s} /> : <PendingBox satellite={s} />}
      </div>
    </main>
  );
}

function PendingBox({ satellite: s }: { satellite: Satellite }) {
  const tone = SATELLITE_TONE[s.tone];
  return (
    <section aria-labelledby="accesso" className="scd-card flex flex-col p-5" data-testid="area-pending">
      <span className={`self-start rounded-full px-2 py-[2px] text-[12px] font-semibold ${tone.chip}`}>{STATUS_LABEL[s.status]}</span>
      <h2 id="accesso" className="mt-3 flex items-center gap-2 text-[19px] font-bold text-[var(--scd-ink)]"><Timer className="size-5 text-[var(--scd-blue)]" aria-hidden="true" />Accesso personale</h2>
      <p className="mt-2 text-[15px] leading-snug text-[#33405a]">
        {s.status === "in-progettazione"
          ? "Quest'area è in progettazione. Quando sarà pronta la troverai qui, con lo stesso accesso di tutta la Super App."
          : "L'accesso si sta attivando sul gestionale della società. Quando sarà pronto riceverai un invito via email dalla società."}
      </p>
      <p className="mt-2 text-[13px] text-[var(--scd-sub)]">Ruoli e permessi li assegna solo la società: nessuno può darsi un accesso da solo.</p>
      {s.preview && (
        <Link to={s.preview.to} className="mt-5 inline-flex h-[48px] items-center justify-center gap-2 rounded-[10px] bg-[var(--scd-blue)] px-4 text-[16px] font-semibold text-white">
          {s.preview.label}<ArrowRight className="size-5" aria-hidden="true" />
        </Link>
      )}
    </section>
  );
}

function LoginBox({ satellite: s }: { satellite: Satellite }) {
  const area = s.login as NonNullable<Satellite["login"]>;
  const login = useServerFn(validateAccess);
  const dash = useServerFn(getDashboard);
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [stato, setStato] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [summary, setSummary] = useState<unknown>(null);
  const key = `scd-session-${area}`;

  useEffect(() => {
    const t = sessionStorage.getItem(key);
    if (t) setToken(t);
  }, [key]);
  useEffect(() => {
    if (!token) return;
    dash({ data: { token } }).then((r) => setSummary(r)).catch(() => setSummary(null));
  }, [token, dash]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStato(null);
    try {
      const res = await login({ data: { email, pin, area } });
      if (res.ok) {
        sessionStorage.setItem(key, res.token);
        setToken(res.token);
      } else setStato(res.message);
    } catch {
      setStato("Controlla email e PIN.");
    } finally {
      setBusy(false);
    }
  }

  if (token) {
    return (
      <section className="scd-card p-5 md:col-span-2">
        <div className="flex items-center justify-between rounded-xl bg-[var(--scd-page)] px-4 py-3 text-sm">
          <span>Sessione attiva (verificata dal gestionale)</span>
          <button className="font-semibold underline" onClick={() => { sessionStorage.removeItem(key); setToken(null); }}>Esci</button>
        </div>
        <SafeSummary summary={summary} />
        {area === "direzione" && <DirectionPanel token={token} />}
      </section>
    );
  }

  return (
    <form onSubmit={submit} className="scd-card space-y-3 p-5">
      <h2 className="flex items-center gap-2 text-[19px] font-bold text-[var(--scd-ink)]"><Lock className="size-5 text-[var(--scd-blue)]" aria-hidden="true" />Accedi</h2>
      <label className="block text-[14px] font-semibold text-[var(--scd-ink)]">Email
        <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 h-12 w-full rounded-lg border border-[var(--scd-line)] bg-white px-3 text-[16px] outline-none focus:ring-2 focus:ring-[var(--scd-blue)]" />
      </label>
      <label className="block text-[14px] font-semibold text-[var(--scd-ink)]">PIN
        <input type="password" inputMode="numeric" required autoComplete="one-time-code" value={pin} onChange={(e) => setPin(e.target.value)} className="mt-1 h-12 w-full rounded-lg border border-[var(--scd-line)] bg-white px-3 text-[16px] outline-none focus:ring-2 focus:ring-[var(--scd-blue)]" />
      </label>
      <button type="submit" disabled={busy} className="h-12 w-full rounded-[10px] bg-[var(--scd-yellow)] text-[16px] font-bold text-[var(--scd-ink)] disabled:opacity-60">{busy ? "Verifica in corso…" : "Entra nell'area"}</button>
      {stato && <p className="text-[13px] text-[var(--scd-sub)]" role="alert">{stato}</p>}
    </form>
  );
}
