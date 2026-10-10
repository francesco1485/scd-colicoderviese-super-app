/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import { calendario } from './snapshot';
import { romeToday, nextForGroup, trainingsForGroup, sectorEvents, activeGroups, PERIODS, addDays, possibleOverlaps, familyLink } from './teamSector';

const TODAY = romeToday(new Date('2026-10-09T16:00:00Z'));

describe('La mia squadra / Il mio settore', () => {
  test('156 ID unici invariati', () => {
    const ids = calendario.events.map(e => e.id);
    expect(ids.length).toBe(156);
    expect(new Set(ids).size).toBe(156);
  });
  test('data Roma 9/10/2026', () => expect(TODAY).toBe('2026-10-09'));
  test('annata 2015: prima gara Penta Piateda 11/10 14:30', () => {
    const n = nextForGroup(calendario.events, '2015', TODAY);
    expect(n.length).toBe(5);
    expect(n[0]!.id).toBe('EVT-ES-20261011-PENTAPIATEDA-CASA');
    expect(n[0]!.time).toBe('14:30');
  });
  test('U16: tre allenamenti lun/mer/ven 20:10–21:20, nessuna fascia altrui', () => {
    const t = trainingsForGroup('u16')!;
    expect(t.map(s => `${s.day} ${s.timeLabel}`)).toEqual(['LUNEDÌ 20:10–21:20', 'MERCOLEDÌ 20:10–21:20', 'VENERDÌ 20:10–21:20']);
  });
  test('U12 2015 solo lun/mer 17:20; 2014 non collegato', () => {
    expect(trainingsForGroup('2015')!.map(s => s.day)).toEqual(['LUNEDÌ', 'MERCOLEDÌ']);
    expect(trainingsForGroup('2014')).toBeNull();
  });
  test('filtri periodo 7/15/30/60/180 restano nella finestra', () => {
    let prev = -1;
    PERIODS.forEach(p => {
      const ev = sectorEvents(calendario.events, { groups: [], days: p, homeAway: 'TUTTE', from: TODAY });
      ev.forEach(e => { expect(e.date >= TODAY).toBe(true); expect(e.date <= addDays(TODAY, p - 1)).toBe(true); });
      expect(ev.length >= prev).toBe(true); prev = ev.length;
    });
  });
  test('gruppi attivi senza U18; contemporaneità solo stessa data/sede', () => {
    expect(activeGroups(calendario.events).some(g => /u18/i.test(g))).toBe(false);
    possibleOverlaps(calendario.events).forEach(([a, b]) => { expect(a.date).toBe(b.date); expect(a.venue).toBe(b.venue); });
  });
  test('link famiglie: 2015, 2011, Prima senza annata', () => {
    const L = (g: string) => familyLink(calendario.groups[g]!.label);
    expect(L('2015')).toBe('https://scd-colicoderviese-super-app.lovable.app/calendario?annata=2015');
    expect(L('u16')).toBe('https://scd-colicoderviese-super-app.lovable.app/calendario?annata=2011');
    expect(L('prima')).toBe('https://scd-colicoderviese-super-app.lovable.app/calendario');
  });
  test('nessun dato privato nello snapshot', () => {
    const s = JSON.stringify(calendario);
    expect(/@[a-z0-9-]+\.[a-z]/i.test(s)).toBe(false);
    expect(/\+?39\s?\d{6,}|\b3\d{2}[\s.]?\d{6,7}\b/.test(s)).toBe(false);
  });
});
