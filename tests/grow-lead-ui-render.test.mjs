import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const client=fs.readFileSync(new URL('../sponsor/app.js',import.meta.url),'utf8');
function extract(name,nextName){
 const begin=client.indexOf('function '+name+'(');
 const finish=client.indexOf(nextName,begin);
 assert.ok(begin>=0&&finish>begin,'existing CRM lead renderer must exist');
 return client.slice(begin,finish);
}
test('Sponsor protected CRM inbox binds all proposal buttons without DOM exceptions',()=>{
 let selected='';
 const elements=[
   {dataset:{growProposal:'REQ-QA-1'},onclick:null},
   {dataset:{growProposal:'REQ-QA-2'},onclick:null}
 ];
 const mount={innerHTML:'',textContent:''};
 const context={
   growLeadState:{rows:[
     {requestId:'REQ-QA-1',contactName:'Referente 1',email:'one@qa.test',topic:'Partnership',status:'NUOVA',companyHint:'Azienda 1',linkState:'REVIEW_REQUIRED',candidateStakeholderIds:['ST-1']},
     {requestId:'REQ-QA-2',contactName:'Referente 2',email:'two@qa.test',topic:'Partnership',status:'NUOVA',companyHint:'Azienda 2',linkState:'REVIEW_REQUIRED',candidateStakeholderIds:['ST-2']}
   ],loading:false,error:''},
   $:selector=>selector==='#crmLeadInbox'?mount:null,
   $:selector=>selector==='[data-grow-proposal]'?elements:[],
   document:{querySelectorAll:selector=>selector==='[data-grow-proposal]'?elements:[]},
   esc:s=>String(s??'').replaceAll('<','&lt;'),
   prepareGrowDraft:id=>{selected=id}
 };
 vm.createContext(context);
 vm.runInContext(extract('renderSponsorLeadInbox','async function loadSponsorLeads'),context);
 assert.doesNotThrow(()=>context.renderSponsorLeadInbox());
 assert.match(mount.innerHTML,/REQ-QA-1/);
 assert.equal(typeof elements[0].onclick,'function');
 assert.equal(typeof elements[1].onclick,'function');
 elements[1].onclick();
 assert.equal(selected,'REQ-QA-2');
});
