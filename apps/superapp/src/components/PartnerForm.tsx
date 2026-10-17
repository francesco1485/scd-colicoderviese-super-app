import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { Field, OutcomeBox, inputCls } from "@/components/ui-kit";
import { SETTORI, SPONSOR_ASSETS } from "@/lib/catalog";
import { choiceById, choiceRequestNote, choiceTopic } from "@/lib/sponsor-ideas";
import { requestablePackages } from "@/lib/sponsor-packages";
import { submitPartnerLead } from "@/lib/club.functions";
import type { SubmitOutcome } from "@/lib/club.types";
import { FormsPausedNotice } from "@/components/scd/FormsPausedNotice";
import { PUBLIC_FORMS_LIVE } from "@/lib/public-forms";

/**
 * Prefill of the sponsor proposal form by another page (B1, /spot/$slug: the company answers on a LED spot).
 * Same form, same server function (submitPartnerLead), same storage: only the starting values change.
 */
export interface PartnerFormPreset {
  /** Short subject, e.g. "Spot carcano: approvato"; also the e-mail subject while public forms are paused. */
  topic: string;
  /** Starting message (editable). */
  message: string;
  /** Starting company name (editable). */
  azienda?: string;
  /** Starting interests (package or asset ids). */
  interessi?: readonly string[];
  /** Line shown once the request has been delivered by the online form. */
  receivedNote?: string;
  /** Line shown next to the official e-mail while public forms are paused (nothing has been sent yet). */
  pausedNote?: string;
  /** Title and text of the official e-mail box shown while public forms are paused. */
  pausedCopy?: { title: string; text: string };
}

export function PartnerForm({ tipo, preselect, preset }: { tipo: "sponsor" | "fornitore"; preselect?: string | undefined; preset?: PartnerFormPreset | undefined }) {
  const send = useServerFn(submitPartnerLead);
  // No budget field: amounts are never shown on the public sponsor surfaces (Francesco 17/10/2026 09:42, the
  // Presidente defines every proposal); the server keeps accepting an empty budget.
  const empty = { azienda: "", referente: "", email: "", telefono: "", settore: SETTORI[0] as string, messaggio: "" };
  // A package or idea chosen on /sponsor («Parliamone») travels in interessi and is named in the message.
  const chosen = tipo === "sponsor" && !preset ? choiceById(preselect) : undefined;
  const start = preset ? { ...empty, azienda: preset.azienda ?? "", messaggio: preset.message } : chosen ? { ...empty, messaggio: choiceRequestNote(chosen.id) } : empty;
  const [f, setF] = useState(start);
  const [interessi, setInteressi] = useState<string[]>(preset?.interessi ? [...preset.interessi] : preselect ? [preselect] : []);
  const [privacy, setPrivacy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<SubmitOutcome | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const toggle = (id: string) => setInteressi((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));
  // Sponsor interests: the packages of /sponsor (sponsor-packages.ts), the chosen idea (sponsor-ideas.ts), then the single assets.
  const idea = chosen?.kind === "idea" ? [{ id: chosen.id, nome: chosen.title }] : [];
  const options = tipo === "sponsor" ? [...requestablePackages().map((p) => ({ id: p.id, nome: p.title })), ...idea, ...SPONSOR_ASSETS] : [];

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
      {preset && (
        <p className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm sm:col-span-2" data-testid="partner-form-preset" role="status">
          Risposta: <strong>{preset.topic}</strong>. Completa i tuoi recapiti e invia.
        </p>
      )}
      {chosen && (
        <p className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm sm:col-span-2" data-testid="partner-form-package" role="status">
          {chosen.kind === "pacchetto" ? "Pacchetto scelto" : "Idea scelta"}: <strong>{chosen.title}</strong>. Puoi aggiungere altri interessi qui sotto.
        </p>
      )}
      <Field label="Azienda"><input required className={inputCls} value={f.azienda} onChange={set("azienda")} /></Field>
      <Field label="Referente"><input required className={inputCls} value={f.referente} onChange={set("referente")} /></Field>
      <Field label="Email"><input required type="email" className={inputCls} value={f.email} onChange={set("email")} /></Field>
      <Field label="Telefono"><input required type="tel" className={inputCls} value={f.telefono} onChange={set("telefono")} /></Field>
      <Field label="Settore">
        <select className={inputCls} value={f.settore} onChange={set("settore")}>{SETTORI.map((s) => <option key={s}>{s}</option>)}</select>
      </Field>
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
        {busy ? "Invio…" : preset ? "Invia la risposta" : tipo === "sponsor" ? "Richiedi proposta" : "Invia proposta"}
      </button>
      {err && <p className="text-sm text-destructive sm:col-span-2">{err}</p>}
      <div className="sm:col-span-2"><OutcomeBox outcome={outcome} /></div>
      {preset?.receivedNote && outcome?.delivered && (
        <p className="m-0 text-sm font-semibold sm:col-span-2" data-testid="partner-form-received">{preset.receivedNote}</p>
      )}
    </form>
    ) : (
      preset ? (
        <FormsPausedNotice kind="partner" topic={preset.topic} body={preset.message} note={preset.pausedNote} copy={preset.pausedCopy} />
      ) : (
        <FormsPausedNotice kind="partner" topic={chosen ? choiceTopic(chosen) : undefined} body={chosen ? choiceRequestNote(chosen.id) : undefined} />
      )
    )}</>
  );
}
