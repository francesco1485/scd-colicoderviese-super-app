/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import { quadro, calendario, trasporti, filterEvents, slotsForDay, rotationFor, roomsFor, logoFor, rangeOf, shiftAnchor, mondayOf, activeEvents, coreSteps, rubricaGroups, ROOMS } from './snapshot';
import { sources } from './sources';

describe('Snapshot Quadro', () => {
  test('15 fasce solo lun-ven', () => {
    expect(quadro.slots.length).toBe(15);
    expect(quadro.days).toEqual(['LUNEDÌ', 'MARTEDÌ', 'MERCOLEDÌ', 'GIOVEDÌ', 'VENERDÌ']);
    quadro.slots.forEach(s => expect(quadro.days).toContain(s.day));
  });
  test('19 rotazioni e 78 assegnazioni spogliatoi solo SP1-SP4', () => {
    expect(quadro.rotations.length).toBe(19);
    expect(quadro.rooms.length).toBe(78);
    quadro.rooms.forEach(r => expect(ROOMS).toContain(r.id));
  });
  test('lunedì 17:20 settimana A: zone e spogliatoi dalla fonte', () => {
    const s = slotsForDay(quadro, 'LUNEDÌ')[0]!;
    expect(s.timeLabel).toBe('17:20–18:50');
    expect(rotationFor(quadro, 'LUNEDÌ', 'A', s.start)?.zones.C1_A).toBe('U15 2012/13');
    expect(roomsFor(quadro, 'LUNEDÌ', 'A', s.start).find(r => r.id === 'SP1')?.group).toBe('U15');
  });
  test('nessun pulmino confermato', () => expect(trasporti.services.length).toBe(0));
  test('logo annata solo se riconosciuto', () => {
    expect(logoFor('U15 2012/13')).toBe('/scd-preview/SCD_U15_2012_2013.png');
    expect(logoFor('Testo libero')).toBeNull();
  });
});

describe('Snapshot Calendario', () => {
  test('156 eventi 2026/27 non live', () => {
    expect(calendario.events.length).toBe(156);
    expect(calendario.season).toBe('2026/27');
    expect(calendario.snapshot_status).toMatch(/^ANTEPRIMA_NON_LIVE/);
  });
  test('U18 esclusa dagli eventi attivi', () => activeEvents(calendario.events).forEach(e => expect(e.category).not.toMatch(/U18/)));
  test('filtro casa restituisce solo CASA', () => {
    const r = filterEvents(calendario.events, { group: 'tutte', homeAway: 'CASA', view: 'mese', anchor: '2026-10-01' });
    expect(r.length).toBeGreaterThan(0);
    r.forEach(e => { expect(e.home_away).toBe('CASA'); expect(e.date.startsWith('2026-10')).toBe(true); });
  });
  test('filtro categoria', () => {
    const r = filterEvents(calendario.events, { group: 'prima', homeAway: 'TUTTE', view: 'mese', anchor: '2026-10-01' });
    r.forEach(e => expect(e.group).toBe('prima'));
  });
  test('settimana lun-dom e navigazione', () => {
    expect(mondayOf('2026-10-09')).toBe('2026-10-05');
    expect(rangeOf({ view: 'settimana', anchor: '2026-10-05' })).toEqual(['2026-10-05', '2026-10-11']);
    expect(shiftAnchor('2026-10-05', 'settimana', 1)).toBe('2026-10-12');
    expect(rangeOf({ view: 'mese', anchor: '2027-02-01' })).toEqual(['2027-02-01', '2027-02-28']);
  });
  test('nessuna email o telefono nei dati', () => {
    const s = JSON.stringify([quadro, calendario, trasporti]);
    expect(s).not.toMatch(/[\w.-]+@[\w-]+\.[a-z]{2,}/i);
    expect(s).not.toMatch(/\+39|\b3\d{2}[ ]?\d{6,7}\b/);
  });
});

describe('Processo e rubrica', () => {
  test('quattro passaggi CORE', () => expect([...coreSteps]).toEqual(['Bozza', 'Controllo campi/spogliatoi', 'Approvazione', 'Pubblicazione']));
  test('quattro gruppi rubrica', () => expect([...rubricaGroups]).toEqual(['Dirigenza', 'Responsabili e coordinatori', 'Staff e dirigenti', 'Personale struttura']));
  test('Rotazione distinta da Quadro e Calendario', () => {
    expect(sources.rotazione.url).not.toBe(sources.quadro.url);
    expect(sources.rotazione.url).not.toBe(sources.calendarioEventi.url);
  });
});

