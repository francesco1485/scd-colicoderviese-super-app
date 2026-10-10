/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import { fields, steps, sources, documents, activeCategoriesExclude } from './sources';

describe('Impianti e Calendari', () => {
  test('tre campi canonici', () => expect(fields.map(f => f.id)).toEqual(['colico-1', 'colico-2', 'dervio']));
  test('Campo 2 Colico: gare ufficiali non automatiche', () => expect(fields[1].rule).toContain('NON automatiche'));
  test('flusso decisionale in quattro stati ordinati', () => expect(steps.map(s => s.id)).toEqual(['PROPOSTA', 'RESPONSABILE', 'FORMALIZZAZIONE', 'CALENDARIO']));
  test('fonti solo Google originali', () => Object.values(sources).forEach(s => expect(s.url).toMatch(/^https:\/\/(docs|drive)\.google\.com\//)));
  test('documenti puntano a fonti esistenti', () => documents.forEach(d => expect(sources[d.source]).toBeDefined()));
  test('U18 esclusa', () => expect(activeCategoriesExclude).toContain('U18'));
});
