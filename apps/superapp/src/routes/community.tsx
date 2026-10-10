import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Award, Bell, Camera, Heart, MessageSquareText, Star, Vote } from "lucide-react";
import { useEffect, useState } from "react";

import { Field, OutcomeBox, PageHero, SyncPlaceholder, inputCls } from "@/components/ui-kit";
import { getPublicFeed, submitCommunity } from "@/lib/club.functions";
import type { SubmitOutcome } from "@/lib/club.types";

export const Route = createFileRoute("/community")({
  loader: () => getPublicFeed(),
  head: () => ({
    meta: [
      { title: "SCD Community — Area tifosi ColicoDerviese" },
      { name: "description", content: "Sondaggi, pronostici senza premi, muro dei tifosi, foto dal territorio e badge: la community moderata della S.D.C. ColicoDerviese." },
      { property: "og:title", content: "SCD Community — Area tifosi" },
      { property: "og:description", content: "La community biancoblù, moderata e senza scommesse." },
    ],
  }),
  component: Community,
});

type Tipo = "messaggio" | "foto" | "storia" | "pronostico";

function Community() {
  const feed = Route.useLoaderData();
  const posts = feed.items.filter((i) => i.kind === "community");
  const [tab, setTab] = useState<Tipo>("messaggio");

  return (
    <main>
      <PageHero eyebrow="SCD Community · Area tifosi" title={<>Il muro <span className="text-accent">biancoblù</span></>}>
        Nessun contenuto va online in automatico: ogni messaggio, foto o storia viene approvato dalla società prima della pubblicazione.
      </PageHero>

      <section className="mx-auto -mt-8 grid max-w-6xl gap-6 px-4 md:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <div className="card-premium p-5">
            <div className="flex flex-wrap gap-2">
              {([
                ["messaggio", "Muro", MessageSquareText],
                ["foto", "Foto", Camera],
                ["storia", "Storia dal territorio", Heart],
                ["pronostico", "Pronostico", Vote],
              ] as const).map(([id, label, Icon]) => (
                <button key={id} onClick={() => setTab(id)} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold uppercase ${tab === id ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                  <Icon className="size-3.5" /> {label}
                </button>
              ))}
            </div>
            <CommunityForm key={tab} tipo={tab} matchLabel={feed.nextMatch ? `${feed.nextMatch.casa} – ${feed.nextMatch.ospite}` : null} />
          </div>

          <div>
            <p className="eyebrow">Pubblicati dopo moderazione</p>
            <div className="mt-3 grid gap-3">
              {posts.length ? posts.map((p) => (
                <article key={p.id} className="card-premium p-4">
                  <p className="font-semibold">{p.title}</p>
                  {p.body && <p className="text-sm text-muted-foreground">{p.body}</p>}
                </article>
              )) : <SyncPlaceholder label="Muro della community" />}
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="surface-deep rounded-2xl p-5">
            <p className="eyebrow flex items-center gap-2"><Star className="size-4" /> MVP della settimana</p>
            <p className="mt-2 text-sm opacity-85">Sondaggio community attivato dalla società solo quando previsto. Al momento non abilitato.</p>
          </div>
          <div className="card-premium p-5">
            <p className="eyebrow flex items-center gap-2"><Vote className="size-4" /> Sondaggi</p>
            <SyncPlaceholder label="Sondaggi attivi" className="mt-3" />
          </div>
          <div className="card-premium p-5">
            <p className="eyebrow flex items-center gap-2"><Award className="size-4" /> Quiz & badge</p>
            <p className="mt-2 text-sm text-muted-foreground">Quiz sul club e badge community (Tifoso fedele, Reporter del lago, Occhio di falco) in arrivo con il prossimo aggiornamento del gestionale.</p>
          </div>
          <Preferences />
        </aside>
      </section>
    </main>
  );
}

function CommunityForm({ tipo, matchLabel }: { tipo: Tipo; matchLabel: string | null }) {
  const send = useServerFn(submitCommunity);
  const [nome, setNome] = useState("");
  const [testo, setTesto] = useState("");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<SubmitOutcome | null>(null);

  if (tipo === "pronostico" && !matchLabel) {
    return <p className="mt-4 text-sm text-muted-foreground">Il pronostico si apre quando la prossima gara è sincronizzata. Gioco non monetario, senza premi in denaro.</p>;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      setOutcome(await send({ data: { tipo, nome, testo, link, riferimento: tipo === "pronostico" ? (matchLabel ?? "") : "" } }));
    } catch {
      setOutcome({ ok: false, delivered: false, reference: null, status: "errore", message: "Controlla i campi e riprova." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 grid gap-3">
      {tipo === "pronostico" && <p className="text-sm font-semibold">{matchLabel} · <span className="text-muted-foreground">solo per divertimento, nessun premio</span></p>}
      <Field label="Il tuo nome o nickname"><input required minLength={2} className={inputCls} value={nome} onChange={(e) => setNome(e.target.value)} /></Field>
      <Field label={tipo === "pronostico" ? "Il tuo risultato (es. 2-1)" : tipo === "foto" ? "Didascalia" : "Messaggio"}>
        {tipo === "pronostico" ? <input required maxLength={7} className={inputCls} value={testo} onChange={(e) => setTesto(e.target.value)} /> : <textarea required rows={3} maxLength={1000} className={inputCls} value={testo} onChange={(e) => setTesto(e.target.value)} />}
      </Field>
      {(tipo === "foto" || tipo === "storia") && (
        <Field label="Link alla foto/video" hint="Caricamento diretto in arrivo; per ora incolla un link condiviso."><input className={inputCls} type="url" value={link} onChange={(e) => setLink(e.target.value)} /></Field>
      )}
      <button disabled={busy} className="surface-sun rounded-xl px-5 py-3 text-sm font-bold uppercase disabled:opacity-60">{busy ? "Invio…" : "Invia in moderazione"}</button>
      <OutcomeBox outcome={outcome} />
    </form>
  );
}

const PREF_KEY = "scd-prefs";
const TEAMS = ["Prima Squadra", "Juniores", "Allievi", "Giovanissimi", "Esordienti", "Pulcini", "Scuola calcio"];
const NOTIF = ["Risultati", "Variazioni ufficiali", "Eventi", "Community"];

function Preferences() {
  const [prefs, setPrefs] = useState<{ teams: string[]; notif: string[] }>({ teams: [], notif: ["Variazioni ufficiali"] });
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PREF_KEY);
      if (raw) setPrefs(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);
  const toggle = (k: "teams" | "notif", v: string) => {
    const next = { ...prefs, [k]: prefs[k].includes(v) ? prefs[k].filter((x) => x !== v) : [...prefs[k], v] };
    setPrefs(next);
    localStorage.setItem(PREF_KEY, JSON.stringify(next));
  };
  return (
    <div className="card-premium p-5">
      <p className="eyebrow flex items-center gap-2"><Bell className="size-4" /> Preferiti & notifiche</p>
      <p className="mt-3 text-xs font-semibold uppercase text-muted-foreground">Squadre preferite</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {TEAMS.map((t) => <Chip key={t} on={prefs.teams.includes(t)} onClick={() => toggle("teams", t)}>{t}</Chip>)}
      </div>
      <p className="mt-4 text-xs font-semibold uppercase text-muted-foreground">Avvisami per</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {NOTIF.map((t) => <Chip key={t} on={prefs.notif.includes(t)} onClick={() => toggle("notif", t)}>{t}</Chip>)}
      </div>
      <p className="mt-3 text-[0.7rem] text-muted-foreground">Salvate su questo dispositivo. Le notifiche push arriveranno con l'app installata.</p>
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={`rounded-full border px-2.5 py-1 text-xs ${on ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{children}</button>;
}
