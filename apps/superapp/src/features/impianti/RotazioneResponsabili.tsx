import { useMemo, useState, type FormEvent } from 'react';
import { Users, Phone, Mail, Lock } from 'lucide-react';
import { coreSteps, rubricaGroups, quadro, annateFrom, requestSources, proposedFields, validateDraft, type VariationDraft } from './snapshot';
import { SourceLink } from './SourceLink';

const empty: VariationDraft = { fonte: '', data: '', ora: '', annata: '', campo: '', motivo: '' };
type Saved = VariationDraft & { id: number; step: number; urgent: boolean };

export function RotazioneAnnuale() {
  const annate = useMemo(() => annateFrom(quadro), []);
  const [draft, setDraft] = useState<VariationDraft>(empty);
  const [missing, setMissing] = useState<string[]>([]);
  const [tried, setTried] = useState(false);
  const [saved, setSaved] = useState<Saved[]>([]);
  const set = (k: keyof VariationDraft) => (e: { target: { value: string } }) => setDraft({ ...draft, [k]: e.target.value });
  const bad = (label: string) => tried && missing.some(m => m.startsWith(label));

  function submit(e: FormEvent) {
    e.preventDefault(); setTried(true);
    const m = validateDraft(draft); setMissing(m);
    if (m.length === 0) { setSaved([{ ...draft, id: saved.length + 1, step: 0, urgent: false }, ...saved]); setDraft(empty); setTried(false); }
  }
  const update = (id: number, patch: Partial<Saved>) => setSaved(saved.map(s => s.id === id ? { ...s, ...patch } : s));

  return <section aria-labelledby="h-rot">
    <h2 id="h-rot">Rotazione Annuale · terza fonte</h2>
    <p className="imp-lead">La Rotazione Campi Annuale resta un master autonomo, separato da Quadro e Calendario. Qui non viene letta né unita: solo collegata.</p>
    <div className="imp-srcs"><SourceLink k="rotazione" /></div>

    <h3 className="imp-h3">Prepara richiesta variazione</h3>
    <p className="imp-notsent" role="note">PROPOSTA NON INVIATA - nessun dato modificato</p>
    <form className="imp-form" onSubmit={submit} noValidate aria-describedby="form-note">
      <label>Fonte<select value={draft.fonte} onChange={set('fonte')} aria-invalid={bad('Fonte')}><option value="">Seleziona…</option>{requestSources.map(s => <option key={s}>{s}</option>)}</select></label>
      <label>Data<input type="date" value={draft.data} onChange={set('data')} aria-invalid={bad('Data')} /></label>
      <label>Ora<input type="time" value={draft.ora} onChange={set('ora')} aria-invalid={bad('Ora')} /></label>
      <label>Annata<select value={draft.annata} onChange={set('annata')} aria-invalid={bad('Annata')}><option value="">Seleziona…</option>{annate.map(a => <option key={a.id}>{a.label}</option>)}</select></label>
      <label>Campo proposto<select value={draft.campo} onChange={set('campo')} aria-invalid={bad('Campo')}><option value="">Seleziona…</option>{proposedFields.map(f => <option key={f}>{f}</option>)}</select></label>
      <label className="is-full">Motivo<textarea rows={3} value={draft.motivo} onChange={set('motivo')} aria-invalid={bad('Motivo')} /></label>
      {tried && missing.length > 0 && <p className="imp-missing" role="alert">Campi mancanti o non validi: {missing.join(', ')}</p>}
      <p id="form-note" className="imp-hint is-full">La bozza resta solo in questa pagina: nessun invio, nessun salvataggio, nessuna notifica. Una proposta non è una variazione FIGC formalizzata.</p>
      <div className="imp-form-actions"><button type="submit">Salva bozza in memoria</button><button type="button" onClick={() => { setDraft(empty); setMissing([]); setTried(false); }}>Svuota</button></div>
    </form>

    <div className="imp-drafts" aria-live="polite">
      {saved.length === 0 ? <p className="imp-empty">Nessuna bozza in memoria.</p> : saved.map(s => <article key={s.id} className="imp-draft" aria-label={`Bozza ${s.id}`}>
        <strong>Bozza {s.id} · {s.fonte} · {s.data} {s.ora} · {s.annata} → {s.campo}</strong>
        <p>{s.motivo}</p>
        <div className="imp-draft-steps">{coreSteps.map((c, i) => <span key={c} aria-current={s.step === i ? 'step' : undefined}>{i + 1}. {c}</span>)}{s.urgent && <span className="imp-urgent">URGENTE (solo etichetta)</span>}</div>
        <p className="imp-hint">Stato simulato: <b>{coreSteps[s.step]}</b>. Nessuna autorizzazione reale né conferma: il passaggio è solo dimostrativo.</p>
        <div className="imp-form-actions">
          <button onClick={() => update(s.id, { step: Math.min(s.step + 1, coreSteps.length - 1) })} disabled={s.step === coreSteps.length - 1}>Simula passaggio successivo</button>
          <button onClick={() => update(s.id, { step: 0 })}>Torna a Bozza</button>
          <button aria-pressed={s.urgent} onClick={() => update(s.id, { urgent: !s.urgent })}>Segna urgente</button>
          <button onClick={() => setSaved(saved.filter(x => x.id !== s.id))}>Elimina bozza</button>
        </div>
      </article>)}
    </div>
  </section>;
}

