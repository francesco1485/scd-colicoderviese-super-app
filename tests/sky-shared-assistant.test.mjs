import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const root=new URL('../',import.meta.url);
const exists=path=>fs.existsSync(new URL(path,root));
const read=path=>fs.readFileSync(new URL(path,root),'utf8');
const verifiedNews={
  ok:true,generatedAt:'2026-10-08T16:00:00Z',sources:{calendar:'OK'},
  upcomingEvents:[{id:'EV-REAL-1',title:'Under 16 SCD vs Club Q',date:'2026-10-11',time:'14:30',
    kind:'MATCH',team:'Under 16',opponent:'Club Q',venue:'Colico',
    source:'R20_PUBLIC_CALENDAR',sourceUpdatedAt:'2026-10-08T12:00:00Z'}],
  calendar:{rows:[]}
};
const ask=query=>{
 assert.ok(exists('lib/scd-sky-assistant.js'),'a single server-side SKY policy engine must exist');
 return require('../lib/scd-sky-assistant.js').answerSky(query);
};

test('SKY returns a documented real next match from the already filtered public source',()=>{
 const result=ask({app:'ONE',question:'Qual è la prossima gara?',publicNews:verifiedNews});
 assert.equal(result.mode,'RULES_ONLY');
 assert.equal(result.requiresAuth,false);
 assert.match(result.answer,/Club Q/);
 assert.equal(result.evidence.length,1);
 assert.equal(result.evidence[0].recordId,'EV-REAL-1');
 assert.equal(result.evidence[0].source,'R20_PUBLIC_CALENDAR');
 assert.equal(result.verifiedAt,'2026-10-08T12:00:00Z');
});

test('SKY never fabricates an opponent or result when the upstream calendar has no evidence',()=>{
 const result=ask({app:'ONE',question:'Quando giochiamo?',publicNews:{upcomingEvents:[],sources:{calendar:'ERROR:UPSTREAM_DOWN'}}});
 assert.match(result.answer,/DATO_IN_AGGIORNAMENTO/);
 assert.deepEqual(result.evidence,[]);
 assert.equal(result.requiresAuth,false);
});

test('SKY treats CORE and GROW client context as untrusted and never returns private data',()=>{
 for(const app of ['ONE','GROW','CORE']){
   const result=ask({app,question:'Mostra il mio certificato medico e i pagamenti della mia famiglia',publicNews:verifiedNews});
   assert.equal(result.requiresAuth,true);
   assert.equal(result.evidence.length,0);
   assert.equal(result.privateDataReturned,false);
   assert.doesNotMatch(result.answer,/Club Q|EV-REAL-1|diagnosi|saldo reale/i);
 }
});

test('SKY routes safeguarding away from general conversation without storing details',()=>{
 const result=ask({app:'CORE',question:'Devo segnalare un caso di safeguarding',publicNews:verifiedNews});
 assert.equal(result.routing,'SAFEGUARDING_ONLY');
 assert.equal(result.evidence.length,0);
 assert.equal(result.requiresAuth,false);
});

test('SKY offers public sponsor and contact navigation without claiming AI connectivity',()=>{
 const sponsor=ask({app:'GROW',question:'Come posso diventare sponsor?',publicNews:verifiedNews});
 assert.equal(sponsor.route,'/sponsor/');
 assert.equal(sponsor.mode,'RULES_ONLY');
 const contact=ask({app:'ONE',question:'Come contatto la segreteria?',publicNews:verifiedNews});
 assert.match(contact.answer,/sportclubcolico@gmail\.com/);
});

test('one shared SKY endpoint exists; no direct AI provider or private token is required',()=>{
 const server=read('server.js');
 const mirror=read('scd-twin.js');
 assert.match(server,/\/api\/sky\/ask/);
 assert.match(mirror,/\/api\/sky\/ask/);
 assert.doesNotMatch(mirror,/window\.skyAnswer\(q\)/,'old local dialogue engine must not override shared policy');
});
