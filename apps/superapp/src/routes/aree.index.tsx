import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Briefcase, Globe, HeartHandshake, KeyRound, Lock, LogOut, ShieldCheck } from "lucide-react";
import { useState, type FormEvent } from "react";

import { inputCls } from "@/components/ui-kit";
import { login, requestCode } from "@/lib/access.functions";
import { DOORS, countByStatus, type Door, type DoorId, type ModuleStatus } from "@/lib/doors";
import { clearSession, useSession, writeSession } from "@/lib/session";

export const Route = createFileRoute("/aree/")({
  head: () => ({
    meta: [
      { title: "Entra nella Super App — S.D.C. ColicoDerviese" },
      {
        name: "description",
        content:
          "Un solo ingresso per la Super App S.D.C. ColicoDerviese: Pubblico, Famiglie, Direzione e staff, Commerciale.",
      },
      { property: "og:title", content: "Super App SCD — un solo ingresso" },
      { property: "og:description", content: "Una sola app, quattro porte, una sola base dati." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: IngressoPage,
});

const ICONS: Record<DoorId, typeof Globe> = {
  pubblico: Globe,
  famiglie: HeartHandshake,
  direzione: ShieldCheck,
  commerciale: Briefcase,
};

const STATUS_LABEL: Record<ModuleStatus, string> = { attivo: "Attivo", "in-arrivo": "In arrivo", bloccato: "Bloccato" };
const STATUS_CLS: Record<ModuleStatus, string> = {
  attivo: "bg-accent text-accent-foreground",
  "in-arrivo": "bg-muted text-muted-foreground",
  bloccato: "bg-destructive/15 text-destructive",
};

function IngressoPage() {
  const session = useSession();
  const counts = countByStatus();
  const open: DoorId[] = session?.doors ?? ["pubblico"];

  return (
    <main>
      <section className="surface-deep relative overflow-hidden px-4 pb-14 pt-12">
        <div className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-accent/20 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="eyebrow">Super App SCD · ingresso unico</p>
            <h1 className="mt-3 text-5xl font-bold uppercase leading-[0.95] md:text-7xl">
              Una sola app.
              <br />
              <span className="text-accent">Quattro porte.</span>
            </h1>
            <p className="mt-5 max-w-xl text-sm opacity-85 md:text-base">
              Entri una volta sola e vedi solo le porte del tuo ruolo. Sito pubblico, area famiglie,
              gestionale e commerciale stanno nella stessa app e leggono gli stessi dati: niente più
              link diversi da ricordare.
            </p>
            <dl className="mt-6 flex flex-wrap gap-6 text-sm">
              <div>
                <dt className="opacity-70">Moduli attivi</dt>
                <dd className="font-display text-3xl font-bold">{counts.attivo}</dd>
              </div>
              <div>
                <dt className="opacity-70">In arrivo</dt>
                <dd className="font-display text-3xl font-bold">{counts["in-arrivo"]}</dd>
              </div>
              <div>
                <dt className="opacity-70">Bloccati</dt>
                <dd className="font-display text-3xl font-bold">{counts.bloccato}</dd>
              </div>
            </dl>
          </div>
          <LoginCard />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12" aria-labelledby="porte-titolo">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow text-primary">Le quattro porte</p>
            <h2 id="porte-titolo" className="mt-1 text-3xl font-bold uppercase md:text-4xl">
              {session ? "Le tue porte" : "Cosa trovi dentro"}
            </h2>
          </div>
          <p className="max-w-md text-sm text-muted-foreground">
            Ogni porta raccoglie i progetti che prima erano app separate. Lo stato di ogni modulo è
            quello reale di oggi.
          </p>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {DOORS.map((d) => (
            <DoorPanel key={d.id} door={d} isOpen={open.includes(d.id)} loggedIn={!!session} />
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-muted/40 px-4 py-10">
        <div className="mx-auto max-w-6xl">
          <p className="eyebrow text-primary">Una sola base</p>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Nessuna porta ha un suo database o un suo login. Tutte leggono dalla stessa base:{" "}
            <strong className="text-foreground">R20</strong> per accesso e ruoli,{" "}
            <strong className="text-foreground">Drive e i master</strong> per i dati del club,{" "}
            <strong className="text-foreground">Gmail</strong> letta ogni ora dal presidio posta, e più
            avanti <strong className="text-foreground">Supabase SCD PULSE</strong> per i dati privati.
          </p>
        </div>
      </section>
    </main>
  );
}

function DoorPanel({ door, isOpen, loggedIn }: { door: Door; isOpen: boolean; loggedIn: boolean }) {
  const Icon = ICONS[door.id];
  const target = door.area ? { to: "/aree/$area" as const, params: { area: door.area } } : null;
  const state = door.id === "pubblico" ? "Sempre aperta" : isOpen ? "Aperta per te" : loggedIn ? "Non nel tuo profilo" : "Entra per aprirla";

  return (
    <article
      className={`flex min-w-0 flex-col rounded-2xl border p-5 transition-shadow sm:p-6 ${
        isOpen ? "border-primary/30 bg-card shadow-[var(--shadow-premium)]" : "border-border bg-card/60"
      }`}
    >
      <header className="flex items-start gap-4">
        <span className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${isOpen ? "surface-deep" : "bg-muted text-muted-foreground"}`}>
          {isOpen ? <Icon className="size-6" /> : <Lock className="size-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-2xl font-bold uppercase leading-none">{door.nome}</h3>
            <span className="text-xs text-muted-foreground">{door.era}</span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{door.testo}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-wider ${
            isOpen ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
          }`}
        >
          {state}
        </span>
      </header>

      <ul className="mt-5 divide-y divide-border border-y border-border">
        {door.moduli.map((m) => (
          <li key={m.id} className="flex items-center gap-3 py-2.5">
            <div className="min-w-0 flex-1">
              {isOpen && m.status === "attivo" && m.to ? (
                <a href={m.to} className="font-semibold hover:underline">
                  {m.nome}
                </a>
              ) : (
                <span className="font-semibold">{m.nome}</span>
              )}
              <p className="truncate text-xs text-muted-foreground">
                {m.testo} · <span className="opacity-80">{m.origine}</span>
              </p>
            </div>
            <span className={`shrink-0 rounded px-2 py-0.5 text-[0.6rem] font-bold uppercase ${STATUS_CLS[m.status]}`}>
              {STATUS_LABEL[m.status]}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-5">
        {door.id === "pubblico" ? (
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
            Vai al sito pubblico <ArrowRight className="size-4" />
          </Link>
        ) : isOpen && target ? (
          <Link
            {...target}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Apri {door.nome} <ArrowRight className="size-4" />
          </Link>
        ) : (
          <a href="#accedi" className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <KeyRound className="size-4" /> {loggedIn ? "Chiedi l'abilitazione alla segreteria" : "Entra per aprire questa porta"}
          </a>
        )}
      </div>
    </article>
  );
}

function LoginCard() {
  const session = useSession();
  const ask = useServerFn(requestCode);
  const enter = useServerFn(login);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (session) {
    const names: Record<DoorId, string> = { pubblico: "Pubblico", famiglie: "Famiglie", direzione: "Direzione e staff", commerciale: "Commerciale" };
    return (
      <div id="accedi" className="rounded-2xl bg-card p-6 text-card-foreground shadow-[var(--shadow-premium)]">
        <p className="eyebrow text-primary">Sei dentro</p>
        <p className="mt-2 font-display text-3xl font-bold uppercase">
          {session.profile.name ? `Ciao ${session.profile.name.split(" ")[0]}` : "Accesso verificato"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">Porte aperte: {session.doors.map((d) => names[d]).join(" · ")}</p>
        <button
          type="button"
          onClick={() => clearSession()}
          className="mt-5 inline-flex items-center gap-2 text-sm font-semibold underline"
        >
          <LogOut className="size-4" /> Esci
        </button>
      </div>
    );
  }

  async function onAsk() {
    setMsg(null);
    if (!email.includes("@")) {
      setMsg("Scrivi prima la tua email.");
      return;
    }
    setBusy(true);
    try {
      const r = await ask({ data: { email } });
      setMsg(r.message);
    } catch {
      setMsg("Il gestionale non risponde: riprova tra poco.");
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const r = await enter({ data: { email, code } });
      if (r.ok) {
        writeSession({ token: r.token, profile: r.profile, doors: r.doors });
        if (r.mustChangePin) setMsg("Primo accesso: imposta il tuo PIN personale dall'area riservata.");
      } else setMsg(r.message);
    } catch {
      setMsg("Controlla email e codice.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form id="accedi" onSubmit={onSubmit} className="rounded-2xl bg-card p-6 text-card-foreground shadow-[var(--shadow-premium)]">
      <p className="eyebrow text-primary">Entra</p>
      <p className="mt-1 font-display text-3xl font-bold uppercase">Un solo accesso</p>
      <p className="mt-1 text-sm text-muted-foreground">Usa l'email registrata in società e il tuo PIN, oppure chiedi un codice temporaneo.</p>
      <label className="mt-5 block space-y-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Email</span>
        <input className={inputCls} type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label className="mt-3 block space-y-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">PIN o codice</span>
        <input
          className={inputCls}
          type="password"
          inputMode="numeric"
          required
          minLength={4}
          maxLength={12}
          autoComplete="current-password"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
      </label>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={busy} className="rounded-full bg-accent px-6 py-2.5 text-sm font-bold text-accent-foreground disabled:opacity-60">
          {busy ? "Verifico…" : "Entra"}
        </button>
        <button type="button" disabled={busy} onClick={onAsk} className="text-sm font-semibold underline disabled:opacity-60">
          Ricevi un codice via email
        </button>
      </div>
      {msg && (
        <p role="status" className="mt-4 rounded-lg bg-muted px-3 py-2 text-sm">
          {msg}
        </p>
      )}
      <p className="mt-4 text-[0.7rem] text-muted-foreground">
        Le credenziali sono verificate dal gestionale della società. Nel browser resta solo la sessione di questa scheda.
      </p>
    </form>
  );
}