/** Descrizioni generali dei gruppi: nessun nominativo, ruolo individuale o contatto. */
export const pyramidInfo: Record<(typeof rubricaGroups)[number], string> = {
  'Dirigenza': 'Livello di vertice della società: indirizzo e decisioni.',
  'Responsabili e coordinatori': 'Referenti delle aree e del coordinamento delle attività.',
  'Staff e dirigenti': 'Staff tecnico e dirigenti delle squadre.',
  'Personale struttura': 'Personale di supporto agli impianti e ai servizi.',
};

export function Responsabili() {
  const [sel, setSel] = useState<(typeof rubricaGroups)[number]>(rubricaGroups[0]);
  return <section aria-labelledby="h-resp">
    <h2 id="h-resp">Piramide referenti</h2>
    <p className="imp-notsent" role="note">STAGING · piramide gruppi · nessun dato personale</p>
    <div className="pyr" role="tablist" aria-label="Gruppi della piramide" aria-orientation="vertical">
      {rubricaGroups.map((g, i) => <button key={g} role="tab" id={`pyr-${i}`} aria-selected={sel === g} aria-controls="pyr-panel" className="pyr-step" style={{ ['--pyr-i' as string]: i }} onClick={() => setSel(g)}><span>{i + 1}</span>{g}</button>)}
    </div>
    <article id="pyr-panel" role="tabpanel" aria-labelledby={`pyr-${rubricaGroups.indexOf(sel)}`} className="ts-ev pyr-card">
      <b><Users size={16} aria-hidden="true" /> {sel}</b>
      <p>{pyramidInfo[sel]}</p>
      <em className="ts-warn">Nominativi e contatti disponibili solo nell'area autenticata</em>
      <div className="pyr-locked">
        <button type="button" disabled aria-disabled="true" aria-label="Telefono bloccato"><Phone size={16} aria-hidden="true" /><Lock size={12} aria-hidden="true" /> Telefono</button>
        <button type="button" disabled aria-disabled="true" aria-label="Email bloccata"><Mail size={16} aria-hidden="true" /><Lock size={12} aria-hidden="true" /> Email</button>
      </div>
    </article>
    <p className="imp-hint">Il Master organigramma si apre solo per chi ha già il permesso su Drive.</p>
    <div className="imp-srcs"><SourceLink k="organigramma" /></div>
  </section>;
}
