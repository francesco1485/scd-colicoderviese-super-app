import { useState } from 'react';
import { ExternalLink, ShieldAlert, MapPin, CircleDashed } from 'lucide-react';
import { fields, sources, steps, documents, unverifiedChecks, UNVERIFIED, type SourceKey } from './sources';

function SourceLink({ k }: { k: SourceKey }) {
  const s = sources[k];
  return <a className="imp-src" href={s.url} target="_blank" rel="noopener noreferrer"><span><b>{s.label}</b><small>{s.kind} · {s.role}</small></span><ExternalLink size={16} aria-label="apre in nuova scheda" /></a>;
}

const areas = [{ id: 'campi', label: '01 Campi' }, { id: 'processo', label: '02 Decisione' }, { id: 'fonti', label: '03 Fonti e conflitti' }] as const;
type Area = (typeof areas)[number]['id'];

export function ImpiantiPanel() {
  const [area, setArea] = useState<Area>('campi');
  const [site, setSite] = useState<'Tutti' | 'Colico' | 'Dervio'>('Tutti');
  const [step, setStep] = useState(0);
  const docs = documents.filter(d => site === 'Tutti' || d.site === site || d.site === 'Tutti');
  const shown = fields.filter(f => site === 'Tutti' || f.site === site);

  return <div>

    <nav className="imp-tabs" role="tablist" aria-label="Aree">
      {areas.map(a => <button key={a.id} role="tab" id={`tab-${a.id}`} aria-selected={area === a.id} aria-controls={`panel-${a.id}`} onClick={() => setArea(a.id)}>{a.label}</button>)}
    </nav>
    <div className="imp-filter" role="group" aria-label="Filtra per sede">
      {(['Tutti', 'Colico', 'Dervio'] as const).map(s => <button key={s} aria-pressed={site === s} onClick={() => setSite(s)}>{s}</button>)}
    </div>

    <div className="imp-panel">
      {area === 'campi' && <section id="panel-campi" role="tabpanel" aria-labelledby="tab-campi">
        <h2>Campi e regole operative canoniche</h2>
        <p className="imp-lead">Regole di uso, non occupazioni in tempo reale. Impianti e spogliatoi sono gestiti separatamente.</p>
        <div className="imp-fields">
          {shown.map(f => <article key={f.id} className="imp-field">
            <div className="imp-field-top"><MapPin size={16} aria-hidden="true" /><span>{f.site}</span><em>{f.surface}</em></div>
            <h3>{f.name}</h3>
            <p className="imp-rule">{f.rule}</p>
            <ul className="imp-checks">{unverifiedChecks.map(c => <li key={c}><CircleDashed size={13} aria-hidden="true" />{c}: <b>{UNVERIFIED}</b></li>)}</ul>
            <div className="imp-srcs">{f.sources.map(k => <SourceLink key={k} k={k} />)}</div>
          </article>)}
        </div>
        <figure className="imp-schema" aria-label="Schema NON IN SCALA">
          <figcaption>SCHEMA NON IN SCALA · nessuna posizione reale</figcaption>
          <div className="imp-schema-row">{shown.map(f => <div key={f.id} className="imp-pitch"><span>{f.site}</span><b>{f.name}</b></div>)}</div>
        </figure>
      </section>}

      {area === 'processo' && <section id="panel-processo" role="tabpanel" aria-labelledby="tab-processo">
        <h2>Processo di decisione rotazione</h2>
        <p className="imp-lead">Ogni cambio campo/orario passa da un human gate. Nessuna notifica automatica: gli avvisi restano riservati alle vere urgenze.</p>
        <ol className="imp-steps">{steps.map((s, i) => <li key={s.id}><button aria-current={step === i ? 'step' : undefined} onClick={() => setStep(i)}><span>{i + 1}</span>{s.id}</button></li>)}</ol>
        <div className="imp-step-detail" aria-live="polite"><strong>{steps[step]?.id}</strong><p>{steps[step]?.text}</p><small>Simulazione locale: nessuno stato viene salvato.</small></div>
        <div className="imp-srcs"><SourceLink k="hub" /><SourceLink k="calendario" /></div>
      </section>}

      {area === 'fonti' && <section id="panel-fonti" role="tabpanel" aria-labelledby="tab-fonti">
        <h2>Documenti e possibili conflitti tra fonti</h2>
        {docs.length === 0 ? <p className="imp-empty" role="status">Nessun documento per questo filtro.</p> :
        <div className="imp-table-wrap"><table className="imp-table">
          <thead><tr><th scope="col">Tema</th><th scope="col">Sede</th><th scope="col">Nota</th><th scope="col">Stato</th><th scope="col">Fonte</th></tr></thead>
          <tbody>{docs.map(d => <tr key={d.id}><td>{d.topic}</td><td>{d.site}</td><td>{d.note}</td><td><span className="imp-badge"><ShieldAlert size={13} aria-hidden="true" />NON VERIFICATO</span></td><td><a href={sources[d.source].url} target="_blank" rel="noopener noreferrer">Apri<ExternalLink size={13} aria-hidden="true" /></a></td></tr>)}</tbody>
        </table></div>}
      </section>}
    </div>
  </div>;
}
