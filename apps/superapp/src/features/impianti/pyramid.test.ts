import { describe, expect, test } from 'vitest';
import { rubricaGroups } from './snapshot';
import { pyramidInfo } from './RotazioneResponsabili';

describe('Piramide referenti', () => {
  test('4 gruppi esatti in ordine', () => expect([...rubricaGroups]).toEqual(['Dirigenza', 'Responsabili e coordinatori', 'Staff e dirigenti', 'Personale struttura']));
  test('descrizioni senza PII', () => {
    const t = JSON.stringify(pyramidInfo);
    expect(Object.keys(pyramidInfo)).toEqual([...rubricaGroups]);
    expect(/@|\\d{6,}|€|tel:|mailto:/i.test(t)).toBe(false);
  });
});
