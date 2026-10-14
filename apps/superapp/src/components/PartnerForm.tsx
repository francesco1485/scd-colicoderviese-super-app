import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { Field, OutcomeBox, inputCls } from "@/components/ui-kit";
import { BUDGET, SETTORI, SPONSOR_ASSETS } from "@/lib/catalog";
import { packageById, packageRequestNote, requestablePackages } from "@/lib/sponsor-packages";
import { submitPartnerLead } from "@/lib/club.functions";
import type { SubmitOutcome } from "@/lib/club.types";
import { FormsPausedNotice } from "@/components/scd/FormsPausedNotice";
import { PUBLIC_FORMS_LIVE } from "@/lib/public-forms";

export function PartnerForm({ tipo, preselect }: { tipo: "sponsor" | "fornitore"; preselect?: string | undefined }) {
  const send = useServerFn(submitPartnerLead);
  const empty = { azienda: "", referente: "", email: "", telefono: "", settore: SETTORI[0] as string, budget: BUDGET[0] as string, messaggio: "" };
  // A package chosen on /sponsor ("Chiedi questo pacchetto") travels in interessi and is named in the message.
  const chosen = tipo === "sponsor" ? packageById(preselect) : undefined;
  const [f, setF] = useState(chosen ? { ...empty, messaggio: packageRequestNote(chosen.id) } : empty);
  const [interessi, setInteressi] = useState<string[]>(preselect ? [preselect] : []);
  const [privacy, setPrivacy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<SubmitOutcome | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const toggle = (id: string) => setInteressi((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));
  // Sponsor interests: the listino packages of /sponsor (sponsor-packages.ts), then the single assets.
  const options = tipo === "sponsor" ? [...requestablePackages().map((p) => ({ id: p.id, nome: p.title })), ...SPONSOR_ASSETS] : [];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!privacy) return setErr("Serve il consenso privacy.");
    setBusy(true);
    try {
      const r = await send({ data: { ...f, tipo, interessi, privacy: true } });
      setOutcome(r);
      if (r.delivered) setF(empty);
    } catch {
      setErr("Controlla i campi obbligatori.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>{PUBLIC_FORMS_LIVE ? (
      <form onSubmit={submit} className="grid gap-4 p-6 card-premium sm:grid-cols-2" data-testid="partner-form" data-package={chosen?.id}>
      {chosen && (
        <p className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm sm:col-span-2" data-testid="partner-form-package" role="status">
          Pacchetto scelto: <strong>{chosen.title}</strong>. Puoi aggiungere altri interessi qui sotto.
        </p>
      )}
      <Field label="Azienda"><input required className={inputCls} value={f.azienda} onChange={set("azienda")} /></Field>
      <Field label="Referente"><input required className={inputCls} value={f.referente} onChange={set("referente")} /></Field>
      <Field label="Email"><input required type="email" className={inputCls} value={f.email} onChange={set("email")} /></Field>
      <Field label="Telefono"><input required type="tel" className={inputCls} value={f.telefono} onChange={set("telefono")} /></Field>
      <Field label="Settore">
        <select className={inputCls} value={f.settore} onChange={set("settore")}>{SETTORI.map((s) => <option key={s}>{s}</option>)}</select>
      </Field>
      {tipo === "sponsor" && (
        <Field label="Budget indicativo (opzionale)">
          <select className={inputCls} value={f.budget} onChange={set("budget")}>{BUDGET.map((s) => <option key={s}>{s}</option>)}</select>
        </Field>
      )}
      {options.length > 0 && (
        <div className="sm:col-span-2">
          <p id="partner-interessi" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Interessi</p>
          <div className="mt-2 flex flex-wrap gap-2" role="group" aria-labelledby="partner-interessi">
            {options.map((o) => (
              <button type="button" key={o.id} onClick={() => toggle(o.id)} aria-pressed={interessi.includes(o.id)} className={`scd-focus inline-flex min-h-11 items-center rounded-full border px-3 py-1.5 text-xs font-semibold ${interessi.includes(o.id) ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>
                {o.nome}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="sm:col-span-2">
        <Field label={tipo === "sponsor" ? "Messaggio" : "Descrivi prodotto o servizio"}>
          <textarea rows={4} className={inputCls} value={f.messaggio} onChange={set("messaggio")} required={tipo === "fornitore"} />
        </Field>
      </div>
      <label className="flex items-start gap-2 text-sm sm:col-span-2">
        <input type="checkbox" className="mt-1" checked={privacy} onChange={(e) => setPrivacy(e.target.checked)} /> Acconsento a essere ricontattato dalla società (obbligatorio).
      </label>
      <button disabled={busy} className="surface-sun min-h-11 rounded-xl px-5 py-3 text-sm font-bold uppercase disabled:opacity-60 sm:col-span-2">
        {busy ? "Invio…" : tipo === "sponsor" ? "Richiedi proposta" : "Invia proposta"}
      </button>
      {err && <p className="text-sm text-destructive sm:col-span-2">{err}</p>}
      <div className="sm:col-span-2"><OutcomeBox outcome={outcome} /></div>
    </form>
    ) : (
      <FormsPausedNotice kind="partner" topic={chosen ? `Pacchetto ${chosen.title}` : undefined} body={chosen ? packageRequestNote(chosen.id) : undefined} />
    )}</>
  );
}
