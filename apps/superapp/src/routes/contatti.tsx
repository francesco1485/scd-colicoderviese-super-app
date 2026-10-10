import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { Field, OutcomeBox, PageHero, SafeguardingStrip, inputCls } from "@/components/ui-kit";
import { TICKET_CATEGORIES } from "@/lib/catalog";
import { submitTicket } from "@/lib/club.functions";
import type { SubmitOutcome } from "@/lib/club.types";

export const Route = createFileRoute("/contatti")({
  head: () => ({
    meta: [
      { title: "Parla con noi — Centro contatti SCD ColicoDerviese" },
      { name: "description", content: "Segnala una notizia, invia foto, correggi un risultato, proponi un evento o una collaborazione: ogni richiesta diventa un ticket seguito dalla società." },
      { property: "og:title", content: "Parla con noi — SCD ColicoDerviese" },
      { property: "og:description", content: "Centro contatti con ticket per categoria." },
    ],
  }),
  component: Contatti,
});

type Cat = (typeof TICKET_CATEGORIES)[number]["id"];
const empty = { nome: "", email: "", oggetto: "", messaggio: "", link: "" };

function Contatti() {
  const send = useServerFn(submitTicket);
  const [cat, setCat] = useState<Cat>("notizia");
  const [f, setF] = useState(empty);
  const [privacy, setPrivacy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<SubmitOutcome | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!privacy) return setErr("Serve il consenso privacy.");
    setBusy(true);
    try {
      const r = await send({ data: { ...f, categoria: cat, privacy: true } });
      setOutcome(r);
      if (r.delivered) setF(empty);
    } catch {
      setErr("Controlla i campi (messaggio di almeno 10 caratteri, link valido).");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <PageHero eyebrow="Centro contatti" title={<>Parla <span className="text-accent">con noi</span></>}>
        Scegli la categoria: ogni invio diventa un ticket con stato, assegnato alla persona giusta.
      </PageHero>
      <section className="mx-auto -mt-8 max-w-4xl space-y-4 px-4">
        <div className="card-premium p-5">
          <p className="eyebrow">Categoria</p>
          <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
            {TICKET_CATEGORIES.map((c) => (
              <button key={c.id} onClick={() => setCat(c.id)} className={`rounded-xl border p-3 text-left text-xs font-bold uppercase leading-tight ${cat === c.id ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
                {c.label}
              </button>
            ))}
          </div>
        </div>
        <form onSubmit={submit} className="grid gap-4 p-6 card-premium sm:grid-cols-2">
          <Field label="Nome"><input required className={inputCls} value={f.nome} onChange={set("nome")} /></Field>
          <Field label="Email"><input required type="email" className={inputCls} value={f.email} onChange={set("email")} /></Field>
          <div className="sm:col-span-2"><Field label="Oggetto"><input required className={inputCls} value={f.oggetto} onChange={set("oggetto")} /></Field></div>
          <div className="sm:col-span-2"><Field label="Messaggio"><textarea required rows={5} className={inputCls} value={f.messaggio} onChange={set("messaggio")} /></Field></div>
          {(cat === "media" || cat === "notizia") && (
            <div className="sm:col-span-2"><Field label="Link foto/video (opzionale)" hint="Materiale pubblicato solo dopo approvazione."><input type="url" className={inputCls} value={f.link} onChange={set("link")} /></Field></div>
          )}
          <label className="flex items-start gap-2 text-sm sm:col-span-2">
            <input type="checkbox" className="mt-1" checked={privacy} onChange={(e) => setPrivacy(e.target.checked)} /> Acconsento al trattamento dei dati per la gestione della richiesta.
          </label>
          <button disabled={busy} className="surface-sun rounded-xl px-5 py-3 text-sm font-bold uppercase disabled:opacity-60 sm:col-span-2">{busy ? "Invio…" : "Apri ticket"}</button>
          {err && <p className="text-sm text-destructive sm:col-span-2">{err}</p>}
          <div className="sm:col-span-2"><OutcomeBox outcome={outcome} /></div>
        </form>
        <SafeguardingStrip />
        <p className="text-xs text-muted-foreground">Le segnalazioni safeguarding hanno un canale separato e non entrano in questa coda.</p>
      </section>
    </main>
  );
}
