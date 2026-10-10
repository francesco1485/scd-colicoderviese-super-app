import { useMemo, useState } from 'react';
import { quadro, trasporti, slotsForDay, segmentSlots, type ZoneCell, logoFor, ROOMS, SNAPSHOT_WATERMARK, annateFrom, matchesAnnata, slotHasAnnata, type Annata, type Day, type Week, type ZoneKey } from './snapshot';
import { SourceLink, Watermark } from './SourceLink';

function Tag({ label, hit }: { label?: string | undefined; hit?: boolean }) {
  if (!label) return <span className="imp-zone-empty">Libero / non indicato</span>;
  const logo = logoFor(label);
  return <span className={`imp-tag ${hit ? 'is-hit' : ''}`}>{logo && <img src={logo} alt="" width={28} height={28} loading="lazy" />}<span>{label}</span>{hit && <b className="imp-hit-mark">ANNATA</b>}</span>;
}

function Cell({ c, hit }: { c: ZoneCell; hit: (t: string | undefined) => boolean }) {
  if (c.values.length === 0) return <Tag />;
  return <>{c.values.map(v => <Tag key={v} label={v} hit={hit(v)} />)}{c.conflict ? <b className="imp-check">{c.values.length} ASSEGNAZIONI ALLA FONTE, DA VERIFICARE</b> : null}</>;
}

const Z = (k: ZoneKey) => k.split('_')[1];

export function QuadroAllenamenti() {
  const annate = useMemo(() => annateFrom(quadro), []);
  const [day, setDay] = useState<Day>(quadro.days[0] ?? 'LUNEDÌ');
  const [week, setWeek] = useState<Week>('A');
  const [annataId, setAnnataId] = useState('tutte');
  const annata: Annata | undefined = annate.find(a => a.id === annataId);
  const all = slotsForDay(quadro, day);
  const slots = annata ? all.filter(s => slotHasAnnata(quadro, s, week, annata)) : all;
  const [slotStart, setSlotStart] = useState<number | null>(null);
  const slot = slots.find(s => s.start === slotStart) ?? slots[0];
  const segs = slot ? segmentSlots(quadro, day, week, slot) : [];
  const [segIdx, setSegIdx] = useState(0);
  const seg = segs[Math.min(segIdx, segs.length - 1)];
  const rot = seg && seg.rotations.length > 0 ? seg : undefined;
  const hit = (t: string | undefined) => matchesAnnata(t, annata);
  const annataLogo = annata ? logoFor(annata.label) : null;

  return <section aria-labelledby="h-quadro">
    <Watermark text={SNAPSHOT_WATERMARK} />
    <h2 id="h-quadro">Quadro Allenamenti · lun–ven</h2>
    <p className="imp-lead">{quadro.slots.length} fasce, {quadro.rotations.length} rotazioni e {quadro.rooms.length} assegnazioni spogliatoi dal pacchetto pubblico di prova. {quadro.note}</p>

    <label className="imp-select imp-annata">Trova annata / categoria
      <select value={annataId} onChange={e => { setAnnataId(e.target.value); setSlotStart(null); setSegIdx(0); }}>
        <option value="tutte">Tutte le annate</option>
        {annate.map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
      </select>
    </label>
    {annata && annataLogo && <p className="imp-annata-badge"><img src={annataLogo} alt="" width={32} height={32} />{annata.label}</p>}

    <div className="imp-filter" role="group" aria-label="Giorno">{quadro.days.map(d => <button key={d} aria-pressed={d === day} onClick={() => { setDay(d); setSlotStart(null); setSegIdx(0); }}>{d.slice(0, 3)}</button>)}</div>
    <div className="imp-filter" role="group" aria-label="Settimana A/B (selezione manuale)">
      {(['A', 'B'] as const).map(w => <button key={w} aria-pressed={w === week} onClick={() => { setWeek(w); setSlotStart(null); setSegIdx(0); }}>Settimana {w}</button>)}
      <span className="imp-hint">Data di inizio A/B non accertata: selezione manuale</span>
    </div>

    {slots.length === 0 ? <p className="imp-empty" role="status">Nessun allenamento per questa annata nel giorno ({day}, settimana {week}).</p> : <>
    <div className="imp-slots" role="group" aria-label="Fasce orarie">
      {slots.map(s => <button key={s.start} aria-pressed={slot?.start === s.start} onClick={() => { setSlotStart(s.start); setSegIdx(0); }}><b>{s.timeLabel}</b><small>C1 · {s.fields.C1.split('\n')[0]}</small></button>)}
    </div>

    {slot && segs.length > 0 && <div className="imp-filter imp-phases" role="group" aria-label={`Fasi orarie ${slot.timeLabel}`}>
      {segs.map((g, i) => <button key={g.start} aria-pressed={g === seg} onClick={() => setSegIdx(i)}><b>{g.label}</b>{g.rotations.length === 0 ? <small> ZONE NON DEFINITE</small> : g.rotations.length > 1 ? <small> {g.rotations.length} righe attive</small> : null}</button>)}
    </div>}
    {slot && seg && <div className="imp-quadro-grid">
      <figure className="imp-pitch2d" aria-label={`Schema campi ${day} ${slot.timeLabel}, non in scala`}>
        <figcaption>SCHEMA NON IN SCALA · zone tecniche A/B/C senza confini certificati</figcaption>
        <div className="imp-field2d"><h3>Colico Campo 2</h3>
          {rot ? <div className="imp-zones">{(['C2_A', 'C2_B'] as const).map(k => <div key={k} className="imp-zone"><i>Zona {Z(k)}</i><Cell c={rot.zones[k]} hit={hit} /></div>)}</div> : <p className="imp-zone-text">{slot.fields.C2}</p>}
        </div>
        <div className="imp-field2d"><h3>Colico Campo 1</h3>
          {rot ? <div className="imp-zones">{(['C1_A', 'C1_B', 'C1_C'] as const).map(k => <div key={k} className="imp-zone"><i>Zona {Z(k)}</i><Cell c={rot.zones[k]} hit={hit} /></div>)}</div> : <p className="imp-zone-text">{slot.fields.C1}</p>}
        </div>
        <div className="imp-rooms" aria-label="Spogliatoi SP1–SP4">
          {ROOMS.map(id => { const c = seg.rooms[id]; return <div key={id} className="imp-room"><i>{id}</i>{c.values.length ? <Cell c={c} hit={hit} /> : <Tag label={slot.rooms[id]} hit={hit(slot.rooms[id])} />}</div>; })}
        </div>
        {!rot && <p className="imp-hint" role="status">ZONE NON DEFINITE nella fonte per settimana {week} in {seg.label}: dato incompleto, non completato con l'altra settimana. Mostrato il testo del Quadro.</p>}
      </figure>
      <aside className="imp-side">
        <h3>Pulmini</h3>
        <p><b>{trasporti.services.length}</b> corse confermate.</p>
        <p className="imp-hint">{trasporti.note}</p>
        <figure className="imp-plan"><img src="/scd-preview/planimetria_colico.webp" alt="Planimetria Colico dal pacchetto di prova" loading="lazy" /><figcaption>Planimetria dal pacchetto di prova · zone non certificate</figcaption></figure>
        <div className="imp-srcs"><SourceLink k="quadro" /><SourceLink k="pulmini" /><SourceLink k="zipQuadro" /></div>
      </aside>
    </div>}
    </>}
  </section>;
}
