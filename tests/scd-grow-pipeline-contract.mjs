import '../sponsor/grow-pipeline.js';

const Grow=globalThis.ScdGrowPipeline;
function ok(condition,message){if(!condition)throw new Error(message)}

ok(Grow&&typeof Grow.build==='function','SCD GROW pipeline engine missing');
ok(JSON.stringify(Grow.STAGES)===JSON.stringify(['RESEARCH','VERIFY','QUALIFY','CONNECT','PROPOSE','ACTIVATE','PROVE','REPORT','RENEW','EXPAND']),'canonical growth stages mismatch');

const model=Grow.build([
  {id:'P1',name:'Prospect Uno',relationshipStatus:'PROSPECT',nextAction:'Verifica referente'},
  {id:'P2',name:'Azienda Due',relationshipStatus:'PROPOSTA INVIATA',nextDeadline:'2026-10-10'},
  {id:'P3',name:'Partner Tre',relationshipStatus:'ACCORDO FIRMATO'},
  {id:'P4',name:'Profilo Quattro',relationshipStatus:'STATO NON MAPPATO'},
  {id:'P5',name:'Profilo Bloccato',relationshipStatus:'LEAD',contactPolicy:'NO_CONTACT'}
],{sourceState:'VERIFIED',generatedAt:'2026-10-03T17:00:00Z'});

ok(model.stages.RESEARCH.some(x=>x.id==='P1'),'prospect must remain research, not sponsor');
ok(model.stages.PROPOSE.some(x=>x.id==='P2'),'proposal must remain proposal');
ok(model.stages.ACTIVATE.some(x=>x.id==='P3'),'signed agreement may enter activation');
ok(model.needsVerification.some(x=>x.id==='P4'),'unmapped source status must be flagged');
ok(model.blocked.some(x=>x.id==='P5'),'NO_CONTACT must remain blocked');
ok(model.queue.some(x=>x.id==='P1'),'explicit next action must enter queue');
ok(model.queue.some(x=>x.id==='P2'),'explicit deadline must enter queue');

const unavailable=Grow.build([{id:'X',name:'Fake',relationshipStatus:'SPONSOR'}],{sourceState:'UNAVAILABLE'});
ok(unavailable.queue.length===0,'unavailable CRM must not generate a fake pipeline');
ok(unavailable.counts.ACTIVATE===null,'unavailable source counts must not imply facts');

console.log('SCD GROW PIPELINE CONTRACT PASS');
