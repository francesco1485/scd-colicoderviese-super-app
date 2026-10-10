import { describe, expect, test } from 'vitest';
import { visionData, visionScreens } from './screens';

// Porting bun:test -> vitest delle invarianti Lovable (Command Center ed6cd65).
describe('SCD Vision 2026 staging invariants', () => {
  test('nessun dato privato', () => {
    for (const key of ['fixtures', 'athletes', 'families', 'payments', 'documents', 'metrics', 'news', 'sponsors'] as const) expect(visionData[key]).toBeNull();
  });
  test('Sky non collegato', () => expect(visionData.assistantConnected).toBe(false));
  test('sei schermate', () => {
    expect(visionScreens.map(s => s.id)).toEqual(['home', 'calendar', 'athlete', 'family', 'staff', 'communications']);
  });
});
describe('UD-015 e GROW', () => {
  test('tre famiglie ONE/CORE/GROW', async () => {
    const { appFamilies } = await import('./screens');
    expect(appFamilies.map(a => a.name)).toEqual(['SCD ONE', 'SCD CORE', 'SCD GROW']);
  });
  test('demo senza dati reali: avversario e sede demo, metriche UNKNOWN', async () => {
    const { demo } = await import('./screens');
    expect(demo.opponent).toContain('DEMO');
    expect(demo.agenda.every(a => a.time === '--:--')).toBe(true);
    expect(JSON.stringify(demo)).not.toMatch(/@|\+39|\d{3}\s?\d{6,}/);
  });
});
