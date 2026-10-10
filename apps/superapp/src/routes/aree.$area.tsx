import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Lock } from "lucide-react";
import { useEffect, useState } from "react";

import { DirectionPanel } from "@/components/DirectionPanel";

import { getDashboard, validateAccess } from "@/lib/private.functions";

const AREE = {
  famiglia: {
    nome: "Area Famiglia",
    claim: "Tutto quello che serve ai genitori biancoblù.",
    voci: [
      "Comunicazioni della società e del mister",
      "Quote, ricevute e stato pagamenti",
      "Convocazioni e trasferte",
      "Documenti e certificati medici",
    ],
  },
  atleta: {
    nome: "Area Atleta",
    claim: "Il tuo percorso, partita dopo partita.",
    voci: [
      "Profilo e scheda personale",
      "Presenze e minuti giocati",
      "Obiettivi tecnici concordati",
      "Programma individuale (visibile solo qui)",
    ],
  },
  staff: {
    nome: "Area Staff",
    claim: "Gestione squadra e sedute, fuori dalla vista pubblica.",
    voci: [
      "Rosa e disponibilità giocatori",
      "Pianificazione sedute e campi",
      "Report partita e valutazioni",
      "Comunicazioni interne",
    ],
  },
  direzione: {
    nome: "Area Direzione",
    claim: "La società in un colpo d'occhio.",
    voci: [
      "Tesseramenti e affiliazioni",
      "Quadro economico e sponsor",
      "Indicatori di società e settore giovanile",
      "Gestione utenti e ruoli",
    ],
  },
} as const;

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
        { title: `${nome} — S.D.C. ColicoDerviese` },
        {
          name: "description",
          content: `${nome} della Super App ufficiale S.D.C. ColicoDerviese: accesso riservato ai tesserati.`,
        },
        { property: "og:title", content: `${nome} — S.D.C. ColicoDerviese` },
        {
          property: "og:description",
          content: "Accesso riservato ai tesserati della S.D.C. ColicoDerviese.",
        },
        { name: "robots", content: "noindex" },
      ],
    };
  },
  component: AreaPage,
});

function AreaPage() {
  const { area } = Route.useLoaderData();
  const info = AREE[area];
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

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <Link to="/aree" className="text-xs uppercase tracking-widest text-muted-foreground">← Tutte le aree</Link>
      <p className="eyebrow mt-4">Accesso riservato</p>
      <h1 className="mt-2 text-3xl font-bold">{info.nome}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{info.claim}</p>

      {token ? (
        <>
          <div className="mt-6 flex items-center justify-between rounded-xl bg-muted px-4 py-3 text-sm">
            <span>Sessione attiva (verificata dal gestionale)</span>
            <button className="font-semibold underline" onClick={() => { sessionStorage.removeItem(key); setToken(null); }}>Esci</button>
          </div>
          <pre className="mt-4 max-h-64 overflow-auto rounded-xl border border-border bg-card p-4 text-xs">{summary ? JSON.stringify(summary, null, 2) : "Dati in sincronizzazione…"}</pre>
          {area === "direzione" && <DirectionPanel token={token} />}
        </>
      ) : (
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <section className="p-6 card-premium">
            <h2 className="text-lg font-bold">Cosa trovi dentro</h2>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              {info.voci.map((v) => (
                <li key={v} className="flex gap-2"><span className="text-accent">•</span>{v}</li>
              ))}
            </ul>
          </section>
          <form onSubmit={submit} className="space-y-3 p-6 card-premium">
            <div className="flex items-center gap-2"><Lock className="size-4 text-accent" /><h2 className="text-lg font-bold">Accedi</h2></div>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email tesserato" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
            <input type="password" inputMode="numeric" required value={pin} onChange={(e) => setPin(e.target.value)} placeholder="PIN" className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring" />
            <button type="submit" disabled={busy} className="surface-sun w-full rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-60">{busy ? "Verifica in corso…" : "Entra nell'area"}</button>
            {stato && <p className="text-xs text-muted-foreground">{stato}</p>}
            <p className="text-[0.7rem] text-muted-foreground">PIN verificato lato server (auth.validate). I permessi sono controllati dal gestionale su ogni richiesta.</p>
          </form>
        </div>
      )}
    </main>
  );
}
