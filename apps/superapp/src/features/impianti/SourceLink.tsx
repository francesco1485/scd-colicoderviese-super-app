import { Lock } from 'lucide-react';
import { sources, RESERVED_SOURCE_NOTE, type SourceKey } from './sources';

export function SourceLink({ k }: { k: SourceKey }) {
  const s = sources[k];
  // Super App pubblica: nessun link ai master Google; solo nome della fonte.
  return <span className="imp-src imp-src-locked" title={RESERVED_SOURCE_NOTE}><span><b>{s.label}</b><small>{s.kind} · {s.role}</small></span><span className="imp-src-lock"><Lock size={14} aria-hidden="true" />{RESERVED_SOURCE_NOTE}</span></span>;
}

export function Watermark({ text }: { text: string }) {
  return <p className="imp-watermark" role="note">{text}</p>;
}
