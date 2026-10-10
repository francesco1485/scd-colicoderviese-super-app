import { useMemo, useState } from 'react';
import { AlertTriangle, Bus, Home, Plane } from 'lucide-react';
import { calendario, verificationLabels, SNAPSHOT_WATERMARK, type CalEvent } from './snapshot';
import { activeGroups, nextForGroup, trainingsForGroup, fieldOf, yearOf, romeToday, sectorEvents, byDate, possibleOverlaps, familyLink, PERIODS, type Period, type SectorFilter } from './teamSector';
import { DERVIO_ZONES, DERVIO_STATUS, DERVIO_CAPTION, type DervioZoneId } from './dervio';
import dervioSvg from './assets/dervio-plan.svg?raw';
import { SourceLink, Watermark } from './SourceLink';

const groupLabel = (g: string) => calendario.groups[g]?.label ?? g;

function EventRow({ e }: { e: CalEvent }) {
  const warn = verificationLabels(e);
  return <li className="ts-ev">
    <div className="ts-ev-top"><b>{e.date.split('-').reverse().join('/')} · {e.time || 'ora n.d.'}</b>
      <span className={`ts-ha is-${e.home_away.toLowerCase()}`}>{e.home_away === 'CASA' ? <Home size={13} aria-hidden="true" /> : <Plane size={13} aria-hidden="true" />}{e.home_away === 'CASA' ? 'Casa' : 'Trasferta'}</span></div>
    <span>{groupLabel(e.group)} · vs {e.opponent || 'n.d.'}</span>
    <small>Sede: {e.venue || 'n.d.'}</small>
    {warn.map(w => <em key={w} className="ts-warn"><AlertTriangle size={13} aria-hidden="true" />{w}</em>)}
  </li>;
}

export function LaMiaSquadra() {
  const groups = useMemo(() => activeGroups(calendario.events), []);
  const [g, setG] = useState(groups.includes('2015') ? '2015' : groups[0] ?? '');
  const today = romeToday();
  const next = nextForGroup(calendario.events, g, today);
  const tr = trainingsForGroup(g);
  const year = yearOf(groupLabel(g));
  return <section aria-labelledby="h-team">
    <h2 id="h-team">La mia squadra</h2>
    <p className="imp-notsent" role="note">STAGING · SOLA CONSULTAZIONE</p>
    <Watermark text={SNAPSHOT_WATERMARK} />
    <label className="ts-select">Categoria<select value={g} onChange={e => setG(e.target.value)}>{groups.map(x => <option key={x} value={x}>{groupLabel(x)}</option>)}</select></label>
    <h3 className="imp-h3">Prossime 5 gare dal {today.split('-').reverse().join('/')}</h3>
    {next.length === 0 ? <p className="imp-empty" role="status">Nessuna gara futura nello snapshot.</p> : <ul className="ts-list">{next.map(e => <EventRow key={e.id} e={e} />)}</ul>}
    <h3 className="imp-h3">Allenamenti lun–ven (Quadro, campi C1/C2)</h3>
    {tr === null ? <p className="imp-empty" role="status">Quadro non collegato per questa categoria</p>
      : tr.length === 0 ? <p className="imp-empty" role="status">Nessuna fascia nel Quadro.</p>
      : <ul className="ts-train">{tr.map(s => <li key={s.sourceRow}><b>{s.day}</b> {s.timeLabel} · {fieldOf(s, g)}</li>)}</ul>}
    <div className="ts-public">
      <a className="imp-src" href={familyLink(groupLabel(g))}>Apri calendario famiglie (SCD ONE){year ? ` · annata ${year}` : ''}</a>
    </div>
    <p className="imp-hint">Nessun atleta, certificato, contatto o conteggio persone viene mostrato.</p>
  </section>;
}