import { annateFrom, quadroTexts, slotHasAnnata, seasonByMonth, validateDraft, isInactive } from './snapshot';
describe('Rifinitura 2', () => {
  test('annate derivate solo da testi presenti', () => {
    const texts = quadroTexts(quadro);
    const a = annateFrom(quadro);
    expect(a.map(x => x.id)).toContain('u12');
    a.forEach(x => expect(texts.some(t => x.re.test(t))).toBe(true));
  });
  test('U12 2015 lunedì 17:20 settimana A presente', () => {
    const u12 = annateFrom(quadro).find(a => a.id === 'u12')!;
    const s = quadro.slots.find(x => x.day === 'LUNEDÌ' && x.timeLabel === '17:20–18:50')!;
    expect(slotHasAnnata(quadro, s, 'A', u12)).toBe(true);
  });
  test('stagione: mesi ordinati, totale = eventi attivi', () => {
    const m = seasonByMonth(calendario.events, 'tutte', 'TUTTE');
    const keys = m.map(([k]) => k);
    expect([...keys].sort()).toEqual(keys);
    expect(m.reduce((n, [, e]) => n + e.length, 0)).toBe(calendario.events.filter(e => !isInactive(e)).length);
  });
  test('evento ritirato non attivo', () => {
    const e = { ...calendario.events[0]!, match_status: 'RITIRATO' };
    expect(isInactive(e)).toBe(true);
    expect(seasonByMonth([e], 'tutte', 'TUTTE').length).toBe(0);
  });
  test('validazione bozza segnala i campi mancanti', () => {
    expect(validateDraft({ fonte: '', data: '', ora: '', annata: '', campo: '', motivo: '' })).toEqual(['Fonte', 'Data', 'Ora', 'Annata', 'Campo proposto', 'Motivo (almeno 10 caratteri)']);
    expect(validateDraft({ fonte: 'Quadro', data: '2026-10-12', ora: '17:20', annata: 'U12 · 2015', campo: 'Colico Campo 2', motivo: 'Campo 1 in manutenzione' })).toEqual([]);
  });
});

import { isProvisional, needsFacility } from './snapshot';
describe('Hotfix verifiche calendario', () => {
  test('31 orario/sede da confermare', () => expect(calendario.events.filter(isProvisional).length).toBe(31));
  test('14 risorsa impianto da verificare', () => expect(calendario.events.filter(needsFacility).length).toBe(14));
  test('ogni evento ha verification', () => calendario.events.forEach(e => expect(e.verification).toBeDefined()));
  test('Penta Piateda 11/10 14:30 in annata 2015', () => {
    const e = calendario.events.find(x => x.id === 'EVT-ES-20261011-PENTAPIATEDA-CASA')!;
    expect(e.group).toBe('2015'); expect(e.date).toBe('2026-10-11'); expect(e.time).toBe('14:30');
    expect(filterEvents(calendario.events, { group: '2015', homeAway: 'TUTTE', view: 'settimana', anchor: '2026-10-05' }).map(x => x.id)).toContain(e.id);
  });
  test('nessun codice interno', () => expect(JSON.stringify(calendario)).not.toMatch(/BLOCKED_CONFLICT/));
});

