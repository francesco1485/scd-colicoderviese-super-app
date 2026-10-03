import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require=createRequire(import.meta.url);
const pulse=require('../lib/scd-one-pulse.js');
const now=new Date('2026-10-03T12:00:00+02:00');
const rows=[
  {id:'today',date:'2026-10-03',time:'13:00',kind:'MATCH',team:'SCD',source:'R20'},
  {id:'next',date:'2026-10-04',time:'10:00',kind:'EVENT',team:'SCD',source:'R20'},
  {id:'invalid',date:'non verificata',team:'SCD'}
];

assert.deepEqual(pulse.summarize(rows,now).today.map(row=>row.id),['today']);
assert.equal(pulse.summarize(rows,now).next.id,'today');
assert.equal(pulse.summarize([{id:'past',date:'2026-10-03',time:'11:00'},rows[1]],now).next.id,'next');
assert.equal(pulse.summarize([{id:'with-seconds',date:'2026-10-03',time:'13:00:00'}],now).next.id,'with-seconds');
assert.equal(pulse.compare(null,rows),null);
assert.equal(pulse.compare(rows,rows),0);
assert.equal(pulse.compare(rows,[{...rows[0],time:'14:00'},rows[1]]),1);
assert.equal(pulse.compare(rows,[rows[1]]),1);
assert.equal(pulse.summarize([],now).next,null);
assert.deepEqual(pulse.weekRange(new Date('2026-10-03T12:00:00+02:00')),{start:'2026-10-02',end:'2026-10-09'});
assert.deepEqual(pulse.weekRange(new Date('2026-10-01T23:30:00-04:00')),{start:'2026-10-02',end:'2026-10-09'});
console.log('SCD ONE PULSE CONTRACT OK');