export function IlMioSettore() {
  const groups = useMemo(() => activeGroups(calendario.events), []);
  const base: SectorFilter = { groups: [], days: 30, homeAway: 'TUTTE', from: romeToday() };
  const [f, setF] = useState<SectorFilter>(base);
  const [limit, setLimit] = useState(10);
  const evs = sectorEvents(calendario.events, f);
  const days = byDate(evs);
  const overlaps = possibleOverlaps(evs);
  const warnCount = evs.filter(e => verificationLabels(e).length > 0).length;
  const toggle = (g: string) => setF({ ...f, groups: f.groups.includes(g) ? f.groups.filter(x => x !== g) : [...f.groups, g] });
  return <section aria-labelledby="h-sector">
    <h2 id="h-sector">Il mio settore</h2>
    <p className="imp-notsent" role="note">STAGING · SOLA CONSULTAZIONE</p>
    <Watermark text={SNAPSHOT_WATERMARK} />
    <div className="imp-filter ts-wrap" role="group" aria-label="Gruppi">{groups.map(g => <button key={g} aria-pressed={f.groups.includes(g)} onClick={() => toggle(g)}>{groupLabel(g)}</button>)}</div>
    <div className="imp-filter ts-wrap" role="group" aria-label="Periodo">{PERIODS.map(p => <button key={p} aria-pressed={f.days === p} onClick={() => setF({ ...f, days: p as Period })}>{p === 7 ? 'Settimana' : `${p} giorni`}</button>)}</div>
    <div className="imp-filter ts-wrap" role="group" aria-label="Casa o trasferta">{(['TUTTE', 'CASA', 'FUORI'] as const).map(h => <button key={h} aria-pressed={f.homeAway === h} onClick={() => setF({ ...f, homeAway: h })}>{h === 'FUORI' ? 'Trasferta' : h === 'CASA' ? 'Casa' : 'Tutte'}</button>)}
      <button onClick={() => { setF(base); setLimit(10); }}>Azzera filtri</button></div>
    <p className="ts-sum" aria-live="polite"><b>{evs.length}</b> gare · <b>{warnCount}</b> con avvisi da confermare · <b>{overlaps.length}</b> possibili contemporaneità</p>
    {overlaps.length > 0 && <div className="ts-overlap" role="note"><b>Verifica necessaria</b> — stessa sede e orari vicini nello snapshot. Non è un errore: mancano assegnazioni C1/C2 e la Rotazione Annuale è fonte separata.
      <ul>{overlaps.slice(0, 5).map(([a, b]) => <li key={a.id + b.id}>{a.date.split('-').reverse().join('/')} · {a.venue}: {groupLabel(a.group)} {a.time} / {groupLabel(b.group)} {b.time}</li>)}</ul></div>}
    {days.length === 0 ? <p className="imp-empty" role="status">Nessuna gara nel periodo con questi filtri.</p> :
      <div className="ts-days">{days.slice(0, limit).map(([d, list]) => <article key={d} className="ts-day"><h3>{d.split('-').reverse().join('/')}</h3><ul className="ts-list">{list.map(e => <EventRow key={e.id} e={e} />)}</ul></article>)}</div>}
    {days.length > limit && <button className="ts-more" onClick={() => setLimit(limit + 10)}>Mostra altre ({days.length - limit} giornate)</button>}
  </section>;
}

export function DervioPulmini() {
  const [tab, setTab] = useState<'dervio' | 'pulmini'>('dervio');
  const [sel, setSel] = useState<DervioZoneId>('C1');
  const zone = DERVIO_ZONES.find(z => z.id === sel)!;
  return <section aria-labelledby="h-derv">
    <h2 id="h-derv">Dervio e Pulmini</h2>
    <p className="imp-notsent" role="note">STAGING · SOLA CONSULTAZIONE</p>
    <div className="imp-filter ts-wrap" role="tablist" aria-label="Sottosezioni">
      <button role="tab" aria-selected={tab === 'dervio'} aria-pressed={tab === 'dervio'} onClick={() => setTab('dervio')}>Dervio</button>
      <button role="tab" aria-selected={tab === 'pulmini'} aria-pressed={tab === 'pulmini'} onClick={() => setTab('pulmini')}>Pulmini</button>
    </div>
    {tab === 'dervio' ? <div role="tabpanel" aria-label="Dervio">
      <h3 className="imp-h3">Centro sportivo Dervio · fonte autonoma, dati non sincronizzati</h3>
      <figure className="dv-fig">
        <div className="dv-map" data-sel={sel} dangerouslySetInnerHTML={{ __html: dervioSvg }} />
        <figcaption>{DERVIO_CAPTION}</figcaption>
      </figure>
      <div className="imp-filter ts-wrap" role="group" aria-label="Zone">{DERVIO_ZONES.map(z => <button key={z.id} aria-pressed={sel === z.id} onClick={() => setSel(z.id)}>{z.id} · {z.label}</button>)}</div>
      <article className="ts-ev dv-card" aria-live="polite"><b>{zone.id} · {zone.label}</b>
        <ul>{zone.facts.map(f => <li key={f}>{f}</li>)}</ul>
        <em className="ts-warn">{DERVIO_STATUS}</em></article>
      <div className="imp-srcs"><SourceLink k="dervioNav" /><SourceLink k="dervioRegistro" /></div>
    </div> : <div role="tabpanel" aria-label="Pulmini">
      <h3 className="imp-h3"><Bus size={18} aria-hidden="true" /> Adesioni ≠ corse confermate</h3>
      <ul className="ts-train">
        <li><b>Adesione</b>: iscrizione al servizio registrata nel gestionale. Non equivale a un posto o a una corsa.</li>
        <li><b>Corsa confermata</b>: solo quella registrata nella fonte Flotta. Nello snapshot pubblico: nessuna corsa attiva confermata.</li>
      </ul>
      <p className="imp-lead">Capienza, posti, targhe, autisti, tratte e passeggeri non sono mostrati. La mappa posti 2D con i ragazzi richiede identità R20 e registri assegnazioni verificati.</p>
      <div className="imp-srcs"><SourceLink k="pulmini" /></div>
    </div>}
  </section>;
}
