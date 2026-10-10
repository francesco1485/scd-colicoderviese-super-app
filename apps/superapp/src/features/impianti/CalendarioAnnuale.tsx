import { useState } from 'react';
import { ChevronLeft, ChevronRight, AlertTriangle, ShieldAlert } from 'lucide-react';
import { calendario, seasonByMonth, filterEvents, rangeOf, shiftAnchor, mondayOf, isRetired, isProvisional, needsFacility, verificationLabels, upcoming, toVerify, SNAPSHOT_DATE, SNAPSHOT_WATERMARK, type CalFilter, type HomeAway, type CalEvent } from './snapshot';
import { Watermark } from './SourceLink';

const fmt = (iso: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('it-IT', { ...o, timeZone: 'UTC' }).format(new Date(`${iso}T12:00:00Z`));
const label = (e: CalEvent) => calendario.groups[e.group]?.label ?? e.category;

/** Card evento: nessun badge di verifica qui (solo in Gestione); orario non confermato marcato "provv.", mai "confermato". */
function EventCard({ e, manage }: { e: CalEvent; manage?: boolean }) {
  const g = calendario.groups[e.group];
  const checks = manage ? verificationLabels(e) : [];
  return <li className={`imp-event${checks.length ? ' imp-event--check' : ''}`}>
    <div className="imp-event-date"><b>{fmt(e.date, { day: '2-digit' })}</b><span>{fmt(e.date, { weekday: 'short', month: 'short' })}</span><span className={isProvisional(e) ? 'imp-prov' : undefined}>{e.time || '—'}{isProvisional(e) ? ' provv.' : ''}</span></div>
    <div className="imp-event-body">
      <div className="imp-event-top">{g?.logo && <img src={`/media/scd/${g.logo}`} alt="" width={28} height={28} loading="lazy" />}<span>{label(e)}</span><em className={e.home_away === 'CASA' ? 'is-home' : 'is-away'}>{e.home_away === 'CASA' ? 'CASA' : 'TRASFERTA'}</em><em>{e.type}</em></div>
      <strong>{e.opponent || 'Avversario da fonte'}</strong>
      {checks.length > 0 && <span className="imp-checks"><ShieldAlert size={13} aria-hidden="true" />{checks.map(x => <em key={x} className="imp-check">Da verificare · {x}</em>)}</span>}
      <small>{e.venue}{e.round ? ` · ${e.round}` : ''}</small>
      {(e.is_variation || e.notice.length > 0) && <p className="imp-notice"><AlertTriangle size={13} aria-hidden="true" />{[e.is_variation ? 'Variazione registrata' : '', ...e.notice].filter(Boolean).join(' · ')}</p>}
    </div>
  </li>;
}

export function CalendarioAnnuale() {
  const [mode, setMode] = useState<'settimana' | 'mese' | 'stagione' | 'gestione'>('gestione');
  const [f, setF] = useState<CalFilter>({ group: 'tutte', homeAway: 'TUTTE', view: 'settimana', anchor: mondayOf(SNAPSHOT_DATE) });
  const groups = Object.entries(calendario.groups).filter(([k, g]) => !isRetired(k) && !isRetired(g.label) && calendario.events.some(e => e.group === k));
  const match = (e: CalEvent) => (f.group === 'tutte' || e.group === f.group) && (f.homeAway === 'TUTTE' || e.home_away === f.homeAway);
  const setView = (v: typeof mode) => { setMode(v); if (v === 'settimana' || v === 'mese') setF({ ...f, view: v, anchor: v === 'settimana' ? mondayOf(f.anchor) : f.anchor.slice(0, 8) + '01' }); };
  const list = filterEvents(calendario.events, f);
  const [from, to] = rangeOf(f);
  const months = seasonByMonth(calendario.events, f.group, f.homeAway);
  const next = upcoming(calendario.events, SNAPSHOT_DATE, 40).filter(match).slice(0, 5);
  const verify = toVerify(calendario.events).filter(match);
  const facility = calendario.events.filter(needsFacility).length;

  return <section aria-labelledby="h-cal" className="imp-cal">
    <Watermark text={SNAPSHOT_WATERMARK} />
    <h2 id="h-cal">Calendario Annuale {calendario.season}</h2>
    <p className="imp-lead">{calendario.events.length} eventi · revisione {calendario.projection_revision ?? '—'} ({calendario.snapshot_status}). Fotografia del {SNAPSHOT_DATE.split('-').reverse().join('/')}: orari e partite possono essere cambiati dopo.</p>

    <div className="imp-filter imp-cal-modes" role="group" aria-label="Vista">{([['gestione', 'Gestione'], ['settimana', 'Settimana'], ['mese', 'Mese'], ['stagione', `Stagione ${calendario.season}`]] as const).map(([v, l]) => <button key={v} aria-pressed={mode === v} onClick={() => setView(v)}>{l}</button>)}</div>

    <div className="imp-chips" role="group" aria-label="Filtro rapido annata">
      <button aria-pressed={f.group === 'tutte'} onClick={() => setF({ ...f, group: 'tutte' })}>Tutte</button>
      {groups.map(([k, g]) => <button key={k} aria-pressed={f.group === k} onClick={() => setF({ ...f, group: k })}>{g.label}</button>)}
    </div>
    <div className="imp-filter" role="group" aria-label="Casa o trasferta">{(['TUTTE', 'CASA', 'FUORI'] as HomeAway[]).map(h => <button key={h} aria-pressed={f.homeAway === h} onClick={() => setF({ ...f, homeAway: h })}>{h === 'TUTTE' ? 'Casa + trasferta' : h === 'CASA' ? 'Casa' : 'Trasferta'}</button>)}</div>

    {mode === 'gestione' && <div className="imp-manage">
      <p className="imp-readonly" role="note">SEZIONE GESTIONE · SOLA LETTURA · nessuna comunicazione inviata, nessun dato salvato o modificato.</p>
      <div className="imp-kpis"><span><b>{toVerify(calendario.events).length}</b> ora/sede da confermare</span><span><b>{facility}</b> verifiche impianto</span></div>
      <h3>Prossime gare dal {fmt(SNAPSHOT_DATE, { day: 'numeric', month: 'short' })}</h3>
      {next.length ? <ol className="imp-events">{next.map(e => <EventCard key={e.id} e={e} manage />)}</ol> : <p className="imp-empty" role="status">Nessuna gara imminente per il filtro.</p>}
      <h3>Da confermare ora/sede ({verify.length})</h3>
      {verify.length ? <details open={verify.length <= 8}><summary>Mostra elenco</summary><ol className="imp-events">{verify.map(e => <EventCard key={e.id} e={e} manage />)}</ol></details> : <p className="imp-empty" role="status">Nessun evento da confermare per il filtro.</p>}
    </div>}

    {mode === 'stagione' && (months.length === 0 ? <p className="imp-empty" role="status">Nessun evento per il filtro selezionato.</p> :
      <div className="imp-season">{months.map(([m, evs], i) => <details key={m} open={i === 0}>
        <summary><strong>{fmt(m + '-01', { month: 'long', year: 'numeric' })}</strong><span>{evs.length} eventi · {evs.filter(e => e.home_away === 'CASA').length} casa</span></summary>
        <ol className="imp-events">{evs.map(e => <EventCard key={e.id} e={e} />)}</ol>
      </details>)}</div>)}

    {(mode === 'settimana' || mode === 'mese') && <>
      <div className="imp-period">
        <button aria-label="Periodo precedente" onClick={() => setF({ ...f, anchor: shiftAnchor(f.anchor, f.view, -1) })}><ChevronLeft size={18} /></button>
        <strong aria-live="polite">{f.view === 'mese' ? fmt(from, { month: 'long', year: 'numeric' }) : `${fmt(from, { day: 'numeric', month: 'short' })} – ${fmt(to, { day: 'numeric', month: 'short', year: 'numeric' })}`}</strong>
        <button aria-label="Periodo successivo" onClick={() => setF({ ...f, anchor: shiftAnchor(f.anchor, f.view, 1) })}><ChevronRight size={18} /></button>
      </div>
      {list.length === 0 ? <p className="imp-empty" role="status">Nessun evento nel periodo e filtro selezionati.</p> : <ol className="imp-events">{list.map(e => <EventCard key={e.id} e={e} />)}</ol>}
    </>}

    <p className="imp-hint">Pulmini: {calendario.transport.confirmed_trips} corse confermate · Spogliatoi: {calendario.facilities.allocations}. {calendario.facilities.reference}.</p>
    <p className="imp-hint">Master Calendario, Quadro e Rotazione: consultabili solo dal Drive SCD con accesso autorizzato; nessun collegamento diretto da questa vista. Impronta snapshot: {calendario.source_sha256?.slice(0, 12) ?? '—'}…</p>
  </section>;
}
