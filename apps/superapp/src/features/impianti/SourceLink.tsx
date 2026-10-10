import { ExternalLink } from 'lucide-react';
import { sources, type SourceKey } from './sources';

export function SourceLink({ k }: { k: SourceKey }) {
  const s = sources[k];
  return <a className="imp-src" href={s.url} target="_blank" rel="noopener noreferrer"><span><b>{s.label}</b><small>{s.kind} · {s.role}</small></span><ExternalLink size={16} aria-label="apre in nuova scheda" /></a>;
}

export function Watermark({ text }: { text: string }) {
  return <p className="imp-watermark" role="note">{text}</p>;
}
