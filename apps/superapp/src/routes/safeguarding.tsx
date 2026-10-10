import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Mail, PhoneCall, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { Field, OutcomeBox, inputCls } from "@/components/ui-kit";
import { CLUB_CONTACTS } from "@/lib/catalog";
import type { SubmitOutcome } from "@/lib/club.types";
import { submitSafeguarding } from "@/lib/safeguarding.functions";

export const Route = createFileRoute("/safeguarding")({
  head: () => ({
    meta: [
      { title: "Safeguarding — Segnalazione riservata | SCD ColicoDerviese" },
      { name: "description", content: "Canale riservato per segnalare situazioni che riguardano la tutela di minori e tesserati della S.D.C. ColicoDerviese, anche se non direttamente coinvolti." },
      { property: "og:title", content: "Safeguarding — Segnalazione riservata" },
      { property: "og:description", content: "Canale riservato e separato per la tutela di minori e tesserati." },
    ],
  }),
  component: Safeguarding,
});

const empty = { ruolo: "testimone" as const, fatti: "", luogoPeriodo: "", persone: "", testimoni: "", allegati: "", urgente: false, anonimo: false, nome: "", contatto: "" };

function Safeguarding() {
  const send = useServerFn(submitSafeguarding);
  const [f, setF] = useState<typeof empty & { ruolo: "coinvolto" | "testimone" | "genitore" | "altro" }>(empty);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<SubmitOutcome | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value } as typeof f);
  const mailto = `mailto:${CLUB_CONTACTS.pec}?subject=${encodeURIComponent(CLUB_CONTACTS.safeguardingSubject)}`;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      const r = await send({ data: f });
      setOutcome(r);
      if (r.delivered) setF(empty);
    } catch {
      setErr("Descrivi i fatti (almeno 20 caratteri) e indica un recapito o scegli l'invio senza recapito.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary"><ShieldCheck className="size-4" /> Safeguarding · canale riservato</p>
      <h1 className="mt-2 text-4xl font-bold">Segnala in riservatezza</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Puoi segnalare anche se non sei direttamente coinvolto. Le segnalazioni sono lette solo dal referente safeguarding e dai soggetti autorizzati: non entrano nel CRM, nei ticket ordinari o nella community.
      </p>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border-2 border-destructive/60 p-4">
          <p className="flex items-center gap-2 font-bold"><PhoneCall className="size-4 text-destructive" /> Pericolo immediato?</p>
          <p className="mt-1 text-sm">In caso di emergenza, pericolo immediato o possibile reato chiama subito il <a href="tel:112" className="font-bold underline">112</a> o le autorità competenti.</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="flex items-center gap-2 font-bold"><Mail className="size-4 text-primary" /> PEC riservata</p>
          <a href={mailto} className="mt-1 block break-all text-sm font-semibold text-primary underline">{CLUB_CONTACTS.pec}</a>
          <p className="text-xs text-muted-foreground">Oggetto: <strong>{CLUB_CONTACTS.safeguardingSubject}</strong></p>
        </div>
      </div>

      <form onSubmit={submit} className="mt-8 grid gap-4 rounded-2xl border border-border bg-card p-6 sm:grid-cols-2">
        <Field label="Chi segnala">
          <select className={inputCls} value={f.ruolo} onChange={set("ruolo")}>
            <option value="coinvolto">Persona coinvolta</option>
            <option value="testimone">Testimone / non coinvolto</option>
            <option value="genitore">Genitore / tutore</option>
            <option value="altro">Altro</option>
          </select>
        </Field>
        <Field label="Luogo e periodo"><input className={inputCls} value={f.luogoPeriodo} onChange={set("luogoPeriodo")} /></Field>
        <div className="sm:col-span-2"><Field label="Descrizione dei fatti"><textarea required rows={6} className={inputCls} value={f.fatti} onChange={set("fatti")} /></Field></div>
        <Field label="Persone coinvolte"><textarea rows={2} className={inputCls} value={f.persone} onChange={set("persone")} /></Field>
        <Field label="Eventuali testimoni"><textarea rows={2} className={inputCls} value={f.testimoni} onChange={set("testimoni")} /></Field>
        <div className="sm:col-span-2"><Field label="Allegati" hint="Descrivi o indica un link; per file sensibili preferisci la PEC."><input className={inputCls} value={f.allegati} onChange={set("allegati")} /></Field></div>
        <label className="flex items-center gap-2 text-sm font-semibold sm:col-span-2">
          <input type="checkbox" checked={f.urgente} onChange={(e) => setF({ ...f, urgente: e.target.checked })} /> Serve una protezione urgente
        </label>
        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input type="checkbox" checked={f.anonimo} onChange={(e) => setF({ ...f, anonimo: e.target.checked })} /> Invia senza lasciare un recapito
        </label>
        {!f.anonimo && (
          <>
            <Field label="Nome (facoltativo)"><input className={inputCls} value={f.nome} onChange={set("nome")} /></Field>
            <Field label="Recapito (email o telefono)"><input required className={inputCls} value={f.contatto} onChange={set("contatto")} /></Field>
          </>
        )}
        {f.anonimo && <p className="text-xs text-muted-foreground sm:col-span-2">Senza recapito non potremo chiederti chiarimenti né aggiornarti sull'esito.</p>}
        <button disabled={busy} className="rounded-xl bg-primary px-5 py-3 text-sm font-bold uppercase text-primary-foreground disabled:opacity-60 sm:col-span-2">{busy ? "Invio riservato…" : "Invia segnalazione riservata"}</button>
        {err && <p className="text-sm text-destructive sm:col-span-2">{err}</p>}
        <div className="sm:col-span-2"><OutcomeBox outcome={outcome} /></div>
      </form>
    </main>
  );
}