import { segmentSlots, rotationsOverlappingSlot, normGroup } from './snapshot';
describe('Fasi orarie per intersezione', () => {
  const sl = (d: string, l: string) => quadro.slots.find(s => s.day === d && s.timeLabel === l)!;
  const labels = (d: any, w: any, l: string) => segmentSlots(quadro, d, w, sl(d, l)).map(g => g.label);
  test('conteggi invariati', () => { expect(quadro.slots.length).toBe(15); expect(quadro.rotations.length).toBe(19); expect(quadro.rooms.length).toBe(78); });
  test('LUN A 19:00-20:20', () => expect(labels('LUNEDÌ', 'A', '19:00–20:20')).toEqual(['19:00–20:10', '20:10–20:20']));
  test('LUN B 19:00-20:20: prima fase senza zone, non riempita da A', () => {
    const g = segmentSlots(quadro, 'LUNEDÌ', 'B', sl('LUNEDÌ', '19:00–20:20'));
    expect(g.map(x => x.label)).toEqual(['19:00–20:10', '20:10–20:20']);
    expect(g[0]!.rotations.length).toBe(0);
    expect(g[1]!.zones.C1_A.values).toEqual(['U16 — attivazione']);
  });
  test('LUN 20:10-21:20 A e B', () => { for (const w of ['A', 'B'] as const) expect(labels('LUNEDÌ', w, '20:10–21:20')).toEqual(['20:10–20:20', '20:20–21:20']); });
  test('GIO B 18:00-19:30: due righe attive nella fase finale', () => {
    const g = segmentSlots(quadro, 'GIOVEDÌ', 'B', sl('GIOVEDÌ', '18:00–19:30'));
    expect(g.map(x => x.label)).toEqual(['18:00–19:00', '19:00–19:30']);
    expect(g[1]!.rotations.length).toBe(2);
    expect(g[1]!.zones.C1_A.values).toEqual(['U13', 'U13 — chiusura']);
    expect(g[1]!.zones.C1_A.conflict).toBe(false);
    expect(g[1]!.zones.C1_C.conflict).toBe(true);
  });
  test('normalizzazione suffissi', () => { expect(normGroup('Piccoli Amici fino 19:00')).toBe('piccoli amici'); expect(normGroup('U13 — chiusura')).toBe('u13'); });
  test('rotazioni per intersezione half-open', () => expect(rotationsOverlappingSlot(quadro, 'LUNEDÌ', 'A', 1210, 1280).map(r => r.start)).toEqual([1210, 1220]));
  test('spogliatoi per intersezione', () => expect(segmentSlots(quadro, 'LUNEDÌ', 'A', sl('LUNEDÌ', '20:10–21:20'))[0]!.rooms.SP4.values).toEqual(['U16']));
  const sessions = (id: string) => { const a = annateFrom(quadro).find(x => x.id === id)!; return (['A', 'B'] as const).map(w => quadro.slots.filter(s => slotHasAnnata(quadro, s, w, a)).map(s => `${s.day.slice(0, 3)} ${s.timeLabel}`)); };
  const only = (id: string, exp: string[]) => sessions(id).forEach(r => expect(r).toEqual(exp));
  test('U16 solo 20:10–21:20 lun/mer/ven', () => only('u16', ['LUN 20:10–21:20', 'MER 20:10–21:20', 'VEN 20:10–21:20']));
  test('U13 solo mar 18:00–19:20 e gio 18:00–19:30', () => only('u13', ['MAR 18:00–19:20', 'GIO 18:00–19:30']));
  test('Prima Squadra solo mar/gio 19:00–21:00 e ven 19:00–20:30', () => only('prima', ['MAR 19:00–21:00', 'GIO 19:00–21:00', 'VEN 19:00–20:30']));
  test('U12 2015 lun e mer 17:20–18:50', () => only('u12', ['LUN 17:20–18:50', 'MER 17:20–18:50']));
  test('transizioni ancora visibili nella sessione U16', () => expect(segmentSlots(quadro, 'LUNEDÌ', 'A', sl('LUNEDÌ', '20:10–21:20')).map(g => g.label)).toEqual(['20:10–20:20', '20:20–21:20']));
});

import { upcoming as _up, toVerify as _tv } from './snapshot';
import rc3 from './data/calendario_pubblico.json';
describe('RC3 calendario gestione', () => {
  test('revisione RC3, 156 id unici', () => {
    expect((rc3 as { projection_revision: string }).projection_revision).toBe('RC3_MOBILE_20261009');
    expect(new Set(calendario.events.map(e => e.id)).size).toBe(156);
  });
  test('31 da confermare in Gestione, nessuno marcato confermato', () => {
    const v = _tv(calendario.events);
    expect(v.length).toBe(31);
    expect(v.every(e => !e.verification!.time_confirmed || !e.verification!.venue_confirmed)).toBe(true);
  });
  test('prossime gare ordinate dalla data snapshot', () => {
    const n = _up(calendario.events, '2026-10-09', 5);
    expect(n.length).toBe(5);
    expect(n.every(e => e.date >= '2026-10-09')).toBe(true);
    expect([...n].map(e => e.date + e.time)).toEqual([...n].map(e => e.date + e.time).sort());
  });
  test('nessun contatto personale nel calendario', () => {
    const s = JSON.stringify(rc3);
    expect(s).not.toMatch(/@[a-z0-9-]+\.[a-z]/i);
    expect(s.replace(/[a-f0-9]{64}/g, '')).not.toMatch(/\+?\d[\d ]{8,}\d/);
  });
});
