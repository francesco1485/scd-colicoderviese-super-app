import { describe, expect, test } from 'vitest';
import { readFileSync } from 'node:fs';
import { DERVIO_ZONES } from './dervio';

const svg = readFileSync(new URL('./assets/dervio-plan.svg', import.meta.url), 'utf8');
const IDS = ['AT1', 'C1', 'AT2', 'TR', 'C2', 'BV1', 'BV2', 'SP1'];

describe('Navigatore Dervio', () => {
  test('8 data-zone esatte nello SVG e nell’elenco', () => {
    expect([...svg.matchAll(/data-zone="([^"]+)"/g)].map(m => m[1]).sort()).toEqual([...IDS].sort());
    expect(DERVIO_ZONES.map(z => z.id)).toEqual(IDS as never);
  });
  test('viewBox originale 1440 940', () => expect(svg).toContain('viewBox="0 0 1440 940"'));
  test('nessuno script, event handler, js o URL esterno', () => {
    expect(/<script|<foreignObject|javascript:/i.test(svg)).toBe(false);
    expect(/\son[a-z]+\s*=/i.test(svg)).toBe(false);
    expect(/href="(?!data:image\/(png|jpeg|webp);base64,|#)/.test(svg)).toBe(false);
  });
  test('nessun dato personale', () => {
    const t = svg.replace(/data:image[^"]+/g, '');
    expect(/[\w.]+@[\w-]+\.[a-z]/i.test(t)).toBe(false);
    expect(/\+39|\b3\d{2}[\s.]?\d{6,7}\b/.test(t)).toBe(false);
  });
});
