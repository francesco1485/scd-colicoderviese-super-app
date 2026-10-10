import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { Field, OutcomeBox, PageHero, inputCls } from "@/components/ui-kit";
import { INTERESSI_ATLETA, REQUEST_STATUS_LABEL } from "@/lib/catalog";
import { submitRegistration } from "@/lib/club.functions";
import type { SubmitOutcome } from "@/lib/club.types";

export const Route = createFileRoute("/entra")({
  head: () => ({
    meta: [
      { title: "Entra nella SCD — Pre-iscrizione e prova | ColicoDerviese" },
      { name: "description", content: "Vuoi giocare con la S.D.C. ColicoDerviese? Scegli categoria e annata, richiedi una prova o l'open day: la segreteria ti ricontatta." },
      { property: "og:title", content: "Entra nella SCD — Vuoi giocare con noi?" },
      { property: "og:description", content: "Pre-iscrizione atleti e famiglie della S.D.C. ColicoDerviese." },
    ],
  }),
  component: Entra,
});

const empty = { interesse: INTERESSI_ATLETA[0] as string, annata: "", nome: "", cognome: "", dataNascita: "", comune: "", genitore: "", email: "", telefono: "", esperienza: "", prova: true, privacy: false };

function Entra() {
  const send = useServerFn(submitRegistration);
  const [f, setF] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<SubmitOutcome | null>(null);
  const minor = f.dataNascita ? (Date.now() - Date.parse(f.dataNascita)) / 31_557_600_000 < 18 : false;
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!f.privacy) return setErr("Serve il consenso privacy.");
    setBusy(true);
    try {
      const r = await send({ data: { ...f, privacy: true } });
      setOutcome(r);
      if (r.delivered) setF(empty);
    } catch (e) {
      setErr(e instanceof Error && e.message.includes("genitore") ? "Per i minori serve il contatto del genitore." : "Controlla i campi obbligatori.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <PageHero eyebrow="Tesseramento · Entra nella SCD" title={<>Vuoi giocare <span className="text-accent">con noi?</span></>}>
        Dalla scuola calcio alla Prima Squadra. Compila la pre-iscrizione: nessun tesseramento automatico, la segreteria ti ricontatta.
      </PageHero>

      <section className="mx-auto -mt-8 grid max-w-6xl gap-6 px-4 md:grid-cols-[1fr_20rem]">
        <form onSubmit={submit} className="grid gap-4 p-6 card-premium sm:grid-cols-2">
          <Field label="Interesse / categoria">
            <select className={inputCls} value={f.interesse} onChange={set("interesse")}>
              {INTERESSI_ATLETA.map((i) => <option key={i}>{i}</option>)}
            </select>
          </Field>
          <Field label="Annata (opzionale)"><input className={inputCls} inputMode="numeric" maxLength={4} placeholder="es. 2015" value={f.annata} onChange={set("annata")} /></Field>
          <Field label="Nome"><input required className={inputCls} value={f.nome} onChange={set("nome")} /></Field>
          <Field label="Cognome"><input required className={inputCls} value={f.cognome} onChange={set("cognome")} /></Field>
          <Field label="Data di nascita"><input required type="date" className={inputCls} value={f.dataNascita} onChange={set("dataNascita")} /></Field>
          <Field label="Comune"><input required className={inputCls} value={f.comune} onChange={set("comune")} /></Field>
          {minor && (
            <div className="sm:col-span-2">
              <Field label="Genitore / tutore (nome e recapito)" hint="Obbligatorio per i minori.">
                <input required className={inputCls} value={f.genitore} onChange={set("genitore")} />
              </Field>
            </div>
          )}
          <Field label="Email"><input required type="email" className={inputCls} value={f.email} onChange={set("email")} /></Field>
          <Field label="Telefono"><input required type="tel" className={inputCls} value={f.telefono} onChange={set("telefono")} /></Field>
          <div className="sm:col-span-2">
            <Field label="Esperienza precedente (opzionale)"><textarea rows={3} className={inputCls} value={f.esperienza} onChange={set("esperienza")} /></Field>
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" checked={f.prova} onChange={(e) => setF({ ...f, prova: e.target.checked })} /> Vorrei una prova / partecipare all'open day
          </label>
          <label className="flex items-start gap-2 text-sm sm:col-span-2">
            <input type="checkbox" className="mt-1" checked={f.privacy} onChange={(e) => setF({ ...f, privacy: e.target.checked })} />
            Acconsento al trattamento dei dati per essere ricontattato dalla segreteria (obbligatorio).
          </label>
          <button disabled={busy} className="surface-sun rounded-xl px-5 py-3 text-sm font-bold uppercase disabled:opacity-60 sm:col-span-2">
            {busy ? "Invio…" : "Invia pre-iscrizione"}
          </button>
          {err && <p className="text-sm text-destructive sm:col-span-2">{err}</p>}
          <div className="sm:col-span-2"><OutcomeBox outcome={outcome} /></div>
        </form>

        <aside className="space-y-4">
          <div className="surface-deep rounded-2xl p-5">
            <p className="eyebrow">Come funziona</p>
            <ol className="mt-3 space-y-3 text-sm">
              {Object.values(REQUEST_STATUS_LABEL).map((s, i) => (
                <li key={s} className="flex items-center gap-3">
                  <span className="surface-sun flex size-7 items-center justify-center rounded-full font-display font-bold">{i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
          </div>
          <p className="text-xs text-muted-foreground">La richiesta genera una lead per segreteria e DG. Ruoli e tesseramenti vengono assegnati solo dalla società.</p>
        </aside>
      </section>
    </main>
  );
}
