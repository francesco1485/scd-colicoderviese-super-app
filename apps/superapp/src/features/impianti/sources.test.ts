import { describe, expect, test } from 'vitest';
import { fields, steps, sources, documents, activeCategoriesExclude } from './sources';

describe('Impianti e Calendari', () => {
  test('tre campi canonici', () => expect(fields.map(f => f.id)).toEqual(['colico-1', 'colico-2', 'dervio']));
  test('Campo 2 Colico: gare ufficiali non automatiche', () => expect(fields[1].rule).toContain('NON automatiche'));
  test('flusso decisionale in quattro stati ordinati', () => expect(steps.map(s => s.id)).toEqual(['PROPOSTA', 'RESPONSABILE', 'FORMALIZZAZIONE', 'CALENDARIO']));
  test('fonti citate per nome, nessun link ai master nel bundle pubblico', () => Object.values(sources).forEach(s => { expect(s.url).toBeNull(); expect(s.label.length).toBeGreaterThan(3); }));
  test('documenti puntano a fonti esistenti', () => documents.forEach(d => expect(sources[d.source]).toBeDefined()));
  test('U18 esclusa', () => expect(activeCategoriesExclude).toContain('U18'));
});
