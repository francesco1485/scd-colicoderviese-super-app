import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const grow=require('../lib/sponsor-grow.js');
const app=fs.readFileSync(new URL('../sponsor/app.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../sponsor/app.html',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../sponsor/app.css',import.meta.url),'utf8');
const pkg=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));

const prospects=[
  {id:'CRM-1',name:'Azienda Lago',type:'PROSPECT',relationshipStatus:'CONTATTO IN CORSO',nextAction:'Rivedere proposta',nextDeadline:'2026-10-04'},
  {id:'CRM-2',name:'azienda  lago',type:'LEAD',relationshipStatus:'PROSPECT'},
  {id:'CRM-1',name:'Duplicato record',type:'PROSPECT'}
];
const dedup=grow.deduplicateRows(prospects);
assert.equal(dedup.rows.length,2,'canonical IDs deduplicate duplicate rows');
assert.equal(dedup.duplicateIds,1,'duplicate canonical IDs are counted');
assert.equal(dedup.possibleDuplicates.length,1,'same-name prospects with distinct IDs are flagged');
assert.deepEqual(dedup.possibleDuplicates[0].ids,['CRM-1','CRM-2']);
assert.equal(dedup.rows[0].name,'Azienda Lago','distinct canonical records are never merged');

const pipeline=grow.pipelineProjection([
  {id:'CRM-1',name:'Azienda Lago',type:'PROSPECT',relationshipStatus:'PROPOSAL'},
  {id:'CRM-2',name:'Impresa',pipelineStage:'PROPOSAL'}
]);
assert.equal(pipeline.unmapped,1,'relationship status is not silently mapped to a pipeline stage');
assert.equal(pipeline.stages.find(stage=>stage.id==='PROPOSAL').count,1,'only an explicit canonical stage is counted');
assert.equal(pipeline.unmappedRecords[0].relationshipStatus,'PROPOSAL','unmapped CRM relationship status remains visible as source data');
assert.deepEqual(grow.STAGES,['DISCOVER','VERIFY','QUALIFY','CONTACT','MEETING','PROPOSAL','NEGOTIATION','WON','LOST','ACTIVATE','PROVE','RENEW','EXPAND']);

const queue=grow.followUpQueue([
  {id:'CRM-1',name:'Azienda Lago',nextAction:'Rivedere proposta',nextDeadline:'2026-10-04',contactPolicy:'MANUALE'},
  {id:'CRM-2',name:'Nessuna scadenza',nextAction:'Verificare fonte'},
  {id:'CRM-3',name:'Nessuna azione',type:'PARTNER'}
],new Date('2026-10-05T12:00:00'));
assert.equal(queue.length,3,'relevant CRM records remain visible even when next-action data is missing');
assert.equal(queue[0].deadlineState,'OVERDUE','deadline state uses a recorded deadline');
const withAction=queue.find(item=>item.id==='CRM-2'),withoutAction=queue.find(item=>item.id==='CRM-3');
assert.equal(withAction.deadline,'','no reminder date is invented');
assert.equal(withAction.action,'Verificare fonte','recorded action text is preserved');
assert.equal(withAction.suggestion,'Verifica la relazione e definisci una prossima azione nel CRM.','suggestions are explicitly separate from recorded actions');
assert.equal(withoutAction.action,'','missing CRM actions are not presented as recorded data');

const proof=grow.activationProofs([
  {TIPO:'ATTIVAZIONE',TIMESTAMP:'2026-10-01',ACTOR:'staff',DRIVE_FILE_ID:'file-1'},
  {TIPO:'EMAIL',LINK_DOCUMENTO:'https://example.test/email'},
  {TIPO:'PROOF',PROOF_URL:'https://example.test/proof'}
]);
assert.equal(proof.length,2,'activation proof requires activation/proof context and an explicit evidence locator');
assert.equal(proof[0].document,'file-1');
assert.equal(proof[0].actor,'staff');
assert.equal(grow.safeEvidenceUrl('javascript:alert(1)'),'','unsafe evidence links are rejected');
assert.equal(grow.safeEvidenceUrl('https://example.test/proof'),'https://example.test/proof');

assert(html.includes('id="growPipeline"'),'private CRM pipeline projection is present');
assert(html.includes('id="growFollowups"'),'private CRM follow-up queue is present');
assert(html.includes('id="growSourceState"'),'CRM source freshness/provenance state is present');
assert(css.includes('#view-crm .page-tools>*{width:100%;min-width:0}'),'CRM filter controls fit narrow mobile widths');
assert(css.includes('color:#526B82')&&css.includes('5px #005fcc!important'),'small text and keyboard focus use contrast-safe SCD colors');
assert(app.includes("const url='/api/sponsor/crm'"),'slice uses the existing authenticated CRM API');
assert(app.includes('activationProofs'),'activation proof projection is wired to CRM detail');
assert(app.includes("R20 · TOUCHPOINTS_MASTER"),'CRM evidence timeline identifies its source');
assert(app.includes('Attore non esposto'),'missing evidence actor is not invented');
assert(!app.includes('/api/sponsor/grow'),'slice does not introduce a parallel CRM endpoint');
assert(pkg.scripts['test:sponsor-grow'],'focused GROW contract test is registered');

console.log('Sponsor GROW contract PASS');
